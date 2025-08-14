-- CORREÇÃO CRÍTICA DE SEGURANÇA: Recriar políticas RLS da tabela candidates
-- 1. Remover todas as políticas existentes
DROP POLICY IF EXISTS "HR admins can delete candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR personnel can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR personnel can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR personnel can view candidates" ON public.candidates;

-- 2. Garantir que RLS está habilitado
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates FORCE ROW LEVEL SECURITY;

-- 3. Corrigir funções de segurança adicionando search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_hr_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('hr_admin', 'hr_user')
  );
$$;

-- 4. Recriar políticas RLS mais restritivas
CREATE POLICY "Only authenticated HR can view candidates"
ON public.candidates
FOR SELECT
TO authenticated
USING (public.has_hr_access(auth.uid()));

CREATE POLICY "Only authenticated HR can insert candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "Only authenticated HR can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (public.has_hr_access(auth.uid()))
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "Only HR admins can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'));

-- 5. Aplicar as mesmas correções para job_positions
ALTER TABLE public.job_positions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR admins can delete job positions" ON public.job_positions;
DROP POLICY IF EXISTS "HR personnel can create job positions" ON public.job_positions;
DROP POLICY IF EXISTS "HR personnel can update job positions" ON public.job_positions;
DROP POLICY IF EXISTS "HR personnel can view job positions" ON public.job_positions;

CREATE POLICY "Only authenticated HR can view job positions"
ON public.job_positions
FOR SELECT
TO authenticated
USING (public.has_hr_access(auth.uid()));

CREATE POLICY "Only authenticated HR can insert job positions"
ON public.job_positions
FOR INSERT
TO authenticated
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "Only authenticated HR can update job positions"
ON public.job_positions
FOR UPDATE
TO authenticated
USING (public.has_hr_access(auth.uid()))
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "Only HR admins can delete job positions"
ON public.job_positions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'));