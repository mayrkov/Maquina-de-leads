/** Estados do vídeo na produção (app/app/Domains/Videos/Models/Video.php) e como as telas os mostram. */
export type StatusVideo =
    | 'enviado'
    | 'analisando'
    | 'formulario'
    | 'aguardando_edicao'
    | 'editado'
    | 'aprovado'
    | 'confirmado'
    | 'publicado'
    | 'descartado'
    | 'falhou';

export const ROTULO_STATUS: Record<StatusVideo, string> = {
    enviado: 'Take enviado',
    analisando: 'IA analisando o vídeo…',
    formulario: 'Formulário pronto para revisão',
    aguardando_edicao: 'Editando…',
    editado: 'Editado: aprovar',
    aprovado: 'Aguardando o médico',
    confirmado: 'Pronto para publicar',
    publicado: 'Publicado',
    descartado: 'Descartado',
    falhou: 'Falhou',
};

export const CLASSE_STATUS: Record<StatusVideo, string> = {
    enviado: 'bg-muted text-muted-foreground',
    analisando: 'bg-accent text-accent-foreground',
    formulario: 'bg-[#FCF1E4] text-[#7A3D08]',
    aguardando_edicao: 'bg-accent text-accent-foreground',
    editado: 'bg-[#FCF1E4] text-[#7A3D08]',
    aprovado: 'bg-[#FCF1E4] text-[#7A3D08]',
    confirmado: 'bg-[#E7F4EC] text-[#1F7A4D]',
    publicado: 'bg-[#E7F4EC] text-[#1F7A4D]',
    descartado: 'bg-muted text-muted-foreground',
    falhou: 'bg-[#FDECEC] text-[#8A1C1C]',
};

/** "01:05" a partir de segundos. */
export const tempo = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
