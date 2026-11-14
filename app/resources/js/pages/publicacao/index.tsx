import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/publicacao';
import { editado, publicar } from '@/routes/videos';

type Video = {
    id: number;
    titulo: string;
    status: 'confirmado' | 'publicado';
    palavra_chave: string | null;
    legenda: string | null;
    post_url: string | null;
    publicado_em: string | null;
    aprovacao_valida: boolean;
};

const caixa = 'size-5 flex-none accent-primary';

/** Checklist da tela (não fica salvo): marca sozinho o que foi feito por aqui. */
function Pronto({ video }: { video: Video }) {
    const [feito, setFeito] = useState({
        baixar: false,
        copiar: false,
        palavra: false,
        publicar: false,
    });
    const marcar = (item: keyof typeof feito, valor = true) =>
        setFeito((f) => ({ ...f, [item]: valor }));

    return (
        <section
            aria-labelledby="pronto"
            data-tour="publicacao-checklist"
            className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-xl border bg-card p-[22px]"
        >
            <div className="flex flex-wrap items-center gap-4">
                <div
                    className="h-24 w-[54px] flex-none rounded-lg bg-[#2B3038]"
                    aria-hidden="true"
                />
                <div className="flex flex-[1_1_240px] flex-col gap-1">
                    <h2 id="pronto" className="text-[17px] font-semibold">
                        {video.titulo}
                    </h2>
                    <span className="text-[13px] text-muted-foreground">
                        Aprovado pela produção e confirmado pelo médico
                    </span>
                </div>
                <span className="rounded-full bg-[#E7F4EC] px-2.5 py-[3px] text-xs font-semibold text-[#1F7A4D]">
                    Pronto
                </span>
            </div>
            {!video.aprovacao_valida && (
                <p
                    role="alert"
                    className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                >
                    O vídeo ou a legenda mudaram depois das aprovações. Não
                    publique: peça ajuste na aprovação.
                </p>
            )}
            <ol className="flex flex-col gap-1">
                <li className="flex flex-wrap items-center gap-3 border-t border-muted py-3">
                    <input
                        type="checkbox"
                        id="c1"
                        className={caixa}
                        checked={feito.baixar}
                        onChange={(e) => marcar('baixar', e.target.checked)}
                    />
                    <label htmlFor="c1" className="flex-[1_1_200px] text-sm">
                        Baixar o vídeo final (MP4 9:16)
                    </label>
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-10"
                    >
                        <a
                            href={editado.url(video.id)}
                            onClick={() => marcar('baixar')}
                        >
                            Baixar
                        </a>
                    </Button>
                </li>
                <li className="flex flex-wrap items-center gap-3 border-t border-muted py-3">
                    <input
                        type="checkbox"
                        id="c2"
                        className={caixa}
                        checked={feito.copiar}
                        onChange={(e) => marcar('copiar', e.target.checked)}
                    />
                    <label htmlFor="c2" className="flex-[1_1_200px] text-sm">
                        Copiar a legenda do post
                    </label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10"
                        onClick={() =>
                            void navigator.clipboard
                                .writeText(video.legenda ?? '')
                                .then(() => marcar('copiar'))
                        }
                    >
                        {feito.copiar ? 'Copiada' : 'Copiar'}
                    </Button>
                </li>
                <li className="flex flex-wrap items-center gap-3 border-t border-muted py-3">
                    <input
                        type="checkbox"
                        id="c3"
                        className={caixa}
                        checked={feito.palavra}
                        onChange={(e) => marcar('palavra', e.target.checked)}
                    />
                    <label htmlFor="c3" className="flex-[1_1_200px] text-sm">
                        Ativar a palavra-chave{' '}
                        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-[13px] font-semibold">
                            {video.palavra_chave}
                        </code>{' '}
                        na ferramenta de mensagens
                    </label>
                </li>
                <li className="flex flex-wrap items-center gap-3 border-t border-muted py-3">
                    <input
                        type="checkbox"
                        id="c4"
                        className={caixa}
                        checked={feito.publicar}
                        onChange={(e) => marcar('publicar', e.target.checked)}
                    />
                    <label htmlFor="c4" className="flex-[1_1_200px] text-sm">
                        Publicar no Instagram do médico
                    </label>
                </li>
            </ol>
            <div data-tour="publicacao-link">
                <Form
                    {...publicar.form(video.id)}
                    className="flex flex-col gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex flex-col gap-1.5">
                                <label
                                    htmlFor="link"
                                    className="text-sm font-semibold"
                                >
                                    Link do post publicado
                                </label>
                                <input
                                    id="link"
                                    name="post_url"
                                    type="url"
                                    required
                                    placeholder="https://www.instagram.com/reel/…"
                                    className="min-h-11 rounded-[10px] border border-input bg-card px-3.5 text-[15px]"
                                />
                                <InputError message={errors.post_url} />
                            </div>
                            <Button
                                type="submit"
                                className="h-11 self-start"
                                disabled={processing || !video.aprovacao_valida}
                            >
                                {processing && <Spinner />}
                                Marcar como publicado
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </section>
    );
}

