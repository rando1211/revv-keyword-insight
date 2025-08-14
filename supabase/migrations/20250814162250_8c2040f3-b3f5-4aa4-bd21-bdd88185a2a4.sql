-- Update Randy's role to admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'randy@revvmarketing.com'
);