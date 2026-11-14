<?php

namespace App\Domains\Clientes\Models;

use App\Domains\Marca\Models\KitMarca;
use App\Domains\Personas\Models\Persona;
use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Models\Video;
use App\Models\User;
use App\Worker\TarefaMidia;
use Database\Factories\ClienteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $nome
 * @property string|null $nicho
 * @property string|null $objetivo
 * @property string|null $oferta
 * @property string|null $regiao
 * @property string|null $tom_voz
 * @property string|null $temas_proibidos
 * @property list<string> $tags
 * @property string $canal
 * @property string|null $profissao
 * @property string|null $conselho
 * @property string|null $crm
 * @property string|null $rqe
 * @property int|null $tarefa_personas_id
 * @property int|null $tarefa_roteiros_id
 */
#[Fillable(['nome', 'nicho', 'objetivo', 'oferta', 'regiao', 'tom_voz', 'temas_proibidos', 'tags', 'profissao', 'conselho', 'crm', 'rqe'])]
class Cliente extends Model
{
    /** @use HasFactory<ClienteFactory> */
    use HasFactory;

    /** Campos sem os quais a IA não tem como sugerir personas nem roteiros. */
    public const CAMPOS_OBRIGATORIOS_BRIEFING = ['nicho', 'objetivo', 'oferta', 'regiao', 'tom_voz', 'conselho'];

    protected static function newFactory(): ClienteFactory
    {
        return ClienteFactory::new();
    }

    protected function casts(): array
    {
        return ['tags' => 'array'];
    }

    public function briefingCompleto(): bool
    {
        foreach (self::CAMPOS_OBRIGATORIOS_BRIEFING as $campo) {
            if (blank($this->{$campo})) {
                return false;
            }
        }

        return true;
    }

    /**
     * O que a IA lê do briefing (personas e roteiros). Dado do negócio, não de paciente.
     *
     * @return array<string, mixed>
     */
    public function briefingParaIa(): array
    {
        return $this->only('nicho', 'objetivo', 'oferta', 'regiao', 'tom_voz', 'temas_proibidos', 'tags', 'profissao', 'conselho');
    }

    /** @return HasMany<User, $this> */
    public function usuarios(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<Video, $this> */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    /** @return HasMany<Persona, $this> */
    public function personas(): HasMany
    {
        return $this->hasMany(Persona::class);
    }

    /** @return HasMany<Roteiro, $this> */
    public function roteiros(): HasMany
    {
        return $this->hasMany(Roteiro::class);
    }

    /** @return HasOne<KitMarca, $this> */
    public function kitMarca(): HasOne
    {
        return $this->hasOne(KitMarca::class);
    }

    /** @return BelongsTo<TarefaMidia, $this> */
    public function tarefaPersonas(): BelongsTo
    {
        return $this->belongsTo(TarefaMidia::class, 'tarefa_personas_id');
    }
}
