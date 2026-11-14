/**
 * Edição do vídeo cru (Máquina de Leads).
 *   npm run edit -- --video <arquivo.mp4> --keyword OUVIDO [--cta "texto da tela final"] [--framing face|open] [--style padrao|impacto]
 *   npm run edit -- --video <arquivo.mp4> --keyword OUVIDO --resume <runId>   # retoma sem refazer o que já foi feito
 * Saída: render_output/<runId>/final.mp4 + context.json. Nada é publicado.
 * Códigos de saída: 0 ok, 1 erro.
 */
import { parseArgs } from "node:util";
import { editRawVideo } from "../src/orchestrator/edit/pipeline.js";
import { describeError, getLogger } from "../src/orchestrator/lib/logger.js";

const USAGE = 'Uso: npm run edit -- --video <arquivo.mp4> --keyword <PALAVRA> [--cta "texto"] [--framing face|open] [--style padrao|impacto] [--resume <runId>]';

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      video: { type: "string" },
      keyword: { type: "string" },
      cta: { type: "string" },
      framing: { type: "string" },
      style: { type: "string" },
      resume: { type: "string" },
    },
    strict: true,
  });
  if (!values.video || !values.keyword) throw new Error(USAGE);
  if (values.framing && values.framing !== "face" && values.framing !== "open") throw new Error(USAGE);
  if (values.style && values.style !== "padrao" && values.style !== "impacto") throw new Error(USAGE);
  const log = getLogger(values.resume ?? `edit-${new Date().toISOString().slice(0, 10)}`);
  await editRawVideo(
    {
      source: values.video,
      keyword: values.keyword,
      cta: values.cta,
      framing: values.framing as "face" | "open" | undefined,
      captionStyle: values.style as "padrao" | "impacto" | undefined,
      runId: values.resume,
    },
    (m) => log.info(m),
  );
}

main().catch((error: unknown) => {
  console.error(describeError(error));
  process.exitCode = 1;
});
