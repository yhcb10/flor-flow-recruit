-- Remove the constraint temporarily to allow data updates
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_stage_check;

-- Update any existing mismatched data
UPDATE candidates SET stage = 'selecao_pre_entrevista' WHERE stage = 'selecao_rh';

-- Now add the correct constraint with all the stages used in the app
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