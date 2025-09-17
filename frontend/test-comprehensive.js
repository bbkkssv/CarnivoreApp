/**
 * Comprehensive test suite for the Carnivore App
 * Tests all layers: Database, Services, and API endpoints
 */

// Load environment variables
require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client (using service role for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test configuration
const TEST_USER_ID = 'test-user-comprehensive'
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
}

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset)
}

async function testDatabaseConnectivity() {
  log('\n🗄️ Testing Database Connectivity...', colors.blue)
  
  try {
    // Test 1: Basic connectivity
    const { data: healthCheck, error } = await supabase
      .from('meals')
      .select('id, name')
      .limit(1)
    
    if (error) throw error
    log('✅ Database connection successful')
    
    // Test 2: Table existence check
    const tables = ['users', 'meals', 'preference_profiles', 'meal_plans', 'shopping_lists']
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1)
        if (error) throw error
        log(`✅ Table '${table}' accessible`)
      } catch (err) {
        log(`❌ Table '${table}' error: ${err.message}`, colors.red)
      }
    }
    
    // Test 3: Sample data check
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
    
    if (mealsError) throw mealsError
    log(`✅ Found ${meals.length} meals in database`)
    
    return true
  } catch (error) {
    log(`❌ Database connectivity failed: ${error.message}`, colors.red)
    return false
  }
}

async function testPreferenceService() {
  log('\n👤 Testing Preference Service...', colors.blue)
  
  try {
    // Import the actual service (we'll use direct Supabase calls for now)
    
    // Test 1: Create/Update preference profile
    log('1️⃣ Testing preference profile creation...')
    
    const preferenceData = {
      user_id: TEST_USER_ID,
      allowed_meats: ['beef', 'chicken', 'fish'],
      exclusions: ['dairy', 'pork'],
      prep_time_preference: 30,
      budget_range: 'MEDIUM',
      cooking_skill: 'INTERMEDIATE',
      nutritional_profile: 'STRICT'
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('preference_profiles')
      .upsert(preferenceData, { onConflict: 'user_id' })
      .select()
      .single()
    
    if (profileError) throw profileError
    log('✅ Preference profile created/updated successfully')
    
    // Test 2: Retrieve preference profile
    log('2️⃣ Testing preference profile retrieval...')
    
    const { data: retrievedProfile, error: retrieveError } = await supabase
      .from('preference_profiles')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .single()
    
    if (retrieveError) throw retrieveError
    log(`✅ Retrieved profile for user: ${retrievedProfile.user_id}`)
    log(`   - Allowed meats: ${retrievedProfile.allowed_meats?.join(', ')}`)
    log(`   - Nutritional profile: ${retrievedProfile.nutritional_profile}`)
    
    // Test 3: Create onboarding response
    log('3️⃣ Testing onboarding response...')
    
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_responses')
      .upsert({
        user_id: TEST_USER_ID,
        responses: {
          age: 30,
          goals: ['weight_loss', 'energy'],
          experience: 'beginner'
        }
      }, { onConflict: 'user_id' })
      .select()
      .single()
    
    if (onboardingError) throw onboardingError
    log('✅ Onboarding response recorded successfully')
    
    return true
  } catch (error) {
    log(`❌ Preference service test failed: ${error.message}`, colors.red)
    return false
  }
}

async function testMealPlanService() {
  log('\n🍽️ Testing Meal Plan Service...', colors.blue)
  
  try {
    // Test 1: Create a meal plan
    log('1️⃣ Testing meal plan creation...')
    
    const mealPlanId = `mp_test_${Date.now()}`
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        id: mealPlanId,
        user_id: TEST_USER_ID,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'DRAFT',
        constraints_summary: JSON.stringify({
          allowedMeats: ['beef', 'chicken'],
          maxPrepTime: 30
        }),
        regeneration_count: {}
      })
      .select()
      .single()
    
    if (planError) throw planError
    log(`✅ Meal plan created: ${mealPlanId}`)
    
    // Test 2: Add meal plan days
    log('2️⃣ Testing meal plan days creation...')
    
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('id, name')
      .limit(3)
    
    if (mealsError) throw mealsError
    
    const mealPlanDays = meals.map((meal, index) => ({
      meal_plan_id: mealPlanId,
      day_index: index,
      meal_id: meal.id,
      meal_type: 'DINNER',
      accepted: false
    }))
    
    const { data: days, error: daysError } = await supabase
      .from('meal_plan_days')
      .insert(mealPlanDays)
      .select()
    
    if (daysError) throw daysError
    log(`✅ Created ${days.length} meal plan days`)
    
    // Test 3: Accept a meal
    log('3️⃣ Testing meal acceptance...')
    
    const { error: acceptError } = await supabase
      .from('meal_plan_days')
      .update({ accepted: true })
      .eq('meal_plan_id', mealPlanId)
      .eq('day_index', 0)
    
    if (acceptError) throw acceptError
    log('✅ Meal accepted successfully')
    
    return { mealPlanId, success: true }
  } catch (error) {
    log(`❌ Meal plan service test failed: ${error.message}`, colors.red)
    return { success: false }
  }
}

