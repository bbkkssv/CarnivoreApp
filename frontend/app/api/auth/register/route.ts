import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, confirmPassword, ageConfirmation, firstName, lastName } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (!confirmPassword) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
      )
    }

    if (!ageConfirmation) {
      return NextResponse.json(
        { error: 'Age confirmation (18+) is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { 
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          requirements: {
            minLength: password.length >= 8,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar
          }
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return NextResponse.json(
        { error: 'Failed to validate user registration' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 } // Conflict
      )
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create user record
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      subscription_tier: 'FREE',
      subscription_status: 'ACTIVE',
      created_at: new Date().toISOString()
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, email, subscription_tier, subscription_status, created_at')
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create default preference profile
    const preferenceProfileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const defaultProfile = {
      id: preferenceProfileId,
      user_id: userId,
      dietary_restrictions: [],
      preferred_cuts: ['ribeye', 'ground_beef', 'chicken_thighs'],
      cooking_methods: ['grilled', 'pan_seared'],
      meal_frequency: 2,
      budget_range: 'moderate',
      experience_level: 'beginner',
      created_at: new Date().toISOString()
    }

    const { error: profileError } = await supabase
      .from('preference_profiles')
      .insert(defaultProfile)

    if (profileError) {
      console.error('Error creating preference profile:', profileError)
      // Don't fail registration if profile creation fails, just log it
    }

    // Return user data (without password hash)
    return NextResponse.json({
      user: newUser,
      message: 'User registered successfully',
      next_steps: {
        email_verification: 'Check your email for verification link',
        onboarding: 'Complete your profile setup',
        subscription: 'Current tier: FREE - upgrade for premium features'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/auth/register:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/register
 * Get registration requirements and validation info
 */
export async function GET() {
  return NextResponse.json({
    requirements: {
      email: {
        required: true,
        format: 'Valid email address'
      },
      password: {
        required: true,
        minLength: 8,
        mustContain: [
          'At least one uppercase letter',
          'At least one lowercase letter', 
          'At least one number',
          'Special characters recommended'
        ]
      },
      ageConfirmation: {
        required: true,
        description: 'Must confirm you are 18 years or older'
      },
      optionalFields: [
        'firstName',
        'lastName'
      ]
    },
    defaultSubscription: {
      tier: 'FREE',
      status: 'ACTIVE',
      features: [
        'Basic meal planning',
        'Shopping lists (CSV export only)',
        '30-day adaptation tracking',
        'Basic nutrition tracking'
      ]
    },
    nextSteps: [
      'Email verification',
      'Complete onboarding questionnaire',
      'Set up your first meal plan'
    ]
  })
}