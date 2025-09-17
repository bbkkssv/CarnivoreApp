import { test, expect } from '@playwright/test';

/**
 * Integration Tests for Shopping List Creation & Export
 * 
 * Tests the complete shopping list flow including:
 * - Creating lists from meal plans
 * - CSV/PDF export (all users)
 * - Instacart integration (Premium only)
 * - Ingredient aggregation and organization
 */

test.describe('Shopping List Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in with a meal plan ready
    await page.goto('/dashboard');
  });

  test('User can create shopping list from meal plan', async ({ page }) => {
    // Start with an accepted meal plan
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    
    // Create shopping list
    await page.click('[data-testid="create-shopping-list"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="creating-list"]')).toBeVisible();
    
    // Should display aggregated shopping list
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible({ timeout: 3000 });
    
    // Should show ingredients organized by store sections
    await expect(page.locator('[data-testid="section-meat"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-dairy"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-pantry"]')).toBeVisible();
    
    // Should show quantities
    const firstItem = page.locator('[data-testid="shopping-item"]').first();
    await expect(firstItem.locator('[data-testid="quantity"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="unit"]')).toBeVisible();
  });

  test('Ingredients are properly aggregated across meals', async ({ page }) => {
    // Create list from 7-day plan
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // If multiple meals use ground beef, should be aggregated
    const groundBeef = page.locator('[data-testid="item-ground-beef"]');
    if (await groundBeef.count() > 0) {
      // Should show total quantity, not individual meal quantities
      const quantity = await groundBeef.locator('[data-testid="quantity"]').textContent();
      // Example: "3 lbs" instead of "1 lb, 1 lb, 1 lb"
      expect(quantity).toMatch(/^\d+(\.\d+)?\s+lbs?$/);
    }
    
    // Should not have duplicate items
    const allItems = await page.locator('[data-testid^="item-"]').count();
    const uniqueItems = await page.locator('[data-testid^="item-"]').allTextContents();
    const uniqueSet = new Set(uniqueItems);
    expect(uniqueSet.size).toBe(allItems);
  });

  test('All users can download CSV export', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Download CSV
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv"]')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Verify CSV content (basic check)
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('All users can download PDF export', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');  
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Download PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-pdf"]')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // Verify PDF was created
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('Basic users cannot access Instacart integration', async ({ page }) => {
    // Set user to Basic subscription
    await page.goto('/dashboard?subscription=basic');
    
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Instacart button should be disabled or not visible
    const instacartButton = page.locator('[data-testid="export-instacart"]');
    if (await instacartButton.count() > 0) {
      await expect(instacartButton).toBeDisabled();
    }
    
    // Should show upgrade prompt
    await expect(page.locator('[data-testid="premium-feature-lock"]')).toContainText('Premium feature');
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
  });

  test('Premium users can access Instacart cart handoff', async ({ page }) => {
    // Set user to Premium subscription
    await page.goto('/dashboard?subscription=premium');
    
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Instacart button should be available
    await expect(page.locator('[data-testid="export-instacart"]')).toBeEnabled();
    
    // Click Instacart export
    await page.click('[data-testid="export-instacart"]');
    
    // Should show Instacart integration loading
    await expect(page.locator('[data-testid="instacart-loading"]')).toBeVisible();
    
    // Should either:
    // 1. Open new tab/window with Instacart (in production)
    // 2. Show success message with Instacart link (in test)
    // 3. Show sandbox message (in development)
    await expect(page.locator('[data-testid="instacart-success"]')).toBeVisible({ timeout: 5000 });
  });

  test('User can modify shopping list before export', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Edit quantity
    const firstItem = page.locator('[data-testid="shopping-item"]').first();
    await firstItem.locator('[data-testid="edit-quantity"]').click();
    await firstItem.locator('[data-testid="quantity-input"]').fill('5');
    await firstItem.locator('[data-testid="save-quantity"]').click();
    
    // Verify change
    await expect(firstItem.locator('[data-testid="quantity"]')).toContainText('5');
    
    // Remove item
    await firstItem.locator('[data-testid="remove-item"]').click();
    await page.click('[data-testid="confirm-remove"]');
    
    // Item should be removed
    const remainingItems = await page.locator('[data-testid="shopping-item"]').count();
    // Should be one less than before
    
    // Add custom item
    await page.click('[data-testid="add-custom-item"]');
    await page.fill('[data-testid="custom-item-name"]', 'Sea Salt');
    await page.fill('[data-testid="custom-item-quantity"]', '1');
    await page.selectOption('[data-testid="custom-item-unit"]', 'container');
    await page.selectOption('[data-testid="custom-item-section"]', 'pantry');
    await page.click('[data-testid="add-item"]');
    
    // Custom item should appear in list
    await expect(page.locator('[data-testid="item-sea-salt"]')).toBeVisible();
  });

  test('Shopping list shows substitution suggestions', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Some items should have substitution hints
    const itemWithSubs = page.locator('[data-testid="item-ribeye-steak"]');
    if (await itemWithSubs.count() > 0) {
      await expect(itemWithSubs.locator('[data-testid="substitutions"]')).toBeVisible();
      
      // Click to see substitutions
      await itemWithSubs.locator('[data-testid="show-subs"]').click();
      await expect(page.locator('[data-testid="sub-options"]')).toBeVisible();
      
      // Should show alternatives like "New York Strip" or "Sirloin"
      const subOptions = await page.locator('[data-testid="sub-option"]').count();
      expect(subOptions).toBeGreaterThan(0);
    }
  });

  test('Shopping list handles unavailable items', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Simulate item being marked as unavailable  
    const firstItem = page.locator('[data-testid="shopping-item"]').first();
    await firstItem.locator('[data-testid="mark-unavailable"]').click();
    
    // Should show unavailable state
    await expect(firstItem).toHaveClass(/unavailable/);
    
    // Should offer substitution suggestions
    await expect(firstItem.locator('[data-testid="suggested-substitutes"]')).toBeVisible();
    
    // User can select substitute
    await firstItem.locator('[data-testid="substitute-option"]').first().click();
    await page.click('[data-testid="use-substitute"]');
    
    // Should replace original item with substitute
    await expect(firstItem).not.toHaveClass(/unavailable/);
  });

  test('User can organize items by store layout', async ({ page }) => {
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Should have section organization
    await expect(page.locator('[data-testid="section-meat"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-dairy"]')).toBeVisible();
    
    // User can toggle between views
    await page.click('[data-testid="view-by-category"]');
    await expect(page.locator('[data-testid="category-protein"]')).toBeVisible();
    
    await page.click('[data-testid="view-by-meal"]');
    await expect(page.locator('[data-testid="meal-day-1-breakfast"]')).toBeVisible();
    
    // Back to store layout
    await page.click('[data-testid="view-by-store"]');
    await expect(page.locator('[data-testid="section-meat"]')).toBeVisible();
  });

  test('Shopping list persists and can be accessed later', async ({ page }) => {
    // Create shopping list
    await page.click('[data-testid="my-plans"]');
    await page.click('[data-testid="view-plan"]');
    await page.click('[data-testid="create-shopping-list"]');
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    
    // Save the list
    await page.click('[data-testid="save-list"]');
    await page.fill('[data-testid="list-name"]', 'Weekly Shopping');
    await page.click('[data-testid="confirm-save"]');
    
    // Navigate away and back
    await page.goto('/dashboard');
    await page.click('[data-testid="my-shopping-lists"]');
    
    // Should see saved list
    await expect(page.locator('[data-testid="saved-list"]')).toContainText('Weekly Shopping');
    
    // Open saved list
    await page.click('[data-testid="open-list"]');
    
    // Should display the same list
    await expect(page.locator('[data-testid="shopping-list-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="list-title"]')).toContainText('Weekly Shopping');
  });
});