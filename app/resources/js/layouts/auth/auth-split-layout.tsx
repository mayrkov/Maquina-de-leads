import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { AuthLayoutProps } from '@/types';

/** Canva, tela 01: painel escuro com a proposta à esquerda e o formulário à direita (empilha no celular). */
export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="flex min-h-dvh flex-wrap bg-background text-foreground">
            <section className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-[#14171C] p-8 text-white sm:p-14">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-[9px] bg-primary">
                        <AppLogoIcon className="size-5" />
                    </div>
                    <span className="text-lg font-bold">{name}</span>
                </div>
                <div className="flex max-w-[480px] flex-col gap-4">
                    <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-[40px]">
                        Do roteiro ao lead, em um só fluxo.
                    </h1>
                    <p className="text-base leading-relaxed text-[#C4C9D2]">
                        Roteiros com filtro de conformidade, edição no padrão da
                        marca e captação por palavra-chave no Instagram.
                    </p>
                </div>
                <span className="text-sm text-[#9AA3AF]">
                    Acesso restrito à produção parceira.
                </span>
            </section>
            <section className="flex flex-[1_1_480px] items-center justify-center px-6 py-10">
                <div className="flex w-full max-w-[400px] flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </section>
        </div>
    );
}
