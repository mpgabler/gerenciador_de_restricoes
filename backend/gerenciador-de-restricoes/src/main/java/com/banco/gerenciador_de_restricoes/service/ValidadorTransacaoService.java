package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;
import com.banco.gerenciador_de_restricoes.dto.DecisaoTransacaoDTO;
import com.banco.gerenciador_de_restricoes.dto.PoliticaRiscoResponseDTO;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ValidadorTransacaoService {

    private final ClienteRepository clienteRepository;
    private final RestricaoRepository restricaoRepository;
    private final PoliticaRiscoService politicaRiscoService;

    @Transactional
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

        // Agrupa o somatório de inadimplência pela política vigente na data de cada ocorrência (Irretroatividade)
        Map<String, BigDecimal> acumuladoPorVersao = new LinkedHashMap<>();
        Map<String, PoliticaRiscoResponseDTO> politicasMap = new LinkedHashMap<>();

        LocalDate hoje = LocalDate.now();

        for (Restricao r : restricoesAtivas) {
            // Regra 1: Bloqueio Imediato (Parametrizado no TipoRestricao, ex: FRAUDE)
            if (r.getTipoRestricao().isBloqueioImediato()) {
                motivos.add(String.format("Restrição crítica ativa: %s registrada em %s", 
                        r.getTipoRestricao().getCodigo(), r.getDataOcorrencia()));
            }

            // Regra 2: Inadimplência (Avaliada sob a política vigente na data da ocorrência)
            if ("INADIMPLENCIA".equalsIgnoreCase(r.getTipoRestricao().getCodigo())) {
                PoliticaRiscoResponseDTO politicaDaEpoca = politicaRiscoService.obterVigenteNaData(r.getDataOcorrencia());
                String versao = politicaDaEpoca.versao();

                politicasMap.put(versao, politicaDaEpoca);
                acumuladoPorVersao.merge(versao, r.getValor(), BigDecimal::add);

                long diasAtraso = ChronoUnit.DAYS.between(r.getDataOcorrencia(), hoje);
                int limiteDias = politicaDaEpoca.diasAtrasoMaximo();

                if (diasAtraso > limiteDias) {
                    motivos.add(String.format(
                            "Inadimplência com atraso superior a %d dias (%d dias decorridos desde %s) [Política %s]", 
                            limiteDias, diasAtraso, r.getDataOcorrencia(), versao));
                }
            }
        }

        // Verifica se o acumulado de cada época excede o teto da respectiva versão da política
        for (Map.Entry<String, BigDecimal> entry : acumuladoPorVersao.entrySet()) {
            String versao = entry.getKey();
            BigDecimal acumulado = entry.getValue();
            PoliticaRiscoResponseDTO politica = politicasMap.get(versao);
            BigDecimal tetoPermitido = politica.tetoInadimplencia();

            if (acumulado.compareTo(tetoPermitido) > 0) {
                motivos.add(String.format(
                        "Inadimplência acumulada de R$ %.2f excede o teto permitido de R$ %.2f [Política %s]", 
                        acumulado, tetoPermitido, versao));
            }
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