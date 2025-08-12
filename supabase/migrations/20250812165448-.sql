-- ADVANCED SECURITY FIX: Implement role-based access control for HR data
-- Create user roles system to restrict candidate data access to authorized HR personnel only

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('hr_admin', 'hr_user', 'viewer');

-- Create user_roles table to manage access permissions
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to check if user has any HR role
CREATE OR REPLACE FUNCTION public.has_hr_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('hr_admin', 'hr_user')
  );
$$;

-- Create policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "HR admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'));

CREATE POLICY "HR admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'))
WITH CHECK (public.has_role(auth.uid(), 'hr_admin'));

-- Update candidates table policies to require HR access
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON public.candidates;

-- New secure policies for candidates - only HR personnel can access
CREATE POLICY "HR personnel can view candidates"
ON public.candidates
FOR SELECT
TO authenticated
USING (public.has_hr_access(auth.uid()));

CREATE POLICY "HR personnel can insert candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "HR personnel can update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (public.has_hr_access(auth.uid()))
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "HR admins can delete candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'));

-- Update job_positions policies to require HR access
DROP POLICY IF EXISTS "Authenticated users can view job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Authenticated users can create job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Authenticated users can update job positions" ON public.job_positions;
DROP POLICY IF EXISTS "Authenticated users can delete job positions" ON public.job_positions;

CREATE POLICY "HR personnel can view job positions"
ON public.job_positions
FOR SELECT
TO authenticated
USING (public.has_hr_access(auth.uid()));

CREATE POLICY "HR personnel can create job positions"
ON public.job_positions
FOR INSERT
TO authenticated
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "HR personnel can update job positions"
ON public.job_positions
FOR UPDATE
TO authenticated
USING (public.has_hr_access(auth.uid()))
WITH CHECK (public.has_hr_access(auth.uid()));

CREATE POLICY "HR admins can delete job positions"
ON public.job_positions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'hr_admin'));