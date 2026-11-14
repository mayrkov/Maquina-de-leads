/**
 * Tarefas de roteiro:
 * - gerar_roteiros: pesquisa assistida de temas na web (RF05), N roteiros da semana sem repetir tema recente (RF08,
 *   RF09, RF10), cada um com a sua persona, reusada do catálogo quando for parecida (RF02, RF11, RF48);
 * - refazer_roteiro: nova versão de um roteiro, seguindo o comentário da produção (RF25);
 * - checar_conformidade: confere o texto (editado à mão) contra as regras do conselho e os fatos.
 *
 * Todo roteiro sai com a conformidade conferida (RF13, RF14): primeiro uma revisão com busca na web, depois a
 * resposta estruturada. As fontes só valem se vieram da busca: a IA não pode inventar link.
 * Nada é aprovado aqui: a produção revisa e aprova no painel (RN01).
 */
import { z } from "zod";
import { generateGroundedText, generateJson, type GroundedText, type LlmProvider } from "../../orchestrator/lib/llmClient.js";
import { taskCallOptions, type TaskCallOptions } from "../../orchestrator/lib/llmTasks.js";
import { isSearchUnsupportedError } from "../../orchestrator/lib/searchSupport.js";
import { PayloadSugerirPersonasSchema } from "./sugerirPersonas.js";

/** Fala em pt-BR: ~2,5 palavras por segundo. 30 a 90 s (RF09), com folga para a estimativa. */
export const PALAVRAS_POR_SEGUNDO = 2.5;
export const DURACAO_MIN_S = 30;
export const DURACAO_MAX_S = 90;

export const BriefingSchema = PayloadSugerirPersonasSchema.shape.briefing;
export const RegrasSchema = z.record(z.string().regex(/^[a-z_]{2,40}$/), z.string().max(300));
const PersonaCatalogoSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string(),
  descricao: z.string(),
  quem_decide: z.string(),
  dores: z.string().optional(),
});
const str = (min: number, max: number) => z.string().trim().min(min).max(max);
const PALAVRA_CHAVE = /^[\p{L}\p{N}]{2,30}$/u;

const RoteiroTextoSchema = z.object({
  tema: str(3, 200),
  titulo: str(5, 200),
  gancho: str(10, 500),
  desenvolvimento: str(30, 3000),
  cta: str(10, 300),
  palavra_chave: z.string().trim().regex(PALAVRA_CHAVE, "uma palavra só, letras e números, sem espaço"),
  objetivo: str(3, 200),
});
export type RoteiroTexto = z.infer<typeof RoteiroTextoSchema>;

const PersonaEntradaSchema = z.object({ nome: z.string(), descricao: z.string(), dores: z.string(), quem_decide: z.string() }).nullable().optional();

export const PayloadGerarRoteirosSchema = z.object({
  cliente_id: z.number().int().positive(),
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantidade: z.number().int().min(1).max(10),
  briefing: BriefingSchema,
  catalogo: z.array(PersonaCatalogoSchema).max(100),
  temas_recentes: z.array(z.string().max(200)).max(50),
  regras: RegrasSchema,
});
export type PayloadGerarRoteiros = z.infer<typeof PayloadGerarRoteirosSchema>;

/** Texto que volta do Laravel (pode ter sido editado à mão): só limites de tamanho. */
const RoteiroEntradaSchema = z.object({
  tema: z.string().max(200),
  titulo: z.string().max(200),
  gancho: z.string().min(1).max(500),
  desenvolvimento: z.string().min(1).max(3000),
  cta: z.string().min(1).max(300),
  palavra_chave: z.string().max(30),
  objetivo: z.string().max(200),
  persona: PersonaEntradaSchema,
});

export const PayloadRefazerRoteiroSchema = z.object({
  roteiro_id: z.number().int().positive(),
  briefing: BriefingSchema,
  regras: RegrasSchema,
  roteiro: RoteiroEntradaSchema,
  comentario: z.string().trim().min(1).max(1000),
});

export const PayloadChecarConformidadeSchema = z.object({
  roteiro_id: z.number().int().positive(),
  briefing: BriefingSchema,
  regras: RegrasSchema,
  roteiro: RoteiroEntradaSchema,
});

const PersonaRoteiroSchema = z.object({
  id: z.number().int().nullable(),
  nome: str(3, 120),
  descricao: str(5, 1000),
  dores: str(5, 1000),
  quem_decide: str(2, 200),
  linguagem: str(2, 200),
  parecida_com_id: z.number().int().nullable(),
});

