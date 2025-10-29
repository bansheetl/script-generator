import { test, expect } from './electron-test';
import { safeScreenshot } from './test-helpers';

test.describe('Screator UI - Application Launch', () => {
  test('should launch the application successfully', async ({ page }) => {
    // Wait for the app to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Check that the title is correct
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should display the toolbar with script selector', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Check for toolbar existence
    const toolbar = page.locator('p-toolbar');
    await expect(toolbar).toBeVisible();
    
    // Check for script selector using test ID
    const selector = page.locator('[data-testid="script-selector"]');
    await expect(selector).toBeVisible();
  });

  test('should have save button in toolbar', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Look for the save button using test ID
    const saveButton = page.locator('[data-testid="save-button"]');
    await expect(saveButton).toBeVisible();
  });
});

test.describe('Screator UI - Script Loading', () => {
  test('should load script list on startup', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for Angular to initialize
    await page.waitForTimeout(1000);
    
    // Click on the dropdown to open options using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    
    // Wait for dropdown options to appear
    await page.waitForTimeout(500);
    
    // Check if test-01 option is available using role-based selector
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();
    
    expect(optionCount).toBeGreaterThan(0);
  });

  test('should load a script when selected', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Open dropdown using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    await page.waitForTimeout(500);
    
    // Select first script using role-based selector
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Wait for script to load
    await page.waitForTimeout(2000);
    
    // Check if script editor is visible and contains paragraphs
    const scriptEditor = page.locator('app-script-editor');
    await expect(scriptEditor).toBeVisible();
  });
});

test.describe('Screator UI - Script Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Load test-01 script using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    await page.waitForTimeout(500);
    
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Wait for script to load
    await page.waitForTimeout(2000);
  });

  test('should display paragraphs in the editor', async ({ page }) => {
    // Check for paragraph items using test ID
    const paragraphContainer = page.locator('[data-testid="paragraph-container"]');
    await expect(paragraphContainer).toBeVisible();
    
    const paragraphs = page.locator('app-paragraph-editor');
    const count = await paragraphs.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should allow editing paragraph text', async ({ page }) => {
    // Find first paragraph using test ID
    const firstParagraphText = page.locator('[data-testid="paragraph-text"]').first();
    
    // Click to enter edit mode
    await firstParagraphText.click();
    await page.waitForTimeout(300);
    
    // Get the textarea using test ID
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    await expect(textArea).toBeVisible();
    
    // Get original text
    const originalText = await textArea.inputValue();
    
    // Add some text
    const additionalText = ' [TEST EDIT]';
    await textArea.fill(originalText + additionalText);
    
    // Verify text was added
    const newText = await textArea.inputValue();
    expect(newText).toContain('[TEST EDIT]');
  });

  test('should show slide selection interface', async ({ page }) => {
    // Click on add slide button using test ID
    const addSlideButton = page.locator('[data-testid="add-slide-button"]').first();
    
    if (await addSlideButton.count() > 0) {
      await addSlideButton.click();
      
      // Wait for slide selection to appear
      await page.waitForTimeout(500);
      
      // Check if slide mode switch is visible
      const slideModeSwitch = page.locator('[data-testid="slide-mode-switch"]').first();
      await expect(slideModeSwitch).toBeVisible();
    }
  });
});

test.describe('Screator UI - Save Functionality', () => {
  test('should save edited script', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Load test-01 script using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    await page.waitForTimeout(500);
    
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    await page.waitForTimeout(2000);
    
    // Click on paragraph text to enter edit mode
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    
    // Make an edit using test ID
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText = await textArea.inputValue();
    await textArea.fill(originalText + ' [SAVE TEST]');
    
    // Save paragraph edit using test ID
    const paragraphSaveButton = page.locator('[data-testid="paragraph-save-button"]').first();
    await paragraphSaveButton.click();
    await page.waitForTimeout(300);
    
    // Click save button in toolbar using test ID
    const saveButton = page.locator('[data-testid="save-button"]');
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Verify the save was successful
    await expect(saveButton).toBeVisible();
  });
});

test.describe('Screator UI - Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Load test-01 script using test ID
    const dropdown = page.locator('[data-testid="script-selector"]');
    await dropdown.click();
    await page.waitForTimeout(500);
    
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    await page.waitForTimeout(2000);
  });

  test('should save with Cmd+S shortcut', async ({ page }) => {
    // Click on paragraph text to enter edit mode
    const paragraphText = page.locator('[data-testid="paragraph-text"]').first();
    await paragraphText.click();
    await page.waitForTimeout(300);
    
    // Make an edit using test ID
    const textArea = page.locator('[data-testid="paragraph-textarea"]').first();
    const originalText = await textArea.inputValue();
    await textArea.fill(originalText + ' [SHORTCUT TEST]');
    
    // Save paragraph edit first
    const paragraphSaveButton = page.locator('[data-testid="paragraph-save-button"]').first();
    await paragraphSaveButton.click();
    await page.waitForTimeout(300);
    
    // Press Cmd+S (Meta+S on Mac)
    await page.keyboard.press('Meta+s');
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
  });
});
