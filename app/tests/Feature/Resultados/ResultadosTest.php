<?php

use App\Domains\Leads\Models\Lead;
use App\Domains\Videos\Models\Video;
use App\Models\User;

// Canva, área 4: publicação manual (RF29), leads (RF38 a RF40) e métricas (RF41, RF42).

/** Vídeo aprovado pela produção e confirmado pelo médico, com a aprovação presa ao conteúdo atual. */
function confirmado(User $u, array $formulario = []): Video
{
    $v = Video::factory()->create([
        'cliente_id' => $u->cliente_id, 'status' => Video::CONFIRMADO, 'arquivo_editado' => 'editados/1/v.mp4', 'legenda' => 'Legenda · CRM 1',
        'palavra_chave' => 'NARIZ', 'formulario' => ['persona' => 'Adulto com rinite', 'gancho' => 'Espirra toda manhã?', ...$formulario],
        'aprovado_em' => now(), 'confirmado_em' => now(),
    ]);
    $v->update(['aprovacao_hash' => $v->hashConteudo()]);

    return $v;
}

function publicado(User $u, array $formulario = []): Video
{
    $v = confirmado($u, $formulario);
    $v->update(['status' => Video::PUBLICADO, 'post_url' => 'https://www.instagram.com/reel/abc/', 'publicado_em' => now()]);

    return $v;
}

function lead(User $u, array $extra = []): array
{
    return ['nome' => 'Maria', 'perfil' => '@maria', 'para_quem' => 'Filho de 5 anos', 'problema' => 'Respira pela boca', 'cidade' => 'Centro',
        'consentimento' => '1', 'consentimento_em' => now()->toDateString(), 'status' => 'qualificado', ...$extra];
}

test('só publica o que os dois aprovaram, do jeito que aprovaram, com o link do post', function () {
    $u = usuarioDeCliente();
    $v = confirmado($u);

    $this->actingAs($u)->get(route('publicacao.index'))->assertInertia(fn ($p) => $p->component('publicacao/index')->where('escolhido', $v->id)->has('prontos', 1));
    $this->actingAs($u)->post(route('videos.publicar', $v->id), ['post_url' => 'https://exemplo.com/post'])->assertSessionHasErrors('post_url');

    $v->update(['legenda' => 'Mudou depois']);
    $this->actingAs($u)->post(route('videos.publicar', $v->id), ['post_url' => 'https://www.instagram.com/reel/abc/'])->assertStatus(409);

    $v->update(['legenda' => 'Legenda · CRM 1']);
    $this->actingAs($u)->post(route('videos.publicar', $v->id), ['post_url' => 'https://www.instagram.com/reel/abc/'])->assertRedirect(route('publicacao.index'));
    expect($v->fresh()->status)->toBe(Video::PUBLICADO)->and($v->fresh()->publicado_por)->toBe($u->id);

    $editado = Video::factory()->create(['cliente_id' => $u->cliente_id, 'status' => Video::EDITADO]);
    $this->actingAs($u)->post(route('videos.publicar', $editado->id), ['post_url' => 'https://www.instagram.com/reel/x/'])->assertStatus(409);
});

test('lead só entra com consentimento e vídeo publicado do próprio cliente; status muda na lista', function () {
    $u = usuarioDeCliente();
    $v = publicado($u);
    $alheio = publicado(usuarioDeCliente());
    $naoPublicado = confirmado($u);

    $this->actingAs($u)->post(route('leads.store'), lead($u, ['consentimento' => null, 'video_id' => $alheio->id]))->assertSessionHasErrors(['consentimento', 'video_id']);
    $this->actingAs($u)->post(route('leads.store'), lead($u, ['video_id' => $naoPublicado->id]))->assertSessionHasErrors('video_id');
    expect(Lead::count())->toBe(0);

    $this->actingAs($u)->post(route('leads.store'), lead($u, ['video_id' => $v->id]))->assertSessionHasNoErrors();
    $l = Lead::sole();
    expect($l->cliente_id)->toBe($u->cliente_id)->and($l->registrado_por)->toBe($u->id)->and($l->consentimento_em)->not->toBeNull();

    $this->actingAs($u)->put(route('leads.update', $l->id), ['status' => 'agendou'])->assertSessionHasNoErrors();
    expect($l->fresh()->status)->toBe('agendou');
    $this->actingAs($u)->get(route('leads.index', ['status' => 'agendou']))->assertInertia(fn ($p) => $p->component('leads/index')
        ->has('leads.data', 1)->where('leads.data.0.persona', 'Adulto com rinite')->where('leads.data.0.video', $v->nome_original));
    $this->actingAs($u)->get(route('leads.index', ['status' => 'qualificado']))->assertInertia(fn ($p) => $p->has('leads.data', 0));

    // Lead de outro cliente: 404 e não aparece.
    $outro = usuarioDeCliente();
    $this->actingAs($outro)->put(route('leads.update', $l->id), ['status' => 'nao_agendou'])->assertNotFound();
    $this->actingAs($outro)->get(route('leads.index'))->assertInertia(fn ($p) => $p->has('leads.data', 0));
});

test('métricas digitadas por vídeo publicado, totais e agrupamento por persona', function () {
    $u = usuarioDeCliente();
    $a = publicado($u);
    $b = publicado($u, ['persona' => 'Mãe de criança', 'gancho' => 'Dorme de boca aberta?']);
    $this->actingAs($u)->post(route('leads.store'), lead($u, ['video_id' => $b->id, 'status' => 'agendou']));
    $this->actingAs($u)->post(route('leads.store'), lead($u, ['video_id' => $b->id]));

    $this->actingAs($u)->put(route('videos.metricas', $a->id), ['visualizacoes' => 1200, 'comentarios' => 30])->assertSessionHasNoErrors();
    $this->actingAs($u)->put(route('videos.metricas', $b->id), ['visualizacoes' => -1])->assertSessionHasErrors('visualizacoes');
    expect($a->fresh()->metricas_em)->not->toBeNull();
    $this->actingAs($u)->put(route('videos.metricas', confirmado($u)->id), ['visualizacoes' => 1])->assertStatus(409);

    $this->actingAs($u)->get(route('metricas.index'))->assertInertia(fn ($p) => $p->component('metricas/index')
        ->where('totais', ['visualizacoes' => 1200, 'comentarios' => 30, 'leads' => 2, 'agendados' => 1])
        ->has('linhas', 2)
        ->where('aprendizado.persona', ['nome' => 'Mãe de criança', 'leads' => 2]));
    $this->actingAs($u)->get(route('metricas.index', ['por' => 'persona']))->assertInertia(fn ($p) => $p
        ->where('linhas.0.titulo', 'Mãe de criança')->where('linhas.0.leads', 2)->where('linhas.1.visualizacoes', 1200));
});

test('o painel mostra os vídeos prontos, a pendência de métricas e os leads novos', function () {
    $u = usuarioDeCliente(briefingCompleto());
    confirmado($u);
    $p = publicado($u);
    $this->actingAs($u)->post(route('leads.store'), lead($u, ['video_id' => $p->id]));

    $this->actingAs($u)->get(route('dashboard'))->assertInertia(fn ($page) => $page
        ->has('colunas.4.cartoes', 1)
        ->where('resumo.leadsNovos', 1)
        ->where('pendencias', fn ($pend) => collect($pend)->contains(fn ($x) => str_starts_with($x['texto'], 'Registrar métricas'))));
});
