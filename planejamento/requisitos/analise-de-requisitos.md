# Análise de requisitos

Requisitos da Máquina de Leads, levantados a partir dos documentos deste repositório e do projeto já existente da equipe, a [Máquina de Shorts](https://github.com/Mystic0112/Maquina-de-Shorts) (lido em 2026-11-12, branch padrão).

O objetivo é separar o que pode ser **reaproveitado** da Máquina de Shorts, o que precisa ser **adaptado** e o que é **novo**.

## 1. Ponto de partida: o que a Máquina de Shorts já faz

Pipeline em Node.js + TypeScript que gera e publica Shorts de curiosidades **sem revisão humana**:

| Estágio | O que faz |
|---|---|
| `01-pickTopic` | Sorteia tema de uma lista fixa (`config/topics.seed.json`) |
| `02-generateScript` | Roteiro com gancho, cenas e final, via LLM |
| `02b-factCheck` | Confere afirmações com busca na web; reprova o roteiro sem fontes |
| `03-fetchFootage` | Busca imagens com licença livre e dá nota a cada uma contra a fala |
| `04-synthesizeVoice` | Narração sintética (Kokoro) e tempo de cada palavra (faster-whisper) |
| `05-buildCaptions` | Legendas palavra a palavra |
| `06-renderVideo` | Render 9:16 com Remotion |
| `07-generateMetadata` | Título, descrição e tags |
| `08-upload*` | Publica no YouTube e no Instagram (desligado por padrão) |

Peças relevantes fora do pipeline principal:

- **Cortes** (`src/orchestrator/cuts/`): recebe vídeo longo gravado por pessoa real, transcreve, remove pausas mortas (`jumpcut.ts`), reenquadra em 9:16 seguindo quem fala, aplica legenda e marca d'água. É o mais próximo da edição que a Máquina de Leads precisa.
- **Painel** (`dashboard/`): React + Vite + Express, com execuções, galeria de vídeos, métricas e configurações.
- **Integração Instagram** (`lib/instagramAuth.ts`, `instagramApi.ts`, `instagramInsights.ts`): login, publicação de Reels e métricas por Reel. Escopos atuais: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`.
- **Travas**: estado salvo por estágio (`context.json`, `--resume`), aprovação presa ao hash do conteúdo (`contentHash.ts`), segredos mascarados (`redact.ts`), trava de arquivo (`fileLock.ts`), regras livres do dono no prompt (`ownerRules.ts`).
- **IA plugável** (`llmClient.ts`, `llmTasks.ts`): Antigravity CLI, Claude Code, Gemini, Anthropic e OpenAI-compatível, com modelo por tarefa.

### Diferenças de premissa

| Tema | Máquina de Shorts | Máquina de Leads |
|---|---|---|
| Revisão humana | Nenhuma | Obrigatória antes de publicar |
| Origem do vídeo | Imagens de acervo + voz sintética | Vídeo bruto do médico, gravado pela produção |
| Voz e rosto sintéticos | Sim (Kokoro) | Proibido |
| Tema | Sorteado de lista fixa | Tendência do nicho + briefing + personas, ou deduzido do próprio vídeo (upload avulso) |
| Usuários | Um dono | Produção, médico e equipe do médico; no futuro, a produção atende vários médicos |
| Execução | Lote no PC de casa, agendado | Servidor na internet para o painel e a edição (e para o webhook, se a captação for própria) |
| Validação de conteúdo | Checagem de fatos | Conformidade com o conselho profissional (e fatos) |
| Resultado medido | Visualizações | Leads gerados e qualificados |

## 2. Atores

| Ator | Papel |
|---|---|
| **Médico (cliente)** | Profissional que contrata o serviço (no piloto, o otorrino). Aparece nos vídeos e responde ao conselho pelo conteúdo, por isso confirma roteiro e vídeo depois da produção. |
| **Equipe do médico** | Funcionários da clínica. Recebem os leads entregues pela Máquina de Leads, cadastram como pacientes no sistema da clínica e fazem o atendimento e o agendamento. Não operam a Máquina de Leads. |
| **Produção** | Empresa assessora contratada e paga pelo médico, com equipe própria. É parceira (sociedade) da Máquina de Leads e participa do desenvolvimento. Grava os vídeos brutos com o médico, envia à máquina e opera o sistema: briefing, personas, kit de marca, roteiros, aprovação, publicação no Instagram do médico e acompanhamento das execuções. |
| **Desenvolvedores** | Desenvolvem e mantêm a plataforma e treinam a produção na implantação. Não operam o dia a dia. |
| **Consultor** | Ponte com o médico. Papel no fluxo **pendente** ([pendencias.md](pendencias.md)). |
| **Seguidor / interessado** | Comenta a palavra-chave e conversa com o bot. |
| **Instagram (Meta)** | Plataforma externa: comentários, mensagens e métricas. |

Fluxo entre as três entidades: o **médico** grava com a **produção** e confirma o conteúdo; a **produção** opera a Máquina de Leads e publica; a máquina entrega os leads à **equipe do médico**, que cadastra e atende; os **desenvolvedores** ficam fora da operação.

## 3. Requisitos funcionais

Prioridade: **MVP** (entra na primeira versão), **Depois** (fora do MVP, ver [mvp.md](mvp.md)).

Origem na Máquina de Shorts: **Reusar** (usar quase como está), **Adaptar** (base existe, muda a regra), **Novo** (não existe).

### 3.1 Briefing e personas

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF01 | Cadastrar cliente com nicho, objetivo, oferta, região, tom de voz, temas proibidos e tags livres. | MVP | Novo |
| RF02 | A IA define o público-alvo de cada roteiro a partir do tema: descrição, dores, quem decide a compra e linguagem. Ninguém cadastra personas à mão. | MVP | Novo |
| RF48 | A IA compara o público definido com as personas salvas do cliente. Se for parecido com uma delas, reusa a existente; se não, marca como persona sugerida e avisa qual persona salva é a mais próxima. | MVP | Novo |
| RF49 | Na aprovação do roteiro, a produção salva a persona sugerida no catálogo, junta com uma existente, corrige ou ignora. | MVP | Novo |
| RF50 | No primeiro acesso, a IA sugere um conjunto inicial de personas a partir do nicho do briefing; a produção aprova, edita ou descarta. | MVP | Novo |
| RF03 | Cadastrar a profissão regulada e o conselho do cliente (ex.: médico, CFM), com CRM e RQE. | MVP | Novo |
| RF04 | Editar o briefing pelo painel, sem mexer em arquivo. | MVP | Adaptar (`ownerRules.ts`, aba Configurações) |

### 3.2 Pesquisa de tendências

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF05 | Sugerir temas por persona a partir do briefing (pesquisa simples ou assistida por LLM com busca na web). | MVP | Adaptar (`webSearch.ts`, `factCheckSearch.ts`) |
| RF06 | Coletar tendências de fontes oficiais (Google Trends, TikTok Creative Center, YouTube Data API, Meta Ad Library). | Depois | Novo |
| RF07 | Usar comentários e desempenho dos vídeos do próprio cliente como fonte de temas. | Depois | Adaptar (`instagramInsights.ts`) |
| RF08 | Não repetir tema recente do mesmo cliente. | MVP | Reusar (`recentTopics.ts`) |

### 3.3 Roteiros

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF09 | Gerar 5 roteiros por semana por cliente, de 30 a 90 s, cada um mirando uma persona. | MVP | Adaptar (`02-generateScript.ts`) |
| RF10 | Estrutura: gancho nos 3 primeiros segundos, desenvolvimento e chamada para ação com a palavra-chave. | MVP | Adaptar |
| RF11 | Registrar em cada roteiro a persona, o objetivo, o tema de origem e a palavra-chave. A persona fica gravada no roteiro mesmo quando não entra no catálogo. | MVP | Novo |
| RF12 | Incluir orientações de gravação (luz, enquadramento, áudio) e permitir gravar em lote. | MVP | Novo |
| RF13 | Filtro de conformidade do conselho aplicado ao roteiro: reprova sensacionalismo, promessa de resultado, "antes e depois" fora da regra e falta de CRM/RQE. | MVP | Adaptar (padrão de reprovação do `02b-factCheck.ts`) |
| RF14 | Checagem de fatos em afirmações de saúde, com fontes. | MVP | Reusar (`02b-factCheck.ts`) |

### 3.4 Kit de marca e edição

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF15 | Cadastrar kit de marca: cores, fontes, logo, estilo de legenda, vinheta, tela final e modelo de capa. | MVP | Adaptar (`dashboard/server/branding.ts`, `watermark.ts`) |
| RF16 | Receber o vídeo bruto enviado pela produção (upload) por dois caminhos: **na sessão do roteiro** que o originou (o vídeo fica ligado ao roteiro) ou **avulso**, para um vídeo gravado sem roteiro do sistema. | MVP | Novo |
| RF51 | Depois do upload, a IA analisa o vídeo bruto (transcrição e imagem) e preenche um formulário com a proposta do que fazer com ele: tema, persona, gancho, trechos a manter ou cortar, palavras de destaque na legenda, chamada para ação, palavra-chave e legenda do post. No upload pela sessão do roteiro, a IA parte do roteiro (tema, persona, gancho, chamada para ação e palavra-chave já definidos) e usa o vídeo para decidir cortes e edição. No upload avulso, a IA deduz tudo do próprio vídeo. | MVP | Adaptar (`cuts/select.ts`, `02-generateScript.ts`) |
| RF52 | A produção revisa o formulário campo a campo: mantém, altera ou remove cada sugestão. A edição automática só começa depois da revisão e segue o formulário revisado. | MVP | Novo |
| RF17 | Transcrever o áudio com tempo de cada palavra. | MVP | Reusar (`cuts/transcribe.ts`, faster-whisper) |
| RF18 | Cortar silêncios, gaguejos e repetições. | MVP | Adaptar (`cuts/jumpcut.ts` corta silêncio; gaguejo e repetição são novos) |
| RF19 | Legendas no estilo do kit de marca, com destaque de palavras. | MVP | Reusar (`05-buildCaptions.ts`, Remotion) |
| RF20 | Reenquadrar em 9:16 com o rosto do médico centralizado e zoom nos pontos de ênfase. | MVP | Adaptar (detector de rosto/fala dos cortes) |
| RF21 | Tela final com chamada para ação e palavra-chave. | MVP | Adaptar (Remotion) |
| RF22 | Inserir b-roll de banco de imagens com licença livre. | Depois | Reusar (`03-fetchFootage.ts`, filtro de licença) |
| RF23 | Exportar MP4 vertical 9:16 e capa. | MVP | Reusar (`06-renderVideo.ts`) |
| RF24 | Nunca gerar rosto ou voz sintética. O estágio de voz não existe nesta máquina. | MVP | Remover (`04-synthesizeVoice.ts`) |

### 3.5 Aprovação

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF25 | A produção aprova, pede ajuste (com comentário) ou descarta o roteiro; depois, o médico confirma ou pede ajuste. | MVP | Novo |
| RF26 | A produção aprova, pede ajuste ou descarta o vídeo editado; depois, o médico confirma ou pede ajuste. Só vai ao ar o que os dois aprovaram. | MVP | Novo |
| RF27 | Aprovação presa ao conteúdo exato: se roteiro ou vídeo mudar, a aprovação deixa de valer. | MVP | Reusar (`contentHash.ts`) |
| RF28 | Entregar o vídeo aprovado para download, com legenda sugerida do post. | MVP | Adaptar (`07-generateMetadata.ts`) |

### 3.6 Publicação

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF29 | A produção publica manualmente no Instagram do médico e informa ao sistema qual post corresponde a qual vídeo. | MVP | Novo |
| RF30 | Publicar e agendar automaticamente no Instagram, só com vídeo aprovado. | Depois | Reusar (`publishers/instagram.ts`, diário anti-duplicata, limite diário) |

### 3.7 Bot de captação

> **Pendente:** a forma de captação (app próprio na Meta, bot já existente ou site externo) não foi decidida ([pendencias.md](pendencias.md#integração-com-o-instagram-captação-de-interessados)). Os requisitos abaixo descrevem a opção "app próprio" e mudam conforme a decisão.
>
> **Direção provisória para o MVP:** ferramenta já aprovada pela Meta (ex.: ManyChat). Nesse caso, RF31, RF32 e RF37 ficam a cargo da ferramenta, e RF33 a RF36 viram configuração do fluxo dentro dela.

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF31 | Receber webhook de novo comentário no Instagram e detectar a palavra-chave do vídeo. | MVP | Novo |
| RF32 | Enviar mensagem privada a quem comentou, dentro da janela permitida pela plataforma. | MVP | Novo |
| RF33 | Fazer 2 ou 3 perguntas de qualificação (para quem é, qual o problema, qual cidade). | MVP | Novo |
| RF34 | Pedir consentimento explícito antes de coletar dado pessoal e registrar a resposta com data. | MVP | Novo |
| RF35 | Oferecer opção de não receber mais mensagens e respeitar a escolha. | MVP | Novo |
| RF36 | Não vender, não diagnosticar e não fazer anamnese; o texto do bot passa pelo filtro de conformidade. | MVP | Adaptar (RF13) |
| RF37 | Não responder duas vezes ao mesmo comentário. | MVP | Adaptar (padrão do diário anti-duplicata) |

### 3.8 Entrega do lead

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF38 | Registrar o lead com respostas, consentimento e origem (vídeo, persona, palavra-chave). | MVP | Novo |
| RF39 | Entregar o lead qualificado à equipe do médico. Destino **pendente** (WhatsApp, CRM ou planilha). | MVP | Novo |
| RF40 | Equipe do médico marca o resultado do lead (atendido, agendou, não respondeu). | MVP | Novo |

> No MVP, a entrega e o status do lead são manuais, até que se decida como automatizar.

### 3.9 Métricas e aprendizado

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF41 | No MVP, a produção confere visualizações, alcance e comentários de cada Reel direto no Instagram (painel de insights da conta profissional). A coleta automática pela API fica para depois e depende da decisão de integração. | MVP (manual) / Depois (automático) | Reusar (`instagramInsights.ts`) na coleta automática |
| RF42 | Mostrar por vídeo, gancho, persona e formato: leads gerados, qualificados e agendados. **Atenção:** depende de o lead chegar ao sistema com a origem; ver o aviso em [pendencias.md](pendencias.md#integração-com-o-instagram-captação-de-interessados). | MVP | Adaptar (`dashboard/`) |
| RF43 | Calcular custo por lead quando houver custo informado. | Depois | Adaptar (`dashboard/shared/llmCost.ts`) |
| RF44 | Usar o histórico de leads do cliente para priorizar temas e ganchos nos próximos roteiros. | Depois | Novo |

### 3.10 Operação

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF45 | Painel com execuções, estado de cada vídeo e falhas. | MVP | Reusar (`dashboard/`) |
| RF46 | Retomar uma edição que parou no meio, sem refazer o que já foi feito. | MVP | Reusar (`context.json`, `--resume`) |
| RF47 | Painel para a produção atender vários médicos, com os dados de cada um separados. | Depois | Novo |

## 4. Requisitos não funcionais

| ID | Requisito | Origem |
|---|---|---|
| RNF01 | **Disponibilidade:** painel e edição ficam na internet, acessíveis à produção, ao médico e à equipe do médico. Se a captação for própria (app na Meta), o bot fica no ar 24 h, com endpoint HTTPS público para o webhook. | Novo. A Máquina de Shorts roda em lote no PC de casa, sem endpoint público fixo. |
| RNF02 | **Multicliente:** dados de um cliente nunca aparecem para outro. | Novo. A Máquina de Shorts guarda estado em arquivos JSON de um dono só. |
| RNF03 | **LGPD:** consentimento registrado, coleta mínima, opção de saída, controlador (médico) e operadores (Máquina de Leads, assessoria e ferramenta de bot, se houver) definidos com revisão jurídica, política de privacidade publicada. Dado de saúde é sensível. | Novo. Há modelo de `docs/privacidade.html` na Máquina de Shorts. |
| RNF04 | **Segurança:** tokens e chaves nunca vão para log nem para o git; cada processo filho recebe só as variáveis necessárias. | Reusar (`redact.ts`, `childEnv.ts`, `secretStore.ts`) |
| RNF05 | **Conformidade com a plataforma:** só APIs oficiais da Meta. Sem scraping e sem robô que simula o app. | Novo |
| RNF06 | **Rastreabilidade:** todo lead aponta para vídeo, roteiro, persona e consentimento. | Novo |
| RNF07 | **Prazo de edição:** vídeo editado disponível para aprovação em até X horas após o upload (**a definir**). | Novo |
| RNF08 | **Custo:** custo de IA e infraestrutura por cliente conhecido e mostrado no painel. | Adaptar (`llmCost.ts`) |
| RNF09 | **Testes:** cada regra de conformidade e de LGPD tem teste automatizado. | Adaptar (Vitest, padrão de `test/qa/`) |
| RNF10 | **Usabilidade:** o médico confirma roteiro e vídeo pelo celular. A equipe do médico recebe e marca leads sem conhecimento técnico. | Novo. O painel atual é local, para o dono. |

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Nenhum conteúdo vai ao ar sem aprovação humana. |
| RN02 | O sistema não gera rosto nem voz sintética. |
| RN03 | O sistema não vende: qualifica e entrega o lead. |
| RN04 | Cada roteiro mira uma única persona. |
| RN05 | Roteiro, legenda e mensagem do bot passam pelo filtro de conformidade da profissão. |
| RN06 | O bot só inicia conversa a partir de comentário com a palavra-chave (não a partir de novo seguidor). |
| RN07 | O bot só coleta dado pessoal depois do consentimento. |
| RN08 | Quem pede para sair não recebe mais mensagens. |
| RN09 | A IA define a persona; só entra no catálogo do cliente a persona que a produção aprovar. Antes de sugerir uma persona nova, a IA tenta reusar uma salva. |

## 6. Mapa de reaproveitamento

O que a Máquina de Shorts já tem, separado em quatro grupos:

- **6.1 Usado no MVP:** entra na primeira versão, como está ou com adaptação.
- **6.2 Não usado:** não serve para a Máquina de Leads.
- **6.3 Uso futuro:** pode servir depois, mas não é necessário agora.
- **6.4 Nova feature:** não existe na Máquina de Shorts e precisa ser desenvolvido.

Caminhos relativos à raiz do repositório da Máquina de Shorts.

Pela [arquitetura](arquitetura.md) decidida em 2026-11-14, o que é reaproveitado vai para o worker de mídia (Node e Python). O sistema (login, painel, dados) é novo, em Laravel.

### 6.1 Usado no MVP

#### Como está (pouca ou nenhuma mudança)

| Componente | O que faz na Máquina de Shorts | Uso na Máquina de Leads | Requisitos |
|---|---|---|---|
| Orquestração por estágios: `lib/runContext.ts`, `lib/logger.ts`, `lib/rejection.ts`, `scripts/run_stage.ts` | Cada execução tem um `runId`, uma pasta própria e um `context.json` salvo de forma atômica após cada estágio. `--resume` retoma de onde parou. O log de cada execução vai para `logs/<runId>.log`. | Mesma estrutura para a edição de cada vídeo do cliente: transcrever, cortar, legendar, renderizar. Se a edição cair, retoma sem refazer a transcrição. | RF46 |
| Transcrição: `cuts/transcribe.ts`, `python/cuts/transcribe.py` | faster-whisper local. Devolve segmentos, palavras com tempo e o volume do áudio ao longo do vídeo. | Transcrever o vídeo bruto do cliente. É a base dos cortes, das legendas e da detecção de gaguejo. | RF17 |
| Legendas: `stages/05-buildCaptions.ts`, `lib/ptBr.ts` | Agrupa as palavras em legendas com a palavra falada em destaque. Inclui ajudas de texto em pt-BR. | Legenda do vídeo do cliente, no estilo do kit de marca. | RF19 |
| Render: `src/remotion/*`, `stages/06-renderVideo.ts`, `lib/ffmpeg.ts` | Monta o MP4 9:16 com Remotion 4 e React 19, usando o ffmpeg que vem com o Remotion. | Render final: vídeo do cliente + legenda + logo + tela final. A composição muda (ver 6.1, adaptações), o motor não. | RF23 |
| Ponte com Python: `lib/python.ts` | Roda um script Python e valida o JSON que ele devolve. | Mesmo uso para transcrição e reenquadramento. | RF17, RF20 |
| Aprovação presa ao conteúdo: `lib/contentHash.ts` | Liga cada aprovação ao hash exato do conteúdo. | Se o roteiro ou o vídeo mudar depois de aprovado, a aprovação cai. | RF27 |
| Segredos: `lib/redact.ts`, `lib/childEnv.ts`, `lib/secretStore.ts` | Mascara chaves nos logs. Cada processo filho recebe só as variáveis de que precisa. Chaves digitadas no painel ficam fora do git. | Tokens do Instagram de cada cliente e chaves de IA. | RNF04 |
| Trava de arquivo: `lib/fileLock.ts` | Impede dois processos de mexer no mesmo recurso ao mesmo tempo. | Útil enquanto houver estado em arquivo. Com banco de dados, a trava passa a ser do banco. | RNF02 |
| Temas recentes: `lib/recentTopics.ts` | Passa os ~30 assuntos recentes ao roteiro e rejeita repetição. | Não repetir tema do mesmo cliente. | RF08 |
| IA plugável: `lib/llmClient.ts`, `lib/llmTasks.ts`, `lib/openaiCompatible.ts`, `lib/providerProbe.ts`, `dashboard/server/llmProviders.ts`, `dashboard/server/platform.ts` | Vários provedores (Gemini, Anthropic, OpenAI-compatível, CLIs) e modelo por tarefa. Botão "Testar conexão". | Roteiro, formulário de edição, conformidade e legenda do post. Em produção, usar provedor com chave de API (ver seção 7). | RF09, RF13, RF51 |
| Busca na web: `lib/webSearch.ts`, `lib/factCheckSearch.ts`, `lib/searchSupport.ts` | Busca própria para a checagem de fatos quando o provedor de IA não tem busca. | Checagem de fatos de saúde e pesquisa simples de temas. | RF05, RF14 |
| Configuração validada: `src/shared/settings.ts`, `lib/config.ts`, `dashboard/server/settings.ts` | Schema Zod com padrões e validação. O painel grava o arquivo de forma atômica e guarda backup. | Validação das configurações de edição. O briefing de cada cliente vai para o banco (ver 6.4). | RF04 |
| Painel, base técnica: `dashboard/` (Vite + React + Express), `dashboard/server/runs.ts`, `logParser.ts`, `thumbnails.ts`, `preview.ts`, `scripts/preview_still.ts` | Lista execuções, mostra o tempo de cada etapa, gera miniaturas e prévia ao vivo de um quadro com o estilo de legenda. | Só como referência. O painel é refeito em Laravel + Inertia/React e o servidor Express não entra ([D1](arquitetura.md#d1-laravel-em-monolito-organizado-por-domínio-para-o-sistema), [D2](arquitetura.md#d2-inertia--react-no-painel)). Aproveitam-se as miniaturas e a prévia ao vivo, que passa a usar a composição compartilhada para configurar o kit de marca ([D7](arquitetura.md#d7-repositório-único-com-a-composição-de-vídeo-compartilhada)). | RF45, RF15 |
| Testes: Vitest, padrão de `test/qa/` | Mais de 570 testes. Testes de invariantes de segurança e qualidade. | Mesmo padrão para as regras de conformidade e LGPD. | RNF09 |

#### Com adaptação

| Componente | O que faz hoje | O que muda | Requisitos |
|---|---|---|---|
| Roteiro: `stages/02-generateScript.ts` | Escreve gancho, cenas, final e uma busca de imagem por trecho, a partir de um tema sorteado. | Recebe briefing, persona e tema. Gera roteiro para o médico gravar, com CTA e palavra-chave, sem buscas de imagem. Inclui orientações de gravação. | RF09 a RF12 |
| Regras do dono: `lib/ownerRules.ts` | Texto livre do dono que entra no prompt, abaixo das regras fixas da máquina. | Vira o tom de voz e os temas proibidos de cada cliente. As regras do conselho continuam acima das do cliente. | RF01, RF04 |
| Checagem de fatos: `stages/02b-factCheck.ts` | Até 3 rodadas com busca na web. Premissa falsa ou checagem sem fonte reprova o roteiro. | Continua checando fatos e ganha o filtro de conformidade: sensacionalismo, promessa de resultado, "antes e depois" e CRM/RQE. O mesmo filtro vale para a legenda e para as mensagens do bot. | RF13, RF14, RF36 |
| Metadados: `stages/07-generateMetadata.ts` | Título, descrição com créditos CC BY e tags, dentro dos limites do YouTube. | Legenda sugerida do post no Instagram, com CTA, palavra-chave e identificação CRM/RQE. Sai a lógica de créditos de imagem. | RF28 |
| Seleção de trechos: `cuts/select.ts` | A IA escolhe os melhores trechos de um vídeo longo e confere se o corte não muda o sentido. | Base do formulário de edição: a IA propõe os trechos a manter e a cortar do vídeo bruto, junto com tema, persona, gancho e chamada para ação. | RF51 |
| Corte de pausas: `cuts/jumpcut.ts` | Corta silêncio entre falas e mantém risadas, usando o volume do áudio. | Corta silêncio do vídeo do cliente. Não precisa manter risadas. Gaguejo e repetição são novos (ver 6.4). | RF18 |
| Reenquadramento: `cuts/render.ts`, `python/cuts/render_clip.py`, `camera.py`, `detect.py` (YuNet), `speaker.py` e `asd.py` (Light-ASD) | Recorta vídeo horizontal em 9:16 e move a câmera para quem está falando. | Na maioria dos casos há uma só pessoa e o vídeo já é vertical. Usa o detector de rosto para centralizar e para dar zoom nos pontos de ênfase. A detecção de quem fala só é necessária com mais de uma pessoa. | RF20 |
| Posição da legenda: `python/cuts/placement.py`, `textdetect.py` (PP-OCRv3) | Coloca a legenda onde não cubra rosto nem texto já existente no vídeo. | Mesmo uso no vídeo do cliente. | RF19 |
| Marca: `lib/watermark.ts`, `dashboard/server/branding.ts`, `python/cuts/watermark.py` | Um logo do dono como marca d'água. | Base do kit de marca: um logo por cliente. Cores, fontes, vinheta, tela final e capa são novos (ver 6.4). | RF15 |
| Estilos de legenda dos cortes | Estilo pequeno em Montserrat e estilo "Impacto" em Anton, em caixa alta. | Viram predefinições que o kit de marca pode escolher e ajustar. | RF15, RF19 |
| Limpeza de execuções: `lib/retention.ts` | Apaga execuções antigas que não foram publicadas. | Prazo de guarda do vídeo bruto e dos dados do lead, exigido pela LGPD. | RNF03 |
| Métricas no painel: `dashboard/server/aggregate.ts`, `dashboard/shared/llmCost.ts` | Junta execuções, histórico e métricas. Mostra custo de IA por execução. | Junta vídeos, posts, leads e custo por cliente. As métricas do YouTube (`metrics.ts`) saem. | RF42, RNF08 |
| Páginas legais: `docs/privacidade.html`, `docs/termos.html` | Política de privacidade e termos do app da Meta da Máquina de Shorts. | Modelo de partida. O texto precisa ser reescrito para dado de saúde e revisado por advogado. | RNF03 |

### 6.2 Não usado

| Componente | O que faz na Máquina de Shorts | Por que não entra |
|---|---|---|
| Sorteio de tema: `stages/01-pickTopic.ts`, `config/topics.seed.json` | Sorteia categoria, ideia e formato de uma lista fixa de curiosidades. | O tema vem do briefing, da persona e da tendência do nicho. |
| Voz sintética: `stages/04-synthesizeVoice.ts`, `python/tts/*`, `lib/geminiTts.ts`, `lib/elevenLabsTts.ts`, `dashboard/server/voices.ts`, `dashboard/server/voiceRef.ts` | Narração com Kokoro, Chatterbox (clonagem de voz), Gemini TTS ou ElevenLabs, e encurtamento de pausas. | RN02: o sistema nunca gera voz sintética. A voz é sempre a do cliente. |
| Imagens geradas por IA: `lib/illustrate.ts`, `lib/imageProvider.ts`, `lib/quota.ts` | Gera uma ilustração 3D por trecho da fala e trata a cota de imagens do `agy`. | O vídeo é o cliente falando. Imagem gerada por IA em conteúdo de saúde traz risco de confiança e de conformidade. |
| Formato terminal: `lib/terminalCards.ts` | Vídeo sem imagem, feito de cartões animados numa janela de terminal. | Não há vídeo sem o cliente. |
| Uma imagem por trecho: `lib/beats.ts` | Divide cada cena em trechos, cada um com sua imagem. | Não há imagem por trecho; o vídeo é contínuo. |
| Memes e efeitos: `stages/05b-planEdits.ts`, `lib/editPlan.ts`, `lib/memeLibrary.ts`, `lib/memeDemo.ts`, `assets/memes/`, `scripts/memes.ts` | Figurinhas e sons curtos planejados pela IA. | Tom inadequado para saúde. Pode ser lido como sensacionalismo pelo conselho. |
| Camada de humor: `cuts/humor.ts`, `python/cuts/humor.py` | Piadas entre asteriscos, emojis de reação e efeitos nos momentos de risada. | Mesmo motivo dos memes. |
| Cortes de canais de terceiros: `cuts/feed.ts`, `cuts/download.ts`, `cuts/compilation.ts`, `cuts/metadata.ts` (bloco de crédito), `config/cuts.json`, `dashboard/server/cuts.ts`, `CutsChannels.tsx` | Descobre vídeos novos de canais autorizados pelo RSS, baixa com `yt-dlp`, monta compilações e credita o canal de origem. | A Máquina de Leads só edita material do próprio cliente. |
| Juiz de imagem e dataset: `lib/relevance.ts` (no papel de juiz por trecho), `lib/verdictLog.ts`, `scripts/export_verdicts_dataset.ts`, `scripts/test_agy_relevance.ts` | Dá nota a cada imagem contra a frase e monta dataset para treinar um juiz local. | Sem imagens de acervo no MVP. Para b-roll futuro, ver 6.3. |
| Agendador do Windows: `scheduler/*.ps1`, `scripts/loop.ps1` | Roda o pipeline em horários fixos no PC de casa. | A edição é disparada pelo upload da produção, e o bot por webhook. Isso pede fila de tarefas no servidor (ver 6.4). |
| Túnel temporário: `lib/cloudflaredTunnel.ts` | Abre um endereço público por poucos minutos para o Instagram buscar o vídeo. | O servidor terá endereço público fixo. |
| Antigravity CLI e Claude Code como motor de produção: `lib/antigravityCli.ts`, `lib/antigravitySession.ts`, `lib/cliAgent.ts`, `lib/claudeCodeProfile.ts` | IA nos créditos do plano pessoal do dono, sem chave de API. | Plano pessoal para atender clientes pagantes pode violar os termos do provedor (seção 7). Pode continuar no desenvolvimento. |
| Receita do YouTube: `dashboard/server/revenue.ts` | Estado da monetização do canal. | O objetivo é lead, não receita de anúncio. |
| Acesso pelo Tailscale | Abre o painel do PC de casa pela rede privada. | O painel precisa estar na internet, com login para produção, médico e equipe do médico. |
| Agentes do Claude do repositório: `.claude/agents/*` | Agentes de apoio ao desenvolvimento (estratégia de TikTok, curadoria de Instagram etc.). | São ferramentas de desenvolvimento, não parte do produto. Podem ser consultados, mas não entram no sistema. |

### 6.3 Uso futuro (não necessário agora)

| Componente | O que faz na Máquina de Shorts | Quando passa a valer | Requisitos |
|---|---|---|---|
| Publicação no Instagram: `publishers/instagram.ts`, `publishers/instagramCaption.ts`, `publishers/gates.ts`, `publishers/runner.ts` | Publica Reels com diário anti-duplicata, limite diário e trava de arquivo. Se uma rede falha, as outras seguem. | Quando a publicação automática sair do "fora do MVP". Só publica vídeo aprovado (RN01). | RF30 |
| YouTube: `lib/youtubeAuth.ts`, `lib/youtubeUpload.ts`, `publishers/youtube.ts`, `dashboard/server/youtube.ts`, `dashboard/server/metrics.ts` | Login, envio de Shorts, conferência da privacidade aplicada e métricas públicas. | Quando o YouTube Shorts entrar como canal. A YouTube Data API também é fonte de tendências. | RF06 |
| Imagens de acervo com licença: `stages/03-fetchFootage.ts`, `vendor/openmontage_adapter/`, filtro de licença, `lib/relevance.ts` | Busca imagens e vídeos com licença livre (NASA, Wikimedia, Pexels, Pixabay) e dá nota a cada um contra a fala. | Quando o b-roll entrar. O adaptador é AGPL-3.0: avaliar a licença antes de usar num serviço na internet (seção 7). | RF22 |
| Vários Reels de um vídeo longo: `cuts/select.ts` (a mesma peça usada no formulário, ver 6.1) | Escolhe vários trechos de um vídeo longo. | Quando a produção mandar vídeos longos do médico (live, palestra, entrevista) para virar vários Reels. | Novo requisito futuro |
| Instagram pela API: `lib/instagramApi.ts`, `lib/instagramInsights.ts`, `lib/instagramAuth.ts` | Cliente HTTP da API do Instagram, login com token de 60 dias renovado sozinho e métricas por Reel (visualizações, alcance, curtidas, comentários, salvos). Escopos atuais: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`. | Quando entrar a coleta automática de métricas ou a captação própria (app na Meta). Para o bot, o login passa a pedir escopos de comentários e de mensagens **[verificar]**. No MVP, métricas manuais e captação por ferramenta pronta dispensam a API. | RF41, RF31, RF32 |
| Diário anti-duplicata: `lib/uploadHistory.ts` e diários `upload.<plataforma>.journal.json` | Garante que nova tentativa não publica duas vezes e respeita o limite diário. | Na publicação automática (RF30) e, se a captação for própria, para o bot não responder duas vezes ao mesmo comentário. | RF30, RF37 |
| Música de fundo: `dashboard/server/music.ts`, `python/edits/retime_bass.py` | Biblioteca de músicas licenciadas do dono e edição no ritmo da música. | Quando o kit de marca incluir trilha. Só música com licença. | RF15 |
| Projeto do CapCut: `python/capcut/*`, `planejamento/capcut-templates-automacao.md` | Prova de conceito: gera um projeto do CapCut a partir de um modelo, trocando a mídia. Validado na versão 9.6 do CapCut no Windows, sem documentação oficial. | Quando um editor humano quiser ajustar o vídeo no CapCut antes da aprovação. O formato pode mudar a cada versão do CapCut. | Novo requisito futuro |
| Modelo do que viraliza: `scripts/collect_shorts_stats.ts`, `scripts/build_viral_dataset.ts`, `python/viral/eval_laya.py`, `python/cuts/laya_rank.py`, `scripts/laya_compare.ts` | Coleta métricas públicas de Shorts do nicho e avalia um modelo que ranqueia o que vai viralizar. | No ciclo de aprendizado, treinado com os dados de **lead** do cliente, não só com visualizações. Os scripts servem de referência; a métrica-alvo muda. | RF44 |
| Escolha de provedor de IA pelo painel: `dashboard/src/LlmTasksSection.tsx`, `KeysEditor.tsx` | O dono escolhe provedor e modelo por tarefa e digita as chaves no painel. | Quando houver vários clientes ou agências com contas próprias de IA. No MVP, os desenvolvedores configuram. | RF47 |
| Planejamento de várias contas: `planejamento/marco-5-multicontas-e-antigravity.md` | Plano para rodar 15 contas independentes. | Referência para o painel de vários clientes. | RF47 |

### 6.4 Nova feature (desenvolver)

| Feature | O que precisa | Requisitos |
|---|---|---|
| Banco de dados multicliente | Trocar os arquivos JSON de um dono só por PostgreSQL ([D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql), [D6](arquitetura.md#d6-proteção-do-banco-e-escala-guiada-por-medição)). Vídeos ficam no storage, nunca no banco. Tabelas de cliente, persona, roteiro, vídeo, aprovação, post, conversa, lead e consentimento. Dado de um cliente nunca aparece para outro. | RNF02, RNF06 |
| Login e perfis | Acesso com login para produção, médico e equipe do médico (e consultor, se o papel dele for confirmado), cada um com suas permissões. Feito com os recursos do Laravel (Breeze/Fortify, Policies), com os critérios da [verificação final](verificacao-final.md#2-segurança-do-painel-e-da-api). | RF25, RF26, RF40 |
| Briefing e profissão | Telas e modelo de dados do briefing e da profissão regulada (conselho, CRM, RQE). | RF01, RF03 |
| Personas definidas pela IA | Chamada de IA que define o público a partir do tema. Comparação com o catálogo do cliente: no MVP, a própria IA escolhe entre as personas salvas; com catálogos grandes, comparação por embeddings. Ações de salvar, juntar, corrigir e ignorar na aprovação. Sugestão do conjunto inicial a partir do nicho. | RF02, RF48 a RF50, RN09 |
| Kit de marca completo | Cores, fontes, estilo de legenda, vinheta de abertura, tela final com palavra-chave e modelo de capa. Nova composição Remotion que recebe o kit como dado. | RF15, RF21 |
| Upload do vídeo bruto | Envio de arquivos grandes, que retoma se a conexão cair. Dois caminhos: na sessão do roteiro (vídeo ligado ao roteiro) ou avulso. Armazenamento e disparo da análise. | RF16 |
| Formulário de edição sugerido pela IA | Análise do vídeo bruto (transcrição e imagem), preenchimento do formulário (tema, persona, gancho, trechos, destaques da legenda, chamada para ação, palavra-chave, legenda do post) partindo do roteiro quando houver, tela de revisão campo a campo e edição guiada pelo formulário revisado. | RF51, RF52 |
| Gaguejo e repetição | Detectar na transcrição palavras repetidas, frases recomeçadas e hesitações ("é...", "tipo") e cortar sem quebrar o sentido. | RF18 |
| Fluxo de aprovação | Estados (pendente, aprovado, ajuste pedido, descartado), comentário de ajuste, histórico e aviso à produção e ao médico quando há algo para aprovar. Funciona no celular. | RF25, RF26, RNF10 |
| Filtro de conformidade por profissão | Regras do conselho guardadas como dados, por profissão, com teste de cada regra. Primeiro conselho: CFM. Depende do texto oficial da Resolução CFM nº 2.336/2023. | RF13, RF36, RN05 |
| Pesquisa de temas assistida | No MVP: sugestão de temas por persona com IA e busca na web, revisada pela produção. | RF05 |
| Registro do post publicado | A produção informa o link do Reel publicado e o sistema liga o post ao vídeo e à palavra-chave. | RF29 |
| Webhook de comentários (depende da pendência de integração) | Endpoint HTTPS que recebe os avisos da Meta, confere a assinatura e põe o comentário numa fila. | RF31, RNF01 |
| Bot de captação (depende da pendência de integração) | Conversa com estados: resposta privada ao comentário, pedido de consentimento, 2 ou 3 perguntas, opção de sair. Respeita a janela de resposta da plataforma. Textos passam pelo filtro de conformidade. | RF32 a RF37 |
| Consentimento e LGPD | Registro do consentimento com data e texto mostrado, lista de quem pediu para sair, prazo de guarda, atendimento a pedido de acesso ou exclusão do titular. | RF34, RF35, RNF03 |
| Lead | Registro do lead com respostas e origem, entrega à equipe do médico (destino pendente) e status do atendimento. | RF38 a RF40 |
| Atribuição e métricas de lead | Ligar cada lead a vídeo, gancho, persona e formato. Painel com leads gerados, qualificados e agendados. | RF42, RNF06 |
| Hospedagem e fila de tarefas | Servidor na internet para o painel e a edição (e para o webhook, se a captação for própria). Fila de tarefas para edição e render, com worker que roda o Remotion e o Python. Substitui o PC de casa e o agendador do Windows. Decidido: fila numa tabela do PostgreSQL e piloto num servidor com Docker Compose e Caddy ([D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql), [D8](arquitetura.md#d8-implantação-inicial-num-servidor-com-docker-compose-e-caddy)). | RNF01, RNF07 |
| Custo por cliente | Somar custo de IA, render e armazenamento por cliente. | RNF08 |

## 7. Riscos herdados da Máquina de Shorts

- **IA nos créditos de plano pessoal.** A Máquina de Shorts usa o Antigravity CLI com os créditos do plano do dono. Usar plano pessoal para atender clientes pagantes pode violar os termos do provedor. **[verificar]** Para o produto, prever API com chave e custo por cliente.
- **Remotion.** Gratuito para empresas de até 3 pessoas; com 4 ou mais pode exigir licença paga. **[verificar]**
- **AGPL.** O adaptador de busca de imagens (`vendor/openmontage_adapter/`) é AGPL-3.0. Em serviço oferecido pela rede, a AGPL pode obrigar a abrir o código. Evitar no MVP (b-roll está fora). **[verificar]**
- **Escopos do Instagram.** O login atual não pede escopos de comentários nem de mensagens. O bot exige escopos novos e, para contas que não são testadoras, revisão do app pela Meta. **[verificar]**
- **Hospedagem.** O modelo atual (PC de casa + Tailscale + túnel `cloudflared` temporário) não serve para webhook permanente.

## 8. Pendências que bloqueiam requisitos

| Pendência ([pendencias.md](pendencias.md)) | Requisitos afetados |
|---|---|
| Destino do lead | RF39, RF40 |
| Papel do consultor | RF25, RF26, atores |
| Critérios de sucesso do piloto | RF42, RNF07 |
| Integração com o Instagram (app próprio, bot existente ou site externo) | RF31 a RF37, RF41, RF42, RNF01 |
| Prazo de edição | RNF07 |
| Acesso da produção ao Instagram do médico | RF29 |
| Provedor de IA em produção | RF09, RF13, RF51, RNF08 |
| Licença do Remotion | RF19, RF21, RF23 |
| Regras da API de mensagens do Instagram | RF31, RF32, RN06 |
| Texto oficial da Resolução CFM nº 2.336/2023 | RF13, RF36, RN05 |
| Base legal LGPD (revisão jurídica) | RF34, RNF03, RN07 |
