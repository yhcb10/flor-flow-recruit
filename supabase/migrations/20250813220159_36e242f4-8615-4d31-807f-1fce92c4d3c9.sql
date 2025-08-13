-- Adicionar coluna para motivo do banco de talentos
ALTER TABLE candidates 
ADD COLUMN talent_pool_reason TEXT;