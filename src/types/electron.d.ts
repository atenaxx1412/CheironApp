// TypeScript型定義ファイル: Electron API

interface ElectronAPI {
  platform: string;
  version: string;
  showErrorDialog: (title: string, message: string) => Promise<any>;
  showAlertDialog: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'question') => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};