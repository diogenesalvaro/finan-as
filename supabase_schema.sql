-- SQL Migration Script for FamíliaFinanças on Supabase

-- 1. Create Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  family_id UUID,
  role TEXT CHECK (role IN ('admin', 'member')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Families table
CREATE TABLE IF NOT EXISTS families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add foreign key from profiles to families
ALTER TABLE profiles 
  ADD CONSTRAINT fk_family 
  FOREIGN KEY (family_id) 
  REFERENCES families(id) 
  ON DELETE SET NULL;

-- 4. Create Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  user_name TEXT,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  description TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  deadline TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Credit Cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  card_number_last4 TEXT,
  expiry_date TEXT,
  card_limit DECIMAL(12,2),
  current_balance DECIMAL(12,2) DEFAULT 0,
  color TEXT,
  type TEXT CHECK (type IN ('credit', 'debit')),
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

-- 8. Create basic RLS policies
-- (Simplified for initial setup, usually you'd check family_id)

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Families: Users can see the family they belong to
CREATE POLICY "Users can view their family" ON families FOR SELECT 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.family_id = families.id AND profiles.id = auth.uid()));

-- Transactions/Goals/Cards: Access based on family_id
CREATE POLICY "Users can manage their family's transactions" ON transactions 
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.family_id = transactions.family_id AND profiles.id = auth.uid()));

CREATE POLICY "Users can manage their family's goals" ON goals 
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.family_id = goals.family_id AND profiles.id = auth.uid()));

CREATE POLICY "Users can manage their family's cards" ON credit_cards 
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.family_id = credit_cards.family_id AND profiles.id = auth.uid()));
