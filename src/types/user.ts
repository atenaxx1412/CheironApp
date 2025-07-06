export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'student';
}

export interface Student {
  id: string;
  name: string;
  username: string;
  email?: string;
  grade?: string;
  class?: string;
  studentNumber?: string;
  lastChatDate?: string;
  chatCount: number;
  isActive: boolean;
  avatar?: string; // プロフィール画像URL
  isDefault?: boolean; // Firebase用：デフォルト生徒フラグ
  createdAt?: string; // Firebase用
  updatedAt?: string; // Firebase用
  loginId?: string; // ログイン用ID
  password?: string; // ログイン用パスワード
}

export interface LoginResult {
  success: boolean;
  user: User;
  token: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  lastActivity: string;
}