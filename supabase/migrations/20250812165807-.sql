-- Assign hr_admin role to existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('08067e87-1bb9-45f9-a581-e1d7b2674154', 'hr_admin')
ON CONFLICT (user_id, role) DO NOTHING;