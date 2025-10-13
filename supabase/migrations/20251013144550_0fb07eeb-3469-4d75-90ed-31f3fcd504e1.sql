-- REVERTER O ERRO: Remover candidatos antigos que foram colocados incorretamente na vaga de Gerente de Contas B2B
-- Apenas candidatos criados ANTES de 10/10 serão revertidos para position_id nulo

UPDATE candidates
SET 
  position_id = NULL,
  stage = 'nao_aprovado',
  updated_at = NOW()
WHERE position_id = 'e15bc7b4-add0-4916-9581-cbc342b9cd92'
  AND created_at < '2025-10-10 00:00:00';

-- Verificar quantos candidatos corretos restaram
SELECT COUNT(*) as candidatos_corretos_restantes
FROM candidates
WHERE position_id = 'e15bc7b4-add0-4916-9581-cbc342b9cd92';