import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define types for meal plans
export interface MealPlan {
  id?: string
  user_id: string
  name: string
  target_date: string // ISO date string
  status: MealPlanStatus
  days: number
  total_calories?: number
  total_protein?: number
  notes?: string
  created_at?: string
  updated_at?: string
  meals?: Meal[]
}

export interface Meal {
  id?: string
  meal_plan_id: string
  day: number
  meal_type: MealType
  recipe_id: string
  servings: number
  calories?: number
  protein?: number
  notes?: string
  recipe?: Recipe
}

export interface Recipe {
  id: string
  title: string
  meal_or_snack?: string
  meat_type?: string
  cooking_method?: string
  prep_time?: string
  cook_time?: string
  strict_carnivore?: boolean
  fat_grams?: number
  protein_grams?: number
  carbs_grams?: number
  calories?: number
  ingredients: string
  instructions: string
  difficulty_level?: string
  serving_size?: number
  created_at?: string
  updated_at?: string
}

export interface RecipeIngredient {
  id?: string
  recipe_id: string
  ingredient_name: string
  amount: number
  unit: string
  calories?: number
  protein?: number
}

export enum MealPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch', 
  DINNER = 'dinner',
  SNACK = 'snack'
}

/**
 * Service for managing meal plans and meals
 */
export class MealPlanService {
  /**
   * Create a new meal plan
   */
  async createMealPlan(mealPlan: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>): Promise<MealPlan> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          ...mealPlan,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create meal plan: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error creating meal plan:', error)
      throw new Error('Failed to create meal plan')
    }
  }

  /**
   * Get meal plan by ID
   */
  async getMealPlan(id: string): Promise<MealPlan | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meals (
            *,
            recipe:enhanced_meals (*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found
        }
        throw new Error(`Failed to get meal plan: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error getting meal plan:', error)
      throw new Error('Failed to get meal plan')
    }
  }

  /**
   * Get all meal plans for a user
   */
  async getUserMealPlans(userId: string, status?: MealPlanStatus): Promise<MealPlan[]> {
    try {
      let query = supabase
        .from('meal_plans')
        .select(`
          *,
          meals (
            *,
            recipe:enhanced_meals (title, calories, protein_grams)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get user meal plans: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting user meal plans:', error)
      throw new Error('Failed to get user meal plans')
    }
  }

  /**
   * Update meal plan
   */
  async updateMealPlan(id: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update meal plan: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating meal plan:', error)
      throw new Error('Failed to update meal plan')
    }
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(id: string): Promise<void> {
    try {
      // First delete associated meals
      const { error: mealsError } = await supabase
        .from('meals')
        .delete()
        .eq('meal_plan_id', id)

      if (mealsError) {
        throw new Error(`Failed to delete meals: ${mealsError.message}`)
      }

      // Then delete the meal plan
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete meal plan: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      throw new Error('Failed to delete meal plan')
    }
  }

  /**
   * Add meal to meal plan
   */
  async addMeal(meal: Omit<Meal, 'id'>): Promise<Meal> {
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert(meal)
        .select(`
          *,
          recipe:enhanced_meals (*)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to add meal: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error adding meal:', error)
      throw new Error('Failed to add meal')
    }
  }

  /**
   * Update meal
   */
  async updateMeal(id: string, updates: Partial<Meal>): Promise<Meal> {
    try {
      const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          recipe:enhanced_meals (*)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update meal: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating meal:', error)
      throw new Error('Failed to update meal')
    }
  }

  /**
   * Remove meal from meal plan
   */
  async removeMeal(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to remove meal: ${error.message}`)
      }
    } catch (error) {
      console.error('Error removing meal:', error)
      throw new Error('Failed to remove meal')
    }
  }

  /**
   * Generate meal plan based on user preferences and dietary requirements
   */
  async generateMealPlan(
    userId: string,
    days: number,
    preferences: {
      caloriesPerDay?: number
      proteinPerDay?: number
      mealsPerDay?: number
      avoidIngredients?: string[]
      favoriteRecipes?: string[]
    } = {}
  ): Promise<MealPlan> {
    try {
      // This is a simplified version - in a real app, you'd have more sophisticated logic
      // Get user's dietary preferences
      const { data: userPrefs } = await supabase
        .from('preference_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Get suitable recipes from enhanced_meals
      let recipesQuery = supabase
        .from('enhanced_meals')
        .select('*')
        .order('calories', { ascending: true })
        .limit(days * (preferences.mealsPerDay || 3))

      if (preferences.avoidIngredients && preferences.avoidIngredients.length > 0) {
        // Filter out recipes with avoided ingredients
        // This would need more complex logic in a real implementation
      }

      const { data: recipes, error: recipesError } = await recipesQuery

      if (recipesError) {
        throw new Error(`Failed to get recipes: ${recipesError.message}`)
      }

      if (!recipes || recipes.length === 0) {
        throw new Error('No suitable recipes found')
      }

      // Create the meal plan
      const mealPlan = await this.createMealPlan({
        user_id: userId,
        name: `Generated Plan - ${new Date().toLocaleDateString()}`,
        target_date: new Date().toISOString(),
        status: MealPlanStatus.DRAFT,
        days: days,
        notes: 'Generated meal plan'
      })

      // Add meals to the plan
      const mealsPerDay = preferences.mealsPerDay || 3
      const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK]

      for (let day = 1; day <= days; day++) {
        for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
          const recipe = recipes[Math.floor(Math.random() * recipes.length)]
          const mealType = mealTypes[mealIndex % mealTypes.length]

          await this.addMeal({
            meal_plan_id: mealPlan.id!,
            day: day,
            meal_type: mealType,
            recipe_id: recipe.id,
            servings: 1,
            calories: recipe.calories_per_serving || 0,
            protein: recipe.protein_per_serving || 0
          })
        }
      }

      // Return the complete meal plan
      return await this.getMealPlan(mealPlan.id!) as MealPlan
    } catch (error) {
      console.error('Error generating meal plan:', error)
      throw new Error('Failed to generate meal plan')
    }
  }

  /**
   * Calculate total nutrition for a meal plan
   */
  async calculateNutrition(mealPlanId: string): Promise<{
    totalCalories: number
    totalProtein: number
    dailyAverages: {
      calories: number
      protein: number
    }
  }> {
    try {
      const { data: meals, error } = await supabase
        .from('meals')
        .select('calories, protein, servings')
        .eq('meal_plan_id', mealPlanId)

      if (error) {
        throw new Error(`Failed to get meals: ${error.message}`)
      }

      if (!meals || meals.length === 0) {
        return {
          totalCalories: 0,
          totalProtein: 0,
          dailyAverages: { calories: 0, protein: 0 }
        }
      }

      const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0) * meal.servings, 0)
      const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0) * meal.servings, 0)

      // Get meal plan to determine number of days
      const { data: mealPlan } = await supabase
        .from('meal_plans')
        .select('days')
        .eq('id', mealPlanId)
        .single()

      const days = mealPlan?.days || 1

      return {
        totalCalories,
        totalProtein,
        dailyAverages: {
          calories: totalCalories / days,
          protein: totalProtein / days
        }
      }
    } catch (error) {
      console.error('Error calculating nutrition:', error)
      throw new Error('Failed to calculate nutrition')
    }
  }
}

export default new MealPlanService()