export default function Publicacao({
    prontos,
    escolhido,
    publicados,
}: {
    prontos: Video[];
    escolhido: number | null;
    publicados: Video[];
}) {
    const video = prontos.find((v) => v.id === escolhido) ?? null;

    return (
        <>
            <Head title="Publicação manual" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="No MVP a produção publica direto no Instagram do médico"
                    titulo="Publicação manual"
                />

                {prontos.length > 1 && (
                    <nav
                        aria-label="Prontos para publicar"
                        className="flex flex-wrap gap-2"
                    >
                        {prontos.map((v) => (
                            <Link
                                key={v.id}
                                href={index({ query: { video: v.id } })}
                                aria-current={
                                    v.id === escolhido ? 'true' : undefined
                                }
                                className="min-h-10 rounded-full border border-input bg-card px-3.5 py-2 text-[13px] font-semibold aria-[current]:border-transparent aria-[current]:bg-[#14171C] aria-[current]:text-white"
                            >
                                {v.titulo}
                            </Link>
                        ))}
                    </nav>
                )}

                <div
                    data-tour="publicacao-conteudo"
                    className="flex flex-wrap items-start gap-6"
                >
                    {video ? (
                        <Pronto key={video.id} video={video} />
                    ) : (
                        <p className="flex-[999_1_520px] rounded-xl border bg-card p-[22px] text-sm text-muted-foreground">
                            Nenhum vídeo pronto para publicar. Ele chega aqui
                            depois da aprovação da produção e da confirmação do
                            médico.
                        </p>
                    )}

                    <aside
                        aria-labelledby="hist"
                        className="flex flex-[1_1_300px] flex-col gap-2.5 rounded-xl border bg-card p-5"
                    >
                        <h2 id="hist" className="text-base font-semibold">
                            Publicados
                        </h2>
                        {publicados.length === 0 ? (
                            <p className="text-sm leading-normal text-muted-foreground">
                                Nenhum vídeo publicado ainda. Os publicados
                                aparecem aqui com o link do post e a
                                palavra-chave.
                            </p>
                        ) : (
                            <ul className="flex flex-col">
                                {publicados.map((v) => (
                                    <li
                                        key={v.id}
                                        className="flex flex-col gap-0.5 border-b border-muted py-2.5 text-sm last:border-0"
                                    >
                                        <span className="font-semibold">
                                            {v.titulo}
                                        </span>
                                        <span className="text-[13px] text-muted-foreground">
                                            <code className="font-mono font-semibold">
                                                {v.palavra_chave}
                                            </code>
                                            {v.publicado_em &&
                                                ` · ${new Date(v.publicado_em).toLocaleDateString('pt-BR')} · `}
                                            {v.post_url && (
                                                <a
                                                    href={v.post_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary"
                                                >
                                                    Ver post
                                                </a>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

Publicacao.layout = {
    breadcrumbs: [{ title: 'Publicação', href: index() }],
};
