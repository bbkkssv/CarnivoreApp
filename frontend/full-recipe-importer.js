const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CSV Parser function - handles your exact spreadsheet format
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  console.log('📋 Detected columns:', headers)
  
  const recipes = []
  
  for (let i = 1; i < lines.length; i++) {
    try {
      // Handle CSV parsing with commas inside quoted fields
      const values = parseCSVLine(lines[i])
      
      if (values.length < headers.length) {
        console.log(`⚠️  Row ${i + 1}: Not enough columns, skipping`)
        continue
      }
      
      const recipe = {}
      headers.forEach((header, index) => {
        recipe[header] = values[index] ? values[index].trim().replace(/"/g, '') : ''
      })
      
      // Skip empty rows
      if (!recipe.Title || recipe.Title === '') {
        continue
      }
      
      recipes.push(recipe)
      
    } catch (error) {
      console.log(`❌ Error parsing row ${i + 1}:`, error.message)
    }
  }
  
  return recipes
}

// Enhanced CSV line parser that handles commas within quotes
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"' && (i === 0 || line[i-1] === ',')) {
      inQuotes = true
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
      inQuotes = false
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

// Convert spreadsheet row to database format
function convertRecipeToDbFormat(recipe, index) {
  const recipeId = `recipe_${Date.now()}_${index.toString().padStart(3, '0')}`
  
  return {
    id: recipeId,
    title: recipe.Title || 'Untitled Recipe',
    meal_or_snack: recipe.MealOrSnack || 'Meal',
    meat_type: recipe.MeatType || 'Unknown',
    cooking_method: recipe.CookingMethod || 'Unknown',
    prep_time: recipe.PrepTime || '0 mins',
    cook_time: recipe.CookTime || '0 mins', 
    strict_carnivore: (recipe.StrictCarnivore || '').toLowerCase() === 'yes',
    fat_grams: parseFloat(recipe['Fat (g)']) || 0,
    protein_grams: parseFloat(recipe['Protein (g)']) || 0,
    carbs_grams: parseFloat(recipe['Carbs (g)']) || 0,
    calories: calculateCalories(
      parseFloat(recipe['Fat (g)']) || 0,
      parseFloat(recipe['Protein (g)']) || 0,
      parseFloat(recipe['Carbs (g)']) || 0
    ),
    ingredients: recipe.Ingredients || 'No ingredients listed',
    instructions: recipe.Instructions || 'No instructions provided',
    difficulty_level: determineDifficulty(recipe.CookingMethod, recipe.PrepTime),
    serving_size: 1
  }
}

function calculateCalories(fat, protein, carbs) {
  // 9 cal/g fat, 4 cal/g protein, 4 cal/g carbs
  return Math.round((fat * 9) + (protein * 4) + (carbs * 4))
}

function determineDifficulty(cookingMethod, prepTime) {
  const prepMinutes = parseInt(prepTime) || 0
  const method = (cookingMethod || '').toLowerCase()
  
  if (method.includes('baking') || method.includes('roasting') || prepMinutes > 30) {
    return 'Advanced'
  }
  if (method.includes('pan-frying') || method.includes('searing') || prepMinutes > 10) {
    return 'Medium'
  }
  return 'Easy'
}

