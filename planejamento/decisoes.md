# Decisões e peculiaridades

Registro das decisões tomadas durante o desenvolvimento que não estão escritas nos requisitos (`planejamento/requisitos/`), com o motivo, e das peculiaridades do ambiente que surpreendem quem chega. Toda decisão nova ou peculiaridade descoberta entra aqui, na hora, com data.

Formato: **o que foi decidido**, **por quê**, e **o que fica em aberto** quando houver.

## Decisões

### 2026-11-14 · Base do projeto

- **A base veio da Máquina de Shorts, e o que não serve foi apagado** (estágios do Shorts, publicadores, TTS, memes, YouTube, CapCut, `dashboard/`, `vendor/`).
  - Por quê: a análise de requisitos (seções 6.2 e 6.3) lista o que não serve e o que fica para depois. Manter código morto confunde quem mantém.
  - O histórico do git guarda tudo.
  - Há um backup em `/home/mayk/Documentos/projetos/backup-maquina-de-leads-2026-11-14.tgz`.
- **O Laravel usa o starter kit oficial de React** (Fortify, duas etapas, passkeys).
  - Por quê: D1 e D2 pedem Laravel + Inertia + React, e o kit já traz login seguro e testado.
  - A tela de login foi refeita para seguir a tela 01 do canva.
- **Não existe cadastro público:** a rota, a ação `CreateNewUser` e a tela foram removidas.
  - Por quê: o canva diz "Acesso restrito à produção parceira" e "Use o e-mail cadastrado pela equipe da plataforma".
  - Os usuários são criados pela equipe. No local, o seeder cria `producao@example.com` com a senha `password`, só para desenvolvimento.
- **O cache usa o driver `file`, sem Redis** (D5).

### 2026-11-14 · Fila do worker (`tarefas_midia`)

- **A tarefa `sugerir_personas` leva o briefing no payload.**
  - Por quê: o worker só pode ler `tarefas_midia`, porque o papel `maquina_worker` não enxerga `clientes`. Sem o briefing no payload, a IA não tem o que ler.
  - O briefing é dado do negócio (nicho, oferta, região, tom de voz), não dado de paciente.
  - Em aberto: isso afrouxa a regra de `pendencias.md` de levar "só IDs e chaves de arquivo". Precisa entrar no contrato das tarefas do worker, que ainda está aberto.
  - A lista de campos permitidos por tipo fica em `FilaMidia::PAYLOAD_PERMITIDO`. Um campo fora dela é recusado.
- **A tarefa `editar_video` leva uma cópia do kit de marca vigente no momento do upload.**
  - Por quê: o worker não lê `kits_marca`.
  - Uma mudança no kit vale só para os vídeos enviados depois. Um vídeo que já está na fila não muda no meio do caminho.
- **Ao trocar o logo ou a vinheta do kit, o arquivo antigo é apagado, exceto se uma tarefa pendente ou em andamento ainda o usa.**
  - Por quê: assim a edição que está na fila não perde o arquivo.
- **Os limites de requisição são contados por cliente:** `ia` permite 20 por hora (pedir personas) e `uploads` permite 30 por hora.
  - Por quê: protegem a cota da IA e o disco, e um cliente não consome o limite de outro.

### 2026-11-14 · Área 1 do canva (Acesso e configuração)

- **O briefing tem CRM, RQE e profissão além dos campos do canva.**
  - Por quê: o RF03 pede esses campos, e o filtro de conformidade do CFM vai precisar deles.
  - O campo de conselho aceita só `CFM` por enquanto, porque o piloto é um médico.
- **"Salvar rascunho" aceita campos vazios. "Salvar e sugerir personas" exige o mínimo** (`Cliente::CAMPOS_OBRIGATORIOS_BRIEFING`).
  - Por quê: a produção preenche o briefing aos poucos, e a IA só deve trabalhar com o briefing completo.
- **Pedir personas de novo não cria uma tarefa duplicada** se já existe uma pendente: a linha do cliente é travada antes de enfileirar.
- **A tela de personas mostra "em andamento" até o Laravel aplicar o resultado** (`processada_em`), não só até o worker concluir.
  - Por quê: entre a conclusão no worker e a passada do agendador, a tela parava de se atualizar e não mostrava as sugestões.
