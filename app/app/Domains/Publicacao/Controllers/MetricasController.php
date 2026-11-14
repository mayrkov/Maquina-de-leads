<?php

namespace App\Domains\Publicacao\Controllers;

use App\Domains\Leads\Models\Lead;
use App\Domains\Videos\Models\Video;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Canva, tela 14: métricas. Visualizações e comentários são digitados a partir dos insights do Instagram (RF41);
 * leads vêm do registro da tela Leads. Por vídeo, persona e gancho (RF42).
 *
 * shortcut: o "aprendizado" mostra a persona e o gancho com mais leads, sem IA; usar isso na geração dos próximos
 * roteiros é o RF44 (depois do MVP).
 */
class MetricasController extends Controller
{
    public const AGRUPAR = ['video', 'persona', 'gancho'];

    public function index(Request $request): Response
    {
        abort_if($request->user()?->cliente_id === null, 403);
        $por = in_array($request->query('por'), self::AGRUPAR, true) ? (string) $request->query('por') : 'video';
        $videos = Video::query()->doCliente($request->user())->where('status', Video::PUBLICADO)
            ->with('roteiro:id,titulo')
            ->withCount(['leads', 'leads as agendados_count' => fn ($q) => $q->where('status', 'agendou')])
            ->latest('publicado_em')->get();
        $leads = Lead::query()->doCliente($request->user()->cliente_id);

        $linhas = $videos->map(fn (Video $v) => [
            'id' => $v->id,
            'titulo' => $v->titulo(),
            'persona' => $v->campo('persona'),
            'gancho' => $v->campo('gancho'),
            'visualizacoes' => $v->visualizacoes,
            'comentarios' => $v->comentarios,
            'leads' => (int) $v->getAttribute('leads_count'),
            'agendados' => (int) $v->getAttribute('agendados_count'),
            'metricas_em' => $v->metricas_em?->toIso8601String(),
        ])->all();

        return Inertia::render('metricas/index', [
            'por' => $por,
            'totais' => [
                'visualizacoes' => $videos->sum('visualizacoes'),
                'comentarios' => $videos->sum('comentarios'),
                'leads' => (clone $leads)->count(),
                'agendados' => (clone $leads)->where('status', 'agendou')->count(),
            ],
            'linhas' => $por === 'video' ? $linhas : $this->agrupar($linhas, $por),
            'aprendizado' => [
                'persona' => $this->campeao($linhas, 'persona'),
                'gancho' => $this->campeao($linhas, 'gancho'),
            ],
        ]);
    }

    public function salvar(Request $request, int $video): RedirectResponse
    {
        $dados = $request->validate([
            'visualizacoes' => ['nullable', 'integer', 'min:0', 'max:2000000000'],
            'comentarios' => ['nullable', 'integer', 'min:0', 'max:2000000000'],
        ]);
        $v = $this->videoDo($request, $video);
        abort_unless($v->status === Video::PUBLICADO, 409, 'Métricas só de vídeo publicado.');
        $v->update([...$dados, 'metricas_em' => now()]);

        return back()->with('status', 'Métricas salvas.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     * @return list<array<string, mixed>>
     */
    private function agrupar(array $linhas, string $por): array
    {
        return array_values(collect($linhas)->groupBy(fn (array $l): string => (string) ($l[$por] ?? '(sem '.$por.')'))->map(fn (Collection $g, string $chave): array => [
            'id' => $chave,
            'titulo' => $chave,
            'videos' => $g->count(),
            'visualizacoes' => $g->sum('visualizacoes'),
            'comentarios' => $g->sum('comentarios'),
            'leads' => $g->sum('leads'),
            'agendados' => $g->sum('agendados'),
        ])->sortByDesc('leads')->values()->all());
    }

    /**
     * @param  array<int, array<string, mixed>>  $linhas
     * @return array{nome: string, leads: int}|null
     */
    private function campeao(array $linhas, string $campo): ?array
    {
        $melhor = $this->agrupar(array_filter($linhas, fn (array $l) => filled($l[$campo])), $campo)[0] ?? null;

        return $melhor && $melhor['leads'] > 0 ? ['nome' => (string) $melhor['titulo'], 'leads' => (int) $melhor['leads']] : null;
    }
}
