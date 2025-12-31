-- =============================================
-- ADD ADMIN COLUMN TO PROFILES
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Set existing admin (ssiagos@hotmail.com) as admin
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

-- =============================================
-- VIEW ALL USERS WITH STATUS
-- =============================================

-- View all users with their subscription and admin status
SELECT
  email,
  subscription_status,
  plan,
  is_admin,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- =============================================
-- MANAGE USERS
-- =============================================

-- Make a user an admin:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'user@example.com';

-- Remove admin access:
-- UPDATE profiles SET is_admin = FALSE WHERE email = 'user@example.com';

-- Give a user paid access:
-- UPDATE profiles SET subscription_status = 'active', plan = 'lifetime' WHERE email = 'user@example.com';

-- Remove paid access:
-- UPDATE profiles SET subscription_status = 'free', plan = 'free' WHERE email = 'user@example.com';

-- =============================================
-- ADD NEW USER (after creating in Auth)
-- =============================================

-- Add benmw2020@gmail.com as admin with active subscription:
INSERT INTO profiles (id, email, subscription_status, plan, is_admin)
SELECT id, email, 'active', 'lifetime', TRUE
FROM auth.users
WHERE email = 'benmw2020@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'active',
  plan = 'lifetime',
  is_admin = TRUE;