- **Juntar uma sugestão só é possível com uma persona salva do mesmo cliente.** A salva continua sendo a usada.
  - Por quê: evita leads divididos entre duas personas iguais, e isola os clientes (RNF02).
- **A prévia do kit de marca é feita em CSS, não com Remotion.**
  - Por quê: a composição compartilhada de D7 (`packages/video-composition/`) ainda não existe, e o render atual é o do OpenCV.
  - As fontes oferecidas são só Montserrat e Anton, porque são as que o render tem.
  - Em aberto: criar a composição compartilhada para a prévia ficar idêntica ao vídeo.
- **O modelo de capa só é guardado; a capa ainda não é gerada** (RF23).
- **Se o campo da chamada ficar vazio no upload, o texto da tela final do kit é usado** (com `{PALAVRA}` trocado pela palavra-chave).
- **Vinheta sem som:** o worker acrescenta uma faixa de silêncio para o `concat` do ffmpeg funcionar. O caso com som e o caso sem som foram testados.
- **O painel mostra "—" em roteiros e leads**, porque essas funções ainda não existem.
- **O menu lateral só mostra as telas que já existem.** Os itens das áreas 2 a 4 do canva entram quando as telas forem feitas.
- **O tema claro usa as cores do canva**, em `resources/css/app.css`, nas variáveis de `:root`.

### 2026-11-14 · Só tema claro

- **O sistema tem só o tema claro.** O modo escuro e a tela "Aparência" do starter kit foram removidos:
  - `use-appearance.tsx`, `appearance-tabs.tsx`, `pages/settings/appearance.tsx` e o middleware `HandleAppearance`;
  - a rota `appearance.edit`, o script do `app.blade.php` que punha a classe `dark` e o bloco `.dark` do `app.css`.
- Por quê:
  - O canva só tem tema claro.
  - Com o sistema operacional em tema escuro, o site seguia o sistema e mostrava a paleta escura do starter kit, diferente do canva.
- `@custom-variant dark` continua em `app.css`, presa à classe `.dark`, que nunca é posta.
  - Os componentes do starter kit têm classes `dark:`. Sem a variante, o Tailwind as ligaria pelo tema do sistema.
- O teste de e-mail não verificado agora usa `dashboard` no lugar da rota de aparência.
- Para voltar a ter tema escuro: criar a paleta escura com base no canva e devolver o seletor.

### 2026-11-14 · Área 2 do canva (Roteiros e gravação)

- **Três tarefas novas no worker:** `gerar_roteiros` (a semana), `refazer_roteiro` ("Pedir nova versão", com o comentário da produção) e `checar_conformidade` (depois de uma edição manual).
  - Por quê: o worker só lê `tarefas_midia`. Cada pedido leva no payload o briefing, o catálogo de personas, os temas recentes e as regras do conselho.
  - Roteiro é texto de marketing do médico, não dado de paciente. Mesmo caso em aberto do briefing: entra no contrato das tarefas do worker.
- **A pesquisa de temas (RF05) é uma chamada de IA com busca na web, antes de escrever os roteiros.** Sem busca no provedor, os roteiros saem só com o briefing.
- **A conformidade é feita pela IA, regra por regra, com resultado ok, atenção ou bloqueio** (RF13). A checagem de fatos (RF14) vai junto: revisão com busca na web e depois a resposta estruturada.
  - Fonte só vale se veio da busca: um link que a IA inventou sai, e o fato fica "sem fonte".
  - Sem busca, todos os fatos ficam "sem fonte" (atenção), não "confirmados".
  - Não há conferência por palavras (regex) no Laravel: dava falso positivo ("não tem cura").
  - Não há reescrita automática quando há bloqueio. A produção vê o motivo, corrige o texto ou pede nova versão.
- **As regras do CFM são provisórias** e ficam em `app/config/conformidade.php`, como dados.
  - Por quê: o texto oficial da Resolução CFM nº 2.336/2023 ainda é pendência. Ao conferir o texto, ajustar só esse arquivo.
  - CRM e RQE na legenda do post não é regra conferida pela IA: a legenda ainda não existe, então a tela mostra o lembrete fixo.
