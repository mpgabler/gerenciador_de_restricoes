package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.dto.ClienteRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.ClienteResponseDTO;
import com.banco.gerenciador_de_restricoes.repository.ClienteRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Camada de serviço responsável pelas regras de negócio e ciclo de vida cadastral de clientes.
 * Gerencia operações de criação, atualização, consultas paginadas e controle de estados
 * (ativação e inativação lógica / soft delete), assegurando a unicidade de documentos fiscais
 * e o isolamento entre contratos de API (DTOs) e entidades JPA de domínio.
 */
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    /**
     * Cadastra um novo cliente no sistema a partir do contrato de entrada.
     * Realiza a sanitização prévia do documento fiscal (remoção de caracteres especiais),
     * valida a unicidade cadastral no banco de dados e inicializa o registro com status ATIVO.
     *
     * @param dto Dados cadastrais e de endereço fornecidos na requisição.
     * @return DTO com a representação imutável do cliente recém-persistido.
     * @throws IllegalArgumentException caso já exista um cliente cadastrado com o mesmo documento.
     */
    @Transactional
    public ClienteResponseDTO criar(ClienteRequestDTO dto) {
        String docLimpo = dto.documento() != null 
                ? dto.documento().replaceAll("[^a-zA-Z0-9]", "").toUpperCase() 
                : "";

        if (clienteRepository.existsByDocumento(docLimpo)) {
            throw new IllegalArgumentException("Cliente já cadastrado com este documento.");
        }

        Cliente cliente = Cliente.builder()
                .nome(dto.nome())
                .documento(docLimpo)
                .tipoPessoa(dto.tipoPessoa())
                .email(dto.email())
                .telefone(dto.telefone())
                .logradouro(dto.logradouro())
                .numero(dto.numero())
                .complemento(dto.complemento())
                .bairro(dto.bairro())
                .cidade(dto.cidade())
                .uf(dto.uf())
                .cep(dto.cep())
                .status(StatusCliente.ATIVO)
                .build();

        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }
    
    /**
     * Recupera listagem paginada de clientes cadastrados.
     * Otimizado como transação de somente leitura (readOnly = true) para dispensar
     * mecanismos de dirty checking do Hibernate.
     *
     * @param pageable Parâmetros de navegação, limite por página e ordenação.
     * @return Página contendo os clientes convertidos para ClienteResponseDTO.
     */
    @Transactional(readOnly = true)
    public Page<ClienteResponseDTO> listar(Pageable pageable) {
        return clienteRepository.findAll(pageable).map(ClienteResponseDTO::fromEntity);
    }

    /**
     * Localiza um cliente pelo seu identificador único universal (UUID).
     *
     * @param id Chave primária do cliente.
     * @return DTO com os dados do cliente localizado.
     * @throws IllegalArgumentException se o identificador não for encontrado no banco de dados.
     */
    @Transactional(readOnly = true)
    public ClienteResponseDTO buscarPorId(UUID id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        return ClienteResponseDTO.fromEntity(cliente);
    }

    /**
     * Executa a inativação lógica (soft delete) do cliente.
     * Preserva o registro físico no banco de dados para integridade referencial com restrições
     * e trilhas de auditoria, marcando o status como INATIVO e registrando a data de exclusão.
     *
     * @param id Chave primária do cliente a ser inativado.
     * @throws IllegalArgumentException se o cliente não for localizado.
     */
    @Transactional
    public void excluirLogicamente(UUID id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        cliente.inativar();
        clienteRepository.save(cliente);
    }

    /**
     * Reativa o cadastro de um cliente previamente inativado.
     * Altera o status para ATIVO e limpa eventuais carimbos de exclusão lógica.
     *
     * @param id Chave primária do cliente.
     * @return DTO com os dados atualizados do cliente reativado.
     * @throws IllegalArgumentException se o cliente não for localizado.
     */
    @Transactional
    public ClienteResponseDTO reativar(UUID id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));
        cliente.reativar();
        return ClienteResponseDTO.fromEntity(clienteRepository.save(cliente));
    }

    /**
     * Atualiza integralmente os dados cadastrais e de endereço de um cliente existente.
     *
     * @param id  Chave primária do cliente a ser atualizado.
     * @param dto Novos dados a serem aplicados no cadastro.
     * @return DTO com a entidade atualizada.
     * @throws EntityNotFoundException se o cliente não for localizado para o ID informado.
     */
    @Transactional
    public ClienteResponseDTO atualizar(UUID id, ClienteRequestDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Cliente não encontrado com ID: " + id));

        cliente.setNome(dto.nome());
        cliente.setDocumento(dto.documento());
        cliente.setTipoPessoa(dto.tipoPessoa());
        cliente.setEmail(dto.email());
        cliente.setTelefone(dto.telefone());
        cliente.setLogradouro(dto.logradouro());
        cliente.setNumero(dto.numero());
        cliente.setComplemento(dto.complemento());
        cliente.setBairro(dto.bairro());
        cliente.setCidade(dto.cidade());
        cliente.setUf(dto.uf());
        cliente.setCep(dto.cep());

        Cliente salvo = clienteRepository.save(cliente);
        return ClienteResponseDTO.fromEntity(salvo);
    }
}