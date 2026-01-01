# Admin Setup Instructions

## Setting Up Your Admin Account

Your email `ookayiztall@gmail.com` has been designated as the admin account.

### Steps to Activate Admin Access:

1. **Sign Up**: First, register an account using your email `ookayiztall@gmail.com` at `/register`

2. **Verify Email**: Check your inbox for the verification email from Supabase and click the verification link

3. **Run Admin Script**: After successful signup and verification, run the admin setup script:
   - Go to the v0 chat
   - The script `scripts/011_setup_admin_user.sql` will automatically set your account as admin
   - Or manually run it from the Supabase SQL editor

4. **Verify Admin Access**: 
   - Log out and log back in
   - You should now see the "Admin" menu in the navigation
   - Navigate to `/dashboard` (admin dashboard) to access admin features

### Admin Capabilities:

Once admin access is activated, you'll have access to:

- **Admin Dashboard** (`/dashboard`) - Overview of platform stats
- **Blog Management** (`/blog`) - Create, edit, publish blog posts
- **Blog Editor** (`/blog/new`) - Write new blog posts
- **Moderation Dashboard** (`/moderation`) - Review and resolve reports
- **User Management** (`/users`) - Manage users, roles, and bans

### Changing Admin in the Future:

To make another user an admin, run this SQL in Supabase:

```sql
UPDATE profiles
SET 
  is_admin = true,
  role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'new-admin@example.com'
);
```

To remove admin access:

```sql
UPDATE profiles
SET 
  is_admin = false,
  role = 'user'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'user-to-demote@example.com'
);
```

### Security Notes:

- Admin status is protected by Row Level Security (RLS) policies
- Only admins can view moderation tools, manage users, and publish blog posts
- The middleware automatically checks admin status for protected routes
- Admin actions are logged in the `moderation_logs` table for audit trails
