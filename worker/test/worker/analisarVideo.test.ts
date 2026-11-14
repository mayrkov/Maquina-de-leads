import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Transcript } from "../../src/orchestrator/cuts/transcribe.js";
import type { LlmProvider } from "../../src/orchestrator/lib/llmClient.js";
import { analisarVideo, buildAnalisePrompt, normalizarPalavra, PayloadAnalisarVideoSchema } from "../../src/worker/jobs/analisarVideo.js";

const briefing = { nicho: "Otorrinolaringologia", objetivo: "Agendar consultas", oferta: "Consulta", regiao: "Centro", tom_voz: "Acolhedor", temas_proibidos: null, tags: [], profissao: "Médico", conselho: "CFM" };
const regras = { promessa: "Sem promessa de cura" };
const payload = { video_id: 3, arquivo_bruto: "brutos/1/a.mp4", transcricao: "transcricoes/1/3.json", briefing, regras, roteiro: null };

const transcricao: Transcript = {
  segments: [
    { start: 0, end: 4.5, text: " Ok, gravando? Vamos lá." },
    { start: 6, end: 9, text: " Espirra toda manhã há anos?" },
    { start: 9.5, end: 14, text: " A rinite tem controle." },
    { start: 14.2, end: 18, text: " Comenta NARIZ que eu te explico." },
  ],
  words: [],
};

const formulario = (extra: Record<string, unknown> = {}) => ({
  tema: "Rinite crônica",
  persona: "Adulto com rinite",
  gancho: { trecho: 1, texto: "Espirra toda manhã há anos?" },
  cortar: [0],
  destaques: ["anos", "Controle"],
  cta: "Comenta NARIZ que eu te explico",
  palavra_chave: "nariz",
  legenda: "Rinite não precisa ser para sempre do mesmo jeito. Comenta NARIZ.",
  ...extra,
});

/** IA falsa: devolve as respostas na ordem e guarda os prompts. */
function ia(respostas: unknown[]) {
  const prompts: string[] = [];
  const provider: LlmProvider = {
    name: "antigravity-cli",
    model: "falso",
    async completeJson(prompt) {
      prompts.push(prompt);
      return JSON.stringify(respostas.shift());
    },
    async completeGroundedText() {
      throw new Error("sem busca");
    },
  };
  return { provider, prompts };
}

describe("analisar_video", () => {
  it("transcreve na chave pedida e devolve trechos e o formulário com o início do gancho", async () => {
    const root = mkdtempSync(join(tmpdir(), "midia-"));
    let destino = "";
    const { provider, prompts } = ia([formulario()]);
    const r = await analisarVideo(payload, root, () => undefined, { provider }, async (_v, out) => {
      destino = out;
      return transcricao;
    });

    expect(destino).toBe(join(root, "transcricoes/1/3.json"));
    expect(r.trechos).toHaveLength(4);
    expect(r.trechos[0]).toEqual({ inicio: 0, fim: 4.5, texto: "Ok, gravando? Vamos lá." });
    expect(r.formulario).toMatchObject({ palavra_chave: "NARIZ", cortar: [0], destaques: ["anos", "controle"], gancho: { trecho: 1, inicio: 6 } });
    expect(prompts[0]).toContain("[1] 00:06–00:09 Espirra toda manhã há anos?");
    expect(prompts[0]).toContain("sem roteiro do sistema");
  });

  it("pede correção quando a IA corta tudo, destaca palavra não falada ou esquece a palavra-chave na chamada", async () => {
    const { provider, prompts } = ia([formulario({ cortar: [0, 1, 2, 3], destaques: ["sinusite"], cta: "Comenta aqui" }), formulario()]);
    const r = await analisarVideo(payload, mkdtempSync(join(tmpdir(), "midia-")), () => undefined, { provider }, async () => transcricao);

    expect(r.formulario.destaques).toEqual(["anos", "controle"]);
    expect(prompts[1]).toMatch(/sinusite/);
    expect(prompts[1]).toMatch(/palavra-chave/);
  });

  it("com roteiro, o prompt manda copiar tema, persona, chamada e palavra-chave", () => {
    const comRoteiro = PayloadAnalisarVideoSchema.parse({ ...payload, roteiro: { tema: "Adenoide", persona: "Mãe", gancho: "Dorme de boca aberta?", desenvolvimento: "Texto", cta: "Comenta OUVIDO", palavra_chave: "OUVIDO" } });
    const prompt = buildAnalisePrompt(comRoteiro, [{ inicio: 0, fim: 2, texto: "Oi" }]);
    expect(prompt).toContain("Copie do roteiro");
    expect(prompt).toContain("Palavra-chave: OUVIDO");
    expect(prompt).not.toContain("CRM 1");
  });

  it("vídeo sem fala falha; chave fora da pasta de mídia é recusada", async () => {
    const { provider } = ia([]);
    await expect(analisarVideo(payload, mkdtempSync(join(tmpdir(), "midia-")), () => undefined, { provider }, async () => ({ segments: [], words: [] }))).rejects.toThrow(/fala/);
    await expect(analisarVideo({ ...payload, transcricao: "../x.json" }, mkdtempSync(join(tmpdir(), "midia-")), () => undefined, { provider }, async () => transcricao)).rejects.toThrow(/inválida/);
  });

  it("palavra comparada como na legenda", () => {
    expect(normalizarPalavra("“Anos?”")).toBe("anos");
  });
});
