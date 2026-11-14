import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import SessaoRoteiro, {
    type CabecalhoRoteiro,
} from '@/components/sessao-roteiro';
import { tempo, type StatusVideo } from '@/components/status-video';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { index as indiceEdicao } from '@/routes/edicao';
import { edicao } from '@/routes/roteiros';
import { analisar, aprovacao, assistir, editar } from '@/routes/videos';
import { salvar } from '@/routes/videos/formulario';

type Trecho = { inicio: number; fim: number; texto: string };
type Campos = {
    tema: string | null;
    persona: string | null;
    gancho: string | null;
    cortes: number[] | null;
    destaques: string[] | null;
    cta: string | null;
    palavra_chave: string | null;
    legenda: string | null;
};
type Chave = keyof Campos;
type Sugestao = Campos & { gancho_inicio: number | null; do_roteiro: Chave[] };
type Video = {
    id: number;
    nome: string;
    titulo: string;
    status: StatusVideo;
    erro: string | null;
    comentario_ajuste: string | null;
    ajuste_por: 'producao' | 'medico' | null;
    editavel: boolean;
    tentativa: number | null;
};

// Ordem e rótulos do canva (tela 09).
const CAMPOS: {
    chave: Chave;
    rotulo: string;
    tipo: 'linha' | 'texto' | 'cortes' | 'destaques';
}[] = [
    { chave: 'tema', rotulo: 'Tema', tipo: 'linha' },
    { chave: 'persona', rotulo: 'Persona', tipo: 'linha' },
    { chave: 'gancho', rotulo: 'Gancho', tipo: 'texto' },
    { chave: 'cortes', rotulo: 'Cortes', tipo: 'cortes' },
    { chave: 'destaques', rotulo: 'Destaques na legenda', tipo: 'destaques' },
    { chave: 'cta', rotulo: 'Chamada para ação', tipo: 'texto' },
    { chave: 'palavra_chave', rotulo: 'Palavra-chave', tipo: 'linha' },
    { chave: 'legenda', rotulo: 'Legenda do post', tipo: 'texto' },
];

const igual = (a: unknown, b: unknown) =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const campoTexto =
    'w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-[15px] leading-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

function valorLegivel(
    chave: Chave,
    valor: Campos[Chave],
    trechos: Trecho[],
    sugestao: Sugestao | null,
): string {
    if (
        valor === null ||
        (Array.isArray(valor) && valor.length === 0 && chave === 'destaques')
    ) {
        return chave === 'cortes'
            ? 'Removido: só pausas, gaguejos e repetições são cortados.'
            : 'Removido';
    }
    if (chave === 'cortes') {
        const cortes = valor as number[];
        return cortes.length === 0
            ? 'Nenhum trecho cortado além de pausas, gaguejos e repetições.'
            : `Remover ${cortes.length} trecho(s): ${cortes.map((i) => (trechos[i] ? tempo(trechos[i].inicio) : `#${i}`)).join(', ')}`;
    }
    if (chave === 'destaques') return (valor as string[]).join(' · ');
    if (
        chave === 'gancho' &&
        sugestao?.gancho_inicio !== null &&
        sugestao?.gancho_inicio !== undefined &&
        valor === sugestao.gancho
    ) {
        return `“${valor}” (${tempo(sugestao.gancho_inicio)})`;
    }
    return String(valor);
}

type Props = {
    video: Video;
    roteiro: CabecalhoRoteiro | null;
    trechos: Trecho[];
    sugestao: Sugestao | null;
    formulario: Campos | null;
    obrigatorios: Chave[];
};

// O formulário guarda o estado local: remonta quando o vídeo muda de etapa (ex.: a análise terminou).
export default function Formulario(props: Props) {
    return (
        <Conteudo
            key={`${props.video.status}-${props.formulario ? 1 : 0}`}
            {...props}
        />
    );
}

Formulario.layout = {
    breadcrumbs: [{ title: 'Edição', href: indiceEdicao() }],
};

