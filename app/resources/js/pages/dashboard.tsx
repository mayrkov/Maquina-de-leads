import { Head, Link } from '@inertiajs/react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { edit as briefing } from '@/routes/briefing';
import { edit as kit } from '@/routes/kit';
import { index as leads } from '@/routes/leads';
import { index as personas } from '@/routes/personas';
import { index as videos } from '@/routes/videos';

type Cartao = { id: number; titulo: string; tag: string; link: string };
type Props = {
    semana: string;
    resumo: {
        roteiros: number;
        roteirosAprovados: number;
        editando: number;
        aguardandoAprovacao: number;
        leadsNovos: number;
    };
    colunas: { titulo: string; cartoes: Cartao[] }[];
    pendencias: { texto: string; link: string; acao: string }[];
    configuracao: {
        briefingCompleto: boolean;
        personasSalvas: number;
        personasSugeridas: number;
        kitConfigurado: boolean;
    };
};

function Indicador({
    rotulo,
    valor,
    detalhe,
}: {
    rotulo: string;
    valor: string;
    detalhe?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-[18px]">
            <span className="text-[13px] text-muted-foreground">{rotulo}</span>
            <span className="text-[28px] font-bold">{valor}</span>
            {detalhe && (
                <span className="text-xs text-muted-foreground">{detalhe}</span>
            )}
        </div>
    );
}

function Situacao({ ok, texto }: { ok: boolean; texto: string }) {
    return (
        <span
            className={
                ok
                    ? 'font-semibold text-[#1F7A4D]'
                    : 'font-semibold text-[#7A3D08]'
            }
        >
            {texto}
        </span>
    );
}

export default function Dashboard({
    semana,
    resumo,
    colunas,
    pendencias,
    configuracao,
}: Props) {
    return (
        <>
            <Head title="Painel da semana" />
            <div className="flex flex-1 flex-col gap-7 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina sobretitulo={semana} titulo="Painel da semana">
                    <Button asChild variant="outline" className="h-11">
                        <Link href={videos()}>Upload avulso</Link>
                    </Button>
                </CabecalhoPagina>

                <section
                    aria-label="Resumo"
                    className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                >
                    <Indicador
                        rotulo="Roteiros da semana"
                        valor={String(resumo.roteiros)}
                        detalhe={`${resumo.roteirosAprovados} aprovado(s)`}
                    />
                    <Indicador
                        rotulo="Editando"
                        valor={String(resumo.editando)}
                    />
                    <Indicador
                        rotulo="Aguardando aprovação"
                        valor={String(resumo.aguardandoAprovacao)}
                    />
                    <Link
                        href={leads({ query: { status: 'qualificado' } })}
                        className="contents"
                    >
                        <Indicador
                            rotulo="Leads novos (manual)"
                            valor={String(resumo.leadsNovos)}
                            detalhe="Qualificados, ainda não entregues"
                        />
                    </Link>
                </section>

                <section
                    aria-labelledby="fluxo"
                    className="flex flex-col gap-3.5"
                >
                    <h2 id="fluxo" className="text-lg font-semibold">
                        Fluxo dos vídeos
                    </h2>
                    <div className="overflow-x-auto pb-2">
                        <div className="grid min-w-[1000px] grid-cols-5 gap-3.5">
                            {colunas.map((col) => (
                                <div
                                    key={col.titulo}
                                    className="flex min-h-[280px] flex-col gap-2.5 rounded-xl bg-[#EEF0F3] p-3"
                                >
                                    <div className="flex items-center justify-between px-1 py-0.5">
                                        <span className="text-[13px] font-semibold">
                                            {col.titulo}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {col.cartoes.length}
                                        </span>
                                    </div>
                                    {col.cartoes.map((c) => (
                                        <Link
                                            key={c.id}
                                            href={c.link}
                                            className="flex flex-col gap-2 rounded-[10px] border bg-card p-3 hover:border-primary"
                                        >
                                            <span className="text-sm leading-snug font-semibold break-all">
                                                {c.titulo}
                                            </span>
                                            <span className="self-start rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                                                {c.tag}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                        <h2 className="text-base font-semibold">
                            Pendências da produção
                        </h2>
                        {pendencias.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nada pendente.
                            </p>
                        ) : (
                            pendencias.map((p) => (
                                <div
                                    key={p.texto}
                                    className="flex justify-between gap-3 border-b py-2.5 text-sm last:border-0"
                                >
                                    <span>{p.texto}</span>
                                    <Link
                                        href={p.link}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {p.acao}
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
                        <h2 className="text-base font-semibold">
                            Briefing e marca
                        </h2>
                        <div className="flex justify-between gap-3 border-b py-2.5 text-sm">
                            <span>Briefing</span>
                            <Link href={briefing()} className="hover:underline">
                                <Situacao
                                    ok={configuracao.briefingCompleto}
                                    texto={
                                        configuracao.briefingCompleto
                                            ? 'Completo'
                                            : 'Incompleto'
                                    }
                                />
                            </Link>
                        </div>
                        <div className="flex justify-between gap-3 border-b py-2.5 text-sm">
                            <span>Personas no catálogo</span>
                            <Link
                                href={personas()}
                                className="font-medium text-primary hover:underline"
                            >
                                {configuracao.personasSalvas} salvas ·{' '}
                                {configuracao.personasSugeridas} sugeridas
                            </Link>
                        </div>
                        <div className="flex justify-between gap-3 py-2.5 text-sm">
                            <span>Kit de marca</span>
                            <Link href={kit()} className="hover:underline">
                                <Situacao
                                    ok={configuracao.kitConfigurado}
                                    texto={
                                        configuracao.kitConfigurado
                                            ? 'Configurado'
                                            : 'Padrão (não configurado)'
                                    }
                                />
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Painel da semana', href: dashboard() }],
};
