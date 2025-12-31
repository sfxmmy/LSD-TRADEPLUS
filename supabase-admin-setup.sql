-- =============================================
-- ADMIN & SUBSCRIPTION MANAGEMENT
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- Step 2: Set existing admin
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

-- =============================================
-- VIEW ALL USERS (Easy Dashboard)
-- =============================================

-- Full user overview with subscription duration
SELECT
  email,
  subscription_status,
  plan,
  is_admin,
  subscription_start,
  subscription_end,
  -- Calculate days subscribed
  CASE
    WHEN subscription_start IS NOT NULL THEN
      EXTRACT(DAY FROM (COALESCE(subscription_end, NOW()) - subscription_start))::INT
    ELSE 0
  END as days_subscribed,
  -- Calculate months subscribed
  CASE
    WHEN subscription_start IS NOT NULL THEN
      ROUND(EXTRACT(DAY FROM (COALESCE(subscription_end, NOW()) - subscription_start)) / 30.0, 1)
    ELSE 0
  END as months_subscribed,
  created_at as account_created,
  stripe_customer_id
FROM profiles
ORDER BY created_at DESC;

-- =============================================
-- QUICK FILTERS
-- =============================================

-- Only paying subscribers
SELECT email, plan, subscription_status, subscription_start,
  EXTRACT(DAY FROM (NOW() - subscription_start))::INT as days_subscribed
FROM profiles
WHERE subscription_status = 'active' AND is_admin = FALSE
ORDER BY subscription_start DESC;

-- Only admins
SELECT email, is_admin, created_at FROM profiles WHERE is_admin = TRUE;

-- Free users (potential conversions)
SELECT email, created_at,
  EXTRACT(DAY FROM (NOW() - created_at))::INT as days_since_signup
FROM profiles
WHERE subscription_status = 'free' OR subscription_status IS NULL
ORDER BY created_at DESC;

-- Churned users (cancelled/expired)
SELECT email, plan, subscription_status, subscription_end,
  EXTRACT(DAY FROM (NOW() - subscription_end))::INT as days_since_cancelled
FROM profiles
WHERE subscription_status IN ('cancelled', 'expired')
ORDER BY subscription_end DESC;

-- =============================================
-- STATS SUMMARY
-- =============================================

SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscribers,
  COUNT(*) FILTER (WHERE subscription_status = 'free' OR subscription_status IS NULL) as free_users,
  COUNT(*) FILTER (WHERE subscription_status IN ('cancelled', 'expired')) as churned,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admins,
  COUNT(*) FILTER (WHERE plan = 'lifetime') as lifetime_members
FROM profiles;

-- =============================================
-- MANAGE USERS
-- =============================================

-- Make a user an admin:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'user@example.com';

-- Remove admin access:
-- UPDATE profiles SET is_admin = FALSE WHERE email = 'user@example.com';

-- Give a user paid access (lifetime):
-- UPDATE profiles SET
--   subscription_status = 'active',
--   plan = 'lifetime',
--   subscription_start = NOW()
-- WHERE email = 'user@example.com';

-- Give a user paid access (monthly):
-- UPDATE profiles SET
--   subscription_status = 'active',
--   plan = 'monthly',
--   subscription_start = NOW(),
--   subscription_end = NOW() + INTERVAL '1 month'
-- WHERE email = 'user@example.com';

-- Remove paid access:
-- UPDATE profiles SET
--   subscription_status = 'free',
--   plan = 'free',
--   subscription_end = NOW()
-- WHERE email = 'user@example.com';

-- =============================================
-- ADD NEW USER (after creating in Auth)
-- =============================================

-- Add benmw2020@gmail.com as admin with active subscription:
INSERT INTO profiles (id, email, subscription_status, plan, is_admin, subscription_start)
SELECT id, email, 'active', 'lifetime', TRUE, NOW()
FROM auth.users
WHERE email = 'benmw2020@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'active',
  plan = 'lifetime',
  is_admin = TRUE,
  subscription_start = COALESCE(profiles.subscription_start, NOW());
