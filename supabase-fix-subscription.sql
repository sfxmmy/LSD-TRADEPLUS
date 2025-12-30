-- =====================================================
-- FIX: Only paid users can access
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop and recreate the handle_new_user function
-- New users now start as 'inactive' (unpaid)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, subscription_status, plan)
  VALUES (NEW.id, NEW.email, 'inactive', 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set your admin emails to active (these can access without paying)
UPDATE profiles
SET subscription_status = 'active', plan = 'lifetime'
WHERE email IN ('ssiagos@hotmail.com', 's891help@hotmail.com');

-- Set all OTHER users to inactive (they need to pay)
UPDATE profiles
SET subscription_status = 'inactive', plan = 'free'
WHERE email NOT IN ('ssiagos@hotmail.com', 's891help@hotmail.com');

-- Verify
SELECT email, subscription_status, plan FROM profiles;
