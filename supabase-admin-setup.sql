-- =============================================
-- ADMIN & SUBSCRIPTION MANAGEMENT
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- =============================================
-- SUBSCRIPTION STATUS VALUES:
-- =============================================
-- 'active'  = Paying subscriber (has access)
-- 'free'    = Free entry/giveaway (has access)
-- 'none'    = No subscription (NO access, must pay)
-- NULL      = New user, no subscription yet (NO access)
--
-- is_admin = TRUE means full access regardless of subscription
-- =============================================

-- Step 2: Set ssiagos as admin
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

-- =============================================
-- VIEW ALL USERS
-- =============================================

SELECT
  email,
  CASE
    WHEN is_admin = TRUE THEN 'ADMIN'
    WHEN subscription_status = 'active' THEN 'PAYING'
    WHEN subscription_status = 'free' THEN 'FREE ACCESS'
    ELSE 'NO ACCESS'
  END as access_level,
  subscription_status,
  is_admin,
  subscription_start,
  CASE
    WHEN subscription_start IS NOT NULL THEN
      EXTRACT(DAY FROM (COALESCE(subscription_end, NOW()) - subscription_start))::INT
    ELSE 0
  END as days_subscribed,
  created_at
FROM profiles
ORDER BY
  is_admin DESC,
  subscription_status = 'active' DESC,
  subscription_status = 'free' DESC,
  created_at DESC;

-- =============================================
-- QUICK COUNTS
-- =============================================

SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admins,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as paying_subscribers,
  COUNT(*) FILTER (WHERE subscription_status = 'free') as free_access,
  COUNT(*) FILTER (WHERE subscription_status = 'none' OR subscription_status IS NULL) as no_access
FROM profiles;

-- =============================================
-- MANAGE USERS
-- =============================================

-- MAKE ADMIN (full access, no payment needed):
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'user@example.com';

-- REMOVE ADMIN:
-- UPDATE profiles SET is_admin = FALSE WHERE email = 'user@example.com';

-- GIVE PAYING ACCESS (subscription_status = 'active'):
-- UPDATE profiles SET subscription_status = 'active', subscription_start = NOW() WHERE email = 'user@example.com';

-- GIVE FREE ACCESS (giveaway/promo):
-- UPDATE profiles SET subscription_status = 'free', subscription_start = NOW() WHERE email = 'user@example.com';

-- REMOVE ACCESS:
-- UPDATE profiles SET subscription_status = 'none', subscription_end = NOW() WHERE email = 'user@example.com';

-- =============================================
-- SETUP INITIAL ADMINS
-- =============================================

-- Set ssiagos as admin
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

-- Add benmw2020 as admin with free access (after creating in Auth → Users)
INSERT INTO profiles (id, email, subscription_status, is_admin, subscription_start)
SELECT id, email, 'free', TRUE, NOW()
FROM auth.users
WHERE email = 'benmw2020@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'free',
  is_admin = TRUE,
  subscription_start = COALESCE(profiles.subscription_start, NOW());
