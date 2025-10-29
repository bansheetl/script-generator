# E2E Testing Quick Start Guide

This guide will help you get started with the Playwright E2E tests for Screator UI.

## 🎯 Quick Setup (One-time)

```bash
cd screator-ui
npm install
npx playwright install
```

## ▶️ Running Tests

### Run all tests (headless mode)
```bash
cd screator-ui
npm run test:e2e
```

### Run with visible browser (see what's happening)
```bash
npm run test:e2e:headed
```

### Open interactive UI mode (best for development)
```bash
npm run test:e2e:ui
```

## 🎬 Recording New Tests

### Method 1: Quick record (recommended)
```bash
cd screator-ui
npm run test:e2e:record
```

This will:
1. Build your app
2. Open the Electron app with Playwright Inspector
3. Record your interactions as you use the app
4. Generate test code that you can copy

### Method 2: Using the bash script
```bash
cd screator-ui
./recordTests.sh
```

### How to record:
1. Start recording with one of the commands above
2. The app will open with Playwright Inspector on the side
3. Click the **Record** button in the inspector
4. Interact with your app normally (click buttons, type text, etc.)
5. The inspector shows the generated test code in real-time
6. Copy the code and paste it into your test file
7. Clean up and organize the generated code

## 🐛 Debugging Tests

### Step through tests with inspector
```bash
npm run test:e2e:debug
```

### Add a pause in your test code
```typescript
await page.pause(); // Opens inspector at this point
```

## 📊 View Test Reports

After running tests:
```bash
npm run test:e2e:report
```

This opens an HTML report showing:
- Which tests passed/failed
- Screenshots and videos of failures
- Detailed traces for debugging

## 📝 Test Files Location

- **Tests**: `screator-ui/e2e/*.spec.ts`
- **Fixtures**: `screator-ui/e2e/fixtures/`
- **Configuration**: `screator-ui/playwright.config.ts`
- **Results**: `screator-ui/test-results/` (gitignored)
- **Reports**: `screator-ui/playwright-report/` (gitignored)

## 🎓 Writing Your First Test

1. **Record a test** (easiest way):
   ```bash
   npm run test:e2e:record
   ```

2. **Or write manually**:
   ```typescript
   import { test, expect } from './electron-test';

   test('my new test', async ({ page }) => {
     // Your test code here
     await page.locator('button').click();
     await expect(page.locator('h1')).toHaveText('Expected Text');
   });
   ```

3. **Save to**: `screator-ui/e2e/my-test.spec.ts`

4. **Run it**:
   ```bash
   npm run test:e2e
   ```

## 💡 Tips

1. **Use headed mode during development**: See what's happening
   ```bash
   npm run test:e2e:headed
   ```

2. **Use UI mode for debugging**: Interactive and easy to debug
   ```bash
   npm run test:e2e:ui
   ```

3. **Take screenshots**: Helpful for debugging
   ```typescript
   await page.screenshot({ path: 'test-results/my-step.png' });
   ```

4. **Wait for elements**: Don't rush
   ```typescript
   await page.waitForSelector('my-element');
   ```

5. **Use descriptive test names**: Make failures easy to understand

## 📚 Documentation

- Full E2E docs: `screator-ui/e2e/README.md`
- Playwright docs: https://playwright.dev/
- Electron testing: https://playwright.dev/docs/api/class-electron

## 🆘 Troubleshooting

**Tests timeout?**
- Try headed mode to see what's happening
- Add more wait time: `await page.waitForTimeout(2000)`

**App doesn't launch?**
- Run `npm run build` first
- Check that `main.js` exists

**Can't find elements?**
- Use headed mode to inspect
- Check selector syntax
- Wait for element: `await page.waitForSelector('selector')`

**Need help?**
- Check `screator-ui/e2e/README.md` for detailed docs
- Look at existing tests in `e2e/*.spec.ts` for examples
- Use `npm run test:e2e:ui` for interactive debugging
