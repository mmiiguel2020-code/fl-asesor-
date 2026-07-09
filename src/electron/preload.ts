import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Screenshot API
  captureScreen: async (displayId?: number) => {
    return ipcRenderer.invoke('capture-screenshot', { displayId });
  },

  // Analysis API
  analyzeScreenshot: async (imageBase64: string, mimeType: string, customNotes?: string) => {
    return ipcRenderer.invoke('analyze-screenshot', {
      imageBase64,
      mimeType,
      customNotes,
    });
  },

  // Chat API
  chat: async (message: string, history?: Array<{ role: string; content: string }>) => {
    return ipcRenderer.invoke('chat', { message, history });
  },

  // Database APIs
  saveAnalysis: async (data: any) => {
    return ipcRenderer.invoke('save-analysis', data);
  },

  getAnalyses: async (limit: number = 50) => {
    return ipcRenderer.invoke('get-analyses', { limit });
  },

  deleteAnalysis: async (id: number) => {
    return ipcRenderer.invoke('delete-analysis', { id });
  },

  clearAnalyses: async () => {
    return ipcRenderer.invoke('clear-analyses');
  },

  // Theme API
  getTheme: async () => {
    return ipcRenderer.invoke('get-theme');
  },

  setTheme: async (theme: 'light' | 'dark' | 'system') => {
    return ipcRenderer.invoke('set-theme', { theme });
  },

  // System info
  getSystemInfo: async () => {
    return ipcRenderer.invoke('get-system-info');
  },

  // Notifications
  showNotification: (title: string, options?: { body?: string; silent?: boolean }) => {
    return ipcRenderer.invoke('show-notification', { title, options });
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
