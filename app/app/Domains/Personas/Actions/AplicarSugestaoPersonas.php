<?php

namespace App\Domains\Personas\Actions;

use App\Domains\Personas\Models\Persona;
use App\Worker\TarefaMidia;
use Illuminate\Support\Str;

/** Tratador da tarefa sugerir_personas: cada persona sugerida pela IA entra como "sugerida", à espera da produção. */
class AplicarSugestaoPersonas
{
    public function __invoke(TarefaMidia $tarefa): void
    {
        if ($tarefa->status !== TarefaMidia::CONCLUIDA) {
            return;
        }
        $clienteId = (int) ($tarefa->payload['cliente_id'] ?? 0);
        $salvas = Persona::query()->doCliente($clienteId)->where('status', Persona::SALVA)->pluck('id')->all();

        foreach ((array) ($tarefa->resultado['personas'] ?? []) as $p) {
            if (! is_array($p) || blank($p['nome'] ?? null)) {
                continue;
            }
            $parecida = (int) ($p['parecida_com_id'] ?? 0);
            Persona::create([
                'cliente_id' => $clienteId,
                'nome' => Str::limit((string) $p['nome'], 120, ''),
                'descricao' => (string) ($p['descricao'] ?? ''),
                'dores' => (string) ($p['dores'] ?? ''),
                'quem_decide' => Str::limit((string) ($p['quem_decide'] ?? ''), 200, ''),
                'linguagem' => Str::limit((string) ($p['linguagem'] ?? ''), 200, ''),
                'status' => Persona::SUGERIDA,
                // Só aceita apontar para uma persona salva deste cliente.
                'parecida_com_id' => in_array($parecida, $salvas, true) ? $parecida : null,
            ]);
        }
    }
}
