<?php

namespace App\Domains\Videos\Actions;

use App\Domains\Marca\Models\KitMarca;
use App\Domains\Videos\Models\Video;
use App\Worker\FilaMidia;
use Illuminate\Support\Str;

/**
 * Põe o vídeo bruto na fila de edição seguindo o formulário revisado (RF52): palavra-chave, chamada, trechos
 * cortados, destaques da legenda e a transcrição da análise, com o kit de marca vigente (o vídeo sai no padrão de
 * quando foi mandado). Cada edição grava um arquivo novo, então qualquer aprovação anterior deixa de valer (RF27).
 * Chame dentro de uma transação: vídeo e tarefa entram juntos (D4).
 */
class EnfileirarEdicao
{
    public function __construct(private readonly FilaMidia $fila) {}

    public function __invoke(Video $video): void
    {
        $kit = KitMarca::doCliente($video->cliente_id);
        $palavra = (string) $video->campo('palavra_chave');
        $cta = $video->campo('cta');
        $trechos = $video->trechos ?? [];
        $tarefa = $this->fila->enfileirar('editar_video', [
            'video_id' => $video->id,
            'arquivo_bruto' => $video->arquivo_bruto,
            'arquivo_editado' => "editados/{$video->cliente_id}/{$video->id}-".Str::uuid().'.mp4',
            'palavra_chave' => $palavra,
            'cta' => $cta ?? $kit->chamadaPara($palavra),
            'kit' => $kit->paraTarefa(),
            'transcricao' => $video->transcricao,
            'cortes' => array_values(array_map(
                fn (int $i) => [$trechos[$i]['inicio'], $trechos[$i]['fim']],
                array_filter(array_map('intval', (array) ($video->campo('cortes') ?? [])), fn (int $i) => isset($trechos[$i])),
            )),
            'destaques' => $video->campo('destaques') ?? [],
        ]);
        $video->semAprovacao()->fill([
            'palavra_chave' => $palavra,
            'cta' => $cta,
            'legenda' => $video->campo('legenda'),
            'status' => Video::AGUARDANDO_EDICAO,
            'tarefa_edicao_id' => $tarefa->id,
            'erro' => null,
        ])->save();
    }
}
