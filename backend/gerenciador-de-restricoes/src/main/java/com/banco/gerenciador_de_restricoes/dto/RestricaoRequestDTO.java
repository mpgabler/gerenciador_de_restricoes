package com.banco.gerenciador_de_restricoes.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

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
