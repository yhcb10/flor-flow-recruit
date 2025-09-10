-- Atualizar ou inserir o refresh token real na tabela google_tokens
INSERT INTO public.google_tokens (refresh_token, created_at, updated_at)
VALUES ('1//04TcXnw0kM8LECgYIARAAGAQSNwF-L9IrNRjETO447L6oIktc69qlzwPG6q3R98xRBzqvrJ-Lolp4HkAgLfG3PAIBKVhHbvI8lA4', now(), now())
ON CONFLICT (id) 
DO UPDATE SET 
  refresh_token = EXCLUDED.refresh_token,
  updated_at = now(),
  access_token = NULL,
  expires_at = NULL;