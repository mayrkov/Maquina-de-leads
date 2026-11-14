# Funcionalidades

Funcionalidades do sistema, por módulo. O que entra na primeira versão está marcado em [mvp.md](mvp.md).

## 1. Briefing do cliente

Preenchido pela produção com o médico. Substitui a ideia original de "tags soltas" por um cadastro estruturado. As tags continuam existindo, mas dentro de campos com significado.

| Campo | Exemplo (otorrino) |
|---|---|
| Nicho / especialidade | Otorrinolaringologia |
| Objetivo | Agendar consultas particulares |
| Oferta | Consulta, exame de audiometria, avaliação de ronco |
| Região de atendimento | Cidade e bairros atendidos |
| Tom de voz | Acolhedor, didático, sem alarmismo |
| Temas proibidos | Definidos pelo cliente e pelas regras do conselho |
| Tags livres | "ronco", "otite infantil", "rinite", "zumbido" |

### Personas (vários públicos por cliente)

Um mesmo profissional fala com públicos diferentes, e quem decide a consulta nem sempre é o paciente. Cada roteiro deve mirar **uma** persona.

Uma persona tem:

- **Descrição:** quem é a pessoa.
- **Dores:** o problema, com as palavras dela.
- **Quem decide a compra:** quem marca a consulta, que nem sempre é o paciente (ex.: a mãe, no caso da criança).
- **Linguagem:** como falar com ela.

#### Personas definidas pela IA

Ninguém **cadastra personas à mão**. A IA define o público a partir do tema, e a produção só confirma.

1. **Conjunto inicial:** no primeiro acesso, a IA sugere personas a partir do nicho do briefing. A produção aprova, edita ou descarta.
2. **Público por tema:** para cada tema (ex.: "crianças com otite"), a IA define quem sofre o problema, quem decide a compra, as dores e a linguagem.
3. **Comparação com o catálogo:** a IA compara esse público com as personas já salvas do cliente.
   - Parecido com uma delas: **reusa a persona existente**.
   - Diferente de todas: marca como **persona sugerida**.
4. **Decisão na aprovação do roteiro:** a produção vê a persona junto com o roteiro e pode:
   - **salvar** a persona sugerida no catálogo;
   - **juntar** com uma persona existente, quando o sistema avisar que ela é parecida;
   - **corrigir** o público, se a IA errou (ex.: quem decide a compra);
   - **ignorar**: a persona não entra no catálogo.
5. **Registro no roteiro:** o roteiro sempre guarda a persona usada, salva no catálogo ou não. Sem isso, o lead não aponta para um público e as métricas por persona se perdem.

Motivo: evitar personas quase iguais no catálogo ("mãe de criança com otite" e "pais de filho com dor de ouvido"). Personas duplicadas dividem os leads e escondem qual público dá mais resultado.

Exemplo de personas para o otorrino:

- **Mãe ou pai de criança** com otite de repetição, amígdala ou adenoide aumentada, respiração pela boca.
- **Adulto com rinite ou sinusite** crônica, que convive com o problema há anos.
- **Pessoa que ronca e o cônjuge** que sofre com o ronco (o cônjuge muitas vezes é quem convence a marcar).
- **Idoso com perda auditiva e os filhos** que percebem o problema antes dele.
- **Pessoa com zumbido ou tontura.**

O mesmo raciocínio vale para outros nichos. Exemplo da ideia original: um pediatra fala principalmente com mães (segundo o IBGE, na maioria entre 25 e 29 anos), mas também com pais, avós, tias e amigas de quem tem filho.

## 2. Pesquisa de tendências

Objetivo: descobrir quais temas e formatos estão gerando engajamento no nicho e para cada persona.

