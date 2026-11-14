import { Form, Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { index, store, update } from '@/routes/leads';

type Status = 'qualificado' | 'entregue' | 'agendou' | 'nao_agendou';
type Lead = {
    id: number;
    nome: string;
    perfil: string | null;
    para_quem: string | null;
    problema: string | null;
    cidade: string | null;
    status: Status;
    consentimento_em: string;
    registrado_em: string;
    video: string | null;
    persona: string | null;
};
type Paginado<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

const campo =
    'min-h-11 rounded-[10px] border border-input bg-card px-3 text-sm';
const hoje = () => new Date().toLocaleDateString('sv-SE');

function Registrar({
    videos,
    statusOpcoes,
    aoFechar,
}: {
    videos: { id: number; titulo: string; palavra_chave: string | null }[];
    statusOpcoes: Record<Status, string>;
    aoFechar: () => void;
}) {
    return (
        <Form
            {...store.form()}
            options={{ preserveScroll: true }}
            onSuccess={aoFechar}
            className="flex flex-col gap-4 rounded-xl border bg-card p-5"
        >
            {({ processing, errors }) => (
                <>
                    <h2 className="text-base font-semibold">Registrar lead</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Nome
                            <input
                                name="nome"
                                required
                                maxLength={120}
                                className={campo}
                            />
                            <InputError message={errors.nome} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Perfil no Instagram
                            <input
                                name="perfil"
                                maxLength={60}
                                placeholder="@perfil"
                                className={campo}
                            />
                            <InputError message={errors.perfil} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Vídeo de origem
                            <select
                                name="video_id"
                                defaultValue=""
                                className={campo}
                            >
                                <option value="">
                                    Não sei de qual vídeo veio
                                </option>
                                {videos.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.titulo}{' '}
                                        {v.palavra_chave
                                            ? `(${v.palavra_chave})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.video_id} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Status
                            <select
                                name="status"
                                defaultValue="qualificado"
                                className={campo}
                            >
                                {Object.entries(statusOpcoes).map(
                                    ([valor, rotulo]) => (
                                        <option key={valor} value={valor}>
                                            {rotulo}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Para quem é
                            <input
                                name="para_quem"
                                maxLength={200}
                                placeholder="ex.: filho de 5 anos"
                                className={campo}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Problema
                            <input
                                name="problema"
                                maxLength={300}
                                placeholder="ex.: respira pela boca"
                                className={campo}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Cidade
                            <input
                                name="cidade"
                                maxLength={120}
                                className={campo}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-semibold">
                            Data do consentimento
                            <input
                                name="consentimento_em"
                                type="date"
                                required
                                defaultValue={hoje()}
                                max={hoje()}
                                className={campo}
                            />
                            <InputError message={errors.consentimento_em} />
                        </label>
                    </div>
                    <label className="flex items-start gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            name="consentimento"
                            value="1"
                            required
                            className="mt-0.5 size-5 accent-primary"
                        />
                        <span>
                            O lead deu consentimento na ferramenta de mensagens
                            para que os dados sejam usados no atendimento.
                        </span>
                    </label>
                    <InputError message={errors.consentimento} />
                    <div className="flex gap-2.5">
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Registrar
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
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

export default function Leads({
    leads,
    filtro,
    statusOpcoes,
    videos,
}: {
    leads: Paginado<Lead>;
    filtro: { status: Status | null; video: number | null };
    statusOpcoes: Record<Status, string>;
    videos: { id: number; titulo: string; palavra_chave: string | null }[];
}) {
    const [registrando, setRegistrando] = useState(false);
    const filtros: [Status | null, string][] = [
        [null, 'Todos'],
        ...(Object.entries(statusOpcoes) as [Status, string][]),
    ];
    const videoFiltrado = filtro.video
        ? videos.find((v) => v.id === filtro.video)
        : null;

    return (
        <>
            <Head title="Leads" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="Registro básico · entrega e status manuais no MVP"
                    titulo="Leads"
                >
                    {!registrando && (
                        <Button
                            className="h-11"
                            onClick={() => setRegistrando(true)}
                        >
                            + Registrar lead
                        </Button>
                    )}
                </CabecalhoPagina>

                {registrando && (
                    <Registrar
                        videos={videos}
                        statusOpcoes={statusOpcoes}
                        aoFechar={() => setRegistrando(false)}
                    />
                )}

                <div
                    role="group"
                    aria-label="Filtrar por status"
                    className="flex flex-wrap items-center gap-2"
                >
                    {filtros.map(([valor, rotulo]) => (
                        <Link
                            key={rotulo}
                            href={index({
                                query: {
                                    status: valor ?? undefined,
                                    video: filtro.video ?? undefined,
                                },
                            })}
                            aria-current={
                                filtro.status === valor ? 'true' : undefined
                            }
                            preserveScroll
                            className="min-h-10 rounded-full border border-input bg-card px-3.5 py-2 text-[13px] font-semibold aria-[current]:border-transparent aria-[current]:bg-[#14171C] aria-[current]:text-white"
                        >
                            {rotulo}
                        </Link>
                    ))}
                    {filtro.video && (
                        <Link
                            href={index({
                                query: { status: filtro.status ?? undefined },
                            })}
                            className="text-[13px] text-primary"
                        >
                            Vídeo: {videoFiltrado?.titulo ?? `#${filtro.video}`}{' '}
                            ✕
                        </Link>
                    )}
                </div>

                {leads.data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Nenhum lead{' '}
                        {filtro.status || filtro.video
                            ? 'com este filtro'
                            : 'registrado ainda'}
                        .
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border bg-card">
                        <table className="w-full min-w-[960px] border-collapse text-sm">
                            <thead>
                                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Lead
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Respostas da qualificação
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Vídeo de origem
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Persona
                                    </th>
                                    <th className="border-b px-[18px] py-3.5 font-semibold">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.data.map((l) => (
                                    <tr key={l.id}>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            <div className="font-semibold">
                                                {l.nome}
                                            </div>
                                            <div className="text-[13px] text-muted-foreground">
                                                {[
                                                    l.perfil,
                                                    new Date(
                                                        l.registrado_em,
                                                    ).toLocaleDateString(
                                                        'pt-BR',
                                                        {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                        },
                                                    ),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4 text-[13px] leading-normal text-[#3A414C]">
                                            {[
                                                l.para_quem &&
                                                    `Para: ${l.para_quem}`,
                                                l.problema &&
                                                    `Problema: ${l.problema}`,
                                                l.cidade &&
                                                    `Cidade: ${l.cidade}`,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            {l.video ?? '—'}
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            {l.persona ?? '—'}
                                        </td>
                                        <td className="border-b border-muted px-[18px] py-4">
                                            <label
                                                htmlFor={`status-${l.id}`}
                                                className="sr-only"
                                            >
                                                Status de {l.nome}
                                            </label>
                                            <select
                                                id={`status-${l.id}`}
                                                value={l.status}
                                                onChange={(e) =>
                                                    router.put(
                                                        update.url(l.id),
                                                        {
                                                            status: e.target
                                                                .value,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                                className="min-h-10 rounded-lg border border-input bg-card px-2.5 text-sm"
                                            >
                                                {Object.entries(
                                                    statusOpcoes,
                                                ).map(([valor, rotulo]) => (
                                                    <option
                                                        key={valor}
                                                        value={valor}
                                                    >
                                                        {rotulo}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {leads.links.length > 3 && (
                    <nav aria-label="Páginas" className="flex flex-wrap gap-2">
                        {leads.links.map((l, i) =>
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
                <p className="text-[13px] text-muted-foreground">
                    A ferramenta de mensagens qualifica; a produção registra e
                    entrega à equipe do médico.
                </p>
            </div>
        </>
    );
}

Leads.layout = {
    breadcrumbs: [{ title: 'Leads', href: index() }],
};
