-- First update existing data to match our app stages
UPDATE candidates SET stage = 'selecao_pre_entrevista' WHERE stage = 'selecao_rh';

-- Now update the constraint to match what the app expects
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