package com.banco.gerenciador_de_restricoes.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO de saída (Response) implementado como record imutável que representa o parecer final emitido pelo Motor de Decisão de Risco.
 * Consolida a identificação do cliente, o veredito determinístico ("LIBERADO" ou "BLOQUEADO"),
 * a discriminação dos motivos técnicos de bloqueio, o carimbo temporal de auditoria e os
 * indicadores preditivos de probabilidade de default gerados nativamente pelo modelo de Machine Learning (ONNX).
 */
public record DecisaoTransacaoDTO(
    UUID clienteId,
    String clienteNome,
    String documento,
    String status, // "LIBERADO" ou "BLOQUEADO"
    List<String> motivos,
    OffsetDateTime dataAvaliacao,
    Integer score,                 // Credit Score preditivo (0 a 1000)
    Double probabilidadeDefault,   // Probabilidade estatística de calote (0.0 a 1.0)
    String faixaRisco,             // "BAIXO RISCO", "MÉDIO RISCO", "ALTO RISCO"
    String modeloUtilizado         // "IA Individual (PF)" ou "IA Corporativa (PJ)"
) {

    /**
     * Construtor de conveniência para cenários sem avaliação de Machine Learning
     * ou para compatibilidade com chamadas legadas e testes unitários.
     */
    public DecisaoTransacaoDTO(
            UUID clienteId,
            String clienteNome,
            String documento,
            String status,
            List<String> motivos,
            OffsetDateTime dataAvaliacao
    ) {
        this(clienteId, clienteNome, documento, status, motivos, dataAvaliacao, null, null, null, null);
    }
}