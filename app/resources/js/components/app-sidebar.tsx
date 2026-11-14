import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    CheckCircle2,
    Clapperboard,
    FileText,
    LayoutGrid,
    Palette,
    Scissors,
    Send,
    Upload,
    UserRound,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard, guia } from '@/routes';
import { edit as briefing } from '@/routes/briefing';
import { edit as kit } from '@/routes/kit';
import { index as personas } from '@/routes/personas';
import { index as roteiros } from '@/routes/roteiros';
import { index as aprovacao } from '@/routes/aprovacao';
import { index as edicao } from '@/routes/edicao';
import { index as leads } from '@/routes/leads';
import { index as metricas } from '@/routes/metricas';
import { index as publicacao } from '@/routes/publicacao';
import { index as videos } from '@/routes/videos';
import type { ClienteAtual, NavItem } from '@/types';

// Menu do canva (componente "Menu lateral").
const configuracao: NavItem[] = [
    { title: 'Painel da semana', href: dashboard(), icon: LayoutGrid },
    { title: 'Briefing', href: briefing(), icon: FileText },
    { title: 'Personas', href: personas(), icon: Users },
    { title: 'Kit de marca', href: kit(), icon: Palette },
];

const producao: NavItem[] = [
    { title: 'Roteiros', href: roteiros(), icon: Clapperboard },
    { title: 'Upload avulso', href: videos(), icon: Upload, exact: true },
    { title: 'Edição', href: edicao(), icon: Scissors },
    { title: 'Aprovação', href: aprovacao(), icon: CheckCircle2 },
];

const resultados: NavItem[] = [
    { title: 'Publicação', href: publicacao(), icon: Send },
    { title: 'Leads', href: leads(), icon: UserRound },
    { title: 'Métricas', href: metricas(), icon: BarChart3 },
];

export function AppSidebar() {
    const { cliente } = usePage<{ cliente: ClienteAtual }>().props;

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-transparent"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {cliente && (
                    <div className="mt-2 grid gap-0.5 rounded-lg bg-[#1F232B] p-3 group-data-[collapsible=icon]:hidden">
                        <span className="text-[11px] tracking-wider text-[#9AA3AF] uppercase">
                            Cliente
                        </span>
                        <span className="text-sm font-semibold text-white">
                            {cliente.nome}
                        </span>
                        <span className="text-xs text-[#B9BFC9]">
                            Instagram Reels
                        </span>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent className="gap-4 pt-2" data-tour="menu">
                <NavMain label="Configuração" items={configuracao} />
                <NavMain label="Produção" items={producao} />
                <NavMain label="Resultados" items={resultados} />
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Guia do sistema' }}
                        >
                            <Link href={guia()} prefetch>
                                <BookOpen />
                                <span>Guia do sistema</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
