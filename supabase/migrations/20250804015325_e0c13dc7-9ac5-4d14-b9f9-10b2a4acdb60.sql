-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table for user-specific Google Ads API credentials
CREATE TABLE public.user_google_ads_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  developer_token TEXT,
  client_id TEXT,
  client_secret TEXT,
  refresh_token TEXT,
  customer_id TEXT,
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_google_ads_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only access their own credentials
CREATE POLICY "Users can view their own credentials" 
ON public.user_google_ads_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" 
ON public.user_google_ads_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" 
ON public.user_google_ads_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" 
ON public.user_google_ads_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_google_ads_credentials_updated_at
BEFORE UPDATE ON public.user_google_ads_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();