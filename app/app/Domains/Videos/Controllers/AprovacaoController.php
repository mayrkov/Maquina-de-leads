<?php

namespace App\Domains\Videos\Controllers;

use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Canva, tela 10: aprovação da produção (RF26). A produção aprova, pede ajuste ou descarta o vídeo editado; aprovado,
 * ganha um link para o médico confirmar pelo celular (tela 11). Só vai ao ar o que os dois aprovaram.
 *
 * shortcut: o link vai para o médico pela própria produção (copiar ou WhatsApp). Envio automático por e-mail ou
 * mensagem fica para quando houver o canal com o médico definido.
 */
class AprovacaoController extends Controller
{
    use ListaFila;

    /** Validade do link do médico. */
    public const DIAS_LINK = 7;

    public function index(Request $request): Response
    {
        return $this->fila($request, 'Aprovação', 'Só vai ao ar o que a produção e o médico aprovaram', [Video::EDITADO, Video::APROVADO, Video::CONFIRMADO]);
    }

    public function show(Request $request, int $video): Response
    {
        $v = $this->videoDo($request, $video);
        abort_unless(in_array($v->status, [Video::EDITADO, Video::APROVADO, Video::CONFIRMADO, Video::PUBLICADO], true), 404);

        return Inertia::render('videos/aprovacao', [
            'video' => [
                'id' => $v->id,
                'titulo' => $v->titulo(),
                'status' => $v->status,
                'duracao_segundos' => $v->duracao_segundos !== null ? (float) $v->duracao_segundos : null,
                'legenda' => $v->legenda,
                'palavra_chave' => $v->palavra_chave,
                'aprovado_em' => $v->aprovado_em?->toIso8601String(),
                'confirmado_em' => $v->confirmado_em?->toIso8601String(),
                'observacao_medico' => $v->observacao_medico,
                'link_expira_em' => $v->confirmacao_token ? $v->confirmacao_expira_em?->toIso8601String() : null,
                // Aprovado e o arquivo ou a legenda mudaram depois (RF27): a aprovação não vale.
                'aprovacao_valida' => $v->aprovado_em === null || $v->aprovacaoValida(),
            ],
            'roteiro' => $v->roteiro?->cabecalhoSessao(),
            'linkMedico' => $request->session()->get('link_medico'),
        ]);
    }

    /** "Aprovar e enviar ao médico": aprovação presa ao conteúdo exato (RF27) e link novo para o médico. */
    public function aprovar(Request $request, int $video): RedirectResponse
    {
        return DB::transaction(function () use ($request, $video) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_unless($v->status === Video::EDITADO, 409, 'Só um vídeo editado espera a aprovação da produção.');
            $crm = $this->clienteDo($request)->crm;
            if (blank($v->legenda) || (filled($crm) && ! str_contains((string) $v->legenda, trim($crm)))) {
                return back()->with('status', 'A legenda do post precisa ter o CRM do médico. Peça ajuste e corrija no formulário.');
            }
            $v->fill([
                'status' => Video::APROVADO,
                'aprovado_por' => $request->user()->id,
                'aprovado_em' => now(),
                'aprovacao_hash' => $v->hashConteudo(),
                'comentario_ajuste' => null,
                'ajuste_por' => null,
            ]);

            return back()->with('status', 'Aprovado. Mande o link ao médico para ele confirmar.')->with('link_medico', $this->novoLink($v));
        });
    }

    /** "Reenviar link": link novo; o anterior para de funcionar. */
    public function link(Request $request, int $video): RedirectResponse
    {
        return DB::transaction(function () use ($request, $video) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_unless($v->status === Video::APROVADO && $v->aprovacaoValida(), 409, 'Este vídeo não está esperando o médico.');

            return back()->with('status', 'Link novo gerado. O anterior não funciona mais.')->with('link_medico', $this->novoLink($v));
        });
    }

    /** "Pedir ajuste": volta ao formulário de edição com o comentário (RF26). */
    public function ajuste(Request $request, int $video): RedirectResponse
    {
        $dados = $request->validate(['comentario' => ['required', 'string', 'max:1000']], ['comentario.required' => 'Descreva o que precisa mudar.']);

        return DB::transaction(function () use ($request, $video, $dados) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_unless(in_array($v->status, [Video::EDITADO, Video::APROVADO, Video::CONFIRMADO], true), 409, 'Este vídeo não está na aprovação.');
            $v->semAprovacao()->fill(['status' => Video::FORMULARIO, 'comentario_ajuste' => $dados['comentario'], 'ajuste_por' => 'producao'])->save();

            return to_route('videos.formulario', $v->id)->with('status', 'Ajuste pedido. Mude o formulário e gere a edição de novo.');
        });
    }

    public function descartar(Request $request, int $video): RedirectResponse
    {
        return DB::transaction(function () use ($request, $video) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_if(in_array($v->status, [Video::PUBLICADO, Video::DESCARTADO], true), 409, 'Este vídeo não pode ser descartado.');
            $v->semAprovacao()->fill(['status' => Video::DESCARTADO])->save();

            return ($v->roteiro_id ? to_route('roteiros.gravacao', $v->roteiro_id) : to_route('aprovacao.index'))->with('status', 'Vídeo descartado.');
        });
    }

    /** Só o sha256 do token fica no banco: o link aparece uma vez, para a produção copiar. */
    private function novoLink(Video $v): string
    {
        $token = Str::random(48);
        $v->forceFill(['confirmacao_token' => hash('sha256', $token), 'confirmacao_expira_em' => now()->addDays(self::DIAS_LINK)])->save();

        return route('confirmacao.show', $token);
    }
}
