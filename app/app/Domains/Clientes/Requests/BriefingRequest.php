<?php

namespace App\Domains\Clientes\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BriefingRequest extends FormRequest
{
    /** Conselhos profissionais com regras de publicidade conhecidas pelo sistema. No MVP, só o CFM (RF13). */
    public const CONSELHOS = ['CFM' => 'CFM (medicina)'];

    public function authorize(): bool
    {
        return $this->user()?->cliente_id !== null;
    }

    protected function prepareForValidation(): void
    {
        $tags = collect((array) $this->input('tags', []))
            ->map(fn ($t) => mb_strtolower(trim((string) $t)))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $this->merge(['tags' => $tags]);
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        // Rascunho aceita campos vazios; "salvar e sugerir personas" exige o mínimo para a IA trabalhar.
        $obrigatorio = $this->boolean('sugerir_personas') ? 'required' : 'nullable';

        return [
            'nicho' => [$obrigatorio, 'string', 'max:120'],
            'objetivo' => [$obrigatorio, 'string', 'max:200'],
            'oferta' => [$obrigatorio, 'string', 'max:300'],
            'regiao' => [$obrigatorio, 'string', 'max:200'],
            'tom_voz' => [$obrigatorio, 'string', 'max:200'],
            'temas_proibidos' => ['nullable', 'string', 'max:2000'],
            'tags' => ['array', 'max:30'],
            'tags.*' => ['string', 'max:40'],
            'profissao' => ['nullable', 'string', 'max:60'],
            'conselho' => [$obrigatorio, Rule::in(array_keys(self::CONSELHOS))],
            // Identificação exigida pelo conselho ao anunciar especialidade (RF03).
            'crm' => ['nullable', 'string', 'max:30'],
            'rqe' => ['nullable', 'string', 'max:30'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['nicho' => 'nicho', 'objetivo' => 'objetivo', 'oferta' => 'oferta', 'regiao' => 'região', 'tom_voz' => 'tom de voz', 'conselho' => 'conselho'];
    }
}
