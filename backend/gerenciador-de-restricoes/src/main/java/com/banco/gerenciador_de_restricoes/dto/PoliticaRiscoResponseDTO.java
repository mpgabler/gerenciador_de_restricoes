package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.entity.PoliticaRisco;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO de saída (Response) implementado como record imutável para consulta e exibição de políticas de risco.
 * Modela o contrato retornado pelos endpoints de parametrização de crédito, expondo limites financeiros,
 * tolerâncias temporais, intervalos de vigência para irretroatividade, justificativa de auditoria e status ativo.
 * Isola a entidade JPA de domínio do cliente HTTP e disponibiliza o método fábrica estático
 * fromEntity() para mapeamento defensivo (null-safe) e composição funcional com Java Streams.
 */
public record PoliticaRiscoResponseDTO(
    UUID id,
    String versao,
    BigDecimal tetoInadimplencia,
    Integer diasAtrasoMaximo,
    OffsetDateTime vigenciaInicio,
    OffsetDateTime vigenciaFim,
    String justificativa,
    String criadoPor,
    Boolean ativo
) {
    public static PoliticaRiscoResponseDTO fromEntity(PoliticaRisco entity) {
        if (entity == null) {
            return null;
        }
        return new PoliticaRiscoResponseDTO(
            entity.getId(),
            entity.getVersao(),
            entity.getTetoInadimplencia(),
            entity.getDiasAtrasoMaximo(),
            entity.getVigenciaInicio(),
            entity.getVigenciaFim(),
            entity.getJustificativa(),
            entity.getCriadoPor(),
            entity.getAtivo()
        );
    }
}