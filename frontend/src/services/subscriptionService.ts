import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define types based on our schema
export interface Subscription {
  id?: string
  user_id: string
  tier: SubscriptionTier
  billing_cycle: BillingCycle
  price_id?: string
  status: SubscriptionStatus
  stripe_subscription_id?: string
  started_at?: string
  renews_at?: string
  canceled_at?: string
}

export enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC', 
  PREMIUM = 'PREMIUM'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface TierLimits {
  meal_plan_regenerations_per_day: number
  max_meal_plan_days: number
  instacart_integration: boolean
  export_formats: string[]
  adaptation_logs_retention_days: number
  priority_support: boolean
}

export interface SubscriptionEntitlements {
  tier: SubscriptionTier
  status: SubscriptionStatus
  limits: TierLimits
  usage: {
    meal_plan_regenerations_today: number
    meal_plan_regenerations_this_month: number
    last_regeneration_date?: string
  }
  features: {
    can_regenerate_meal_plan: boolean
    can_use_instacart: boolean
    can_export_pdf: boolean
    can_create_long_meal_plans: boolean
  }
}

export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

export interface GracePeriodConfig {
  days: number
  reminder_days: number[]
  max_attempts: number
}

export class SubscriptionService {
  // Default tier limits
  private readonly tierLimits: Record<SubscriptionTier, TierLimits> = {
    [SubscriptionTier.FREE]: {
      meal_plan_regenerations_per_day: 1,
      max_meal_plan_days: 3,
      instacart_integration: false,
      export_formats: ['csv'],
      adaptation_logs_retention_days: 30,
      priority_support: false // Standard support
    },
    [SubscriptionTier.BASIC]: {
      meal_plan_regenerations_per_day: 3,
      max_meal_plan_days: 7,
      instacart_integration: false,
      export_formats: ['csv', 'pdf'],
      adaptation_logs_retention_days: 90,
      priority_support: false // Standard support
    },
    [SubscriptionTier.PREMIUM]: {
      meal_plan_regenerations_per_day: 10,
      max_meal_plan_days: 14,
      instacart_integration: true,
      export_formats: ['csv', 'pdf'],
      adaptation_logs_retention_days: 365,
      priority_support: true // Premium support (highest priority)
    }
  }

  private readonly gracePeriodConfig: GracePeriodConfig = {
    days: 7, // 7 days grace period
    reminder_days: [3, 1], // Send reminders at 3 days and 1 day remaining
    max_attempts: 3 // Maximum payment retry attempts
  }

