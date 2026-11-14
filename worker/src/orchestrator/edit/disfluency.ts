/**
 * Gaguejo e repetição (RF18): trechos da fala que a edição corta além das pausas mortas (cuts/jumpcut.ts).
 *   - hesitação pura ("hã", "hum", "éé"): sempre sai;
 *   - palavra repetida em seguida ("o o", "que que"): sai a primeira;
 *   - frase recomeçada (2 a 4 palavras ditas de novo logo em seguida: "eu acho eu acho que"): sai a primeira tentativa.
 * shortcut: "é", "tipo" e "né" ficam, porque também são palavras com sentido ("isso é", "que tipo");
 * cortar só quando a hesitação vier marcada (ex.: pausa longa dos dois lados) se a produção pedir.
 */
import type { Interval } from "../cuts/jumpcut.js";
import type { TranscriptWord } from "../cuts/transcribe.js";

/** Hesitações sem sentido próprio (já normalizadas). */
const FILLERS = new Set(["hã", "ãh", "ah", "ahn", "hum", "hmm", "humm", "uh", "uhm", "eh", "ehh"]);
/** "éé", "ééé", "hããã": a mesma letra esticada é hesitação, não palavra. */
const STRETCHED = /^(é|e|ã|a|h|m)\1+$|^h[ãa]{2,}$|^hu?m{2,}$/;
const MAX_RESTART_WORDS = 4;
/** Duas ocorrências separadas por mais que isso já são escolha de estilo, não gaguejo. */
const MAX_GAP_SECONDS = 1.0;
/** Trechos removidos mais curtos que isso não valem o corte (vira só um tranco na imagem). */
const MIN_CUT_SECONDS = 0.08;

export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isFiller(word: string): boolean {
  const w = normalizeWord(word);
  return w.length > 0 && (FILLERS.has(w) || STRETCHED.test(w));
}

function sameRun(words: readonly string[], a: number, b: number, n: number): boolean {
  for (let k = 0; k < n; k++) if (words[a + k] !== words[b + k]) return false;
  return true;
}

/**
 * Intervalos (segundos absolutos, ordenados, sem sobreposição) a remover. Cada corte vai do início da palavra
 * descartada até o início da palavra que fica, então a fala que fica nunca é tocada.
 */
export function disfluencyCuts(words: readonly TranscriptWord[]): Interval[] {
  const spoken = words.filter((w) => normalizeWord(w.word).length > 0);
  const norm = spoken.map((w) => normalizeWord(w.word));
  const drop = new Array<boolean>(spoken.length).fill(false);

  spoken.forEach((w, i) => {
    if (isFiller(w.word)) drop[i] = true;
  });
  for (let i = 0; i < spoken.length; i++) {
    if (drop[i]) continue;
    // A maior repetição primeiro: "eu acho eu acho" é um recomeço de 2, não duas palavras soltas.
    for (let n = MAX_RESTART_WORDS; n >= 1; n--) {
      const j = i + n;
      if (j + n > spoken.length) continue;
      if (!sameRun(norm, i, j, n)) continue;
      if ((spoken[j] as TranscriptWord).start - (spoken[j - 1] as TranscriptWord).end > MAX_GAP_SECONDS) continue;
      for (let k = i; k < j; k++) drop[k] = true;
      i = j - 1;
      break;
    }
  }

  const cuts: Interval[] = [];
  for (let i = 0; i < spoken.length; i++) {
    if (!drop[i]) continue;
    const from = (spoken[i] as TranscriptWord).start;
    let last = i;
    while (last + 1 < spoken.length && drop[last + 1]) last++;
    const next = spoken[last + 1];
    const to = next ? next.start : (spoken[last] as TranscriptWord).end;
    if (to - from >= MIN_CUT_SECONDS) cuts.push([round(from), round(to)]);
    i = last;
  }
  return cuts;
}

/** `keep` menos `cuts` (ambos ordenados); descarta pedaços menores que `minPiece` segundos. */
export function subtractIntervals(keep: readonly Interval[], cuts: readonly Interval[], minPiece = 0.12): Interval[] {
  const out: Interval[] = [];
  for (const [a, b] of keep) {
    let cursor = a;
    for (const [c, d] of cuts) {
      if (d <= cursor || c >= b) continue;
      if (c - cursor >= minPiece) out.push([round(cursor), round(c)]);
      cursor = Math.max(cursor, d);
    }
    if (b - cursor >= minPiece) out.push([round(cursor), round(b)]);
  }
  return out;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;
