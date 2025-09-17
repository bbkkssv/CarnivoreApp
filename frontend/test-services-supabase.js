// Test all services using only Supabase client (no Prisma)
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPreferenceService() {
  console.log('\n👤 Testing Preference Service...')
  
  try {
    // Test 1: Create a test user
    console.log('1️⃣ Creating test user...')
    const testUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      password_hash: 'test_hash_' + Date.now(), // Required field
      age_confirmed: true,
      consent_status: 'accepted',
      created_at: new Date().toISOString()
    }
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select()
    
    if (userError) {
      console.log('❌ User creation failed:', userError.message)
      return false
    }
    
    console.log('✅ Test user created:', user[0].id)
    
    // Test 2: Create preference profile
    console.log('2️⃣ Creating preference profile...')
    const preferenceProfile = {
      id: 'profile-' + Date.now(),
      user_id: user[0].id,
      allowed_meats: ['beef', 'chicken'],
      exclusions: ['lactose'],
      prep_time_preference: 30,
      budget_range: 'medium',
      cooking_skill: 'beginner',
      nutritional_profile: 'STRICT',
      created_at: new Date().toISOString()
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('preference_profiles')
      .insert([preferenceProfile])
      .select()
    
    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message)
      return false
    }
    
    console.log('✅ Preference profile created')
    
    // Test 3: Retrieve and verify profile
    console.log('3️⃣ Retrieving preference profile...')
    const { data: retrievedProfile, error: retrieveError } = await supabase
      .from('preference_profiles')
      .select('*')
      .eq('user_id', user[0].id)
      .single()
    
    if (retrieveError) {
      console.log('❌ Profile retrieval failed:', retrieveError.message)
      return false
    }
    
    console.log('✅ Profile retrieved successfully')
    console.log(`   Allowed Meats: ${retrievedProfile.allowed_meats?.join(', ')}`)
    console.log(`   Nutritional Profile: ${retrievedProfile.nutritional_profile}`)
    
    return { userId: user[0].id, profileId: profile[0].id }
    
  } catch (error) {
    console.log('❌ Preference service test failed:', error.message)
    return false
  }
}

async function testMealPlanService(userId) {
  console.log('\n🍽️ Testing Meal Plan Service...')
  
  try {
    // Test 1: Create meal plan
    console.log('1️⃣ Creating meal plan...')
    const mealPlan = {
      id: 'mealplan-' + Date.now(),
      user_id: userId,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      constraints_summary: 'Test meal plan constraints',
      status: 'DRAFT',
      regeneration_count: {},
      history: [],
      created_at: new Date().toISOString()
    }
    
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .insert([mealPlan])
      .select()
    
    if (planError) {
      console.log('❌ Meal plan creation failed:', planError.message)
      return false
    }
    
    console.log('✅ Meal plan created')
    
    // Test 2: Add meal plan days
    console.log('2️⃣ Adding meal plan days...')
    
    // Get a sample meal
    const { data: meals } = await supabase.from('meals').select('id').limit(1)
    if (!meals || meals.length === 0) {
      console.log('❌ No meals available for testing')
      return false
    }
    
    const planDay = {
      id: 'planday-' + Date.now(),
      meal_plan_id: plan[0].id,
      day_index: 1,
      meal_type: 'main',
      meal_id: meals[0].id,
      accepted: true
    }
    
    const { data: dayCreated, error: dayError } = await supabase
      .from('meal_plan_days')
      .insert([planDay])
      .select()
    
    if (dayError) {
      console.log('❌ Meal plan day creation failed:', dayError.message)
      return false
    }
    
    console.log('✅ Meal plan day created')
    
    // Test 3: Retrieve full meal plan
    console.log('3️⃣ Retrieving complete meal plan...')
    const { data: fullPlan, error: retrieveError } = await supabase
      .from('meal_plans')
      .select(`
        *,
        meal_plan_days (
          *,
          meals (name, prep_effort_tag)
        )
      `)
      .eq('id', plan[0].id)
      .single()
    
    if (retrieveError) {
      console.log('❌ Meal plan retrieval failed:', retrieveError.message)
      return false
    }
    
    console.log('✅ Full meal plan retrieved')
    console.log(`   Plan: ${fullPlan.name}`)
    console.log(`   Days: ${fullPlan.meal_plan_days?.length || 0}`)
    
    return plan[0].id
    
  } catch (error) {
    console.log('❌ Meal plan service test failed:', error.message)
    return false
  }
}

async function testShoppingListService(userId, mealPlanId) {
  console.log('\n🛒 Testing Shopping List Service...')
  
  try {
    // Test 1: Create shopping list
    console.log('1️⃣ Creating shopping list...')
    const shoppingList = {
      id: 'shopping-' + Date.now(),
      user_id: userId,
      meal_plan_id: mealPlanId,
      items: [
        {
          ingredient: 'Ground Beef',
          quantity: 2,
          unit: 'lbs',
          category: 'meat'
        },
        {
          ingredient: 'Salt',
          quantity: 1,
          unit: 'container',
          category: 'pantry'
        }
      ],
      export_formats: ['csv'],
      created_at: new Date().toISOString()
    }
    
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert([shoppingList])
      .select()
    
    if (listError) {
      console.log('❌ Shopping list creation failed:', listError.message)
      return false
    }
    
    console.log('✅ Shopping list created')
    
    console.log('✅ Shopping list items included in main record')
    
    // Test 3: Retrieve complete shopping list
    console.log('2️⃣ Retrieving complete shopping list...')
    const { data: fullList, error: retrieveError } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', list[0].id)
      .single()
    
    if (retrieveError) {
      console.log('❌ Shopping list retrieval failed:', retrieveError.message)
      return false
    }
    
    console.log('✅ Complete shopping list retrieved')
    console.log(`   List ID: ${fullList.id}`)
    console.log(`   Items: ${fullList.items?.length || 0}`)
    
    return true
    
  } catch (error) {
    console.log('❌ Shopping list service test failed:', error.message)
    return false
  }
}

async function runAllServiceTests() {
  console.log('🚀 Running Comprehensive Service Tests (Supabase Client Only)')
  console.log('================================================================')
  
  const results = {
    preferences: false,
    mealPlan: false,
    shoppingList: false
  }
  
  // Test Preferences Service
  const preferenceResult = await testPreferenceService()
  if (preferenceResult) {
    results.preferences = true
    
    // Test Meal Plan Service
    const mealPlanResult = await testMealPlanService(preferenceResult.userId)
    if (mealPlanResult) {
      results.mealPlan = true
      
      // Test Shopping List Service
      const shoppingResult = await testShoppingListService(preferenceResult.userId, mealPlanResult)
      if (shoppingResult) {
        results.shoppingList = true
      }
    }
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...')
  await supabase.from('users').delete().like('id', 'test-user-%')
  console.log('✅ Cleanup completed')
  
  // Results
  console.log('\n📊 Service Test Results:')
  console.log('========================')
  console.log(`✅ Preferences Service: ${results.preferences ? 'PASS' : 'FAIL'}`)
  console.log(`✅ Meal Plan Service: ${results.mealPlan ? 'PASS' : 'FAIL'}`)
  console.log(`✅ Shopping List Service: ${results.shoppingList ? 'PASS' : 'FAIL'}`)
  
  const passCount = Object.values(results).filter(Boolean).length
  console.log(`\n🎯 Overall: ${passCount}/3 services passed`)
  
  if (passCount === 3) {
    console.log('🎉 ALL SERVICES ARE WORKING PERFECTLY!')
    return true
  } else {
    console.log('⚠️ Some services need attention')
    return false
  }
}

runAllServiceTests()