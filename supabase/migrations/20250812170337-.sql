-- Confirm pending users manually for development
UPDATE auth.users 
SET email_confirmed_at = now(), 
    updated_at = now()
WHERE email_confirmed_at IS NULL 
  AND email IN ('beatriz.meluci@coroadefloresnobre.com.br');