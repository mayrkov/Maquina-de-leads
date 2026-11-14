// Configurações do worker (config/pipeline.config.json): provedor de IA por tarefa, busca na web e marca d'água.
// Tudo o que é do cliente (briefing, persona, kit de marca) fica no banco do Laravel, não aqui.
import { z } from "zod";


/**
 * Web search providers the MACHINE can query for the fact-check when the LLM provider cannot search (metadata shared
 * with the panel; clients and factories: src/orchestrator/lib/webSearch.ts, which the compiler keeps exhaustive).
 * searxng = the person's own instance (free, local; recommended). tavily = a search API with the person's own key.
 */
export const WEB_SEARCH_PROVIDERS = {
  searxng: { label: "SearXNG (instância própria, grátis)", keyEnv: "", needsUrl: true },
  tavily: { label: "Tavily (API de busca, com a sua chave)", keyEnv: "TAVILY_API_KEY", needsUrl: false },
} as const;
export type WebSearchProviderName = keyof typeof WEB_SEARCH_PROVIDERS;
export const WEB_SEARCH_PROVIDER_NAMES = Object.keys(WEB_SEARCH_PROVIDERS) as [WebSearchProviderName, ...WebSearchProviderName[]];

/** Where the owner's watermark sits; vertical positions keep clear of the Shorts title and the bottom UI. */
export const WATERMARK_POSITIONS = ["top-left", "top-right", "top", "bottom-left", "bottom-right", "bottom"] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];
/** Placement on a 1080×1920 frame, used by the renderer (python/cuts). */
export const WATERMARK_LAYOUT = { margin: 48, topMin: 150, bottomMax: 1920 - 420 } as const;

export const WatermarkSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  /** e.g. "@meucanal"; empty = image only. */
  text: z.string().max(40).optional(),
  /** Project-relative PNG; empty = text only. */
  image: z.string().max(200).optional(),
  position: z.enum(WATERMARK_POSITIONS).optional(),
  opacity: z.number().min(0.1).max(1).optional(),
  /** Width of the mark, % of the video width. */
  size: z.number().min(5).max(40).optional(),
});
export type WatermarkSettings = z.infer<typeof WatermarkSettingsSchema>;

export const WATERMARK_DEFAULTS: Required<WatermarkSettings> = { enabled: false, text: "", image: "", position: "top-right", opacity: 0.85, size: 18 };

export function resolveWatermark(s?: WatermarkSettings): Required<WatermarkSettings> {
  return { ...WATERMARK_DEFAULTS, ...stripUndefined(s) };
}

function stripUndefined<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// ---------------------------------------------------------------------------------------------
// LLM: provider and model per task (config section `llm`)
// ---------------------------------------------------------------------------------------------

/**
 * Registry of LLM providers (metadata shared with the dashboard). To add one (Claude Code, OpenAI-compatible...):
 * add an entry here and its factory in PROVIDER_FACTORIES (src/orchestrator/lib/llmClient.ts), which the compiler
 * demands. `paid` = billed per call by API key: it is NEVER used as a fallback unless the owner turns that on
 * for that task (`allowPaid`). `keyEnv` = the key that makes it usable ("" = no key; `command` must exist).
 */
export const LLM_PROVIDERS = {
  "antigravity-cli": { label: "Antigravity CLI (agy)", paid: false, keyEnv: "", command: "agy" },
  gemini: { label: "Gemini (API paga)", paid: true, keyEnv: "GEMINI_API_KEY", command: "" },
  anthropic: { label: "Claude (API paga)", paid: true, keyEnv: "ANTHROPIC_API_KEY", command: "" },
  "claude-code": {
    label: "Claude Code (plano, sem chave)",
    paid: false,
    keyEnv: "",
    command: "claude",
    commandEnv: "CLAUDE_CLI_PATH",
    note:
      "Usa a cota do SEU plano Claude (limite por janela de horas; quando acaba, a tarefa para ou cai na alternativa). " +
      "Nenhuma chave de API é usada. Confira nos termos do seu plano se uso automatizado é permitido: rodar dezenas de vídeos por dia " +
      "pode passar do \"uso comum e individual\". Nunca é ligado por padrão.",
  },
  // `paid` here is the conservative default (a remote service with a key bills per call); a base URL on this computer
  // or local network is free: see isPaidLlmProvider(name, llm). The key is optional for local servers (Ollama).
  "openai-compatible": { label: "OpenAI-compatível (OpenAI, OpenRouter, Ollama, LM Studio...)", paid: true, keyEnv: "OPENAI_COMPAT_API_KEY", command: "" },
} as const satisfies Record<string, LlmProviderMeta>;
/** Shape of a registry entry (optional fields: `commandEnv` = env var that overrides `command`; `note` = help text for the dashboard). */
export interface LlmProviderMeta {
  label: string;
  paid: boolean;
  keyEnv: string;
  command: string;
  commandEnv?: string;
  note?: string;
}
export type LlmProviderName = keyof typeof LLM_PROVIDERS;
export const LLM_PROVIDER_NAMES = Object.keys(LLM_PROVIDERS) as [LlmProviderName, ...LlmProviderName[]];
export const isLlmProviderName = (name: string): name is LlmProviderName => Object.hasOwn(LLM_PROVIDERS, name);
/**
 * True when calls to this provider cost money, so it is never a silent fallback (llmTasks.ts, `allowPaid`).
 * "openai-compatible" is paid unless its base URL (`llm.openaiCompatible.baseUrl`) points to this computer or the local
 * network (isLocalBaseUrl): a missing or invalid URL counts as paid (the safe answer).
 */
