/**
 * Test the actual service implementations
 */

// Load environment variables
require('dotenv').config()

// Set up the environment for ES modules  
process.env.NODE_ENV = 'development'

async function testActualServices() {
  console.log('🧪 Testing Actual Service Implementations...\n')
  
  try {
    // We need to use dynamic import for ES modules
    const { PreferenceService, NutritionalProfile } = await import('./src/lib/services/preferences.js')
    const { MealPlanService } = await import('./src/lib/services/mealPlan.js') 
    const { ShoppingListService } = await import('./src/lib/services/shoppingList.js')
    
    const preferenceService = new PreferenceService()
    const mealPlanService = new MealPlanService()
    const shoppingListService = new ShoppingListService()
    
    console.log('✅ Services imported successfully')
    
    // Test 1: Preference Service
    console.log('\n1️⃣ Testing PreferenceService...')
    
    const testUserId = 'test-user-services'
    
    // Create test onboarding data
    const onboardingData = {
      responses: {
        age: 30,
        goals: ['weight_loss', 'energy'], 
        experience: 'beginner'
      },
      preferenceProfile: {
        allowedMeats: ['beef', 'chicken'],
        exclusions: ['dairy'],
        prepTimePreference: 30,
        budgetRange: 'MEDIUM',
        cookingSkill: 'INTERMEDIATE', 
        nutritionalProfile: NutritionalProfile.STRICT
      }
    }
    
    const onboardingResult = await preferenceService.processOnboarding(testUserId, onboardingData)
    console.log('✅ Onboarding processed successfully')
    console.log('   Profile ID:', onboardingResult.preferenceProfile.id)
    
    // Get preference profile
    const profile = await preferenceService.getPreferenceProfile(testUserId)
    console.log('✅ Retrieved preference profile')
    console.log('   Allowed meats:', profile.allowedMeats)
    console.log('   Nutritional profile:', profile.nutritionalProfile)
    
    // Test 2: Meal Plan Service
    console.log('\n2️⃣ Testing MealPlanService...')
    
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
    
    const mealPlanRequest = {
      userId: testUserId,
      startDate,
      endDate,
      constraints: {
        maxPrepTime: 45,
        allowedMeats: ['beef', 'chicken'],
        exclusions: ['dairy'],
        nutritionalProfile: 'STRICT'
      }
    }
    
    const mealPlan = await mealPlanService.generateMealPlan(mealPlanRequest)
    console.log('✅ Meal plan generated successfully')
    console.log('   Plan ID:', mealPlan.id) 
    console.log('   Meals count:', mealPlan.meals?.length || 0)
    
    // Accept first meal if available
    if (mealPlan.meals && mealPlan.meals.length > 0) {
      await mealPlanService.acceptMeal(mealPlan.id, 0, true)
      console.log('✅ First meal accepted')
    }
    
    // Test 3: Shopping List Service
    console.log('\n3️⃣ Testing ShoppingListService...')
    
    const shoppingList = await shoppingListService.generateFromMealPlan(mealPlan.id)
    console.log('✅ Shopping list generated successfully')
    console.log('   List ID:', shoppingList.id)
    console.log('   Total items:', shoppingList.totalItems)
    console.log('   Estimated total:', shoppingList.estimatedTotal ? `$${shoppingList.estimatedTotal}` : 'N/A')
    
    console.log('\n🎉 All service tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testActualServices()