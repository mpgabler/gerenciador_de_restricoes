package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.Restricao;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusRestricao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RestricaoRepository extends JpaRepository<Restricao, UUID> {

    @Query("SELECT r FROM Restricao r WHERE r.cliente.id = :clienteId")
    List<Restricao> findByClienteId(@Param("clienteId") UUID clienteId);

    @Query("SELECT r FROM Restricao r WHERE r.cliente.id = :clienteId AND r.status = :status")
    List<Restricao> findByClienteIdAndStatus(@Param("clienteId") UUID clienteId, @Param("status") StatusRestricao status);

}