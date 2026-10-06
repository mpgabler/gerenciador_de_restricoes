package com.banco.gerenciador_de_restricoes.controller;

import com.banco.gerenciador_de_restricoes.dto.DecisaoTransacaoDTO;
import com.banco.gerenciador_de_restricoes.service.ValidadorTransacaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/valida-transacao")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ValidadorTransacaoController {

    private final ValidadorTransacaoService validadorTransacaoService;

    @GetMapping("/{clienteId}")
    public ResponseEntity<DecisaoTransacaoDTO> validar(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(validadorTransacaoService.avaliar(clienteId));
    }
}
