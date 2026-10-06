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

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RestricaoService {

    private final RestricaoRepository restricaoRepository;
    private final ClienteRepository clienteRepository;
    private final TipoRestricaoRepository tipoRestricaoRepository;

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

    @Transactional
    public RestricaoResponseDTO darBaixa(UUID restricaoId) {
        Restricao restricao = restricaoRepository.findById(restricaoId)
                .orElseThrow(() -> new IllegalArgumentException("Restrição não encontrada"));

        restricao.darBaixa();
        return RestricaoResponseDTO.fromEntity(restricaoRepository.save(restricao));
    }
}
