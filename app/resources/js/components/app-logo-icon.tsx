import type { SVGAttributes } from 'react';

/** Marca da Máquina de Leads: um pulso (canva, tela 01). */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
    );
}
