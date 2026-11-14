<?php

namespace App\Domains\Ajuda\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Marca o onboarding como visto. Chamado pelo tour quando a produção conclui ou dispensa, para o tour
 * não abrir sozinho de novo. Rever o tour pelo menu de ajuda não depende desta marca.
 */
class TourController extends Controller
{
    public function concluir(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->tour_concluido_em === null) {
            $user->forceFill(['tour_concluido_em' => now()])->save();
        }

        return response()->json(['concluido' => true]);
    }
}
