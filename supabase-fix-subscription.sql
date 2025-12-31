-- =====================================================
-- FIX SUBSCRIPTION SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================
-- subscription_status values:
-- 'admin'            = ssiagos@hotmail.com only
-- 'subscribing'      = paying monthly (has access)
-- 'free subscription' = free access (has access)
-- 'not subscribing'  = no subscription (NO access)
-- =====================================================

-- 1. DROP the plan column (we don't use it)
ALTER TABLE profiles DROP COLUMN IF EXISTS plan;

-- 2. DROP the is_admin column (we don't use it)
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- 3. Drop and recreate the handle_new_user function
-- New users start as 'not subscribing' (must pay to access)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, subscription_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'not subscribing'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Set admin
UPDATE profiles
SET subscription_status = 'admin'
WHERE email = 'ssiagos@hotmail.com';

-- 6. Set all other users to 'not subscribing' (unless they're already subscribing)
-- Only updates users who have invalid status values
UPDATE profiles
SET subscription_status = 'not subscribing'
WHERE email != 'ssiagos@hotmail.com'
  AND subscription_status NOT IN ('subscribing', 'free subscription', 'not subscribing');

-- Verify
SELECT email, subscription_status FROM profiles;
