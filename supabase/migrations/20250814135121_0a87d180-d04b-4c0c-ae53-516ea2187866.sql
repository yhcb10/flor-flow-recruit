-- Inserir role de HR admin para o usuário logado
INSERT INTO public.user_roles (user_id, role, granted_by) 
VALUES (
  '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid, 
  'hr_admin'::app_role,
  '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;