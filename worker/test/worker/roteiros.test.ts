import { describe, expect, it } from "vitest";
import type { GroundedText, LlmProvider } from "../../src/orchestrator/lib/llmClient.js";
import { SearchUnsupportedError } from "../../src/orchestrator/lib/searchSupport.js";
import { checarConformidade, gerarRoteiros, problemasDoRoteiro, refazerRoteiro, type OpcoesIa } from "../../src/worker/jobs/roteiros.js";

const briefing = { nicho: "Otorrinolaringologia", objetivo: "Agendar consultas", oferta: "Consulta", regiao: "Centro", tom_voz: "Acolhedor", temas_proibidos: "preço", tags: ["ronco"], profissao: "Médico", conselho: "CFM" };
const regras = { promessa: "Sem promessa de cura", preco: "Sem preço" };

const payload = {
  cliente_id: 1,
  semana_inicio: "2026-11-16",
  quantidade: 2,
  briefing,
  catalogo: [{ id: 7, nome: "Mãe ou pai de criança", descricao: "Otite de repetição", quem_decide: "A mãe", dores: "Dor de ouvido" }],
  temas_recentes: ["Ronco"],
  regras,
};

const fala = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(" ");
const roteiro = (tema: string, palavra: string, personaId: number | null) => ({
  tema,
  titulo: `Título sobre ${tema}`,
  gancho: "Seu filho dorme de boca aberta?",
  desenvolvimento: fala(120),
  cta: `Comenta ${palavra} que eu te explico`,
  palavra_chave: palavra.toLowerCase(),
  objetivo: "agendar consulta",
  persona: { id: personaId, nome: "Mãe de criança", descricao: "Quem é a pessoa", dores: "Otite", quem_decide: "A mãe", linguagem: "Simples", parecida_com_id: 99 },
});
const conformidade = (fonte: string) => ({
  regras: [
    { id: "promessa", resultado: "ok", motivo: null },
    { id: "preco", resultado: "ok", motivo: null },
  ],
  fatos: [
    { afirmacao: "Adenoide aumentada causa respiração pela boca", veredito: "confirmada", correcao: null, fontes: [{ uri: fonte, title: "SBORL" }] },
  ],
});

/** IA falsa: devolve as respostas JSON na ordem e responde a busca com as fontes dadas (ou sem busca). */
function ia(jsons: unknown[], busca: GroundedText | "sem busca") {
  const prompts: string[] = [];
  const provider: LlmProvider = {
    name: "antigravity-cli",
    model: "falso",
    async completeJson(prompt) {
      prompts.push(prompt);
      return JSON.stringify(jsons.shift());
    },
    async completeGroundedText(prompt) {
      prompts.push(prompt);
      if (busca === "sem busca") throw new SearchUnsupportedError("falso");
      return busca;
    },
  };
  const opcoes: OpcoesIa = { roteiro: { provider }, conformidade: { provider } };
  return { opcoes, prompts };
}

const busca: GroundedText = { text: "Revisão: tudo certo.", sources: [{ uri: "https://sborl.org.br/adenoide", title: "SBORL" }], queries: [] };

