import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** Cabeçalho das telas do canva: sobretítulo, título e ações à direita; mostra o aviso da última ação. */
export default function CabecalhoPagina({
    sobretitulo,
    titulo,
    children,
}: {
    sobretitulo: string;
    titulo: string;
    children?: ReactNode;
}) {
    const { status } = usePage<{ status?: string | null }>().props;

    return (
        <div className="flex flex-col gap-3">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[13px] text-muted-foreground">
                        {sobretitulo}
                    </span>
                    <h1 className="text-[28px] leading-tight font-bold tracking-tight">
                        {titulo}
                    </h1>
                </div>
                {children && (
                    <div className="flex flex-wrap items-center gap-3">
                        {children}
                    </div>
                )}
            </header>
            {status && (
                <p
                    role="status"
                    className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
                >
                    {status}
                </p>
            )}
        </div>
    );
}
