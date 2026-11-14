// Contrato da execução de uma tarefa do worker: cada execução tem uma pasta (render_output/<runId>) e um
// context.json salvo de forma atômica a cada etapa (lib/runContext.ts), o que permite retomar (RF46).

export interface RenderResult {
  videoPath: string;
  durationSeconds: number;
  width: number;
  height: number;
}

export interface LlmUsageTotals {
  calls: number;
  inputTokens: number; // prompt tokens incl. images (and cached input, Anthropic)
  outputTokens: number; // response tokens incl. thinking/reasoning tokens
  thinkingTokens?: number; // part of outputTokens, when the provider reports it
  groundedCalls?: number; // calls with web search/grounding enabled (priced per request on top of tokens)
}

export interface LlmUsageByModel extends LlmUsageTotals {
  provider: string; // "gemini" | "anthropic"
  model: string;
}

/** Aggregated LLM usage of a run, for cost estimates (RNF08). Calls = provider responses (retries count). */
export interface LlmUsage extends LlmUsageTotals {
  byModel: LlmUsageByModel[];
  byStage: Partial<Record<StageName, LlmUsageTotals>>;
}

export interface RunContext {
  runId: string;
  runDir: string; // absolute path to render_output/<runId>
  createdAt: string;
  render?: RenderResult;
  llmUsage?: LlmUsage;
  /** Edição do vídeo bruto do cliente (tarefa editar_video, src/orchestrator/edit/). */
  edit?: RawEditInfo;
}

/** O que a edição fez com o vídeo bruto: origem, palavra-chave da tela final e quanto foi cortado. */
export interface RawEditInfo {
  source: string;
  keyword: string;
  cta: string;
  framing: "face" | "open";
  sourceSeconds: number;
  /** Duração depois dos cortes (sem a tela final). */
  keptSeconds: number;
  /** Trechos removidos por gaguejo/repetição/hesitação (segundos da fonte). */
  disfluencyCuts: [number, number][];
  endCardSeconds: number;
}

/** Etapas que chamam IA; o uso de tokens é somado por etapa (llmClient.mergeLlmUsage). */
export type StageName = "sugerir_personas" | "gerar_roteiro" | "analisar_video" | "editar_video";
