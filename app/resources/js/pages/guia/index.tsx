import { Head } from '@inertiajs/react';
import { BookOpen, Compass, ListChecks, MonitorPlay } from 'lucide-react';
import type { ReactNode } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import { Button } from '@/components/ui/button';
import { guia } from '@/routes';
import {
    TOURS_DE_CAPITULO,
    TOUR_COMPLETO,
    TOUR_ESSENCIAL,
} from '@/tour/passos';
import { useTour } from '@/tour/tour-context';

const ETAPAS = [
    {
        numero: '1',
        titulo: 'Roteiro',
        onde: 'Roteiros',
        texto: 'A IA pesquisa o tema e escreve o roteiro. A produção revisa o texto, confere a conformidade e aprova.',
    },
    {
        numero: '2',
        titulo: 'Gravação e upload',
        onde: 'Sessão do roteiro · Gravação',
        texto: 'O médico grava com o teleprompter. A produção envia um ou mais takes e escolhe o principal.',
    },
    {
        numero: '3',
        titulo: 'Formulário de edição',
        onde: 'Sessão do roteiro · Formulário',
        texto: 'A IA transcreve o vídeo e sugere oito campos. A produção mantém, altera ou remove cada um.',
    },
    {
        numero: '4',
        titulo: 'Edição automática',
        onde: 'Sessão do roteiro · Edição',
        texto: 'O worker corta, reenquadra em 9:16, legenda e aplica o kit de marca com a tela final.',
    },
    {
        numero: '5',
        titulo: 'Aprovação e publicação',
        onde: 'Aprovação · Publicação',
        texto: 'A produção aprova, o médico confirma pelo link e a produção publica à mão no Instagram.',
    },
];

const INDICADORES = [
    {
        nome: 'Roteiros da semana',
        origem: 'Roteiros com semana igual à semana atual, fora os descartados.',
        leitura:
            'O detalhe mostra quantos desses roteiros já foram aprovados. A semana vai de segunda a domingo.',
    },
    {
        nome: 'Editando',
        origem: 'Vídeos com status “Editando…”.',
        leitura:
            'É o que o worker está processando naquele momento, não o que já passou pela edição.',
    },
    {
        nome: 'Aguardando aprovação',
        origem: 'Vídeos “Editado: aprovar” mais vídeos “Aguardando o médico”.',
        leitura:
            'Junta as duas aprovações: a da produção e a confirmação do médico.',
    },
    {
        nome: 'Leads novos (manual)',
        origem: 'Leads com status “Qualificado”.',
        leitura:
            'São os leads que ainda não foram entregues à equipe do cliente. O cartão abre a lista já filtrada.',
    },
];

const STATUS_VIDEO = [
    [
        'Take enviado',
        'O take foi anexado à sessão do roteiro, mas ainda não foi escolhido para a análise.',
        'Escolha o take principal e envie para a edição.',
    ],
    [
        'IA analisando o vídeo…',
        'O worker está transcrevendo o vídeo e montando o formulário de edição.',
        'Aguarde; a tela se atualiza sozinha.',
    ],
    [
        'Formulário pronto para revisão',
        'A análise terminou e a produção precisa decidir campo a campo.',
        'Abra o formulário de edição.',
    ],
    [
        'Editando…',
        'O worker está renderizando o vídeo com o formulário revisado.',
        'Acompanhe na tela de edição.',
    ],
    [
        'Editado: aprovar',
        'O vídeo editado está pronto e espera a aprovação da produção.',
        'Assista, confira a legenda e aprove, peça ajuste ou descarte.',
    ],
    [
        'Aguardando o médico',
        'A produção aprovou e o link de confirmação está ativo.',
        'Copie o link e envie ao médico; ele vale 7 dias.',
    ],
    [
        'Pronto para publicar',
        'A produção aprovou e o médico confirmou.',
        'Publique no Instagram e registre o link do post.',
    ],
    [
        'Publicado',
        'O link do post foi registrado.',
        'A partir daqui o vídeo entra nas métricas e nos leads.',
    ],
    ['Descartado', 'O vídeo saiu da produção.', 'Não aparece mais no fluxo.'],
    [
        'Falhou',
        'A análise ou a edição falhou.',
        'Abra a tela de edição, veja o motivo e tente de novo.',
    ],
];

