<?php

use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Actions\AplicarResultadosRoteiro;
use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Models\Video;
use App\Models\User;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

const TEXTO = ['gancho' => 'Seu pai aumenta a TV?', 'desenvolvimento' => 'Sinais comuns de perda auditiva.', 'cta' => 'Comenta AUDICAO que eu explico.'];

/** Conformidade sem bloqueios para as regras do CFM. */
function conformidadeOk(): array
{
    return ['regras' => collect(config('conformidade.CFM'))->keys()->map(fn ($id) => ['id' => $id, 'resultado' => 'ok', 'motivo' => null])->all(), 'fatos' => [], 'pesquisou' => true];
}

function roteiro(User $u, array $extra = []): Roteiro
{
    return Roteiro::create([
        'cliente_id' => $u->cliente_id, 'semana_inicio' => Roteiro::semanaDe(now()), 'tema' => 'Perda auditiva', 'titulo' => 'Seu pai aumenta a TV?',
        ...TEXTO, 'palavra_chave' => 'AUDICAO', 'objetivo' => 'Agendar audiometria', 'status' => Roteiro::RASCUNHO,
        'conformidade' => conformidadeOk(), 'conformidade_hash' => Roteiro::hashDe(TEXTO), ...$extra,
    ]);
}

function concluir(TarefaMidia $t, array $resultado): TarefaMidia
{
    $t->update(['status' => TarefaMidia::CONCLUIDA, 'resultado' => $resultado]);

    return $t->fresh();
}

beforeEach(function () {
    Storage::fake('midia');
});

test('gerar pede a semana ao worker só com dados do negócio, sem duplicar o pedido', function () {
    $u = usuarioDeCliente(briefingCompleto());
    Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Filhos de idoso', 'descricao' => 'd', 'dores' => 'Não escuta', 'quem_decide' => 'Filhos', 'linguagem' => 'Direta', 'status' => Persona::SALVA]);
    roteiro($u, ['tema' => 'Ronco', 'semana_inicio' => Roteiro::semanaDe(now()->subWeeks(2))]);

    $this->actingAs($u)->post(route('roteiros.gerar'))->assertRedirect();
    $this->actingAs($u)->post(route('roteiros.gerar'))->assertRedirect();

    $t = TarefaMidia::sole();
    expect($t->tipo)->toBe('gerar_roteiros')
        ->and(array_keys($t->payload))->toEqualCanonicalizing(FilaMidia::PAYLOAD_PERMITIDO['gerar_roteiros'])
        ->and($t->payload['semana_inicio'])->toBe(Roteiro::semanaDe(now())->toDateString())
        ->and($t->payload['quantidade'])->toBe(5)
        ->and($t->payload['temas_recentes'])->toBe(['Ronco'])
        ->and($t->payload['regras'])->toEqual(config('conformidade.CFM'))
        ->and($t->payload['catalogo'][0]['nome'])->toBe('Filhos de idoso');
});

test('sem briefing completo não gera; com a semana atual cheia, gera a próxima', function () {
    $incompleto = usuarioDeCliente();
    $this->actingAs($incompleto)->post(route('roteiros.gerar'))->assertRedirect(route('briefing.edit'));
    expect(TarefaMidia::count())->toBe(0);

    $u = usuarioDeCliente(briefingCompleto());
    roteiro($u);
    $this->actingAs($u)->post(route('roteiros.gerar'));
    expect(TarefaMidia::sole()->payload['semana_inicio'])->toBe(Roteiro::semanaDe(now())->addWeek()->toDateString());
});

test('resultado da geração: reusa persona salva, sugere nova e confere o que a IA devolveu', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $salva = Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Filhos de idoso', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'Filhos', 'linguagem' => 'Direta', 'status' => Persona::SALVA]);
    $this->actingAs($u)->post(route('roteiros.gerar'));
    $item = fn (string $palavra, array $persona, array $conf = []) => [
        'tema' => "Tema {$palavra}", 'titulo' => "Título {$palavra}", ...TEXTO, 'palavra_chave' => $palavra, 'objetivo' => 'Agendar', 'persona' => $persona, 'conformidade' => $conf,
    ];
    $tarefa = concluir(TarefaMidia::sole(), ['roteiros' => [
        $item('AUDICAO', ['id' => $salva->id]),
        $item('NARIZ', ['id' => 999, 'nome' => 'Adulto com rinite', 'descricao' => 'd', 'dores' => 'Espirra', 'quem_decide' => 'Ele', 'linguagem' => 'Leve', 'parecida_com_id' => $salva->id], [
            'regras' => [['id' => 'promessa', 'resultado' => 'bloqueio', 'motivo' => 'Promete cura'], ['id' => 'inventada', 'resultado' => 'ok']],
            'fatos' => [['afirmacao' => 'Rinite tem cura', 'veredito' => 'incorreta', 'fontes' => [['uri' => 'javascript:alert(1)'], ['uri' => 'https://sborl.org.br', 'title' => 'SBORL']]]],
        ]),
        $item('duas palavras', ['id' => $salva->id]),
    ]]);

    app(AplicarResultadosRoteiro::class)->gerados($tarefa);

    $roteiros = Roteiro::orderBy('id')->get();
    expect($roteiros)->toHaveCount(2)
        ->and($roteiros[0]->persona_id)->toBe($salva->id)
        ->and($roteiros[0]->situacaoConformidade())->toBe('atencao'); // regras sem resposta da IA ficam em atenção
    $nova = Persona::findOrFail($roteiros[1]->persona_id);
    expect($nova->status)->toBe(Persona::SUGERIDA)->and($nova->parecida_com_id)->toBe($salva->id)
        ->and($roteiros[1]->situacaoConformidade())->toBe('bloqueio')
        ->and(collect($roteiros[1]->conformidade['regras'])->pluck('id')->all())->toEqualCanonicalizing(array_keys(config('conformidade.CFM')))
        ->and($roteiros[1]->conformidade['fatos'][0]['fontes'])->toBe([['uri' => 'https://sborl.org.br', 'title' => 'SBORL']]);
});

