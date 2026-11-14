import type { Passo, Tour } from '@/tour/tipos';

const R = {
    painel: '/dashboard',
    briefing: '/briefing',
    personas: '/personas',
    kit: '/kit',
    roteiros: '/roteiros',
    videos: '/videos',
    edicao: '/edicao',
    aprovacao: '/aprovacao',
    publicacao: '/publicacao',
    leads: '/leads',
    metricas: '/metricas',
    guia: '/guia',
} as const;

const negrito = (texto: string) => <strong>{texto}</strong>;

/** Tour completo: abre no Painel, passa por todas as áreas e termina no guia. */
export const TOUR_COMPLETO: Tour = {
    id: 'completo',
    nome: 'Tour completo',
    passos: [
        {
            id: 'boas-vindas',
            capitulo: 'Começando',
            titulo: 'Boas-vindas à Máquina de Leads',
            rota: R.painel,
            texto: (
                <>
                    <p>
                        Este tour mostra, na tela, como um vídeo nasce e chega
                        ao Instagram: o sistema pesquisa o tema, escreve o
                        roteiro, analisa o vídeo bruto que o médico gravou,
                        edita e organiza a aprovação e os resultados.
                    </p>
                    <p>
                        São {negrito('três princípios')} que valem em todas as
                        telas: {negrito('nada é publicado sem aprovação')}, o
                        sistema {negrito('nunca gera rosto nem voz sintética')}{' '}
                        e ele {negrito('não vende')} — entrega o lead à equipe
                        do cliente.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Leva cerca de 8 minutos. Você pode sair quando quiser e
                        voltar pelo botão <strong>?</strong> no topo ou pelo{' '}
                        <strong>Guia do sistema</strong>.
                    </p>
                </>
            ),
        },
        {
            id: 'ciclo',
            capitulo: 'Começando',
            titulo: 'O ciclo de um vídeo em 5 etapas',
            texto: (
                <>
                    <p>
                        Todo vídeo percorre o mesmo caminho, e a tela de cada
                        roteiro mostra em que etapa ele está:
                    </p>
                    <ol className="grid gap-1.5 text-[13px]">
                        <li>
                            <strong>1. Roteiro</strong> — a IA escreve; a
                            produção revisa, confere a conformidade e aprova.
                        </li>
                        <li>
                            <strong>2. Gravação e upload</strong> — o médico
                            grava com o teleprompter e a produção envia os
                            takes.
                        </li>
                        <li>
                            <strong>3. Formulário de edição</strong> — a IA
                            transcreve o vídeo e sugere o que cortar, destacar e
                            escrever; a produção decide campo a campo.
                        </li>
                        <li>
                            <strong>4. Edição automática</strong> — o worker
                            corta, reenquadra em 9:16, legenda e aplica o kit de
                            marca.
                        </li>
                        <li>
                            <strong>5. Aprovação</strong> — a produção aprova; o
                            médico confirma pelo celular. Só então a produção
                            publica.
                        </li>
                    </ol>
                    <p className="text-[13px] text-muted-foreground">
                        A produção participa de todas as etapas. O médico entra
                        só na aprovação final.
                    </p>
                </>
            ),
        },
        {
            id: 'menu',
            capitulo: 'Começando',
            titulo: 'O menu é o mapa do sistema',
            texto: (
                <>
                    <p>O menu lateral tem três grupos, na ordem do trabalho:</p>
                    <ul className="grid gap-1.5 text-[13px]">
                        <li>
                            <strong>Configuração</strong> — Painel, Briefing,
                            Personas e Kit de marca. É o terreno: sem isso, a IA
                            não sabe para quem nem como falar.
                        </li>
                        <li>
                            <strong>Produção</strong> — Roteiros, Upload avulso,
                            Edição e Aprovação. É o dia a dia dos vídeos.
                        </li>
                        <li>
                            <strong>Resultados</strong> — Publicação, Leads e
                            Métricas. É o que aconteceu depois que o vídeo foi
                            ao ar.
                        </li>
                    </ul>
                    <p className="text-[13px] text-muted-foreground">
                        O nome do cliente aparece no topo. Tudo que você vê é só
                        desse cliente.
                    </p>
                </>
            ),
            alvo: 'menu',
        },
        {
            id: 'resumo',
            capitulo: 'Começando',
            titulo: 'Os números do topo',
            texto: (
                <>
                    <p>No Painel, os quatro indicadores resumem a semana:</p>
                    <ul className="grid gap-1 text-[13px]">
                        <li>
                            <strong>Roteiros da semana</strong> — roteiros não
                            descartados desta semana; o detalhe mostra quantos
                            já foram aprovados.
                        </li>
                        <li>
                            <strong>Editando</strong> — vídeos que o worker está
                            editando naquele momento.
                        </li>
                        <li>
                            <strong>Aguardando aprovação</strong> — vídeos
                            editados que esperam a produção e vídeos já
                            aprovados que esperam o médico.
                        </li>
                        <li>
                            <strong>Leads novos (manual)</strong> — leads
                            qualificados que ainda não foram entregues à equipe
                            do cliente. O registro é manual, pela tela Leads.
                        </li>
                    </ul>
                </>
            ),
            alvo: 'resumo',
        },
        {
            id: 'fluxo',
            capitulo: 'Começando',
            titulo: 'O quadro “Fluxo dos vídeos”',
            texto: (
                <>
                    <p>
                        Cada coluna é uma etapa do vídeo. Um cartão anda para a
                        direita conforme o trabalho avança:{' '}
                        <strong>Aguardando gravação</strong>,{' '}
                        <strong>Formulário de edição</strong>,{' '}
                        <strong>Editando</strong>, <strong>Aprovação</strong> e{' '}
                        <strong>Pronto para publicar</strong>.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Vídeos publicados, descartados e os que falharam não
                        ficam no quadro. Para ver tudo, use as telas Edição e
                        Aprovação.
                    </p>
                </>
            ),
            alvo: 'fluxo',
        },
        {
            id: 'pendencias',
            capitulo: 'Começando',
            titulo: 'O que pede a sua atenção',
            texto: (
                <>
                    <p>
                        As <strong>Pendências da produção</strong> listam o que
                        está parado esperando alguém: briefing incompleto,
                        roteiro para revisar, persona para decidir, formulário
                        para conferir, vídeo para aprovar, médico que ainda não
                        confirmou e métricas para registrar.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Ao lado, o cartão <strong>Briefing e marca</strong>{' '}
                        mostra se a configuração do cliente está completa.
                    </p>
                </>
            ),
            alvo: 'pendencias',
        },
        {
            id: 'ajuda',
            capitulo: 'Começando',
            titulo: 'A ajuda fica sempre à mão',
            texto: (
                <>
                    <p>
                        Este botão <strong>?</strong> abre o tour de novo, o
                        tour da tela em que você está e o{' '}
                        <strong>Guia do sistema</strong>, com o significado de
                        cada status e de cada métrica.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        O guia também fica no rodapé do menu, embaixo de “Guia
                        do sistema”. Nada aqui depende de você lembrar de cor.
                    </p>
                </>
            ),
            alvo: 'ajuda',
        },
        {
            id: 'briefing',
            capitulo: 'Configuração',
            titulo: 'Briefing: o que a IA precisa saber',
            texto: (
                <>
                    <p>
                        O briefing guarda o negócio do cliente: nicho, objetivo,
                        oferta, região, tom de voz, temas proibidos, tags e os
                        dados profissionais (CRM, RQE e conselho).
                    </p>
                    <p className="text-[13px]">
                        <strong>Salvar rascunho</strong> guarda mesmo com campos
                        vazios; <strong>Salvar e sugerir personas</strong> exige
                        o mínimo e já pede à IA uma lista de personas. Sem o
                        briefing completo, a geração de personas e de roteiros
                        fica bloqueada.
                    </p>
                </>
            ),
            rota: R.briefing,
            alvo: 'briefing-form',
        },
        {
            id: 'personas',
            capitulo: 'Configuração',
            titulo: 'Personas: para quem o vídeo fala',
            texto: (
                <>
                    <p>
                        A IA sugere personas a partir do briefing. A produção
                        decide o que fica: <strong>Salvar</strong> coloca no
                        catálogo, <strong>Juntar</strong> une uma sugestão
                        parecida a uma persona existente,{' '}
                        <strong>Corrigir</strong> ajusta o texto e{' '}
                        <strong>Ignorar</strong> descarta.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Cada roteiro usa uma persona do catálogo. O vínculo
                        aparece na tela do roteiro e nas métricas, para você
                        comparar quais personas geram mais leads.
                    </p>
                </>
            ),
            rota: R.personas,
            alvo: 'personas-sugestoes',
        },
        {
            id: 'kit',
            capitulo: 'Configuração',
            titulo: 'Kit de marca: a cara do vídeo',
            texto: (
                <>
                    <p>
                        Cores, fontes, logo, vinheta e texto da tela final. O
                        kit vale para as edições feitas a partir de agora: um
                        vídeo que já está na fila guarda o kit do momento do
                        upload.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        A prévia ao lado é feita em CSS. As fontes disponíveis
                        são Montserrat e Anton, as mesmas que o render usa.
                    </p>
                </>
            ),
            rota: R.kit,
            alvo: 'kit-form',
        },
        {
            id: 'roteiros',
            capitulo: 'Produção',
            titulo: 'Roteiros da semana',
            texto: (
                <>
                    <p>
                        A IA pesquisa temas na web, cruza com o briefing e
                        escreve <strong>5 roteiros por semana</strong>, sem
                        repetir os recentes. O botão{' '}
                        <strong>Gerar próxima semana</strong> pede a nova leva.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        A geração roda no worker e a tela se atualiza sozinha.
                        Se falhar, o motivo aparece e você pode pedir de novo.
                    </p>
                </>
            ),
            rota: R.roteiros,
            alvo: 'roteiros-acoes',
        },
        {
            id: 'roteiros-lista',
            capitulo: 'Produção',
            titulo: 'O que cada coluna da lista diz',
            texto: (
                <>
                    <p>
                        <strong>Tema e gancho</strong> mostram a ideia;{' '}
                        <strong>Persona</strong> diz para quem;{' '}
                        <strong>Palavra-chave</strong> é o que o espectador vai
                        comentar; <strong>Conformidade</strong> é o selo da
                        checagem do conselho e dos fatos; <strong>Etapa</strong>{' '}
                        diz onde o vídeo está.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Selos: <strong>Sem bloqueios</strong>,{' '}
                        <strong>Atenção</strong>, <strong>Bloqueio</strong>,{' '}
                        <strong>Não conferido</strong> e{' '}
                        <strong>Conferir de novo</strong> (o texto mudou depois
                        da última checagem).
                    </p>
                </>
            ),
            alvo: 'roteiros-conteudo',
        },
        {
            id: 'sessao',
            capitulo: 'Produção',
            titulo: 'A sessão do roteiro: 5 etapas na mesma tela',
            texto: (
                <>
                    <p>
                        Ao abrir um roteiro, o topo mostra as cinco etapas:{' '}
                        <strong>1 Roteiro</strong>,{' '}
                        <strong>2 Gravação e upload</strong>,{' '}
                        <strong>3 Formulário de edição</strong>,{' '}
                        <strong>4 Edição automática</strong> e{' '}
                        <strong>5 Aprovação</strong>.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        A etapa atual fica destacada; as concluídas ganham ✓ e
                        viram link. As seguintes só liberam quando o vídeo chega
                        lá.
                    </p>
                </>
            ),
        },
        {
            id: 'roteiro',
            capitulo: 'Produção',
            titulo: 'Dentro do roteiro',
            texto: (
                <>
                    <p>
                        O texto tem três partes: <strong>gancho</strong> (0 a 3
                        s), <strong>desenvolvimento</strong> e{' '}
                        <strong>chamada para ação</strong>, que termina com a
                        palavra-chave. A produção pode editar o texto, pedir uma
                        nova versão à IA e conferir a conformidade.
                    </p>
                    <p className="text-[13px]">
                        A conformidade lista as regras do conselho e os fatos de
                        saúde com fontes. <strong>Aprovar roteiro</strong> só
                        libera sem impedimento. Salvar um roteiro já aprovado
                        faz ele voltar para revisão.
                    </p>
                </>
            ),
        },
        {
            id: 'gravacao',
            capitulo: 'Produção',
            titulo: 'Gravação: teleprompter, checklist e takes',
            texto: (
                <>
                    <p>
                        Depois de aprovado, o roteiro vira tela de gravação: o
                        texto grande para o médico ler, um teleprompter que rola
                        sozinho, o checklist de luz e áudio e o envio de vários
                        takes.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        A produção escolhe o <strong>take principal</strong> e
                        envia para a análise. Os outros takes ficam guardados
                        como alternativa.
                    </p>
                </>
            ),
        },
        {
            id: 'formulario',
            capitulo: 'Produção',
            titulo: 'Formulário de edição: a IA sugere, você decide',
            texto: (
                <>
                    <p>
                        A IA transcreve o vídeo e preenche oito campos: tema,
                        persona, gancho, cortes, destaques na legenda, chamada
                        para ação, palavra-chave e legenda do post. Em cada
                        campo a produção escolhe <strong>Manter</strong>,{' '}
                        <strong>Alterar</strong> ou <strong>Remover</strong>.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Campos obrigatórios não podem ser removidos. Quando o
                        formulário está do jeito certo,{' '}
                        <strong>Gerar edição automática</strong> manda o vídeo
                        para o worker.
                    </p>
                </>
            ),
        },
        {
            id: 'edicao',
            capitulo: 'Produção',
            titulo: 'Edição automática: as 4 etapas do worker',
            texto: (
                <>
                    <p>
                        O worker transcreve o áudio, corta silêncios, gaguejos e
                        repetições, reenquadra em 9:16 com legenda e aplica a
                        tela final com a palavra-chave e a vinheta.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        A tela mostra o progresso e atualiza a cada 5 segundos.
                        Se falhar, aparece o motivo e a produção pode gerar de
                        novo: a nova tentativa retoma de onde a anterior parou.
                    </p>
                </>
            ),
            rota: R.edicao,
            alvo: 'edicao-conteudo',
        },
        {
            id: 'aprovacao',
            capitulo: 'Produção',
            titulo: 'Aprovação em duas etapas',
            texto: (
                <>
                    <p>
                        A produção vê o vídeo editado e a legenda, e decide:{' '}
                        <strong>aprovar</strong>, <strong>pedir ajuste</strong>{' '}
                        ou <strong>descartar</strong>. Ao aprovar, gera o link
                        do médico — vale 7 dias e só o hash fica no banco.
                    </p>
                    <p className="text-[13px]">
                        O médico confirma pelo celular, sem login. Se o vídeo ou
                        a legenda mudarem depois, a aprovação deixa de valer e
                        as duas etapas precisam ser refeitas.
                    </p>
                </>
            ),
            rota: R.aprovacao,
            alvo: 'aprovacao-conteudo',
        },
        {
            id: 'upload',
            capitulo: 'Produção',
            titulo: 'Upload avulso: quando não há roteiro',
            texto: (
                <>
                    <p>
                        Para um vídeo gravado sem roteiro do sistema. A IA deduz
                        tema, persona, gancho, chamada e palavra-chave a partir
                        do próprio vídeo, e a produção revisa no formulário de
                        edição.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Aceita MP4 ou MOV até o limite mostrado na tela. O vídeo
                        vai para o disco privado de mídia e entra na mesma fila
                        de análise dos takes.
                    </p>
                </>
            ),
            rota: R.videos,
            alvo: 'upload-form',
        },
        {
            id: 'manual',
            capitulo: 'Produção',
            titulo: 'O que ainda é manual no MVP',
            texto: (
                <>
                    <p>
                        Para não procurar o que não existe: no MVP a produção{' '}
                        <strong>publica à mão</strong> no Instagram,{' '}
                        <strong>digita as métricas</strong> dos insights e{' '}
                        <strong>entrega o lead</strong> à equipe do cliente. O
                        link do médico é copiado e enviado pela produção.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Capa, confirmação do roteiro pelo médico, envio
                        automático do link, exclusão de lead e publicação ou
                        métricas automáticas ainda não fazem parte do MVP.
                    </p>
                </>
            ),
        },
        {
            id: 'publicacao',
            capitulo: 'Resultados',
            titulo: 'Publicação: o checklist até o ar',
            texto: (
                <>
                    <p>
                        O vídeo confirmado pelo médico aparece aqui. O checklist
                        guia a produção: baixar o MP4 9:16, copiar a legenda,
                        ativar a palavra-chave na ferramenta de mensagens,
                        publicar no Instagram e registrar o link do post.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        O sistema não publica sozinho. O botão{' '}
                        <strong>Marcar como publicado</strong> só libera com a
                        aprovação válida.
                    </p>
                </>
            ),
            rota: R.publicacao,
            alvo: 'publicacao-conteudo',
        },
        {
            id: 'leads',
            capitulo: 'Resultados',
            titulo: 'Leads: quem chegou e onde está',
            texto: (
                <>
                    <p>
                        Cada lead é registrado à mão, com consentimento
                        registrado na ferramenta de mensagens. A ficha guarda
                        para quem é, o problema, a cidade, o vídeo de origem e a
                        persona.
                    </p>
                    <p className="text-[13px]">
                        Status: <strong>Qualificado</strong>,{' '}
                        <strong>Entregue à equipe</strong>,{' '}
                        <strong>Agendou</strong> e <strong>Não agendou</strong>.
                        O sistema não vende: ele qualifica e entrega.
                    </p>
                </>
            ),
            rota: R.leads,
            alvo: 'leads-conteudo',
        },
        {
            id: 'metricas',
            capitulo: 'Resultados',
            titulo: 'Métricas: o que cada número quer dizer',
            texto: (
                <>
                    <p>
                        <strong>Visualizações</strong> e{' '}
                        <strong>comentários com a palavra-chave</strong> são
                        digitados pela produção a partir dos insights do
                        Instagram — não são coletados automaticamente.{' '}
                        <strong>Leads</strong> vêm da tela Leads;{' '}
                        <strong>consultas agendadas</strong> são os leads com
                        status “Agendou”.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        O cartão “Leads qualificados” conta todos os leads
                        registrados, não só os marcados como “Qualificado”. Os
                        totais só consideram vídeos publicados.
                    </p>
                </>
            ),
            rota: R.metricas,
            alvo: 'metricas-totais',
        },
        {
            id: 'metricas-mais',
            capitulo: 'Resultados',
            titulo: 'Comparar por vídeo, persona ou gancho',
            texto: (
                <>
                    <p>
                        Os botões <strong>Vídeo</strong>,{' '}
                        <strong>Persona</strong> e <strong>Gancho</strong>{' '}
                        agrupam os mesmos números de formas diferentes. Em
                        “Aprendizado para os próximos roteiros”, o sistema
                        mostra a persona e o gancho que geraram mais leads.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Só entra na conta o lead registrado com o vídeo de
                        origem. Quando a produção não sabe de qual vídeo veio, o
                        lead conta no total, mas não no comparativo.
                    </p>
                </>
            ),
            alvo: 'metricas-tabela',
        },
        {
            id: 'guia',
            capitulo: 'Ajuda',
            titulo: 'O guia fica aqui, sempre que você precisar',
            texto: (
                <>
                    <p>
                        Este é o <strong>Guia do sistema</strong>: o fluxo
                        completo, o que cada tela faz, o que cada status
                        significa e o glossário das métricas. Você também pode
                        refazer o tour completo, o tour essencial ou só o tour
                        de uma parte.
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                        Sempre que esquecer um detalhe, abra o guia ou o botão
                        <strong> ?</strong> na tela em que estiver. Não precisa
                        decorar o sistema.
                    </p>
                </>
            ),
            rota: R.guia,
            alvo: 'guia-acoes',
        },
    ],
};

