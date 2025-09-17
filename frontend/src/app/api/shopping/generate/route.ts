import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '@/lib/services/shoppingList';

const shoppingListService = new ShoppingListService();

export async function GET(request: NextRequest) {
  try {
    // Get mealPlanId from search params
    const searchParams = request.nextUrl.searchParams;
    const mealPlanId = searchParams.get('mealPlanId');
    
    if (!mealPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'mealPlanId query parameter is required'
        },
        { status: 400 }
      );
    }
    
    // Generate shopping list from meal plan
    const shoppingList = await shoppingListService.generateFromMealPlan(mealPlanId);
    
    return NextResponse.json({
      success: true,
      data: shoppingList,
      message: 'Shopping list generated successfully'
    });
  } catch (error) {
    console.error('Error generating shopping list:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error cases
    let statusCode = 500;
    let errorType = 'Failed to generate shopping list';
    
    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorType = 'Meal plan not found';
    } else if (errorMessage.includes('no accepted meals')) {
      statusCode = 400;
      errorType = 'No accepted meals in plan';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorType,
        message: errorMessage
      },
      { status: statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.mealPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'mealPlanId is required in request body'
        },
        { status: 400 }
      );
    }
    
    // Generate shopping list from meal plan
    const shoppingList = await shoppingListService.generateFromMealPlan(body.mealPlanId);
    
    return NextResponse.json({
      success: true,
      data: shoppingList,
      message: 'Shopping list generated successfully'
    });
  } catch (error) {
    console.error('Error generating shopping list:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error cases
    let statusCode = 500;
    let errorType = 'Failed to generate shopping list';
    
    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorType = 'Meal plan not found';
    } else if (errorMessage.includes('no accepted meals')) {
      statusCode = 400;
      errorType = 'No accepted meals in plan';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorType,
        message: errorMessage
      },
      { status: statusCode }
    );
  }
}