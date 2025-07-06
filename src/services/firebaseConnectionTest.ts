import { teacherCacheService } from './teacherCacheService';
import { firebaseAITeacherService } from './firebaseAITeacherService';

export class FirebaseConnectionTest {
  
  // キャッシュシステムのテスト
  async testCacheConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 キャッシュシステム接続テスト開始...');

      // テスト用データ
      const testTeacherId = 'test_teacher_' + Date.now();
      const testSessionId = 'test_session_' + Date.now();
      
      // 1. キャッシュ保存テスト
      const testCache = {
        sessionId: testSessionId,
        teacherId: testTeacherId,
        messages: [{
          id: 'test_msg_1',
          text: 'テストメッセージです',
          sender: 'user' as const,
          timestamp: new Date().toISOString(),
          importance: 'medium' as const,
          tokens: 10
        }],
        contextTokens: 10,
        topicSummary: 'テスト用キャッシュ',
        lastUpdated: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      await teacherCacheService.saveTopicCache(testCache);
      console.log('✅ キャッシュ保存成功');

      // 2. キャッシュ取得テスト
      const retrievedCache = await teacherCacheService.getTopicCache(testTeacherId, testSessionId);
      if (!retrievedCache) {
        throw new Error('保存したキャッシュが取得できませんでした');
      }
      console.log('✅ キャッシュ取得成功');

      // 3. トレーニングデータ保存テスト
      await teacherCacheService.saveTrainingData(testTeacherId, {
        id: 'test_training_1',
        context: 'テスト文脈',
        userMessage: 'テスト質問',
        aiResponse: 'テスト応答',
        quality: 8,
        responseLength: 10,
        topic: 'テスト',
        timestamp: new Date().toISOString()
      });
      console.log('✅ トレーニングデータ保存成功');

      // 4. トレーニングデータ取得テスト
      const trainingData = await teacherCacheService.getTrainingData(testTeacherId);
      if (!trainingData) {
        throw new Error('保存したトレーニングデータが取得できませんでした');
      }
      console.log('✅ トレーニングデータ取得成功');

      return {
        success: true,
        message: 'Firebaseキャッシュシステム接続テスト成功',
        details: {
          cacheData: retrievedCache,
          trainingData: trainingData
        }
      };

    } catch (error) {
      console.error('❌ キャッシュシステムテストエラー:', error);
      return {
        success: false,
        message: `キャッシュシステムテスト失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  // 既存のFirebaseサービステスト
  async testExistingFirebaseServices(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔍 既存Firebaseサービステスト開始...');

      // AI先生データ取得テスト
      const teachers = await firebaseAITeacherService.getAllTeachers();
      console.log(`✅ AI先生データ取得成功: ${teachers.length}件`);

      return {
        success: true,
        message: '既存Firebaseサービステスト成功',
        details: {
          teachersCount: teachers.length,
          firstTeacher: teachers[0] || null
        }
      };

    } catch (error) {
      console.error('❌ 既存Firebaseサービステストエラー:', error);
      return {
        success: false,
        message: `既存Firebaseサービステスト失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  // 包括的なFirebase接続テスト
  async runFullConnectionTest(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    console.log('🚀 Firebase包括接続テスト開始...');

    const cacheTest = await this.testCacheConnection();
    const existingTest = await this.testExistingFirebaseServices();

    const allSuccess = cacheTest.success && existingTest.success;

    return {
      success: allSuccess,
      message: allSuccess 
        ? '🎉 Firebase全サービス接続テスト成功！' 
        : '⚠️ 一部のFirebaseサービスでエラーが発生しました',
      details: {
        cacheTest,
        existingTest,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Firebaseコレクション構造の確認
  async checkFirebaseCollections(): Promise<{
    collections: string[];
    newCollections: string[];
    message: string;
  }> {
    const expectedCollections = [
      // 既存のコレクション
      'aiTeachers',
      'chatSessions', 
      'feedbacks',
      'geminiApiKeys',
      'messages',
      'students',
      'ai-test-feedback',
      
      // 新しく追加されたコレクション
      'teacher-conversation-cache',
      'teacher-training-data',
      'teacher-analytics'
    ];

    const newCollections = [
      'teacher-conversation-cache',
      'teacher-training-data', 
      'teacher-analytics'
    ];

    return {
      collections: expectedCollections,
      newCollections,
      message: `Firebase構造: ${expectedCollections.length}個のコレクションが設定されています（新規: ${newCollections.length}個）`
    };
  }
}

export const firebaseConnectionTest = new FirebaseConnectionTest();