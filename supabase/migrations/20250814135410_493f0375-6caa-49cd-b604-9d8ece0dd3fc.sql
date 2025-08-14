-- Adicionar roles de hr_admin para os usuários existentes
INSERT INTO public.user_roles (user_id, role, granted_by) 
VALUES 
  ('c502c1af-1e97-4584-8270-0e2d4d708510'::uuid, 'hr_admin'::app_role, '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid),
  ('dd4d3ff2-f0e1-4d36-9386-f0293c49f0a6'::uuid, 'hr_admin'::app_role, '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid)
ON CONFLICT (user_id, role) DO NOTHING;