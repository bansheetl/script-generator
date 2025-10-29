import { _electron as electron } from '@playwright/test';
import * as path from 'path';

/**
 * Standalone script to launch Electron app for manual test recording.
 * Run with: npx ts-node e2e/record-helper.ts
 * 
 * This will:
 * 1. Launch your Electron app
 * 2. Open Playwright Inspector
 * 3. Allow you to interact with the app while recording actions
 * 4. Generate test code that you can copy into your test files
 */
async function record() {
  console.log('🎬 Starting Electron app for test recording...\n');
  console.log('Instructions:');
  console.log('1. The Playwright Inspector will open');
  console.log('2. Interact with your Electron app normally');
  console.log('3. Your actions will be recorded as code');
  console.log('4. Copy the generated code into your test files');
  console.log('5. Press Ctrl+C to stop recording\n');

  // Launch Electron
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '..', 'main.js')],
    env: {
      ...process.env,
      PWDEBUG: '1', // Enable Playwright Inspector
    },
  });

  // Get the first window
  const window = await electronApp.firstWindow();
  
  console.log('✅ App launched! Playwright Inspector should be visible.');
  console.log('   Interact with the app to record your test...\n');

  // Wait for the window to close
  await window.waitForEvent('close');
  
  await electronApp.close();
  console.log('\n✅ Recording session ended.');
}

// Run the recording session
record().catch(console.error);
