<?php

namespace Database\Seeders;

use App\Domains\Clientes\Models\Cliente;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Ambiente local: um cliente piloto e um usuário da produção ligado a ele (senha: password).
        $cliente = Cliente::factory()->create(['nome' => 'Otorrino (piloto)']);

        User::factory()->create([
            'name' => 'Produção',
            'email' => 'producao@example.com',
        ])->forceFill(['cliente_id' => $cliente->id])->save();
    }
}
