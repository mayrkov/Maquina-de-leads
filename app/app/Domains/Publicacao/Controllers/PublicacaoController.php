<?php

namespace App\Domains\Publicacao\Controllers;

use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Canva, tela 12: publicação manual (RF29). A produção baixa o vídeo, copia a legenda, publica no Instagram do
 * médico e informa o link do post; o sistema liga o post ao vídeo e à palavra-chave.
 *
 * shortcut: o checklist (baixar, copiar, ativar a palavra-chave, publicar) é só da tela, não fica salvo; o que conta
 * é o link do post. Salvar cada item fica para quando houver mais de uma pessoa publicando.
 */
class PublicacaoController extends Controller
{
    public function index(Request $request): Response
    {
        abort_if($request->user()?->cliente_id === null, 403);
        $videos = Video::query()->doCliente($request->user())->whereIn('status', [Video::CONFIRMADO, Video::PUBLICADO])
            ->with('roteiro:id,titulo')->latest('updated_at')->limit(100)->get();
        $linha = fn (Video $v) => [
            'id' => $v->id,
            'titulo' => $v->titulo(),
            'status' => $v->status,
            'palavra_chave' => $v->palavra_chave,
            'legenda' => $v->legenda,
            'post_url' => $v->post_url,
            'publicado_em' => $v->publicado_em?->toIso8601String(),
            // Mudou depois das aprovações (RF27): não pode ir ao ar.
            'aprovacao_valida' => $v->aprovacaoValida(),
        ];
        $prontos = $videos->where('status', Video::CONFIRMADO)->values();
        $escolhido = $prontos->firstWhere('id', (int) $request->query('video')) ?? $prontos->first();

        return Inertia::render('publicacao/index', [
            'prontos' => $prontos->map($linha),
            'escolhido' => $escolhido?->id,
            'publicados' => $videos->where('status', Video::PUBLICADO)->values()->map($linha),
        ]);
    }

    public function publicar(Request $request, int $video): RedirectResponse
    {
        $dados = $request->validate(
            ['post_url' => ['required', 'url:https', 'max:300', 'regex:#^https://(www\.)?instagram\.com/#']],
            ['post_url.regex' => 'Cole o link do post no Instagram (https://www.instagram.com/…).', 'post_url.required' => 'Cole o link do post publicado.'],
        );

        return DB::transaction(function () use ($request, $video, $dados) {
            $v = $this->videoDo($request, $video, travar: true);
            // Só vai ao ar o que a produção e o médico aprovaram, e do jeito que aprovaram (RN01, RF27).
            abort_unless($v->status === Video::CONFIRMADO && $v->confirmado_em !== null && $v->aprovacaoValida(), 409, 'Este vídeo não tem as duas aprovações válidas.');
            $v->update(['status' => Video::PUBLICADO, 'post_url' => $dados['post_url'], 'publicado_em' => now(), 'publicado_por' => $request->user()->id]);

            return to_route('publicacao.index')->with('status', 'Marcado como publicado.');
        });
    }
}