test('aprovar exige conformidade do texto atual sem bloqueio e persona decidida', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $sugerida = Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Nova', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'y', 'linguagem' => 'z', 'status' => Persona::SUGERIDA]);
    $r = roteiro($u, ['persona_id' => $sugerida->id]);

    $this->actingAs($u)->post(route('roteiros.aprovar', $r->id));
    expect($r->fresh()->status)->toBe(Roteiro::RASCUNHO);

    $this->actingAs($u)->post(route('personas.salvar', $sugerida->id));
    $this->actingAs($u)->post(route('roteiros.aprovar', $r->id))->assertRedirect(route('roteiros.gravacao', $r->id));
    expect($r->fresh()->status)->toBe(Roteiro::APROVADO)->and($r->fresh()->aprovado_por)->toBe($u->id);

    $bloqueado = roteiro($u, ['conformidade' => ['regras' => [['id' => 'preco', 'resultado' => 'bloqueio']], 'fatos' => []]]);
    $this->actingAs($u)->post(route('roteiros.aprovar', $bloqueado->id));
    expect($bloqueado->fresh()->status)->toBe(Roteiro::RASCUNHO);
});

test('mudar o texto aprovado volta para revisão e a conformidade precisa ser conferida de novo', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $r = roteiro($u, ['status' => Roteiro::APROVADO]);

    $this->actingAs($u)->put(route('roteiros.update', $r->id), [...TEXTO, 'gancho' => 'Seu pai pede para repetir tudo?'])->assertRedirect();
    $r->refresh()->load('tarefa', 'persona');
    expect($r->status)->toBe(Roteiro::RASCUNHO)->and($r->situacaoConformidade())->toBe('desatualizada')->and($r->impedimentoAprovacao())->not->toBeNull();

    $this->actingAs($u)->post(route('roteiros.checar', $r->id));
    $t = TarefaMidia::sole();
    expect($t->tipo)->toBe('checar_conformidade')->and($t->payload['roteiro']['gancho'])->toBe('Seu pai pede para repetir tudo?');
    // Enquanto a IA confere, o texto não muda.
    $this->actingAs($u)->put(route('roteiros.update', $r->id), [...TEXTO, 'gancho' => 'Outro']);
    expect($r->fresh()->gancho)->toBe('Seu pai pede para repetir tudo?');

    app(AplicarResultadosRoteiro::class)->checado(concluir($t, ['conformidade' => conformidadeOk()]));
    expect($r->fresh()->situacaoConformidade())->toBe('ok');
});

test('nova versão leva o comentário; falha da IA mantém o texto', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $r = roteiro($u);

    $this->actingAs($u)->post(route('roteiros.refazer', $r->id), ['comentario' => 'Gancho mais curto'])->assertRedirect();
    $t = TarefaMidia::sole();
    expect($t->tipo)->toBe('refazer_roteiro')->and($t->payload['comentario'])->toBe('Gancho mais curto')
        ->and(array_keys($t->payload))->toEqualCanonicalizing(FilaMidia::PAYLOAD_PERMITIDO['refazer_roteiro']);

    $t->update(['status' => TarefaMidia::FALHOU, 'erro' => 'cota']);
    app(AplicarResultadosRoteiro::class)->refeito($t->fresh());
    expect($r->fresh()->gancho)->toBe(TEXTO['gancho']);

    $t->update(['status' => TarefaMidia::CONCLUIDA, 'resultado' => ['roteiro' => ['tema' => 'Perda auditiva', 'titulo' => 'Novo título', 'gancho' => 'Repete tudo?', 'desenvolvimento' => 'Texto novo.', 'cta' => 'Comenta OUVIR', 'palavra_chave' => 'ouvir', 'objetivo' => 'Agendar', 'conformidade' => conformidadeOk()]]]);
    app(AplicarResultadosRoteiro::class)->refeito($t->fresh());
    expect($r->fresh()->only('gancho', 'palavra_chave'))->toBe(['gancho' => 'Repete tudo?', 'palavra_chave' => 'OUVIR'])
        ->and($r->fresh()->situacaoConformidade())->toBe('ok');
});

