-- Disable email confirmation for easier testing
-- This allows users to sign up without confirming their email first

UPDATE auth.config 
SET 
  enable_confirmations = false,
  email_confirm_changes = false
WHERE instance_id = (SELECT id FROM auth.instances LIMIT 1);