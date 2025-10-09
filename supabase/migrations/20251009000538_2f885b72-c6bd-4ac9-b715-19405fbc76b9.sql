-- Add columns to activity log for cooldown tracking
ALTER TABLE public.ad_creative_activity_log
ADD COLUMN IF NOT EXISTS rule_category TEXT,
ADD COLUMN IF NOT EXISTS is_structural_edit BOOLEAN DEFAULT false;

-- Create index for cooldown checks
CREATE INDEX IF NOT EXISTS idx_ad_creative_activity_log_cooldown 
ON public.ad_creative_activity_log(ad_id, is_structural_edit, executed_at DESC) 
WHERE status = 'success';