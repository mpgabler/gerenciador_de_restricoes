package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.PoliticaRisco;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PoliticaRiscoRepository extends JpaRepository<PoliticaRisco, UUID> {

    // Lista todas da mais recente para a mais antiga
    List<PoliticaRisco> findAllByOrderByVigenciaInicioDesc();

    // Pega a política atualmente ativa em produção
    Optional<PoliticaRisco> findFirstByAtivoTrueOrderByVigenciaInicioDesc();

    // Pega a política que estava em vigor em uma data específica
    Optional<PoliticaRisco> findFirstByVigenciaInicioLessThanEqualOrderByVigenciaInicioDesc(OffsetDateTime dataReferencia);
}