/** Tour essencial: o caminho mínimo para entender o sistema sem a explicação tela a tela. */
const ESSENCIAIS = [
    'boas-vindas',
    'ciclo',
    'menu',
    'roteiros',
    'formulario',
    'aprovacao',
    'publicacao',
    'leads',
    'metricas',
    'guia',
];

export const TOUR_ESSENCIAL: Tour = {
    id: 'essencial',
    nome: 'Tour essencial',
    passos: ESSENCIAIS.map((id) =>
        TOUR_COMPLETO.passos.find((p) => p.id === id)!,
    ),
};

/** Uma parte do tour completo, para rever só a área que ficou na dúvida. */
export function tourDoCapitulo(capitulo: string, chave: string): Tour {
    return {
        id: `capitulo:${chave}`,
        nome: `Tour · ${capitulo}`,
        passos: TOUR_COMPLETO.passos.filter((p) => p.capitulo === capitulo),
    };
}

function pagina(id: string, nome: string, passos: Passo[]): Tour {
    return { id: `pagina:${id}`, nome, passos, daPagina: true };
}

/** Tours curtos, abertos pelo “?” quando a produção está na própria tela. */
export const TOURS_DE_PAGINA: Record<string, Tour> = {
    dashboard: pagina('dashboard', 'Painel da semana', [
        {
            id: 'pagina-dashboard-resumo',
            capitulo: 'Painel da semana',
            titulo: 'Os indicadores da semana',
            texto: (
                <p>
                    Roteiros, edição em andamento, aprovações e leads novos. Os
                    leads qualificados ainda não entregues aparecem no último
                    cartão e levam direto para a lista.
                </p>
            ),
            alvo: 'resumo',
        },
        {
            id: 'pagina-dashboard-fluxo',
            capitulo: 'Painel da semana',
            titulo: 'O fluxo dos vídeos',
            texto: (
                <p>
                    Cada coluna é uma etapa. Clique em um cartão para abrir o
                    vídeo ou o roteiro na tela certa. O quadro mostra só o que
                    está em produção.
                </p>
            ),
            alvo: 'fluxo',
        },
        {
            id: 'pagina-dashboard-pendencias',
            capitulo: 'Painel da semana',
            titulo: 'Pendências e configuração',
            texto: (
                <p>
                    Comece pelo que está listado aqui: é o que está esperando
                    uma decisão sua. Ao lado, veja se briefing, personas e kit
                    estão completos.
                </p>
            ),
            alvo: 'pendencias',
        },
        {
            id: 'pagina-dashboard-ajuda',
            capitulo: 'Painel da semana',
            titulo: 'Ajuda sempre à mão',
            texto: (
                <p>
                    O <strong>?</strong> abre este tour de novo, o tour da tela
                    atual e o guia com o significado de cada status e métrica.
                </p>
            ),
            alvo: 'ajuda',
        },
    ]),
    'briefing/edit': pagina('briefing', 'Briefing', [
        {
            id: 'pagina-briefing-form',
            capitulo: 'Briefing',
            titulo: 'O briefing alimenta a IA',
            texto: (
                <p>
                    Preencha o negócio, o público e os dados profissionais. Tudo
                    que a IA escrever (personas, roteiros, legenda) parte daqui.
                </p>
            ),
            alvo: 'briefing-form',
        },
        {
            id: 'pagina-briefing-acoes',
            capitulo: 'Briefing',
            titulo: 'Rascunho ou sugestão de personas',
            texto: (
                <p>
                    <strong>Salvar rascunho</strong> guarda aos poucos.{' '}
                    <strong>Salvar e sugerir personas</strong> exige o mínimo
                    completo e já pede as sugestões à IA.
                </p>
            ),
            alvo: 'briefing-acoes',
        },
    ]),
    'personas/index': pagina('personas', 'Personas', [
        {
            id: 'pagina-personas-sugestoes',
            capitulo: 'Personas',
            titulo: 'Sugestões da IA',
            texto: (
                <p>
                    A IA propõe personas a partir do briefing. Salve, junte com
                    uma parecida, corrija o texto ou ignore. A decisão é sempre
                    da produção.
                </p>
            ),
            alvo: 'personas-sugestoes',
        },
        {
            id: 'pagina-personas-catalogo',
            capitulo: 'Personas',
            titulo: 'O catálogo',
            texto: (
                <p>
                    As personas salvas viram o catálogo usado nos roteiros e nas
                    métricas. Evite personas repetidas: elas dividem os leads.
                </p>
            ),
            alvo: 'personas-catalogo',
        },
    ]),
    'kit/edit': pagina('kit', 'Kit de marca', [
        {
            id: 'pagina-kit-form',
            capitulo: 'Kit de marca',
            titulo: 'Os elementos da marca',
            texto: (
                <p>
                    Cores, fontes, logo, vinheta e tela final. O kit é copiado
                    para cada vídeo no momento do upload: mudanças valem para os
                    próximos.
                </p>
            ),
            alvo: 'kit-form',
        },
        {
            id: 'pagina-kit-previa',
            capitulo: 'Kit de marca',
            titulo: 'A prévia',
            texto: (
                <p>
                    A prévia mostra como a legenda, a marca e a tela final vão
                    aparecer no vídeo editado.
                </p>
            ),
            alvo: 'kit-previa',
        },
    ]),
    'roteiros/index': pagina('roteiros', 'Roteiros da semana', [
        {
            id: 'pagina-roteiros-acoes',
            capitulo: 'Roteiros da semana',
            titulo: 'Gerar a próxima semana',
            texto: (
                <p>
                    A IA escreve cinco roteiros por semana, sem repetir os
                    recentes. A tela acompanha o pedido e se atualiza sozinha.
                </p>
            ),
            alvo: 'roteiros-acoes',
        },
        {
            id: 'pagina-roteiros-tabela',
            capitulo: 'Roteiros da semana',
            titulo: 'Ler a lista',
            texto: (
                <p>
                    Tema, persona, palavra-chave, conformidade e etapa. O selo
                    de conformidade avisa se há bloqueio ou se o texto mudou
                    depois da checagem.
                </p>
            ),
            alvo: 'roteiros-conteudo',
        },
    ]),
    'roteiros/show': pagina('roteiro', 'Roteiro', [
        {
            id: 'pagina-roteiro-cabecalho',
            capitulo: 'Roteiro',
            titulo: 'As etapas do vídeo',
            texto: (
                <p>
                    O topo mostra onde este vídeo está no ciclo. As etapas
                    concluídas viram links; as futuras só liberam quando o vídeo
                    chega lá.
                </p>
            ),
            alvo: 'roteiro-cabecalho',
        },
        {
            id: 'pagina-roteiro-texto',
            capitulo: 'Roteiro',
            titulo: 'Gancho, desenvolvimento e CTA',
            texto: (
                <p>
                    Edite o texto e salve. Se o roteiro já estava aprovado, ele
                    volta para revisão.
                </p>
            ),
            alvo: 'roteiro-texto',
        },
        {
            id: 'pagina-roteiro-conformidade',
            capitulo: 'Roteiro',
            titulo: 'Conformidade e fatos',
            texto: (
                <p>
                    As regras do conselho e os fatos de saúde aparecem com
                    fontes. “Conferir de novo” refaz a checagem depois de uma
                    edição.
                </p>
            ),
            alvo: 'roteiro-conformidade',
        },
        {
            id: 'pagina-roteiro-persona',
            capitulo: 'Roteiro',
            titulo: 'A persona do roteiro',
            texto: (
                <p>
                    Se a persona ainda é uma sugestão, decida ali mesmo: salve,
                    junte ou corrija. Ela acompanha o vídeo até as métricas.
                </p>
            ),
            alvo: 'roteiro-persona',
        },
        {
            id: 'pagina-roteiro-acoes',
            capitulo: 'Roteiro',
            titulo: 'Aprovar, pedir nova versão ou descartar',
            texto: (
                <p>
                    Aprovar libera a gravação. Pedir nova versão manda um
                    comentário para a IA. Descartar tira o roteiro da semana.
                </p>
            ),
            alvo: 'roteiro-acoes',
        },
    ]),
    'roteiros/gravacao': pagina('gravacao', 'Gravação', [
        {
            id: 'pagina-gravacao-roteiro',
            capitulo: 'Gravação',
            titulo: 'O roteiro para gravar',
            texto: (
                <p>
                    O texto grande, com o gancho em destaque e a palavra-chave
                    na chamada. O botão abre o teleprompter em tela cheia.
                </p>
            ),
            alvo: 'gravacao-roteiro',
        },
        {
            id: 'pagina-gravacao-teleprompter',
            capitulo: 'Gravação',
            titulo: 'Teleprompter',
            texto: (
                <p>
                    Escolha a velocidade e mande rolar. O médico lê enquanto
                    grava; Esc fecha.
                </p>
            ),
            alvo: 'gravacao-teleprompter',
        },
        {
            id: 'pagina-gravacao-takes',
            capitulo: 'Gravação',
            titulo: 'Takes e o take principal',
            texto: (
                <p>
                    Envie um ou vários takes. Escolha o principal e envie para a
                    edição; os outros ficam como alternativa.
                </p>
            ),
            alvo: 'gravacao-takes',
        },
    ]),
    'videos/formulario': pagina('formulario', 'Formulário de edição', [
        {
            id: 'pagina-form-video',
            capitulo: 'Formulário de edição',
            titulo: 'O vídeo bruto e a transcrição',
            texto: (
                <p>
                    Confira o vídeo e os trechos que a IA transcreveu. Os
                    trechos marcados mostram o que será cortado.
                </p>
            ),
            alvo: 'form-video',
        },
        {
            id: 'pagina-form-campos',
            capitulo: 'Formulário de edição',
            titulo: 'Os oito campos',
            texto: (
                <p>
                    Cada campo traz a sugestão da IA e a origem (“do roteiro”
                    quando veio dele). Mantenha, altere ou remova — os
                    obrigatórios não podem sair.
                </p>
            ),
            alvo: 'form-campos',
        },
        {
            id: 'pagina-form-acoes',
            capitulo: 'Formulário de edição',
            titulo: 'Gerar a edição',
            texto: (
                <p>
                    Quando o formulário estiver certo, mande editar. O worker
                    segue exatamente o que está aqui.
                </p>
            ),
            alvo: 'form-acoes',
        },
    ]),
    'roteiros/edicao': pagina('edicao', 'Edição automática', [
        {
            id: 'pagina-edicao-etapas',
            capitulo: 'Edição automática',
            titulo: 'As quatro etapas',
            texto: (
                <p>
                    Transcrição, cortes, legenda e 9:16, tela final e vinheta. O
                    marcador mostra o que já foi feito e o que está rodando.
                </p>
            ),
            alvo: 'edicao-etapas',
        },
        {
            id: 'pagina-edicao-video',
            capitulo: 'Edição automática',
            titulo: 'Acompanhar e tentar de novo',
            texto: (
                <p>
                    A tela atualiza enquanto o worker trabalha. Se falhar, o
                    motivo aparece e a nova tentativa retoma do ponto em que
                    parou.
                </p>
            ),
            alvo: 'edicao-video',
        },
    ]),
    'videos/aprovacao': pagina('aprovacao', 'Aprovação', [
        {
            id: 'pagina-aprovacao-video',
            capitulo: 'Aprovação',
            titulo: 'O vídeo editado',
            texto: (
                <p>
                    Assista em 9:16 e confira a legenda. A aprovação vale para
                    este vídeo e esta legenda; se um dos dois mudar, ela deixa
                    de valer.
                </p>
            ),
            alvo: 'aprovacao-video',
        },
        {
            id: 'pagina-aprovacao-etapas',
            capitulo: 'Aprovação',
            titulo: 'As duas aprovações',
            texto: (
                <p>
                    A primeira é da produção. A segunda é do médico, pelo link.
                    O status mostra quem já aprovou e o que falta.
                </p>
            ),
            alvo: 'aprovacao-etapas',
        },
        {
            id: 'pagina-aprovacao-decisao',
            capitulo: 'Aprovação',
            titulo: 'Aprovar, ajustar ou descartar',
            texto: (
                <p>
                    Aprovar gera o link do médico. Pedir ajuste devolve o vídeo
                    para o formulário com o seu comentário. Descartar encerra
                    este vídeo.
                </p>
            ),
            alvo: 'aprovacao-decisao',
        },
        {
            id: 'pagina-aprovacao-link',
            capitulo: 'Aprovação',
            titulo: 'O link do médico',
            texto: (
                <p>
                    Vale 7 dias e aparece uma vez. Copie e envie pelo WhatsApp.
                    Se expirar, gere outro em “Reenviar link”.
                </p>
            ),
            alvo: 'aprovacao-link',
        },
    ]),
    'videos/index': pagina('upload', 'Upload avulso', [
        {
            id: 'pagina-upload-form',
            capitulo: 'Upload avulso',
            titulo: 'Enviar um vídeo sem roteiro',
            texto: (
                <p>
                    Use quando o vídeo não veio de um roteiro do sistema. A IA
                    deduz os campos a partir do próprio vídeo, e você revisa no
                    formulário.
                </p>
            ),
            alvo: 'upload-form',
        },
        {
            id: 'pagina-upload-envios',
            capitulo: 'Upload avulso',
            titulo: 'Acompanhar os envios',
            texto: (
                <p>
                    Cada envio mostra o status e o botão para a próxima ação:
                    revisar o formulário, aprovar, publicar ou ver o erro.
                </p>
            ),
            alvo: 'upload-envios',
        },
    ]),
    'videos/fila:edicao': pagina('edicao-fila', 'Edição', [
        {
            id: 'pagina-edicao-fila',
            capitulo: 'Edição',
            titulo: 'A fila da edição',
            texto: (
                <p>
                    Cada vídeo aqui está na análise, no formulário ou na edição
                    automática. A tela se atualiza sozinha enquanto o worker
                    trabalha.
                </p>
            ),
            alvo: 'edicao-conteudo',
        },
    ]),
    'videos/fila:aprovacao': pagina('aprovacao-fila', 'Aprovação', [
        {
            id: 'pagina-aprovacao-fila',
            capitulo: 'Aprovação',
            titulo: 'A fila da aprovação',
            texto: (
                <p>
                    O vídeo editado espera a sua aprovação. Depois de aprovado,
                    ele fica aqui como “Aguardando o médico” até a confirmação
                    pelo link.
                </p>
            ),
            alvo: 'aprovacao-conteudo',
        },
    ]),
    'publicacao/index': pagina('publicacao', 'Publicação', [
        {
            id: 'pagina-publicacao-checklist',
            capitulo: 'Publicação',
            titulo: 'O checklist',
            texto: (
                <p>
                    Baixar o MP4, copiar a legenda, ativar a palavra-chave e
                    publicar no Instagram. O checklist não é salvo; ele só ajuda
                    a não esquecer um passo.
                </p>
            ),
            alvo: 'publicacao-checklist',
        },
        {
            id: 'pagina-publicacao-link',
            capitulo: 'Publicação',
            titulo: 'Registrar o post',
            texto: (
                <p>
                    Cole o link do Reels publicado. A partir daí o vídeo entra
                    nas métricas e nos leads.
                </p>
            ),
            alvo: 'publicacao-link',
        },
    ]),
    'leads/index': pagina('leads', 'Leads', [
        {
            id: 'pagina-leads-registrar',
            capitulo: 'Leads',
            titulo: 'Registrar um lead',
            texto: (
                <p>
                    Só com consentimento registrado. Anote o vídeo de origem
                    sempre que souber: é o que liga o lead à persona, ao gancho
                    e às métricas.
                </p>
            ),
            alvo: 'leads-registrar',
        },
        {
            id: 'pagina-leads-filtros',
            capitulo: 'Leads',
            titulo: 'Filtrar por status',
            texto: (
                <p>
                    Qualificado, entregue, agendou ou não agendou. O filtro
                    ajuda a ver o que ainda espera a equipe do cliente.
                </p>
            ),
            alvo: 'leads-filtros',
        },
        {
            id: 'pagina-leads-tabela',
            capitulo: 'Leads',
            titulo: 'A ficha do lead',
            texto: (
                <p>
                    Respostas da qualificação, vídeo de origem e persona. Dado
                    pessoal e de saúde: só a produção deste cliente vê.
                </p>
            ),
            alvo: 'leads-tabela',
        },
    ]),
    'metricas/index': pagina('metricas', 'Métricas', [
        {
            id: 'pagina-metricas-totais',
            capitulo: 'Métricas',
            titulo: 'Os totais',
            texto: (
                <p>
                    Visualizações e comentários digitados, leads registrados e
                    consultas agendadas. Só entram vídeos publicados.
                </p>
            ),
            alvo: 'metricas-totais',
        },
        {
            id: 'pagina-metricas-tabela',
            capitulo: 'Métricas',
            titulo: 'Por vídeo, persona ou gancho',
            texto: (
                <p>
                    Troque o agrupamento para comparar. Em “Vídeo”, os campos de
                    visualizações e comentários são editáveis: salve ao sair do
                    campo.
                </p>
            ),
            alvo: 'metricas-tabela',
        },
        {
            id: 'pagina-metricas-aprendizado',
            capitulo: 'Métricas',
            titulo: 'O aprendizado',
            texto: (
                <p>
                    A persona e o gancho que mais geraram leads. Use isso na
                    próxima geração de roteiros.
                </p>
            ),
            alvo: 'metricas-aprendizado',
        },
    ]),
    'guia/index': pagina('guia', 'Guia do sistema', [
        {
            id: 'pagina-guia-acoes',
            capitulo: 'Guia do sistema',
            titulo: 'Rever o tour',
            texto: (
                <p>
                    Os botões começam o tour completo ou o essencial. O guia
                    embaixo é a referência para consultar quando precisar.
                </p>
            ),
            alvo: 'guia-acoes',
        },
        {
            id: 'pagina-guia-indice',
            capitulo: 'Guia do sistema',
            titulo: 'O índice',
            texto: (
                <p>
                    Vá direto à área que você quer: configuração, produção,
                    resultados, glossário, o que é manual e perguntas
                    frequentes.
                </p>
            ),
            alvo: 'guia-indice',
        },
        {
            id: 'pagina-guia-glossario',
            capitulo: 'Guia do sistema',
            titulo: 'O glossário das métricas',
            texto: (
                <p>
                    Cada métrica com a origem e o significado. É a resposta para
                    “o que quer dizer esse número?”.
                </p>
            ),
            alvo: 'guia-glossario',
        },
    ]),
};

/** Tour completo em capítulos, para o guia oferecer “só esta parte”. */
export const TOURS_DE_CAPITULO: Tour[] = [
    { nome: 'Começando', chave: 'comecando' },
    { nome: 'Configuração', chave: 'configuracao' },
    { nome: 'Produção', chave: 'producao' },
    { nome: 'Resultados', chave: 'resultados' },
    { nome: 'Ajuda', chave: 'ajuda' },
].map(({ nome, chave }) => tourDoCapitulo(nome, chave));

export const TOURS: Record<string, Tour> = {
    [TOUR_COMPLETO.id]: TOUR_COMPLETO,
    [TOUR_ESSENCIAL.id]: TOUR_ESSENCIAL,
    ...Object.fromEntries(TOURS_DE_CAPITULO.map((t) => [t.id, t])),
    ...TOURS_DE_PAGINA,
};

/** O tour da tela atual, se existir. */
export function tourDaPagina(componente: string): Tour | null {
    return TOURS_DE_PAGINA[componente] ?? null;
}
