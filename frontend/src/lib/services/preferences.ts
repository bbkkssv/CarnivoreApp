import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define enums to match Supabase schema
export enum NutritionalProfile {
  STRICT = 'STRICT',
  LEANER = 'LEANER',
  WITH_DAIRY = 'WITH_DAIRY',
  BUDGET = 'BUDGET'
}

export interface OnboardingData {
  responses: Record<string, any>
  preferenceProfile: {
    allowedMeats: string[]
    exclusions: string[]
    prepTimePreference: number
    budgetRange?: string
    cookingSkill?: string
    nutritionalProfile: NutritionalProfile
  }
}

export interface PreferenceUpdateData {
  allowedMeats?: string[]
  exclusions?: string[]
  prepTimePreference?: number
  budgetRange?: string
  cookingSkill?: string
  nutritionalProfile?: NutritionalProfile
}

export class PreferenceService {
  /**
   * Process onboarding responses and create user preference profile
   */
  async processOnboarding(userId: string, data: OnboardingData) {
    try {
      // Create onboarding response record
      const { data: onboardingResponse, error: onboardingError } = await supabase
        .from('onboarding_responses')
        .insert({
          user_id: userId,
          responses: data.responses,
        })
        .select()
        .single()

      if (onboardingError) {
        throw new Error(`Failed to create onboarding response: ${onboardingError.message}`)
      }

      // Check if preference profile exists
      const { data: existingProfile } = await supabase
        .from('preference_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      let preferenceProfile
      
      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('preference_profiles')
          .update({
            allowed_meats: data.preferenceProfile.allowedMeats,
            exclusions: data.preferenceProfile.exclusions,
            prep_time_preference: data.preferenceProfile.prepTimePreference,
            budget_range: data.preferenceProfile.budgetRange,
            cooking_skill: data.preferenceProfile.cookingSkill,
            nutritional_profile: data.preferenceProfile.nutritionalProfile,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to update preference profile: ${updateError.message}`)
        }
        preferenceProfile = updatedProfile
      } else {
        // Create new profile
        const { data: newProfile, error: createError } = await supabase
          .from('preference_profiles')
          .insert({
            user_id: userId,
            allowed_meats: data.preferenceProfile.allowedMeats,
            exclusions: data.preferenceProfile.exclusions,
            prep_time_preference: data.preferenceProfile.prepTimePreference,
            budget_range: data.preferenceProfile.budgetRange,
            cooking_skill: data.preferenceProfile.cookingSkill,
            nutritional_profile: data.preferenceProfile.nutritionalProfile,
          })
          .select()
          .single()

        if (createError) {
          throw new Error(`Failed to create preference profile: ${createError.message}`)
        }
        preferenceProfile = newProfile
      }

      return {
        onboardingResponse,
        preferenceProfile,
      }
    } catch (error) {
      console.error('Error processing onboarding:', error)
      throw new Error('Failed to process onboarding data')
    }
  }

  /**
   * Get user's current preference profile
   */
  async getPreferenceProfile(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('preference_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch preference profile: ${error.message}`)
      }

      if (!profile) {
        throw new Error('Preference profile not found')
      }

      return profile
    } catch (error) {
      console.error('Error fetching preference profile:', error)
      throw new Error('Failed to fetch preference profile')
    }
  }

  /**
   * Update user's preference profile
   */
  async updatePreferenceProfile(userId: string, updates: PreferenceUpdateData) {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('preference_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update preference profile: ${error.message}`)
      }

      return updatedProfile
    } catch (error) {
      console.error('Error updating preference profile:', error)
      throw new Error('Failed to update preference profile')
    }
  }

  /**
   * Get user's onboarding responses
   */
  async getOnboardingResponses(userId: string) {
    try {
      const { data: responses, error } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch onboarding responses: ${error.message}`)
      }

      return responses || []
    } catch (error) {
      console.error('Error fetching onboarding responses:', error)
      throw new Error('Failed to fetch onboarding responses')
    }
  }

  /**
   * Validate preference profile data
   */
  validatePreferenceData(data: Partial<PreferenceUpdateData>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate allowed meats
    if (data.allowedMeats && (!Array.isArray(data.allowedMeats) || data.allowedMeats.length === 0)) {
      errors.push('At least one meat type must be selected')
    }

    // Validate prep time preference
    if (data.prepTimePreference !== undefined && (data.prepTimePreference < 10 || data.prepTimePreference > 180)) {
      errors.push('Prep time preference must be between 10 and 180 minutes')
    }

    // Validate cooking skill
    if (data.cookingSkill && !['beginner', 'intermediate', 'advanced'].includes(data.cookingSkill)) {
      errors.push('Cooking skill must be one of: beginner, intermediate, advanced')
    }

    // Validate nutritional profile
    if (data.nutritionalProfile && !Object.values(NutritionalProfile).includes(data.nutritionalProfile)) {
      errors.push('Invalid nutritional profile')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get nutritional constraints based on user's profile
   */
  async getNutritionalConstraints(userId: string) {
    try {
      const profile = await this.getPreferenceProfile(userId)
      
      const constraints = {
        allowedMeats: profile.allowedMeats,
        exclusions: profile.exclusions,
        maxPrepTime: profile.prepTimePreference,
        nutritionalProfile: profile.nutritionalProfile,
        cookingComplexity: profile.cookingSkill || 'beginner',
        budgetConstraints: profile.budgetRange ? this.parseBudgetRange(profile.budgetRange) : null,
      }

      return constraints
    } catch (error) {
      console.error('Error generating nutritional constraints:', error)
      throw new Error('Failed to generate nutritional constraints')
    }
  }

  /**
   * Parse budget range string into min/max values
   */
  private parseBudgetRange(budgetRange: string): { min: number; max: number } | null {
    const ranges: Record<string, { min: number; max: number }> = {
      'under-50': { min: 0, max: 50 },
      '50-100': { min: 50, max: 100 },
      '100-150': { min: 100, max: 150 },
      '150-200': { min: 150, max: 200 },
      'over-200': { min: 200, max: 1000 },
    }

    return ranges[budgetRange] || null
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('preference_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking onboarding status:', error)
        return false
      }

      return profile !== null
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      return false
    }
  }

  /**
   * Cleanup - Supabase doesn't require explicit disconnection
   */
  async disconnect() {
    // Supabase client handles connection management automatically
    return Promise.resolve()
  }
}

export const preferenceService = new PreferenceService()