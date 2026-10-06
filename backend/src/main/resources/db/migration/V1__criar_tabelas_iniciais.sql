CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    documento VARCHAR(14) NOT NULL UNIQUE,
    tipo_pessoa VARCHAR(2) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    status VARCHAR(10) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_exclusao TIMESTAMP WITH TIME ZONE NULL
);

-- 2. Parametrização de forma dinâmica das Regras de Negócio
CREATE TABLE tipos_restricao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descricao VARCHAR(150) NOT NULL,
    bloqueio_imediato BOOLEAN NOT NULL DEFAULT FALSE,
    valor_limite_acumulado NUMERIC(15, 2) NULL,
    dias_atraso_limite INT NULL
);

-- 3. Tabela de Restrições
CREATE TABLE restricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    tipo_restricao_id UUID NOT NULL REFERENCES tipos_restricao(id),
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    data_ocorrencia DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'BAIXADA')),
    data_baixa TIMESTAMP WITH TIME ZONE NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Carga inicial com as regras do desafio
INSERT INTO tipos_restricao (codigo, descricao, bloqueio_imediato, valor_limite_acumulado, dias_atraso_limite)
VALUES 
    ('FRAUDE', 'Fraude confirmada em conta ou cartão', TRUE, NULL, NULL),
    ('INADIMPLENCIA', 'Débitos ou parcelas em aberto', FALSE, 5000.00, 90),
    ('BLOQUEIO_JUDICIAL', 'Determinação judicial de bloqueio', TRUE, NULL, NULL);