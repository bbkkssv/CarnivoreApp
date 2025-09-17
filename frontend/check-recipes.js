const { Pool } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'carnivore_db',
  password: 'password',
  port: 5432,
})

async function checkRecipes() {
  try {
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM enhanced_meals')
    console.log(`Total recipes in database: ${countResult.rows[0].count}`)
    
    // Get first 20 recipes ordered by ID to see the original ones
    const firstRecipes = await pool.query(`
      SELECT id, title, meat_type, ingredients 
      FROM enhanced_meals 
      ORDER BY id 
      LIMIT 20
    `)
    
    console.log('\nFirst 20 recipes (likely includes original test meals):')
    console.log('='.repeat(60))
    firstRecipes.rows.forEach(row => {
      const shortIngredients = row.ingredients ? row.ingredients.substring(0, 50) + '...' : 'No ingredients'
      console.log(`${row.id}: ${row.title}`)
      console.log(`   Meat: ${row.meat_type}`)
      console.log(`   Ingredients: ${shortIngredients}`)
      console.log('')
    })
    
    // Check if we can identify the original test meals by looking for simple titles
    const simpleRecipes = await pool.query(`
      SELECT id, title, meat_type, ingredients 
      FROM enhanced_meals 
      WHERE title IN (
        'Ribeye Steak', 
        'Ground Beef Bowl', 
        'Bacon and Eggs', 
        'Grilled Chicken', 
        'Pan-fried Salmon',
        'Lamb Chops',
        'Pork Chops'
      )
      ORDER BY id
    `)
    
    if (simpleRecipes.rows.length > 0) {
      console.log('\nFound potential original test meals:')
      console.log('='.repeat(40))
      simpleRecipes.rows.forEach(row => {
        console.log(`${row.id}: ${row.title} (${row.meat_type})`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkRecipes()