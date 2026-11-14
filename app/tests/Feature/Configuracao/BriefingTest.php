<?php

use App\Domains\Clientes\Models\Cliente;
use App\Worker\TarefaMidia;

test('sem login não vê nem altera o briefing', function () {
    $this->get(route('briefing.edit'))->assertRedirect(route('login'));
    $this->put(route('briefing.update'), briefingCompleto())->assertRedirect(route('login'));
});

test('rascunho salva com campos vazios, sem pedir personas', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->put(route('briefing.update'), ['nicho' => 'Otorrino', 'tags' => [' Ronco ', 'ronco', 'rinite']])->assertSessionHasNoErrors();

    $c = Cliente::find($u->cliente_id);
    expect($c->nicho)->toBe('Otorrino')->and($c->tags)->toBe(['ronco', 'rinite'])->and(TarefaMidia::count())->toBe(0);
});

test('salvar e sugerir exige o mínimo do briefing', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->put(route('briefing.update'), ['nicho' => 'Otorrino', 'sugerir_personas' => true])
        ->assertSessionHasErrors(['objetivo', 'oferta', 'regiao', 'tom_voz', 'conselho']);
    expect(TarefaMidia::count())->toBe(0);
});

test('salvar e sugerir enfileira a IA com o briefing e não duplica o pedido', function () {
    $u = usuarioDeCliente();
    $this->actingAs($u)->put(route('briefing.update'), [...briefingCompleto(), 'crm' => 'CRM/SP 123', 'sugerir_personas' => true])
        ->assertRedirect(route('personas.index'));

    $tarefa = TarefaMidia::sole();
    expect($tarefa->tipo)->toBe('sugerir_personas')
        ->and($tarefa->payload['cliente_id'])->toBe($u->cliente_id)
        ->and($tarefa->payload['briefing']['nicho'])->toBe('Otorrinolaringologia')
        ->and($tarefa->payload['briefing'])->not->toHaveKey('crm')
        ->and(Cliente::find($u->cliente_id)->tarefa_personas_id)->toBe($tarefa->id);

    $this->actingAs($u)->put(route('briefing.update'), [...briefingCompleto(), 'sugerir_personas' => true]);
    expect(TarefaMidia::count())->toBe(1);
});

test('cada usuário vê só o briefing do próprio cliente', function () {
    $a = usuarioDeCliente(['nicho' => 'Otorrino A']);
    usuarioDeCliente(['nicho' => 'Pediatria B']);

    $this->actingAs($a)->get(route('briefing.edit'))
        ->assertInertia(fn ($page) => $page->component('briefing/edit')->where('briefing.nicho', 'Otorrino A'));
});

test('conselho fora da lista é recusado', function () {
    $this->actingAs(usuarioDeCliente())->put(route('briefing.update'), ['conselho' => 'OAB'])->assertSessionHasErrors('conselho');
});
