const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Example recipe data structure based on your spreadsheet
const sampleRecipes = [
  {
    Title: 'Butter-Fried Ribeye Steak',
    MealOrSnack: 'Meal',
    MeatType: 'Beef',
    CookingMethod: 'Pan-searing',
    PrepTime: '5 mins',
    CookTime: '8 mins',
    StrictCarnivore: 'Yes',
    'Fat (g)': '62',
    'Protein (g)': '48',
    'Carbs (g)': '0',
    Ingredients: '1 ribeye steak (about 10.5 oz/300 g); 1 tbsp butter; 2 tsp salt',
    Instructions: 'Heat a skillet on high heat and melt the butter. Season the ribeye with salt. Sear the steak for 3–4 minutes on each side for medium-rare (cook longer if you prefer it more done). Baste with the melted butter during the last 2 minutes. Remove from heat and let the steak rest for 5 minutes. Slice and serve, adding salt to taste.'
  }
]

function parseRecipeRow(row) {
  // Convert spreadsheet row to database format
  return {
    id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: row.Title,
    meal_or_snack: row.MealOrSnack,
    meat_type: row.MeatType,
    cooking_method: row.CookingMethod,
    prep_time: row.PrepTime,
    cook_time: row.CookTime,
    strict_carnivore: row.StrictCarnivore === 'Yes',
    fat_grams: parseFloat(row['Fat (g)']) || 0,
    protein_grams: parseFloat(row['Protein (g)']) || 0,
    carbs_grams: parseFloat(row['Carbs (g)']) || 0,
    calories: calculateCalories(
      parseFloat(row['Fat (g)']),
      parseFloat(row['Protein (g)']),
      parseFloat(row['Carbs (g)'])
    ),
    ingredients: row.Ingredients,
    instructions: row.Instructions,
    difficulty_level: determineDifficulty(row.CookingMethod, row.PrepTime),
    serving_size: 1
  }
}

function calculateCalories(fat, protein, carbs) {
  // 9 cal/g fat, 4 cal/g protein, 4 cal/g carbs
  return Math.round((fat * 9) + (protein * 4) + (carbs * 4))
}

function determineDifficulty(cookingMethod, prepTime) {
  const prepMinutes = parseInt(prepTime) || 0
  
  if (cookingMethod?.includes('Baking') || prepMinutes > 30) return 'Advanced'
  if (cookingMethod?.includes('Pan-frying') || prepMinutes > 10) return 'Medium'
  return 'Easy'
}

async function importRecipes(recipes) {
  console.log('🍖 Starting Recipe Import...')
  console.log(`📊 Processing ${recipes.length} recipes`)
  
  for (const recipe of recipes) {
    try {
      const parsedRecipe = parseRecipeRow(recipe)
      
      console.log(`\n📝 Importing: ${parsedRecipe.title}`)
      console.log(`   Meat Type: ${parsedRecipe.meat_type}`)
      console.log(`   Method: ${parsedRecipe.cooking_method}`)
      console.log(`   Macros: ${parsedRecipe.fat_grams}g fat, ${parsedRecipe.protein_grams}g protein`)
      console.log(`   Calories: ${parsedRecipe.calories}`)
      
      const { data, error } = await supabase
        .from('enhanced_meals')
        .insert([parsedRecipe])
        .select()
      
      if (error) {
        console.log(`   ❌ Failed: ${error.message}`)
      } else {
        console.log(`   ✅ Success: Recipe imported with ID ${data[0].id}`)
      }
      
    } catch (err) {
      console.log(`   ❌ Error processing recipe: ${err.message}`)
    }
  }
  
  console.log('\n🎉 Import Complete!')
}

async function testEnhancedRecipeStructure() {
  console.log('🧪 Testing Enhanced Recipe Structure')
  console.log('=' .repeat(50))
  
  // Import sample recipes
  await importRecipes(sampleRecipes)
  
  // Test retrieval with new structure
  console.log('\n🔍 Testing Recipe Retrieval...')
  
  const { data: enhancedMeals, error } = await supabase
    .from('enhanced_meals')
    .select('*')
    .limit(5)
  
  if (error) {
    console.log('❌ Error fetching enhanced meals:', error.message)
    return
  }
  
  console.log(`✅ Retrieved ${enhancedMeals.length} enhanced recipes:`)
  
  enhancedMeals.forEach((meal, index) => {
    console.log(`\n${index + 1}. ${meal.title}`)
    console.log(`   Type: ${meal.meal_or_snack} | Meat: ${meal.meat_type}`)
    console.log(`   Method: ${meal.cooking_method}`)
    console.log(`   Time: ${meal.prep_time} prep + ${meal.cook_time} cook`)
    console.log(`   Macros: ${meal.fat_grams}g fat, ${meal.protein_grams}g protein, ${meal.calories} cal`)
    console.log(`   Strict Carnivore: ${meal.strict_carnivore ? 'Yes' : 'No'}`)
    console.log(`   Ingredients: ${meal.ingredients.substring(0, 80)}...`)
    console.log(`   Instructions: ${meal.instructions.substring(0, 100)}...`)
  })
}

// Function to create sample meal plan with enhanced recipes
async function createSampleMealPlanWithEnhancedRecipes() {
  console.log('\n\n🗓️ CREATING ENHANCED MEAL PLAN DEMO')
  console.log('=' .repeat(50))
  
  // Get recipes by meat type for variety
  const { data: beefRecipes } = await supabase
    .from('enhanced_meals')
    .select('*')
    .eq('meat_type', 'Beef')
    .limit(2)
  
  const { data: otherRecipes } = await supabase
    .from('enhanced_meals')
    .select('*')
    .neq('meat_type', 'Beef')
    .limit(3)
  
  const allRecipes = [...(beefRecipes || []), ...(otherRecipes || [])]
  
  if (allRecipes.length === 0) {
    console.log('❌ No enhanced recipes found. Run the database schema update first.')
    return
  }
  
  console.log('\n📋 ENHANCED MEAL PLAN - Day 1:')
  console.log('-'.repeat(40))
  
  allRecipes.slice(0, 3).forEach((recipe, index) => {
    const mealTimes = ['Breakfast', 'Lunch', 'Dinner']
    console.log(`\n${mealTimes[index]}: ${recipe.title}`)
    console.log(`  🥩 ${recipe.meat_type} | 🍳 ${recipe.cooking_method}`)
    console.log(`  ⏱️  ${recipe.prep_time} prep + ${recipe.cook_time} cook`)
    console.log(`  📊 ${recipe.calories} cal | ${recipe.protein_grams}g protein | ${recipe.fat_grams}g fat`)
    console.log(`  🛒 Ingredients: ${recipe.ingredients}`)
    console.log(`  📝 Instructions: ${recipe.instructions.substring(0, 150)}...`)
  })
}

// Run the test
if (require.main === module) {
  testEnhancedRecipeStructure()
    .then(() => createSampleMealPlanWithEnhancedRecipes())
    .catch(console.error)
}

module.exports = { importRecipes, parseRecipeRow }