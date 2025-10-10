-- 1. Corrigir candidatos com position_id "gerente_de_contas_b2b_703662"
UPDATE candidates 
SET position_id = 'e15bc7b4-add0-4916-9581-cbc342b9cd92'
WHERE position_id = 'gerente_de_contas_b2b_703662';

-- 2. Definir position_id como NULL para candidatos de vagas que não existem mais
UPDATE candidates 
SET position_id = NULL
WHERE position_id NOT IN (SELECT id::text FROM job_positions)
  AND position_id IS NOT NULL;

-- 3. Alterar o tipo da coluna position_id para UUID
ALTER TABLE candidates 
ALTER COLUMN position_id TYPE uuid USING position_id::uuid;

-- 4. Adicionar foreign key para garantir integridade referencial
ALTER TABLE candidates
ADD CONSTRAINT fk_candidates_position
FOREIGN KEY (position_id) 
REFERENCES job_positions(id) 
ON DELETE SET NULL;