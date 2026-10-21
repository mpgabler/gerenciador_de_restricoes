package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;
import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;
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

/**
 * Motor central de validação de transações e análise de apetite a risco de crédito.
 * Avalia o histórico de restrições ativas de um cliente contra as políticas corporativas de risco,
 * aplicando regras de bloqueio sumário (fraude e ordem judicial), tolerância temporal de atraso
 * e tetos financeiros de inadimplência, integrando inferência preditiva estatística via Machine Learning (ONNX)
 * com salvaguarda mandatória (Hard Risk Override).
 */
@Service
@RequiredArgsConstructor
public class ValidadorTransacaoService {

    private final ClienteRepository clienteRepository;
    private final RestricaoRepository restricaoRepository;
    private final PoliticaRiscoService politicaRiscoService;
    private final ScoreMlService scoreMlService; // Motor de inferência ONNX nativo na JVM

    /**
     * Avalia a elegibilidade transacional de um cliente a partir de seu identificador único.
     * Executa a análise de conformidade cadastral, apura violações de regras determinísticas de crédito
     * e calcula o Credit Score preditivo segregado por titularidade (PF ou PJ), garantindo que
     * apontamentos gravíssimos (Fraude e Bloqueio Judicial) rebaixem compulsoriamente a nota de risco.
     *
     * @param clienteId Identificador único universal (UUID) do cliente a ser auditado.
     * @return DecisaoTransacaoDTO contendo o veredito determinístico, justificativas, métricas de score ML e carimbo temporal.
     * @throws IllegalArgumentException se o cliente não for localizado no banco de dados.
     */
    @Transactional
    public DecisaoTransacaoDTO avaliar(UUID clienteId) {
        // 1. Localização e validação de existência do cliente
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado"));

        List<String> motivos = new ArrayList<>();

        // 2. Clientes inativos são imediatamente bloqueados
        if (cliente.getStatus() == StatusCliente.INATIVO) {
            motivos.add("Cliente encontra-se inativo no cadastro");
            return new DecisaoTransacaoDTO(
                cliente.getId(), cliente.getNome(), cliente.getDocumento(),
                "BLOQUEADO", motivos, OffsetDateTime.now(),
                0, 1.0, "ALTO RISCO (INATIVO)", "Regra Cadastral"
            );
        }

        // 3. Recuperação de passivos ativos e baixados para compor as features do ML
        List<Restricao> restricoesAtivas = restricaoRepository.findByClienteIdAndStatus(clienteId, StatusRestricao.ATIVA);
        List<Restricao> restricoesBaixadas = restricaoRepository.findByClienteIdAndStatus(clienteId, StatusRestricao.BAIXADA);

        // Estruturas auxiliares para segregar e acumular a inadimplência por versão de política (Irretroatividade)
        Map<String, BigDecimal> acumuladoPorVersao = new LinkedHashMap<>();
        Map<String, PoliticaRiscoResponseDTO> politicasMap = new LinkedHashMap<>();

        LocalDate hoje = LocalDate.now();
        long maiorAtrasoDiasGeral = 0;
        BigDecimal valorTotalInadimplenciaGeral = BigDecimal.ZERO;

        boolean temFraudeAtiva = false;
        boolean temBloqueioJudicialAtivo = false;

        // 4. Varredura e aplicação de regras individuais sobre cada restrição ativa
        for (Restricao r : restricoesAtivas) {
            String codigoTipo = r.getTipoRestricao() != null ? r.getTipoRestricao().getCodigo() : "";

            // Sinalização de apontamentos críticos para as features e override do modelo preditivo
            if ("FRAUDE".equalsIgnoreCase(codigoTipo)) {
                temFraudeAtiva = true;
            }
            if ("BLOQUEIO_JUDICIAL".equalsIgnoreCase(codigoTipo)) {
                temBloqueioJudicialAtivo = true;
            }

            // Regra 1: Bloqueio Imediato por gravidade da taxonomia (ex.: FRAUDE, BLOQUEIO_JUDICIAL)
            if (r.getTipoRestricao() != null && r.getTipoRestricao().isBloqueioImediato()) {
                motivos.add(String.format("Restrição crítica ativa: %s registrada em %s", 
                        codigoTipo, r.getDataOcorrencia()));
            }

            // Regra 2: Análise quantitativa e temporal de Inadimplência
            if ("INADIMPLENCIA".equalsIgnoreCase(codigoTipo)) {
                // Recupera a regra vigente na data em que a restrição se originou
                PoliticaRiscoResponseDTO politicaDaEpoca = politicaRiscoService.obterVigenteNaData(r.getDataOcorrencia());
                String versao = politicaDaEpoca.versao();

                politicasMap.put(versao, politicaDaEpoca);
                
                // Soma atômica do débito ao montante acumulado daquela versão de política
                acumuladoPorVersao.merge(versao, r.getValor(), BigDecimal::add);
                valorTotalInadimplenciaGeral = valorTotalInadimplenciaGeral.add(r.getValor());

                // Cálculo dos dias corridos de atraso até a data corrente
                long diasAtraso = ChronoUnit.DAYS.between(r.getDataOcorrencia(), hoje);
                if (diasAtraso > maiorAtrasoDiasGeral) {
                    maiorAtrasoDiasGeral = diasAtraso;
                }

                int limiteDias = politicaDaEpoca.diasAtrasoMaximo();

                // Violação do prazo máximo de tolerância da norma vigente na época
                if (diasAtraso > limiteDias) {
                    motivos.add(String.format(
                            "Inadimplência com atraso superior a %d dias (%d dias decorridos desde %s) [Política %s]", 
                            limiteDias, diasAtraso, r.getDataOcorrencia(), versao));
                }
            }
        }

        // 5. Confronto dos montantes acumulados contra os tetos financeiros de cada versão normativa
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

        // 6. Inferência Preditiva de Machine Learning com Salvaguarda Regulatória (Hard Override)
        ScoreMlService.ResultadoScore resultadoMl;
        String rotuloModelo = (cliente.getTipoPessoa() == TipoPessoa.PJ) ? "Modelo Preditivo (PJ)" : "Modelo Preditivo (PF)";

        if (temFraudeAtiva || temBloqueioJudicialAtivo) {
            // Dominância Regulatória Bancária: Fraude ou Bloqueio Judicial derrubam compulsoriamente o score
            String detalheImpedimento = temFraudeAtiva && temBloqueioJudicialAtivo
                    ? "ALTO RISCO (FRAUDE E BLOQUEIO JUDICIAL)"
                    : (temFraudeAtiva ? "ALTO RISCO (FRAUDE ATIVA)" : "ALTO RISCO (BLOQUEIO JUDICIAL)");

            resultadoMl = new ScoreMlService.ResultadoScore(
                25,      // Score no piso crítico (0 a 1000)
                0.999,   // 99.9% de probabilidade de risco
                detalheImpedimento,
                rotuloModelo
            );
        } else {
            // Proponentes sem impedimentos legais são avaliados pelo modelo ONNX na JVM
            resultadoMl = scoreMlService.calcularScore(
                cliente.getTipoPessoa(),
                (int) maiorAtrasoDiasGeral,
                restricoesAtivas.size(),
                valorTotalInadimplenciaGeral.doubleValue(),
                restricoesBaixadas.size(),
                false,
                false
            );
        }

        // 7. Consolidação do veredito final
        boolean bloqueado = !motivos.isEmpty();

        return new DecisaoTransacaoDTO(
            cliente.getId(),
            cliente.getNome(),
            cliente.getDocumento(),
            bloqueado ? "BLOQUEADO" : "LIBERADO",
            motivos.isEmpty() ? List.of("Nenhuma restrição impeditiva encontrada") : motivos,
            OffsetDateTime.now(),
            resultadoMl.score(),
            resultadoMl.probabilidadeDefault(),
            resultadoMl.faixaRisco(),
            resultadoMl.modeloUtilizado()
        );
    }
}