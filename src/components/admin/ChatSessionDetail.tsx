import React, { useState } from 'react';
import { ChatSession, Message } from '../../types/chat';
import { ArrowLeft, User, Bot, Clock, MessageSquare, Flag, Edit3, Save, X } from 'lucide-react';

interface ChatSessionDetailProps {
  session: ChatSession;
  onBack: () => void;
  onUpdateSession?: (sessionId: string, updates: Partial<ChatSession>) => void;
}

const ChatSessionDetail: React.FC<ChatSessionDetailProps> = ({ 
  session, 
  onBack, 
  onUpdateSession 
}) => {
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [teacherComment, setTeacherComment] = useState(session.teacherComment || '');
  const [isFlagged, setIsFlagged] = useState(session.isFlagged || false);

  // 日時フォーマット
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // メッセージの時間フォーマット
  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // コメント保存
  const handleSaveComment = () => {
    if (onUpdateSession) {
      onUpdateSession(session.id, { 
        teacherComment,
        isFlagged 
      });
    }
    setIsEditingComment(false);
  };

  // フラグ切り替え
  const handleToggleFlag = () => {
    const newFlaggedState = !isFlagged;
    setIsFlagged(newFlaggedState);
    if (onUpdateSession) {
      onUpdateSession(session.id, { isFlagged: newFlaggedState });
    }
  };

  // メッセージのフィルタリングと整理
  const filteredMessages = React.useMemo(() => {
    // 重複する挨拶メッセージを除去（ローカル挨拶とFirebase挨拶の重複対策）
    const seenGreetings = new Set<string>();
    const filtered = session.messages.filter(msg => {
      // greeting- で始まるIDのメッセージ（ローカル挨拶）は除外
      if (msg.id && msg.id.startsWith('greeting-')) {
        return false;
      }
      
      // 汎用的なフォールバック挨拶メッセージを除外（先生固有の挨拶は残す）
      if (msg.sender === 'ai' && (
        msg.text === 'こんにちは！今日はどんなことで悩んでいますか？' ||
        msg.text === 'こんにちは！今日はどんなことで悩んでいますか？どんな小さなことでも気軽に相談してくださいね。' ||
        msg.text === 'こんにちは！どんなことでも気軽に相談してくださいね。'
      )) {
        return false; // 汎用的なフォールバック挨拶を除外
      }
      
      // 同じ内容のメッセージの重複を防ぐ
      if (seenGreetings.has(msg.text)) {
        return false;
      }
      seenGreetings.add(msg.text);
      
      return true;
    });
    
    // 時系列順（古い順）にソート - チャットUIの標準的な表示順序
    return filtered.sort((a, b) => {
      const timeA = a.createdAt || new Date(a.timestamp).getTime();
      const timeB = b.createdAt || new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [session.messages]);

  // メッセージ統計（フィルタリング後）
  const messageStats = {
    total: filteredMessages.length,
    userMessages: filteredMessages.filter(msg => msg.sender === 'user').length,
    aiMessages: filteredMessages.filter(msg => msg.sender === 'ai').length
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>チャットログ一覧に戻る</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFlag}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isFlagged 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Flag size={14} />
              {isFlagged ? 'フラグ解除' : 'フラグ設定'}
            </button>
          </div>
        </div>

        {/* セッション情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">セッション詳細</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <span className="font-medium">
                  {session.isAnonymous ? '匿名ユーザー' : session.studentName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">カテゴリ: </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  session.category === '進路' ? 'bg-blue-100 text-blue-800' :
                  session.category === '学習' ? 'bg-green-100 text-green-800' :
                  session.category === '人間関係' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {session.category}
                </span>
              </div>
              <div>
                <span className="text-gray-600">モード: </span>
                <span className="font-medium">{session.mode}</span>
              </div>
              <div>
                <span className="text-gray-600">緊急度: </span>
                <span className="font-medium">{session.urgencyLevel}/5</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">統計情報</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">総メッセージ数:</span>
                <span className="font-medium">{messageStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">学生の質問数:</span>
                <span className="font-medium">{messageStats.userMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">AIの回答数:</span>
                <span className="font-medium">{messageStats.aiMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">開始時刻:</span>
                <span className="font-medium">{formatDateTime(session.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最終更新:</span>
                <span className="font-medium">{formatDateTime(session.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">教師コメント</h3>
              {!isEditingComment && (
                <button
                  onClick={() => setIsEditingComment(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Edit3 size={14} />
                  <span className="text-sm">編集</span>
                </button>
              )}
            </div>
            
            {isEditingComment ? (
              <div className="space-y-2">
                <textarea
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="この相談に関するコメントを入力..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveComment}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save size={14} />
                    <span className="text-sm">保存</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingComment(false);
                      setTeacherComment(session.teacherComment || '');
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X size={14} />
                    <span className="text-sm">キャンセル</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                {teacherComment || 'コメントなし'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メッセージ履歴 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={20} />
            会話履歴
          </h3>
        </div>
        
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">メッセージがありません</p>
          ) : (
            filteredMessages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.sender === 'ai' && <Bot size={16} className="text-blue-600" />}
                    <span className="text-xs text-gray-500 font-medium">
                      {message.sender === 'user' ? '学生' : 'AI先生'}
                    </span>
                    {message.sender === 'user' && <User size={16} className="text-green-600" />}
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                    <div className={`flex items-center gap-1 mt-2 ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <Clock size={12} className={message.sender === 'user' ? 'text-green-200' : 'text-gray-400'} />
                      <span className={`text-xs ${
                        message.sender === 'user' ? 'text-green-200' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSessionDetail;