-- =====================================================
-- LSDTRADE+ DATABASE SCHEMA v3
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLE STRUCTURE OVERVIEW:
--
-- profiles (users)
--   └── accounts (trading journals)
--         ├── trades (individual trades)
--         ├── trade_extras (custom fields for each trade)
--         └── notes (daily/weekly journal entries)
-- =====================================================



-- =====================================================
-- PROFILES TABLE
-- Stores user information and subscription status
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  subscription_status TEXT DEFAULT 'not subscribing',
  customer_id TEXT,
  subscription_id TEXT,
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing profiles table (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE profiles ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'customer_id') THEN
    ALTER TABLE profiles ADD COLUMN customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_id') THEN
    ALTER TABLE profiles ADD COLUMN subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_start') THEN
    ALTER TABLE profiles ADD COLUMN subscription_start TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_end') THEN
    ALTER TABLE profiles ADD COLUMN subscription_end TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cancelled_at') THEN
    ALTER TABLE profiles ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- =====================================================
-- SUBSCRIPTION STATUS VALUES (IMPORTANT!)
-- =====================================================
-- 'admin'            = Full admin access (can see ALL data)
-- 'subscribing'      = Paying subscriber (has access)
-- 'free trial'       = 7-day free trial (has access, one per email)
-- 'free subscription'= Free entry/giveaway (has access)
-- 'not subscribing'  = No subscription (NO access, redirect to pricing)
-- 'past_due'         = Payment failed (NO access until resolved)
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
  profit_target DECIMAL(5,2) DEFAULT NULL,
  max_drawdown DECIMAL(5,2) DEFAULT NULL,
  custom_inputs JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing accounts table (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'profit_target') THEN
    ALTER TABLE accounts ADD COLUMN profit_target DECIMAL(5,2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'max_drawdown') THEN
    ALTER TABLE accounts ADD COLUMN max_drawdown DECIMAL(5,2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'custom_inputs') THEN
    ALTER TABLE accounts ADD COLUMN custom_inputs JSONB DEFAULT NULL;
  END IF;
END $$;

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
-- TRADE_EXTRAS TABLE
-- Custom fields for each trade (session, confidence, etc.)
-- Stored as JSON for flexibility
-- =====================================================
CREATE TABLE IF NOT EXISTS trade_extras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL UNIQUE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTES TABLE
-- Daily/weekly journal entries for each account
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('daily', 'weekly', 'monthly', 'general')) DEFAULT 'general',
  title TEXT,
  content TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- Ensures users can only access their own data
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- This catches all common policy naming patterns
-- =====================================================

-- First, dynamically drop ALL policies on each table (catches any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on profiles
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
  -- Drop all policies on accounts
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'accounts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON accounts', pol.policyname);
  END LOOP;
  -- Drop all policies on trades
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'trades' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trades', pol.policyname);
  END LOOP;
  -- Drop all policies on trade_extras
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'trade_extras' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trade_extras', pol.policyname);
  END LOOP;
  -- Drop all policies on notes
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON notes', pol.policyname);
  END LOOP;
END $$;

-- Drop the admin function if exists (will recreate below)
DROP FUNCTION IF EXISTS is_admin();

-- Also drop by common names (backup approach)
-- Profiles policies
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "admin_profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Accounts policies
DROP POLICY IF EXISTS "accounts_all" ON accounts;
DROP POLICY IF EXISTS "admin_accounts" ON accounts;
DROP POLICY IF EXISTS "Users can read own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
DROP POLICY IF EXISTS "Enable read access for users" ON accounts;

-- Trades policies
DROP POLICY IF EXISTS "trades_all" ON trades;
DROP POLICY IF EXISTS "admin_trades" ON trades;
DROP POLICY IF EXISTS "Users can read own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP POLICY IF EXISTS "Enable read access for users" ON trades;

-- Trade extras policies
DROP POLICY IF EXISTS "trade_extras_all" ON trade_extras;
DROP POLICY IF EXISTS "admin_trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "Users can read own trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "Users can insert own trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "Users can update own trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "Users can delete own trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "Enable read access for users" ON trade_extras;

-- Notes policies
DROP POLICY IF EXISTS "notes_all" ON notes;
DROP POLICY IF EXISTS "admin_notes" ON notes;
DROP POLICY IF EXISTS "Users can read own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
DROP POLICY IF EXISTS "Enable read access for users" ON notes;

-- =====================================================
-- USER POLICIES
-- Users can only access their own data
-- =====================================================

