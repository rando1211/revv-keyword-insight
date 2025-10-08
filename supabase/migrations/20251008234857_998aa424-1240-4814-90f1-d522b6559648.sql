-- Create activity log table for ad creative changes
CREATE TABLE public.ad_creative_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT,
  
  -- Audit context
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  finding_message TEXT,
  
  -- Change details
  operation TEXT NOT NULL, -- PAUSE_AD, UPDATE_ASSET, ADD_ASSET, etc.
  input_snapshot JSONB NOT NULL, -- ad state before
  proposed_changes JSONB NOT NULL, -- changeset
  
  -- Execution results
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL, -- pending, success, failed
  google_ads_response JSONB, -- API response
  error_message TEXT,
  
  -- Post-change validation
  post_change_checks JSONB, -- ad status, policy, etc.
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.ad_creative_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
ON public.ad_creative_activity_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs"
ON public.ad_creative_activity_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_ad_creative_activity_log_user_id ON public.ad_creative_activity_log(user_id);
CREATE INDEX idx_ad_creative_activity_log_ad_id ON public.ad_creative_activity_log(ad_id);
CREATE INDEX idx_ad_creative_activity_log_executed_at ON public.ad_creative_activity_log(executed_at DESC);