const RoteiroGeradoSchema = RoteiroTextoSchema.extend({ persona: PersonaRoteiroSchema });
export type RoteiroGerado = z.infer<typeof RoteiroGeradoSchema>;

export function contarPalavras(r: Pick<RoteiroTexto, "gancho" | "desenvolvimento" | "cta">): number {
  return `${r.gancho} ${r.desenvolvimento} ${r.cta}`.split(/\s+/u).filter(Boolean).length;
}

export const normalizarTema = (t: string): string =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Regras de estrutura (RF09, RF10) conferidas depois do JSON; a IA recebe os problemas e corrige. */
export function problemasDoRoteiro(r: RoteiroTexto): string[] {
  const problemas: string[] = [];
  const segundos = contarPalavras(r) / PALAVRAS_POR_SEGUNDO;
  if (segundos < DURACAO_MIN_S || segundos > DURACAO_MAX_S) {
    problemas.push(
      `"${r.titulo}": a fala dura cerca de ${Math.round(segundos)} s; precisa ficar entre ${DURACAO_MIN_S} e ${DURACAO_MAX_S} s ` +
        `(${DURACAO_MIN_S * PALAVRAS_POR_SEGUNDO} a ${DURACAO_MAX_S * PALAVRAS_POR_SEGUNDO} palavras somando gancho, desenvolvimento e chamada)`,
    );
  }
  if (!r.cta.toUpperCase().includes(r.palavra_chave.toUpperCase())) {
    problemas.push(`"${r.titulo}": a chamada para ação precisa pedir o comentário com a palavra-chave ${r.palavra_chave.toUpperCase()}`);
  }
  return problemas;
}

function loteSchema(quantidade: number, temasRecentes: readonly string[]) {
  const recentes = new Set(temasRecentes.map(normalizarTema));
  return z
    .object({ roteiros: z.array(RoteiroGeradoSchema).length(quantidade) })
    .superRefine((lote, ctx) => {
      const palavras = new Set<string>();
      const temas = new Set<string>();
      for (const r of lote.roteiros) {
        for (const message of problemasDoRoteiro(r)) ctx.addIssue({ code: "custom", message });
        const palavra = r.palavra_chave.toUpperCase();
        if (palavras.has(palavra)) ctx.addIssue({ code: "custom", message: `palavra-chave ${palavra} repetida: use uma diferente em cada roteiro` });
        palavras.add(palavra);
        const tema = normalizarTema(r.tema);
        if (recentes.has(tema) || temas.has(tema)) ctx.addIssue({ code: "custom", message: `tema "${r.tema}" repetido: escolha outro` });
        temas.add(tema);
      }
    });
}

const RefeitoSchema = z.object({ roteiro: RoteiroTextoSchema }).superRefine((x, ctx) => {
  for (const message of problemasDoRoteiro(x.roteiro)) ctx.addIssue({ code: "custom", message });
});

const ConformidadeSchema = z.object({
  regras: z.array(z.object({ id: z.string(), resultado: z.enum(["ok", "atencao", "bloqueio"]), motivo: z.string().max(500).nullable() })),
  fatos: z
    .array(
      z.object({
        afirmacao: z.string().max(500),
        veredito: z.enum(["confirmada", "sem_fonte", "incorreta"]),
        correcao: z.string().max(500).nullable(),
        fontes: z.array(z.object({ uri: z.string(), title: z.string().nullable() })).max(5),
      }),
    )
    .max(10),
});
export type Conformidade = z.infer<typeof ConformidadeSchema> & { pesquisou: boolean };

export interface OpcoesIa {
  roteiro: TaskCallOptions & { provider?: LlmProvider };
  conformidade: TaskCallOptions & { provider?: LlmProvider };
}
const opcoesPadrao = (): OpcoesIa => ({ roteiro: taskCallOptions("roteiro"), conformidade: taskCallOptions("conformidade") });

type Briefing = z.infer<typeof BriefingSchema>;
const linha = (rotulo: string, valor: string | null | undefined) => (valor ? `- ${rotulo}: ${valor}\n` : "");

export function blocoBriefing(b: Briefing): string {
  return (
    "Briefing do cliente:\n" +
    linha("Nicho / especialidade", b.nicho) +
    linha("Profissão", b.profissao) +
    linha("Objetivo", b.objetivo) +
    linha("Oferta", b.oferta) +
    linha("Região de atendimento", b.regiao) +
    linha("Tom de voz", b.tom_voz) +
    linha("Temas proibidos", b.temas_proibidos) +
    linha("Tags", b.tags?.join(", ")) +
    linha("Conselho profissional", b.conselho)
  );
}

