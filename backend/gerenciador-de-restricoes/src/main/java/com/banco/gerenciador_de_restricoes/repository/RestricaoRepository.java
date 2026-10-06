package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RestricaoRepository extends JpaRepository<Restricao, UUID>, JpaSpecificationExecutor<Restricao> {
    List<Restricao> findByClienteIdAndStatus(UUID clienteId, StatusRestricao status);
}
