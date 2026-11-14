import { router, usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import {
    TOUR_COMPLETO,
    TOURS,
    tourDaPagina as buscarTourDaPagina,
} from '@/tour/passos';
import type { Passo, Tour } from '@/tour/tipos';

/** Progresso do tour na aba: sobrevive a um recarregamento no meio de um passo. */
const CHAVE_PROGRESSO = 'maquina-leads:tour';

type Estado = {
    tour: Tour;
    indice: number;
};

type TourContexto = {
    estado: Estado | null;
    passo: Passo | null;
    ativo: boolean;
    /** Tour curto da tela atual, quando existe. */
    tourDaTela: Tour | null;
    iniciar: (tour: Tour) => void;
    proximo: () => void;
    anterior: () => void;
    sair: () => void;
};

const TourContext = createContext<TourContexto | null>(null);

function lerProgresso(): Estado | null {
    if (typeof window === 'undefined') return null;

    try {
        const bruto = window.sessionStorage.getItem(CHAVE_PROGRESSO);
        if (!bruto) return null;

        const salvo = JSON.parse(bruto) as {
            tourId?: string;
            indice?: number;
        };
        const tour = salvo.tourId ? TOURS[salvo.tourId] : undefined;
        if (!tour || tour.passos.length === 0) return null;

        const indice = Math.min(
            Math.max(Number(salvo.indice) || 0, 0),
            tour.passos.length - 1,
        );

        return { tour, indice };
    } catch {
        return null;
    }
}

function gravarProgresso(estado: Estado | null) {
    if (typeof window === 'undefined') return;

    try {
        if (estado) {
            window.sessionStorage.setItem(
                CHAVE_PROGRESSO,
                JSON.stringify({
                    tourId: estado.tour.id,
                    indice: estado.indice,
                }),
            );
        } else {
            window.sessionStorage.removeItem(CHAVE_PROGRESSO);
        }
    } catch {
        // Aba com armazenamento bloqueado: o tour segue só em memória.
    }
}

/**
 * Estado do tour guiado. Fica no layout do app, então sobrevive à troca de página do Inertia: o passo
 * pode mandar abrir outra rota e continuar de onde estava.
 */
export function TourProvider({ children }: { children: ReactNode }) {
    const { component, props } = usePage<{
        tourConcluido?: boolean;
        titulo?: string;
    }>();
    const [estado, setEstado] = useState<Estado | null>(null);
    const encerradoRef = useRef(false);
    const marcadoRef = useRef(false);

    const marcarComoVisto = useCallback(() => {
        if (marcadoRef.current || typeof window === 'undefined') return;
        marcadoRef.current = true;

        const token = document.querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]',
        )?.content;

        void fetch('/tour/concluido', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
        }).catch(() => {
            // Sem rede o tour funciona igual; a marca volta na próxima conclusão.
            marcadoRef.current = false;
        });
    }, []);

    const finalizar = useCallback(() => {
        encerradoRef.current = true;
        setEstado(null);
        gravarProgresso(null);
        marcarComoVisto();
    }, [marcarComoVisto]);

    const iniciar = useCallback((tour: Tour) => {
        if (tour.passos.length === 0) return;
        encerradoRef.current = true;
        setEstado({ tour, indice: 0 });
    }, []);

    const proximo = useCallback(() => {
        setEstado((atual) => {
            if (!atual) return atual;

            if (atual.indice >= atual.tour.passos.length - 1) {
                encerradoRef.current = true;
                gravarProgresso(null);
                marcarComoVisto();

                return null;
            }

            return { ...atual, indice: atual.indice + 1 };
        });
    }, [marcarComoVisto]);

    const anterior = useCallback(() => {
        setEstado((atual) =>
            atual && atual.indice > 0
                ? { ...atual, indice: atual.indice - 1 }
                : atual,
        );
    }, []);

    // Primeiro acesso: abre sozinho no Painel. Um tour interrompido volta no recarregamento.
    useEffect(() => {
        if (estado) return;
        if (encerradoRef.current) return;

        const salvo = lerProgresso();
        if (salvo) {
            setEstado(salvo);

            return;
        }

        if (props.tourConcluido !== false || component !== 'dashboard') {
            return;
        }

        const timer = window.setTimeout(() => {
            encerradoRef.current = true;
            setEstado({ tour: TOUR_COMPLETO, indice: 0 });
        }, 700);

        return () => window.clearTimeout(timer);
    }, [component, estado, props.tourConcluido]);

    useEffect(() => {
        gravarProgresso(estado);
    }, [estado]);

    // Cada passo pode pedir outra tela; o layout permanece montado e o tour continua.
    useEffect(() => {
        if (!estado) return;

        const passo = estado.tour.passos[estado.indice];
        if (!passo?.rota || typeof window === 'undefined') return;

        const atual = window.location.pathname.replace(/\/$/, '');
        if (atual !== passo.rota) {
            router.visit(passo.rota, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    }, [estado]);

    const passo = estado?.tour.passos[estado.indice] ?? null;
    const tourDaTela = useMemo(() => {
        if (component === 'videos/fila') {
            return buscarTourDaPagina(
                props.titulo === 'Aprovação'
                    ? 'videos/fila:aprovacao'
                    : 'videos/fila:edicao',
            );
        }

        return buscarTourDaPagina(component);
    }, [component, props.titulo]);

    const valor = useMemo<TourContexto>(
        () => ({
            estado,
            passo,
            ativo: estado !== null,
            tourDaTela,
            iniciar,
            proximo,
            anterior,
            sair: finalizar,
        }),
        [estado, passo, tourDaTela, iniciar, proximo, anterior, finalizar],
    );

    return (
        <TourContext.Provider value={valor}>{children}</TourContext.Provider>
    );
}

export function useTour(): TourContexto {
    const contexto = useContext(TourContext);

    if (!contexto) {
        throw new Error('useTour precisa estar dentro do TourProvider.');
    }

    return contexto;
}
