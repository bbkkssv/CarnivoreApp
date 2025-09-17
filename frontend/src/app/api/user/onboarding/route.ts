import { NextRequest, NextResponse } from 'next/server';
import { PreferenceService, NutritionalProfile, OnboardingData } from '@/lib/services/preferences';

const preferenceService = new PreferenceService();

export async function POST(request: NextRequest) {
  try {
    // For now, using a mock user ID - in production this would come from authentication
    const userId = 'test-user-1';
    
    const body = await request.json();
    
    // Validate request structure
    if (!body.responses || !body.preferenceProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Missing required fields: responses and preferenceProfile'
        },
        { status: 400 }
      );
    }
    
    // Validate preference profile required fields
    const { preferenceProfile } = body;
    const requiredFields = ['allowedMeats', 'nutritionalProfile'];
    for (const field of requiredFields) {
      if (!(field in preferenceProfile)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: `Missing required field in preferenceProfile: ${field}`
          },
          { status: 400 }
        );
      }
    }
    
    // Validate nutritional profile enum
    if (!Object.values(NutritionalProfile).includes(preferenceProfile.nutritionalProfile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid nutritionalProfile. Must be one of: STRICT, LEANER, WITH_DAIRY, BUDGET'
        },
        { status: 400 }
      );
    }
    
    // Construct onboarding data
    const onboardingData: OnboardingData = {
      responses: body.responses,
      preferenceProfile: {
        allowedMeats: preferenceProfile.allowedMeats,
        exclusions: preferenceProfile.exclusions || [],
        prepTimePreference: preferenceProfile.prepTimePreference || 30,
        budgetRange: preferenceProfile.budgetRange || 'MEDIUM',
        cookingSkill: preferenceProfile.cookingSkill || 'INTERMEDIATE',
        nutritionalProfile: preferenceProfile.nutritionalProfile
      }
    };
    
    // Process onboarding
    const result = await preferenceService.processOnboarding(userId, onboardingData);
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    console.error('Error processing onboarding:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process onboarding',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}