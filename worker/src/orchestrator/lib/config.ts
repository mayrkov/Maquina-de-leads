import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { applyStoredKeys, secretsDir } from "./secretStore.js";
import { LlmSettingsSchema, WatermarkSettingsSchema } from "../../shared/settings.js";

const PACKAGE_NAME = "maquina-de-leads-worker";

/**
 * Walks up from this file until it finds the project's package.json. Independent of process.cwd(),
 * so the worker works no matter where it is launched from (IDE, container, another folder).
 */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath) && readPackageName(pkgPath) === PACKAGE_NAME) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate project root (package.json named "${PACKAGE_NAME}") above ${startDir}`);
    }
    dir = parent;
  }
}

function readPackageName(pkgPath: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
    return z.object({ name: z.string() }).safeParse(parsed).data?.name;
  } catch {
    // Unreadable/invalid package.json is not ours; keep walking up.
    return undefined;
  }
}

export const projectRoot: string = findProjectRoot(dirname(fileURLToPath(import.meta.url)));

export const paths = {
  root: projectRoot,
  config: join(projectRoot, "config"),
  data: join(projectRoot, "data"),
  logs: join(projectRoot, "logs"),
  renderOutput: join(projectRoot, "render_output"),
  /** Resolves a project-relative path (forward slashes allowed) to an absolute path. */
  fromRoot: (...segments: string[]): string => resolve(projectRoot, ...segments),
} as const;

dotenv.config({ path: join(projectRoot, ".env"), quiet: true });
// Keys stored in secrets/api-keys.json fill what .env left unset.
applyStoredKeys(secretsDir(projectRoot));

export const PipelineConfigSchema = z.object({
  /** Marca d'água fixa do worker; vira parte do kit de marca de cada cliente (RF15). */
  watermark: WatermarkSettingsSchema.optional(),
  /** Provedor e modelo de IA por tarefa (lib/llmTasks.ts). Absent = provider default (LLM_PROVIDER etc.). */
  llm: LlmSettingsSchema.optional(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

let cachedConfig: PipelineConfig | undefined;

export function loadConfig(): PipelineConfig {
  if (cachedConfig) return cachedConfig;
  // PIPELINE_CONFIG: one-off runs without touching the default file.
  const override = env("PIPELINE_CONFIG");
  const configPath = override ? paths.fromRoot(override) : join(paths.config, "pipeline.config.json");
  const raw: unknown = JSON.parse(readFileSync(configPath, "utf8"));
  const result = PipelineConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid ${configPath}:\n${z.prettifyError(result.error)}`);
  }
  cachedConfig = result.data;
  return cachedConfig;
}

/** Reads a trimmed env var, treating empty strings as unset. */
export function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
