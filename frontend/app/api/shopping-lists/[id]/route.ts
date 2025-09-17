import { NextRequest, NextResponse } from 'next/server';
import { ShoppingListService } from '../../../../src/lib/services/shoppingList';

const shoppingListService = new ShoppingListService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shoppingListId = params.id;

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'Shopping list ID is required' },
        { status: 400 }
      );
    }

    // Get shopping list with full details
    const shoppingList = await shoppingListService.getShoppingList(shoppingListId);

    if (!shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    // Group items by category for better organization
    const itemsByCategory = shoppingList.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof shoppingList.items>);

    return NextResponse.json({
      id: shoppingList.id,
      userId: shoppingList.userId,
      mealPlanId: shoppingList.mealPlanId,
      items: shoppingList.items,
      itemsByCategory,
      totalItems: shoppingList.totalItems,
      checkedItems: shoppingList.checkedItems,
      completionRate: shoppingList.totalItems > 0 
        ? Math.round((shoppingList.checkedItems / shoppingList.totalItems) * 100) 
        : 0,
      estimatedTotal: shoppingList.estimatedTotal,
      exportFormats: shoppingList.exportFormats,
      categories: Array.from(new Set(shoppingList.items.map(item => item.category))),
      createdAt: shoppingList.createdAt.toISOString(),
      updatedAt: shoppingList.updatedAt.toISOString(),
      message: 'Shopping list retrieved successfully'
    });

  } catch (error) {
    console.error('Shopping list retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shoppingListId = params.id;
    const body = await request.json();
    const { action, itemId, checked, customItem } = body;

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'Shopping list ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'check_item':
        if (!itemId || typeof checked !== 'boolean') {
          return NextResponse.json(
            { error: 'Item ID and checked status are required for check_item action' },
            { status: 400 }
          );
        }
        
        await shoppingListService.updateItemChecked(shoppingListId, itemId, checked);
        
        return NextResponse.json({
          message: `Item ${checked ? 'checked' : 'unchecked'} successfully`
        });

      case 'add_item':
        if (!customItem || !customItem.name) {
          return NextResponse.json(
            { error: 'Custom item details are required for add_item action' },
            { status: 400 }
          );
        }
        
        await shoppingListService.addCustomItem(shoppingListId, customItem);
        
        return NextResponse.json({
          message: 'Custom item added successfully'
        });

      case 'remove_item':
        if (!itemId) {
          return NextResponse.json(
            { error: 'Item ID is required for remove_item action' },
            { status: 400 }
          );
        }
        
        await shoppingListService.removeItem(shoppingListId, itemId);
        
        return NextResponse.json({
          message: 'Item removed successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: check_item, add_item, remove_item' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Shopping list update error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shoppingListId = params.id;

    if (!shoppingListId) {
      return NextResponse.json(
        { error: 'Shopping list ID is required' },
        { status: 400 }
      );
    }

    // Verify shopping list exists first
    const shoppingList = await shoppingListService.getShoppingList(shoppingListId);
    
    if (!shoppingList) {
      return NextResponse.json(
        { error: 'Shopping list not found' },
        { status: 404 }
      );
    }

    // Delete the shopping list (this would need to be implemented in the service)
    // For now, return not implemented
    return NextResponse.json({
      message: 'Shopping list delete requested - deletion functionality to be implemented'
    }, { status: 501 }); // Not Implemented

  } catch (error) {
    console.error('Shopping list deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}