- **A checagem vale para o texto exato** (hash de gancho, desenvolvimento e chamada, RF27). Texto editado depois da checagem fica "conferir de novo". Texto aprovado que muda volta para revisão.
- **Para aprovar um roteiro é preciso:** checagem do texto atual sem bloqueio e persona decidida (salvar, juntar, corrigir ou ignorar, RF49).
  - Por quê: RF49 diz que a decisão da persona acontece na aprovação do roteiro.
  - A confirmação do médico (RF25) é da área 3 (tela 11) e ainda não existe.
- **A persona do roteiro é uma linha de `personas`**, reusada (salva) ou nova (sugerida). Ignorada, ela fica gravada no roteiro (RF11). Ao juntar, os roteiros passam para a persona salva.
- **A semana gerada é a atual ou a seguinte à última que já tem roteiros.** São 5 roteiros por vez. A IA não pode repetir os 30 temas mais recentes nem a palavra-chave dentro do lote.
- **A duração é estimada por palavras (2,5 por segundo).** O worker recusa roteiro fora de 30 a 90 s e chamada sem a palavra-chave, e a IA corrige.
- **Takes:** só depois de aprovar o roteiro. Vários por roteiro, e a produção escolhe o take principal.
  - Só um take por vez na edição. Pode mandar de novo um take que falhou.
  - Os takes não aparecem na tela "Upload avulso", que é só para vídeo sem roteiro.
  - O upload não retoma se a conexão cair (pendência do RF16).
- ~~O take vai direto para a edição~~ (substituído na área 3: o take vai para a análise da IA e o formulário de edição).
  - O botão do canva "Enviar para análise da IA" ficou "Enviar para edição".
- **A tela de edição mostra a etapa real do worker:** coluna `tarefas_midia.etapa` (transcrição, cortes, legenda, tela final). O canva tem "Zoom e cortes de ênfase", que a edição ainda não faz, e por isso essa etapa não aparece.
- **O checklist de gravação é o do canva, fixo, e não é guardado.** O teleprompter rola sozinho, com velocidade ajustável.
- **O painel conta os roteiros da semana** e mostra os aprovados sem take na coluna "Aguardando gravação". O catálogo de personas mostra quantos roteiros cada persona tem.

### 2026-11-14 · Áreas 3 e 4 do canva (Edição, aprovação, publicação e resultados)

- **Fluxo do vídeo, um status só em `videos.status`:** enviado → analisando → formulario → aguardando_edicao → editado → aprovado (falta o médico) → confirmado → publicado; e também descartado e falhou.
  - Por quê: o painel, as listas "Edição" e "Aprovação" e a sessão do roteiro leem o mesmo campo. Um take por vez segue adiante por roteiro.
- **Nova tarefa `analisar_video` no worker (RF51):** transcreve o bruto e a IA preenche o formulário de uma vez (tarefa `formularioEdicao` do `llm.tasks`).
  - A transcrição fica no disco de mídia (`transcricoes/{cliente}/{video}.json`) e a edição usa a mesma: não transcreve duas vezes.
  - Os trechos do formulário são os segmentos do Whisper. A IA marca os que cortar (conversa antes e depois, frase repetida, fora do assunto); pausas e gaguejos continuam no corte automático.
  - A IA só olha a fala, não a imagem (shortcut anotado no código).
  - O worker recusa e pede correção: trecho inexistente, cortar tudo, gancho cortado, destaque que não foi falado, chamada sem a palavra-chave.
- **Com roteiro, tema, persona, gancho, chamada e palavra-chave vêm do roteiro aprovado,** não da IA. O Laravel sobrescreve depois da análise. Avulso: a IA deduz tudo, e o upload avulso não pede mais palavra-chave nem chamada (canva, tela 08).
- **A assinatura da legenda (nome, CRM e RQE) é do sistema, não da IA.** Vai no fim da sugestão. Para aprovar, a legenda precisa conter o CRM do cliente (quando cadastrado).
  - Risco: a legenda editada à mão não passa de novo pela conformidade da IA (RN05). Só o CRM é conferido. Fica para quando a revisão da legenda for definida.
- **Formulário: a sugestão da IA fica guardada (`sugestao`) e o revisado em `formulario`.** Manter volta ao sugerido; Alterar edita; Remover grava vazio. Chamada, palavra-chave e legenda não podem ser removidas (sem elas não há tela final nem post).
  - "Cortes" é por trecho: em Alterar, clica-se no trecho na transcrição.
  - "Destaques": até 6 palavras. Na legenda do vídeo, só elas ficam na cor de destaque e o resto fica branco. Sem destaques, a legenda continua toda na cor, como antes.
  - O canva tem um campo "Chamada para ação e palavra-chave"; aqui são dois, para editar cada um.
