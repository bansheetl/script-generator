import { test, expect } from './electron-test';
import type { Page } from '@playwright/test';

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

// Helper to load first script
async function loadFirstScript(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Open script selector using test id
  const selector = page.locator('[data-testid="script-selector"]');
  await selector.click();
  await page.waitForTimeout(300);
  const firstOption = page.locator('[role="option"]').first();
  if (await firstOption.count() > 0) {
    await firstOption.click();
    await page.waitForTimeout(1500); // allow paragraphs to render
  }
}

// Helper to make a paragraph edit (enables save button)
async function editFirstParagraph(page: Page) {
  const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
  await paragraphText.click();
  await page.waitForTimeout(300);
  const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
  const original = (await textArea.inputValue()) || '';
  await textArea.fill(original + ' [E2E EDIT]');
  // Save paragraph edit
  const saveParagraphBtn = page.locator('[data-testid="paragraph-save-button"]').first();
  if (await saveParagraphBtn.count() > 0) {
    await saveParagraphBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Template Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await loadFirstScript(page);
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
    // Ensure save button becomes enabled by editing a paragraph
    await editFirstParagraph(page);
    const saveButton = page.locator('[data-testid="save-button"]');
    await expect(saveButton).toBeVisible();
    // Wait until enabled
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await page.waitForTimeout(500);
    // Save button should remain visible
    await expect(saveButton).toBeVisible();
  });

  test('example test - fill a form field', async ({ page }) => {
    await editFirstParagraph(page);
    // Re-open editor to verify content
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const currentValue = await textArea.inputValue();
    const newValue = currentValue + ' TEST TEXT';
    await textArea.fill(newValue);
    await expect(textArea).toHaveValue(newValue);
  });

  test('example test - work with dropdowns', async ({ page }) => {
    // Already loaded first script in beforeEach. Switch to another script if available.
    const selector = page.locator('[data-testid="script-selector"]');
    await selector.click();
    await page.waitForTimeout(300);
    const options = page.locator('[role="option"]');
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
      await page.waitForTimeout(1500);
    }
    const scriptEditor = page.locator('app-script-editor');
    await expect(scriptEditor).toBeVisible();
  });

  test('example test - keyboard shortcuts', async ({ page }) => {
    await editFirstParagraph(page);
    // Enter edit mode again
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    await textArea.fill('Test text');
    await page.keyboard.press('Meta+s');
    await page.waitForTimeout(800);
    await expect(textArea).toBeVisible();
  });

  test.skip('example test - skipped test', async ({ page }) => {
    // Use test.skip() for tests that are work in progress
    // or temporarily broken
    
    // This test will not run
  });

  test('example test - with multiple steps', async ({ page }) => {
    // Step 1: Ensure script loaded (beforeEach already did) & edit paragraph
    await editFirstParagraph(page);
    await page.screenshot({ path: 'test-results/step1-loaded.png' });
    // Step 2: Further modify text
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText = await textArea.inputValue();
    await textArea.fill(originalText + ' MODIFIED');
    await page.screenshot({ path: 'test-results/step2-modified.png' });
    // Step 3: Save (toolbar or shortcut)
    await page.keyboard.press('Meta+s');
    await page.waitForTimeout(800);
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
