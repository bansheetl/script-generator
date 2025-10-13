const { app, screen, session, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const remote = require('@electron/remote/main')

remote.initialize()

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    forceHardReset: true,
    hardResetMethod: 'exit'
});

async function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const win = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    win.loadFile(path.join(__dirname, 'dist/screator-ui/browser/index.html'));
    remote.enable(win.webContents);
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