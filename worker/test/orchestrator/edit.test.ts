import { describe, expect, it } from "vitest";
import type { TranscriptWord } from "../../src/orchestrator/cuts/transcribe.js";
import { disfluencyCuts, isFiller, subtractIntervals } from "../../src/orchestrator/edit/disfluency.js";
import { buildEndCardArgs, defaultCta, parseFrameRate } from "../../src/orchestrator/edit/endCard.js";
import { normalizeKeyword, planEdit } from "../../src/orchestrator/edit/pipeline.js";

/** Palavras em sequência, 0,3 s cada, com 0,1 s entre elas. */
function words(text: string, start = 0): TranscriptWord[] {
  return text.split(" ").map((word, i) => ({ word, start: start + i * 0.4, end: start + i * 0.4 + 0.3 }));
}

describe("gaguejo e repetição", () => {
  it("reconhece hesitação pura e deixa palavras com sentido", () => {
    for (const w of ["hã", "Hum,", "éé", "ééé...", "hmm"]) expect(isFiller(w)).toBe(true);
    for (const w of ["é", "tipo", "né", "humano", "ouvido"]) expect(isFiller(w)).toBe(false);
  });

  it("corta a hesitação do início dela até a próxima palavra", () => {
    const w = words("a otite hã atinge crianças");
    expect(disfluencyCuts(w)).toEqual([[0.8, 1.2]]);
  });

  it("corta a primeira de duas palavras repetidas e a primeira tentativa de uma frase recomeçada", () => {
    expect(disfluencyCuts(words("o o ronco"))).toEqual([[0, 0.4]]);
    // "eu acho eu acho que": sai o primeiro "eu acho" (0 a 0,8), fica "eu acho que".
    expect(disfluencyCuts(words("eu acho eu acho que é rinite"))).toEqual([[0, 0.8]]);
  });

  it("não junta repetições separadas por pausa longa nem frases diferentes", () => {
    const w = [...words("muito"), ...words("muito bom", 2)];
    expect(disfluencyCuts(w)).toEqual([]);
    expect(disfluencyCuts(words("a dor no ouvido passa"))).toEqual([]);
  });

  it("subtrai os cortes dos trechos mantidos e descarta pedaços curtos demais", () => {
    expect(subtractIntervals([[0, 10]], [[2, 3], [5, 6]])).toEqual([[0, 2], [3, 5], [6, 10]]);
    expect(subtractIntervals([[0, 2], [4, 10]], [[1.95, 4.5]])).toEqual([[0, 1.95], [4.5, 10]]);
    expect(subtractIntervals([[0, 10]], [[0.05, 3]])).toEqual([[3, 10]]);
  });
});

describe("plano de edição", () => {
  it("junta pausas mortas e gaguejos e nunca corta a fala que fica", () => {
    const w = [...words("o o ronco"), ...words("atrapalha o sono", 3)];
    const { keep, cuts, duration } = planEdit({ segments: [], words: w, duration: 5 });
    expect(duration).toBe(5);
    expect(cuts).toEqual([[0, 0.4]]);
    expect(keep[0]?.[0]).toBe(0.4);
    for (const word of w.slice(1)) expect(keep.some(([a, b]) => a <= word.start && b >= word.end)).toBe(true);
  });

  it("tira os trechos cortados no formulário de edição", () => {
    const w = [...words("ok gravando"), ...words("o ronco atrapalha", 2)];
    const { keep } = planEdit({ segments: [], words: w, duration: 4 }, [[0, 1]]);
    expect(keep[0]?.[0]).toBeGreaterThanOrEqual(1);
    expect(keep.some(([a, b]) => a <= 2 && b >= 2.3)).toBe(true);
  });

  it("recusa transcrição vazia", () => {
    expect(() => planEdit({ segments: [], words: [] })).toThrow(/áudio/);
  });
});

describe("tela final", () => {
  it("palavra-chave: uma palavra, em maiúsculas", () => {
    expect(normalizeKeyword(" ouvido ")).toBe("OUVIDO");
    expect(() => normalizeKeyword("dor de ouvido")).toThrow(/uma palavra/);
    expect(defaultCta("ronco")).toContain("RONCO");
  });

  it("lê a taxa de quadros do ffprobe", () => {
    expect(parseFrameRate("30/1\n")).toBe("30/1");
    expect(parseFrameRate("30000/1001")).toBe("30000/1001");
    expect(parseFrameRate("0/0")).toBeNull();
    expect(parseFrameRate("")).toBeNull();
  });

  it("emenda vídeo, imagem e silêncio só com filtros do ffmpeg do Remotion", () => {
    const args = buildEndCardArgs("/r/edited.mp4", "/r/card.png", "/r/final.mp4", 3, "30000/1001");
    expect(args.at(-1)).toBe("/r/final.mp4");
    expect(args.slice(args.indexOf("-framerate"), args.indexOf("-framerate") + 2)).toEqual(["-framerate", "30000/1001"]);
    expect(args[args.indexOf("-r") + 1]).toBe("30000/1001");
    const graph = args[args.indexOf("-filter_complex") + 1] as string;
    expect(graph).toContain("concat=n=2:v=1:a=1");
    expect(graph).not.toMatch(/\b(fps|pad|setsar)=/);
  });
});
