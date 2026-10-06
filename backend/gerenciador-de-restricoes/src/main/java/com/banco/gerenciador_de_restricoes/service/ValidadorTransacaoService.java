package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;
import com.banco.gerenciador_de_restricoes.dto.DecisaoTransacaoDTO;
import com.banco.gerenciador_de_restricoes.repository.ClienteRepository;
import com.banco.gerenciador_de_restricoes.repository.RestricaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ValidadorTransacaoService {

    private final ClienteRepository clienteRepository;
    private final RestricaoRepository restricaoRepository;

    @Transactional(readOnly = true)
    public DecisaoTransacaoDTO avaliar(UUID clienteId) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));

        List<String> motivos = new ArrayList<>();

        if (cliente.getStatus() == StatusCliente.INATIVO) {
            motivos.add("Cliente encontra-se inativo no cadastro");
            return new DecisaoTransacaoDTO(
                cliente.getId(), cliente.getNome(), cliente.getDocumento(),
                "BLOQUEADO", motivos, OffsetDateTime.now()
            );
        }

        List<Restricao> restricoesAtivas = restricaoRepository.findByClienteIdAndStatus(clienteId, StatusRestricao.ATIVA);

        BigDecimal acumuladoInadimplencia = BigDecimal.ZERO;
        BigDecimal tetoInadimplencia = BigDecimal.valueOf(5000.00);

        LocalDate hoje = LocalDate.now();

        for (Restricao r : restricoesAtivas) {
            // Regra 1: Bloqueio Imediato (Parametrizado no TipoRestricao, ex: FRAUDE)
            if (r.getTipoRestricao().isBloqueioImediato()) {
                motivos.add(String.format("Restrição crítica ativa: %s registrada em %s", 
                        r.getTipoRestricao().getCodigo(), r.getDataOcorrencia()));
            }

            // Regra 2: Inadimplência
            if ("INADIMPLENCIA".equalsIgnoreCase(r.getTipoRestricao().getCodigo())) {
                acumuladoInadimplencia = acumuladoInadimplencia.add(r.getValor());

                long diasAtraso = ChronoUnit.DAYS.between(r.getDataOcorrencia(), hoje);
                if (diasAtraso > 90) {
                    motivos.add(String.format("Inadimplência com atraso superior a 90 dias (%d dias decorridos desde %s)", 
                            diasAtraso, r.getDataOcorrencia()));
                }
            }
        }

        if (acumuladoInadimplencia.compareTo(tetoInadimplencia) > 0) {
            motivos.add(String.format("Inadimplência acumulada de R$ %.2f excede o teto permitido de R$ %.2f", 
                    acumuladoInadimplencia, tetoInadimplencia));
        }

        boolean bloqueado = !motivos.isEmpty();

        return new DecisaoTransacaoDTO(
            cliente.getId(),
            cliente.getNome(),
            cliente.getDocumento(),
            bloqueado ? "BLOQUEADO" : "LIBERADO",
            motivos.isEmpty() ? List.of("Nenhuma restrição impeditiva encontrada") : motivos,
            OffsetDateTime.now()
        );
    }
}
