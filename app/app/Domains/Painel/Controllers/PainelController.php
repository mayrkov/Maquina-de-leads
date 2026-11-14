<?php

namespace App\Domains\Painel\Controllers;

use App\Domains\Leads\Models\Lead;
use App\Domains\Marca\Models\KitMarca;
use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Canva, tela 02: painel da semana: roteiros, o fluxo de cada vídeo até a publicação, leads e pendências. */
class PainelController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $cliente = $this->clienteDo($request);
        // Segunda a domingo, como os roteiros: no locale pt_BR o startOfWeek() do Carbon começa no domingo.
        $inicio = Roteiro::semanaDe(now());
        $fim = $inicio->addDays(6);

        $videos = Video::query()->doCliente($request->user())
            ->whereIn('status', [Video::ANALISANDO, Video::FORMULARIO, Video::AGUARDANDO_EDICAO, Video::EDITADO, Video::APROVADO, Video::CONFIRMADO, Video::FALHOU])
            ->with('roteiro:id,titulo')->latest()->limit(100)->get();
        $cartao = fn (Video $v) => ['id' => $v->id, 'titulo' => $v->titulo(), 'tag' => $v->campo('palavra_chave') ?? $v->palavra_chave ?? '…', 'link' => $v->link()];
        $com = fn (string ...$status) => $videos->whereIn('status', $status)->values();
        $semMetricas = Video::query()->doCliente($request->user())->where('status', Video::PUBLICADO)->whereNull('metricas_em')->count();
        $leadsNovos = Lead::query()->doCliente($cliente->id)->where('status', 'qualificado')->count();

        $roteiros = Roteiro::query()->doCliente($cliente->id)->where('status', '!=', Roteiro::DESCARTADO);
        $daSemana = (clone $roteiros)->whereDate('semana_inicio', $inicio->toDateString())->pluck('status');
        $revisar = (clone $roteiros)->where('status', Roteiro::RASCUNHO)->count();
        $aguardandoGravacao = (clone $roteiros)->where('status', Roteiro::APROVADO)
            ->whereDoesntHave('videos', fn ($q) => $q->where('status', '!=', Video::ENVIADO))
            ->orderBy('semana_inicio')->limit(50)->get(['id', 'titulo', 'palavra_chave'])
            ->map(fn (Roteiro $r) => ['id' => $r->id, 'titulo' => $r->titulo, 'tag' => $r->palavra_chave, 'link' => route('roteiros.gravacao', $r->id, false)]);

        $personas = Persona::query()->doCliente($cliente->id)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $salvas = (int) ($personas[Persona::SALVA] ?? 0);
        $sugeridas = (int) ($personas[Persona::SUGERIDA] ?? 0);
        $kitConfigurado = KitMarca::query()->where('cliente_id', $cliente->id)->exists();
        $falhas = $videos->where('status', Video::FALHOU)->count();

        $pendencias = array_values(array_filter([
            ! $cliente->briefingCompleto() ? ['texto' => 'Completar o briefing do cliente', 'link' => route('briefing.edit', [], false), 'acao' => 'Abrir'] : null,
            $revisar > 0 ? ['texto' => "Revisar {$revisar} roteiro(s) escrito(s) pela IA", 'link' => route('roteiros.index', [], false), 'acao' => 'Revisar'] : null,
            $sugeridas > 0 ? ['texto' => "Decidir {$sugeridas} persona(s) sugerida(s) pela IA", 'link' => route('personas.index', [], false), 'acao' => 'Decidir'] : null,
            ! $kitConfigurado ? ['texto' => 'Configurar o kit de marca', 'link' => route('kit.edit', [], false), 'acao' => 'Configurar'] : null,
            ...$com(Video::FORMULARIO)->map(fn (Video $v) => ['texto' => "Revisar formulário de edição: “{$v->titulo()}”", 'link' => $v->link(), 'acao' => 'Abrir']),
            ...$com(Video::EDITADO)->map(fn (Video $v) => ['texto' => "Aprovar o vídeo editado: “{$v->titulo()}”", 'link' => $v->link(), 'acao' => 'Ver']),
            ...$com(Video::APROVADO)->map(fn (Video $v) => ['texto' => "Médico ainda não confirmou: “{$v->titulo()}”", 'link' => $v->link(), 'acao' => 'Ver']),
            $semMetricas > 0 ? ['texto' => "Registrar métricas de {$semMetricas} vídeo(s) publicado(s)", 'link' => route('metricas.index', [], false), 'acao' => 'Registrar'] : null,
            $falhas > 0 ? ['texto' => "{$falhas} vídeo(s) com falha na análise ou na edição", 'link' => route('edicao.index', [], false), 'acao' => 'Ver'] : null,
        ]));

        return Inertia::render('dashboard', [
            'semana' => 'Semana de '.$inicio->translatedFormat('j').' a '.$fim->translatedFormat('j \d\e F'),
            'resumo' => [
                'roteiros' => $daSemana->count(),
                'roteirosAprovados' => $daSemana->filter(fn ($s) => $s === Roteiro::APROVADO)->count(),
                'editando' => $com(Video::AGUARDANDO_EDICAO)->count(),
                'aguardandoAprovacao' => $com(Video::EDITADO, Video::APROVADO)->count(),
                'leadsNovos' => $leadsNovos,
            ],
            'colunas' => [
                ['titulo' => 'Aguardando gravação', 'cartoes' => $aguardandoGravacao],
                ['titulo' => 'Formulário de edição', 'cartoes' => $com(Video::ANALISANDO, Video::FORMULARIO, Video::FALHOU)->map($cartao)],
                ['titulo' => 'Editando', 'cartoes' => $com(Video::AGUARDANDO_EDICAO)->map($cartao)],
                ['titulo' => 'Aprovação', 'cartoes' => $com(Video::EDITADO, Video::APROVADO)->map($cartao)],
                ['titulo' => 'Pronto para publicar', 'cartoes' => $com(Video::CONFIRMADO)->map($cartao)],
            ],
            'pendencias' => $pendencias,
            'configuracao' => [
                'briefingCompleto' => $cliente->briefingCompleto(),
                'personasSalvas' => $salvas,
                'personasSugeridas' => $sugeridas,
                'kitConfigurado' => $kitConfigurado,
            ],
        ]);
    }
}
