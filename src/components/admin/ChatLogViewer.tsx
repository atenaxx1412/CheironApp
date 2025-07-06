import React, { useState, useEffect } from 'react';
import { ChatSession, Category } from '../../types/chat';
import { firebaseChatService } from '../../services/firebaseChatService';
import { Search, Filter, Calendar, User, MessageSquare, Clock, Eye } from 'lucide-react';

interface ChatLogViewerProps {
  onSessionSelect?: (session: ChatSession) => void;
}

const ChatLogViewer: React.FC<ChatLogViewerProps> = ({ onSessionSelect }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  // リアルタイムでチャットセッションを監視
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = firebaseChatService.subscribeToAllChatSessions((sessions) => {
      setChatSessions(sessions);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...chatSessions];

    // 検索クエリでフィルタ
    if (searchQuery) {
      filtered = filtered.filter(session =>
        session.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.messages.some(msg => 
          msg.text.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // カテゴリでフィルタ
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(session => session.category === selectedCategory);
    }

    // 学生でフィルタ
    if (selectedStudent !== 'all') {
      filtered = filtered.filter(session => session.studentId === selectedStudent);
    }

    // 日付範囲でフィルタ
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (selectedDateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(session => 
        new Date(session.createdAt) >= startDate
      );
    }

    setFilteredSessions(filtered);
  }, [chatSessions, searchQuery, selectedCategory, selectedStudent, selectedDateRange]);

  // 日時フォーマット
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  // メッセージ数を取得
  const getMessageCount = (session: ChatSession) => {
    return {
      user: session.messages.filter(msg => msg.sender === 'user').length,
      ai: session.messages.filter(msg => msg.sender === 'ai').length
    };
  };

  // 最新メッセージを取得
  const getLatestMessage = (session: ChatSession) => {
    const userMessages = session.messages.filter(msg => msg.sender === 'user');
    return userMessages[userMessages.length - 1]?.text || '会話なし';
  };

  // 一意な学生リストを取得
  const getUniqueStudents = () => {
    const students = new Set(chatSessions.map(session => 
      `${session.studentId}:${session.studentName}`
    ));
    return Array.from(students).map(student => {
      const [id, name] = student.split(':');
      return { id, name };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">チャットログを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* フィルターエリア */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter size={20} />
          フィルター・検索
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 検索 */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="学生名・メッセージで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* カテゴリ選択 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全カテゴリ</option>
            <option value="日常会話">日常会話</option>
            <option value="進路">進路相談</option>
            <option value="学習">学習相談</option>
            <option value="人間関係">人間関係</option>
          </select>

          {/* 学生選択 */}
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全学生</option>
            {getUniqueStudents().map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          {/* 期間選択 */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value as 'today' | 'week' | 'month' | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全期間</option>
            <option value="today">今日</option>
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
          </select>
        </div>

        {/* 統計情報 */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{filteredSessions.length}</div>
            <div className="text-sm text-gray-600">セッション数</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredSessions.reduce((total, session) => total + getMessageCount(session).user, 0)}
            </div>
            <div className="text-sm text-gray-600">質問数</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(filteredSessions.map(s => s.studentId)).size}
            </div>
            <div className="text-sm text-gray-600">相談学生数</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredSessions.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">進行中</div>
          </div>
        </div>
      </div>

      {/* チャットセッション一覧 */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">該当するチャットログがありません</p>
            <p className="text-sm text-gray-500 mt-2">検索条件を変更してみてください</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const { date, time } = formatDateTime(session.updatedAt);
            const messageCount = getMessageCount(session);
            const latestMessage = getLatestMessage(session);

            return (
              <div 
                key={session.id}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSessionSelect?.(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {session.isAnonymous ? '匿名ユーザー' : session.studentName}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.category === '進路' ? 'bg-blue-100 text-blue-800' :
                        session.category === '学習' ? 'bg-green-100 text-green-800' :
                        session.category === '人間関係' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.category}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === 'active' ? 'bg-green-100 text-green-800' :
                        session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {session.status === 'active' ? '進行中' :
                         session.status === 'completed' ? '完了' : 'アーカイブ'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                      <span className="font-medium">最新の質問: </span>
                      {latestMessage}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        <span>{messageCount.user}質問 / {messageCount.ai}回答</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{date} {time}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSessionSelect?.(session);
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatLogViewer;