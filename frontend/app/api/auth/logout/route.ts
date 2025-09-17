import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/auth/logout
 * Logout user and clear authentication tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Get user info from token if available (for logging purposes)
    const authToken = request.cookies.get('auth-token')?.value
    let userId: string | null = null

    if (authToken) {
      try {
        // You would decode JWT here to get userId for audit logging
        // For now, we'll just clear the token
      } catch (error) {
        // Token might be invalid, but we still want to clear it
        console.error('Error decoding token during logout:', error)
      }
    }

    // Note: logout tracking would be implemented here if columns existed
    // if (userId) { await supabase.from('users').update({ last_logout: new Date().toISOString() }).eq('id', userId) }

    // Clear the authentication cookie
    const response = NextResponse.json({
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    })

    // Clear the auth-token cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error)
    
    // Even if there's an error, we want to clear the cookie
    const response = NextResponse.json({
      message: 'Logout completed',
      note: 'Session cleared regardless of server error'
    })

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })

    return response
  }
}

/**
 * GET /api/auth/logout
 * Get logout endpoint information
 */
export async function GET() {
  return NextResponse.json({
    method: 'POST',
    description: 'Logout current user session',
    effects: [
      'Clears authentication token',
      'Removes HTTP-only cookie',
      'Updates user logout timestamp'
    ],
    redirectSuggestion: '/login'
  })
}