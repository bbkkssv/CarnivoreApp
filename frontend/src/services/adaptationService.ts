import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define types based on our schema
export interface AdaptationLogEntry {
  id?: string
  user_id: string
  date: string // ISO date string
  category: AdaptationCategory
  severity?: AdaptationSeverity
  level?: string
  value?: number
  unit?: string
  notes?: string
  created_at?: string
}

export enum AdaptationCategory {
  ENERGY = 'energy',
  DIGESTION = 'digestion', 
  MOOD = 'mood',
  WEIGHT = 'weight',
  SLEEP = 'sleep',
  CRAVINGS = 'cravings',
  GENERAL = 'general'
}

export enum AdaptationSeverity {
  POOR = 'poor',
  FAIR = 'fair', 
  GOOD = 'good',
  VERY_GOOD = 'very_good',
  EXCELLENT = 'excellent'
}

export interface AdaptationTrend {
  category: AdaptationCategory
  current_period: {
    average_value: number
    average_level: number
    count: number
    trend_direction: 'improving' | 'declining' | 'stable'
  }
  previous_period?: {
    average_value: number
    average_level: number
    count: number
  }
  change_percentage?: number
}

export interface AdaptationSummary {
  date_range: {
    start: string
    end: string
  }
  trends: AdaptationTrend[]
  total_entries: number
  most_logged_category: AdaptationCategory
  overall_trend: 'improving' | 'declining' | 'stable'
}

