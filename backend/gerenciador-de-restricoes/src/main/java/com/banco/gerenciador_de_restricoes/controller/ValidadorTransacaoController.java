package com.banco.gerenciador_de_restricoes.controller;

import com.banco.gerenciador_de_restricoes.dto.DecisaoTransacaoDTO;
import com.banco.gerenciador_de_restricoes.service.ValidadorTransacaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller responsável por expor o endpoint REST do Motor de Decisão de Risco.
 * Recebe o identificador único (UUID) de um cliente, aciona a lógica de validação 
 * transacional (verificação de status, restrições ativas e tetos de inadimplência 
 * sob regras irretroativas) e retorna o parecer técnico detalhado (LIBERADO ou BLOQUEADO).
 */
@RestController
@RequestMapping("/valida-transacao")
@RequiredArgsConstructor
public class ValidadorTransacaoController {

    private final ValidadorTransacaoService validadorTransacaoService;

    @GetMapping("/{clienteId}")
    public ResponseEntity<DecisaoTransacaoDTO> validar(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(validadorTransacaoService.avaliar(clienteId));
    }
}
