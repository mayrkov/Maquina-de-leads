<?php

use App\Domains\Clientes\Controllers\BriefingController;
use App\Domains\Leads\Controllers\LeadController;
use App\Domains\Marca\Controllers\KitMarcaController;
use App\Domains\Painel\Controllers\PainelController;
use App\Domains\Personas\Controllers\PersonaController;
use App\Domains\Publicacao\Controllers\MetricasController;
use App\Domains\Publicacao\Controllers\PublicacaoController;
use App\Domains\Roteiros\Controllers\RoteiroController;
use App\Domains\Videos\Controllers\AprovacaoController;
use App\Domains\Videos\Controllers\ConfirmacaoController;
use App\Domains\Videos\Controllers\FormularioController;
use App\Domains\Videos\Controllers\VideoController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', PainelController::class)->name('dashboard');

    Route::get('briefing', [BriefingController::class, 'edit'])->name('briefing.edit');
    Route::put('briefing', [BriefingController::class, 'update'])->name('briefing.update');

    Route::get('personas', [PersonaController::class, 'index'])->name('personas.index');
    Route::post('personas/sugerir', [PersonaController::class, 'sugerir'])->middleware('throttle:ia')->name('personas.sugerir');
    Route::put('personas/{persona}', [PersonaController::class, 'update'])->whereNumber('persona')->name('personas.update');
    Route::post('personas/{persona}/salvar', [PersonaController::class, 'salvar'])->whereNumber('persona')->name('personas.salvar');
    Route::post('personas/{persona}/juntar', [PersonaController::class, 'juntar'])->whereNumber('persona')->name('personas.juntar');
    Route::post('personas/{persona}/ignorar', [PersonaController::class, 'ignorar'])->whereNumber('persona')->name('personas.ignorar');

    Route::get('kit', [KitMarcaController::class, 'edit'])->name('kit.edit');
    Route::post('kit', [KitMarcaController::class, 'update'])->name('kit.update');
    Route::get('kit/logo', [KitMarcaController::class, 'logo'])->name('kit.logo');

    Route::get('roteiros', [RoteiroController::class, 'index'])->name('roteiros.index');
    Route::post('roteiros/gerar', [RoteiroController::class, 'gerar'])->middleware('throttle:ia')->name('roteiros.gerar');
    Route::whereNumber('roteiro')->prefix('roteiros/{roteiro}')->name('roteiros.')->group(function () {
        Route::get('/', [RoteiroController::class, 'show'])->name('show');
        Route::put('/', [RoteiroController::class, 'update'])->name('update');
        Route::post('aprovar', [RoteiroController::class, 'aprovar'])->name('aprovar');
        Route::post('refazer', [RoteiroController::class, 'refazer'])->middleware('throttle:ia')->name('refazer');
        Route::post('checar', [RoteiroController::class, 'checar'])->middleware('throttle:ia')->name('checar');
        Route::post('descartar', [RoteiroController::class, 'descartar'])->name('descartar');
        Route::get('gravacao', [RoteiroController::class, 'gravacao'])->name('gravacao');
        Route::post('takes', [RoteiroController::class, 'enviarTake'])->middleware('throttle:uploads')->name('takes');
        Route::post('editar', [RoteiroController::class, 'editar'])->name('editar');
        Route::get('edicao', [RoteiroController::class, 'edicao'])->name('edicao');
    });

    Route::get('videos', [VideoController::class, 'index'])->name('videos.index');
    Route::post('videos', [VideoController::class, 'store'])->middleware('throttle:uploads')->name('videos.store');
    Route::whereNumber('video')->prefix('videos/{video}')->name('videos.')->group(function () {
        Route::get('editado', [VideoController::class, 'baixarEditado'])->name('editado');
        Route::get('assistir/{tipo}', [VideoController::class, 'assistir'])->whereIn('tipo', ['bruto', 'editado'])->name('assistir');
        Route::get('formulario', [FormularioController::class, 'show'])->name('formulario');
        Route::put('formulario', [FormularioController::class, 'salvar'])->name('formulario.salvar');
        Route::post('editar', [FormularioController::class, 'editar'])->name('editar');
        Route::post('analisar', [FormularioController::class, 'analisar'])->middleware('throttle:ia')->name('analisar');
        Route::get('aprovacao', [AprovacaoController::class, 'show'])->name('aprovacao');
        Route::post('aprovar', [AprovacaoController::class, 'aprovar'])->name('aprovar');
        Route::post('link', [AprovacaoController::class, 'link'])->name('link');
        Route::post('ajuste', [AprovacaoController::class, 'ajuste'])->name('ajuste');
        Route::post('descartar', [AprovacaoController::class, 'descartar'])->name('descartar');
        Route::post('publicar', [PublicacaoController::class, 'publicar'])->name('publicar');
        Route::put('metricas', [MetricasController::class, 'salvar'])->name('metricas');
    });

    Route::get('edicao', [FormularioController::class, 'index'])->name('edicao.index');
    Route::get('aprovacao', [AprovacaoController::class, 'index'])->name('aprovacao.index');
    Route::get('publicacao', [PublicacaoController::class, 'index'])->name('publicacao.index');
    Route::get('metricas', [MetricasController::class, 'index'])->name('metricas.index');

    Route::get('leads', [LeadController::class, 'index'])->name('leads.index');
    Route::post('leads', [LeadController::class, 'store'])->name('leads.store');
    Route::put('leads/{lead}', [LeadController::class, 'update'])->whereNumber('lead')->name('leads.update');
});

// Confirmação do médico pelo celular (canva, tela 11): sem login, só com o link que a produção mandou.
Route::middleware('throttle:30,1')->prefix('confirmar/{token}')->name('confirmacao.')->group(function () {
    Route::get('/', [ConfirmacaoController::class, 'show'])->name('show');
    Route::get('video', [ConfirmacaoController::class, 'video'])->name('video');
    Route::post('/', [ConfirmacaoController::class, 'responder'])->name('responder');
});

require __DIR__.'/settings.php';
