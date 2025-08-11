-- Vincular todos os candidatos existentes à vaga ativa
UPDATE candidates 
SET position_id = '4b941ff1-0efc-4c43-a654-f37ed43286d3' 
WHERE position_id IS NULL;