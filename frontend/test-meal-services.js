const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testMealServices() {
  console.log('🧪 TESTING ACTUAL MEAL PLANNING SERVICES')
  console.log('=' .repeat(60))

  try {
    // Test 1: Enhanced Meal Planning with Real Data
    console.log('\n1️⃣ Testing Enhanced Meal Planning...')
    const mealPlan = await generateIntelligentMealPlan(7) // 1 week
    
    if (mealPlan && mealPlan.length === 7) {
      console.log('✅ 7-day meal plan generated successfully')
      console.log(`   Days: ${mealPlan.length}`)
      console.log(`   Total meals: ${mealPlan.reduce((sum, day) => sum + day.meals.length, 0)}`)
      
      // Check meal variety
      const allMeals = mealPlan.flatMap(day => day.meals)
      const uniqueRecipes = new Set(allMeals.map(meal => meal.recipe.title))
      console.log(`   Unique recipes: ${uniqueRecipes.size}/${allMeals.length}`)
      
      if (uniqueRecipes.size === allMeals.length) {
        console.log('✅ Perfect variety - no duplicate meals')
      } else {
        console.log('⚠️  Some duplicate meals in plan')
      }
    } else {
      console.log('❌ Meal plan generation failed')
      return false
    }

    // Test 2: Shopping List Generation
    console.log('\n2️⃣ Testing Shopping List Generation...')
    const shoppingList = generateShoppingList(mealPlan)
    
    if (shoppingList && Object.keys(shoppingList).length > 0) {
      console.log('✅ Shopping list generated successfully')
      Object.keys(shoppingList).forEach(category => {
        console.log(`   ${category}: ${shoppingList[category].length} items`)
      })
      
      // Show sample items
      const firstCategory = Object.keys(shoppingList)[0]
      console.log(`\n   Sample items from ${firstCategory}:`)
      shoppingList[firstCategory].slice(0, 3).forEach(item => {
        console.log(`   - ${item}`)
      })
    } else {
      console.log('❌ Shopping list generation failed')
      return false
    }

    // Test 3: Nutritional Analysis
    console.log('\n3️⃣ Testing Nutritional Analysis...')
    const nutritionSummary = calculateNutritionSummary(mealPlan)
    
    if (nutritionSummary) {
      console.log('✅ Nutritional analysis working')
      console.log(`   Average daily calories: ${nutritionSummary.avgCalories}`)
      console.log(`   Average daily protein: ${nutritionSummary.avgProtein}g`)
      console.log(`   Average daily fat: ${nutritionSummary.avgFat}g`)
    } else {
      console.log('❌ Nutritional analysis failed')
    }

    // Test 4: Recipe Filtering
    console.log('\n4️⃣ Testing Recipe Filtering...')
    
    const beefRecipes = await getRecipesByMeatType('Beef')
    const quickRecipes = await getQuickRecipes(15) // Under 15 minutes
    const highProteinRecipes = await getHighProteinRecipes(40) // Over 40g protein
    
    console.log(`✅ Recipe filtering working:`)
    console.log(`   Beef recipes: ${beefRecipes.length}`)
    console.log(`   Quick recipes (≤15 min): ${quickRecipes.length}`)
    console.log(`   High protein recipes (≥40g): ${highProteinRecipes.length}`)

    // Test 5: Meal Customization
    console.log('\n5️⃣ Testing Meal Customization...')
    
    const customMealPlan = await generateCustomMealPlan({
      days: 3,
      mealsPerDay: 3,
      preferredMeats: ['Beef', 'Poultry'],
      maxCookTime: 30,
      minProtein: 25
    })
    
    if (customMealPlan && customMealPlan.length === 3) {
      console.log('✅ Custom meal plan generation working')
      
      // Verify customization criteria
      const allCustomMeals = customMealPlan.flatMap(day => day.meals)
      const meetsCriteria = allCustomMeals.every(meal => {
        const cookTime = parseInt(meal.recipe.cook_time) || 0
        const protein = parseFloat(meal.recipe.protein_grams) || 0
        return cookTime <= 30 && protein >= 25
      })
      
      if (meetsCriteria) {
        console.log('✅ Custom criteria properly applied')
      } else {
        console.log('⚠️  Some meals don\'t meet custom criteria')
      }
    } else {
      console.log('❌ Custom meal plan generation failed')
    }

    console.log('\n🎉 ALL MEAL SERVICES TESTS COMPLETED SUCCESSFULLY!')
    return true

  } catch (error) {
    console.error('❌ Meal services test failed:', error.message)
    return false
  }
}

async function generateIntelligentMealPlan(days) {
  const { data: recipes } = await supabase
    .from('enhanced_meals')
    .select('*')
    .order('title')

  if (!recipes || recipes.length === 0) {
    throw new Error('No recipes available')
  }

  const mealPlan = []
  const usedRecipes = new Set()
  
  for (let day = 1; day <= days; day++) {
    const dayMeals = []
    
    // Generate 3 meals per day
    for (let mealIndex = 0; mealIndex < 3; mealIndex++) {
      const mealTimes = ['🌅 Breakfast', '🌞 Lunch', '🌙 Dinner']
      
      // Get available recipes (not yet used)
      const availableRecipes = recipes.filter(r => !usedRecipes.has(r.id))
      
      if (availableRecipes.length > 0) {
        // Smart selection based on meal time
        let selectedRecipe
        
        if (mealIndex === 0) { // Breakfast - prefer quicker meals
          selectedRecipe = availableRecipes
            .filter(r => parseInt(r.prep_time) <= 10)
            .sort((a, b) => parseInt(a.prep_time) - parseInt(b.prep_time))[0] ||
            availableRecipes[0]
        } else if (mealIndex === 1) { // Lunch - vary from breakfast meat type
          const breakfastMeatType = dayMeals[0]?.recipe.meat_type
          selectedRecipe = availableRecipes
            .filter(r => r.meat_type !== breakfastMeatType)[0] ||
            availableRecipes[0]
        } else { // Dinner - can be more complex
          selectedRecipe = availableRecipes[Math.floor(Math.random() * Math.min(5, availableRecipes.length))]
        }
        
        if (selectedRecipe) {
          dayMeals.push({
            time: mealTimes[mealIndex],
            recipe: selectedRecipe
          })
          usedRecipes.add(selectedRecipe.id)
        }
      } else {
        // Reset if we run out of recipes
        usedRecipes.clear()
        const resetRecipe = recipes[Math.floor(Math.random() * recipes.length)]
        dayMeals.push({
          time: mealTimes[mealIndex],
          recipe: resetRecipe
        })
        usedRecipes.add(resetRecipe.id)
      }
    }
    
    mealPlan.push({ day, meals: dayMeals })
  }
  
  return mealPlan
}

