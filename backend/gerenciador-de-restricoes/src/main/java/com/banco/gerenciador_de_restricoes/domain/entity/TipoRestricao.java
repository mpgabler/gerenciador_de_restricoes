package com.banco.gerenciador_de_restricoes.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "tipos_restricao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoRestricao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String codigo; // Ex: FRAUDE, INADIMPLENCIA, BLOQUEIO_JUDICIAL

    @Column(nullable = false, length = 150)
    private String descricao;

    @Column(name = "bloqueio_imediato", nullable = false)
    private boolean bloqueioImediato;

    @Column(name = "valor_limite_acumulado", precision = 15, scale = 2)
    private BigDecimal valorLimiteAcumulado;

    @Column(name = "dias_atraso_limite")
    private Integer diasAtrasoLimite;
}
