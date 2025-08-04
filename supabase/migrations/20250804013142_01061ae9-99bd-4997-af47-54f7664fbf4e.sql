-- Add onboarding tracking to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_subscribers_onboarding ON public.subscribers(onboarding_completed);

-- Update existing users to have onboarding completed (they've already seen the app)
UPDATE public.subscribers 
SET onboarding_completed = true, onboarding_completed_at = now() 
WHERE onboarding_completed IS NULL OR onboarding_completed = false;