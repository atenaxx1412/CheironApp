export type Category = '日常会話' | '進路' | '学習' | '人間関係';

export type ChatMode = 'normal' | 'detailed' | 'quick' | 'encouraging';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  category?: Category;
  mode?: ChatMode;
  sessionId?: string; // Firebase用：セッションID追加
  createdAt?: number; // ソート用ミリ秒タイムスタンプ
}

export interface ChatHistory {
  id: string;
  studentId: string;
  studentName: string; // 生徒名追加
  question: string;
  aiResponse: string;
  category: Category;
  chatMode: ChatMode;
  isAnonymous: boolean;
  urgencyLevel: number;
  teacherComment?: string;
  isFlagged: boolean;
  createdAt: string;
  updatedAt?: string; // 更新日時追加
}

export interface ChatSession {
  id: string;
  studentId: string; // Firebase用：学生ID追加
  studentName: string; // 生徒名追加
  teacherId?: string; // 対応先生ID
  teacherName?: string; // 対応先生名
  messages: Message[];
  category: Category;
  mode: ChatMode;
  isAnonymous: boolean;
  urgencyLevel: number;
  status: 'active' | 'completed' | 'archived'; // セッション状態
  teacherComment?: string; // 教師コメント
  isFlagged?: boolean; // フラグ状態
  createdAt: string;
  updatedAt: string;
}

// Firebase用のデータベースコレクション型
export interface FirestoreCollections {
  chatSessions: ChatSession;
  messages: Message;
  chatHistory: ChatHistory;
}