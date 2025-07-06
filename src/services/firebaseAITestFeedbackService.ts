import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AITestFeedback {
  id?: string;
  teacherId: string;
  teacherName: string;
  rating: number; // 1-10点
  positives: string; // 良かった点
  improvements: string; // 改善点
  overall: string; // 全体的な感想
  timestamp: string;
  testerName?: string; // テスト実行者名（管理者名）
}

class FirebaseAITestFeedbackService {
  private readonly COLLECTION_NAME = 'ai-test-feedback';

  // フィードバックを保存
  async saveFeedback(feedback: Omit<AITestFeedback, 'id'>): Promise<string> {
    try {
      const feedbackData = {
        ...feedback,
        timestamp: feedback.timestamp || new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), feedbackData);
      
      console.log('フィードバック保存成功:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('フィードバック保存エラー:', error);
      throw new Error('フィードバックの保存に失敗しました');
    }
  }

  // 全フィードバックを取得
  async getAllFeedback(): Promise<AITestFeedback[]> {
    try {
      const feedbackQuery = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      
      const snapshot = await getDocs(feedbackQuery);
      const feedbacks: AITestFeedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AITestFeedback));
      
      return feedbacks;
    } catch (error) {
      console.error('フィードバック取得エラー:', error);
      throw new Error('フィードバックの取得に失敗しました');
    }
  }

  // 特定のAI先生のフィードバックを取得
  async getFeedbackByTeacher(teacherId: string): Promise<AITestFeedback[]> {
    try {
      const teacherQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('teacherId', '==', teacherId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(teacherQuery);
      const feedbacks: AITestFeedback[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AITestFeedback));
      
      return feedbacks;
    } catch (error) {
      console.error('先生別フィードバック取得エラー:', error);
      throw new Error('フィードバックの取得に失敗しました');
    }
  }

  // フィードバック統計を取得
  async getFeedbackStats(teacherId?: string): Promise<{
    totalCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    latestFeedback?: AITestFeedback;
  }> {
    try {
      const feedbacks = teacherId 
        ? await this.getFeedbackByTeacher(teacherId)
        : await this.getAllFeedback();

      if (feedbacks.length === 0) {
        return {
          totalCount: 0,
          averageRating: 0,
          ratingDistribution: {}
        };
      }

      const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
      const averageRating = Math.round((totalRating / feedbacks.length) * 10) / 10;

      const ratingDistribution: Record<number, number> = {};
      feedbacks.forEach(feedback => {
        ratingDistribution[feedback.rating] = (ratingDistribution[feedback.rating] || 0) + 1;
      });

      return {
        totalCount: feedbacks.length,
        averageRating,
        ratingDistribution,
        latestFeedback: feedbacks[0]
      };
    } catch (error) {
      console.error('フィードバック統計取得エラー:', error);
      throw new Error('統計の取得に失敗しました');
    }
  }
}

export const firebaseAITestFeedbackService = new FirebaseAITestFeedbackService();