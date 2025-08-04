-- Enable RLS on the config_notes table to fix security warning
ALTER TABLE public.config_notes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows admins to read config notes
CREATE POLICY "Admins can read config notes" 
ON public.config_notes 
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));