<?php

namespace App\Domains\Roteiros\Actions;

use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Models\Roteiro;
use App\Worker\TarefaMidia;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Tratadores das tarefas de roteiro. O worker já valida a resposta da IA; aqui o resultado é conferido de novo
 * antes de entrar no banco, porque vira texto na tela e link de fonte.
 */
class AplicarResultadosRoteiro
{
    /** gerar_roteiros: cada roteiro entra em revisão; persona nova entra como sugerida (RF48). */
    public function gerados(TarefaMidia $tarefa): void
    {
        if ($tarefa->status !== TarefaMidia::CONCLUIDA) {
            return;
        }
        $clienteId = (int) ($tarefa->payload['cliente_id'] ?? 0);
        $semana = CarbonImmutable::parse((string) ($tarefa->payload['semana_inicio'] ?? 'now'));
        $regras = array_keys((array) ($tarefa->payload['regras'] ?? []));
        $salvas = Persona::query()->doCliente($clienteId)->where('status', Persona::SALVA)->pluck('id')->map(fn ($id): int => (int) $id)->all();

        foreach ((array) ($tarefa->resultado['roteiros'] ?? []) as $r) {
            $texto = is_array($r) ? $this->texto($r) : null;
            if ($texto === null) {
                continue;
            }
            Roteiro::create([
                ...$texto,
                'cliente_id' => $clienteId,
                'persona_id' => $this->persona($clienteId, (array) ($r['persona'] ?? []), $salvas),
                'semana_inicio' => Roteiro::semanaDe($semana),
                'status' => Roteiro::RASCUNHO,
                'conformidade' => $this->conformidade((array) ($r['conformidade'] ?? []), $regras),
                'conformidade_hash' => Roteiro::hashDe($texto),
            ]);
        }
    }

    /** refazer_roteiro: o texto novo substitui o anterior e volta para revisão; a persona continua a mesma. */
    public function refeito(TarefaMidia $tarefa): void
    {
        $roteiro = $this->roteiroDa($tarefa);
        $r = (array) ($tarefa->resultado['roteiro'] ?? []);
        $texto = $tarefa->status === TarefaMidia::CONCLUIDA ? $this->texto($r) : null;
        if (! $roteiro || $texto === null) {
            return;
        }
        $roteiro->update([
            ...$texto,
            'status' => Roteiro::RASCUNHO,
            'aprovado_por' => null,
            'aprovado_em' => null,
            'conformidade' => $this->conformidade((array) ($r['conformidade'] ?? []), array_keys((array) ($tarefa->payload['regras'] ?? []))),
            'conformidade_hash' => Roteiro::hashDe($texto),
        ]);
    }

    /** checar_conformidade: o resultado vale para o texto que foi conferido (hash do payload, não do atual). */
    public function checado(TarefaMidia $tarefa): void
    {
        $roteiro = $this->roteiroDa($tarefa);
        $conferido = (array) ($tarefa->payload['roteiro'] ?? []);
        if (! $roteiro || $tarefa->status !== TarefaMidia::CONCLUIDA) {
            return;
        }
        $roteiro->update([
            'conformidade' => $this->conformidade((array) ($tarefa->resultado['conformidade'] ?? []), array_keys((array) ($tarefa->payload['regras'] ?? []))),
            'conformidade_hash' => Roteiro::hashDe([
                'gancho' => (string) ($conferido['gancho'] ?? ''),
                'desenvolvimento' => (string) ($conferido['desenvolvimento'] ?? ''),
                'cta' => (string) ($conferido['cta'] ?? ''),
            ]),
        ]);
    }

    private function roteiroDa(TarefaMidia $tarefa): ?Roteiro
    {
        return Roteiro::query()->whereKey((int) ($tarefa->payload['roteiro_id'] ?? 0))->where('status', '!=', Roteiro::DESCARTADO)->first();
    }

