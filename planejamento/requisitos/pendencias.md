# Decisões e pendências

## Decisões tomadas

Agrupadas por tema. Quando uma decisão foi refinada depois, a tabela mostra só a versão em vigor, com a data da última mudança.

### Produto e escopo

| Data | Decisão |
|---|---|
| 2026-11-12 | Cliente piloto: médico otorrinolaringologista, que chegou por meio do seu consultor. |
| 2026-11-12 | Canal inicial: Instagram Reels. |
| 2026-11-13 | Foco do MVP: gerar vídeos que captam leads. Site externo fica para outro momento. |
| 2026-11-14 | Descartada, por ora, a ideia de editar com IA o vídeo de boas-vindas para o médico dizer o nome do interessado. Pode voltar de outra forma, sem voz ou rosto sintético (ex.: um vídeo real diferente para cada tipo de conteúdo). |
| 2026-11-12 | O sistema não vende: qualifica o lead e entrega à equipe do médico. |

### Papéis e modelo de negócio

| Data | Decisão |
|---|---|
| 2026-11-13 | **Médico:** contrata o serviço, grava os vídeos com a produção e confirma o conteúdo. |
| 2026-11-13 | **Produção:** empresa assessora contratada e paga pelo médico, com equipe própria. É parceira (sociedade) da Máquina de Leads e participa do desenvolvimento. Opera o sistema, aprova o conteúdo primeiro e publica. |
| 2026-11-13 | **Equipe do médico:** recebe os leads, cadastra como pacientes no sistema da clínica e atende. Não opera a Máquina de Leads. |
| 2026-11-13 | **Desenvolvedores:** desenvolvem, mantêm e treinam a produção na implantação. Não operam o dia a dia. |

### Conteúdo e edição

| Data | Decisão |
|---|---|
| 2026-11-12 | O sistema não gera rosto nem voz sintética; só edita material gravado do próprio médico. |
| 2026-11-13 | Aprovação humana obrigatória: a produção aprova primeiro e o médico confirma. Só vai ao ar o que os dois aprovaram. |
| 2026-11-12 | Personas não são cadastradas à mão: a IA define o público a partir do tema, reusa uma persona salva quando for parecida, e a produção decide na aprovação se salva, junta, corrige ou ignora. O roteiro sempre guarda a persona usada. |
| 2026-11-14 | O vídeo bruto chega por dois caminhos: (1) a IA gera o roteiro, e a produção faz o upload na sessão desse roteiro, então a IA já sabe o que fazer e como editar; (2) upload avulso de vídeo gravado sem roteiro, e a IA deduz tudo do vídeo. |
| 2026-11-13 | Depois do upload, a IA sugere um formulário com o que fazer com o vídeo (tema, persona, gancho, cortes, legenda, chamada para ação), e a produção mantém, altera ou remove cada campo. A edição segue o formulário revisado. |

### Publicação, captação e métricas

| Data | Decisão |
|---|---|
| 2026-11-13 | Publicação manual no MVP, feita pela produção no Instagram do médico. Publicação automática fica para depois. |
| 2026-11-13 | Métricas dos vídeos no MVP: a produção confere direto no Instagram (insights da conta profissional). Coleta automática fica para depois. |
| 2026-11-14 | Entrega e status do lead são manuais no MVP, até decidir como automatizar. |

### Arquitetura

Motivos, cuidados e protocolos de mudança de cada decisão em [arquitetura.md](arquitetura.md).

