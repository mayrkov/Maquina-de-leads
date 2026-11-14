import { Head, useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { tempo } from '@/components/status-video';
import { Spinner } from '@/components/ui/spinner';
import { responder, video as arquivoVideo } from '@/routes/confirmacao';

type Video = {
    titulo: string;
    duracao_segundos: number | null;
    legenda: string | null;
};

/** Canva, tela 11: o médico confirma o vídeo antes de publicar, pelo celular, sem login. */
export default function Confirmacao({
    token,
    video,
    resposta,
}: {
    token: string;
    video: Video | null;
    resposta: 'confirmar' | 'ajuste' | null;
}) {
    const form = useForm<{ acao: 'confirmar' | 'ajuste'; observacao: string }>({
        acao: 'confirmar',
        observacao: '',
    });
    const enviar = (acao: 'confirmar' | 'ajuste') => {
        form.transform((d) => ({ ...d, acao }));
        form.post(responder.url(token), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Confirmação do vídeo" />
            <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col bg-[#F6F7F9] text-[#14171C]">
                <header className="flex flex-col gap-1 px-5 pt-5 pb-3">
                    <span className="text-xs text-[#5B6370]">
                        Máquina de Leads · pedido da produção
                    </span>
                    <h1 className="text-xl leading-snug font-bold">
                        {resposta || !video
                            ? 'Confirmação do vídeo'
                            : 'Confirme o vídeo antes de publicar'}
                    </h1>
                </header>

                {resposta ? (
                    <p
                        role="status"
                        className="mx-5 rounded-xl border bg-white p-4 text-[15px] leading-normal"
                    >
                        {resposta === 'confirmar'
                            ? 'Obrigado! Publicação confirmada. A produção já pode publicar o vídeo.'
                            : 'Pedido de ajuste enviado à produção. Você recebe um link novo quando o vídeo for refeito.'}
                    </p>
                ) : !video ? (
                    <p
                        role="alert"
                        className="mx-5 rounded-xl border bg-white p-4 text-[15px] leading-normal"
                    >
                        Este link não vale mais: venceu, já foi respondido ou o
                        vídeo mudou. Peça um link novo à produção.
                    </p>
                ) : (
                    <>
                        <div className="flex flex-1 flex-col gap-3.5 px-5 pb-4">
                            <div className="relative">
                                <video
                                    src={arquivoVideo.url(token)}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="h-[420px] w-full rounded-2xl bg-[#2B3038] object-contain"
                                    aria-label={`Vídeo: ${video.titulo}`}
                                />
                                {video.duracao_segundos !== null && (
                                    <span className="pointer-events-none absolute top-3 left-3 rounded bg-black/40 px-1.5 text-[11px] text-[#C4C9D2]">
                                        {tempo(video.duracao_segundos)}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5 rounded-xl border bg-white p-3.5">
                                <span className="text-xs font-semibold text-[#5B6370]">
                                    Legenda
                                </span>
                                <p className="text-sm leading-normal whitespace-pre-line">
                                    {video.legenda}
                                </p>
                            </div>
                            <label
                                htmlFor="obs"
                                className="text-[13px] font-semibold"
                            >
                                Observação{' '}
                                {form.data.acao === 'ajuste'
                                    ? '(o que precisa mudar)'
                                    : '(opcional)'}
                            </label>
                            <textarea
                                id="obs"
                                rows={3}
                                value={form.data.observacao}
                                onChange={(e) =>
                                    form.setData('observacao', e.target.value)
                                }
                                className="resize-none rounded-[10px] border border-[#D5D9E0] bg-white px-3 py-2.5 text-sm leading-normal"
                            />
                            <InputError message={form.errors.observacao} />
                        </div>
                        <div className="sticky bottom-0 flex flex-col gap-2.5 border-t bg-white px-5 pt-3.5 pb-6">
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => enviar('confirmar')}
                                className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] text-base font-semibold text-white disabled:opacity-60"
                            >
                                {form.processing && <Spinner />}
                                Confirmar publicação
                            </button>
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => {
                                    form.setData('acao', 'ajuste');
                                    if (form.data.observacao.trim())
                                        enviar('ajuste');
                                    else
                                        document.getElementById('obs')?.focus();
                                }}
                                className="min-h-12 rounded-xl border border-[#D5D9E0] bg-white text-[15px] font-semibold disabled:opacity-60"
                            >
                                Pedir ajuste
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
