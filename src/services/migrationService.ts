import { firebaseAITeacherService } from './firebaseAITeacherService';
import { firebaseStudentService } from './firebaseStudentService';
import { firebaseFeedbackService } from './firebaseFeedbackService';
import { geminiApiService } from './geminiApiService';

interface MigrationStatus {
  completed: boolean;
  aiTeachersCompleted: boolean;
  studentsCompleted: boolean;
  feedbacksCompleted: boolean;
  settingsCompleted: boolean;
  loginCredentialsCompleted: boolean;
  geminiApiKeysCompleted: boolean;
  completedAt?: string;
  version: string;
}

export class MigrationService {
  // マイグレーション状態をlocalStorageで管理
  private readonly MIGRATION_KEY = 'migrationStatus';

  // マイグレーション状態を取得
  private getMigrationStatus(): MigrationStatus {
    const stored = localStorage.getItem(this.MIGRATION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('マイグレーション状態の読み取りエラー:', error);
      }
    }
    
    // デフォルト状態
    return {
      completed: false,
      aiTeachersCompleted: false,
      studentsCompleted: false,
      feedbacksCompleted: false,
      settingsCompleted: false,
      loginCredentialsCompleted: false,
      geminiApiKeysCompleted: false,
      version: '1.0.0'
    };
  }

  // マイグレーション状態を保存
  private saveMigrationStatus(status: MigrationStatus): void {
    localStorage.setItem(this.MIGRATION_KEY, JSON.stringify(status));
  }

  // マイグレーションが必要かチェック
  public isMigrationNeeded(): boolean {
    const status = this.getMigrationStatus();
    return !status.completed;
  }

  // 全体マイグレーション実行
  public async runFullMigration(): Promise<void> {
    console.log('Firebase マイグレーションを開始します...');
    
    const status = this.getMigrationStatus();
    
    try {
      // AI先生データのマイグレーション
      if (!status.aiTeachersCompleted) {
        console.log('AI先生データをマイグレーション中...');
        await this.migrateAITeachers();
        status.aiTeachersCompleted = true;
        this.saveMigrationStatus(status);
        console.log('AI先生データのマイグレーション完了');
      }

      // 生徒データのマイグレーション
      if (!status.studentsCompleted) {
        console.log('生徒データをマイグレーション中...');
        await this.migrateStudents();
        status.studentsCompleted = true;
        this.saveMigrationStatus(status);
        console.log('生徒データのマイグレーション完了');
      }

      // フィードバックデータのマイグレーション
      if (!status.feedbacksCompleted) {
        console.log('フィードバックデータをマイグレーション中...');
        await this.migrateFeedbacks();
        status.feedbacksCompleted = true;
        this.saveMigrationStatus(status);
        console.log('フィードバックデータのマイグレーション完了');
      }

      // 設定データのマイグレーション
      if (!status.settingsCompleted) {
        console.log('設定データをマイグレーション中...');
        await this.migrateSettings();
        status.settingsCompleted = true;
        this.saveMigrationStatus(status);
        console.log('設定データのマイグレーション完了');
      }

      // ログイン情報のマイグレーション
      if (!status.loginCredentialsCompleted) {
        console.log('既存生徒にログイン情報を付与中...');
        await this.migrateLoginCredentials();
        status.loginCredentialsCompleted = true;
        this.saveMigrationStatus(status);
        console.log('ログイン情報の付与完了');
      }

      // Gemini APIキーの初期化
      if (!status.geminiApiKeysCompleted) {
        console.log('Gemini APIキーを初期化中...');
        await this.initializeGeminiApiKeys();
        status.geminiApiKeysCompleted = true;
        this.saveMigrationStatus(status);
        console.log('Gemini APIキーの初期化完了');
      }

      // 全マイグレーション完了
      status.completed = true;
      status.completedAt = new Date().toISOString();
      this.saveMigrationStatus(status);
      
      console.log('Firebase マイグレーションが完了しました！');
      
      // 成功通知を表示
      this.showMigrationSuccess();
      
    } catch (error) {
      console.error('マイグレーションエラー:', error);
      throw new Error(`マイグレーションに失敗しました: ${error}`);
    }
  }

  // AI先生データのマイグレーション
  private async migrateAITeachers(): Promise<void> {
    try {
      await firebaseAITeacherService.migrateFromLocalStorage();
    } catch (error) {
      console.error('AI先生マイグレーションエラー:', error);
      // このエラーは警告レベルとして処理（既存データがない場合は正常）
    }
  }

  // 生徒データのマイグレーション
  private async migrateStudents(): Promise<void> {
    try {
      await firebaseStudentService.migrateFromLocalStorage();
    } catch (error) {
      console.error('生徒データマイグレーションエラー:', error);
      // このエラーは警告レベルとして処理（既存データがない場合は正常）
    }
  }

  // フィードバックデータのマイグレーション
  private async migrateFeedbacks(): Promise<void> {
    try {
      await firebaseFeedbackService.migrateFromLocalStorage();
    } catch (error) {
      console.error('フィードバックデータマイグレーションエラー:', error);
      // このエラーは警告レベルとして処理（既存データがない場合は正常）
    }
  }

  // 設定データのマイグレーション
  private async migrateSettings(): Promise<void> {
    try {
      // 言語設定
      const language = localStorage.getItem('language');
      if (language) {
        localStorage.setItem('migratedLanguage', language);
      }

      // テーマ設定
      const theme = localStorage.getItem('theme');
      if (theme) {
        localStorage.setItem('migratedTheme', theme);
      }

      // チャット設定
      const chatSettings = localStorage.getItem('chatSettings');
      if (chatSettings) {
        localStorage.setItem('migratedChatSettings', chatSettings);
      }

      // フォント設定
      const fontSize = localStorage.getItem('fontSize');
      if (fontSize) {
        localStorage.setItem('migratedFontSize', fontSize);
      }

      console.log('設定データのマイグレーション完了');
    } catch (error) {
      console.error('設定データマイグレーションエラー:', error);
      throw error;
    }
  }

  // ログイン情報のマイグレーション
  private async migrateLoginCredentials(): Promise<void> {
    try {
      await firebaseStudentService.migrateLoginCredentials();
      console.log('ログイン情報マイグレーション完了');
    } catch (error) {
      console.error('ログイン情報マイグレーションエラー:', error);
      // このエラーは警告レベルとして処理（既存データがない場合は正常）
    }
  }

  // Gemini APIキーの初期化
  private async initializeGeminiApiKeys(): Promise<void> {
    try {
      await geminiApiService.initializeApiKeys();
      console.log('Gemini APIキー初期化完了');
    } catch (error) {
      console.error('Gemini APIキー初期化エラー:', error);
      // このエラーは警告レベルとして処理
    }
  }

  // マイグレーション成功の通知表示
  private showMigrationSuccess(): void {
    // 成功メッセージを表示（開発者向け）
    if (console && console.info) {
      console.info(`
🎉 Firebase マイグレーション完了！
====================================
✅ AI先生データ
✅ 生徒データ
✅ フィードバックデータ
✅ 設定データ
✅ ログイン情報
✅ Gemini APIキー
====================================
これでFirebaseとの連携が有効になりました。
      `);
    }
  }

  // マイグレーション状態をリセット（デバッグ用）
  public resetMigrationStatus(): void {
    localStorage.removeItem(this.MIGRATION_KEY);
    localStorage.removeItem('teacherUpdates');
    localStorage.removeItem('additionalTeachers');
    localStorage.removeItem('students');
    localStorage.removeItem('migrationCompleted');
    localStorage.removeItem('studentsMigrationCompleted');
    console.log('マイグレーション状態をリセットしました');
  }

  // マイグレーション状況を表示
  public getMigrationReport(): void {
    const status = this.getMigrationStatus();
    console.log('マイグレーション状況レポート:', {
      '全体完了': status.completed ? '✅' : '❌',
      'AI先生': status.aiTeachersCompleted ? '✅' : '❌',
      '生徒データ': status.studentsCompleted ? '✅' : '❌',
      'フィードバック': status.feedbacksCompleted ? '✅' : '❌',
      '設定データ': status.settingsCompleted ? '✅' : '❌',
      'ログイン情報': status.loginCredentialsCompleted ? '✅' : '❌',
      'Gemini APIキー': status.geminiApiKeysCompleted ? '✅' : '❌',
      '完了日時': status.completedAt || '未完了',
      'バージョン': status.version
    });
  }

  // 手動マイグレーション実行（管理者向け）
  public async runManualMigration(): Promise<string> {
    try {
      await this.runFullMigration();
      return 'マイグレーションが正常に完了しました。';
    } catch (error) {
      return `マイグレーションに失敗しました: ${error}`;
    }
  }
}

// シングルトンインスタンス
export const migrationService = new MigrationService();