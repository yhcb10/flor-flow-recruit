-- Update the stage check constraint to match the actual stages used in the app
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_stage_check;

ALTER TABLE candidates ADD CONSTRAINT candidates_stage_check 
CHECK (stage = ANY (ARRAY[
  'nova_candidatura'::text,
  'analise_ia'::text, 
  'selecao_pre_entrevista'::text,
  'pre_entrevista'::text,
  'selecao_entrevista_presencial'::text,
  'entrevista_presencial'::text,
  'aprovado'::text,
  'nao_aprovado'::text
]));