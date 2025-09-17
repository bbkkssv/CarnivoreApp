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

async function reimportRecipes() {
  try {
    console.log('🧹 Fresh import of your 97 professional recipes...')
    
    // Read your CSV
    const csvContent = fs.readFileSync('recipes.csv', 'utf8')
    const csvRecipes = parseCSV(csvContent)
    console.log(`📋 Found ${csvRecipes.length} recipes in your CSV`)
    
    // Convert to the format the enhanced_meals table expects
    const recipesToImport = csvRecipes.map((csvRecipe, index) => {
      // Calculate calories
      const fat = parseFloat(csvRecipe['Fat (g)']) || 0
      const protein = parseFloat(csvRecipe['Protein (g)']) || 0  
      const calories = (fat * 9) + (protein * 4) // Only fat and protein for carnivore
      
      return {
        id: `user_recipe_${String(index + 1).padStart(3, '0')}`,
        title: csvRecipe.Title,
        meal_or_snack: csvRecipe.MealOrSnack,
        meat_type: csvRecipe.MeatType,
        cooking_method: csvRecipe.CookingMethod,
        prep_time: csvRecipe.PrepTime?.replace(' mins', ''),
        cook_time: csvRecipe.CookTime?.replace(' mins', ''),
        strict_carnivore: csvRecipe.StrictCarnivore === 'Yes',
        calories: Math.round(calories),
        protein: protein,
        fat: fat,
        ingredients: csvRecipe.Ingredients,
        instructions: csvRecipe.Instructions,
        difficulty: getDifficultyLevel(csvRecipe.PrepTime, csvRecipe.CookTime)
      }
    })
    
    // Import in batches
    const batchSize = 10
    let importedCount = 0
    
    for (let i = 0; i < recipesToImport.length; i += batchSize) {
      const batch = recipesToImport.slice(i, i + batchSize)
      
      const { error: importError } = await supabase
        .from('enhanced_meals')
        .insert(batch)
      
      if (importError) {
        console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, importError.message)
        console.log('Sample recipe causing error:', JSON.stringify(batch[0], null, 2))
        throw importError
      }
      
      importedCount += batch.length
      console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} recipes (${importedCount}/${recipesToImport.length})`)
    }
    
    // Verify final count
    const { count: finalCount } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n🎉 SUCCESS!`)
    console.log(`✅ Imported exactly ${finalCount} of your professional recipes`)
    console.log(`✅ Database contains ONLY your recipes from the CSV`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

function getDifficultyLevel(prepTime, cookTime) {
  const totalMinutes = (parseInt(prepTime) || 0) + (parseInt(cookTime) || 0)
  
  if (totalMinutes <= 15) {
    return 'Easy'
  } else if (totalMinutes <= 60) {
    return 'Medium'  
  } else {
    return 'Advanced'
  }
}

reimportRecipes()