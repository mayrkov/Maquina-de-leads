import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-[18px]" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-base">
                <span className="truncate leading-tight font-bold tracking-tight text-white">
                    {name}
                </span>
            </div>
        </>
    );
}
