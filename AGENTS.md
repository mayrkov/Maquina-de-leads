# AGENTS.md — instruções para o agente que mantém este projeto

Lido automaticamente pelo Codex, Gemini CLI, Antigravity e Claude. Leia inteiro antes de mudar qualquer coisa. Depois leia `README.md` e os requisitos em `planejamento/requisitos/` (fonte da verdade do produto: `analise-de-requisitos.md`, `arquitetura.md`, `pendencias.md`, `verificacao-final.md`) e o registro de decisões e peculiaridades em `planejamento/decisoes.md`.

## O que é

"Máquina de Leads": sistema que pesquisa temas, gera roteiros, edita os vídeos brutos gravados pelo cliente (no piloto, um médico otorrino) e acompanha os leads que chegam pelo Instagram. Todo conteúdo passa por aprovação humana (RN01). O sistema nunca gera rosto nem voz sintética (RN02) e nunca vende (RN03).

A base de código veio da Máquina de Shorts. O que não serve ao produto (análise de requisitos, seção 6.2) e o que fica para depois (seção 6.3) foram removidos; o histórico do git guarda os dois para quando forem adaptados.

## Arquitetura (planejamento/requisitos/arquitetura.md)

| Caminho | O quê |
|---|---|
| `app/` | Sistema em Laravel 13 + Inertia + React (D1, D2): login (Fortify, sem cadastro público), painel, dados. Domínios em `app/Domains/<Domínio>/` (Models, Actions, Controllers, Requests); fila do worker em `app/Worker/` |
| `app/app/Worker/FilaMidia.php` | lado Laravel da fila `tarefas_midia` (D4): `enfileirar` (lista fechada de campos por tipo, nunca dado de saúde), `devolverAbandonadas`, `processarResultados`, `limparProcessadas` |
| `app/app/Console/Commands/ProcessarTarefasMidia.php` | `php artisan tarefas:processar`, agendado a cada minuto (`routes/console.php`) |
| `app/app/Domains/Videos/` | upload avulso (RF16), análise e formulário de edição (RF51, RF52), aprovação da produção e confirmação do médico por link (RF26, RF27); telas em `resources/js/pages/videos/` e `confirmacao/` |
| `app/app/Domains/Publicacao/`, `Leads/` | área "Publicação e resultados" do canva: publicação manual (RF29), métricas digitadas (RF41, RF42) e leads com consentimento (RF38 a RF40) |
| `app/app/Domains/Clientes/`, `Personas/`, `Marca/`, `Painel/` | área "Acesso e configuração" do canva: briefing (RF01, RF03, RF04), personas sugeridas pela IA e decididas pela produção (RF48 a RF50), kit de marca (RF15) aplicado na edição, painel da semana |
| `app/app/Domains/Roteiros/` | área "Roteiros e gravação" do canva: roteiros da semana (RF05, RF08 a RF13, RF25, RF27), takes na sessão do roteiro (RF16) e progresso da edição. Regras do conselho em `app/config/conformidade.php` (provisórias) |
| `worker/src/worker/jobs/` | `analisar_video` (transcrição e formulário de edição, tarefa `formularioEdicao`), `editar_video` (segue o formulário: trechos cortados, destaques e a transcrição da análise; aplica o kit: cor e estilo da legenda, logo como marca, tela final, vinheta; grava a etapa em `tarefas_midia.etapa`), `sugerir_personas` (IA, tarefa `personas` do `llm.tasks`) e `roteiros.ts` (`gerar_roteiros`, `refazer_roteiro`, `checar_conformidade`: tarefas `roteiro` e `conformidade`, com busca na web) |
| `worker/` | worker de mídia e IA em Node + Python (D3), sem porta aberta. `src/worker/main.ts` escuta a fila (LISTEN + SKIP LOCKED, sinal de vida); `src/worker/jobs/` tem uma função por tipo de tarefa |
| `worker/src/orchestrator/edit/` | edição do vídeo bruto: transcrição, corte de pausas, gaguejo e repetição (`disfluency.ts`), 9:16 com legenda e marca, tela final com a palavra-chave (`endCard.ts`); retomada por `runId` (RF46) |
| `worker/src/orchestrator/cuts/`, `worker/python/cuts/` | transcrição (faster-whisper), corte seco (`jumpcut.ts`), reenquadramento e legenda (`render.ts` + `render_clip.py`, OpenCV) |
| `worker/src/orchestrator/lib/` | cliente de IA plugável por tarefa (`llmClient.ts`, `llmTasks.ts`), busca na web, ffmpeg do Remotion, redação de segredos, ambiente mínimo dos processos filhos, trava de arquivo |
| `worker/src/shared/settings.ts` | esquema de `worker/config/pipeline.config.json`: IA por tarefa (`roteiro`, `conformidade`, `formularioEdicao`, `legendaPost`), busca na web, marca d'água |
| `infra/` | piloto num servidor (D8): `docker-compose.yml` (caddy, app, worker, postgres), Dockerfiles, `Caddyfile`, `postgres/init.sh` (papéis `maquina_app` e `maquina_worker`) |
| `planejamento/requisitos/` | requisitos, arquitetura, pendências e verificação final (cópia da pasta de planejamento do produto) |
| `docs/` | **público** no GitHub Pages (modelos de privacidade e termos herdados). Nunca colocar nada privado aqui |

