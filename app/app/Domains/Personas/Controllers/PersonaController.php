<?php

namespace App\Domains\Personas\Controllers;

use App\Domains\Personas\Actions\PedirSugestaoPersonas;
use App\Domains\Personas\Models\Persona;
use App\Domains\Personas\Requests\PersonaRequest;
use App\Domains\Roteiros\Models\Roteiro;
use App\Http\Controllers\Controller;
use App\Worker\TarefaMidia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Canva, tela 04: sugestões da IA à espera de decisão e o catálogo do cliente (RF48 a RF50, RN09). */
class PersonaController extends Controller
{
    public function index(Request $request): Response
    {
        $cliente = $this->clienteDo($request);
        $personas = Persona::query()->doCliente($cliente->id)
            ->whereIn('status', [Persona::SUGERIDA, Persona::SALVA])
            ->with('parecidaCom:id,nome')
            ->withCount(['roteiros' => fn ($q) => $q->where('status', '!=', Roteiro::DESCARTADO)])
            ->orderBy('id')
            ->get();
        $tarefa = $cliente->tarefa_personas_id ? TarefaMidia::query()->find($cliente->tarefa_personas_id, ['id', 'status', 'erro', 'processada_em']) : null;

        $linha = fn (Persona $p) => [
            ...$p->only('id', 'nome', 'descricao', 'dores', 'quem_decide', 'linguagem'),
            'parecida_com' => $p->parecidaCom?->only('id', 'nome'),
            'roteiros' => (int) $p->getAttribute('roteiros_count'),
        ];

        return Inertia::render('personas/index', [
            'sugestoes' => $personas->where('status', Persona::SUGERIDA)->values()->map($linha),
            'catalogo' => $personas->where('status', Persona::SALVA)->values()->map($linha),
            // Concluída mas ainda não aplicada pelo comando agendado: a tela continua esperando.
            'pedido' => $tarefa ? [
                'status' => $tarefa->status === TarefaMidia::CONCLUIDA && $tarefa->processada_em === null ? TarefaMidia::EM_ANDAMENTO : $tarefa->status,
                'erro' => $tarefa->erro,
            ] : null,
            'briefingCompleto' => $cliente->briefingCompleto(),
        ]);
    }

    /** Pede de novo à IA (o briefing mudou, ou a sugestão anterior falhou). */
    public function sugerir(Request $request, PedirSugestaoPersonas $pedir): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        if (! $cliente->briefingCompleto()) {
            return to_route('briefing.edit')->with('status', 'Complete o briefing antes de pedir as personas.');
        }

        return back()->with('status', $pedir($cliente) ? 'A IA está sugerindo as personas.' : 'Já existe uma sugestão em andamento.');
    }

    /** Corrigir (sugestão) ou editar (catálogo): a persona corrigida entra no catálogo. */
    public function update(PersonaRequest $request, int $persona): RedirectResponse
    {
        $p = $this->personaDo($request, $persona, [Persona::SUGERIDA, Persona::SALVA]);
        $p->update([...$request->validated(), 'status' => Persona::SALVA, 'parecida_com_id' => null]);

        return back()->with('status', "Persona \"{$p->nome}\" salva.");
    }

    public function salvar(Request $request, int $persona): RedirectResponse
    {
        $p = $this->personaDo($request, $persona, [Persona::SUGERIDA]);
        $p->update(['status' => Persona::SALVA, 'parecida_com_id' => null]);

        return back()->with('status', "Persona \"{$p->nome}\" salva no catálogo.");
    }

    /** Junta a sugestão a uma persona salva: a sugestão sai, a salva continua sendo a usada (evita leads divididos). */
    public function juntar(Request $request, int $persona): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        $p = $this->personaDo($request, $persona, [Persona::SUGERIDA]);
        $dados = $request->validate([
            'com_id' => ['required', 'integer', Rule::exists('personas', 'id')->where('cliente_id', $cliente->id)->where('status', Persona::SALVA)],
        ]);
        $p->update(['status' => Persona::JUNTADA, 'parecida_com_id' => $dados['com_id']]);
        // Os roteiros da sugestão passam a usar a persona salva: os leads não se dividem entre as duas.
        Roteiro::query()->doCliente($cliente->id)->where('persona_id', $p->id)->update(['persona_id' => $dados['com_id']]);

        return back()->with('status', 'Sugestão juntada à persona existente.');
    }

    public function ignorar(Request $request, int $persona): RedirectResponse
    {
        $p = $this->personaDo($request, $persona, [Persona::SUGERIDA]);
        $p->update(['status' => Persona::DESCARTADA]);

        return back()->with('status', 'Sugestão ignorada.');
    }

    /** @param  list<string>  $status */
    private function personaDo(Request $request, int $id, array $status): Persona
    {
        $cliente = $this->clienteDo($request);

        return Persona::query()->doCliente($cliente->id)->whereIn('status', $status)->findOrFail($id);
    }
}
