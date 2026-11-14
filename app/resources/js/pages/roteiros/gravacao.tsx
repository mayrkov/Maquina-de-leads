import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Info, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { ROTULO_STATUS, type StatusVideo } from '@/components/status-video';
import SessaoRoteiro, {
    type CabecalhoRoteiro,
} from '@/components/sessao-roteiro';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { editar, index, takes as rotaTakes } from '@/routes/roteiros';

type Roteiro = CabecalhoRoteiro & {
    gancho: string;
    desenvolvimento: string;
    cta: string;
    palavra_chave: string;
};
type Take = {
    id: number;
    nome: string;
    tamanho_bytes: number;
    status: StatusVideo;
    enviado_em: string;
};
type Envio = { nome: string; progresso: number };

// Orientações de gravação do canva (RF12). Só ajudam quem grava: não são guardadas.
const CHECKLIST = [
    'Celular na vertical (9:16)',
    'Luz de frente, sem contraluz',
    'Microfone de lapela ligado',
    'Médico fala a palavra-chave no final',
    '2 segundos de silêncio antes e depois',
];

const SITUACAO_TAKE = {
    ...ROTULO_STATUS,
    enviado: 'enviado',
    descartado: 'descartado',
} satisfies Record<StatusVideo, string>;

const tamanho = (bytes: number) =>
    bytes >= 1024 ** 3
        ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
        : `${Math.round(bytes / 1024 ** 2)} MB`;

