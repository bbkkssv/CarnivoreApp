import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '../../../../../src/lib/services/shoppingList';
import { createClient } from '@supabase/supabase-js';

const shoppingListService = new ShoppingListService();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shoppingListId = params.id;
    const body = await request.json();
    const { 
      format = 'csv', 
      includeChecked = true, 
      groupByCategory = true, 
      includePrices = false,
      userId 
    } = body;

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'Shopping list ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ['csv', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported formats: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Get shopping list and verify ownership
    const shoppingList = await shoppingListService.getShoppingList(shoppingListId);
    
    if (!shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    if (shoppingList.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to shopping list' },
        { status: 403 }
      );
    }

    // Check user subscription tier for PDF and premium features
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Enforce tier restrictions
    if (format === 'pdf' && user.subscription_tier === 'FREE') {
      return NextResponse.json(
        { 
          error: 'PDF export is available for Basic and Premium subscribers only',
          requiredTier: 'BASIC',
          currentTier: user.subscription_tier,
          upgradeUrl: '/subscription/upgrade'
        },
        { status: 402 } // Payment Required
      );
    }

    // Export the shopping list
    const exportedData = await shoppingListService.exportList(shoppingListId, {
      format,
      includeChecked,
      groupByCategory,
      includePrices
    });

    // Set appropriate content type and filename
    const contentTypes = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      json: 'application/json'
    };

    const filename = `shopping-list-${shoppingListId.slice(-8)}.${format}`;

    const response = NextResponse.json({
      format,
      filename,
      data: exportedData,
      size: exportedData.length,
      options: {
        includeChecked,
        groupByCategory,
        includePrices
      },
      listSummary: {
        totalItems: shoppingList.totalItems,
        checkedItems: shoppingList.checkedItems,
        estimatedTotal: shoppingList.estimatedTotal
      },
      message: `Shopping list exported successfully in ${format.toUpperCase()} format`
    });

    // Add download headers for browsers
    response.headers.set('Content-Type', contentTypes[format as keyof typeof contentTypes]);
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return response;

  } catch (error) {
    console.error('Shopping list export error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Unsupported')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST route for Instacart integration (Premium feature)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shoppingListId = params.id;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'Shopping list ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (action === 'instacart') {
      // Handle Instacart integration preparation
      const integrationResult = await shoppingListService.prepareInstacartIntegration(
        shoppingListId, 
        userId
      );

      if (!integrationResult.supported) {
        return NextResponse.json(
          { 
            error: 'Instacart integration requires Premium subscription',
            supported: false,
            requiredTier: 'PREMIUM',
            upgradeUrl: '/subscription/upgrade'
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json({
        supported: integrationResult.supported,
        redirectUrl: integrationResult.redirectUrl,
        unsupportedItems: integrationResult.unsupportedItems || [],
        message: 'Instacart integration prepared successfully'
      });

    } else {
      // Return available export options and user's tier capabilities
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const capabilities = {
        FREE: {
          exportFormats: ['csv'],
          instacartIntegration: false,
          includePrices: false
        },
        BASIC: {
          exportFormats: ['csv', 'pdf'],
          instacartIntegration: false,
          includePrices: true
        },
        PREMIUM: {
          exportFormats: ['csv', 'pdf', 'json'],
          instacartIntegration: true,
          includePrices: true
        }
      };

      const userCapabilities = capabilities[user.subscription_tier as keyof typeof capabilities] || capabilities.FREE;

      return NextResponse.json({
        shoppingListId,
        userTier: user.subscription_tier,
        capabilities: userCapabilities,
        availableActions: ['export', ...(userCapabilities.instacartIntegration ? ['instacart'] : [])],
        message: 'Export options retrieved successfully'
      });
    }

  } catch (error) {
    console.error('Shopping list export options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}