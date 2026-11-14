<?php

namespace App\Domains\Marca\Controllers;

use App\Domains\Marca\Models\KitMarca;
use App\Domains\Marca\Requests\KitMarcaRequest;
use App\Http\Controllers\Controller;
use App\Worker\TarefaMidia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Canva, tela 05: padrão aplicado em toda edição automática (RF15). */
class KitMarcaController extends Controller
{
    public function edit(Request $request): Response
    {
        $kit = KitMarca::doCliente($this->clienteDo($request)->id);

        return Inertia::render('kit/edit', [
            'kit' => [
                ...$kit->only('cor_primaria', 'cor_destaque', 'cor_texto', 'fonte_titulos', 'estilo_legenda', 'logo_posicao', 'tela_final_texto', 'capa_modelo', 'vinheta_nome'),
                'tem_logo' => $kit->logo !== null,
                'configurado' => $kit->exists,
                // Muda quando o logo muda, para o navegador não mostrar o antigo do cache.
                'logo_versao' => $kit->logo ? md5($kit->logo) : null,
            ],
            'opcoes' => [
                'fontes' => KitMarca::FONTES,
                'estilos' => KitMarca::ESTILOS_LEGENDA,
                'posicoes' => KitMarca::POSICOES_LOGO,
                'capas' => KitMarca::CAPAS,
            ],
        ]);
    }

    public function update(KitMarcaRequest $request): RedirectResponse
    {
        $cliente = $this->clienteDo($request);
        $kit = KitMarca::doCliente($cliente->id);
        $kit->fill($request->safe()->except(['logo', 'remover_logo', 'vinheta', 'remover_vinheta']));

        if ($request->file('logo')) {
            $kit->logo = $this->trocarArquivo($kit->logo, $request->file('logo'), "marca/{$cliente->id}", 'logo');
        } elseif ($request->boolean('remover_logo')) {
            $kit->logo = $this->trocarArquivo($kit->logo, null, '', '');
        }
        if ($request->file('vinheta')) {
            $kit->vinheta = $this->trocarArquivo($kit->vinheta, $request->file('vinheta'), "marca/{$cliente->id}", 'vinheta');
            $kit->vinheta_nome = Str::limit($request->file('vinheta')->getClientOriginalName(), 250, '');
        } elseif ($request->boolean('remover_vinheta')) {
            $kit->vinheta = $this->trocarArquivo($kit->vinheta, null, '', '');
            $kit->vinheta_nome = null;
        }
        $kit->save();

        return back()->with('status', 'Kit de marca salvo. Vale para os próximos vídeos editados.');
    }

    /** Logo para a prévia do painel: só com login e só do próprio cliente. */
    public function logo(Request $request): StreamedResponse
    {
        $kit = KitMarca::doCliente($this->clienteDo($request)->id);
        abort_if($kit->logo === null, 404);

        return Storage::disk(config('midia.disco'))->response($kit->logo, null, ['Cache-Control' => 'private, max-age=86400']);
    }

    /** Grava o arquivo novo (nome aleatório) e apaga o antigo. Vídeos já enfileirados guardam a chave antiga, por isso
     * o antigo só sai quando nenhum vídeo aguardando edição depende dele. */
    private function trocarArquivo(?string $antigo, ?UploadedFile $novo, string $pasta, string $prefixo): ?string
    {
        $disco = Storage::disk(config('midia.disco'));
        $chave = $novo ? $disco->putFileAs($pasta, $novo, $prefixo.'-'.Str::uuid().'.'.$novo->guessExtension()) : null;
        if ($chave === false) {
            abort(500, 'Não foi possível guardar o arquivo.');
        }
        if ($antigo && ! $this->emUso($antigo)) {
            $disco->delete($antigo);
        }

        return $chave;
    }

    private function emUso(string $chave): bool
    {
        return TarefaMidia::query()
            ->whereIn('status', [TarefaMidia::PENDENTE, TarefaMidia::EM_ANDAMENTO])
            ->where(fn ($q) => $q->whereRaw("payload->'kit'->>'logo' = ?", [$chave])->orWhereRaw("payload->'kit'->>'vinheta' = ?", [$chave]))
            ->exists();
    }
}
