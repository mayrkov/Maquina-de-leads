/**
 * Tela final (RF21): python/edit/end_card.py desenha o PNG (Pillow) e o ffmpeg emenda a imagem, com silêncio,
 * no fim do vídeo editado. A emenda reencoda tudo numa passada só (filtro concat), na taxa de quadros do vídeo.
 */
import { join } from "node:path";
import { z } from "zod";
import { resolveFfmpegBinaries, runBinary } from "../lib/ffmpeg.js";
import { runPythonJson } from "../lib/python.js";
import { ensureModelFile, MONTSERRAT, resolveCutsPython } from "../cuts/render.js";

export const OUT_W = 1080;
export const OUT_H = 1920;

export interface EndCardLook {
  /** Cor de fundo, texto da chamada e da palavra-chave (#RRGGBB). Virão do kit de marca. */
  background: string;
  color: string;
  accent: string;
  font: string | null;
}

export const DEFAULT_END_CARD_LOOK: EndCardLook = { background: "#111111", color: "#FFFFFF", accent: "#FFE11A", font: null };

export interface EndCardInput {
  keyword: string;
  cta: string;
  seconds: number;
  look: EndCardLook;
  /** Vinheta de abertura (kit de marca), posta antes do vídeo editado na mesma passada. */
  intro?: string;
}

/** Vinheta já sondada: duração (para o silêncio, quando ela não tem som) e se tem trilha de áudio. */
export interface IntroInfo {
  path: string;
  seconds: number;
  hasAudio: boolean;
}

/** Texto padrão da chamada (RF10/RF21): o vídeo pede o comentário com a palavra-chave. */
export function defaultCta(keyword: string): string {
  return `Comente ${keyword.toUpperCase()} que eu te explico como agendar`;
}

/**
 * Taxa do ffprobe ("30000/1001", "30") como o ffmpeg aceita, sem arredondar para decimal (que viraria
 * 979001/32666); null quando não é uma taxa válida.
 */
export function parseFrameRate(raw: string): string | null {
  const text = raw.trim();
  const [num, den] = text.split("/").map(Number);
  const rate = den === undefined ? (num as number) : (num as number) / den;
  return Number.isFinite(rate) && rate > 0 ? text : null;
}

/**
 * Argumentos do ffmpeg: [vinheta +] vídeo editado + PNG em loop por `seconds` + silêncio, concatenados numa passada.
 * Entradas: 0 vídeo, 1 cartão, 2 silêncio do cartão, 3 vinheta, 4 silêncio da vinheta (só quando ela não tem som).
 */
export function buildEndCardArgs(video: string, card: string, out: string, seconds: number, fps: string, intro?: IntroInfo): string[] {
  // O ffmpeg do Remotion não tem fps/pad/setsar: a taxa vem do -framerate da imagem e do -r da saída.
  const norm = `scale=${OUT_W}:${OUT_H},format=yuv420p`;
  const audio = "aresample=48000,aformat=channel_layouts=stereo";
  const inputs = [
    "-i", video,
    "-loop", "1", "-framerate", fps, "-t", String(seconds), "-i", card,
    "-f", "lavfi", "-t", String(seconds), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  ];
  let graph = `[0:v]${norm}[v0];[1:v]${norm}[v1];[0:a]${audio}[a0];`;
  let concat = "[v0][a0][v1][2:a]concat=n=2:v=1:a=1[v][a]";
  if (intro) {
    inputs.push("-i", intro.path);
    if (!intro.hasAudio) inputs.push("-f", "lavfi", "-t", String(intro.seconds), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    graph += `[3:v]${norm}[vi];${intro.hasAudio ? `[3:a]${audio}[ai];` : ""}`;
    concat = `[vi][${intro.hasAudio ? "ai" : "4:a"}][v0][a0][v1][2:a]concat=n=3:v=1:a=1[v][a]`;
  }
  return [
    "-y",
    ...inputs,
    "-filter_complex",
    graph + concat,
    "-map", "[v]", "-map", "[a]",
    "-r", fps,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    out,
  ];
}

/** Duração (s) e se o arquivo tem trilha de áudio, pelo ffprobe. */
export async function probeMedia(path: string): Promise<{ seconds: number; hasAudio: boolean }> {
  const { ffprobe } = resolveFfmpegBinaries();
  const { stdout } = await runBinary(ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", path]);
  const info = JSON.parse(stdout) as { format?: { duration?: string }; streams?: { codec_type?: string }[] };
  const seconds = Number(info.format?.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Arquivo de vídeo sem duração legível: ${path}`);
  return { seconds, hasAudio: (info.streams ?? []).some((st) => st.codec_type === "audio") };
}

async function probeFrameRate(video: string): Promise<string> {
  const { ffprobe } = resolveFfmpegBinaries();
  const { stdout } = await runBinary(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video]);
  return parseFrameRate(stdout) ?? "30";
}

/** Gera o PNG da tela final em `dir` e grava `out` = [vinheta +] `video` + tela final. */
export async function appendEndCard(video: string, out: string, dir: string, input: EndCardInput, log: (m: string) => void): Promise<void> {
  const card = join(dir, "end_card.png");
  // Mesma fonte das legendas; sem ela o Python cai na fonte do sistema.
  const font = input.look.font ?? (await ensureModelFile(MONTSERRAT, fetch, log).catch(() => null));
  await runPythonJson({
    script: "python/edit/end_card.py",
    python: resolveCutsPython(),
    stdin: { out: card, width: OUT_W, height: OUT_H, keyword: input.keyword, cta: input.cta, ...input.look, font },
    schema: z.object({ path: z.string() }),
    timeoutMs: 60_000,
    onStderrLine: log,
  });
  const fps = await probeFrameRate(video);
  const intro = input.intro ? { path: input.intro, ...(await probeMedia(input.intro)) } : undefined;
  const { ffmpeg } = resolveFfmpegBinaries();
  await runBinary(ffmpeg, buildEndCardArgs(video, card, out, input.seconds, fps, intro), 30 * 60 * 1000);
}