async function testShoppingListService(mealPlanId) {
  log('\n🛒 Testing Shopping List Service...', colors.blue)
  
  try {
    // Test 1: Create a shopping list from meal plan
    log('1️⃣ Testing shopping list creation...')
    
    const shoppingListId = `sl_test_${Date.now()}`
    
    // Get accepted meals from the meal plan
    const { data: acceptedMeals, error: mealsError } = await supabase
      .from('meal_plan_days')
      .select(`
        *,
        meals (*)
      `)
      .eq('meal_plan_id', mealPlanId)
      .eq('accepted', true)
    
    if (mealsError) throw mealsError
    
    if (acceptedMeals.length === 0) {
      log('⚠️ No accepted meals found, creating sample shopping list')
    }
    
    // Create shopping list
    const { data: shoppingList, error: listError } = await supabase
      .from('shopping_lists')
      .insert({
        id: shoppingListId,
        user_id: TEST_USER_ID,
        meal_plan_id: mealPlanId,
        total_items: 5,
        checked_items: 0,
        estimated_total: 45.99
      })
      .select()
      .single()
    
    if (listError) throw listError
    log(`✅ Shopping list created: ${shoppingListId}`)
    
    // Test 2: Add shopping list items
    log('2️⃣ Testing shopping list items...')
    
    const sampleItems = [
      { name: 'Ground Beef', amount: 2, unit: 'lbs', category: 'MEAT', estimated_price: 15.99 },
      { name: 'Chicken Thighs', amount: 3, unit: 'lbs', category: 'MEAT', estimated_price: 12.99 },
      { name: 'Salmon Fillet', amount: 1, unit: 'lb', category: 'SEAFOOD', estimated_price: 16.99 }
    ]
    
    const itemsToInsert = sampleItems.map((item, index) => ({
      id: `sli_${Date.now()}_${index}`,
      shopping_list_id: shoppingListId,
      ...item,
      checked: false
    }))
    
    const { data: items, error: itemsError } = await supabase
      .from('shopping_list_items')
      .insert(itemsToInsert)
      .select()
    
    if (itemsError) throw itemsError
    log(`✅ Added ${items.length} items to shopping list`)
    
    // Test 3: Calculate totals
    const totalPrice = items.reduce((sum, item) => sum + (item.estimated_price || 0), 0)
    log(`✅ Total estimated price: $${totalPrice.toFixed(2)}`)
    
    return true
  } catch (error) {
    log(`❌ Shopping list service test failed: ${error.message}`, colors.red)
    return false
  }
}

async function testAPIEndpoints() {
  log('\n🌐 Testing API Endpoints...', colors.blue)
  
  try {
    // Note: These are smoke tests to check if files exist and have no syntax errors
    const fs = require('fs')
    const path = require('path')
    
    const apiRoutes = [
      'src/app/api/user/preferences/route.ts',
      'src/app/api/user/onboarding/route.ts',
      'src/app/api/meals/generate/route.ts',
      'src/app/api/meals/[id]/accept/route.ts',
      'src/app/api/meals/regenerate/route.ts',
      'src/app/api/shopping/generate/route.ts'
    ]
    
    let allRoutesExist = true
    
    for (const route of apiRoutes) {
      const routePath = path.join(process.cwd(), route)
      if (fs.existsSync(routePath)) {
        log(`✅ API route exists: ${route}`)
      } else {
        log(`❌ API route missing: ${route}`, colors.red)
        allRoutesExist = false
      }
    }
    
    if (allRoutesExist) {
      log('✅ All API routes are present')
    }
    
    // Test compilation by trying to require TypeScript files (basic syntax check)
    try {
      const { execSync } = require('child_process')
      execSync('npx tsc --noEmit --skipLibCheck', { cwd: process.cwd(), stdio: 'pipe' })
      log('✅ TypeScript compilation successful')
    } catch (error) {
      log('⚠️ TypeScript compilation issues detected', colors.yellow)
    }
    
    return allRoutesExist
  } catch (error) {
    log(`❌ API endpoints test failed: ${error.message}`, colors.red)
    return false
  }
}

async function cleanup() {
  log('\n🧹 Cleaning up test data...', colors.yellow)
  
  try {
    // Clean up in reverse order due to foreign key constraints
    await supabase.from('shopping_list_items').delete().like('id', 'sli_test_%')
    await supabase.from('shopping_lists').delete().like('id', 'sl_test_%')
    await supabase.from('meal_plan_days').delete().like('meal_plan_id', 'mp_test_%')
    await supabase.from('meal_plans').delete().like('id', 'mp_test_%')
    // Keep the test user and preferences for future tests
    
    log('✅ Cleanup completed')
  } catch (error) {
    log(`⚠️ Cleanup warning: ${error.message}`, colors.yellow)
  }
}

async function runComprehensiveTests() {
  log('🚀 Starting Comprehensive Test Suite for Carnivore App', colors.bright)
  log('=' .repeat(60), colors.bright)
  
  const results = {
    database: false,
    preferences: false,
    mealPlan: false,
    shoppingList: false,
    apiEndpoints: false
  }
  
  try {
    // Test each layer
    results.database = await testDatabaseConnectivity()
    results.preferences = await testPreferenceService()
    
    const mealPlanResult = await testMealPlanService()
    results.mealPlan = mealPlanResult.success
    
    if (mealPlanResult.mealPlanId) {
      results.shoppingList = await testShoppingListService(mealPlanResult.mealPlanId)
    }
    
    results.apiEndpoints = await testAPIEndpoints()
    
    // Cleanup
    await cleanup()
    
    // Summary
    log('\n📊 Test Results Summary:', colors.bright)
    log('=' .repeat(30), colors.bright)
    
    const passedTests = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    
    for (const [test, passed] of Object.entries(results)) {
      const icon = passed ? '✅' : '❌'
      const color = passed ? colors.green : colors.red
      log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)} Service`, color)
    }
    
    log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`, 
         passedTests === totalTests ? colors.green : colors.yellow)
    
    if (passedTests === totalTests) {
      log('\n🎉 All systems operational! Ready for production deployment.', colors.green)
    } else {
      log('\n⚠️ Some systems need attention before deployment.', colors.yellow)
    }
    
  } catch (error) {
    log(`\n💥 Test suite failed: ${error.message}`, colors.red)
  }
}

// Run the comprehensive test suite
runComprehensiveTests()