-- Add rejection_reason column to candidates table
ALTER TABLE public.candidates 
ADD COLUMN rejection_reason TEXT;