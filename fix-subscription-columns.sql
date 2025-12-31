-- =====================================================
-- MIGRATION: Fix subscription columns
-- Run this in Supabase SQL Editor to fix existing data
-- =====================================================

-- 1. Drop the 'plan' column if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS plan;

-- 2. Drop the 'is_admin' column if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- 3. Ensure ssiagos@hotmail.com has 'admin' status
UPDATE profiles
SET subscription_status = 'admin'
WHERE email = 'ssiagos@hotmail.com';

-- 4. Fix any NULL subscription_status values
UPDATE profiles
SET subscription_status = 'not subscribing'
WHERE subscription_status IS NULL;

-- =====================================================
-- SUBSCRIPTION STATUS VALUES (after migration):
-- =====================================================
-- 'admin'            = Admin user (ssiagos@hotmail.com only)
-- 'subscribing'      = Paying monthly subscriber (has access)
-- 'free subscription' = Free access without paying (has access)
-- 'not subscribing'  = No subscription (NO access, must pay)
-- =====================================================

-- Verify the changes
SELECT email, subscription_status FROM profiles ORDER BY email;
