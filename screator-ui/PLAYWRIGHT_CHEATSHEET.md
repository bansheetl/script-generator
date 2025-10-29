# Playwright E2E Testing - Quick Reference Cheat Sheet

## 🏃 Quick Commands

```bash
# Run tests
npm run test:e2e              # Headless (fast)
npm run test:e2e:headed       # See browser
npm run test:e2e:ui           # Interactive UI ⭐ BEST FOR DEV
npm run test:e2e:debug        # Step-through debugger

# Record tests
npm run test:e2e:record       # ⭐ Record interactions
./recordTests.sh              # Alternative

# Reports
npm run test:e2e:report       # View HTML report
```

## 🎯 Common Selectors

```typescript
// By text
page.locator('button:has-text("Save")')
page.locator('text=Save')
page.getByText('Save')

// By role
page.getByRole('button', { name: 'Save' })
page.getByRole('textbox')

// By test ID (recommended for stable tests)
page.getByTestId('save-button')
page.locator('[data-testid="save-button"]')

// CSS selectors
page.locator('button.primary')
page.locator('#save-btn')
page.locator('.container > button')

// nth element
page.locator('button').first()
page.locator('button').last()
page.locator('button').nth(1)

// Filter
page.locator('button').filter({ hasText: 'Save' })

// Within element
const form = page.locator('form')
form.locator('button')
```

## 🎬 Common Actions

```typescript
// Click
await page.locator('button').click()
await page.locator('button').dblclick()
await page.locator('button').click({ force: true })

// Type
await page.locator('input').fill('text')
await page.locator('input').type('text', { delay: 100 })
await page.locator('input').clear()

// Keyboard
await page.keyboard.press('Enter')
await page.keyboard.press('Meta+s')  // Cmd+S on Mac
await page.keyboard.press('Control+s')  // Ctrl+S on Win/Linux
await page.keyboard.type('Hello')

// Select
await page.locator('select').selectOption('value')
await page.locator('select').selectOption({ label: 'Option' })

// Check/Uncheck
await page.locator('input[type="checkbox"]').check()
await page.locator('input[type="checkbox"]').uncheck()

// Hover
await page.locator('button').hover()

// Drag and drop
await page.locator('.item').dragTo(page.locator('.target'))
```

## ✅ Common Assertions

```typescript
// Visibility
await expect(page.locator('button')).toBeVisible()
await expect(page.locator('button')).toBeHidden()

// Text
await expect(page.locator('h1')).toHaveText('Title')
await expect(page.locator('h1')).toContainText('Title')

// Value
await expect(page.locator('input')).toHaveValue('text')

// Count
await expect(page.locator('li')).toHaveCount(5)

// Attribute
await expect(page.locator('button')).toHaveAttribute('disabled')
await expect(page.locator('a')).toHaveAttribute('href', '/path')

// Class
await expect(page.locator('div')).toHaveClass('active')
await expect(page.locator('div')).toHaveClass(/active/)

// Enabled/Disabled
await expect(page.locator('button')).toBeEnabled()
await expect(page.locator('button')).toBeDisabled()

// Checked
await expect(page.locator('input')).toBeChecked()

// URL
await expect(page).toHaveURL('http://localhost:3000')
await expect(page).toHaveURL(/localhost/)

// Title
await expect(page).toHaveTitle('My App')
```

## ⏱️ Waits

```typescript
// Wait for element
await page.waitForSelector('button')
await page.locator('button').waitFor()
await page.locator('button').waitFor({ state: 'visible' })
await page.locator('button').waitFor({ state: 'hidden' })

// Wait for navigation
await page.waitForLoadState('load')
await page.waitForLoadState('domcontentloaded')
await page.waitForLoadState('networkidle')

// Wait for timeout (use sparingly!)
await page.waitForTimeout(1000)  // 1 second

// Wait for function
await page.waitForFunction(() => document.querySelector('button'))

// Wait for event
await page.waitForEvent('load')
await page.waitForEvent('dialog')
```

## 📸 Screenshots & Videos

```typescript
// Screenshot entire page
await page.screenshot({ path: 'test-results/screenshot.png' })

// Full page screenshot
await page.screenshot({ path: 'test-results/full.png', fullPage: true })

// Screenshot element
await page.locator('.element').screenshot({ path: 'element.png' })

// Videos are automatically recorded on failure (configured in playwright.config.ts)
```

## 🐛 Debugging

