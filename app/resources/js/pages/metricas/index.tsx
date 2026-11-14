import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import { index as leads } from '@/routes/leads';
import { index } from '@/routes/metricas';
import { metricas } from '@/routes/videos';

type Por = 'video' | 'persona' | 'gancho';
type Linha = {
    id: number | string;
    titulo: string;
    persona?: string | null;
    videos?: number;
    visualizacoes: number | null;
    comentarios: number | null;
    leads: number;
    agendados: number;
    metricas_em?: string | null;
};
type Totais = {
    visualizacoes: number;
    comentarios: number;
    leads: number;
    agendados: number;
};
type Campeao = { nome: string; leads: number } | null;

const numero = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : n.toLocaleString('pt-BR');
const ROTULO_POR = {
    video: 'Vídeo',
    persona: 'Persona',
    gancho: 'Gancho',
} as const;

/** Visualizações e comentários digitados a partir dos insights do Instagram; salva ao sair do campo. */
function Numero({
    video,
    campo,
    valor,
    outro,
    rotulo,
}: {
    video: number;
    campo: 'visualizacoes' | 'comentarios';
    valor: number | null;
    outro: number | null;
    rotulo: string;
}) {
    const [texto, setTexto] = useState(valor === null ? '' : String(valor));
    const salvar = () => {
        const limpo = texto.replace(/\D/g, '');
        const novo = limpo === '' ? null : Number(limpo);
        if (novo === valor) return;
        const outroCampo =
            campo === 'visualizacoes' ? 'comentarios' : 'visualizacoes';
        router.put(
            metricas.url(video),
            { [campo]: novo, [outroCampo]: outro },
            { preserveScroll: true, preserveState: true },
        );
    };
    return (
        <input
            aria-label={rotulo}
            inputMode="numeric"
            placeholder="0"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={salvar}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-h-10 w-24 rounded-lg border border-input bg-card px-2.5 text-sm"
        />
    );
}

