/** Tarefa editar_video: edita o vídeo bruto (edit/pipeline.ts) e grava o resultado na chave pedida pelo Laravel. */
import { copyFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { ANTON, ensureModelFile } from "../../orchestrator/cuts/render.js";
import { DEFAULT_END_CARD_LOOK } from "../../orchestrator/edit/endCard.js";
import { DEFAULT_CAPTIONS, editRawVideo, type EditOptions, type EtapaEdicao } from "../../orchestrator/edit/pipeline.js";
import { WATERMARK_POSITIONS } from "../../shared/settings.js";
import { caminhoDaChave } from "../midia.js";

const cor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Kit de marca do cliente no momento do envio (app/app/Domains/Marca/Models/KitMarca.php, paraTarefa). */
export const KitSchema = z.object({
  logo: z.string().min(1).nullable().optional(),
  logo_posicao: z.enum(WATERMARK_POSITIONS).optional(),
  cor_primaria: cor.optional(),
  cor_destaque: cor.optional(),
  cor_texto: cor.optional(),
  fonte_titulos: z.enum(["montserrat", "anton"]).optional(),
  estilo_legenda: z.enum(["padrao", "impacto"]).optional(),
  vinheta: z.string().min(1).nullable().optional(),
});
export type Kit = z.infer<typeof KitSchema>;

export const PayloadEditarVideoSchema = z.object({
  video_id: z.number().int().positive(),
  arquivo_bruto: z.string().min(1),
  arquivo_editado: z.string().min(1),
  palavra_chave: z.string().min(1),
  cta: z.string().nullable().optional(),
  kit: KitSchema.nullable().optional(),
  // Formulário de edição revisado (RF52): transcrição da análise, trechos cortados e palavras de destaque.
  transcricao: z.string().min(1).nullable().optional(),
  cortes: z.array(z.tuple([z.number().nonnegative(), z.number().nonnegative()]).refine(([a, b]) => b > a)).max(300).optional(),
  destaques: z.array(z.string().min(1).max(30)).max(10).optional(),
});

/** Opções da edição a partir do kit: legenda, marca d'água (logo), tela final e vinheta. */
export async function opcoesDoKit(kit: Kit | null | undefined, root: string, log: (m: string) => void): Promise<Partial<EditOptions>> {
  if (!kit) return {};
  const fonteTitulos = kit.fonte_titulos === "anton" ? await ensureModelFile(ANTON, fetch, log).catch(() => null) : null;
  return {
    captions: { ...DEFAULT_CAPTIONS, color: kit.cor_destaque ?? DEFAULT_CAPTIONS.color },
    captionStyle: kit.estilo_legenda,
    endCard: {
      background: kit.cor_primaria ?? DEFAULT_END_CARD_LOOK.background,
      color: kit.cor_texto ?? DEFAULT_END_CARD_LOOK.color,
      accent: kit.cor_destaque ?? DEFAULT_END_CARD_LOOK.accent,
      font: fonteTitulos,
    },
    // Sem logo no kit: nenhuma marca (a de config/ é do worker, não do cliente).
    watermark: kit.logo ? { enabled: true, image: caminhoDaChave(root, kit.logo), position: kit.logo_posicao ?? "top-right" } : { enabled: false },
    intro: kit.vinheta ? caminhoDaChave(root, kit.vinheta) : undefined,
  };
}

export interface ResultadoEdicao extends Record<string, unknown> {
  arquivo_editado: string;
  duracao_segundos: number;
}

export async function editarVideo(
  tarefaId: number,
  payload: unknown,
  root: string,
  log: (m: string) => void,
  editar: typeof editRawVideo = editRawVideo,
  etapa?: (nome: EtapaEdicao) => void,
): Promise<ResultadoEdicao> {
  const p = PayloadEditarVideoSchema.parse(payload);
  const origem = caminhoDaChave(root, p.arquivo_bruto);
  const destino = caminhoDaChave(root, p.arquivo_editado);

  // Um runId por tarefa: a nova tentativa retoma o que a anterior já fez (RF46) e não refaz a transcrição.
  const kit = await opcoesDoKit(p.kit, root, log);
  const ctx = await editar(
    {
      ...kit,
      captions: { ...(kit.captions ?? DEFAULT_CAPTIONS), emphasis: p.destaques?.length ? p.destaques : undefined },
      source: origem,
      keyword: p.palavra_chave,
      cta: p.cta ?? undefined,
      runId: `tarefa-${tarefaId}`,
      onStage: etapa,
      transcript: p.transcricao ? caminhoDaChave(root, p.transcricao) : undefined,
      extraCuts: p.cortes,
    },
    log,
  );
  if (!ctx.render) throw new Error("A edição terminou sem vídeo final");

  await mkdir(dirname(destino), { recursive: true });
  const temporario = `${destino}.tmp`;
  await copyFile(ctx.render.videoPath, temporario);
  await rename(temporario, destino);
  return { arquivo_editado: p.arquivo_editado, duracao_segundos: ctx.render.durationSeconds };
}
