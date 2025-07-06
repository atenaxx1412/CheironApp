import {
  collection,
  doc,
  addDoc,
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
import { Student } from '../types/user';

export class FirebaseStudentService {
  private readonly STUDENTS_COLLECTION = 'students';



  // 全生徒取得
  async getAllStudents(): Promise<Student[]> {
    try {
      const studentsQuery = query(
        collection(db, this.STUDENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(studentsQuery);
      const students: Student[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));
      
      return students;
    } catch (error) {
      console.error('生徒取得エラー:', error);
      throw error;
    }
  }

  // リアルタイムで生徒を監視
  subscribeToStudents(callback: (students: Student[]) => void): () => void {
    const studentsQuery = query(
      collection(db, this.STUDENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(studentsQuery, (snapshot) => {
      const students: Student[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));
      
      callback(students);
    }, (error) => {
      console.error('生徒監視エラー:', error);
    });
  }

  // 特定の生徒取得
  async getStudentById(studentId: string): Promise<Student | null> {
    try {
      const docRef = doc(db, this.STUDENTS_COLLECTION, studentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Student;
      }
      
      return null;
    } catch (error) {
      console.error('生徒個別取得エラー:', error);
      throw error;
    }
  }

  // ユーザー名で生徒検索
  async getStudentByUsername(username: string): Promise<Student | null> {
    try {
      const studentsQuery = query(
        collection(db, this.STUDENTS_COLLECTION),
        where('username', '==', username)
      );
      
      const snapshot = await getDocs(studentsQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Student;
      }
      
      return null;
    } catch (error) {
      console.error('生徒検索エラー:', error);
      throw error;
    }
  }

  // 新しい生徒追加
  async addStudent(student: Omit<Student, 'id'>): Promise<string> {
    try {
      // ユーザー名の重複チェック
      const existingStudent = await this.getStudentByUsername(student.username);
      if (existingStudent) {
        throw new Error('このユーザー名は既に使用されています');
      }

      const studentData = {
        ...student,
        isDefault: false,
        chatCount: 0,
        lastChatDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, this.STUDENTS_COLLECTION), studentData);
      console.log('生徒追加成功:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('生徒追加エラー:', error);
      throw error;
    }
  }

  // 生徒情報更新
  async updateStudent(studentId: string, updates: Partial<Student>): Promise<void> {
    try {
      const docRef = doc(db, this.STUDENTS_COLLECTION, studentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('生徒更新成功:', studentId);
    } catch (error) {
      console.error('生徒更新エラー:', error);
      throw error;
    }
  }

  // 生徒削除（デフォルトデータも削除可能）
  async deleteStudent(studentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.STUDENTS_COLLECTION, studentId));
      console.log('生徒削除成功:', studentId);
    } catch (error) {
      console.error('生徒削除エラー:', error);
      throw error;
    }
  }

  // デフォルトデータを全て削除
  async deleteAllDefaultStudents(): Promise<{ deletedCount: number }> {
    try {
      console.log('デフォルト生徒データの削除を開始...');
      
      const defaultStudentsQuery = query(
        collection(db, this.STUDENTS_COLLECTION),
        where('isDefault', '==', true)
      );
      
      const snapshot = await getDocs(defaultStudentsQuery);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`${snapshot.size}件のデフォルト生徒を削除しました`);
      
      return { deletedCount: snapshot.size };
    } catch (error) {
      console.error('デフォルト生徒削除エラー:', error);
      throw error;
    }
  }

  // 全生徒を削除（開発用）
  async deleteAllStudents(): Promise<{ deletedCount: number }> {
    try {
      console.log('全生徒データの削除を開始...');
      
      const snapshot = await getDocs(collection(db, this.STUDENTS_COLLECTION));
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`${snapshot.size}件の生徒を削除しました`);
      
      return { deletedCount: snapshot.size };
    } catch (error) {
      console.error('全生徒削除エラー:', error);
      throw error;
    }
  }

  // 生徒のチャット回数を更新
  async incrementChatCount(studentId: string): Promise<void> {
    try {
      const student = await this.getStudentById(studentId);
      if (student) {
        await this.updateStudent(studentId, {
          chatCount: (student.chatCount || 0) + 1,
          lastChatDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD形式
        });
      }
    } catch (error) {
      console.error('チャット回数更新エラー:', error);
      throw error;
    }
  }

  // アクティブ生徒数取得
  async getActiveStudentsCount(): Promise<number> {
    try {
      const activeStudentsQuery = query(
        collection(db, this.STUDENTS_COLLECTION),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(activeStudentsQuery);
      return snapshot.size;
    } catch (error) {
      console.error('アクティブ生徒数取得エラー:', error);
      return 0;
    }
  }

  // localStorage からFirebaseへのマイグレーション
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // localStorageから既存データを取得
      const studentsData = localStorage.getItem('students');
      
      if (studentsData) {
        const students = JSON.parse(studentsData);
        for (const student of students) {
          // 既存チェック
          const existing = await this.getStudentByUsername(student.username);
          if (!existing) {
            await this.addStudent(student);
          }
        }
        console.log('生徒データのマイグレーション完了');
      }
      
      // マイグレーション完了後、localStorageをクリア
      localStorage.removeItem('students');
      localStorage.setItem('studentsMigrationCompleted', 'true');
      
    } catch (error) {
      console.error('生徒データマイグレーションエラー:', error);
      throw error;
    }
  }

  // 既存生徒にログイン情報を追加するマイグレーション
  async migrateLoginCredentials(): Promise<void> {
    try {
      console.log('既存生徒にログイン情報を付与中...');
      
      const students = await this.getAllStudents();
      let count = 0;
      
      for (const student of students) {
        // ログイン情報が未設定の生徒のみ更新
        if (!student.loginId || !student.password) {
          count++;
          const loginId = `student${count.toString().padStart(2, '0')}`;
          const password = 'student123';
          
          await this.updateStudent(student.id, {
            loginId,
            password
          });
          
          console.log(`${student.name} にログイン情報を設定: ${loginId} / ${password}`);
        }
      }
      
      console.log(`${count}名の生徒にログイン情報を付与しました`);
      localStorage.setItem('loginCredentialsMigrationCompleted', 'true');
      
    } catch (error) {
      console.error('ログイン情報マイグレーションエラー:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const firebaseStudentService = new FirebaseStudentService();