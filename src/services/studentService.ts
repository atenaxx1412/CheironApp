import { Student } from '../types/user';

// 生徒管理サービス
export const studentService = {
  // すべての生徒を取得
  getAllStudents: (): Student[] => {
    const stored = localStorage.getItem('students');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing students data:', error);
      }
    }
    // デフォルトの生徒データ
    return [
      {
        id: 'student01',
        name: '山田太郎',
        username: 'yamada_taro',
        email: 'yamada@example.com',
        grade: '高校2年',
        class: 'A組',
        studentNumber: '2024001',
        lastChatDate: '今日 15:30',
        chatCount: 5,
        isActive: true,
        createdAt: '2024-06-30T00:00:00.000Z',
        updatedAt: '2024-06-30T00:00:00.000Z'
      },
      {
        id: 'student02',
        name: '佐藤花子',
        username: 'sato_hanako',
        email: 'sato@example.com',
        grade: '高校1年',
        class: 'B組',
        studentNumber: '2024002',
        lastChatDate: '昨日 16:45',
        chatCount: 3,
        isActive: true,
        createdAt: '2024-06-30T00:00:00.000Z',
        updatedAt: '2024-06-30T00:00:00.000Z'
      },
      {
        id: 'student03',
        name: '田中健一',
        username: 'tanaka_kenichi',
        email: 'tanaka@example.com',
        grade: '高校3年',
        class: 'C組',
        studentNumber: '2024003',
        lastChatDate: '2日前 14:20',
        chatCount: 8,
        isActive: true,
        createdAt: '2024-06-30T00:00:00.000Z',
        updatedAt: '2024-06-30T00:00:00.000Z'
      }
    ];
  },

  // 生徒を追加
  addStudent: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student => {
    const students = studentService.getAllStudents();
    const newStudent: Student = {
      ...studentData,
      id: `student_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedStudents = [...students, newStudent];
    localStorage.setItem('students', JSON.stringify(updatedStudents));
    
    return newStudent;
  },

  // 生徒を更新
  updateStudent: (studentId: string, updatedData: Partial<Student>): Student => {
    const students = studentService.getAllStudents();
    const studentIndex = students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }

    const updatedStudent = {
      ...students[studentIndex],
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    students[studentIndex] = updatedStudent;
    localStorage.setItem('students', JSON.stringify(students));
    
    return updatedStudent;
  },

  // 生徒を削除
  deleteStudent: (studentId: string): void => {
    const students = studentService.getAllStudents();
    const filteredStudents = students.filter(s => s.id !== studentId);
    localStorage.setItem('students', JSON.stringify(filteredStudents));
  },

  // 生徒を検索
  searchStudents: (query: string): Student[] => {
    const students = studentService.getAllStudents();
    const lowercaseQuery = query.toLowerCase();
    
    return students.filter(student => 
      student.name.toLowerCase().includes(lowercaseQuery) ||
      student.username.toLowerCase().includes(lowercaseQuery) ||
      student.studentNumber?.toLowerCase().includes(lowercaseQuery) ||
      student.email?.toLowerCase().includes(lowercaseQuery)
    );
  },

  // アクティブな生徒のみ取得
  getActiveStudents: (): Student[] => {
    return studentService.getAllStudents().filter(student => student.isActive);
  }
};