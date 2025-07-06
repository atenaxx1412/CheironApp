export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SendChatRequest {
  question: string;
  category: string;
  mode: string;
  studentId: string;
  isAnonymous?: boolean;
  urgencyLevel?: number;
}

export interface SendChatResponse {
  success: boolean;
  response: string;
  timestamp: string;
}

export interface Question {
  id: number;
  category: string;
  question: string;
  answerTemplate?: string;
  keywords?: string[];
  difficultyLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: number;
  name: string;
  teachingExperience: number;
  personality: string;
  teachingStyle: {
    approach: string;
    tone: string;
    responseLength: string;
  };
  expertise: string[];
  catchphrases: string[];
  specialties: {
    進路: string;
    学習: string;
    人間関係: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}