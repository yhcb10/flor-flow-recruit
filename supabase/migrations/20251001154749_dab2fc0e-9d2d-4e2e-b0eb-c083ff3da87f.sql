-- Atualizar candidatos existentes com position_id incorreto para usar o UUID correto
UPDATE candidates 
SET position_id = 'db99c48e-603e-4b56-a9f0-88ad5d34ba49' 
WHERE position_id = 'auxiliar_administrativo_671609';

-- Adicionar comentário explicativo
COMMENT ON COLUMN candidates.position_id IS 'UUID da vaga (job_position.id) - sempre deve ser UUID, não endpoint_id';