| Data | Decisão |
|---|---|
| 2026-11-14 | Sistema em Laravel, monolito organizado por domínio, sem API interna ([D1](arquitetura.md#d1-laravel-em-monolito-organizado-por-domínio-para-o-sistema)). |
| 2026-11-14 | Painel com Inertia + React ([D2](arquitetura.md#d2-inertia--react-no-painel)). |
| 2026-11-14 | Mídia e IA num worker separado em Node e Python, herdado da Máquina de Shorts, sem porta pública. O painel Express herdado não entra ([D3](arquitetura.md#d3-worker-de-mídia-separado-em-node-e-python)). |
| 2026-11-14 | Laravel e worker conversam por uma tabela de tarefas no PostgreSQL, sem API HTTP ([D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql)). |
| 2026-11-14 | Sem Redis no início; se precisar, Valkey, primeiro para cache e sessão ([D5](arquitetura.md#d5-sem-redis-no-início)). |
| 2026-11-14 | Banco protegido desde o início e escala só guiada por medição ([D6](arquitetura.md#d6-proteção-do-banco-e-escala-guiada-por-medição)). |
| 2026-11-14 | Repositório único, com a composição de vídeo compartilhada entre worker e painel ([D7](arquitetura.md#d7-repositório-único-com-a-composição-de-vídeo-compartilhada)). |
| 2026-11-14 | Piloto num servidor com Docker Compose e Caddy ([D8](arquitetura.md#d8-implantação-inicial-num-servidor-com-docker-compose-e-caddy)). |

## Pendências

### Resumo

| Pendência | Tipo | Situação | Bloqueia |
|---|---|---|---|
| [Integração com o Instagram](#integração-com-o-instagram-captação-de-interessados) | Produto | Direção provisória: ferramenta já aprovada pela Meta | Captação (RF31 a RF37), métricas automáticas (RF41), leads por vídeo (RF42), servidor (RNF01) |
| [Destino do lead](#destino-do-lead) | Produto | Aberta; manual no MVP | Entrega automática (RF39, RF40) |
| [Papel do consultor](#papel-do-consultor-no-piloto) | Negócio | Aberta | Perfis de acesso |
| [Critérios de sucesso do piloto](#critérios-de-sucesso-do-piloto) | Negócio | Aberta | Avaliação do piloto, métricas (RF42) |
| [Prazo de edição](#prazo-de-edição) | Produto | Aberta | Tamanho do servidor de render (RNF07) |
| [Acesso da produção ao Instagram do médico](#acesso-da-produção-ao-instagram-do-médico) | Produto | Aberta; recomendação registrada | Publicação manual (RF29) |
| [Provedor de IA em produção](#provedor-de-ia-em-produção) | Técnica | Aberta | Custo por cliente (RNF08) |
| [Licença do Remotion](#licença-do-remotion) | Técnica | Aberta | Motor de render, quando a empresa crescer |
| [Domínio de Laravel na equipe](#domínio-de-laravel-na-equipe) | Técnica | Aberta; premissa da arquitetura | Escolha do Laravel ([D1](arquitetura.md#d1-laravel-em-monolito-organizado-por-domínio-para-o-sistema)) |
| [Contrato das tarefas do worker](#contrato-das-tarefas-do-worker) | Técnica | Aberta | Integração Laravel e worker ([D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql)) |
| [Site externo (futuro)](#site-externo-futuro) | Produto | Fora do MVP; em espera | Nada no MVP |
| [Verificações técnicas e legais](#verificações-técnicas-e-legais) | Verificação | A conferir na fonte | Ver a lista |
| [Verificação final](verificacao-final.md) | Verificação | Checklist aberto | Ida ao ar com médicos reais (segurança, LGPD, dependências e licenças) |

### Integração com o Instagram (captação de interessados)

Como captar quem se interessa pelo vídeo? Ainda não decidido.

**Direção provisória para o MVP (2026-11-13):** usar uma ferramenta já aprovada pela Meta (ex.: ManyChat) só para conversar com o interessado e qualificá-lo. O site externo fica para depois.

| Opção | Como funciona | Ganha | Perde |
|---|---|---|---|
| **App próprio na Meta** | A Máquina de Leads usa a API oficial: lê o comentário com a palavra-chave e responde no direct com o próprio bot. | Lead, conversa e métricas dentro do sistema; vínculo direto entre vídeo e lead. | Exige revisão do app pela Meta (acesso avançado) e verificação da empresa para atender mais de um médico. O piloto funciona sem revisão, com a conta do médico como testadora. Pode levar semanas e ser recusado. **[verificar]** |
| **Bot já existente** (ex.: ManyChat) | Ferramenta já aprovada pela Meta faz o fluxo da palavra-chave. | Sem revisão própria; entra no ar rápido. No plano pago, cada lead pode ser enviado ao sistema (ou a uma planilha) com a origem. | Sem API de relatórios: as métricas agregadas ficam no painel da ferramenta. Custo por conta de Instagram. |
| **Site externo** | O vídeo e o bot levam a uma página própria (ex.: link na bio ou no direct), onde o interessado responde as perguntas. | Liberdade total no fluxo, no visual e na coleta; consentimento e LGPD controlados pelo sistema; origem por vídeo com link rastreável. | Um passo a mais para o interessado (sair do Instagram), o que tende a reduzir conversão; ainda precisa decidir como o link chega até ele. |

> [!IMPORTANT]
> **Considerar na decisão: leads por vídeo.** O Instagram mostra visualizações, não leads. Para saber quantos leads cada vídeo gerou (RF42), o lead precisa chegar ao sistema com a origem (qual vídeo). Sem essa contagem, o ciclo de aprendizado (o que gerou lead orienta os próximos roteiros) fica sem dado.
>
> - **App próprio** e **site externo:** resolvem de forma nativa.
> - **Bot já existente:** o ManyChat não tem API de relatórios, mas a ação "External Request" do plano Pro envia os dados de cada contato a um endereço nosso no momento da conversa. Marcando em cada gatilho (um por Reel ou palavra-chave) um campo com o vídeo de origem, o lead chega com a origem. Sem servidor próprio, o envio pode ir para uma planilha via Zapier ou Make. **[verificar]** na documentação oficial: o post de origem não é variável nativa do gatilho, e há relato de limite de 10 s na resposta do External Request.

Requisitos afetados: RF31 a RF37 (bot), RF41 (métricas automáticas), RF42 (leads por vídeo), RNF01 (servidor para webhook) e a hospedagem.

#### O que a pesquisa encontrou sobre o ManyChat

Fontes de terceiros, consultadas em 2026-11-13. Conferir no site oficial antes de orçar. **[verificar]**

| Item | O que foi encontrado |
|---|---|
| Métricas na ferramenta | Painel de insights (contatos por canal), estatística por bloco de cada fluxo e uma página de análise do Instagram (7, 14 ou 30 dias), ainda em beta. |
| API | REST pública, em beta, a partir do plano Pro. Lê e atualiza contatos e campos; **não** tem endpoint de relatórios. |
| Envio de lead para fora | Ação "External Request" (Pro) e integrações com Zapier e Make. |
| Preço | Pro por volta de US$ 39/mês (US$ 29/mês no anual) com 2.500 contatos ativos; acima disso, cerca de US$ 0,05 por contato. A tabela mudou em março de 2026; valores antigos (US$ 15) estão desatualizados. Uma conta por Instagram de médico. |

### Destino do lead

Para onde vai o lead qualificado? Ainda não decidido. **No MVP, a entrega e o status do lead são manuais** (decisão de 2026-11-14). Opções para automatizar:

- WhatsApp do consultório.
- CRM ou sistema de agendamento que o consultório já usa.
- Planilha ou painel simples.

### Papel do consultor no piloto

O consultor participa do fluxo (acompanha o médico, aprova vídeos) ou só fez a ponte? Ele faz parte da assessoria (a produção) ou é outra pessoa?

### Critérios de sucesso do piloto

Quais números o médico, a produção e o consultor esperam ver para considerar o piloto bem-sucedido? Ver sugestões em [mvp.md](mvp.md#como-saber-se-deu-certo).

### Prazo de edição

Quanto tempo entre o upload do vídeo bruto e o vídeo editado pronto para aprovação? Define o tamanho do servidor de render. Requisito afetado: RNF07.

### Acesso da produção ao Instagram do médico

A produção publica no Instagram do médico (RF29). Como ela acessa a conta? Recomendado: permissão por função na conta (Meta Business Suite), sem compartilhar a senha do médico. Requisito afetado: RF29.

### Provedor de IA em produção

A Máquina de Shorts usa IA nos créditos do plano pessoal do dono. Para atender médicos pagantes, isso pode violar os termos do provedor **[verificar]**. Opção: API com chave e custo por cliente. Requisitos afetados: roteiro, formulário de edição, conformidade e RNF08 (custo por cliente).

### Licença do Remotion

O Remotion (motor de render herdado da Máquina de Shorts) é gratuito para empresas de até 3 pessoas; com 4 ou mais pode exigir licença paga **[verificar]**. Decidir entre pagar a licença ou trocar o motor quando a empresa crescer.

### Domínio de Laravel na equipe

A escolha do Laravel parte da premissa de que quem vai desenvolver e manter o sistema domina Laravel. Confirmar quem são essas pessoas. Se a equipe for mais forte em TypeScript, seguir o protocolo de [D1](arquitetura.md#d1-laravel-em-monolito-organizado-por-domínio-para-o-sistema).

### Contrato das tarefas do worker

Definir as colunas de `tarefas_midia` e o JSON de cada tipo de tarefa (gerar roteiro, analisar vídeo, editar vídeo): campos de entrada, formato do resultado e códigos de erro. Regra já decidida: o payload leva só IDs e chaves de arquivo, nunca dado de saúde. Ver [D4](arquitetura.md#d4-comunicação-pela-fila-no-postgresql).

### Site externo (futuro)

Fora do MVP, em espera. Ideia registrada: página de boas-vindas personalizada, com um vídeo real gravado pelo médico, para passar confiança a quem tem receio de sites externos.

- **Descartado (2026-11-14):** editar o vídeo com IA para o médico dizer o nome de cada pessoa. Seria voz ou rosto sintético, contra a decisão de 2026-11-12 e o risco 6 de [riscos-e-restricoes.md](riscos-e-restricoes.md#6-vídeo-com-pessoa-sintética).
- **Possível retomada:** um vídeo real de boas-vindas diferente para cada tipo de conteúdo. O nome da pessoa, se usado, aparece em texto na página.

### Verificações técnicas e legais

Itens marcados com **[verificar]** nos documentos. Conferir na fonte oficial antes de construir em cima deles.

| Item | Afeta | Onde aparece |
|---|---|---|
| Regras da API de mensagens do Instagram: janela de resposta a comentários (~7 dias), janela de 24 h, ausência de aviso de novo seguidor | Integração | [riscos-e-restricoes.md](riscos-e-restricoes.md#1-bot-de-mensagens-nas-redes) |
| Processo de revisão do app pela Meta: limite de testadores, prazos e documentos da verificação da empresa | Integração | Esta página |
| Nomes atuais das permissões do Instagram para comentários, mensagens e métricas | Integração | [analise-de-requisitos.md](analise-de-requisitos.md) |
| ManyChat: preço atual, External Request, origem do post no gatilho, limite de 10 s | Integração | Esta página |
| Texto oficial da Resolução CFM nº 2.336/2023 | Filtro de conformidade (RF13, RF36) | [riscos-e-restricoes.md](riscos-e-restricoes.md#3-regras-de-conselhos-profissionais) |
| Base legal LGPD para dado de saúde e papéis de cada empresa (controlador: médico; operadores: Máquina de Leads, assessoria e ferramenta de bot); pede revisão jurídica | Consentimento, captação (RF34, RNF03) | [riscos-e-restricoes.md](riscos-e-restricoes.md#4-lgpd-proteção-de-dados) |
| Termos dos provedores de IA para uso comercial com plano pessoal | Provedor de IA | Esta página |
| Licença do Remotion | Motor de render | Esta página |
| Licença AGPL do adaptador de imagens (só se o b-roll entrar) | b-roll futuro | [analise-de-requisitos.md](analise-de-requisitos.md) |
