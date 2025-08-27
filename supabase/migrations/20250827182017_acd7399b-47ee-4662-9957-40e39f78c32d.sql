-- Criar tabela para armazenar tokens do Google
CREATE TABLE public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso apenas aos administradores de HR
CREATE POLICY "HR admins can manage Google tokens" 
ON public.google_tokens 
FOR ALL 
USING (true);

-- Trigger para atualizar o updated_at automaticamente
CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir o token atual se ainda não existe
INSERT INTO public.google_tokens (refresh_token)
SELECT 'PLACEHOLDER_TOKEN'
WHERE NOT EXISTS (SELECT 1 FROM public.google_tokens LIMIT 1);