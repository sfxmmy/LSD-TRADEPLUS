-- =====================================================
-- LSDTRADE+ DATABASE SCHEMA v2
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

-- Drop existing tables (BE CAREFUL - this deletes all data!)
-- Uncomment these lines only if you want to start fresh:
-- DROP TABLE IF EXISTS trade_extras CASCADE;
-- DROP TABLE IF EXISTS notes CASCADE;
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
-- 'subscribing'       = Paying subscriber (has access)
-- 'free subscription' = Free entry/giveaway (has access)
-- 'not subscribing'   = No subscription (NO access, must pay)
--
-- is_admin = TRUE means full access regardless of subscription
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

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "accounts_all" ON accounts;
DROP POLICY IF EXISTS "trades_all" ON trades;
DROP POLICY IF EXISTS "trade_extras_all" ON trade_extras;
DROP POLICY IF EXISTS "notes_all" ON notes;

-- User can only access their own profile
CREATE POLICY "profiles_all" ON profiles
  FOR ALL USING (auth.uid() = id);

-- User can only access their own accounts
CREATE POLICY "accounts_all" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- User can only access trades in their accounts
CREATE POLICY "trades_all" ON trades
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- User can only access extras for their trades
CREATE POLICY "trade_extras_all" ON trade_extras
  FOR ALL USING (
    trade_id IN (
      SELECT t.id FROM trades t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- User can only access notes in their accounts
CREATE POLICY "notes_all" ON notes
  FOR ALL USING (
    account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  );

-- =====================================================
-- ADMIN POLICIES
-- Admins can view ALL data (for support/debugging)
-- =====================================================
DROP POLICY IF EXISTS "admin_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_accounts" ON accounts;
DROP POLICY IF EXISTS "admin_trades" ON trades;
DROP POLICY IF EXISTS "admin_trade_extras" ON trade_extras;
DROP POLICY IF EXISTS "admin_notes" ON notes;

CREATE POLICY "admin_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "admin_accounts" ON accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "admin_trades" ON trades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "admin_trade_extras" ON trade_extras
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "admin_notes" ON notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SET ADMIN
-- =====================================================
UPDATE profiles SET is_admin = TRUE WHERE email = 'ssiagos@hotmail.com';

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
-- HELPFUL VIEWS FOR ADMIN
-- These make it easy to see all user data organized
-- =====================================================

-- View: All users with their account count and trade count
DROP VIEW IF EXISTS admin_user_overview;
CREATE VIEW admin_user_overview AS
SELECT
  p.id as user_id,
  p.email,
  p.username,
  p.subscription_status,
  p.is_admin,
  p.created_at as joined,
  COUNT(DISTINCT a.id) as account_count,
  COUNT(DISTINCT t.id) as trade_count,
  COALESCE(SUM(t.pnl), 0) as total_pnl
FROM profiles p
LEFT JOIN accounts a ON a.user_id = p.id
LEFT JOIN trades t ON t.account_id = a.id
GROUP BY p.id, p.email, p.username, p.subscription_status, p.is_admin, p.created_at
ORDER BY p.created_at DESC;

-- View: All trades with user info (easy browsing)
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

-- =====================================================
-- GRANT VIEW ACCESS TO AUTHENTICATED USERS
-- (RLS will still filter based on admin status)
-- =====================================================
GRANT SELECT ON admin_user_overview TO authenticated;
GRANT SELECT ON admin_all_trades TO authenticated;
GRANT SELECT ON admin_all_accounts TO authenticated;
