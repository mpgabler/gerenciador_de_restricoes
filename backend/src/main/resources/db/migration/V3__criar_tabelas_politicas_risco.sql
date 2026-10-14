CREATE TABLE IF NOT EXISTS politicas_risco (
    id UUID PRIMARY KEY,
    versao VARCHAR(20) NOT NULL,
    teto_inadimplencia NUMERIC(15, 2) NOT NULL,
    dias_atraso_maximo INTEGER NOT NULL,
    vigencia_inicio TIMESTAMPTZ NOT NULL,
    vigencia_fim TIMESTAMPTZ,
    justificativa VARCHAR(500) NOT NULL,
    criado_por VARCHAR(120) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Insere a política inicial v1.0 caso a tabela esteja vazia
INSERT INTO politicas_risco (
    id, versao, teto_inadimplencia, dias_atraso_maximo, 
    vigencia_inicio, vigencia_fim, justificativa, criado_por, ativo
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    'v1.0',
    5000.00,
    90,
    '2026-01-01T00:00:00Z'::TIMESTAMPTZ,
    NULL,
    'Norma de apetite a risco inicial homologada pelo Comitê de Compliance.',
    'analista@banestes.com.br',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM politicas_risco);