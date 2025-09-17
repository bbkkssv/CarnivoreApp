-- CarnivoreApp Database Setup
-- Run this in your Supabase SQL Editor

-- Create enums
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
CREATE TYPE "NutritionalProfile" AS ENUM ('STRICT', 'LEANER', 'WITH_DAIRY', 'BUDGET');
CREATE TYPE "MealPlanStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'ARCHIVED');
CREATE TYPE "IntegrationStatus" AS ENUM ('PREPARED', 'SENT', 'FAILED');

-- Create Users table
CREATE TABLE "users" (
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
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- Create OnboardingResponse table
CREATE TABLE "onboarding_responses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "onboarding_responses_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create PreferenceProfile table  
CREATE TABLE "preference_profiles" (
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
    CONSTRAINT "preference_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "preference_profiles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "preference_profiles_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create Meals table
CREATE TABLE "meals" (
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
CREATE TABLE "meal_plans" (
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
    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meal_plans_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create MealPlanDay table (junction table)
CREATE TABLE "meal_plan_days" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "meal_id" TEXT NOT NULL,
    "meal_type" TEXT NOT NULL DEFAULT 'main',
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "meal_plan_days_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meal_plan_days_meal_plan_id_day_index_meal_type_key" 
        UNIQUE ("meal_plan_id", "day_index", "meal_type"),
    CONSTRAINT "meal_plan_days_meal_plan_id_fkey" 
        FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE,
    CONSTRAINT "meal_plan_days_meal_id_fkey" 
        FOREIGN KEY ("meal_id") REFERENCES "meals"("id")
);

-- Create ShoppingList table
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "export_formats" TEXT[] DEFAULT ARRAY['csv'],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shopping_lists_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "shopping_lists_meal_plan_id_fkey" 
        FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE
);

-- Create AdaptationLog table
CREATE TABLE "adaptation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT,
    "level" TEXT,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "adaptation_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "adaptation_logs_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create Subscription table
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "price_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renews_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id"),
    CONSTRAINT "subscriptions_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Add some sample meals for testing
INSERT INTO "meals" ("id", "name", "description", "ingredients", "portions", "macro_profile", "prep_effort_tag") VALUES 
('meal_001', 'Grilled Ribeye Steak', 'Classic ribeye steak grilled to perfection', 
 '{"main": [{"name": "ribeye steak", "amount": "8 oz", "unit": "piece"}], "seasoning": [{"name": "salt", "amount": "1 tsp", "unit": "tsp"}]}', 
 1, '{"protein": 56, "fat": 24, "calories": 464}', 'easy'),

('meal_002', 'Ground Beef Patties', 'Simple seasoned ground beef patties', 
 '{"main": [{"name": "ground beef", "amount": "1 lb", "unit": "lb"}], "seasoning": [{"name": "salt", "amount": "1 tsp", "unit": "tsp"}]}',
 4, '{"protein": 22, "fat": 20, "calories": 280}', 'easy'),

('meal_003', 'Baked Chicken Thighs', 'Crispy baked chicken thighs with skin', 
 '{"main": [{"name": "chicken thighs", "amount": "2 pieces", "unit": "piece"}], "seasoning": [{"name": "salt", "amount": "1 tsp", "unit": "tsp"}]}',
 1, '{"protein": 32, "fat": 18, "calories": 290}', 'medium'),

('meal_004', 'Pan-Seared Salmon', 'Fresh salmon fillet pan-seared in butter', 
 '{"main": [{"name": "salmon fillet", "amount": "6 oz", "unit": "piece"}], "fat": [{"name": "butter", "amount": "2 tbsp", "unit": "tbsp"}]}',
 1, '{"protein": 42, "fat": 28, "calories": 410}', 'medium'),

('meal_005', 'Beef Liver', 'Nutritious beef liver lightly seared', 
 '{"main": [{"name": "beef liver", "amount": "4 oz", "unit": "piece"}], "fat": [{"name": "tallow", "amount": "1 tbsp", "unit": "tbsp"}]}',
 1, '{"protein": 30, "fat": 8, "calories": 185}', 'advanced');

-- Success message
SELECT 'Database setup completed successfully!' as message;