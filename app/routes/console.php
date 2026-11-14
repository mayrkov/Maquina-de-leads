<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Fila do worker: resultados, tarefas abandonadas e limpeza (arquitetura D4).
Schedule::command('tarefas:processar')->everyMinute()->withoutOverlapping();
