import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TopicCache {
  sessionId: string;
  teacherId: string;
  messages: CachedMessage[];
  contextTokens: number;
  topicSummary: string;
  lastUpdated: string;
  cacheExpiry: string;
}

export interface CachedMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  importance: 'high' | 'medium' | 'low';
  tokens: number;
}

export interface TeacherTrainingData {
  teacherId: string;
  conversations: TrainingConversation[];
  responsePatterns: ResponsePattern[];
  lastTrainingUpdate: string;
  totalConversations: number;
  averageQuality: number;
}

export interface TrainingConversation {
  id: string;
  context: string;
  userMessage: string;
  aiResponse: string;
  quality: number; // 1-10
  responseLength: number;
  topic: string;
  timestamp: string;
}

export interface ResponsePattern {
  pattern: string;
  frequency: number;
  successRate: number;
  avgResponseLength: number;
  contexts: string[];
}

class TeacherCacheService {
  private readonly CACHE_COLLECTION = 'teacher-conversation-cache';
  private readonly TRAINING_COLLECTION = 'teacher-training-data';
  private readonly ANALYTICS_COLLECTION = 'teacher-analytics';
  
  // トピック専用キャッシュの保存
  async saveTopicCache(topicCache: TopicCache): Promise<void> {
    try {
      const cacheRef = doc(db, this.CACHE_COLLECTION, `${topicCache.teacherId}_${topicCache.sessionId}`);
      await setDoc(cacheRef, {
        ...topicCache,
        lastUpdated: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分後
      });
      
      console.log('トピックキャッシュ保存成功:', topicCache.sessionId);
    } catch (error) {
      console.error('トピックキャッシュ保存エラー:', error);
      throw error;
    }
  }