test('takes só depois de aprovar; o take principal vai para a análise da IA partindo do roteiro', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $r = roteiro($u);
    $video = fn () => UploadedFile::fake()->create('take_01.mp4', 500, 'video/mp4');

    $this->actingAs($u)->post(route('roteiros.takes', $r->id), ['video' => $video()]);
    expect(Video::count())->toBe(0);

    $r->update(['status' => Roteiro::APROVADO]);
    $this->actingAs($u)->post(route('roteiros.takes', $r->id), ['video' => $video()]);
    $this->actingAs($u)->post(route('roteiros.takes', $r->id), ['video' => $video()]);
    [$take1, $take2] = Video::orderBy('id')->get();
    expect($take1->status)->toBe(Video::ENVIADO)->and($take1->roteiro_id)->toBe($r->id)->and(TarefaMidia::count())->toBe(0);

    $this->actingAs($u)->post(route('roteiros.editar', $r->id), ['take_id' => $take2->id])->assertRedirect(route('videos.formulario', $take2->id));
    $t = TarefaMidia::sole();
    expect($t->tipo)->toBe('analisar_video')
        ->and($t->payload['roteiro']['palavra_chave'])->toBe('AUDICAO')
        ->and($t->payload['roteiro']['cta'])->toBe(TEXTO['cta'])
        ->and(array_keys($t->payload))->toEqualCanonicalizing(FilaMidia::PAYLOAD_PERMITIDO['analisar_video'])
        ->and($take2->fresh()->status)->toBe(Video::ANALISANDO);

    // Um take por vez na produção.
    $this->actingAs($u)->post(route('roteiros.editar', $r->id), ['take_id' => $take1->id]);
    expect(TarefaMidia::count())->toBe(1);

    // O upload avulso não mostra os takes.
    $this->actingAs($u)->get(route('videos.index'))->assertInertia(fn ($p) => $p->has('videos.data', 0));
    $this->actingAs($u)->get(route('roteiros.index'))->assertInertia(fn ($p) => $p->component('roteiros/index')->where('roteiros.0.etapa', 'IA analisando o take'));
});

test('roteiro e take de outro cliente respondem 404', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $alheio = roteiro(usuarioDeCliente(briefingCompleto()), ['status' => Roteiro::APROVADO]);
    $meu = roteiro($u, ['status' => Roteiro::APROVADO]);
    $takeAlheio = Video::factory()->create(['cliente_id' => $alheio->cliente_id, 'roteiro_id' => $alheio->id, 'status' => Video::ENVIADO]);

    $this->actingAs($u)->get(route('roteiros.show', $alheio->id))->assertNotFound();
    $this->actingAs($u)->get(route('roteiros.gravacao', $alheio->id))->assertNotFound();
    $this->actingAs($u)->put(route('roteiros.update', $alheio->id), TEXTO)->assertNotFound();
    $this->actingAs($u)->post(route('roteiros.aprovar', $alheio->id))->assertNotFound();
    $this->actingAs($u)->post(route('roteiros.descartar', $alheio->id))->assertNotFound();
    $this->actingAs($u)->post(route('roteiros.takes', $alheio->id), ['video' => UploadedFile::fake()->create('t.mp4', 10, 'video/mp4')])->assertNotFound();
    $this->actingAs($u)->post(route('roteiros.editar', $meu->id), ['take_id' => $takeAlheio->id])->assertSessionHasErrors('take_id');
    expect(TarefaMidia::count())->toBe(0)->and($alheio->fresh()->status)->toBe(Roteiro::APROVADO);
});

test('juntar a persona sugerida leva os roteiros para a persona salva', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $salva = Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Salva', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'y', 'linguagem' => 'z', 'status' => Persona::SALVA]);
    $sug = Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Parecida', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'y', 'linguagem' => 'z', 'status' => Persona::SUGERIDA, 'parecida_com_id' => $salva->id]);
    $r = roteiro($u, ['persona_id' => $sug->id]);

    $this->actingAs($u)->post(route('personas.juntar', $sug->id), ['com_id' => $salva->id]);

    expect($r->fresh()->persona_id)->toBe($salva->id);
});

test('as telas da sessão abrem', function () {
    $u = usuarioDeCliente(briefingCompleto());
    $r = roteiro($u);

    $this->actingAs($u)->get(route('roteiros.show', $r->id))->assertInertia(fn ($p) => $p->component('roteiros/show')->where('conformidade.situacao', 'ok')->where('roteiro.impedimento', null));
    $this->actingAs($u)->get(route('roteiros.gravacao', $r->id))->assertInertia(fn ($p) => $p->component('roteiros/gravacao'));
    $this->actingAs($u)->get(route('roteiros.edicao', $r->id))->assertInertia(fn ($p) => $p->component('roteiros/edicao')->where('video', null));
});
