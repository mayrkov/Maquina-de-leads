<?php

use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Models\Video;

test('o painel mostra pendências e os vídeos do próprio cliente', function () {
    $u = usuarioDeCliente();
    Video::factory()->create(['cliente_id' => $u->cliente_id, 'status' => Video::EDITADO]);
    Video::factory()->create(['status' => Video::EDITADO]);

    $this->actingAs($u)->get(route('dashboard'))->assertInertia(fn ($page) => $page->component('dashboard')
        ->where('resumo.aguardandoAprovacao', 1)
        ->where('configuracao.briefingCompleto', false)
        // Briefing, kit e "aprovar o vídeo editado" (o vídeo do outro cliente não entra).
        ->has('pendencias', 3)
        ->where('pendencias.2.link', route('videos.aprovacao', Video::query()->where('cliente_id', $u->cliente_id)->value('id'), false))
        ->has('colunas.3.cartoes', 1));
});

test('a semana do painel é a dos roteiros (segunda a domingo), mesmo no locale pt_BR', function () {
    $this->travelTo('2026-11-14 10:00');
    $u = usuarioDeCliente();
    Roteiro::create(['cliente_id' => $u->cliente_id, 'semana_inicio' => '2026-11-09', 'tema' => 'Ronco', 'titulo' => 'Ronco', 'gancho' => 'g', 'desenvolvimento' => 'd', 'cta' => 'c', 'palavra_chave' => 'RONCO', 'objetivo' => 'o', 'status' => Roteiro::RASCUNHO]);

    $this->actingAs($u)->get(route('dashboard'))->assertInertia(fn ($page) => $page
        ->where('resumo.roteiros', 1)
        ->where('semana', 'Semana de 9 a 15 de novembro'));
});
