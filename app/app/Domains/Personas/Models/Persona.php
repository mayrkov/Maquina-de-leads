<?php

namespace App\Domains\Personas\Models;

use App\Domains\Roteiros\Models\Roteiro;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Público de um cliente. Ninguém cadastra à mão: a IA sugere e a produção salva, junta, corrige ou ignora (RN09).
 *
 * @property int $id
 * @property int $cliente_id
 * @property string $nome
 * @property string $descricao
 * @property string $dores
 * @property string $quem_decide
 * @property string $linguagem
 * @property string $status
 * @property int|null $parecida_com_id
 */
class Persona extends Model
{
    public const SUGERIDA = 'sugerida';

    public const SALVA = 'salva';

    public const JUNTADA = 'juntada';

    public const DESCARTADA = 'descartada';

    protected $guarded = [];

    /**
     * @param  Builder<Persona>  $query
     */
    public function scopeDoCliente(Builder $query, int $clienteId): void
    {
        $query->where('cliente_id', $clienteId);
    }

    /** @return BelongsTo<Persona, $this> */
    public function parecidaCom(): BelongsTo
    {
        return $this->belongsTo(Persona::class, 'parecida_com_id');
    }

    /** @return HasMany<Roteiro, $this> */
    public function roteiros(): HasMany
    {
        return $this->hasMany(Roteiro::class);
    }
}
