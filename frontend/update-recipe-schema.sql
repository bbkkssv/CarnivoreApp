-- Updated recipe schema to match your actual recipe structure
-- This will replace the current simple meals table

-- First, let's backup the current structure and create a new enhanced one
-- Run this in your Supabase SQL editor

-- Drop the current simplified meals table (after backing up if needed)
-- DROP TABLE IF EXISTS meals CASCADE;

-- Create enhanced meals table that matches your recipe spreadsheet structure
CREATE TABLE IF NOT EXISTS enhanced_meals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    meal_or_snack TEXT CHECK (meal_or_snack IN ('Meal', 'Snack')),
    meat_type TEXT,
    cooking_method TEXT,
    prep_time TEXT,
    cook_time TEXT,
    strict_carnivore BOOLEAN DEFAULT true,
    
    -- Macros as individual fields for easier querying
    fat_grams DECIMAL(5,2),
    protein_grams DECIMAL(5,2),
    carbs_grams DECIMAL(5,2) DEFAULT 0,
    calories INTEGER,
    
    -- Ingredients as structured text (we'll parse this properly)
    ingredients TEXT NOT NULL,
    
    -- Full cooking instructions
    instructions TEXT NOT NULL,
    
    -- Additional metadata
    difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Advanced')) DEFAULT 'Medium',
    serving_size INTEGER DEFAULT 1,
    prep_effort_category TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_enhanced_meals_meat_type ON enhanced_meals(meat_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_meals_cooking_method ON enhanced_meals(cooking_method);
CREATE INDEX IF NOT EXISTS idx_enhanced_meals_strict_carnivore ON enhanced_meals(strict_carnivore);
CREATE INDEX IF NOT EXISTS idx_enhanced_meals_meal_or_snack ON enhanced_meals(meal_or_snack);

-- Insert your example recipe to test the structure
INSERT INTO enhanced_meals (
    id,
    title,
    meal_or_snack,
    meat_type,
    cooking_method,
    prep_time,
    cook_time,
    strict_carnivore,
    fat_grams,
    protein_grams,
    carbs_grams,
    ingredients,
    instructions,
    difficulty_level
) VALUES (
    'enhanced_meal_001',
    'Butter-Fried Ribeye Steak',
    'Meal',
    'Beef',
    'Pan-searing',
    '5 mins',
    '8 mins',
    true,
    62.0,
    48.0,
    0.0,
    '1 ribeye steak (about 10.5 oz/300 g); 1 tbsp butter; 2 tsp salt',
    'Heat a skillet on high heat and melt the butter. Season the ribeye with salt. Sear the steak for 3–4 minutes on each side for medium-rare (cook longer if you prefer it more done). Baste with the melted butter during the last 2 minutes. Remove from heat and let the steak rest for 5 minutes. Slice and serve, adding salt to taste.',
    'Medium'
);

-- Create a view for backward compatibility with existing services if needed
CREATE OR REPLACE VIEW meals_legacy AS
SELECT 
    id,
    title as name,
    SUBSTRING(instructions, 1, 100) || '...' as description,
    jsonb_build_object(
        'ingredients', ingredients,
        'prep_time', prep_time,
        'cook_time', cook_time
    ) as ingredients,
    serving_size as portions,
    jsonb_build_object(
        'fat', fat_grams,
        'protein', protein_grams,
        'calories', COALESCE(calories, (fat_grams * 9 + protein_grams * 4)::integer)
    ) as macro_profile,
    CASE 
        WHEN difficulty_level = 'Easy' THEN 'easy'
        WHEN difficulty_level = 'Advanced' THEN 'advanced' 
        ELSE 'medium'
    END as prep_effort_tag,
    created_at
FROM enhanced_meals;