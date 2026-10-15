package com.banco.gerenciador_de_restricoes.repository;

import com.banco.gerenciador_de_restricoes.domain.entity.Cliente;
import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;


/**
 * Interface de acesso a dados (Data Access Layer) para a entidade Cliente.
 * Estende JpaRepository para prover operacoes padrao de persistencia (CRUD), paginacao e ordenacao,
 * e JpaSpecificationExecutor para suporte a consultas dinamicas e composicao de filtros via Criteria API.
 * Interage diretamente com a tabela 'clientes' no banco de dados relacional.
 */
@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID>, JpaSpecificationExecutor<Cliente> {
    boolean existsByDocumento(String documento);
    Optional<Cliente> findByDocumentoAndStatus(String documento, StatusCliente status);
}