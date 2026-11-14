<?php

namespace App\Domains\Videos\Controllers;

use App\Domains\Videos\Actions\ReceberVideoBruto;
use App\Domains\Videos\Models\Video;
use App\Domains\Videos\Requests\EnviarVideoRequest;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VideoController extends Controller
{
    /** Tela de upload avulso (canva, tela 08) com a lista de envios do cliente. */
    public function index(Request $request): Response
    {
        abort_if($request->user()->cliente_id === null, 403);

        $videos = Video::query()
            ->doCliente($request->user())
            ->whereNull('roteiro_id')
            ->with(['tarefaEdicao:id,status,tentativas', 'roteiro'])
            ->latest()
            ->paginate(20)
            ->through(fn (Video $v) => [
                'id' => $v->id,
                'nome' => $v->nome_original,
                'palavra_chave' => $v->campo('palavra_chave') ?? $v->palavra_chave,
                'status' => $v->status,
                'link' => $v->link(),
                'tarefa' => $v->tarefaEdicao?->status,
                'duracao_segundos' => $v->duracao_segundos !== null ? (float) $v->duracao_segundos : null,
                'erro' => $v->erro,
                'enviado_em' => $v->created_at->toIso8601String(),
            ]);

        return Inertia::render('videos/index', [
            'videos' => $videos,
            'uploadMaxMb' => config('midia.upload_max_mb'),
        ]);
    }

    public function store(EnviarVideoRequest $request, ReceberVideoBruto $receber): RedirectResponse
    {
        $receber->avulso($request->user(), $request->file('video'));

        return to_route('videos.index')->with('status', 'Vídeo enviado. A IA vai analisar e preencher o formulário de edição.');
    }

    /** Download do vídeo editado: só com login e só do próprio cliente (outro cliente recebe 404). */
    public function baixarEditado(Request $request, int $video): StreamedResponse
    {
        $registro = Video::query()->doCliente($request->user())->whereNotNull('arquivo_editado')->findOrFail($video);

        return Storage::disk(config('midia.disco'))->download($registro->arquivo_editado, "video-{$registro->id}.mp4");
    }

    /**
     * O vídeo (bruto ou editado) para tocar na tela: inline e com Range, que o player pede.
     * shortcut: lê o arquivo pelo caminho local do disco de mídia; com disco em nuvem, trocar por URL temporária.
     */
    public function assistir(Request $request, int $video, string $tipo): BinaryFileResponse
    {
        $registro = $this->videoDo($request, $video);
        $chave = $tipo === 'editado' ? $registro->arquivo_editado : $registro->arquivo_bruto;
        abort_if($chave === null, 404);

        return response()->file(Storage::disk(config('midia.disco'))->path($chave), ['Content-Type' => $tipo === 'editado' || str_ends_with($chave, '.mp4') ? 'video/mp4' : 'video/quicktime']);
    }
}
