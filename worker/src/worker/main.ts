/**
 * Worker de mídia (arquitetura D3 e D4): espera tarefas em tarefas_midia com LISTEN, pega uma de cada vez com
 * SKIP LOCKED, manda sinal de vida enquanto trabalha e grava o resultado. Sem porta aberta e sem login próprio:
 * só fala com o banco (usuário com SELECT e UPDATE só nesta tabela) e com a pasta de mídia.
 *
 *   DATABASE_URL=postgres://maquina_worker:...@host/maquina_de_leads MIDIA_ROOT=/caminho/da/midia npm run worker
 */
import { hostname } from "node:os";
import pg from "pg";
import { env } from "../orchestrator/lib/config.js";
import { describeError, getLogger } from "../orchestrator/lib/logger.js";
import { redactSecrets } from "../orchestrator/lib/redact.js";
import { CANAL, FilaMidia, type Tarefa } from "./fila.js";
import { analisarVideo } from "./jobs/analisarVideo.js";
import { editarVideo } from "./jobs/editarVideo.js";
import { checarConformidade, gerarRoteiros, refazerRoteiro } from "./jobs/roteiros.js";
import { sugerirPersonas } from "./jobs/sugerirPersonas.js";
import { midiaRoot } from "./midia.js";

const HEARTBEAT_MS = Number(env("WORKER_HEARTBEAT_SECONDS") ?? 30) * 1000;
/** Mesmo sem NOTIFY (conexão caiu e voltou), confere a fila de tempos em tempos: tarefas com espera vencida. */
const POLL_MS = 60_000;
/** Espera antes de uma nova tentativa, por tentativa já feita. */
const ESPERA_POR_TENTATIVA_S = 60;

type Executor = (tarefa: Tarefa, root: string, log: (m: string) => void, etapa: (nome: string) => void) => Promise<Record<string, unknown>>;

const EXECUTORES: Record<string, Executor> = {
  analisar_video: (t, root, log) => analisarVideo(t.payload, root, log),
  editar_video: (t, root, log, etapa) => editarVideo(t.id, t.payload, root, log, undefined, etapa),
  sugerir_personas: (t, _root, log) => sugerirPersonas(t.payload, log),
  gerar_roteiros: (t, _root, log) => gerarRoteiros(t.payload, log),
  refazer_roteiro: (t, _root, log) => refazerRoteiro(t.payload, log),
  checar_conformidade: (t, _root, log) => checarConformidade(t.payload, log),
};

async function main(): Promise<void> {
  const url = env("DATABASE_URL");
  if (!url) throw new Error("Defina DATABASE_URL com o usuário de banco do worker");
  const root = midiaRoot();
  const workerId = env("WORKER_ID") ?? `${hostname()}-${process.pid}`;
  const log = getLogger(`worker-${new Date().toISOString().slice(0, 10)}`);

  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const fila = new FilaMidia(pool, workerId);
  const escuta = new pg.Client({ connectionString: url });
  await escuta.connect();
  await escuta.query(`LISTEN ${CANAL}`);

  let parar = false;
  let acordar: () => void = () => undefined;
  escuta.on("notification", () => acordar());
  escuta.on("error", (e) => {
    log.error(`conexão do LISTEN caiu: ${describeError(e)}`);
    process.exitCode = 1;
    parar = true;
    acordar();
  });
  for (const sinal of ["SIGINT", "SIGTERM"] as const) {
    process.on(sinal, () => {
      // A tarefa em andamento não é marcada: sem sinal de vida, o Laravel a devolve para a fila e ela é retomada.
      log.info(`${sinal}: parando depois da tarefa atual`);
      parar = true;
      acordar();
    });
  }

  log.info(`worker ${workerId} esperando tarefas (mídia em ${root})`);
  while (!parar) {
    const tarefa = await fila.pegar();
    if (!tarefa) {
      await new Promise<void>((ok) => {
        const t = setTimeout(ok, POLL_MS);
        acordar = () => {
          clearTimeout(t);
          ok();
        };
      });
      continue;
    }
    await executar(fila, tarefa, root, (m) => log.info(`[tarefa ${tarefa.id}] ${m}`));
  }

  await escuta.end();
  await pool.end();
}

async function executar(fila: FilaMidia, tarefa: Tarefa, root: string, log: (m: string) => void): Promise<void> {
  log(`${tarefa.tipo}, tentativa ${tarefa.tentativas} de ${tarefa.max_tentativas}`);
  const vida = setInterval(() => {
    fila.heartbeat(tarefa.id).catch((e: unknown) => log(`sinal de vida falhou: ${describeError(e)}`));
  }, HEARTBEAT_MS);
  try {
    const executor = EXECUTORES[tarefa.tipo];
    if (!executor) throw new Error(`Tipo de tarefa desconhecido: ${tarefa.tipo}`);
    const etapa = (nome: string) => void fila.etapa(tarefa.id, nome).catch((e: unknown) => log(`etapa não registrada: ${describeError(e)}`));
    const resultado = await executor(tarefa, root, log, etapa);
    if (!(await fila.concluir(tarefa.id, resultado))) log("resultado descartado: a tarefa não é mais deste worker");
    else log("concluída");
  } catch (e) {
    log(`falhou: ${describeError(e)}`);
    // No banco (e na tela) vai só a mensagem, sem a pilha; a pilha fica no log do worker.
    const erro = redactSecrets(e instanceof Error ? e.message : String(e));
    await fila.falhar(tarefa.id, erro, ESPERA_POR_TENTATIVA_S * tarefa.tentativas);
  } finally {
    clearInterval(vida);
  }
}

main().catch((e: unknown) => {
  console.error(describeError(e));
  process.exitCode = 1;
});
