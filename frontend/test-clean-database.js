// Clean test database and verify fresh state
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanAndVerifyDatabase() {
  console.log('🧹 Cleaning test database...')
  
  try {
    // First, let's see what's in the database
    console.log('\n📊 Current database state:')
    
    const { data: users } = await supabase.from('users').select('*')
    console.log(`Users: ${users?.length || 0} records`)
    
    const { data: profiles } = await supabase.from('preference_profiles').select('*')
    console.log(`Preference Profiles: ${profiles?.length || 0} records`)
    
    const { data: mealPlans } = await supabase.from('meal_plans').select('*')
    console.log(`Meal Plans: ${mealPlans?.length || 0} records`)
    
    const { data: shoppingLists } = await supabase.from('shopping_lists').select('*')
    console.log(`Shopping Lists: ${shoppingLists?.length || 0} records`)
    
    // Clean up test data (keep meals as they're sample data)
    console.log('\n🧽 Cleaning test user data...')
    
    // Delete in proper order (respecting foreign keys)
    await supabase.from('shopping_lists').delete().like('user_id', 'test-%')
    await supabase.from('meal_plan_days').delete().in('meal_plan_id', 
      (mealPlans || []).filter(p => p.user_id.startsWith('test-')).map(p => p.id)
    )
    await supabase.from('meal_plans').delete().like('user_id', 'test-%')
    await supabase.from('preference_profiles').delete().like('user_id', 'test-%')
    await supabase.from('users').delete().like('id', 'test-%')
    
    console.log('✅ Test data cleaned')
    
    // Verify meals are still present
    const { data: meals } = await supabase.from('meals').select('*')
    console.log(`✅ Sample meals preserved: ${meals?.length || 0} records`)
    
    console.log('\n✅ Database is clean and ready for testing!')
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message)
  }
}

cleanAndVerifyDatabase()