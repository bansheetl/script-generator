import { test, expect } from './electron-test';

/**
 * TEMPLATE TEST FILE
 * 
 * Copy this file to create new test suites.
 * Replace the test descriptions and implementations with your own.
 * 
 * To run this specific file:
 *   npx playwright test example-template.spec.ts
 * 
 * To run with UI mode:
 *   npx playwright test example-template.spec.ts --ui
 * 
 * To record new tests:
 *   npm run test:e2e:record
 */

test.describe('Template Test Suite', () => {
  // This runs before each test in this describe block
  test.beforeEach(async ({ page }) => {
    // Wait for the app to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Add any common setup here, like loading a specific script
  });

  // This runs after each test in this describe block
  test.afterEach(async ({ page }) => {
    // Add any cleanup here if needed
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: `test-results/after-${test.info().title.replace(/\s/g, '-')}.png` 
    });
  });

  test('example test - click a button', async ({ page }) => {
    // 1. Find an element
    const button = page.locator('button:has-text("Save")');
    
    // 2. Verify it exists
    await expect(button).toBeVisible();
    
    // 3. Interact with it
    await button.click();
    
    // 4. Wait for result
    await page.waitForTimeout(500);
    
    // 5. Assert expected outcome
    // (Replace with actual assertion based on your app's behavior)
    await expect(button).toBeVisible();
  });

  test('example test - fill a form field', async ({ page }) => {
    // 1. Find a text input or textarea
    const textArea = page.locator('textarea').first();
    
    // 2. Get current value
    const currentValue = await textArea.inputValue();
    
    // 3. Fill with new value
    const newValue = currentValue + ' TEST TEXT';
    await textArea.fill(newValue);
    
    // 4. Verify the change
    await expect(textArea).toHaveValue(newValue);
  });

  test('example test - work with dropdowns', async ({ page }) => {
    // 1. Open dropdown
    const dropdown = page.locator('p-select');
    await dropdown.click();
    
    // 2. Wait for options to appear
    await page.waitForTimeout(500);
    
    // 3. Select an option
    await page.locator('p-option').first().click();
    
    // 4. Wait for selection to take effect
    await page.waitForTimeout(1000);
    
    // 5. Verify something changed (adjust based on your app)
    const scriptEditor = page.locator('app-script-editor');
    await expect(scriptEditor).toBeVisible();
  });

  test('example test - keyboard shortcuts', async ({ page }) => {
    // 1. Set up initial state
    const textArea = page.locator('textarea').first();
    await textArea.fill('Test text');
    
    // 2. Use keyboard shortcut (Cmd+S on Mac, Ctrl+S on Windows/Linux)
    await page.keyboard.press('Meta+s');
    
    // 3. Wait for action to complete
    await page.waitForTimeout(1000);
    
    // 4. Verify result
    // (Add appropriate assertions based on save behavior)
    await expect(textArea).toBeVisible();
  });

  test.skip('example test - skipped test', async ({ page }) => {
    // Use test.skip() for tests that are work in progress
    // or temporarily broken
    
    // This test will not run
  });

  test('example test - with multiple steps', async ({ page }) => {
    // Step 1: Load data
    const dropdown = page.locator('p-select');
    await dropdown.click();
    await page.waitForTimeout(500);
    await page.locator('p-option').first().click();
    await page.waitForTimeout(2000);
    
    // Take screenshot after step 1
    await page.screenshot({ path: 'test-results/step1-loaded.png' });
    
    // Step 2: Make changes
    const textArea = page.locator('textarea').first();
    const originalText = await textArea.inputValue();
    await textArea.fill(originalText + ' MODIFIED');
    
    // Take screenshot after step 2
    await page.screenshot({ path: 'test-results/step2-modified.png' });
    
    // Step 3: Save changes
    await page.keyboard.press('Meta+s');
    await page.waitForTimeout(1000);
    
    // Take screenshot after step 3
    await page.screenshot({ path: 'test-results/step3-saved.png' });
    
    // Step 4: Verify
    expect(await textArea.inputValue()).toContain('MODIFIED');
  });
});

test.describe('Another Test Suite', () => {
  test('isolated test', async ({ page }) => {
    // Each test runs with a fresh app instance
    await page.waitForLoadState('domcontentloaded');
    
    // Your test logic here
    const toolbar = page.locator('p-toolbar');
    await expect(toolbar).toBeVisible();
  });
});

// You can organize tests into multiple describe blocks
test.describe('Feature Group 1', () => {
  test('feature 1 test', async ({ page }) => {
    // Test implementation
  });
});

test.describe('Feature Group 2', () => {
  test('feature 2 test', async ({ page }) => {
    // Test implementation
  });
});
