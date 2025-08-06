-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position_id TEXT,
  resume_url TEXT,
  resume_text TEXT,
  resume_file_name TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('indeed', 'manual', 'referral')),
  stage TEXT DEFAULT 'analise_ia' CHECK (stage IN ('nova_candidatura', 'analise_ia', 'selecao_rh', 'pre_entrevista', 'entrevista_presencial', 'aprovado', 'nao_aprovado')),
  ai_analysis JSONB,
  notes JSONB DEFAULT '[]'::jsonb,
  interviews JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create policies (open for now since no auth is implemented)
CREATE POLICY "Anyone can view candidates" 
ON public.candidates 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert candidates" 
ON public.candidates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update candidates" 
ON public.candidates 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete candidates" 
ON public.candidates 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();