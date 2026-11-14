# Arquitetura

Decisões de arquitetura da Máquina de Leads, tomadas em 2026-11-14, com o motivo de cada uma e o que fazer se ela deixar de funcionar.

Cada decisão segue o mesmo formato:

- **Decisão:** o que foi escolhido.
- **Motivo:** por que foi escolhido.
- **Descartado:** alternativas avaliadas e por que ficaram de fora.
- **Cuidados:** o que precisa ser feito para a decisão funcionar.
- **Sinais de problema:** o que, medido ou observado, indica que a decisão está falhando.
- **Protocolo de mudança:** o que fazer, em ordem, quando os sinais aparecerem.

## Visão geral

```
                   internet
                      │ HTTPS
                ┌─────▼─────┐
                │   Caddy   │  certificado automático
                └─────┬─────┘
                ┌─────▼─────────────────────┐
                │  app (Laravel + Inertia)  │  login, perfis, painel, leads, LGPD, auditoria
                └─────┬─────────────────────┘
                      │ INSERT tarefa + NOTIFY      ▲ comando agendado lê concluídas
                ┌─────▼──────────────────────────────┴──┐
                │  PostgreSQL  (dados + tarefas_midia)  │
                └─────┬──────────────────────────────▲──┘
                      │ LISTEN + SKIP LOCKED          │ UPDATE status + resultado
                ┌─────▼──────────────────────────────┴──┐
                │  worker (Node + Python)               │  sem porta pública
                └─────┬─────────────────────────────────┘
                      │ lê vídeo bruto, grava vídeo editado
                ┌─────▼─────┐
                │  Storage  │  compatível com S3
                └───────────┘
```

Estrutura do repositório:

```
maquina-de-leads/
├── app/                      # Laravel: o sistema
│   ├── app/Domains/          # Clientes, Personas, Roteiros, Videos, Aprovacao, Publicacao,
│   │                         # Leads, Conformidade, Lgpd, Auditoria
│   ├── app/Worker/           # envio de tarefas e leitura dos resultados
│   ├── resources/js/         # Inertia + React
│   └── tests/
├── worker/                   # Node + Python: mídia e IA, herdado da Máquina de Shorts
│   ├── src/                  # main.ts, jobs/, stages/, cuts/, lib/
│   ├── python/cuts/
│   └── test/
├── packages/
│   └── video-composition/    # composição Remotion usada pelo worker e pela prévia do painel
├── infra/                    # docker-compose.yml, Dockerfiles, Caddyfile
└── docs/
```

## D1. Laravel, em monolito organizado por domínio, para o sistema

**Decisão:** login, perfis, painel, briefing, roteiros, aprovação, leads, LGPD e auditoria ficam numa única aplicação Laravel. A lógica de negócio fica em `app/Domains/<Domínio>/` (Models, Actions, Policies, Controllers). Os módulos se chamam direto em PHP, sem API interna. Não se usa pacote de módulos: pastas e namespaces bastam.

**Motivo:**

