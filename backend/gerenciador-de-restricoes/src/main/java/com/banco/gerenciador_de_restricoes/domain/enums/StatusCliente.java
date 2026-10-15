package com.banco.gerenciador_de_restricoes.domain.enums;

/**
 * Enumeração que define os estados do ciclo de vida cadastral de um cliente.
 * Fornece tipagem segura e extensibilidade de domínio, evitando o uso de flags booleanas rígidas.
 * Utilizado para controle de integridade em operações e como critério sumário
 * de bloqueio pelo motor de validação de transações quando o cadastro está inativo.
 */
public enum StatusCliente {
    ATIVO,
    INATIVO
}