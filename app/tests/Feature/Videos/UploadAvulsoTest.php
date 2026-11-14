<?php

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Videos\Models\Video;
use App\Models\User;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('midia');
    $this->cliente = Cliente::factory()->create();
    $this->usuario = User::factory()->create();
    $this->usuario->forceFill(['cliente_id' => $this->cliente->id])->save();
});

function videoFalso(string $nome = 'take_01.mp4', string $mime = 'video/mp4'): UploadedFile
{
    return UploadedFile::fake()->create($nome, 500, $mime);
}

test('sem login não envia nem vê vídeos', function () {
    $this->get(route('videos.index'))->assertRedirect(route('login'));
    $this->post(route('videos.store'), ['video' => videoFalso()])->assertRedirect(route('login'));
    expect(Video::count())->toBe(0);
});

test('upload guarda o arquivo, registra o vídeo e pede a análise da IA sem roteiro (RF51)', function () {
    $this->actingAs($this->usuario)
        ->post(route('videos.store'), ['video' => videoFalso()])
        ->assertRedirect(route('videos.index'));

    $video = Video::sole();
    expect($video->cliente_id)->toBe($this->cliente->id)
        ->and($video->palavra_chave)->toBeNull()
        ->and($video->status)->toBe(Video::ANALISANDO);
    Storage::disk('midia')->assertExists($video->arquivo_bruto);

    $tarefa = TarefaMidia::sole();
    expect($video->tarefa_analise_id)->toBe($tarefa->id)
        ->and($tarefa->tipo)->toBe('analisar_video')
        ->and($tarefa->status)->toBe(TarefaMidia::PENDENTE)
        ->and(array_keys($tarefa->payload))->toEqualCanonicalizing(FilaMidia::PAYLOAD_PERMITIDO['analisar_video'])
        ->and($tarefa->payload['arquivo_bruto'])->toBe($video->arquivo_bruto)
        ->and($tarefa->payload['roteiro'])->toBeNull();
});

test('recusa arquivo que não é vídeo', function () {
    $this->actingAs($this->usuario)
        ->post(route('videos.store'), ['video' => videoFalso('nota.pdf', 'application/pdf')])
        ->assertSessionHasErrors(['video']);

    expect(Video::count())->toBe(0)->and(TarefaMidia::count())->toBe(0);
});

test('usuário sem cliente não envia', function () {
    $semCliente = User::factory()->create();
    $this->actingAs($semCliente)->post(route('videos.store'), ['video' => videoFalso()])->assertForbidden();
    $this->actingAs($semCliente)->get(route('videos.index'))->assertForbidden();
});

test('vídeo de outro cliente não aparece na lista e o download responde 404', function () {
    $deOutro = Video::factory()->create(['arquivo_editado' => 'editados/9/x.mp4', 'status' => Video::EDITADO]);
    Storage::disk('midia')->put('editados/9/x.mp4', 'mp4');

    $this->actingAs($this->usuario)->get(route('videos.index'))
        ->assertInertia(fn ($page) => $page->component('videos/index')->has('videos.data', 0));
    $this->actingAs($this->usuario)->get(route('videos.editado', $deOutro->id))->assertNotFound();
});

test('download do vídeo editado do próprio cliente', function () {
    $meu = Video::factory()->create(['cliente_id' => $this->cliente->id, 'arquivo_editado' => 'editados/1/v.mp4', 'status' => Video::EDITADO]);
    Storage::disk('midia')->put('editados/1/v.mp4', 'mp4');

    $this->actingAs($this->usuario)->get(route('videos.editado', $meu->id))->assertOk()->assertDownload("video-{$meu->id}.mp4");
});
