import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MealPlanGenerationRequest {
  userId: string
  startDate: Date
  endDate: Date
  constraints?: {
    maxPrepTime?: number
    allowedMeats?: string[]
    exclusions?: string[]
    nutritionalProfile?: string
    budgetConstraints?: { min: number; max: number }
  }
}

export interface MealPlanDay {
  dayIndex: number
  mealId: string
  mealType: string
  accepted: boolean
}

export interface MealPlan {
  id: string
  userId: string
  startDate: Date
  endDate: Date
  constraintsSummary?: string
  status: 'DRAFT' | 'ACCEPTED' | 'ARCHIVED'
  regenerationCount: Record<string, number>
  history: any[]
  meals: MealPlanDay[]
}

export interface RegenerationRequest {
  mealPlanId: string
  dayIndex?: number // If provided, regenerate only this day
  mealType?: string // If provided, regenerate only this meal type
  reason?: string
}

export class MealPlanService {
  
  /**
   * Generate a new meal plan based on user preferences and constraints
   */
  async generateMealPlan(request: MealPlanGenerationRequest): Promise<MealPlan> {
    try {
      // Calculate number of days
      const daysDiff = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Get user's subscription tier for regeneration limits
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', request.userId)
        .single()

      if (!user) {
        throw new Error('User not found')
      }

      // Create meal plan record
      const mealPlanId = `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .insert({
          id: mealPlanId,
          user_id: request.userId,
          start_date: request.startDate.toISOString(),
          end_date: request.endDate.toISOString(),
          constraints_summary: JSON.stringify(request.constraints),
          status: 'DRAFT',
          regeneration_count: {},
          history: []
        })
        .select()
        .single()

      if (planError) throw planError

      // Generate meals for each day
      const meals = await this.selectMealsForPlan(request, daysDiff)
      
      // Create meal plan days
      const mealPlanDays = meals.map((meal, index) => ({
        id: `mpd_${Date.now()}_${index}`,
        meal_plan_id: mealPlanId,
        day_index: index,
        meal_id: meal.id,
        meal_type: 'main',
        accepted: true
      }))

      const { error: daysError } = await supabase
        .from('meal_plan_days')
        .insert(mealPlanDays)

      if (daysError) throw daysError

      return {
        id: mealPlanId,
        userId: request.userId,
        startDate: request.startDate,
        endDate: request.endDate,
        constraintsSummary: JSON.stringify(request.constraints),
        status: 'DRAFT',
        regenerationCount: {},
        history: [],
        meals: mealPlanDays.map(day => ({
          dayIndex: day.day_index,
          mealId: day.meal_id,
          mealType: day.meal_type,
          accepted: day.accepted
        }))
      }

    } catch (error) {
      console.error('Error generating meal plan:', error)
      throw new Error('Failed to generate meal plan')
    }
  }

  /**
   * Get meal plan by ID with full meal details
   */
  async getMealPlan(mealPlanId: string): Promise<MealPlan | null> {
    try {
      const { data: plan, error: planError } = await supabase
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

      if (planError || !plan) return null

      return {
        id: plan.id,
        userId: plan.user_id,
        startDate: new Date(plan.start_date),
        endDate: new Date(plan.end_date),
        constraintsSummary: plan.constraints_summary,
        status: plan.status,
        regenerationCount: plan.regeneration_count || {},
        history: plan.history || [],
        meals: plan.meal_plan_days.map((day: any) => ({
          dayIndex: day.day_index,
          mealId: day.meal_id,
          mealType: day.meal_type,
          accepted: day.accepted
        }))
      }

    } catch (error) {
      console.error('Error fetching meal plan:', error)
      throw new Error('Failed to fetch meal plan')
    }
  }

  /**
   * Accept or reject a specific meal in a meal plan
   */
  async acceptMeal(mealPlanId: string, dayIndex: number, accepted: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('meal_plan_days')
        .update({ accepted })
        .eq('meal_plan_id', mealPlanId)
        .eq('day_index', dayIndex)

      if (error) throw error

      // Update meal plan history
      await this.addToHistory(mealPlanId, {
        action: accepted ? 'meal_accepted' : 'meal_rejected',
        dayIndex,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error updating meal acceptance:', error)
      throw new Error('Failed to update meal acceptance')
    }
  }

  /**
   * Regenerate meals for a meal plan (with tier-based limits)
   */
  async regenerateMeals(request: RegenerationRequest): Promise<MealPlan> {
    try {
      // Get current meal plan
      const currentPlan = await this.getMealPlan(request.mealPlanId)
      if (!currentPlan) {
        throw new Error('Meal plan not found')
      }

      // Check regeneration limits based on user subscription tier
      const canRegenerate = await this.checkRegenerationLimits(
        currentPlan.userId,
        request.mealPlanId,
        request.dayIndex
      )

      if (!canRegenerate.allowed) {
        throw new Error(canRegenerate.reason || 'Regeneration limit exceeded')
      }

      // If specific day/meal type, regenerate only that
      if (request.dayIndex !== undefined) {
        await this.regenerateSpecificDay(request.mealPlanId, request.dayIndex, request.mealType)
      } else {
        // Regenerate entire meal plan
        await this.regenerateEntirePlan(request.mealPlanId)
      }

      // Update regeneration count
      await this.updateRegenerationCount(request.mealPlanId, request.dayIndex)

      // Add to history
      await this.addToHistory(request.mealPlanId, {
        action: 'regenerated',
        dayIndex: request.dayIndex,
        reason: request.reason,
        timestamp: new Date().toISOString()
      })

      // Return updated meal plan
      return this.getMealPlan(request.mealPlanId) as Promise<MealPlan>

    } catch (error) {
      console.error('Error regenerating meals:', error)
      throw new Error('Failed to regenerate meals')
    }
  }

  /**
   * Accept entire meal plan (change status from DRAFT to ACCEPTED)
   */
  async acceptMealPlan(mealPlanId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ 
          status: 'ACCEPTED',
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId)

      if (error) throw error

      await this.addToHistory(mealPlanId, {
        action: 'plan_accepted',
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error accepting meal plan:', error)
      throw new Error('Failed to accept meal plan')
    }
  }

  /**
   * Get user's meal plans
   */
  async getUserMealPlans(userId: string, status?: string): Promise<MealPlan[]> {
    try {
      let query = supabase
        .from('meal_plans')
        .select(`
          *,
          meal_plan_days (
            *,
            meals (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: plans, error } = await query

      if (error) throw error

      return (plans || []).map(plan => ({
        id: plan.id,
        userId: plan.user_id,
        startDate: new Date(plan.start_date),
        endDate: new Date(plan.end_date),
        constraintsSummary: plan.constraints_summary,
        status: plan.status,
        regenerationCount: plan.regeneration_count || {},
        history: plan.history || [],
        meals: (plan.meal_plan_days || []).map((day: any) => ({
          dayIndex: day.day_index,
          mealId: day.meal_id,
          mealType: day.meal_type,
          accepted: day.accepted
        }))
      }))

    } catch (error) {
      console.error('Error fetching user meal plans:', error)
      throw new Error('Failed to fetch meal plans')
    }
  }

  /**
   * Select appropriate meals based on constraints
   */
  private async selectMealsForPlan(request: MealPlanGenerationRequest, days: number) {
    try {
      // Get all available meals
      let query = supabase
        .from('meals')
        .select('*')

      // Apply constraints
      if (request.constraints?.maxPrepTime) {
        // Note: This would need custom filtering since we can't directly filter JSON in Supabase
        // For now, get all meals and filter in code
      }

      const { data: allMeals, error } = await query

      if (error) throw error

      // Filter meals based on constraints
      let availableMeals = allMeals || []

      if (request.constraints) {
        availableMeals = availableMeals.filter(meal => {
          // Filter by prep effort if max prep time is specified
          if (request.constraints!.maxPrepTime && request.constraints!.maxPrepTime < 45) {
            return meal.prep_effort_tag === 'easy'
          }
          if (request.constraints!.maxPrepTime && request.constraints!.maxPrepTime < 90) {
            return ['easy', 'medium'].includes(meal.prep_effort_tag)
          }
          return true
        })
      }

      // Ensure we have enough meals
      if (availableMeals.length === 0) {
        throw new Error('No meals available matching constraints')
      }

      // Select meals for each day (with some variety)
      const selectedMeals = []
      for (let i = 0; i < days; i++) {
        const mealIndex = i % availableMeals.length
        selectedMeals.push(availableMeals[mealIndex])
      }

      return selectedMeals

    } catch (error) {
      console.error('Error selecting meals:', error)
      throw new Error('Failed to select meals for plan')
    }
  }

  /**
   * Check if user can regenerate meals based on subscription tier
   */
  private async checkRegenerationLimits(userId: string, mealPlanId: string, dayIndex?: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get user subscription tier
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single()

      if (!user) {
        return { allowed: false, reason: 'User not found' }
      }

      // Get current regeneration count
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('regeneration_count')
        .eq('id', mealPlanId)
        .single()

      if (!plan) {
        return { allowed: false, reason: 'Meal plan not found' }
      }

      const regenerationCount = plan.regeneration_count || {}
      const key = dayIndex !== undefined ? `day_${dayIndex}` : 'full_plan'
      const currentCount = regenerationCount[key] || 0

      // Define limits based on subscription tier
      const limits = {
        FREE: { fullPlan: 1, perDay: 1 },
        BASIC: { fullPlan: 3, perDay: 2 },
        PREMIUM: { fullPlan: -1, perDay: -1 } // Unlimited
      }

      const userLimits = limits[user.subscription_tier as keyof typeof limits] || limits.FREE
      const limit = dayIndex !== undefined ? userLimits.perDay : userLimits.fullPlan

      if (limit === -1) {
        return { allowed: true } // Unlimited
      }

      if (currentCount >= limit) {
        return { 
          allowed: false, 
          reason: `Regeneration limit reached for ${user.subscription_tier} tier (${currentCount}/${limit})` 
        }
      }

      return { allowed: true }

    } catch (error) {
      console.error('Error checking regeneration limits:', error)
      return { allowed: false, reason: 'Failed to check regeneration limits' }
    }
  }

