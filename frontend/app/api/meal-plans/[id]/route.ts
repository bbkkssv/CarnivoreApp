import { NextRequest, NextResponse } from 'next/server';
import { MealPlanService } from '../../../../src/lib/services/mealPlan';

const mealPlanService = new MealPlanService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealPlanId = params.id;

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    // Get meal plan with full details
    const mealPlan = await mealPlanService.getMealPlan(mealPlanId);

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Calculate some useful metrics
    const daysDiff = Math.ceil(
      (mealPlan.endDate.getTime() - mealPlan.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const acceptedMeals = mealPlan.meals.filter(meal => meal.accepted).length;
    const totalMeals = mealPlan.meals.length;

    return NextResponse.json({
      id: mealPlan.id,
      userId: mealPlan.userId,
      startDate: mealPlan.startDate.toISOString(),
      endDate: mealPlan.endDate.toISOString(),
      duration: daysDiff,
      status: mealPlan.status,
      constraintsSummary: mealPlan.constraintsSummary,
      meals: mealPlan.meals,
      regenerationCount: mealPlan.regenerationCount,
      history: mealPlan.history,
      metrics: {
        totalMeals,
        acceptedMeals,
        rejectedMeals: totalMeals - acceptedMeals,
        acceptanceRate: totalMeals > 0 ? Math.round((acceptedMeals / totalMeals) * 100) : 0
      },
      message: 'Meal plan retrieved successfully'
    });

  } catch (error) {
    console.error('Meal plan retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealPlanId = params.id;
    const body = await request.json();
    const { action, dayIndex, accepted } = body;

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'accept_meal':
        if (dayIndex === undefined || typeof accepted !== 'boolean') {
          return NextResponse.json(
            { error: 'Day index and accepted status are required for accept_meal action' },
            { status: 400 }
          );
        }
        
        await mealPlanService.acceptMeal(mealPlanId, dayIndex, accepted);
        
        return NextResponse.json({
          message: `Meal for day ${dayIndex + 1} ${accepted ? 'accepted' : 'rejected'} successfully`
        });

      case 'accept_plan':
        await mealPlanService.acceptMealPlan(mealPlanId);
        
        return NextResponse.json({
          message: 'Meal plan accepted successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: accept_meal, accept_plan' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Meal plan update error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Meal plan not found')) {
        return NextResponse.json(
          { error: 'Meal plan not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealPlanId = params.id;

    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    // Get the meal plan first to verify it exists
    const mealPlan = await mealPlanService.getMealPlan(mealPlanId);
    
    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Archive the meal plan by updating status (since archiveMealPlan method doesn't exist yet)
    // TODO: Add archiveMealPlan method to MealPlanService
    return NextResponse.json({
      message: 'Meal plan delete requested - archiving functionality to be implemented'
    }, { status: 501 }); // Not Implemented

  } catch (error) {
    console.error('Meal plan archive error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Meal plan not found')) {
        return NextResponse.json(
          { error: 'Meal plan not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}