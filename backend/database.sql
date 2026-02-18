-- ===============================
-- TABELA: promissorias
-- ===============================

CREATE TABLE IF NOT EXISTS promissorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    cliente TEXT NOT NULL,
    veiculo TEXT,

    valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
    valor_pago  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),

    data_vencimento DATE NOT NULL,
    data_pagamento DATE,

    observacoes TEXT,

    criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- garante que não pague mais do que deve
    CHECK (valor_pago <= valor_total)
);

-- ===============================
-- TRIGGER: atualizar atualizada_em
-- ===============================

CREATE OR REPLACE FUNCTION set_atualizada_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizada_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_atualizada_em ON promissorias;

CREATE TRIGGER trg_set_atualizada_em
BEFORE UPDATE ON promissorias
FOR EACH ROW
EXECUTE FUNCTION set_atualizada_em();

-- ===============================
-- VIEW: promissorias_calculadas
-- ===============================
-- ESSA VIEW É O QUE O FRONTEND VAI USAR

CREATE OR REPLACE VIEW promissorias_view AS
SELECT
    id,
    cliente,
    veiculo,
    valor_total,
    valor_pago,
    (valor_total - valor_pago) AS valor_em_aberto,
    data_vencimento,
    data_pagamento,
    observacoes,
    criada_em,
    atualizada_em,

    CASE
        WHEN valor_pago >= valor_total THEN 'paga'
        WHEN CURRENT_DATE > data_vencimento THEN 'vencida'
        ELSE 'pendente'
    END AS status

FROM promissorias;

-- ===============================
-- ÍNDICES
-- ===============================

CREATE INDEX IF NOT EXISTS idx_promissorias_cliente
    ON promissorias(cliente);

CREATE INDEX IF NOT EXISTS idx_promissorias_data_vencimento
    ON promissorias(data_vencimento);

CREATE INDEX IF NOT EXISTS idx_promissorias_criada_em
    ON promissorias(criada_em DESC);

-- ===============================
-- RLS
-- ===============================

ALTER TABLE promissorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir_tudo_promissorias" ON promissorias;

CREATE POLICY "permitir_tudo_promissorias"
ON promissorias
FOR ALL
USING (true)
WITH CHECK (true);

-- ===============================
-- TABELA: interacoes
-- ===============================

CREATE TABLE IF NOT EXISTS interacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promissoria_id UUID NOT NULL REFERENCES promissorias(id) ON DELETE CASCADE,

    tipo TEXT NOT NULL CHECK (tipo IN ('criacao', 'edicao', 'pagamento', 'observacao')),
    descricao TEXT,
    valor NUMERIC(10,2),

    criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_promissoria
    ON interacoes(promissoria_id);

CREATE INDEX IF NOT EXISTS idx_interacoes_criada_em
    ON interacoes(criada_em DESC);

ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitir_tudo_interacoes" ON interacoes;

CREATE POLICY "permitir_tudo_interacoes"
ON interacoes
FOR ALL
USING (true)
WITH CHECK (true);
