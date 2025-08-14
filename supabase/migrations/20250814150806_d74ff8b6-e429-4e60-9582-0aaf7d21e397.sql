-- Remover limitações de segurança conforme solicitado pelo usuário
-- 1. Remover políticas RLS restritivas da tabela candidates
DROP POLICY IF EXISTS "Only authenticated HR can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only authenticated HR can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only authenticated HR can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only HR admins can delete candidates" ON public.candidates;

-- 2. Remover políticas RLS restritivas da tabela job_positions  
DROP POLICY IF EXISTS "Only authenticated HR can view job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Only authenticated HR can insert job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Only authenticated HR can update job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Only HR admins can delete job positions" ON public.job_positions;

-- 3. Criar políticas permissivas para acesso público
CREATE POLICY "Allow public access to candidates"
ON public.candidates
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public access to job positions"
ON public.job_positions
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Manter RLS habilitado mas com políticas permissivas
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;