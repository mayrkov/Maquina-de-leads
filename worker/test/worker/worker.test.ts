import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FilaMidia } from "../../src/worker/fila.js";
import { editarVideo } from "../../src/worker/jobs/editarVideo.js";
import { caminhoDaChave } from "../../src/worker/midia.js";
import type { RunContext } from "../../src/orchestrator/types.js";

describe("chaves de arquivo da mídia", () => {
  it("resolve dentro da pasta e recusa o que sai dela", () => {
    expect(caminhoDaChave("/m", "brutos/1/a.mp4")).toBe("/m/brutos/1/a.mp4");
    for (const ruim of ["", "/etc/passwd", "../fora.mp4", "brutos/../../fora.mp4"]) expect(() => caminhoDaChave("/m", ruim)).toThrow();
  });
});

describe("tarefa editar_video", () => {
  it("edita e grava o vídeo final na chave pedida, com um runId por tarefa", async () => {
    const root = mkdtempSync(join(tmpdir(), "midia-"));
    const runDir = mkdtempSync(join(tmpdir(), "run-"));
    writeFileSync(join(runDir, "final.mp4"), "mp4");
    let pedido: { source: string; keyword: string; runId?: string } | undefined;
    const falso = async (o: { source: string; keyword: string; runId?: string }): Promise<RunContext> => {
      pedido = o;
      return { runId: o.runId ?? "", runDir, createdAt: "", render: { videoPath: join(runDir, "final.mp4"), durationSeconds: 42.5, width: 1080, height: 1920 } };
    };
    const r = await editarVideo(7, { video_id: 1, arquivo_bruto: "brutos/1/a.mp4", arquivo_editado: "editados/1/b.mp4", palavra_chave: "OUVIDO", cta: null }, root, () => undefined, falso as never);

    expect(pedido).toMatchObject({ source: join(root, "brutos/1/a.mp4"), keyword: "OUVIDO", runId: "tarefa-7" });
    expect(r).toEqual({ arquivo_editado: "editados/1/b.mp4", duracao_segundos: 42.5 });
    expect(readFileSync(join(root, "editados/1/b.mp4"), "utf8")).toBe("mp4");
  });

  it("segue o formulário revisado: transcrição da análise, trechos cortados e destaques", async () => {
    const root = mkdtempSync(join(tmpdir(), "midia-"));
    const runDir = mkdtempSync(join(tmpdir(), "run-"));
    writeFileSync(join(runDir, "final.mp4"), "mp4");
    let pedido: Record<string, unknown> | undefined;
    const falso = async (o: Record<string, unknown>): Promise<RunContext> => {
      pedido = o;
      return { runId: "x", runDir, createdAt: "", render: { videoPath: join(runDir, "final.mp4"), durationSeconds: 30, width: 1080, height: 1920 } };
    };
    const payload = { video_id: 1, arquivo_bruto: "brutos/1/a.mp4", arquivo_editado: "editados/1/b.mp4", palavra_chave: "NARIZ", cta: "Comenta NARIZ", transcricao: "transcricoes/1/1.json", cortes: [[0, 4.5]], destaques: ["anos"] };
    await editarVideo(8, payload, root, () => undefined, falso as never);

    expect(pedido).toMatchObject({ transcript: join(root, "transcricoes/1/1.json"), extraCuts: [[0, 4.5]], captions: { emphasis: ["anos"] } });
    await expect(editarVideo(8, { ...payload, cortes: [[5, 2]] }, root, () => undefined, falso as never)).rejects.toThrow();
    await expect(editarVideo(8, { ...payload, transcricao: "../fora.json" }, root, () => undefined, falso as never)).rejects.toThrow(/inválida/);
  });

  it("recusa payload sem as chaves", async () => {
    await expect(editarVideo(1, { video_id: 1 }, "/m", () => undefined)).rejects.toThrow();
  });
});

