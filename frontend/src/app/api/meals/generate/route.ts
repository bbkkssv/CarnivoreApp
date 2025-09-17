import { NextRequest, NextResponse } from 'next/server';
import { MealPlanService, MealPlanGenerationRequest } from '@/lib/services/mealPlan';

const mealPlanService = new MealPlanService();

export async function POST(request: NextRequest) {
  try {
    // For now, using a mock user ID - in production this would come from authentication
    const userId = 'test-user-1';
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Missing required fields: startDate and endDate'
        },
        { status: 400 }
      );
    }
    
    // Parse dates
    let startDate: Date;
    let endDate: Date;
    
    try {
      startDate = new Date(body.startDate);
      endDate = new Date(body.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (startDate >= endDate) {
        throw new Error('startDate must be before endDate');
      }
    } catch (dateError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid date format or startDate must be before endDate'
        },
        { status: 400 }
      );
    }
    
    // Construct meal plan generation request
    const generationRequest: MealPlanGenerationRequest = {
      userId,
      startDate,
      endDate,
      constraints: {
        maxPrepTime: body.constraints?.maxPrepTime || 60,
        allowedMeats: body.constraints?.allowedMeats || [],
        exclusions: body.constraints?.exclusions || [],
        nutritionalProfile: body.constraints?.nutritionalProfile || 'STRICT',
        budgetConstraints: body.constraints?.budgetConstraints || { min: 0, max: 1000 }
      }
    };
    
    // Generate meal plan
    const mealPlan = await mealPlanService.generateMealPlan(generationRequest);
    
    return NextResponse.json({
      success: true,
      data: mealPlan,
      message: 'Meal plan generated successfully'
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate meal plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}