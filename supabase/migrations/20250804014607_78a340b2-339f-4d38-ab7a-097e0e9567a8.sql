-- Reset onboarding for user winchester782@gmail.com to see the new DEXTRUM tactical tour
UPDATE public.subscribers 
SET onboarding_completed = false, onboarding_completed_at = NULL 
WHERE user_id = '0bd08b5d-be64-49f5-b85e-3358f054c2c0';