    /**
     * @param  array<mixed>  $r
     * @return array{tema: string, titulo: string, gancho: string, desenvolvimento: string, cta: string, palavra_chave: string, objetivo: string}|null
     */
    private function texto(array $r): ?array
    {
        $palavra = mb_strtoupper(trim((string) ($r['palavra_chave'] ?? '')));
        $texto = [
            'tema' => Str::limit(trim((string) ($r['tema'] ?? '')), 200, ''),
            'titulo' => Str::limit(trim((string) ($r['titulo'] ?? '')), 200, ''),
            'gancho' => Str::limit(trim((string) ($r['gancho'] ?? '')), 500, ''),
            'desenvolvimento' => Str::limit(trim((string) ($r['desenvolvimento'] ?? '')), 3000, ''),
            'cta' => Str::limit(trim((string) ($r['cta'] ?? '')), 300, ''),
            'palavra_chave' => $palavra,
            'objetivo' => Str::limit(trim((string) ($r['objetivo'] ?? '')), 200, ''),
        ];
        // Mesma regra da palavra-chave do upload e do worker (uma palavra só).
        if (in_array('', [$texto['tema'], $texto['titulo'], $texto['gancho'], $texto['desenvolvimento'], $texto['cta']], true)
            || ! preg_match('/^[\p{L}\p{N}]{2,30}$/u', $palavra)) {
            return null;
        }

        return $texto;
    }

    /**
     * Persona salva do cliente quando a IA reusou uma; senão, uma sugestão nova à espera da produção (RF48, RF49).
     *
     * @param  array<mixed>  $p
     * @param  array<int, int>  $salvas
     */
    private function persona(int $clienteId, array $p, array $salvas): ?int
    {
        $id = (int) ($p['id'] ?? 0);
        if (in_array($id, $salvas, true)) {
            return $id;
        }
        if (blank($p['nome'] ?? null)) {
            return null;
        }
        $parecida = (int) ($p['parecida_com_id'] ?? 0);

        return Persona::create([
            'cliente_id' => $clienteId,
            'nome' => Str::limit((string) $p['nome'], 120, ''),
            'descricao' => (string) ($p['descricao'] ?? ''),
            'dores' => (string) ($p['dores'] ?? ''),
            'quem_decide' => Str::limit((string) ($p['quem_decide'] ?? ''), 200, ''),
            'linguagem' => Str::limit((string) ($p['linguagem'] ?? ''), 200, ''),
            'status' => Persona::SUGERIDA,
            'parecida_com_id' => in_array($parecida, $salvas, true) ? $parecida : null,
        ])->id;
    }

    /**
     * Só as regras pedidas, com resultado conhecido; fontes só com link http(s) (vão para a tela como link).
     *
     * @param  array<mixed>  $c
     * @param  list<int|string>  $regras
     * @return array<string, mixed>
     */
    private function conformidade(array $c, array $regras): array
    {
        $porRegra = collect((array) ($c['regras'] ?? []))->filter(fn ($x) => is_array($x))->keyBy(fn (array $x) => (string) ($x['id'] ?? ''));

        return [
            // Regra sem resposta da IA não passa em branco: fica como atenção.
            'regras' => collect($regras)->map(function ($id) use ($porRegra) {
                $x = (array) $porRegra->get((string) $id, []);
                $resultado = in_array($x['resultado'] ?? null, ['ok', 'atencao', 'bloqueio'], true) ? $x['resultado'] : 'atencao';

                return ['id' => (string) $id, 'resultado' => $resultado, 'motivo' => Str::limit(trim((string) ($x['motivo'] ?? '')), 500, '') ?: null];
            })->values()->all(),
            'fatos' => collect((array) ($c['fatos'] ?? []))->filter(fn ($f) => is_array($f) && filled($f['afirmacao'] ?? null))->take(10)->map(fn (array $f) => [
                'afirmacao' => Str::limit((string) $f['afirmacao'], 500, ''),
                'veredito' => in_array($f['veredito'] ?? null, ['confirmada', 'sem_fonte', 'incorreta'], true) ? $f['veredito'] : 'sem_fonte',
                'correcao' => Str::limit(trim((string) ($f['correcao'] ?? '')), 500, '') ?: null,
                'fontes' => collect((array) ($f['fontes'] ?? []))
                    ->filter(fn ($s) => is_array($s) && preg_match('#^https?://#i', (string) ($s['uri'] ?? '')))
                    ->take(5)
                    ->map(fn (array $s) => ['uri' => Str::limit((string) $s['uri'], 1000, ''), 'title' => Str::limit((string) ($s['title'] ?? ''), 200, '') ?: null])
                    ->values()->all(),
            ])->values()->all(),
            'pesquisou' => (bool) ($c['pesquisou'] ?? false),
        ];
    }
}
