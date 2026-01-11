-- Simple and safe auth cleanup
-- Removes all users and related auth records except super admin

-- First, let's find the super admin email
\set super_admin_email 'admin@airentaltool.com'

-- Delete all refresh tokens for users that are not the super admin
DELETE FROM auth.refresh_tokens
WHERE user_id NOT IN (
  SELECT id::text FROM auth.users WHERE email = :'super_admin_email'
);

-- Delete all sessions for users that are not the super admin
DELETE FROM auth.sessions
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = :'super_admin_email'
);

-- Delete all identities for users that are not the super admin
DELETE FROM auth.identities
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = :'super_admin_email'
);

-- Delete all MFA factors for users that are not the super admin
DELETE FROM auth.mfa_factors
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = :'super_admin_email'
);

-- Delete all users except super admin
DELETE FROM auth.users
WHERE email != :'super_admin_email';

-- Show what's left
SELECT 'Cleanup Complete' as status;

SELECT
  (SELECT COUNT(*) FROM auth.users) as users,
  (SELECT COUNT(*) FROM auth.identities) as identities,
  (SELECT COUNT(*) FROM auth.sessions) as sessions,
  (SELECT COUNT(*) FROM auth.refresh_tokens) as refresh_tokens;

SELECT id, email, created_at FROM auth.users ORDER BY created_at;