function Conteudo({
    video,
    roteiro,
    trechos,
    sugestao,
    formulario,
    obrigatorios,
}: Props) {
    const form = useForm<Campos>(
        formulario ?? {
            tema: null,
            persona: null,
            gancho: null,
            cortes: null,
            destaques: null,
            cta: null,
            palavra_chave: null,
            legenda: null,
        },
    );
    const [alterando, setAlterando] = useState<Chave | null>(null);
    const player = useRef<HTMLVideoElement>(null);
    const esperando =
        video.status === 'analisando' || video.status === 'aguardando_edicao';
    const editavel = video.editavel;

    useEffect(() => {
        if (!esperando) return;
        const t = setInterval(() => router.reload(), 5000);
        return () => clearInterval(t);
    }, [esperando]);

    const cortados = new Set(form.data.cortes ?? []);
    const alternarCorte = (i: number) => {
        const atual = form.data.cortes ?? [];
        form.setData(
            'cortes',
            cortados.has(i)
                ? atual.filter((x) => x !== i)
                : [...atual, i].sort((a, b) => a - b),
        );
    };
    const ir = (s: number) => {
        if (player.current) {
            player.current.currentTime = s;
            void player.current.play().catch(() => undefined);
        }
    };
    const duracao = trechos.at(-1)?.fim ?? null;

    const acoes = editavel && (
        <>
            <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={form.processing}
                onClick={() =>
                    form.put(salvar.url(video.id), { preserveScroll: true })
                }
            >
                Salvar rascunho
            </Button>
            <Button
                type="button"
                className="h-11"
                disabled={form.processing}
                onClick={() =>
                    form.post(editar.url(video.id), { preserveScroll: true })
                }
            >
                {form.processing ? <Spinner /> : <Sparkles />}
                Gerar edição automática
            </Button>
        </>
    );

    return (
        <>
            <Head title={`Formulário de edição · ${video.titulo}`} />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                {roteiro ? (
                    <SessaoRoteiro
                        roteiro={roteiro}
                        atual="formulario"
                        acoes={acoes}
                    />
                ) : (
                    <CabecalhoPagina
                        sobretitulo="Origem: upload avulso · a IA deduziu os campos do próprio vídeo"
                        titulo={`Formulário de edição: ${video.titulo}`}
                    >
                        {acoes}
                    </CabecalhoPagina>
                )}

                {video.comentario_ajuste && (
                    <p
                        role="note"
                        className="rounded-lg border border-[#F2C894] bg-[#FCF1E4] px-4 py-3 text-sm text-[#7A3D08]"
                    >
                        <strong>
                            Ajuste pedido{' '}
                            {video.ajuste_por === 'medico'
                                ? 'pelo médico'
                                : 'pela produção'}
                            :
                        </strong>{' '}
                        {video.comentario_ajuste}
                    </p>
                )}
                {video.status === 'analisando' && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
                    >
                        <Spinner /> A IA está transcrevendo o vídeo e
                        preenchendo o formulário
                        {video.tentativa && video.tentativa > 1
                            ? ` (tentativa ${video.tentativa})`
                            : ''}
                        …
                    </p>
                )}
                {video.status === 'falhou' && (
                    <div
                        role="alert"
                        className="flex flex-wrap items-center gap-3 rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                    >
                        <span>
                            {formulario
                                ? 'A edição falhou'
                                : 'A análise falhou'}
                            : {video.erro ?? 'erro desconhecido'}.
                            {formulario &&
                                ' Confira o formulário e gere a edição de novo.'}
                        </span>
                        {!formulario && (
                            <Form
                                {...analisar.form(video.id)}
                                options={{ preserveScroll: true }}
                            >
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        size="sm"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        Analisar de novo
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                )}
                {!editavel && formulario && video.status !== 'falhou' && (
                    <p
                        role="status"
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
                    >
                        {video.status === 'aguardando_edicao' ? (
                            <>
                                <Spinner /> Editando com este formulário.{' '}
                                {roteiro && (
                                    <Link
                                        href={edicao(roteiro.id)}
                                        className="font-semibold underline"
                                    >
                                        Acompanhar a edição
                                    </Link>
                                )}
                            </>
                        ) : video.status === 'descartado' ? (
                            'Vídeo descartado. Este é o formulário que foi usado.'
                        ) : (
                            <>
                                Formulário usado na edição.{' '}
                                <Link
                                    href={aprovacao(video.id)}
                                    className="font-semibold underline"
                                >
                                    Ir para a aprovação
                                </Link>
                            </>
                        )}
                    </p>
                )}

                <div className="flex flex-wrap items-start gap-6">
                    <section
                        aria-label="Vídeo bruto e cortes"
                        className="flex flex-[1_1_340px] flex-col gap-3.5"
                    >
                        <div className="relative w-full max-w-[340px]">
                            <video
                                ref={player}
                                src={assistir.url({
                                    video: video.id,
                                    tipo: 'bruto',
                                })}
                                controls
                                playsInline
                                preload="metadata"
                                className="aspect-[9/16] w-full rounded-2xl bg-[#2B3038] object-contain"
                                aria-label={`Vídeo bruto: ${video.nome}`}
                            />
                            {duracao !== null && (
                                <span className="pointer-events-none absolute top-3.5 left-3.5 rounded bg-black/40 px-1.5 text-xs text-[#C4C9D2]">
                                    Bruto · {tempo(duracao)}
                                </span>
                            )}
                        </div>
                        {trechos.length > 0 && (
                            <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-4">
                                <h2 className="text-sm font-semibold">
                                    Trechos (transcrição)
                                </h2>
                                <div
                                    className="flex h-3.5 overflow-hidden rounded"
                                    aria-hidden="true"
                                >
                                    {trechos.map((t, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                flex: Math.max(
                                                    t.fim - t.inicio,
                                                    0.1,
                                                ),
                                            }}
                                            className={
                                                cortados.has(i)
                                                    ? 'bg-[#C8CDD5]'
                                                    : 'bg-primary'
                                            }
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-3.5 text-xs text-muted-foreground">
                                    <span>
                                        <span className="inline-block size-2.5 rounded-sm bg-primary align-[-1px]" />{' '}
                                        manter
                                    </span>
                                    <span>
                                        <span className="inline-block size-2.5 rounded-sm bg-[#C8CDD5] align-[-1px]" />{' '}
                                        cortar
                                    </span>
                                </div>
                                {alterando === 'cortes' && (
                                    <p className="text-[13px] text-primary">
                                        Clique num trecho para manter ou cortar.
                                    </p>
                                )}
                                <ol className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto text-[13px] leading-snug">
                                    {trechos.map((t, i) => (
                                        <li key={i} className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => ir(t.inicio)}
                                                className="flex-none font-mono text-primary hover:underline"
                                                aria-label={`Tocar a partir de ${tempo(t.inicio)}`}
                                            >
                                                {tempo(t.inicio)}
                                            </button>
                                            {alterando === 'cortes' ? (
                                                <button
                                                    type="button"
                                                    aria-pressed={
                                                        !cortados.has(i)
                                                    }
                                                    onClick={() =>
                                                        alternarCorte(i)
                                                    }
                                                    className={`text-left ${cortados.has(i) ? 'text-muted-foreground line-through' : ''} rounded px-1 hover:bg-muted`}
                                                >
                                                    “{t.texto}”
                                                    <span className="sr-only">
                                                        {cortados.has(i)
                                                            ? ' (cortar)'
                                                            : ' (manter)'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span
                                                    className={
                                                        cortados.has(i)
                                                            ? 'text-muted-foreground line-through'
                                                            : ''
                                                    }
                                                >
                                                    “{t.texto}”
                                                    <span className="sr-only">
                                                        {cortados.has(i)
                                                            ? ' (cortado)'
                                                            : ''}
                                                    </span>
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                                <InputError message={form.errors.cortes} />
                            </div>
                        )}
                    </section>

                    {formulario && (
                        <section
                            aria-label="Sugestões da IA"
                            className="flex min-w-0 flex-[999_1_520px] flex-col gap-3"
                        >
                            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                                <Sparkles
                                    className="size-4 text-primary"
                                    aria-hidden="true"
                                />
                                {editavel
                                    ? 'Cada campo foi sugerido pela IA. Mantenha, altere ou remova.'
                                    : 'Campos usados na edição.'}
                            </div>
                            {CAMPOS.map(({ chave, rotulo, tipo }) => {
                                const valor = form.data[chave];
                                const sugerido = sugestao?.[chave] ?? null;
                                const decisao = igual(valor, sugerido)
                                    ? 'manter'
                                    : valor === null
                                      ? 'remover'
                                      : 'alterar';
                                const obrigatorio =
                                    obrigatorios.includes(chave);
                                const erro =
                                    form.errors[chave] ??
                                    (chave === 'destaques'
                                        ? (
                                              form.errors as Record<
                                                  string,
                                                  string
                                              >
                                          )['destaques.0']
                                        : undefined);
                                return (
                                    <div
                                        key={chave}
                                        className="flex flex-wrap items-start gap-3 rounded-xl border bg-card px-[18px] py-4"
                                    >
                                        <div className="flex min-w-0 flex-[999_1_300px] flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    id={`rotulo-${chave}`}
                                                    className="text-[13px] font-semibold text-muted-foreground"
                                                >
                                                    {rotulo}
                                                </span>
                                                {sugestao?.do_roteiro.includes(
                                                    chave,
                                                ) && (
                                                    <span className="rounded-full bg-[#EEF0F3] px-2 py-0.5 text-[11px] font-semibold text-[#3A414C]">
                                                        do roteiro
                                                    </span>
                                                )}
                                                {decisao === 'alterar' && (
                                                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                                                        alterado
                                                    </span>
                                                )}
                                            </div>
                                            {alterando === chave &&
                                            tipo !== 'cortes' ? (
                                                tipo === 'texto' ? (
                                                    <textarea
                                                        aria-labelledby={`rotulo-${chave}`}
                                                        rows={
                                                            chave === 'legenda'
                                                                ? 6
                                                                : 3
                                                        }
                                                        value={
                                                            (valor as
                                                                | string
                                                                | null) ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            form.setData(
                                                                chave,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className={`${campoTexto} resize-y`}
                                                    />
                                                ) : (
                                                    <input
                                                        aria-labelledby={`rotulo-${chave}`}
                                                        value={
                                                            tipo === 'destaques'
                                                                ? (
                                                                      (valor as
                                                                          | string[]
                                                                          | null) ??
                                                                      []
                                                                  ).join(' ')
                                                                : ((valor as
                                                                      | string
                                                                      | null) ??
                                                                  '')
                                                        }
                                                        onChange={(e) =>
                                                            form.setData(
                                                                chave,
                                                                tipo ===
                                                                    'destaques'
                                                                    ? e.target.value
                                                                          .split(
                                                                              /[\s,·]+/,
                                                                          )
                                                                          .filter(
                                                                              Boolean,
                                                                          )
                                                                    : chave ===
                                                                        'palavra_chave'
                                                                      ? e.target.value.toUpperCase()
                                                                      : e.target
                                                                            .value,
                                                            )
                                                        }
                                                        placeholder={
                                                            tipo === 'destaques'
                                                                ? 'palavras separadas por espaço'
                                                                : undefined
                                                        }
                                                        className={`${campoTexto} min-h-11`}
                                                    />
                                                )
                                            ) : (
                                                <div
                                                    className={`text-[15px] leading-normal whitespace-pre-line ${valor === null ? 'text-muted-foreground italic' : ''}`}
                                                >
                                                    {valorLegivel(
                                                        chave,
                                                        valor,
                                                        trechos,
                                                        sugestao,
                                                    )}
                                                </div>
                                            )}
                                            <InputError message={erro} />
                                        </div>
                                        {editavel && (
                                            <div
                                                role="group"
                                                aria-label={`Decisão: ${rotulo}`}
                                                className="flex flex-[1_1_240px] justify-end gap-1.5"
                                            >
                                                <button
                                                    type="button"
                                                    aria-pressed={
                                                        decisao === 'manter' &&
                                                        alterando !== chave
                                                    }
                                                    onClick={() => {
                                                        form.setData(
                                                            chave,
                                                            sugerido,
                                                        );
                                                        setAlterando(null);
                                                    }}
                                                    className="min-h-9 rounded-lg border border-input bg-card px-3 text-[13px] font-semibold aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-[#1A3DA3]"
                                                >
                                                    Manter
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-pressed={
                                                        alterando === chave ||
                                                        decisao === 'alterar'
                                                    }
                                                    onClick={() => {
                                                        if (valor === null)
                                                            form.setData(
                                                                chave,
                                                                sugerido ??
                                                                    (tipo ===
                                                                        'cortes' ||
                                                                    tipo ===
                                                                        'destaques'
                                                                        ? []
                                                                        : ''),
                                                            );
                                                        setAlterando(
                                                            alterando === chave
                                                                ? null
                                                                : chave,
                                                        );
                                                    }}
                                                    className="min-h-9 rounded-lg border border-input bg-card px-3 text-[13px] font-semibold aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-[#1A3DA3]"
                                                >
                                                    {alterando === chave
                                                        ? 'Pronto'
                                                        : 'Alterar'}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-pressed={
                                                        decisao === 'remover'
                                                    }
                                                    disabled={obrigatorio}
                                                    title={
                                                        obrigatorio
                                                            ? 'Campo obrigatório: sem ele não há tela final ou post'
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        form.setData(
                                                            chave,
                                                            null,
                                                        );
                                                        setAlterando(null);
                                                    }}
                                                    className="min-h-9 rounded-lg border border-input bg-card px-3 text-[13px] font-semibold text-[#B42318] disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-[#B42318] aria-pressed:bg-[#FDECEC]"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
