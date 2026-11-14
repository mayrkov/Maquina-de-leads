<?php

namespace App\Domains\Videos\Actions;

use App\Domains\Clientes\Models\Cliente;
use App\Domains\Videos\Models\Video;
use App\Worker\TarefaMidia;

/**
 * Tratador da tarefa analisar_video: guarda a transcrição, os trechos e a sugestão da IA, que vira o formulário para
 * a produção revisar (RF52). Com roteiro, tema, persona, gancho, chamada e palavra-chave vêm do roteiro aprovado,
 * não da IA. A assinatura (nome, CRM e RQE) entra no fim da legenda pelo sistema, não pela IA.
 */
class AplicarResultadoAnalise
{
    public const PALAVRA = '/^[\p{L}\p{N}]{2,30}$/u';

    public function __invoke(TarefaMidia $tarefa): void
    {
        $video = Video::query()->with(['cliente', 'roteiro.persona'])->whereKey((int) ($tarefa->payload['video_id'] ?? 0))->first();
        // Descartado (ou já em outra etapa) enquanto a IA trabalhava: o resultado não vale mais.
        if (! $video || $video->status !== Video::ANALISANDO || $video->tarefa_analise_id !== $tarefa->id) {
            return;
        }
        if ($tarefa->status !== TarefaMidia::CONCLUIDA) {
            $video->update(['status' => Video::FALHOU, 'erro' => $tarefa->erro]);

            return;
        }

        $r = $tarefa->resultado ?? [];
        $trechos = array_values(array_map(fn (array $t) => [
            'inicio' => (float) ($t['inicio'] ?? 0), 'fim' => (float) ($t['fim'] ?? 0), 'texto' => (string) ($t['texto'] ?? ''),
        ], array_filter((array) ($r['trechos'] ?? []), 'is_array')));
        $f = $r['formulario'] ?? [];
        $total = count($trechos);
        $palavra = mb_strtoupper(trim((string) ($f['palavra_chave'] ?? '')));

        $sugestao = [
            'tema' => $this->texto($f['tema'] ?? null, 200),
            'persona' => $this->texto($f['persona'] ?? null, 200),
            'gancho' => $this->texto($f['gancho']['texto'] ?? null, 500),
            'gancho_inicio' => isset($f['gancho']['inicio']) ? (float) $f['gancho']['inicio'] : null,
            'cortes' => $this->indices((array) ($f['cortar'] ?? []), $total),
            'destaques' => array_slice(array_values(array_unique(array_filter(
                array_map(fn ($d) => mb_strtolower(trim((string) $d)), (array) ($f['destaques'] ?? [])),
                fn (string $d) => preg_match(self::PALAVRA, $d) === 1,
            ))), 0, 6),
            'cta' => $this->texto($f['cta'] ?? null, 300),
            'palavra_chave' => preg_match(self::PALAVRA, $palavra) === 1 ? $palavra : null,
            'legenda' => $this->comAssinatura($this->texto($f['legenda'] ?? null, 2000), $video->cliente),
            'do_roteiro' => [],
        ];
        if ($roteiro = $video->roteiro) {
            $sugestao = [
                ...$sugestao,
                'tema' => $roteiro->tema,
                'persona' => $roteiro->persona->nome ?? $sugestao['persona'],
                'gancho' => $roteiro->gancho,
                'cta' => $roteiro->cta,
                'palavra_chave' => $roteiro->palavra_chave,
                'do_roteiro' => ['tema', 'persona', 'gancho', 'cta', 'palavra_chave'],
            ];
        }

        $video->update([
            'status' => Video::FORMULARIO,
            'transcricao' => $r['transcricao'] ?? null,
            'trechos' => $trechos,
            'sugestao' => $sugestao,
            'formulario' => collect($sugestao)->only(self::CAMPOS)->all(),
            'erro' => null,
        ]);
    }

    /** Campos do formulário revisado, na ordem da tela (canva, tela 09). */
    public const CAMPOS = ['tema', 'persona', 'gancho', 'cortes', 'destaques', 'cta', 'palavra_chave', 'legenda'];

    /**
     * Índices de trechos válidos, sem repetição e em ordem.
     *
     * @param  array<mixed>  $valores
     * @return list<int>
     */
    private function indices(array $valores, int $total): array
    {
        $indices = array_values(array_unique(array_filter(array_map('intval', $valores), fn (int $i) => $i >= 0 && $i < $total)));
        sort($indices);

        return $indices;
    }

    private function texto(mixed $valor, int $max): ?string
    {
        $limpo = trim((string) $valor);

        return $limpo === '' ? null : mb_substr($limpo, 0, $max);
    }

    /** "Dr. Fulano · CRM 12345 · RQE 678" no fim da legenda (CFM: identificação no anúncio). */
    public static function assinatura(Cliente $cliente): string
    {
        $registro = fn (?string $numero, string $sigla) => blank($numero) ? null : (str_starts_with(mb_strtoupper(trim($numero)), $sigla) ? trim($numero) : "{$sigla} ".trim($numero));

        return implode(' · ', array_filter([$cliente->nome, $registro($cliente->crm, 'CRM'), $registro($cliente->rqe, 'RQE')]));
    }

    private function comAssinatura(?string $legenda, Cliente $cliente): ?string
    {
        return $legenda === null ? null : $legenda."\n\n".self::assinatura($cliente);
    }
}
