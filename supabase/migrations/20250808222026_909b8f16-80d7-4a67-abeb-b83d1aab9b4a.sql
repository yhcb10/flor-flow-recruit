-- Create job positions table to store job descriptions
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  requirements TEXT[],
  responsibilities TEXT[],
  benefits TEXT[],
  salary_range TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for job positions (allowing public access for now since there's no auth yet)
CREATE POLICY "Anyone can view job positions" 
ON public.job_positions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create job positions" 
ON public.job_positions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update job positions" 
ON public.job_positions 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete job positions" 
ON public.job_positions 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add position_id foreign key to candidates table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'position_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.candidates 
    ADD COLUMN position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;
  END IF;
END $$;