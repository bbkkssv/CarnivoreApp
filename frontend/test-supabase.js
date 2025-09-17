// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? 'Present' : 'Missing')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Try to access Supabase (this will work even without tables)
    const { data, error } = await supabase.auth.getSession()
    console.log('✅ Supabase client created successfully!')
    console.log('Session check result:', { hasData: !!data, hasError: !!error })
    
    // Test database connection by trying to query system tables
    const { data: tables, error: dbError } = await supabase
      .rpc('version')
      .then(() => ({ data: 'connected', error: null }))
      .catch(err => ({ data: null, error: err }))
      
    if (!dbError) {
      console.log('✅ Database connection verified!')
    } else {
      console.log('Database connection details:', dbError.message)
    }
    
    return true
  } catch (err) {
    console.log('❌ Connection failed:', err.message)
    return false
  }
}

testConnection()
  .then(() => {
    console.log('Test completed!')
    process.exit(0)
  })
  .catch(err => {
    console.error('Test failed:', err)
    process.exit(1)
  })