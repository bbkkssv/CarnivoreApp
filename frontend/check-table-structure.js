const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTableStructure() {
  try {
    // Let's see what columns exist by trying to select a single row
    const { data, error } = await supabase
      .from('enhanced_meals')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error:', error.message)
      return
    }
    
    if (data && data.length > 0) {
      console.log('Enhanced_meals table columns:')
      console.log(Object.keys(data[0]))
    } else {
      console.log('Table is empty, so let\'s try inserting a minimal test record to see what columns are required...')
      
      // Try inserting with minimal required fields
      const testRecord = {
        id: 'test_structure',
        title: 'Test Recipe'
      }
      
      const { error: insertError } = await supabase
        .from('enhanced_meals')
        .insert(testRecord)
      
      if (insertError) {
        console.log('Insert error tells us about the table structure:')
        console.log(insertError.message)
      } else {
        console.log('Test insert successful, now querying back...')
        const { data: testData } = await supabase
          .from('enhanced_meals')
          .select('*')
          .eq('id', 'test_structure')
        
        if (testData && testData.length > 0) {
          console.log('Table columns:')
          console.log(Object.keys(testData[0]))
        }
        
        // Clean up test record
        await supabase
          .from('enhanced_meals')
          .delete()
          .eq('id', 'test_structure')
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkTableStructure()