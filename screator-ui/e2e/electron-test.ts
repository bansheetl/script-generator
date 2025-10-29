import { test as base, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

/**
 * Playwright fixtures for Electron testing.
 * This automatically launches and tears down the Electron app for each test.
 */
export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Set up test fixtures by copying them to the expected output location
    const testOutputDir = path.join(__dirname, '..', '..', 'output', 'test-01');
    const fixtureDir = path.join(__dirname, 'fixtures', 'test-output');
    
    // Clean up old test data
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    
    // Copy fixtures to test location
    fs.cpSync(fixtureDir, testOutputDir, { recursive: true });
    
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Wait for the app to be ready
    await electronApp.firstWindow();

    await use(electronApp);

    // Clean up
    await electronApp.close();
    
    // Optionally clean up test data after test
    // Uncomment if you want to clean up after each test
    // if (fs.existsSync(testOutputDir)) {
    //   fs.rmSync(testOutputDir, { recursive: true, force: true });
    // }
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await use(page);
  },
});

export { expect };