- Fontes externas permitidas: Google Trends, TikTok Creative Center, YouTube Data API, Meta Ad Library (ver restrições em [riscos-e-restricoes.md](riscos-e-restricoes.md#2-pesquisa-de-tendências)).
- Perguntas frequentes reais do público (buscas, comentários dos próprios vídeos do cliente).
- Saída: lista de temas ranqueados por persona, com exemplos de ganchos e formatos.

## 3. Geração de roteiros

- Roteiros curtos (30 a 90 segundos) para vídeo vertical.
- Estrutura: gancho nos primeiros 3 segundos, desenvolvimento, chamada para ação.
- A chamada para ação usa a **palavra-chave** que dispara o bot (ex.: "comenta OUVIDO que te explico como agendar").
- Cada roteiro indica persona, objetivo e tema de origem. A persona é definida pela IA a partir do tema (ver [Personas definidas pela IA](#personas-definidas-pela-ia)).
- Passa pelo **filtro de conformidade** do conselho profissional antes de chegar à produção.

## 4. Kit de marca

Define o "padrão de vídeo e layout de cada empresa":

- Cores, fontes e logo.
- Estilo de legenda (fonte, cor, destaque de palavras).
- Vinheta de abertura e tela final.
- Modelo de capa do vídeo.

## 5. Edição automática

### Formulário sugerido pela IA (briefing do vídeo)

1. A produção faz o upload do vídeo bruto por um de dois caminhos:
   - **Na sessão do roteiro:** o vídeo foi gravado a partir de um roteiro gerado pela IA, e o upload é feito na mesma sessão em que o roteiro foi criado. A IA já conhece o roteiro e parte dele.
   - **Avulso:** o vídeo foi gravado sem roteiro do sistema. A IA deduz tudo do próprio vídeo.
2. A IA analisa o vídeo e preenche um formulário com o que dá para fazer com ele (no caminho pelo roteiro, os campos já definidos no roteiro vêm preenchidos):
   - tema e persona;
   - gancho;
   - trechos a manter e a cortar;
   - palavras de destaque na legenda;
   - chamada para ação e palavra-chave;
   - legenda do post.
3. A produção revisa campo a campo: mantém, altera ou remove cada sugestão.
4. A edição segue o formulário revisado.

### Rotina de edição

Com o formulário revisado, o sistema aplica a rotina de edição:

1. Transcrição do áudio (ex.: Whisper).
2. Corte de silêncios, gaguejos e repetições.
3. Legendas no estilo do kit de marca.
4. Zoom e cortes nos pontos de ênfase.
5. Imagens de apoio (b-roll) de banco de imagens livre, quando fizer sentido (fora do MVP).
6. Tela final com a chamada para ação e a palavra-chave.
7. Exportação no formato vertical (9:16).

Regra: o sistema **nunca** gera rosto ou voz sintética da pessoa.

## 6. Aprovação

- A produção revisa roteiro e vídeo editado; depois, o médico confirma. Só vai ao ar o que os dois aprovaram.
- Pode aprovar, pedir ajuste ou descartar.
- Obrigatório em nichos regulados como saúde.

## 7. Publicação (futuro)

Publicar e agendar automaticamente nas redes. Desejável, mas **fora do foco inicial**: na primeira versão a produção publica manualmente no Instagram do médico.

## 8. Bot de captação

> **Pendente:** app próprio na Meta, bot já existente ou site externo. **Direção provisória para o MVP:** ferramenta já aprovada pela Meta (ex.: ManyChat). Ver [pendencias.md](pendencias.md#integração-com-o-instagram-captação-de-interessados).

- Disparado quando alguém comenta a palavra-chave em um vídeo.
- Envia mensagem privada e faz 2 ou 3 perguntas de qualificação (ex.: para quem é a consulta, qual o problema, qual cidade).
- Oferece opção de não receber mais mensagens.
- **Não vende**: qualifica e entrega o lead.
- Limites das plataformas em [riscos-e-restricoes.md](riscos-e-restricoes.md#1-bot-de-mensagens-nas-redes).

## 9. Entrega do lead

Envia o lead qualificado à equipe do médico, que cadastra o paciente e faz o agendamento, com origem (qual vídeo, qual persona). No MVP, a entrega e o status do lead são manuais. O destino automático (WhatsApp, CRM, planilha) está **pendente**: ver [pendencias.md](pendencias.md#destino-do-lead).

## 10. Métricas e ciclo de aprendizado

Por vídeo, gancho, persona e formato:

- Visualizações e comentários.
- Leads gerados e leads qualificados.
- Custo por lead (quando houver custo de produção ou anúncio).

No MVP, a produção confere visualizações e comentários direto no Instagram (insights da conta profissional). A coleta automática depende da decisão de integração.

Esses dados alimentam a geração dos próximos roteiros: o sistema passa a priorizar o que gerou lead para aquele cliente, e não só o que está em alta fora.