const SELOS_CONFORMIDADE = [
    [
        'Não conferido',
        'O roteiro ainda não passou pela checagem da IA.',
        'Peça a conferência antes de aprovar.',
    ],
    [
        'Sem bloqueios',
        'Nenhuma regra do conselho foi violada e os fatos de saúde têm fonte.',
        'Pode seguir para a aprovação.',
    ],
    [
        'Atenção',
        'Uma regra pede cuidado ou um fato de saúde está sem fonte.',
        'Leia os apontamentos e decida com calma.',
    ],
    [
        'Bloqueio',
        'Há uma regra violada ou um fato de saúde incorreto.',
        'Corrija o texto ou peça uma nova versão; não é possível aprovar.',
    ],
    [
        'Conferir de novo',
        'O texto mudou depois da última checagem, então o resultado antigo não vale.',
        'Rode a conformidade de novo.',
    ],
];

const STATUS_LEAD = [
    [
        'Qualificado',
        'Chegou pela ferramenta de mensagens, deu consentimento e foi registrado.',
        'Ainda não foi entregue à equipe do cliente.',
    ],
    [
        'Entregue à equipe',
        'A produção passou o contato para a equipe do cliente.',
        'O acompanhamento continua fora do sistema.',
    ],
    [
        'Agendou',
        'O lead marcou consulta.',
        'Conta como “consulta agendada” nas métricas.',
    ],
    [
        'Não agendou',
        'O lead não marcou consulta.',
        'Fica no histórico para leitura de resultados.',
    ],
];

const GLOSSARIO = [
    {
        metrica: 'Visualizações',
        origem: 'Digitadas pela produção, a partir dos insights do Instagram.',
        leitura:
            'Soma das visualizações dos vídeos publicados. Não é coletada automaticamente. O vídeo sem registro aparece como “Nunca”.',
    },
    {
        metrica: 'Comentários com palavra-chave',
        origem: 'Digitados pela produção, a partir dos insights do Instagram.',
        leitura:
            'Quantas pessoas comentaram a palavra-chave do vídeo. Também é um número manual.',
    },
    {
        metrica: 'Leads qualificados (total das Métricas)',
        origem: 'Todos os leads registrados na tela Leads, de qualquer status.',
        leitura:
            'O rótulo do cartão diz “Leads qualificados”, mas a contagem inclui todos os leads registrados. Use a tela Leads para separar por status. É diferente do cartão “Leads novos (manual)” do Painel, que conta só os qualificados ainda não entregues.',
    },
    {
        metrica: 'Consultas agendadas',
        origem: 'Leads com status “Agendou”.',
        leitura:
            'Não é uma métrica do Instagram: é o resultado do atendimento, marcado à mão na tela Leads.',
    },
    {
        metrica: 'Leads por vídeo',
        origem: 'Leads registrados com aquele vídeo como origem.',
        leitura:
            'Só entra no comparativo o lead em que a produção escolheu o vídeo de origem. Lead sem origem conta no total, mas não nesta coluna.',
    },
    {
        metrica: 'Agendados por vídeo',
        origem: 'Leads com status “Agendou” e com aquele vídeo como origem.',
        leitura:
            'Ajuda a comparar quais vídeos trouxeram consultas, não só contatos.',
    },
    {
        metrica: 'Leads por persona',
        origem: 'Soma dos leads dos vídeos cuja persona do formulário é aquela persona.',
        leitura:
            'O agrupamento usa a persona registrada no vídeo, não o texto do roteiro. Vídeos sem persona ficam em “(sem persona)”.',
    },
    {
        metrica: 'Leads por gancho',
        origem: 'Soma dos leads dos vídeos com aquele gancho.',
        leitura:
            'Serve para perceber qual abertura prendeu mais gente. Ganchos iguais são agrupados pelo texto exato.',
    },
    {
        metrica: 'Vídeos (agrupamento)',
        origem: 'Quantidade de vídeos publicados em cada persona ou gancho.',
        leitura:
            'Ajuda a não comparar um grupo com muitos vídeos contra outro com um só.',
    },
    {
        metrica: 'Aprendizado para os próximos roteiros',
        origem: 'Persona e gancho com mais leads, entre os vídeos publicados.',
        leitura:
            'Só aparece quando há pelo menos um lead com vídeo de origem. O sistema não decide sozinho o próximo roteiro: a produção usa essa leitura.',
    },
    {
        metrica: 'Atualizado (na tabela por vídeo)',
        origem: 'Data em que visualizações e comentários foram salvos pela última vez.',
        leitura:
            '“Nunca” quer dizer que o vídeo foi publicado, mas as métricas ainda não foram digitadas.',
    },
];

