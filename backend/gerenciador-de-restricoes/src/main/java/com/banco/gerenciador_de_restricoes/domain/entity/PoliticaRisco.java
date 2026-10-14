package com.banco.gerenciador_de_restricoes.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "politicas_risco")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoliticaRisco {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 20)
    private String versao;

    @Column(name = "teto_inadimplencia", nullable = false, precision = 15, scale = 2)
    private BigDecimal tetoInadimplencia;

    @Column(name = "dias_atraso_maximo", nullable = false)
    private Integer diasAtrasoMaximo;

    @Column(name = "vigencia_inicio", nullable = false)
    private OffsetDateTime vigenciaInicio;

    @Column(name = "vigencia_fim")
    private OffsetDateTime vigenciaFim;

    @Column(nullable = false, length = 500)
    private String justificativa;

    @Column(name = "criado_por", nullable = false, length = 120)
    private String criadoPor;

    @Column(nullable = false)
    private Boolean ativo;
}