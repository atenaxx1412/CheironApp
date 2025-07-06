import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AITeacher } from '../types';

export class FirebaseAITeacherService {
  private readonly AI_TEACHERS = 'aiTeachers';

  // デフォルト先生データ（初期化用）
  private readonly DEFAULT_TEACHERS: Omit<AITeacher, 'id'>[] = [
    {
      name: 'tanaka_sensei',
      displayName: '田中先生',
      personality: '優しくて親しみやすい先生です。学生の気持ちに寄り添い、どんな些細な悩みでも丁寧に聞いてくれます。',
      specialties: ['進路相談', '学習方法', '心理サポート'],
      image: '/imgs/teacher1.jpg',
      greeting: 'こんにちは！田中です。何でも気軽に相談してくださいね。あなたの悩みを一緒に解決していきましょう。',
      isDefault: true
    },
    {
      name: 'yamada_sensei', 
      displayName: '山田先生',
      personality: '論理的で分析力に長けた先生です。問題を体系的に整理し、具体的な解決策を提示してくれます。',
      specialties: ['学習計画', '進路設計', '問題解決'],
      image: '/imgs/teacher2.jpg',
      greeting: 'こんにちは、山田です。あなたの目標達成に向けて、一緒に計画を立てていきましょう。',
      isDefault: true
    },
    {
      name: 'sato_sensei',
      displayName: '佐藤先生', 
      personality: '明るくてエネルギッシュな先生です。いつも前向きで、学生のやる気を引き出すのが得意です。',
      specialties: ['モチベーション向上', '人間関係', 'コミュニケーション'],
      image: '/imgs/teacher3.jpg',
      greeting: '佐藤です！今日も元気いっぱいでいきましょう！どんなことでも一緒に頑張りますよ！',
      isDefault: true
    }
  ];

  // 初期データをFirebaseに登録（オプション）
  async initializeDefaultTeachers(force: boolean = false): Promise<void> {
    try {
      console.log('デフォルト先生データの初期化を開始...');
      
      if (!force) {
        // 既存のデフォルト先生をチェック
        const defaultTeachersQuery = query(
          collection(db, this.AI_TEACHERS),
          where('isDefault', '==', true)
        );
        
        const snapshot = await getDocs(defaultTeachersQuery);
        
        if (!snapshot.empty) {
          console.log('デフォルト先生データは既に存在します。初期化をスキップします。');
          return;
        }
      }
      
      // デフォルト先生を作成
      for (const teacher of this.DEFAULT_TEACHERS) {
        await addDoc(collection(db, this.AI_TEACHERS), {
          ...teacher,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      console.log('デフォルト先生データを作成しました');
    } catch (error) {
      console.error('デフォルト先生データ初期化エラー:', error);
      throw error;
    }
  }

  // 全AI先生取得
  async getAllTeachers(): Promise<AITeacher[]> {
    try {
      const teachersQuery = query(
        collection(db, this.AI_TEACHERS),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(teachersQuery);
      const teachers: AITeacher[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AITeacher));
      
      return teachers;
    } catch (error) {
      console.error('AI先生取得エラー:', error);
      throw error;
    }
  }

  // リアルタイムでAI先生を監視
  subscribeToTeachers(callback: (teachers: AITeacher[]) => void): () => void {
    const teachersQuery = query(
      collection(db, this.AI_TEACHERS),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(teachersQuery, (snapshot) => {
      const teachers: AITeacher[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AITeacher));
      
      callback(teachers);
    }, (error) => {
      console.error('AI先生監視エラー:', error);
    });
  }

  // 特定のAI先生取得
  async getTeacherById(teacherId: string): Promise<AITeacher | null> {
    try {
      const docRef = doc(db, this.AI_TEACHERS, teacherId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as AITeacher;
      }
      
      return null;
    } catch (error) {
      console.error('AI先生個別取得エラー:', error);
      throw error;
    }
  }

  // 新しいAI先生追加
  async addTeacher(teacher: Omit<AITeacher, 'id'>): Promise<string> {
    try {
      const teacherData = {
        ...teacher,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, this.AI_TEACHERS), teacherData);
      console.log('AI先生追加成功:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('AI先生追加エラー:', error);
      throw error;
    }
  }

  // AI先生更新
  async updateTeacher(teacherId: string, updates: Partial<AITeacher>): Promise<void> {
    try {
      const docRef = doc(db, this.AI_TEACHERS, teacherId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('AI先生更新成功:', teacherId);
    } catch (error) {
      console.error('AI先生更新エラー:', error);
      throw error;
    }
  }

  // AI先生削除（デフォルトデータも削除可能）
  async deleteTeacher(teacherId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.AI_TEACHERS, teacherId));
      console.log('AI先生削除成功:', teacherId);
    } catch (error) {
      console.error('AI先生削除エラー:', error);
      throw error;
    }
  }

  // デフォルトデータを全て削除
  async deleteAllDefaultTeachers(): Promise<{ deletedCount: number }> {
    try {
      console.log('デフォルトAI先生データの削除を開始...');
      
      const defaultTeachersQuery = query(
        collection(db, this.AI_TEACHERS),
        where('isDefault', '==', true)
      );
      
      const snapshot = await getDocs(defaultTeachersQuery);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`${snapshot.size}件のデフォルトAI先生を削除しました`);
      
      return { deletedCount: snapshot.size };
    } catch (error) {
      console.error('デフォルトAI先生削除エラー:', error);
      throw error;
    }
  }

  // 全AI先生を削除（開発用）
  async deleteAllTeachers(): Promise<{ deletedCount: number }> {
    try {
      console.log('全AI先生データの削除を開始...');
      
      const snapshot = await getDocs(collection(db, this.AI_TEACHERS));
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`${snapshot.size}件のAI先生を削除しました`);
      
      return { deletedCount: snapshot.size };
    } catch (error) {
      console.error('全AI先生削除エラー:', error);
      throw error;
    }
  }



  // localStorage からFirebaseへのマイグレーション
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // localStorageから既存データを取得
      const additionalTeachers = localStorage.getItem('additionalTeachers');
      const teacherUpdates = localStorage.getItem('teacherUpdates');
      
      if (additionalTeachers) {
        const teachers = JSON.parse(additionalTeachers);
        for (const teacher of teachers) {
          await this.addTeacher(teacher);
        }
        console.log('追加先生のマイグレーション完了');
      }
      
      if (teacherUpdates) {
        const updates = JSON.parse(teacherUpdates);
        for (const [teacherId, updateData] of Object.entries(updates)) {
          // 既存の先生を検索して更新
          const teachers = await this.getAllTeachers();
          const targetTeacher = teachers.find(t => t.name === teacherId);
          if (targetTeacher) {
            await this.updateTeacher(targetTeacher.id, updateData as Partial<AITeacher>);
          }
        }
        console.log('先生更新データのマイグレーション完了');
      }
      
      // マイグレーション完了後、localStorageをクリア
      localStorage.removeItem('additionalTeachers');
      localStorage.removeItem('teacherUpdates');
      localStorage.setItem('migrationCompleted', 'true');
      
    } catch (error) {
      console.error('マイグレーションエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const firebaseAITeacherService = new FirebaseAITeacherService();