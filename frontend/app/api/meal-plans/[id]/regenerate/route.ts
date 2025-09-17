import { NextRequest, NextResponse } from 'next/server';
import { MealPlanService, RegenerationRequest } from '../../../../../src/lib/services/mealPlan';

const mealPlanService = new MealPlanService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealPlanId = params.id;
    const body = await request.json();
    const { dayIndex, mealType, reason } = body;

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    // Validate dayIndex if provided
    if (dayIndex !== undefined && (typeof dayIndex !== 'number' || dayIndex < 0)) {
      return NextResponse.json(
        { error: 'Day index must be a non-negative number' },
        { status: 400 }
      );
    }

    // Validate mealType if provided
    const validMealTypes = ['main', 'breakfast', 'lunch', 'dinner', 'snack'];
    if (mealType && !validMealTypes.includes(mealType)) {
      return NextResponse.json(
        { error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create regeneration request
    const regenerationRequest: RegenerationRequest = {
      mealPlanId,
      dayIndex,
      mealType,
      reason
    };

    // Attempt to regenerate meals
    const updatedMealPlan = await mealPlanService.regenerateMeals(regenerationRequest);

    // Get the specific regeneration count for response
    const regenerationKey = dayIndex !== undefined ? `day_${dayIndex}` : 'full_plan';
    const currentCount = updatedMealPlan.regenerationCount[regenerationKey] || 0;

    return NextResponse.json({
      id: updatedMealPlan.id,
      userId: updatedMealPlan.userId,
      startDate: updatedMealPlan.startDate.toISOString(),
      endDate: updatedMealPlan.endDate.toISOString(),
      status: updatedMealPlan.status,
      meals: updatedMealPlan.meals,
      regenerationCount: updatedMealPlan.regenerationCount,
      regenerationType: dayIndex !== undefined 
        ? `Day ${dayIndex + 1}${mealType ? ` (${mealType})` : ''}` 
        : 'Full plan',
      currentRegenerationCount: currentCount,
      reason: reason || null,
      message: `Successfully regenerated ${dayIndex !== undefined 
        ? `day ${dayIndex + 1}${mealType ? ` ${mealType}` : ''}` 
        : 'entire meal plan'}`
    }, { status: 200 });

  } catch (error) {
    console.error('Meal plan regeneration error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Meal plan not found')) {
        return NextResponse.json(
          { error: 'Meal plan not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Regeneration limit')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 } // Too Many Requests
        );
      }
      
      if (error.message.includes('No meals available')) {
        return NextResponse.json(
          { error: 'Unable to regenerate - insufficient meal options available' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check regeneration limits and status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealPlanId = params.id;
    const { searchParams } = new URL(request.url);
    const checkDay = searchParams.get('dayIndex');

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    // Get the meal plan to check current regeneration status
    const mealPlan = await mealPlanService.getMealPlan(mealPlanId);

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Check regeneration limits
    const dayIndex = checkDay !== null ? parseInt(checkDay) : undefined;
    const limitCheck = await (mealPlanService as any).checkRegenerationLimits(
      mealPlan.userId,
      mealPlanId,
      dayIndex
    );

    // Get current regeneration counts
    const regenerationCount = mealPlan.regenerationCount || {};
    const fullPlanCount = regenerationCount['full_plan'] || 0;
    
    // Get per-day counts if checking specific day
    const daySpecificCount = dayIndex !== undefined 
      ? regenerationCount[`day_${dayIndex}`] || 0
      : null;

    return NextResponse.json({
      mealPlanId: mealPlan.id,
      userId: mealPlan.userId,
      status: mealPlan.status,
      canRegenerate: limitCheck.allowed,
      reason: limitCheck.reason || null,
      regenerationCount: {
        fullPlan: fullPlanCount,
        specificDay: daySpecificCount,
        allDays: regenerationCount
      },
      checkingDay: dayIndex,
      message: 'Regeneration status retrieved successfully'
    });

  } catch (error) {
    console.error('Regeneration status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}