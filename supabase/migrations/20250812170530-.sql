-- Insert HR admin roles for confirmed users
INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
SELECT 
  u.id,
  'hr_admin'::app_role,
  u.id, -- self-granted for setup
  now()
FROM auth.users u
WHERE u.email IN ('beatriz.meluci@coroadefloresnobre.com.br', 'danilo.lima@coroadefloresnobre.com.br', 'yuri.carvalho@coroadefloresnobre.com.br')
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;