describe("gerar_roteiros", () => {
  it("escreve os roteiros, limita persona ao catálogo e só aceita fontes da busca", async () => {
    const { opcoes, prompts } = ia(
      [
        { roteiros: [roteiro("Adenoide", "nariz", 7), roteiro("Zumbido", "zumbido", 42)] },
        { roteiros: [conformidade("https://sborl.org.br/adenoide"), conformidade("https://inventado.com/x")] },
      ],
      busca,
    );
    const r = await gerarRoteiros(payload, () => undefined, opcoes);

    expect(r.roteiros).toHaveLength(2);
    expect(r.roteiros[0].palavra_chave).toBe("NARIZ");
    expect(r.roteiros[0].persona.id).toBe(7);
    expect(r.roteiros[1].persona.id).toBeNull();
    expect(r.roteiros[1].persona.parecida_com_id).toBeNull();
    expect(r.roteiros[0].conformidade.pesquisou).toBe(true);
    expect(r.roteiros[0].conformidade.fatos[0].veredito).toBe("confirmada");
    // Link que não veio da busca sai, e o fato fica sem fonte.
    expect(r.roteiros[1].conformidade.fatos[0].fontes).toEqual([]);
    expect(r.roteiros[1].conformidade.fatos[0].veredito).toBe("sem_fonte");
    // O prompt leva os temas recentes, a pesquisa e as regras.
    const prompt = prompts.find((p) => p.includes("Escreva 2 roteiros")) ?? "";
    expect(prompt).toContain("Ronco");
    expect(prompt).toContain("Revisão: tudo certo.");
    expect(prompt).toContain("promessa: Sem promessa de cura");
  });

  it("recusa tema recente, palavra-chave repetida e fala curta, e pede correção", async () => {
    const curto = { ...roteiro("Zumbido", "nariz", null), desenvolvimento: "Curto demais para um vídeo de verdade." };
    const { opcoes, prompts } = ia(
      [
        { roteiros: [roteiro("ronco", "nariz", null), curto] },
        { roteiros: [roteiro("Adenoide", "nariz", null), roteiro("Zumbido", "zumbido", null)] },
        { roteiros: [conformidade("https://sborl.org.br/adenoide"), conformidade("https://sborl.org.br/adenoide")] },
      ],
      busca,
    );
    await gerarRoteiros(payload, () => undefined, opcoes);
    const correcao = prompts.find((p) => p.includes("Problemas encontrados")) ?? "";
    expect(correcao).toContain('tema "ronco" repetido');
    expect(correcao).toContain("palavra-chave NARIZ repetida");
    expect(correcao).toContain("precisa ficar entre 30 e 90 s");
  });

  it("sem busca na web, segue e marca os fatos como sem fonte", async () => {
    const { opcoes } = ia(
      [{ roteiros: [roteiro("Adenoide", "nariz", 7), roteiro("Zumbido", "zumbido", 7)] }, { roteiros: [conformidade("https://sborl.org.br/adenoide"), conformidade("https://sborl.org.br/adenoide")] }],
      "sem busca",
    );
    const r = await gerarRoteiros(payload, () => undefined, opcoes);
    expect(r.roteiros[0].conformidade.pesquisou).toBe(false);
    expect(r.roteiros[0].conformidade.fatos[0]).toMatchObject({ veredito: "sem_fonte", fontes: [] });
  });

  it("recusa payload sem regras", async () => {
    await expect(gerarRoteiros({ ...payload, regras: undefined }, () => undefined, ia([], busca).opcoes)).rejects.toThrow();
  });
});

describe("refazer_roteiro e checar_conformidade", () => {
  const atual = { ...roteiro("Adenoide", "NARIZ", null), desenvolvimento: "Texto curto editado à mão.", persona: { nome: "Mãe", descricao: "d", dores: "Otite", quem_decide: "A mãe" } };

  it("a nova versão segue o comentário e sai conferida", async () => {
    const { opcoes, prompts } = ia([{ roteiro: roteiro("Adenoide", "nariz", null) }, { roteiros: [conformidade("https://sborl.org.br/adenoide")] }], busca);
    const r = await refazerRoteiro({ roteiro_id: 3, briefing, regras, roteiro: atual, comentario: "Gancho mais curto" }, () => undefined, opcoes);
    expect(prompts.some((p) => p.includes("Pedido da produção: Gancho mais curto"))).toBe(true);
    expect(r.roteiro.palavra_chave).toBe("NARIZ");
    expect(r.roteiro.conformidade.regras).toHaveLength(2);
  });

  it("confere texto editado à mão, mesmo curto", async () => {
    const { opcoes } = ia([{ roteiros: [conformidade("https://sborl.org.br/adenoide")] }], busca);
    const r = await checarConformidade({ roteiro_id: 3, briefing, regras, roteiro: atual }, () => undefined, opcoes);
    expect(r.conformidade.fatos[0].fontes[0].uri).toBe("https://sborl.org.br/adenoide");
  });
});

describe("estrutura do roteiro", () => {
  it("chamada sem a palavra-chave é problema", () => {
    expect(problemasDoRoteiro({ ...roteiro("Adenoide", "NARIZ", null), cta: "Agende sua consulta hoje" })).toEqual([
      expect.stringContaining("palavra-chave NARIZ"),
    ]);
  });
});
