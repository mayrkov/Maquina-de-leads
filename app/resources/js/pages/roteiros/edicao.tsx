import { Head, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import SessaoRoteiro, {
    type CabecalhoRoteiro,
} from '@/components/sessao-roteiro';
import { Button } from '@/components/ui/button';
import type { StatusVideo } from '@/components/status-video';
import { gravacao, index } from '@/routes/roteiros';
import { aprovacao, editado, formulario } from '@/routes/videos';

type Roteiro = CabecalhoRoteiro & {
    gancho: string;
    cta: string;
    palavra_chave: string;
};
type Video = {
    id: number;
    nome: string;
    status: StatusVideo;
    erro: string | null;
    duracao_segundos: number | null;
    tarefa: 'pendente' | 'em_andamento' | 'concluida' | 'falhou' | null;
    etapa: string | null;
    tentativa: number | null;
} | null;

// Mesmas etapas e ordem do worker (worker/src/orchestrator/edit/pipeline.ts, ETAPAS_EDICAO).
const ETAPAS = [
    {
        chave: 'transcricao',
        rotulo: 'Transcrição do áudio',
        detalhe: 'Texto completo com tempos',
    },
    {
        chave: 'cortes',
        rotulo: 'Corte de silêncios, gaguejos e repetições',
        detalhe: 'Só fica a fala',
    },
    {
        chave: 'legenda',
        rotulo: 'Legendas no estilo da marca e 9:16',
        detalhe: 'Reenquadra no rosto, legenda e logo',
    },
    {
        chave: 'tela_final',
        rotulo: 'Tela final e vinheta',
        detalhe: 'Chamada para ação e palavra-chave',
    },
];

type Estado = 'feita' | 'rodando' | 'esperando';

/** Já passou da edição (editado, aprovado, confirmado ou publicado). */
const editou = (v: NonNullable<Video>) =>
    ['editado', 'aprovado', 'confirmado', 'publicado'].includes(v.status);

function estados(video: NonNullable<Video>): Estado[] {
    if (editou(video)) return ETAPAS.map(() => 'feita');
    const atual =
        video.tarefa === 'em_andamento'
            ? ETAPAS.findIndex((e) => e.chave === video.etapa)
            : -1;
    return ETAPAS.map((_, i) =>
        atual < 0
            ? 'esperando'
            : i < atual
              ? 'feita'
              : i === atual
                ? 'rodando'
                : 'esperando',
    );
}

const MARCADOR: Record<
    Estado,
    { classe: string; texto: string; leitor: string }
> = {
    feita: {
        classe: 'bg-[#E7F4EC] text-[#1F7A4D]',
        texto: '✓',
        leitor: 'feita',
    },
    rodando: {
        classe: 'bg-accent text-accent-foreground',
        texto: '…',
        leitor: 'em andamento',
    },
    esperando: {
        classe: 'border-2 border-input',
        texto: '',
        leitor: 'aguardando',
    },
};

export default function Edicao({
    roteiro,
    video,
}: {
    roteiro: Roteiro;
    video: Video;
}) {
    const editando = video?.status === 'aguardando_edicao';

    useEffect(() => {
        if (!editando) return;
        const t = setInterval(
            () => router.reload({ only: ['roteiro', 'video'] }),
            5000,
        );
        return () => clearInterval(t);
    }, [editando]);

    const lista = video ? estados(video) : [];
    const feitas = lista.filter((e) => e === 'feita').length;
    const progresso =
        video && editou(video)
            ? 100
            : Math.round((feitas / ETAPAS.length) * 100);

    return (
        <>
            <Head title={`Edição · ${roteiro.titulo}`} />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <SessaoRoteiro roteiro={roteiro} atual="edicao" />

                {!video ? (
                    <p className="rounded-xl border bg-card px-5 py-6 text-sm text-muted-foreground">
                        Nenhum take foi para a edição ainda.{' '}
                        <Link
                            href={gravacao(roteiro.id)}
                            className="font-semibold text-primary"
                        >
                            Escolher o take principal
                        </Link>
                    </p>
                ) : (
                    <div className="flex flex-wrap items-start gap-6">
                        <section
                            aria-labelledby="prog"
                            data-tour="edicao-video"
                            className="flex min-w-0 flex-[999_1_480px] flex-col gap-[18px] rounded-xl border bg-card p-6"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h2
                                        id="prog"
                                        className="text-lg font-semibold"
                                    >
                                        {editou(video)
                                            ? 'Vídeo editado'
                                            : video.status === 'falhou'
                                              ? 'A edição falhou'
                                              : video.status ===
                                                  'aguardando_edicao'
                                                ? 'Editando o vídeo'
                                                : 'Antes da edição'}
                                    </h2>
                                    <span className="text-[13px] text-muted-foreground">
                                        {editou(video)
                                            ? video.duracao_segundos !== null &&
                                              `${Math.round(video.duracao_segundos)} s`
                                            : video.tarefa === 'pendente'
                                              ? 'Na fila'
                                              : video.tarefa ===
                                                      'em_andamento' &&
                                                  (video.tentativa ?? 1) > 1
                                                ? `Tentativa ${video.tentativa}`
                                                : null}
                                    </span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-valuenow={progresso}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Progresso da edição"
                                    className="h-2 overflow-hidden rounded bg-border"
                                >
                                    <div
                                        className="h-full bg-primary transition-[width]"
                                        style={{ width: `${progresso}%` }}
                                    />
                                </div>
                            </div>
                            <ol
                                data-tour="edicao-etapas"
                                className="flex flex-col"
                            >
                                {ETAPAS.map((e, i) => (
                                    <li
                                        key={e.chave}
                                        className="flex items-center gap-3.5 border-t border-muted py-3"
                                    >
                                        <span
                                            className={`flex size-7 flex-none items-center justify-center rounded-full font-bold ${MARCADOR[lista[i]].classe}`}
                                        >
                                            <span aria-hidden="true">
                                                {MARCADOR[lista[i]].texto}
                                            </span>
                                            <span className="sr-only">
                                                {MARCADOR[lista[i]].leitor}
                                            </span>
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-semibold">
                                                {e.rotulo}
                                            </span>
                                            <span className="text-[13px] text-muted-foreground">
                                                {e.detalhe}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            {video.status === 'falhou' && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                                >
                                    {video.erro ?? 'Erro desconhecido.'}{' '}
                                    <Link
                                        href={formulario(video.id)}
                                        className="font-semibold underline"
                                    >
                                        Conferir o formulário e mandar de novo
                                    </Link>
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                                {editou(video) ? (
                                    <>
                                        <Button asChild className="h-11">
                                            <Link href={aprovacao(video.id)}>
                                                Ir para a aprovação
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="h-11"
                                        >
                                            <a href={editado.url(video.id)}>
                                                Baixar o vídeo editado
                                            </a>
                                        </Button>
                                    </>
                                ) : video.status === 'analisando' ||
                                  video.status === 'formulario' ? (
                                    <Button asChild className="h-11">
                                        <Link href={formulario(video.id)}>
                                            Revisar o formulário de edição
                                        </Link>
                                    </Button>
                                ) : (
                                    editando && (
                                        <span className="text-[13px] text-muted-foreground">
                                            Pode sair desta tela: a edição
                                            continua no worker.
                                        </span>
                                    )
                                )}
                            </div>
                        </section>

                        <aside
                            aria-labelledby="aplicado"
                            className="flex flex-[1_1_300px] flex-col gap-2.5 rounded-xl border bg-card p-5"
                        >
                            <h2
                                id="aplicado"
                                className="text-base font-semibold"
                            >
                                O que foi aplicado
                            </h2>
                            <div className="text-[13px] leading-normal">
                                <span className="font-semibold text-muted-foreground">
                                    Take:{' '}
                                </span>
                                {video.nome}
                            </div>
                            <div className="text-[13px] leading-normal">
                                <span className="font-semibold text-muted-foreground">
                                    Gancho:{' '}
                                </span>
                                “{roteiro.gancho}”
                            </div>
                            <div className="text-[13px] leading-normal">
                                <span className="font-semibold text-muted-foreground">
                                    Tela final:{' '}
                                </span>
                                {roteiro.cta}
                            </div>
                            <div className="text-[13px] leading-normal">
                                <span className="font-semibold text-muted-foreground">
                                    Formulário:{' '}
                                </span>
                                <Link
                                    href={formulario(video.id)}
                                    className="text-primary"
                                >
                                    cortes, destaques e legenda revisados
                                </Link>
                            </div>
                            <div className="text-[13px] leading-normal">
                                <span className="font-semibold text-muted-foreground">
                                    Kit de marca:{' '}
                                </span>
                                legenda, logo, vinheta e tela final do cliente
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </>
    );
}

Edicao.layout = {
    breadcrumbs: [{ title: 'Roteiros', href: index() }],
};