`packages/video-composition/` (D7) ainda não existe: nasce com o kit de marca (RF15), quando houver composição Remotion compartilhada entre a prévia do painel e o render. Hoje o render é o do OpenCV (`render_clip.py`) e o Remotion só fornece o ffmpeg.

## Regras inegociáveis

1. **Segredos:** nunca imprima, registre em log nem commite `.env` (`app/.env`, `worker/.env`, `infra/.env`), `secrets/` ou chaves de API. Antes de todo commit, rode a varredura e **bloqueie** se acusar algo:
   ```bash
   git diff --cached --name-only -z | xargs -0 grep -lE 'AIza[0-9A-Za-z_-]{30,}|sk-ant-[0-9A-Za-z_-]{20,}|GOCSPX-|IGAA[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY'
   ```
   Os testes têm valores falsos de propósito (`AIzaFAKE…`); confirme que é falso antes de seguir. Nunca commitar `worker/render_output/`, `worker/logs/`, `worker/models/`, `app/storage/app/midia/`, vídeos ou áudios.
2. **Dado de saúde:** nunca no payload de `tarefas_midia`, em log ou na auditoria. O worker tem usuário de banco próprio, só com SELECT e UPDATE em `tarefas_midia`.
3. **Isolamento entre clientes (RNF02):** toda consulta filtra pelo cliente do usuário (`Video::doCliente($user)`); registro de outro cliente responde 404. Esconder botão não conta: a regra vale no servidor, com teste.
4. **Aprovação e publicação:** nada vai ao ar sem a produção aprovar e o médico confirmar. No MVP a produção publica à mão; o sistema não publica.
5. **Testes antes de commit** (tudo verde):
   - `cd app && php artisan test` (usa o Postgres `maquina_de_leads_testing` e precisa do manifesto do Vite, `npm run build`) e `npm run types:check`;
   - `npm run lint && npm test` na raiz (worker). Com `WORKER_TEST_DATABASE_URL=postgres://postgres:lerd@127.0.0.1:5432/maquina_de_leads_testing` roda também o teste da fila no Postgres;
   - `worker/.venv-cuts/bin/python -m unittest discover -s worker/python/cuts -p "test_*.py"`.
6. **Licença:** o projeto é `MIT OR Apache-2.0`. Código de terceiros só com licença permissiva compatível, com o aviso mantido e o crédito no `NOTICE`. Não escreva que a licença foi aprovada por advogado: ainda não foi.
7. **Faça o que foi pedido, nada além.** Prefira editar arquivos existentes. Leia antes de editar. Commits em português, descrevendo o porquê.
8. **Documente na hora** em `planejamento/decisoes.md`, com data e motivo:
   - toda decisão que os requisitos não cobrem;
   - todo desvio dos requisitos;
   - toda peculiaridade do ambiente (algo que precisa rodar à mão, versão diferente, ferramenta com limitação).

## Comandos

```bash
cd app && php artisan migrate && php artisan db:seed   # banco local (usuário producao@example.com, senha "password")
cd app && npm run build                                # front (em desenvolvimento, o worker "vite" do lerd)
cd app && php artisan tarefas:processar                # o que o agendador faz a cada minuto
npm run worker                                         # worker: consome tarefas_midia (worker/.env)
npm run edit -- --video bruto.mp4 --keyword OUVIDO     # edita um vídeo pela linha de comando, sem fila
```

## Ambiente local (lerd)

- O Laravel roda no lerd em https://maquina-de-leads.test (PHP 8.5, Postgres 16 em `lerd-postgres`). O agendador (`tarefas:processar`) é o worker `schedule` do lerd (`lerd worker start schedule`, em `app/`). O worker de mídia não roda no lerd: `npm run worker` na raiz.
- O `node_modules` de `app/` foi instalado pelo lerd (Alpine/musl). Para buildar no host, instale o binário glibc sem salvar: `npm install --no-save @voidzero-dev/vite-plus-linux-x64-gnu@<mesma versão do musl>`.
- O worker roda no host: `worker/.venv` (faster-whisper) e `worker/.venv-cuts` (OpenCV, numpy, Pillow). `worker/.env` aponta `MIDIA_ROOT` para `app/storage/app/midia` e `DATABASE_URL` para o papel `maquina_worker`.
- O ffmpeg é o do Remotion, versão reduzida: sem `hstack`, `fps`, `pad`, `setsar`, `silenceremove`.
