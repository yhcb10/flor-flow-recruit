-- Primeiro, vamos criar as contas para os emails se não existirem ainda
-- Elas serão criadas quando os usuários fizerem login pela primeira vez

-- Agora vamos adicionar roles de hr_admin para todos os usuários mencionados
-- Isso permitirá acesso completo a todas as vagas e candidatos

-- Para seu usuário atual (já existe)
INSERT INTO public.user_roles (user_id, role, granted_by) 
VALUES (
  '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid, 
  'hr_admin'::app_role,
  '08067e87-1bb9-45f9-a581-e1d7b2674154'::uuid
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Vamos criar uma função para adicionar roles automaticamente quando novos usuários se registrarem
-- com os emails específicos
CREATE OR REPLACE FUNCTION public.auto_assign_hr_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o email do usuário está na lista de emails autorizados
  IF NEW.email IN (
    'yuri.carvalho@coroadefloresnobre.com.br',
    'danilo.lima@coroadefloresnobre.com.br', 
    'beatriz.meluci@coroadefloresnobre.com.br'
  ) THEN
    -- Inserir role de hr_admin automaticamente
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.id, 'hr_admin'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando um novo usuário for criado
DROP TRIGGER IF EXISTS on_auth_user_created_assign_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_hr_roles();