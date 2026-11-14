<?php

namespace App\Domains\Leads\Controllers;

use App\Domains\Leads\Models\Lead;
use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Canva, tela 13: leads. A ferramenta de mensagens qualifica; a produção registra o lead com as respostas, o
 * consentimento e o vídeo de origem (RF38, RNF06) e marca o status do atendimento (RF40). Entrega manual no MVP.
 */
class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $cliente = $this->clienteDo($request);
        $status = array_key_exists((string) $request->query('status'), Lead::STATUS) ? (string) $request->query('status') : null;
        $video = $request->integer('video') ?: null;

        $leads = Lead::query()->doCliente($cliente->id)
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($video, fn ($q) => $q->where('video_id', $video))
            ->with('video.roteiro:id,titulo')
            ->latest()->paginate(50)->withQueryString()
            ->through(fn (Lead $l) => [
                ...$l->only('id', 'nome', 'perfil', 'para_quem', 'problema', 'cidade', 'status'),
                'consentimento_em' => $l->consentimento_em->toIso8601String(),
                'registrado_em' => $l->created_at->toIso8601String(),
                'video' => $l->video?->titulo(),
                'persona' => $l->video?->campo('persona'),
            ]);

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'filtro' => ['status' => $status, 'video' => $video],
            'statusOpcoes' => Lead::STATUS,
            'videos' => Video::query()->doCliente($request->user())->where('status', Video::PUBLICADO)
                ->with('roteiro:id,titulo')->latest('publicado_em')->limit(200)->get()
                ->map(fn (Video $v) => ['id' => $v->id, 'titulo' => $v->titulo(), 'palavra_chave' => $v->palavra_chave]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:120'],
            'perfil' => ['nullable', 'string', 'max:60'],
            'video_id' => ['nullable', 'integer', Rule::exists('videos', 'id')->where('cliente_id', $cliente->id)->where('status', Video::PUBLICADO)],
            'para_quem' => ['nullable', 'string', 'max:200'],
            'problema' => ['nullable', 'string', 'max:300'],
            'cidade' => ['nullable', 'string', 'max:120'],
            // Sem consentimento registrado, o lead não entra (RF34, RN07).
            'consentimento' => ['accepted'],
            'consentimento_em' => ['required', 'date', 'before_or_equal:today'],
            'status' => ['required', Rule::in(array_keys(Lead::STATUS))],
        ], ['consentimento.accepted' => 'Só registre o lead que deu consentimento na ferramenta de mensagens.']);

        Lead::create([
            ...Arr::except($dados, 'consentimento'),
            'cliente_id' => $cliente->id,
            'registrado_por' => $request->user()->id,
        ]);

        return back()->with('status', 'Lead registrado.');
    }

    public function update(Request $request, int $lead): RedirectResponse
    {
        $dados = $request->validate(['status' => ['required', Rule::in(array_keys(Lead::STATUS))]]);
        Lead::query()->doCliente($this->clienteDo($request)->id)->findOrFail($lead)->update($dados);

        return back()->with('status', 'Status atualizado.');
    }
}
