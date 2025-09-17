import { test, expect } from '@playwright/test';

/**
 * Integration Tests for Authentication & Registration
 * 
 * These tests verify the complete user registration and authentication flow.
 * They should FAIL initially until we implement the features.
 */

test.describe('Authentication & Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start on the homepage
    await page.goto('/');
  });

  test('User can register with email and password', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Sign Up'); // This link doesn't exist yet - will fail
    
    // Fill out registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!');
    
    // Confirm age requirement (18+)
    await page.check('[data-testid="age-confirmation"]');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/);
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('Registration fails with invalid email', async ({ page }) => {
    await page.click('text=Sign Up');
    
    // Try invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    await page.check('[data-testid="age-confirmation"]');
    
    await page.click('[data-testid="register-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('valid email');
  });

  test('Registration fails with weak password', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', '123'); // Too weak
    await page.check('[data-testid="age-confirmation"]');
    
    await page.click('[data-testid="register-button"]');
    
    // Should show password requirements error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('password');
  });

  test('Registration fails without age confirmation', async ({ page }) => {
    await page.click('text=Sign Up');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
    // Don't check age confirmation
    
    await page.click('[data-testid="register-button"]');
    
    // Should show age confirmation error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('18 or older');
  });

  test('User can login with existing credentials', async ({ page }) => {
    // This assumes we have a test user already registered
    await page.click('text=Sign In'); // This link doesn't exist yet - will fail
    
    await page.fill('[data-testid="login-email"]', 'existing@example.com');
    await page.fill('[data-testid="login-password"]', 'ExistingPassword123!');
    
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Should see user-specific content
    await expect(page.locator('[data-testid="user-welcome"]')).toBeVisible();
  });

  test('Login fails with incorrect credentials', async ({ page }) => {
    await page.click('text=Sign In');
    
    await page.fill('[data-testid="login-email"]', 'wrong@example.com');
    await page.fill('[data-testid="login-password"]', 'WrongPassword123!');
    
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('User can logout', async ({ page }) => {
    // First login (assuming we have auth state)
    await page.goto('/dashboard'); // Will redirect to login if not authenticated
    
    // Click logout button
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to homepage
    await expect(page).toHaveURL('/');
    
    // Should no longer see authenticated content
    await expect(page.locator('[data-testid="user-welcome"]')).not.toBeVisible();
  });

  test('Protected routes redirect to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Try onboarding
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/login/);
    
    // Try meal plans
    await page.goto('/meal-plans');
    await expect(page).toHaveURL(/\/login/);
  });
});