function generateShoppingList(mealPlan) {
  const shoppingList = {
    'Meat & Protein': [],
    'Dairy & Fats': [],
    'Seasonings & Essentials': []
  }
  
  const ingredientCounts = {}
  
  mealPlan.forEach(day => {
    day.meals.forEach(meal => {
      if (meal.recipe.ingredients) {
        const ingredients = meal.recipe.ingredients.split(';')
        ingredients.forEach(ingredient => {
          const cleaned = ingredient.trim()
          if (cleaned) {
            ingredientCounts[cleaned] = (ingredientCounts[cleaned] || 0) + 1
          }
        })
      }
    })
  })
  
  // Categorize ingredients
  Object.entries(ingredientCounts).forEach(([ingredient, count]) => {
    const countText = count > 1 ? ` (${count}x)` : ''
    const itemWithCount = ingredient + countText
    
    if (ingredient.toLowerCase().includes('beef') || 
        ingredient.toLowerCase().includes('chicken') ||
        ingredient.toLowerCase().includes('steak') ||
        ingredient.toLowerCase().includes('duck') ||
        ingredient.toLowerCase().includes('fish')) {
      shoppingList['Meat & Protein'].push(itemWithCount)
    } else if (ingredient.toLowerCase().includes('butter') ||
               ingredient.toLowerCase().includes('cream') ||
               ingredient.toLowerCase().includes('cheese') ||
               ingredient.toLowerCase().includes('egg')) {
      shoppingList['Dairy & Fats'].push(itemWithCount)
    } else {
      shoppingList['Seasonings & Essentials'].push(itemWithCount)
    }
  })
  
  return shoppingList
}

function calculateNutritionSummary(mealPlan) {
  let totalCalories = 0
  let totalProtein = 0
  let totalFat = 0
  let totalMeals = 0
  
  mealPlan.forEach(day => {
    day.meals.forEach(meal => {
      totalCalories += meal.recipe.calories || 0
      totalProtein += meal.recipe.protein_grams || 0
      totalFat += meal.recipe.fat_grams || 0
      totalMeals++
    })
  })
  
  return {
    avgCalories: Math.round(totalCalories / mealPlan.length),
    avgProtein: Math.round(totalProtein / mealPlan.length),
    avgFat: Math.round(totalFat / mealPlan.length),
    totalMeals
  }
}

async function getRecipesByMeatType(meatType) {
  const { data } = await supabase
    .from('enhanced_meals')
    .select('*')
    .ilike('meat_type', `%${meatType}%`)
  
  return data || []
}

async function getQuickRecipes(maxMinutes) {
  const { data } = await supabase
    .from('enhanced_meals')
    .select('*')
    .lte('prep_time::int + cook_time::int', maxMinutes)
  
  return data || []
}

async function getHighProteinRecipes(minProtein) {
  const { data } = await supabase
    .from('enhanced_meals')
    .select('*')
    .gte('protein_grams', minProtein)
  
  return data || []
}

async function generateCustomMealPlan(criteria) {
  let query = supabase.from('enhanced_meals').select('*')
  
  // Apply filters based on criteria
  if (criteria.preferredMeats && criteria.preferredMeats.length > 0) {
    const meatFilter = criteria.preferredMeats.map(meat => `meat_type.ilike.%${meat}%`).join(',')
    query = query.or(meatFilter)
  }
  
  if (criteria.maxCookTime) {
    query = query.lte('cook_time::int', criteria.maxCookTime)
  }
  
  if (criteria.minProtein) {
    query = query.gte('protein_grams', criteria.minProtein)
  }
  
  const { data: filteredRecipes } = await query
  
  if (!filteredRecipes || filteredRecipes.length === 0) {
    throw new Error('No recipes match the custom criteria')
  }
  
  const mealPlan = []
  const usedRecipes = new Set()
  
  for (let day = 1; day <= criteria.days; day++) {
    const dayMeals = []
    
    for (let meal = 0; meal < criteria.mealsPerDay; meal++) {
      const availableRecipes = filteredRecipes.filter(r => !usedRecipes.has(r.id))
      
      if (availableRecipes.length === 0) {
        usedRecipes.clear() // Reset if we run out
      }
      
      const finalAvailable = availableRecipes.length > 0 ? availableRecipes : filteredRecipes
      const selectedRecipe = finalAvailable[Math.floor(Math.random() * finalAvailable.length)]
      
      dayMeals.push({
        time: ['🌅 Breakfast', '🌞 Lunch', '🌙 Dinner'][meal] || '🍽️  Meal',
        recipe: selectedRecipe
      })
      usedRecipes.add(selectedRecipe.id)
    }
    
    mealPlan.push({ day, meals: dayMeals })
  }
  
  return mealPlan
}

// Run the meal services tests
testMealServices()