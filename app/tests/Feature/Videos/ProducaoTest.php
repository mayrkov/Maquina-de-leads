<?php

use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Actions\AplicarResultadoAnalise;
use App\Domains\Videos\Actions\PedirAnaliseVideo;
use App\Domains\Videos\Models\Video;
use App\Models\User;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Illuminate\Support\Facades\Storage;

// Canva, área 3: formulário de edição (RF51, RF52), aprovação da produção e confirmação do médico (RF26, RF27).

beforeEach(fn () => Storage::fake('midia'));

const TRECHOS = [
    ['inicio' => 0, 'fim' => 4.5, 'texto' => 'Ok, gravando? Vamos lá.'],
    ['inicio' => 6, 'fim' => 9, 'texto' => 'Espirra toda manhã há anos?'],
    ['inicio' => 9.5, 'fim' => 14, 'texto' => 'A rinite tem tratamento e controle.'],
    ['inicio' => 14.2, 'fim' => 18, 'texto' => 'Comenta NARIZ que eu te explico.'],
];

function produtor(): User
{
    return usuarioDeCliente([...briefingCompleto(), 'nome' => 'Dra. Ana', 'crm' => '12345', 'rqe' => '678']);
}

/** Vídeo avulso na análise, com a tarefa da IA na fila. */
function videoAnalisando(User $u, array $extra = []): Video
{
    $v = Video::factory()->create(['cliente_id' => $u->cliente_id, 'status' => Video::ENVIADO, ...$extra]);
    app(PedirAnaliseVideo::class)($v);

    return $v->fresh();
}

/** O worker terminou a análise e o comando aplicou o resultado. */
function analisado(Video $v, array $formulario = []): Video
{
    TarefaMidia::query()->findOrFail($v->tarefa_analise_id)->update(['status' => TarefaMidia::CONCLUIDA, 'resultado' => [
        'transcricao' => "transcricoes/{$v->cliente_id}/{$v->id}.json",
        'trechos' => TRECHOS,
        'formulario' => [
            'tema' => 'Rinite crônica', 'persona' => 'Adulto com rinite', 'gancho' => ['trecho' => 1, 'texto' => 'Espirra toda manhã há anos?', 'inicio' => 6],
            'cortar' => [0, 0, 9], 'destaques' => ['Anos', 'controle', 'duas palavras'], 'cta' => 'Comenta NARIZ que eu te explico.',
            'palavra_chave' => 'nariz', 'legenda' => 'Rinite não precisa ser para sempre. Comenta NARIZ.', ...$formulario,
        ],
    ]]);
    test()->artisan('tarefas:processar')->assertSuccessful();

    return $v->fresh();
}

function camposValidos(array $extra = []): array
{
    return ['tema' => 'Rinite', 'persona' => 'Adulto', 'gancho' => 'Espirra?', 'cortes' => [0], 'destaques' => ['Anos'], 'cta' => 'Comenta NARIZ que eu te explico',
        'palavra_chave' => 'nariz', 'legenda' => "Legenda.\n\nDra. Ana · CRM 12345 · RQE 678", ...$extra];
}

/** Editado pelo worker (status e arquivo como o comando deixaria). */
function editado(Video $v): Video
{
    Storage::disk('midia')->put("editados/{$v->cliente_id}/{$v->id}.mp4", 'mp4');
    $v->update(['status' => Video::EDITADO, 'arquivo_editado' => "editados/{$v->cliente_id}/{$v->id}.mp4", 'duracao_segundos' => 40]);

    return $v->fresh();
}

/** Aprova pela produção e devolve o token do link do médico (aparece uma vez, na sessão). */
function aprovarELink(User $u, Video $v): string
{
    $resposta = test()->actingAs($u)->post(route('videos.aprovar', $v->id));

    return basename((string) $resposta->getSession()->get('link_medico'));
}

test('a análise do avulso vira o formulário: trechos, sugestão saneada e a assinatura com CRM e RQE', function () {
    $u = produtor();
    $v = analisado(videoAnalisando($u));

    expect($v->status)->toBe(Video::FORMULARIO)
        ->and($v->trechos)->toHaveCount(4)
        ->and($v->sugestao['cortes'])->toBe([0])
        ->and($v->sugestao['destaques'])->toBe(['anos', 'controle'])
        ->and($v->sugestao['palavra_chave'])->toBe('NARIZ')
        ->and($v->sugestao['gancho_inicio'])->toEqual(6)
        ->and($v->sugestao['do_roteiro'])->toBe([])
        ->and($v->sugestao['legenda'])->toEndWith("\n\nDra. Ana · CRM 12345 · RQE 678")
        ->and($v->formulario)->toBe(collect($v->sugestao)->only(AplicarResultadoAnalise::CAMPOS)->all());

    $this->actingAs($u)->get(route('videos.formulario', $v->id))->assertInertia(fn ($p) => $p->component('videos/formulario')
        ->where('video.editavel', true)->has('trechos', 4)->where('roteiro', null));
});

