-- Corrigir position_id do candidato Yasmin que foi criado com ID literal do N8N
UPDATE candidates 
SET position_id = '8f120339-2b13-425d-a504-8157dd77f411'
WHERE id = '9f19f4ef-1786-4fef-931a-71f3f017ecaa' AND position_id = 'vendedor_interno_849750';