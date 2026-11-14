<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Fila entre o Laravel e o worker (arquitetura D4). O payload leva só IDs e chaves de arquivo, nunca dado de saúde.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tarefas_midia', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 40);
            $table->jsonb('payload');
            // pendente -> em_andamento -> concluida | falhou (e de volta a pendente quando há nova tentativa)
            $table->string('status', 20)->default('pendente');
            $table->unsignedSmallInteger('tentativas')->default(0);
            $table->unsignedSmallInteger('max_tentativas')->default(3);
            $table->timestampTz('disponivel_em')->useCurrent();
            $table->string('worker_id', 100)->nullable();
            $table->timestampTz('heartbeat_em')->nullable();
            $table->jsonb('resultado')->nullable();
            $table->text('erro')->nullable();
            // Quando o comando agendado do Laravel tratou o resultado (concluída ou falha definitiva).
            $table->timestampTz('processada_em')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'processada_em']);
        });

        DB::statement("CREATE INDEX tarefas_midia_pendentes ON tarefas_midia (disponivel_em, id) WHERE status = 'pendente'");

        // Usuário próprio do worker: só SELECT e UPDATE nesta tabela. O papel é criado na implantação
        // (infra/postgres/init.sql); sem ele (ex.: ambiente local) nada é concedido.
        $usuario = config('midia.fila.usuario_worker');
        $existe = DB::selectOne('SELECT 1 AS ok FROM pg_roles WHERE rolname = ?', [$usuario]);
        if ($existe) {
            DB::statement('GRANT SELECT, UPDATE ON tarefas_midia TO '.DB::getQueryGrammar()->wrap($usuario));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tarefas_midia');
    }
};
