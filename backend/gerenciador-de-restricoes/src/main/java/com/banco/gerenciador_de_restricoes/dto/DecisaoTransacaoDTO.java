package com.banco.gerenciador_de_restricoes.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DecisaoTransacaoDTO(
    UUID clienteId,
    String clienteNome,
    String documento,
    String status, // "LIBERADO" ou "BLOQUEADO"
    List<String> motivos,
    OffsetDateTime dataAvaliacao
) {}
