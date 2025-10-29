# E2E Tests for Screator UI

This directory contains end-to-end tests for the Screator UI Electron application using Playwright.

## 📁 Structure

```
e2e/
├── fixtures/                  # Test data fixtures
│   ├── test-input/           # Sample input files (copied from input/01)
│   └── test-output/          # Sample output files (copied from output/01)
├── app.spec.ts               # Main test suite
├── electron-test.ts          # Electron test fixtures and utilities
└── record-helper.ts          # Script for recording new tests
```

## 🚀 Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with visible browser (headed mode)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode with Playwright Inspector
```bash
npm run test:e2e:debug
```

### Run tests with Playwright UI mode (interactive)
```bash
npm run test:e2e:ui
```

### View test report
```bash
npm run test:e2e:report
```

## 🎬 Recording New Tests

Playwright provides excellent tools for recording tests by interacting with your application.

### Method 1: Using the record script (Recommended)
```bash
npm run test:e2e:record
```

This will:
1. Build the Angular application
2. Launch the Electron app with Playwright Inspector
3. Record your interactions as test code
4. Generate code you can copy into your test files

### Method 2: Using Playwright Codegen
```bash
npx playwright codegen
```

### Method 3: Using the helper script
```bash
./recordTests.sh
```

### Recording Tips

1. **Start with a clean state**: The recorder starts with a fresh app instance
2. **Perform actions slowly**: Give the app time to respond between actions
3. **Use descriptive locators**: Playwright generates locators automatically, but you can refine them
4. **Add assertions**: While recording, think about what you want to verify
5. **Review and refactor**: The generated code is a starting point - clean it up for readability

## 📝 Test Structure

### Test Suites

1. **Application Launch**: Tests that the app starts correctly
2. **Script Loading**: Tests loading scripts from the dropdown
3. **Script Editing**: Tests editing paragraph text and slide selection
4. **Save Functionality**: Tests saving edited scripts
5. **Keyboard Shortcuts**: Tests keyboard shortcuts like Cmd+S

### Test Fixtures

The `electron-test.ts` file provides custom Playwright fixtures:

- `electronApp`: Automatically launches and tears down the Electron app
- `page`: Provides the main window of the Electron app

These fixtures:
- Copy test data to the expected location before each test
- Launch the Electron application
- Clean up after tests complete

## 🎯 Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from './electron-test';

test('should do something', async ({ page }) => {
  // Wait for app to load
  await page.waitForLoadState('domcontentloaded');
  
  // Interact with the app
  const button = page.locator('button:has-text("Click me")');
  await button.click();
  
  // Assert expected behavior
  await expect(button).toHaveText('Clicked!');
  
  // Take screenshot for visual verification
  await page.screenshot({ path: 'test-results/my-test.png' });
});
```

### Common Patterns

#### Waiting for elements
```typescript
await page.waitForSelector('app-script-editor');
await page.locator('button').waitFor({ state: 'visible' });
```

#### Interacting with Angular components
```typescript
// PrimeNG dropdown
const dropdown = page.locator('p-select');
await dropdown.click();
await page.locator('p-option').first().click();

// Text area
const textArea = page.locator('textarea').first();
await textArea.fill('New text');
```

#### Taking screenshots
```typescript
// Single screenshot
await page.screenshot({ path: 'test-results/screenshot.png' });

// Full page screenshot
await page.screenshot({ path: 'test-results/full.png', fullPage: true });
```

## 🔧 Configuration

The test configuration is in `playwright.config.ts`:

- **Test directory**: `./e2e`
- **Workers**: 1 (tests run sequentially to avoid conflicts)
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Captured on first retry

## 📊 Test Results

Test results are stored in:
- `test-results/`: Screenshots, videos, and traces
- `playwright-report/`: HTML report (view with `npm run test:e2e:report`)

## 🐛 Debugging Tests

### 1. Use headed mode
See what's happening in real-time:
```bash
npm run test:e2e:headed
```

### 2. Use debug mode
Step through tests with Playwright Inspector:
```bash
npm run test:e2e:debug
```

### 3. Add pauses in your test
```typescript
await page.pause(); // Pauses execution and opens inspector
```

### 4. Use console.log
```typescript
const text = await page.locator('h1').textContent();
console.log('Heading text:', text);
```

### 5. Take screenshots at key points
```typescript
await page.screenshot({ path: 'test-results/debug-step-1.png' });
```

## 🎓 Best Practices

1. **Use meaningful test names**: Describe what the test verifies
2. **Keep tests independent**: Each test should work on its own
3. **Wait for state changes**: Use `waitForLoadState()` and `waitForSelector()`
4. **Use Page Object Model**: For complex tests, consider extracting reusable page objects
5. **Clean up after tests**: The fixtures handle cleanup, but be aware of side effects
6. **Use soft assertions for multiple checks**: Continue testing even if one assertion fails
7. **Take screenshots**: Especially helpful for debugging CI failures

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Electron API](https://playwright.dev/docs/api/class-electron)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)

## 🤝 Contributing

When adding new tests:

1. Run existing tests to ensure they pass
2. Record new interactions using `npm run test:e2e:record`
3. Refactor the generated code for clarity
4. Add meaningful assertions
5. Group related tests in `describe` blocks
6. Add comments for complex interactions
7. Ensure tests clean up after themselves

## 🚨 Troubleshooting

### Tests fail with "Timeout" errors
- Increase timeout: `await page.waitForSelector('element', { timeout: 10000 })`
- Check if the app needs more time to load
- Verify the selector is correct

### Electron app doesn't launch
- Ensure the Angular app is built: `npm run build`
- Check that `main.js` exists and is correct
- Verify Electron is installed: `npm list electron`

### Fixtures not copied correctly
- Check the fixture paths in `electron-test.ts`
- Ensure the source fixtures exist in `e2e/fixtures/`
- Verify file permissions

### PrimeNG components not found
- Wait for Angular to initialize: `await page.waitForTimeout(1000)`
- Use more specific selectors
- Check component rendering in headed mode