  /**
   * Update regeneration count for a meal plan
   */
  private async updateRegenerationCount(mealPlanId: string, dayIndex?: number): Promise<void> {
    try {
      // Get current count
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('regeneration_count')
        .eq('id', mealPlanId)
        .single()

      const regenerationCount = plan?.regeneration_count || {}
      const key = dayIndex !== undefined ? `day_${dayIndex}` : 'full_plan'
      regenerationCount[key] = (regenerationCount[key] || 0) + 1

      // Update the plan
      const { error } = await supabase
        .from('meal_plans')
        .update({ regeneration_count: regenerationCount })
        .eq('id', mealPlanId)

      if (error) throw error

    } catch (error) {
      console.error('Error updating regeneration count:', error)
      throw new Error('Failed to update regeneration count')
    }
  }

  /**
   * Add event to meal plan history
   */
  private async addToHistory(mealPlanId: string, event: any): Promise<void> {
    try {
      // Get current history
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('history')
        .eq('id', mealPlanId)
        .single()

      const history = plan?.history || []
      history.push(event)

      // Update the plan
      const { error } = await supabase
        .from('meal_plans')
        .update({ 
          history,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId)

      if (error) throw error

    } catch (error) {
      console.error('Error adding to history:', error)
      // Don't throw - history is not critical
    }
  }

  /**
   * Regenerate meals for a specific day
   */
  private async regenerateSpecificDay(mealPlanId: string, dayIndex: number, mealType?: string): Promise<void> {
    try {
      // Get a new meal (simplified - would need more sophisticated selection logic)
      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .limit(10)

      if (!meals || meals.length === 0) {
        throw new Error('No meals available for regeneration')
      }

      // Select a random meal (in a real app, this would be more intelligent)
      const randomMeal = meals[Math.floor(Math.random() * meals.length)]

      // Update the meal plan day
      const { error } = await supabase
        .from('meal_plan_days')
        .update({ 
          meal_id: randomMeal.id,
          accepted: true // Reset acceptance status
        })
        .eq('meal_plan_id', mealPlanId)
        .eq('day_index', dayIndex)

      if (mealType) {
        // If specific meal type, also filter by that
      }

      if (error) throw error

    } catch (error) {
      console.error('Error regenerating specific day:', error)
      throw new Error('Failed to regenerate day')
    }
  }

  /**
   * Regenerate entire meal plan
   */
  private async regenerateEntirePlan(mealPlanId: string): Promise<void> {
    try {
      // Get current meal plan to understand constraints
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single()

      if (!plan) throw new Error('Meal plan not found')

      // Get all days for this plan
      const { data: days } = await supabase
        .from('meal_plan_days')
        .select('day_index')
        .eq('meal_plan_id', mealPlanId)
        .order('day_index')

      if (!days) return

      // Regenerate each day
      for (const day of days) {
        await this.regenerateSpecificDay(mealPlanId, day.day_index)
      }

    } catch (error) {
      console.error('Error regenerating entire plan:', error)
      throw new Error('Failed to regenerate entire plan')
    }
  }
}

export const mealPlanService = new MealPlanService()