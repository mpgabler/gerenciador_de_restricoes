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

/**
 * Controller responsável por expor os endpoints REST da governança de políticas de risco.
 * Permite listar o histórico de versões, consultar a política atualmente vigente 
 * e cadastrar novas parametrizações de tetos normativos e prazos máximos.
 */
@RestController
@RequestMapping("/politicas-risco")
@RequiredArgsConstructor
public class PoliticaRiscoController {

    // Injeção de dependência automática gerada pelo Lombok para o serviço de regras
    private final PoliticaRiscoService service;

    /**
     * Endpoint GET /politicas-risco
     * Retorna o histórico completo de todas as versões de políticas de risco cadastradas,
     * ordenadas da mais recente para a mais antiga.
     */
    @GetMapping
    public ResponseEntity<List<PoliticaRiscoResponseDTO>> listarTodas() {
        return ResponseEntity.ok(service.listarTodas());
    }

    /**
     * Endpoint GET /politicas-risco/vigente
     * Consulta e retorna apenas a política que se encontra atualmente ativa (em produção)
     * para ser aplicada pelo motor de decisão de transações.
     */
    @GetMapping("/vigente")
    public ResponseEntity<PoliticaRiscoResponseDTO> obterVigente() {
        return ResponseEntity.ok(service.obterVigente());
    }

    /**
     * Endpoint POST /politicas-risco
     * Cadastra uma nova versão normativa de política de risco.
     * O @Valid garante a validação prévia dos campos (teto, prazos e justificativa)
     * e o ResponseEntity devolve o status HTTP 201 Created com a nova política gerada.
     */
    @PostMapping
    public ResponseEntity<PoliticaRiscoResponseDTO> cadastrarNovaVersao(
            @Valid @RequestBody PoliticaRiscoRequestDTO dto) {
        PoliticaRiscoResponseDTO criada = service.cadastrarNovaVersao(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(criada);
    }
}