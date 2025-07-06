export interface AITeacher {
  id: string;
  name: string;
  displayName: string;
  personality: string;
  specialties: string[];
  avatar?: string; // オプショナルに変更
  image?: string; // 先生の画像URL
  greeting?: string;
  responseStyles?: {
    normal: string;
    detailed: string;
    quick: string;
    encouraging: string;
  };
  isActive?: boolean;
  isDefault?: boolean; // Firebase用：デフォルト先生フラグ
  createdAt?: string;
  updatedAt?: string;
  
  // 新機能: 返信カスタマイズとNGワード機能
  teacherInfo?: string; // 先生の詳細情報
  freeNotes?: string; // 自由記入欄
  responseCustomization?: {
    enableCustomization: boolean;
    customPrompts?: {
      category?: string; // 特定のカテゴリーでのカスタムプロンプト
      mode?: string; // 特定のモードでのカスタムプロンプト
      prompt: string;
    }[];
    restrictedTopics?: string[]; // 回答しない/制限するトピック
  };
  ngWords?: {
    enabled: boolean;
    words: string[]; // NGワード一覧
    categories: string[]; // NGカテゴリー (政治、宗教、暴力など)
    customMessage?: string; // NGワード検出時のカスタムメッセージ
  };
}

export interface QuestionData {
  id: string;
  question: string;
  suggestedAnswer: string;
  keywords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  responseType?: {
    normal: string;
    detailed: string;
    quick: string;
    encouraging: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface AISettings {
  currentTeacher: AITeacher;
  questionDatabase: QuestionData[];
  totalQuestions: {
    進路: number;
    学習: number;
    人間関係: number;
  };
}