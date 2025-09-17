-- Supabase SQL Script for Preferences System
-- Run this in your Supabase Dashboard > SQL Editor

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

-- Add Row Level Security (RLS) policies if needed
ALTER TABLE preference_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to manage their own data
CREATE POLICY "Users can view own preference profile" ON preference_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own preference profile" ON preference_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own preference profile" ON preference_profiles
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own onboarding responses" ON onboarding_responses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own onboarding responses" ON onboarding_responses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Test data validation
SELECT 'preference_profiles table created successfully' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'preference_profiles'
);

SELECT 'onboarding_responses table created successfully' as status
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'onboarding_responses'
);