import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, Search, Filter, Trash2 } from 'lucide-react';
import { Message, Category, ChatMode, ChatSession } from '../../types';
import { firebaseChatService } from '../../services/firebaseChatService';
import { nativeDialog } from '../../services/nativeDialog';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 履歴表示用の拡張型
interface HistorySession extends ChatSession {
  summary: string;
  date: string;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<HistorySession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm, filterCategory]);

  const loadChatHistory = async () => {
    try {
      // Firebaseから実際のチャット履歴を取得
      const chatSessions = await firebaseChatService.getStudentChatSessions();
      
      // ローカルストレージから削除済みセッションIDを取得
      const deletedSessions = JSON.parse(localStorage.getItem('deletedChatSessions') || '[]');
      
      // 削除済みセッションを除外
      const activeSessions = chatSessions.filter(session => !deletedSessions.includes(session.id));
      
      // ChatSessionからローカル用の形式に変換
      const formattedSessions = await Promise.all(
        activeSessions.map(async (session) => {
          // 各セッションのメッセージを取得
          const messages = await firebaseChatService.getSessionMessages(session.id);
          
          // サマリーを生成（最初のユーザーメッセージまたはカテゴリから）
          const firstUserMessage = messages.find(m => m.sender === 'user');
          const summary = firstUserMessage 
            ? firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '')
            : `${session.category}に関する相談`;
          
          return {
            ...session,
            messages,
            summary,
            date: session.createdAt.split('T')[0] // ISO日付から日付部分のみ抽出
          } as HistorySession;
        })
      );
      
      console.log(`履歴読み込み完了: ${formattedSessions.length}件表示（${deletedSessions.length}件は非表示）`);
      setSessions(formattedSessions);
    } catch (error) {
      console.error('チャット履歴の読み込みエラー:', error);
      // エラー時は空配列を設定
      setSessions([]);
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.messages.some(msg => msg.text.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(session => session.category === filterCategory);
    }

    setFilteredSessions(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const deleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (sessionToDelete) {
      try {
        // ローカルストレージに削除済みセッションIDを保存（Firebaseは削除しない）
        const deletedSessions = JSON.parse(localStorage.getItem('deletedChatSessions') || '[]');
        if (!deletedSessions.includes(sessionToDelete)) {
          deletedSessions.push(sessionToDelete);
          localStorage.setItem('deletedChatSessions', JSON.stringify(deletedSessions));
        }
        
        // ローカル表示から削除（Firebaseのデータは保護）
        setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
        if (selectedSession?.id === sessionToDelete) {
          setSelectedSession(null);
        }
        
        console.log('履歴をローカルから非表示にしました（Firebaseデータは保護）:', sessionToDelete);
      } catch (error) {
        console.error('ローカル削除エラー:', error);
        await nativeDialog.showError('削除失敗', 'ローカル履歴の削除に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
      }
    }
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex">
        {/* 左側: 履歴一覧 */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">チャット履歴</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* 検索・フィルター */}
          <div className="p-4 space-y-3 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="履歴を検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as Category | 'all')}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">すべて</option>
                <option value="日常会話">日常会話</option>
                <option value="進路">進路相談</option>
                <option value="学習">学習相談</option>
                <option value="人間関係">人間関係</option>
              </select>
            </div>
          </div>

          {/* 履歴リスト */}
          <div className="flex-1 overflow-y-auto">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{session.summary}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{formatDate(session.date || session.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {session.category}
                      </span>
                      <MessageSquare size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{session.messages?.length || 0}件</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                <p>履歴が見つかりません</p>
              </div>
            )}
          </div>
        </div>

        {/* 右側: 選択された会話の詳細 */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* 会話ヘッダー */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{selectedSession.summary}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{formatDate(selectedSession.date || selectedSession.createdAt)}</span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {selectedSession.category}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {selectedSession.mode}
                  </span>
                  {selectedSession.isAnonymous && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                      匿名
                    </span>
                  )}
                </div>
              </div>

              {/* 会話内容 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedSession.messages?.map((message) => (
                  <div
                    key={message.id}
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
                        message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                <p>会話を選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">履歴を非表示</h3>
              <p className="text-gray-600 mb-6">この会話履歴をローカルから非表示にしますか？<br />データベースのデータは保護されます。</p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistoryModal;