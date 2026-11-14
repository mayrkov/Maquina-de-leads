/**
 * Tarefa sugerir_personas (RF50, RF48): a IA define os públicos do cliente a partir do briefing e, para cada um,
 * aponta a persona já salva mais parecida (ou nenhuma). A produção decide depois no painel; nada entra no catálogo
 * sem ela (RN09).
 */
import { z } from "zod";
import { generateJson, type LlmProvider } from "../../orchestrator/lib/llmClient.js";
import { taskCallOptions, type TaskCallOptions } from "../../orchestrator/lib/llmTasks.js";

const texto = (max: number) => z.string().trim().max(max).nullable().optional();

export const PayloadSugerirPersonasSchema = z.object({
  cliente_id: z.number().int().positive(),
  briefing: z.object({
    nicho: texto(120),
    objetivo: texto(200),
    oferta: texto(300),
    regiao: texto(200),
    tom_voz: texto(200),
    temas_proibidos: texto(2000),
    tags: z.array(z.string().max(40)).max(30).nullable().optional(),
    profissao: texto(60),
    conselho: texto(20),
  }),
  catalogo: z.array(z.object({ id: z.number().int().positive(), nome: z.string(), descricao: z.string(), quem_decide: z.string() })).max(100),
});
export type PayloadSugerirPersonas = z.infer<typeof PayloadSugerirPersonasSchema>;

export const PersonasRespostaSchema = z.object({
  personas: z
    .array(
      z.object({
        nome: z.string().trim().min(3).max(120),
        descricao: z.string().trim().min(5).max(1000),
        dores: z.string().trim().min(5).max(1000),
        quem_decide: z.string().trim().min(2).max(200),
        linguagem: z.string().trim().min(2).max(200),
        parecida_com_id: z.number().int().nullable(),
      }),
    )
    .min(1)
    .max(8),
});
export type PersonasResposta = z.infer<typeof PersonasRespostaSchema>;

export function buildPersonasPrompt(p: PayloadSugerirPersonas): string {
  const b = p.briefing;
  const linha = (rotulo: string, valor: string | null | undefined) => (valor ? `- ${rotulo}: ${valor}\n` : "");
  const catalogo =
    p.catalogo.length === 0
      ? "O cliente ainda não tem personas salvas: use parecida_com_id = null em todas.\n"
      : `Personas já salvas pelo cliente (id: nome — descrição — quem decide):\n${p.catalogo.map((c) => `- ${c.id}: ${c.nome} — ${c.descricao} — ${c.quem_decide}`).join("\n")}\n` +
        "Para cada persona que você sugerir, se ela for o mesmo público de uma salva (mesma dor e mesmo decisor, mesmo que com outras palavras), " +
        "coloque o id dela em parecida_com_id; senão, null. Não repita uma persona salva idêntica: só sugira quando acrescentar algo.\n";

  return (
    "Você ajuda a equipe de marketing de um profissional de saúde a definir os públicos dos vídeos curtos (Instagram Reels) " +
    "que vão captar pacientes. Cada vídeo mira UM público.\n\n" +
    "Briefing do cliente:\n" +
    linha("Nicho / especialidade", b.nicho) +
    linha("Profissão", b.profissao) +
    linha("Objetivo", b.objetivo) +
    linha("Oferta", b.oferta) +
    linha("Região de atendimento", b.regiao) +
    linha("Tom de voz", b.tom_voz) +
    linha("Temas proibidos", b.temas_proibidos) +
    linha("Tags", b.tags?.join(", ")) +
    linha("Conselho profissional", b.conselho) +
    "\n" +
    catalogo +
    "\nSugira de 3 a 6 personas distintas entre si. Para cada uma:\n" +
    "- nome: curto, descreve o público (ex.: \"Mãe ou pai de criança com otite\");\n" +
    "- descricao: quem é a pessoa;\n" +
    "- dores: o problema, com as palavras que ela usaria;\n" +
    "- quem_decide: quem marca a consulta, que nem sempre é o paciente (ex.: a mãe, o cônjuge, os filhos);\n" +
    "- linguagem: como falar com ela;\n" +
    "- parecida_com_id: conforme a regra acima.\n\n" +
    "Regras: português do Brasil; nada de promessa de cura, sensacionalismo ou diagnóstico; respeite os temas proibidos.\n" +
    'Responda somente com o JSON: {"personas": [{"nome": "...", "descricao": "...", "dores": "...", "quem_decide": "...", "linguagem": "...", "parecida_com_id": null}]}'
  );
}

export async function sugerirPersonas(
  payload: unknown,
  log: (m: string) => void,
  opcoes: TaskCallOptions & { provider?: LlmProvider } = taskCallOptions("personas"),
): Promise<PersonasResposta> {
  const p = PayloadSugerirPersonasSchema.parse(payload);
  const resposta = await generateJson(buildPersonasPrompt(p), PersonasRespostaSchema, { ...opcoes, retries: 2 });
  // A IA só pode apontar para personas do catálogo enviado.
  const ids = new Set(p.catalogo.map((c) => c.id));
  const personas = resposta.personas.map((x) => ({ ...x, parecida_com_id: x.parecida_com_id !== null && ids.has(x.parecida_com_id) ? x.parecida_com_id : null }));
  log(`${personas.length} persona(s) sugerida(s)`);
  return { personas };
}
