import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { useTour } from '@/tour/tour-context';

type Caixa = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const MARGEM = 16;
const LARGURA_CARTAO = 400;

function caixaDoElemento(el: Element): Caixa {
    const r = el.getBoundingClientRect();

    return {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
    };
}

function limitar(valor: number, minimo: number, maximo: number) {
    return Math.min(Math.max(valor, minimo), Math.max(minimo, maximo));
}

/** Onde o cartão cabe sem cobrir o alvo: ao lado de alvos estreitos, abaixo ou acima dos demais. */
function posicaoDoCartao(caixa: Caixa, altura: number) {
    const larguraTela = window.innerWidth;
    const alturaTela = window.innerHeight;
    const largura = Math.min(LARGURA_CARTAO, larguraTela - MARGEM * 2);
    const alturaEfetiva = Math.min(altura || 360, alturaTela * 0.72);

    if (
        caixa.width < 320 &&
        caixa.left + caixa.width + MARGEM + largura <= larguraTela - MARGEM
    ) {
        return {
            top: limitar(
                caixa.top,
                MARGEM,
                alturaTela - alturaEfetiva - MARGEM,
            ),
            left: caixa.left + caixa.width + MARGEM,
            width: largura,
        };
    }

    const abaixo = caixa.top + caixa.height + MARGEM;
    const acima = caixa.top - MARGEM - alturaEfetiva;
    const topo =
        abaixo + alturaEfetiva <= alturaTela - MARGEM
            ? abaixo
            : acima >= MARGEM
              ? acima
              : limitar(abaixo, MARGEM, alturaTela - alturaEfetiva - MARGEM);

    return {
        top: topo,
        left: limitar(
            caixa.left + caixa.width / 2 - largura / 2,
            MARGEM,
            larguraTela - largura - MARGEM,
        ),
        width: largura,
    };
}

