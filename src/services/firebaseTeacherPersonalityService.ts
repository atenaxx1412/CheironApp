import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  Unsubscribe,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TeacherPersonalityAnswer {
  questionId: string;
  category: string;
  answer: string;
  weight: number;
  timestamp: string;
}

export interface TeacherPersonalityData {
  teacherId: string;
  teacherName: string;
  answers: TeacherPersonalityAnswer[];
  completedAt?: string;
  lastUpdatedAt: string;
  isComplete: boolean;
  completionPercentage: number;
}

class FirebaseTeacherPersonalityService {
  private readonly COLLECTION_NAME = 'teacherPersonalities';

  // 50問の回答を保存
  async saveTeacherPersonality(data: TeacherPersonalityData): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, data.teacherId);
      await setDoc(docRef, {
        ...data,
        lastUpdatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('先生の性格データを保存しました:', data.teacherId);
    } catch (error) {
      console.error('性格データ保存エラー:', error);
      throw error;
    }
  }

  // 特定の先生の回答を取得
  async getTeacherPersonality(teacherId: string): Promise<TeacherPersonalityData | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, teacherId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as TeacherPersonalityData;
      }
      return null;
    } catch (error) {
      console.error('性格データ取得エラー:', error);
      throw error;
    }
  }

  // 個別の質問回答を更新
  async updateAnswer(
    teacherId: string, 
    questionId: string, 
    answer: string, 
    weight: number,
    category: string
  ): Promise<void> {
    try {
      const existingData = await this.getTeacherPersonality(teacherId);
      
      const newAnswer: TeacherPersonalityAnswer = {
        questionId,
        category,
        answer,
        weight,
        timestamp: new Date().toISOString()
      };

      let answers: TeacherPersonalityAnswer[] = [];
      if (existingData) {
        // 既存の回答を更新
        answers = existingData.answers.filter(a => a.questionId !== questionId);
        answers.push(newAnswer);
      } else {
        answers = [newAnswer];
      }

      const totalQuestions = 50; // 総質問数
      const completionPercentage = (answers.length / totalQuestions) * 100;
      const isComplete = completionPercentage === 100;

      const updatedData: TeacherPersonalityData = {
        teacherId,
        teacherName: existingData?.teacherName || '',
        answers,
        completedAt: isComplete ? new Date().toISOString() : existingData?.completedAt || undefined,
        lastUpdatedAt: new Date().toISOString(),
        isComplete,
        completionPercentage
      };

      // completedAtがundefinedの場合は削除
      if (updatedData.completedAt === undefined) {
        delete (updatedData as any).completedAt;
      }

      await this.saveTeacherPersonality(updatedData);
    } catch (error) {
      console.error('回答更新エラー:', error);
      throw error;
    }
  }

  // 先生の性格データをリアルタイム監視
  subscribeToTeacherPersonality(
    teacherId: string, 
    callback: (data: TeacherPersonalityData | null) => void
  ): Unsubscribe {
    const docRef = doc(db, this.COLLECTION_NAME, teacherId);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as TeacherPersonalityData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('性格データ監視エラー:', error);
      callback(null);
    });
  }

  // すべての先生の性格データを取得
  async getAllTeacherPersonalities(): Promise<TeacherPersonalityData[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      return querySnapshot.docs.map(doc => doc.data() as TeacherPersonalityData);
    } catch (error) {
      console.error('全性格データ取得エラー:', error);
      throw error;
    }
  }

  // 完了済みの先生の性格データを取得
  async getCompletedPersonalities(): Promise<TeacherPersonalityData[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('isComplete', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as TeacherPersonalityData);
    } catch (error) {
      console.error('完了済み性格データ取得エラー:', error);
      throw error;
    }
  }

  // AI応答生成用に性格データを構築
  buildPersonalityPrompt(personalityData: TeacherPersonalityData): string {
    if (!personalityData.isComplete) {
      return '基本的な先生として';
    }

    const answers = personalityData.answers;
    
    // カテゴリ別に回答を分類
    const corePersonality = answers.filter(a => a.category === '基本性格');
    const challengingSituations = answers.filter(a => a.category === '難問対応');
    const practicalResponses = answers.filter(a => a.category === '実際回答');
    const boundaries = answers.filter(a => a.category === '境界線');
    const languagePatterns = answers.filter(a => a.category === '言語パターン');

    let prompt = `
【${personalityData.teacherName}の教育理念・性格】

## 基本的な価値観・教育方針
${corePersonality.map(a => `- ${a.answer}`).join('\n')}

## 困難な状況での対応方針
${challengingSituations.map(a => `- ${a.answer}`).join('\n')}

## 実際の言葉遣い・対応パターン
${practicalResponses.map(a => `- ${a.answer}`).join('\n')}
${languagePatterns.map(a => `- ${a.answer}`).join('\n')}

## 専門性・境界線
${boundaries.map(a => `- ${a.answer}`).join('\n')}

この性格・価値観を持った${personalityData.teacherName}として、生徒に温かく、具体的で実践的なアドバイスを提供してください。
`;

    return prompt;
  }
}

export const firebaseTeacherPersonalityService = new FirebaseTeacherPersonalityService();