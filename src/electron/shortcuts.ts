import { BrowserWindow, globalShortcut } from 'electron';
import { captureScreen } from './screenshot';

export function registerShortcuts(mainWindow: BrowserWindow) {
  // Ctrl+Shift+S: Capture screenshot
  globalShortcut.register('CmdOrCtrl+Shift+S', async () => {
    try {
      const screenshot = await captureScreen();
      mainWindow.webContents.send('screenshot-captured', { imageBase64: screenshot });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      mainWindow.webContents.send('screenshot-error', { error: (error as any).message });
    }
  });

  // Ctrl+H: Show history
  globalShortcut.register('CmdOrCtrl+H', () => {
    mainWindow.webContents.send('show-history');
  });

  // Ctrl+Shift+C: Clear chat
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    mainWindow.webContents.send('clear-chat');
  });

  console.log('Shortcuts registered successfully');
}

export function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}
