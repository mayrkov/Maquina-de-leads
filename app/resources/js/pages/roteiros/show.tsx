import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import EditarPersona, { type Persona } from '@/components/editar-persona';
import InputError from '@/components/input-error';
import SessaoRoteiro, {
    SELO_CONFORMIDADE,
    type CabecalhoRoteiro,
    type SituacaoConformidade,
} from '@/components/sessao-roteiro';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ignorar, juntar, salvar } from '@/routes/personas';
import {
    aprovar,
    checar,
    descartar,
    gravacao,
    index,
    refazer,
    update,
} from '@/routes/roteiros';

type Roteiro = CabecalhoRoteiro & {
    tema: string;
    gancho: string;
    desenvolvimento: string;
    cta: string;
    palavra_chave: string;
    objetivo: string;
    comentario_ajuste: string | null;
    duracao_estimada: number;
    impedimento: string | null;
};
type Regra = {
    id: string;
    descricao: string;
    resultado: 'ok' | 'atencao' | 'bloqueio';
    motivo: string | null;
};
type Fato = {
    afirmacao: string;
    veredito: 'confirmada' | 'sem_fonte' | 'incorreta';
    correcao: string | null;
    fontes: { uri: string; title: string | null }[];
};
type Conformidade = {
    situacao: SituacaoConformidade;
    regras: Regra[];
    fatos: Fato[];
    pesquisou: boolean;
    crm: string | null;
    rqe: string | null;
};
type Pedido = {
    status: 'pendente' | 'em_andamento' | 'concluida' | 'falhou';
    erro: string | null;
    tipo: string;
} | null;

const MARCA = {
    ok: { simbolo: '✓', classe: 'text-[#1F7A4D]' },
    atencao: { simbolo: '!', classe: 'text-[#A4520B]' },
    bloqueio: { simbolo: '✕', classe: 'text-[#8A1C1C]' },
    confirmada: { simbolo: '✓', classe: 'text-[#1F7A4D]' },
    sem_fonte: { simbolo: '?', classe: 'text-[#A4520B]' },
    incorreta: { simbolo: '✕', classe: 'text-[#8A1C1C]' },
} as const;

const campoTexto =
    'rounded-[10px] border border-input bg-card px-3.5 py-3 text-[15px] leading-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

function Texto({
    roteiro,
    bloqueado,
}: {
    roteiro: Roteiro;
    bloqueado: boolean;
}) {
    const { data, setData, put, processing, errors, isDirty } = useForm({
        gancho: roteiro.gancho,
        desenvolvimento: roteiro.desenvolvimento,
        cta: roteiro.cta,
    });

    return (
        <form
            className="flex flex-col gap-[18px] rounded-xl border bg-card p-[22px]"
            onSubmit={(e) => {
                e.preventDefault();
                put(update.url(roteiro.id), { preserveScroll: true });
            }}
        >
            <div className="flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                <span>
                    Duração estimada:{' '}
                    <strong className="text-foreground">
                        {roteiro.duracao_estimada} s
                    </strong>
                </span>
                <span>
                    Objetivo:{' '}
                    <strong className="text-foreground">
                        {roteiro.objetivo}
                    </strong>
                </span>
                <span>
                    Palavra-chave:{' '}
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">
                        {roteiro.palavra_chave}
                    </code>
                </span>
            </div>
            {(
                [
                    ['gancho', 'Gancho', ' · 0 a 3 s', 2],
                    ['desenvolvimento', 'Desenvolvimento', '', 8],
                    ['cta', 'Chamada para ação', '', 2],
                ] as const
            ).map(([campo, rotulo, dica, linhas]) => (
                <div key={campo} className="flex flex-col gap-1.5">
                    <Label htmlFor={campo} className="text-sm font-semibold">
                        {rotulo}{' '}
                        {dica && (
                            <span className="font-medium text-muted-foreground">
                                {dica}
                            </span>
                        )}
                    </Label>
                    <textarea
                        id={campo}
                        rows={linhas}
                        value={data[campo]}
                        disabled={bloqueado}
                        onChange={(e) => setData(campo, e.target.value)}
                        className={`${campoTexto} resize-y`}
                    />
                    <InputError message={errors[campo]} />
                </div>
            ))}
            {isDirty && (
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="submit"
                        disabled={processing || bloqueado}
                        className="h-11"
                    >
                        {processing && <Spinner />}
                        Salvar texto
                    </Button>
                    <span className="text-[13px] text-muted-foreground">
                        {roteiro.status === 'aprovado'
                            ? 'Salvar muda o texto aprovado: o roteiro volta para revisão.'
                            : 'Depois de salvar, confira a conformidade de novo.'}
                    </span>
                </div>
            )}
        </form>
    );
}