- **Aprovação presa ao conteúdo (RF27):** `aprovacao_hash` = sha256 do arquivo editado + legenda. Cada edição grava um arquivo novo, então editar de novo derruba a aprovação. Publicar e o link do médico conferem o hash.
- **Pedir ajuste (produção ou médico) volta o vídeo ao formulário,** com o comentário e quem pediu. A produção muda o formulário e gera a edição de novo.
- **Link do médico (tela 11):** token aleatório de 48 caracteres, só o sha256 no banco, válido por 7 dias, sem login.
  - O link aparece uma vez para a produção copiar ou mandar pelo WhatsApp. "Reenviar link" gera outro e o anterior para de funcionar. Respondido, o link morre.
  - Por quê: ainda não há canal definido com o médico (e-mail, WhatsApp oficial). Envio automático fica para depois.
  - Só o vídeo (RF26). A confirmação do roteiro pelo médico (RF25) não tem tela no canva e não foi feita.
- **Vídeo na tela tocado pelo arquivo local do disco** (`response()->file`, com Range para o player do celular). Com disco em nuvem, trocar por URL temporária (shortcut anotado).
- **Publicação manual (RF29):** só vídeo confirmado com hash válido; o link precisa ser `https://instagram.com/...`. O checklist da tela não é salvo; o que conta é o link do post.
- **Leads (RF38 a RF40):** registro manual, só com consentimento marcado e data. Vídeo de origem: só vídeo publicado do próprio cliente, ou "não sei". A persona do lead é a do formulário do vídeo.
  - Dado de lead nunca vai para o worker (lista de campos da fila).
  - Fora: excluir lead a pedido do titular (LGPD, RNF03) e a entrega automática à equipe (pendência "Destino do lead").
- **Métricas (RF41, RF42):** visualizações e comentários digitados por vídeo publicado, salvos ao sair do campo. Agrupamento por vídeo, persona e gancho. O "aprendizado" mostra a persona e o gancho com mais leads, sem IA, e não muda a geração de roteiros (RF44 é depois).
- **Menu:** grupo "Resultados" (Publicação, Leads, Métricas) e "Edição" e "Aprovação" em Produção, como no canva. "Upload avulso" só fica marcado na própria tela.
- **Painel:** a semana passou a ser a dos roteiros (segunda a domingo). Antes usava o `startOfWeek()` do Carbon, que no pt_BR começa no domingo, e contava 0 roteiros.

## Peculiaridades do ambiente local

### O worker de mídia e IA não roda pelo lerd

- Rode à mão, na raiz do projeto: `npm run worker`. Sem ele, as tarefas ficam pendentes: as personas não chegam e os vídeos não são editados.
- Por quê:
  - Os workers do lerd rodam dentro do contêiner PHP (Alpine).
  - O worker precisa dos venvs Python do host (`worker/.venv` e `worker/.venv-cuts`, compilados para glibc), do ffmpeg do Remotion e do Node 24.
- O agendador do Laravel roda no lerd. Ligue uma vez, em `app/`, com `lerd worker start schedule`.
  - É ele que roda `tarefas:processar` a cada minuto: aplica os resultados, devolve as tarefas abandonadas e limpa as antigas.
  - Sem ele, o worker conclui a tarefa, mas a tela não muda.

### Node em duas versões

- O site do lerd usa o Node 22. O worker exige o Node 24 (`engines` em `package.json` e `worker/package.json`), e roda no host.
- O front do Laravel (`app/`) compila com o Node 22.

### Binário do Vite instalado pelo lerd

- O `node_modules` de `app/` foi instalado pelo lerd, em Alpine (musl). Para rodar `npm run build` no host, instale o binário glibc sem salvar:
  ```bash
  npm install --no-save @voidzero-dev/vite-plus-linux-x64-gnu@<mesma versão do musl>
  ```

### Rotas do Wayfinder

- Gere com `php artisan wayfinder:generate --with-form`. Sem `--with-form`, os formulários perdem o `.form()` e o `tsc` falha.

### Testes do Laravel precisam do build

- Rode `npm run build` antes de `php artisan test`. Sem o manifesto do Vite, os testes das telas falham com "Not a valid Inertia response".
- Os testes usam o banco Postgres `maquina_de_leads_testing`, não SQLite.

