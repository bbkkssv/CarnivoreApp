const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database - keeping only your 97 unique professional recipes...')
    
    // First, let's get all recipes to analyze
    const { data: allRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type, ingredients')
      .order('id')
    
    console.log(`Found ${allRecipes.length} total recipes`)
    
    // Group recipes by title to identify duplicates
    const recipesByTitle = {}
    const testRecipes = []
    const duplicates = []
    
    allRecipes.forEach(recipe => {
      if (recipesByTitle[recipe.title]) {
        // This is a duplicate
        duplicates.push(recipe.id)
      } else {
        recipesByTitle[recipe.title] = recipe
      }
      
      // Check if it's likely a test recipe (simple ID pattern)
      if (recipe.id.startsWith('enhanced_meal_') && recipe.id.length < 20) {
        testRecipes.push(recipe.id)
      }
    })
    
    console.log(`\nAnalysis:`)
    console.log(`- Unique recipe titles: ${Object.keys(recipesByTitle).length}`)
    console.log(`- Duplicate recipes to remove: ${duplicates.length}`)
    console.log(`- Test recipes to remove: ${testRecipes.length}`)
    
    // Show what we're about to remove
    console.log('\nTest recipes to be removed:')
    testRecipes.forEach(id => {
      const recipe = allRecipes.find(r => r.id === id)
      console.log(`- ${id}: ${recipe.title}`)
    })
    
    console.log('\nFirst 10 duplicate IDs to be removed:')
    duplicates.slice(0, 10).forEach(id => {
      const recipe = allRecipes.find(r => r.id === id)
      console.log(`- ${id}: ${recipe.title}`)
    })
    
    // Ask for confirmation (in real scenario)
    console.log(`\n📋 PLAN:`)
    console.log(`- Keep: ${Object.keys(recipesByTitle).length} unique recipes`)
    console.log(`- Remove: ${duplicates.length} duplicates + ${testRecipes.length} test recipes = ${duplicates.length + testRecipes.length} total`)
    console.log(`- Final count should be: ${allRecipes.length - duplicates.length - testRecipes.length}`)
    
    // Remove test recipes first
    if (testRecipes.length > 0) {
      console.log(`\n🗑️  Removing ${testRecipes.length} test recipes...`)
      const { error: testError } = await supabase
        .from('enhanced_meals')
        .delete()
        .in('id', testRecipes)
      
      if (testError) throw testError
      console.log(`✅ Removed ${testRecipes.length} test recipes`)
    }
    
    // Remove duplicates
    if (duplicates.length > 0) {
      console.log(`\n🗑️  Removing ${duplicates.length} duplicate recipes...`)
      
      // Remove in batches of 50 to avoid query limits
      const batchSize = 50
      for (let i = 0; i < duplicates.length; i += batchSize) {
        const batch = duplicates.slice(i, i + batchSize)
        const { error: dupError } = await supabase
          .from('enhanced_meals')
          .delete()
          .in('id', batch)
        
        if (dupError) throw dupError
        console.log(`✅ Removed batch of ${batch.length} duplicates`)
      }
    }
    
    // Final count check
    const { count: finalCount } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n🎉 Database cleanup complete!`)
    console.log(`Final recipe count: ${finalCount}`)
    
    // Show a sample of what's left
    const { data: remainingRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type')
      .order('title')
      .limit(10)
    
    console.log(`\nSample of remaining recipes:`)
    remainingRecipes.forEach(recipe => {
      console.log(`- ${recipe.title} (${recipe.meat_type})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

cleanDatabase()