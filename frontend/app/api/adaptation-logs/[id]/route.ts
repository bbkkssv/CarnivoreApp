import { NextRequest, NextResponse } from 'next/server'
import { AdaptationService, AdaptationLogEntry, AdaptationCategory, AdaptationSeverity } from '../../../../src/services/adaptationService'

const adaptationService = new AdaptationService()

/**
 * GET /api/adaptation-logs/[id]
 * Get a specific adaptation log entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing adaptation log ID' },
        { status: 400 }
      )
    }

    const log = await adaptationService.getLogById(id)
    
    if (!log) {
      return NextResponse.json(
        { error: 'Adaptation log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      log,
      message: 'Adaptation log retrieved successfully'
    })

  } catch (error) {
    console.error(`Error in GET /api/adaptation-logs/${params.id}:`, error)
    return NextResponse.json(
      { error: 'Failed to retrieve adaptation log' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/adaptation-logs/[id]  
 * Update a specific adaptation log entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing adaptation log ID' },
        { status: 400 }
      )
    }

    // Check if log exists first
    const existingLog = await adaptationService.getLogById(id)
    if (!existingLog) {
      return NextResponse.json(
        { error: 'Adaptation log not found' },
        { status: 404 }
      )
    }

    // Validate category if provided
    if (body.category && !Object.values(AdaptationCategory).includes(body.category)) {
      return NextResponse.json(
        {
          error: 'Invalid category',
          validCategories: Object.values(AdaptationCategory)
        },
        { status: 400 }
      )
    }

    // Validate severity if provided
    if (body.severity && !Object.values(AdaptationSeverity).includes(body.severity)) {
      return NextResponse.json(
        {
          error: 'Invalid severity',
          validSeverities: Object.values(AdaptationSeverity)
        },
        { status: 400 }
      )
    }

    // Extract allowed update fields
    const allowedFields = ['category', 'severity', 'level', 'value', 'unit', 'notes', 'date']
    const updateData: Partial<AdaptationLogEntry> = {}
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field as keyof AdaptationLogEntry] = body[field]
      }
    })

    // Ensure we don't change the user_id
    if (body.user_id && body.user_id !== existingLog.user_id) {
      return NextResponse.json(
        { error: 'Cannot change user_id of existing log entry' },
        { status: 400 }
      )
    }

    const updatedLog = await adaptationService.updateLog(id, updateData)
    
    return NextResponse.json({
      log: updatedLog,
      changes: updateData,
      message: 'Adaptation log updated successfully'
    })

  } catch (error) {
    console.error(`Error in PUT /api/adaptation-logs/${params.id}:`, error)
    return NextResponse.json(
      { error: 'Failed to update adaptation log' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/adaptation-logs/[id]
 * Delete a specific adaptation log entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing adaptation log ID' },
        { status: 400 }
      )
    }

    // Verify ownership if userId provided (security check)
    if (userId) {
      const existingLog = await adaptationService.getLogById(id)
      if (!existingLog) {
        return NextResponse.json(
          { error: 'Adaptation log not found' },
          { status: 404 }
        )
      }
      
      if (existingLog.user_id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized to delete this adaptation log' },
          { status: 403 }
        )
      }
    }

    await adaptationService.deleteLog(id)
    
    return NextResponse.json({
      message: 'Adaptation log deleted successfully'
    })

  } catch (error) {
    console.error(`Error in DELETE /api/adaptation-logs/${params.id}:`, error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Adaptation log not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete adaptation log' },
      { status: 500 }
    )
  }
}