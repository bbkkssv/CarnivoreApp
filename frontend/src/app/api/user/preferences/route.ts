import { NextRequest, NextResponse } from 'next/server';
import { PreferenceService } from '@/lib/services/preferences';

const preferenceService = new PreferenceService();

export async function GET(request: NextRequest) {
  try {
    // For now, using a mock user ID - in production this would come from authentication
    const userId = 'test-user-1';
    
    const preferences = await preferenceService.getPreferenceProfile(userId);
    
    return NextResponse.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, using a mock user ID - in production this would come from authentication  
    const userId = 'test-user-1';
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['allowedMeats', 'nutritionalProfile'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            message: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }
    
    // Update preferences
    const updatedPreferences = await preferenceService.updatePreferenceProfile(userId, {
      allowedMeats: body.allowedMeats,
      exclusions: body.exclusions || [],
      prepTimePreference: body.prepTimePreference || 30,
      budgetRange: body.budgetRange || 'MEDIUM',
      cookingSkill: body.cookingSkill || 'INTERMEDIATE',
      nutritionalProfile: body.nutritionalProfile
    });
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}