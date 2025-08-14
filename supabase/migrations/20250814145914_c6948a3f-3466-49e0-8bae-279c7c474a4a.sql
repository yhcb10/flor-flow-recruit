-- Remover duplicatas reais: mesmo candidato na mesma vaga
-- Manter apenas o registro mais recente para cada combinação email+position_id

WITH duplicates_to_delete AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN email = 'Não informado' OR email IS NULL THEN name
          ELSE email 
        END,
        position_id 
      ORDER BY created_at DESC
    ) as rn
  FROM candidates
)
DELETE FROM candidates 
WHERE id IN (
  SELECT id 
  FROM duplicates_to_delete 
  WHERE rn > 1
);