import { NextRequest, NextResponse } from 'next/server';
import { MealPlanService } from '@/lib/services/mealPlan';

const mealPlanService = new MealPlanService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: mealPlanId } = params;
    
    if (!mealPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Meal plan ID is required'
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (typeof body.dayIndex !== 'number' || typeof body.accepted !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'dayIndex (number) and accepted (boolean) are required'
        },
        { status: 400 }
      );
    }
    
    const { dayIndex, accepted } = body;
    
    // Validate dayIndex is non-negative
    if (dayIndex < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'dayIndex must be non-negative'
        },
        { status: 400 }
      );
    }
    
    // Accept or reject the meal
    await mealPlanService.acceptMeal(mealPlanId, dayIndex, accepted);
    
    return NextResponse.json({
      success: true,
      message: `Meal ${accepted ? 'accepted' : 'rejected'} successfully`,
      data: {
        mealPlanId,
        dayIndex,
        accepted
      }
    });
  } catch (error) {
    console.error('Error processing meal acceptance:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process meal acceptance',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}