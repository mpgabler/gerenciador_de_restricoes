package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RestricaoResponseDTO(
    UUID id,
    UUID clienteId,
    String clienteNome,
    String tipoCodigo,
    String tipoDescricao,
    BigDecimal valor,
    LocalDate dataOcorrencia,
    StatusRestricao status,
    OffsetDateTime dataBaixa,
    OffsetDateTime criadoEm
) {
    public static RestricaoResponseDTO fromEntity(Restricao r) {
        return new RestricaoResponseDTO(
            r.getId(),
            r.getCliente().getId(),
            r.getCliente().getNome(),
            r.getTipoRestricao().getCodigo(),
            r.getTipoRestricao().getDescricao(),
            r.getValor(),
            r.getDataOcorrencia(),
            r.getStatus(),
            r.getDataBaixa(),
            r.getCriadoEm()
        );
    }
}
