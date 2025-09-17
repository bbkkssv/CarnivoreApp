# Supabase Setup Instructions for Preferences System

## 1. Create Tables in Supabase Dashboard

Go to your Supabase Dashboard > SQL Editor and run this script:

```sql
-- Create preference_profiles table
CREATE TABLE IF NOT EXISTS preference_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE,
  allowed_meats JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_time_preference INTEGER DEFAULT 30,
  budget_range VARCHAR,
  cooking_skill VARCHAR DEFAULT 'beginner',
  nutritional_profile VARCHAR DEFAULT 'STRICT',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);

-- Create onboarding_responses table
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id ON onboarding_responses(user_id);

-- Enable Row Level Security (optional - for user data protection)
ALTER TABLE preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (optional)
CREATE POLICY "Users can manage own preference profile" ON preference_profiles
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own onboarding responses" ON onboarding_responses
    FOR ALL USING (auth.uid()::text = user_id);
```

## 2. Verify Tables Were Created

After running the SQL, verify the tables exist:

```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('preference_profiles', 'onboarding_responses')
ORDER BY table_name, ordinal_position;
```

## 3. Test Basic Operations

Run this test query to ensure everything works:

```sql
-- Test insert
INSERT INTO preference_profiles (user_id, allowed_meats, prep_time_preference) 
VALUES ('test_user', '["Beef", "Lamb"]'::jsonb, 30);

-- Test select
SELECT * FROM preference_profiles WHERE user_id = 'test_user';

-- Test update
UPDATE preference_profiles 
SET prep_time_preference = 45 
WHERE user_id = 'test_user';

-- Clean up
DELETE FROM preference_profiles WHERE user_id = 'test_user';
```

## 4. Remove Prisma Dependency

Once tables are created and tested, you can safely:

1. Remove Prisma from package.json:
   ```bash
   npm uninstall prisma @prisma/client
   ```

2. Delete Prisma-related files:
   - `prisma/` folder
   - `prisma.schema` file (if exists)

3. Update environment variables (remove Prisma-related ones)

## 5. Final System Test

Run the comprehensive test again to ensure 100% functionality:

```bash
node comprehensive-test.js
```

Your system should now be 100% functional with Supabase only! 🎉