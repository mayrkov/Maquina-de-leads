import { Form, Head, Link, router } from '@inertiajs/react';
import { Pencil, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import EditarPersona, {
    CAMPOS,
    type Persona,
} from '@/components/editar-persona';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { edit as briefing } from '@/routes/briefing';
import { ignorar, index, juntar, salvar, sugerir } from '@/routes/personas';

type Pedido = {
    status: 'pendente' | 'em_andamento' | 'concluida' | 'falhou';
    erro: string | null;
} | null;

function Sugestao({ persona }: { persona: Persona }) {
    const [corrigindo, setCorrigindo] = useState(false);

    return (
        <section
            aria-label={`Sugestão: ${persona.nome}`}
            className="flex flex-col gap-3.5 rounded-xl border border-[#C9D6F7] bg-card p-5"
        >
            <div className="flex items-center gap-2">
                <Sparkles
                    className="size-[18px] text-primary"
                    aria-hidden="true"
                />
                <h3 className="text-base font-semibold">{persona.nome}</h3>
            </div>
            {corrigindo ? (
                <EditarPersona
                    persona={persona}
                    aoFechar={() => setCorrigindo(false)}
                />
            ) : (
                <div className="flex flex-wrap items-start gap-5">
                    <dl className="grid flex-[999_1_420px] grid-cols-1 gap-x-6 gap-y-3 text-sm leading-normal sm:grid-cols-2">
                        {CAMPOS.map(([campo, rotulo]) => (
                            <div key={campo}>
                                <dt className="text-xs font-semibold text-muted-foreground">
                                    {rotulo}
                                </dt>
                                <dd>{persona[campo] as string}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="flex flex-[1_1_260px] flex-col gap-2.5">
                        {persona.parecida_com && (
                            <p
                                role="note"
                                className="rounded-lg bg-[#FCF1E4] px-3 py-2.5 text-[13px] leading-snug text-[#7A3D08]"
                            >
                                Parecida com{' '}
                                <strong>{persona.parecida_com.nome}</strong>.
                                Juntar evita dividir leads entre personas
                                iguais.
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {persona.parecida_com && (
                                <Form
                                    {...juntar.form(persona.id)}
                                    options={{ preserveScroll: true }}
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
                    </div>
                </div>
            )}
        </section>
    );
}

function CartaoCatalogo({ persona }: { persona: Persona }) {
    const [editando, setEditando] = useState(false);

    return (
        <article className="flex flex-col gap-3 rounded-xl border bg-card p-[18px]">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] leading-snug font-semibold">
                    {persona.nome}
                </h3>
                {!editando && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Editar a persona ${persona.nome}`}
                        onClick={() => setEditando(true)}
                    >
                        <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                )}
            </div>
            {editando ? (
                <EditarPersona
                    persona={persona}
                    aoFechar={() => setEditando(false)}
                />
            ) : (
                <>
                    <p className="text-[13px] leading-normal">
                        {persona.descricao}
                    </p>
                    <p className="text-[13px] leading-normal">
                        <span className="font-semibold text-muted-foreground">
                            Dor:{' '}
                        </span>
                        {persona.dores}
                    </p>
                    <p className="text-[13px] leading-normal">
                        <span className="font-semibold text-muted-foreground">
                            Decide:{' '}
                        </span>
                        {persona.quem_decide}
                    </p>
                    {/* Leads por persona chegam com essa feature (RF42). */}
                    <div className="flex gap-4 border-t pt-2.5 text-xs text-muted-foreground">
                        <span>Roteiros: {persona.roteiros ?? 0}</span>
                        <span>Leads: —</span>
                    </div>
                </>
            )}
        </article>
    );
}

export default function Personas({
    sugestoes,
    catalogo,
    pedido,
    briefingCompleto,
}: {
    sugestoes: Persona[];
    catalogo: Persona[];
    pedido: Pedido;
    briefingCompleto: boolean;
}) {
    const [busca, setBusca] = useState('');
    const aguardando =
        pedido?.status === 'pendente' || pedido?.status === 'em_andamento';

    // Enquanto a IA trabalha, atualiza a tela a cada 5 s.
    useEffect(() => {
        if (!aguardando) return;
        const t = setInterval(
            () => router.reload({ only: ['sugestoes', 'catalogo', 'pedido'] }),
            5000,
        );
        return () => clearInterval(t);
    }, [aguardando]);

    const termo = busca.trim().toLowerCase();
    const filtrado = termo
        ? catalogo.filter((p) =>
              `${p.nome} ${p.descricao} ${p.dores}`
                  .toLowerCase()
                  .includes(termo),
          )
        : catalogo;

    return (
        <>
            <Head title="Personas" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="Definidas pela IA, confirmadas pela produção"
                    titulo="Personas"
                >
                    {briefingCompleto ? (
                        <Form
                            {...sugerir.form()}
                            options={{ preserveScroll: true }}
                        >
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="outline"
                                    className="h-11"
                                    disabled={processing || aguardando}
                                >
                                    {processing || aguardando ? (
                                        <Spinner />
                                    ) : (
                                        <Sparkles />
                                    )}
                                    Pedir sugestões à IA
                                </Button>
                            )}
                        </Form>
                    ) : (
                        <Button asChild variant="outline" className="h-11">
                            <Link href={briefing()}>Completar o briefing</Link>
                        </Button>
                    )}
                </CabecalhoPagina>

                {aguardando && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
                    >
                        <Spinner /> A IA está definindo as personas a partir do
                        briefing…
                    </p>
                )}
                {pedido?.status === 'falhou' && (
                    <p
                        role="alert"
                        className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                    >
                        A sugestão falhou
                        {pedido.erro ? `: ${pedido.erro}` : '.'} Tente pedir de
                        novo.
                    </p>
                )}

                {sugestoes.length > 0 && (
                    <section
                        aria-labelledby="sug"
                        data-tour="personas-sugestoes"
                        className="flex flex-col gap-3.5"
                    >
                        <h2 id="sug" className="text-lg font-semibold">
                            Sugestões da IA aguardando decisão{' '}
                            <span className="font-medium text-muted-foreground">
                                · {sugestoes.length}
                            </span>
                        </h2>
                        {sugestoes.map((p) => (
                            <Sugestao key={p.id} persona={p} />
                        ))}
                    </section>
                )}

                <section
                    aria-labelledby="cat"
                    data-tour="personas-catalogo"
                    className="flex flex-col gap-3.5"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="cat" className="text-lg font-semibold">
                            Catálogo do cliente{' '}
                            <span className="font-medium text-muted-foreground">
                                · {catalogo.length} salvas
                            </span>
                        </h2>
                        <label className="flex h-11 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground">
                            <Search className="size-4" aria-hidden="true" />
                            <input
                                aria-label="Buscar persona"
                                placeholder="Buscar persona"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-44 border-0 bg-transparent text-foreground outline-none"
                            />
                        </label>
                    </div>
                    {catalogo.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nenhuma persona salva ainda. Salve as sugestões da
                            IA para montar o catálogo.
                        </p>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                            {filtrado.map((p) => (
                                <CartaoCatalogo key={p.id} persona={p} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

Personas.layout = {
    breadcrumbs: [{ title: 'Personas', href: index() }],
};
