import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SubscriptionService } from '../../../../src/services/subscriptionService'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const subscriptionService = new SubscriptionService()

// Webhook endpoint secret from Stripe dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

/**
 * POST /api/subscriptions/webhook
 * Handle Stripe webhook events for subscription management
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      )
    }

    // Log webhook event for debugging
    console.log(`Received Stripe webhook: ${event.type} (${event.id})`)

    // Convert Stripe event to our webhook event format
    const webhookEvent = {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created
    }

    // Handle the webhook event through our subscription service
    try {
      await subscriptionService.handleStripeWebhook(webhookEvent)
      
      console.log(`Successfully processed webhook: ${event.type} (${event.id})`)
      
      return NextResponse.json({
        received: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date().toISOString()
      })

    } catch (serviceError) {
      console.error(`Service error processing webhook ${event.type}:`, serviceError)
      
      // Return 200 to acknowledge receipt but log the processing error
      // This prevents Stripe from retrying the webhook unnecessarily
      return NextResponse.json({
        received: true,
        eventId: event.id,
        eventType: event.type,
        processed: false,
        error: serviceError instanceof Error ? serviceError.message : 'Unknown service error',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Critical webhook error:', error)
    
    // Return 400 for client errors (signature issues, malformed data)
    // Return 500 for server errors (configuration, database issues)
    const statusCode = error instanceof Error && error.message.includes('signature') ? 400 : 500
    
    return NextResponse.json({
      received: false,
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}

/**
 * GET /api/subscriptions/webhook
 * Webhook endpoint information and health check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/subscriptions/webhook',
    methods: ['POST'],
    description: 'Stripe webhook endpoint for subscription events',
    supportedEvents: [
      'customer.subscription.created',
      'customer.subscription.updated', 
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'customer.subscription.trial_will_end'
    ],
    security: {
      signatureVerification: 'Required',
      webhookSecret: 'STRIPE_WEBHOOK_SECRET environment variable'
    },
    configuration: {
      stripeApiVersion: '2024-09-30.acacia',
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY
    },
    health: 'OK',
    timestamp: new Date().toISOString()
  })
}

/**
 * Handle webhook retry attempts
 * Stripe automatically retries failed webhooks with exponential backoff
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, retryAttempt } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId for retry' },
        { status: 400 }
      )
    }

    console.log(`Manual retry attempt ${retryAttempt || 1} for event ${eventId}`)

    // Fetch the event from Stripe to ensure we have the latest data
    const event = await stripe.events.retrieve(eventId)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found in Stripe' },
        { status: 404 }
      )
    }

    // Convert and process the event
    const webhookEvent = {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created
    }

    await subscriptionService.handleStripeWebhook(webhookEvent)

    return NextResponse.json({
      success: true,
      eventId: event.id,
      eventType: event.type,
      retryAttempt: retryAttempt || 1,
      processed: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Webhook retry failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Retry failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}