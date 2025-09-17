const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function demonstrateMealAndShopping() {
  console.log('🍖 CarnivoreApp - Sample Meal Plan & Shopping List Demo')
  console.log('=' .repeat(60))

  try {
    // First, let's get the available meals from the database
    console.log('\n📋 Available Meals in Database:')
    console.log('-'.repeat(40))
    
    const { data: allMeals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .order('name')
    
    if (mealsError) {
      console.log('❌ Error fetching meals:', mealsError.message)
      return
    }

    // Display each meal with details
    allMeals.forEach((meal, index) => {
      console.log(`\n${index + 1}. ${meal.name}`)
      console.log(`   Description: ${meal.description}`)
      console.log(`   Prep Level: ${meal.prep_effort_tag}`)
      console.log(`   Macros: ${meal.macro_profile.protein}g protein, ${meal.macro_profile.calories} calories`)
      console.log(`   Portions: ${meal.portions}`)
      
      // Show ingredients
      console.log('   Ingredients:')
      if (meal.ingredients.main) {
        meal.ingredients.main.forEach(ingredient => {
          console.log(`     • ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`)
        })
      }
      if (meal.ingredients.seasoning) {
        meal.ingredients.seasoning.forEach(ingredient => {
          console.log(`     • ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`)
        })
      }
    })

    // Now let's create a sample 3-day meal plan
    console.log('\n\n🗓️ SAMPLE 3-DAY MEAL PLAN')
    console.log('=' .repeat(50))
    
    const sampleMealPlan = [
      {
        day: 1,
        breakfast: allMeals[0],
        lunch: allMeals[1] || allMeals[0],
        dinner: allMeals[2] || allMeals[0]
      },
      {
        day: 2,
        breakfast: allMeals[1] || allMeals[0],
        lunch: allMeals[3] || allMeals[0],
        dinner: allMeals[4] || allMeals[1]
      },
      {
        day: 3,
        breakfast: allMeals[2] || allMeals[0],
        lunch: allMeals[0],
        dinner: allMeals[1] || allMeals[0]
      }
    ]

    sampleMealPlan.forEach(day => {
      console.log(`\n📅 Day ${day.day}:`)
      console.log(`   🌅 Breakfast: ${day.breakfast.name} (${day.breakfast.macro_profile.calories} cal, ${day.breakfast.macro_profile.protein}g protein)`)
      console.log(`   🌞 Lunch: ${day.lunch.name} (${day.lunch.macro_profile.calories} cal, ${day.lunch.macro_profile.protein}g protein)`)
      console.log(`   🌙 Dinner: ${day.dinner.name} (${day.dinner.macro_profile.calories} cal, ${day.dinner.macro_profile.protein}g protein)`)
      
      const dailyCalories = day.breakfast.macro_profile.calories + day.lunch.macro_profile.calories + day.dinner.macro_profile.calories
      const dailyProtein = day.breakfast.macro_profile.protein + day.lunch.macro_profile.protein + day.dinner.macro_profile.protein
      console.log(`   📊 Daily Totals: ${dailyCalories} calories, ${dailyProtein}g protein`)
    })

    // Now generate a consolidated shopping list
    console.log('\n\n🛒 CONSOLIDATED SHOPPING LIST (3 Days)')
    console.log('=' .repeat(50))

    const ingredientMap = new Map()

    // Aggregate all ingredients from the meal plan
    sampleMealPlan.forEach(day => {
      const meals = [day.breakfast, day.lunch, day.dinner]
      
      meals.forEach(meal => {
        // Process main ingredients
        if (meal.ingredients.main) {
          meal.ingredients.main.forEach(ingredient => {
            const key = ingredient.name.toLowerCase()
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key)
              // Simple aggregation - in real app we'd handle unit conversions
              if (existing.unit === ingredient.unit) {
                existing.totalAmount = parseFloat(existing.totalAmount) + parseFloat(ingredient.amount.split(' ')[0])
              } else {
                existing.notes = existing.notes || []
                existing.notes.push(`+ ${ingredient.amount} ${ingredient.unit}`)
              }
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                unit: ingredient.unit,
                totalAmount: parseFloat(ingredient.amount.split(' ')[0]) || ingredient.amount,
                category: 'Meat & Protein' // Carnivore default
              })
            }
          })
        }

        // Process seasoning ingredients
        if (meal.ingredients.seasoning) {
          meal.ingredients.seasoning.forEach(ingredient => {
            const key = ingredient.name.toLowerCase()
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key)
              if (existing.unit === ingredient.unit) {
                existing.totalAmount = parseFloat(existing.totalAmount) + parseFloat(ingredient.amount.split(' ')[0])
              } else {
                existing.notes = existing.notes || []
                existing.notes.push(`+ ${ingredient.amount} ${ingredient.unit}`)
              }
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                unit: ingredient.unit,
                totalAmount: parseFloat(ingredient.amount.split(' ')[0]) || ingredient.amount,
                category: 'Seasonings & Spices'
              })
            }
          })
        }
      })
    })

    // Display organized shopping list
    const categories = {}
    ingredientMap.forEach(ingredient => {
      if (!categories[ingredient.category]) {
        categories[ingredient.category] = []
      }
      categories[ingredient.category].push(ingredient)
    })

    Object.keys(categories).forEach(category => {
      console.log(`\n📦 ${category}:`)
      categories[category].forEach(ingredient => {
        const amount = typeof ingredient.totalAmount === 'number' ? 
          ingredient.totalAmount.toString() : ingredient.totalAmount
        console.log(`   • ${amount} ${ingredient.unit} ${ingredient.name}`)
        if (ingredient.notes) {
          ingredient.notes.forEach(note => console.log(`     ${note}`))
        }
      })
    })

    // Calculate estimated costs (mock pricing)
    console.log('\n\n💰 ESTIMATED SHOPPING COSTS')
    console.log('=' .repeat(40))
    
    const mockPricing = {
      'ribeye steak': { price: 18.99, unit: 'lb' },
      'ground beef': { price: 6.99, unit: 'lb' },
      'chicken breast': { price: 8.99, unit: 'lb' },
      'salmon fillet': { price: 12.99, unit: 'lb' },
      'beef brisket': { price: 14.99, unit: 'lb' },
      'salt': { price: 1.99, unit: 'container' },
      'pepper': { price: 2.49, unit: 'container' },
      'garlic powder': { price: 2.99, unit: 'container' }
    }

    let totalCost = 0
    ingredientMap.forEach(ingredient => {
      const pricing = mockPricing[ingredient.name.toLowerCase()]
      if (pricing) {
        let itemCost = 0
        if (ingredient.unit === 'piece' || ingredient.unit === 'lb') {
          itemCost = pricing.price * (parseFloat(ingredient.totalAmount) || 1)
        } else {
          itemCost = pricing.price // Flat rate for seasonings
        }
        totalCost += itemCost
        console.log(`   ${ingredient.name}: $${itemCost.toFixed(2)}`)
      }
    })

    console.log(`\n   🧾 TOTAL ESTIMATED COST: $${totalCost.toFixed(2)}`)

    console.log('\n\n✅ DEMO COMPLETE!')
    console.log('This shows how your meal plans and shopping lists will look to users.')
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message)
  }
}

demonstrateMealAndShopping()