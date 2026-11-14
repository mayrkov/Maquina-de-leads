<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Canva, áreas 3 e 4: formulário de edição (RF51, RF52), aprovação da produção e do médico (RF26, RF27),
// publicação manual (RF29), métricas digitadas (RF41) e o registro de leads (RF38 a RF40).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('videos', function (Blueprint $table) {
            // Avulso: a IA deduz a palavra-chave no formulário; até lá fica vazia.
            $table->string('palavra_chave', 30)->nullable()->change();
            $table->string('cta', 300)->nullable()->change();

            $table->foreignId('tarefa_analise_id')->nullable()->constrained('tarefas_midia')->nullOnDelete();
            $table->string('transcricao')->nullable();
            // Trechos da transcrição [{inicio, fim, texto}], a sugestão da IA (fixa) e o formulário revisado.
            $table->jsonb('trechos')->nullable();
            $table->jsonb('sugestao')->nullable();
            $table->jsonb('formulario')->nullable();
            $table->text('legenda')->nullable();
            $table->text('comentario_ajuste')->nullable();
            $table->string('ajuste_por', 20)->nullable();

            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            // Aprovação presa ao conteúdo exato (RF27): sha256 do arquivo editado + legenda.
            $table->string('aprovacao_hash', 64)->nullable();
            // Link do médico: só o sha256 do token fica no banco.
            $table->string('confirmacao_token', 64)->nullable()->unique();
            $table->timestamp('confirmacao_expira_em')->nullable();
            $table->timestamp('confirmado_em')->nullable();
            $table->text('observacao_medico')->nullable();

            $table->string('post_url', 300)->nullable();
            $table->timestamp('publicado_em')->nullable();
            $table->foreignId('publicado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('visualizacoes')->nullable();
            $table->unsignedInteger('comentarios')->nullable();
            $table->timestamp('metricas_em')->nullable();

            $table->index(['cliente_id', 'status']);
        });

        // Lead registrado à mão pela produção (a ferramenta de mensagens qualifica). Dado pessoal e de saúde (RNF03):
        // fica só no Laravel, nunca no payload do worker.
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            // Origem (RNF06); nula quando a ferramenta não disse de qual vídeo veio.
            $table->foreignId('video_id')->nullable()->constrained('videos')->nullOnDelete();
            $table->string('nome', 120);
            $table->string('perfil', 60)->nullable();
            $table->string('para_quem', 200)->nullable();
            $table->string('problema', 300)->nullable();
            $table->string('cidade', 120)->nullable();
            $table->timestamp('consentimento_em');
            // qualificado | entregue | agendou | nao_agendou
            $table->string('status', 20)->default('qualificado');
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['cliente_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
        Schema::table('videos', function (Blueprint $table) {
            $table->dropIndex(['cliente_id', 'status']);
            $table->dropConstrainedForeignId('tarefa_analise_id');
            $table->dropConstrainedForeignId('aprovado_por');
            $table->dropConstrainedForeignId('publicado_por');
            $table->dropColumn([
                'transcricao', 'trechos', 'sugestao', 'formulario', 'legenda', 'comentario_ajuste', 'ajuste_por', 'aprovado_em',
                'aprovacao_hash', 'confirmacao_token', 'confirmacao_expira_em', 'confirmado_em', 'observacao_medico', 'post_url',
                'publicado_em', 'visualizacoes', 'comentarios', 'metricas_em',
            ]);
        });
    }
};
