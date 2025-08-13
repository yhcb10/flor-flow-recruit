-- Excluir candidatos duplicados mantendo apenas o mais recente de cada email/position_id
WITH duplicates_to_delete AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email, position_id 
      ORDER BY created_at DESC
    ) as rn
  FROM candidates 
  WHERE email IS NOT NULL 
    AND email != '' 
    AND position_id IS NOT NULL
)
DELETE FROM candidates 
WHERE id IN (
  SELECT id 
  FROM duplicates_to_delete 
  WHERE rn > 1
);