-- Profiles: Users can access their own profile
CREATE POLICY "profiles_all" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Accounts: Users can access their own accounts
CREATE POLICY "accounts_all" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Trades: Users can access trades in their accounts
CREATE POLICY "trades_all" ON trades
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- Trade Extras: Users can access extras for their trades
CREATE POLICY "trade_extras_all" ON trade_extras
  FOR ALL USING (
    trade_id IN (
      SELECT t.id FROM trades t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Notes: Users can access notes in their accounts
CREATE POLICY "notes_all" ON notes
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- =====================================================
-- ADMIN CHECK FUNCTION
-- Uses SECURITY DEFINER to bypass RLS (prevents infinite recursion)
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND subscription_status = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- ADMIN POLICIES
-- Admins (subscription_status = 'admin') can view ALL data
-- Uses is_admin() function to prevent recursive RLS check
-- =====================================================

CREATE POLICY "admin_profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_accounts" ON accounts
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_trades" ON trades
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_trade_extras" ON trade_extras
  FOR SELECT USING (is_admin());

CREATE POLICY "admin_notes" ON notes
  FOR SELECT USING (is_admin());

-- =====================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Automatically creates a profile when a new user signs up
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, subscription_status)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trade_extras_updated_at ON trade_extras;
CREATE TRIGGER update_trade_extras_updated_at
  BEFORE UPDATE ON trade_extras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_trade_extras_trade_id ON trade_extras(trade_id);
CREATE INDEX IF NOT EXISTS idx_notes_account_id ON notes(account_id);
CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_customer ON profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_status);

-- =====================================================
-- ADMIN VIEWS (for easy browsing in admin panel)
-- =====================================================

-- View: All users with their account count and trade count
DROP VIEW IF EXISTS admin_user_overview;
CREATE VIEW admin_user_overview AS
SELECT
  p.id as user_id,
  p.email,
  p.username,
  p.subscription_status,
  p.created_at as joined,
  COUNT(DISTINCT a.id) as account_count,
  COUNT(DISTINCT t.id) as trade_count,
  COALESCE(SUM(t.pnl), 0) as total_pnl
FROM profiles p
LEFT JOIN accounts a ON a.user_id = p.id
LEFT JOIN trades t ON t.account_id = a.id
GROUP BY p.id, p.email, p.username, p.subscription_status, p.created_at
ORDER BY p.created_at DESC;

-- View: All trades with user info
DROP VIEW IF EXISTS admin_all_trades;
CREATE VIEW admin_all_trades AS
SELECT
  p.email as user_email,
  p.username,
  a.name as account_name,
  t.*
FROM trades t
JOIN accounts a ON t.account_id = a.id
JOIN profiles p ON a.user_id = p.id
ORDER BY t.date DESC, t.created_at DESC;

-- View: All accounts with user info
DROP VIEW IF EXISTS admin_all_accounts;
CREATE VIEW admin_all_accounts AS
SELECT
  p.email as user_email,
  p.username,
  a.*,
  COUNT(t.id) as trade_count,
  COALESCE(SUM(t.pnl), 0) as total_pnl
FROM accounts a
JOIN profiles p ON a.user_id = p.id
LEFT JOIN trades t ON t.account_id = a.id
GROUP BY p.email, p.username, a.id
ORDER BY a.created_at DESC;

GRANT SELECT ON admin_user_overview TO authenticated;
GRANT SELECT ON admin_all_trades TO authenticated;
GRANT SELECT ON admin_all_accounts TO authenticated;

-- =====================================================
-- =====================================================
--        SET USER STATUS - QUICK COMMANDS
-- =====================================================
-- =====================================================
-- Copy and run these in Supabase SQL Editor to change
-- a user's subscription status. Replace the email.
-- =====================================================

-- ┌─────────────────────────────────────────────────┐
-- │  MAKE SOMEONE AN ADMIN                          │
-- └─────────────────────────────────────────────────┘
-- UPDATE profiles SET subscription_status = 'admin' WHERE email = 'user@example.com';

-- ┌─────────────────────────────────────────────────┐
-- │  GIVE FREE SUBSCRIPTION                         │
-- └─────────────────────────────────────────────────┘
-- UPDATE profiles SET subscription_status = 'free subscription' WHERE email = 'user@example.com';

-- ┌─────────────────────────────────────────────────┐
-- │  SET AS PAYING SUBSCRIBER                       │
-- └─────────────────────────────────────────────────┘
-- UPDATE profiles SET subscription_status = 'subscribing' WHERE email = 'user@example.com';

-- ┌─────────────────────────────────────────────────┐
-- │  REMOVE ACCESS (send to pricing page)           │
-- └─────────────────────────────────────────────────┘
-- UPDATE profiles SET subscription_status = 'not subscribing' WHERE email = 'user@example.com';

-- =====================================================
-- CURRENT ADMINS - Uncomment and run to set admins
-- =====================================================
-- UPDATE profiles SET subscription_status = 'admin' WHERE email = 'ssiagos@hotmail.com';

-- =====================================================
-- SUPABASE STORAGE FOR TRADE IMAGES
-- =====================================================

-- Create the storage bucket for trade images
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-images', 'trade-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies (safe to run multiple times)
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for trade images" ON storage.objects;

-- Allow authenticated users to upload images to their own folder
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trade-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trade-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (images are public via URL)
CREATE POLICY "Public read access for trade images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trade-images');
