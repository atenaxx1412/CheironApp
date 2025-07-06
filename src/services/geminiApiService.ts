import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiApiKey {
  id: string;
  keyName: string;
  apiKey: string;
  isActive: boolean;
  requestCount: number;
  dailyRequestCount: number;
  lastUsed: string;
  lastResetDate: string; // 日次カウントリセット日
  status: 'active' | 'quota_exceeded' | 'error' | 'disabled';
  priority: number; // 使用優先順位 (1が最優先)
  maxDailyRequests: number; // 1日の最大リクエスト数
  createdAt: string;
  updatedAt: string;
}

export class GeminiApiService {
  private readonly GEMINI_KEYS_COLLECTION = 'geminiApiKeys';
  private currentGenAI: GoogleGenerativeAI | null = null;
  private currentKeyId: string | null = null;

  // 初期APIキーをFirebaseに保存
  async initializeApiKeys(): Promise<void> {
    try {
      console.log('Gemini APIキーの初期化を開始...');
      
      // 既存キーをチェック
      const existingKeys = await this.getAllApiKeys();
      
      if (existingKeys.length === 0) {
        // 5つのAPIキーを初期データとして保存
        const apiKeys = [
          'AIzaSyBzSBVlaQG09bRYbiGy-XvqhgkwmIy8X8A',
          'AIzaSyD7T0T9iXv0y619ENAqNAiTBK1IR0BW3HY', 
          'AIzaSyC4OIJ34ieJoMxhmYJCxQ9Nq2B1r6qfr9c',
          'AIzaSyAOEejlLej6JN7thByFF-sR3P8NDg7DhBk',
          'AIzaSyAk8yVWQU3YbENt_JsFsKFEqt4taxOmrjo'
        ];

        console.log('5つのGemini APIキーをFirebaseに保存中...');
        
        for (let i = 0; i < apiKeys.length; i++) {
          const keyData: Omit<GeminiApiKey, 'id'> = {
            keyName: `GEMINI_API_KEY_${i + 1}`,
            apiKey: apiKeys[i],
            isActive: i === 0, // 最初のキーのみアクティブ
            requestCount: 0,
            dailyRequestCount: 0,
            lastUsed: '',
            lastResetDate: new Date().toISOString().split('T')[0],
            status: 'active',
            priority: i + 1,
            maxDailyRequests: 1500, // Gemini無料版の1日制限
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          const docRef = await addDoc(collection(db, this.GEMINI_KEYS_COLLECTION), keyData);
          console.log(`${keyData.keyName} を保存しました (ID: ${docRef.id})`);
        }
        
        console.log('✅ Gemini APIキー5個をFirebaseに保存完了');
      } else {
        console.log(`Gemini APIキーは既に存在します (${existingKeys.length}個)`);
      }
    } catch (error) {
      console.error('Gemini APIキー初期化エラー:', error);
      // エラーが発生してもアプリは継続動作
      console.log('APIキー初期化に失敗しましたが、アプリは継続します');
    }
  }

  // 全APIキーを取得
  async getAllApiKeys(): Promise<GeminiApiKey[]> {
    try {
      const keysQuery = query(
        collection(db, this.GEMINI_KEYS_COLLECTION),
        orderBy('priority', 'asc')
      );
      
      const snapshot = await getDocs(keysQuery);
      const keys: GeminiApiKey[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GeminiApiKey));
      
      return keys;
    } catch (error) {
      console.error('APIキー取得エラー:', error);
      throw error;
    }
  }

  // アクティブなAPIキーを取得
  async getActiveApiKey(): Promise<GeminiApiKey | null> {
    try {
      const keys = await this.getAllApiKeys();
      
      // 日次カウントをリセット（日付が変わった場合）
      await this.resetDailyCountsIfNeeded(keys);
      
      // 利用可能なキーを優先順位で取得
      const availableKey = keys.find(key => 
        key.status === 'active' && 
        key.dailyRequestCount < key.maxDailyRequests
      );
      
      return availableKey || null;
    } catch (error) {
      console.error('アクティブAPIキー取得エラー:', error);
      throw error;
    }
  }

