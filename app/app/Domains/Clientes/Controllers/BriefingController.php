<?php

namespace App\Domains\Clientes\Controllers;

use App\Domains\Clientes\Requests\BriefingRequest;
use App\Domains\Personas\Actions\PedirSugestaoPersonas;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Canva, tela 03: briefing preenchido pela produção com o médico (RF01, RF03, RF04). */
class BriefingController extends Controller
{
    public function edit(Request $request): Response
    {
        $cliente = $this->clienteDo($request);

        return Inertia::render('briefing/edit', [
            'briefing' => $cliente->only('nicho', 'objetivo', 'oferta', 'regiao', 'tom_voz', 'temas_proibidos', 'tags', 'profissao', 'conselho', 'crm', 'rqe'),
            'conselhos' => BriefingRequest::CONSELHOS,
        ]);
    }

    public function update(BriefingRequest $request, PedirSugestaoPersonas $pedirPersonas): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        $cliente->update($request->validated());

        if (! $request->boolean('sugerir_personas')) {
            return back()->with('status', 'Rascunho do briefing salvo.');
        }

        $pedido = $pedirPersonas($cliente);

        return to_route('personas.index')->with('status', $pedido
            ? 'Briefing salvo. A IA está sugerindo as personas.'
            : 'Briefing salvo. Já existe uma sugestão de personas em andamento.');
    }
}
