<?php

namespace App\Domains\Videos\Actions;

use App\Domains\Videos\Models\Video;
use App\Worker\TarefaMidia;

/** Tratador da tarefa editar_video: leva o resultado do worker para o vídeo. */
class AplicarResultadoEdicao
{
    public function __invoke(TarefaMidia $tarefa): void
    {
        $video = Video::query()->whereKey((int) ($tarefa->payload['video_id'] ?? 0))->first();
        // Descartado, ajustado ou mandado de novo enquanto o worker editava: este resultado não vale mais.
        if (! $video || $video->status !== Video::AGUARDANDO_EDICAO || $video->tarefa_edicao_id !== $tarefa->id) {
            return;
        }

        if ($tarefa->status === TarefaMidia::CONCLUIDA) {
            $video->update([
                'status' => Video::EDITADO,
                'arquivo_editado' => $tarefa->resultado['arquivo_editado'] ?? null,
                'duracao_segundos' => $tarefa->resultado['duracao_segundos'] ?? null,
                'erro' => null,
            ]);

            return;
        }

        $video->update(['status' => Video::FALHOU, 'erro' => $tarefa->erro]);
    }
}
