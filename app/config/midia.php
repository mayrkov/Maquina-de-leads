<?php

// Mídia (vídeo bruto e editado) e fila de tarefas do worker (arquitetura D3 e D4).
return [

    // Disco onde ficam os vídeos (config/filesystems.php). O banco guarda só a chave do arquivo (D6).
    'disco' => env('MIDIA_DISCO', 'midia'),

    // Tamanho máximo do upload do vídeo bruto, em MB. O PHP (upload_max_filesize/post_max_size) precisa aceitar o mesmo.
    'upload_max_mb' => (int) env('MIDIA_UPLOAD_MAX_MB', 2048),

    'fila' => [
        // Canal do LISTEN/NOTIFY que acorda o worker.
        'canal' => 'tarefas_midia',

        // Tentativas antes da falha definitiva.
        'max_tentativas' => (int) env('MIDIA_MAX_TENTATIVAS', 3),

        // Tarefa em andamento sem sinal de vida há mais que isto volta para a fila. O worker manda sinal a cada
        // 30 s (WORKER_HEARTBEAT_SECONDS): este prazo precisa ser bem maior que esse intervalo.
        'abandono_segundos' => (int) env('MIDIA_ABANDONO_SEGUNDOS', 600),

        // Tarefas já processadas pelo Laravel são apagadas depois deste prazo.
        'guardar_processadas_dias' => (int) env('MIDIA_GUARDAR_PROCESSADAS_DIAS', 7),

        // Usuário de banco do worker: só SELECT e UPDATE em tarefas_midia (concedido pela migration, se existir).
        'usuario_worker' => env('DB_WORKER_USERNAME', 'maquina_worker'),
    ],
];