export const blocoRegras = (regras: Record<string, string>) =>
  `Regras do conselho profissional (id: regra):\n${Object.entries(regras)
    .map(([id, r]) => `- ${id}: ${r}`)
    .join("\n")}\n`;

const textoDoRoteiro = (r: RoteiroTexto, i?: number) =>
  `${i === undefined ? "" : `Roteiro ${i + 1}\n`}Tema: ${r.tema}\nGancho: ${r.gancho}\nDesenvolvimento: ${r.desenvolvimento}\nChamada para ação: ${r.cta}\n`;

export function buildPesquisaPrompt(p: PayloadGerarRoteiros): string {
  return (
    "Pesquise na web o que o público está perguntando agora sobre o nicho abaixo (dúvidas frequentes, sintomas que " +
    "preocupam, mitos, assuntos da estação e notícias recentes de saúde), para sugerir temas de vídeos curtos educativos.\n\n" +
    blocoBriefing(p.briefing) +
    (p.temas_recentes.length ? `\nTemas já usados (não repita): ${p.temas_recentes.join("; ")}\n` : "") +
    `\nListe de ${p.quantidade * 2} a ${p.quantidade * 3} temas, cada um com a dúvida do público em uma frase e o motivo de estar em alta. ` +
    "Nada de promessa de cura, preço ou diagnóstico. Português do Brasil."
  );
}

export function buildGerarPrompt(p: PayloadGerarRoteiros, pesquisa: string | null): string {
  const catalogo =
    p.catalogo.length === 0
      ? "O cliente ainda não tem personas salvas: em todos, persona.id = null e persona.parecida_com_id = null.\n"
      : `Personas salvas do cliente (id: nome — descrição — quem decide):\n${p.catalogo.map((c) => `- ${c.id}: ${c.nome} — ${c.descricao} — ${c.quem_decide}`).join("\n")}\n` +
        "Para cada roteiro, defina o público. Se for o mesmo público de uma persona salva (mesma dor e mesmo decisor), reuse: " +
        "persona.id = id dela e copie os campos. Se não for, persona.id = null, descreva o público novo e, em persona.parecida_com_id, " +
        "o id da salva mais próxima (ou null).\n";

  return (
    "Você escreve roteiros de vídeos curtos (Instagram Reels) que um profissional de saúde grava falando para a câmera. " +
    "O objetivo é educar e captar pacientes: quem se interessar comenta a palavra-chave e recebe uma mensagem.\n\n" +
    blocoBriefing(p.briefing) +
    "\n" +
    catalogo +
    (p.temas_recentes.length ? `\nTemas já usados recentemente (não repita nenhum): ${p.temas_recentes.join("; ")}\n` : "") +
    (pesquisa ? `\nPesquisa recente na web sobre o que o público procura:\n${pesquisa.slice(0, 6000)}\n` : "") +
    "\n" +
    blocoRegras(p.regras) +
    `\nEscreva ${p.quantidade} roteiros com temas diferentes entre si. Cada roteiro mira UMA persona. Para cada um:\n` +
    "- tema: o assunto, curto (ex.: \"perda auditiva em idosos\");\n" +
    "- titulo: chamada do vídeo (ex.: \"Seu pai aumenta a TV? Sinais de perda auditiva\");\n" +
    "- gancho: a primeira frase, que prende nos 3 primeiros segundos;\n" +
    "- desenvolvimento: o conteúdo, falado em primeira pessoa pelo profissional, claro e sem jargão;\n" +
    `- cta: chamada para ação pedindo para comentar a palavra-chave (ex.: "Comenta OUVIDO que eu te explico como agendar");\n` +
    "- palavra_chave: uma palavra só, em maiúsculas, ligada ao tema, diferente em cada roteiro;\n" +
    "- objetivo: o que o vídeo quer que a pessoa faça (ex.: \"agendar audiometria\");\n" +
    "- persona: conforme a regra acima (nome, descricao, dores, quem_decide, linguagem).\n" +
    `Somando gancho, desenvolvimento e chamada, a fala tem de ${DURACAO_MIN_S * PALAVRAS_POR_SEGUNDO} a ${DURACAO_MAX_S * PALAVRAS_POR_SEGUNDO} palavras (${DURACAO_MIN_S} a ${DURACAO_MAX_S} s).\n` +
    "Siga as regras do conselho e o tom de voz; respeite os temas proibidos; não afirme nada de saúde que não seja consenso.\n" +
    'Responda somente com o JSON: {"roteiros": [{"tema": "...", "titulo": "...", "gancho": "...", "desenvolvimento": "...", "cta": "...", ' +
    '"palavra_chave": "...", "objetivo": "...", "persona": {"id": null, "nome": "...", "descricao": "...", "dores": "...", "quem_decide": "...", "linguagem": "...", "parecida_com_id": null}}]}'
  );
}

