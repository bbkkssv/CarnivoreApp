import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, responses, isComplete = false } = await request.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { error: 'Responses object is required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate minimum questions answered if completing
    if (isComplete) {
      const requiredQuestions = [
        'age', 'gender', 'currentWeight', 'height', 'activityLevel',
        'currentDiet', 'healthGoals', 'preferredMeats', 'meatExclusions',
        'cookingSkill', 'prepTimePreference', 'budgetRange', 'nutritionalProfile',
        'mealFrequency', 'portionSizes', 'kitchenEquipment', 'dietaryRestrictions',
        'carnivoreExperience', 'healthConditions', 'medications', 'exerciseRoutine',
        'sleepSchedule', 'stressLevel', 'trackingPreferences', 'groceryShoppingPreference'
      ];

      const answeredQuestions = Object.keys(responses);
      const missingQuestions = requiredQuestions.filter(q => !answeredQuestions.includes(q));

      if (missingQuestions.length > 0) {
        return NextResponse.json(
          { 
            error: 'Incomplete onboarding', 
            missingQuestions: missingQuestions,
            totalRequired: requiredQuestions.length,
            answered: answeredQuestions.length
          },
          { status: 400 }
        );
      }
    }

    // Check if user already has onboarding responses
    const { data: existing, error: existingError } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing onboarding:', existingError);
      return NextResponse.json(
        { error: 'Database error checking existing responses' },
        { status: 500 }
      );
    }

    let result;

    if (existing) {
      // Update existing responses
      const { data, error } = await supabase
        .from('onboarding_responses')
        .update({
          responses,
          completed_at: isComplete ? new Date().toISOString() : undefined
        })
        .eq('user_id', userId)
        .select('id, responses, completed_at')
        .single();

      if (error) {
        console.error('Error updating onboarding responses:', error);
        return NextResponse.json(
          { error: 'Failed to update onboarding responses' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Create new responses
      const { data, error } = await supabase
        .from('onboarding_responses')
        .insert({
          id: `onb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          responses,
          completed_at: isComplete ? new Date().toISOString() : null
        })
        .select('id, responses, completed_at')
        .single();

      if (error) {
        console.error('Error creating onboarding responses:', error);
        return NextResponse.json(
          { error: 'Failed to create onboarding responses' },
          { status: 500 }
        );
      }

      result = data;
    }

    // If completing onboarding, create/update preference profile
    if (isComplete) {
      const preferenceData = {
        user_id: userId,
        allowed_meats: responses.preferredMeats || [],
        exclusions: responses.meatExclusions || [],
        prep_time_preference: parseInt(responses.prepTimePreference?.toString() || '30'),
        budget_range: responses.budgetRange || 'moderate',
        cooking_skill: responses.cookingSkill || 'beginner',
        nutritional_profile: responses.nutritionalProfile?.toUpperCase() || 'STRICT',
        updated_at: new Date().toISOString()
      };

      // Check if preference profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('preference_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error checking existing profile:', profileCheckError);
        // Don't fail the request, just log the error
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('preference_profiles')
          .update(preferenceData)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating preference profile:', updateError);
          // Don't fail the request, profile will be created later if needed
        }
      } else {
        // Create new profile
        const { error: createError } = await supabase
          .from('preference_profiles')
          .insert({
            id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...preferenceData
          });

        if (createError) {
          console.error('Error creating preference profile:', createError);
          // Don't fail the request, profile can be created later
        }
      }
    }

    return NextResponse.json({
      id: result.id,
      responses: result.responses,
      completedAt: result.completed_at,
      isComplete,
      message: existing ? 'Onboarding responses updated successfully' : 'Onboarding responses created successfully'
    }, { 
      status: existing ? 200 : 201 
    });

  } catch (error) {
    console.error('Onboarding API error:', error);
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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get onboarding responses
    const { data: onboarding, error } = await supabase
      .from('onboarding_responses')
      .select('id, responses, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching onboarding responses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding responses' },
        { status: 500 }
      );
    }

    if (!onboarding) {
      return NextResponse.json({
        id: null,
        responses: {},
        completedAt: null,
        isComplete: false,
        message: 'No onboarding responses found'
      });
    }

    return NextResponse.json({
      id: onboarding.id,
      responses: onboarding.responses,
      completedAt: onboarding.completed_at,
      isComplete: !!onboarding.completed_at,
      message: 'Onboarding responses retrieved successfully'
    });

  } catch (error) {
    console.error('Onboarding GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}