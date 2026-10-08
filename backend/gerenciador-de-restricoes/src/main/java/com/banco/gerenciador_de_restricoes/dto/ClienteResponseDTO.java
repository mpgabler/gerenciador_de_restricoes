package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClienteResponseDTO(
    UUID id,
    String nome,
    String documento,
    TipoPessoa tipoPessoa,
    String email,
    String telefone,
    String logradouro,
    String numero,
    String complemento,
    String bairro,
    String cidade,
    String uf,
    String cep,
    StatusCliente status,
    OffsetDateTime dataCriacao,
    OffsetDateTime dataExclusao
) {
    public static ClienteResponseDTO fromEntity(Cliente cliente) {
        if (cliente == null) {
            return null;
        }

        return new ClienteResponseDTO(
            cliente.getId(),
            cliente.getNome(),
            cliente.getDocumento(),
            cliente.getTipoPessoa(),
            cliente.getEmail(),
            cliente.getTelefone(),
            cliente.getLogradouro(),
            cliente.getNumero(),
            cliente.getComplemento(),
            cliente.getBairro(),
            cliente.getCidade(),
            cliente.getUf(),
            cliente.getCep(),
            cliente.getStatus(),
            cliente.getDataCriacao(),
            cliente.getDataExclusao()
        );
    }
}