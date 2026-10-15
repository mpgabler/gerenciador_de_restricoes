package com.banco.gerenciador_de_restricoes.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO de entrada (Request) implementado como record imutável para inclusão de novas restrições.
 * Atua na fronteira da API REST capturando os dados essenciais do apontamento financeiro ou cadastral,
 * desacoplando o cliente HTTP dos IDs internos de tipos de restrição e prevenindo inconsistências
 * por meio de validações de valores monetários não negativos e datas de ocorrência cronologicamente válidas.
 */
public record RestricaoRequestDTO(
    @NotNull(message = "O ID do cliente é obrigatório")
    UUID clienteId,

    @NotBlank(message = "O código do tipo de restrição é obrigatório (ex: FRAUDE, INADIMPLENCIA)")
    String tipoRestricaoCodigo,

    @NotNull(message = "O valor é obrigatório")
    @DecimalMin(value = "0.00", message = "O valor não pode ser negativo")
    BigDecimal valor,

    @NotNull(message = "A data de ocorrência é obrigatória")
    @PastOrPresent(message = "A data de ocorrência não pode ser futura")
    LocalDate dataOcorrencia
) {}
