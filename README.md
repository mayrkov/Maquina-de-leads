# Máquina de Leads

Sistema que funciona como um time de marketing automatizado para profissionais e pequenas empresas: pesquisa o que está em alta no nicho, gera roteiros, edita os vídeos brutos gravados pelo cliente no padrão da marca e acompanha os leads que chegam pelo Instagram até a equipe do cliente.

- Todo conteúdo passa por aprovação humana: a produção aprova primeiro, o cliente confirma depois.
- O sistema nunca gera rosto nem voz sintética. Ele só edita o que o cliente gravou.
- O sistema não vende: qualifica o interessado e entrega o lead à equipe do cliente.

Cliente piloto: médico otorrinolaringologista, no Instagram Reels. Requisitos, arquitetura, pendências e a lista de verificação antes de ir ao ar estão em [planejamento/requisitos/](planejamento/requisitos/README.md).

## Estrutura

```
maquina-de-leads/
├── app/        # Laravel 13 + Inertia + React: login, painel, dados (D1, D2)
├── worker/     # Node + Python: edição de vídeo e IA, consome a fila tarefas_midia (D3, D4)
├── infra/      # docker-compose (caddy, app, worker, postgres) para o piloto (D8)
├── planejamento/requisitos/
└── docs/       # público (GitHub Pages)
```

O Laravel e o worker conversam só pela tabela `tarefas_midia` no PostgreSQL: o Laravel grava a tarefa e dispara `NOTIFY`; o worker acorda com `LISTEN`, pega a tarefa com `FOR UPDATE SKIP LOCKED`, manda sinal de vida enquanto trabalha e grava o resultado; um comando agendado do Laravel (`tarefas:processar`, a cada minuto) aplica os resultados, devolve tarefas abandonadas à fila e limpa as antigas. O worker não tem porta aberta e usa um usuário de banco que só lê e atualiza essa tabela.

## O que já funciona

- Login (e-mail e senha, duas etapas e passkeys do starter kit; sem cadastro público).
- Painel da semana, briefing do cliente, personas sugeridas pela IA (a produção salva, junta, corrige ou ignora) e kit de marca com prévia (cores, fontes, logo, vinheta, tela final). O kit vale para os vídeos editados a partir de então.
- Roteiros da semana: a IA pesquisa temas na web, escreve 5 roteiros sem repetir os recentes, define a persona de cada um e confere as regras do conselho (provisórias, CFM) e os fatos, com fontes. A produção edita, pede nova versão, decide a persona e aprova.
- Sessão do roteiro: roteiro para gravar, teleprompter, checklist, envio de vários takes e escolha do take principal; a tela acompanha cada etapa da edição.
- Upload avulso do vídeo bruto (tela "Upload avulso"): o vídeo vai para o disco privado de mídia e para a análise da IA.
- Formulário de edição: a IA transcreve o vídeo e sugere tema, persona, gancho, trechos a cortar, palavras de destaque na legenda, chamada, palavra-chave e legenda do post (partindo do roteiro, quando há). A produção mantém, altera ou remove cada campo, e a edição segue o formulário.
- Aprovação: a produção aprova, pede ajuste ou descarta; o médico confirma pelo celular, sem login, por um link de 7 dias. A aprovação vale só para aquele vídeo e aquela legenda.
- Publicação manual (link do post), registro de leads com consentimento e vídeo de origem, e métricas digitadas por vídeo, persona e gancho.
- Tour guiado (completo, essencial e por tela) e guia do sistema em `/guia`: explicam o fluxo, os status, o que ainda é manual e o que cada métrica quer dizer. O primeiro acesso abre o tour sozinho; depois ele fica no “?” do cabeçalho e no menu do usuário.
- Edição automática no worker: transcrição (faster-whisper), corte de pausas, gaguejos e repetições, reenquadramento 9:16 seguindo o rosto, legenda e tela final com a palavra-chave. Uma nova tentativa retoma de onde a anterior parou.
- Download do vídeo editado, só para usuários do mesmo cliente.

Ainda não existem: capa, confirmação do roteiro pelo médico, envio automático do link ao médico, exclusão de lead a pedido do titular, publicação e métricas automáticas. A ordem está em [mvp.md](planejamento/requisitos/mvp.md).

## Rodar localmente (lerd)

O Laravel roda no [lerd](https://github.com/geodro/lerd) em https://maquina-de-leads.test, com Postgres.

```bash
cd app
composer install
npm install
php artisan migrate
php artisan db:seed        # cliente piloto + usuário producao@example.com (senha: password)
npm run build
```

Worker (no host):

```bash
cd worker
python3 -m venv .venv && .venv/bin/pip install -r python/requirements.txt
python3 -m venv .venv-cuts && .venv-cuts/bin/pip install -r python/requirements-cuts.txt
cp .env.example .env       # DATABASE_URL (usuário maquina_worker) e MIDIA_ROOT (= app/storage/app/midia)
cd .. && npm install && npm run worker
```

Peculiaridades do ambiente local (o worker fora do lerd, as duas versões do Node, o binário do Vite) e as decisões tomadas fora dos requisitos estão em [planejamento/decisoes.md](planejamento/decisoes.md).

O papel `maquina_worker` é criado à mão no Postgres local (em produção, por `infra/postgres/init.sh`); a migration de `tarefas_midia` concede a ele só `SELECT` e `UPDATE` nessa tabela.

## Testes

```bash
cd app && php artisan test && npm run types:check
npm run lint && npm test                                   # worker (na raiz)
worker/.venv-cuts/bin/python -m unittest discover -s worker/python/cuts -p "test_*.py"
```

## Licença

`MIT OR Apache-2.0` (veja `LICENSE-MIT`, `LICENSE-APACHE` e `NOTICE`). Ainda não revisada por advogado.
