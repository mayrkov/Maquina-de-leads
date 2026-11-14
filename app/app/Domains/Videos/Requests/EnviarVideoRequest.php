<?php

namespace App\Domains\Videos\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class EnviarVideoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->cliente_id !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            // Tipo conferido pelo conteúdo do arquivo, não pela extensão (verificação final, item "Upload de vídeo").
            // Avulso: a IA deduz palavra-chave, chamada e o resto do formulário a partir do vídeo (RF51).
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/quicktime', 'max:'.(config('midia.upload_max_mb') * 1024)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'video.mimetypes' => 'Envie um vídeo MP4 ou MOV.',
            // O PHP descartou o arquivo antes do Laravel (upload_max_filesize/post_max_size menores que o vídeo).
            'video.uploaded' => 'O vídeo não chegou ao servidor: passou do limite de upload do PHP.',
        ];
    }
}
