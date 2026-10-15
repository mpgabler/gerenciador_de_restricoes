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

/**
 * Camada de serviço responsável pela governança, versionamento e temporalidade das políticas de risco de crédito.
 * Gerencia a máquina de estados das regras corporativas (tetos de inadimplência e prazos máximos de tolerância),
 * assegurando que apenas uma versão permaneça ativa por vez e garantindo a aplicação do princípio da irretroatividade
 * normativa por meio de consultas temporais orientadas à data do fato gerador.
 */
@Service
@RequiredArgsConstructor
public class PoliticaRiscoService {

    private final PoliticaRiscoRepository repository;

    /**
     * Recupera o histórico completo de todas as políticas de risco cadastradas no sistema.
     * Assegura a existência prévia de ao menos uma política padrão antes de executar a listagem
     * ordenada da mais recente para a mais antiga.
     *
     * @return Lista contendo os DTOs de todas as versões de políticas de risco registradas.
     */
    @Transactional
    public List<PoliticaRiscoResponseDTO> listarTodas() {
        garantirPoliticaInicial();
        return repository.findAllByOrderByVigenciaInicioDesc()
                .stream()
                .map(PoliticaRiscoResponseDTO::fromEntity)
                .toList();
    }

    /**
     * Obtém a política de risco atualmente em vigor para o ambiente produtivo.
     * Caso nenhuma política esteja marcada como ativa no repositório, utiliza a versão
     * mais recente cadastrada (fallback).
     *
     * @return DTO com os parâmetros da política de crédito vigente.
     */
    @Transactional
    public PoliticaRiscoResponseDTO obterVigente() {
        garantirPoliticaInicial();
        PoliticaRisco vigente = repository.findFirstByAtivoTrueOrderByVigenciaInicioDesc()
                .orElseGet(() -> repository.findAllByOrderByVigenciaInicioDesc().get(0));
        return PoliticaRiscoResponseDTO.fromEntity(vigente);
    }

    /**
     * Cadastra e homologa uma nova versão da política de risco, substituindo a versão em produção.
     * Executa a transição de vigência em três etapas atômicas:
     *  
     *   -Encerra a vigência da regra ativa atual (marca ativo como false e preenche vigenciaFim).</li>
     *   -Gera o identificador incremental da nova versão semântica (ex.: v1.1, v1.2).</li>
     *   -Persiste a nova política como a única versão ativa a partir do instante atual.</li>
     *  
     *   @param dto Parâmetros informados pelo analista/comitê (limite monetário, prazo de tolerância e justificativa).
     *   @return DTO com os dados da nova política homologada e em vigência.
     */
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

    /**
     * Mecanismo de inicialização (seeding).
     * Caso o sistema seja iniciado em base limpa, persiste automaticamente a versão base ("v1.0").
     */
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

    /**
     * Localiza a política de risco aplicável para uma data de ocorrência específica.
     *   -Se a ocorrência for do dia corrente (ou futura), aplica a política ativa corrente.
     *   -Se for histórica (data anterior), recupera a regra que vigorava no encerramento daquele dia civil
     *    (23:59:59 no fuso horário do sistema), evitando punições ou validações baseadas em normas posteriores ao fato.
     *
     * @param dataOcorrencia Data civil do evento gerador da pendência a ser avaliada.
     * @return DTO da política aplicável à época informada.
     */
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