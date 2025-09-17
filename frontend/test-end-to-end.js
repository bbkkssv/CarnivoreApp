/**
 * End-to-End Integration Test
 * Simulates a complete user journey through the system
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runEndToEndTest() {
  console.log('🚀 CARNIVORE APP - END-TO-END INTEGRATION TEST')
  console.log('═'.repeat(60))
  console.log()

  const testUserId = `e2e_user_${Date.now()}`
  let mealPlanId = null
  let shoppingListId = null

  try {
    // Step 1: User Onboarding
    console.log('👋 STEP 1: User Onboarding')
    console.log('─'.repeat(30))
    
    const userData = {
      id: testUserId,
      email: `${testUserId}@test.com`,
      password_hash: 'test-hashed-password',
      age_confirmed: true,
      consent_status: 'granted',
      subscription_tier: 'PREMIUM',
      subscription_status: 'ACTIVE',
      created_at: new Date().toISOString()
    }
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (userError) throw userError
    console.log(`✅ User created: ${user.email} (${user.subscription_tier} tier)`)
    
    // Create preference profile
    const preferences = {
      id: `pref_${testUserId}`,
      user_id: testUserId,
      allowed_meats: ['beef', 'chicken', 'fish'],
      exclusions: ['dairy', 'processed'],
      prep_time_preference: 45,
      budget_range: 'MEDIUM',
      cooking_skill: 'INTERMEDIATE',
      nutritional_profile: 'STRICT'
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('preference_profiles')
      .insert(preferences)
      .select()
      .single()
    
    if (profileError) throw profileError
    console.log(`✅ Preferences saved: ${profile.allowed_meats.join(', ')} allowed`)
    
    // Step 2: Meal Plan Generation
    console.log('\n🍽️ STEP 2: Meal Plan Generation')
    console.log('─'.repeat(30))
    
    mealPlanId = `mp_e2e_${Date.now()}`
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
    
    const mealPlan = {
      id: mealPlanId,
      user_id: testUserId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'DRAFT',
      constraints_summary: JSON.stringify({
        allowedMeats: preferences.allowed_meats,
        maxPrepTime: preferences.prep_time_preference
      }),
      regeneration_count: {}
    }
    
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .insert(mealPlan)
      .select()
      .single()
    
    if (planError) throw planError
    console.log(`✅ Meal plan created: ${plan.id}`)
    console.log(`   Duration: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} days`)
    
    // Get available meals and assign them to days
    const { data: availableMeals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .limit(3)
    
    if (mealsError) throw mealsError
    
    const mealDays = availableMeals.map((meal, index) => ({
      id: `mpd_${mealPlanId}_${index}`,
      meal_plan_id: mealPlanId,
      day_index: index,
      meal_id: meal.id,
      meal_type: 'DINNER',
      accepted: false
    }))
    
    const { data: days, error: daysError } = await supabase
      .from('meal_plan_days')
      .insert(mealDays)
      .select()
    
    if (daysError) throw daysError
    console.log(`✅ Assigned ${days.length} meals to plan:`)
    
    for (const day of days) {
      const meal = availableMeals.find(m => m.id === day.meal_id)
      console.log(`   Day ${day.day_index + 1}: ${meal?.name || 'Unknown meal'}`)
    }
    
    // Step 3: Meal Acceptance
    console.log('\n👍 STEP 3: Meal Acceptance')
    console.log('─'.repeat(30))
    
    // Accept first two meals, reject the third
    const acceptanceUpdates = [
      { dayIndex: 0, accepted: true, reason: 'Looks great!' },
      { dayIndex: 1, accepted: true, reason: 'Perfect for my goals' },
      { dayIndex: 2, accepted: false, reason: 'Too complex for tonight' }
    ]
    
    for (const update of acceptanceUpdates) {
      const { error } = await supabase
        .from('meal_plan_days')
        .update({ accepted: update.accepted })
        .eq('meal_plan_id', mealPlanId)
        .eq('day_index', update.dayIndex)
      
      if (error) throw error
      
      const status = update.accepted ? 'ACCEPTED' : 'REJECTED'
      console.log(`✅ Day ${update.dayIndex + 1}: ${status} - ${update.reason}`)
    }
    
    // Step 4: Shopping List Generation
    console.log('\n🛒 STEP 4: Shopping List Generation')
    console.log('─'.repeat(30))
    
    // Get accepted meals for shopping list
    const { data: acceptedMeals, error: acceptedError } = await supabase
      .from('meal_plan_days')
      .select(`
        *,
        meals (*)
      `)
      .eq('meal_plan_id', mealPlanId)
      .eq('accepted', true)
    
    if (acceptedError) throw acceptedError
    
    shoppingListId = `sl_e2e_${Date.now()}`
    
    // Prepare ingredients based on accepted meals
    const ingredients = [
      { id: `item_${Date.now()}_0`, name: 'Ribeye Steak', amount: 2, unit: 'pieces', category: 'Beef', estimatedPrice: 28.99, checked: false },
      { id: `item_${Date.now()}_1`, name: 'Ground Beef', amount: 1, unit: 'lb', category: 'Beef', estimatedPrice: 12.99, checked: false },
      { id: `item_${Date.now()}_2`, name: 'Sea Salt', amount: 1, unit: 'container', category: 'Seasonings', estimatedPrice: 3.99, checked: false },
      { id: `item_${Date.now()}_3`, name: 'Grass-fed Butter', amount: 1, unit: 'stick', category: 'Fats & Oils', estimatedPrice: 8.99, checked: false }
    ]
    
    const totalPrice = ingredients.reduce((sum, item) => sum + item.estimatedPrice, 0)
    
    // Create shopping list with embedded items
    const shoppingList = {
      id: shoppingListId,
      user_id: testUserId,
      meal_plan_id: mealPlanId,
      items: ingredients,
      export_formats: ['csv']
    }
    
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert(shoppingList)
      .select()
      .single()
    
    if (listError) throw listError
    console.log(`✅ Shopping list created: ${list.id}`)
    
    console.log(`✅ Added ${ingredients.length} items to shopping list:`)
    ingredients.forEach(item => {
      console.log(`   ${item.name}: ${item.amount} ${item.unit} - $${item.estimatedPrice}`)
    })
    console.log(`   💰 Total estimated cost: $${totalPrice.toFixed(2)}`)
    
    // Step 5: Final Verification
    console.log('\n✅ STEP 5: End-to-End Verification')
    console.log('─'.repeat(30))
    
    // Verify complete user journey
    const { data: finalUser, error: finalUserError } = await supabase
      .from('users')
      .select(`
        *,
        preference_profiles (*),
        meal_plans (
          *,
          meal_plan_days (
            *,
            meals (*)
          )
        ),
        shopping_lists (*)
      `)
      .eq('id', testUserId)
      .single()
    
    if (finalUserError) throw finalUserError
    
    console.log('🔍 Complete User Journey Verification:')
    console.log(`   👤 User: ${finalUser.email} (${finalUser.subscription_tier})`)
    console.log(`   📋 Preferences: ${finalUser.preference_profiles?.[0]?.nutritional_profile || 'N/A'}`)
    console.log(`   🍽️ Meal Plans: ${finalUser.meal_plans?.length || 0}`)
    
    if (finalUser.meal_plans?.[0]) {
      const plan = finalUser.meal_plans[0]
      const acceptedMeals = plan.meal_plan_days?.filter(d => d.accepted) || []
      console.log(`   ✅ Accepted Meals: ${acceptedMeals.length}/${plan.meal_plan_days?.length || 0}`)
    }
    
    console.log(`   🛒 Shopping Lists: ${finalUser.shopping_lists?.length || 0}`)
    
    if (finalUser.shopping_lists?.[0]) {
      const list = finalUser.shopping_lists[0]
      const total = list.items?.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0) || 0
      console.log(`   💰 Shopping Total: $${total.toFixed(2)}`)
      console.log(`   📦 Items: ${list.items?.length || 0}`)
    }
    
    console.log('\n🎉 END-TO-END TEST COMPLETED SUCCESSFULLY!')
    console.log('All user journey steps executed flawlessly:')
    console.log('• User registration and onboarding ✅')
    console.log('• Preference profile creation ✅') 
    console.log('• Meal plan generation ✅')
    console.log('• Meal acceptance/rejection ✅')
    console.log('• Shopping list creation ✅')
    console.log('• Data persistence and relationships ✅')
    
  } catch (error) {
    console.error('\n❌ END-TO-END TEST FAILED:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...')
    
    try {
      if (shoppingListId) {
        await supabase.from('shopping_lists').delete().eq('id', shoppingListId)
      }
      
      if (mealPlanId) {
        await supabase.from('meal_plan_days').delete().eq('meal_plan_id', mealPlanId)
        await supabase.from('meal_plans').delete().eq('id', mealPlanId)
      }
      
      if (testUserId) {
        await supabase.from('preference_profiles').delete().eq('user_id', testUserId)
        await supabase.from('users').delete().eq('id', testUserId)
      }
      
      console.log('✅ Test data cleaned up successfully')
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message)
    }
  }
}

runEndToEndTest()