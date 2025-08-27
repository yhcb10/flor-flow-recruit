-- Atualizar com o refresh token real
UPDATE public.google_tokens 
SET refresh_token = 'SEU_REFRESH_TOKEN_AQUI'
WHERE refresh_token = 'PLACEHOLDER_TOKEN';