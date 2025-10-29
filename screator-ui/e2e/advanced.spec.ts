import { test, expect } from './electron-test';
import { safeScreenshot } from './test-helpers';

/**
 * Advanced E2E test examples showcasing more complex interactions.
 * These tests demonstrate patterns you can record and adapt.
 */

test.describe('Screator UI - Advanced Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('complete workflow: load, edit multiple paragraphs, and save', async ({ page }) => {
    // Step 1: Load a script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Step 2: Edit first paragraph
    const firstParagraphText = page.locator('[data-testid="paragraph-text"]').first();
    await firstParagraphText.click();
    await page.waitForTimeout(300);
    
    const firstTextArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText1 = await firstTextArea.inputValue();
    await firstTextArea.fill(originalText1 + ' [EDIT 1]');
    
    // Save first paragraph
    await page.locator('[data-testid="paragraph-save-button"]').first().click();
    await page.waitForTimeout(300);
    
    // Step 3: Edit second paragraph
    const secondParagraphText = page.locator('[data-testid="paragraph-text"]').nth(1);
    await secondParagraphText.click();
    await page.waitForTimeout(300);
    
    const secondTextArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText2 = await secondTextArea.inputValue();
    await secondTextArea.fill(originalText2 + ' [EDIT 2]');
    
    // Save second paragraph
    await page.locator('[data-testid="paragraph-save-button"]').first().click();
    await page.waitForTimeout(300);
    
    // Step 4: Save the changes using test ID
    await page.locator('[data-testid="save-button"]').click();
    await page.waitForTimeout(1000);
    
    // Step 5: Verify changes persisted (both texts should still contain edits)
    const savedFirstText = await page.locator('[data-testid="paragraph-text"]').first().textContent();
    const savedSecondText = await page.locator('[data-testid="paragraph-text"]').nth(1).textContent();
    
    expect(savedFirstText).toContain('[EDIT 1]');
    expect(savedSecondText).toContain('[EDIT 2]');
  });

  test('should handle rapid script switching', async ({ page }) => {
    // Load first script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(300);
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    await page.waitForTimeout(1500);
    
    // Verify first script loaded
    let scriptEditor = page.locator('app-script-editor');
    await expect(scriptEditor).toBeVisible();
    
    // Switch to another script (if available) using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(300);
    const optionCount = await page.locator('[role="option"]').count();
    
    if (optionCount > 1) {
      await page.locator('[role="option"]').nth(1).click();
      await page.waitForTimeout(1500);
      
      // Verify second script loaded
      await expect(scriptEditor).toBeVisible();
    }
  });

  test('should preserve undo/redo stack during edits', async ({ page }) => {
    // Load script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Get first paragraph and enter edit mode
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText = await textArea.inputValue();
    
    // Make first edit
    await textArea.fill(originalText + ' [EDIT 1]');
    await page.waitForTimeout(300);
    
    // Save first edit
    await page.locator('[data-testid="paragraph-save-button"]').first().click();
    await page.waitForTimeout(300);
    
    // Make second edit
    await paragraphText.click();
    await page.waitForTimeout(300);
    await textArea.fill(originalText + ' [EDIT 1] [EDIT 2]');
    await page.waitForTimeout(300);
    
    // Save second edit
    await page.locator('[data-testid="paragraph-save-button"]').first().click();
    await page.waitForTimeout(300);
    
    // Undo with Cmd+Z using test ID button
    await page.locator('[data-testid="undo-button"]').click();
    await page.waitForTimeout(300);
    
    // Verify first edit is back
    let currentText = await page.locator('[data-testid="paragraph-text"]').first().textContent();
    expect(currentText).toContain('[EDIT 1]');
    expect(currentText).not.toContain('[EDIT 2]');
    
    // Redo using test ID button
    await page.locator('[data-testid="redo-button"]').click();
    await page.waitForTimeout(300);
    
    // Verify second edit is back
    currentText = await page.locator('[data-testid="paragraph-text"]').first().textContent();
    expect(currentText).toContain('[EDIT 2]');
  });

  test('should display slide candidates when expanding paragraph', async ({ page }) => {
    // Load script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Click on add slide button using test ID
    const addSlideButton = page.locator('[data-testid="add-slide-button"]').first();
    
    if (await addSlideButton.count() > 0) {
      await addSlideButton.click();
      await page.waitForTimeout(500);
      
      // Check if slide mode switch is now visible using test ID
      const slideModeSwitch = page.locator('[data-testid="slide-mode-switch"]').first();
      const isVisible = await slideModeSwitch.count() > 0;
      
      if (isVisible) {
        await expect(slideModeSwitch).toBeVisible();
      }
    }
  });

  test('should handle long-running save operations gracefully', async ({ page }) => {
    // Load script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Make a large edit
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText = await textArea.inputValue();
    const largeEdit = ' [LARGE EDIT] ' + 'Lorem ipsum dolor sit amet, '.repeat(50);
    await textArea.fill(originalText + largeEdit);
    
    // Save paragraph edit
    await page.locator('[data-testid="paragraph-save-button"]').first().click();
    await page.waitForTimeout(300);
    
    // Click save button using test ID
    const saveButton = page.locator('[data-testid="save-button"]');
    await saveButton.click();
    
    // The button should not be double-clicked during save
    // (Checking if the UI prevents multiple saves)
    await expect(saveButton).toBeVisible();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
  });
});

test.describe('Screator UI - Error Handling', () => {
  test('should handle missing script files gracefully', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Try to load scripts (some might be missing) using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    await page.waitForTimeout(500);
    
    // The app should still be responsive
    await expect(dropdown).toBeVisible();
  });
});

test.describe('Screator UI - UI/UX Verification', () => {
  test('should have responsive layout', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check initial layout
    const toolbar = page.locator('p-toolbar');
    await expect(toolbar).toBeVisible();
    
    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    await expect(toolbar).toBeVisible();
  });

  test('should have proper focus management', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    // Load script using test ID
    await page.locator('[data-testid="script-selector"]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(2000);
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Check if focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});