/** Fala em destaque a palavra-chave dentro da chamada. */
function ComPalavra({ texto, palavra }: { texto: string; palavra: string }) {
    const partes = texto.split(
        new RegExp(`(${palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'iu'),
    );
    return (
        <>
            {partes.map((p, i) =>
                p.toUpperCase() === palavra.toUpperCase() ? (
                    <strong key={i} className="text-[#F2B33D]">
                        {p}
                    </strong>
                ) : (
                    p
                ),
            )}
        </>
    );
}

/** Teleprompter: o texto grande, em tela cheia, rolando sozinho. Esc fecha. */
function Teleprompter({
    roteiro,
    aoFechar,
}: {
    roteiro: Roteiro;
    aoFechar: () => void;
}) {
    const caixa = useRef<HTMLDivElement>(null);
    const [rodando, setRodando] = useState(false);
    const [velocidade, setVelocidade] = useState(2);

    useEffect(() => {
        const fechar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
        window.addEventListener('keydown', fechar);
        return () => window.removeEventListener('keydown', fechar);
    }, [aoFechar]);

    useEffect(() => {
        if (!rodando) return;
        const t = setInterval(
            () => caixa.current?.scrollBy({ top: velocidade }),
            50,
        );
        return () => clearInterval(t);
    }, [rodando, velocidade]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Teleprompter"
            className="fixed inset-0 z-50 flex flex-col bg-[#0B0D10] text-white"
        >
            <div className="flex flex-wrap items-center gap-3 border-b border-[#2A2F38] p-4">
                <Button
                    type="button"
                    className="h-11"
                    onClick={() => setRodando((r) => !r)}
                >
                    {rodando ? 'Pausar' : 'Rolar'}
                </Button>
                <label className="flex items-center gap-2 text-sm">
                    Velocidade
                    <input
                        type="range"
                        min={1}
                        max={6}
                        value={velocidade}
                        onChange={(e) => setVelocidade(Number(e.target.value))}
                    />
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    className="ml-auto h-11 text-white hover:bg-[#2A2F38] hover:text-white"
                    onClick={aoFechar}
                    aria-label="Fechar o teleprompter"
                >
                    <X /> Fechar
                </Button>
            </div>
            <div
                ref={caixa}
                className="flex-1 overflow-y-auto px-6 py-[40vh] text-center text-4xl leading-snug font-semibold md:px-[15vw] md:text-5xl"
            >
                <p>{roteiro.gancho}</p>
                <p className="mt-10">{roteiro.desenvolvimento}</p>
                <p className="mt-10">
                    <ComPalavra
                        texto={roteiro.cta}
                        palavra={roteiro.palavra_chave}
                    />
                </p>
            </div>
        </div>
    );
}

export default function Gravacao({
    roteiro,
    takes,
    emEdicao,
    videoAtual,
    uploadMaxMb,
}: {
    roteiro: Roteiro;
    takes: Take[];
    emEdicao: boolean;
    videoAtual: string | null;
    uploadMaxMb: number;
}) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [teleprompter, setTeleprompter] = useState(false);
    const [envios, setEnvios] = useState<Envio[]>([]);
    const [arrastando, setArrastando] = useState(false);
    const escolhivel = takes.filter((t) =>
        ['enviado', 'falhou', 'descartado'].includes(t.status),
    );
    const [principal, setPrincipal] = useState<number | null>(null);
    // Sem escolha (ou a escolhida saiu da lista), o primeiro take disponível.
    const escolhido = escolhivel.some((t) => t.id === principal)
        ? principal
        : (escolhivel[0]?.id ?? null);
    const aprovado = roteiro.status === 'aprovado';

    // Um take por vez: cada envio é um pedido, com o seu progresso.
    function enviar(arquivos: File[]) {
        const fila = arquivos.filter((f) => /\.(mp4|mov)$/i.test(f.name));
        setEnvios(fila.map((f) => ({ nome: f.name, progresso: 0 })));
        const proximo = (i: number) => {
            if (i >= fila.length) {
                setEnvios([]);
                return;
            }
            router.post(
                rotaTakes.url(roteiro.id),
                { video: fila[i] },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onProgress: (p) =>
                        setEnvios((e) =>
                            e.map((x, j) =>
                                j === i
                                    ? { ...x, progresso: p?.percentage ?? 0 }
                                    : x,
                            ),
                        ),
                    onFinish: () => proximo(i + 1),
                },
            );
        };
        proximo(0);
    }

    return (
        <>
            <Head title={`Gravação · ${roteiro.titulo}`} />
            {teleprompter && (
                <Teleprompter
                    roteiro={roteiro}
                    aoFechar={() => setTeleprompter(false)}
                />
            )}
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <SessaoRoteiro
                    roteiro={roteiro}
                    atual="gravacao"
                    acoes={
                        emEdicao && videoAtual ? (
                            <Button asChild className="h-11">
                                <Link href={videoAtual}>
                                    Ver o take na produção
                                </Link>
                            </Button>
                        ) : (
                            <Form {...editar.form(roteiro.id)}>
                                {({ processing }) => (
                                    <>
                                        <input
                                            type="hidden"
                                            name="take_id"
                                            value={escolhido ?? ''}
                                        />
                                        <Button
                                            type="submit"
                                            className="h-11"
                                            disabled={
                                                processing ||
                                                escolhido === null ||
                                                emEdicao ||
                                                !aprovado
                                            }
                                        >
                                            {processing && <Spinner />}
                                            Enviar para edição
                                        </Button>
                                    </>
                                )}
                            </Form>
                        )
                    }
                />
                <InputError message={errors.take_id} />

                <div className="flex flex-wrap items-start gap-6">
                    <section
                        aria-labelledby="gravar"
                        data-tour="gravacao-roteiro"
                        className="flex flex-[1_1_380px] flex-col gap-4"
                    >
                        <div className="flex flex-col gap-3.5 rounded-xl bg-[#14171C] p-[22px] text-white">
                            <div className="flex items-center justify-between gap-3">
                                <h2
                                    id="gravar"
                                    className="text-base font-semibold"
                                >
                                    Roteiro para gravar
                                </h2>
                                <Button
                                    type="button"
                                    variant="outline"
                                    data-tour="gravacao-teleprompter"
                                    className="h-9 border-[#3A4150] bg-transparent text-white hover:bg-[#2A2F38] hover:text-white"
                                    onClick={() => setTeleprompter(true)}
                                >
                                    Abrir teleprompter
                                </Button>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-[#9AA3AF]">
                                    GANCHO · 0 a 3 s
                                </span>
                                <p className="text-lg leading-snug font-semibold">
                                    {roteiro.gancho}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-[#9AA3AF]">
                                    DESENVOLVIMENTO
                                </span>
                                <p className="text-[15px] leading-relaxed whitespace-pre-line text-[#E8EAEE]">
                                    {roteiro.desenvolvimento}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-[#9AA3AF]">
                                    CHAMADA PARA AÇÃO
                                </span>
                                <p className="text-[15px] leading-relaxed text-[#E8EAEE]">
                                    <ComPalavra
                                        texto={roteiro.cta}
                                        palavra={roteiro.palavra_chave}
                                    />
                                </p>
                            </div>
                        </div>
                        <fieldset className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
                            <legend className="sr-only">
                                Checklist de gravação
                            </legend>
                            <h2
                                className="text-base font-semibold"
                                aria-hidden="true"
                            >
                                Checklist de gravação
                            </h2>
                            {CHECKLIST.map((item) => (
                                <label
                                    key={item}
                                    className="flex items-center gap-2.5 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        className="size-5 accent-primary"
                                    />
                                    {item}
                                </label>
                            ))}
                        </fieldset>
                    </section>

                    <section
                        aria-labelledby="takes"
                        data-tour="gravacao-takes"
                        className="flex min-w-0 flex-[999_1_460px] flex-col gap-4"
                    >
                        {aprovado ? (
                            <label
                                htmlFor="arquivos"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setArrastando(true);
                                }}
                                onDragLeave={() => setArrastando(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setArrastando(false);
                                    if (envios.length === 0)
                                        enviar(
                                            Array.from(e.dataTransfer.files),
                                        );
                                }}
                                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-card px-4 py-8 text-center focus-within:ring-2 focus-within:ring-ring/50 ${arrastando ? 'border-primary' : 'border-[#B5BCC7]'}`}
                            >
                                <Upload
                                    className="size-7 text-primary"
                                    aria-hidden="true"
                                />
                                <span className="text-[15px] font-semibold">
                                    Arraste os takes gravados
                                </span>
                                <span className="text-[13px] text-muted-foreground">
                                    MP4 ou MOV, até {uploadMaxMb} MB cada · pode
                                    enviar vários takes do mesmo roteiro
                                </span>
                                <input
                                    id="arquivos"
                                    type="file"
                                    multiple
                                    accept="video/mp4,video/quicktime"
                                    disabled={envios.length > 0}
                                    className="sr-only"
                                    onChange={(e) => {
                                        enviar(
                                            Array.from(e.target.files ?? []),
                                        );
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        ) : (
                            <p
                                role="note"
                                className="rounded-xl border bg-card px-4 py-6 text-sm text-muted-foreground"
                            >
                                Aprove o roteiro na etapa 1 para enviar os
                                takes.
                            </p>
                        )}
                        <InputError message={errors.video} />

                        <div className="flex flex-col gap-1 rounded-xl border bg-card p-5">
                            <h2
                                id="takes"
                                className="mb-2 text-base font-semibold"
                            >
                                Takes enviados
                            </h2>
                            {takes.length === 0 && envios.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum take ainda.
                                </p>
                            )}
                            {takes.map((t) => {
                                const pode = [
                                    'enviado',
                                    'falhou',
                                    'descartado',
                                ].includes(t.status);
                                return (
                                    <div
                                        key={t.id}
                                        className="flex flex-wrap items-center gap-3.5 border-b border-muted py-3 last:border-b-0"
                                    >
                                        <div
                                            className="h-14 w-10 flex-none rounded-md bg-[#2B3038]"
                                            aria-hidden="true"
                                        />
                                        <div className="flex flex-[1_1_200px] flex-col gap-1">
                                            <span className="text-sm font-semibold break-all">
                                                {t.nome}
                                            </span>
                                            <span className="text-[13px] text-muted-foreground">
                                                {tamanho(t.tamanho_bytes)} ·{' '}
                                                {SITUACAO_TAKE[t.status]}
                                            </span>
                                        </div>
                                        {pode && !emEdicao && (
                                            <label className="flex items-center gap-2 text-[13px]">
                                                <input
                                                    type="radio"
                                                    name="principal"
                                                    checked={escolhido === t.id}
                                                    onChange={() =>
                                                        setPrincipal(t.id)
                                                    }
                                                    className="size-[18px] accent-primary"
                                                />
                                                Take principal
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                            {envios.map((e) => (
                                <div
                                    key={e.nome}
                                    className="flex flex-wrap items-center gap-3.5 py-3"
                                >
                                    <div
                                        className="h-14 w-10 flex-none rounded-md bg-[#2B3038]"
                                        aria-hidden="true"
                                    />
                                    <div className="flex flex-[1_1_200px] flex-col gap-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-semibold break-all">
                                                {e.nome}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {e.progresso}%
                                            </span>
                                        </div>
                                        <div
                                            role="progressbar"
                                            aria-valuenow={e.progresso}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`Envio de ${e.nome}`}
                                            className="h-1.5 overflow-hidden rounded-[3px] bg-border"
                                        >
                                            <div
                                                className="h-full bg-primary"
                                                style={{
                                                    width: `${e.progresso}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p
                            role="note"
                            className="flex items-start gap-2.5 rounded-[10px] bg-accent px-4 py-3.5 text-sm leading-normal text-accent-foreground"
                        >
                            <Info
                                className="mt-0.5 size-[18px] flex-none"
                                aria-hidden="true"
                            />
                            O take principal vai para a IA, que preenche o
                            formulário de edição partindo deste roteiro (etapa
                            3). Você revisa o formulário antes da edição
                            automática.
                        </p>
                    </section>
                </div>
            </div>
        </>
    );
}

Gravacao.layout = {
    breadcrumbs: [{ title: 'Roteiros', href: index() }],
};