export function isPaidLlmProvider(name: LlmProviderName, llm?: Pick<LlmSettings, "openaiCompatible">): boolean {
  if (name !== "openai-compatible") return LLM_PROVIDERS[name].paid;
  const url = parseOpenAiBaseUrl(llm?.openaiCompatible?.baseUrl ?? "");
  return !(url.ok && isLocalBaseUrl(url.url));
}

export type BaseUrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Validates the base URL of an OpenAI-compatible server ("http://localhost:11434/v1"): http/https only, no credentials
 * in the URL, no query and no fragment (the key goes in the Authorization header only). Returns it without trailing "/".
 */
export function parseOpenAiBaseUrl(raw: string): BaseUrlResult {
  const text = raw.trim();
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { ok: false, error: 'URL base inválida. Use algo como "http://localhost:11434/v1".' };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "A URL base deve começar com http:// ou https://." };
  if (u.username || u.password) return { ok: false, error: "Não coloque usuário nem senha na URL; a chave vai em Chaves e acessos." };
  if (u.hash || text.includes("#")) return { ok: false, error: "A URL base não pode ter fragmento (#...)." };
  if (u.search || text.includes("?")) return { ok: false, error: "A URL base não pode ter parâmetros (?...); a chave vai em Chaves e acessos." };
  return { ok: true, url: `${u.origin}${u.pathname}`.replace(/\/+$/, "") };
}

/** localhost, loopback (127.x, ::1), *.localhost, *.local and private ranges (10.x, 172.16-31.x, 192.168.x). */
export function isLocalBaseUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host === "[::1]" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * LLM providers whose own API/tool searches the web (their completeGroundedText works). A provider NOT listed here
 * is treated as having no search: the fact-check then needs a `script.factCheckSearch` provider or the run is
 * rejected. Fail-closed on purpose: a new provider must be proven to search before it is added.
 */
// claude-code: its WebSearch tool was proven with a plan login at home (2026-11-02: text, 2 sources with uri and title, queries).
const NATIVE_WEB_SEARCH: readonly string[] = ["antigravity-cli", "gemini", "anthropic", "claude-code"];
export const hasNativeWebSearch = (name: string): boolean => NATIVE_WEB_SEARCH.includes(name);


/** Tarefas que chamam IA (análise de requisitos, seção 6.1: roteiro, formulário de edição, conformidade e legenda). */
export const LLM_TASKS = {
  personas: { label: "Personas", hint: "Sugere as personas a partir do briefing e aponta as parecidas no catálogo (RF48, RF50)." },
  roteiro: { label: "Roteiro", hint: "Escreve os roteiros da semana a partir do briefing e da persona (RF09)." },
  conformidade: { label: "Conformidade e fatos", hint: "Confere roteiro, legenda e bot contra as regras do conselho e os fatos (RF13, RF14)." },
  formularioEdicao: { label: "Formulário de edição", hint: "Analisa o vídeo bruto e sugere o formulário de edição (RF51)." },
  legendaPost: { label: "Legenda do post", hint: "Legenda sugerida do post no Instagram (RF28)." },
} as const satisfies Record<string, { label: string; hint: string }>;
export type LlmTaskName = keyof typeof LLM_TASKS;
export const LLM_TASK_NAMES = Object.keys(LLM_TASKS) as [LlmTaskName, ...LlmTaskName[]];

const llmProviderEnum = z.enum(LLM_PROVIDER_NAMES);

/**
 * `llm.openaiCompatible`: where the "openai-compatible" provider talks to (OpenAI, OpenRouter, Ollama, LM Studio,
 * gateways). Neither value is a secret; the optional key is OPENAI_COMPAT_API_KEY (Chaves e acessos). The model of a
 * task (`llm.tasks.<t>.model`) wins over `model` here.
 */
export const OpenAiCompatibleSettingsSchema = z.object({
  baseUrl: z
    .string()
    .superRefine((value, ctx) => {
      const r = parseOpenAiBaseUrl(value);
      if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
    })
    .optional(),
  model: z.string().min(1).optional(),
});
export type OpenAiCompatibleSettings = z.infer<typeof OpenAiCompatibleSettingsSchema>;

export const LlmTaskSettingSchema = z.object({
  /** Absent = the machine's provider (LLM_PROVIDER in .env, default agy). */
  provider: llmProviderEnum.optional(),
  /** Model id of THAT provider (agy aliases for agy, API ids for the others). Absent = provider default. */
  model: z.string().min(1).optional(),
  thinking: z.enum(["default", "minimal", "low", "medium", "high"]).optional(),
  /** Tried once when the provider fails or its quota ends. Absent = no fallback. */
  fallback: z
    .object({
      provider: llmProviderEnum,
      model: z.string().min(1).optional(),
      /** Needed for a paid provider (gemini/anthropic): without it the fallback is ignored. Never on by default. */
      allowPaid: z.boolean().optional(),
    })
    .optional(),
});
export type LlmTaskSetting = z.infer<typeof LlmTaskSettingSchema>;

/** Seção `llm` de pipeline.config.json. */
export const LlmSettingsSchema = z.object({
  /** Server of the "openai-compatible" provider. Absent = the provider is not usable. */
  openaiCompatible: OpenAiCompatibleSettingsSchema.optional(),
  /** Strict on purpose: a typo in a task name would silently drop its provider/fallback rules. */
  tasks: z
    .strictObject(Object.fromEntries(LLM_TASK_NAMES.map((t) => [t, LlmTaskSettingSchema.optional()])) as Record<LlmTaskName, z.ZodOptional<typeof LlmTaskSettingSchema>>)
    .optional(),
});
export type LlmSettings = z.infer<typeof LlmSettingsSchema>;
