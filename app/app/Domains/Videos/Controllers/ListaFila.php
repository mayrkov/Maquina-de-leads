<?php

namespace App\Domains\Videos\Controllers;

use App\Domains\Videos\Models\Video;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Listas dos itens "Edição" e "Aprovação" do menu: os vídeos naquela parte do fluxo, cada um com a tela da etapa. */
trait ListaFila
{
    /** @param  list<string>  $status */
    private function fila(Request $request, string $titulo, string $sobretitulo, array $status): Response
    {
        abort_if($request->user()?->cliente_id === null, 403);
        $videos = Video::query()->doCliente($request->user())->whereIn('status', $status)
            ->with('roteiro:id,titulo')->latest('updated_at')->limit(100)->get();

        return Inertia::render('videos/fila', [
            'titulo' => $titulo,
            'sobretitulo' => $sobretitulo,
            'videos' => $videos->map(fn (Video $v) => [
                'id' => $v->id,
                'titulo' => $v->titulo(),
                'persona' => $v->campo('persona'),
                'palavra_chave' => $v->campo('palavra_chave') ?? $v->palavra_chave,
                'status' => $v->status,
                'erro' => $v->erro,
                'link' => $v->link(),
                'atualizado_em' => $v->updated_at?->toIso8601String(),
            ]),
        ]);
    }
}
