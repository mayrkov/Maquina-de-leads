/**
 * Edição do vídeo cru do cliente (RF16 a RF23): transcrição -> corte de pausas, gaguejo e repetição ->
 * reenquadramento 9:16 com legenda e marca -> tela final com a palavra-chave -> render_output/<runId>/final.mp4.
 * Nada é publicado: o vídeo segue para a aprovação humana (RN01).
 *
 * Retomada (RF46): cada etapa deixa um arquivo na pasta da execução (transcript.json, edited.mp4, final.mp4);
 * com `runId` de uma execução existente, as etapas já feitas são puladas (a tarefa que volta para a fila retoma daqui).
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { planKeep, keptSeconds } from "../cuts/jumpcut.js";
import { renderClips, type CaptionSettings, type CaptionStyle, type Framing } from "../cuts/render.js";
import { transcribeVideo, type Transcript } from "../cuts/transcribe.js";
import { generateRunId, loadRunContext, runDirFor, saveRunContext } from "../lib/runContext.js";
import type { WatermarkSettings } from "../../shared/settings.js";
import type { RawEditInfo, RunContext } from "../types.js";
import { disfluencyCuts, subtractIntervals } from "./disfluency.js";
import { appendEndCard, DEFAULT_END_CARD_LOOK, defaultCta, OUT_H, OUT_W, probeMedia, type EndCardLook } from "./endCard.js";

export const TRANSCRIPT_FILE = "transcript.json";
export const EDITED_FILE = "edited.mp4";
export const FINAL_FILE = "final.mp4";
export const END_CARD_SECONDS = 3;
/** Até o kit de marca existir (RF15): legenda de 3 palavras com destaque amarelo. */
export const DEFAULT_CAPTIONS: CaptionSettings = { wordsPerCue: 3, color: "#FFE11A" };

export interface EditOptions {
  source: string;
  keyword: string;
  cta?: string;
  framing?: Framing;
  captions?: CaptionSettings;
  captionStyle?: CaptionStyle;
  endCard?: EndCardLook;
  /** Marca d'água (logo do kit de marca); absent = a de config/pipeline.config.json. */
  watermark?: WatermarkSettings;
  /** Vinheta de abertura (vídeo) posta antes da fala. */
  intro?: string;
  /** Retoma esta execução em vez de criar outra. */
  runId?: string;
  /** Transcrição já feita (a análise do formulário de edição): usada no lugar de transcrever de novo. */
  transcript?: string;
  /** Trechos cortados no formulário de edição (RF52), somados aos cortes de pausa e gaguejo. */
  extraCuts?: [number, number][];
  /** Avisado no começo de cada etapa (o worker grava em tarefas_midia.etapa para a tela acompanhar). */
  onStage?: (etapa: EtapaEdicao) => void;
}

/** Etapas da edição, na ordem (tela "Edição automática" do painel). */
export const ETAPAS_EDICAO = ["transcricao", "cortes", "legenda", "tela_final"] as const;
export type EtapaEdicao = (typeof ETAPAS_EDICAO)[number];

/** Palavra-chave do comentário: uma palavra, letras e números (é o que o bot vai procurar no comentário). */
export function normalizeKeyword(raw: string): string {
  const keyword = raw.trim().toUpperCase();
  if (!/^[\p{L}\p{N}]{2,30}$/u.test(keyword)) throw new Error(`Palavra-chave inválida "${raw}": use uma palavra só, sem espaços (ex.: OUVIDO)`);
  return keyword;
}

export function sourceDuration(transcript: Transcript): number {
  return transcript.duration ?? transcript.words.at(-1)?.end ?? 0;
}

/** O que fica do vídeo: tudo, menos pausas mortas (jumpcut), gaguejos/repetições e os trechos cortados no formulário. */
export function planEdit(transcript: Transcript, extraCuts: readonly [number, number][] = []): { keep: [number, number][]; cuts: [number, number][]; duration: number } {
  const duration = sourceDuration(transcript);
  if (duration <= 0) throw new Error("A transcrição não tem duração nem palavras: o vídeo tem áudio?");
  const cuts = disfluencyCuts(transcript.words);
  const keep = subtractIntervals(
    planKeep(transcript.words, transcript.loudness, 0, duration),
    [...cuts, ...extraCuts].sort((a, b) => a[0] - b[0]),
  );
  if (keep.length === 0) throw new Error("Depois dos cortes não sobrou nada do vídeo");
  return { keep, cuts, duration };
}

/** Retoma a execução `runId` se ela existe; senão cria uma (com esse id, quando dado: o worker usa um por tarefa). */
async function startRun(runId: string | undefined): Promise<RunContext> {
  if (runId && existsSync(join(runDirFor(runId), "context.json"))) return loadRunContext(runId);
  const id = runId ?? generateRunId();
  const ctx: RunContext = { runId: id, runDir: runDirFor(id), createdAt: new Date().toISOString() };
  await mkdir(ctx.runDir, { recursive: true });
  await saveRunContext(ctx);
  return ctx;
}

export async function editRawVideo(options: EditOptions, log: (m: string) => void): Promise<RunContext> {
  const source = resolve(options.source);
  if (!existsSync(source)) throw new Error(`Vídeo não encontrado: ${source}`);
  const keyword = normalizeKeyword(options.keyword);
  const cta = options.cta?.trim() || defaultCta(keyword);
  const framing = options.framing ?? "face";
  const ctx = await startRun(options.runId);
  log(`execução ${ctx.runId} em ${ctx.runDir}`);

  const etapa = options.onStage ?? (() => undefined);
  etapa("transcricao");
  const transcript = await transcribeVideo(source, options.transcript ?? join(ctx.runDir, TRANSCRIPT_FILE), log);
  etapa("cortes");
  const { keep, cuts, duration } = planEdit(transcript, options.extraCuts);
  log(`${keep.length} trecho(s), ${keptSeconds(keep)} s de ${duration.toFixed(1)} s; ${cuts.length} gaguejo(s)/repetição(ões) cortado(s)`);

  const edited = join(ctx.runDir, EDITED_FILE);
  etapa("legenda");
  if (existsSync(edited)) {
    log(`${EDITED_FILE} já existe: render pulado`);
  } else {
    await renderClips(
      { source, framing, captions: options.captions ?? DEFAULT_CAPTIONS, captionStyle: options.captionStyle, watermark: options.watermark, jobs: [{ start: 0, end: duration, keep, out: edited, words: transcript.words }] },
      log,
    );
  }

  const final = join(ctx.runDir, FINAL_FILE);
  etapa("tela_final");
  if (!existsSync(final)) await appendEndCard(edited, final, ctx.runDir, { keyword, cta, seconds: END_CARD_SECONDS, look: options.endCard ?? DEFAULT_END_CARD_LOOK, intro: options.intro }, log);

  const edit: RawEditInfo = { source, keyword, cta, framing, sourceSeconds: duration, keptSeconds: keptSeconds(keep), disfluencyCuts: cuts, endCardSeconds: END_CARD_SECONDS };
  const done: RunContext = {
    ...ctx,
    edit,
    // Medida no arquivo: inclui a vinheta, quando há.
    render: { videoPath: final, durationSeconds: Number((await probeMedia(final)).seconds.toFixed(3)), width: OUT_W, height: OUT_H },
  };
  await saveRunContext(done);
  log(`pronto: ${final} (não publicado; segue para aprovação)`);
  return done;
}
