const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function demonstrateEnhancedMealSystem() {
  console.log('🍖 ENHANCED CarnivoreApp - Professional Recipe Demo')
  console.log('=' .repeat(60))

  try {
    // Get all enhanced recipes
    console.log('\n📋 PROFESSIONAL RECIPES IN DATABASE:')
    console.log('-'.repeat(50))
    
    const { data: enhancedRecipes, error: recipesError } = await supabase
      .from('enhanced_meals')
      .select('*')
      .order('title')
    
    if (recipesError) {
      console.log('❌ Error fetching enhanced recipes:', recipesError.message)
      return
    }

    console.log(`✅ Found ${enhancedRecipes.length} professional recipes\n`)

    // Display each recipe with full details
    enhancedRecipes.forEach((recipe, index) => {
      console.log(`${index + 1}. ${recipe.title}`)
      console.log(`   🥩 ${recipe.meat_type} | 🍳 ${recipe.cooking_method}`)
      console.log(`   ⏱️  ${recipe.prep_time} prep + ${recipe.cook_time} cook | 📊 ${recipe.difficulty_level}`)
      console.log(`   📊 ${recipe.calories} cal | ${recipe.protein_grams}g protein | ${recipe.fat_grams}g fat`)
      console.log(`   🛒 Ingredients: ${recipe.ingredients}`)
      console.log(`   📝 Instructions: ${recipe.instructions.substring(0, 100)}...`)
      console.log('')
    })

    // Create intelligent meal plan with variety
    console.log('\n🗓️ INTELLIGENT MEAL PLAN GENERATION')
    console.log('=' .repeat(55))
    
    // Smart meal planning - vary by meat type and cooking method
    const mealPlan = generateIntelligentMealPlan(enhancedRecipes)
    
    mealPlan.forEach(day => {
      console.log(`\n📅 Day ${day.day}:`)
      
      day.meals.forEach(meal => {
        console.log(`   ${meal.time}: ${meal.recipe.title}`)
        console.log(`     🥩 ${meal.recipe.meat_type} | 🍳 ${meal.recipe.cooking_method}`)
        console.log(`     ⏱️  Total: ${getTotalCookTime(meal.recipe)} | 📊 ${meal.recipe.calories} cal, ${meal.recipe.protein_grams}g protein`)
        console.log(`     🛒 Ingredients: ${meal.recipe.ingredients}`)
      })
      
      const dailyCalories = day.meals.reduce((sum, meal) => sum + meal.recipe.calories, 0)
      const dailyProtein = day.meals.reduce((sum, meal) => sum + meal.recipe.protein_grams, 0)
      console.log(`   📊 Daily Totals: ${dailyCalories} calories, ${dailyProtein}g protein`)
    })

    // Generate enhanced shopping list
    console.log('\n\n🛒 INTELLIGENT SHOPPING LIST')
    console.log('=' .repeat(50))
    
    const shoppingList = generateEnhancedShoppingList(mealPlan)
    
    Object.keys(shoppingList).forEach(category => {
      console.log(`\n📦 ${category}:`)
      shoppingList[category].forEach(item => {
        console.log(`   • ${item.quantity} ${item.unit} ${item.ingredient}`)
        if (item.notes) {
          console.log(`     ${item.notes}`)
        }
      })
    })

    // Show meal prep suggestions
    console.log('\n\n👨‍🍳 MEAL PREP INSIGHTS')
    console.log('=' .repeat(40))
    
    const prepInsights = generatePrepInsights(mealPlan)
    prepInsights.forEach(insight => {
      console.log(`${insight.icon} ${insight.tip}`)
    })
    
    console.log('\n✅ ENHANCED SYSTEM DEMO COMPLETE!')
    console.log('This is the professional-level experience your users will get! 🎉')
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message)
  }
}

function generateIntelligentMealPlan(recipes) {
  // Smart meal planning algorithm
  const mealPlan = []
  const usedRecipes = new Set()
  
  for (let day = 1; day <= 3; day++) {
    const dayMeals = []
    
    // Breakfast - prefer quicker prep
    const breakfastOptions = recipes.filter(r => 
      !usedRecipes.has(r.id) && 
      (parseInt(r.prep_time) <= 5 || r.cooking_method.includes('Pan'))
    )
    const breakfast = breakfastOptions[Math.floor(Math.random() * breakfastOptions.length)]
    if (breakfast) {
      dayMeals.push({ time: '🌅 Breakfast', recipe: breakfast })
      usedRecipes.add(breakfast.id)
    }
    
    // Lunch - vary meat type from breakfast
    const lunchOptions = recipes.filter(r => 
      !usedRecipes.has(r.id) && 
      r.meat_type !== breakfast?.meat_type
    )
    const lunch = lunchOptions[Math.floor(Math.random() * lunchOptions.length)]
    if (lunch) {
      dayMeals.push({ time: '🌞 Lunch', recipe: lunch })
      usedRecipes.add(lunch.id)
    }
    
    // Dinner - can be more complex
    const dinnerOptions = recipes.filter(r => !usedRecipes.has(r.id))
    const dinner = dinnerOptions[Math.floor(Math.random() * dinnerOptions.length)]
    if (dinner) {
      dayMeals.push({ time: '🌙 Dinner', recipe: dinner })
      usedRecipes.add(dinner.id)
    }
    
    mealPlan.push({ day, meals: dayMeals })
    
    // Reset some used recipes for variety if we're running low
    if (usedRecipes.size >= recipes.length - 1) {
      usedRecipes.clear()
    }
  }
  
  return mealPlan
}

