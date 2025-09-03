-- Allow admins to view all subscribers
CREATE POLICY "Admins can view all subscribers" 
ON public.subscribers 
FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));