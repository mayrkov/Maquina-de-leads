<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

// Ajuda: guia permanente e onboarding guiado (o tour abre sozinho até a produção concluir ou dispensar).

test('visitante não acessa o guia nem marca o tour como visto', function () {
    $this->get(route('guia'))->assertRedirect(route('login'));
    $this->post(route('tour.concluido'))->assertRedirect(route('login'));
});

test('usuário autenticado abre o guia do sistema', function () {
    $this->actingAs(usuarioDeCliente())
        ->get(route('guia'))
        ->assertOk()
        ->assertInertia(fn (Assert $pagina) => $pagina->component('guia/index'));
});

test('o tour começa pendente e o POST marca como visto uma única vez', function () {
    Carbon::setTestNow('2026-11-14 10:00:00');
    $u = usuarioDeCliente();

    $this->actingAs($u)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $pagina) => $pagina->where('tourConcluido', false));

    $this->actingAs($u)
        ->post(route('tour.concluido'))
        ->assertOk()
        ->assertJson(['concluido' => true]);

    expect($u->fresh()->tour_concluido_em?->toDateTimeString())->toBe('2026-11-14 10:00:00');

    Carbon::setTestNow('2026-11-14 11:00:00');
    $this->actingAs($u)->post(route('tour.concluido'))->assertOk();
    expect($u->fresh()->tour_concluido_em?->toDateTimeString())->toBe('2026-11-14 10:00:00');

    $this->actingAs($u)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $pagina) => $pagina->where('tourConcluido', true));

    Carbon::setTestNow();
});

test('o guia exige um usuário, mas não exige cliente', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('guia'))
        ->assertOk();
});
