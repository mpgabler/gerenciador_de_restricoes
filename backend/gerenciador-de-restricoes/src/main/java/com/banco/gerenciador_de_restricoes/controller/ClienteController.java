package com.banco.gerenciador_de_restricoes.controller;

import com.banco.gerenciador_de_restricoes.dto.ClienteRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.ClienteResponseDTO;
import com.banco.gerenciador_de_restricoes.service.ClienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


/**
 * Controller responsável pela exposição dos endpoints REST da entidade Cliente.
 * Gerencia o ciclo de vida completo dos clientes (CRUD, paginação, exclusão lógica 
 * via soft delete e reativação), aplicando validações de payload (@Valid) 
 * e isolando o domínio através de DTOs.
 */

@RestController // controlador web focado em APIs REST - retorna dados convertidos em JSON
@RequestMapping("/clientes") // rota base para todos os endpoints desta classe
@RequiredArgsConstructor // anotação do Lombok para gerar automáticamente um construtor injetando o atributo private final ClienteService clienteService, evitando código repetitivo com @Autowired
public class ClienteController {

    private final ClienteService clienteService;

    @PostMapping
    public ResponseEntity<ClienteResponseDTO> cadastrar(@RequestBody @Valid ClienteRequestDTO dto) { // @ResponseEntiity Focado na resposta, permitindo definir o código de status HTTP (200, 201, 404, etc.), os headers de retorno e o corpo JSON.
        ClienteResponseDTO response = clienteService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<ClienteResponseDTO>> listar(Pageable pageable) { // 
        return ResponseEntity.ok(clienteService.listar(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(clienteService.buscarPorId(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        clienteService.excluirLogicamente(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reativar")
    public ResponseEntity<ClienteResponseDTO> reativar(@PathVariable UUID id) { 
    return ResponseEntity.ok(clienteService.reativar(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> atualizar(
    @PathVariable UUID id, 
    @RequestBody @Valid ClienteRequestDTO dto
    ) {
    ClienteResponseDTO atualizado = clienteService.atualizar(id, dto);
    return ResponseEntity.ok(atualizado);
}
}
