-- Remover constraint antiga que limita os valores de source
-- Isso permite que qualquer origem (instagram, facebook, indeed, linkedin, etc) seja aceita
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check;

-- Adicionar índice para melhorar performance de buscas por source
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);