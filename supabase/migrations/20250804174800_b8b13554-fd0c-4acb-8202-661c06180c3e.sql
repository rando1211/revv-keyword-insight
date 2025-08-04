-- Create table to store MCC hierarchy relationships
CREATE TABLE public.google_ads_mcc_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  manager_customer_id TEXT,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  level INTEGER NOT NULL DEFAULT 0,
  account_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.google_ads_mcc_hierarchy ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own MCC hierarchy" 
ON public.google_ads_mcc_hierarchy 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MCC hierarchy" 
ON public.google_ads_mcc_hierarchy 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MCC hierarchy" 
ON public.google_ads_mcc_hierarchy 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MCC hierarchy" 
ON public.google_ads_mcc_hierarchy 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_ads_mcc_hierarchy_updated_at
BEFORE UPDATE ON public.google_ads_mcc_hierarchy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_google_ads_mcc_hierarchy_user_customer ON public.google_ads_mcc_hierarchy(user_id, customer_id);
CREATE INDEX idx_google_ads_mcc_hierarchy_manager ON public.google_ads_mcc_hierarchy(user_id, manager_customer_id);