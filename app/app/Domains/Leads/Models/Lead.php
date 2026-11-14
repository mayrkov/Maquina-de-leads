<?php

namespace App\Domains\Leads\Models;

use App\Domains\Videos\Models\Video;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Lead qualificado pela ferramenta de mensagens e registrado à mão pela produção (RF38). Dado pessoal e de saúde:
 * só a produção do próprio cliente vê (RNF02, RNF03).
 *
 * @property int $id
 * @property int $cliente_id
 * @property int|null $video_id
 * @property string $nome
 * @property string|null $perfil
 * @property string|null $para_quem
 * @property string|null $problema
 * @property string|null $cidade
 * @property Carbon $consentimento_em
 * @property string $status
 * @property int|null $registrado_por
 * @property Carbon $created_at
 * @property-read Video|null $video
 */
class Lead extends Model
{
    /** Status do atendimento (RF40), na ordem do funil. Entrega e status são manuais no MVP. */
    public const STATUS = [
        'qualificado' => 'Qualificado',
        'entregue' => 'Entregue à equipe',
        'agendou' => 'Agendou',
        'nao_agendou' => 'Não agendou',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return ['consentimento_em' => 'datetime'];
    }

    /** @param  Builder<Lead>  $query */
    public function scopeDoCliente(Builder $query, int $clienteId): void
    {
        $query->where('cliente_id', $clienteId);
    }

    /** @return BelongsTo<Video, $this> */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }
}
