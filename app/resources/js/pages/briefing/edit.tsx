import { Head, useForm } from '@inertiajs/react';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { edit, update } from '@/routes/briefing';

type Briefing = {
    nicho: string | null;
    objetivo: string | null;
    oferta: string | null;
    regiao: string | null;
    tom_voz: string | null;
    temas_proibidos: string | null;
    tags: string[];
    profissao: string | null;
    conselho: string | null;
    crm: string | null;
    rqe: string | null;
};

const campoClasse = 'h-11 bg-card';

export default function BriefingEdit({
    briefing,
    conselhos,
}: {
    briefing: Briefing;
    conselhos: Record<string, string>;
}) {
    const form = useForm({
        nicho: briefing.nicho ?? '',
        objetivo: briefing.objetivo ?? '',
        oferta: briefing.oferta ?? '',
        regiao: briefing.regiao ?? '',
        tom_voz: briefing.tom_voz ?? '',
        temas_proibidos: briefing.temas_proibidos ?? '',
        tags: briefing.tags ?? [],
        profissao: briefing.profissao ?? '',
        conselho: briefing.conselho ?? 'CFM',
        crm: briefing.crm ?? '',
        rqe: briefing.rqe ?? '',
        sugerir_personas: false,
    });
    const [tag, setTag] = useState('');
    const { data, setData, errors, processing } = form;

    function adicionarTag(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter' && e.key !== ',') return;
        e.preventDefault();
        const nova = tag.trim().toLowerCase();
        if (nova && !data.tags.includes(nova))
            setData('tags', [...data.tags, nova]);
        setTag('');
    }

    function enviar(sugerir: boolean) {
        return (e?: FormEvent) => {
            e?.preventDefault();
            form.transform((d) => ({ ...d, sugerir_personas: sugerir }));
            form.submit(update(), { preserveScroll: true });
        };
    }

    const campo = (
        id: keyof Briefing,
        rotulo: string,
        extra = '',
        placeholder = '',
    ) => (
        <div className={`flex flex-col gap-1.5 ${extra}`}>
            <Label htmlFor={id} className="text-sm font-semibold">
                {rotulo}
            </Label>
            <Input
                id={id}
                className={campoClasse}
                placeholder={placeholder}
                value={data[id] as string}
                onChange={(e) => setData(id, e.target.value)}
            />
            <InputError message={errors[id]} />
        </div>
    );

    return (
        <>
            <Head title="Briefing do cliente" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="Preenchido pela produção com o médico"
                    titulo="Briefing do cliente"
                >
                    <div
                        data-tour="briefing-acoes"
                        className="flex flex-wrap gap-3"
                    >
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11"
                            disabled={processing}
                            onClick={enviar(false)}
                        >
                            Salvar rascunho
                        </Button>
                        <Button
                            type="button"
                            className="h-11"
                            disabled={processing}
                            onClick={enviar(true)}
                        >
                            {processing ? <Spinner /> : <Sparkles />}
                            Salvar e sugerir personas
                        </Button>
                    </div>
                </CabecalhoPagina>

                <div className="flex flex-wrap items-start gap-6">
                    <form
                        onSubmit={enviar(false)}
                        data-tour="briefing-form"
                        className="grid min-w-0 flex-[999_1_520px] grid-cols-1 gap-5 rounded-xl border bg-card p-7 md:grid-cols-2"
                    >
                        {campo(
                            'nicho',
                            'Nicho / especialidade',
                            '',
                            'Otorrinolaringologia',
                        )}
                        {campo(
                            'objetivo',
                            'Objetivo',
                            '',
                            'Agendar consultas particulares',
                        )}
                        {campo(
                            'oferta',
                            'Oferta',
                            'md:col-span-2',
                            'Consulta, exame de audiometria, avaliação de ronco',
                        )}
                        {campo(
                            'regiao',
                            'Região de atendimento',
                            '',
                            'Cidade e bairros atendidos',
                        )}
                        {campo(
                            'tom_voz',
                            'Tom de voz',
                            '',
                            'Acolhedor, didático, sem alarmismo',
                        )}

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <Label
                                htmlFor="temas_proibidos"
                                className="text-sm font-semibold"
                            >
                                Temas proibidos
                            </Label>
                            <textarea
                                id="temas_proibidos"
                                rows={3}
                                value={data.temas_proibidos}
                                onChange={(e) =>
                                    setData('temas_proibidos', e.target.value)
                                }
                                className="resize-y rounded-md border border-input bg-card px-3 py-2.5 text-[15px] leading-normal shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                            <span className="text-xs text-muted-foreground">
                                Somam-se às regras do conselho, que o sistema
                                aplica sempre.
                            </span>
                            <InputError message={errors.temas_proibidos} />
                        </div>

                        <div className="flex flex-col gap-2 md:col-span-2">
                            <Label
                                htmlFor="tags"
                                className="text-sm font-semibold"
                            >
                                Tags livres
                            </Label>
                            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-input px-2.5 py-1.5">
                                {data.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1.5 pl-2.5 text-[13px]"
                                    >
                                        {t}
                                        <button
                                            type="button"
                                            aria-label={`Remover a tag ${t}`}
                                            className="rounded-full p-0.5 hover:bg-border"
                                            onClick={() =>
                                                setData(
                                                    'tags',
                                                    data.tags.filter(
                                                        (x) => x !== t,
                                                    ),
                                                )
                                            }
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    id="tags"
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value)}
                                    onKeyDown={adicionarTag}
                                    placeholder="Adicionar tag e Enter"
                                    className="min-h-8 flex-[1_1_140px] border-0 bg-transparent text-sm outline-none"
                                />
                            </div>
                            <InputError message={errors.tags} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="canal"
                                className="text-sm font-semibold"
                            >
                                Canal
                            </Label>
                            <select
                                id="canal"
                                disabled
                                className="h-11 rounded-md border border-input bg-card px-3 text-[15px]"
                            >
                                <option>Instagram Reels</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="conselho"
                                className="text-sm font-semibold"
                            >
                                Conselho profissional
                            </Label>
                            <select
                                id="conselho"
                                value={data.conselho}
                                onChange={(e) =>
                                    setData('conselho', e.target.value)
                                }
                                className="h-11 rounded-md border border-input bg-card px-3 text-[15px]"
                            >
                                {Object.entries(conselhos).map(
                                    ([valor, rotulo]) => (
                                        <option key={valor} value={valor}>
                                            {rotulo}
                                        </option>
                                    ),
                                )}
                            </select>
                            <InputError message={errors.conselho} />
                        </div>
                        {campo(
                            'profissao',
                            'Profissão',
                            '',
                            'Médico otorrinolaringologista',
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            {campo('crm', 'CRM', '', 'CRM/UF 000000')}
                            {campo('rqe', 'RQE', '', '00000')}
                        </div>
                        <button
                            type="submit"
                            className="hidden"
                            aria-hidden="true"
                            tabIndex={-1}
                        />
                    </form>

                    <aside className="flex flex-[1_1_280px] flex-col gap-4">
                        <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
                            <h2 className="text-[15px] font-semibold">
                                Próximo passo
                            </h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Ao salvar e sugerir, a IA propõe as personas
                                iniciais a partir do nicho. A produção aprova,
                                edita ou descarta cada uma.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
                            <h2 className="text-[15px] font-semibold">
                                CRM e RQE
                            </h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                O conselho exige a identificação do médico ao
                                anunciar especialidade. Eles entram na legenda
                                dos posts.
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

BriefingEdit.layout = {
    breadcrumbs: [{ title: 'Briefing', href: edit() }],
};
