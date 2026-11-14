<?php

use App\Domains\Marca\Models\KitMarca;
use App\Domains\Videos\Actions\EnfileirarEdicao;
use App\Domains\Videos\Models\Video;
use App\Worker\TarefaMidia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function kitValido(array $extra = []): array
{
    return ['cor_primaria' => '#112233', 'cor_destaque' => '#FFE11A', 'cor_texto' => '#FFFFFF', 'fonte_titulos' => 'anton', 'estilo_legenda' => 'impacto', 'logo_posicao' => 'top-left', 'tela_final_texto' => 'Comenta {PALAVRA} aqui', 'capa_modelo' => 'titulo_foto', ...$extra];
}

beforeEach(fn () => Storage::fake('midia'));

test('sem kit salvo a tela mostra os padrões', function () {
    $this->actingAs(usuarioDeCliente())->get(route('kit.edit'))
        ->assertInertia(fn ($page) => $page->component('kit/edit')->where('kit.configurado', false)->where('kit.cor_destaque', '#FFE11A'));
});

test('salva cores, fontes, logo e vinheta no disco privado', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->post(route('kit.update'), kitValido([
        'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        'vinheta' => UploadedFile::fake()->create('vinheta.mp4', 300, 'video/mp4'),
    ]))->assertSessionHasNoErrors();

    $kit = KitMarca::query()->where('cliente_id', $u->cliente_id)->sole();
    expect($kit->fonte_titulos)->toBe('anton')->and($kit->vinheta_nome)->toBe('vinheta.mp4');
    Storage::disk('midia')->assertExists([$kit->logo, $kit->vinheta]);
    $this->actingAs($u)->get(route('kit.logo'))->assertOk();
});

test('trocar o logo apaga o antigo; remover limpa', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->post(route('kit.update'), kitValido(['logo' => UploadedFile::fake()->image('a.png')]));
    $antigo = KitMarca::query()->where('cliente_id', $u->cliente_id)->value('logo');
    $this->actingAs($u)->post(route('kit.update'), kitValido(['logo' => UploadedFile::fake()->image('b.png')]));
    Storage::disk('midia')->assertMissing($antigo);

    $this->actingAs($u)->post(route('kit.update'), kitValido(['remover_logo' => true]));
    expect(KitMarca::query()->where('cliente_id', $u->cliente_id)->value('logo'))->toBeNull();
    $this->actingAs($u)->get(route('kit.logo'))->assertNotFound();
});

test('valida cor, fonte, arquivo e o {PALAVRA} da tela final', function () {
    $this->actingAs(usuarioDeCliente())->post(route('kit.update'), kitValido([
        'cor_primaria' => 'azul', 'fonte_titulos' => 'comic', 'tela_final_texto' => 'Comente aqui', 'logo' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
    ]))->assertSessionHasErrors(['cor_primaria', 'fonte_titulos', 'tela_final_texto', 'logo']);
});

test('o vídeo mandado para a edição leva o kit e, sem chamada no formulário, a da tela final do cliente', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->post(route('kit.update'), kitValido());
    $video = Video::factory()->create(['cliente_id' => $u->cliente_id, 'status' => Video::FORMULARIO, 'formulario' => ['palavra_chave' => 'OUVIDO', 'cta' => null, 'legenda' => 'Legenda']]);
    app(EnfileirarEdicao::class)($video);

    $p = TarefaMidia::query()->where('tipo', 'editar_video')->sole()->payload;
    expect($p['cta'])->toBe('Comenta OUVIDO aqui')
        ->and($p['kit']['cor_primaria'])->toBe('#112233')
        ->and($p['kit']['estilo_legenda'])->toBe('impacto')
        ->and($video->fresh()->status)->toBe(Video::AGUARDANDO_EDICAO);
});
