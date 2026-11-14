<?php

use App\Domains\Videos\Models\Video;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Illuminate\Support\Facades\DB;

function payloadEdicao(int $videoId): array
{
    return ['video_id' => $videoId, 'arquivo_bruto' => 'brutos/1/a.mp4', 'arquivo_editado' => 'editados/1/a.mp4', 'palavra_chave' => 'OUVIDO', 'cta' => null];
}

test('payload com campo fora da lista é recusado (nada de dado de saúde na fila)', function () {
    $fila = app(FilaMidia::class);
    expect(fn () => $fila->enfileirar('editar_video', payloadEdicao(1) + ['respostas_lead' => 'otite']))->toThrow(InvalidArgumentException::class)
        ->and(fn () => $fila->enfileirar('tipo_inventado', []))->toThrow(InvalidArgumentException::class)
        ->and(TarefaMidia::count())->toBe(0);
});

test('transação desfeita não deixa tarefa na fila', function () {
    try {
        DB::transaction(function () {
            app(FilaMidia::class)->enfileirar('editar_video', payloadEdicao(1));
            throw new RuntimeException('falhou depois de enfileirar');
        });
    } catch (RuntimeException) {
    }

    expect(TarefaMidia::count())->toBe(0);
});

test('tarefa sem sinal de vida volta para a fila; sem tentativas sobrando vira falha', function () {
    config(['midia.fila.abandono_segundos' => 600]);
    $viva = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => [], 'status' => 'em_andamento', 'tentativas' => 1, 'max_tentativas' => 3, 'heartbeat_em' => now()]);
    $parada = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => [], 'status' => 'em_andamento', 'tentativas' => 1, 'max_tentativas' => 3, 'heartbeat_em' => now()->subHour(), 'worker_id' => 'w1']);
    $esgotada = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => [], 'status' => 'em_andamento', 'tentativas' => 3, 'max_tentativas' => 3, 'heartbeat_em' => now()->subHour()]);

    expect(app(FilaMidia::class)->devolverAbandonadas())->toBe(2)
        ->and($viva->fresh()->status)->toBe('em_andamento')
        ->and($parada->fresh()->status)->toBe('pendente')
        ->and($parada->fresh()->worker_id)->toBeNull()
        ->and($esgotada->fresh()->status)->toBe('falhou');
});

test('o comando leva o resultado ao vídeo uma vez só', function () {
    $ok = Video::factory()->create();
    $ruim = Video::factory()->create();
    $tOk = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => payloadEdicao($ok->id), 'status' => 'concluida', 'resultado' => ['arquivo_editado' => 'editados/1/a.mp4', 'duracao_segundos' => 57.5]]);
    $tRuim = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => payloadEdicao($ruim->id), 'status' => 'falhou', 'erro' => 'Vídeo sem áudio']);
    $ok->update(['tarefa_edicao_id' => $tOk->id]);
    $ruim->update(['tarefa_edicao_id' => $tRuim->id]);

    $this->artisan('tarefas:processar')->assertSuccessful();

    expect($ok->fresh()->status)->toBe(Video::EDITADO)
        ->and($ok->fresh()->arquivo_editado)->toBe('editados/1/a.mp4')
        ->and((float) $ok->fresh()->duracao_segundos)->toBe(57.5)
        ->and($ruim->fresh()->status)->toBe(Video::FALHOU)
        ->and($ruim->fresh()->erro)->toBe('Vídeo sem áudio')
        ->and($tOk->fresh()->processada_em)->not->toBeNull();

    $ok->update(['status' => 'mexido']);
    $this->artisan('tarefas:processar')->assertSuccessful();
    expect($ok->fresh()->status)->toBe('mexido');
});

test('tarefas processadas antigas são apagadas', function () {
    $velha = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => [], 'status' => 'concluida', 'processada_em' => now()->subDays(30)]);
    $nova = TarefaMidia::create(['tipo' => 'editar_video', 'payload' => [], 'status' => 'concluida', 'processada_em' => now()]);

    expect(app(FilaMidia::class)->limparProcessadas())->toBe(1)
        ->and(TarefaMidia::find($velha->id))->toBeNull()
        ->and(TarefaMidia::find($nova->id))->not->toBeNull();
});
