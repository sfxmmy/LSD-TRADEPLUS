-- LSDTRADE+ DATABASE SCHEMA
-- Run this in Supabase SQL Editor

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  subscription_status TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCOUNTS (Journals)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  starting_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRADES
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT,
  pnl DECIMAL(12,2) DEFAULT 0,
  outcome TEXT,
  rr DECIMAL(5,2),
  date DATE,
  direction TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "profiles_all" ON profiles;
DROP POLICY IF EXISTS "accounts_all" ON accounts;
DROP POLICY IF EXISTS "trades_all" ON trades;

CREATE POLICY "profiles_all" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "accounts_all" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trades_all" ON trades FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

-- Trigger for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, subscription_status)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 
    CASE WHEN NEW.email = 'ssiagos@hotmail.com' THEN 'active' ELSE 'free' END)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Give admin access
INSERT INTO profiles (id, email, username, subscription_status)
SELECT id, email, split_part(email, '@', 1), 'active' FROM auth.users WHERE email = 'ssiagos@hotmail.com'
ON CONFLICT (id) DO UPDATE SET subscription_status = 'active';
