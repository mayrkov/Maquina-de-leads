<?php

namespace App\Domains\Videos\Models;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Leads\Models\Lead;
use App\Domains\Roteiros\Models\Roteiro;
use App\Models\User;
use App\Worker\TarefaMidia;
use Database\Factories\VideoFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $cliente_id
 * @property int|null $enviado_por
 * @property string $origem
 * @property string $arquivo_bruto
 * @property string $nome_original
 * @property int $tamanho_bytes
 * @property string|null $palavra_chave
 * @property string|null $cta
 * @property string $status
 * @property int|null $tarefa_edicao_id
 * @property string|null $arquivo_editado
 * @property string|null $duracao_segundos
 * @property string|null $erro
 * @property int|null $roteiro_id
 * @property int|null $tarefa_analise_id
 * @property string|null $transcricao
 * @property list<array{inicio: float, fim: float, texto: string}>|null $trechos
 * @property array<string, mixed>|null $sugestao
 * @property array<string, mixed>|null $formulario
 * @property string|null $legenda
 * @property string|null $comentario_ajuste
 * @property string|null $ajuste_por
 * @property int|null $aprovado_por
 * @property Carbon|null $aprovado_em
 * @property string|null $aprovacao_hash
 * @property string|null $confirmacao_token
 * @property Carbon|null $confirmacao_expira_em
 * @property Carbon|null $confirmado_em
 * @property string|null $observacao_medico
 * @property string|null $post_url
 * @property Carbon|null $publicado_em
 * @property int|null $publicado_por
 * @property int|null $visualizacoes
 * @property int|null $comentarios
 * @property Carbon|null $metricas_em
 * @property Carbon $created_at
 * @property-read TarefaMidia|null $tarefaEdicao
 * @property-read TarefaMidia|null $tarefaAnalise
 * @property-read Roteiro|null $roteiro
 */
class Video extends Model
{
    /** @use HasFactory<VideoFactory> */
    use HasFactory;

    /** Take enviado na sessão do roteiro, à espera de a produção mandar para a edição. */
    public const ENVIADO = 'enviado';

    /** A IA está transcrevendo e preenchendo o formulário de edição (RF51). */
    public const ANALISANDO = 'analisando';

    /** Formulário pronto para a produção revisar (RF52). Pedido de ajuste também volta para cá. */
    public const FORMULARIO = 'formulario';

    public const AGUARDANDO_EDICAO = 'aguardando_edicao';

    /** Editado: esperando a aprovação da produção. */
    public const EDITADO = 'editado';

    /** A produção aprovou; esperando a confirmação do médico. */
    public const APROVADO = 'aprovado';

    /** Produção e médico aprovaram: pronto para publicar (RF26). */
    public const CONFIRMADO = 'confirmado';

    public const PUBLICADO = 'publicado';

    public const DESCARTADO = 'descartado';

    public const FALHOU = 'falhou';

    /** Vídeo que seguiu adiante na produção: a sessão do roteiro não manda outro take enquanto houver um destes. */
    public const EM_PRODUCAO = [self::ANALISANDO, self::FORMULARIO, self::AGUARDANDO_EDICAO, self::EDITADO, self::APROVADO, self::CONFIRMADO, self::PUBLICADO];

    /** Campos do formulário de edição que a produção não pode remover: sem eles não há tela final nem post. */
    public const CAMPOS_OBRIGATORIOS = ['cta', 'palavra_chave', 'legenda'];

    // Nada vem de formulário direto para cá: as Actions preenchem campo a campo.
    protected $guarded = [];

    protected static function newFactory(): VideoFactory
    {
        return VideoFactory::new();
    }

    protected function casts(): array
    {
        return [
            'trechos' => 'array',
            'sugestao' => 'array',
            'formulario' => 'array',
            'aprovado_em' => 'datetime',
            'confirmacao_expira_em' => 'datetime',
            'confirmado_em' => 'datetime',
            'publicado_em' => 'datetime',
            'metricas_em' => 'datetime',
        ];
    }

    /** Valor de um campo do formulário revisado (null = removido ou ainda sem formulário). */
    public function campo(string $nome): mixed
    {
        return $this->formulario[$nome] ?? null;
    }

    /** Título nas telas: o do roteiro, senão o tema do formulário, senão o nome do arquivo. Carregue `roteiro` antes. */
    public function titulo(): string
    {
        return $this->roteiro->titulo ?? $this->campo('tema') ?? $this->nome_original;
    }

    /** Tela da etapa em que o vídeo está (painel, listas de edição e aprovação). */
    public function link(): string
    {
        return match ($this->status) {
            self::AGUARDANDO_EDICAO => $this->roteiro_id ? route('roteiros.edicao', $this->roteiro_id, false) : route('videos.formulario', $this->id, false),
            self::EDITADO, self::APROVADO, self::CONFIRMADO => route('videos.aprovacao', $this->id, false),
            self::PUBLICADO => route('publicacao.index', ['video' => $this->id], false),
            default => route('videos.formulario', $this->id, false),
        };
    }

    /** Aprovação presa ao conteúdo exato (RF27): o arquivo editado e a legenda do post. */
    public function hashConteudo(): string
    {
        return hash('sha256', $this->arquivo_editado."\n".$this->legenda);
    }

    public function aprovacaoValida(): bool
    {
        return $this->aprovacao_hash !== null && hash_equals($this->aprovacao_hash, $this->hashConteudo());
    }

    /** Tira as aprovações e o link do médico (o conteúdo vai mudar ou já mudou). */
    public function semAprovacao(): static
    {
        return $this->fill([
            'aprovado_por' => null, 'aprovado_em' => null, 'aprovacao_hash' => null, 'confirmacao_token' => null,
            'confirmacao_expira_em' => null, 'confirmado_em' => null, 'observacao_medico' => null,
        ]);
    }

    /**
     * Só os vídeos do cliente do usuário (RNF02): registro de outro cliente responde 404.
     *
     * @param  Builder<Video>  $query
     */
    public function scopeDoCliente(Builder $query, User $user): void
    {
        $query->where('cliente_id', $user->cliente_id);
    }

    /** @return BelongsTo<Cliente, $this> */
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    /** @return BelongsTo<Roteiro, $this> */
    public function roteiro(): BelongsTo
    {
        return $this->belongsTo(Roteiro::class);
    }

    /** @return BelongsTo<TarefaMidia, $this> */
    public function tarefaEdicao(): BelongsTo
    {
        return $this->belongsTo(TarefaMidia::class, 'tarefa_edicao_id');
    }

    /** @return BelongsTo<TarefaMidia, $this> */
    public function tarefaAnalise(): BelongsTo
    {
        return $this->belongsTo(TarefaMidia::class, 'tarefa_analise_id');
    }

    /** @return HasMany<Lead, $this> */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