### Papel do worker no Postgres local

- O papel `maquina_worker` é criado à mão no Postgres do lerd. Em produção, quem cria é `infra/postgres/init.sh`.
  - A migration de `tarefas_midia` concede a ele só `SELECT` e `UPDATE`, e só quando o papel existe.
  - Crie o papel antes de rodar a migration, ou rode a migration de novo depois.
- A senha local fica só em `worker/.env`, que não vai para o git.
- Os testes da fila no Postgres só rodam com a variável abaixo; sem ela, ficam pulados:
  ```bash
  WORKER_TEST_DATABASE_URL=postgres://postgres:lerd@127.0.0.1:5432/maquina_de_leads_testing
  ```

### O Postgres reordena as chaves do jsonb

- `payload` e `resultado` são `jsonb`: as chaves de um objeto voltam em outra ordem (por tamanho), não na ordem em que foram gravadas.
- Quando a ordem importa (ex.: as regras de conformidade na tela), ordene pelo config, não pelo JSON. Nos testes, compare sem ordem (`toEqual`, `toEqualCanonicalizing`).

### Carregamento preguiçoso desligado

- Fora de produção, o Laravel recusa carregar relação sem `with()` ("lazy loading is disabled"). Carregue a relação na consulta antes de usar (ex.: `Roteiro` com `tarefa` e `persona`).

### ffmpeg reduzido

- O ffmpeg vem do Remotion e não tem os filtros `hstack`, `fps`, `pad`, `setsar` e `silenceremove`. Qualquer filtro novo precisa ser testado nele, não no ffmpeg do sistema.

### IA em desenvolvimento

- A tarefa `personas` usa o `antigravity-cli` (agy) por padrão. A IA é escolhida por tarefa em `worker/config/pipeline.config.json` (`llm.tasks`).

### Sistema operacional em tema escuro

- Nesta máquina o GNOME está em `prefer-dark`. Antes de 2026-11-14, isso deixava o site escuro e diferente do canva.
- Resolvido com o tema claro fixo (veja "Só tema claro" acima). Se o site aparecer escuro de novo, procure a classe `dark` no `<html>`.

### Disco cheio pelo indexador do GNOME

- Em 2026-11-14 o `/var/log/syslog` chegou a 23 GB e lotou o `/`, e o terminal do agente parou de funcionar.
- Por quê: o `tracker-miner-fs-3` gravava um aviso para cada arquivo temporário `*.md.tmp.*` criado na pasta dos requisitos (`Documentos/Estudando/Projetos/Máquina de leads/`).
- Se acontecer de novo: tire essa pasta da indexação do tracker e esvazie o `syslog`.

### Limite de upload do PHP no lerd

- O PHP do lerd vem com 2 MB por arquivo (`upload_max_filesize=2M`, `post_max_size=8M`). O app espera até 2048 MB (`MIDIA_UPLOAD_MAX_MB`).
- Sintoma: o take ou o upload avulso falha com "O vídeo não chegou ao servidor: passou do limite de upload do PHP."
- Em 2026-11-14 (a pedido): `upload_max_filesize = 2048M` e `post_max_size = 2100M` em `~/.local/share/lerd/php/8.5/98-user.ini` (o mesmo de `lerd php:ini 8.5`), seguido de `systemctl --user restart lerd-php85-fpm`. Vale só nesta máquina, fora do repositório: em outra máquina, repita. Se `MIDIA_UPLOAD_MAX_MB` mudar, mude os dois valores junto.

### Formatação do front

- O formatador é o do projeto: `npm run check:fix` em `app/` (vp, com aspas simples). Não rode o `prettier` direto: sem a config, ele troca as aspas.
- `resources/js/components/ui/*` fica fora do formatador e segue o estilo do shadcn (aspas duplas, sem ponto e vírgula). Em 2026-11-14, um `prettier` rodado por engano reformatou essa pasta; os arquivos foram restaurados do starter kit oficial do Laravel (conferidos um a um), e o `sonner.tsx` manteve o tema claro.

### Semana no Carbon em pt_BR

- Com o locale pt_BR, `startOfWeek()` sem argumento começa no domingo. A semana dos roteiros é de segunda a domingo: use `Roteiro::semanaDe()`.
