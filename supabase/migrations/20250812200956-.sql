-- Update the stage check constraint to include banco_talentos
ALTER TABLE candidates DROP CONSTRAINT candidates_stage_check;

ALTER TABLE candidates ADD CONSTRAINT candidates_stage_check 
CHECK (stage = ANY (ARRAY[
  'nova_candidatura'::text, 
  'analise_ia'::text, 
  'selecao_pre_entrevista'::text, 
  'pre_entrevista'::text, 
  'selecao_entrevista_presencial'::text, 
  'entrevista_presencial'::text, 
  'aprovado'::text, 
  'nao_aprovado'::text,
  'banco_talentos'::text
]));