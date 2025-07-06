import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Feedback {
  id: string;
  messageId: string;
  sessionId: string; // チャットセッションID追加
  type: 'good' | 'bad';
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  messageText: string;
  category: string;
  mode: string;
  timestamp: string;
  comment?: string;
  reproductionScore?: number; // 再現度スコア (1-10)
  reproductionComment?: string; // 再現度についてのコメント
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackStats {
  totalFeedbacks: number;
  goodFeedbacks: number;
  badFeedbacks: number;
  satisfactionRate: number;
  averageReproductionScore: number; // 平均再現度スコア
  feedbacksByCategory: { [key: string]: { good: number; bad: number } };
  feedbacksByTeacher: { [key: string]: { good: number; bad: number; name: string; averageReproduction?: number } };
  recentFeedbacks: Feedback[];
}

export class FirebaseFeedbackService {
  private readonly FEEDBACKS_COLLECTION = 'feedbacks';

  // フィードバックを保存
  async saveFeedback(feedback: Omit<Feedback, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>): Promise<Feedback> {
    try {
      const feedbackData = {
        ...feedback,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.FEEDBACKS_COLLECTION), feedbackData);
      
      const newFeedback: Feedback = {
        id: docRef.id,
        ...feedbackData
      };

      console.log('フィードバック保存成功:', docRef.id);
      return newFeedback;
    } catch (error) {
      console.error('フィードバック保存エラー:', error);
      throw error;
    }
  }

  // 全フィードバックを取得
  async getAllFeedbacks(): Promise<Feedback[]> {
    try {
      const feedbacksQuery = query(
        collection(db, this.FEEDBACKS_COLLECTION),
        limit(1000) // 最新1000件まで
      );
      
      const snapshot = await getDocs(feedbacksQuery);
      const feedbacks: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      
      // クライアント側でtimestampでソート（降順）
      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return feedbacks;
    } catch (error) {
      console.error('フィードバック取得エラー:', error);
      throw error;
    }
  }

  // リアルタイムでフィードバックを監視
  subscribeToFeedbacks(callback: (feedbacks: Feedback[]) => void): () => void {
    const feedbacksQuery = query(
      collection(db, this.FEEDBACKS_COLLECTION),
      limit(500)
    );

    return onSnapshot(feedbacksQuery, (snapshot) => {
      const feedbacks: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      
      // クライアント側でtimestampでソート（降順）
      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      callback(feedbacks);
    }, (error) => {
      console.error('フィードバック監視エラー:', error);
    });
  }

  // フィードバック統計を計算
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const feedbacks = await this.getAllFeedbacks();
      
      const totalFeedbacks = feedbacks.length;
      const goodFeedbacks = feedbacks.filter(f => f.type === 'good').length;
      const badFeedbacks = feedbacks.filter(f => f.type === 'bad').length;
      const satisfactionRate = totalFeedbacks > 0 ? (goodFeedbacks / totalFeedbacks) * 100 : 0;

      // 再現度の平均値を計算
      const reproductionScores = feedbacks.filter(f => f.reproductionScore !== undefined).map(f => f.reproductionScore!);
      const averageReproductionScore = reproductionScores.length > 0 ? 
        reproductionScores.reduce((sum, score) => sum + score, 0) / reproductionScores.length : 0;

      // カテゴリ別統計
      const feedbacksByCategory: { [key: string]: { good: number; bad: number } } = {};
      feedbacks.forEach(feedback => {
        if (!feedbacksByCategory[feedback.category]) {
          feedbacksByCategory[feedback.category] = { good: 0, bad: 0 };
        }
        feedbacksByCategory[feedback.category][feedback.type]++;
      });

      // 先生別統計（再現度平均値も含む）
      const feedbacksByTeacher: { [key: string]: { good: number; bad: number; name: string; averageReproduction?: number } } = {};
      feedbacks.forEach(feedback => {
        if (!feedbacksByTeacher[feedback.teacherId]) {
          feedbacksByTeacher[feedback.teacherId] = { 
            good: 0, 
            bad: 0, 
            name: feedback.teacherName 
          };
        }
        feedbacksByTeacher[feedback.teacherId][feedback.type]++;
      });

      // 先生別の再現度平均値を計算
      Object.keys(feedbacksByTeacher).forEach(teacherId => {
        const teacherFeedbacks = feedbacks.filter(f => f.teacherId === teacherId && f.reproductionScore !== undefined);
        if (teacherFeedbacks.length > 0) {
          const avgScore = teacherFeedbacks.reduce((sum, f) => sum + f.reproductionScore!, 0) / teacherFeedbacks.length;
          feedbacksByTeacher[teacherId].averageReproduction = avgScore;
        }
      });

      // 最近のフィードバック（最新10件）
      const recentFeedbacks = feedbacks.slice(0, 10);

      return {
        totalFeedbacks,
        goodFeedbacks,
        badFeedbacks,
        satisfactionRate,
        averageReproductionScore,
        feedbacksByCategory,
        feedbacksByTeacher,
        recentFeedbacks
      };
    } catch (error) {
      console.error('フィードバック統計取得エラー:', error);
      throw error;
    }
  }

  // 特定の先生のフィードバックを取得
  async getFeedbacksByTeacher(teacherId: string): Promise<Feedback[]> {
    try {
      const feedbacksQuery = query(
        collection(db, this.FEEDBACKS_COLLECTION),
        where('teacherId', '==', teacherId)
      );
      
      const snapshot = await getDocs(feedbacksQuery);
      const feedbacks: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      
      // クライアント側でtimestampでソート（降順）
      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return feedbacks;
    } catch (error) {
      console.error('先生別フィードバック取得エラー:', error);
      throw error;
    }
  }

  // 特定のカテゴリのフィードバックを取得
  async getFeedbacksByCategory(category: string): Promise<Feedback[]> {
    try {
      const feedbacksQuery = query(
        collection(db, this.FEEDBACKS_COLLECTION),
        where('category', '==', category)
      );
      
      const snapshot = await getDocs(feedbacksQuery);
      const feedbacks: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      
      // クライアント側でtimestampでソート（降順）
      feedbacks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return feedbacks;
    } catch (error) {
      console.error('カテゴリ別フィードバック取得エラー:', error);
      throw error;
    }
  }

  // 特定のメッセージのフィードバックを取得
  async getFeedbackByMessageId(messageId: string): Promise<Feedback | null> {
    try {
      const feedbacksQuery = query(
        collection(db, this.FEEDBACKS_COLLECTION),
        where('messageId', '==', messageId)
      );
      
      const snapshot = await getDocs(feedbacksQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Feedback;
      }
      
      return null;
    } catch (error) {
      console.error('メッセージ別フィードバック取得エラー:', error);
      throw error;
    }
  }

  // 特定のセッションのフィードバックを取得
  async getFeedbacksBySession(sessionId: string): Promise<Feedback[]> {
    try {
      const feedbacksQuery = query(
        collection(db, this.FEEDBACKS_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      
      const snapshot = await getDocs(feedbacksQuery);
      const feedbacks: Feedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Feedback));
      
      return feedbacks;
    } catch (error) {
      console.error('セッション別フィードバック取得エラー:', error);
      throw error;
    }
  }

  // フィードバックを更新
  async updateFeedback(feedbackId: string, updates: Partial<Feedback>): Promise<void> {
    try {
      const docRef = doc(db, this.FEEDBACKS_COLLECTION, feedbackId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('フィードバック更新成功:', feedbackId);
    } catch (error) {
      console.error('フィードバック更新エラー:', error);
      throw error;
    }
  }

  // フィードバックを削除
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.FEEDBACKS_COLLECTION, feedbackId));
      console.log('フィードバック削除成功:', feedbackId);
      return true;
    } catch (error) {
      console.error('フィードバック削除エラー:', error);
      return false;
    }
  }

  // メッセージIDでフィードバックを削除
  async deleteFeedbackByMessageId(messageId: string): Promise<boolean> {
    try {
      const feedback = await this.getFeedbackByMessageId(messageId);
      if (feedback) {
        return await this.deleteFeedback(feedback.id);
      }
      return false;
    } catch (error) {
      console.error('メッセージ別フィードバック削除エラー:', error);
      return false;
    }
  }

  // localStorage からFirebaseへのマイグレーション
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // localStorageから既存データを取得
      const feedbacksData = localStorage.getItem('cheiron_feedbacks');
      
      if (feedbacksData) {
        const feedbacks = JSON.parse(feedbacksData);
        console.log(`${feedbacks.length}件のフィードバックをマイグレーション中...`);
        
        for (const feedback of feedbacks) {
          // 既存チェック（messageIdで重複防止）
          const existing = await this.getFeedbackByMessageId(feedback.messageId);
          if (!existing) {
            await this.saveFeedback({
              messageId: feedback.messageId,
              sessionId: feedback.sessionId || '', // セッションIDがない場合は空文字
              type: feedback.type,
              studentId: feedback.studentId,
              studentName: feedback.studentName,
              teacherId: feedback.teacherId,
              teacherName: feedback.teacherName,
              messageText: feedback.messageText,
              category: feedback.category,
              mode: feedback.mode,
              comment: feedback.comment
            });
          }
        }
        console.log('フィードバックデータのマイグレーション完了');
      }
      
      // マイグレーション完了後、localStorageをクリア
      localStorage.removeItem('cheiron_feedbacks');
      localStorage.setItem('feedbacksMigrationCompleted', 'true');
      
    } catch (error) {
      console.error('フィードバックデータマイグレーションエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const firebaseFeedbackService = new FirebaseFeedbackService();