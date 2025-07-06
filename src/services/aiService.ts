import { AITeacher, QuestionData } from '../types';

// JSON data imports
import aiTeachersData from '../data/ai-teachers.json';
import settingsData from '../data/settings.json';
import careerQuestionsData from '../data/questions/career.json';
import studyQuestionsData from '../data/questions/study.json';
import relationshipQuestionsData from '../data/questions/relationship.json';

export const dataService = {
  // Load data from JSON files
  loadTeachers: () => {
    return aiTeachersData;
  },

  loadSettings: () => {
    return settingsData;
  },

  loadQuestions: (category?: string) => {
    if (category) {
      switch (category) {
        case '進路':
          return careerQuestionsData.questions;
        case '学習':
          return studyQuestionsData.questions;
        case '人間関係':
          return relationshipQuestionsData.questions;
        default:
          return [];
      }
    }
    // Return all questions
    return [
      ...careerQuestionsData.questions,
      ...studyQuestionsData.questions,
      ...relationshipQuestionsData.questions
    ];
  },

  getCurrentTeacher: (): AITeacher => {
    const teachersData = dataService.loadTeachers();
    const currentTeacherId = teachersData.currentTeacherId;
    const teacher = teachersData.teachers.find(t => t.id === currentTeacherId);
    return teacher || teachersData.teachers[0];
  },

  getQuestionsByCategory: (category: string) => {
    return dataService.loadQuestions(category);
  },

  getAllCategories: () => {
    return dataService.loadSettings().categories;
  },

  getChatModes: () => {
    return dataService.loadSettings().chatModes;
  }
};

export const aiService = {
  // Get current AI teacher settings (using editable data)
  getCurrentTeacher: (): AITeacher => {
    return editableService.getCurrentTeacher();
  },

  // Get teacher display name for chat header
  getTeacherDisplayName: (): string => {
    const teacher = aiService.getCurrentTeacher();
    return teacher.displayName;
  },

  // Get teacher image
  getTeacherImage: (): string | undefined => {
    const teacher = aiService.getCurrentTeacher();
    return teacher.image;
  },

  // Get teacher greeting
  getTeacherGreeting: (): string => {
    const teacher = aiService.getCurrentTeacher();
    return teacher.greeting || 'こんにちは！今日はどんなことで悩んでいますか？';
  },

  // Get questions for specific category
  getQuestionsByCategory: (category: string): QuestionData[] => {
    return dataService.getQuestionsByCategory(category) as QuestionData[];
  },

  // Get all questions
  getAllQuestions: (): QuestionData[] => {
    return dataService.loadQuestions() as QuestionData[];
  },

  // Get question count by category
  getQuestionCount: (category?: string): number | { '進路': number; '学習': number; '人間関係': number; total: number } => {
    if (category) {
      return dataService.getQuestionsByCategory(category).length;
    }
    return {
      '進路': careerQuestionsData.questions.length,
      '学習': studyQuestionsData.questions.length, 
      '人間関係': relationshipQuestionsData.questions.length,
      total: dataService.loadQuestions().length
    };
  },

  // Get all question counts (returns object only)
  getAllQuestionCounts: () => {
    return {
      '進路': careerQuestionsData.questions.length,
      '学習': studyQuestionsData.questions.length, 
      '人間関係': relationshipQuestionsData.questions.length,
      total: dataService.loadQuestions().length
    };
  }
};

