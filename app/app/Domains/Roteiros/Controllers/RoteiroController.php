<?php

namespace App\Domains\Roteiros\Controllers;

use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Actions\PedirIaRoteiros;
use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Actions\PedirAnaliseVideo;
use App\Domains\Videos\Actions\ReceberVideoBruto;
use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use App\Worker\TarefaMidia;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Canva, área 2: roteiros da semana (tela 06) e a sessão do roteiro (telas 07, 07.2 e 07.4). */
class RoteiroController extends Controller
{
    public function index(Request $request, PedirIaRoteiros $pedir): Response
    {
        $cliente = $this->clienteDo($request);
        $semanas = Roteiro::query()->doCliente($cliente->id)->select('semana_inicio')->distinct()->orderByDesc('semana_inicio')
            ->pluck('semana_inicio')->map(fn ($s) => CarbonImmutable::parse($s)->toDateString())->values();
        $semana = $semanas->contains($request->query('semana')) ? (string) $request->query('semana') : ($semanas->first() ?? Roteiro::semanaDe(now())->toDateString());

        $roteiros = Roteiro::query()->doCliente($cliente->id)->whereDate('semana_inicio', $semana)
            ->with(['persona:id,nome,status', 'tarefa', 'videos:id,roteiro_id,status'])
            ->orderBy('id')->get();
        $tarefa = $cliente->tarefa_roteiros_id ? TarefaMidia::query()->find($cliente->tarefa_roteiros_id) : null;

        return Inertia::render('roteiros/index', [
            'semanas' => $semanas->map(fn (string $s) => ['valor' => $s, 'rotulo' => $this->rotuloSemana($s)]),
            'semana' => $semana,
            'roteiros' => $roteiros->map(fn (Roteiro $r) => [
                ...$r->only('id', 'titulo', 'gancho', 'palavra_chave', 'status'),
                'persona' => $r->persona?->nome,
                'persona_sugerida' => $r->persona?->status === Persona::SUGERIDA,
                'conformidade' => $r->situacaoConformidade(),
                'etapa' => $this->etapa($r),
            ]),
            'pedido' => $this->pedido($tarefa),
            'proximaSemana' => $this->rotuloSemana($pedir->proximaSemana($cliente)->toDateString()),
            'briefingCompleto' => $cliente->briefingCompleto(),
        ]);
    }

    public function gerar(Request $request, PedirIaRoteiros $pedir): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        if (! $cliente->briefingCompleto()) {
            return to_route('briefing.edit')->with('status', 'Complete o briefing antes de gerar roteiros.');
        }
        $semana = $pedir->gerarSemana($cliente);

