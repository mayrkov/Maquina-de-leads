import { Head, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import {
    CLASSE_STATUS,
    ROTULO_STATUS,
    type StatusVideo,
} from '@/components/status-video';

type Linha = {
    id: number;
    titulo: string;
    persona: string | null;
    palavra_chave: string | null;
    status: StatusVideo;
    erro: string | null;
    link: string;
    atualizado_em: string | null;
};

/** Menu "Edição" e "Aprovação": os vídeos naquela parte do fluxo, cada um levando à tela da sua etapa. */
export default function Fila({
    titulo,
    sobretitulo,
    videos,
}: {
    titulo: string;
    sobretitulo: string;
    videos: Linha[];
}) {
    const trabalhando = videos.some(
        (v) => v.status === 'analisando' || v.status === 'aguardando_edicao',
    );

    useEffect(() => {
        if (!trabalhando) return;
        const t = setInterval(() => router.reload({ only: ['videos'] }), 5000);
        return () => clearInterval(t);
    }, [trabalhando]);

    return (
        <>
            <Head title={titulo} />
            <div
                data-tour={
                    titulo === 'Aprovação'
                        ? 'aprovacao-conteudo'
                        : titulo === 'Edição'
                          ? 'edicao-conteudo'
                          : undefined
                }
                className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8"
            >
                <CabecalhoPagina sobretitulo={sobretitulo} titulo={titulo} />
                {videos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Nenhum vídeo nesta etapa agora.
                    </p>
                ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                        {videos.map((v) => (
                            <li
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-4"
                            >
                                <div className="flex min-w-0 flex-col gap-1">
                                    <span className="font-semibold">
                                        {v.titulo}
                                    </span>
                                    <span className="text-[13px] text-muted-foreground">
                                        {[
                                            v.persona &&
                                                `Persona: ${v.persona}`,
                                            v.palavra_chave,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') || '—'}
                                    </span>
                                    {v.erro && (
                                        <span className="text-[13px] text-[#8A1C1C]">
                                            {v.erro}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASSE_STATUS[v.status]}`}
                                    >
                                        {ROTULO_STATUS[v.status]}
                                    </span>
                                    <Link
                                        href={v.link}
                                        className="font-semibold text-primary hover:text-[#1A3DA3]"
                                        aria-label={`Abrir ${v.titulo}`}
                                    >
                                        Abrir
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
