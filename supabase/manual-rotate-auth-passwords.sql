-- supabase/manual-rotate-auth-passwords.sql
-- =====================================================================
-- Oja Password Rotation Script for Supabase Auth
-- =====================================================================
--
-- PURPOSE:
--   This script rotates the auth password for ALL users in auth.users
--   to a random, unknowable value. It is designed to remediate the
--   fixed-password vulnerability where all accounts shared the same
--   constant password 'OjaSchoolSecureAuth2026!'.
--
-- WHEN TO RUN:
--   Run this AFTER deploying the new client code that uses OTP-only
--   sign-in (signInWithOtp) and random per-account signup passwords.
--   The old client code used the constant password for signInWithPassword,
--   so running this before the new code is deployed would break login
--   for existing users.
--
-- SAFETY:
--   - This script is idempotent and safe to re-run.
--   - It only updates auth.users (the auth schema), not public.profiles.
--   - It uses pgcrypto.gen_salt('bf') and crypt() which are the
--     standard Supabase/PostgreSQL password hashing functions.
--   - The generated passwords are cryptographically random and cannot
--     be reversed or guessed.
--   - Users will NOT be able to sign in with password after this runs
--     (which is the intended behavior - they must use OTP or Google OAuth).
--
-- REQUIREMENTS:
--   - pgcrypto extension must be enabled (it is by default on Supabase).
--   - Requires superuser or service_role privileges to update auth.users.
--
-- =====================================================================

-- Verify pgcrypto is available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension is required but not installed. Enable it in Supabase Dashboard > Database > Extensions.';
  END IF;
END $$;

-- Show current state before rotation
SELECT
  id,
  email,
  encrypted_password IS NOT NULL AS has_password,
  email_confirmed_at IS NOT NULL AS email_confirmed,
  created_at
FROM auth.users
ORDER BY created_at;

-- Rotate passwords for ALL users
-- Each user gets a unique, cryptographically random password
-- that is immediately hashed with bcrypt (cost 10 by default)
UPDATE auth.users
SET encrypted_password = crypt(
  gen_random_uuid() || gen_random_uuid(),
  gen_salt('bf', 10)
)
WHERE encrypted_password IS NOT NULL;

-- Verify rotation
SELECT
  id,
  email,
  encrypted_password IS NOT NULL AS has_password,
  -- Verify the new passwords are different (they will be)
  length(encrypted_password) > 0 AS password_set
FROM auth.users
ORDER BY created_at;

-- Optional: Show sample of new password hashes (they should all be different)
SELECT
  email,
  substring(encrypted_password, 1, 20) AS hash_prefix
FROM auth.users
WHERE encrypted_password IS NOT NULL
LIMIT 10;

-- =====================================================================
-- POST-ROTATION NOTES:
-- =====================================================================
-- 1. After running this, NO USER can sign in with a password.
--    All sign-in must go through:
--    - OTP (signInWithOtp -> verifyOtp type 'email')
--    - Google OAuth (signInWithOAuth provider 'google')
--    - Magic links (if configured)
--
-- 2. If you need to re-enable password sign-in for specific users
--    (not recommended), you would need to use the Supabase Admin API
--    or Dashboard to set a new password for those specific users.
--
-- 3. The rotation does NOT affect:
--    - public.profiles table
--    - Google OAuth configurations
--    - Email OTP flow
--    - Session management
--    - Any other auth methods
--
-- 4. To verify the rotation worked, try to sign in with the old
--    constant password 'OjaSchoolSecureAuth2026!' - it should fail.
--
-- 4. This script can be re-run safely any number of times.
-- =====================================================================