import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// JWT secret key
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, rememberMe } = body

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if account is active
    if (user.subscription_status === 'SUSPENDED' || user.subscription_status === 'CANCELLED') {
      return NextResponse.json(
        { 
          error: 'Account is suspended. Please contact support.',
          accountStatus: user.subscription_status
        },
        { status: 403 }
      )
    }

    // Note: login tracking would be implemented here if columns existed
    // await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)

    // Generate JWT token
    const tokenExpiry = rememberMe ? '30d' : '24h'
    const expirationTime = rememberMe 
      ? Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
      : Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      tier: user.subscription_tier,
      status: user.subscription_status
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET)

    // Prepare user response (without sensitive data)
    const userResponse = {
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status,
      created_at: user.created_at,
      last_login: new Date().toISOString()
    }

    // Get user's subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check if onboarding is complete
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const isOnboardingComplete = !!onboarding

    // Set HTTP-only cookie for token (more secure than localStorage)
    const response = NextResponse.json({
      user: userResponse,
      subscription: subscription || null,
      onboarding: {
        completed: isOnboardingComplete,
        nextStep: isOnboardingComplete ? null : 'Complete your profile setup'
      },
      session: {
        expiresIn: tokenExpiry,
        rememberMe: !!rememberMe
      },
      message: 'Login successful'
    })

    // Set secure HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error in POST /api/auth/login:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/login
 * Get login options and requirements
 */
export async function GET() {
  return NextResponse.json({
    loginMethods: ['email_password'],
    requirements: {
      email: 'Valid email address',
      password: 'Your account password'
    },
    features: {
      rememberMe: {
        available: true,
        duration: '30 days',
        description: 'Stay signed in on this device'
      },
      forgotPassword: {
        available: true,
        endpoint: '/api/auth/forgot-password'
      }
    },
    security: {
      tokenType: 'JWT',
      sessionDuration: {
        default: '24 hours',
        rememberMe: '30 days'
      },
      secureStorage: 'HTTP-only cookies'
    }
  })
}