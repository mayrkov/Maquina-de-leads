/**
 * Tarefa analisar_video (RF51): transcreve o vídeo bruto e a IA preenche o formulário de edição (tema, persona,
 * gancho, trechos a cortar, destaques da legenda, chamada para ação, palavra-chave e legenda do post).
 * Com roteiro, parte dele (tema, persona, chamada e palavra-chave já definidos) e usa o vídeo para os cortes;
 * avulso, deduz tudo do próprio vídeo. A produção revisa campo a campo antes da edição (RF52).
 *
 * A transcrição fica no disco de mídia (chave `transcricao`): a edição usa a mesma e não transcreve de novo.
 * shortcut: a análise usa só a fala (transcrição), sem olhar a imagem; ler quadros do vídeo fica para quando a fala
 * não bastar.
 */
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { transcribeVideo } from "../../orchestrator/cuts/transcribe.js";
import { generateJson, type LlmProvider } from "../../orchestrator/lib/llmClient.js";
import { taskCallOptions, type TaskCallOptions } from "../../orchestrator/lib/llmTasks.js";
import { caminhoDaChave } from "../midia.js";
import { blocoBriefing, blocoRegras, BriefingSchema, RegrasSchema } from "./roteiros.js";

export const MAX_TRECHOS = 300;
export const MAX_DESTAQUES = 6;
const PALAVRA_CHAVE = /^[\p{L}\p{N}]{2,30}$/u;
const str = (min: number, max: number) => z.string().trim().min(min).max(max);

export const PayloadAnalisarVideoSchema = z.object({
  video_id: z.number().int().positive(),
  arquivo_bruto: z.string().min(1),
  transcricao: z.string().min(1),
  briefing: BriefingSchema,
  regras: RegrasSchema,
  roteiro: z
    .object({
      tema: z.string().max(200),
      persona: z.string().max(200).nullable(),
      gancho: z.string().max(500),
      desenvolvimento: z.string().max(3000),
      cta: z.string().max(300),
      palavra_chave: z.string().max(30),
    })
    .nullable(),
});
export type PayloadAnalisarVideo = z.infer<typeof PayloadAnalisarVideoSchema>;

export interface Trecho {
  inicio: number;
  fim: number;
  texto: string;
}

