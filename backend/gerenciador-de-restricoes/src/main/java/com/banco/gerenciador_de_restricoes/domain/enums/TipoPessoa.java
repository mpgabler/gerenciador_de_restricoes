package com.banco.gerenciador_de_restricoes.domain.enums;

/**
 * Enumeração que define a natureza jurídica do cliente no sistema.
 * Utilizada para categorização cadastral, validação de regras de documentos 
 * fiscais (CPF para Pessoa Física e CNPJ para Pessoa Jurídica) e parametrizações 
 * de risco diferenciadas por perfil de titularidade.
 */
public enum TipoPessoa {
    PF,
    PJ
}
