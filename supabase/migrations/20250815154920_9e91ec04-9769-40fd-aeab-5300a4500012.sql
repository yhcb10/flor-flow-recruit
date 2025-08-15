-- Atualizar os candidatos de Analista de SEO para usar o UUID correto da vaga
UPDATE candidates 
SET position_id = 'a7e9ba85-9792-467e-ad9a-06b8f3b91e17'
WHERE position_id = 'analista_de_seo_079246';

-- Verificar se há outros position_ids que não são UUIDs válidos
-- e precisam ser corrigidos