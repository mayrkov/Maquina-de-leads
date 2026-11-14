<?php

namespace App\Domains\Videos\Actions;

use App\Domains\Roteiros\Models\Roteiro;
use App\Domains\Videos\Models\Video;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Vídeo bruto enviado pela produção (RF16), pelos dois caminhos:
 * - avulso: o vídeo vai direto para a análise da IA, que deduz o formulário de edição do próprio vídeo (RF51);
 * - take na sessão do roteiro: fica ligado ao roteiro e espera a produção escolher o take principal.
 */
class ReceberVideoBruto
{
    public function __construct(private readonly PedirAnaliseVideo $analisar) {}

    public function avulso(User $usuario, UploadedFile $arquivo): Video
    {
        return $this->guardar($usuario, $arquivo, fn (Video $video) => ($this->analisar)($video), ['origem' => 'avulso']);
    }

    public function take(User $usuario, Roteiro $roteiro, UploadedFile $arquivo): Video
    {
        return $this->guardar($usuario, $arquivo, fn () => null, [
            'origem' => 'roteiro',
            'roteiro_id' => $roteiro->id,
            'palavra_chave' => $roteiro->palavra_chave,
            'cta' => $roteiro->cta,
            'status' => Video::ENVIADO,
        ]);
    }

    /**
     * Vídeo e tarefa entram na mesma transação: não existe vídeo "aguardando edição" sem tarefa na fila (D4).
     *
     * @param  callable(Video): void  $depois
     * @param  array<string, mixed>  $campos
     */
    private function guardar(User $usuario, UploadedFile $arquivo, callable $depois, array $campos): Video
    {
        $disco = Storage::disk(config('midia.disco'));
        $extensao = strtolower($arquivo->getClientOriginalExtension()) === 'mov' ? 'mov' : 'mp4';
        $chaveBruto = $disco->putFileAs("brutos/{$usuario->cliente_id}", $arquivo, Str::uuid().".{$extensao}");
        if ($chaveBruto === false) {
            throw new RuntimeException('Não foi possível guardar o vídeo no disco de mídia.');
        }

        try {
            return DB::transaction(function () use ($usuario, $arquivo, $chaveBruto, $depois, $campos) {
                $video = Video::create([
                    'status' => Video::ANALISANDO,
                    ...$campos,
                    'cliente_id' => $usuario->cliente_id,
                    'enviado_por' => $usuario->id,
                    'arquivo_bruto' => $chaveBruto,
                    'nome_original' => Str::limit($arquivo->getClientOriginalName(), 250, ''),
                    'tamanho_bytes' => $arquivo->getSize(),
                ]);
                $depois($video);

                return $video;
            });
        } catch (Throwable $e) {
            // Sem registro no banco, o arquivo ficaria órfão no disco.
            $disco->delete($chaveBruto);
            throw $e;
        }
    }
}
