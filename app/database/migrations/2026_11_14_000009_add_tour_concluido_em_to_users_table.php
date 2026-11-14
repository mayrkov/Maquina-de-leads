<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Onboarding guiado: o tour abre sozinho no primeiro acesso ao Painel e não volta a abrir depois que a
// produção conclui ou dispensa. A opção de rever fica sempre no menu de ajuda, independente desta marca.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('tour_concluido_em')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('tour_concluido_em');
        });
    }
};
