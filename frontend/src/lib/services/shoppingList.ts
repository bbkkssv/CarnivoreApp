import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Ingredient {
  name: string
  amount: number
  unit: string
  category?: string
  optional?: boolean
}

export interface ShoppingListItem {
  id: string
  name: string
  amount: number
  unit: string
  category: string
  checked: boolean
  estimatedPrice?: number
  instacartProductId?: string
  notes?: string
}

export interface ShoppingList {
  id: string
  userId: string
  mealPlanId: string
  items: ShoppingListItem[]
  exportFormats: string[]
  totalItems: number
  checkedItems: number
  estimatedTotal?: number
  createdAt: Date
  updatedAt: Date
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json'
  includeChecked?: boolean
  groupByCategory?: boolean
  includePrices?: boolean
}

export class ShoppingListService {
  
  /**
   * Generate shopping list from a meal plan
   */
  async generateFromMealPlan(mealPlanId: string): Promise<ShoppingList> {
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

      // Aggregate ingredients from all accepted meals
      const aggregatedIngredients = this.aggregateIngredients(mealPlan.meal_plan_days)

      // Generate shopping list items
      const items = this.createShoppingListItems(aggregatedIngredients)

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
        exportFormats: ['csv'],
        totalItems: items.length,
        checkedItems: 0,
        createdAt: new Date(shoppingList.created_at),
        updatedAt: new Date(shoppingList.updated_at)
      }

    } catch (error) {
      console.error('Error generating shopping list from meal plan:', error)
      throw new Error('Failed to generate shopping list')
    }
  }

  /**
   * Get shopping list by ID
   */
  async getShoppingList(shoppingListId: string): Promise<ShoppingList | null> {
    try {
      const { data: list, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', shoppingListId)
        .single()

      if (error || !list) return null

      const items = list.items as ShoppingListItem[]
      const checkedItems = items.filter(item => item.checked).length

      return {
        id: list.id,
        userId: list.user_id,
        mealPlanId: list.meal_plan_id,
        items: items,
        exportFormats: list.export_formats || ['csv'],
        totalItems: items.length,
        checkedItems: checkedItems,
        estimatedTotal: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
        createdAt: new Date(list.created_at),
        updatedAt: new Date(list.updated_at)
      }

    } catch (error) {
      console.error('Error fetching shopping list:', error)
      throw new Error('Failed to fetch shopping list')
    }
  }

  /**
   * Update item checked status
   */
  async updateItemChecked(shoppingListId: string, itemId: string, checked: boolean): Promise<void> {
    try {
      // Get current shopping list
      const { data: list, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('items')
        .eq('id', shoppingListId)
        .single()

      if (fetchError || !list) throw new Error('Shopping list not found')

      // Update the specific item
      const items = list.items as ShoppingListItem[]
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
      console.error('Error updating item checked status:', error)
      throw new Error('Failed to update item')
    }
  }

  /**
   * Add custom item to shopping list
   */
  async addCustomItem(shoppingListId: string, item: Omit<ShoppingListItem, 'id' | 'checked'>): Promise<void> {
    try {
      // Get current shopping list
      const { data: list, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('items')
        .eq('id', shoppingListId)
        .single()

      if (fetchError || !list) throw new Error('Shopping list not found')

      // Add the new item
      const items = list.items as ShoppingListItem[]
      const newItem: ShoppingListItem = {
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        checked: false
      }

      items.push(newItem)

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
      console.error('Error adding custom item:', error)
      throw new Error('Failed to add custom item')
    }
  }

  /**
   * Remove item from shopping list
   */
  async removeItem(shoppingListId: string, itemId: string): Promise<void> {
    try {
      // Get current shopping list
      const { data: list, error: fetchError } = await supabase
        .from('shopping_lists')
        .select('items')
        .eq('id', shoppingListId)
        .single()

      if (fetchError || !list) throw new Error('Shopping list not found')

      // Remove the item
      const items = (list.items as ShoppingListItem[]).filter(item => item.id !== itemId)

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
      console.error('Error removing item:', error)
      throw new Error('Failed to remove item')
    }
  }

  /**
   * Export shopping list in specified format
   */
  async exportList(shoppingListId: string, options: ExportOptions): Promise<string> {
    try {
      const list = await this.getShoppingList(shoppingListId)
      if (!list) throw new Error('Shopping list not found')

      let items = list.items
      
      // Filter items based on options
      if (!options.includeChecked) {
        items = items.filter(item => !item.checked)
      }

      // Sort/group by category if requested
      if (options.groupByCategory) {
        items = items.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
      }

      switch (options.format) {
        case 'csv':
          return this.exportToCSV(items, options)
        case 'pdf':
          return this.exportToPDF(items, options)
        case 'json':
          return JSON.stringify(items, null, 2)
        default:
          throw new Error('Unsupported export format')
      }

    } catch (error) {
      console.error('Error exporting shopping list:', error)
      throw new Error('Failed to export shopping list')
    }
  }

  /**
   * Get user's shopping lists
   */
  async getUserShoppingLists(userId: string): Promise<ShoppingList[]> {
    try {
      const { data: lists, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (lists || []).map(list => {
        const items = list.items as ShoppingListItem[]
        const checkedItems = items.filter(item => item.checked).length

        return {
          id: list.id,
          userId: list.user_id,
          mealPlanId: list.meal_plan_id,
          items: items,
          exportFormats: list.export_formats || ['csv'],
          totalItems: items.length,
          checkedItems: checkedItems,
          estimatedTotal: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
          createdAt: new Date(list.created_at),
          updatedAt: new Date(list.updated_at)
        }
      })

    } catch (error) {
      console.error('Error fetching user shopping lists:', error)
      throw new Error('Failed to fetch shopping lists')
    }
  }

  /**
   * Prepare for Instacart integration (Premium feature)
   */
  async prepareInstacartIntegration(shoppingListId: string, userId: string): Promise<{
    supported: boolean
    redirectUrl?: string
    unsupportedItems?: ShoppingListItem[]
  }> {
    try {
      // Check user subscription tier
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single()

      if (!user || user.subscription_tier === 'FREE') {
        return {
          supported: false
        }
      }

      const list = await this.getShoppingList(shoppingListId)
      if (!list) throw new Error('Shopping list not found')

      // For now, simulate Instacart preparation
      // In a real app, this would integrate with Instacart's API
      const unsupportedItems = list.items.filter(item => 
        // Some specialty carnivore items might not be available
        item.name.includes('organ') || item.name.includes('specialty')
      )

      if (user.subscription_tier === 'PREMIUM') {
        return {
          supported: true,
          redirectUrl: `https://instacart.com/checkout?list=${shoppingListId}`,
          unsupportedItems: unsupportedItems
        }
      }

      return {
        supported: user.subscription_tier === 'BASIC' ? true : false,
        unsupportedItems: unsupportedItems
      }

    } catch (error) {
      console.error('Error preparing Instacart integration:', error)
      throw new Error('Failed to prepare Instacart integration')
    }
  }

  /**
   * Aggregate ingredients from meal plan days
   */
  private aggregateIngredients(mealPlanDays: any[]): Map<string, Ingredient> {
    const ingredientMap = new Map<string, Ingredient>()

    mealPlanDays.forEach(day => {
      if (!day.accepted) return // Skip rejected meals

      const meal = day.meals
      if (!meal || !meal.ingredients) return

      const ingredients = meal.ingredients as any

      // Process main ingredients
      if (ingredients.main) {
        ingredients.main.forEach((ingredient: any) => {
          this.addToIngredientMap(ingredientMap, ingredient)
        })
      }

      // Process seasonings
      if (ingredients.seasoning) {
        ingredients.seasoning.forEach((ingredient: any) => {
          this.addToIngredientMap(ingredientMap, ingredient)
        })
      }

      // Process fats
      if (ingredients.fat) {
        ingredients.fat.forEach((ingredient: any) => {
          this.addToIngredientMap(ingredientMap, ingredient)
        })
      }
    })

    return ingredientMap
  }

  /**
   * Add ingredient to aggregation map
   */
  private addToIngredientMap(map: Map<string, Ingredient>, ingredient: any): void {
    const key = ingredient.name.toLowerCase()
    
    if (map.has(key)) {
      const existing = map.get(key)!
      // Convert amounts to same unit and add (simplified)
      existing.amount += this.parseAmount(ingredient.amount)
    } else {
      map.set(key, {
        name: ingredient.name,
        amount: this.parseAmount(ingredient.amount),
        unit: ingredient.unit,
        category: this.categorizeIngredient(ingredient.name)
      })
    }
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amount: string | number): number {
    if (typeof amount === 'number') return amount
    
    // Simple parsing - in a real app this would be more sophisticated
    const numMatch = amount.toString().match(/(\d+(?:\.\d+)?)/)
    return numMatch ? parseFloat(numMatch[1]) : 1
  }

  /**
   * Categorize ingredient for shopping organization
   */
  private categorizeIngredient(name: string): string {
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

  /**
   * Create shopping list items from aggregated ingredients
   */
  private createShoppingListItems(ingredientMap: Map<string, Ingredient>): ShoppingListItem[] {
    const items: ShoppingListItem[] = []

    ingredientMap.forEach((ingredient, key) => {
      items.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        category: ingredient.category || 'Other',
        checked: false,
        estimatedPrice: this.estimatePrice(ingredient)
      })
    })

    // Sort by category and then by name
    return items.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Estimate price for an ingredient (simplified)
   */
  private estimatePrice(ingredient: Ingredient): number {
    // Simplified price estimation - in a real app this would use actual price data
    const basePrices: Record<string, number> = {
      'beef': 12.00, // per lb
      'chicken': 4.00, // per lb
      'salmon': 15.00, // per lb
      'liver': 8.00, // per lb
      'butter': 0.25, // per tbsp
      'salt': 0.05, // per tsp
    }

    const lowerName = ingredient.name.toLowerCase()
    for (const [key, pricePerUnit] of Object.entries(basePrices)) {
      if (lowerName.includes(key)) {
        return ingredient.amount * pricePerUnit
      }
    }

    return 5.00 // Default estimate
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(items: ShoppingListItem[], options: ExportOptions): string {
    let csv = 'Name,Amount,Unit,Category'
    if (options.includePrices) {
      csv += ',Estimated Price'
    }
    csv += '\n'

    items.forEach(item => {
      let row = `"${item.name}",${item.amount},"${item.unit}","${item.category}"`
      if (options.includePrices) {
        row += `,${item.estimatedPrice?.toFixed(2) || '0.00'}`
      }
      csv += row + '\n'
    })

    return csv
  }

  /**
   * Export to PDF format (simplified - returns PDF generation instructions)
   */
  private exportToPDF(items: ShoppingListItem[], options: ExportOptions): string {
    // In a real app, this would generate an actual PDF using a library like jsPDF
    // For now, return instructions for PDF generation
    return JSON.stringify({
      format: 'pdf',
      title: 'Carnivore Shopping List',
      items: items,
      options: options,
      generateInstructions: 'Use jsPDF or similar library to generate PDF from this data'
    }, null, 2)
  }
}

export const shoppingListService = new ShoppingListService()