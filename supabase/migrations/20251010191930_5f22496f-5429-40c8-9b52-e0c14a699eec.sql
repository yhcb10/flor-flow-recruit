-- Remover constraint antiga que está bloqueando a atualização
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_stage_check;

-- Mover candidatos que já tiveram WhatsApp disparado para "Análise Vídeo"
UPDATE candidates 
SET 
  stage = 'aguardando_feedback_pre_entrevista',
  updated_at = now()
WHERE id IN (
  'dd9a2de0-e68e-42f2-819e-a0903019f4ff', -- Lucas De Avila Lima
  '14bb3c9a-095c-4079-86fa-2fddbd614c38', -- Tais Ferreira Dias
  'cb068154-3940-4978-8543-cfa56c82db72', -- Vinicius Rodrigues Valério
  '0bbd867b-7cb0-4999-8730-a9b7848d630e', -- Sara Tarsila Da Silva Amaral
  'e4070743-2e8a-46e4-b8b0-ab7653fad3d5', -- Tiffany Sasso da Silva
  'aa4b086a-c78d-436d-b715-68786d395c04'  -- Jéssica Sanches Da Silva
)
AND stage = 'selecao_pre_entrevista';