package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ClienteRequestDTO(
    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres")
    String nome,

    @NotBlank(message = "O documento é obrigatório")
    @Size(min = 11, max = 14, message = "O documento deve ter entre 11 e 14 caracteres")
    String documento,

    @NotNull(message = "O tipo de pessoa (PF/PJ) é obrigatório")
    TipoPessoa tipoPessoa,

    @Email(message = "O e-mail informado deve ser válido")
    @Size(max = 120, message = "O e-mail deve ter no máximo 120 caracteres")
    String email,

    @Size(max = 20, message = "O telefone deve ter no máximo 20 caracteres")
    String telefone,

    @Size(max = 200, message = "O logradouro deve ter no máximo 200 caracteres")
    String logradouro,

    @Size(max = 20, message = "O número deve ter no máximo 20 caracteres")
    String numero,

    @Size(max = 100, message = "O complemento deve ter no máximo 100 caracteres")
    String complemento,

    @Size(max = 100, message = "O bairro deve ter no máximo 100 caracteres")
    String bairro,

    @Size(max = 100, message = "A cidade deve ter no máximo 100 caracteres")
    String cidade,

    @Size(max = 2, message = "A UF deve conter 2 letras")
    String uf,

    @Size(max = 10, message = "O CEP deve ter no máximo 10 caracteres")
    String cep
) {}