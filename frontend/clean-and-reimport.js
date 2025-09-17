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
    values.push(current.trim()) // Add the last value
    
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

async function cleanAndReimport() {
  try {
    console.log('🧹 Complete database cleanup and fresh import of your 97 recipes...')
    
    // Step 1: Delete ALL existing recipes
    console.log('\n1️⃣ Removing all existing recipes...')
    const { error: deleteError } = await supabase
      .from('enhanced_meals')
      .delete()
      .neq('id', 'this-will-never-match-anything') // This deletes all rows
    
    if (deleteError) throw deleteError
    
    // Verify it's empty
    const { count: emptyCount } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`✅ Database cleared. Remaining recipes: ${emptyCount}`)
    
    // Step 2: Read your CSV file
    console.log('\n2️⃣ Reading your recipes.csv file...')
    const csvContent = fs.readFileSync('recipes.csv', 'utf8')
    const csvRecipes = parseCSV(csvContent)
    
    console.log(`📋 Found ${csvRecipes.length} recipes in your CSV`)
    
    // Step 3: Convert and import your recipes
    console.log('\n3️⃣ Converting and importing your recipes...')
    
    const recipesToImport = csvRecipes.map((csvRecipe, index) => {
      // Calculate calories from fat, protein, carbs
      const fat = parseFloat(csvRecipe['Fat (g)']) || 0
      const protein = parseFloat(csvRecipe['Protein (g)']) || 0  
      const carbs = parseFloat(csvRecipe['Carbs (g)']) || 0
      const calories = (fat * 9) + (protein * 4) + (carbs * 4)
      
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
        carbs: carbs,
        ingredients: csvRecipe.Ingredients,
        instructions: csvRecipe.Instructions,
        difficulty: getDifficultyLevel(csvRecipe.PrepTime, csvRecipe.CookTime, csvRecipe.CookingMethod)
      }
    })
    
    // Import in batches to avoid limits
    const batchSize = 20
    let importedCount = 0
    
    for (let i = 0; i < recipesToImport.length; i += batchSize) {
      const batch = recipesToImport.slice(i, i + batchSize)
      
      const { error: importError } = await supabase
        .from('enhanced_meals')
        .insert(batch)
      
      if (importError) {
        console.error(`❌ Error importing batch ${Math.floor(i/batchSize) + 1}:`, importError.message)
        throw importError
      }
      
      importedCount += batch.length
      console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} recipes (${importedCount}/${recipesToImport.length})`)
    }
    
    // Step 4: Final verification
    console.log('\n4️⃣ Final verification...')
    const { count: finalCount } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n🎉 SUCCESS!`)
    console.log(`✅ Imported exactly ${finalCount} recipes from your CSV`)
    console.log(`✅ All previous test meals and duplicates removed`)
    console.log(`✅ Database now contains ONLY your professional recipes`)
    
    // Show sample
    const { data: sample } = await supabase
      .from('enhanced_meals')
      .select('title, meat_type, cooking_method')
      .order('title')
      .limit(5)
    
    console.log(`\n📋 Sample of your recipes:`)
    sample.forEach(recipe => {
      console.log(`- ${recipe.title} (${recipe.meat_type}, ${recipe.cooking_method})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

function getDifficultyLevel(prepTime, cookTime, cookingMethod) {
  const totalMinutes = (parseInt(prepTime) || 0) + (parseInt(cookTime) || 0)
  
  if (totalMinutes <= 15 && !cookingMethod.includes('Slow-cooking')) {
    return 'Easy'
  } else if (totalMinutes <= 60 || cookingMethod.includes('Advanced') || cookingMethod.includes('Baking')) {
    return 'Medium'  
  } else {
    return 'Advanced'
  }
}

cleanAndReimport()