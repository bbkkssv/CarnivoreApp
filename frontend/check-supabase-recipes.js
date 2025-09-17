const { Pool } = require('pg')
require('dotenv').config()

// Parse the DATABASE_URL to get connection details
const databaseUrl = process.env.DATABASE_URL
const url = new URL(databaseUrl)

const pool = new Pool({
  user: url.username,
  password: url.password, 
  host: url.hostname,
  port: url.port,
  database: url.pathname.slice(1), // Remove leading slash
  ssl: { rejectUnauthorized: false }
})

async function checkSupabaseRecipes() {
  try {
    console.log('🔍 Checking Supabase enhanced_meals table...')
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM enhanced_meals')
    console.log(`Total recipes: ${countResult.rows[0].count}`)
    
    // Get first 15 recipes to see what's in there
    const firstRecipes = await pool.query(`
      SELECT id, title, meat_type, ingredients 
      FROM enhanced_meals 
      ORDER BY id 
      LIMIT 15
    `)
    
    console.log('\nFirst 15 recipes in database:')
    console.log('='.repeat(50))
    firstRecipes.rows.forEach(row => {
      const shortIngredients = row.ingredients ? row.ingredients.substring(0, 40) + '...' : 'No ingredients'
      console.log(`${row.id}: ${row.title}`)
      console.log(`   Type: ${row.meat_type}`)
      console.log(`   Ingredients: ${shortIngredients}`)
      console.log('')
    })
    
    // Check for your imported recipes - they should have more detailed ingredients
    const detailedRecipes = await pool.query(`
      SELECT id, title, meat_type 
      FROM enhanced_meals 
      WHERE ingredients LIKE '%oz%' OR ingredients LIKE '%tbsp%' OR ingredients LIKE '%tsp%'
      ORDER BY id
      LIMIT 10
    `)
    
    console.log(`\nFound ${detailedRecipes.rows.length} recipes with detailed measurements (your imported recipes):`)
    console.log('='.repeat(60))
    detailedRecipes.rows.forEach(row => {
      console.log(`${row.id}: ${row.title} (${row.meat_type})`)
    })
    
    // Check for simple test recipes (likely the original ones)
    const simpleRecipes = await pool.query(`
      SELECT id, title, meat_type, ingredients 
      FROM enhanced_meals 
      WHERE (ingredients NOT LIKE '%oz%' AND ingredients NOT LIKE '%tbsp%' AND ingredients NOT LIKE '%tsp%')
         OR ingredients IS NULL 
         OR length(ingredients) < 50
      ORDER BY id
    `)
    
    console.log(`\nFound ${simpleRecipes.rows.length} simple recipes (likely original test meals to remove):`)
    console.log('='.repeat(60))
    simpleRecipes.rows.forEach(row => {
      console.log(`${row.id}: ${row.title} (${row.meat_type})`)
      console.log(`   Ingredients: ${row.ingredients || 'None'}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkSupabaseRecipes()