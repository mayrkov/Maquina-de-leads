<?php

namespace App\Domains\Ajuda\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Guia do sistema: a referência permanente do produto (fluxo, telas, status e métricas). O tour guiado
 * mostra a mesma matéria na tela; o guia é o lugar de consultar quando a produção esquece um detalhe.
 */
class GuiaController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('guia/index');
    }
}