- O sistema é uma aplicação web clássica, com usuário, permissão e dado sensível. O Laravel traz pronto e mantido pela comunidade quase tudo o que a [verificação final](verificacao-final.md#2-segurança-do-painel-e-da-api) exige: login com hash de senha, recuperação de senha e duas etapas (Breeze e Fortify), Policies, CSRF ligado por padrão, `throttle`, filas, migrations, Storage e Notifications.
- No Express, que é o painel herdado, cada uma dessas peças teria de ser escolhida, montada e mantida pela equipe.
- O painel herdado só funciona local, em `127.0.0.1`, e só lê dados. Ele seria refeito de qualquer forma.
- API entre módulos do mesmo monolito só adiciona custo (serialização, rede, autenticação interna) sem benefício.

**Descartado:**

- **Express com bibliotecas avulsas:** funciona, mas a segurança passa a ser responsabilidade de montagem da equipe.
- **AdonisJS:** mesmo pacote completo, em Node. Faz sentido se a equipe for mais forte em TypeScript do que em PHP.
- **Microsserviços ou API interna por módulo:** custo de operação sem ganho no tamanho atual.

**Cuidados:**

- O Laravel dá padrões seguros, mas a regra de quem acessa o quê é escrita pela equipe: Policies e filtro por cliente em toda consulta. É o erro mais comum (acesso a dado de outro cliente) e nenhum framework impede sozinho.
- Cada versão principal do Laravel recebe correção de segurança por tempo limitado (cerca de 2 anos) **[verificar]**. Atualizar de versão faz parte da manutenção.
- **Premissa:** quem vai desenvolver e manter o sistema domina Laravel.

**Sinais de problema:**

- A premissa não se confirma: a equipe que mantém o projeto trabalha melhor em TypeScript.
- Um domínio passa a ter carga ou ritmo de mudança muito diferente dos outros (exemplo: o bot de captação próprio, com webhook 24 h e volume alto).

**Protocolo de mudança:**

1. Se a premissa falhar antes de haver código, reavaliar AdonisJS e registrar a nova decisão.
2. Se um domínio precisar escalar sozinho, primeiro escalar o monolito inteiro (mais processos do Laravel atrás do Caddy). Só se a medição mostrar que não basta, extrair aquele domínio para um serviço próprio. Como ele já está isolado em `app/Domains/<Domínio>/`, a extração não exige reorganizar o resto.
3. Registrar a mudança neste documento como nova decisão, apontando qual ela substitui.

## D2. Inertia + React no painel

**Decisão:** as telas do painel são feitas com Inertia + React, dentro do Laravel.

**Motivo:**

- A prévia ao vivo do kit de marca usa o Remotion Player, que é React. Com React no painel, a mesma composição de vídeo serve para a prévia e para o render (ver D7).
- O Inertia evita construir e proteger uma API separada só para o front: as telas usam as rotas, a sessão e o CSRF do próprio Laravel.

**Descartado:**

- **Inertia + Vue:** a prévia do kit de marca teria de ser reescrita ou embutida à parte.
- **SPA separada consumindo API:** mais uma superfície para autenticar e proteger, sem ganho.

**Cuidados:** o médico aprova pelo celular (RNF10). As telas de aprovação precisam ser testadas em tela pequena.

**Sinais de problema:** for preciso um app mobile nativo, ou terceiros precisarem consumir os dados.

**Protocolo de mudança:** criar uma API só para o que o app ou o terceiro precisa, com autenticação própria (ex.: Sanctum), sem tirar o painel do Inertia.

## D3. Worker de mídia separado, em Node e Python

**Decisão:** transcrição, cortes, reenquadramento, legenda, render e as tarefas de IA ligadas ao vídeo e ao roteiro rodam num processo separado, o `worker/`. Ele é o pipeline herdado da Máquina de Shorts, só com o que a seção 6.1 da [análise de requisitos](analise-de-requisitos.md#61-usado-no-mvp) marca como usado. O painel Express herdado não entra.

**Motivo:**

- O motor de vídeo depende de Remotion (Node) e de faster-whisper, torch e opencv (Python). Não há equivalente em PHP. Reescrever não é realista.
- Por usar outro runtime, ele já é obrigatoriamente um processo separado. Não poderia ser um módulo do Laravel.
- Roteiro, checagem de fatos e seleção de trechos já existem em TypeScript, com testes. Deixá-los no worker evita reescrita.
- Render pesado num processo separado não trava o painel.

**Cuidados:**

- **O worker não tem porta aberta para a internet nem login próprio.** Ele só fala com o banco (ver D4) e com o storage.
- O payload da tarefa leva só IDs e chaves de arquivo. Nunca respostas de lead ou outro dado de saúde.
- O worker tem uma credencial de storage própria, restrita ao bucket de mídia.
- `python/requirements.txt` completo e com versões fixas (ver [verificação final](verificacao-final.md#4-dependências-herdadas)).

**Sinais de problema:**

- Render deixa o painel lento ou derruba o banco (ver D6).
- A fila de edição cresce mais rápido do que é consumida, e o prazo de edição (RNF07) estoura.

**Protocolo de mudança:**

1. Conferir se o limite de CPU e de memória do worker está aplicado (D6).
2. Mover o worker para outra máquina, apontando para o mesmo banco e o mesmo storage. O código não muda.
3. Rodar mais de um worker. A fila já impede que dois peguem a mesma tarefa (D4).
4. Se o gargalo for a transcrição, avaliar máquina com GPU só para o worker.

## D4. Comunicação pela fila no PostgreSQL

**Decisão:** o Laravel e o worker conversam por uma tabela de tarefas no PostgreSQL (`tarefas_midia`), nos dois sentidos. Não há API HTTP entre eles.

Como funciona:

1. O Laravel grava a tarefa (tipo, payload em JSON, status `pendente`) e dispara `NOTIFY`, depois do commit da transação.
2. O worker espera com `LISTEN`, acorda e pega a tarefa com `SELECT ... FOR UPDATE SKIP LOCKED`, mudando o status para `em_andamento`.
3. Durante o processamento, o worker atualiza um sinal de vida (`heartbeat_em`).
4. Ao terminar, grava o `resultado` e muda o status para `concluida`, ou para `falhou`, com o erro e o número de tentativas.
5. Um comando agendado do Laravel, a cada minuto:
   - processa as tarefas concluídas (avisa o médico, muda o estado do vídeo, registra na auditoria);
   - devolve para `pendente` as tarefas `em_andamento` sem sinal de vida há muito tempo;
   - marca como falha definitiva as que passaram do limite de tentativas.

Nos dois lados existe uma interface pequena (`enfileirar`, `pegar`, `concluir`). O resto do código não sabe que a fila é o Postgres.

**Motivo:**

- O volume é baixo: cada vídeo leva minutos de render, e mesmo com muitos médicos são centenas de tarefas por dia. O Postgres aguenta ordens de grandeza a mais.
- O banco já existe. Não há serviço novo para operar, proteger e incluir no backup.
- Estado do vídeo e tarefa ficam no mesmo banco, na mesma transação. Não há como o vídeo ficar marcado como "editando" sem tarefa na fila.
- `LISTEN/NOTIFY` acorda o worker sem consultas repetidas.
- Sem endpoint de callback, há uma superfície a menos para proteger.

**Descartado:**

- **API HTTP entre Laravel e worker:** exige porta aberta, autenticação e retentativa manual, para mandar recados que uma fila resolve.
- **Redis:** ver D5.
- **Fila nativa do Laravel (driver `database`):** guarda o job em formato serializado do PHP, que o Node não lê bem. A tabela própria usa JSON.

**Cuidados:**

- **Usuário de banco próprio para o worker**, com `SELECT` e `UPDATE` só em `tarefas_midia` (`GRANT`). Ele não lê leads, clientes nem nenhuma outra tabela.
- **Tarefas idempotentes:** o worker confere o status antes de começar e só grava o resultado se a tarefa ainda estiver `em_andamento` e for dele. Rodar duas vezes não pode gerar dois vídeos nem cobrar a IA duas vezes sem necessidade.
- O prazo para considerar uma tarefa abandonada precisa ser maior que o intervalo do sinal de vida, nunca menor que ele.
- Índice parcial nas tarefas pendentes (`WHERE status = 'pendente'`).
- Tarefas concluídas e já processadas são apagadas ou arquivadas depois de alguns dias.
- O formato exato do JSON de cada tipo de tarefa ainda será definido (ver [pendências](pendencias.md#contrato-das-tarefas-do-worker)).

**Sinais de problema:**

- O atraso de até 1 minuto entre o vídeo ficar pronto e o aviso passa a incomodar o uso.
- Consultas em `tarefas_midia` aparecem entre as mais pesadas no `pg_stat_statements`.
- Bloqueios (locks) na tabela atrasam outras operações.
- Tarefas presas em `em_andamento` ou repetidas com frequência.

**Protocolo de mudança:**

1. **Atraso incomodando:** reduzir o intervalo do comando agendado, ou fazer o Laravel escutar o `NOTIFY` de conclusão num processo dedicado. A arquitetura não muda.
2. **Tarefas presas ou repetidas:** revisar o prazo de abandono, o sinal de vida e a idempotência antes de qualquer troca de tecnologia. Esses problemas existiriam em qualquer fila.
3. **Tabela pesando:** conferir os índices e a limpeza das concluídas.
4. **Só se a medição mostrar que o Postgres não comporta a fila:** criar uma nova implementação da interface sobre Valkey ou Redis (Streams). Seguir os cuidados de D5 e trocar a implementação nos dois lados. O resto do código não muda.

## D5. Sem Redis no início

**Decisão:** o MVP não usa Redis. Fila, sessão e cache do Laravel ficam no PostgreSQL, com o cache em arquivo (driver `file`) enquanto houver um único servidor de aplicação.

**Motivo:** o Redis não traz ganho de escala para esta fila tão cedo (ver D4), e traz complicações:

- guarda na memória, então pode perder tarefas se não for configurado com `appendonly yes` e `maxmemory-policy noeviction`;
- divide a verdade entre dois sistemas (estado no Postgres, tarefa no Redis);
- a fila nativa do Laravel não é legível pelo Node, e o Horizon não mostraria as tarefas do worker;
- é mais um serviço para atualizar, monitorar, proteger (porta 6379 nunca exposta, senha, ACL) e incluir no backup;
- mudou de licença em 2024 (a partir do Redis 8 oferece AGPLv3 como opção) **[verificar]**.

**Sinais de problema:** sessão e cache viram a maior carga do banco no `pg_stat_statements`, ou passa a haver mais de um servidor de aplicação (o cache em arquivo deixa de ser compartilhado).

**Protocolo de mudança:**

1. Usar **Valkey** (fork com licença BSD, compatível com o Redis), na rede interna do Docker, sem porta exposta, com senha e ACL.
2. Mover primeiro **cache e sessão**. A fila do worker continua no Postgres enquanto D4 funcionar.
3. Configurar persistência (`appendonly yes`) e `maxmemory-policy noeviction` se ele passar a guardar qualquer coisa que não possa ser perdida.
4. Incluir no backup, no monitoramento e na [verificação final](verificacao-final.md).

## D6. Proteção do banco e escala guiada por medição

**Decisão:** o banco é protegido desde o primeiro dia com medidas baratas. Mudanças de infraestrutura só entram quando a medição mostrar o problema.

Desde o primeiro dia:

- vídeo e imagem nunca no banco: ficam no storage, e o banco guarda só a chave e os metadados;
- limite de CPU e de memória para o worker no `docker-compose.yml` (`cpus`, `mem_limit`), para o render não sufocar o Postgres e o painel;
- índices nas consultas usadas, `with()` no Eloquent contra N+1, `Model::preventLazyLoading()` em desenvolvimento e paginação em toda listagem;
- limpeza periódica de sessões, cache, tarefas antigas e dados com prazo de guarda vencido (LGPD);
- métricas do painel (leads por vídeo, persona e gancho) em tabela de resumo atualizada por tarefa, sem consultas pesadas a cada abertura;
- `pg_stat_statements` e log de consultas lentas (`log_min_duration_statement`) ligados;
- alertas de CPU, memória, disco e conexões.

**Motivo:** no tamanho atual, o risco mais provável não é a fila, e sim o render disputando CPU com o Postgres na mesma máquina, arquivos grandes no banco e consultas sem índice. Escalar antes de medir gasta dinheiro no lugar errado.

**Protocolo de mudança (escada por sinal, nesta ordem):**

| Sinal medido | Ação |
|---|---|
| Render deixa o painel lento | Mover o worker para outra máquina (D3). |
| Banco usando a CPU ou a RAM inteira | Servidor maior para o banco (escala vertical). |
| Muitas conexões abertas | PgBouncer na frente do Postgres. |
| Relatórios pesados atrapalhando o uso diário | Réplica de leitura só para relatórios. |
| Sessão e cache viram a maior carga | Valkey para cache e sessão (D5). |
| Fila pesando no banco, com índice e limpeza em dia | Fila sobre Valkey (D4, passo 4). |

Cada degrau só entra com o número que justifica anotado na decisão nova.

## D7. Repositório único, com a composição de vídeo compartilhada

**Decisão:** um repositório com `app/`, `worker/`, `packages/video-composition/`, `infra/` e `docs/`. A parte JavaScript usa npm workspaces. A composição Remotion, que recebe o kit de marca como dado, fica em `packages/video-composition/`.

**Motivo:**

- A mesma composição é usada pelo worker, para renderizar o MP4, e pelo painel, para a prévia ao vivo do kit de marca. Num pacote só, a prévia mostra exatamente o que o render vai gerar.
- Mudanças que tocam o sistema e o worker juntos (ex.: um novo campo no kit de marca) entram numa única alteração, revisada de uma vez.

**Sinais de problema:** equipes diferentes passam a manter o sistema e o worker, com ritmos de entrega diferentes, e o repositório único vira gargalo.

**Protocolo de mudança:** separar o `worker/` em repositório próprio e publicar `video-composition` como pacote versionado, consumido pelos dois.

## D8. Implantação inicial num servidor, com Docker Compose e Caddy

**Decisão:** no piloto, um servidor roda `caddy`, `app`, `worker` e `postgres` com Docker Compose. O Caddy emite e renova o certificado HTTPS sozinho. Só a porta do Caddy (80 e 443) fica aberta para a internet. O Postgres e o worker ficam só na rede interna do Docker.

**Motivo:** custo e operação mínimos para o piloto. Cada serviço já é um container separado, então mover um deles para outra máquina não exige mudança de código.

**Cuidados:**

- Backup do banco cifrado e fora do servidor, com restauração testada.
- O responsável pelo servidor ainda não está definido (ver [verificação final](verificacao-final.md#1-decisões-que-precisam-vir-antes)).

**Sinais de problema:** os sinais de D6, ou indisponibilidade que afete o médico (servidor único é ponto único de falha).

**Protocolo de mudança:** seguir a escada de D6. Se a disponibilidade virar exigência, mover o banco para um serviço gerenciado (com backup e failover) antes de duplicar o servidor de aplicação.

## Como mudar uma decisão

1. **Registrar o sinal:** o que foi medido ou observado, com data e números (ex.: saída do `pg_stat_statements`, gráfico de CPU). Opinião sem medição não muda decisão.
2. **Seguir o protocolo de mudança** da decisão afetada, na ordem. Pular degrau só com justificativa escrita.
3. **Registrar a nova decisão** neste documento, com o mesmo formato, dizendo qual decisão ela substitui. A antiga não é apagada: ganha a marca "substituída por Dn" e a data.
4. **Atualizar os documentos afetados:** [pendências](pendencias.md), [análise de requisitos](analise-de-requisitos.md) e [verificação final](verificacao-final.md).
