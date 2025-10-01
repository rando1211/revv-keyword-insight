-- Update the handle_new_user function to assign beta tier to new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insert into subscribers table with beta tier
  INSERT INTO public.subscribers (user_id, email, subscription_tier, trial_end)
  VALUES (
    NEW.id, 
    NEW.email, 
    'beta', 
    NOW() + INTERVAL '30 days'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;