<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Roteiros da semana (RF09 a RF13, RF25, RF27) e o que liga a eles: o pedido ao worker, os takes e o progresso da edição.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roteiros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            // A persona fica gravada no roteiro mesmo quando não entra no catálogo (RF11).
            $table->foreignId('persona_id')->nullable()->constrained('personas')->nullOnDelete();
            // Segunda-feira da semana do roteiro.
            $table->date('semana_inicio');
            $table->string('tema', 200);
            $table->string('titulo', 200);
            $table->text('gancho');
            $table->text('desenvolvimento');
            $table->string('cta', 300);
            $table->string('palavra_chave', 30);
            $table->string('objetivo', 200);
            // rascunho | aprovado | descartado
            $table->string('status', 20)->default('rascunho');
            $table->text('comentario_ajuste')->nullable();
            // Resultado da IA (regras do conselho e fatos) e o hash do texto que ela conferiu (RF13, RF14, RF27).
            $table->jsonb('conformidade')->nullable();
            $table->string('conformidade_hash', 64)->nullable();
            // Pedido em andamento para este roteiro (nova versão ou nova checagem).
            $table->foreignId('tarefa_id')->nullable()->constrained('tarefas_midia')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('aprovado_em')->nullable();
            $table->timestamps();

            $table->index(['cliente_id', 'semana_inicio']);
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->foreignId('tarefa_roteiros_id')->nullable()->constrained('tarefas_midia')->nullOnDelete();
        });

        Schema::table('videos', function (Blueprint $table) {
            // Take enviado na sessão do roteiro (RF16); nulo no upload avulso.
            $table->foreignId('roteiro_id')->nullable()->constrained('roteiros')->nullOnDelete();
        });

        Schema::table('tarefas_midia', function (Blueprint $table) {
            // Etapa em que o worker está (tela "Edição automática"). O worker já pode atualizar esta tabela.
            $table->string('etapa', 40)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('tarefas_midia', fn (Blueprint $table) => $table->dropColumn('etapa'));
        Schema::table('videos', fn (Blueprint $table) => $table->dropConstrainedForeignId('roteiro_id'));
        Schema::table('clientes', fn (Blueprint $table) => $table->dropConstrainedForeignId('tarefa_roteiros_id'));
        Schema::dropIfExists('roteiros');
    }
};
