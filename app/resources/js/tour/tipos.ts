import type { ReactNode } from 'react';

/** Um passo do tour: destaca um elemento real (`alvo` = data-tour) ou centraliza o card. */
export type Passo = {
    id: string;
    /** Nome do capítulo mostrado no card (ex.: "Produção"). */
    capitulo: string;
    titulo: string;
    texto: ReactNode;
    /** Valor de `data-tour` do elemento a destacar. Sem ele, o card fica no centro. */
    alvo?: string;
    /** Rota que o tour abre antes de mostrar o passo. */
    rota?: string;
};

export type Tour = {
    id: string;
    nome: string;
    passos: Passo[];
    /** Mostrado no menu de ajuda quando o tour é da tela atual. */
    daPagina?: boolean;
};