// Contra um Postgres de verdade (lerd: postgres://postgres:lerd@127.0.0.1:5432/maquina_de_leads_testing), num schema
// próprio. Sem WORKER_TEST_DATABASE_URL o bloco é pulado.
const URL = process.env.WORKER_TEST_DATABASE_URL;
describe.skipIf(!URL)("fila no PostgreSQL", () => {
  const schema = `worker_teste_${process.pid}`;
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL, max: 4, options: `-c search_path=${schema}` });
    await pool.query(`CREATE SCHEMA ${schema}`);
    // Mesmas colunas das migrations app/database/migrations/2026_11_14_000002_create_tarefas_midia_table.php e
    // 2026_11_14_000007_create_roteiros_table.php (etapa).
    await pool.query(`CREATE TABLE tarefas_midia (
      id bigserial PRIMARY KEY, tipo varchar(40) NOT NULL, payload jsonb NOT NULL, status varchar(20) NOT NULL DEFAULT 'pendente',
      tentativas smallint NOT NULL DEFAULT 0, max_tentativas smallint NOT NULL DEFAULT 3, disponivel_em timestamptz NOT NULL DEFAULT now(),
      worker_id varchar(100), heartbeat_em timestamptz, resultado jsonb, erro text, processada_em timestamptz,
      created_at timestamptz, updated_at timestamptz, etapa varchar(40))`);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  });

  async function nova(max = 3): Promise<number> {
    const { rows } = await pool.query<{ id: string }>("INSERT INTO tarefas_midia (tipo, payload, max_tentativas) VALUES ('editar_video', '{}', $1) RETURNING id", [max]);
    return Number(rows[0]?.id);
  }

  it("dois workers nunca pegam a mesma tarefa", async () => {
    await pool.query("DELETE FROM tarefas_midia");
    const ids = await Promise.all(Array.from({ length: 6 }, () => nova()));
    const a = new FilaMidia(pool, "a");
    const b = new FilaMidia(pool, "b");
    const pegas = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? a : b).pegar()));
    const pegos = pegas.filter((t) => t !== null).map((t) => t.id);
    expect(pegos.sort()).toEqual(ids.sort());
    expect(new Set(pegos).size).toBe(6);
  });

  it("só o dono conclui; repetir a conclusão não muda nada", async () => {
    await pool.query("DELETE FROM tarefas_midia");
    await nova();
    const a = new FilaMidia(pool, "a");
    const t = await a.pegar();
    expect(t?.tentativas).toBe(1);
    expect(await new FilaMidia(pool, "b").concluir(t!.id, { x: 1 })).toBe(false);
    expect(await a.heartbeat(t!.id)).toBe(true);
    expect(await new FilaMidia(pool, "b").etapa(t!.id, "legenda")).toBe(false);
    expect(await a.etapa(t!.id, "cortes")).toBe(true);
    expect((await pool.query("SELECT etapa FROM tarefas_midia WHERE id = $1", [t!.id])).rows[0]).toEqual({ etapa: "cortes" });
    expect(await a.concluir(t!.id, { arquivo_editado: "e.mp4" })).toBe(true);
    expect(await a.concluir(t!.id, { arquivo_editado: "outro.mp4" })).toBe(false);
    const { rows } = await pool.query("SELECT status, resultado FROM tarefas_midia WHERE id = $1", [t!.id]);
    expect(rows[0]).toMatchObject({ status: "concluida", resultado: { arquivo_editado: "e.mp4" } });
  });

  it("falha volta para a fila com espera e vira definitiva na última tentativa", async () => {
    await pool.query("DELETE FROM tarefas_midia");
    const id = await nova(2);
    const a = new FilaMidia(pool, "a");
    await a.pegar();
    await a.falhar(id, "erro 1", 0);
    let { rows } = await pool.query("SELECT status, worker_id, erro FROM tarefas_midia WHERE id = $1", [id]);
    expect(rows[0]).toMatchObject({ status: "pendente", worker_id: null, erro: "erro 1" });
    await a.pegar();
    await a.falhar(id, "erro 2", 0);
    ({ rows } = await pool.query("SELECT status, tentativas FROM tarefas_midia WHERE id = $1", [id]));
    expect(rows[0]).toMatchObject({ status: "falhou", tentativas: 2 });
    expect(await a.pegar()).toBeNull();
  });

  it("espera da nova tentativa é respeitada", async () => {
    await pool.query("DELETE FROM tarefas_midia");
    const id = await nova();
    const a = new FilaMidia(pool, "a");
    await a.pegar();
    await a.falhar(id, "erro", 3600);
    expect(await a.pegar()).toBeNull();
  });
});
