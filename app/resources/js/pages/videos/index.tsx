import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import {
    CLASSE_STATUS,
    ROTULO_STATUS,
    type StatusVideo,
} from '@/components/status-video';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { index, store } from '@/routes/videos';

type VideoLinha = {
    id: number;
    nome: string;
    palavra_chave: string | null;
    status: StatusVideo;
    link: string;
    tarefa: 'pendente' | 'em_andamento' | 'concluida' | 'falhou' | null;
    duracao_segundos: number | null;
    erro: string | null;
    enviado_em: string;
};

type Paginado<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

const ACAO: Partial<Record<StatusVideo, string>> = {
    formulario: 'Revisar formulário',
    editado: 'Aprovar',
    falhou: 'Ver',
    confirmado: 'Publicar',
};

export default function Videos({
    videos,
    uploadMaxMb,
}: {
    videos: Paginado<VideoLinha>;
    uploadMaxMb: number;
}) {
    const { status } = usePage<{ status?: string | null }>().props;
    const trabalhando = videos.data.some(
        (v) => v.status === 'analisando' || v.status === 'aguardando_edicao',
    );

    // Enquanto a IA analisa ou o worker edita, atualiza a lista a cada 5 s.
    useEffect(() => {
        if (!trabalhando) return;
        const t = setInterval(() => router.reload({ only: ['videos'] }), 5000);
        return () => clearInterval(t);
    }, [trabalhando]);

    return (
        <>
            <Head title="Upload avulso" />
            <div className="flex flex-1 flex-col gap-8 p-4 md:p-6">
                <Heading
                    title="Upload avulso"
                    description="Para vídeos gravados sem roteiro do sistema. Sem roteiro, a IA deduz tema, persona, gancho, chamada para ação e palavra-chave a partir do próprio vídeo, e você revisa no formulário de edição."
                />

                <div data-tour="upload-form">
                    <Form
                        {...store.form()}
                        resetOnSuccess
                        className="grid max-w-xl gap-6"
                    >
                        {({ processing, errors, progress }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="video">
                                        Vídeo bruto (MP4 ou MOV, até{' '}
                                        {uploadMaxMb} MB)
                                    </Label>
                                    <Input
                                        id="video"
                                        name="video"
                                        type="file"
                                        accept="video/mp4,video/quicktime"
                                        required
                                    />
                                    <InputError message={errors.video} />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Enviar
                                    </Button>
                                    {progress && (
                                        <span className="text-sm text-muted-foreground">
                                            {progress.percentage}% enviado
                                        </span>
                                    )}
                                    {status && !processing && (
                                        <span className="text-sm text-green-700 dark:text-green-400">
                                            {status}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <section
                    aria-labelledby="envios"
                    data-tour="upload-envios"
                    className="grid gap-3"
                >
                    <h2 id="envios" className="text-lg font-semibold">
                        Envios
                    </h2>
                    {videos.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nenhum vídeo enviado ainda.
                        </p>
                    ) : (
                        <ul className="divide-y rounded-xl border">
                            {videos.data.map((v) => (
                                <li
                                    key={v.id}
                                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                                >
                                    <div className="grid gap-1">
                                        <span className="font-medium break-all">
                                            {v.nome}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {v.palavra_chave
                                                ? `${v.palavra_chave} · `
                                                : ''}
                                            {new Date(
                                                v.enviado_em,
                                            ).toLocaleString('pt-BR')}
                                            {v.duracao_segundos !== null &&
                                                ` · ${Math.round(v.duracao_segundos)} s`}
                                        </span>
                                        {v.erro && (
                                            <span className="text-sm text-red-700 dark:text-red-400">
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
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link href={v.link}>
                                                {ACAO[v.status] ?? 'Abrir'}
                                            </Link>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {videos.links.length > 3 && (
                        <nav
                            aria-label="Páginas"
                            className="flex flex-wrap gap-2"
                        >
                            {videos.links.map((l, i) =>
                                l.url ? (
                                    <Link
                                        key={i}
                                        href={l.url}
                                        className={
                                            l.active
                                                ? 'font-semibold underline'
                                                : 'text-muted-foreground'
                                        }
                                        preserveScroll
                                    >
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: l.label,
                                            }}
                                        />
                                    </Link>
                                ) : null,
                            )}
                        </nav>
                    )}
                </section>
            </div>
        </>
    );
}

Videos.layout = {
    breadcrumbs: [{ title: 'Upload avulso', href: index() }],
};
