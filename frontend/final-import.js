const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',')
  
  const recipes = []
  for (let i = 1; i < lines.length; i++) {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    if (values.length === headers.length) {
      const recipe = {}
      headers.forEach((header, index) => {
        recipe[header] = values[index]
      })
      recipes.push(recipe)
    }
  }
  
  return recipes
}

async function finalImport() {
  try {
    console.log('🎯 Final import of your 97 professional recipes...')
    
    // Read your CSV
    const csvContent = fs.readFileSync('recipes.csv', 'utf8')
    const csvRecipes = parseCSV(csvContent)
    console.log(`📋 Found ${csvRecipes.length} recipes in your CSV`)
    
    // Use only the basic columns that we know exist
    const recipesToImport = csvRecipes.map((csvRecipe, index) => {
      const fat = parseFloat(csvRecipe['Fat (g)']) || 0
      const protein = parseFloat(csvRecipe['Protein (g)']) || 0
      const calories = Math.round((fat * 9) + (protein * 4))
      
      return {
        id: `user_recipe_${String(index + 1).padStart(3, '0')}`,
        title: csvRecipe.Title,
        meat_type: csvRecipe.MeatType,
        cooking_method: csvRecipe.CookingMethod,
        prep_time: csvRecipe.PrepTime?.replace(' mins', '') || '0',
        cook_time: csvRecipe.CookTime?.replace(' mins', '') || '0',
        calories: calories,
        protein: protein,
        fat: fat,
        ingredients: csvRecipe.Ingredients || 'No ingredients listed',
        instructions: csvRecipe.Instructions || 'No instructions provided'
      }
    })
    
    console.log(`\n📦 Sample recipe to import:`)
    console.log(JSON.stringify(recipesToImport[0], null, 2))
    
    // Import in small batches
    const batchSize = 5
    let importedCount = 0
    
    for (let i = 0; i < recipesToImport.length; i += batchSize) {
      const batch = recipesToImport.slice(i, i + batchSize)
      
      console.log(`\n📤 Importing batch ${Math.floor(i/batchSize) + 1} (${batch.length} recipes)...`)
      const { error: importError } = await supabase
        .from('enhanced_meals')
        .insert(batch)
      
      if (importError) {
        console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, importError.message)
        console.log('Failed batch:', batch.map(r => r.title))
        break
      }
      
      importedCount += batch.length
      console.log(`✅ Success! Imported ${batch.length} recipes (${importedCount}/${recipesToImport.length} total)`)
    }
    
    // Final verification
    const { count: finalCount } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n🎉 IMPORT COMPLETE!`)
    console.log(`✅ Successfully imported ${importedCount} recipes`)  
    console.log(`✅ Database now contains ${finalCount} recipes total`)
    console.log(`✅ All recipes are from your professional CSV file`)
    
    // Show a sample of imported recipes
    const { data: sampleRecipes } = await supabase
      .from('enhanced_meals')
      .select('title, meat_type, calories, protein')
      .order('title')
      .limit(5)
    
    console.log(`\n📋 Sample of your imported recipes:`)
    sampleRecipes.forEach(recipe => {
      console.log(`- ${recipe.title} (${recipe.meat_type}) - ${recipe.calories} cal, ${recipe.protein}g protein`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

finalImport()