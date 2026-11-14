import { Form, Head, Link, router } from '@inertiajs/react';
import { Info, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import { Button } from '@/components/ui/button';
import {
    SELO_CONFORMIDADE,
    type SituacaoConformidade,
} from '@/components/sessao-roteiro';
import { Spinner } from '@/components/ui/spinner';
import { edit as briefing } from '@/routes/briefing';
import { gerar, index, show } from '@/routes/roteiros';

type Linha = {
    id: number;
    titulo: string;
    gancho: string;
    palavra_chave: string;
    status: 'rascunho' | 'aprovado' | 'descartado';
    persona: string | null;
    persona_sugerida: boolean;
    conformidade: SituacaoConformidade;
    etapa: string;
};
type Pedido = {
    status: 'pendente' | 'em_andamento' | 'concluida' | 'falhou';
    erro: string | null;
} | null;

export default function Roteiros({
    semanas,
    semana,
    roteiros,
    pedido,
    proximaSemana,
    briefingCompleto,
}: {
    semanas: { valor: string; rotulo: string }[];
    semana: string;
    roteiros: Linha[];
    pedido: Pedido;
    proximaSemana: string;
    briefingCompleto: boolean;
}) {
    const aguardando =
        pedido?.status === 'pendente' || pedido?.status === 'em_andamento';

    // Enquanto a IA escreve, atualiza a tela a cada 5 s.
    useEffect(() => {
        if (!aguardando) return;
        const t = setInterval(
            () =>
                router.reload({
                    only: ['semanas', 'roteiros', 'pedido', 'proximaSemana'],
                }),
            5000,
        );
        return () => clearInterval(t);
    }, [aguardando]);

    return (
        <>
            <Head title="Roteiros da semana" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="5 roteiros por semana · filtro de conformidade do conselho aplicado"
                    titulo="Roteiros da semana"
                >
                    <div
                        data-tour="roteiros-acoes"
                        className="flex flex-wrap items-center gap-3"
                    >
                        {semanas.length > 0 && (
                            <>
                                <label
                                    htmlFor="semana"
                                    className="text-sm text-muted-foreground"
                                >
                                    Semana
                                </label>
                                <select
                                    id="semana"
                                    value={semana}
                                    onChange={(e) =>
                                        router.get(
                                            index.url({
                                                query: {
                                                    semana: e.target.value,
                                                },
                                            }),
                                        )
                                    }
                                    className="h-11 rounded-[10px] border border-input bg-card px-3 text-sm"
                                >
                                    {semanas.map((s) => (
                                        <option key={s.valor} value={s.valor}>
                                            {s.rotulo}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                        {briefingCompleto ? (
                            <Form {...gerar.form()}>
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        className="h-11"
                                        disabled={processing || aguardando}
                                        title={`Gera os roteiros de ${proximaSemana}`}
                                    >
                                        {processing || aguardando ? (
                                            <Spinner />
                                        ) : (
                                            <Sparkles />
                                        )}
                                        Gerar próxima semana
                                    </Button>
                                )}
                            </Form>
                        ) : (
                            <Button asChild variant="outline" className="h-11">
                                <Link href={briefing()}>
                                    Completar o briefing
                                </Link>
                            </Button>
                        )}
                    </div>
                </CabecalhoPagina>

                <p
                    role="note"
                    className="flex items-start gap-2.5 rounded-[10px] bg-accent px-4 py-3.5 text-sm leading-normal text-accent-foreground"
                >
                    <Info
                        className="mt-0.5 size-[18px] flex-none"
                        aria-hidden="true"
                    />
                    Os temas vêm de pesquisa assistida na web e do briefing, sem
                    repetir os recentes. Abra um roteiro para revisar o texto,
                    decidir a persona e enviar o vídeo bruto.
                </p>

                {aguardando && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm"
                    >
                        <Spinner /> A IA está pesquisando os temas e escrevendo
                        os roteiros de {proximaSemana}…
                    </p>
                )}
                {pedido?.status === 'falhou' && (
                    <p
                        role="alert"
                        className="rounded-lg bg-[#FDECEC] px-4 py-3 text-sm text-[#8A1C1C]"
                    >
                        A geração falhou{pedido.erro ? `: ${pedido.erro}` : '.'}{' '}
                        Tente gerar de novo.
                    </p>
                )}

                {roteiros.length === 0 ? (
                    !aguardando && (
                        <p
                            data-tour="roteiros-conteudo"
                            className="text-sm text-muted-foreground"
                        >
                            Nenhum roteiro ainda. Use “Gerar próxima semana”
                            para a IA escrever os roteiros de {proximaSemana}.
                        </p>
                    )
                ) : (
                    <div
                        data-tour="roteiros-conteudo"
                        className="overflow-x-auto rounded-xl border bg-card"
                    >
                        <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead>
                                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Tema e gancho
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Persona
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Palavra-chave
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Conformidade
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Etapa
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        <span className="sr-only">Ação</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {roteiros.map((r) => (
                                    <tr
                                        key={r.id}
                                        className={
                                            r.status === 'descartado'
                                                ? 'opacity-60'
                                                : ''
                                        }
                                    >
                                        <td className="max-w-[360px] border-b border-muted px-[18px] py-4">
                                            <div className="leading-snug font-semibold">
                                                {r.titulo}
                                            </div>
                                            <div className="mt-1 text-[13px] text-muted-foreground">
                                                “{r.gancho}”
                                            </div>
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            <div>{r.persona ?? '—'}</div>
                                            {r.persona_sugerida && (
                                                <span className="mt-1 inline-block rounded-full bg-[#FCF1E4] px-2 py-0.5 text-xs font-semibold text-[#7A3D08]">
                                                    Persona sugerida
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            <code className="rounded-md bg-muted px-2 py-[3px] font-mono text-[13px] font-semibold">
                                                {r.palavra_chave}
                                            </code>
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            <span
                                                className={`rounded-full px-2 py-[3px] text-xs font-semibold ${SELO_CONFORMIDADE[r.conformidade].classe}`}
                                            >
                                                {
                                                    SELO_CONFORMIDADE[
                                                        r.conformidade
                                                    ].rotulo
                                                }
                                            </span>
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4 text-[#3A414C]">
                                            {r.etapa}
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4 text-right">
                                            <Link
                                                href={show(r.id)}
                                                className="font-semibold text-primary hover:text-[#1A3DA3]"
                                                aria-label={`Abrir o roteiro ${r.titulo}`}
                                            >
                                                Abrir
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

Roteiros.layout = {
    breadcrumbs: [{ title: 'Roteiros', href: index() }],
};