test('com roteiro, tema, persona, gancho, chamada e palavra-chave vêm do roteiro, não da IA', function () {
    $u = produtor();
    $persona = Persona::create(['cliente_id' => $u->cliente_id, 'nome' => 'Mãe de criança', 'descricao' => 'd', 'dores' => 'x', 'quem_decide' => 'y', 'linguagem' => 'z', 'status' => Persona::SALVA]);
    $r = Roteiro::create(['cliente_id' => $u->cliente_id, 'persona_id' => $persona->id, 'semana_inicio' => Roteiro::semanaDe(now()), 'tema' => 'Adenoide', 'titulo' => 'Respira pela boca?',
        'gancho' => 'Seu filho dorme de boca aberta?', 'desenvolvimento' => 'Texto.', 'cta' => 'Comenta OUVIDO aqui', 'palavra_chave' => 'OUVIDO', 'objetivo' => 'Agendar', 'status' => Roteiro::APROVADO]);
    $v = videoAnalisando($u, ['roteiro_id' => $r->id, 'origem' => 'roteiro']);

    expect(TarefaMidia::query()->findOrFail($v->tarefa_analise_id)->payload['roteiro']['persona'])->toBe('Mãe de criança');
    $v = analisado($v);
    expect($v->formulario['tema'])->toBe('Adenoide')
        ->and($v->formulario['persona'])->toBe('Mãe de criança')
        ->and($v->formulario['gancho'])->toBe('Seu filho dorme de boca aberta?')
        ->and($v->formulario['palavra_chave'])->toBe('OUVIDO')
        ->and($v->sugestao['do_roteiro'])->toBe(['tema', 'persona', 'gancho', 'cta', 'palavra_chave']);

    $this->actingAs($u)->get(route('roteiros.gravacao', $r->id))->assertInertia(fn ($p) => $p->where('emEdicao', true)->where('roteiro.video_id', $v->id));
});

test('resultado de análise que chegou depois do descarte é ignorado; falha permite analisar de novo', function () {
    $u = produtor();
    $v = videoAnalisando($u);
    $v->update(['status' => Video::DESCARTADO]);
    expect(analisado($v)->status)->toBe(Video::DESCARTADO);

    $outro = videoAnalisando($u);
    TarefaMidia::query()->findOrFail($outro->tarefa_analise_id)->update(['status' => TarefaMidia::FALHOU, 'erro' => 'Sem fala no vídeo']);
    $this->artisan('tarefas:processar');
    expect($outro->fresh()->status)->toBe(Video::FALHOU);

    $this->actingAs($u)->post(route('videos.analisar', $outro->id))->assertRedirect();
    expect($outro->fresh()->status)->toBe(Video::ANALISANDO)->and($outro->fresh()->tarefa_analise_id)->not->toBe($outro->tarefa_analise_id);
});

test('o formulário revisado manda a edição com cortes, destaques e a transcrição (RF52)', function () {
    $u = produtor();
    $v = analisado(videoAnalisando($u));

    // Rascunho aceita campo vazio; gerar a edição, não.
    $this->actingAs($u)->put(route('videos.formulario.salvar', $v->id), camposValidos(['legenda' => null]))->assertSessionHasNoErrors();
    expect($v->fresh()->formulario['legenda'])->toBeNull();
    $this->actingAs($u)->post(route('videos.editar', $v->id), camposValidos(['legenda' => null, 'cta' => 'Comenta aqui', 'cortes' => [0, 1, 2, 3], 'destaques' => ['duas palavras']]))
        ->assertSessionHasErrors(['legenda', 'destaques.0']);
    $this->actingAs($u)->post(route('videos.editar', $v->id), camposValidos(['cortes' => [0, 1, 2, 3]]))->assertSessionHasErrors('cortes');
    $this->actingAs($u)->post(route('videos.editar', $v->id), camposValidos(['cta' => 'Comenta aqui']))->assertSessionHasErrors('cta');
    expect(TarefaMidia::query()->where('tipo', 'editar_video')->count())->toBe(0);

    $this->actingAs($u)->post(route('videos.editar', $v->id), camposValidos(['cortes' => [3, 0], 'tema' => null]))
        ->assertRedirect(route('videos.formulario', $v->id));
    $t = TarefaMidia::query()->where('tipo', 'editar_video')->sole();
    $v = $v->fresh();
    expect($v->status)->toBe(Video::AGUARDANDO_EDICAO)
        ->and($v->palavra_chave)->toBe('NARIZ')
        ->and($v->formulario['tema'])->toBeNull()
        ->and($v->legenda)->toBe(camposValidos()['legenda'])
        ->and($t->payload['cortes'])->toEqual([[0, 4.5], [14.2, 18]])
        ->and($t->payload['destaques'])->toBe(['anos'])
        ->and($t->payload['transcricao'])->toBe($v->transcricao)
        ->and(array_keys($t->payload))->toEqualCanonicalizing(FilaMidia::PAYLOAD_PERMITIDO['editar_video']);

    // Editando: o formulário fecha.
    $this->actingAs($u)->put(route('videos.formulario.salvar', $v->id), camposValidos())->assertStatus(409);
});

