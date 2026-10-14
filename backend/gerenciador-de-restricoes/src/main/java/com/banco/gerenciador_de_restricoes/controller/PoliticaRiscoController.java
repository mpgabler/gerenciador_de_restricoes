package com.banco.gerenciador_de_restricoes.controller;

import com.banco.gerenciador_de_restricoes.dto.PoliticaRiscoRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.PoliticaRiscoResponseDTO;
import com.banco.gerenciador_de_restricoes.service.PoliticaRiscoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/politicas-risco")
@RequiredArgsConstructor
public class PoliticaRiscoController {

    private final PoliticaRiscoService service;

    @GetMapping
    public ResponseEntity<List<PoliticaRiscoResponseDTO>> listarTodas() {
        return ResponseEntity.ok(service.listarTodas());
    }

    @GetMapping("/vigente")
    public ResponseEntity<PoliticaRiscoResponseDTO> obterVigente() {
        return ResponseEntity.ok(service.obterVigente());
    }

    @PostMapping
    public ResponseEntity<PoliticaRiscoResponseDTO> cadastrarNovaVersao(
            @Valid @RequestBody PoliticaRiscoRequestDTO dto) {
        PoliticaRiscoResponseDTO criada = service.cadastrarNovaVersao(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }
}