-- Expand user_google_ads_credentials table to store full API credentials
ALTER TABLE public.user_google_ads_credentials 
ADD COLUMN IF NOT EXISTS developer_token TEXT,
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Update the table to make credentials optional for backward compatibility
ALTER TABLE public.user_google_ads_credentials 
ALTER COLUMN customer_id DROP NOT NULL;

-- Add a column to track if user has provided their own credentials
ALTER TABLE public.user_google_ads_credentials 
ADD COLUMN IF NOT EXISTS uses_own_credentials BOOLEAN DEFAULT FALSE;