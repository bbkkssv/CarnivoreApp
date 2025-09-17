import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      )
    }

    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Extract user info from token
    const userId = payload.userId as string
    const email = payload.email as string
    const tier = payload.tier as string
    const status = payload.status as string

    // Verify user still exists and is active
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, subscription_tier, subscription_status, created_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found or token invalid' },
        { status: 401 }
      )
    }

    // Check if subscription status has changed
    if (user.subscription_status !== status || user.subscription_tier !== tier) {
      return NextResponse.json(
        { 
          error: 'Token expired due to subscription changes',
          reason: 'SUBSCRIPTION_CHANGED',
          current: {
            tier: user.subscription_tier,
            status: user.subscription_status
          }
        },
        { status: 401 }
      )
    }

    // Check if account is suspended
    if (user.subscription_status === 'SUSPENDED' || user.subscription_status === 'CANCELLED') {
      return NextResponse.json(
        { 
          error: 'Account is suspended',
          accountStatus: user.subscription_status
        },
        { status: 403 }
      )
    }

    // Get current subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Check onboarding status
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('user_id', userId)
      .single()

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_at: user.created_at
      },
      subscription: subscription || null,
      onboarding: {
        completed: !!onboarding
      },
      token: {
        issuedAt: new Date((payload.iat as number) * 1000).toISOString(),
        expiresAt: new Date((payload.exp as number) * 1000).toISOString()
      }
    })

  } catch (error) {
    console.error('Error in GET /api/auth/verify:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return NextResponse.json(
          { error: 'Token has expired', reason: 'TOKEN_EXPIRED' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('signature')) {
        return NextResponse.json(
          { error: 'Invalid token signature', reason: 'INVALID_SIGNATURE' },
          { status: 401 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Token verification failed', reason: 'INVALID_TOKEN' },
      { status: 401 }
    )
  }
}

/**
 * POST /api/auth/verify
 * Verify token and refresh if needed
 */
export async function POST(request: NextRequest) {
  try {
    const verifyResult = await GET(request)
    const verifyData = await verifyResult.json()

    if (!verifyResult.ok) {
      return verifyResult
    }

    // Check if token is close to expiry (less than 24 hours remaining)
    const tokenData = verifyData.token
    const expiresAt = new Date(tokenData.expiresAt)
    const now = new Date()
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refreshed = false
    let newToken = null

    if (hoursUntilExpiry < 24) {
      // Refresh token
      const { SignJWT } = await import('jose')
      
      const user = verifyData.user
      const newExpirationTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days

      newToken = await new SignJWT({
        userId: user.id,
        email: user.email,
        tier: user.subscription_tier,
        status: user.subscription_status
      })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(newExpirationTime)
      .sign(JWT_SECRET)

      refreshed = true
    }

    const response = NextResponse.json({
      ...verifyData,
      refreshed,
      message: refreshed ? 'Token refreshed successfully' : 'Token is valid'
    })

    // Set new token cookie if refreshed
    if (refreshed && newToken) {
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      })
    }

    return response

  } catch (error) {
    console.error('Error in POST /api/auth/verify:', error)
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    )
  }
}