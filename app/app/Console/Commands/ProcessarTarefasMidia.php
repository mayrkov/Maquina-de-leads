<?php

namespace App\Console\Commands;

use App\Domains\Personas\Actions\AplicarSugestaoPersonas;
use App\Domains\Roteiros\Actions\AplicarResultadosRoteiro;
use App\Domains\Videos\Actions\AplicarResultadoAnalise;
use App\Domains\Videos\Actions\AplicarResultadoEdicao;
use App\Worker\FilaMidia;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/** Comando agendado a cada minuto (arquitetura D4, passo 5). */
#[Signature('tarefas:processar')]
#[Description('Trata resultados do worker, devolve tarefas abandonadas e limpa as antigas')]
class ProcessarTarefasMidia extends Command
{
    public function handle(FilaMidia $fila, AplicarResultadoEdicao $aplicarEdicao, AplicarSugestaoPersonas $aplicarPersonas, AplicarResultadosRoteiro $roteiros, AplicarResultadoAnalise $analise): int
    {
        $devolvidas = $fila->devolverAbandonadas();
        $processadas = $fila->processarResultados([
            'analisar_video' => $analise(...),
            'editar_video' => $aplicarEdicao(...),
            'sugerir_personas' => $aplicarPersonas(...),
            'gerar_roteiros' => $roteiros->gerados(...),
            'refazer_roteiro' => $roteiros->refeito(...),
            'checar_conformidade' => $roteiros->checado(...),
        ]);
        $apagadas = $fila->limparProcessadas();

        $this->info("abandonadas: {$devolvidas}, processadas: {$processadas}, apagadas: {$apagadas}");

        return self::SUCCESS;
    }
}
