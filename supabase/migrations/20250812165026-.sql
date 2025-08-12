-- SECURITY FIX: Restrict candidates table access to authenticated users only
-- Remove the overly permissive policies that allow public access

-- Drop existing dangerous policies
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can delete candidates" ON public.candidates;

-- Create secure policies that require authentication
CREATE POLICY "Authenticated users can view candidates" 
ON public.candidates 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert candidates" 
ON public.candidates 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates" 
ON public.candidates 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete candidates" 
ON public.candidates 
FOR DELETE 
TO authenticated
USING (true);

-- Also secure the job_positions table while we're at it
DROP POLICY IF EXISTS "Anyone can view job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Anyone can create job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Anyone can update job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Anyone can delete job positions" ON public.job_positions;

CREATE POLICY "Authenticated users can view job positions" 
ON public.job_positions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create job positions" 
ON public.job_positions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update job positions" 
ON public.job_positions 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job positions" 
ON public.job_positions 
FOR DELETE 
TO authenticated
USING (true);