// Main import function
async function importRecipesFromCSV(csvFilePath) {
  console.log('🍖 FULL RECIPE IMPORT STARTING')
  console.log('=' .repeat(50))
  
  try {
    // Read CSV file
    console.log(`📂 Reading file: ${csvFilePath}`)
    const csvContent = fs.readFileSync(csvFilePath, 'utf8')
    
    // Parse CSV
    console.log('🔍 Parsing CSV data...')
    const recipes = parseCSV(csvContent)
    console.log(`✅ Parsed ${recipes.length} recipes from CSV`)
    
    if (recipes.length === 0) {
      console.log('❌ No recipes found in CSV file')
      return
    }
    
    // Show sample of first recipe
    console.log('\n📝 Sample recipe (first one):')
    console.log(JSON.stringify(recipes[0], null, 2))
    
    // Convert to database format
    console.log('\n🔄 Converting recipes to database format...')
    const dbRecipes = recipes.map((recipe, index) => convertRecipeToDbFormat(recipe, index))
    
    // Import in batches to avoid overwhelming the database
    const batchSize = 10
    let imported = 0
    let failed = 0
    
    console.log(`\n📊 Importing ${dbRecipes.length} recipes in batches of ${batchSize}...`)
    
    for (let i = 0; i < dbRecipes.length; i += batchSize) {
      const batch = dbRecipes.slice(i, i + batchSize)
      
      console.log(`\n📦 Batch ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} recipes...`)
      
      for (const recipe of batch) {
        try {
          console.log(`   📝 Importing: ${recipe.title}`)
          
          const { data, error } = await supabase
            .from('enhanced_meals')
            .insert([recipe])
            .select()
          
          if (error) {
            console.log(`     ❌ Failed: ${error.message}`)
            failed++
          } else {
            console.log(`     ✅ Success: ${recipe.id}`)
            imported++
          }
          
        } catch (err) {
          console.log(`     ❌ Exception: ${err.message}`)
          failed++
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(50))
    console.log('🎉 IMPORT COMPLETE!')
    console.log(`✅ Successfully imported: ${imported} recipes`)
    console.log(`❌ Failed imports: ${failed} recipes`)
    console.log(`📊 Total processed: ${imported + failed} recipes`)
    
    // Show some statistics
    await showImportStatistics()
    
  } catch (error) {
    console.error('❌ Import failed:', error.message)
  }
}

// Show statistics about imported recipes
async function showImportStatistics() {
  console.log('\n📈 RECIPE DATABASE STATISTICS')
  console.log('-'.repeat(40))
  
  try {
    // Total count
    const { count } = await supabase
      .from('enhanced_meals')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Total recipes: ${count}`)
    
    // By meat type
    const { data: meatTypes } = await supabase
      .from('enhanced_meals')
      .select('meat_type, count(*)')
      .group('meat_type')
    
    if (meatTypes) {
      console.log('\n🥩 By Meat Type:')
      meatTypes.forEach(type => {
        console.log(`   ${type.meat_type}: ${type.count} recipes`)
      })
    }
    
    // By cooking method
    const { data: methods } = await supabase
      .from('enhanced_meals')
      .select('cooking_method, count(*)')
      .group('cooking_method')
    
    if (methods) {
      console.log('\n🍳 By Cooking Method:')
      methods.forEach(method => {
        console.log(`   ${method.cooking_method}: ${method.count} recipes`)
      })
    }
    
  } catch (error) {
    console.log('⚠️  Could not fetch statistics:', error.message)
  }
}

// Function to import from text data (copy/paste)
async function importRecipesFromText(textData) {
  console.log('📋 Importing from text data...')
  
  // Split by lines and parse as CSV
  const recipes = parseCSV(textData)
  
  if (recipes.length === 0) {
    console.log('❌ No recipes found in text data')
    return
  }
  
  // Convert and import
  const dbRecipes = recipes.map((recipe, index) => convertRecipeToDbFormat(recipe, index))
  
  console.log(`📊 Found ${dbRecipes.length} recipes to import`)
  
  for (const recipe of dbRecipes) {
    try {
      const { data, error } = await supabase
        .from('enhanced_meals')
        .insert([recipe])
        .select()
      
      if (error) {
        console.log(`❌ Failed to import ${recipe.title}: ${error.message}`)
      } else {
        console.log(`✅ Imported: ${recipe.title}`)
      }
      
    } catch (err) {
      console.log(`❌ Error importing ${recipe.title}: ${err.message}`)
    }
  }
}

// Main execution
if (require.main === module) {
  const csvFilePath = './recipes.csv'
  
  // Check if CSV file exists
  if (fs.existsSync(csvFilePath)) {
    importRecipesFromCSV(csvFilePath)
  } else {
    console.log('📂 CSV file not found at:', csvFilePath)
    console.log('\n📋 Please either:')
    console.log('1. Save your recipe spreadsheet as "recipes.csv" in this folder')
    console.log('2. Or provide the text data for copy/paste import')
    console.log('\nFile should be located at:')
    console.log('C:\\Users\\Business\\Documents\\source\\CarnivoreApp\\frontend\\recipes.csv')
  }
}

module.exports = { 
  importRecipesFromCSV, 
  importRecipesFromText, 
  parseCSV,
  convertRecipeToDbFormat 
}