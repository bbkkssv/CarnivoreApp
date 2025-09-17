import { NextRequest, NextResponse } from 'next/server';
import shoppingListService from '../../../src/services/shoppingListService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mealPlanId, userId, listName } = body;

    // Validate required fields
    if (!mealPlanId) {
      return NextResponse.json(
        { error: 'Meal plan ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Generate shopping list from meal plan
    const shoppingList = await shoppingListService.generateFromMealPlan(userId, mealPlanId, listName);

    const progress = await shoppingListService.getShoppingProgress(shoppingList.id!);

    return NextResponse.json({
      id: shoppingList.id,
      user_id: shoppingList.user_id,
      meal_plan_id: shoppingList.meal_plan_id,
      name: shoppingList.name,
      status: shoppingList.status,
      items: shoppingList.items || [],
      totalItems: progress.totalItems,
      purchasedItems: progress.purchasedItems,
      remainingItems: progress.remainingItems,
      completionPercentage: progress.completionPercentage,
      estimatedCost: progress.estimatedCost,
      categories: Array.from(new Set((shoppingList.items || []).map(item => item.category).filter(Boolean))),
      created_at: shoppingList.created_at,
      updated_at: shoppingList.updated_at,
      message: 'Shopping list created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Shopping list creation error:', error);
    
    // Handle specific service errors
    if (error instanceof Error) {
      if (error.message.includes('Meal plan not found')) {
        return NextResponse.json(
          { error: 'Meal plan not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('No meals')) {
        return NextResponse.json(
          { error: 'Cannot create shopping list - no accepted meals in plan' },
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's shopping lists
    const shoppingLists = await shoppingListService.getUserShoppingLists(
      userId, 
      status as any // Cast to allow undefined or valid status
    );

    // Format response with summary information
    const formattedLists = await Promise.all(
      shoppingLists.map(async (list) => {
        const progress = await shoppingListService.getShoppingProgress(list.id!);
        return {
          id: list.id,
          name: list.name,
          meal_plan_id: list.meal_plan_id,
          status: list.status,
          totalItems: progress.totalItems,
          purchasedItems: progress.purchasedItems,
          remainingItems: progress.remainingItems,
          completionPercentage: progress.completionPercentage,
          estimatedCost: progress.estimatedCost,
          categories: Array.from(new Set((list.items || []).map(item => item.category).filter(Boolean))).length,
          created_at: list.created_at,
          updated_at: list.updated_at
        };
      })
    );

    const totalEstimated = formattedLists.reduce((sum, list) => sum + (list.estimatedCost || 0), 0);
    const totalItems = formattedLists.reduce((sum, list) => sum + list.totalItems, 0);

    return NextResponse.json({
      shoppingLists: formattedLists,
      count: formattedLists.length,
      summary: {
        totalLists: formattedLists.length,
        totalItems,
        totalEstimated
      },
      message: 'Shopping lists retrieved successfully'
    });

  } catch (error) {
    console.error('Shopping list retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}