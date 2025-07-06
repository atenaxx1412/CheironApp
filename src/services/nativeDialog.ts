// Electron native dialog service
export interface DialogOptions {
  type?: 'info' | 'error' | 'warning' | 'question';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

export interface DialogResult {
  response: number;
  checkboxChecked?: boolean;
}

class NativeDialogService {
  // Check if we're running in Electron
  private isElectron(): boolean {
    return !!(window as any).electron?.ipcRenderer || !!(window as any).electronAPI;
  }

  // Show native dialog using Electron IPC
  async showDialog(options: DialogOptions): Promise<DialogResult> {
    if (this.isElectron()) {
      try {
        // Try new API first
        if ((window as any).electron?.ipcRenderer) {
          const result = await (window as any).electron.ipcRenderer.invoke('show-dialog', options);
          return result;
        }
        // Fallback to electronAPI
        else if ((window as any).electronAPI?.showDialog) {
          const result = await (window as any).electronAPI.showDialog(options);
          return result;
        }
        // If neither works, fall back
        else {
          return this.showFallbackDialog(options);
        }
      } catch (error) {
        console.error('Native dialog error:', error);
        // Fallback to browser alert
        return this.showFallbackDialog(options);
      }
    } else {
      // Fallback for web/development
      return this.showFallbackDialog(options);
    }
  }

  // Fallback dialog using browser APIs
  private showFallbackDialog(options: DialogOptions): DialogResult {
    const message = options.detail ? `${options.message}\n\n${options.detail}` : options.message;
    
    if (options.type === 'question' && options.buttons) {
      // eslint-disable-next-line no-restricted-globals
      const confirmed = confirm(message);
      return { response: confirmed ? 0 : 1 };
    } else {
      // eslint-disable-next-line no-restricted-globals
      alert(message);
      return { response: 0 };
    }
  }

  // Convenience methods
  async showError(title: string, message: string, detail?: string): Promise<void> {
    await this.showDialog({
      type: 'error',
      title,
      message,
      detail,
      buttons: ['OK']
    });
  }

  async showWarning(title: string, message: string, detail?: string): Promise<void> {
    await this.showDialog({
      type: 'warning',
      title,
      message,
      detail,
      buttons: ['OK']
    });
  }

  async showInfo(title: string, message: string, detail?: string): Promise<void> {
    await this.showDialog({
      type: 'info',
      title,
      message,
      detail,
      buttons: ['OK']
    });
  }

  async showConfirm(title: string, message: string, detail?: string): Promise<boolean> {
    const result = await this.showDialog({
      type: 'question',
      title,
      message,
      detail,
      buttons: ['はい', 'いいえ'],
      defaultId: 0,
      cancelId: 1
    });
    return result.response === 0;
  }

  async showYesNoCancel(title: string, message: string, detail?: string): Promise<'yes' | 'no' | 'cancel'> {
    const result = await this.showDialog({
      type: 'question',
      title,
      message,
      detail,
      buttons: ['はい', 'いいえ', 'キャンセル'],
      defaultId: 0,
      cancelId: 2
    });
    
    switch (result.response) {
      case 0: return 'yes';
      case 1: return 'no';
      case 2: return 'cancel';
      default: return 'cancel';
    }
  }
}

export const nativeDialog = new NativeDialogService();