package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.TipoRestricao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TipoRestricaoRepository extends JpaRepository<TipoRestricao, UUID> {
    Optional<TipoRestricao> findByCodigo(String codigo);
}