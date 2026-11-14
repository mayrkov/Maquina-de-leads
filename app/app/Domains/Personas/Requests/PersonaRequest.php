<?php

namespace App\Domains\Personas\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PersonaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->cliente_id !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:120'],
            'descricao' => ['required', 'string', 'max:1000'],
            'dores' => ['required', 'string', 'max:1000'],
            'quem_decide' => ['required', 'string', 'max:200'],
            'linguagem' => ['required', 'string', 'max:200'],
        ];
    }
}