/** Palavra como a legenda compara: minúscula, sem pontuação em volta (mesma regra de python/cuts/compose.py). */
export const normalizarPalavra = (p: string): string => p.trim().replace(/^[.,;:!?…"'“”‘’()«»¡¿-]+|[.,;:!?…"'“”‘’()«»¡¿-]+$/gu, "").toLowerCase();

export function formularioSchema(trechos: readonly Trecho[]) {
  const faladas = new Set(trechos.flatMap((t) => t.texto.split(/\s+/).map(normalizarPalavra)));
  return z
    .object({
      tema: str(3, 200),
      persona: str(3, 200),
      gancho: z.object({ trecho: z.number().int(), texto: str(3, 500) }),
      cortar: z.array(z.number().int()).max(trechos.length),
      destaques: z.array(z.string().trim().min(2).max(30)).max(MAX_DESTAQUES),
      cta: str(10, 300),
      palavra_chave: z.string().trim().regex(PALAVRA_CHAVE, "uma palavra só, letras e números, sem espaço"),
      legenda: str(30, 2000),
    })
    .superRefine((f, ctx) => {
      const fora = [...f.cortar, f.gancho.trecho].filter((i) => i < 0 || i >= trechos.length);
      if (fora.length) ctx.addIssue({ code: "custom", message: `trechos inexistentes: ${fora.join(", ")} (vão de 0 a ${trechos.length - 1})` });
      if (new Set(f.cortar).size >= trechos.length) ctx.addIssue({ code: "custom", message: "não corte todos os trechos" });
      if (f.cortar.includes(f.gancho.trecho)) ctx.addIssue({ code: "custom", message: "o trecho do gancho não pode ser cortado" });
      const naoFaladas = f.destaques.filter((d) => !faladas.has(normalizarPalavra(d)));
      if (naoFaladas.length) ctx.addIssue({ code: "custom", message: `destaques precisam ser palavras faladas no vídeo: ${naoFaladas.join(", ")}` });
      if (!f.cta.toUpperCase().includes(f.palavra_chave.toUpperCase())) ctx.addIssue({ code: "custom", message: "a chamada para ação precisa ter a palavra-chave" });
    });
}
export type Formulario = z.infer<ReturnType<typeof formularioSchema>>;

const tempo = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function buildAnalisePrompt(p: PayloadAnalisarVideo, trechos: readonly Trecho[]): string {
  const roteiro = p.roteiro
    ? "Este vídeo foi gravado a partir do roteiro abaixo. Copie do roteiro o tema, a persona, a chamada para ação e a " +
      "palavra-chave; o gancho é o do roteiro, no trecho do vídeo onde ele é falado.\n" +
      `Tema: ${p.roteiro.tema}\nPersona: ${p.roteiro.persona ?? "(não definida: descreva pelo vídeo)"}\nGancho: ${p.roteiro.gancho}\n` +
      `Desenvolvimento: ${p.roteiro.desenvolvimento}\nChamada para ação: ${p.roteiro.cta}\nPalavra-chave: ${p.roteiro.palavra_chave}\n\n`
    : "Vídeo gravado sem roteiro do sistema: deduza do próprio vídeo o tema, a persona (o público que o vídeo mira), o " +
      "gancho, a chamada para ação e a palavra-chave (uma palavra só que a pessoa comenta para receber a mensagem).\n\n";

  return (
    "Você prepara a edição de um vídeo curto vertical (Instagram Reels) gravado pelo próprio profissional de saúde. " +
    "Proponha o formulário de edição a partir da transcrição, dividida em trechos numerados.\n\n" +
    blocoBriefing(p.briefing) +
    "\n" +
    blocoRegras(p.regras) +
    "\n" +
    roteiro +
    `Trechos da transcrição (índice, início–fim, fala):\n${trechos.map((t, i) => `[${i}] ${tempo(t.inicio)}–${tempo(t.fim)} ${t.texto}`).join("\n")}\n\n` +
    "Regras do formulário:\n" +
    "- cortar: índices dos trechos que não são conteúdo: conversa antes ou depois da gravação (\"gravando?\", \"vamos lá\"), " +
    "frase recomeçada ou repetida (mantenha só a última versão boa) e fala fora do assunto. Nunca corte no meio de uma ideia. " +
    "Pausas, gaguejos e hesitações curtas são cortados automaticamente: não liste.\n" +
    "- gancho.trecho: índice do trecho onde o gancho é falado (de preferência o primeiro trecho mantido); gancho.texto: a frase do gancho.\n" +
    `- destaques: de 2 a ${MAX_DESTAQUES} palavras faladas no vídeo, uma palavra cada, que merecem cor na legenda (o termo central, não artigos).\n` +
    "- cta: a chamada para ação falada no fim, com a palavra-chave.\n" +
    "- legenda: legenda do post no Instagram, em pt-BR, no tom do briefing, até 1000 caracteres, terminando com a chamada " +
    "para ação e a palavra-chave. Siga as regras do conselho: sem promessa de resultado, sem sensacionalismo, sem preço e " +
    "sem diagnóstico. Não escreva nome, CRM nem RQE: o sistema acrescenta a assinatura.\n\n" +
    'Responda só JSON: {"tema": "...", "persona": "...", "gancho": {"trecho": 0, "texto": "..."}, "cortar": [0], ' +
    '"destaques": ["..."], "cta": "...", "palavra_chave": "...", "legenda": "..."}'
  );
}

export async function analisarVideo(
  payload: unknown,
  root: string,
  log: (m: string) => void,
  opcoes: TaskCallOptions & { provider?: LlmProvider } = taskCallOptions("formularioEdicao"),
  transcrever: typeof transcribeVideo = transcribeVideo,
) {
  const p = PayloadAnalisarVideoSchema.parse(payload);
  const destino = caminhoDaChave(root, p.transcricao);
  await mkdir(dirname(destino), { recursive: true });
  const transcricao = await transcrever(caminhoDaChave(root, p.arquivo_bruto), destino, log);

  const trechos: Trecho[] = transcricao.segments
    .map((s) => ({ inicio: Number(s.start.toFixed(3)), fim: Number(s.end.toFixed(3)), texto: s.text.trim() }))
    .filter((t) => t.texto && t.fim > t.inicio)
    .slice(0, MAX_TRECHOS);
  if (trechos.length === 0) throw new Error("Não há fala no vídeo: sem transcrição não há o que editar");

  const f = await generateJson(buildAnalisePrompt(p, trechos), formularioSchema(trechos), { ...opcoes, retries: 2 });
  log(`formulário sugerido: ${f.cortar.length} trecho(s) para cortar, ${f.destaques.length} destaque(s)`);
  return {
    transcricao: p.transcricao,
    trechos,
    formulario: {
      ...f,
      palavra_chave: f.palavra_chave.toUpperCase(),
      cortar: [...new Set(f.cortar)].sort((a, b) => a - b),
      destaques: [...new Set(f.destaques.map(normalizarPalavra))],
      gancho: { ...f.gancho, inicio: trechos[f.gancho.trecho].inicio },
    },
  };
}
