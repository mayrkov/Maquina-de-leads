import { Head, useForm } from '@inertiajs/react';
import { ImageUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import CabecalhoPagina from '@/components/cabecalho-pagina';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { edit, logo as logoRota, update } from '@/routes/kit';

type Kit = {
    cor_primaria: string;
    cor_destaque: string;
    cor_texto: string;
    fonte_titulos: string;
    estilo_legenda: string;
    logo_posicao: string;
    tela_final_texto: string;
    capa_modelo: string;
    vinheta_nome: string | null;
    tem_logo: boolean;
    configurado: boolean;
    logo_versao: string | null;
};
type Opcoes = {
    fontes: Record<string, string>;
    estilos: Record<string, string>;
    posicoes: Record<string, string>;
    capas: Record<string, string>;
};

const FAMILIA: Record<string, string> = {
    montserrat: "'Montserrat', sans-serif",
    anton: "'Anton', sans-serif",
};
const POSICAO: Record<string, string> = {
    'top-left': 'top-[8%] left-[5%]',
    top: 'top-[8%] left-1/2 -translate-x-1/2',
    'top-right': 'top-[8%] right-[5%]',
    'bottom-left': 'bottom-[22%] left-[5%]',
    bottom: 'bottom-[22%] left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-[22%] right-[5%]',
};
const selectClasse =
    'h-11 rounded-md border border-input bg-card px-3 text-[15px]';

function Opcoes({ valores }: { valores: Record<string, string> }) {
    return Object.entries(valores).map(([v, r]) => (
        <option key={v} value={v}>
            {r}
        </option>
    ));
}

export default function KitMarca({
    kit,
    opcoes,
}: {
    kit: Kit;
    opcoes: Opcoes;
}) {
    const { data, setData, post, processing, errors, progress } = useForm({
        cor_primaria: kit.cor_primaria,
        cor_destaque: kit.cor_destaque,
        cor_texto: kit.cor_texto,
        fonte_titulos: kit.fonte_titulos,
        estilo_legenda: kit.estilo_legenda,
        logo_posicao: kit.logo_posicao,
        tela_final_texto: kit.tela_final_texto,
        capa_modelo: kit.capa_modelo,
        logo: null as File | null,
        remover_logo: false,
        vinheta: null as File | null,
        remover_vinheta: false,
    });

    // Prévia do logo: o arquivo escolhido agora, ou o salvo no servidor.
    const logoNovo = useMemo(
        () => (data.logo ? URL.createObjectURL(data.logo) : null),
        [data.logo],
    );
    useEffect(
        () => () => void (logoNovo && URL.revokeObjectURL(logoNovo)),
        [logoNovo],
    );
    const logoUrl =
        logoNovo ??
        (kit.tem_logo && !data.remover_logo
            ? `${logoRota.url()}?v=${kit.logo_versao}`
            : null);

    const impacto = data.estilo_legenda === 'impacto';
    const legenda = {
        fontFamily: FAMILIA[impacto ? 'anton' : 'montserrat'],
        textTransform: impacto ? ('uppercase' as const) : undefined,
    };

    function salvar() {
        post(update.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () =>
                setData((d) => ({
                    ...d,
                    logo: null,
                    vinheta: null,
                    remover_logo: false,
                    remover_vinheta: false,
                })),
        });
    }

    const cor = (
        campo: 'cor_primaria' | 'cor_destaque' | 'cor_texto',
        rotulo: string,
        ajuda: string,
    ) => (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={campo} className="text-sm font-semibold">
                {rotulo}
            </Label>
            <div className="flex items-center gap-2">
                <input
                    id={campo}
                    type="color"
                    value={data[campo]}
                    onChange={(e) =>
                        setData(campo, e.target.value.toUpperCase())
                    }
                    className="h-11 w-12 cursor-pointer rounded-md border border-input bg-card p-1"
                />
                <Input
                    aria-label={`${rotulo} em hexadecimal`}
                    value={data[campo]}
                    onChange={(e) => setData(campo, e.target.value)}
                    className="h-11 w-28 bg-card font-mono"
                    maxLength={7}
                />
            </div>
            <span className="text-xs text-muted-foreground">{ajuda}</span>
            <InputError message={errors[campo]} />
        </div>
    );

    return (
        <>
            <Head title="Kit de marca" />
            <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-8">
                <CabecalhoPagina
                    sobretitulo="Padrão aplicado em toda edição automática"
                    titulo="Kit de marca"
                >
                    {progress && (
                        <span className="text-sm text-muted-foreground">
                            {progress.percentage}% enviado
                        </span>
                    )}
                    <Button
                        type="button"
                        className="h-11"
                        disabled={processing}
                        onClick={salvar}
                    >
                        {processing && <Spinner />}
                        Salvar kit
                    </Button>
                </CabecalhoPagina>
                {!kit.configurado && (
                    <p className="text-sm text-muted-foreground">
                        Kit ainda não configurado: os vídeos saem com o padrão
                        abaixo até você salvar.
                    </p>
                )}

                <div className="flex flex-wrap items-start gap-6">
                    <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
                        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6">
                            <h2 className="text-base font-semibold">
                                Identidade
                            </h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-[#F6F7F9] text-xs text-muted-foreground">
                                    {logoUrl ? (
                                        <img
                                            src={logoUrl}
                                            alt="Logo do cliente"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    ) : (
                                        'Sem logo'
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label
                                        htmlFor="logo"
                                        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent"
                                    >
                                        <ImageUp
                                            className="size-4"
                                            aria-hidden="true"
                                        />{' '}
                                        Enviar logo
                                    </Label>
                                    <input
                                        id="logo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="sr-only"
                                        onChange={(e) =>
                                            setData((d) => ({
                                                ...d,
                                                logo:
                                                    e.target.files?.[0] ?? null,
                                                remover_logo: false,
                                            }))
                                        }
                                    />
                                    {kit.tem_logo && !data.logo && (
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={data.remover_logo}
                                                onChange={(e) =>
                                                    setData(
                                                        'remover_logo',
                                                        e.target.checked,
                                                    )
                                                }
                                            />{' '}
                                            Remover o logo
                                        </label>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        PNG com fundo transparente, até 5 MB.
                                        Aparece como marca no vídeo.
                                    </span>
                                    <InputError message={errors.logo} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="logo_posicao"
                                        className="text-sm font-semibold"
                                    >
                                        Posição do logo
                                    </Label>
                                    <select
                                        id="logo_posicao"
                                        value={data.logo_posicao}
                                        onChange={(e) =>
                                            setData(
                                                'logo_posicao',
                                                e.target.value,
                                            )
                                        }
                                        className={selectClasse}
                                    >
                                        <Opcoes valores={opcoes.posicoes} />
                                    </select>
                                </div>
                            </div>

                            <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <legend className="mb-3 text-sm font-semibold">
                                    Cores
                                </legend>
                                {cor(
                                    'cor_primaria',
                                    'Primária',
                                    'Fundo da tela final.',
                                )}
                                {cor(
                                    'cor_destaque',
                                    'Destaque',
                                    'Palavras em destaque e palavra-chave.',
                                )}
                                {cor(
                                    'cor_texto',
                                    'Texto',
                                    'Texto da tela final.',
                                )}
                            </fieldset>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="fonte_titulos"
                                        className="text-sm font-semibold"
                                    >
                                        Fonte dos títulos
                                    </Label>
                                    <select
                                        id="fonte_titulos"
                                        value={data.fonte_titulos}
                                        onChange={(e) =>
                                            setData(
                                                'fonte_titulos',
                                                e.target.value,
                                            )
                                        }
                                        className={selectClasse}
                                    >
                                        <Opcoes valores={opcoes.fontes} />
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="estilo_legenda"
                                        className="text-sm font-semibold"
                                    >
                                        Estilo da legenda
                                    </Label>
                                    <select
                                        id="estilo_legenda"
                                        value={data.estilo_legenda}
                                        onChange={(e) =>
                                            setData(
                                                'estilo_legenda',
                                                e.target.value,
                                            )
                                        }
                                        className={selectClasse}
                                    >
                                        <Opcoes valores={opcoes.estilos} />
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="flex flex-col gap-1 rounded-xl border bg-card p-6">
                            <h2 className="mb-3 text-base font-semibold">
                                Peças do vídeo
                            </h2>
                            <div className="flex flex-col gap-2 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">
                                        Vinheta de abertura
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {data.vinheta?.name ??
                                            (data.remover_vinheta
                                                ? 'Será removida'
                                                : (kit.vinheta_nome ??
                                                  'Sem vinheta'))}
                                    </span>
                                    <InputError message={errors.vinheta} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label
                                        htmlFor="vinheta"
                                        className="cursor-pointer text-sm font-semibold text-primary hover:underline"
                                    >
                                        {kit.vinheta_nome ? 'Trocar' : 'Enviar'}
                                    </Label>
                                    <input
                                        id="vinheta"
                                        type="file"
                                        accept="video/mp4,video/quicktime"
                                        className="sr-only"
                                        onChange={(e) =>
                                            setData((d) => ({
                                                ...d,
                                                vinheta:
                                                    e.target.files?.[0] ?? null,
                                                remover_vinheta: false,
                                            }))
                                        }
                                    />
                                    {kit.vinheta_nome && !data.vinheta && (
                                        <label className="flex items-center gap-1.5 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={data.remover_vinheta}
                                                onChange={(e) =>
                                                    setData(
                                                        'remover_vinheta',
                                                        e.target.checked,
                                                    )
                                                }
                                            />{' '}
                                            Remover
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 border-b py-4">
                                <Label
                                    htmlFor="tela_final_texto"
                                    className="text-sm font-semibold"
                                >
                                    Tela final
                                </Label>
                                <Input
                                    id="tela_final_texto"
                                    value={data.tela_final_texto}
                                    onChange={(e) =>
                                        setData(
                                            'tela_final_texto',
                                            e.target.value,
                                        )
                                    }
                                    className="h-11 bg-card"
                                    maxLength={200}
                                />
                                <span className="text-xs text-muted-foreground">
                                    {'{PALAVRA}'} vira a palavra-chave de cada
                                    vídeo. Pode ser trocado no envio do vídeo.
                                </span>
                                <InputError message={errors.tela_final_texto} />
                            </div>
                            <div className="flex flex-col gap-1.5 py-4">
                                <Label
                                    htmlFor="capa_modelo"
                                    className="text-sm font-semibold"
                                >
                                    Modelo de capa
                                </Label>
                                <select
                                    id="capa_modelo"
                                    value={data.capa_modelo}
                                    onChange={(e) =>
                                        setData('capa_modelo', e.target.value)
                                    }
                                    className={`${selectClasse} sm:w-64`}
                                >
                                    <Opcoes valores={opcoes.capas} />
                                </select>
                                <span className="text-xs text-muted-foreground">
                                    Usado quando a exportação da capa entrar
                                    (RF23).
                                </span>
                            </div>
                        </section>
                    </div>

                    <aside
                        aria-label="Prévia"
                        className="flex flex-[1_1_300px] flex-col gap-3"
                    >
                        <span className="text-sm font-semibold">
                            Prévia da legenda (9:16)
                        </span>
                        <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-xl bg-[#2A2F38]">
                            <span className="absolute inset-0 flex items-center justify-center text-sm text-[#9AA3AF]">
                                Vídeo do médico
                            </span>
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt=""
                                    className={`absolute w-[18%] opacity-90 ${POSICAO[data.logo_posicao] ?? POSICAO['top-right']}`}
                                />
                            )}
                            <p
                                className="absolute right-[6%] bottom-[30%] left-[6%] text-center text-[26px] leading-tight font-extrabold text-white [text-shadow:0_2px_6px_rgba(0,0,0,.8)]"
                                style={legenda}
                            >
                                Ronco{' '}
                                <span style={{ color: data.cor_destaque }}>
                                    não
                                </span>{' '}
                                é normal
                            </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            Palavras de destaque usam a cor de destaque.
                        </span>

                        <span className="mt-2 text-sm font-semibold">
                            Tela final
                        </span>
                        <div
                            className="mx-auto flex aspect-[9/16] w-full max-w-[300px] flex-col items-center justify-center gap-4 rounded-xl p-6 text-center"
                            style={{ background: data.cor_primaria }}
                        >
                            <p
                                className="text-lg leading-snug font-extrabold"
                                style={{
                                    color: data.cor_texto,
                                    fontFamily: FAMILIA[data.fonte_titulos],
                                }}
                            >
                                {data.tela_final_texto.replace(
                                    '{PALAVRA}',
                                    'OUVIDO',
                                )}
                            </p>
                            <p
                                className="text-4xl"
                                style={{
                                    color: data.cor_destaque,
                                    fontFamily: FAMILIA[data.fonte_titulos],
                                }}
                            >
                                OUVIDO
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

KitMarca.layout = {
    breadcrumbs: [{ title: 'Kit de marca', href: edit() }],
};
