package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.PoliticaRisco;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Interface de acesso a dados (Data Access Layer) para a entidade PoliticaRisco.
 * Responsável pelas operações de persistência e recuperação de regras de concessão e limites de crédito.
 * Encapsula consultas temporais orientadas à vigência para assegurar a aplicação de parâmetros
 * vigentes e o princípio da irretroatividade normativa em auditorias retroativas.
 */
public interface PoliticaRiscoRepository extends JpaRepository<PoliticaRisco, UUID> {

    // Lista todas da mais recente para a mais antiga
    List<PoliticaRisco> findAllByOrderByVigenciaInicioDesc();

    // Pega a política atualmente ativa em produção
    Optional<PoliticaRisco> findFirstByAtivoTrueOrderByVigenciaInicioDesc();

    // Pega a política que estava em vigor em uma data específica
    Optional<PoliticaRisco> findFirstByVigenciaInicioLessThanEqualOrderByVigenciaInicioDesc(OffsetDateTime dataReferencia);
}