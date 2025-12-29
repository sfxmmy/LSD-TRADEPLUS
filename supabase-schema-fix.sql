-- =====================================================
-- LSDTRADE+ SCHEMA FIX
-- Run this in Supabase SQL Editor to fix the security issue
-- =====================================================

-- FIX 1: Change default subscription_status from 'active' to 'free'
ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'free';

-- FIX 2: Update handle_new_user function to use 'free' instead of 'active'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, subscription_status)
  VALUES (NEW.id, NEW.email, 'free');  -- Changed from 'active' to 'free'
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIX 3: Update any users who were incorrectly set to 'active' without paying
-- This finds users with 'active' status but no customer_id (never paid)
-- BE CAREFUL: Review the results before uncommenting the UPDATE
-- SELECT * FROM profiles WHERE subscription_status = 'active' AND customer_id IS NULL;

-- Uncomment to fix (after reviewing):
-- UPDATE profiles SET subscription_status = 'free'
-- WHERE subscription_status = 'active'
-- AND customer_id IS NULL
-- AND email != 'ssiagos@hotmail.com';

-- =====================================================
-- VERIFICATION: Run these to check your setup
-- =====================================================

-- Check current default
-- SELECT column_default FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'subscription_status';

-- Check function definition
-- SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