export function buildRefazerPrompt(p: z.infer<typeof PayloadRefazerRoteiroSchema>): string {
  const persona = p.roteiro.persona ? `Público do roteiro: ${p.roteiro.persona.nome} — ${p.roteiro.persona.descricao}. Dor: ${p.roteiro.persona.dores}. Quem decide: ${p.roteiro.persona.quem_decide}.\n` : "";
  return (
    "Reescreva o roteiro de vídeo curto (Instagram Reels) abaixo, que um profissional de saúde grava falando para a câmera, " +
    "seguindo o pedido da equipe de produção. Mantenha o público.\n\n" +
    blocoBriefing(p.briefing) +
    "\n" +
    persona +
    `\nRoteiro atual:\n${textoDoRoteiro(p.roteiro)}Palavra-chave: ${p.roteiro.palavra_chave}\nObjetivo: ${p.roteiro.objetivo}\n` +
    `\nPedido da produção: ${p.comentario}\n\n` +
    blocoRegras(p.regras) +
    `\nA fala (gancho + desenvolvimento + chamada) tem de ${DURACAO_MIN_S * PALAVRAS_POR_SEGUNDO} a ${DURACAO_MAX_S * PALAVRAS_POR_SEGUNDO} palavras. ` +
    "A chamada pede o comentário com a palavra-chave (pode trocar a palavra-chave se o pedido exigir; uma palavra só, em maiúsculas).\n" +
    'Responda somente com o JSON: {"roteiro": {"tema": "...", "titulo": "...", "gancho": "...", "desenvolvimento": "...", "cta": "...", "palavra_chave": "...", "objetivo": "..."}}'
  );
}

export function buildRevisaoPrompt(roteiros: readonly RoteiroTexto[], regras: Record<string, string>, briefing: Briefing): string {
  return (
    "Você revisa roteiros de vídeo de um profissional de saúde antes da publicação no Instagram. Pesquise na web para conferir.\n\n" +
    linha("Profissão", briefing.profissao) +
    linha("Conselho", briefing.conselho) +
    "\n" +
    blocoRegras(regras) +
    "\n" +
    roteiros.map((r, i) => textoDoRoteiro(r, i)).join("\n") +
    "\nPara cada roteiro: (1) diga, regra por regra, se o texto cumpre, merece atenção ou deve ser bloqueado, e por quê; " +
    "(2) liste as afirmações de saúde (fatos) e diga se fontes confiáveis (sociedades médicas, ministérios, artigos) confirmam, " +
    "se não achou fonte, ou se estão incorretas (com a correção). Cite as páginas que consultou."
  );
}

export function buildEstruturarPrompt(roteiros: readonly RoteiroTexto[], regras: Record<string, string>, revisao: GroundedText | null): string {
  const ids = Object.keys(regras);
  return (
    (revisao
      ? `Revisão feita com busca na web:\n${revisao.text.slice(0, 12000)}\n\nPáginas consultadas:\n${revisao.sources.map((s) => `- ${s.uri}${s.title ? ` (${s.title})` : ""}`).join("\n") || "(nenhuma)"}\n\n`
      : "Não foi possível pesquisar na web: avalie as regras pelo texto e marque todas as afirmações de saúde como sem_fonte, sem fontes.\n\n") +
    blocoRegras(regras) +
    "\n" +
    roteiros.map((r, i) => textoDoRoteiro(r, i)).join("\n") +
    `\nResponda com um item por roteiro, na mesma ordem. Em regras, um item para cada id (${ids.join(", ")}), com resultado ` +
    'ok, atencao ou bloqueio e o motivo (null quando ok). Bloqueio é violação clara da regra; atenção é dúvida. Em fatos, até 10 ' +
    "afirmações de saúde de cada roteiro com veredito confirmada, sem_fonte ou incorreta, a correção (null quando confirmada) " +
    "e as fontes, usando só as páginas consultadas listadas acima.\n" +
    'Responda somente com o JSON: {"roteiros": [{"regras": [{"id": "...", "resultado": "ok", "motivo": null}], "fatos": [{"afirmacao": "...", "veredito": "confirmada", "correcao": null, "fontes": [{"uri": "https://...", "title": "..."}]}]}]}'
  );
}