  /**
   * Get current active subscription for a user
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw new Error(`Failed to fetch user subscription: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching user subscription:', error)
      throw new Error('Failed to fetch user subscription')
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(subscription: Omit<Subscription, 'id' | 'started_at'>): Promise<Subscription> {
    try {
      const subscriptionData = {
        ...subscription,
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        started_at: new Date().toISOString()
      }

      // Cancel any existing active subscriptions for this user
      await this.cancelUserSubscriptions(subscription.user_id, 'upgrade')

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`)
      }

      // Update user's subscription tier in users table
      await this.updateUserTier(subscription.user_id, subscription.tier, subscription.status)

      return data
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw new Error('Failed to create subscription')
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: string, 
    status: SubscriptionStatus,
    metadata?: { canceled_at?: string; renews_at?: string }
  ): Promise<Subscription> {
    try {
      const updates: any = { status }

      if (metadata?.canceled_at) {
        updates.canceled_at = metadata.canceled_at
      }
      if (metadata?.renews_at) {
        updates.renews_at = metadata.renews_at
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update subscription status: ${error.message}`)
      }

      // Update user's subscription status in users table
      await this.updateUserTier(data.user_id, data.tier, status)

      return data
    } catch (error) {
      console.error('Error updating subscription status:', error)
      throw new Error('Failed to update subscription status')
    }
  }

  /**
   * Update subscription with partial data
   */
  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .eq('status', SubscriptionStatus.ACTIVE)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`)
      }

      // Update user's subscription tier if tier was updated
      if (updates.tier) {
        await this.updateUserTier(userId, updates.tier, updates.status || data.status)
      }

      return data
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw new Error('Failed to update subscription')
    }
  }

  /**
   * Cancel all active subscriptions for a user
   */
  async cancelUserSubscriptions(userId: string, reason: string = 'user_requested'): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: SubscriptionStatus.CANCELED,
          canceled_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('status', [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE])

      if (error) {
        throw new Error(`Failed to cancel user subscriptions: ${error.message}`)
      }

      // Downgrade user to FREE tier
      await this.updateUserTier(userId, SubscriptionTier.FREE, SubscriptionStatus.ACTIVE)
    } catch (error) {
      console.error('Error canceling user subscriptions:', error)
      throw new Error('Failed to cancel user subscriptions')
    }
  }

  /**
   * Get subscription entitlements for a user
   */
  async getSubscriptionEntitlements(userId: string): Promise<SubscriptionEntitlements> {
    try {
      const subscription = await this.getUserSubscription(userId)
      const tier = subscription?.tier || SubscriptionTier.FREE
      const status = subscription?.status || SubscriptionStatus.ACTIVE

      // Get usage data
      const usage = await this.getUserUsage(userId)
      
      // Get tier limits
      const limits = this.tierLimits[tier]

      // Calculate features based on tier and status
      const features = {
        can_regenerate_meal_plan: status === SubscriptionStatus.ACTIVE && 
          usage.meal_plan_regenerations_today < limits.meal_plan_regenerations_per_day,
        can_use_instacart: limits.instacart_integration && status === SubscriptionStatus.ACTIVE,
        can_export_pdf: limits.export_formats.includes('pdf') && status === SubscriptionStatus.ACTIVE,
        can_create_long_meal_plans: status === SubscriptionStatus.ACTIVE
      }

      return {
        tier,
        status,
        limits,
        usage,
        features
      }
    } catch (error) {
      console.error('Error getting subscription entitlements:', error)
      throw new Error('Failed to get subscription entitlements')
    }
  }

  /**
   * Check if user can perform a specific action
   */
  async canUserPerformAction(userId: string, action: 'regenerate_meal_plan' | 'use_instacart' | 'export_pdf' | 'create_long_meal_plan'): Promise<boolean> {
    try {
      const entitlements = await this.getSubscriptionEntitlements(userId)
      
      switch (action) {
        case 'regenerate_meal_plan':
          return entitlements.features.can_regenerate_meal_plan
        case 'use_instacart':
          return entitlements.features.can_use_instacart
        case 'export_pdf':
          return entitlements.features.can_export_pdf
        case 'create_long_meal_plan':
          return entitlements.features.can_create_long_meal_plans
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking user action permission:', error)
      return false
    }
  }

  /**
   * Increment usage counter (e.g., meal plan regenerations)
   */
  async incrementUsage(userId: string, action: 'meal_plan_regeneration'): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // This would typically be stored in a separate usage tracking table
      // For now, we'll track it in a simple way using the meal_plans table
      // In a production system, you'd want a dedicated usage_tracking table
      
      if (action === 'meal_plan_regeneration') {
        // You could implement this by tracking in meal_plans table
        // or create a separate usage_tracking table
        console.log(`Incremented ${action} usage for user ${userId} on ${today}`)
      }
    } catch (error) {
      console.error('Error incrementing usage:', error)
      throw new Error('Failed to increment usage counter')
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: StripeWebhookEvent): Promise<void> {
    try {
      console.log(`Processing Stripe webhook: ${event.type}`)
      
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object)
          break
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object)
          break
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object)
          break
          
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object)
          break
          
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object)
          break
          
        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object)
          break
          
        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error)
      throw new Error(`Failed to handle webhook event: ${event.type}`)
    }
  }

  /**
   * Handle subscription downgrade after grace period
   */
  async handleGracePeriodExpiry(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId)
      
      if (!subscription || subscription.status !== SubscriptionStatus.PAST_DUE) {
        return
      }

      // Check if grace period has expired
      const pastDueDate = new Date(subscription.started_at || subscription.renews_at || '')
      const gracePeriodEnd = new Date(pastDueDate.getTime() + this.gracePeriodConfig.days * 24 * 60 * 60 * 1000)
      
      if (new Date() > gracePeriodEnd) {
        // Grace period expired - downgrade to FREE
        await this.cancelUserSubscriptions(userId, 'grace_period_expired')
        console.log(`Downgraded user ${userId} to FREE tier after grace period expiry`)
      }
    } catch (error) {
      console.error('Error handling grace period expiry:', error)
      throw new Error('Failed to handle grace period expiry')
    }
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw new Error(`Failed to fetch subscription by Stripe ID: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching subscription by Stripe ID:', error)
      return null
    }
  }

  /**
   * Get tier limits for a specific tier
   */
  getTierLimits(tier: SubscriptionTier): TierLimits {
    return this.tierLimits[tier]
  }

  /**
   * Validate subscription data
   */
  validateSubscription(subscription: Partial<Subscription>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!subscription.user_id) {
      errors.push('User ID is required')
    }

    if (!subscription.tier || !Object.values(SubscriptionTier).includes(subscription.tier)) {
      errors.push('Valid subscription tier is required')
    }

    if (!subscription.billing_cycle || !Object.values(BillingCycle).includes(subscription.billing_cycle)) {
      errors.push('Valid billing cycle is required')
    }

    if (subscription.status && !Object.values(SubscriptionStatus).includes(subscription.status)) {
      errors.push('Invalid subscription status')
    }

    if (subscription.renews_at) {
      const renewsAt = new Date(subscription.renews_at)
      if (isNaN(renewsAt.getTime())) {
        errors.push('Invalid renews_at date format')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Private helper methods

  private async updateUserTier(userId: string, tier: SubscriptionTier, status: SubscriptionStatus): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_tier: tier,
          subscription_status: status
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user tier:', error.message)
      }
    } catch (error) {
      console.error('Error updating user tier:', error)
    }
  }

  private async getUserUsage(userId: string): Promise<{
    meal_plan_regenerations_today: number
    meal_plan_regenerations_this_month: number
    last_regeneration_date?: string
  }> {
    try {
      // This would typically query a usage_tracking table
      // For now, we'll estimate from meal_plans table
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      
      const { data: todayPlans } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today)

      const { data: monthPlans } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', monthStart)

      const { data: lastPlan } = await supabase
        .from('meal_plans')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return {
        meal_plan_regenerations_today: todayPlans?.length || 0,
        meal_plan_regenerations_this_month: monthPlans?.length || 0,
        last_regeneration_date: lastPlan?.created_at
      }
    } catch (error) {
      console.error('Error getting user usage:', error)
      return {
        meal_plan_regenerations_today: 0,
        meal_plan_regenerations_this_month: 0
      }
    }
  }

  // Stripe webhook handlers
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    console.log('Handling subscription created:', subscription.id)
    
    try {
      // Extract subscription details from Stripe
      const customerId = subscription.customer
      const stripeSubId = subscription.id
      const status = this.mapStripeStatus(subscription.status)
      const priceId = subscription.items?.data[0]?.price?.id
      const tier = this.mapPriceToTier(priceId)
      const billingCycle = this.mapBillingCycle(subscription.items?.data[0]?.price?.recurring?.interval)
      
      // Find user by customer ID (assuming we store Stripe customer ID in users table)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()
        
      if (userError || !user) {
        console.error('User not found for Stripe customer:', customerId)
        return
      }
      
      // Create subscription record
      const subscriptionData: Subscription = {
        user_id: user.id,
        tier,
        billing_cycle: billingCycle,
        price_id: priceId,
        status,
        stripe_subscription_id: stripeSubId,
        started_at: new Date(subscription.created * 1000).toISOString(),
        renews_at: new Date(subscription.current_period_end * 1000).toISOString()
      }
      
      await this.createSubscription(subscriptionData)
      
      // Update user subscription tier
      await supabase
        .from('users')
        .update({ 
          subscription_tier: tier,
          subscription_status: status
        })
        .eq('id', user.id)
        
      console.log(`Created subscription for user ${user.id}: ${tier} (${status})`)
      
    } catch (error) {
      console.error('Error handling subscription created:', error)
      throw error
    }
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    console.log('Handling subscription updated:', subscription.id)
    
    try {
      const stripeSubId = subscription.id
      const status = this.mapStripeStatus(subscription.status)
      const priceId = subscription.items?.data[0]?.price?.id
      const tier = this.mapPriceToTier(priceId)
      
      // Find existing subscription
      const existingSubscription = await this.getSubscriptionByStripeId(stripeSubId)
      if (!existingSubscription) {
        console.error('Subscription not found for Stripe ID:', stripeSubId)
        return
      }
      
      // Update subscription record
      const updates: Partial<Subscription> = {
        tier,
        status,
        price_id: priceId,
        renews_at: new Date(subscription.current_period_end * 1000).toISOString()
      }
      
      if (subscription.canceled_at) {
        updates.canceled_at = new Date(subscription.canceled_at * 1000).toISOString()
      }
      
      await this.updateSubscription(existingSubscription.user_id, updates)
      
      // Update user record
      await supabase
        .from('users')
        .update({
          subscription_tier: tier,
          subscription_status: status
        })
        .eq('id', existingSubscription.user_id)
        
      console.log(`Updated subscription for user ${existingSubscription.user_id}: ${tier} (${status})`)
      
    } catch (error) {
      console.error('Error handling subscription updated:', error)
      throw error
    }
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    console.log('Handling subscription deleted:', subscription.id)
    
    try {
      const stripeSubId = subscription.id
      
      // Find existing subscription
      const existingSubscription = await this.getSubscriptionByStripeId(stripeSubId)
      if (!existingSubscription) {
        console.error('Subscription not found for Stripe ID:', stripeSubId)
        return
      }
      
      // Update subscription to canceled
      await this.updateSubscription(existingSubscription.user_id, {
        status: SubscriptionStatus.CANCELED,
        canceled_at: new Date().toISOString()
      })
      
      // Downgrade user to FREE tier
      await supabase
        .from('users')
        .update({
          subscription_tier: SubscriptionTier.FREE,
          subscription_status: SubscriptionStatus.ACTIVE
        })
        .eq('id', existingSubscription.user_id)
        
      console.log(`Canceled subscription for user ${existingSubscription.user_id}, downgraded to FREE`)
      
    } catch (error) {
      console.error('Error handling subscription deleted:', error)
      throw error
    }
  }

  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    console.log('Handling payment succeeded:', invoice.id)
    
    try {
      const stripeSubId = invoice.subscription
      
      if (!stripeSubId) {
        console.log('Payment not associated with subscription, skipping')
        return
      }
      
      // Find subscription
      const subscription = await this.getSubscriptionByStripeId(stripeSubId)
      if (!subscription) {
        console.error('Subscription not found for payment:', stripeSubId)
        return
      }
      
      // Update subscription status to active (in case it was past due)
      await this.updateSubscription(subscription.user_id, {
        status: SubscriptionStatus.ACTIVE
      })
      
      // Update user status
      await supabase
        .from('users')
        .update({
          subscription_status: SubscriptionStatus.ACTIVE
        })
        .eq('id', subscription.user_id)
        
      console.log(`Payment succeeded for user ${subscription.user_id}, status set to ACTIVE`)
      
    } catch (error) {
      console.error('Error handling payment succeeded:', error)
      throw error
    }
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    console.log('Handling payment failed:', invoice.id)
    
    try {
      const stripeSubId = invoice.subscription
      
      if (!stripeSubId) {
        console.log('Failed payment not associated with subscription, skipping')
        return
      }
      
      // Find subscription
      const subscription = await this.getSubscriptionByStripeId(stripeSubId)
      if (!subscription) {
        console.error('Subscription not found for failed payment:', stripeSubId)
        return
      }
      
      // Update subscription status to past due
      await this.updateSubscription(subscription.user_id, {
        status: SubscriptionStatus.PAST_DUE
      })
      
      // Update user status
      await supabase
        .from('users')
        .update({
          subscription_status: SubscriptionStatus.PAST_DUE
        })
        .eq('id', subscription.user_id)
        
      console.log(`Payment failed for user ${subscription.user_id}, status set to PAST_DUE`)
      
    } catch (error) {
      console.error('Error handling payment failed:', error)
      throw error
    }
  }

  private async handleTrialWillEnd(subscription: any): Promise<void> {
    console.log('Handling trial will end:', subscription.id)
    
    try {
      const stripeSubId = subscription.id
      
      // Find subscription
      const existingSubscription = await this.getSubscriptionByStripeId(stripeSubId)
      if (!existingSubscription) {
        console.error('Subscription not found for trial ending:', stripeSubId)
        return
      }
      
      // Here you could send notification emails, update trial status, etc.
      // For now, just log the event
      console.log(`Trial ending soon for user ${existingSubscription.user_id}`)
      
      // Could implement email notification here:
      // await this.sendTrialEndingEmail(existingSubscription.user_id)
      
    } catch (error) {
      console.error('Error handling trial will end:', error)
      throw error
    }
  }
  
  // Helper methods for webhook processing
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE
      case 'past_due':
        return SubscriptionStatus.PAST_DUE
      case 'canceled':
      case 'cancelled':
        return SubscriptionStatus.CANCELED
      case 'unpaid':
        return SubscriptionStatus.UNPAID
      default:
        return SubscriptionStatus.ACTIVE
    }
  }
  
  private mapPriceToTier(priceId?: string): SubscriptionTier {
    // This would map your actual Stripe price IDs to tiers
    // For now, using basic logic based on price ID patterns
    if (!priceId) return SubscriptionTier.FREE
    
    if (priceId.includes('basic')) return SubscriptionTier.BASIC
    if (priceId.includes('premium')) return SubscriptionTier.PREMIUM
    
    // Default mapping based on environment variables or configuration
    return SubscriptionTier.BASIC
  }
  
  private mapBillingCycle(interval?: string): BillingCycle {
    switch (interval) {
      case 'month':
        return BillingCycle.MONTHLY
      case 'year':
        return BillingCycle.YEARLY
      default:
        return BillingCycle.MONTHLY
    }
  }

  /**
   * Cleanup - Supabase doesn't require explicit disconnection
   */
  async disconnect(): Promise<void> {
    return Promise.resolve()
  }
}

export const subscriptionService = new SubscriptionService()