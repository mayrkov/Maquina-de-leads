import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { edicao, gravacao, index, show } from '@/routes/roteiros';
import { aprovacao, formulario } from '@/routes/videos';

export type CabecalhoRoteiro = {
    id: number;
    titulo: string;
    status: 'rascunho' | 'aprovado' | 'descartado';
    semana: string;
    /** Vídeo que está na produção (o take que passou da gravação). */
    video_id: number | null;
    etapas: {
        roteiro: boolean;
        gravacao: boolean;
        formulario: boolean;
        edicao: boolean;
        aprovacao: boolean;
    };
};

export type SituacaoConformidade =
    | 'pendente'
    | 'desatualizada'
    | 'bloqueio'
    | 'atencao'
    | 'ok';

export const SELO_CONFORMIDADE: Record<
    SituacaoConformidade,
    { rotulo: string; classe: string }
> = {
    ok: { rotulo: 'Sem bloqueios', classe: 'bg-[#E7F4EC] text-[#1F7A4D]' },
    atencao: { rotulo: 'Atenção', classe: 'bg-[#FCF1E4] text-[#7A3D08]' },
    bloqueio: { rotulo: 'Bloqueio', classe: 'bg-[#FDECEC] text-[#8A1C1C]' },
    desatualizada: {
        rotulo: 'Conferir de novo',
        classe: 'bg-muted text-muted-foreground',
    },
    pendente: {
        rotulo: 'Não conferido',
        classe: 'bg-muted text-muted-foreground',
    },
};

export type Etapa =
    | 'roteiro'
    | 'gravacao'
    | 'formulario'
    | 'edicao'
    | 'aprovacao';

/**
 * Topo das telas da sessão do roteiro (canva, telas 07, 07.2, 09, 07.4 e 10): volta à semana, título, ações e as
 * etapas do vídeo. Formulário e aprovação abrem o vídeo que está na produção; sem ele, não têm link.
 */
export default function SessaoRoteiro({
    roteiro,
    atual,
    acoes,
}: {
    roteiro: CabecalhoRoteiro;
    atual: Etapa;
    acoes?: ReactNode;
}) {
    const { status } = usePage<{ status?: string | null }>().props;
    const video = roteiro.video_id;
    const etapas: {
        chave: Etapa;
        rotulo: string;
        href?: string;
        feita: boolean;
    }[] = [
        {
            chave: 'roteiro',
            rotulo: '1 Roteiro',
            href: show.url(roteiro.id),
            feita: roteiro.etapas.roteiro,
        },
        {
            chave: 'gravacao',
            rotulo: '2 Gravação e upload',
            href: gravacao.url(roteiro.id),
            feita: roteiro.etapas.gravacao,
        },
        {
            chave: 'formulario',
            rotulo: '3 Formulário de edição',
            href: video ? formulario.url(video) : undefined,
            feita: roteiro.etapas.formulario,
        },
        {
            chave: 'edicao',
            rotulo: '4 Edição automática',
            href: edicao.url(roteiro.id),
            feita: roteiro.etapas.edicao,
        },
        {
            chave: 'aprovacao',
            rotulo: '5 Aprovação',
            href:
                video && roteiro.etapas.edicao
                    ? aprovacao.url(video)
                    : undefined,
            feita: roteiro.etapas.aprovacao,
        },
    ];

    return (
        <header className="flex flex-col gap-3.5">
            <Link
                href={index.url({ query: { semana: roteiro.semana } })}
                className="text-[13px] text-primary no-underline hover:text-[#1A3DA3]"
            >
                ← Roteiros da semana
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <h1 className="text-[26px] leading-tight font-bold tracking-tight">
                    {roteiro.titulo}
                </h1>
                {acoes && <div className="flex flex-wrap gap-3">{acoes}</div>}
            </div>
            <ol
                aria-label="Etapas do vídeo"
                className="flex flex-wrap gap-2 text-[13px]"
            >
                {etapas.map((e) => (
                    <li key={e.rotulo}>
                        {e.chave === atual ? (
                            <span
                                aria-current="step"
                                className="inline-block rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                            >
                                {e.rotulo}
                            </span>
                        ) : e.href ? (
                            <Link
                                href={e.href}
                                className={`inline-block rounded-full px-3 py-1.5 no-underline ${e.feita ? 'bg-[#E7F4EC] font-semibold text-[#1F7A4D]' : 'bg-border text-[#3A414C]'}`}
                            >
                                {e.feita ? `✓ ${e.rotulo}` : e.rotulo}
                            </Link>
                        ) : (
                            <span
                                className="inline-block rounded-full bg-border px-3 py-1.5 text-muted-foreground"
                                title="Libera quando o vídeo chegar nesta etapa"
                            >
                                {e.rotulo}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
            {status && (
                <p
                    role="status"
                    className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
                >
                    {status}
                </p>
            )}
        </header>
    );
}
