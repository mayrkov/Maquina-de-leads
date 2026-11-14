<?php

namespace Database\Factories;

use App\Domains\Clientes\Models\Cliente;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cliente>
 */
class ClienteFactory extends Factory
{
    protected $model = Cliente::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['nome' => 'Dr. '.fake()->lastName()];
    }
}
