const { app, screen, BrowserWindow } = require('electron');
const path = require('path');
const remote = require('@electron/remote/main');

// Headless (no visible window) only when explicit E2E_HEADLESS=1 is set.
// We no longer rely on NODE_ENV because headed Playwright runs also set NODE_ENV=test.
const IS_HEADLESS_E2E = process.env.E2E_HEADLESS === '1';

remote.initialize();

// Disable electron-reload only during headless test runs to reduce noise
if (!IS_HEADLESS_E2E) {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
            forceHardReset: true,
            hardResetMethod: 'exit'
        });
    } catch (err) {
        // Fail silently if electron-reload is not available; not critical
        // eslint-disable-next-line no-console
        console.warn('electron-reload unavailable:', err.message);
    }
}

async function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

            const win = new BrowserWindow({
                width,
                height,
                show: !IS_HEADLESS_E2E, // hide window only for headless E2E
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
        win.loadFile(path.join(__dirname, 'dist/screator-ui/browser/index.html'));
        remote.enable(win.webContents);

        // In test mode, prevent dialogs or focus-stealing attempts
            if (IS_HEADLESS_E2E) {
            win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});