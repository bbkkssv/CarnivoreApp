// Database setup script using Supabase client
// This creates the tables using SQL through the Supabase client
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Setting up database using Supabase client...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// SQL to create our tables (generated from Prisma schema)
const createTablesSQL = `
-- Create enums
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
CREATE TYPE "NutritionalProfile" AS ENUM ('STRICT', 'LEANER', 'WITH_DAIRY', 'BUDGET');
CREATE TYPE "MealPlanStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'ARCHIVED');
CREATE TYPE "IntegrationStatus" AS ENUM ('PREPARED', 'SENT', 'FAILED');

-- Create Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "age_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "consent_status" TEXT NOT NULL DEFAULT 'pending',
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Create OnboardingResponse table
CREATE TABLE IF NOT EXISTS "onboarding_responses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- Create PreferenceProfile table
CREATE TABLE IF NOT EXISTS "preference_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "allowed_meats" TEXT[],
    "exclusions" TEXT[],
    "prep_time_preference" INTEGER NOT NULL DEFAULT 30,
    "budget_range" TEXT,
    "cooking_skill" TEXT DEFAULT 'beginner',
    "nutritional_profile" "NutritionalProfile" NOT NULL DEFAULT 'STRICT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preference_profiles_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on user_id for preference_profiles
CREATE UNIQUE INDEX IF NOT EXISTS "preference_profiles_user_id_key" ON "preference_profiles"("user_id");

-- Create Meals table
CREATE TABLE IF NOT EXISTS "meals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" JSONB NOT NULL,
    "portions" INTEGER NOT NULL DEFAULT 1,
    "macro_profile" JSONB NOT NULL,
    "prep_effort_tag" TEXT NOT NULL DEFAULT 'easy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- Create MealPlans table
CREATE TABLE IF NOT EXISTS "meal_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "constraints_summary" TEXT,
    "status" "MealPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "regeneration_count" JSONB NOT NULL DEFAULT '{}',
    "history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "onboarding_responses" ADD CONSTRAINT "onboarding_responses_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`

async function setupDatabase() {
  try {
    console.log('Executing database setup...')
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    
    if (error) {
      console.log('Trying direct SQL execution...')
      // If RPC doesn't work, try a simpler approach
      const { data: simpleTest, error: simpleError } = await supabase
        .from('pg_tables')
        .select('*')
        .limit(1)
        
      if (simpleError) {
        console.log('❌ Database access error:', simpleError.message)
        return false
      }
      
      console.log('✅ Database connection verified, but table creation needs manual setup')
      console.log('Please run the SQL commands manually in your Supabase SQL editor')
      return false
    }
    
    console.log('✅ Database setup completed successfully!')
    return true
    
  } catch (err) {
    console.log('❌ Setup failed:', err.message)
    return false
  }
}

setupDatabase()
  .then((success) => {
    if (success) {
      console.log('Database is ready!')
    } else {
      console.log('Manual setup required - check Supabase dashboard SQL editor')
    }
    process.exit(0)
  })
  .catch(err => {
    console.error('Setup error:', err)
    process.exit(1)
  })