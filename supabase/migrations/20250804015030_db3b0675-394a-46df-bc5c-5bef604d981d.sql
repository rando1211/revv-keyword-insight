-- Reset onboarding for winchester782@gmail.com again with debugging
UPDATE public.subscribers 
SET onboarding_completed = false, onboarding_completed_at = NULL 
WHERE user_id = '0bd08b5d-be64-49f5-b85e-3358f054c2c0';