export class AdaptationService {
  /**
   * Create a new adaptation log entry
   */
  async createLog(entry: AdaptationLogEntry): Promise<AdaptationLogEntry> {
    try {
      // Generate ID if not provided
      const logEntry = {
        ...entry,
        id: entry.id || `adaptation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: entry.created_at || new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('adaptation_logs')
        .insert(logEntry)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create adaptation log: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error creating adaptation log:', error)
      throw new Error('Failed to create adaptation log entry')
    }
  }

  /**
   * Create multiple adaptation log entries at once
   */
  async createBatchLogs(entries: AdaptationLogEntry[]): Promise<AdaptationLogEntry[]> {
    try {
      const logsWithIds = entries.map(entry => ({
        ...entry,
        id: entry.id || `adaptation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: entry.created_at || new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('adaptation_logs')
        .insert(logsWithIds)
        .select()

      if (error) {
        throw new Error(`Failed to create batch adaptation logs: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error creating batch adaptation logs:', error)
      throw new Error('Failed to create batch adaptation log entries')
    }
  }

  /**
   * Get adaptation logs for a user within a date range
   */
  async getUserLogs(
    userId: string, 
    startDate?: string, 
    endDate?: string,
    category?: AdaptationCategory
  ): Promise<AdaptationLogEntry[]> {
    try {
      let query = supabase
        .from('adaptation_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      // Add date filtering if provided
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }
      
      // Add category filtering if provided
      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch adaptation logs: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user logs:', error)
      throw new Error('Failed to fetch adaptation logs')
    }
  }

  /**
   * Get a single adaptation log by ID
   */
  async getLogById(logId: string): Promise<AdaptationLogEntry | null> {
    try {
      const { data, error } = await supabase
        .from('adaptation_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw new Error(`Failed to fetch adaptation log: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching adaptation log by ID:', error)
      if (error instanceof Error && error.message.includes('No rows returned')) {
        return null
      }
      throw new Error('Failed to fetch adaptation log')
    }
  }

  /**
   * Get recent adaptation logs (last 30 days)
   */
  async getRecentLogs(userId: string): Promise<AdaptationLogEntry[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return this.getUserLogs(userId, thirtyDaysAgo.toISOString())
  }

  /**
   * Update an existing adaptation log entry
   */
  async updateLog(logId: string, updates: Partial<AdaptationLogEntry>): Promise<AdaptationLogEntry> {
    try {
      const { data, error } = await supabase
        .from('adaptation_logs')
        .update(updates)
        .eq('id', logId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update adaptation log: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating adaptation log:', error)
      throw new Error('Failed to update adaptation log entry')
    }
  }

  /**
   * Delete an adaptation log entry
   */
  async deleteLog(logId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('adaptation_logs')
        .delete()
        .eq('id', logId)

      if (error) {
        throw new Error(`Failed to delete adaptation log: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting adaptation log:', error)
      throw new Error('Failed to delete adaptation log entry')
    }
  }

  /**
   * Calculate basic trends for a user's adaptation logs
   */
  async calculateTrends(userId: string, days: number = 30): Promise<AdaptationSummary> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - days)
      
      // Get current period data
      const currentPeriodLogs = await this.getUserLogs(
        userId, 
        startDate.toISOString(), 
        endDate.toISOString()
      )

      // Get previous period for comparison (same duration)
      const previousStartDate = new Date(startDate)
      previousStartDate.setDate(previousStartDate.getDate() - days)
      const previousPeriodLogs = await this.getUserLogs(
        userId,
        previousStartDate.toISOString(),
        startDate.toISOString()
      )

      // Calculate trends by category
      const trends: AdaptationTrend[] = []
      const categories = Object.values(AdaptationCategory)

      for (const category of categories) {
        const currentCategoryLogs = currentPeriodLogs.filter(log => log.category === category)
        const previousCategoryLogs = previousPeriodLogs.filter(log => log.category === category)

        if (currentCategoryLogs.length === 0) continue

        // Calculate current period averages
        const currentValues = currentCategoryLogs
          .map(log => log.value || this.severityToValue(log.severity))
          .filter(val => val !== null) as number[]
        
        const currentLevels = currentCategoryLogs
          .map(log => parseFloat(log.level || '0'))
          .filter(val => !isNaN(val))

        const currentAvgValue = currentValues.length > 0 
          ? currentValues.reduce((sum, val) => sum + val, 0) / currentValues.length 
          : 0
        
        const currentAvgLevel = currentLevels.length > 0
          ? currentLevels.reduce((sum, val) => sum + val, 0) / currentLevels.length
          : 0

        // Calculate previous period averages
        let previousAvgValue = 0
        let previousAvgLevel = 0
        let changePercentage: number | undefined

        if (previousCategoryLogs.length > 0) {
          const previousValues = previousCategoryLogs
            .map(log => log.value || this.severityToValue(log.severity))
            .filter(val => val !== null) as number[]
          
          const previousLevels = previousCategoryLogs
            .map(log => parseFloat(log.level || '0'))
            .filter(val => !isNaN(val))

          previousAvgValue = previousValues.length > 0
            ? previousValues.reduce((sum, val) => sum + val, 0) / previousValues.length
            : 0
            
          previousAvgLevel = previousLevels.length > 0
            ? previousLevels.reduce((sum, val) => sum + val, 0) / previousLevels.length
            : 0

          // Calculate change percentage (use value if available, otherwise level)
          const currentMetric = currentValues.length > 0 ? currentAvgValue : currentAvgLevel
          const previousMetric = previousValues.length > 0 ? previousAvgValue : previousAvgLevel
          
          if (previousMetric > 0) {
            changePercentage = ((currentMetric - previousMetric) / previousMetric) * 100
          }
        }

        // Determine trend direction
        const metricToCompare = currentValues.length > 0 ? currentAvgValue : currentAvgLevel
        const previousMetricToCompare = previousCategoryLogs.length > 0 
          ? (previousAvgValue > 0 ? previousAvgValue : previousAvgLevel)
          : 0

        let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
        if (previousMetricToCompare > 0) {
          const threshold = 0.1 // 10% threshold for stability
          if (changePercentage && Math.abs(changePercentage) > threshold * 100) {
            trendDirection = changePercentage > 0 ? 'improving' : 'declining'
          }
        }

        trends.push({
          category,
          current_period: {
            average_value: currentAvgValue,
            average_level: currentAvgLevel,
            count: currentCategoryLogs.length,
            trend_direction: trendDirection
          },
          previous_period: previousCategoryLogs.length > 0 ? {
            average_value: previousAvgValue,
            average_level: previousAvgLevel,
            count: previousCategoryLogs.length
          } : undefined,
          change_percentage: changePercentage
        })
      }

      // Calculate overall trend
      const improvingCount = trends.filter(t => t.current_period.trend_direction === 'improving').length
      const decliningCount = trends.filter(t => t.current_period.trend_direction === 'declining').length
      
      let overallTrend: 'improving' | 'declining' | 'stable' = 'stable'
      if (improvingCount > decliningCount) {
        overallTrend = 'improving'
      } else if (decliningCount > improvingCount) {
        overallTrend = 'declining'
      }

      // Find most logged category
      const categoryCounts = trends.map(t => ({ 
        category: t.category, 
        count: t.current_period.count 
      }))
      const mostLoggedCategory = categoryCounts.sort((a, b) => b.count - a.count)[0]?.category || AdaptationCategory.GENERAL

      return {
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        trends,
        total_entries: currentPeriodLogs.length,
        most_logged_category: mostLoggedCategory,
        overall_trend: overallTrend
      }
    } catch (error) {
      console.error('Error calculating trends:', error)
      throw new Error('Failed to calculate adaptation trends')
    }
  }

  /**
   * Get adaptation statistics for a specific category
   */
  async getCategoryStats(
    userId: string, 
    category: AdaptationCategory, 
    days: number = 30
  ): Promise<{
    average_value: number
    average_level: number
    total_entries: number
    best_day: { date: string; value: number } | null
    worst_day: { date: string; value: number } | null
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const logs = await this.getUserLogs(userId, startDate.toISOString(), undefined, category)
      
      if (logs.length === 0) {
        return {
          average_value: 0,
          average_level: 0,
          total_entries: 0,
          best_day: null,
          worst_day: null
        }
      }

      // Calculate averages
      const values = logs.map(log => log.value || this.severityToValue(log.severity)).filter(val => val !== null) as number[]
      const levels = logs.map(log => parseFloat(log.level || '0')).filter(val => !isNaN(val))
      
      const averageValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
      const averageLevel = levels.length > 0 ? levels.reduce((sum, val) => sum + val, 0) / levels.length : 0

      // Find best and worst days
      const metricsWithDates = logs.map(log => ({
        date: log.date,
        value: log.value || this.severityToValue(log.severity) || parseFloat(log.level || '0') || 0
      }))

      const bestDay = metricsWithDates.reduce((best, current) => 
        current.value > best.value ? current : best
      )
      
      const worstDay = metricsWithDates.reduce((worst, current) => 
        current.value < worst.value ? current : worst
      )

      return {
        average_value: averageValue,
        average_level: averageLevel,
        total_entries: logs.length,
        best_day: bestDay.value > 0 ? bestDay : null,
        worst_day: worstDay.value > 0 ? worstDay : null
      }
    } catch (error) {
      console.error('Error getting category stats:', error)
      throw new Error('Failed to get category statistics')
    }
  }

  /**
   * Helper method to convert severity to numeric value
   */
  private severityToValue(severity?: string): number | null {
    if (!severity) return null
    
    const severityMap: Record<string, number> = {
      'poor': 1,
      'fair': 2,
      'good': 3,
      'very_good': 4,
      'excellent': 5
    }
    
    return severityMap[severity.toLowerCase()] || null
  }

  /**
   * Validate adaptation log entry data
   */
  validateLogEntry(entry: Partial<AdaptationLogEntry>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Required fields
    if (!entry.user_id) {
      errors.push('User ID is required')
    }

    if (!entry.date) {
      errors.push('Date is required')
    } else {
      const date = new Date(entry.date)
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format')
      }
    }

    if (!entry.category) {
      errors.push('Category is required')
    } else if (!Object.values(AdaptationCategory).includes(entry.category as AdaptationCategory)) {
      errors.push('Invalid category')
    }

    // Validate value range if provided
    if (entry.value !== undefined && (entry.value < 0 || entry.value > 10)) {
      errors.push('Value must be between 0 and 10')
    }

    // Validate severity if provided
    if (entry.severity && !Object.values(AdaptationSeverity).includes(entry.severity as AdaptationSeverity)) {
      errors.push('Invalid severity level')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Cleanup - Supabase doesn't require explicit disconnection
   */
  async disconnect(): Promise<void> {
    // Supabase client handles connection management automatically
    return Promise.resolve()
  }
}

export const adaptationService = new AdaptationService()