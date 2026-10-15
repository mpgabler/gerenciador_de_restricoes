package com.banco.gerenciador_de_restricoes.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO de saída (Response) implementado como record imutável que representa o parecer final emitido pelo Motor de Decisão de Risco.
 * Consolida os dados de identificação do cliente, o veredito da validação ("LIBERADO" ou "BLOQUEADO"),
 * a lista com os motivos técnicos detalhados de eventuais bloqueios (regras violadas, restrições ativas ou estouro de tetos)
 * e o carimbo de auditoria temporal com fuso horário (OffsetDateTime) do momento exato da avaliação.
 */
public record DecisaoTransacaoDTO(
    UUID clienteId,
    String clienteNome,
    String documento,
    String status, // "LIBERADO" ou "BLOQUEADO"
    List<String> motivos,
    OffsetDateTime dataAvaliacao
) {}
