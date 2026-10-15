package com.banco.gerenciador_de_restricoes.domain.enums;

/**
 * Enumeração que define a máquina de estados de um apontamento restritivo (Restricao).
 * Garante tipagem estrita e semântica de negócio para o ciclo de vida da pendência.
 * Serve como filtro primário no motor de validação de crédito, assegurando que
 * apenas restrições ativas impactem o cálculo de tetos financeiros e bloqueios.
 */
public enum StatusRestricao {
    ATIVA,
    BAIXADA
}