/** Texto com busca na web; sem busca no provedor, segue sem (a conformidade marca os fatos como sem fonte). */
async function comBusca(prompt: string, opcoes: OpcoesIa["roteiro"], log: (m: string) => void, oQue: string): Promise<GroundedText | null> {
  try {
    return await generateGroundedText(prompt, opcoes);
  } catch (e) {
    if (!isSearchUnsupportedError(e)) throw e;
    log(`${oQue} sem busca na web: ${e.message}`);
    return null;
  }
}

/** Confere vários roteiros de uma vez: revisão com busca, depois a resposta estruturada (RF13, RF14). */
export async function conferir(
  roteiros: readonly RoteiroTexto[],
  regras: Record<string, string>,
  briefing: Briefing,
  opcoes: OpcoesIa["conformidade"],
  log: (m: string) => void,
): Promise<Conformidade[]> {
  const revisao = await comBusca(buildRevisaoPrompt(roteiros, regras, briefing), opcoes, log, "conformidade");
  const schema = z.object({ roteiros: z.array(ConformidadeSchema).length(roteiros.length) });
  const r = await generateJson(buildEstruturarPrompt(roteiros, regras, revisao), schema, { ...opcoes, retries: 2 });
  // Fonte só vale se veio da busca; fato "confirmado" sem fonte de verdade vira "sem fonte".
  const consultadas = new Set((revisao?.sources ?? []).map((s) => s.uri));
  return r.roteiros.map((c) => ({
    regras: c.regras,
    fatos: c.fatos.map((f) => {
      const fontes = f.fontes.filter((s) => consultadas.has(s.uri));
      return { ...f, fontes, veredito: f.veredito === "confirmada" && fontes.length === 0 ? "sem_fonte" : f.veredito };
    }),
    pesquisou: revisao !== null,
  }));
}

export async function gerarRoteiros(payload: unknown, log: (m: string) => void, opcoes: OpcoesIa = opcoesPadrao()) {
  const p = PayloadGerarRoteirosSchema.parse(payload);
  const pesquisa = await comBusca(buildPesquisaPrompt(p), opcoes.roteiro, log, "pesquisa de temas");
  if (pesquisa) log(`pesquisa de temas: ${pesquisa.sources.length} fonte(s)`);

  const lote = await generateJson(buildGerarPrompt(p, pesquisa?.text ?? null), loteSchema(p.quantidade, p.temas_recentes), { ...opcoes.roteiro, retries: 2 });
  const ids = new Set(p.catalogo.map((c) => c.id));
  const roteiros = lote.roteiros.map((r) => ({
    ...r,
    palavra_chave: r.palavra_chave.toUpperCase(),
    // A IA só pode apontar para personas do catálogo enviado.
    persona: {
      ...r.persona,
      id: r.persona.id !== null && ids.has(r.persona.id) ? r.persona.id : null,
      parecida_com_id: r.persona.parecida_com_id !== null && ids.has(r.persona.parecida_com_id) ? r.persona.parecida_com_id : null,
    },
  }));
  log(`${roteiros.length} roteiro(s) escrito(s)`);

  const conformidade = await conferir(roteiros, p.regras, p.briefing, opcoes.conformidade, log);
  return { roteiros: roteiros.map((r, i) => ({ ...r, conformidade: conformidade[i] })) };
}

export async function refazerRoteiro(payload: unknown, log: (m: string) => void, opcoes: OpcoesIa = opcoesPadrao()) {
  const p = PayloadRefazerRoteiroSchema.parse(payload);
  const { roteiro } = await generateJson(buildRefazerPrompt(p), RefeitoSchema, { ...opcoes.roteiro, retries: 2 });
  const novo = { ...roteiro, palavra_chave: roteiro.palavra_chave.toUpperCase() };
  log("nova versão escrita");
  const [conformidade] = await conferir([novo], p.regras, p.briefing, opcoes.conformidade, log);
  return { roteiro: { ...novo, conformidade } };
}

export async function checarConformidade(payload: unknown, log: (m: string) => void, opcoes: OpcoesIa = opcoesPadrao()) {
  const p = PayloadChecarConformidadeSchema.parse(payload);
  const [conformidade] = await conferir([p.roteiro], p.regras, p.briefing, opcoes.conformidade, log);
  return { conformidade };
}
