-- Ensure all required columns exist in user_google_ads_credentials table
ALTER TABLE public.user_google_ads_credentials 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;