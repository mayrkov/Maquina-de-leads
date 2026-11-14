<?php

namespace App\Domains\Roteiros\Models;

use App\Domains\Personas\Models\Persona;
use App\Domains\Videos\Models\Video;
use App\Worker\TarefaMidia;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Roteiro escrito pela IA para o médico gravar (RF09 a RF11). Cada um mira uma persona (RN04).
 *
 * @property int $id
 * @property int $cliente_id
 * @property int|null $persona_id
 * @property CarbonImmutable $semana_inicio
 * @property string $tema
 * @property string $titulo
 * @property string $gancho
 * @property string $desenvolvimento
 * @property string $cta
 * @property string $palavra_chave
 * @property string $objetivo
 * @property string $status
 * @property string|null $comentario_ajuste
 * @property array{regras?: list<array{id: string, resultado: string, motivo?: string|null}>, fatos?: list<array{afirmacao: string, veredito: string, correcao?: string|null, fontes?: list<array{uri: string, title?: string|null}>}>, pesquisou?: bool}|null $conformidade
 * @property string|null $conformidade_hash
 * @property int|null $tarefa_id
 * @property int|null $aprovado_por
 * @property CarbonImmutable|null $aprovado_em
 * @property-read Persona|null $persona
 * @property-read TarefaMidia|null $tarefa
 */
class Roteiro extends Model
{
    public const RASCUNHO = 'rascunho';

    public const APROVADO = 'aprovado';

    public const DESCARTADO = 'descartado';

    /** Fala em pt-BR, para estimar a duração pelo número de palavras. */
    public const PALAVRAS_POR_SEGUNDO = 2.5;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'semana_inicio' => 'date',
            'conformidade' => 'array',
            'aprovado_em' => 'datetime',
        ];
    }

    /**
     * @param  Builder<Roteiro>  $query
     */
    public function scopeDoCliente(Builder $query, int $clienteId): void
    {
        $query->where('cliente_id', $clienteId);
    }

    /** @return BelongsTo<Persona, $this> */
    public function persona(): BelongsTo
    {
        return $this->belongsTo(Persona::class);
    }

    /** @return BelongsTo<TarefaMidia, $this> */
    public function tarefa(): BelongsTo
    {
        return $this->belongsTo(TarefaMidia::class);
    }

    /** @return HasMany<Video, $this> */
    public function videos(): HasMany
    {
        return $this->hasMany(Video::class);
    }

    /** Segunda-feira da semana da data. */
    public static function semanaDe(CarbonInterface $data): CarbonImmutable
    {
        return CarbonImmutable::instance($data)->startOfWeek(CarbonInterface::MONDAY)->startOfDay();
    }

    /** @param  array{gancho: string, desenvolvimento: string, cta: string}  $texto */
    public static function hashDe(array $texto): string
    {
        return hash('sha256', $texto['gancho']."\n".$texto['desenvolvimento']."\n".$texto['cta']);
    }

    /** @return array{gancho: string, desenvolvimento: string, cta: string} */
    public function texto(): array
    {
        return ['gancho' => $this->gancho, 'desenvolvimento' => $this->desenvolvimento, 'cta' => $this->cta];
    }

    public function duracaoEstimada(): int
    {
        $palavras = preg_split('/\s+/u', trim(implode(' ', $this->texto())), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return (int) ceil(count($palavras) / self::PALAVRAS_POR_SEGUNDO);
    }

    public function temPedidoEmAndamento(): bool
    {
        return in_array($this->tarefa?->status, [TarefaMidia::PENDENTE, TarefaMidia::EM_ANDAMENTO], true)
            || ($this->tarefa?->status === TarefaMidia::CONCLUIDA && $this->tarefa->processada_em === null);
    }

    /**
     * Resultado da checagem para o texto atual. Se o texto mudou depois da checagem, ela não vale (RF27):
     * "desatualizada".
     *
     * @return 'pendente'|'desatualizada'|'bloqueio'|'atencao'|'ok'
     */
    public function situacaoConformidade(): string
    {
        if ($this->conformidade === null) {
            return 'pendente';
        }
        if ($this->conformidade_hash !== self::hashDe($this->texto())) {
            return 'desatualizada';
        }
        $regras = collect($this->conformidade['regras'] ?? []);
        $fatos = collect($this->conformidade['fatos'] ?? []);
        if ($regras->contains('resultado', 'bloqueio') || $fatos->contains('veredito', 'incorreta')) {
            return 'bloqueio';
        }
        if ($regras->contains('resultado', 'atencao') || $fatos->contains('veredito', 'sem_fonte')) {
            return 'atencao';
        }

        return 'ok';
    }

    /** Por que o roteiro ainda não pode ser aprovado, ou null se pode (RF13, RF25, RF49). */
    public function impedimentoAprovacao(): ?string
    {
        return match (true) {
            $this->status !== self::RASCUNHO => 'Só um roteiro em revisão pode ser aprovado.',
            $this->temPedidoEmAndamento() => 'Espere a IA terminar o pedido em andamento.',
            in_array($this->situacaoConformidade(), ['pendente', 'desatualizada'], true) => 'Confira a conformidade do texto atual antes de aprovar.',
            $this->situacaoConformidade() === 'bloqueio' => 'A conformidade tem bloqueios: corrija o texto ou peça uma nova versão.',
            $this->persona?->status === Persona::SUGERIDA => 'Decida a persona sugerida antes de aprovar.',
            default => null,
        };
    }

    /** Vídeo que está na produção: o último take que passou da gravação (fora os descartados). */
    public function videoAtual(): ?Video
    {
        return $this->videos()->whereNotIn('status', [Video::ENVIADO, Video::DESCARTADO])->latest('id')->first();
    }

    /**
     * Topo das telas da sessão do roteiro (canva: 1 roteiro, 2 gravação, 3 formulário, 4 edição, 5 aprovação).
     *
     * @return array<string, mixed>
     */
    public function cabecalhoSessao(): array
    {
        $video = $this->videoAtual();
        $passou = fn (array $status) => $video !== null && in_array($video->status, $status, true);

        return [
            'id' => $this->id,
            'titulo' => $this->titulo,
            'status' => $this->status,
            'semana' => $this->semana_inicio->toDateString(),
            'video_id' => $video?->id,
            'etapas' => [
                'roteiro' => $this->status === self::APROVADO,
                'gravacao' => $video !== null,
                'formulario' => $passou([Video::AGUARDANDO_EDICAO, Video::EDITADO, Video::APROVADO, Video::CONFIRMADO, Video::PUBLICADO]),
                'edicao' => $passou([Video::EDITADO, Video::APROVADO, Video::CONFIRMADO, Video::PUBLICADO]),
                'aprovacao' => $passou([Video::CONFIRMADO, Video::PUBLICADO]),
            ],
        ];
    }
}
