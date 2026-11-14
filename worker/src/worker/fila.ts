/**
 * Lado worker da fila tarefas_midia (arquitetura D4): pegar, sinal de vida, concluir e falhar.
 * O worker só tem SELECT e UPDATE nesta tabela; o Laravel cria as tarefas e trata os resultados.
 */
import { z } from "zod";

export const CANAL = "tarefas_midia";

/** O mínimo de um cliente pg que a fila usa (pg.Client e pg.Pool servem; nos testes, um falso). */
export interface Consultavel {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

const TarefaSchema = z.object({
  id: z.coerce.number().int().positive(),
  tipo: z.string(),
  payload: z.record(z.string(), z.unknown()),
  tentativas: z.number().int(),
  max_tentativas: z.number().int(),
});
export type Tarefa = z.infer<typeof TarefaSchema>;

/** SKIP LOCKED: dois workers nunca pegam a mesma tarefa. */
export const SQL_PEGAR = `
UPDATE tarefas_midia
   SET status = 'em_andamento', worker_id = $1, tentativas = tentativas + 1, heartbeat_em = now(), etapa = NULL, updated_at = now()
 WHERE id = (
   SELECT id FROM tarefas_midia
    WHERE status = 'pendente' AND disponivel_em <= now()
    ORDER BY disponivel_em, id
    FOR UPDATE SKIP LOCKED
    LIMIT 1)
RETURNING id, tipo, payload, tentativas, max_tentativas`;

// Toda escrita confere que a tarefa ainda está em andamento e é deste worker: se o Laravel a devolveu para a
// fila (sem sinal de vida) e outro worker a pegou, este não sobrescreve nada.
const DONO = "id = $1 AND worker_id = $2 AND status = 'em_andamento'";

export const SQL_HEARTBEAT = `UPDATE tarefas_midia SET heartbeat_em = now() WHERE ${DONO}`;

/** Etapa em que a tarefa está, para a tela acompanhar (ex.: a edição automática). */
export const SQL_ETAPA = `UPDATE tarefas_midia SET etapa = $3, heartbeat_em = now() WHERE ${DONO}`;

export const SQL_CONCLUIR = `
UPDATE tarefas_midia SET status = 'concluida', resultado = $3::jsonb, erro = NULL, heartbeat_em = now(), updated_at = now()
 WHERE ${DONO}`;

/** Com tentativas sobrando volta para a fila depois de `$4` segundos; senão vira falha definitiva. */
export const SQL_FALHAR = `
UPDATE tarefas_midia
   SET status = CASE WHEN tentativas < max_tentativas THEN 'pendente' ELSE 'falhou' END,
       worker_id = CASE WHEN tentativas < max_tentativas THEN NULL ELSE worker_id END,
       disponivel_em = now() + make_interval(secs => $4),
       erro = $3, updated_at = now()
 WHERE ${DONO}`;

export class FilaMidia {
  constructor(
    private readonly db: Consultavel,
    readonly workerId: string,
  ) {}

  async pegar(): Promise<Tarefa | null> {
    const { rows } = await this.db.query(SQL_PEGAR, [this.workerId]);
    return rows[0] ? TarefaSchema.parse(rows[0]) : null;
  }

  /** false = a tarefa não é mais deste worker (devolvida ou já concluída). */
  async heartbeat(id: number): Promise<boolean> {
    return ((await this.db.query(SQL_HEARTBEAT, [id, this.workerId])).rowCount ?? 0) > 0;
  }

  async etapa(id: number, etapa: string): Promise<boolean> {
    return ((await this.db.query(SQL_ETAPA, [id, this.workerId, etapa.slice(0, 40)])).rowCount ?? 0) > 0;
  }

  async concluir(id: number, resultado: Record<string, unknown>): Promise<boolean> {
    return ((await this.db.query(SQL_CONCLUIR, [id, this.workerId, JSON.stringify(resultado)])).rowCount ?? 0) > 0;
  }

  async falhar(id: number, erro: string, esperaSegundos: number): Promise<boolean> {
    return ((await this.db.query(SQL_FALHAR, [id, this.workerId, erro.slice(0, 2000), esperaSegundos])).rowCount ?? 0) > 0;
  }
}
