-- Set ookayiztall@gmail.com as admin user
-- This script should be run after the user has signed up with this email

-- Update the profiles table to set admin status
UPDATE profiles
SET 
  is_admin = true,
  role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ookayiztall@gmail.com'
);

-- Verify the admin was set correctly
SELECT 
  p.username,
  p.role,
  p.is_admin,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'ookayiztall@gmail.com';
