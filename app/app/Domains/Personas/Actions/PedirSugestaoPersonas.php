<?php

namespace App\Domains\Personas\Actions;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Personas\Models\Persona;
use App\Worker\FilaMidia;
use App\Worker\TarefaMidia;
use Illuminate\Support\Facades\DB;

/**
 * Pede à IA o conjunto de personas a partir do briefing (RF50). A IA também aponta, para cada uma, a persona salva
 * mais parecida, para a produção juntar em vez de duplicar (RF48).
 *
 * O payload leva o briefing (dado do negócio, não de paciente) e o catálogo atual: o worker não lê outras tabelas.
 */
class PedirSugestaoPersonas
{
    public function __construct(private readonly FilaMidia $fila) {}

    /** @return bool false quando já há um pedido na fila para este cliente. */
    public function __invoke(Cliente $cliente): bool
    {
        return DB::transaction(function () use ($cliente) {
            $cliente = Cliente::query()->whereKey($cliente->id)->lockForUpdate()->firstOrFail();
            $anterior = $cliente->tarefa_personas_id ? TarefaMidia::query()->find($cliente->tarefa_personas_id) : null;
            if ($anterior && in_array($anterior->status, [TarefaMidia::PENDENTE, TarefaMidia::EM_ANDAMENTO], true)) {
                return false;
            }

            $catalogo = Persona::query()->doCliente($cliente->id)->where('status', Persona::SALVA)->orderBy('id')
                ->get(['id', 'nome', 'descricao', 'quem_decide'])
                ->map(fn (Persona $p) => $p->only('id', 'nome', 'descricao', 'quem_decide'))
                ->all();

            $tarefa = $this->fila->enfileirar('sugerir_personas', [
                'cliente_id' => $cliente->id,
                'briefing' => $cliente->briefingParaIa(),
                'catalogo' => $catalogo,
            ]);
            $cliente->forceFill(['tarefa_personas_id' => $tarefa->id])->save();

            return true;
        });
    }
}
