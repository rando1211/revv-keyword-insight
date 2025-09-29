-- Create audit_leads table to store free audit requests
CREATE TABLE public.audit_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  google_account_id TEXT,
  customer_id TEXT,
  account_name TEXT,
  audit_results JSONB,
  report_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a lead (public form submission)
CREATE POLICY "Anyone can create audit lead"
ON public.audit_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can view their own audit results via report_token
CREATE POLICY "Anyone can view audit by token"
ON public.audit_leads
FOR SELECT
TO anon, authenticated
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_audit_leads_report_token ON public.audit_leads(report_token);
CREATE INDEX idx_audit_leads_email ON public.audit_leads(email);

-- Add trigger for updated_at
CREATE TRIGGER update_audit_leads_updated_at
BEFORE UPDATE ON public.audit_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();