  // トピックキャッシュの取得
  async getTopicCache(teacherId: string, sessionId: string): Promise<TopicCache | null> {
    try {
      const cacheRef = doc(db, this.CACHE_COLLECTION, `${teacherId}_${sessionId}`);
      const snapshot = await getDoc(cacheRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data() as TopicCache;
        
        // キャッシュ有効期限チェック
        if (new Date(data.cacheExpiry) > new Date()) {
          return data;
        } else {
          // 期限切れキャッシュを削除
          await deleteDoc(cacheRef);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('トピックキャッシュ取得エラー:', error);
      return null;
    }
  }

  // キャッシュの更新（新しいメッセージ追加）
  async updateTopicCache(teacherId: string, sessionId: string, newMessage: CachedMessage): Promise<void> {
    try {
      const cacheRef = doc(db, this.CACHE_COLLECTION, `${teacherId}_${sessionId}`);
      const existing = await this.getTopicCache(teacherId, sessionId);
      
      if (existing) {
        const updatedMessages = [...existing.messages, newMessage];
        
        // メッセージ数制限（最大25件）
        if (updatedMessages.length > 25) {
          // 重要度が低い古いメッセージを削除
          updatedMessages.sort((a, b) => {
            if (a.importance !== b.importance) {
              const importanceOrder = { high: 3, medium: 2, low: 1 };
              return importanceOrder[b.importance] - importanceOrder[a.importance];
            }
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
          updatedMessages.splice(20); // 上位20件のみ保持
        }
        
        const totalTokens = updatedMessages.reduce((sum, msg) => sum + msg.tokens, 0);
        
        await updateDoc(cacheRef, {
          messages: updatedMessages,
          contextTokens: totalTokens,
          lastUpdated: new Date().toISOString(),
          cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
      }
    } catch (error) {
      console.error('トピックキャッシュ更新エラー:', error);
      throw error;
    }
  }

  // ファインチューニング用データの保存
  async saveTrainingData(teacherId: string, conversation: TrainingConversation): Promise<void> {
    try {
      const trainingRef = doc(db, this.TRAINING_COLLECTION, teacherId);
      const existing = await getDoc(trainingRef);
      
      if (existing.exists()) {
        const data = existing.data() as TeacherTrainingData;
        const updatedConversations = [...data.conversations, conversation];
        
        // 最新1000件のみ保持
        if (updatedConversations.length > 1000) {
          updatedConversations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          updatedConversations.splice(1000);
        }
        
        await updateDoc(trainingRef, {
          conversations: updatedConversations,
          lastTrainingUpdate: new Date().toISOString(),
          totalConversations: updatedConversations.length,
          averageQuality: updatedConversations.reduce((sum, conv) => sum + conv.quality, 0) / updatedConversations.length
        });
      } else {
        // 新規作成
        await setDoc(trainingRef, {
          teacherId,
          conversations: [conversation],
          responsePatterns: [],
          lastTrainingUpdate: new Date().toISOString(),
          totalConversations: 1,
          averageQuality: conversation.quality
        });
      }
      
      console.log('学習データ保存成功:', teacherId);
    } catch (error) {
      console.error('学習データ保存エラー:', error);
      throw error;
    }
  }

  // 先生の学習データ取得
  async getTrainingData(teacherId: string): Promise<TeacherTrainingData | null> {
    try {
      const trainingRef = doc(db, this.TRAINING_COLLECTION, teacherId);
      const snapshot = await getDoc(trainingRef);
      
      return snapshot.exists() ? snapshot.data() as TeacherTrainingData : null;
    } catch (error) {
      console.error('学習データ取得エラー:', error);
      return null;
    }
  }

  // 期限切れキャッシュのクリーンアップ
  async cleanExpiredCaches(): Promise<void> {
    try {
      const now = new Date().toISOString();
      const expiredQuery = query(
        collection(db, this.CACHE_COLLECTION),
        where('cacheExpiry', '<', now)
      );
      
      const snapshot = await getDocs(expiredQuery);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`期限切れキャッシュ ${snapshot.docs.length} 件削除完了`);
    } catch (error) {
      console.error('キャッシュクリーンアップエラー:', error);
    }
  }

  // 先生別の統計分析
  async getTeacherAnalytics(teacherId: string): Promise<any> {
    try {
      const trainingData = await this.getTrainingData(teacherId);
      if (!trainingData) return null;

      const conversations = trainingData.conversations;
      
      return {
        totalConversations: conversations.length,
        averageResponseLength: conversations.reduce((sum, conv) => sum + conv.responseLength, 0) / conversations.length,
        averageQuality: conversations.reduce((sum, conv) => sum + conv.quality, 0) / conversations.length,
        topTopics: this.getTopTopics(conversations),
        qualityTrend: this.getQualityTrend(conversations),
        responsePatterns: this.analyzeResponsePatterns(conversations)
      };
    } catch (error) {
      console.error('先生分析取得エラー:', error);
      return null;
    }
  }

  private getTopTopics(conversations: TrainingConversation[]): string[] {
    const topicCount = conversations.reduce((acc, conv) => {
      acc[conv.topic] = (acc[conv.topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(topicCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  private getQualityTrend(conversations: TrainingConversation[]): number[] {
    // 最新100件の品質推移
    return conversations
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-100)
      .map(conv => conv.quality);
  }

  private analyzeResponsePatterns(conversations: TrainingConversation[]): ResponsePattern[] {
    // 応答パターンの分析
    const patterns: Record<string, ResponsePattern> = {};
    
    conversations.forEach(conv => {
      const length = conv.responseLength;
      const category = length < 100 ? 'short' : length < 300 ? 'medium' : 'long';
      
      if (!patterns[category]) {
        patterns[category] = {
          pattern: category,
          frequency: 0,
          successRate: 0,
          avgResponseLength: 0,
          contexts: []
        };
      }
      
      patterns[category].frequency++;
      patterns[category].successRate += conv.quality;
      patterns[category].avgResponseLength += length;
      patterns[category].contexts.push(conv.topic);
    });

    return Object.values(patterns).map(pattern => ({
      ...pattern,
      successRate: pattern.successRate / pattern.frequency,
      avgResponseLength: pattern.avgResponseLength / pattern.frequency,
      contexts: Array.from(new Set(pattern.contexts))
    }));
  }
}

export const teacherCacheService = new TeacherCacheService();