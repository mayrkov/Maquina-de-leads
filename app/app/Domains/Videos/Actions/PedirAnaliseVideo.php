<?php

namespace App\Domains\Videos\Actions;

use App\Domains\Videos\Models\Video;
use App\Worker\FilaMidia;

/**
 * Põe o vídeo bruto na análise da IA (RF51): transcrição e formulário de edição sugerido. Com roteiro, a IA parte
 * dele; avulso, deduz tudo do vídeo. Chame dentro de uma transação: vídeo e tarefa mudam juntos (D4).
 */
class PedirAnaliseVideo
{
    public function __construct(private readonly FilaMidia $fila) {}

    public function __invoke(Video $video): void
    {
        $video->loadMissing(['cliente', 'roteiro.persona']);
        $roteiro = $video->roteiro;
        $tarefa = $this->fila->enfileirar('analisar_video', [
            'video_id' => $video->id,
            'arquivo_bruto' => $video->arquivo_bruto,
            'transcricao' => "transcricoes/{$video->cliente_id}/{$video->id}.json",
            'briefing' => $video->cliente->briefingParaIa(),
            // Objeto JSON mesmo sem regras (o worker espera {id: regra}).
            'regras' => (object) (config('conformidade.'.$video->cliente->conselho) ?? []),
            'roteiro' => $roteiro ? [
                ...$roteiro->only('tema', 'gancho', 'desenvolvimento', 'cta', 'palavra_chave'),
                'persona' => $roteiro->persona?->nome,
            ] : null,
        ]);
        $video->update(['status' => Video::ANALISANDO, 'tarefa_analise_id' => $tarefa->id, 'erro' => null]);
    }
}
