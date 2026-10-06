package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.dto.ClienteRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.ClienteResponseDTO;
import com.banco.gerenciador_de_restricoes.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    @Transactional
    public ClienteResponseDTO criar(ClienteRequestDTO dto) {
        String docLimpo = dto.documento().replaceAll("\\D", "");

        if (clienteRepository.existsByDocumento(docLimpo)) {
            throw new IllegalArgumentException("Cliente já cadastrado com este documento.");
        }

        Cliente cliente = Cliente.builder()
                .nome(dto.nome())
                .documento(docLimpo)
                .tipoPessoa(dto.tipoPessoa())
                .status(StatusCliente.ATIVO)
                .build();

        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> listar(Pageable pageable) {
        return clienteRepository.findAll(pageable).map(ClienteResponseDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public ClienteResponseDTO buscarPorId(UUID id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        return ClienteResponseDTO.fromEntity(cliente);
    }

    @Transactional
    public void excluirLogicamente(UUID id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        cliente.inativar();
        clienteRepository.save(cliente);
    }

    @Transactional
    public ClienteResponseDTO reativar(UUID id) {
    Cliente cliente = clienteRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
    cliente.reativar();
    return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }
}
