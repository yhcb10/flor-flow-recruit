-- Remove specified columns from candidates table
ALTER TABLE public.candidates 
DROP COLUMN IF EXISTS vaga_id,
DROP COLUMN IF EXISTS vaga_nome,
DROP COLUMN IF EXISTS empresa,
DROP COLUMN IF EXISTS local_trabalho,
DROP COLUMN IF EXISTS salario_base,
DROP COLUMN IF EXISTS comissao_media,
DROP COLUMN IF EXISTS curriculo_url,
DROP COLUMN IF EXISTS total_paginas,
DROP COLUMN IF EXISTS caracteres_extraidos,
DROP COLUMN IF EXISTS versao_fluxo,
DROP COLUMN IF EXISTS experiencia_vendas,
DROP COLUMN IF EXISTS formacao;