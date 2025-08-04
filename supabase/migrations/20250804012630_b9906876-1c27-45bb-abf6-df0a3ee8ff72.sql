-- This migration addresses the email confirmation issue by creating a note
-- You need to manually disable email confirmation in Supabase dashboard

-- Create a table to track configuration changes
CREATE TABLE IF NOT EXISTS public.config_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert a note about the required configuration change
INSERT INTO public.config_notes (note) VALUES 
('Email confirmation has been causing signup issues. Disable "Enable email confirmations" in Supabase Auth settings > Email tab for testing purposes.');