-- =============================================
-- ADMIN & SUBSCRIPTION MANAGEMENT
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add columns to profiles table (if not already there)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- =============================================
-- SUBSCRIPTION STATUS VALUES:
-- =============================================
-- 'subscribing'       = Paying subscriber (has access)
-- 'free subscription' = Free entry/giveaway (has access)
-- 'not subscribing'   = No subscription (NO access, must pay)
--
-- is_admin = TRUE means full access regardless of subscription
-- Only ssiagos@hotmail.com should be admin
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
    WHEN subscription_status = 'subscribing' THEN 'SUBSCRIBING'
    WHEN subscription_status = 'free subscription' THEN 'FREE SUBSCRIPTION'
    ELSE 'NOT SUBSCRIBING'
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
  subscription_status = 'subscribing' DESC,
  subscription_status = 'free subscription' DESC,
  created_at DESC;

-- =============================================
-- QUICK COUNTS
-- =============================================

SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admins,
  COUNT(*) FILTER (WHERE subscription_status = 'subscribing') as paying_subscribers,
  COUNT(*) FILTER (WHERE subscription_status = 'free subscription') as free_access,
  COUNT(*) FILTER (WHERE subscription_status = 'not subscribing' OR subscription_status IS NULL) as no_access
FROM profiles;

-- =============================================
-- MANAGE USERS
-- =============================================

-- MAKE ADMIN (full access, no payment needed):
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'user@example.com';

-- REMOVE ADMIN:
-- UPDATE profiles SET is_admin = FALSE WHERE email = 'user@example.com';

-- GIVE PAYING ACCESS (subscription_status = 'subscribing'):
-- UPDATE profiles SET subscription_status = 'subscribing', subscription_start = NOW() WHERE email = 'user@example.com';

-- GIVE FREE ACCESS (giveaway/promo):
-- UPDATE profiles SET subscription_status = 'free subscription', subscription_start = NOW() WHERE email = 'user@example.com';

-- REMOVE ACCESS:
-- UPDATE profiles SET subscription_status = 'not subscribing', subscription_end = NOW() WHERE email = 'user@example.com';