function getTotalCookTime(recipe) {
  const prep = parseInt(recipe.prep_time) || 0
  const cook = parseInt(recipe.cook_time) || 0
  return `${prep + cook} mins`
}

function generateEnhancedShoppingList(mealPlan) {
  const ingredientMap = new Map()
  
  mealPlan.forEach(day => {
    day.meals.forEach(meal => {
      // Parse ingredients from the recipe
      if (meal.recipe.ingredients) {
        const ingredients = parseIngredients(meal.recipe.ingredients)
        
        ingredients.forEach(ingredient => {
          const key = ingredient.name.toLowerCase()
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)
            // Simple aggregation logic
            existing.quantity = existing.quantity + ingredient.quantity
            existing.recipes.push(meal.recipe.title)
          } else {
            ingredientMap.set(key, {
              ...ingredient,
              recipes: [meal.recipe.title]
            })
          }
        })
      }
    })
  })
  
  // Organize by category
  const shoppingList = {
    'Meat & Protein': [],
    'Seasonings & Spices': [],
    'Fats & Oils': []
  }
  
  ingredientMap.forEach(ingredient => {
    const category = categorizeIngredient(ingredient.name)
    shoppingList[category].push({
      ingredient: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      notes: `For: ${ingredient.recipes.join(', ')}`
    })
  })
  
  return shoppingList
}

function parseIngredients(ingredientString) {
  // Parse ingredients like "1 ribeye steak (about 10.5 oz/300 g); 1 tbsp butter; 2 tsp salt"
  const ingredients = []
  const parts = ingredientString.split(';')
  
  parts.forEach(part => {
    const trimmed = part.trim()
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(\w+)\s+(.+)/)
    
    if (match) {
      ingredients.push({
        quantity: parseFloat(match[1]),
        unit: match[2],
        name: match[3].replace(/\([^)]*\)/g, '').trim()
      })
    } else {
      // Fallback for complex ingredients
      ingredients.push({
        quantity: 1,
        unit: 'item',
        name: trimmed
      })
    }
  })
  
  return ingredients
}

function categorizeIngredient(ingredient) {
  const name = ingredient.toLowerCase()
  
  if (name.includes('steak') || name.includes('beef') || name.includes('chicken') || 
      name.includes('duck') || name.includes('tuna') || name.includes('salmon') ||
      name.includes('marrow')) {
    return 'Meat & Protein'
  }
  
  if (name.includes('salt') || name.includes('pepper') || name.includes('spice')) {
    return 'Seasonings & Spices'
  }
  
  if (name.includes('butter') || name.includes('oil') || name.includes('fat')) {
    return 'Fats & Oils'
  }
  
  return 'Other Ingredients'
}

function generatePrepInsights(mealPlan) {
  const insights = []
  
  // Analyze cooking methods
  const methods = new Map()
  mealPlan.forEach(day => {
    day.meals.forEach(meal => {
      const method = meal.recipe.cooking_method
      methods.set(method, (methods.get(method) || 0) + 1)
    })
  })
  
  if (methods.has('Pan-searing') && methods.get('Pan-searing') > 2) {
    insights.push({
      icon: '🍳',
      tip: 'You have multiple pan-seared meals - consider batch prepping with a large cast iron skillet'
    })
  }
  
  if (methods.has('Baking')) {
    insights.push({
      icon: '🔥',
      tip: 'Baked items can be prepped in advance - consider making extra for leftovers'
    })
  }
  
  // Time-based insights
  const totalPrepTime = mealPlan.reduce((sum, day) => {
    return sum + day.meals.reduce((daySum, meal) => {
      return daySum + (parseInt(meal.recipe.prep_time) || 0) + (parseInt(meal.recipe.cook_time) || 0)
    }, 0)
  }, 0)
  
  insights.push({
    icon: '⏱️ ',
    tip: `Total cooking time for 3 days: ${totalPrepTime} minutes (${Math.round(totalPrepTime/60)} hours)`
  })
  
  return insights
}

demonstrateEnhancedMealSystem()