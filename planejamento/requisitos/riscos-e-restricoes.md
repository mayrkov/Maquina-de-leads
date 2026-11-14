# Riscos e restrições

Problemas identificados na ideia original e como contorná-los.

> **Atenção:** as regras das plataformas e as normas citadas aqui não foram conferidas na fonte oficial durante a escrita deste documento. Confirme cada item marcado com **[verificar]** antes de construir em cima dele.

## 1. Bot de mensagens nas redes

**Problema:** a ideia original previa que o bot chamasse no direct quem comentasse **ou começasse a seguir** o perfil.

- **Seguir:** a API oficial do Instagram não avisa quando alguém novo segue o perfil. Não dá para disparar mensagem a partir de um novo seguidor por vias oficiais. **[verificar]**
- **Comentário:** é possível responder a quem comentou com uma mensagem privada, dentro de uma janela de tempo limitada (cerca de 7 dias). **[verificar]**
- **Mensagem iniciada pelo usuário:** é possível responder a quem mandou mensagem primeiro, dentro da janela de atendimento da plataforma. **[verificar]**
- **TikTok:** não oferece API pública para mensagens diretas. **[verificar]**

**Solução:** usar o modelo "comente a palavra-chave": o vídeo pede para comentar uma palavra, e o comentário dispara a mensagem privada. É o modelo usado por ferramentas como o ManyChat. Automação não oficial (robôs que simulam o app) está fora: viola os termos de uso e pode bloquear a conta do cliente.

A forma de captação (app próprio, ferramenta pronta ou site externo) está em aberto: ver [pendencias.md](pendencias.md#integração-com-o-instagram-captação-de-interessados).

## 2. Pesquisa de tendências

**Problema:** coletar dados do Instagram e do TikTok por scraping viola os termos de uso, quebra a cada mudança nos sites e pode gerar bloqueio.

**Solução:** usar fontes oficiais ou públicas:

- Google Trends.
- TikTok Creative Center.
- YouTube Data API.
- Meta Ad Library.
- Dados do próprio cliente (comentários e desempenho dos vídeos dele), que são a fonte mais valiosa com o tempo.

## 3. Regras de conselhos profissionais

**Problema:** médicos, dentistas, advogados e outras profissões têm regras de publicidade definidas pelo conselho. Conteúdo fora das regras pode gerar processo ético para o cliente.

Para médicos vale a **Resolução CFM nº 2.336/2023** **[verificar texto oficial]**. Pontos de atenção gerais:

- Proibido sensacionalismo e autopromoção exagerada.
- Proibido prometer ou garantir resultado.
- Uso de "antes e depois" com restrições.
- Identificação do médico com CRM e RQE (registro de especialista) quando anunciar especialidade.

**Solução:** filtro de conformidade por profissão, aplicado ao roteiro, à legenda e à mensagem do bot, mais a aprovação humana obrigatória. Isso vira argumento de venda: "conteúdo que não te coloca em risco no conselho".

## 4. LGPD (proteção de dados)

**Problema:** o bot coleta dados pessoais (nome, contato, e no caso de saúde, possivelmente informação sobre condição de saúde, que é **dado sensível**).

**Solução:**

- Definir a base legal do tratamento (consentimento explícito na conversa é o caminho mais seguro para dado de saúde).
- Perguntar o mínimo necessário: o bot qualifica, não faz anamnese.
- Oferecer opção de não receber mais mensagens.
- Registrar a origem de cada lead e o consentimento.
- Política de privacidade e definição de quem é controlador (o médico) e quem é operador (o sistema).

Recomendado: revisão jurídica antes de colocar o bot em produção.

## 5. Concorrência

**Problema:** edição automática de vídeo já é oferecida por várias ferramentas (Opus Clip, Submagic, Captions, CapCut). Competir só em edição não se sustenta.

**Solução:** posicionar o produto pelo fluxo completo (tendência, roteiro, edição com marca, conformidade, lead entregue e métricas de lead por vídeo), e não pela edição isolada.

## 6. Vídeo com pessoa sintética

**Problema:** gerar vídeo de uma pessoa falando (avatar, clonagem de voz) traz risco ético, legal e de confiança, especialmente em saúde.

**Decisão:** o sistema não gera rosto nem voz sintética. Só edita material gravado pelo cliente.

## 7. Dependência de o médico gravar

**Problema:** o sistema só funciona se o médico gravar os vídeos com regularidade. Profissional ocupado tende a parar.

**Solução:**

- A produção grava com o médico, em lote (vários vídeos de uma vez), o que reduz o tempo que ele precisa dedicar.
- Roteiros curtos, com orientações simples de gravação (luz, enquadramento, áudio).
- O upload avulso aproveita vídeos gravados sem roteiro do sistema.
