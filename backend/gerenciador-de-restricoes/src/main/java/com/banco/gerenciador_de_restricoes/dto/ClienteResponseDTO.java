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
    StatusCliente status,
    OffsetDateTime dataCriacao,
    OffsetDateTime dataExclusao
) {
    public static ClienteResponseDTO fromEntity(Cliente cliente) {
        return new ClienteResponseDTO(
            cliente.getId(),
            cliente.getNome(),
            cliente.getDocumento(),
            cliente.getTipoPessoa(),
            cliente.getStatus(),
            cliente.getDataCriacao(),
            cliente.getDataExclusao()
        );
    }
}