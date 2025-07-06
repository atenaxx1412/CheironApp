import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, MessageSquare, BarChart3, Bot, Plus, ThumbsUp, ThumbsDown, Database, LogOut, Trash2, ChevronDown, Settings } from 'lucide-react';
import { AITeacher } from '../types';
import { Student } from '../types/user';
import { ChatSession } from '../types/chat';
import { firebaseFeedbackService, FeedbackStats } from '../services/firebaseFeedbackService';
import { firebaseStudentService } from '../services/firebaseStudentService';
import { firebaseChatService } from '../services/firebaseChatService';
import LazyChatLogViewer from '../components/admin/LazychatLogViewer';
import ChatSessionDetail from '../components/admin/ChatSessionDetail';
import ProfileEditModal from '../components/admin/ProfileEditModal';
import { AITeacherTab } from '../components/admin/AITeacherTab';
import CustomTextArea from '../components/common/CustomTextArea';
import { firebaseAITeacherService } from '../services/firebaseAITeacherService';
import { firebaseAITestFeedbackService, AITestFeedback } from '../services/firebaseAITestFeedbackService';
import { teacherCacheService } from '../services/teacherCacheService';
import { nativeDialog } from '../services/nativeDialog';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai-info' | 'students' | 'history' | 'feedback' | 'ai-test' | 'migration' | 'profile'>('dashboard');
  


  // 開発用データ削除のstate
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showStudentHistoryModal, setShowStudentHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentChatSessions, setStudentChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null);
  const [showChatDetail, setShowChatDetail] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    username: '',
    email: '',
    grade: '',
    class: '',
    studentNumber: '',
    chatCount: 0,
    isActive: true,
    loginId: '',
    password: ''
  });
  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    username: '',
    email: '',
    grade: '',
    class: '',
    studentNumber: '',
    isActive: true
  });
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    totalFeedbacks: 0,
    goodFeedbacks: 0,
    badFeedbacks: 0,
    satisfactionRate: 0,
    averageReproductionScore: 0,
    feedbacksByCategory: {},
    feedbacksByTeacher: {},
    recentFeedbacks: []
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [recentChatSessions, setRecentChatSessions] = useState<ChatSession[]>([]);
  const [allChatSessions, setAllChatSessions] = useState<ChatSession[]>([]);
  
  // AI テスト用の状態
  const [allTeachers, setAllTeachers] = useState<AITeacher[]>([]);
  const [selectedTestTeacher, setSelectedTestTeacher] = useState<AITeacher | null>(null);
  const [testMessages, setTestMessages] = useState<Array<{ text: string; sender: 'user' | 'ai'; timestamp: string }>>([]);
  const [testInput, setTestInput] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    positives: '',
    improvements: '',
    overall: ''
  });
  const [responseLength, setResponseLength] = useState<'auto' | 'short' | 'medium' | 'long'>('auto');
  
  // プロフィール情報を取得（カスタム表示名を考慮）
  const getDisplayName = () => {
    const customName = localStorage.getItem('adminDisplayName');
    const defaultUser = JSON.parse(localStorage.getItem('user') || '{}');
    return customName || defaultUser.displayName || '管理者';
  };
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // URLパラメータの処理
  useEffect(() => {
    const tab = searchParams.get('tab') as 'dashboard' | 'ai-info' | 'students' | 'history' | 'feedback' | 'ai-test' | 'migration' | 'profile';
    const teacherId = searchParams.get('teacherId');
    
    if (tab && ['dashboard', 'ai-info', 'students', 'history', 'feedback', 'ai-test', 'migration', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
    
    if (teacherId && tab === 'ai-test') {
      // AIテストタブで特定の先生が指定されている場合、その先生を選択
      const targetTeacher = allTeachers.find(teacher => teacher.id === teacherId);
      if (targetTeacher) {
        setSelectedTestTeacher(targetTeacher);
      }
    }
  }, [searchParams, allTeachers]);

  // 5回会話完了の検知
  useEffect(() => {
    const userMessages = testMessages.filter(msg => msg.sender === 'user');
    if (userMessages.length === 5 && selectedTestTeacher && !showFeedbackModal) {
      // 5回会話が完了したらフィードバックモーダルを表示
      setShowFeedbackModal(true);
    }
  }, [testMessages, selectedTestTeacher, showFeedbackModal]);

  const loadData = useCallback(async () => {
    try {
      // Firebase students data
      const students = await firebaseStudentService.getAllStudents();
      
      // 全チャットセッションを取得（累計質問数計算用）
      const allChatSessionsData = await firebaseChatService.getAllChatSessions();
      setAllChatSessions(allChatSessionsData);
      setRecentChatSessions(allChatSessionsData.slice(0, 5));
      
      // 各生徒の実際の会話回数と最終会話日を取得
      const studentIds = students.map(student => student.id);
      const chatCounts = await firebaseChatService.getChatCountsForStudents(studentIds);
      
      // 各生徒の最終会話日を取得
      const studentsWithChatData = await Promise.all(
        students.map(async (student) => {
          const lastChatDate = await firebaseChatService.getLastChatDateByStudentId(student.id);
          return {
            ...student,
            chatCount: chatCounts[student.id] || 0,
            lastChatDate: lastChatDate || '-'
          };
        })
      );
      
      setAllStudents(studentsWithChatData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      await nativeDialog.showError('データ読み込み失敗', 'データの読み込みに失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  }, []);

  useEffect(() => {
    // Initialize Firebase students, set up real-time subscription
    const initializeAndLoad = async () => {
      try {
        await loadData();
        
        // フィードバック統計も読み込み
        const stats = await firebaseFeedbackService.getFeedbackStats();
        setFeedbackStats(stats);
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    };
    
    initializeAndLoad();
    
    // Set up real-time subscriptions
    const unsubscribeStudents = firebaseStudentService.subscribeToStudents((students) => {
      setAllStudents(students);
    });
    
    // Set up real-time feedback subscription
    const unsubscribeFeedbacks = firebaseFeedbackService.subscribeToFeedbacks(async () => {
      try {
        const stats = await firebaseFeedbackService.getFeedbackStats();
        setFeedbackStats(stats);
      } catch (error) {
        console.error('フィードバック統計更新エラー:', error);
      }
    });
    
    // Set up real-time chat sessions subscription for dashboard stats
    const unsubscribeChatSessions = firebaseChatService.subscribeToAllChatSessions((sessions) => {
      setAllChatSessions(sessions);
      setRecentChatSessions(sessions.slice(0, 5));
    });
    
    // AI先生のリアルタイム監視
    const unsubscribeTeachers = firebaseAITeacherService.subscribeToTeachers((teachers) => {
      console.log('AI先生データを受信:', teachers.length, '名の先生');
      setAllTeachers(teachers);
    });
    
    return () => {
      unsubscribeStudents();
      unsubscribeFeedbacks();
      unsubscribeChatSessions();
      unsubscribeTeachers();
    };
  }, [loadData]);


  const handleAddStudent = async () => {
    if (!newStudentForm.name || !newStudentForm.username || !newStudentForm.loginId || !newStudentForm.password) {
      await nativeDialog.showWarning('入力エラー', '生徒名、ユーザー名、ログインID、パスワードは必須です', 'すべての項目を入力してください');
      return;
    }

    if (newStudentForm.password.length < 6) {
      await nativeDialog.showWarning('パスワードエラー', 'パスワードは6文字以上で設定してください', `現在のパスワード文字数: ${newStudentForm.password.length}文字`);
      return;
    }

    try {
      // ログインIDの重複チェック
      const existingStudents = await firebaseStudentService.getAllStudents();
      const isDuplicateLoginId = existingStudents.some(student => student.loginId === newStudentForm.loginId);
      
      if (isDuplicateLoginId) {
        await nativeDialog.showWarning('ログインID重複', 'このログインIDは既に使用されています', '別のIDを設定してください。ログインIDは学生ごとに一意である必要があります。');
        return;
      }

      await firebaseStudentService.addStudent({
        name: newStudentForm.name,
        username: newStudentForm.username,
        email: newStudentForm.email,
        grade: newStudentForm.grade,
        class: newStudentForm.class,
        studentNumber: newStudentForm.studentNumber,
        chatCount: newStudentForm.chatCount,
        isActive: newStudentForm.isActive,
        loginId: newStudentForm.loginId,
        password: newStudentForm.password
      });

      setNewStudentForm({
        name: '',
        username: '',
        email: '',
        grade: '',
        class: '',
        studentNumber: '',
        chatCount: 0,
        isActive: true,
        loginId: '',
        password: ''
      });
      setShowAddStudentModal(false);
      await loadData();
      await nativeDialog.showInfo('生徒追加完了', `${newStudentForm.name}を追加しました！`, '新しい生徒がシステムに登録されました。');
    } catch (error) {
      console.error('生徒追加エラー:', error);
      await nativeDialog.showError('生徒追加失敗', '生徒の追加に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`${studentName}を削除してもよろしいですか？\nこの操作は取り消すことができません。`)) {
      return;
    }

    try {
      await firebaseStudentService.deleteStudent(studentId);
      await loadData();
      await nativeDialog.showInfo('生徒削除完了', `${studentName}を削除しました`, '生徒情報がシステムから削除されました。');
    } catch (error) {
      console.error('生徒削除エラー:', error);
      await nativeDialog.showError('生徒削除失敗', '削除に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setEditStudentForm({
      name: student.name,
      username: student.username,
      email: student.email || '',
      grade: student.grade || '',
      class: student.class || '',
      studentNumber: student.studentNumber || '',
      isActive: student.isActive
    });
    setShowEditStudentModal(true);
  };

  const handleSaveEditStudent = async () => {
    if (!selectedStudent) return;
    
    if (!editStudentForm.name || !editStudentForm.username) {
      await nativeDialog.showWarning('入力エラー', '生徒名とユーザー名は必須です', 'すべての必須項目を入力してください。');
      return;
    }

    try {
      await firebaseStudentService.updateStudent(selectedStudent.id, {
        name: editStudentForm.name,
        username: editStudentForm.username,
        email: editStudentForm.email,
        grade: editStudentForm.grade,
        class: editStudentForm.class,
        studentNumber: editStudentForm.studentNumber,
        isActive: editStudentForm.isActive
      });

      setShowEditStudentModal(false);
      setSelectedStudent(null);
      await loadData();
      await nativeDialog.showInfo('更新完了', '生徒情報を更新しました！', '生徒データが正常に更新されました。');
    } catch (error) {
      console.error('生徒更新エラー:', error);
      await nativeDialog.showError('更新失敗', '更新に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleShowStudentHistory = async (student: Student) => {
    setSelectedStudent(student);
    setStudentChatSessions([]); // ローディング中は空にする
    setShowStudentHistoryModal(true);
    
    try {
      // Firebaseから実際の会話履歴を取得
      const chatSessions = await firebaseChatService.getStudentChatSessions(student.id);
      setStudentChatSessions(chatSessions);
    } catch (error) {
      console.error('会話履歴の取得に失敗:', error);
      setStudentChatSessions([]);
    }
  };

  // ダッシュボードの統計データを計算
  const getDashboardStats = () => {
    const activeStudents = allStudents.filter(s => s.isActive);
    const today = new Date().toISOString().split('T')[0];
    
    console.log('ダッシュボード統計計算:', {
      allTeachersCount: allTeachers.length,
      allStudentsCount: allStudents.length,
      activeStudentsCount: activeStudents.length
    });
    
    // 今日のチャット数（実際のFirebaseデータから計算）
    const todayChats = recentChatSessions.filter(session => 
      session.updatedAt.startsWith(today)
    ).length;
    
    // 緊急チャット数（実際のFirebaseデータから計算）
    const urgentChats = recentChatSessions.filter(session => 
      session.urgencyLevel > 3
    ).length;
    
    // 人気カテゴリの計算（実際のチャットセッションから）
    const categoryStats = recentChatSessions.reduce((acc, session) => {
      acc[session.category] = (acc[session.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const popularCategory = Object.entries(categoryStats).reduce((prev, [category, count]) => 
      count > prev.count ? { name: category, count } : prev,
      { name: '進路', count: 0 }
    );

    // 累計質問数を全チャットセッションの実際のメッセージから計算
    const totalQuestions = allChatSessions.reduce((total, session) => {
      // 各セッションでユーザーからのメッセージ（質問）数をカウント
      const userMessages = session.messages.filter(msg => msg.sender === 'user');
      return total + userMessages.length;
    }, 0);

    return {
      todayChats,
      activeStudents: activeStudents.length,
      popularCategory: popularCategory.name,
      urgentChats,
      totalTeachers: allTeachers.length, // Firebaseから取得したAI先生数
      totalQuestions // Firebase から実際の累計質問数を計算
    };
  };

  // チャットセッションから表示用データを生成
  const formatRecentChats = (sessions: ChatSession[]) => {
    return sessions.map(session => ({
      id: session.id,
      time: new Date(session.updatedAt).toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      student: session.studentName,
      category: session.category,
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]?.text.slice(0, 30) + '...' || 'メッセージなし',
      urgent: session.urgencyLevel > 3
    }));
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // ローカルストレージをクリア
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('adminDisplayName');
    
    // モーダルを閉じる
    setShowLogoutConfirm(false);
    
    // Electronの場合はページ全体をリロード
    window.location.reload();
  };

  // プロフィール保存ハンドラー
  const handleSaveProfile = (newDisplayName: string) => {
    localStorage.setItem('adminDisplayName', newDisplayName);
    console.log('管理者表示名を更新:', newDisplayName);
  };

  // データベース削除機能
  const handleDeleteAllChats = async () => {
    if (!window.confirm('全てのチャットデータを削除します。\nこの操作は取り消すことができません。\n続行しますか？')) {
      return;
    }
    
    try {
      const result = await firebaseChatService.deleteAllChatData();
      setShowDeleteModal(false);
      await loadData();
      await nativeDialog.showInfo('データ削除完了', '全てのチャットデータを削除しました', `削除されたセッション: ${result.deletedSessions}件\n削除されたメッセージ: ${result.deletedMessages}件`);
    } catch (error) {
      console.error('チャットデータ削除エラー:', error);
      await nativeDialog.showError('削除失敗', 'チャットデータの削除に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleDeleteOldChats = async (days: number) => {
    if (!window.confirm(`${days}日より古いチャットデータを削除します。\nこの操作は取り消すことができません。\n続行しますか？`)) {
      return;
    }
    
    try {
      const result = await firebaseChatService.deleteOldChatData(days);
      setShowDeleteModal(false);
      await loadData();
      await nativeDialog.showInfo('古いデータ削除完了', `${days}日より古いチャットデータを削除しました`, `削除されたセッション: ${result.deletedSessions}件\n削除されたメッセージ: ${result.deletedMessages}件`);
    } catch (error) {
      console.error('古いチャットデータ削除エラー:', error);
      await nativeDialog.showError('削除失敗', '古いチャットデータの削除に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  // AI テスト機能のハンドラー
  const handleTestTeacherSelect = (teacher: AITeacher) => {
    console.log('AI先生選択:', teacher.displayName);
    setSelectedTestTeacher(teacher);
    
    const initialMessage = {
      text: `こんにちは！${teacher.displayName}です。AIテストを開始します。何でもお気軽に質問してください。AI応答の精度を確認していただけます。`,
      sender: 'ai' as const,
      timestamp: new Date().toISOString()
    };
    
    setTestMessages([initialMessage]);
    console.log('初期メッセージ設定完了:', initialMessage);
  };

  const handleTestMessageSend = async () => {
    if (!testInput.trim() || !selectedTestTeacher || isTestingAI) return;
    
    const sessionId = `test_${selectedTestTeacher.id}_${Date.now()}`;
    const messageId = `msg_${Date.now()}`;
    
    const userMessage = {
      text: testInput,
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    };
    
    setTestMessages(prev => [...prev, userMessage]);
    const currentInput = testInput;
    setTestInput('');
    setIsTestingAI(true);

    try {
      // キャッシュから既存の文脈を取得
      const existingCache = await teacherCacheService.getTopicCache(selectedTestTeacher.id, sessionId);
      
      // ユーザーメッセージをキャッシュに追加
      const userCachedMessage = {
        id: messageId,
        text: currentInput,
        sender: 'user' as const,
        timestamp: new Date().toISOString(),
        importance: 'medium' as const,
        tokens: Math.ceil(currentInput.length / 1.5) // 日本語概算
      };

      if (existingCache) {
        await teacherCacheService.updateTopicCache(selectedTestTeacher.id, sessionId, userCachedMessage);
      } else {
        // 新しいキャッシュを作成
        await teacherCacheService.saveTopicCache({
          sessionId,
          teacherId: selectedTestTeacher.id,
          messages: [userCachedMessage],
          contextTokens: userCachedMessage.tokens,
          topicSummary: `AI先生テスト: ${currentInput.substring(0, 50)}...`,
          lastUpdated: new Date().toISOString(),
          cacheExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
      }

      // aiChatServiceを使用してAI応答を生成（応答長制御機能付き）
      const { aiChatService } = await import('../services/aiChatService');
      const chatResponse = await aiChatService.sendMessage({
        message: currentInput,
        teacherId: selectedTestTeacher.id,
        category: '日常会話',
        sessionId: sessionId,
        useCache: true,
        responseLength: responseLength // ユーザー選択の応答長
      });

      const aiMessage = {
        text: chatResponse.response,
        sender: 'ai' as const,
        timestamp: new Date().toISOString()
      };
      
      setTestMessages(prev => [...prev, aiMessage]);

      // AI応答もキャッシュに保存
      const aiCachedMessage = {
        id: `ai_${Date.now()}`,
        text: chatResponse.response,
        sender: 'ai' as const,
        timestamp: new Date().toISOString(),
        importance: 'high' as const, // AI応答は重要度高
        tokens: Math.ceil(chatResponse.response.length / 1.5)
      };

      await teacherCacheService.updateTopicCache(selectedTestTeacher.id, sessionId, aiCachedMessage);

      // ファインチューニング用データも保存
      const conversationContext = testMessages.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
      await teacherCacheService.saveTrainingData(selectedTestTeacher.id, {
        id: `training_${Date.now()}`,
        context: conversationContext,
        userMessage: currentInput,
        aiResponse: chatResponse.response,
        quality: 8, // テストモードでは高品質と仮定
        responseLength: chatResponse.response.length,
        topic: 'AIテスト',
        timestamp: new Date().toISOString()
      });

      console.log('キャッシュとトレーニングデータ保存完了');

    } catch (error) {
      console.error('AI応答生成エラー:', error);
      const errorMessage = {
        text: 'AI応答の生成に失敗しました。再度お試しください。',
        sender: 'ai' as const,
        timestamp: new Date().toISOString()
      };
      setTestMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleResetTestChat = () => {
    setTestMessages([]);
    setSelectedTestTeacher(null);
    setTestInput('');
  };

  // ドロップダウンの表示状態管理
  const [openDropdowns, setOpenDropdowns] = useState<{[key: string]: boolean}>({});

  // 新しいグループ化されたナビゲーション構造
  const navigationGroups = [
    {
      id: 'dashboard',
      label: 'ダッシュボード',
      icon: BarChart3,
      type: 'single' as const,
      tabId: 'dashboard'
    },
    {
      id: 'ai-management',
      label: 'AI管理',
      icon: Bot,
      type: 'dropdown' as const,
      items: [
        { id: 'ai-info', label: 'AI情報', icon: Bot },
        { id: 'ai-test', label: 'AIテスト', icon: MessageSquare }
      ]
    },
    {
      id: 'learning',
      label: '学習管理',
      icon: Users,
      type: 'dropdown' as const,
      items: [
        { id: 'students', label: '生徒管理', icon: Users },
        { id: 'history', label: '会話履歴', icon: MessageSquare },
        { id: 'feedback', label: 'フィードバック', icon: ThumbsUp }
      ]
    },
    {
      id: 'settings',
      label: '設定',
      icon: Settings,
      type: 'dropdown' as const,
      items: [
        { id: 'profile', label: 'プロフィール', icon: Users },
        { id: 'migration', label: 'データ管理', icon: Database }
      ]
    }
  ];

  // ドロップダウンの開閉切り替え（1つだけ開くように制御）
  const toggleDropdown = (groupId: string) => {
    setOpenDropdowns(prev => {
      const isCurrentlyOpen = prev[groupId];
      
      if (isCurrentlyOpen) {
        // 現在開いているドロップダウンをクリックした場合は閉じる
        return {};
      } else {
        // 新しいドロップダウンを開く場合は、他をすべて閉じて新しいのだけ開く
        return { [groupId]: true };
      }
    });
  };

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        const dashboardStats = getDashboardStats();
        const recentChats = formatRecentChats(recentChatSessions);
        
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setActiveTab('ai-info')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Bot size={16} />
                  <span>AI管理</span>
                </button>
                <button 
                  onClick={() => setActiveTab('students')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <Users size={16} />
                  <span>生徒管理</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          今日のチャット数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats.todayChats}件</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          アクティブ生徒
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats.activeStudents}人</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          人気カテゴリ
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{dashboardStats.popularCategory}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          緊急チャット
                        </dt>
                        <dd className="text-lg font-medium text-red-600">{dashboardStats.urgentChats}件</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    最近のチャット
                  </h3>
                  <div className="space-y-3">
                    {recentChats.length > 0 ? recentChats.map((item, index) => (
                      <div key={item.id || index} className="flex flex-col py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">{item.time}</span>
                            <span className="text-sm font-medium">{item.student}</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.category}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {item.messageCount}件
                            </span>
                            {item.urgent && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                緊急
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => setActiveTab('history')}
                            className="text-blue-600 hover:text-blue-500 text-sm"
                          >
                            詳細
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 ml-0">
                          最新: {item.lastMessage}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>まだチャット履歴がありません</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    システム概要
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">登録AI先生数</span>
                      <span className="text-lg font-semibold text-gray-900">{dashboardStats.totalTeachers}名</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">登録生徒数</span>
                      <span className="text-lg font-semibold text-gray-900">{allStudents.length}名</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">累計の会話数</span>
                      <span className="text-lg font-semibold text-gray-900">{dashboardStats.totalQuestions}件</span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <button 
                        onClick={() => setActiveTab('history')}
                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        全ての履歴を表示
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai-info':
        return <AITeacherTab />;

      case 'students':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">生徒管理</h2>
              <button 
                onClick={() => setShowAddStudentModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>新規生徒追加</span>
              </button>
            </div>
            
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生徒名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      学年・クラス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終会話
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      会話回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.grade && student.class ? `${student.grade} ${student.class}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.lastChatDate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          student.chatCount === 0 ? 'bg-gray-100 text-gray-600' :
                          student.chatCount < 5 ? 'bg-blue-100 text-blue-700' :
                          student.chatCount < 10 ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {student.chatCount}回
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button 
                          onClick={() => handleShowStudentHistory(student)}
                          className="text-blue-600 hover:text-blue-500"
                        >
                          履歴
                        </button>
                        <button 
                          onClick={() => handleEditStudent(student)}
                          className="text-green-600 hover:text-green-500"
                        >
                          編集
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="text-red-600 hover:text-red-500"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'history':
        if (showChatDetail && selectedChatSession) {
          return (
            <ChatSessionDetail
              session={selectedChatSession}
              onBack={() => {
                setShowChatDetail(false);
                setSelectedChatSession(null);
              }}
              onUpdateSession={(sessionId, updates) => {
                // セッション更新処理は必要に応じて実装
                console.log('セッション更新:', sessionId, updates);
              }}
            />
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">会話履歴</h2>
              <div className="text-sm text-gray-600 flex items-center space-x-1">
                <span>リアルタイム更新中</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <LazyChatLogViewer
              onSessionSelect={(session) => {
                setSelectedChatSession(session);
                setShowChatDetail(true);
              }}
            />
          </div>
        );

      case 'feedback':
        // フィードバック統計はstateから取得（useEffectで読み込み済み）
        
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">フィードバック管理</h2>
            
            {/* 統計サマリー */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          総フィードバック数
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">{feedbackStats.totalFeedbacks}件</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ThumbsUp className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          良い評価
                        </dt>
                        <dd className="text-lg font-medium text-green-600">{feedbackStats.goodFeedbacks}件</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ThumbsDown className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          悪い評価
                        </dt>
                        <dd className="text-lg font-medium text-red-600">{feedbackStats.badFeedbacks}件</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          満足度
                        </dt>
                        <dd className="text-lg font-medium text-blue-600">{feedbackStats.satisfactionRate.toFixed(1)}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Bot className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          再現度スコア
                        </dt>
                        <dd className="text-lg font-medium text-purple-600">
                          {feedbackStats.averageReproductionScore > 0 ? feedbackStats.averageReproductionScore.toFixed(1) : 'N/A'}/10
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 先生別フィードバック */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    先生別フィードバック
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(feedbackStats.feedbacksByTeacher).map(([teacherId, stats]) => (
                      <div key={teacherId} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">{stats.name}</span>
                          {stats.averageReproduction && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              再現度: {stats.averageReproduction.toFixed(1)}/10
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <ThumbsUp size={14} className="text-green-500" />
                            <span className="text-sm text-green-600">{stats.good}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsDown size={14} className="text-red-500" />
                            <span className="text-sm text-red-600">{stats.bad}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {stats.good + stats.bad > 0 ? `${((stats.good / (stats.good + stats.bad)) * 100).toFixed(1)}%` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* カテゴリ別フィードバック */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    カテゴリ別フィードバック
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(feedbackStats.feedbacksByCategory).map(([category, stats]) => (
                      <div key={category} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">{category}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <ThumbsUp size={14} className="text-green-500" />
                            <span className="text-sm text-green-600">{stats.good}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsDown size={14} className="text-red-500" />
                            <span className="text-sm text-red-600">{stats.bad}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {stats.good + stats.bad > 0 ? `${((stats.good / (stats.good + stats.bad)) * 100).toFixed(1)}%` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 最近のフィードバック */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  最近のフィードバック
                </h3>
                <div className="space-y-4">
                  {feedbackStats.recentFeedbacks.length > 0 ? feedbackStats.recentFeedbacks.map((feedback) => (
                    <div key={feedback.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`flex items-center space-x-1 ${
                              feedback.type === 'good' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {feedback.type === 'good' ? (
                                <ThumbsUp size={16} />
                              ) : (
                                <ThumbsDown size={16} />
                              )}
                              <span className="text-sm font-medium">
                                {feedback.type === 'good' ? '良い評価' : '悪い評価'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(feedback.timestamp).toLocaleString()}
                            </span>
                            {feedback.reproductionScore && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                再現度: {feedback.reproductionScore}/10
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-900 mb-2">
                            <strong>生徒:</strong> {feedback.studentName} | 
                            <strong> 先生:</strong> {feedback.teacherName} | 
                            <strong> カテゴリ:</strong> {feedback.category}
                          </div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {feedback.messageText}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>まだフィードバックがありません</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai-test':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">AIテストチャット</h2>
              <div className="text-sm text-gray-600">
                AI先生の応答精度をテストできます
              </div>
            </div>

            {!selectedTestTeacher ? (
              // 先生選択画面
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">テストする先生を選択してください</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTeachers.map((teacher: AITeacher) => (
                    <div
                      key={teacher.id}
                      onClick={() => handleTestTeacherSelect(teacher)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all group"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                          {teacher.image ? (
                            <img src={teacher.image} alt={teacher.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">👨‍🏫</div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600">{teacher.displayName}</h4>
                          <p className="text-sm text-gray-500">{teacher.specialties.join(', ')}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{teacher.personality}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // チャット画面
              <div className="bg-white rounded-lg shadow-sm border">
                {/* ヘッダー */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                        {selectedTestTeacher.image ? (
                          <img src={selectedTestTeacher.image} alt={selectedTestTeacher.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">👨‍🏫</div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedTestTeacher.displayName}</h3>
                        <p className="text-sm text-gray-500">テストモード</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleResetTestChat}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        リセット
                      </button>
                      <button
                        onClick={() => setSelectedTestTeacher(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        先生を変更
                      </button>
                    </div>
                  </div>
                </div>

                {/* チャットメッセージ */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {testMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTestingAI && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 入力フォーム */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestMessageSend()}
                      placeholder="メッセージを入力してください..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isTestingAI}
                    />
                    <button
                      onClick={handleTestMessageSend}
                      disabled={!testInput.trim() || isTestingAI}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTestingAI ? '送信中...' : '送信'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      💡 ヒント: 先生の専門分野や性格に関する質問をして、AI応答の精度を確認してください
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-600">応答長:</label>
                      <select
                        value={responseLength}
                        onChange={(e) => setResponseLength(e.target.value as 'auto' | 'short' | 'medium' | 'long')}
                        className="text-xs pl-2 pr-4 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="auto">自動</option>
                        <option value="short">短め</option>
                        <option value="medium">普通</option>
                        <option value="long">詳しく</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 応答長制御機能の案内 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span>AI応答長最適化機能</span>
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>このテストチャットでは、Claude風の自然な応答長制御を体験できます：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>自動</strong>: メッセージ内容と文脈から最適な長さを自動判定</li>
                  <li><strong>短め</strong>: 簡潔な1-2文での応答（挨拶や確認に最適）</li>
                  <li><strong>普通</strong>: 2-4文での適度な応答（一般的な質問に最適）</li>
                  <li><strong>詳しく</strong>: 4-6文での詳細な応答（説明や相談に最適）</li>
                </ul>
                <p className="text-xs pt-1 flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3 text-blue-500" />
                  <span>過去の会話履歴も考慮して、自然な長さ調整を行います</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        // プロフィール設定画面
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">プロフィール設定</h2>
              <div className="text-sm text-gray-600">
                管理者プロフィールの編集
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Users size={20} />
                    <span>プロフィールを編集</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'migration':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">データ管理</h2>
              <div className="text-sm text-gray-600">
                データベースのメンテナンスおよび削除機能
              </div>
            </div>
            
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">チャットデータの削除</h3>
                <p className="text-sm text-gray-600 mb-6">
                  開発中のテストデータや古いチャットデータを削除できます。この操作は取り消すことができません。
                </p>
                
                <div className="space-y-4">
                  {/* 全削除ボタン */}
                  <div className="border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-700 mb-2">全チャットデータ削除</h4>
                    <p className="text-sm text-red-600 mb-3">
                      全てのチャットセッションとメッセージを削除します。
                    </p>
                    <button
                      onClick={handleDeleteAllChats}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Trash2 size={16} />
                      <span>全て削除</span>
                    </button>
                  </div>
                  
                  {/* 部分削除オプション */}
                  <div className="border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-700 mb-2">古いデータの削除</h4>
                    <p className="text-sm text-yellow-600 mb-3">
                      指定した期間より古いチャットデータを削除します。
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleDeleteOldChats(1)}
                        className="py-2 px-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                      >
                        1日より古い
                      </button>
                      <button
                        onClick={() => handleDeleteOldChats(3)}
                        className="py-2 px-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                      >
                        3日より古い
                      </button>
                      <button
                        onClick={() => handleDeleteOldChats(7)}
                        className="py-2 px-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                      >
                        1週間より古い
                      </button>
                      <button
                        onClick={() => handleDeleteOldChats(30)}
                        className="py-2 px-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                      >
                        1ヶ月より古い
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-700 mb-2">データベース情報</h4>
                    <div className="text-sm text-blue-600">
                      <p>現在のチャットセッション数: {allChatSessions.length}件</p>
                      <p>登録生徒数: {allStudents.length}名</p>
                      <p>登録AI先生数: {allTeachers.length}名</p>
                      <p>フィードバック数: {feedbackStats.totalFeedbacks}件</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {/* Cheiron Logo and Name */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img 
                    src="./Cheiron_64x64.png" 
                    alt="Cheiron Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Cheiron 管理画面</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                {navigationGroups.map((group) => {
                  const GroupIcon = group.icon;
                  
                  if (group.type === 'single') {
                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveTab(group.tabId as any)}
                        className={`${
                          activeTab === group.tabId
                            ? 'border-blue-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        } border-b-2 py-3 px-3 flex items-center space-x-2 text-sm font-medium`}
                      >
                        <GroupIcon size={14} />
                        <span>{group.label}</span>
                      </button>
                    );
                  }
                  
                  // ドロップダウンメニュー
                  const isGroupActive = group.items?.some(item => activeTab === item.id);
                  const isOpen = openDropdowns[group.id];
                  
                  return (
                    <div key={group.id} className="relative dropdown-container">
                      <button
                        onClick={() => toggleDropdown(group.id)}
                        className={`${
                          isGroupActive
                            ? 'border-blue-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        } border-b-2 py-3 px-2 flex items-center space-x-1 text-xs font-medium`}
                      >
                        <GroupIcon size={14} />
                        <span>{group.label}</span>
                        <ChevronDown 
                          size={12} 
                          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      
                      {/* ドロップダウンメニュー */}
                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          {group.items?.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveTab(item.id as any);
                                  setOpenDropdowns({}); // 全ドロップダウンを閉じる
                                }}
                                className={`${
                                  activeTab === item.id
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-700 hover:bg-gray-50'
                                } w-full text-left px-4 py-3 flex items-center space-x-2 text-sm first:rounded-t-lg last:rounded-b-lg`}
                              >
                                <ItemIcon size={16} />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {getDisplayName()}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="ログアウト"
                >
                  <LogOut size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {renderContent()}
      </main>

      {/* AI先生追加モーダルは独立コンポーネントに移動済み */}

      {/* 生徒追加モーダル */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新しい生徒を追加</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生徒名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({...newStudentForm, name: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 山田太郎"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.username}
                    onChange={(e) => setNewStudentForm({...newStudentForm, username: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: yamada_taro"
                  />
                </div>
              </div>

              {/* ログイン情報セクション */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-3">ログイン情報</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ログインID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStudentForm.loginId}
                      onChange={(e) => setNewStudentForm({...newStudentForm, loginId: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例: student001"
                    />
                    <p className="mt-1 text-xs text-gray-500">生徒がログインに使用するIDです</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      パスワード <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newStudentForm.password}
                      onChange={(e) => setNewStudentForm({...newStudentForm, password: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="パスワードを入力"
                    />
                    <p className="mt-1 text-xs text-gray-500">8文字以上を推奨します</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({...newStudentForm, email: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: yamada@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学年
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.grade}
                    onChange={(e) => setNewStudentForm({...newStudentForm, grade: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 高校2年"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クラス
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.class}
                    onChange={(e) => setNewStudentForm({...newStudentForm, class: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: A組"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学籍番号
                  </label>
                  <input
                    type="text"
                    value={newStudentForm.studentNumber}
                    onChange={(e) => setNewStudentForm({...newStudentForm, studentNumber: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 2024001"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setNewStudentForm({
                    name: '',
                    username: '',
                    email: '',
                    grade: '',
                    class: '',
                    studentNumber: '',
                    chatCount: 0,
                    isActive: true,
                    loginId: '',
                    password: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生徒編集モーダル */}
      {showEditStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">生徒情報編集</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生徒名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.name}
                    onChange={(e) => setEditStudentForm({...editStudentForm, name: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 山田太郎"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.username}
                    onChange={(e) => setEditStudentForm({...editStudentForm, username: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: yamada_taro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) => setEditStudentForm({...editStudentForm, email: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: yamada@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学年
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.grade}
                    onChange={(e) => setEditStudentForm({...editStudentForm, grade: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 高校2年"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クラス
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.class}
                    onChange={(e) => setEditStudentForm({...editStudentForm, class: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: A組"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学籍番号
                  </label>
                  <input
                    type="text"
                    value={editStudentForm.studentNumber}
                    onChange={(e) => setEditStudentForm({...editStudentForm, studentNumber: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 2024001"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editStudentForm.isActive}
                    onChange={(e) => setEditStudentForm({...editStudentForm, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">アクティブ状態</span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditStudentModal(false);
                  setSelectedStudent(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEditStudent}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 生徒履歴モーダル */}
      {showStudentHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedStudent.name}の会話履歴
              </h3>
              <button
                onClick={() => {
                  setShowStudentHistoryModal(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">学年・クラス:</span>
                  <p>{selectedStudent.grade && selectedStudent.class ? `${selectedStudent.grade} ${selectedStudent.class}` : '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">学籍番号:</span>
                  <p>{selectedStudent.studentNumber || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">会話回数:</span>
                  <p>{selectedStudent.chatCount}回</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">最終会話:</span>
                  <p>{selectedStudent.lastChatDate || '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">会話履歴</h4>
              <div className="space-y-3">
                {studentChatSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>会話履歴がありません</p>
                  </div>
                ) : (
                  studentChatSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">
                            {new Date(session.createdAt).toLocaleString('ja-JP')}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {session.category}
                          </span>
                          <span className="text-sm text-gray-600">
                            {session.isAnonymous ? '匿名' : session.studentName}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {session.status === 'active' ? '進行中' : '完了'}
                          </span>
                        </div>
                        <button 
                          className="text-blue-600 hover:text-blue-500 text-sm"
                          onClick={() => {
                            setSelectedChatSession(session);
                            setShowChatDetail(true);
                          }}
                        >
                          詳細表示
                        </button>
                      </div>
                      <p className="text-sm text-gray-700">
                        {session.messages && session.messages.length > 0 
                          ? session.messages[0].text.substring(0, 100) + (session.messages[0].text.length > 100 ? '...' : '')
                          : '会話が開始されていません'
                        }
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* プロフィール編集モーダル */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={{
          id: user.id || 'admin',
          username: user.username || 'admin',
          displayName: getDisplayName(),
          role: user.role || 'admin'
        }}
        onSave={handleSaveProfile}
      />

      {/* 開発用データ削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <Database className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">開発用データ削除</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                開発中のチャットデータを削除できます。この操作は取り消せません。
              </p>
              
              <div className="space-y-3">
                {/* 全削除ボタン */}
                <button
                  onClick={handleDeleteAllChats}
                  disabled={false}
                  className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>全チャットデータを削除</span>
                </button>
                
                {/* 部分削除オプション */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDeleteOldChats(1)}
                    disabled={false}
                    className="py-2 px-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 text-sm"
                  >
                    1日より古い
                  </button>
                  <button
                    onClick={() => handleDeleteOldChats(3)}
                    disabled={false}
                    className="py-2 px-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 text-sm"
                  >
                    3日より古い
                  </button>
                  <button
                    onClick={() => handleDeleteOldChats(7)}
                    disabled={false}
                    className="py-2 px-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
                  >
                    1週間より古い
                  </button>
                  <button
                    onClick={() => handleDeleteOldChats(30)}
                    disabled={false}
                    className="py-2 px-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm"
                  >
                    1ヶ月より古い
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ 削除対象: chatSessionsとmessagesコレクション<br/>
                  📊 現在のデータ数はコンソールで確認できます
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={false}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィードバック入力モーダル */}
      {showFeedbackModal && selectedTestTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                AIテストのフィードバック
              </h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {selectedTestTeacher.displayName}との5回の会話が完了しました。フィードバックをお聞かせください。
              </p>

              {/* 評価 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  総合評価（1-10点）
                </label>
                <select
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm({...feedbackForm, rating: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}点</option>
                  ))}
                </select>
              </div>

              {/* 良かった点 */}
              <CustomTextArea
                label="良かった点"
                value={feedbackForm.positives}
                onChange={(e) => setFeedbackForm({...feedbackForm, positives: e.target.value})}
                rows={3}
                variant="modern"
                placeholder="AI先生の応答で良かった点をお書きください"
              />

              {/* 改善点 */}
              <CustomTextArea
                label="改善してほしい点"
                value={feedbackForm.improvements}
                onChange={(e) => setFeedbackForm({...feedbackForm, improvements: e.target.value})}
                rows={3}
                variant="modern"
                placeholder="改善してほしい点があればお書きください"
              />

              {/* 全体的な感想 */}
              <CustomTextArea
                label="全体的な感想"
                value={feedbackForm.overall}
                onChange={(e) => setFeedbackForm({...feedbackForm, overall: e.target.value})}
                rows={3}
                variant="modern"
                placeholder="全体的な感想をお聞かせください"
              />
            </div>

            {/* ボタン */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                後で入力
              </button>
              <button
                onClick={async () => {
                  try {
                    // フィードバックデータの保存
                    const feedbackData: Omit<AITestFeedback, 'id'> = {
                      teacherId: selectedTestTeacher.id,
                      teacherName: selectedTestTeacher.displayName,
                      rating: feedbackForm.rating,
                      positives: feedbackForm.positives,
                      improvements: feedbackForm.improvements,
                      overall: feedbackForm.overall,
                      timestamp: new Date().toISOString(),
                      testerName: getDisplayName()
                    };

                    await firebaseAITestFeedbackService.saveFeedback(feedbackData);
                    
                    // モーダルを閉じる
                    setShowFeedbackModal(false);
                    
                    // フォームをリセット
                    setFeedbackForm({
                      rating: 5,
                      positives: '',
                      improvements: '',
                      overall: ''
                    });
                    
                    // テストメッセージをリセット
                    setTestMessages([]);
                    
                    await nativeDialog.showInfo('送信完了', 'フィードバックを送信しました。ありがとうございます！');
                  } catch (error) {
                    console.error('フィードバック保存エラー:', error);
                    await nativeDialog.showError('保存失敗', 'フィードバックの保存に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ログアウト確認ダイアログ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ログアウト確認</h3>
              <p className="text-gray-600 mb-6">本当にログアウトしますか？</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;