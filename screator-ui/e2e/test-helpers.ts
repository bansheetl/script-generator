import { Page } from '@playwright/test';

/**
 * Helper utilities for Playwright tests
 */

/**
 * Safely take a screenshot, catching any errors if the page is closed
 */
export async function safeScreenshot(page: Page, options: { path: string; fullPage?: boolean }): Promise<void> {
  try {
    await page.screenshot(options);
  } catch (error) {
    console.warn(`Screenshot failed for ${options.path}:`, error instanceof Error ? error.message : error);
  }
}

/**
 * Wait for page to be fully stable before proceeding
 */
export async function waitForStable(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (error) {
    // Timeout is acceptable, continue anyway
    console.warn('Page stability wait timed out, continuing...');
  }
}

/**
 * Check if page is still open before performing actions
 */
export async function isPageOpen(page: Page): Promise<boolean> {
  try {
    await page.evaluate(() => true);
    return true;
  } catch {
    return false;
  }
}
