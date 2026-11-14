import { describe, expect, it } from "vitest";
import type { LlmProvider } from "../../src/orchestrator/lib/llmClient.js";
import { buildEndCardArgs } from "../../src/orchestrator/edit/endCard.js";
import { opcoesDoKit } from "../../src/worker/jobs/editarVideo.js";
import { buildPersonasPrompt, sugerirPersonas } from "../../src/worker/jobs/sugerirPersonas.js";

const payload = {
  cliente_id: 1,
  briefing: { nicho: "Otorrinolaringologia", objetivo: "Agendar consultas", oferta: "Consulta", regiao: "Centro", tom_voz: "Acolhedor", temas_proibidos: "preço", tags: ["ronco"], profissao: null, conselho: "CFM" },
  catalogo: [{ id: 7, nome: "Mãe ou pai de criança", descricao: "Otite de repetição", quem_decide: "A mãe" }],
};

function provedor(resposta: unknown): { provider: LlmProvider; prompts: string[] } {
  const prompts: string[] = [];
  const provider: LlmProvider = {
    name: "antigravity-cli",
    model: "falso",
    async completeJson(prompt) {
      prompts.push(prompt);
      return JSON.stringify(resposta);
    },
    async completeGroundedText() {
      throw new Error("não usado");
    },
  };
  return { provider, prompts };
}

const persona = (nome: string, parecida: number | null) => ({ nome, descricao: "Quem é a pessoa", dores: "Toda gripe vira dor de ouvido", quem_decide: "A mãe", linguagem: "Simples", parecida_com_id: parecida });

describe("sugerir_personas", () => {
  it("o prompt leva o briefing e o catálogo com os ids", () => {
    const p = buildPersonasPrompt(payload);
    expect(p).toContain("Otorrinolaringologia");
    expect(p).toContain("7: Mãe ou pai de criança");
    expect(p).toContain("Temas proibidos: preço");
  });

  it("só aceita parecida_com_id de persona do catálogo enviado", async () => {
    const { provider } = provedor({ personas: [persona("Pais de criança com dor de ouvido", 7), persona("Quem ronca", 99)] });
    const r = await sugerirPersonas(payload, () => undefined, { provider });
    expect(r.personas.map((x) => x.parecida_com_id)).toEqual([7, null]);
  });

  it("recusa payload sem briefing", async () => {
    await expect(sugerirPersonas({ cliente_id: 1 }, () => undefined, { provider: provedor({}).provider })).rejects.toThrow();
  });
});

describe("kit de marca na edição", () => {
  it("sem kit não muda nada", async () => {
    expect(await opcoesDoKit(null, "/m", () => undefined)).toEqual({});
  });

  it("cores, estilo, logo e vinheta viram opções da edição", async () => {
    const o = await opcoesDoKit(
      { logo: "marca/1/logo.png", logo_posicao: "bottom-left", cor_primaria: "#112233", cor_destaque: "#FF0000", cor_texto: "#FFFFFF", fonte_titulos: "montserrat", estilo_legenda: "impacto", vinheta: "marca/1/v.mp4" },
      "/m",
      () => undefined,
    );
    expect(o.captions?.color).toBe("#FF0000");
    expect(o.captionStyle).toBe("impacto");
    expect(o.endCard).toEqual({ background: "#112233", color: "#FFFFFF", accent: "#FF0000", font: null });
    expect(o.watermark).toEqual({ enabled: true, image: "/m/marca/1/logo.png", position: "bottom-left" });
    expect(o.intro).toBe("/m/marca/1/v.mp4");
  });

  it("kit sem logo desliga a marca d'água", async () => {
    expect((await opcoesDoKit({ logo: null }, "/m", () => undefined)).watermark).toEqual({ enabled: false });
  });

  it("vinheta sem som entra com silêncio do mesmo tamanho; com som, usa o dela", () => {
    const muda = buildEndCardArgs("/r/e.mp4", "/r/c.png", "/r/f.mp4", 3, "30/1", { path: "/m/v.mp4", seconds: 2.5, hasAudio: false });
    const grafoMudo = muda[muda.indexOf("-filter_complex") + 1] as string;
    expect(muda).toContain("/m/v.mp4");
    expect(muda.join(" ")).toContain("-t 2.5 -i anullsrc");
    expect(grafoMudo).toContain("[vi][4:a][v0][a0][v1][2:a]concat=n=3:v=1:a=1");

    const comSom = buildEndCardArgs("/r/e.mp4", "/r/c.png", "/r/f.mp4", 3, "30/1", { path: "/m/v.mp4", seconds: 2.5, hasAudio: true });
    const grafo = comSom[comSom.indexOf("-filter_complex") + 1] as string;
    expect(grafo).toContain("[3:a]aresample");
    expect(grafo).toContain("[vi][ai][v0][a0][v1][2:a]concat=n=3");
    expect(grafo).not.toMatch(/\b(fps|pad|setsar)=/);
  });
});