const MANUAL = [
    [
        'Publicar no Instagram',
        'A produção baixa o MP4, copia a legenda, publica e cola o link do post.',
    ],
    [
        'Coletar visualizações e comentários',
        'A produção lê os insights do Instagram e digita os números na tela Métricas.',
    ],
    [
        'Registrar e entregar leads',
        'A produção registra o lead com consentimento, muda o status e entrega o contato à equipe do cliente.',
    ],
    [
        'Enviar o link ao médico',
        'A produção copia o link gerado na aprovação e envia pelo WhatsApp ou outro canal combinado.',
    ],
    [
        'Decidir personas, roteiros, formulário e kit',
        'A IA sugere; a decisão é sempre humana.',
    ],
];

const FAQ = [
    {
        pergunta: 'O tour abre sozinho de novo?',
        resposta:
            'Ele abre uma vez, no primeiro acesso ao Painel, até você concluir ou sair. Depois disso, só abre quando você pedir pelo botão “?” no topo, pelo menu do usuário ou pelo Guia do sistema. A marca fica no seu usuário.',
    },
    {
        pergunta: 'Esqueci como gerar os roteiros da próxima semana.',
        resposta:
            'Abra Roteiros e use “Gerar próxima semana”. O briefing precisa estar completo: nicho, objetivo, oferta, região, tom de voz e conselho. Se faltar algum, o sistema leva você ao briefing.',
    },
    {
        pergunta: 'Por que não consigo aprovar um roteiro?',
        resposta:
            'O roteiro precisa estar em revisão, a IA não pode ter um pedido em andamento, a conformidade do texto atual precisa estar conferida e sem bloqueio, e a persona precisa estar decidida. A tela mostra o motivo do impedimento.',
    },
    {
        pergunta: 'O vídeo falhou. Perdi o trabalho?',
        resposta:
            'Não. Abra a tela de edição, leia o motivo e use “Tentar de novo”. A nova tentativa aproveita o que já foi feito (transcrição e cortes) e retoma do ponto em que parou.',
    },
    {
        pergunta: 'O link do médico expirou ou ele perdeu a mensagem.',
        resposta:
            'Use “Reenviar link” na tela de aprovação. Um link novo é gerado e o anterior deixa de funcionar. O link vale 7 dias e aparece uma vez, para copiar.',
    },
    {
        pergunta: 'Por que a aprovação deixou de valer?',
        resposta:
            'A aprovação está presa ao vídeo e à legenda daquele momento. Se qualquer um dos dois mudar, as duas aprovações precisam ser refeitas. A tela de aprovação e a de publicação avisam quando isso acontece.',
    },
    {
        pergunta: 'Por que o vídeo não aparece em Publicação?',
        resposta:
            'A tela de publicação só mostra vídeos com as duas aprovações: a da produção e a confirmação do médico. Se o médico ainda não confirmou, o vídeo está em Aprovação como “Aguardando o médico”.',
    },
    {
        pergunta: 'De onde vêm as visualizações e os comentários?',
        resposta:
            'São digitados pela produção a partir dos insights do Instagram. O sistema não coleta os números automaticamente no MVP. Na visão por vídeo, os campos são editáveis e salvam ao sair do campo.',
    },
    {
        pergunta: 'Por que um lead não aparece no comparativo por vídeo?',
        resposta:
            'Porque ele foi registrado sem o vídeo de origem. Ele conta no total de leads, mas não entra nas colunas por vídeo, persona ou gancho. Sempre que souber de qual post o lead veio, escolha o vídeo no registro.',
    },
    {
        pergunta: 'Consigo apagar um lead?',
        resposta:
            'Não no MVP. A tela permite atualizar o status do atendimento. Exclusão de lead ainda não faz parte do escopo e envolve dado pessoal e de saúde.',
    },
    {
        pergunta: 'O sistema publica ou responde às mensagens sozinho?',
        resposta:
            'Não. A publicação é manual e o atendimento acontece na ferramenta de mensagens do cliente. O sistema organiza o vídeo, a aprovação, o link do post e os leads.',
    },
    {
        pergunta: 'Quem consegue ver os dados de saúde dos leads?',
        resposta:
            'Só a produção do cliente dono daquele lead. Todas as consultas são filtradas pelo cliente do usuário e um registro de outro cliente responde como inexistente. O link do médico mostra apenas o vídeo e a legenda daquele vídeo.',
    },
];

