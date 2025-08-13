-- Remover duplicatas dos currículos de analista de IA
-- Manter apenas o registro com o position_id correto para cada candidato

-- Deletar registros duplicados com position_id incorreto
DELETE FROM candidates 
WHERE position_id = '8f120339-2b13-425d-a504-8157dd77f411' 
AND name IN (
  SELECT name FROM candidates 
  WHERE position_id = '72a59b27-5286-4591-b841-af1c5dfcc87d'
  GROUP BY name
);

-- Deletar registros duplicados com position_id incorreto (segundo ID)
DELETE FROM candidates 
WHERE position_id = '4b941ff1-0efc-4c43-a654-f37ed43286d3' 
AND name IN (
  SELECT name FROM candidates 
  WHERE position_id = '72a59b27-5286-4591-b841-af1c5dfcc87d'
  GROUP BY name
);