        return $semana
            ? to_route('roteiros.index', ['semana' => $semana->toDateString()])->with('status', 'Pedido enviado à IA.')
            : back()->with('status', 'Já existe uma geração de roteiros em andamento.');
    }

    /** Etapa 1: o texto, a conformidade e a persona. */
    public function show(Request $request, int $roteiro, PedirIaRoteiros $pedir): Response
    {
        $r = $this->roteiroDo($request, $roteiro);
        $r->load(['persona.parecidaCom:id,nome', 'tarefa']);
        $cliente = $this->clienteDo($request);
        $regras = $pedir->regras($cliente);

        return Inertia::render('roteiros/show', [
            'roteiro' => [
                ...$r->cabecalhoSessao(),
                ...$r->only('tema', 'gancho', 'desenvolvimento', 'cta', 'palavra_chave', 'objetivo', 'comentario_ajuste'),
                'duracao_estimada' => $r->duracaoEstimada(),
                'impedimento' => $r->impedimentoAprovacao(),
            ],
            'persona' => $r->persona ? [
                ...$r->persona->only('id', 'nome', 'descricao', 'dores', 'quem_decide', 'linguagem', 'status'),
                'parecida_com' => $r->persona->parecidaCom?->only('id', 'nome'),
            ] : null,
            'conformidade' => [
                'situacao' => $r->situacaoConformidade(),
                // Na ordem do config (o jsonb do Postgres reordena as chaves do payload).
                'regras' => collect($r->conformidade['regras'] ?? [])
                    ->sortBy(fn (array $x) => array_search($x['id'], array_keys($regras), true))
                    ->map(fn (array $x) => [...$x, 'descricao' => $regras[$x['id']] ?? $x['id']])->values(),
                'fatos' => $r->conformidade['fatos'] ?? [],
                'pesquisou' => (bool) ($r->conformidade['pesquisou'] ?? false),
                'crm' => $cliente->crm,
                'rqe' => $cliente->rqe,
            ],
            'pedido' => $this->pedido($r->tarefa),
        ]);
    }

    /** Edição manual do texto. Texto aprovado que muda volta para revisão: a aprovação era daquele texto (RF27). */
    public function update(Request $request, int $roteiro): RedirectResponse
    {
        $r = $this->roteiroDo($request, $roteiro);
        $dados = $request->validate([
            'gancho' => ['required', 'string', 'max:500'],
            'desenvolvimento' => ['required', 'string', 'max:3000'],
            'cta' => ['required', 'string', 'max:300'],
        ]);
        abort_if($r->status === Roteiro::DESCARTADO, 404);
        if ($r->temPedidoEmAndamento()) {
            return back()->with('status', 'Espere a IA terminar antes de editar o texto.');
        }
        $r->fill($dados);
        if ($r->isDirty() && $r->status === Roteiro::APROVADO) {
            $r->fill(['status' => Roteiro::RASCUNHO, 'aprovado_por' => null, 'aprovado_em' => null]);
        }
        $r->save();

        return back()->with('status', 'Texto salvo. Confira a conformidade de novo antes de aprovar.');
    }

    public function aprovar(Request $request, int $roteiro): RedirectResponse
    {
        return DB::transaction(function () use ($request, $roteiro) {
            $r = $this->roteiroDo($request, $roteiro, travar: true);
            $impedimento = $r->impedimentoAprovacao();
            if ($impedimento) {
                return back()->with('status', $impedimento);
            }
            $r->update(['status' => Roteiro::APROVADO, 'aprovado_por' => $request->user()->id, 'aprovado_em' => now()]);

            return to_route('roteiros.gravacao', $r->id)->with('status', 'Roteiro aprovado. Agora é gravar e enviar os takes.');
        });
    }

    /** "Pedir nova versão": a IA reescreve seguindo o comentário da produção (RF25). */
    public function refazer(Request $request, int $roteiro, PedirIaRoteiros $pedir): RedirectResponse
    {
        $r = $this->roteiroDo($request, $roteiro);
        $dados = $request->validate(['comentario' => ['required', 'string', 'max:1000']]);
        abort_if($r->status === Roteiro::DESCARTADO, 404);

        return back()->with('status', $pedir->refazer($r, $dados['comentario']) ? 'A IA está escrevendo a nova versão.' : 'Já existe um pedido em andamento para este roteiro.');
    }

    public function checar(Request $request, int $roteiro, PedirIaRoteiros $pedir): RedirectResponse
    {
        $r = $this->roteiroDo($request, $roteiro);
        abort_if($r->status === Roteiro::DESCARTADO, 404);

        return back()->with('status', $pedir->checar($r) ? 'A IA está conferindo a conformidade.' : 'Já existe um pedido em andamento para este roteiro.');
    }

    public function descartar(Request $request, int $roteiro): RedirectResponse
    {
        $r = $this->roteiroDo($request, $roteiro);
        if ($r->videos()->whereNotIn('status', [Video::ENVIADO, Video::DESCARTADO])->exists()) {
            return back()->with('status', 'Este roteiro já tem vídeo na edição e não pode ser descartado.');
        }
        $r->update(['status' => Roteiro::DESCARTADO]);

        return to_route('roteiros.index', ['semana' => $r->semana_inicio->toDateString()])->with('status', 'Roteiro descartado.');
    }

    /** Etapa 2: roteiro para gravar, checklist e takes. */
    public function gravacao(Request $request, int $roteiro): Response
    {
        $r = $this->roteiroDo($request, $roteiro);
        $takes = $r->videos()->with('tarefaEdicao:id,status')->orderBy('id')->get();

        return Inertia::render('roteiros/gravacao', [
            'roteiro' => [...$r->cabecalhoSessao(), ...$r->only('gancho', 'desenvolvimento', 'cta', 'palavra_chave')],
            'takes' => $takes->map(fn (Video $v) => [
                'id' => $v->id,
                'nome' => $v->nome_original,
                'tamanho_bytes' => $v->tamanho_bytes,
                'status' => $v->status,
                'enviado_em' => $v->created_at->toIso8601String(),
            ]),
            'emEdicao' => $takes->contains(fn (Video $v) => in_array($v->status, Video::EM_PRODUCAO, true)),
            'videoAtual' => $r->videoAtual()?->link(),
            'uploadMaxMb' => config('midia.upload_max_mb'),
        ]);
    }

    public function enviarTake(Request $request, int $roteiro, ReceberVideoBruto $receber): RedirectResponse
    {
        $r = $this->roteiroDo($request, $roteiro);
        $request->validate(
            ['video' => ['required', 'file', 'mimetypes:video/mp4,video/quicktime', 'max:'.(config('midia.upload_max_mb') * 1024)]],
            ['video.mimetypes' => 'Envie um vídeo MP4 ou MOV.', 'video.uploaded' => 'O vídeo não chegou ao servidor: passou do limite de upload do PHP.'],
        );
        if ($r->status !== Roteiro::APROVADO) {
            return back()->with('status', 'Aprove o roteiro antes de enviar os takes.');
        }
        $receber->take($request->user(), $r, $request->file('video'));

        return back()->with('status', 'Take enviado.');
    }

    /** Manda o take principal para a análise da IA, que preenche o formulário de edição a partir do roteiro (RF51). */
    public function editar(Request $request, int $roteiro, PedirAnaliseVideo $analisar): RedirectResponse
    {
        return DB::transaction(function () use ($request, $roteiro, $analisar) {
            $r = $this->roteiroDo($request, $roteiro, travar: true);
            $dados = $request->validate([
                'take_id' => ['required', 'integer', Rule::exists('videos', 'id')->where('roteiro_id', $r->id)->whereIn('status', [Video::ENVIADO, Video::FALHOU, Video::DESCARTADO])],
            ]);
            if ($r->status !== Roteiro::APROVADO) {
                return back()->with('status', 'Aprove o roteiro antes de mandar para a edição.');
            }
            if ($r->videos()->whereIn('status', Video::EM_PRODUCAO)->exists()) {
                return back()->with('status', 'Já há um take deste roteiro na edição. Descarte-o na aprovação para mandar outro.');
            }
            $take = Video::query()->with(['cliente', 'roteiro.persona'])->findOrFail((int) $dados['take_id']);
            $analisar($take);

            return to_route('videos.formulario', $take->id)->with('status', 'A IA está analisando o take para preencher o formulário de edição.');
        });
    }

    /** Etapa 4: progresso da edição do último take enviado. */
    public function edicao(Request $request, int $roteiro): Response
    {
        $r = $this->roteiroDo($request, $roteiro);
        $video = $r->videoAtual()?->load('tarefaEdicao');
        $tarefa = $video?->tarefaEdicao;

        return Inertia::render('roteiros/edicao', [
            'roteiro' => [...$r->cabecalhoSessao(), ...$r->only('gancho', 'cta', 'palavra_chave')],
            'video' => $video ? [
                'id' => $video->id,
                'nome' => $video->nome_original,
                'status' => $video->status,
                'erro' => $video->erro,
                'duracao_segundos' => $video->duracao_segundos !== null ? (float) $video->duracao_segundos : null,
                'tarefa' => $tarefa?->status,
                'etapa' => $tarefa?->etapa,
                'tentativa' => $tarefa?->tentativas,
            ] : null,
        ]);
    }

    private function roteiroDo(Request $request, int $id, bool $travar = false): Roteiro
    {
        $cliente = $this->clienteDo($request);
        $query = Roteiro::query()->doCliente($cliente->id)->with(['tarefa', 'persona']);

        return ($travar ? $query->lockForUpdate() : $query)->findOrFail($id);
    }

    private function etapa(Roteiro $r): string
    {
        $videos = $r->videos->sortByDesc('id');
        $atual = $videos->first(fn (Video $v) => ! in_array($v->status, [Video::ENVIADO, Video::DESCARTADO], true));

        return match (true) {
            $r->status === Roteiro::DESCARTADO => 'Descartado',
            $r->temPedidoEmAndamento() => 'IA trabalhando',
            $r->status === Roteiro::RASCUNHO => 'Revisar roteiro',
            $atual === null => $videos->isNotEmpty() ? 'Takes enviados' : 'Aguardando gravação',
            default => match ($atual->status) {
                Video::ANALISANDO => 'IA analisando o take',
                Video::FORMULARIO => 'Formulário de edição',
                Video::AGUARDANDO_EDICAO => 'Edição automática',
                Video::EDITADO => 'Aprovação da produção',
                Video::APROVADO => 'Aguardando o médico',
                Video::CONFIRMADO => 'Pronto para publicar',
                Video::PUBLICADO => 'Publicado',
                default => 'Falhou',
            },
        };
    }

    /**
     * Concluída mas ainda não aplicada pelo comando agendado: a tela continua esperando.
     *
     * @return array{status: string, erro: string|null, tipo: string}|null
     */
    private function pedido(?TarefaMidia $tarefa): ?array
    {
        return $tarefa ? [
            'status' => $tarefa->status === TarefaMidia::CONCLUIDA && $tarefa->processada_em === null ? TarefaMidia::EM_ANDAMENTO : $tarefa->status,
            'erro' => $tarefa->erro,
            'tipo' => $tarefa->tipo,
        ] : null;
    }

    private const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    /** "9 a 15 de novembro" (canva, tela 06). */
    private function rotuloSemana(string $inicio): string
    {
        $i = CarbonImmutable::parse($inicio);
        $f = $i->addDays(6);
        $mes = fn (CarbonImmutable $d) => self::MESES[$d->month - 1];

        return $i->month === $f->month ? "{$i->day} a {$f->day} de {$mes($f)}" : "{$i->day} de {$mes($i)} a {$f->day} de {$mes($f)}";
    }
}
