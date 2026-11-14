<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Personas definidas pela IA e confirmadas pela produção (RF02, RF48 a RF50, RN09).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->string('nome', 120);
            $table->text('descricao');
            $table->text('dores');
            $table->string('quem_decide', 200);
            $table->string('linguagem', 200);
            // sugerida | salva | juntada | descartada. Só "salva" está no catálogo.
            $table->string('status', 20)->default('sugerida');
            // Persona salva mais parecida, apontada pela IA (sugerida) ou escolhida ao juntar (juntada).
            $table->foreignId('parecida_com_id')->nullable()->constrained('personas')->nullOnDelete();
            $table->timestamps();

            $table->index(['cliente_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personas');
    }
};
