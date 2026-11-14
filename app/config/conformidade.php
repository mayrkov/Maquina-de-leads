<?php

// Regras do conselho profissional, por conselho (RF13, RN05). A IA confere cada roteiro contra estas regras e
// devolve ok, atenção ou bloqueio por regra. Regras são dados: um conselho novo é uma entrada nova aqui.
//
// Provisório: resumo das regras de publicidade médica. O texto oficial da Resolução CFM nº 2.336/2023 ainda
// precisa ser conferido (planejamento/requisitos/pendencias.md). CRM e RQE na legenda do post não estão aqui: o
// sistema acrescenta a assinatura na legenda sugerida e a aprovação confere o CRM (AprovacaoController).
return [
    'CFM' => [
        'promessa' => 'Sem promessa de cura ou de resultado garantido',
        'antes_depois' => 'Sem "antes e depois" nem imagem ou relato de paciente identificável',
        'preco' => 'Sem preço, promoção, desconto ou sorteio',
        'sensacionalismo' => 'Sem sensacionalismo, alarmismo ou autopromoção (ex.: "o melhor", "único", "milagre")',
        'diagnostico' => 'Sem diagnóstico, prescrição ou indicação de remédio a distância',
    ],
];
