<?php

namespace App\Domains\Marca\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Kit de marca do cliente (RF15).
 *
 * @property int $id
 * @property int $cliente_id
 * @property string|null $logo
 * @property string $logo_posicao
 * @property string $cor_primaria
 * @property string $cor_destaque
 * @property string $cor_texto
 * @property string $fonte_titulos
 * @property string $estilo_legenda
 * @property string|null $vinheta
 * @property string|null $vinheta_nome
 * @property string $tela_final_texto
 * @property string $capa_modelo
 */
class KitMarca extends Model
{
    /** Fontes que o render do worker tem (worker/src/orchestrator/cuts/render.ts). */
    public const FONTES = ['montserrat' => 'Montserrat ExtraBold', 'anton' => 'Anton'];

    /** padrao = Montserrat com destaque; impacto = Anton em caixa alta. */
    public const ESTILOS_LEGENDA = ['padrao' => 'Padrão', 'impacto' => 'Impacto (caixa alta)'];

    /** Mesmas posições do worker (WATERMARK_POSITIONS em worker/src/shared/settings.ts). */
    public const POSICOES_LOGO = ['top-left' => 'Topo à esquerda', 'top' => 'Topo ao centro', 'top-right' => 'Topo à direita', 'bottom-left' => 'Base à esquerda', 'bottom' => 'Base ao centro', 'bottom-right' => 'Base à direita'];

    public const CAPAS = ['titulo_foto' => 'Título + foto', 'so_titulo' => 'Só o título'];

    protected $table = 'kits_marca';

    protected $guarded = [];

    /** Kit do cliente, ou um com os padrões (sem gravar) quando ainda não foi configurado. */
    public static function doCliente(int $clienteId): self
    {
        return self::query()->firstOrNew(['cliente_id' => $clienteId], self::padroes());
    }

    /** @return array<string, string> */
    public static function padroes(): array
    {
        return [
            'logo_posicao' => 'top-right',
            'cor_primaria' => '#14171C',
            'cor_destaque' => '#FFE11A',
            'cor_texto' => '#FFFFFF',
            'fonte_titulos' => 'montserrat',
            'estilo_legenda' => 'padrao',
            'tela_final_texto' => 'Comente {PALAVRA} que eu te explico como agendar',
            'capa_modelo' => 'titulo_foto',
        ];
    }

    /** Texto da tela final de um vídeo com esta palavra-chave (RF21). */
    public function chamadaPara(string $palavraChave): string
    {
        return str_replace('{PALAVRA}', $palavraChave, $this->tela_final_texto);
    }

    /**
     * O que o worker precisa para editar no padrão da marca: só valores e chaves de arquivo.
     *
     * @return array<string, string|null>
     */
    public function paraTarefa(): array
    {
        return [
            'logo' => $this->logo,
            'logo_posicao' => $this->logo_posicao,
            'cor_primaria' => $this->cor_primaria,
            'cor_destaque' => $this->cor_destaque,
            'cor_texto' => $this->cor_texto,
            'fonte_titulos' => $this->fonte_titulos,
            'estilo_legenda' => $this->estilo_legenda,
            'vinheta' => $this->vinheta,
        ];
    }
}