export default function Metricas({
    por,
    totais,
    linhas,
    aprendizado,
}: {
    por: Por;
    totais: Totais;
    linhas: Linha[];
    aprendizado: { persona: Campeao; gancho: Campeao };
}) {
    const celula = 'border-b border-muted px-[18px] py-3.5';

    return (
        <>
            <Head title="Métricas" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="Conferidas nos insights do Instagram e registradas pela produção"
                    titulo="Métricas"
                />

                <section
                    aria-label="Totais"
                    className="grid grid-cols-2 gap-4 lg:grid-cols-4"
                >
                    {(
                        [
                            ['Visualizações', totais.visualizacoes],
                            [
                                'Comentários com palavra-chave',
                                totais.comentarios,
                            ],
                            ['Leads qualificados', totais.leads],
                            ['Consultas agendadas', totais.agendados],
                        ] as const
                    ).map(([rotulo, valor]) => (
                        <div
                            key={rotulo}
                            className="flex flex-col gap-1.5 rounded-xl border bg-card p-[18px]"
                        >
                            <span className="text-[13px] text-muted-foreground">
                                {rotulo}
                            </span>
                            <span className="text-[28px] font-bold">
                                {numero(valor)}
                            </span>
                        </div>
                    ))}
                </section>

                <section
                    aria-labelledby="porvideo"
                    className="flex flex-col gap-3"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="porvideo" className="text-lg font-semibold">
                            Por {ROTULO_POR[por].toLowerCase()}
                        </h2>
                        <div
                            role="group"
                            aria-label="Agrupar por"
                            className="flex gap-1.5"
                        >
                            {(Object.keys(ROTULO_POR) as Por[]).map((p) => (
                                <Link
                                    key={p}
                                    href={index({
                                        query: {
                                            por: p === 'video' ? undefined : p,
                                        },
                                    })}
                                    aria-current={
                                        p === por ? 'true' : undefined
                                    }
                                    preserveScroll
                                    className="min-h-10 rounded-full border border-input bg-card px-3.5 py-2 text-[13px] font-semibold aria-[current]:border-transparent aria-[current]:bg-[#14171C] aria-[current]:text-white"
                                >
                                    {ROTULO_POR[p]}
                                </Link>
                            ))}
                        </div>
                    </div>
                    {linhas.length === 0 ? (
                        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                            Nenhum vídeo publicado ainda. As métricas aparecem
                            aqui depois da publicação.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border bg-card">
                            <table className="w-full min-w-[960px] border-collapse text-sm">
                                <thead>
                                    <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            {ROTULO_POR[por]}
                                        </th>
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            {por === 'video'
                                                ? 'Persona'
                                                : 'Vídeos'}
                                        </th>
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            Visualizações
                                        </th>
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            Comentários
                                        </th>
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            Leads
                                        </th>
                                        <th className="border-b px-[18px] py-3.5 font-semibold">
                                            {por === 'video'
                                                ? 'Atualizado'
                                                : 'Agendados'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {linhas.map((l) =>
                                        por === 'video' ? (
                                            <tr key={l.id}>
                                                <td
                                                    className={`${celula} font-semibold`}
                                                >
                                                    {l.titulo}
                                                </td>
                                                <td className={celula}>
                                                    {l.persona ?? '—'}
                                                </td>
                                                <td className={celula}>
                                                    <Numero
                                                        video={Number(l.id)}
                                                        campo="visualizacoes"
                                                        valor={l.visualizacoes}
                                                        outro={l.comentarios}
                                                        rotulo={`Visualizações de ${l.titulo}`}
                                                    />
                                                </td>
                                                <td className={celula}>
                                                    <Numero
                                                        video={Number(l.id)}
                                                        campo="comentarios"
                                                        valor={l.comentarios}
                                                        outro={l.visualizacoes}
                                                        rotulo={`Comentários de ${l.titulo}`}
                                                    />
                                                </td>
                                                <td className={celula}>
                                                    <Link
                                                        href={leads({
                                                            query: {
                                                                video: l.id,
                                                            },
                                                        })}
                                                        className="text-primary"
                                                    >
                                                        {l.leads}{' '}
                                                        {l.leads === 1
                                                            ? 'lead'
                                                            : 'leads'}
                                                    </Link>
                                                    {l.agendados > 0 && (
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            · {l.agendados}{' '}
                                                            agendou
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={`${celula} text-muted-foreground`}
                                                >
                                                    {l.metricas_em
                                                        ? new Date(
                                                              l.metricas_em,
                                                          ).toLocaleDateString(
                                                              'pt-BR',
                                                          )
                                                        : 'Nunca'}
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={l.id}>
                                                <td
                                                    className={`${celula} font-semibold`}
                                                >
                                                    {l.titulo}
                                                </td>
                                                <td className={celula}>
                                                    {l.videos}
                                                </td>
                                                <td className={celula}>
                                                    {numero(l.visualizacoes)}
                                                </td>
                                                <td className={celula}>
                                                    {numero(l.comentarios)}
                                                </td>
                                                <td className={celula}>
                                                    {l.leads}
                                                </td>
                                                <td className={celula}>
                                                    {l.agendados}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="text-[13px] text-muted-foreground">
                        Leads vêm do registro da tela Leads. Visualizações e
                        comentários são digitados a partir do Instagram (coleta
                        automática fica fora do MVP).
                    </p>
                </section>

                <section className="flex flex-col gap-2 rounded-xl border bg-card p-5">
                    <h2 className="text-base font-semibold">
                        Aprendizado para os próximos roteiros
                    </h2>
                    {aprendizado.persona || aprendizado.gancho ? (
                        <ul className="flex flex-col gap-1 text-sm leading-normal">
                            {aprendizado.persona && (
                                <li>
                                    Persona com mais leads:{' '}
                                    <strong>{aprendizado.persona.nome}</strong>{' '}
                                    ({aprendizado.persona.leads})
                                </li>
                            )}
                            {aprendizado.gancho && (
                                <li>
                                    Gancho com mais leads:{' '}
                                    <strong>“{aprendizado.gancho.nome}”</strong>{' '}
                                    ({aprendizado.gancho.leads})
                                </li>
                            )}
                        </ul>
                    ) : (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Quando houver leads registrados com o vídeo de
                            origem, aparecem aqui a persona e o gancho que
                            geraram mais leads.
                        </p>
                    )}
                </section>
            </div>
        </>
    );
}

Metricas.layout = {
    breadcrumbs: [{ title: 'Métricas', href: index() }],
};
