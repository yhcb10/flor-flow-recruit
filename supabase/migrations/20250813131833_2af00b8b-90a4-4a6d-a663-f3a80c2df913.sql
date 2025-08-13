-- Limpeza geral de duplicatas - manter apenas o registro mais recente de cada candidato
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY name, email ORDER BY created_at DESC) as rn
  FROM candidates
  WHERE name IS NOT NULL AND email IS NOT NULL
)
DELETE FROM candidates 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Limpeza de duplicatas com mesmo nome mas sem email
WITH duplicates_no_email AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM candidates
  WHERE name IS NOT NULL AND (email IS NULL OR email = 'Não informado')
)
DELETE FROM candidates 
WHERE id IN (
  SELECT id FROM duplicates_no_email WHERE rn > 1
);