import { NextRequest, NextResponse } from 'next/server'
import { AdaptationService, AdaptationLogEntry, AdaptationCategory } from '../../../src/services/adaptationService'

const adaptationService = new AdaptationService()

/**
 * POST /api/adaptation-logs
 * Create new adaptation log entry or batch entries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields for single entry
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      )
    }

    // Check if this is a batch request or single entry
    const isBatch = Array.isArray(body.entries)
    
    if (isBatch) {
      // Batch log creation
      const { entries, user_id } = body
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json(
          { error: 'entries must be a non-empty array' },
          { status: 400 }
        )
      }

      // Validate each entry and ensure user_id consistency
      const validatedEntries: AdaptationLogEntry[] = entries.map((entry: any, index: number) => {
        if (!entry.category) {
          throw new Error(`Entry ${index}: Missing required field 'category'`)
        }
        if (!entry.date) {
          throw new Error(`Entry ${index}: Missing required field 'date'`)
        }
        
        // Ensure all entries belong to the same user
        return {
          ...entry,
          user_id: user_id
        }
      })

      const createdLogs = await adaptationService.createBatchLogs(validatedEntries)
      
      return NextResponse.json({
        logs: createdLogs,
        count: createdLogs.length,
        message: `Successfully created ${createdLogs.length} adaptation log entries`
      }, { status: 201 })
      
    } else {
      // Single log creation
      const { user_id, date, category, severity, level, value, unit, notes } = body
      
      if (!category) {
        return NextResponse.json(
          { error: 'Missing required field: category' },
          { status: 400 }
        )
      }
      
      if (!date) {
        return NextResponse.json(
          { error: 'Missing required field: date' },
          { status: 400 }
        )
      }

      // Validate category
      if (!Object.values(AdaptationCategory).includes(category)) {
        return NextResponse.json(
          { 
            error: 'Invalid category',
            validCategories: Object.values(AdaptationCategory)
          },
          { status: 400 }
        )
      }

      const logEntry: AdaptationLogEntry = {
        user_id,
        date,
        category,
        severity,
        level,
        value,
        unit,
        notes
      }

      const createdLog = await adaptationService.createLog(logEntry)
      
      return NextResponse.json({
        log: createdLog,
        message: 'Adaptation log entry created successfully'
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Error in POST /api/adaptation-logs:', error)
    
    if (error instanceof Error && error.message.includes('Entry')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create adaptation log entry' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/adaptation-logs
 * Retrieve adaptation logs and trends for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const action = searchParams.get('action') // 'logs' or 'trends'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate') 
    const category = searchParams.get('category')
    const days = searchParams.get('days')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    // Default action is 'logs' if not specified
    const requestedAction = action || 'logs'

    if (requestedAction === 'trends') {
      // Get trend analysis
      const trendDays = days ? parseInt(days) : 30
      
      if (isNaN(trendDays) || trendDays < 1 || trendDays > 365) {
        return NextResponse.json(
          { error: 'days parameter must be between 1 and 365' },
          { status: 400 }
        )
      }

      const trendSummary = await adaptationService.calculateTrends(userId, trendDays)
      
      return NextResponse.json({
        trends: trendSummary,
        userId,
        period: `${trendDays} days`,
        message: 'Adaptation trends retrieved successfully'
      })

    } else if (requestedAction === 'logs') {
      // Get raw log entries
      const categoryFilter = category as AdaptationCategory | undefined
      
      // Validate category if provided
      if (category && !Object.values(AdaptationCategory).includes(categoryFilter!)) {
        return NextResponse.json(
          { 
            error: 'Invalid category parameter',
            validCategories: Object.values(AdaptationCategory)
          },
          { status: 400 }
        )
      }

      const logs = await adaptationService.getUserLogs(
        userId,
        startDate || undefined,
        endDate || undefined,
        categoryFilter
      )

      // Group logs by category for summary
      const categoryGroups = logs.reduce((groups: Record<string, AdaptationLogEntry[]>, log: AdaptationLogEntry) => {
        if (!groups[log.category]) {
          groups[log.category] = []
        }
        groups[log.category].push(log)
        return groups
      }, {} as Record<string, AdaptationLogEntry[]>)

      const summary = {
        totalEntries: logs.length,
        dateRange: {
          start: startDate,
          end: endDate
        },
        categoryCounts: Object.keys(categoryGroups).map(cat => ({
          category: cat,
          count: categoryGroups[cat].length
        }))
      }

      return NextResponse.json({
        logs,
        summary,
        userId,
        filters: {
          startDate,
          endDate,
          category
        },
        message: 'Adaptation logs retrieved successfully'
      })

    } else {
      return NextResponse.json(
        { 
          error: 'Invalid action parameter',
          validActions: ['logs', 'trends']
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in GET /api/adaptation-logs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve adaptation data' },
      { status: 500 }
    )
  }
}