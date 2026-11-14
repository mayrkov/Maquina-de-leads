import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/personas';

export type Persona = {
    id: number;
    nome: string;
    descricao: string;
    dores: string;
    quem_decide: string;
    linguagem: string;
    parecida_com: { id: number; nome: string } | null;
    roteiros?: number;
};

export const CAMPOS: [keyof Persona, string][] = [
    ['descricao', 'Descrição'],
    ['quem_decide', 'Quem decide a compra'],
    ['dores', 'Dores'],
    ['linguagem', 'Linguagem'],
];

/** Formulário de correção/edição: a persona salva por aqui entra no catálogo. */
/** `estreito`: uma coluna só (ex.: na lateral da tela do roteiro). */
export default function EditarPersona({
    persona,
    aoFechar,
    estreito = false,
}: {
    persona: Persona;
    aoFechar: () => void;
    estreito?: boolean;
}) {
    const { data, setData, put, processing, errors } = useForm({
        nome: persona.nome,
        descricao: persona.descricao,
        dores: persona.dores,
        quem_decide: persona.quem_decide,
        linguagem: persona.linguagem,
    });

    return (
        <form
            className={`grid gap-3 ${estreito ? '' : 'md:grid-cols-2'}`}
            onSubmit={(e) => {
                e.preventDefault();
                put(update.url(persona.id), {
                    preserveScroll: true,
                    onSuccess: aoFechar,
                });
            }}
        >
            {(
                [
                    'nome',
                    'descricao',
                    'quem_decide',
                    'dores',
                    'linguagem',
                ] as const
            ).map((campo) => (
                <div
                    key={campo}
                    className={`flex flex-col gap-1.5 ${campo === 'nome' && !estreito ? 'md:col-span-2' : ''}`}
                >
                    <Label htmlFor={`${campo}-${persona.id}`}>
                        {campo === 'nome'
                            ? 'Nome'
                            : CAMPOS.find(([c]) => c === campo)?.[1]}
                    </Label>
                    <Input
                        id={`${campo}-${persona.id}`}
                        value={data[campo]}
                        onChange={(e) => setData(campo, e.target.value)}
                    />
                    <InputError message={errors[campo]} />
                </div>
            ))}
            <div className={`flex gap-2 ${estreito ? '' : 'md:col-span-2'}`}>
                <Button type="submit" disabled={processing} className="h-11">
                    {processing && <Spinner />}
                    Salvar no catálogo
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
        </form>
    );
}
