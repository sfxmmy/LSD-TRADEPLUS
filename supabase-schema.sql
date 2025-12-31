-- =====================================================
-- LSDTRADE+ DATABASE SCHEMA
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Drop existing tables (BE CAREFUL - this deletes all data!)
-- Uncomment these lines only if you want to start fresh:
-- DROP TABLE IF EXISTS trades CASCADE;
-- DROP TABLE IF EXISTS accounts CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- PROFILES TABLE
-- Stores user information and subscription status
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  subscription_status TEXT DEFAULT 'not subscribing',
  is_admin BOOLEAN DEFAULT FALSE,
  customer_id TEXT,
  subscription_id TEXT,
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTION STATUS VALUES:
-- =====================================================
-- 'subscribing'      = Paying subscriber (has access)
-- 'free subscription' = Free entry/giveaway (has access)
-- 'not subscribing'  = No subscription (NO access, must pay)
--
-- is_admin = TRUE means full access regardless of subscription
-- Only ssiagos@hotmail.com should be admin
-- =====================================================

-- =====================================================
-- ACCOUNTS TABLE (Trading Journals)
-- Each user can have multiple trading journals
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  starting_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRADES TABLE
-- Individual trades within each journal
-- =====================================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT,
  pnl DECIMAL(12,2) DEFAULT 0,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),
  rr DECIMAL(5,2),
  risk DECIMAL(5,2),
  date DATE,
  direction TEXT CHECK (direction IN ('long', 'short')),
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- Ensures users can only access their own data
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "accounts_select" ON accounts;
DROP POLICY IF EXISTS "accounts_insert" ON accounts;
DROP POLICY IF EXISTS "accounts_update" ON accounts;
DROP POLICY IF EXISTS "accounts_delete" ON accounts;
DROP POLICY IF EXISTS "accounts_all" ON accounts;
DROP POLICY IF EXISTS "trades_select" ON trades;
DROP POLICY IF EXISTS "trades_insert" ON trades;
DROP POLICY IF EXISTS "trades_update" ON trades;
DROP POLICY IF EXISTS "trades_delete" ON trades;
DROP POLICY IF EXISTS "trades_all" ON trades;

-- Create new policies
CREATE POLICY "profiles_all" ON profiles
  FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "accounts_all" ON accounts
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "trades_all" ON trades
  FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Automatically creates a profile when a new user signs up
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, subscription_status, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'not subscribing',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SET ADMIN (only ssiagos@hotmail.com)
-- =====================================================
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

-- =====================================================
-- INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_customer ON profiles(customer_id);

-- =====================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to accounts
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
