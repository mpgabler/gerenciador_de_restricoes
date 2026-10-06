package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ClienteRequestDTO(
    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres")
    String nome,

    @NotBlank(message = "O documento é obrigatório")
    @Size(min = 11, max = 14, message = "O documento deve ter entre 11 e 14 dígitos")
    String documento,

    @NotNull(message = "O tipo de pessoa (PF/PJ) é obrigatório")
    TipoPessoa tipoPessoa
) {}