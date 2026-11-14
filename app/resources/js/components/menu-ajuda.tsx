import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Compass,
    HelpCircle,
    ListChecks,
    MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { guia } from '@/routes';
import { TOUR_COMPLETO, TOUR_ESSENCIAL } from '@/tour/passos';
import { useTour } from '@/tour/tour-context';

/** Menu “?” do topo: rever o tour, abrir o tour da tela atual ou consultar o guia. */
export function MenuAjuda() {
    const { iniciar, tourDaTela } = useTour();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Ajuda e tour"
                    title="Ajuda e tour"
                    data-tour="ajuda"
                    className="size-10 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                    <HelpCircle className="size-[18px]" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Ajuda</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => iniciar(TOUR_COMPLETO)}>
                    <Compass className="mr-2 size-4" />
                    Tour completo
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {TOUR_COMPLETO.passos.length} passos
                    </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => iniciar(TOUR_ESSENCIAL)}>
                    <ListChecks className="mr-2 size-4" />
                    Tour essencial
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {TOUR_ESSENCIAL.passos.length} passos
                    </span>
                </DropdownMenuItem>
                {tourDaTela && (
                    <DropdownMenuItem onSelect={() => iniciar(tourDaTela)}>
                        <MonitorPlay className="mr-2 size-4" />
                        Tour desta tela
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={guia()} className="cursor-pointer">
                        <BookOpen className="mr-2 size-4" />
                        Guia do sistema
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
