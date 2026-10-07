package com.banco.gerenciador_de_restricoes.controller;

import java.util.List;
import com.banco.gerenciador_de_restricoes.dto.RestricaoRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.RestricaoResponseDTO;
import com.banco.gerenciador_de_restricoes.service.RestricaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/restricoes")
@RequiredArgsConstructor
public class RestricaoController {

    private final RestricaoService restricaoService;

    @PostMapping
    public ResponseEntity<RestricaoResponseDTO> incluir(@RequestBody @Valid RestricaoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(restricaoService.criar(dto));
    }

    @PatchMapping("/{id}/baixa")
    public ResponseEntity<RestricaoResponseDTO> darBaixa(@PathVariable UUID id) {
        return ResponseEntity.ok(restricaoService.darBaixa(id));
    }

    @GetMapping
    public ResponseEntity<List<RestricaoResponseDTO>> listar(@RequestParam(required = false) UUID clienteId) {
    if (clienteId != null) {
        return ResponseEntity.ok(restricaoService.listarPorCliente(clienteId));
    }
    return ResponseEntity.ok(restricaoService.listarTodas());
}
}