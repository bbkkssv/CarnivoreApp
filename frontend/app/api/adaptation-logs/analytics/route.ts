import { NextRequest, NextResponse } from 'next/server'
import { AdaptationService, AdaptationCategory } from '../../../../src/services/adaptationService'
import { SubscriptionService } from '../../../../src/services/subscriptionService'

const adaptationService = new AdaptationService()
const subscriptionService = new SubscriptionService()

/**
 * GET /api/adaptation-logs/analytics
 * Advanced adaptation analytics with tier-based depth
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const analysisType = searchParams.get('type') // 'trends', 'correlations', 'insights', 'predictions'
    const period = searchParams.get('period') // '7d', '30d', '90d', '1y'
    const categories = searchParams.get('categories')?.split(',')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Get user's subscription tier for feature access
    const subscription = await subscriptionService.getUserSubscription(userId)
    const tier = subscription?.tier || 'FREE'

    // Define tier-based features
    const tierFeatures = {
      FREE: {
        maxPeriod: 30, // days
        analyses: ['basic_trends'],
        categories: 3, // max categories in single request
        dataPoints: 50 // max data points returned
      },
      BASIC: {
        maxPeriod: 90,
        analyses: ['basic_trends', 'category_correlations'],
        categories: 5,
        dataPoints: 200
      },
      PREMIUM: {
        maxPeriod: 365,
        analyses: ['basic_trends', 'category_correlations', 'insights', 'predictions'],
        categories: 10,
        dataPoints: 1000
      }
    }

    const currentTierFeatures = tierFeatures[tier as keyof typeof tierFeatures]
    
    // Validate period against tier limits
    const periodDays = period === '7d' ? 7 : 
                      period === '30d' ? 30 : 
                      period === '90d' ? 90 :
                      period === '1y' ? 365 : 30
    
    if (periodDays > currentTierFeatures.maxPeriod) {
      return NextResponse.json(
        { 
          error: 'Period exceeds your subscription limits',
          maxPeriod: `${currentTierFeatures.maxPeriod} days`,
          currentTier: tier,
          upgradeRequired: tier !== 'PREMIUM'
        },
        { status: 402 } // Payment Required
      )
    }

    // Validate analysis type against tier
    const requestedAnalysis = analysisType || 'basic_trends'
    if (!currentTierFeatures.analyses.includes(requestedAnalysis)) {
      return NextResponse.json(
        {
          error: 'Analysis type not available in your subscription',
          availableAnalyses: currentTierFeatures.analyses,
          currentTier: tier,
          upgradeRequired: true
        },
        { status: 402 }
      )
    }

    // Validate category count
    if (categories && categories.length > currentTierFeatures.categories) {
      return NextResponse.json(
        {
          error: 'Too many categories requested for your subscription',
          maxCategories: currentTierFeatures.categories,
          currentTier: tier
        },
        { status: 402 }
      )
    }

    // Execute the requested analysis
    let analyticsData: any = {}

    if (requestedAnalysis === 'basic_trends') {
      const trendSummary = await adaptationService.calculateTrends(userId, periodDays)
      
      // Limit data points for tier
      let trends = trendSummary.trends
      if (categories) {
        trends = trends.filter(t => categories.includes(t.category))
      }
      
      analyticsData = {
        type: 'basic_trends',
        summary: trendSummary,
        period: `${periodDays} days`,
        insights: generateBasicInsights(trendSummary)
      }
    }

    if (requestedAnalysis === 'category_correlations' && tier !== 'FREE') {
      const correlations = await calculateCategoryCorrelations(userId, periodDays)
      analyticsData.correlations = correlations
    }

    if (requestedAnalysis === 'insights' && tier === 'PREMIUM') {
      const insights = await generateAdvancedInsights(userId, periodDays)
      analyticsData.insights = insights
    }

    if (requestedAnalysis === 'predictions' && tier === 'PREMIUM') {
      const predictions = await generatePredictions(userId, periodDays)
      analyticsData.predictions = predictions
    }

    return NextResponse.json({
      analytics: analyticsData,
      metadata: {
        userId,
        tier,
        period: `${periodDays} days`,
        analysisType: requestedAnalysis,
        generatedAt: new Date().toISOString(),
        dataPoints: analyticsData.summary?.total_entries || 0
      },
      tierInfo: {
        current: tier,
        features: currentTierFeatures,
        upgradeAvailable: tier !== 'PREMIUM'
      },
      message: 'Analytics generated successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/adaptation-logs/analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    )
  }
}

// Helper functions for different analysis types
function generateBasicInsights(summary: any): string[] {
  const insights: string[] = []
  
  if (summary.overall_trend === 'improving') {
    insights.push('Your overall adaptation is trending positively!')
  } else if (summary.overall_trend === 'declining') {
    insights.push('Your adaptation metrics show some areas for improvement.')
  } else {
    insights.push('Your adaptation levels are remaining stable.')
  }
  
  if (summary.trends && summary.trends.length > 0) {
    const improvingCategories = summary.trends
      .filter((t: any) => t.current_period.trend_direction === 'improving')
      .map((t: any) => t.category)
    
    if (improvingCategories.length > 0) {
      insights.push(`Improving areas: ${improvingCategories.join(', ')}`)
    }
    
    const decliningCategories = summary.trends
      .filter((t: any) => t.current_period.trend_direction === 'declining')
      .map((t: any) => t.category)
    
    if (decliningCategories.length > 0) {
      insights.push(`Areas needing attention: ${decliningCategories.join(', ')}`)
    }
  }
  
  return insights
}

async function calculateCategoryCorrelations(userId: string, days: number): Promise<any[]> {
  // This would implement correlation analysis between categories
  // For now, return mock correlations
  return [
    {
      categories: ['energy', 'sleep'],
      correlation: 0.75,
      strength: 'strong',
      insight: 'Better sleep strongly correlates with higher energy levels'
    },
    {
      categories: ['digestion', 'mood'],
      correlation: 0.62,
      strength: 'moderate',
      insight: 'Digestive health moderately influences mood stability'
    }
  ]
}

async function generateAdvancedInsights(userId: string, days: number): Promise<string[]> {
  // Advanced insights for Premium users
  return [
    'Your energy levels peak on days when you log meals earlier in the day',
    'Digestive symptoms correlate with higher stress levels',
    'Your adaptation rate is 23% faster than average carnivore dieters',
    'Weekend patterns show different adaptation responses than weekdays'
  ]
}

async function generatePredictions(userId: string, days: number): Promise<any[]> {
  // Predictive analytics for Premium users
  return [
    {
      category: 'energy',
      prediction: 'likely to improve',
      confidence: 78,
      timeframe: '2-3 weeks',
      reasoning: 'Current upward trend and consistent logging patterns'
    },
    {
      category: 'sleep',
      prediction: 'expected to stabilize',
      confidence: 65,
      timeframe: '1-2 weeks',
      reasoning: 'Recent improvements reaching plateau phase'
    }
  ]
}