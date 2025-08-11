-- Add endpoint_id column to job_positions table
ALTER TABLE public.job_positions 
ADD COLUMN endpoint_id TEXT;

-- Update existing job positions with generated endpoint IDs
UPDATE public.job_positions 
SET endpoint_id = CASE 
  WHEN id = '4b941ff1-0efc-4c43-a654-f37ed43286d3' THEN 'vendedor_001'
  WHEN id = '5c852ff2-1fdc-4d54-b765-948fe54397e4' THEN 'gestor_ads_001'
  ELSE LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]', '_', 'g'), '_+', '_', 'g')) || '_' || EXTRACT(EPOCH FROM created_at)::text
END;