function Secao({
    id,
    titulo,
    subtitulo,
    children,
    alvo,
}: {
    id: string;
    titulo: string;
    subtitulo?: string;
    children: ReactNode;
    alvo?: string;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-titulo`}
            data-tour={alvo}
            className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border bg-card p-5 md:p-6"
        >
            <div className="flex flex-col gap-1">
                <h2 id={`${id}-titulo`} className="text-lg font-semibold">
                    {titulo}
                </h2>
                {subtitulo && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {subtitulo}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

function Tabela({
    colunas,
    linhas,
}: {
    colunas: string[];
    linhas: ReactNode[][];
}) {
    return (
        <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                    <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                        {colunas.map((coluna) => (
                            <th
                                key={coluna}
                                className="border-b bg-muted/40 px-4 py-3 font-semibold"
                            >
                                {coluna}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {linhas.map((linha, i) => (
                        <tr key={i}>
                            {linha.map((celula, j) => (
                                <td
                                    key={j}
                                    className="border-b px-4 py-3 align-top leading-relaxed last:border-r-0"
                                >
                                    {celula}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Pergunta({
    pergunta,
    resposta,
}: {
    pergunta: string;
    resposta: string;
}) {
    return (
        <details className="group rounded-xl border bg-card px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                {pergunta}
                <span
                    aria-hidden="true"
                    className="text-lg text-muted-foreground transition-transform group-open:rotate-45"
                >
                    +
                </span>
            </summary>
            <p className="mt-2 border-t pt-3 text-sm leading-relaxed text-muted-foreground">
                {resposta}
            </p>
        </details>
    );
}

export default function Guia() {
    const { iniciar, tourDaTela } = useTour();

    return (
        <>
            <Head title="Guia do sistema" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="A referência da Máquina de Leads, sempre que precisar"
                    titulo="Guia do sistema"
                >
                    <div
                        data-tour="guia-acoes"
                        className="flex flex-wrap gap-2"
                    >
                        <Button
                            type="button"
                            className="h-10"
                            onClick={() => iniciar(TOUR_COMPLETO)}
                        >
                            <Compass className="size-4" />
                            Tour completo
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={() => iniciar(TOUR_ESSENCIAL)}
                        >
                            <ListChecks className="size-4" />
                            Tour essencial
                        </Button>
                        {tourDaTela && (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10"
                                onClick={() => iniciar(tourDaTela)}
                            >
                                <MonitorPlay className="size-4" />
                                Tour desta tela
                            </Button>
                        )}
                    </div>
                </CabecalhoPagina>

                <div className="rounded-2xl border border-[#F0D9B5] bg-[#FCF6EA] px-4 py-3 text-sm leading-relaxed text-[#6B4A16]">
                    <strong>O que ainda é manual no MVP:</strong> publicar no
                    Instagram, coletar visualizações e comentários, entregar o
                    lead à equipe do cliente e enviar o link ao médico. O
                    sistema organiza e registra; ele não publica, não vende e
                    não fala com o paciente.
                </div>

                <section
                    aria-labelledby="ajuda-rapida"
                    className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6"
                >
                    <div className="flex items-start gap-3">
                        <BookOpen className="mt-0.5 size-5 flex-none text-primary" />
                        <div className="flex flex-col gap-1">
                            <h2
                                id="ajuda-rapida"
                                className="text-base font-semibold"
                            >
                                Esqueceu um passo? Reveja só a parte que
                                importa.
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                O tour completo tem{' '}
                                {TOUR_COMPLETO.passos.length} passos. O
                                essencial tem {TOUR_ESSENCIAL.passos.length}. Ou
                                escolha um capítulo.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TOURS_DE_CAPITULO.map((tour) => (
                            <Button
                                key={tour.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={() => iniciar(tour)}
                            >
                                {tour.nome.replace('Tour · ', '')}
                            </Button>
                        ))}
                    </div>
                </section>

                <nav
                    id="guia-indice"
                    data-tour="guia-indice"
                    aria-label="Índice do guia"
                    className="flex scroll-mt-6 flex-col gap-3 rounded-2xl border bg-card p-5 md:p-6"
                >
                    <h2 className="text-base font-semibold">Neste guia</h2>
                    <div className="flex flex-wrap gap-2">
                        {[
                            ['caminho', 'O caminho de um vídeo'],
                            ['configuracao', 'Configuração'],
                            ['producao', 'Produção'],
                            ['resultados', 'Resultados'],
                            ['status', 'Status e selos'],
                            ['glossario', 'Glossário das métricas'],
                            ['manual', 'O que é manual'],
                            ['faq', 'Perguntas frequentes'],
                        ].map(([id, rotulo]) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="rounded-full border border-input bg-card px-3.5 py-2 text-[13px] font-semibold hover:border-primary hover:text-primary"
                            >
                                {rotulo}
                            </a>
                        ))}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                        A página fica no endereço <code>/guia</code>, também
                        acessível pelo rodapé do menu e pelo menu do usuário.
                    </p>
                </nav>

                <Secao
                    id="caminho"
                    titulo="O caminho de um vídeo"
                    subtitulo="Todo vídeo percorre as mesmas cinco etapas. A sessão do roteiro mostra em qual delas ele está."
                >
                    <ol className="flex flex-col gap-3">
                        {ETAPAS.map((etapa) => (
                            <li
                                key={etapa.numero}
                                className="flex gap-3 rounded-xl border p-4"
                            >
                                <span className="grid size-8 flex-none place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                                    {etapa.numero}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold">
                                        {etapa.titulo}
                                    </span>
                                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {etapa.onde}
                                    </span>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {etapa.texto}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        A produção participa de todas as etapas. O médico entra
                        só no fim, para confirmar o vídeo e a legenda pelo
                        celular.
                    </p>
                </Secao>

                <Secao
                    id="configuracao"
                    titulo="Configuração: o terreno da IA"
                    subtitulo="Briefing, personas e kit de marca são o que fazem a IA falar do jeito certo e o vídeo sair com a cara do cliente."
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-xl border p-4 lg:col-span-2">
                            <h3 className="font-semibold">Painel da semana</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                É a primeira tela depois do login. Mostra a
                                semana, os quatro indicadores, o quadro “Fluxo
                                dos vídeos”, as pendências e a situação do
                                briefing, das personas e do kit.
                            </p>
                            <Tabela
                                colunas={['Indicador', 'Como ler']}
                                linhas={INDICADORES.map((i) => [
                                    <strong key={i.nome}>{i.nome}</strong>,
                                    <span>
                                        {i.leitura}{' '}
                                        <span className="text-muted-foreground">
                                            ({i.origem})
                                        </span>
                                    </span>,
                                ])}
                            />
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Briefing</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O negócio do cliente: nicho, objetivo, oferta,
                                região, tom de voz, temas proibidos, tags e os
                                dados profissionais (profissão, conselho, CRM e
                                RQE). É daqui que a IA tira personas, roteiros e
                                legenda.
                            </p>
                            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                                <li>
                                    <strong className="text-foreground">
                                        Salvar rascunho
                                    </strong>{' '}
                                    aceita campos vazios e guarda aos poucos.
                                </li>
                                <li>
                                    <strong className="text-foreground">
                                        Salvar e sugerir personas
                                    </strong>{' '}
                                    exige nicho, objetivo, oferta, região, tom
                                    de voz e conselho, e já pede as sugestões à
                                    IA.
                                </li>
                                <li>
                                    Sem o briefing completo, a geração de
                                    roteiros fica bloqueada.
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Personas</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                A IA sugere personas a partir do briefing. A
                                produção decide o que entra no catálogo:
                            </p>
                            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                                <li>
                                    <strong className="text-foreground">
                                        Salvar
                                    </strong>{' '}
                                    coloca a sugestão no catálogo.
                                </li>
                                <li>
                                    <strong className="text-foreground">
                                        Juntar
                                    </strong>{' '}
                                    une a sugestão a uma persona parecida.
                                </li>
                                <li>
                                    <strong className="text-foreground">
                                        Corrigir
                                    </strong>{' '}
                                    ajusta o texto antes de salvar.
                                </li>
                                <li>
                                    <strong className="text-foreground">
                                        Ignorar
                                    </strong>{' '}
                                    descarta a sugestão.
                                </li>
                            </ul>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Um roteiro só pode ser aprovado depois que a
                                persona dele estiver decidida.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Kit de marca</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Cores primária, de destaque e de texto; fonte
                                dos títulos (Montserrat ou Anton); estilo da
                                legenda (padrão ou impacto em caixa alta); logo
                                e posição; vinheta; texto da tela final, com{' '}
                                <code>{'{PALAVRA}'}</code> trocado pela
                                palavra-chave do vídeo.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O kit é copiado para cada vídeo no momento do
                                upload: mudanças valem para as próximas edições.
                                A prévia da tela é feita em CSS, com as mesmas
                                fontes do render.
                            </p>
                        </div>
                    </div>
                </Secao>

                <Secao
                    id="producao"
                    titulo="Produção: do roteiro ao vídeo pronto"
                    subtitulo="É o dia a dia. Cada roteiro abre uma sessão com cinco etapas na mesma tela."
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">
                                Roteiros da semana
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                A IA pesquisa temas na web, cruza com o briefing
                                e escreve cinco roteiros por semana, sem repetir
                                os temas recentes. “Gerar próxima semana” pede
                                uma nova leva; a tela acompanha o pedido e se
                                atualiza sozinha.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Cada roteiro tem gancho (0 a 3 s),
                                desenvolvimento e chamada para ação com a
                                palavra-chave. A produção pode editar o texto,
                                pedir uma nova versão com comentário, conferir a
                                conformidade, aprovar ou descartar. Salvar um
                                roteiro já aprovado faz ele voltar para revisão.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Sessão do roteiro</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O topo mostra as etapas 1 Roteiro, 2 Gravação e
                                upload, 3 Formulário de edição, 4 Edição
                                automática e 5 Aprovação. A etapa atual fica
                                destacada; as concluídas viram link e as futuras
                                só liberam quando o vídeo chega lá.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Na gravação, o médico lê o texto no
                                teleprompter. A produção envia um ou vários
                                takes, escolhe o principal e manda para a
                                análise; os outros ficam como alternativa.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">
                                Formulário de edição
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                A IA transcreve o vídeo e preenche oito campos:
                                tema, persona, gancho, cortes, destaques na
                                legenda, chamada para ação, palavra-chave e
                                legenda do post. Em cada campo a produção
                                escolhe <strong>Manter</strong>,{' '}
                                <strong>Alterar</strong> ou{' '}
                                <strong>Remover</strong>.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Chamada para ação, palavra-chave e legenda do
                                post são obrigatórias: sem elas não há tela
                                final nem post. “Salvar rascunho” guarda sem
                                exigir tudo; “Gerar edição automática” exige o
                                formulário completo e manda o vídeo ao worker.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Edição automática</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O worker transcreve o áudio, corta silêncios,
                                gaguejos e repetições, reenquadra em 9:16 com
                                legenda e aplica a tela final com a
                                palavra-chave e a vinheta. A tela mostra o
                                progresso e atualiza a cada 5 segundos.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Se falhar, o motivo aparece e a produção pode
                                tentar de novo. A nova tentativa retoma do ponto
                                em que a anterior parou.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Aprovação</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                A produção assiste ao vídeo editado, confere a
                                legenda e decide: aprovar, pedir ajuste (volta
                                ao formulário com o comentário) ou descartar. Ao
                                aprovar, o sistema gera o link do médico, que
                                vale 7 dias e aparece uma vez.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O médico confirma pelo celular, sem login, ou
                                pede um ajuste. A aprovação fica presa ao vídeo
                                e à legenda: se um dos dois mudar, as duas
                                aprovações precisam ser refeitas.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Upload avulso</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Para um vídeo gravado sem roteiro do sistema. A
                                IA deduz tema, persona, gancho, chamada e
                                palavra-chave a partir do próprio vídeo, e a
                                produção revisa no formulário. Aceita MP4 ou MOV
                                até o limite mostrado na tela.
                            </p>
                        </div>
                    </div>
                </Secao>

                <Secao
                    id="resultados"
                    titulo="Resultados: publicação, leads e métricas"
                    subtitulo="O que acontece depois que o vídeo fica pronto. Tudo ainda passa pelas mãos da produção."
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Publicação manual</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Só aparece aqui o vídeo com as duas aprovações.
                                O checklist guia a produção: baixar o MP4 9:16,
                                copiar a legenda, ativar a palavra-chave na
                                ferramenta de mensagens, publicar no Instagram e
                                colar o link do post.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O checklist não é salvo: ele só ajuda a não
                                esquecer um passo. O que conta é o link do post.
                                “Marcar como publicado” só libera com a
                                aprovação válida.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <h3 className="font-semibold">Leads</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Cada lead é registrado à mão, sempre com o
                                consentimento registrado na ferramenta de
                                mensagens. A ficha guarda nome, perfil, para
                                quem é, o problema, a cidade, o vídeo de origem
                                e o status do atendimento.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O vídeo de origem é opcional, mas é ele que liga
                                o lead à persona, ao gancho e às métricas. O
                                sistema não vende: qualifica, registra e entrega
                                para a equipe do cliente.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                A tela também filtra por status e por vídeo. A
                                paginação mantém o filtro.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border p-4 lg:col-span-2">
                            <h3 className="font-semibold">Métricas</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Só entram vídeos publicados. Visualizações e
                                comentários são digitados a partir dos insights
                                do Instagram. Os leads vêm da tela Leads:
                                “consultas agendadas” são os leads com status
                                “Agendou”. Os agrupamentos por vídeo, persona e
                                gancho mudam a leitura sem mudar os dados.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O cartão “Leads” do topo conta todos os leads
                                registrados, de qualquer status — inclusive os
                                que não têm vídeo de origem. Já as colunas por
                                vídeo, persona e gancho só somam leads com
                                origem. É por isso que a soma das colunas pode
                                ser menor que o total.
                            </p>
                        </div>
                    </div>
                </Secao>

                <Secao
                    id="status"
                    titulo="Status e selos: o que cada um quer dizer"
                    subtitulo="Se uma tela mostrar um rótulo que você não reconhece, ele está aqui."
                >
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            Status do vídeo
                        </h3>
                        <Tabela
                            colunas={[
                                'Status',
                                'O que significa',
                                'O que fazer',
                            ]}
                            linhas={STATUS_VIDEO.map(
                                ([status, significado, acao]) => [
                                    <strong key={status}>{status}</strong>,
                                    significado,
                                    acao,
                                ],
                            )}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            Etapas do roteiro
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            A coluna “Etapa” da lista de roteiros resume o
                            momento: <strong>Revisar roteiro</strong> (rascunho
                            esperando a produção),{' '}
                            <strong>IA trabalhando</strong> (pedido em
                            andamento), <strong>Aguardando gravação</strong>{' '}
                            (aprovado, sem take),{' '}
                            <strong>Takes enviados</strong> (take anexado),{' '}
                            <strong>IA analisando o take</strong>,{' '}
                            <strong>Formulário de edição</strong>,{' '}
                            <strong>Edição automática</strong>,{' '}
                            <strong>Aprovação da produção</strong>,{' '}
                            <strong>Aguardando o médico</strong>,{' '}
                            <strong>Pronto para publicar</strong>,{' '}
                            <strong>Publicado</strong>, <strong>Falhou</strong>{' '}
                            e <strong>Descartado</strong>.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            Selos de conformidade do roteiro
                        </h3>
                        <Tabela
                            colunas={['Selo', 'O que significa', 'O que fazer']}
                            linhas={SELOS_CONFORMIDADE.map(
                                ([selo, significado, acao]) => [
                                    <strong key={selo}>{selo}</strong>,
                                    significado,
                                    acao,
                                ],
                            )}
                        />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            As regras do conselho em vigor são provisórias e
                            servem de apoio à revisão. A palavra final continua
                            sendo da produção e do médico.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            Status do lead
                        </h3>
                        <Tabela
                            colunas={['Status', 'O que significa', 'Como usar']}
                            linhas={STATUS_LEAD.map(
                                ([status, significado, uso]) => [
                                    <strong key={status}>{status}</strong>,
                                    significado,
                                    uso,
                                ],
                            )}
                        />
                    </div>
                </Secao>

                <Secao
                    id="glossario"
                    alvo="guia-glossario"
                    titulo="Glossário das métricas"
                    subtitulo="De onde vem cada número e o que ele quer dizer. É a resposta para “por que esse valor apareceu?”."
                >
                    <Tabela
                        colunas={['Métrica', 'Origem', 'Como ler']}
                        linhas={GLOSSARIO.map((linha) => [
                            <strong key={linha.metrica}>
                                {linha.metrica}
                            </strong>,
                            linha.origem,
                            linha.leitura,
                        ])}
                    />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Regra geral: visualizações, comentários e leads sem
                        vídeo de origem entram nos totais; o comparativo por
                        vídeo, persona e gancho só usa leads com origem. Nenhum
                        número é coletado do Instagram automaticamente no MVP.
                    </p>
                </Secao>

                <Secao
                    id="manual"
                    titulo="O que é manual no MVP"
                    subtitulo="Para não procurar um botão que ainda não existe."
                >
                    <Tabela
                        colunas={['Tarefa', 'Como funciona hoje']}
                        linhas={MANUAL.map(([tarefa, como]) => [
                            <strong key={tarefa}>{tarefa}</strong>,
                            como,
                        ])}
                    />
                    <div className="rounded-xl border border-[#E3E6EB] bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
                        <strong className="text-foreground">
                            Ainda fora do MVP:
                        </strong>{' '}
                        capa do vídeo, confirmação do roteiro pelo médico, envio
                        automático do link, exclusão de lead, publicação
                        automática e coleta automática de métricas. Se a tela
                        não mostra o botão, a tarefa não está no escopo atual.
                    </div>
                </Secao>

                <Secao
                    id="faq"
                    titulo="Perguntas frequentes"
                    subtitulo="As dúvidas que aparecem no dia a dia da produção."
                >
                    <div className="flex flex-col gap-2">
                        {FAQ.map((item) => (
                            <Pergunta
                                key={item.pergunta}
                                pergunta={item.pergunta}
                                resposta={item.resposta}
                            />
                        ))}
                    </div>
                </Secao>

                <section className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between md:p-6">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-base font-semibold">
                            Ainda com dúvida? Reveja na própria tela.
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            O botão “?” no topo abre o tour desta tela e o guia.
                            Nada aqui depende de você lembrar de cor.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            className="h-10"
                            onClick={() => iniciar(TOUR_COMPLETO)}
                        >
                            <Compass className="size-4" />
                            Rever o tour completo
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={() => iniciar(TOUR_ESSENCIAL)}
                        >
                            <ListChecks className="size-4" />
                            Rever o essencial
                        </Button>
                    </div>
                </section>
            </div>
        </>
    );
}

Guia.layout = {
    breadcrumbs: [{ title: 'Guia do sistema', href: guia() }],
};
