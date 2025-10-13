-- Corrigir candidatos com position_id nulo que foram atualizados recentemente
-- Eles devem ser associados à vaga de Gerente de Contas B2B e colocados no stage correto

UPDATE candidates
SET 
  position_id = 'e15bc7b4-add0-4916-9581-cbc342b9cd92',
  stage = 'analise_ia',
  updated_at = NOW()
WHERE position_id IS NULL
  AND updated_at >= '2025-10-10 00:00:00'
  AND stage IN ('nao_aprovado', 'banco_talentos', 'selecao_pre_entrevista', 'aguardando_feedback_pre_entrevista');

-- Log dos candidatos corrigidos
SELECT COUNT(*) as candidatos_corrigidos
FROM candidates
WHERE position_id = 'e15bc7b4-add0-4916-9581-cbc342b9cd92'
  AND updated_at >= NOW() - INTERVAL '1 minute';