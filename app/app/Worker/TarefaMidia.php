<?php

namespace App\Worker;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Uma linha de tarefas_midia (arquitetura D4).
 *
 * @property int $id
 * @property string $tipo
 * @property array<string, mixed> $payload
 * @property string $status
 * @property int $tentativas
 * @property int $max_tentativas
 * @property array<string, mixed>|null $resultado
 * @property string|null $erro
 * @property string|null $etapa
 * @property Carbon|null $processada_em
 */
class TarefaMidia extends Model
{
    public const PENDENTE = 'pendente';

    public const EM_ANDAMENTO = 'em_andamento';

    public const CONCLUIDA = 'concluida';

    public const FALHOU = 'falhou';

    protected $table = 'tarefas_midia';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'resultado' => 'array',
            'disponivel_em' => 'datetime',
            'heartbeat_em' => 'datetime',
            'processada_em' => 'datetime',
        ];
    }
}
