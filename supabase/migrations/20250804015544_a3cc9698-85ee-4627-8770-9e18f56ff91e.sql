-- Reset winchester782@gmail.com to be treated as a new account
UPDATE public.subscribers 
SET onboarding_completed = false, 
    onboarding_completed_at = NULL 
WHERE user_id = '0bd08b5d-be64-49f5-b85e-3358f054c2c0';

-- Also clear any existing API credentials so they see the fresh setup
DELETE FROM public.user_google_ads_credentials 
WHERE user_id = '0bd08b5d-be64-49f5-b85e-3358f054c2c0';