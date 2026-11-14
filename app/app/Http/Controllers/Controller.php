<?php

namespace App\Http\Controllers;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Videos\Models\Video;
use Illuminate\Http\Request;

abstract class Controller
{
    /** Cliente do usuário logado (RNF02). Usuário sem cliente não opera nada: 403. */
    protected function clienteDo(Request $request): Cliente
    {
        $clienteId = $request->user()?->cliente_id;
        abort_if($clienteId === null, 403);

        return Cliente::query()->findOrFail($clienteId);
    }

    /** Vídeo do cliente do usuário (outro cliente: 404), com o roteiro de origem. */
    protected function videoDo(Request $request, int $id, bool $travar = false): Video
    {
        abort_if($request->user()?->cliente_id === null, 403);
        $query = Video::query()->doCliente($request->user())->with('roteiro');

        return ($travar ? $query->lockForUpdate() : $query)->findOrFail($id);
    }
}
