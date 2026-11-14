<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Briefing do cliente (RF01) e profissão regulada (RF03), editáveis pelo painel (RF04).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('nicho', 120)->nullable();
            $table->string('objetivo', 200)->nullable();
            $table->string('oferta', 300)->nullable();
            $table->string('regiao', 200)->nullable();
            $table->string('tom_voz', 200)->nullable();
            $table->text('temas_proibidos')->nullable();
            $table->jsonb('tags')->default('[]');
            $table->string('canal', 30)->default('instagram_reels');
            $table->string('profissao', 60)->nullable();
            $table->string('conselho', 20)->nullable();
            $table->string('crm', 30)->nullable();
            $table->string('rqe', 30)->nullable();
            // Última sugestão de personas pedida à IA (RF50).
            $table->foreignId('tarefa_personas_id')->nullable()->constrained('tarefas_midia')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tarefa_personas_id');
            $table->dropColumn(['nicho', 'objetivo', 'oferta', 'regiao', 'tom_voz', 'temas_proibidos', 'tags', 'canal', 'profissao', 'conselho', 'crm', 'rqe']);
        });
    }
};