```typescript
// Pause test (opens inspector)
await page.pause()

// Console log
console.log(await page.locator('h1').textContent())

// Get element info
const text = await page.locator('h1').textContent()
const value = await page.locator('input').inputValue()
const count = await page.locator('li').count()
const isVisible = await page.locator('button').isVisible()

// Evaluate JavaScript
const result = await page.evaluate(() => {
  return document.querySelector('h1')?.textContent
})

// Slow down execution
test.slow()  // 3x timeout
test.setTimeout(60000)  // Custom timeout
```

## 🎭 Test Structure

```typescript
import { test, expect } from './electron-test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  })
  
  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  })
  
  test('should do something', async ({ page }) => {
    // Test code
  })
  
  test.skip('skipped test', async ({ page }) => {
    // This won't run
  })
  
  test.only('only this test', async ({ page }) => {
    // Only this test will run
  })
})
```

## 🎨 PrimeNG Components

```typescript
// Dropdown (p-select)
await page.locator('p-select').click()
await page.waitForTimeout(500)
await page.locator('p-option').first().click()

// Button
await page.locator('p-button').click()
await page.locator('button').filter({ hasText: 'Save' }).click()

// Toolbar
await expect(page.locator('p-toolbar')).toBeVisible()

// Card
await expect(page.locator('p-card')).toBeVisible()

// Input
await page.locator('input[type="text"]').fill('text')
```

## 🔑 Keyboard Shortcuts

```typescript
// Mac
await page.keyboard.press('Meta+s')      // Cmd+S
await page.keyboard.press('Meta+z')      // Cmd+Z (undo)
await page.keyboard.press('Meta+Shift+z') // Cmd+Shift+Z (redo)
await page.keyboard.press('Meta+c')      // Cmd+C (copy)
await page.keyboard.press('Meta+v')      // Cmd+V (paste)

// Windows/Linux (use 'Control' instead of 'Meta')
await page.keyboard.press('Control+s')   // Ctrl+S

// Navigation
await page.keyboard.press('Tab')
await page.keyboard.press('Shift+Tab')
await page.keyboard.press('Enter')
await page.keyboard.press('Escape')
await page.keyboard.press('ArrowDown')
```

## 📝 Electron-Specific

```typescript
import { _electron as electron } from '@playwright/test'

// Launch Electron (handled by fixtures in electron-test.ts)
const electronApp = await electron.launch({
  args: ['main.js']
})

// Get window
const page = await electronApp.firstWindow()

// Close app
await electronApp.close()
```

## 💡 Tips

1. **Use `test:e2e:ui` during development** - Interactive and easy to debug
2. **Record tests first** - Then clean up the generated code
3. **Wait for elements** - Don't assume immediate rendering
4. **Use descriptive selectors** - Test IDs are more stable than CSS classes
5. **Take screenshots** - Helpful for debugging failures
6. **Group related tests** - Use `describe` blocks
7. **Use soft assertions** - Continue testing even if one assertion fails
   ```typescript
   await expect.soft(element).toBeVisible()
   ```
8. **Run specific tests** - Use `--grep` to filter
   ```bash
   npx playwright test --grep "should save"
   ```

## 📚 Learn More

- **E2E README**: `screator-ui/e2e/README.md`
- **Quick Start**: `E2E_TESTING_GUIDE.md`
- **Playwright Docs**: https://playwright.dev/
- **Examples**: `e2e/app.spec.ts`, `e2e/advanced.spec.ts`
- **Template**: `e2e/example-template.spec.ts`

## 🎯 Common Patterns

### Load script and edit
```typescript
test('edit script', async ({ page }) => {
  await page.waitForLoadState('domcontentloaded')
  
  // Load script
  await page.locator('p-select').click()
  await page.waitForTimeout(500)
  await page.locator('p-option').first().click()
  await page.waitForTimeout(2000)
  
  // Edit
  const textarea = page.locator('textarea').first()
  const original = await textarea.inputValue()
  await textarea.fill(original + ' EDITED')
  
  // Save
  await page.keyboard.press('Meta+s')
  await page.waitForTimeout(1000)
  
  // Verify
  expect(await textarea.inputValue()).toContain('EDITED')
})
```

### Multiple assertions
```typescript
test('multiple checks', async ({ page }) => {
  const button = page.locator('button')
  
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  await expect(button).toHaveText('Save')
  await expect(button).toHaveClass(/primary/)
})
```

### Conditional logic
```typescript
test('conditional', async ({ page }) => {
  const count = await page.locator('li').count()
  
  if (count > 0) {
    await page.locator('li').first().click()
  }
})
```

---

**Pro Tip**: Start with `npm run test:e2e:ui` - it's the best way to develop and debug tests interactively! 🚀
