<?php

namespace App\Domains\Roteiros\Actions;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Models\Roteiro;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Pedidos de roteiro ao worker: a semana inteira (RF05, RF08, RF09), uma nova versão com o comentário da produção
 * (RF25) e uma nova checagem de conformidade depois de uma edição manual (RF13, RF27).
 *
 * O payload leva o briefing, o catálogo de personas, os temas recentes e as regras do conselho: dado do negócio,
 * não de paciente. O worker não lê outras tabelas.
 */
class PedirIaRoteiros
{
    public const POR_SEMANA = 5;

    /** Temas recentes passados à IA para não repetir (RF08). */
    public const TEMAS_RECENTES = 30;

    public function __construct(private readonly FilaMidia $fila) {}

    /** @return CarbonImmutable|null a semana pedida, ou null quando já há um pedido na fila para este cliente. */
    public function gerarSemana(Cliente $cliente): ?CarbonImmutable
    {
        return DB::transaction(function () use ($cliente) {
            $cliente = Cliente::query()->whereKey($cliente->id)->lockForUpdate()->firstOrFail();
            $anterior = $cliente->tarefa_roteiros_id ? TarefaMidia::query()->find($cliente->tarefa_roteiros_id) : null;
            if ($anterior && in_array($anterior->status, [TarefaMidia::PENDENTE, TarefaMidia::EM_ANDAMENTO], true)) {
                return null;
            }

            $semana = $this->proximaSemana($cliente);
            $tarefa = $this->fila->enfileirar('gerar_roteiros', [
                'cliente_id' => $cliente->id,
                'semana_inicio' => $semana->toDateString(),
                'quantidade' => self::POR_SEMANA,
                'briefing' => $cliente->briefingParaIa(),
                'catalogo' => $this->catalogo($cliente->id),
                'temas_recentes' => Roteiro::query()->doCliente($cliente->id)->latest('id')->limit(self::TEMAS_RECENTES)->pluck('tema')->all(),
                'regras' => $this->regras($cliente),
            ]);
            $cliente->forceFill(['tarefa_roteiros_id' => $tarefa->id])->save();

            return $semana;
        });
    }

    /** A semana atual, ou a seguinte à última que já tem roteiros. */
    public function proximaSemana(Cliente $cliente): CarbonImmutable
    {
        $atual = Roteiro::semanaDe(now());
        $ultima = Roteiro::query()->doCliente($cliente->id)->where('status', '!=', Roteiro::DESCARTADO)->max('semana_inicio');
        if ($ultima === null) {
            return $atual;
        }
        $seguinte = CarbonImmutable::parse($ultima)->addWeek();

        return $seguinte->greaterThan($atual) ? $seguinte : $atual;
    }

    /** @return bool false quando o roteiro já tem um pedido em andamento. */
    public function refazer(Roteiro $roteiro, string $comentario): bool
    {
        return $this->pedirParaRoteiro($roteiro, function (Roteiro $r, Cliente $cliente) use ($comentario) {
            $r->forceFill(['comentario_ajuste' => $comentario])->save();

            return $this->fila->enfileirar('refazer_roteiro', [
                'roteiro_id' => $r->id,
                'briefing' => $cliente->briefingParaIa(),
                'regras' => $this->regras($cliente),
                'roteiro' => $this->roteiroParaIa($r),
                'comentario' => $comentario,
            ]);
        });
    }

    /** @return bool false quando o roteiro já tem um pedido em andamento. */
    public function checar(Roteiro $roteiro): bool
    {
        return $this->pedirParaRoteiro($roteiro, fn (Roteiro $r, Cliente $cliente) => $this->fila->enfileirar('checar_conformidade', [
            'roteiro_id' => $r->id,
            'briefing' => $cliente->briefingParaIa(),
            'regras' => $this->regras($cliente),
            'roteiro' => $this->roteiroParaIa($r),
        ]));
    }

    /** @param  callable(Roteiro, Cliente): TarefaMidia  $enfileirar */
    private function pedirParaRoteiro(Roteiro $roteiro, callable $enfileirar): bool
    {
        return DB::transaction(function () use ($roteiro, $enfileirar) {
            $r = Roteiro::query()->with(['tarefa', 'persona'])->whereKey($roteiro->id)->lockForUpdate()->firstOrFail();
            if ($r->temPedidoEmAndamento()) {
                return false;
            }
            $tarefa = $enfileirar($r, Cliente::query()->findOrFail($r->cliente_id));
            $r->forceFill(['tarefa_id' => $tarefa->id])->save();

            return true;
        });
    }

    /** @return array<string, mixed> */
    private function roteiroParaIa(Roteiro $r): array
    {
        return [
            ...$r->only('tema', 'titulo', 'gancho', 'desenvolvimento', 'cta', 'palavra_chave', 'objetivo'),
            'persona' => $r->persona?->only('nome', 'descricao', 'dores', 'quem_decide'),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function catalogo(int $clienteId): array
    {
        return Persona::query()->doCliente($clienteId)->where('status', Persona::SALVA)->orderBy('id')
            ->get(['id', 'nome', 'descricao', 'quem_decide', 'dores'])
            ->map(fn (Persona $p) => $p->only('id', 'nome', 'descricao', 'quem_decide', 'dores'))
            ->values()
            ->all();
    }

    /** @return array<string, string> Regras do conselho do cliente (config/conformidade.php). */
    public function regras(Cliente $cliente): array
    {
        return config('conformidade.'.($cliente->conselho ?? ''), []);
    }
}
