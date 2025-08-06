-- Create simplified candidates table based on N8N output format
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  idade INTEGER,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  
  -- Avaliação IA
  nota_final INTEGER,
  justificativa TEXT,
  pontos_fortes TEXT[],
  pontos_fracos TEXT[],
  observacoes TEXT,
  recomendacao TEXT,
  proximos_passos TEXT,
  
  -- Pontuação detalhada (only keeping these two)
  perfil_comportamental DECIMAL,
  conhecimentos_tecnicos DECIMAL,
  adequacao_geral DECIMAL,
  
  -- Status
  aprovado BOOLEAN,
  fase_atual TEXT,
  metodo_extracao TEXT,
  data_processamento TIMESTAMP WITH TIME ZONE,
  
  -- Campos de controle
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access (since N8N doesn't authenticate)
CREATE POLICY "Allow public access to candidates" 
ON public.candidates 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();