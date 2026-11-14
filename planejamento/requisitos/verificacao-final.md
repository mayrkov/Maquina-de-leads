# Verificação final

Lista do que precisa estar resolvido e conferido antes de a Máquina de Leads ir ao ar com médicos reais.

A base de código veio da [Máquina de Shorts](https://github.com/Mystic0112/Maquina-de-Shorts), que roda no PC de um único dono: painel só em `127.0.0.1`, somente leitura, sem login. A Máquina de Leads fica na internet, com vários usuários e dado de saúde (dado sensível pela LGPD, art. 11). Nada do que está abaixo existe na base herdada.

Como usar: cada item só é marcado quando a verificação descrita foi feita e o resultado anotado (data, quem conferiu, link do teste ou relatório). Item sem verificação não conta como feito.

## 1. Decisões que precisam vir antes

Sem estas decisões, os itens de segurança não têm como ser construídos nem conferidos.

- [ ] **Matriz de permissões:** o que produção, médico e equipe do médico (e consultor, se tiver papel) podem ver e fazer. Pontos em aberto: a produção vê as respostas de saúde dos leads? Quem convida a equipe do médico? Depende de [Papel do consultor](pendencias.md#papel-do-consultor-no-piloto).
- [ ] **Forma de login:** e-mail e senha, link por e-mail ou conta Google. Verificação em duas etapas obrigatória para quem.
- [x] **Stack do painel:** decidido em 2026-11-14: Laravel + Inertia/React ([D1](arquitetura.md#d1-laravel-em-monolito-organizado-por-domínio-para-o-sistema), [D2](arquitetura.md#d2-inertia--react-no-painel)).
- [ ] **Domínio de Laravel na equipe:** confirmar a premissa de D1 ([pendência](pendencias.md#domínio-de-laravel-na-equipe)).
- [ ] **Contrato das tarefas do worker:** colunas de `tarefas_midia` e JSON de cada tipo de tarefa ([pendência](pendencias.md#contrato-das-tarefas-do-worker)).
- [ ] **Responsável pelo servidor:** quem cuida de atualizações, backup e certificados (produção, desenvolvedores ou serviço gerenciado).
- [ ] **Limites de rate limit:** valores por rota (login, IA, render). Proposta inicial na seção 2.

## 2. Segurança do painel e da API

| Item | O que precisa existir | Como verificar |
|---|---|---|
| [ ] HTTPS | Todo acesso por HTTPS. HTTP redireciona para HTTPS. HSTS ligado. Certificado renovado sozinho. | `curl -I http://<domínio>` responde 301 para `https://`. Teste do SSL Labs com nota A ou melhor. Data de renovação automática conferida no servidor. |
| [ ] Login | Toda rota exige login, exceto login, recuperação de senha e webhooks (estes conferem assinatura). Senha guardada com argon2id ou bcrypt. Sessão expira. Cookie `HttpOnly`, `Secure` e `SameSite`. Recuperação de senha por link de uso único com validade curta. | Teste automatizado: cada rota, sem sessão, responde 401 ou redireciona ao login. Banco conferido: nenhuma senha em texto. Link de recuperação usado duas vezes falha na segunda. |
| [ ] Duas etapas | Conforme a decisão da seção 1. | Teste: usuário obrigado a usar duas etapas não entra só com a senha. |
| [ ] Permissões por perfil | Cada ação confere no servidor se o perfil pode fazê-la, conforme a matriz. Esconder botão na tela não conta. | Teste automatizado para cada par ação × perfil da matriz, chamando a API direto (sem a tela). Ação proibida responde 403. |
| [ ] Isolamento entre clientes | Toda consulta é filtrada pelo cliente do usuário logado. Dado de um médico nunca aparece para outro (RNF02). | Teste automatizado: usuário do médico A pede, pela API, o id de um registro do médico B (lead, vídeo, roteiro, arquivo) e recebe 404. Vale para listagens, downloads e exportações. |
| [ ] CSRF | Toda ação que altera dado exige token CSRF, além do cookie `SameSite`. | Teste automatizado: requisição que altera dado sem token, ou com token errado, responde 403. |
| [ ] Rate limit | Proposta: login com até 5 tentativas a cada 15 min por conta e por IP; rotas de IA e render com limite por cliente; webhooks com limite por origem. | Teste automatizado: passar do limite responde 429. Tentativas de login bloqueadas aparecem no log. |
| [ ] Auditoria | Registro de quem fez o quê e quando: login, aprovação de roteiro e vídeo, mudança de status do lead, acesso e exportação de dados de lead, mudança de permissão. O registro não guarda as respostas de saúde. | Teste: cada ação listada gera um registro com usuário, data e objeto. Registro conferido sem dado de saúde. |
| [ ] Segredos | Tokens e chaves fora do git e dos logs (RNF04). `.env` fora do repositório. | Busca por segredos no histórico do git (ex.: gitleaks) sem achados. Teste de `redact.ts` cobrindo os tokens novos (Instagram de cada cliente, chaves de IA). |
| [ ] Upload de vídeo | Só usuário autorizado envia. Tipo e tamanho do arquivo conferidos no servidor. Arquivo não fica acessível por URL pública sem login. | Teste: upload sem login falha; arquivo de tipo errado é recusado; URL do vídeo sem login responde 401 ou 403. |
| [ ] Revisão de segurança | Revisão do código e teste de invasão (pentest) cobrindo OWASP Top 10, com foco em acesso a dado de outro cliente. | Relatório da revisão anexado, com cada achado corrigido ou aceito por escrito. |

## 3. LGPD e dado de saúde

| Item | O que precisa existir | Como verificar |
|---|---|---|
| [ ] Papéis definidos | Controlador (médico) e operadores (Máquina de Leads, assessoria e ferramenta de bot) definidos, com revisão jurídica. | Parecer ou contrato assinado anexado. |
| [ ] Consentimento | Registro com data e texto mostrado. Opção de sair (RF34, RF35, RNF03). | Teste: lead sem consentimento não guarda dado pessoal. Quem saiu não recebe mensagem. |
| [ ] Prazo de guarda | Vídeo bruto e dados do lead apagados no prazo definido (`lib/retention.ts` adaptado). | Teste: registro vencido é apagado pela rotina. |
| [ ] Pedido do titular | Atender pedido de acesso e de exclusão de dados. | Teste do fluxo de ponta a ponta com um lead de teste. |
| [ ] Backup | Backup do banco cifrado, com restauração testada. | Restauração feita em ambiente separado, com data anotada. |
| [ ] Política de privacidade | Texto reescrito para dado de saúde e publicado. | Revisão de advogado anexada; link público funcionando. |

## 4. Dependências herdadas

| Item | O que precisa existir | Como verificar |
|---|---|---|
| [ ] `python/requirements.txt` completo | Hoje declara só `edge-tts`, `aiohttp`, `requests` e `faster-whisper`. O código usado no MVP também importa `torch`, `cv2` (opencv), `numpy`, `PIL`, `av`, `scipy` e `python_speech_features`. Todas declaradas com versão fixa. | Instalação num ambiente limpo (container novo) seguida dos testes de transcrição, reenquadramento e posição da legenda, sem erro de import. |
| [ ] Versão única do Node | Na base herdada, a raiz pede `node >=20` e `@types/node ^26`; o painel pede `node >=22` e `@types/node ^22`. O painel Express sai ([D3](arquitetura.md#d3-worker-de-mídia-separado-em-node-e-python)), mas `worker/`, `packages/video-composition/` e a parte JS do `app/` precisam usar uma versão LTS só. | `engines` e `@types/node` iguais em todos os `package.json`. Build e testes passam nessa versão. |
| [ ] Voz sintética removida | `edge-tts`, `kokoro`, `chatterbox`, `python/tts/*` e os módulos de TTS fora do código (RN02). | Busca no código por esses nomes sem resultado. |
| [ ] YouTube removido | `@googleapis/youtube`, `google-auth-library` e módulos de YouTube fora, enquanto o YouTube estiver fora do escopo. | Busca no código sem resultado; build e testes passam. |
| [ ] Lottie conferido | Confirmar se `@remotion/lottie` e `lottie-web` são usados pela composição do MVP. Se não, remover. | Busca de uso no código; render de teste funciona sem eles. |
| [ ] IA só por API | Antigravity CLI e Claude Code como motor de produção fora do servidor. IA com chave de API e custo por cliente. | Busca no código de produção por `antigravityCli`, `cliAgent` e `claudeCodeProfile` sem resultado. Custo por cliente aparece no painel (RNF08). |
| [ ] Worker separado | torch e Remotion rodam num worker de fila, fora do processo do painel. | Painel responde normalmente durante um render pesado (teste de carga simples). |
| [ ] Vulnerabilidades | Nenhuma vulnerabilidade alta ou crítica conhecida nas dependências. | `npm audit` e `pip-audit` sem alta ou crítica, ou cada uma aceita por escrito. |
| [ ] Lockfiles | `package-lock.json` e versões Python fixas no repositório. | Instalação em ambiente limpo reproduz as mesmas versões. |

## 5. Licenças

| Item | O que verificar | Como verificar |
|---|---|---|
| [ ] Remotion | Gratuito só para empresas de até 3 pessoas **[verificar]**. Contar produção e desenvolvedores. | Termos oficiais conferidos; licença comprada ou motor trocado. |
| [ ] Light-ASD | Licença do modelo e do código ainda não verificada. | Licença conferida no repositório oficial e compatível com uso comercial. |
| [ ] PP-OCRv3 e YuNet | Licença do modelo usado. | Licença conferida no repositório oficial. |
| [ ] AGPL | O adaptador `vendor/openmontage_adapter/` (AGPL-3.0) fora do produto. | Pasta ausente do código implantado. |
| [ ] Demais dependências | Nenhuma licença incompatível com uso comercial fechado. | Relatório de licenças (ex.: `license-checker`, `pip-licenses`) revisado. |

## 6. Arquitetura

Cuidados das decisões de [arquitetura.md](arquitetura.md).

| Item | O que precisa existir | Como verificar |
|---|---|---|
| [ ] Portas fechadas | Só o Caddy (80 e 443) aberto para a internet. Postgres e worker só na rede interna do Docker ([D8](arquitetura.md#d8-implantação-inicial-num-servidor-com-docker-compose-e-caddy)). | Varredura de portas de fora do servidor (ex.: `nmap`) mostra só 80 e 443. |
| [ ] Usuário de banco do worker | Usuário próprio com `SELECT` e `UPDATE` só em `tarefas_midia` ([D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql)). | Com o usuário do worker, `SELECT` em `leads` (ou qualquer outra tabela) retorna `permission denied`. |
| [ ] Credencial de storage do worker | Restrita ao bucket de mídia ([D3](arquitetura.md#d3-worker-de-mídia-separado-em-node-e-python)). | Com a credencial do worker, acesso a outro bucket é negado. |
| [ ] Payload sem dado de saúde | Tarefas levam só IDs e chaves de arquivo. | Teste automatizado sobre o JSON de cada tipo de tarefa. Amostra de `tarefas_midia` em homologação conferida. |
| [ ] Tarefa sem duplicidade | Dois workers nunca pegam a mesma tarefa; tarefa repetida não gera dois resultados. | Teste com dois workers e várias tarefas: cada tarefa processada uma vez. Teste que repete uma tarefa concluída e confere que nada muda. |
| [ ] Retomada de tarefa abandonada | Tarefa `em_andamento` sem sinal de vida volta para `pendente`; passou do limite de tentativas, vira falha definitiva. | Teste: matar o worker no meio de uma tarefa e conferir que ela é retomada e concluída. |
| [ ] Enfileirar depois do commit | A tarefa só aparece para o worker depois que a transação do Laravel confirma. | Teste: transação desfeita (rollback) não deixa tarefa na fila. |
| [ ] Limite de recursos do worker | `cpus` e `mem_limit` do worker no `docker-compose.yml` ([D6](arquitetura.md#d6-proteção-do-banco-e-escala-guiada-por-medição)). | Durante um render pesado, o painel responde normalmente (mesmo teste do item "Worker separado"). |
| [ ] Arquivos fora do banco | Nenhuma coluna guarda vídeo ou imagem. | Revisão das migrations; tamanho do banco conferido depois de vários uploads. |
| [ ] Consultas sem N+1 | `Model::preventLazyLoading()` ligado em desenvolvimento e testes; listagens paginadas. | Suíte de testes passa com o bloqueio ligado. |
| [ ] Medição ligada | `pg_stat_statements`, log de consultas lentas e alertas de CPU, memória, disco e conexões. | Consulta ao `pg_stat_statements` retorna dados; alerta de teste disparado e recebido. |
| [ ] Limpeza periódica | Sessões, cache, tarefas processadas e dados com prazo vencido são removidos. | Teste dos comandos agendados de limpeza. |
| [ ] Composição única | Prévia do painel e render do worker usam o mesmo `packages/video-composition` ([D7](arquitetura.md#d7-repositório-único-com-a-composição-de-vídeo-compartilhada)). | Quadro da prévia e quadro do MP4 renderizado, no mesmo instante e com o mesmo kit, conferidos lado a lado. |
