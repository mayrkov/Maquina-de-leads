import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import SessaoRoteiro, {
    type CabecalhoRoteiro,
} from '@/components/sessao-roteiro';
import { tempo, type StatusVideo } from '@/components/status-video';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { index as indiceAprovacao } from '@/routes/aprovacao';
import { index as publicacao } from '@/routes/publicacao';
import {
    ajuste,
    aprovar,
    assistir,
    descartar,
    editado,
    formulario,
    link,
} from '@/routes/videos';

type Video = {
    id: number;
    titulo: string;
    status: StatusVideo;
    duracao_segundos: number | null;
    legenda: string | null;
    palavra_chave: string | null;
    aprovado_em: string | null;
    confirmado_em: string | null;
    observacao_medico: string | null;
    link_expira_em: string | null;
    aprovacao_valida: boolean;
};

const quando = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

function Etapa({
    estado,
    titulo,
    detalhe,
    children,
}: {
    estado: 'feita' | 'esperando' | 'pendente';
    titulo: string;
    detalhe: string;
    children?: React.ReactNode;
}) {
    const marca = {
        feita: ['bg-[#E7F4EC] text-[#1F7A4D]', '✓', 'feita'],
        esperando: ['bg-[#FCF1E4] text-[#A4520B]', '…', 'aguardando'],
        pendente: ['border-2 border-input', '', 'pendente'],
    }[estado];
    return (
        <li className="flex items-center gap-3">
            <span
                className={`flex size-7 flex-none items-center justify-center rounded-full font-bold ${marca[0]}`}
            >
                <span aria-hidden="true">{marca[1]}</span>
                <span className="sr-only">{marca[2]}</span>
            </span>
            <div className="flex flex-col">
                <span className="text-sm font-semibold">{titulo}</span>
                <span className="text-[13px] text-muted-foreground">
                    {detalhe}
                </span>
            </div>
            {children && <div className="ml-auto">{children}</div>}
        </li>
    );
}

/** Link do médico: aparece uma vez, logo depois de gerado (só o hash fica no banco). */
function LinkMedico({ url, titulo }: { url: string; titulo: string }) {
    const [copiado, setCopiado] = useState(false);
    const mensagem = `Olá! Para confirmar o vídeo “${titulo}” antes de publicar, abra: ${url}`;
    return (
        <div className="flex flex-col gap-2.5 rounded-xl border border-primary/40 bg-accent p-4">
            <span className="text-sm font-semibold text-accent-foreground">
                Link para o médico confirmar pelo celular
            </span>
            <input
                readOnly
                value={url}
                aria-label="Link para o médico"
                onFocus={(e) => e.target.select()}
                className="min-h-10 rounded-lg border border-input bg-card px-3 font-mono text-[13px]"
            />
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                        void navigator.clipboard
                            .writeText(url)
                            .then(() => setCopiado(true));
                    }}
                >
                    {copiado ? 'Copiado' : 'Copiar link'}
                </Button>
                <Button asChild size="sm" variant="outline">
                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Mandar pelo WhatsApp
                    </a>
                </Button>
            </div>
            <span className="text-xs text-muted-foreground">
                Vale por 7 dias. Guarde agora: por segurança, o link não aparece
                de novo (gere outro em “Reenviar link”).
            </span>
        </div>
    );
}

