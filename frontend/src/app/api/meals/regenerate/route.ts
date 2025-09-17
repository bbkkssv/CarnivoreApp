import { NextRequest, NextResponse } from 'next/server';
import { MealPlanService, RegenerationRequest } from '@/lib/services/mealPlan';

const mealPlanService = new MealPlanService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.mealPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'mealPlanId is required'
        },
        { status: 400 }
      );
    }
    
    // Validate optional fields if provided
    if (body.dayIndex !== undefined && (typeof body.dayIndex !== 'number' || body.dayIndex < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'dayIndex must be a non-negative number if provided'
        },
        { status: 400 }
      );
    }
    
    if (body.mealType !== undefined && typeof body.mealType !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'mealType must be a string if provided'
        },
        { status: 400 }
      );
    }
    
    // Construct regeneration request
    const regenerationRequest: RegenerationRequest = {
      mealPlanId: body.mealPlanId,
      dayIndex: body.dayIndex,
      mealType: body.mealType,
      reason: body.reason || 'User requested regeneration'
    };
    
    // Attempt to regenerate meals
    const updatedMealPlan = await mealPlanService.regenerateMeals(regenerationRequest);
    
    return NextResponse.json({
      success: true,
      data: updatedMealPlan,
      message: regenerationRequest.dayIndex !== undefined 
        ? `Day ${regenerationRequest.dayIndex} regenerated successfully`
        : 'Meal plan regenerated successfully'
    });
  } catch (error) {
    console.error('Error regenerating meals:', error);
    
    // Check if it's a tier limit error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isLimitError = errorMessage.includes('limit') || errorMessage.includes('exceeded');
    
    return NextResponse.json(
      {
        success: false,
        error: isLimitError ? 'Regeneration limit exceeded' : 'Failed to regenerate meals',
        message: errorMessage
      },
      { status: isLimitError ? 429 : 500 }
    );
  }
}