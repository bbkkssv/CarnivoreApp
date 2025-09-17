const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyFinalRecipes() {
  try {
    console.log('🔍 Verifying final recipe database...')
    
    // Get final count
    const { count } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Final recipe count: ${count}`)
    
    // Check for any remaining simple/test recipes without professional details
    const { data: simpleRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type, ingredients, prep_time, cook_time')
      .or('ingredients.is.null,ingredients.eq.,prep_time.is.null,cook_time.is.null')
    
    console.log(`\nFound ${simpleRecipes.length} recipes missing professional details:`)
    simpleRecipes.forEach(recipe => {
      console.log(`- ${recipe.id}: ${recipe.title}`)
      console.log(`  Ingredients: ${recipe.ingredients || 'MISSING'}`)
      console.log(`  Times: ${recipe.prep_time || 'N/A'} prep, ${recipe.cook_time || 'N/A'} cook`)
      console.log('')
    })
    
    // Check for duplicate titles (shouldn't be any now)
    const { data: allRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title')
      .order('title')
    
    const titleCounts = {}
    allRecipes.forEach(recipe => {
      titleCounts[recipe.title] = (titleCounts[recipe.title] || 0) + 1
    })
    
    const duplicateTitles = Object.entries(titleCounts).filter(([title, count]) => count > 1)
    console.log(`\nDuplicate titles remaining: ${duplicateTitles.length}`)
    duplicateTitles.forEach(([title, count]) => {
      console.log(`- "${title}" appears ${count} times`)
    })
    
    // Show a comprehensive sample
    const { data: sampleRecipes } = await supabase
      .from('enhanced_meals')
      .select('id, title, meat_type, cooking_method, prep_time, cook_time, calories, protein')
      .order('title')
      .limit(15)
    
    console.log(`\n📋 Sample of your professional recipes:`)
    console.log('='.repeat(60))
    sampleRecipes.forEach(recipe => {
      const totalTime = (parseInt(recipe.prep_time) || 0) + (parseInt(recipe.cook_time) || 0)
      console.log(`${recipe.title}`)
      console.log(`  🥩 ${recipe.meat_type} | 🍳 ${recipe.cooking_method}`)
      console.log(`  ⏱️  ${totalTime} min total | 📊 ${recipe.calories} cal, ${recipe.protein}g protein`)
      console.log('')
    })
    
    console.log(`\n✅ Database verification complete!`)
    console.log(`Your database now contains ${count} professional carnivore recipes.`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

verifyFinalRecipes()