export default function Aprovacao({
    video,
    roteiro,
    linkMedico,
}: {
    video: Video;
    roteiro: CabecalhoRoteiro | null;
    linkMedico: string | null;
}) {
    const [comentario, setComentario] = useState('');
    const aprovou = video.aprovado_em !== null;
    const medicoConfirmou = video.confirmado_em !== null;
    const decidivel = ['editado', 'aprovado', 'confirmado'].includes(
        video.status,
    );

    return (
        <>
            <Head title={`Aprovação · ${video.titulo}`} />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                {roteiro ? (
                    <SessaoRoteiro roteiro={roteiro} atual="aprovacao" />
                ) : (
                    <CabecalhoPagina
                        sobretitulo="Só vai ao ar o que a produção e o médico aprovaram"
                        titulo={`Aprovação: ${video.titulo}`}
                    />
                )}

                {!video.aprovacao_valida && (
                    <p
                        role="alert"
                        className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                    >
                        O vídeo ou a legenda mudaram depois da aprovação: ela
                        não vale mais. Peça ajuste e aprove de novo.
                    </p>
                )}

                <div className="flex flex-wrap items-start gap-8">
                    <section
                        aria-label="Vídeo editado"
                        className="flex flex-[1_1_320px] flex-col items-start gap-3"
                    >
                        <div className="relative w-[320px] max-w-full">
                            <video
                                src={assistir.url({
                                    video: video.id,
                                    tipo: 'editado',
                                })}
                                controls
                                playsInline
                                preload="metadata"
                                className="aspect-[9/16] w-full rounded-[18px] bg-[#2B3038] object-contain"
                                aria-label="Vídeo editado"
                            />
                            <span className="pointer-events-none absolute top-3.5 left-3.5 rounded bg-black/40 px-1.5 text-xs text-[#C4C9D2]">
                                Editado
                                {video.duracao_segundos !== null &&
                                    ` · ${tempo(video.duracao_segundos)}`}{' '}
                                · 9:16
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-10"
                            >
                                <a href={editado.url(video.id)}>
                                    Baixar prévia
                                </a>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-10"
                            >
                                <Link href={formulario(video.id)}>
                                    Ver formulário usado
                                </Link>
                            </Button>
                        </div>
                    </section>

                    <section className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
                        {linkMedico && (
                            <LinkMedico
                                url={linkMedico}
                                titulo={video.titulo}
                            />
                        )}

                        <div className="flex flex-col gap-3.5 rounded-xl border bg-card p-5">
                            <h2 className="text-base font-semibold">
                                Etapas de aprovação
                            </h2>
                            <ol className="flex flex-col gap-3">
                                <Etapa
                                    estado="feita"
                                    titulo="Edição automática concluída"
                                    detalhe="Transcrição, cortes, legendas, tela final"
                                />
                                <Etapa
                                    estado={aprovou ? 'feita' : 'esperando'}
                                    titulo="Produção aprovou"
                                    detalhe={
                                        aprovou
                                            ? quando(video.aprovado_em!)
                                            : 'Aguardando a sua revisão'
                                    }
                                />
                                <Etapa
                                    estado={
                                        medicoConfirmou
                                            ? 'feita'
                                            : aprovou
                                              ? 'esperando'
                                              : 'pendente'
                                    }
                                    titulo="Confirmação do médico"
                                    detalhe={
                                        medicoConfirmou
                                            ? `${quando(video.confirmado_em!)}${video.observacao_medico ? ` · “${video.observacao_medico}”` : ''}`
                                            : aprovou
                                              ? video.link_expira_em
                                                  ? `Link enviado, aguardando (vale até ${quando(video.link_expira_em)})`
                                                  : 'Aguardando'
                                              : 'Depois da aprovação da produção'
                                    }
                                >
                                    {video.status === 'aprovado' &&
                                        video.aprovacao_valida && (
                                            <Form
                                                {...link.form(video.id)}
                                                options={{
                                                    preserveScroll: true,
                                                }}
                                            >
                                                {({ processing }) => (
                                                    <button
                                                        type="submit"
                                                        disabled={processing}
                                                        className="text-[13px] font-semibold text-primary hover:text-[#1A3DA3]"
                                                    >
                                                        Reenviar link
                                                    </button>
                                                )}
                                            </Form>
                                        )}
                                </Etapa>
                            </ol>
                            {video.status === 'confirmado' && (
                                <Button asChild className="h-11 self-start">
                                    <Link
                                        href={publicacao({
                                            query: { video: video.id },
                                        })}
                                    >
                                        Ir para a publicação
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
                            <h2 className="text-base font-semibold">
                                Legenda do post
                            </h2>
                            <p className="text-sm leading-relaxed whitespace-pre-line text-[#3A414C]">
                                {video.legenda ?? '—'}
                            </p>
                        </div>

                        {decidivel && (
                            <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                                <label
                                    htmlFor="ajuste"
                                    className="text-base font-semibold"
                                >
                                    Pedido de ajuste
                                </label>
                                <Form
                                    {...ajuste.form(video.id)}
                                    options={{ preserveScroll: true }}
                                    className="flex flex-col gap-3"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <textarea
                                                id="ajuste"
                                                name="comentario"
                                                rows={3}
                                                value={comentario}
                                                onChange={(e) =>
                                                    setComentario(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Descreva o que precisa mudar (ex.: trocar o corte em 0:12)"
                                                className="resize-y rounded-[10px] border border-input bg-card px-3.5 py-3 text-[15px] leading-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                            />
                                            <InputError
                                                message={errors.comentario}
                                            />
                                            <div className="flex flex-wrap gap-2.5">
                                                {video.status === 'editado' && (
                                                    <Button
                                                        type="submit"
                                                        form="aprovar"
                                                        className="h-11"
                                                        disabled={processing}
                                                    >
                                                        Aprovar e enviar ao
                                                        médico
                                                    </Button>
                                                )}
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    className="h-11"
                                                    disabled={
                                                        processing ||
                                                        comentario.trim() === ''
                                                    }
                                                >
                                                    {processing && <Spinner />}
                                                    Pedir ajuste
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    form="descartar"
                                                    variant="ghost"
                                                    className="h-11 text-[#B42318] hover:text-[#B42318]"
                                                >
                                                    Descartar
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </Form>
                                {/* Formulários das outras ações, ligados aos botões acima pelo atributo form. */}
                                <Form
                                    {...aprovar.form(video.id)}
                                    id="aprovar"
                                    options={{ preserveScroll: true }}
                                    className="hidden"
                                >
                                    {null}
                                </Form>
                                <Form
                                    {...descartar.form(video.id)}
                                    id="descartar"
                                    onBefore={() =>
                                        confirm(
                                            'Descartar este vídeo? Ele não vai ao ar.',
                                        )
                                    }
                                    className="hidden"
                                >
                                    {null}
                                </Form>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

Aprovacao.layout = {
    breadcrumbs: [{ title: 'Aprovação', href: indiceAprovacao() }],
};
