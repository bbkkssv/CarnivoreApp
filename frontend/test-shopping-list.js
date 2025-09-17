require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// JavaScript version for testing
class ShoppingListService {
  async generateFromMealPlan(mealPlanId) {
    try {
      // Get meal plan with all meals
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meal_plan_days (
            *,
            meals (*)
          )
        `)
        .eq('id', mealPlanId)
        .single()

      if (planError || !mealPlan) {
        throw new Error('Meal plan not found')
      }

      // Simple ingredient aggregation
      const ingredientMap = new Map()
      
      mealPlan.meal_plan_days.forEach(day => {
        if (!day.accepted) return

        const meal = day.meals
        if (!meal || !meal.ingredients) return

        const ingredients = meal.ingredients

        // Process main ingredients
        if (ingredients.main) {
          ingredients.main.forEach(ingredient => {
            const key = ingredient.name.toLowerCase()
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key)
              existing.amount += this.parseAmount(ingredient.amount)
            } else {
              ingredientMap.set(key, {
                name: ingredient.name,
                amount: this.parseAmount(ingredient.amount),
                unit: ingredient.unit,
                category: this.categorizeIngredient(ingredient.name)
              })
            }
          })
        }

        // Process other ingredient types
        ['seasoning', 'fat'].forEach(type => {
          if (ingredients[type]) {
            ingredients[type].forEach(ingredient => {
              const key = ingredient.name.toLowerCase()
              if (ingredientMap.has(key)) {
                const existing = ingredientMap.get(key)
                existing.amount += this.parseAmount(ingredient.amount)
              } else {
                ingredientMap.set(key, {
                  name: ingredient.name,
                  amount: this.parseAmount(ingredient.amount),
                  unit: ingredient.unit,
                  category: this.categorizeIngredient(ingredient.name)
                })
              }
            })
          }
        })
      })

      // Create shopping list items
      const items = Array.from(ingredientMap.values()).map((ingredient, index) => ({
        id: `item_${Date.now()}_${index}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        category: ingredient.category,
        checked: false,
        estimatedPrice: this.estimatePrice(ingredient)
      }))

      // Sort by category
      items.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        return a.name.localeCompare(b.name)
      })

      // Create shopping list record
      const shoppingListId = `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const { data: shoppingList, error: listError } = await supabase
        .from('shopping_lists')
        .insert({
          id: shoppingListId,
          user_id: mealPlan.user_id,
          meal_plan_id: mealPlanId,
          items: items,
          export_formats: ['csv']
        })
        .select()
        .single()

      if (listError) throw listError

      return {
        id: shoppingListId,
        userId: mealPlan.user_id,
        mealPlanId: mealPlanId,
        items: items,
        totalItems: items.length,
        checkedItems: 0,
        estimatedTotal: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0)
      }

    } catch (error) {
      console.error('Error generating shopping list:', error)
      throw new Error('Failed to generate shopping list: ' + error.message)
    }
  }

  async getShoppingList(shoppingListId) {
    try {
      const { data: list, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', shoppingListId)
        .single()

      if (error || !list) return null

      const items = list.items
      const checkedItems = items.filter(item => item.checked).length

      return {
        id: list.id,
        userId: list.user_id,
        mealPlanId: list.meal_plan_id,
        items: items,
        totalItems: items.length,
        checkedItems: checkedItems,
        estimatedTotal: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0)
      }

    } catch (error) {
      console.error('Error fetching shopping list:', error)
      throw new Error('Failed to fetch shopping list: ' + error.message)
    }
  }

  async updateItemChecked(shoppingListId, itemId, checked) {
    try {
      // Get current shopping list
      const { data: list, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('items')
        .eq('id', shoppingListId)
        .single()

      if (fetchError || !list) throw new Error('Shopping list not found')

      // Update the specific item
      const items = list.items
      const itemIndex = items.findIndex(item => item.id === itemId)
      
      if (itemIndex === -1) throw new Error('Item not found')

      items[itemIndex].checked = checked

      // Update the shopping list
      const { error: updateError } = await supabase
        .from('shopping_lists')
        .update({ 
          items: items,
          updated_at: new Date().toISOString()
        })
        .eq('id', shoppingListId)

      if (updateError) throw updateError

    } catch (error) {
      console.error('Error updating item:', error)
      throw new Error('Failed to update item: ' + error.message)
    }
  }

  async exportToCSV(shoppingListId) {
    try {
      const list = await this.getShoppingList(shoppingListId)
      if (!list) throw new Error('Shopping list not found')

      let csv = 'Name,Amount,Unit,Category,Estimated Price\n'

      list.items.forEach(item => {
        csv += `"${item.name}",${item.amount},"${item.unit}","${item.category}",${(item.estimatedPrice || 0).toFixed(2)}\n`
      })

      return csv

    } catch (error) {
      console.error('Error exporting to CSV:', error)
      throw new Error('Failed to export to CSV: ' + error.message)
    }
  }

  parseAmount(amount) {
    if (typeof amount === 'number') return amount
    
    const numMatch = amount.toString().match(/(\d+(?:\.\d+)?)/)
    return numMatch ? parseFloat(numMatch[1]) : 1
  }

  categorizeIngredient(name) {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('beef') || lowerName.includes('steak') || lowerName.includes('ground')) {
      return 'Beef'
    }
    if (lowerName.includes('chicken') || lowerName.includes('poultry')) {
      return 'Poultry'
    }
    if (lowerName.includes('salmon') || lowerName.includes('fish') || lowerName.includes('seafood')) {
      return 'Seafood'
    }
    if (lowerName.includes('liver') || lowerName.includes('organ') || lowerName.includes('kidney')) {
      return 'Organ Meats'
    }
    if (lowerName.includes('butter') || lowerName.includes('tallow') || lowerName.includes('fat')) {
      return 'Fats & Oils'
    }
    if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('seasoning')) {
      return 'Seasonings'
    }
    
    return 'Other'
  }

  estimatePrice(ingredient) {
    const basePrices = {
      'beef': 12.00,
      'chicken': 4.00,
      'salmon': 15.00,
      'liver': 8.00,
      'butter': 0.25,
      'salt': 0.05,
    }

    const lowerName = ingredient.name.toLowerCase()
    for (const [key, pricePerUnit] of Object.entries(basePrices)) {
      if (lowerName.includes(key)) {
        return ingredient.amount * pricePerUnit
      }
    }

    return 5.00
  }
}

const shoppingListService = new ShoppingListService()

async function testShoppingListService() {
  try {
    console.log('🧪 Testing ShoppingListService...')

    // Get a meal plan we created in previous test
    console.log('\n1️⃣ Finding existing meal plan...')
    const { data: mealPlans } = await supabase
      .from('meal_plans')
      .select('id, user_id')
      .limit(1)

    if (!mealPlans || mealPlans.length === 0) {
      console.log('❌ No meal plans found. Please run test-meal-plan.js first.')
      return
    }

    const mealPlan = mealPlans[0]
    console.log(`✅ Found meal plan: ${mealPlan.id}`)

    // Test 1: Generate shopping list from meal plan
    console.log('\n2️⃣ Generating shopping list from meal plan...')
    const shoppingList = await shoppingListService.generateFromMealPlan(mealPlan.id)
    console.log('✅ Shopping list generated:', {
      id: shoppingList.id,
      totalItems: shoppingList.totalItems,
      estimatedTotal: `$${shoppingList.estimatedTotal.toFixed(2)}`
    })

    // Show items by category
    console.log('\n📋 Shopping List Items:')
    let currentCategory = ''
    shoppingList.items.forEach(item => {
      if (item.category !== currentCategory) {
        currentCategory = item.category
        console.log(`\n${currentCategory}:`)
      }
      console.log(`  - ${item.name}: ${item.amount} ${item.unit} ($${(item.estimatedPrice || 0).toFixed(2)})`)
    })

    // Test 2: Retrieve shopping list
    console.log('\n3️⃣ Retrieving shopping list...')
    const retrievedList = await shoppingListService.getShoppingList(shoppingList.id)
    console.log('✅ Shopping list retrieved:', {
      totalItems: retrievedList.totalItems,
      checkedItems: retrievedList.checkedItems
    })

    // Test 3: Check off an item
    if (retrievedList.items.length > 0) {
      console.log('\n4️⃣ Checking off first item...')
      const firstItem = retrievedList.items[0]
      await shoppingListService.updateItemChecked(shoppingList.id, firstItem.id, true)
      console.log(`✅ Checked off: ${firstItem.name}`)

      // Verify the update
      const updatedList = await shoppingListService.getShoppingList(shoppingList.id)
      console.log(`✅ Updated list: ${updatedList.checkedItems}/${updatedList.totalItems} items checked`)
    }

    // Test 4: Export to CSV
    console.log('\n5️⃣ Exporting to CSV...')
    const csvData = await shoppingListService.exportToCSV(shoppingList.id)
    console.log('✅ CSV export generated:')
    console.log(csvData.split('\n').slice(0, 4).join('\n')) // Show first few lines

    console.log('\n🎉 All ShoppingListService tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Full error:', error)
  }
}

testShoppingListService()