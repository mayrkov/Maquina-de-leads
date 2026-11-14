<?php

namespace App\Domains\Marca\Requests;

use App\Domains\Marca\Models\KitMarca;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KitMarcaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->cliente_id !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        $cor = ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'];

        return [
            'cor_primaria' => $cor,
            'cor_destaque' => $cor,
            'cor_texto' => $cor,
            'fonte_titulos' => ['required', Rule::in(array_keys(KitMarca::FONTES))],
            'estilo_legenda' => ['required', Rule::in(array_keys(KitMarca::ESTILOS_LEGENDA))],
            'logo_posicao' => ['required', Rule::in(array_keys(KitMarca::POSICOES_LOGO))],
            // {PALAVRA} é obrigatório: a tela final existe para pedir o comentário com a palavra-chave (RF21).
            'tela_final_texto' => ['required', 'string', 'max:200', 'regex:/\{PALAVRA\}/'],
            'capa_modelo' => ['required', Rule::in(array_keys(KitMarca::CAPAS))],
            // PNG com fundo transparente fica melhor sobre o vídeo; o tipo é conferido pelo conteúdo.
            'logo' => ['nullable', 'file', 'mimetypes:image/png,image/jpeg,image/webp', 'max:5120'],
            'remover_logo' => ['boolean'],
            'vinheta' => ['nullable', 'file', 'mimetypes:video/mp4,video/quicktime', 'max:51200'],
            'remover_vinheta' => ['boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'tela_final_texto.regex' => 'Inclua {PALAVRA} no texto: é onde entra a palavra-chave do vídeo.',
            'regex' => 'Use uma cor no formato #RRGGBB.',
        ];
    }
}
