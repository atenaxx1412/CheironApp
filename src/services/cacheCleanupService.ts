import { teacherCacheService } from './teacherCacheService';

class CacheCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15分ごと
  private readonly CLEANUP_ON_START_DELAY = 5 * 1000; // 起動5秒後

  // 自動クリーンアップを開始
  startAutoCleanup(): void {
    if (this.cleanupInterval) {
      console.log('自動クリーンアップは既に実行中です');
      return;
    }

    // 起動直後にクリーンアップを実行
    setTimeout(() => {
      this.runCleanup();
    }, this.CLEANUP_ON_START_DELAY);

    // 定期的なクリーンアップを設定
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL);

    console.log('キャッシュ自動クリーンアップを開始しました（15分間隔）');
  }

  // 自動クリーンアップを停止
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('キャッシュ自動クリーンアップを停止しました');
    }
  }

  // 手動でクリーンアップを実行
  async runCleanup(): Promise<void> {
    try {
      console.log('期限切れキャッシュのクリーンアップを開始...');
      const startTime = Date.now();
      
      await teacherCacheService.cleanExpiredCaches();
      
      const duration = Date.now() - startTime;
      console.log(`キャッシュクリーンアップ完了 (${duration}ms)`);
    } catch (error) {
      console.error('キャッシュクリーンアップエラー:', error);
    }
  }

  // アプリ終了時のクリーンアップ
  async shutdown(): Promise<void> {
    this.stopAutoCleanup();
    await this.runCleanup();
    console.log('キャッシュサービスをシャットダウンしました');
  }

  // キャッシュ統計を取得
  async getCacheStats(): Promise<{
    totalCaches: number;
    expiredCaches: number;
    activeCaches: number;
    oldestCache?: string;
    newestCache?: string;
  }> {
    try {
      // この機能は将来的にteacherCacheServiceに追加予定
      return {
        totalCaches: 0,
        expiredCaches: 0,
        activeCaches: 0
      };
    } catch (error) {
      console.error('キャッシュ統計取得エラー:', error);
      return {
        totalCaches: 0,
        expiredCaches: 0,
        activeCaches: 0
      };
    }
  }
}

export const cacheCleanupService = new CacheCleanupService();

// アプリ起動時に自動クリーンアップを開始
if (typeof window !== 'undefined') {
  // ブラウザ環境でのみ実行
  window.addEventListener('load', () => {
    cacheCleanupService.startAutoCleanup();
  });

  // アプリ終了時にクリーンアップ
  window.addEventListener('beforeunload', () => {
    cacheCleanupService.shutdown();
  });
}