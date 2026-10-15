package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.entity.TipoRestricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.dto.RestricaoRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.RestricaoResponseDTO;
import com.banco.gerenciador_de_restricoes.repository.ClienteRepository;
import com.banco.gerenciador_de_restricoes.repository.RestricaoRepository;
import com.banco.gerenciador_de_restricoes.repository.TipoRestricaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Camada de serviço responsável pelo ciclo de vida das restrições e apontamentos financeiros/cadastrais.
 * Orquestra a inclusão de novas pendências, a resolução de tipos taxonômicos de restrição,
 * a baixa/regularização de débitos e a emissão de relatórios/consultas vinculadas a clientes,
 * assegurando que apontamentos não sejam atribuídos a clientes inativos.
 */
@Service
@RequiredArgsConstructor
public class RestricaoService {

    private final RestricaoRepository restricaoRepository;
    private final ClienteRepository clienteRepository;
    private final TipoRestricaoRepository tipoRestricaoRepository;

    /**
     * Registra uma nova restrição no sistema para o cliente informado.
     * Valida a existência do cliente e bloqueia a operação caso o cadastro esteja inativo.
     * Converte o código mnemônico textual na respectiva entidade TipoRestricao antes de persistir.
     *
     * @param dto Contrato de entrada com o ID do cliente, código da restrição, valor e data de ocorrência.
     * @return DTO com os dados da restrição recém-criada (status ATIVA por padrão).
     * @throws IllegalArgumentException se o cliente ou o tipo de restrição não forem localizados.
     * @throws IllegalStateException    se o cliente estiver com status INATIVO.
     */
    @Transactional
    public RestricaoResponseDTO criar(RestricaoRequestDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));

        if (cliente.getStatus() == StatusCliente.INATIVO) {
            throw new IllegalStateException("Não é permitido incluir restrições para cliente inativo");
        }

        TipoRestricao tipo = tipoRestricaoRepository.findByCodigo(dto.tipoRestricaoCodigo().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Tipo de restrição inválido: " + dto.tipoRestricaoCodigo()));

        Restricao restricao = Restricao.builder()
                .cliente(cliente)
                .tipoRestricao(tipo)
                .valor(dto.valor())
                .dataOcorrencia(dto.dataOcorrencia())
                .build();

        return RestricaoResponseDTO.fromEntity(restricaoRepository.save(restricao));
    }

    /**
     * Efetua a baixa (regularização) de uma restrição ativa existente.
     * Invoca o método de domínio restricao.darBaixa(), que transiciona o status para BAIXADA
     * e carimba a data e hora do encerramento da pendência.
     *
     * @param restricaoId Identificador único universal (UUID) da restrição a ser baixada.
     * @return DTO com o estado atualizado da restrição após a baixa.
     * @throws IllegalArgumentException se a restrição não for encontrada.
     */
    @Transactional
    public RestricaoResponseDTO darBaixa(UUID restricaoId) {
        Restricao restricao = restricaoRepository.findById(restricaoId)
                .orElseThrow(() -> new IllegalArgumentException("Restrição não encontrada"));

        restricao.darBaixa();
        return RestricaoResponseDTO.fromEntity(restricaoRepository.save(restricao));
    }

    /**
     * Lista o histórico completo de restrições vinculadas a um cliente específico (ativas e baixadas).
     *
     * @param clienteId Identificador único universal (UUID) do cliente.
     * @return Lista contendo as restrições convertidas em DTOs de resposta.
     */
    @Transactional(readOnly = true)
    public List<RestricaoResponseDTO> listarPorCliente(UUID clienteId) {
        return restricaoRepository.findByClienteId(clienteId)
                .stream()
                .map(RestricaoResponseDTO::fromEntity)
                .toList();
    }

    /**
     * Recupera todas as restrições cadastradas na base de dados.
     *
     * @return Lista de todas as restrições persistidas mapeadas para DTO.
     */
    @Transactional(readOnly = true)
    public List<RestricaoResponseDTO> listarTodas() {
        return restricaoRepository.findAll()
                .stream()
                .map(RestricaoResponseDTO::fromEntity)
                .toList();
    }
}