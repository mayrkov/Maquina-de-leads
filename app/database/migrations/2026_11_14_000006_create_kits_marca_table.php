<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kit de marca do cliente (RF15): aplicado em toda edição automática. Arquivos no disco de mídia, aqui só as chaves.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kits_marca', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->unique()->constrained('clientes')->cascadeOnDelete();
            $table->string('logo')->nullable();
            $table->string('logo_posicao', 20)->default('top-right');
            $table->char('cor_primaria', 7)->default('#14171C');
            $table->char('cor_destaque', 7)->default('#FFE11A');
            $table->char('cor_texto', 7)->default('#FFFFFF');
            // montserrat | anton: as fontes que o render tem (worker/src/orchestrator/cuts/render.ts).
            $table->string('fonte_titulos', 20)->default('montserrat');
            $table->string('estilo_legenda', 20)->default('padrao');
            $table->string('vinheta')->nullable();
            $table->string('vinheta_nome')->nullable();
            // Texto da tela final; {PALAVRA} vira a palavra-chave do vídeo.
            $table->string('tela_final_texto', 200)->default('Comente {PALAVRA} que eu te explico como agendar');
            // titulo_foto | so_titulo (a capa é gerada quando a exportação da capa existir, RF23).
            $table->string('capa_modelo', 20)->default('titulo_foto');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kits_marca');
    }
};
