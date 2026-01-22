-- Adicionar campo n8n_webhook_path na tabela job_positions
ALTER TABLE job_positions 
ADD COLUMN n8n_webhook_path TEXT DEFAULT NULL;

COMMENT ON COLUMN job_positions.n8n_webhook_path IS 
'Path do webhook N8N para envio de currículos (ex: /webhook/curriculo-vendas). Concatenado com N8N_WEBHOOK_BASE_URL.';