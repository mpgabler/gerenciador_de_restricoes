package com.banco.gerenciador_de_restricoes.service;

import com.banco.gerenciador_de_restricoes.domain.entity.PoliticaRisco;
import com.banco.gerenciador_de_restricoes.dto.PoliticaRiscoRequestDTO;
import com.banco.gerenciador_de_restricoes.dto.PoliticaRiscoResponseDTO;
import com.banco.gerenciador_de_restricoes.repository.PoliticaRiscoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoliticaRiscoService {

    private final PoliticaRiscoRepository repository;

    @Transactional
    public List<PoliticaRiscoResponseDTO> listarTodas() {
        garantirPoliticaInicial();
        return repository.findAllByOrderByVigenciaInicioDesc()
                .stream()
                .map(PoliticaRiscoResponseDTO::fromEntity)
                .toList();
    }

    @Transactional
    public PoliticaRiscoResponseDTO obterVigente() {
        garantirPoliticaInicial();
        PoliticaRisco vigente = repository.findFirstByAtivoTrueOrderByVigenciaInicioDesc()
                .orElseGet(() -> repository.findAllByOrderByVigenciaInicioDesc().get(0));
        return PoliticaRiscoResponseDTO.fromEntity(vigente);
    }

    @Transactional
    public PoliticaRiscoResponseDTO cadastrarNovaVersao(PoliticaRiscoRequestDTO dto) {
        garantirPoliticaInicial();
        OffsetDateTime agora = OffsetDateTime.now();

        // 1. Encerra a vigência da política ativa anterior no banco de dados
        List<PoliticaRisco> todas = repository.findAllByOrderByVigenciaInicioDesc();
        for (PoliticaRisco p : todas) {
            if (Boolean.TRUE.equals(p.getAtivo()) && p.getVigenciaFim() == null) {
                p.setAtivo(false);
                p.setVigenciaFim(agora);
                repository.save(p);
            }
        }

        // 2. Calcula a próxima versão (v1.0 -> v1.1 -> v1.2)
        int revisao = todas.size();
        String novaVersao = "v1." + revisao;

        // 3. Constrói e persiste a nova política vigente
        PoliticaRisco novaPolitica = PoliticaRisco.builder()
                .versao(novaVersao)
                .tetoInadimplencia(dto.tetoInadimplencia())
                .diasAtrasoMaximo(dto.diasAtrasoMaximo())
                .vigenciaInicio(agora)
                .vigenciaFim(null)
                .justificativa(dto.justificativa())
                .criadoPor(dto.criadoPor())
                .ativo(true)
                .build();

        PoliticaRisco salva = repository.save(novaPolitica);
        return PoliticaRiscoResponseDTO.fromEntity(salva);
    }

    private void garantirPoliticaInicial() {
        if (repository.count() == 0) {
            PoliticaRisco inicial = PoliticaRisco.builder()
                    .versao("v1.0")
                    .tetoInadimplencia(new BigDecimal("5000.00"))
                    .diasAtrasoMaximo(90)
                    .vigenciaInicio(OffsetDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC))
                    .vigenciaFim(null)
                    .justificativa("Norma de apetite a risco inicial homologada pelo Comitê de Compliance.")
                    .criadoPor("analista@banestes.com.br")
                    .ativo(true)
                    .build();
            repository.save(inicial);
        }
    }

    @Transactional
    public PoliticaRiscoResponseDTO obterVigenteNaData(LocalDate dataOcorrencia) {
        garantirPoliticaInicial();
        
        // Se a restrição é de hoje (ou data futura), aplica sempre a política ATIVA em produção!
        if (dataOcorrencia == null || !dataOcorrencia.isBefore(LocalDate.now())) {
            return obterVigente();
        }

        // Se for de um dia anterior, busca qual política vigorava no final daquele dia no fuso atual
        OffsetDateTime fimDoDia = dataOcorrencia.atTime(23, 59, 59)
                .atZone(java.time.ZoneId.systemDefault())
                .toOffsetDateTime();

        return repository.findFirstByVigenciaInicioLessThanEqualOrderByVigenciaInicioDesc(fimDoDia)
                .map(PoliticaRiscoResponseDTO::fromEntity)
                .orElseGet(this::obterVigente);
    }
}