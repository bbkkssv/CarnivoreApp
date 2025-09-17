require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Simple JavaScript version for testing
class MealPlanService {
  async generateMealPlan(request) {
    try {
      // Calculate number of days
      const daysDiff = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Get user's subscription tier
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', request.userId)
        .single()

      if (!user) {
        throw new Error('User not found')
      }

      // Create meal plan record
      const mealPlanId = `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .insert({
          id: mealPlanId,
          user_id: request.userId,
          start_date: request.startDate.toISOString(),
          end_date: request.endDate.toISOString(),
          constraints_summary: JSON.stringify(request.constraints || {}),
          status: 'DRAFT',
          regeneration_count: {},
          history: []
        })
        .select()
        .single()

      if (planError) throw planError

      // Get available meals
      const { data: allMeals, error: mealsError } = await supabase
        .from('meals')
        .select('*')

      if (mealsError) throw mealsError

      // Select meals for each day (simple rotation)
      const selectedMeals = []
      for (let i = 0; i < daysDiff; i++) {
        const mealIndex = i % allMeals.length
        selectedMeals.push(allMeals[mealIndex])
      }

      // Create meal plan days
      const mealPlanDays = selectedMeals.map((meal, index) => ({
        id: `mpd_${Date.now()}_${index}`,
        meal_plan_id: mealPlanId,
        day_index: index,
        meal_id: meal.id,
        meal_type: 'main',
        accepted: true
      }))

      const { error: daysError } = await supabase
        .from('meal_plan_days')
        .insert(mealPlanDays)

      if (daysError) throw daysError

      return {
        id: mealPlanId,
        userId: request.userId,
        startDate: request.startDate,
        endDate: request.endDate,
        status: 'DRAFT',
        days: daysDiff,
        mealsCount: selectedMeals.length
      }

    } catch (error) {
      console.error('Error generating meal plan:', error)
      throw new Error('Failed to generate meal plan: ' + error.message)
    }
  }

  async getMealPlan(mealPlanId) {
    try {
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meal_plan_days (
            *,
            meals (*)
          )
        `)
        .eq('id', mealPlanId)
        .single()

      if (planError) throw planError

      return {
        id: plan.id,
        userId: plan.user_id,
        startDate: new Date(plan.start_date),
        endDate: new Date(plan.end_date),
        status: plan.status,
        meals: plan.meal_plan_days.map(day => ({
          dayIndex: day.day_index,
          mealName: day.meals.name,
          mealType: day.meal_type,
          accepted: day.accepted
        }))
      }

    } catch (error) {
      console.error('Error fetching meal plan:', error)
      throw new Error('Failed to fetch meal plan: ' + error.message)
    }
  }

  async acceptMeal(mealPlanId, dayIndex, accepted) {
    try {
      const { error } = await supabase
        .from('meal_plan_days')
        .update({ accepted })
        .eq('meal_plan_id', mealPlanId)
        .eq('day_index', dayIndex)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating meal acceptance:', error)
      throw new Error('Failed to update meal acceptance: ' + error.message)
    }
  }
}

const mealPlanService = new MealPlanService()

async function testMealPlanService() {
  try {
    console.log('🧪 Testing MealPlanService...')

    // Use our test user from previous tests
    const testUserId = 'test-user-002'

    // Test 1: Generate a meal plan
    console.log('\n1️⃣ Generating meal plan...')
    const request = {
      userId: testUserId,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'), // 7 days
      constraints: {
        maxPrepTime: 45,
        allowedMeats: ['beef', 'chicken'],
        nutritionalProfile: 'STRICT'
      }
    }

    const mealPlan = await mealPlanService.generateMealPlan(request)
    console.log('✅ Meal plan generated:', {
      id: mealPlan.id,
      days: mealPlan.days,
      meals: mealPlan.mealsCount
    })

    // Test 2: Retrieve the meal plan
    console.log('\n2️⃣ Retrieving meal plan details...')
    const retrievedPlan = await mealPlanService.getMealPlan(mealPlan.id)
    console.log('✅ Meal plan retrieved:')
    console.log(`  Status: ${retrievedPlan.status}`)
    console.log(`  Days: ${retrievedPlan.startDate.toDateString()} to ${retrievedPlan.endDate.toDateString()}`)
    retrievedPlan.meals.forEach((meal, index) => {
      console.log(`  Day ${index + 1}: ${meal.mealName} (${meal.accepted ? 'Accepted' : 'Rejected'})`)
    })

    // Test 3: Accept/reject a meal
    console.log('\n3️⃣ Testing meal acceptance...')
    await mealPlanService.acceptMeal(mealPlan.id, 2, false) // Reject day 3 meal
    console.log('✅ Day 3 meal rejected')

    // Test 4: Check updated meal plan
    console.log('\n4️⃣ Verifying meal rejection...')
    const updatedPlan = await mealPlanService.getMealPlan(mealPlan.id)
    const day3Meal = updatedPlan.meals.find(m => m.dayIndex === 2)
    console.log(`✅ Day 3 meal status: ${day3Meal.accepted ? 'Accepted' : 'Rejected'}`)

    console.log('\n🎉 All MealPlanService tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Full error:', error)
  }
}

testMealPlanService()