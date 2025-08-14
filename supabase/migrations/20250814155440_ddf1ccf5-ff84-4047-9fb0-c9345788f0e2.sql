-- Create shared credentials table for demo access
CREATE TABLE public.shared_google_ads_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.shared_google_ads_access ENABLE ROW LEVEL SECURITY;

-- Create policies for shared access
CREATE POLICY "Owners can manage shared access"
ON public.shared_google_ads_access
FOR ALL
USING (auth.uid() = owner_user_id);

CREATE POLICY "Shared users can view their access"
ON public.shared_google_ads_access
FOR SELECT
USING (auth.uid() = shared_with_user_id);

-- Update Google Ads credentials policies to allow moderators access to shared data
CREATE POLICY "Moderators can view shared credentials"
ON public.user_google_ads_credentials
FOR SELECT
USING (
  auth.uid() = user_id OR 
  (
    has_role(auth.uid(), 'moderator'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.shared_google_ads_access 
      WHERE owner_user_id = user_google_ads_credentials.user_id 
      AND shared_with_user_id = auth.uid()
    )
  )
);

-- Update MCC hierarchy policies to allow moderators access to shared data
CREATE POLICY "Moderators can view shared MCC hierarchy"
ON public.google_ads_mcc_hierarchy
FOR SELECT
USING (
  auth.uid() = user_id OR 
  (
    has_role(auth.uid(), 'moderator'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.shared_google_ads_access 
      WHERE owner_user_id = google_ads_mcc_hierarchy.user_id 
      AND shared_with_user_id = auth.uid()
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_shared_google_ads_access_updated_at
BEFORE UPDATE ON public.shared_google_ads_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();