  // 日次カウントリセット
  private async resetDailyCountsIfNeeded(keys: GeminiApiKey[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    for (const key of keys) {
      if (key.lastResetDate !== today) {
        await updateDoc(doc(db, this.GEMINI_KEYS_COLLECTION, key.id), {
          dailyRequestCount: 0,
          lastResetDate: today,
          status: key.status === 'quota_exceeded' ? 'active' : key.status,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  // 次のAPIキーに切り替え
  async switchToNextApiKey(currentKeyId: string, reason: string): Promise<GeminiApiKey | null> {
    try {
      // 現在のキーを無効化
      await updateDoc(doc(db, this.GEMINI_KEYS_COLLECTION, currentKeyId), {
        status: reason === 'quota_exceeded' ? 'quota_exceeded' : 'error',
        updatedAt: new Date().toISOString()
      });
      
      console.log(`APIキー切り替え: ${currentKeyId} → ${reason}`);
      
      // 次のアクティブキーを取得
      const nextKey = await this.getActiveApiKey();
      
      if (nextKey) {
        this.currentKeyId = nextKey.id;
        this.currentGenAI = new GoogleGenerativeAI(nextKey.apiKey);
        console.log(`新しいAPIキーに切り替え: ${nextKey.keyName}`);
      } else {
        console.error('利用可能なAPIキーがありません');
      }
      
      return nextKey;
    } catch (error) {
      console.error('APIキー切り替えエラー:', error);
      throw error;
    }
  }

  // Gemini APIを呼び出し
  async generateResponse(prompt: string, teacherPersonality: string): Promise<string> {
    try {
      // アクティブキーを取得または初期化
      if (!this.currentGenAI || !this.currentKeyId) {
        const activeKey = await this.getActiveApiKey();
        if (!activeKey) {
          throw new Error('利用可能なAPIキーがありません');
        }
        
        this.currentKeyId = activeKey.id;
        this.currentGenAI = new GoogleGenerativeAI(activeKey.apiKey);
      }
      
      // AIモデルを取得
      const model = this.currentGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // 先生の性格を含むシステムプロンプト
      const systemPrompt = `
あなたは高校の相談担当教師です。以下の性格特性を持っています：

${teacherPersonality}

生徒からの相談に対して、この性格に基づいて親身になって回答してください。
- 丁寧で温かい口調で話す
- 生徒の気持ちに寄り添う
- 具体的で実践的なアドバイスを提供する
- 必要に応じて励ましの言葉をかける

生徒の相談: ${prompt}
`;

      // API呼び出し
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      
      // 使用回数を更新
      await this.updateApiKeyUsage(this.currentKeyId);
      
      return text;
      
    } catch (error: any) {
      console.error('Gemini API呼び出しエラー:', error);
      
      // クォータ制限エラーの場合は次のキーに切り替え
      if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('クォータ制限に達しました。次のAPIキーに切り替えます。');
        
        if (this.currentKeyId) {
          const nextKey = await this.switchToNextApiKey(this.currentKeyId, 'quota_exceeded');
          if (nextKey) {
            // 再帰的に再実行
            return await this.generateResponse(prompt, teacherPersonality);
          }
        }
      }
      
      throw new Error(`AI回答生成に失敗しました: ${error.message}`);
    }
  }

  // APIキー使用回数を更新
  private async updateApiKeyUsage(keyId: string): Promise<void> {
    try {
      const keyRef = doc(db, this.GEMINI_KEYS_COLLECTION, keyId);
      const keyDoc = await getDoc(keyRef);
      
      if (keyDoc.exists()) {
        const keyData = keyDoc.data() as GeminiApiKey;
        
        await updateDoc(keyRef, {
          requestCount: keyData.requestCount + 1,
          dailyRequestCount: keyData.dailyRequestCount + 1,
          lastUsed: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('APIキー使用回数更新エラー:', error);
    }
  }

  // APIキーの状態を手動でリセット
  async resetApiKeyStatus(keyId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.GEMINI_KEYS_COLLECTION, keyId), {
        status: 'active',
        dailyRequestCount: 0,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`APIキーステータスをリセット: ${keyId}`);
    } catch (error) {
      console.error('APIキーステータスリセットエラー:', error);
      throw error;
    }
  }

  // 使用状況統計を取得
  async getUsageStats(): Promise<{totalRequests: number, activeKeys: number, todayRequests: number}> {
    try {
      const keys = await this.getAllApiKeys();
      
      const totalRequests = keys.reduce((sum, key) => sum + key.requestCount, 0);
      const activeKeys = keys.filter(key => key.status === 'active').length;
      const todayRequests = keys.reduce((sum, key) => sum + key.dailyRequestCount, 0);
      
      return {
        totalRequests,
        activeKeys,
        todayRequests
      };
    } catch (error) {
      console.error('使用状況取得エラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const geminiApiService = new GeminiApiService();