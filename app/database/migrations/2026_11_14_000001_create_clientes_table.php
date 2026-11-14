<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cliente da Máquina de Leads (no piloto, o médico). O briefing (RF01, RF03) entra nesta tabela na sua feature.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->timestamps();
        });

        // Todo usuário vê só os dados do seu cliente (RNF02). Perfis e permissões dependem da matriz de permissões.
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('cliente_id')->nullable()->after('id')->constrained('clientes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cliente_id');
        });
        Schema::dropIfExists('clientes');
    }
};
