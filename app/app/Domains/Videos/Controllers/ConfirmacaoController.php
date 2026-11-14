<?php

namespace App\Domains\Videos\Controllers;

use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Canva, tela 11: o médico confirma o vídeo pelo celular, sem login, pelo link que a produção mandou (RF26, RNF10).
 * O link vale para aquele conteúdo: se o vídeo ou a legenda mudaram depois da aprovação, ele não serve (RF27).
 */
class ConfirmacaoController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $v = $this->videoDoToken($token);

        return Inertia::render('confirmacao/show', [
            'token' => $token,
            'video' => $v ? [
                'titulo' => $v->titulo(),
                'duracao_segundos' => $v->duracao_segundos !== null ? (float) $v->duracao_segundos : null,
                'legenda' => $v->legenda,
            ] : null,
            'resposta' => $request->session()->get('resposta'),
        ]);
    }

    /** O vídeo editado, para tocar na página (o player do celular pede pedaços: Range). */
    public function video(string $token): BinaryFileResponse
    {
        $v = $this->videoDoToken($token) ?? abort(404);

        return response()->file(Storage::disk(config('midia.disco'))->path((string) $v->arquivo_editado), ['Content-Type' => 'video/mp4']);
    }

    public function responder(Request $request, string $token): RedirectResponse
    {
        $dados = $request->validate([
            'acao' => ['required', 'in:confirmar,ajuste'],
            'observacao' => ['nullable', 'required_if:acao,ajuste', 'string', 'max:1000'],
        ], ['observacao.required_if' => 'Conte o que precisa mudar.']);

        return DB::transaction(function () use ($token, $dados) {
            $v = $this->videoDoToken($token, travar: true) ?? abort(404);
            if ($dados['acao'] === 'confirmar') {
                $v->forceFill([
                    'status' => Video::CONFIRMADO,
                    'confirmado_em' => now(),
                    'observacao_medico' => $dados['observacao'] ?? null,
                    'confirmacao_token' => null,
                    'confirmacao_expira_em' => null,
                ])->save();
            } else {
                $v->semAprovacao()->fill(['status' => Video::FORMULARIO, 'comentario_ajuste' => $dados['observacao'], 'ajuste_por' => 'medico'])->save();
            }

            return to_route('confirmacao.show', $token)->with('resposta', $dados['acao']);
        });
    }

    private function videoDoToken(string $token, bool $travar = false): ?Video
    {
        if (strlen($token) !== 48) {
            return null;
        }
        $query = Video::query()->with('roteiro:id,titulo')
            ->where('confirmacao_token', hash('sha256', $token))
            ->where('status', Video::APROVADO)
            ->where('confirmacao_expira_em', '>', now());
        $v = ($travar ? $query->lockForUpdate() : $query)->first();

        return $v?->aprovacaoValida() ? $v : null;
    }
}
