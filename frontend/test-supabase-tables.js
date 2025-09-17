require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDatabaseTables() {
  try {
    console.log('🧪 Testing database tables with Supabase client...')

    // Test 1: Check if meals table exists and has data
    console.log('\n1️⃣ Querying sample meals...')
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
    
    if (mealsError) {
      console.error('❌ Meals query error:', mealsError)
    } else {
      console.log(`✅ Found ${meals.length} meals in database:`)
      meals.forEach(meal => {
        console.log(`  - ${meal.name} (${meal.prep_effort_tag})`)
      })
    }

    // Test 2: Create a test user
    console.log('\n2️⃣ Creating test user...')
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: 'test-user-002',
        email: 'test2@example.com',
        password_hash: 'hashed-password-456',
        age_confirmed: true,
        consent_status: 'granted',
        subscription_tier: 'FREE'
      })
      .select()
      .single()
    
    if (userError) {
      console.error('❌ User creation error:', userError)
    } else {
      console.log('✅ Test user created:', testUser.email)
    }

    // Test 3: Create preference profile
    if (!userError) {
      console.log('\n3️⃣ Creating preference profile...')
      const { data: profile, error: profileError } = await supabase
        .from('preference_profiles')
        .insert({
          id: 'profile-002',
          user_id: testUser.id,
          allowed_meats: ['beef', 'chicken'],
          exclusions: ['pork'],
          prep_time_preference: 30,
          budget_range: '100-150',
          cooking_skill: 'beginner',
          nutritional_profile: 'STRICT'
        })
        .select()
        .single()
      
      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
      } else {
        console.log('✅ Preference profile created:', profile.id)
      }
    }

    // Test 4: Test some queries
    console.log('\n4️⃣ Testing table queries...')
    
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .limit(5)
    
    if (!usersError) {
      console.log(`✅ Users table accessible: ${users.length} users`)
    }

    // Check preference_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('preference_profiles')
      .select('id, user_id, nutritional_profile')
      .limit(5)
    
    if (!profilesError) {
      console.log(`✅ Preference profiles table accessible: ${profiles.length} profiles`)
    }

    console.log('\n🎉 Database table test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDatabaseTables()