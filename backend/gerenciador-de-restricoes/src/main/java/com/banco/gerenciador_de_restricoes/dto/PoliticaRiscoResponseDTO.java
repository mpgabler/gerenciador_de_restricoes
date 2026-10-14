package com.banco.gerenciador_de_restricoes.dto;

import com.banco.gerenciador_de_restricoes.domain.entity.PoliticaRisco;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

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