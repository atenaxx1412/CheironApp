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
import { Message, ChatSession, Category, ChatMode } from '../types/chat';
import { firebaseStudentService } from './firebaseStudentService';
import { aiChatService } from './aiChatService';
import { firebaseAITeacherService } from './firebaseAITeacherService';

export class FirebaseChatService {
  // コレクション名
  private readonly CHAT_SESSIONS = 'chatSessions';
  private readonly MESSAGES = 'messages';

  // ユーティリティ：Firestoreタイムスタンプを文字列に変換
  private timestampToString(timestamp: any): string {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
  }

  // ユーティリティ：現在のユーザー情報を取得
  private getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // チャットセッション作成
  async createChatSession(
    category: Category,
    mode: ChatMode,
    isAnonymous: boolean = false,
    urgencyLevel: number = 1
  ): Promise<string> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error('ユーザーが認証されていません');

      const sessionData = {
        studentId: currentUser.id,
        studentName: isAnonymous ? '匿名ユーザー' : currentUser.displayName,
        category,
        mode,
        isAnonymous,
        urgencyLevel,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, this.CHAT_SESSIONS), sessionData);
      
      // 生徒のチャット統計を更新（非同期で実行）
      this.updateStudentChatStats(currentUser.id).catch(error => {
        console.error('生徒統計更新エラー:', error);
      });
      
      console.log('チャットセッション作成成功:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('チャットセッション作成エラー:', error);
      throw error;
    }
  }

  // 生徒のチャット統計を更新
  private async updateStudentChatStats(studentId: string): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      
      // 管理者やモックユーザーの統計は更新しない
      if (currentUser?.role === 'admin' || currentUser?.username === 'admin') {
        console.log('管理者アカウントのため、チャット統計更新をスキップしました');
        return;
      }

      // 生徒がFirebaseに存在するかチェック
      const student = await firebaseStudentService.getStudentById(studentId);
      
      if (student) {
        // 既存生徒の統計を更新
        await firebaseStudentService.incrementChatCount(studentId);
      } else {
        // Firebase認証済み生徒以外は自動作成しない
        console.log('Firebase認証済み生徒のみチャット統計を管理します。新規生徒作成をスキップしました');
      }
    } catch (error) {
      console.error('生徒統計更新エラー:', error);
      // エラーでもチャットは継続できるように throwしない
    }
  }


  // ユーザーとFirebase生徒データを同期
  async syncUserWithFirebase(): Promise<void> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) throw new Error('ユーザーがログインしていません');

      // 管理者やモックユーザーは同期しない
      if (currentUser.role === 'admin' || currentUser.username === 'admin') {
        console.log('管理者アカウントのため、Firebase生徒データベースとの同期をスキップしました');
        return;
      }

      // Firebaseに生徒データが存在するかチェック
      const existingStudent = await firebaseStudentService.getStudentById(currentUser.id);
      
      if (!existingStudent) {
        // Firebase認証済みの生徒のみ同期対象とする
        // モックデータやテストユーザーは同期しない
        console.log('Firebase認証済み生徒のみが同期対象です。新規生徒作成はスキップしました');
      } else {
        console.log('既存の生徒データを確認しました:', existingStudent.name);
      }
    } catch (error) {
      console.error('ユーザー同期エラー:', error);
    }
  }

  // メッセージ送信
  async sendMessage(
    sessionId: string,
    text: string,
    sender: 'user' | 'ai' = 'user',
    category?: Category,
    mode?: ChatMode
  ): Promise<string> {
    try {
      console.log('💾 Sending message to Firebase:', {
        sessionId,
        sender,
        textLength: text.length,
        textPreview: text.substring(0, 50)
      });

      const messageData: Omit<Message, 'id'> = {
        text,
        sender,
        timestamp: new Date().toISOString(),
        sessionId,
        category,
        mode,
        createdAt: Date.now() // ミリ秒タイムスタンプを追加してソートの安定性を向上
      };

      // メッセージを保存
      const docRef = await addDoc(collection(db, this.MESSAGES), messageData);

      // セッションの更新日時を更新
      await this.updateSessionTimestamp(sessionId);

      console.log('✅ メッセージ送信成功:', {
        docId: docRef.id,
        sessionId,
        sender,
        timestamp: messageData.timestamp
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ メッセージ送信エラー:', {
        error,
        sessionId,
        sender,
        textLength: text.length
      });
      throw error;
    }
  }

  // セッションのタイムスタンプ更新
  private async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(db, this.CHAT_SESSIONS, sessionId);
      await updateDoc(sessionRef, {
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('セッションタイムスタンプ更新エラー:', error);
    }
  }

  // リアルタイムメッセージ取得（インデックス不要版）
  subscribeToMessages(
    sessionId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    // sessionIdでフィルターのみ、ソートはクライアント側で実行
    const messagesQuery = query(
      collection(db, this.MESSAGES),
      where('sessionId', '==', sessionId)
    );

    console.log('Setting up Firebase subscription for sessionId:', sessionId);
    
    return onSnapshot(messagesQuery, (snapshot) => {
      console.log('Firebase onSnapshot triggered - docs count:', snapshot.docs.length);
      
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing message doc:', { id: doc.id, sender: data.sender, text: data.text?.substring(0, 30) });
        
        return {
          id: doc.id,
          ...data,
          timestamp: this.timestampToString(data.timestamp)
        } as Message;
      });
      
      // クライアント側でcreatedAtまたはtimestampでソート（より安定）
      messages.sort((a, b) => {
        const timeA = a.createdAt || new Date(a.timestamp).getTime();
        const timeB = b.createdAt || new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      
      console.log('Calling callback with', messages.length, 'messages');
      callback(messages);
    }, (error) => {
      console.error('❌ メッセージ購読エラー:', error);
      console.error('❌ 購読エラー詳細:', {
        code: error?.code,
        message: error?.message,
        sessionId: sessionId
      });
    });
  }

  // 特定セッションのメッセージを取得（履歴表示用）
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      const messagesQuery = query(
        collection(db, this.MESSAGES),
        where('sessionId', '==', sessionId)
      );
      
      const snapshot = await getDocs(messagesQuery);
      const messages: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: this.timestampToString(doc.data().timestamp)
      } as Message));
      
      // クライアント側でソート
      messages.sort((a, b) => {
        const timeA = a.createdAt || new Date(a.timestamp).getTime();
        const timeB = b.createdAt || new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      
      return messages;
    } catch (error) {
      console.error('セッションメッセージ取得エラー:', error);
      throw error;
    }
  }

  // 学生のチャットセッション一覧取得
  async getStudentChatSessions(studentId?: string): Promise<ChatSession[]> {
    try {
      const currentUser = this.getCurrentUser();
      const targetStudentId = studentId || currentUser?.id;
      
      if (!targetStudentId) throw new Error('学生IDが指定されていません');

      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        where('studentId', '==', targetStudentId)
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: ChatSession[] = [];

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        
        // このセッションのメッセージを取得
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages: Message[] = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.timestampToString(doc.data().timestamp)
        } as Message));
        
        // クライアント側でtimestampでソート
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sessions.push({
          id: sessionDoc.id,
          ...sessionData,
          messages,
          createdAt: this.timestampToString(sessionData.createdAt),
          updatedAt: this.timestampToString(sessionData.updatedAt)
        } as ChatSession);
      }

      // クライアント側でupdatedAtでソート（降順）
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return sessions;
    } catch (error) {
      console.error('チャットセッション取得エラー:', error);
      throw error;
    }
  }

  // 管理者用：全チャットセッション取得
  async getAllChatSessions(): Promise<ChatSession[]> {
    try {
      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        limit(100) // 最新100件まで
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: ChatSession[] = [];

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        
        // このセッションのメッセージを取得
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages: Message[] = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.timestampToString(doc.data().timestamp)
        } as Message));
        
        // クライアント側でtimestampでソート
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sessions.push({
          id: sessionDoc.id,
          ...sessionData,
          messages,
          createdAt: this.timestampToString(sessionData.createdAt),
          updatedAt: this.timestampToString(sessionData.updatedAt)
        } as ChatSession);
      }

      // クライアント側でupdatedAtでソート（降順）
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return sessions;
    } catch (error) {
      console.error('全チャットセッション取得エラー:', error);
      throw error;
    }
  }

  // 管理者用：リアルタイムで全チャットセッションを監視
  subscribeToAllChatSessions(callback: (sessions: ChatSession[]) => void): () => void {
    const sessionsQuery = query(
      collection(db, this.CHAT_SESSIONS),
      limit(50)
    );

    return onSnapshot(sessionsQuery, async (snapshot) => {
      const sessions: ChatSession[] = [];

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        
        // このセッションのメッセージを取得
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages: Message[] = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.timestampToString(doc.data().timestamp)
        } as Message));
        
        // クライアント側でtimestampでソート
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sessions.push({
          id: sessionDoc.id,
          ...sessionData,
          messages,
          createdAt: this.timestampToString(sessionData.createdAt),
          updatedAt: this.timestampToString(sessionData.updatedAt)
        } as ChatSession);
      }
      
      // クライアント側でupdatedAtでソート（降順）
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      callback(sessions);
    }, (error) => {
      console.error('セッション監視エラー:', error);
    });
  }

  // 管理者用：特定期間のセッション取得
  async getChatSessionsByDateRange(startDate: string, endDate: string): Promise<ChatSession[]> {
    try {
      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: ChatSession[] = [];

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id),
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages: Message[] = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.timestampToString(doc.data().timestamp)
        } as Message));
        
        // クライアント側でtimestampでソート
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sessions.push({
          id: sessionDoc.id,
          ...sessionData,
          messages,
          createdAt: this.timestampToString(sessionData.createdAt),
          updatedAt: this.timestampToString(sessionData.updatedAt)
        } as ChatSession);
      }

      // クライアント側でupdatedAtでソート（降順）
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return sessions;
    } catch (error) {
      console.error('期間別セッション取得エラー:', error);
      throw error;
    }
  }

  // 管理者用：カテゴリ別セッション取得
  async getChatSessionsByCategory(category: Category): Promise<ChatSession[]> {
    try {
      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        where('category', '==', category),
        limit(50)
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: ChatSession[] = [];

      for (const sessionDoc of snapshot.docs) {
        const sessionData = sessionDoc.data();
        
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id),
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages: Message[] = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: this.timestampToString(doc.data().timestamp)
        } as Message));
        
        // クライアント側でtimestampでソート
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        sessions.push({
          id: sessionDoc.id,
          ...sessionData,
          messages,
          createdAt: this.timestampToString(sessionData.createdAt),
          updatedAt: this.timestampToString(sessionData.updatedAt)
        } as ChatSession);
      }

      // クライアント側でupdatedAtでソート（降順）
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return sessions;
    } catch (error) {
      console.error('カテゴリ別セッション取得エラー:', error);
      throw error;
    }
  }

  // チャットセッション検索
  async searchChatSessions(searchQuery: string): Promise<ChatSession[]> {
    try {
      // Firestoreの制限により、テキスト検索は制限的
      // 実際の実装では、Algolia等の検索サービスを使用することを推奨
      const sessions = await this.getAllChatSessions();
      
      return sessions.filter(session => 
        session.messages.some(message => 
          message.text.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        session.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } catch (error) {
      console.error('チャットセッション検索エラー:', error);
      throw error;
    }
  }

  // チャットセッション削除
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      // セッションに関連するメッセージを削除
      const messagesQuery = query(
        collection(db, this.MESSAGES),
        where('sessionId', '==', sessionId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // セッション自体を削除
      await deleteDoc(doc(db, this.CHAT_SESSIONS, sessionId));
      
      console.log('チャットセッション削除成功:', sessionId);
    } catch (error) {
      console.error('チャットセッション削除エラー:', error);
      throw error;
    }
  }

  // 生徒別の会話セッション数を取得
  async getChatCountByStudentId(studentId: string): Promise<number> {
    try {
      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        where('studentId', '==', studentId)
      );
      
      const snapshot = await getDocs(sessionsQuery);
      return snapshot.size;
    } catch (error) {
      console.error('生徒別会話数取得エラー:', error);
      return 0;
    }
  }

  // 複数生徒の会話セッション数を一括取得
  async getChatCountsForStudents(studentIds: string[]): Promise<Record<string, number>> {
    try {
      const results: Record<string, number> = {};
      
      // 全セッションを取得して生徒別にカウント
      const allSessions = await this.getAllChatSessions();
      
      // 各生徒のセッション数をカウント
      studentIds.forEach(studentId => {
        results[studentId] = allSessions.filter(session => session.studentId === studentId).length;
      });
      
      return results;
    } catch (error) {
      console.error('複数生徒会話数取得エラー:', error);
      return {};
    }
  }

  // 生徒の最終会話日を取得
  async getLastChatDateByStudentId(studentId: string): Promise<string | null> {
    try {
      // 複合インデックスを避けるため、studentIdのみで絞り込み、クライアントサイドでソート
      const sessionsQuery = query(
        collection(db, this.CHAT_SESSIONS),
        where('studentId', '==', studentId)
      );
      
      const snapshot = await getDocs(sessionsQuery);
      if (snapshot.empty) {
        return null;
      }
      
      // クライアントサイドで最新のセッションを取得
      const sessions = snapshot.docs.map(doc => doc.data());
      sessions.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || new Date(a.updatedAt);
        const bTime = b.updatedAt?.toDate?.() || new Date(b.updatedAt);
        return bTime.getTime() - aTime.getTime();
      });
      
      const latestSession = sessions[0];
      const lastDate = latestSession.updatedAt?.toDate?.() || new Date(latestSession.updatedAt);
      return lastDate.toLocaleDateString('ja-JP');
    } catch (error) {
      console.error('最終会話日取得エラー:', error);
      return null;
    }
  }

  // 時間関連の質問を検出してフォーマットする関数
  private enhanceMessageWithTimeInfo(userMessage: string): string {
    const timeKeywords = ['時間', '何時', '今', '時刻', '何分', 'いま'];
    const hasTimeQuery = timeKeywords.some(keyword => userMessage.includes(keyword));
    
    if (hasTimeQuery) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const currentDate = now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      
      return `${userMessage}\n\n[現在時刻情報: ${currentDate} ${currentTime}]`;
    }
    
    return userMessage;
  }

  // Gemini AIを使用したレスポンス生成（応答長制御対応）
  async generateAIResponse(
    userMessage: string, 
    category: Category, 
    mode: ChatMode,
    responseLength?: 'auto' | 'short' | 'medium' | 'long',
    sessionId?: string,
    useCache?: boolean
  ): Promise<string> {
    try {
      // 現在選択されている先生を取得
      const lastSelectedTeacherId = localStorage.getItem('lastSelectedTeacher');
      let teacherId = lastSelectedTeacherId;
      
      // 先生が選択されていない場合、デフォルトの先生を取得
      if (!teacherId) {
        const teachers = await firebaseAITeacherService.getAllTeachers();
        teacherId = teachers[0]?.id;
      }
      
      if (!teacherId) {
        throw new Error('AI先生が見つかりません');
      }

      // 時間関連の質問の場合、現在時刻情報を追加
      const enhancedMessage = this.enhanceMessageWithTimeInfo(userMessage);

      // AI会話サービスを使用してレスポンスを生成（応答長制御付き）
      const chatResponse = await aiChatService.sendMessage({
        message: enhancedMessage,
        teacherId,
        category,
        mode,
        responseLength: responseLength || 'auto',
        sessionId,
        useCache: useCache || false
      });
      
      return chatResponse.response;
      
    } catch (error) {
      console.error('Gemini AI応答生成エラー:', error);
      
      // エラー時のフォールバック応答
      return this.getFallbackResponse(userMessage, category, mode, error);
    }
  }

  // エラー時のフォールバック応答
  private getFallbackResponse(userMessage: string, category: Category, mode: ChatMode, error: any): string {
    console.log('フォールバック応答を使用:', error?.message);
    
    const fallbackResponses = {
      normal: `申し訳ありません。一時的にAIサービスに接続できません。${userMessage}について、もう一度お聞かせいただけますか？`,
      detailed: `現在AIサービスに接続できませんが、${userMessage}について詳しくお話しください。手動でサポートいたします。`,
      quick: `接続エラーが発生しました。${category}の件について、簡潔にお答えする準備はできています。`,
      encouraging: `技術的な問題が発生していますが、${userMessage}について一緒に考えていきましょう！諦めずに進めていきます。`
    };

    return fallbackResponses[mode] || fallbackResponses.normal;
  }

  // 🗑️ 開発用：全チャットセッションとメッセージを削除
  async deleteAllChatData(): Promise<{ deletedSessions: number; deletedMessages: number }> {
    try {
      console.log('⚠️ 全チャットデータの削除を開始...');
      
      // 1. 全チャットセッションを取得
      const sessionsSnapshot = await getDocs(collection(db, this.CHAT_SESSIONS));
      console.log(`🗂️ 削除対象セッション数: ${sessionsSnapshot.size}`);
      
      // 2. 全メッセージを取得
      const messagesSnapshot = await getDocs(collection(db, this.MESSAGES));
      console.log(`💬 削除対象メッセージ数: ${messagesSnapshot.size}`);
      
      // 3. バッチでセッションを削除
      const sessionDeletePromises = sessionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(sessionDeletePromises);
      console.log(`✅ ${sessionsSnapshot.size}個のセッションを削除完了`);
      
      // 4. バッチでメッセージを削除
      const messageDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(messageDeletePromises);
      console.log(`✅ ${messagesSnapshot.size}個のメッセージを削除完了`);
      
      console.log('🎉 全チャットデータの削除が完了しました');
      
      return {
        deletedSessions: sessionsSnapshot.size,
        deletedMessages: messagesSnapshot.size
      };
    } catch (error) {
      console.error('❌ チャットデータ削除エラー:', error);
      throw new Error(`チャットデータの削除に失敗しました: ${error}`);
    }
  }

  // 🗑️ 開発用：特定期間より古いデータを削除
  async deleteOldChatData(daysOld: number = 7): Promise<{ deletedSessions: number; deletedMessages: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      console.log(`⚠️ ${daysOld}日より古いチャットデータを削除開始...`);
      console.log(`📅 削除基準日: ${cutoffDate.toLocaleDateString('ja-JP')}`);
      
      // 古いセッションを検索して削除
      const sessionsSnapshot = await getDocs(collection(db, this.CHAT_SESSIONS));
      const oldSessions = sessionsSnapshot.docs.filter(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date(data.timestamp);
        return createdAt < cutoffDate;
      });
      
      // 関連するメッセージも削除
      let deletedMessages = 0;
      for (const sessionDoc of oldSessions) {
        const messagesQuery = query(
          collection(db, this.MESSAGES),
          where('sessionId', '==', sessionDoc.id)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const messageDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(messageDeletePromises);
        deletedMessages += messagesSnapshot.size;
        
        // セッション自体も削除
        await deleteDoc(sessionDoc.ref);
      }
      
      console.log(`✅ ${oldSessions.length}個の古いセッションと${deletedMessages}個のメッセージを削除完了`);
      
      return {
        deletedSessions: oldSessions.length,
        deletedMessages: deletedMessages
      };
    } catch (error) {
      console.error('❌ 古いチャットデータ削除エラー:', error);
      throw new Error(`古いチャットデータの削除に失敗しました: ${error}`);
    }
  }
}

// シングルトンインスタンス
export const firebaseChatService = new FirebaseChatService();