function CartaoConformidade({
    roteiroId,
    c,
    bloqueado,
}: {
    roteiroId: number;
    c: Conformidade;
    bloqueado: boolean;
}) {
    const selo = SELO_CONFORMIDADE[c.situacao];

    return (
        <section
            aria-labelledby="conf"
            className="flex flex-col gap-3 rounded-xl border bg-card p-[22px]"
        >
            <div className="flex items-center justify-between gap-3">
                <h2 id="conf" className="text-base font-semibold">
                    Conformidade
                </h2>
                <span
                    className={`rounded-full px-2.5 py-[3px] text-xs font-semibold ${selo.classe}`}
                >
                    {selo.rotulo}
                </span>
            </div>
            {(c.situacao === 'pendente' || c.situacao === 'desatualizada') && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                        {c.situacao === 'pendente'
                            ? 'O texto ainda não foi conferido.'
                            : 'O texto mudou depois da última checagem.'}
                    </span>
                    <Form
                        {...checar.form(roteiroId)}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing }) => (
                            <Button
                                type="submit"
                                variant="outline"
                                className="h-11"
                                disabled={processing || bloqueado}
                            >
                                Conferir de novo
                            </Button>
                        )}
                    </Form>
                </div>
            )}
            {c.regras.map((r) => (
                <div key={r.id} className="flex gap-2.5 text-sm">
                    <span
                        className={`font-bold ${MARCA[r.resultado].classe}`}
                        aria-hidden="true"
                    >
                        {MARCA[r.resultado].simbolo}
                    </span>
                    <span>
                        {r.descricao}
                        {r.motivo && (
                            <span className="block text-[13px] text-muted-foreground">
                                {r.motivo}
                            </span>
                        )}
                    </span>
                </div>
            ))}
            <div className="flex gap-2.5 text-sm">
                <span className="font-bold text-[#A4520B]" aria-hidden="true">
                    !
                </span>
                Atenção: incluir CRM{c.crm ? ` ${c.crm}` : ''} e RQE
                {c.rqe ? ` ${c.rqe}` : ''} na legenda do post
            </div>

            {c.fatos.length > 0 && (
                <div className="mt-2 flex flex-col gap-2.5 border-t pt-3">
                    <h3 className="text-sm font-semibold">Fatos de saúde</h3>
                    {!c.pesquisou && (
                        <p className="text-[13px] text-[#7A3D08]">
                            A IA não conseguiu pesquisar na web: confira os
                            fatos antes de aprovar.
                        </p>
                    )}
                    {c.fatos.map((f, i) => (
                        <div key={i} className="flex gap-2.5 text-sm">
                            <span
                                className={`font-bold ${MARCA[f.veredito].classe}`}
                                aria-label={
                                    f.veredito === 'confirmada'
                                        ? 'Confirmada'
                                        : f.veredito === 'incorreta'
                                          ? 'Incorreta'
                                          : 'Sem fonte'
                                }
                            >
                                {MARCA[f.veredito].simbolo}
                            </span>
                            <div className="flex flex-col gap-1">
                                <span>{f.afirmacao}</span>
                                {f.correcao && (
                                    <span className="text-[13px] text-[#8A1C1C]">
                                        Correção: {f.correcao}
                                    </span>
                                )}
                                {f.fontes.length > 0 && (
                                    <span className="flex flex-wrap gap-x-3 text-[13px]">
                                        {f.fontes.map((s) => (
                                            <a
                                                key={s.uri}
                                                href={s.uri}
                                                target="_blank"
                                                rel="noopener noreferrer nofollow"
                                                className="text-primary"
                                            >
                                                {s.title ||
                                                    new URL(s.uri).hostname}
                                            </a>
                                        ))}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/** Decisão da persona na aprovação do roteiro (RF49). */
function CartaoPersona({
    persona,
}: {
    persona: (Persona & { status: string }) | null;
}) {
    const [corrigindo, setCorrigindo] = useState(false);
    if (!persona) return null;
    const sugerida = persona.status === 'sugerida';

    return (
        <section
            aria-labelledby="persona"
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
        >
            <div className="flex items-center justify-between gap-2">
                <h2 id="persona" className="text-base font-semibold">
                    Persona do roteiro
                </h2>
                {sugerida && (
                    <span className="rounded-full bg-[#FCF1E4] px-2 py-[3px] text-xs font-semibold text-[#7A3D08]">
                        Sugerida
                    </span>
                )}
            </div>
            {corrigindo ? (
                <EditarPersona
                    persona={persona}
                    aoFechar={() => setCorrigindo(false)}
                    estreito
                />
            ) : (
                <>
                    <div className="text-[15px] font-semibold">
                        {persona.nome}
                    </div>
                    <div className="text-[13px] leading-normal text-[#3A414C]">
                        <strong>Quem decide:</strong> {persona.quem_decide}
                        <br />
                        <strong>Dor:</strong> {persona.dores}
                    </div>
                    {sugerida && persona.parecida_com && (
                        <p
                            role="note"
                            className="rounded-lg bg-[#FCF1E4] px-3 py-2.5 text-[13px] leading-snug text-[#7A3D08]"
                        >
                            Parecida com{' '}
                            <strong>{persona.parecida_com.nome}</strong>.
                        </p>
                    )}
                    {sugerida && (
                        <div className="grid grid-cols-2 gap-2">
                            {persona.parecida_com && (
                                <Form
                                    {...juntar.form(persona.id)}
                                    options={{ preserveScroll: true }}
                                    className="contents"
                                >
                                    <input
                                        type="hidden"
                                        name="com_id"
                                        value={persona.parecida_com.id}
                                    />
                                    <Button type="submit" className="h-11">
                                        Juntar
                                    </Button>
                                </Form>
                            )}
                            <Form
                                {...salvar.form(persona.id)}
                                options={{ preserveScroll: true }}
                                className="contents"
                            >
                                <Button
                                    type="submit"
                                    variant={
                                        persona.parecida_com
                                            ? 'outline'
                                            : 'default'
                                    }
                                    className="h-11"
                                >
                                    {persona.parecida_com
                                        ? 'Salvar nova'
                                        : 'Salvar'}
                                </Button>
                            </Form>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={() => setCorrigindo(true)}
                            >
                                Corrigir
                            </Button>
                            <Form
                                {...ignorar.form(persona.id)}
                                options={{ preserveScroll: true }}
                                className="contents"
                            >
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    className="h-11 text-muted-foreground"
                                >
                                    Ignorar
                                </Button>
                            </Form>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function PedirNovaVersao({
    roteiroId,
    aoFechar,
}: {
    roteiroId: number;
    aoFechar: () => void;
}) {
    return (
        <Form
            {...refazer.form(roteiroId)}
            options={{ preserveScroll: true }}
            onSuccess={aoFechar}
            className="flex flex-col gap-2 rounded-xl border bg-card p-5"
        >
            {({ processing, errors }) => (
                <>
                    <Label
                        htmlFor="comentario"
                        className="text-sm font-semibold"
                    >
                        O que mudar na nova versão?
                    </Label>
                    <textarea
                        id="comentario"
                        name="comentario"
                        rows={3}
                        required
                        maxLength={1000}
                        placeholder="Ex.: gancho mais direto, falar de quando procurar o médico"
                        className={campoTexto}
                    />
                    <InputError message={errors.comentario} />
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Pedir à IA
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-11"
                            onClick={aoFechar}
                        >
                            Cancelar
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}

export default function RoteiroShow({
    roteiro,
    persona,
    conformidade,
    pedido,
}: {
    roteiro: Roteiro;
    persona: (Persona & { status: string }) | null;
    conformidade: Conformidade;
    pedido: Pedido;
}) {
    const [pedindo, setPedindo] = useState(false);
    const aguardando =
        pedido?.status === 'pendente' || pedido?.status === 'em_andamento';
    const descartado = roteiro.status === 'descartado';

    useEffect(() => {
        if (!aguardando) return;
        const t = setInterval(() => router.reload(), 5000);
        return () => clearInterval(t);
    }, [aguardando]);

    return (
        <>
            <Head title={roteiro.titulo} />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <SessaoRoteiro
                    roteiro={roteiro}
                    atual="roteiro"
                    acoes={
                        !descartado && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11"
                                    disabled={aguardando}
                                    onClick={() => setPedindo(true)}
                                >
                                    Pedir nova versão
                                </Button>
                                {roteiro.status === 'aprovado' ? (
                                    <Button asChild className="h-11">
                                        <Link href={gravacao(roteiro.id)}>
                                            Ir para gravação
                                        </Link>
                                    </Button>
                                ) : (
                                    <Form
                                        {...aprovar.form(roteiro.id)}
                                        options={{ preserveScroll: true }}
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                className="h-11"
                                                disabled={
                                                    processing ||
                                                    roteiro.impedimento !== null
                                                }
                                                title={
                                                    roteiro.impedimento ??
                                                    undefined
                                                }
                                            >
                                                Aprovar roteiro
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </>
                        )
                    }
                />

                {aguardando && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
                    >
                        <Spinner />{' '}
                        {pedido?.tipo === 'checar_conformidade'
                            ? 'A IA está conferindo a conformidade…'
                            : 'A IA está escrevendo a nova versão…'}
                    </p>
                )}
                {pedido?.status === 'falhou' && (
                    <p
                        role="alert"
                        className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                    >
                        O último pedido à IA falhou
                        {pedido.erro ? `: ${pedido.erro}` : '.'}
                    </p>
                )}
                {descartado && (
                    <p
                        role="note"
                        className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground"
                    >
                        Roteiro descartado.
                    </p>
                )}
                {!descartado &&
                    roteiro.status === 'rascunho' &&
                    roteiro.impedimento &&
                    !aguardando && (
                        <p className="text-[13px] text-muted-foreground">
                            Para aprovar: {roteiro.impedimento}
                        </p>
                    )}
                {pedindo && (
                    <PedirNovaVersao
                        roteiroId={roteiro.id}
                        aoFechar={() => setPedindo(false)}
                    />
                )}

                <div className="flex flex-wrap items-start gap-6">
                    <section
                        aria-label="Roteiro"
                        className="flex min-w-0 flex-[999_1_520px] flex-col gap-4"
                    >
                        {roteiro.comentario_ajuste && (
                            <p className="rounded-lg bg-muted px-4 py-3 text-[13px] text-muted-foreground">
                                <strong>Último pedido de ajuste:</strong>{' '}
                                {roteiro.comentario_ajuste}
                            </p>
                        )}
                        {/* key: o formulário recomeça quando a IA traz um texto novo. */}
                        <Texto
                            key={`${roteiro.gancho}|${roteiro.desenvolvimento}|${roteiro.cta}`}
                            roteiro={roteiro}
                            bloqueado={aguardando || descartado}
                        />
                        <CartaoConformidade
                            roteiroId={roteiro.id}
                            c={conformidade}
                            bloqueado={aguardando || descartado}
                        />
                    </section>

                    <aside className="flex flex-[1_1_320px] flex-col gap-4">
                        <CartaoPersona persona={persona} />
                        <section
                            aria-labelledby="bruto"
                            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
                        >
                            <h2 id="bruto" className="text-base font-semibold">
                                Vídeo bruto
                            </h2>
                            <p className="text-[13px] leading-normal text-muted-foreground">
                                {roteiro.status === 'aprovado'
                                    ? 'Roteiro aprovado: grave e envie os takes na etapa 2.'
                                    : 'Os takes são enviados depois de aprovar o roteiro.'}
                            </p>
                            {roteiro.status === 'aprovado' && (
                                <Link
                                    href={gravacao(roteiro.id)}
                                    className="text-sm font-semibold text-primary"
                                >
                                    Gravação e upload →
                                </Link>
                            )}
                        </section>
                        {!descartado && (
                            <Form
                                {...descartar.form(roteiro.id)}
                                onBefore={() =>
                                    confirm('Descartar este roteiro?')
                                }
                            >
                                <Button
                                    type="submit"
                                    variant="ghost"
                                    className="h-11 w-full text-muted-foreground"
                                >
                                    Descartar roteiro
                                </Button>
                            </Form>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

RoteiroShow.layout = {
    breadcrumbs: [{ title: 'Roteiros', href: index() }],
};