export function TourOverlay() {
    const { estado, passo, ativo, proximo, anterior, sair } = useTour();
    const { isMobile, open, setOpen, setOpenMobile } = useSidebar();
    const [caixa, setCaixa] = useState<Caixa | null>(null);
    const [altura, setAltura] = useState(360);
    const [abertoInicial] = useState(open);
    const cartaoRef = useRef<HTMLDivElement>(null);

    const alvo = passo?.alvo;
    const indice = estado?.indice ?? 0;
    const total = estado?.tour.passos.length ?? 0;
    const primeiro = indice === 0;
    const ultimo = total > 0 && indice === total - 1;

    // Abre o menu quando o passo é sobre ele; no celular ele precisa estar visível para ser destacado.
    useEffect(() => {
        if (alvo !== 'menu') return;

        if (isMobile) {
            setOpenMobile(true);
        } else {
            setOpen(true);
        }

        return () => {
            if (isMobile) {
                setOpenMobile(false);
            } else {
                setOpen(abertoInicial);
            }
        };
    }, [alvo, isMobile, setOpen, setOpenMobile, abertoInicial]);

    // A página pode demorar a montar o alvo (navegação do Inertia): tenta por alguns segundos.
    useEffect(() => {
        if (!ativo) {
            setCaixa(null);

            return;
        }

        if (!alvo) {
            setCaixa(null);

            return;
        }

        let cancelado = false;
        let timer = 0;
        let tentativas = 0;

        const acompanhar = (el: Element) => {
            let quadros = 0;
            const medir = () => {
                if (cancelado) return;
                setCaixa(caixaDoElemento(el));
                quadros += 1;
                if (quadros < 16) timer = window.setTimeout(medir, 50);
            };
            medir();
        };

        const procurar = () => {
            if (cancelado) return;

            const el = document.querySelector<HTMLElement>(
                `[data-tour="${alvo}"]`,
            );

            if (!el) {
                tentativas += 1;
                if (tentativas <= 50) timer = window.setTimeout(procurar, 100);

                return;
            }

            const reduzir = window.matchMedia(
                '(prefers-reduced-motion: reduce)',
            ).matches;
            el.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: reduzir ? 'auto' : 'smooth',
            });
            acompanhar(el);
        };

        procurar();

        return () => {
            cancelado = true;
            window.clearTimeout(timer);
        };
    }, [alvo, ativo, indice]);

    // Rolar ou girar a tela move o alvo: o destaque acompanha.
    useEffect(() => {
        if (!alvo) return;

        const atualizar = () => {
            const el = document.querySelector<HTMLElement>(
                `[data-tour="${alvo}"]`,
            );
            if (el) setCaixa(caixaDoElemento(el));
        };

        window.addEventListener('scroll', atualizar, true);
        window.addEventListener('resize', atualizar);

        return () => {
            window.removeEventListener('scroll', atualizar, true);
            window.removeEventListener('resize', atualizar);
        };
    }, [alvo]);

    useLayoutEffect(() => {
        const medido = cartaoRef.current?.offsetHeight;
        if (medido && Math.abs(medido - altura) > 1) setAltura(medido);
    }, [caixa, indice, altura]);

    useEffect(() => {
        if (!ativo) return;

        const anteriorFocado = document.activeElement as HTMLElement | null;

        return () => anteriorFocado?.focus?.();
    }, [ativo]);

    useEffect(() => {
        if (!ativo) return;

        const quadro = window.requestAnimationFrame(() =>
            cartaoRef.current?.focus(),
        );

        return () => window.cancelAnimationFrame(quadro);
    }, [ativo, indice]);

    useEffect(() => {
        if (!ativo) return;

        const aoEscapar = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            sair();
        };

        window.addEventListener('keydown', aoEscapar);

        return () => window.removeEventListener('keydown', aoEscapar);
    }, [ativo, sair]);

    const aoTeclar = useCallback(
        (e: ReactKeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                sair();

                return;
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                proximo();

                return;
            }

            if (e.key === 'ArrowLeft' && !primeiro) {
                e.preventDefault();
                anterior();

                return;
            }

            if (e.key !== 'Tab') return;

            const focaveis = cartaoRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href]',
            );
            if (!focaveis || focaveis.length === 0) return;

            const primeiroFocavel = focaveis[0];
            const ultimoFocavel = focaveis[focaveis.length - 1];

            if (e.shiftKey && document.activeElement === primeiroFocavel) {
                e.preventDefault();
                ultimoFocavel.focus();
            } else if (
                !e.shiftKey &&
                document.activeElement === ultimoFocavel
            ) {
                e.preventDefault();
                primeiroFocavel.focus();
            }
        },
        [anterior, primeiro, proximo, sair],
    );

    if (!ativo || !passo || !estado || typeof document === 'undefined') {
        return null;
    }

    const posicao = caixa && !isMobile ? posicaoDoCartao(caixa, altura) : null;
    const noTopo =
        isMobile &&
        caixa !== null &&
        caixa.top + caixa.height / 2 > window.innerHeight / 2;
    const percentual = total > 0 ? ((indice + 1) / total) * 100 : 0;

    return createPortal(
        <div className="fixed inset-0 z-[90]">
            <div
                aria-hidden="true"
                className={`absolute inset-0 ${caixa ? '' : 'bg-[#090D14]/60'}`}
                onMouseDown={(e) => e.preventDefault()}
            />

            {caixa && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-2xl ring-2 ring-white/90 transition-all duration-150 motion-reduce:transition-none"
                    style={{
                        top: caixa.top - 6,
                        left: caixa.left - 6,
                        width: caixa.width + 12,
                        height: caixa.height + 12,
                        boxShadow: '0 0 0 9999px rgba(9, 13, 20, 0.62)',
                    }}
                />
            )}

            <div
                className={
                    posicao
                        ? 'fixed'
                        : isMobile
                          ? `fixed inset-x-3 ${noTopo ? 'top-3' : 'bottom-3'} flex max-h-[70vh] flex-col overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl`
                          : 'fixed inset-0 flex items-center justify-center p-6'
                }
                style={posicao ?? undefined}
            >
                <div
                    ref={cartaoRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tour-titulo"
                    aria-describedby="tour-texto"
                    tabIndex={-1}
                    onKeyDown={aoTeclar}
                    className={
                        posicao
                            ? 'max-h-[72vh] overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl outline-none'
                            : isMobile
                              ? 'outline-none'
                              : 'max-h-[80vh] w-[min(420px,calc(100vw-3rem))] overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl outline-none'
                    }
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent-foreground uppercase">
                            {passo.capitulo}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                {indice + 1} de {total}
                            </span>
                            <button
                                type="button"
                                onClick={sair}
                                aria-label="Fechar o tour"
                                className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div
                        aria-hidden="true"
                        className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                            style={{ width: `${percentual}%` }}
                        />
                    </div>

                    <h2
                        id="tour-titulo"
                        className="mt-3 text-[17px] leading-snug font-semibold"
                    >
                        {passo.titulo}
                    </h2>
                    <div
                        id="tour-texto"
                        className="mt-2 grid gap-2.5 text-sm leading-relaxed text-[#3B4250]"
                    >
                        {passo.texto}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                        <button
                            type="button"
                            onClick={sair}
                            className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                        >
                            Sair do tour
                        </button>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10"
                                onClick={anterior}
                                disabled={primeiro}
                            >
                                <ChevronLeft className="size-4" />
                                Voltar
                            </Button>
                            <Button
                                type="button"
                                className="h-10"
                                onClick={proximo}
                            >
                                {ultimo ? 'Concluir' : 'Próximo'}
                                {!ultimo && <ChevronRight className="size-4" />}
                            </Button>
                        </div>
                    </div>

                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Use ← e → para navegar e Esc para sair.
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    );
}
