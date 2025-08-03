-- To create your first admin user, you'll need to:
-- 1. Sign up a user through the normal registration process
-- 2. Then run this query with their user_id to make them admin

-- Example: Replace 'your-user-id-here' with the actual user ID
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- You can find user IDs by checking the auth.users table or the subscribers table