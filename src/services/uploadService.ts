// SSH Upload Service for uploading images to the remote server
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class UploadService {
  private baseUrl: string;
  private sshConfig: {
    host: string;
    user: string;
    password: string;
    remotePath: string;
    port: number;
  };

  constructor() {
    this.baseUrl = process.env.REACT_APP_UPLOAD_BASE_URL || 'https://i25001aoki.main.jp/Cheiron/AI_imgs/';
    this.sshConfig = {
      host: process.env.REACT_APP_SSH_HOST || 'i25001aoki.main.jp',
      user: process.env.REACT_APP_SSH_USER || '',
      password: process.env.REACT_APP_SSH_PASSWORD || '',
      remotePath: process.env.REACT_APP_SSH_REMOTE_PATH || '/Cheiron/AI_imgs/',
      port: parseInt(process.env.REACT_APP_SSH_PORT || '22')
    };
  }

  /**
   * Upload image file to remote server via SSH
   * Note: This is a placeholder implementation since SSH upload from browser
   * requires a backend service. In a real implementation, this would:
   * 1. Send the file to a backend API endpoint
   * 2. The backend would handle SSH upload using libraries like ssh2
   * 3. Return the final URL of the uploaded file
   */
  async uploadImage(file: File): Promise<UploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: '画像ファイルのみアップロード可能です'
        };
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return {
          success: false,
          error: 'ファイルサイズは5MB以下にしてください'
        };
      }

      // For development: convert to base64 data URL for immediate display
      // In production, this would make an API call to a backend service
      // that handles the actual SSH upload
      
      console.log('Converting image to base64 for development...');

      // Convert file to base64 data URL
      const base64Url = await this.fileToBase64(file);

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Image converted successfully');

      return {
        success: true,
        url: base64Url
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'アップロードに失敗しました'
      };
    }
  }

  /**
   * Convert file to base64 data URL for development
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate SSH configuration
   */
  validateConfig(): boolean {
    return !!(
      this.sshConfig.host &&
      this.sshConfig.user &&
      this.sshConfig.password &&
      this.sshConfig.remotePath
    );
  }

  /**
   * Get SSH configuration status for debugging
   */
  getConfigStatus() {
    return {
      hasHost: !!this.sshConfig.host,
      hasUser: !!this.sshConfig.user,
      hasPassword: !!this.sshConfig.password,
      hasRemotePath: !!this.sshConfig.remotePath,
      baseUrl: this.baseUrl
    };
  }
}

export const uploadService = new UploadService();