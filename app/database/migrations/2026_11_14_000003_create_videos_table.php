<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Vídeo bruto enviado pela produção (RF16) e o resultado da edição. Arquivos ficam no disco de mídia: aqui só as chaves.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->foreignId('enviado_por')->nullable()->constrained('users')->nullOnDelete();
            // avulso | roteiro (o vínculo com o roteiro entra com a feature de roteiros)
            $table->string('origem', 20)->default('avulso');
            $table->string('arquivo_bruto');
            $table->string('nome_original');
            $table->unsignedBigInteger('tamanho_bytes');
            $table->string('palavra_chave', 30);
            $table->string('cta', 200)->nullable();
            // aguardando_edicao | editado | falhou
            $table->string('status', 30)->default('aguardando_edicao');
            $table->foreignId('tarefa_edicao_id')->nullable()->constrained('tarefas_midia')->nullOnDelete();
            $table->string('arquivo_editado')->nullable();
            $table->decimal('duracao_segundos', 8, 3)->nullable();
            $table->text('erro')->nullable();
            $table->timestamps();

            $table->index(['cliente_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};
