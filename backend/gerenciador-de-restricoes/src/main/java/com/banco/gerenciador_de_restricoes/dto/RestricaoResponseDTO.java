package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO de saída (Response) implementado como record imutável para exibição e listagem de restrições.
 * Consolida as informações de apontamentos cadastrais e pendências financeiras, realizando o achatamento
 * (flattening) dos relacionamentos com Cliente e TipoRestricao para simplificar o consumo pelo cliente HTTP (frontend).
 * Expõe metadados de auditoria e ciclo de vida (status, data da baixa e carimbo de criação), disponibilizando
 * o método fábrica estático fromEntity() para mapeamento funcional via Java Streams.
 */
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
