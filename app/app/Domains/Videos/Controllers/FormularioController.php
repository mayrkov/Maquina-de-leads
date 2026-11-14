<?php

namespace App\Domains\Videos\Controllers;

use App\Domains\Videos\Actions\AplicarResultadoAnalise;
use App\Domains\Videos\Actions\EnfileirarEdicao;
use App\Domains\Videos\Actions\PedirAnaliseVideo;
use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use App\Worker\TarefaMidia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Canva, tela 09: formulário de edição sugerido pela IA (RF51) e revisado campo a campo pela produção (RF52). */
class FormularioController extends Controller
{
    use ListaFila;

    /** Menu "Edição": o que está na análise, no formulário ou editando. */
    public function index(Request $request): Response
    {
        return $this->fila($request, 'Edição', 'Formulário de edição e edição automática', [
            Video::ANALISANDO, Video::FORMULARIO, Video::AGUARDANDO_EDICAO, Video::FALHOU,
        ]);
    }

    public function show(Request $request, int $video): Response
    {
        $v = $this->videoDo($request, $video);
        $v->load('tarefaAnalise');
        $tarefa = $v->tarefaAnalise;

        return Inertia::render('videos/formulario', [
            'video' => [
                'id' => $v->id,
                'nome' => $v->nome_original,
                'titulo' => $v->titulo(),
                'status' => $v->status,
                'erro' => $v->erro,
                'comentario_ajuste' => $v->comentario_ajuste,
                'ajuste_por' => $v->ajuste_por,
                'editavel' => $this->editavel($v),
                // Concluída mas ainda não aplicada pelo comando agendado: continua "analisando".
                'tentativa' => $tarefa?->status === TarefaMidia::EM_ANDAMENTO ? $tarefa->tentativas : null,
            ],
            'roteiro' => $v->roteiro?->cabecalhoSessao(),
            'trechos' => $v->trechos ?? [],
            'sugestao' => $v->sugestao,
            'formulario' => $v->formulario,
            'obrigatorios' => Video::CAMPOS_OBRIGATORIOS,
        ]);
    }

    /** "Salvar rascunho": guarda o formulário sem exigir os campos obrigatórios. */
    public function salvar(Request $request, int $video): RedirectResponse
    {
        $v = $this->videoDo($request, $video);
        abort_unless($this->editavel($v), 409, 'O formulário deste vídeo não está aberto para revisão.');
        $v->update(['formulario' => $this->validar($request, $v, completo: false)]);

        return back()->with('status', 'Rascunho salvo.');
    }

    /** "Gerar edição automática": a edição segue o formulário revisado (RF52). */
    public function editar(Request $request, int $video, EnfileirarEdicao $enfileirar): RedirectResponse
    {
        return DB::transaction(function () use ($request, $video, $enfileirar) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_unless($this->editavel($v), 409, 'O formulário deste vídeo não está aberto para revisão.');
            $v->formulario = $this->validar($request, $v, completo: true);
            $enfileirar($v);

            return ($v->roteiro_id ? to_route('roteiros.edicao', $v->roteiro_id) : to_route('videos.formulario', $v->id))
                ->with('status', 'Edição automática pedida. Ela segue o formulário revisado.');
        });
    }

    /** Nova análise depois de uma falha (sem formulário ainda). */
    public function analisar(Request $request, int $video, PedirAnaliseVideo $analisar): RedirectResponse
    {
        return DB::transaction(function () use ($request, $video, $analisar) {
            $v = $this->videoDo($request, $video, travar: true);
            abort_unless($v->status === Video::FALHOU && $v->formulario === null, 409, 'Este vídeo não está esperando nova análise.');
            $analisar($v);

            return back()->with('status', 'A IA vai analisar o vídeo de novo.');
        });
    }

    /** Formulário aberto: pronto para revisar, ou a edição falhou e a produção pode mandar de novo. */
    private function editavel(Video $v): bool
    {
        return $v->status === Video::FORMULARIO || ($v->status === Video::FALHOU && $v->formulario !== null);
    }

    /** @return array<string, mixed> */
    private function validar(Request $request, Video $v, bool $completo): array
    {
        $trechos = count($v->trechos ?? []);
        $palavra = trim((string) $request->input('palavra_chave'));
        $request->merge([
            'palavra_chave' => $palavra === '' ? null : mb_strtoupper($palavra),
            'destaques' => is_array($request->input('destaques')) ? array_map(fn ($d) => mb_strtolower(trim((string) $d)), $request->input('destaques')) : $request->input('destaques'),
        ]);
        $obrigatorio = $completo ? 'required' : 'nullable';
        $dados = $request->validate([
            'tema' => ['nullable', 'string', 'max:200'],
            'persona' => ['nullable', 'string', 'max:200'],
            'gancho' => ['nullable', 'string', 'max:500'],
            'cortes' => ['nullable', 'array'],
            'cortes.*' => ['integer', 'min:0', 'max:'.max($trechos - 1, 0), 'distinct'],
            'destaques' => ['nullable', 'array', 'max:6'],
            'destaques.*' => ['string', 'distinct', 'regex:'.AplicarResultadoAnalise::PALAVRA],
            'cta' => [$obrigatorio, 'string', 'max:300'],
            'palavra_chave' => [$obrigatorio, 'string', 'regex:'.AplicarResultadoAnalise::PALAVRA],
            'legenda' => [$obrigatorio, 'string', 'max:2200'],
        ], [
            'palavra_chave.regex' => 'Use uma palavra só, sem espaços (ex.: OUVIDO).',
            'destaques.*.regex' => 'Cada destaque é uma palavra só.',
            'destaques.max' => 'No máximo 6 destaques.',
        ]);
        if ($completo && $trechos > 0 && count($dados['cortes'] ?? []) >= $trechos) {
            throw ValidationException::withMessages(['cortes' => 'Mantenha pelo menos um trecho do vídeo.']);
        }
        if ($completo && ! str_contains(mb_strtoupper($dados['cta']), $dados['palavra_chave'])) {
            throw ValidationException::withMessages(['cta' => 'A chamada para ação precisa ter a palavra-chave.']);
        }
        if (isset($dados['cortes'])) {
            $dados['cortes'] = array_map('intval', $dados['cortes']);
            sort($dados['cortes']);
        }

        return collect(AplicarResultadoAnalise::CAMPOS)->mapWithKeys(fn (string $c) => [$c => $dados[$c] ?? null])->all();
    }
}
