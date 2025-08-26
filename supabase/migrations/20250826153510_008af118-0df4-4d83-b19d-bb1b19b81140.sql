-- Atualizar position_id dos candidatos de SEO existentes para usar o UUID correto
UPDATE candidates 
SET position_id = 'a7e9ba85-9792-467e-ad9a-06b8f3b91e17'
WHERE position_id = 'analista_de_seo_079246';