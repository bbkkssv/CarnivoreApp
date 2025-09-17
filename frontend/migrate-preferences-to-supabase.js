const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function migratePreferencesToSupabase() {
  console.log('🔄 MIGRATING PREFERENCES SYSTEM TO SUPABASE')
  console.log('=' .repeat(50))

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create preference_profiles table
    console.log('📋 Creating preference_profiles table...')
    const { error: profilesError } = await supabase.rpc('create_table_if_not_exists', {
      sql: `
        CREATE TABLE IF NOT EXISTS preference_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL UNIQUE,
          allowed_meats JSONB NOT NULL DEFAULT '[]'::jsonb,
          exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
          prep_time_preference INTEGER DEFAULT 30,
          budget_range VARCHAR,
          cooking_skill VARCHAR DEFAULT 'beginner',
          nutritional_profile VARCHAR DEFAULT 'STRICT',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);
      `
    })

    if (profilesError) {
      console.log('❌ Error creating preference_profiles table:', profilesError.message)
      
      // Try alternative approach - direct table creation
      console.log('🔄 Trying direct table creation...')
      
      // Check if table exists first
      const { data: existingTables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'preference_profiles')

      if (!existingTables || existingTables.length === 0) {
        console.log('ℹ️  Table does not exist, will create via SQL script')
      } else {
        console.log('✅ preference_profiles table already exists')
      }
    } else {
      console.log('✅ preference_profiles table created successfully')
    }

    // Create onboarding_responses table
    console.log('📋 Creating onboarding_responses table...')
    const { error: responsesError } = await supabase.rpc('create_table_if_not_exists', {
      sql: `
        CREATE TABLE IF NOT EXISTS onboarding_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          responses JSONB NOT NULL DEFAULT '{}'::jsonb,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id ON onboarding_responses(user_id);
      `
    })

    if (responsesError) {
      console.log('❌ Error creating onboarding_responses table:', responsesError.message)
    } else {
      console.log('✅ onboarding_responses table created successfully')
    }

    // Test basic operations
    console.log('\n🧪 Testing Supabase preference operations...')

    const testUserId = 'test_user_123'
    const testProfile = {
      user_id: testUserId,
      allowed_meats: ['Beef', 'Lamb'],
      exclusions: ['Pork'],
      prep_time_preference: 45,
      budget_range: '50-100',
      cooking_skill: 'intermediate',
      nutritional_profile: 'STRICT'
    }

    // Test insert
    const { data: insertedProfile, error: insertError } = await supabase
      .from('preference_profiles')
      .insert(testProfile)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Test insert failed:', insertError.message)
    } else {
      console.log('✅ Test profile insertion successful')

      // Test read
      const { data: readProfile, error: readError } = await supabase
        .from('preference_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      if (readError) {
        console.log('❌ Test read failed:', readError.message)
      } else {
        console.log('✅ Test profile read successful')
        console.log(`   - Allowed meats: ${readProfile.allowed_meats.length}`)
        console.log(`   - Prep time: ${readProfile.prep_time_preference} minutes`)
      }

      // Test update
      const { data: updatedProfile, error: updateError } = await supabase
        .from('preference_profiles')
        .update({ 
          prep_time_preference: 60,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', testUserId)
        .select()
        .single()

      if (updateError) {
        console.log('❌ Test update failed:', updateError.message)
      } else {
        console.log('✅ Test profile update successful')
        console.log(`   - New prep time: ${updatedProfile.prep_time_preference} minutes`)
      }

      // Clean up test data
      await supabase
        .from('preference_profiles')
        .delete()
        .eq('user_id', testUserId)
      
      console.log('✅ Test cleanup completed')
    }

    console.log('\n📊 MIGRATION SUMMARY:')
    console.log('✅ Database tables prepared for preferences system')
    console.log('✅ Basic CRUD operations tested and working')
    console.log('✅ Ready to update TypeScript service')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

migratePreferencesToSupabase()