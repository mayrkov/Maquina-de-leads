<?php

namespace App\Worker;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Lado Laravel da fila do worker (arquitetura D4): enfileirar, devolver tarefas abandonadas e entregar os
 * resultados a quem trata cada tipo. O resto do código não sabe que a fila é o Postgres.
 */
class FilaMidia
{
    /**
     * Campos aceitos no payload de cada tipo. Só IDs, chaves de arquivo e o texto da tela final: nunca resposta de
     * lead nem outro dado de saúde (o worker não tem acesso a mais nada do banco).
     *
     * @var array<string, list<string>>
     */
    public const PAYLOAD_PERMITIDO = [
        'editar_video' => ['video_id', 'arquivo_bruto', 'arquivo_editado', 'palavra_chave', 'cta', 'kit', 'transcricao', 'cortes', 'destaques'],
        // Vídeo do médico (não de paciente), o briefing e o roteiro de origem; a IA devolve o formulário de edição.
        'analisar_video' => ['video_id', 'arquivo_bruto', 'transcricao', 'briefing', 'regras', 'roteiro'],
        // Briefing é dado do negócio (nicho, oferta, tom), não de paciente.
        'sugerir_personas' => ['cliente_id', 'briefing', 'catalogo'],
        // Roteiro é texto de marketing do médico, não dado de paciente; as regras são as do conselho.
        'gerar_roteiros' => ['cliente_id', 'semana_inicio', 'quantidade', 'briefing', 'catalogo', 'temas_recentes', 'regras'],
        'refazer_roteiro' => ['roteiro_id', 'briefing', 'regras', 'roteiro', 'comentario'],
        'checar_conformidade' => ['roteiro_id', 'briefing', 'regras', 'roteiro'],
    ];

    /**
     * Grava a tarefa e acorda o worker. O NOTIFY do Postgres só é entregue no commit, então dentro de uma
     * transação a tarefa só aparece para o worker se a transação confirmar.
     *
     * @param  array<string, mixed>  $payload
     */
    public function enfileirar(string $tipo, array $payload): TarefaMidia
    {
        $permitidos = self::PAYLOAD_PERMITIDO[$tipo] ?? throw new InvalidArgumentException("Tipo de tarefa desconhecido: {$tipo}");
        $extras = array_diff(array_keys($payload), $permitidos);
        if ($extras !== []) {
            throw new InvalidArgumentException("Campos não permitidos no payload de {$tipo}: ".implode(', ', $extras));
        }

        $tarefa = TarefaMidia::create([
            'tipo' => $tipo,
            'payload' => $payload,
            'status' => TarefaMidia::PENDENTE,
            'max_tentativas' => config('midia.fila.max_tentativas'),
        ]);

        DB::statement('NOTIFY '.config('midia.fila.canal'));

        return $tarefa;
    }

    /**
     * Tarefas em andamento sem sinal de vida voltam para a fila; as que já gastaram as tentativas viram falha definitiva.
     *
     * @return int Quantas tarefas foram mexidas.
     */
    public function devolverAbandonadas(): int
    {
        $limite = now()->subSeconds((int) config('midia.fila.abandono_segundos'));

        return DB::update(
            "UPDATE tarefas_midia
                SET status = CASE WHEN tentativas >= max_tentativas THEN 'falhou' ELSE 'pendente' END,
                    erro = CASE WHEN tentativas >= max_tentativas THEN 'Worker parou de responder (sem sinal de vida)' ELSE erro END,
                    worker_id = NULL,
                    disponivel_em = now(),
                    updated_at = now()
              WHERE status = 'em_andamento' AND (heartbeat_em IS NULL OR heartbeat_em < ?)",
            [$limite],
        );
    }

    /**
     * Entrega cada tarefa concluída ou com falha definitiva ao tratador do seu tipo, uma vez só.
     *
     * @param  array<string, callable(TarefaMidia): void>  $tratadores
     * @return int Quantas tarefas foram processadas.
     */
    public function processarResultados(array $tratadores): int
    {
        $feitas = 0;
        $ids = TarefaMidia::query()
            ->whereIn('status', [TarefaMidia::CONCLUIDA, TarefaMidia::FALHOU])
            ->whereNull('processada_em')
            ->orderBy('id')
            ->limit(100)
            ->pluck('id');

        foreach ($ids as $id) {
            DB::transaction(function () use ($id, $tratadores, &$feitas) {
                $tarefa = TarefaMidia::query()->whereKey($id)->whereNull('processada_em')->lockForUpdate()->first();
                if (! $tarefa) {
                    return;
                }
                $tratador = $tratadores[$tarefa->tipo] ?? null;
                if ($tratador) {
                    $tratador($tarefa);
                }
                $tarefa->forceFill(['processada_em' => now()])->save();
                $feitas++;
            });
        }

        return $feitas;
    }

    /** Apaga tarefas já processadas há mais tempo que o prazo de guarda. */
    public function limparProcessadas(): int
    {
        $limite = now()->subDays((int) config('midia.fila.guardar_processadas_dias'));

        return TarefaMidia::query()->whereNotNull('processada_em')->where('processada_em', '<', $limite)->delete();
    }
}
