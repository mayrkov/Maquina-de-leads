<?php

use App\Domains\Personas\Actions\AplicarSugestaoPersonas;
use App\Domains\Personas\Models\Persona;
use App\Worker\TarefaMidia;

function persona(int $clienteId, string $status = Persona::SUGERIDA, array $extra = []): Persona
{
    return Persona::create([
        'cliente_id' => $clienteId, 'nome' => 'Mãe de criança', 'descricao' => 'Quem é', 'dores' => 'Otite', 'quem_decide' => 'A mãe',
        'linguagem' => 'Simples', 'status' => $status, ...$extra,
    ]);
}

test('a tela separa sugestões do catálogo', function () {
    $u = usuarioDeCliente();
    persona($u->cliente_id);
    persona($u->cliente_id, Persona::SALVA);
    persona($u->cliente_id, Persona::DESCARTADA);

    $this->actingAs($u)->get(route('personas.index'))
        ->assertInertia(fn ($page) => $page->component('personas/index')->has('sugestoes', 1)->has('catalogo', 1));
});

test('salvar, ignorar e corrigir uma sugestão', function () {
    $u = usuarioDeCliente();
    $a = persona($u->cliente_id);
    $b = persona($u->cliente_id);
    $c = persona($u->cliente_id);

    $this->actingAs($u)->post(route('personas.salvar', $a->id))->assertRedirect();
    $this->actingAs($u)->post(route('personas.ignorar', $b->id))->assertRedirect();
    $this->actingAs($u)->put(route('personas.update', $c->id), ['nome' => 'Filhos de idoso', 'descricao' => 'd', 'dores' => 'Meu pai não escuta', 'quem_decide' => 'Os filhos', 'linguagem' => 'Direta'])->assertRedirect();

    expect($a->fresh()->status)->toBe(Persona::SALVA)
        ->and($b->fresh()->status)->toBe(Persona::DESCARTADA)
        ->and($c->fresh()->status)->toBe(Persona::SALVA)
        ->and($c->fresh()->quem_decide)->toBe('Os filhos');
});

test('juntar só com persona salva do mesmo cliente', function () {
    $u = usuarioDeCliente();
    $outro = usuarioDeCliente();
    $salva = persona($u->cliente_id, Persona::SALVA);
    $deOutro = persona($outro->cliente_id, Persona::SALVA);
    $sug = persona($u->cliente_id, Persona::SUGERIDA, ['parecida_com_id' => $salva->id]);

    $this->actingAs($u)->post(route('personas.juntar', $sug->id), ['com_id' => $deOutro->id])->assertSessionHasErrors('com_id');
    $this->actingAs($u)->post(route('personas.juntar', $sug->id), ['com_id' => $salva->id])->assertSessionHasNoErrors();

    expect($sug->fresh()->status)->toBe(Persona::JUNTADA)->and($sug->fresh()->parecida_com_id)->toBe($salva->id);
});

test('persona de outro cliente responde 404', function () {
    $u = usuarioDeCliente();
    $alheia = persona(usuarioDeCliente()->cliente_id);

    $this->actingAs($u)->post(route('personas.salvar', $alheia->id))->assertNotFound();
    $this->actingAs($u)->post(route('personas.ignorar', $alheia->id))->assertNotFound();
    expect($alheia->fresh()->status)->toBe(Persona::SUGERIDA);
});

test('resultado da IA vira sugestões; parecida só se for salva do mesmo cliente', function () {
    $u = usuarioDeCliente();
    $salva = persona($u->cliente_id, Persona::SALVA);
    $deOutro = persona(usuarioDeCliente()->cliente_id, Persona::SALVA);
    $tarefa = TarefaMidia::create(['tipo' => 'sugerir_personas', 'payload' => ['cliente_id' => $u->cliente_id], 'status' => 'concluida', 'resultado' => ['personas' => [
        ['nome' => 'Pais de criança', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'A mãe', 'linguagem' => 'l', 'parecida_com_id' => $salva->id],
        ['nome' => 'Quem ronca', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'O cônjuge', 'linguagem' => 'l', 'parecida_com_id' => $deOutro->id],
    ]]]);

    app(AplicarSugestaoPersonas::class)($tarefa);

    $sug = Persona::query()->where('status', Persona::SUGERIDA)->orderBy('id')->get();
    expect($sug)->toHaveCount(2)
        ->and($sug[0]->parecida_com_id)->toBe($salva->id)
        ->and($sug[1]->parecida_com_id)->toBeNull()
        ->and($sug->pluck('cliente_id')->unique()->all())->toBe([$u->cliente_id]);
});

test('pedir sugestões sem briefing completo leva ao briefing', function () {
    $this->actingAs(usuarioDeCliente())->post(route('personas.sugerir'))->assertRedirect(route('briefing.edit'));
    expect(TarefaMidia::count())->toBe(0);
});
