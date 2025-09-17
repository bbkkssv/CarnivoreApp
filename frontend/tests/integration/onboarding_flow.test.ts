import { test, expect } from '@playwright/test';

/**
 * Integration Tests for Onboarding Flow
 * 
 * These tests verify the complete onboarding questionnaire flow.
 * Must have 24+ questions as per requirements.
 * They should FAIL initially until we implement the features.
 */

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in and redirected to onboarding
    await page.goto('/onboarding');
  });

  test('User can complete full onboarding questionnaire (24+ questions)', async ({ page }) => {
    // Should see onboarding welcome
    await expect(page.locator('[data-testid="onboarding-title"]')).toContainText('Welcome');
    
    // Question 1: Age
    await page.selectOption('[data-testid="age-select"]', '45');
    await page.click('[data-testid="next-button"]');
    
    // Question 2: Gender
    await page.check('[data-testid="gender-male"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 3: Current weight
    await page.fill('[data-testid="weight-input"]', '180');
    await page.selectOption('[data-testid="weight-unit"]', 'lbs');
    await page.click('[data-testid="next-button"]');
    
    // Question 4: Height
    await page.fill('[data-testid="height-feet"]', '6');
    await page.fill('[data-testid="height-inches"]', '0');
    await page.click('[data-testid="next-button"]');
    
    // Question 5: Activity level
    await page.check('[data-testid="activity-moderate"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 6: Current diet
    await page.check('[data-testid="diet-standard"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 7: Health goals (multiple selection)
    await page.check('[data-testid="goal-weight-loss"]');
    await page.check('[data-testid="goal-energy"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 8: Preferred meats (multiple selection)
    await page.check('[data-testid="meat-beef"]');
    await page.check('[data-testid="meat-chicken"]');
    await page.check('[data-testid="meat-pork"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 9: Meat exclusions
    await page.check('[data-testid="exclude-none"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 10: Cooking skill
    await page.check('[data-testid="cooking-intermediate"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 11: Prep time preference
    await page.check('[data-testid="prep-30min"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 12: Budget range
    await page.selectOption('[data-testid="budget-select"]', 'moderate');
    await page.click('[data-testid="next-button"]');
    
    // Question 13: Nutritional profile preference
    await page.check('[data-testid="nutrition-strict"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 14: Meal frequency
    await page.check('[data-testid="meals-3-per-day"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 15: Portion sizes
    await page.check('[data-testid="portions-standard"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 16: Kitchen equipment
    await page.check('[data-testid="equipment-basic"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 17: Dietary restrictions/allergies
    await page.fill('[data-testid="restrictions-text"]', 'None');
    await page.click('[data-testid="next-button"]');
    
    // Question 18: Previous carnivore experience
    await page.check('[data-testid="experience-beginner"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 19: Health conditions
    await page.check('[data-testid="health-none"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 20: Medications
    await page.fill('[data-testid="medications-text"]', 'None');
    await page.click('[data-testid="next-button"]');
    
    // Question 21: Exercise routine
    await page.fill('[data-testid="exercise-text"]', 'Gym 3x per week');
    await page.click('[data-testid="next-button"]');
    
    // Question 22: Sleep schedule
    await page.selectOption('[data-testid="sleep-hours"]', '7-8');
    await page.click('[data-testid="next-button"]');
    
    // Question 23: Stress level
    await page.check('[data-testid="stress-moderate"]');
    await page.click('[data-testid="next-button"]');
    
    // Question 24: Tracking preferences
    await page.check('[data-testid="tracking-weekly"]');
    await page.click('[data-testid="next-button"]');
    
    // Additional questions to ensure we meet 24+ requirement
    // Question 25: Grocery shopping preference
    await page.check('[data-testid="grocery-online"]');
    await page.click('[data-testid="next-button"]');
    
    // Final submit
    await page.click('[data-testid="complete-onboarding"]');
    
    // Should redirect to dashboard with success message
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible();
  });

  test('User can save partial progress and resume later', async ({ page }) => {
    // Answer first few questions
    await page.selectOption('[data-testid="age-select"]', '35');
    await page.click('[data-testid="next-button"]');
    
    await page.check('[data-testid="gender-female"]');
    await page.click('[data-testid="next-button"]');
    
    // Save and exit
    await page.click('[data-testid="save-exit-button"]');
    
    // Should redirect to dashboard with resume prompt
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="resume-onboarding"]')).toBeVisible();
    
    // Resume onboarding
    await page.click('[data-testid="resume-onboarding"]');
    
    // Should return to where we left off (question 3)
    await expect(page.locator('[data-testid="weight-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('2 of');
  });

  test('User can edit responses after completion', async ({ page }) => {
    // Assume onboarding is complete, go to profile/settings
    await page.goto('/profile');
    
    // Click edit onboarding responses
    await page.click('[data-testid="edit-onboarding"]');
    
    // Should show editable form with current responses
    await expect(page.locator('[data-testid="age-select"]')).toHaveValue('45');
    
    // Change a response
    await page.selectOption('[data-testid="age-select"]', '50');
    await page.click('[data-testid="save-changes"]');
    
    // Should save and redirect back to profile
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('[data-testid="success-message"]')).toContainText('updated');
  });

  test('Onboarding validates required fields', async ({ page }) => {
    // Try to proceed without answering required question
    await page.click('[data-testid="next-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Should not advance to next question
    await expect(page.locator('[data-testid="age-select"]')).toBeVisible();
  });

  test('Onboarding shows progress indicator', async ({ page }) => {
    // Should show progress (e.g., "1 of 25")
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('1 of');
    
    // Progress should update as user advances
    await page.selectOption('[data-testid="age-select"]', '40');
    await page.click('[data-testid="next-button"]');
    
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('2 of');
  });

  test('User can go back to previous questions', async ({ page }) => {
    // Answer first question
    await page.selectOption('[data-testid="age-select"]', '40');
    await page.click('[data-testid="next-button"]');
    
    // Go to second question
    await page.check('[data-testid="gender-male"]');
    
    // Click back button
    await page.click('[data-testid="back-button"]');
    
    // Should return to first question with previous answer preserved
    await expect(page.locator('[data-testid="age-select"]')).toHaveValue('40');
  });
});