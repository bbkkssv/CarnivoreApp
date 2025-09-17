const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRecipes() {
  try {
    console.log('🔍 Checking enhanced_meals table with Supabase client...')
    
    // Get total count
    const { count } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total recipes: ${count}`)
    
    // Get first 10 recipes
    const { data: firstRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type, ingredients')
      .order('id')
      .limit(10)
    
    console.log('\nFirst 10 recipes:')
    console.log('='.repeat(40))
    firstRecipes.forEach(row => {
      const shortIngredients = row.ingredients ? row.ingredients.substring(0, 50) + '...' : 'No ingredients'
      console.log(`${row.id}: ${row.title}`)
      console.log(`   Type: ${row.meat_type}`)
      console.log(`   Ingredients: ${shortIngredients}`)
      console.log('')
    })
    
    // Look for your detailed imported recipes
    const { data: detailedRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type')
      .or('ingredients.like.%oz%,ingredients.like.%tbsp%,ingredients.like.%tsp%')
      .order('id')
      .limit(5)
    
    console.log(`\nDetailed recipes (your imports) - showing first 5:`)
    console.log('='.repeat(50))
    detailedRecipes.forEach(row => {
      console.log(`${row.id}: ${row.title} (${row.meat_type})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  }
}

checkRecipes()