<?php

namespace Database\Factories;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Videos\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Video>
 */
class VideoFactory extends Factory
{
    protected $model = Video::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'cliente_id' => Cliente::factory(),
            'origem' => 'avulso',
            'arquivo_bruto' => 'brutos/1/'.fake()->uuid().'.mp4',
            'nome_original' => 'take_01.mp4',
            'tamanho_bytes' => 1024,
            'palavra_chave' => 'OUVIDO',
            'status' => Video::AGUARDANDO_EDICAO,
        ];
    }
}