test('aprovação da produção, link do médico e confirmação presa ao conteúdo (RF26, RF27)', function () {
    $u = produtor();
    $v = editado(analisado(videoAnalisando($u)));
    $v->update(['legenda' => 'Legenda sem registro']);

    // Sem o CRM na legenda, não aprova.
    $this->actingAs($u)->post(route('videos.aprovar', $v->id));
    expect($v->fresh()->status)->toBe(Video::EDITADO);

    $v->update(['legenda' => 'Legenda. Dra. Ana · CRM 12345']);
    $token = aprovarELink($u, $v);
    $v = $v->fresh();
    expect($v->status)->toBe(Video::APROVADO)->and($v->aprovacaoValida())->toBeTrue()->and($v->confirmacao_token)->toBe(hash('sha256', $token));

    // O médico abre sem login.
    auth()->logout();
    $this->get(route('confirmacao.show', $token))->assertInertia(fn ($p) => $p->component('confirmacao/show')->where('video.legenda', 'Legenda. Dra. Ana · CRM 12345'));
    $this->get(route('confirmacao.video', $token))->assertOk();
    $this->get(route('confirmacao.show', str_repeat('x', 48)))->assertInertia(fn ($p) => $p->where('video', null));

    // Reenviar link: o antigo para de funcionar.
    $novo = basename((string) $this->actingAs($u)->post(route('videos.link', $v->id))->getSession()->get('link_medico'));
    auth()->logout();
    $this->get(route('confirmacao.show', $token))->assertInertia(fn ($p) => $p->where('video', null));

    $this->post(route('confirmacao.responder', $novo), ['acao' => 'confirmar', 'observacao' => 'Pode publicar'])->assertRedirect(route('confirmacao.show', $novo));
    $v = $v->fresh();
    expect($v->status)->toBe(Video::CONFIRMADO)->and($v->observacao_medico)->toBe('Pode publicar')->and($v->confirmacao_token)->toBeNull();
    $this->get(route('confirmacao.show', $novo))->assertInertia(fn ($p) => $p->where('video', null));
});

test('o link não vale se o vídeo mudou; o médico pede ajuste e o vídeo volta ao formulário', function () {
    $u = produtor();
    $v = editado(analisado(videoAnalisando($u)));
    $v->update(['legenda' => 'Legenda · CRM 12345']);
    $token = aprovarELink($u, $v);

    $v->update(['legenda' => 'Legenda mudada · CRM 12345']);
    auth()->logout();
    $this->get(route('confirmacao.show', $token))->assertInertia(fn ($p) => $p->where('video', null));
    $this->post(route('confirmacao.responder', $token), ['acao' => 'confirmar'])->assertNotFound();

    $v->update(['legenda' => 'Legenda · CRM 12345']);
    $this->post(route('confirmacao.responder', $token), ['acao' => 'ajuste'])->assertSessionHasErrors('observacao');
    $this->post(route('confirmacao.responder', $token), ['acao' => 'ajuste', 'observacao' => 'Corte o começo']);
    $v = $v->fresh();
    expect($v->status)->toBe(Video::FORMULARIO)->and($v->comentario_ajuste)->toBe('Corte o começo')->and($v->ajuste_por)->toBe('medico')
        ->and($v->aprovado_em)->toBeNull()->and($v->confirmacao_token)->toBeNull();
});

test('a produção pede ajuste ou descarta; vídeo de outro cliente responde 404', function () {
    $u = produtor();
    $v = editado(analisado(videoAnalisando($u)));
    $this->actingAs($u)->post(route('videos.ajuste', $v->id), ['comentario' => ''])->assertSessionHasErrors('comentario');
    $this->actingAs($u)->post(route('videos.ajuste', $v->id), ['comentario' => 'Trocar o corte em 0:12'])->assertRedirect(route('videos.formulario', $v->id));
    expect($v->fresh()->status)->toBe(Video::FORMULARIO)->and($v->fresh()->ajuste_por)->toBe('producao');

    $this->actingAs($u)->post(route('videos.descartar', $v->id));
    expect($v->fresh()->status)->toBe(Video::DESCARTADO);

    $alheio = editado(analisado(videoAnalisando(produtor())));
    foreach ([['get', 'videos.formulario'], ['get', 'videos.aprovacao'], ['post', 'videos.aprovar'], ['post', 'videos.editar'], ['post', 'videos.descartar']] as [$metodo, $rota]) {
        $this->actingAs($u)->{$metodo}(route($rota, $alheio->id))->assertNotFound();
    }
    $this->actingAs($u)->get(route('videos.assistir', [$alheio->id, 'editado']))->assertNotFound();
    expect($alheio->fresh()->status)->toBe(Video::EDITADO);
});
