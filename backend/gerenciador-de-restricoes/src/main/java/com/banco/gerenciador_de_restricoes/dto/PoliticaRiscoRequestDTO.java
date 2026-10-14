package com.banco.gerenciador_de_restricoes.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PoliticaRiscoRequestDTO(
    @NotNull(message = "O teto de inadimplência é obrigatório")
    @Positive(message = "O teto de inadimplência deve ser maior que zero")
    BigDecimal tetoInadimplencia,

    @NotNull(message = "O prazo máximo de atraso é obrigatório")
    @Min(value = 1, message = "O prazo máximo deve ser de no mínimo 1 dia")
    Integer diasAtrasoMaximo,

    @NotBlank(message = "A justificativa normativa é obrigatória")
    @Size(max = 500, message = "A justificativa deve ter no máximo 500 caracteres")
    String justificativa,

    @NotBlank(message = "O autor da alteração é obrigatório")
    @Size(max = 120, message = "O autor deve ter no máximo 120 caracteres")
    String criadoPor
) {}