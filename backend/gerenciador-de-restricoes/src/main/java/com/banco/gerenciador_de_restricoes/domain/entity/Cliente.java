package com.banco.gerenciador_de_restricoes.domain.entity;

import com.banco.gerenciador_de_restricoes.domain.enums.StatusCliente;
import com.banco.gerenciador_de_restricoes.domain.enums.TipoPessoa;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "clientes")
@Getter
@Setter
@NoArgsConstructor // construtor vazio obrigatorio p/ Reflection no JPA (reconstruir os registros do PostgreSQL em objetos Java)
@AllArgsConstructor // construtor com todos os parametros p/ o padrao Builder a fim se evitar inversao acidetal de argumentos
@Builder
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // identificador unico universal (integridade referencial e a não exposicao de do CPF na URL)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(nullable = false, unique = true, length = 14)
    private String documento;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_pessoa", nullable = false, length = 2)
    private TipoPessoa tipoPessoa;

    @Column(name = "email", length = 120)
    private String email;

    @Column(name = "telefone", length = 20)
    private String telefone;

    @Column(name = "logradouro", length = 200)
    private String logradouro;

    @Column(name = "numero", length = 20)
    private String numero;

    @Column(name = "complemento", length = 100)
    private String complemento;

    @Column(name = "bairro", length = 100)
    private String bairro;

    @Column(name = "cidade", length = 100)
    private String cidade;

    @Column(name = "uf", length = 2)
    private String uf;

    @Column(name = "cep", length = 10)
    private String cep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private StatusCliente status = StatusCliente.ATIVO;

    @CreationTimestamp
    @Column(name = "data_criacao", updatable = false)
    private OffsetDateTime dataCriacao; // offsetDateTime - tipo moderno para auditoria de selo de tempo com fuso horario

    @Column(name = "data_exclusao")
    private OffsetDateTime dataExclusao;

    // Getters explícitos para garantir que não haja erros de resolução de símbolo (só o Lombok estava dando erro)
    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getDocumento() { return documento; }
    public TipoPessoa getTipoPessoa() { return tipoPessoa; }
    public String getEmail() { return email; }
    public String getTelefone() { return telefone; }
    public String getLogradouro() { return logradouro; }
    public String getNumero() { return numero; }
    public String getComplemento() { return complemento; }
    public String getBairro() { return bairro; }
    public String getCidade() { return cidade; }
    public String getUf() { return uf; }
    public String getCep() { return cep; }
    public StatusCliente getStatus() { return status; }
    public OffsetDateTime getDataCriacao() { return dataCriacao; }
    public OffsetDateTime getDataExclusao() { return dataExclusao; }

    public void setNome(String nome) { this.nome = nome; }
    public void setDocumento(String documento) { this.documento = documento; }
    public void setTipoPessoa(TipoPessoa tipoPessoa) { this.tipoPessoa = tipoPessoa; }
    public void setEmail(String email) { this.email = email; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public void setNumero(String numero) { this.numero = numero; }
    public void setComplemento(String complemento) { this.complemento = complemento; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public void setUf(String uf) { this.uf = uf; }
    public void setCep(String cep) { this.cep = cep; }

    // exclusao logica do cliente carimbando o momento exato da acao
    public void inativar() {
        this.status = StatusCliente.INATIVO;
        this.dataExclusao = OffsetDateTime.now();
    }

    // restaura o cliente para o estado ATIVO e limpa o carimbo de exclusao
    public void reativar() {
        this.status = StatusCliente.ATIVO;
        this.dataExclusao = null;
    }
}