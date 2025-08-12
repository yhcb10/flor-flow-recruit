-- Enable realtime for candidates table
ALTER TABLE public.candidates REPLICA IDENTITY FULL;

-- Add candidates table to realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;