// Editable service for managing teacher data (localStorage based for now)
export const editableService = {
  // Get all teachers (JSON + localStorage additions)
  getAllTeachers: (): AITeacher[] => {
    const baseTeachers = dataService.loadTeachers().teachers;
    const additional = localStorage.getItem('additionalTeachers');
    const updates = localStorage.getItem('teacherUpdates');
    
    let teachers = [...baseTeachers];
    
    // Add additional teachers
    if (additional) {
      try {
        const additionalTeachers = JSON.parse(additional);
        teachers = [...teachers, ...additionalTeachers];
      } catch (error) {
        console.error('Error parsing additional teachers:', error);
      }
    }
    
    // Apply updates to existing teachers
    if (updates) {
      try {
        const teacherUpdates = JSON.parse(updates);
        teachers = teachers.map(teacher => {
          const update = teacherUpdates[teacher.id];
          return update ? { ...teacher, ...update } : teacher;
        });
      } catch (error) {
        console.error('Error parsing teacher updates:', error);
      }
    }
    
    // Filter out inactive teachers
    return teachers.filter(teacher => teacher.isActive !== false);
  },

  // Get current active teacher
  getCurrentTeacher: (): AITeacher => {
    const teachers = editableService.getAllTeachers();
    const currentId = localStorage.getItem('currentTeacherId') || dataService.loadTeachers().currentTeacherId;
    const current = teachers.find(t => t.id === currentId);
    return current || teachers[0];
  },

  // Set current active teacher
  setCurrentTeacher: (teacherId: string): void => {
    localStorage.setItem('currentTeacherId', teacherId);
  },

  // Update teacher profile
  updateTeacher: (teacherId: string, updatedTeacher: Partial<AITeacher>): AITeacher => {
    const teachers = editableService.getAllTeachers();
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) throw new Error('Teacher not found');

    const updated = {
      ...teacher,
      ...updatedTeacher,
      updatedAt: new Date().toISOString()
    };

    // Store updates in localStorage
    const updates = localStorage.getItem('teacherUpdates');
    let teacherUpdates: Record<string, AITeacher> = {};
    if (updates) {
      try {
        teacherUpdates = JSON.parse(updates);
      } catch (error) {
        console.error('Error parsing teacher updates:', error);
      }
    }
    
    teacherUpdates[teacherId] = updated;
    localStorage.setItem('teacherUpdates', JSON.stringify(teacherUpdates));
    
    return updated;
  },

  // Add new teacher
  addTeacher: (newTeacher: Omit<AITeacher, 'id' | 'createdAt' | 'updatedAt'>): AITeacher => {
    const teacher: AITeacher = {
      ...newTeacher,
      id: `teacher_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const additional = localStorage.getItem('additionalTeachers');
    let teachers = [];
    if (additional) {
      try {
        teachers = JSON.parse(additional);
      } catch (error) {
        console.error('Error parsing additional teachers:', error);
      }
    }
    
    teachers.push(teacher);
    localStorage.setItem('additionalTeachers', JSON.stringify(teachers));
    
    return teacher;
  },

  // Delete teacher
  deleteTeacher: (teacherId: string): void => {

    // Check if it's a base teacher (from JSON)
    const baseTeachers = dataService.loadTeachers().teachers;
    const isBaseTeacher = baseTeachers.some(t => t.id === teacherId);
    
    if (isBaseTeacher) {
      // Mark as deleted in updates
      const updates = localStorage.getItem('teacherUpdates');
      let teacherUpdates: Record<string, AITeacher> = {};
      if (updates) {
        try {
          teacherUpdates = JSON.parse(updates);
        } catch (error) {
          console.error('Error parsing teacher updates:', error);
        }
      }
      
      // Mark as inactive instead of deleting
      const teacher = baseTeachers.find(t => t.id === teacherId);
      if (teacher) {
        teacherUpdates[teacherId] = { ...teacher, isActive: false };
        localStorage.setItem('teacherUpdates', JSON.stringify(teacherUpdates));
      }
    } else {
      // Remove from additional teachers
      const additional = localStorage.getItem('additionalTeachers');
      if (additional) {
        try {
          let teachers = JSON.parse(additional);
          teachers = teachers.filter((t: AITeacher) => t.id !== teacherId);
          localStorage.setItem('additionalTeachers', JSON.stringify(teachers));
        } catch (error) {
          console.error('Error parsing additional teachers:', error);
        }
      }
    }
  },

  // Add new question
  addQuestion: (category: string, question: Partial<QuestionData>): QuestionData => {
    const newQuestion: QuestionData = {
      id: `${category.toLowerCase()}_${Date.now()}`,
      question: question.question || '',
      suggestedAnswer: question.suggestedAnswer || '',
      keywords: question.keywords || [],
      difficulty: question.difficulty || 'medium',
      responseType: question.responseType,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Store in localStorage (temporary solution)
    const storageKey = `questions_${category}`;
    const existing = localStorage.getItem(storageKey);
    let questions = [];
    if (existing) {
      try {
        questions = JSON.parse(existing);
      } catch (error) {
        console.error('Error parsing existing questions:', error);
      }
    }
    questions.push(newQuestion);
    localStorage.setItem(storageKey, JSON.stringify(questions));
    
    return newQuestion;
  },

  // Get questions including localStorage additions
  getQuestionsWithAdditions: (category: string): QuestionData[] => {
    const baseQuestions = aiService.getQuestionsByCategory(category);
    const storageKey = `questions_${category}`;
    const additional = localStorage.getItem(storageKey);
    
    if (additional) {
      try {
        const additionalQuestions = JSON.parse(additional);
        return [...baseQuestions, ...additionalQuestions];
      } catch (error) {
        console.error('Error parsing additional questions:', error);
      }
    }
    
    return baseQuestions;
  },

  // Get total question counts including additions
  getQuestionCountsWithAdditions: () => {
    const baseCounts = aiService.getAllQuestionCounts();
    const categories = ['進路', '学習', '人間関係'];
    
    let totalAdditional = 0;
    const counts = { ...baseCounts };
    
    categories.forEach(category => {
      const additional = localStorage.getItem(`questions_${category}`);
      if (additional) {
        try {
          const additionalQuestions = JSON.parse(additional);
          counts[category as keyof typeof counts] += additionalQuestions.length;
          totalAdditional += additionalQuestions.length;
        } catch (error) {
          console.error('Error parsing additional questions:', error);
        }
      }
    });
    
    counts.total += totalAdditional;
    return counts;
  }
};