export interface Feedback {
  id: string;
  messageId: string;
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
}

export interface FeedbackStats {
  totalFeedbacks: number;
  goodFeedbacks: number;
  badFeedbacks: number;
  satisfactionRate: number;
  feedbacksByCategory: { [key: string]: { good: number; bad: number } };
  feedbacksByTeacher: { [key: string]: { good: number; bad: number; name: string } };
  recentFeedbacks: Feedback[];
}

class FeedbackService {
  private storageKey = 'cheiron_feedbacks';

  // フィードバックを保存
  saveFeedback(feedback: Omit<Feedback, 'id' | 'timestamp'>): Feedback {
    const feedbacks = this.getAllFeedbacks();
    const newFeedback: Feedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    feedbacks.push(newFeedback);
    localStorage.setItem(this.storageKey, JSON.stringify(feedbacks));
    
    return newFeedback;
  }

  // 全フィードバックを取得
  getAllFeedbacks(): Feedback[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      return [];
    }
  }

  // フィードバック統計を取得
  getFeedbackStats(): FeedbackStats {
    const feedbacks = this.getAllFeedbacks();
    const totalFeedbacks = feedbacks.length;
    const goodFeedbacks = feedbacks.filter(f => f.type === 'good').length;
    const badFeedbacks = feedbacks.filter(f => f.type === 'bad').length;
    const satisfactionRate = totalFeedbacks > 0 ? (goodFeedbacks / totalFeedbacks) * 100 : 0;

    // カテゴリ別統計
    const feedbacksByCategory: { [key: string]: { good: number; bad: number } } = {};
    feedbacks.forEach(feedback => {
      if (!feedbacksByCategory[feedback.category]) {
        feedbacksByCategory[feedback.category] = { good: 0, bad: 0 };
      }
      feedbacksByCategory[feedback.category][feedback.type]++;
    });

    // 先生別統計
    const feedbacksByTeacher: { [key: string]: { good: number; bad: number; name: string } } = {};
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

    // 最近のフィードバック（最新10件）
    const recentFeedbacks = feedbacks
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalFeedbacks,
      goodFeedbacks,
      badFeedbacks,
      satisfactionRate,
      feedbacksByCategory,
      feedbacksByTeacher,
      recentFeedbacks
    };
  }

  // 特定の先生のフィードバックを取得
  getFeedbacksByTeacher(teacherId: string): Feedback[] {
    return this.getAllFeedbacks().filter(f => f.teacherId === teacherId);
  }

  // 特定のカテゴリのフィードバックを取得
  getFeedbacksByCategory(category: string): Feedback[] {
    return this.getAllFeedbacks().filter(f => f.category === category);
  }

  // フィードバックを削除
  deleteFeedback(feedbackId: string): boolean {
    try {
      const feedbacks = this.getAllFeedbacks();
      const filteredFeedbacks = feedbacks.filter(f => f.id !== feedbackId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredFeedbacks));
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      return false;
    }
  }

  // 特定のメッセージのフィードバックを取得
  getFeedbackByMessageId(messageId: string): Feedback | null {
    const feedbacks = this.getAllFeedbacks();
    return feedbacks.find(f => f.messageId === messageId) || null;
  }
}

export const feedbackService = new FeedbackService();