-- Create optimization impact tracking table
CREATE TABLE IF NOT EXISTS public.optimization_impact_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_id TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  campaign_id TEXT,
  ad_group_id TEXT,
  
  -- What was changed
  executed_changes JSONB NOT NULL,
  rule_codes TEXT[],
  change_summary TEXT,
  
  -- Before metrics (snapshot at execution)
  before_metrics JSONB NOT NULL,
  
  -- After metrics (captured 30 days later)
  after_metrics JSONB,
  
  -- Calculated impact
  cost_saved DECIMAL,
  ctr_improvement DECIMAL,
  conversion_improvement DECIMAL,
  impressions_change DECIMAL,
  clicks_change DECIMAL,
  
  -- Tracking dates
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  measurement_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.optimization_impact_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own tracking records
CREATE POLICY "Users can view their own tracking records"
  ON public.optimization_impact_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tracking records
CREATE POLICY "Users can insert their own tracking records"
  ON public.optimization_impact_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tracking records
CREATE POLICY "Users can update their own tracking records"
  ON public.optimization_impact_tracking
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_optimization_tracking_user_status 
  ON public.optimization_impact_tracking(user_id, status);

CREATE INDEX idx_optimization_tracking_executed_at 
  ON public.optimization_impact_tracking(executed_at);

CREATE INDEX idx_optimization_tracking_customer 
  ON public.optimization_impact_tracking(customer_id, ad_id);

-- Update timestamp trigger
CREATE TRIGGER update_optimization_tracking_updated_at
  BEFORE UPDATE ON public.optimization_impact_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;