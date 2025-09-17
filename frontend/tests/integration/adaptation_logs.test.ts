import { test, expect } from '@playwright/test';

test.describe('Adaptation Logs Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/dashboard');
    
    // Set up authenticated user state
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'premium'
      }));
    });
  });

  test('logs initial carnivore adaptation symptoms', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Wait for adaptation logs page
    await expect(page.locator('[data-testid="adaptation-logs-page"]')).toBeVisible();
    
    // Click add new log entry
    await page.click('[data-testid="add-log-entry"]');
    
    // Fill in adaptation symptoms
    await page.selectOption('[data-testid="log-category"]', 'symptoms');
    await page.selectOption('[data-testid="symptom-type"]', 'digestive');
    await page.selectOption('[data-testid="severity"]', 'moderate');
    await page.fill('[data-testid="symptom-description"]', 'Mild stomach discomfort after meals');
    
    // Set date and time
    await page.fill('[data-testid="log-date"]', '2024-01-15');
    await page.fill('[data-testid="log-time"]', '14:30');
    
    // Add notes
    await page.fill('[data-testid="log-notes"]', 'Started carnivore diet 3 days ago, expected adaptation symptoms');
    
    // Save log entry
    await page.click('[data-testid="save-log-entry"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Log entry saved successfully');
    
    // Verify entry appears in log list
    await expect(page.locator('[data-testid="log-entry-digestive-moderate"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-entry-digestive-moderate"]')).toContainText('Mild stomach discomfort');
  });

  test('tracks energy levels over time', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Add energy level log entries for trend tracking
    const energyLevels = [
      { date: '2024-01-10', level: 'low', notes: 'Day 1 - Very tired, brain fog' },
      { date: '2024-01-15', level: 'moderate', notes: 'Day 5 - Slight improvement' },
      { date: '2024-01-20', level: 'high', notes: 'Day 10 - Much more energetic!' }
    ];

    for (const entry of energyLevels) {
      await page.click('[data-testid="add-log-entry"]');
      await page.selectOption('[data-testid="log-category"]', 'energy');
      await page.selectOption('[data-testid="energy-level"]', entry.level);
      await page.fill('[data-testid="log-date"]', entry.date);
      await page.fill('[data-testid="log-notes"]', entry.notes);
      await page.click('[data-testid="save-log-entry"]');
    }
    
    // View energy trends chart
    await page.click('[data-testid="view-trends"]');
    await page.selectOption('[data-testid="trend-filter"]', 'energy');
    
    // Verify trend chart displays
    await expect(page.locator('[data-testid="energy-trend-chart"]')).toBeVisible();
    
    // Verify trend shows improvement
    await expect(page.locator('[data-testid="trend-improvement"]')).toContainText('Energy levels improving');
  });

  test('records weight and measurements', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Click add measurement
    await page.click('[data-testid="add-log-entry"]');
    await page.selectOption('[data-testid="log-category"]', 'measurements');
    
    // Enter weight
    await page.fill('[data-testid="weight-input"]', '180.5');
    await page.selectOption('[data-testid="weight-unit"]', 'lbs');
    
    // Enter body measurements
    await page.fill('[data-testid="waist-measurement"]', '34');
    await page.fill('[data-testid="chest-measurement"]', '42');
    await page.selectOption('[data-testid="measurement-unit"]', 'inches');
    
    // Set measurement date
    await page.fill('[data-testid="log-date"]', '2024-01-15');
    
    // Add progress notes
    await page.fill('[data-testid="log-notes"]', 'Feeling stronger, clothes fitting better');
    
    // Save measurement
    await page.click('[data-testid="save-log-entry"]');
    
    // Verify measurement saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Measurement recorded successfully');
    
    // View measurement history
    await page.click('[data-testid="view-trends"]');
    await page.selectOption('[data-testid="trend-filter"]', 'weight');
    
    // Verify weight trend chart
    await expect(page.locator('[data-testid="weight-trend-chart"]')).toBeVisible();
  });

  test('sets and tracks adaptation milestones', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Click on milestones tab
    await page.click('[data-testid="milestones-tab"]');
    
    // Set initial milestones
    const milestones = [
      { name: 'Complete first week', target: '2024-01-17' },
      { name: 'Resolve digestive issues', target: '2024-01-25' },
      { name: 'Stable energy levels', target: '2024-02-01' }
    ];
    
    for (const milestone of milestones) {
      await page.click('[data-testid="add-milestone"]');
      await page.fill('[data-testid="milestone-name"]', milestone.name);
      await page.fill('[data-testid="milestone-date"]', milestone.target);
      await page.click('[data-testid="save-milestone"]');
    }
    
    // Mark first milestone as achieved
    await page.click('[data-testid="milestone-complete-button-0"]');
    await page.fill('[data-testid="achievement-notes"]', 'Successfully completed first week! Feeling proud.');
    await page.click('[data-testid="confirm-achievement"]');
    
    // Verify milestone marked as complete
    await expect(page.locator('[data-testid="milestone-0-status"]')).toContainText('Completed');
    await expect(page.locator('[data-testid="milestone-0-achievement"]')).toBeVisible();
    
    // View milestone progress
    await expect(page.locator('[data-testid="milestone-progress"]')).toContainText('1 of 3 milestones achieved');
  });

  test('exports adaptation progress report', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Create some sample log entries first
    await page.click('[data-testid="add-log-entry"]');
    await page.selectOption('[data-testid="log-category"]', 'energy');
    await page.selectOption('[data-testid="energy-level"]', 'high');
    await page.fill('[data-testid="log-date"]', '2024-01-20');
    await page.fill('[data-testid="log-notes"]', 'Great energy today!');
    await page.click('[data-testid="save-log-entry"]');
    
    // Go to reports section
    await page.click('[data-testid="reports-tab"]');
    
    // Select report parameters
    await page.fill('[data-testid="report-start-date"]', '2024-01-01');
    await page.fill('[data-testid="report-end-date"]', '2024-01-31');
    await page.check('[data-testid="include-symptoms"]');
    await page.check('[data-testid="include-energy"]');
    await page.check('[data-testid="include-measurements"]');
    
    // Generate and download progress report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="generate-report"]')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/adaptation-progress-report.*\.pdf/);
    
    // Verify report summary displayed
    await expect(page.locator('[data-testid="report-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-log-entries"]')).toContainText('1 entries');
  });

  test('allows editing and deleting log entries', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Create a log entry to edit
    await page.click('[data-testid="add-log-entry"]');
    await page.selectOption('[data-testid="log-category"]', 'symptoms');
    await page.selectOption('[data-testid="symptom-type"]', 'headache');
    await page.selectOption('[data-testid="severity"]', 'mild');
    await page.fill('[data-testid="symptom-description"]', 'Slight headache in morning');
    await page.fill('[data-testid="log-date"]', '2024-01-15');
    await page.click('[data-testid="save-log-entry"]');
    
    // Edit the log entry
    await page.click('[data-testid="edit-log-entry-0"]');
    await page.selectOption('[data-testid="severity"]', 'severe');
    await page.fill('[data-testid="symptom-description"]', 'Severe headache lasting all morning');
    await page.click('[data-testid="update-log-entry"]');
    
    // Verify entry updated
    await expect(page.locator('[data-testid="log-entry-headache-severe"]')).toContainText('Severe headache lasting all morning');
    
    // Delete the log entry
    await page.click('[data-testid="delete-log-entry-0"]');
    await page.click('[data-testid="confirm-delete"]');
    
    // Verify entry deleted
    await expect(page.locator('[data-testid="log-entry-headache-severe"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="no-log-entries"]')).toBeVisible();
  });

  test('provides educational content about carnivore adaptation', async ({ page }) => {
    // Navigate to adaptation logs
    await page.click('[data-testid="nav-adaptation-logs"]');
    
    // Click on education tab
    await page.click('[data-testid="education-tab"]');
    
    // Verify educational sections
    await expect(page.locator('[data-testid="adaptation-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="common-symptoms"]')).toBeVisible();
    await expect(page.locator('[data-testid="tips-section"]')).toBeVisible();
    
    // Click on adaptation timeline
    await page.click('[data-testid="week-1-info"]');
    await expect(page.locator('[data-testid="week-1-details"]')).toContainText('Initial adaptation period');
    
    // View symptom information
    await page.click('[data-testid="symptom-info-digestive"]');
    await expect(page.locator('[data-testid="digestive-info"]')).toContainText('digestive changes are normal');
    
    // Access tips and recommendations
    await page.click('[data-testid="hydration-tips"]');
    await expect(page.locator('[data-testid="hydration-recommendations"]')).toContainText('Increase water intake');
  });
});