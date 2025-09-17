import { test, expect } from '@playwright/test';

test.describe('Stripe Subscriptions Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/dashboard');
    
    // Set up authenticated user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'free'
      }));
    });
  });

  test('displays subscription plans and pricing', async ({ page }) => {
    // Navigate to subscription page
    await page.click('[data-testid="nav-subscription"]');
    
    // Wait for subscription page to load
    await expect(page.locator('[data-testid="subscription-page"]')).toBeVisible();
    
    // Verify free tier is displayed
    await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();
    await expect(page.locator('[data-testid="free-price"]')).toContainText('$0');
    await expect(page.locator('[data-testid="free-features"]')).toContainText('Basic meal plans');
    
    // Verify premium tier is displayed  
    await expect(page.locator('[data-testid="plan-premium"]')).toBeVisible();
    await expect(page.locator('[data-testid="premium-price"]')).toContainText('$9.99');
    await expect(page.locator('[data-testid="premium-features"]')).toContainText('Instacart integration');
    
    // Verify pro tier is displayed
    await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible();
    await expect(page.locator('[data-testid="pro-price"]')).toContainText('$19.99');
    await expect(page.locator('[data-testid="pro-features"]')).toContainText('AI-powered recommendations');
  });

  test('upgrades from free to premium subscription', async ({ page }) => {
    // Navigate to subscription page
    await page.click('[data-testid="nav-subscription"]');
    
    // Current plan should show as free
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Free');
    
    // Click upgrade to premium
    await page.click('[data-testid="upgrade-to-premium"]');
    
    // Verify Stripe checkout elements appear
    await expect(page.locator('[data-testid="stripe-checkout-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-summary"]')).toContainText('Premium Plan - $9.99/month');
    
    // Fill in mock payment details (using Stripe test card)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="billing-name"]', 'Test User');
    await page.fill('[data-testid="billing-email"]', 'test@example.com');
    
    // Submit payment
    await page.click('[data-testid="complete-payment"]');
    
    // Verify payment processing
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();
    
    // Wait for success confirmation
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Successfully upgraded to Premium!');
    
    // Verify subscription status updated
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Premium');
    
    // Verify premium features are now accessible
    await page.goto('/meal-plans');
    await expect(page.locator('[data-testid="instacart-integration"]')).toBeVisible();
  });

  test('handles failed payment attempts', async ({ page }) => {
    // Navigate to subscription page
    await page.click('[data-testid="nav-subscription"]');
    
    // Click upgrade to premium
    await page.click('[data-testid="upgrade-to-premium"]');
    
    // Fill in declined test card number
    await page.fill('[data-testid="card-number"]', '4000000000000002');
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="billing-name"]', 'Test User');
    await page.fill('[data-testid="billing-email"]', 'test@example.com');
    
    // Submit payment
    await page.click('[data-testid="complete-payment"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Your card was declined');
    
    // Verify user remains on free plan
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Free');
    
    // Verify retry option is available
    await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
  });

  test('manages subscription billing and invoices', async ({ page }) => {
    // Set up premium user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium',
        stripeCustomerId: 'cus_test123'
      }));
    });
    
    await page.reload();
    
    // Navigate to billing section
    await page.click('[data-testid="nav-subscription"]');
    await page.click('[data-testid="billing-tab"]');
    
    // Verify billing information displayed
    await expect(page.locator('[data-testid="current-plan-info"]')).toContainText('Premium Plan');
    await expect(page.locator('[data-testid="billing-amount"]')).toContainText('$9.99');
    await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
    
    // View payment method
    await expect(page.locator('[data-testid="payment-method"]')).toContainText('•••• 4242');
    
    // Update payment method
    await page.click('[data-testid="update-payment-method"]');
    await expect(page.locator('[data-testid="stripe-payment-form"]')).toBeVisible();
    
    // View billing history
    await page.click('[data-testid="billing-history"]');
    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
    
    // Download invoice
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-invoice-0"]')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/);
  });

  test('downgrades subscription plan', async ({ page }) => {
    // Set up premium user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium',
        stripeCustomerId: 'cus_test123'
      }));
    });
    
    await page.reload();
    
    // Navigate to subscription page
    await page.click('[data-testid="nav-subscription"]');
    
    // Click downgrade option
    await page.click('[data-testid="manage-subscription"]');
    await page.click('[data-testid="downgrade-plan"]');
    
    // Confirm downgrade
    await expect(page.locator('[data-testid="downgrade-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="downgrade-warning"]')).toContainText('lose access to premium features');
    
    await page.click('[data-testid="confirm-downgrade"]');
    
    // Verify downgrade processed
    await expect(page.locator('[data-testid="downgrade-success"]')).toContainText('Successfully downgraded');
    
    // Verify plan change takes effect at end of billing period
    await expect(page.locator('[data-testid="plan-change-notice"]')).toContainText('will remain active until');
    
    // Verify current features still accessible until period end
    await page.goto('/meal-plans');
    await expect(page.locator('[data-testid="instacart-integration"]')).toBeVisible();
    await expect(page.locator('[data-testid="downgrade-notice"]')).toContainText('Premium features will expire');
  });

  test('handles subscription cancellation', async ({ page }) => {
    // Set up premium user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium',
        stripeCustomerId: 'cus_test123'
      }));
    });
    
    await page.reload();
    
    // Navigate to subscription management
    await page.click('[data-testid="nav-subscription"]');
    await page.click('[data-testid="manage-subscription"]');
    
    // Click cancel subscription
    await page.click('[data-testid="cancel-subscription"]');
    
    // Show cancellation survey (optional)
    await expect(page.locator('[data-testid="cancellation-survey"]')).toBeVisible();
    await page.selectOption('[data-testid="cancellation-reason"]', 'too-expensive');
    await page.fill('[data-testid="cancellation-feedback"]', 'Great app but budget is tight');
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancellation"]');
    
    // Verify cancellation processed
    await expect(page.locator('[data-testid="cancellation-success"]')).toContainText('Subscription cancelled');
    
    // Verify access continues until end of period
    await expect(page.locator('[data-testid="access-until"]')).toContainText('Premium access until');
    
    // Verify reactivation option available
    await expect(page.locator('[data-testid="reactivate-subscription"]')).toBeVisible();
  });

  test('applies promo codes and discounts', async ({ page }) => {
    // Navigate to subscription page
    await page.click('[data-testid="nav-subscription"]');
    
    // Click upgrade to premium
    await page.click('[data-testid="upgrade-to-premium"]');
    
    // Click to apply promo code
    await page.click('[data-testid="apply-promo-code"]');
    await page.fill('[data-testid="promo-code-input"]', 'CARNIVORE50');
    await page.click('[data-testid="validate-promo-code"]');
    
    // Verify discount applied
    await expect(page.locator('[data-testid="discount-applied"]')).toContainText('50% discount applied');
    await expect(page.locator('[data-testid="discounted-price"]')).toContainText('$4.99');
    await expect(page.locator('[data-testid="original-price"]')).toHaveCSS('text-decoration', /line-through/);
    
    // Complete payment with discount
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/28');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="billing-name"]', 'Test User');
    
    await page.click('[data-testid="complete-payment"]');
    
    // Verify subscription created with discount
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-price"]')).toContainText('$4.99');
  });

  test('enforces feature restrictions by subscription tier', async ({ page }) => {
    // Test free tier restrictions
    await page.goto('/meal-plans');
    
    // Verify basic features accessible
    await expect(page.locator('[data-testid="generate-meal-plan"]')).toBeVisible();
    
    // Verify premium features blocked
    await expect(page.locator('[data-testid="instacart-integration"]')).not.toBeVisible();
    
    // Click on premium feature
    await page.click('[data-testid="advanced-customization"]');
    
    // Verify upgrade prompt
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-message"]')).toContainText('Upgrade to Premium');
    
    // Test adaptation logs limits
    await page.goto('/adaptation-logs');
    
    // Add multiple log entries to test free tier limits
    for (let i = 0; i < 15; i++) {
      await page.click('[data-testid="add-log-entry"]');
      await page.selectOption('[data-testid="log-category"]', 'energy');
      await page.selectOption('[data-testid="energy-level"]', 'moderate');
      await page.fill('[data-testid="log-date"]', `2024-01-${String(i + 1).padStart(2, '0')}`);
      await page.click('[data-testid="save-log-entry"]');
      
      // Should hit limit after 10 entries on free tier
      if (i >= 9) {
        await expect(page.locator('[data-testid="limit-reached"]')).toBeVisible();
        await expect(page.locator('[data-testid="upgrade-for-more"]')).toContainText('Upgrade for unlimited logs');
        break;
      }
    }
  });

  test('handles webhook events for subscription updates', async ({ page }) => {
    // Set up premium user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium',
        stripeCustomerId: 'cus_test123'
      }));
    });
    
    await page.reload();
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Simulate webhook event by triggering server-side update
    // This would normally come from Stripe webhooks
    await page.evaluate(() => {
      // Simulate subscription expiration
      const event = new CustomEvent('subscription-updated', {
        detail: { status: 'past_due', tier: 'free' }
      });
      window.dispatchEvent(event);
    });
    
    // Wait for UI to reflect webhook update
    await expect(page.locator('[data-testid="subscription-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-failed-notice"]')).toContainText('Payment failed');
    
    // Verify premium features are now restricted
    await page.goto('/meal-plans');
    await expect(page.locator('[data-testid="instacart-integration"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="subscription-expired"]')).toContainText('Premium features expired');
    
    // Verify update payment option shown
    await expect(page.locator('[data-testid="update-payment-urgent"]')).toBeVisible();
  });
});