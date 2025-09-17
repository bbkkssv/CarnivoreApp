import { NextRequest, NextResponse } from 'next/server';
import mealPlanService, { MealPlanStatus } from '../../../src/services/mealPlanService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, targetDate, days, notes } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Meal plan name is required' },
        { status: 400 }
      );
    }

    if (!targetDate) {
      return NextResponse.json(
        { error: 'Target date is required' },
        { status: 400 }
      );
    }

    // Create the meal plan
    const mealPlan = await mealPlanService.createMealPlan({
      user_id: userId,
      name,
      target_date: targetDate,
      status: MealPlanStatus.DRAFT,
      days: days || 7,
      notes: notes || ''
    });

    return NextResponse.json({
      id: mealPlan.id,
      user_id: mealPlan.user_id,
      name: mealPlan.name,
      target_date: mealPlan.target_date,
      status: mealPlan.status,
      days: mealPlan.days,
      total_calories: mealPlan.total_calories,
      total_protein: mealPlan.total_protein,
      notes: mealPlan.notes,
      created_at: mealPlan.created_at,
      updated_at: mealPlan.updated_at,
      message: 'Meal plan created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Meal plan creation error:', error);
    
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
    const statusParam = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Convert string status to enum
    let status: MealPlanStatus | undefined;
    if (statusParam) {
      status = statusParam as MealPlanStatus;
    }

    // Get user's meal plans
    const mealPlans = await mealPlanService.getUserMealPlans(userId, status);

    // Format response
    const formattedPlans = mealPlans.map(plan => ({
      id: plan.id,
      user_id: plan.user_id,
      name: plan.name,
      target_date: plan.target_date,
      status: plan.status,
      days: plan.days,
      total_calories: plan.total_calories,
      total_protein: plan.total_protein,
      notes: plan.notes,
      mealsCount: plan.meals?.length || 0,
      created_at: plan.created_at,
      updated_at: plan.updated_at
    }));

    return NextResponse.json({
      mealPlans: formattedPlans,
      count: formattedPlans.length,
      message: 'Meal plans retrieved successfully'
    });

  } catch (error) {
    console.error('Meal plan retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}