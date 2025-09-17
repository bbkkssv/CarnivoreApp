import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define types for shopping lists
export interface ShoppingList {
  id?: string
  user_id: string
  name: string
  meal_plan_id?: string
  status: ShoppingListStatus
  store_preference?: string
  estimated_cost?: number
  notes?: string
  created_at?: string
  updated_at?: string
  items?: ShoppingListItem[]
}

export interface ShoppingListItem {
  id?: string
  shopping_list_id: string
  ingredient_name: string
  amount: number
  unit: string
  category?: string
  estimated_price?: number
  purchased: boolean
  notes?: string
  created_at?: string
}

export enum ShoppingListStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum ItemCategory {
  MEAT = 'meat',
  SEAFOOD = 'seafood',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  FATS = 'fats',
  ORGANS = 'organs',
  SEASONINGS = 'seasonings',
  OTHER = 'other'
}

/**
 * Service for managing shopping lists and shopping list items
 */
export class ShoppingListService {
  /**
   * Create a new shopping list
   */
  async createShoppingList(shoppingList: Omit<ShoppingList, 'id' | 'created_at' | 'updated_at'>): Promise<ShoppingList> {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          ...shoppingList,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create shopping list: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error creating shopping list:', error)
      throw new Error('Failed to create shopping list')
    }
  }

  /**
   * Get shopping list by ID
   */
  async getShoppingList(id: string): Promise<ShoppingList | null> {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items (*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to get shopping list: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting shopping list:', error)
      throw new Error('Failed to get shopping list')
    }
  }

  /**
   * Get all shopping lists for a user
   */
  async getUserShoppingLists(userId: string, status?: ShoppingListStatus): Promise<ShoppingList[]> {
    try {
      let query = supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_list_items (
            *
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get user shopping lists: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting user shopping lists:', error)
      throw new Error('Failed to get user shopping lists')
    }
  }

  /**
   * Update shopping list
   */
  async updateShoppingList(id: string, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update shopping list: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating shopping list:', error)
      throw new Error('Failed to update shopping list')
    }
  }

  /**
   * Delete shopping list
   */
  async deleteShoppingList(id: string): Promise<void> {
    try {
      // First delete associated items
      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('shopping_list_id', id)

      if (itemsError) {
        throw new Error(`Failed to delete shopping list items: ${itemsError.message}`)
      }

      // Then delete the shopping list
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete shopping list: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting shopping list:', error)
      throw new Error('Failed to delete shopping list')
    }
  }

  /**
   * Add item to shopping list
   */
  async addItem(item: Omit<ShoppingListItem, 'id' | 'created_at'>): Promise<ShoppingListItem> {
    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert({
          ...item,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add shopping list item: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error adding shopping list item:', error)
      throw new Error('Failed to add shopping list item')
    }
  }

  /**
   * Update shopping list item
   */
  async updateItem(id: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update shopping list item: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating shopping list item:', error)
      throw new Error('Failed to update shopping list item')
    }
  }

  /**
   * Remove item from shopping list
   */
  async removeItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to remove shopping list item: ${error.message}`)
      }
    } catch (error) {
      console.error('Error removing shopping list item:', error)
      throw new Error('Failed to remove shopping list item')
    }
  }

  /**
   * Mark item as purchased/unpurchased
   */
  async toggleItemPurchased(id: string): Promise<ShoppingListItem> {
    try {
      // First get current status
      const { data: currentItem, error: getError } = await supabase
        .from('shopping_list_items')
        .select('purchased')
        .eq('id', id)
        .single()

      if (getError) {
        throw new Error(`Failed to get item status: ${getError.message}`)
      }

      // Toggle the status
      const { data, error } = await supabase
        .from('shopping_list_items')
        .update({ purchased: !currentItem.purchased })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to toggle item status: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error toggling item purchased status:', error)
      throw new Error('Failed to toggle item purchased status')
    }
  }

  /**
   * Generate shopping list from meal plan
   */
  async generateFromMealPlan(userId: string, mealPlanId: string, listName?: string): Promise<ShoppingList> {
    try {
      // Get the meal plan with meals and enhanced_meals
      const { data: mealPlan, error: mealPlanError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals (
            *,
            recipe:enhanced_meals (*)
          )
        `)
        .eq('id', mealPlanId)
        .eq('user_id', userId) // Ensure user owns the meal plan
        .single()

      if (mealPlanError) {
        throw new Error(`Failed to get meal plan: ${mealPlanError.message}`)
      }

      if (!mealPlan) {
        throw new Error('Meal plan not found or access denied')
      }

      // Create the shopping list
      const shoppingList = await this.createShoppingList({
        user_id: userId,
        meal_plan_id: mealPlanId,
        name: listName || `Shopping for ${mealPlan.name}`,
        status: ShoppingListStatus.DRAFT,
        notes: `Generated from meal plan: ${mealPlan.name}`
      })

      // Aggregate ingredients from all meals
      const ingredientMap = new Map<string, {
        name: string
        totalAmount: number
        unit: string
        category?: string
        estimatedPrice?: number
      }>()

      if (mealPlan.meals) {
        for (const meal of mealPlan.meals) {
          if (meal.recipe && meal.recipe.ingredients) {
            // Parse ingredients string from enhanced_meals format
            // Example: "1 ribeye steak (about 10.5 oz/300 g); 1 tbsp butter; 2 tsp salt"
            const ingredientParts = meal.recipe.ingredients.split(';')
            
            for (const ingredientStr of ingredientParts) {
              const trimmed = ingredientStr.trim()
              if (trimmed) {
                // Basic parsing - extract amount, unit, and ingredient name
                const parsed = this.parseIngredientString(trimmed)
                if (parsed) {
                  const key = `${parsed.name}_${parsed.unit}`
                  const existingIngredient = ingredientMap.get(key)
                  
                  if (existingIngredient) {
                    existingIngredient.totalAmount += parsed.amount * meal.servings
                  } else {
                    ingredientMap.set(key, {
                      name: parsed.name,
                      totalAmount: parsed.amount * meal.servings,
                      unit: parsed.unit,
                      category: this.categorizeIngredient(parsed.name)
                    })
                  }
                }
              }
            }
          }
        }
      }

      // Add items to shopping list
      const ingredients = Array.from(ingredientMap.values())
      for (const ingredient of ingredients) {
        await this.addItem({
          shopping_list_id: shoppingList.id!,
          ingredient_name: ingredient.name,
          amount: ingredient.totalAmount,
          unit: ingredient.unit,
          category: ingredient.category,
          purchased: false,
          estimated_price: ingredient.estimatedPrice
        })
      }

      // Return the complete shopping list
      return await this.getShoppingList(shoppingList.id!) as ShoppingList
    } catch (error) {
      console.error('Error generating shopping list from meal plan:', error)
      throw new Error('Failed to generate shopping list from meal plan')
    }
  }

  /**
   * Calculate total estimated cost of shopping list
   */
  async calculateEstimatedCost(shoppingListId: string): Promise<number> {
    try {
      const { data: items, error } = await supabase
        .from('shopping_list_items')
        .select('estimated_price, amount')
        .eq('shopping_list_id', shoppingListId)

      if (error) {
        throw new Error(`Failed to get shopping list items: ${error.message}`)
      }

      if (!items || items.length === 0) {
        return 0
      }

      return items.reduce((total, item) => {
        return total + (item.estimated_price || 0) * item.amount
      }, 0)
    } catch (error) {
      console.error('Error calculating estimated cost:', error)
      return 0
    }
  }

  /**
   * Get shopping progress summary
   */
  async getShoppingProgress(shoppingListId: string): Promise<{
    totalItems: number
    purchasedItems: number
    remainingItems: number
    completionPercentage: number
    estimatedCost: number
    spentAmount: number
  }> {
    try {
      const { data: items, error } = await supabase
        .from('shopping_list_items')
        .select('purchased, estimated_price, amount')
        .eq('shopping_list_id', shoppingListId)

      if (error) {
        throw new Error(`Failed to get shopping list items: ${error.message}`)
      }

      if (!items || items.length === 0) {
        return {
          totalItems: 0,
          purchasedItems: 0,
          remainingItems: 0,
          completionPercentage: 0,
          estimatedCost: 0,
          spentAmount: 0
        }
      }

      const totalItems = items.length
      const purchasedItems = items.filter(item => item.purchased).length
      const remainingItems = totalItems - purchasedItems
      const completionPercentage = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0

      const estimatedCost = items.reduce((total, item) => 
        total + (item.estimated_price || 0) * item.amount, 0
      )

      const spentAmount = items
        .filter(item => item.purchased)
        .reduce((total, item) => total + (item.estimated_price || 0) * item.amount, 0)

      return {
        totalItems,
        purchasedItems,
        remainingItems,
        completionPercentage: Math.round(completionPercentage),
        estimatedCost,
        spentAmount
      }
    } catch (error) {
      console.error('Error getting shopping progress:', error)
      throw new Error('Failed to get shopping progress')
    }
  }

  /**
   * Categorize ingredient for better organization
   */
  private categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase()
    
    if (name.includes('beef') || name.includes('steak') || name.includes('ground') || name.includes('chuck') || name.includes('ribeye') || name.includes('sirloin')) {
      return ItemCategory.MEAT
    }
    if (name.includes('salmon') || name.includes('tuna') || name.includes('fish') || name.includes('shrimp') || name.includes('crab') || name.includes('lobster')) {
      return ItemCategory.SEAFOOD
    }
    if (name.includes('cheese') || name.includes('butter') || name.includes('cream') || name.includes('milk')) {
      return ItemCategory.DAIRY
    }
    if (name.includes('egg')) {
      return ItemCategory.EGGS
    }
    if (name.includes('fat') || name.includes('oil') || name.includes('lard') || name.includes('tallow')) {
      return ItemCategory.FATS
    }
    if (name.includes('liver') || name.includes('kidney') || name.includes('heart') || name.includes('organ')) {
      return ItemCategory.ORGANS
    }
    if (name.includes('salt') || name.includes('pepper') || name.includes('seasoning') || name.includes('spice')) {
      return ItemCategory.SEASONINGS
    }
    
    return ItemCategory.OTHER
  }

  /**
   * Parse ingredient string from enhanced_meals format
   * Example: "1 ribeye steak (about 10.5 oz/300 g)" -> { amount: 1, unit: 'piece', name: 'ribeye steak' }
   */
  private parseIngredientString(ingredientStr: string): { name: string; amount: number; unit: string } | null {
    try {
      // Remove parenthetical information
      let cleaned = ingredientStr.replace(/\([^)]*\)/g, '').trim()
      
      // Common patterns for ingredient strings
      const patterns = [
        // "1 tbsp butter"
        /^(\d+(?:\.\d+)?)\s+(tbsp|tsp|cup|lb|oz|piece|pieces|medium|large|small)\s+(.+)$/i,
        // "2 ribeye steaks"  
        /^(\d+(?:\.\d+)?)\s+(.+)$/
      ]
      
      for (const pattern of patterns) {
        const match = cleaned.match(pattern)
        if (match) {
          const amount = parseFloat(match[1])
          let unit = match.length > 3 ? match[2] : 'piece'
          let name = match.length > 3 ? match[3] : match[2]
          
          // Normalize units
          unit = unit.toLowerCase()
          if (unit.endsWith('s')) unit = unit.slice(0, -1) // Remove plural
          
          // Clean up name
          name = name.trim().toLowerCase()
          
          return { name, amount, unit }
        }
      }
      
      // Fallback - treat as single item
      return { name: cleaned.toLowerCase(), amount: 1, unit: 'piece' }
    } catch (error) {
      console.warn(`Could not parse ingredient: ${ingredientStr}`)
      return null
    }
  }

  /**
   * Export shopping list to text format
   */
  async exportToText(shoppingListId: string): Promise<string> {
    try {
      const shoppingList = await this.getShoppingList(shoppingListId)
      
      if (!shoppingList) {
        throw new Error('Shopping list not found')
      }

      let text = `Shopping List: ${shoppingList.name}\n`
      text += `Created: ${new Date(shoppingList.created_at!).toLocaleDateString()}\n\n`

      if (shoppingList.items && shoppingList.items.length > 0) {
        // Group items by category
        const itemsByCategory = shoppingList.items.reduce((acc, item) => {
          const category = item.category || 'Other'
          if (!acc[category]) {
            acc[category] = []
          }
          acc[category].push(item)
          return acc
        }, {} as Record<string, ShoppingListItem[]>)

        for (const [category, items] of Object.entries(itemsByCategory)) {
          text += `${category.toUpperCase()}:\n`
          for (const item of items) {
            const status = item.purchased ? '✓' : '☐'
            text += `  ${status} ${item.amount} ${item.unit} ${item.ingredient_name}\n`
            if (item.notes) {
              text += `    Note: ${item.notes}\n`
            }
          }
          text += '\n'
        }
      } else {
        text += 'No items in this shopping list.\n'
      }

      return text
    } catch (error) {
      console.error('Error exporting shopping list:', error)
      throw new Error('Failed to export shopping list')
    }
  }
}

export default new ShoppingListService()