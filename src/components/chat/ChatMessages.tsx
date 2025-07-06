import React, { useState, useEffect, useRef } from 'react';
import { Message, AITeacher } from '../../types';
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, Share } from 'lucide-react';
import { firebaseFeedbackService } from '../../services/firebaseFeedbackService';
import { useSettings } from '../../contexts/SettingsContext';

interface ChatMessagesProps {
  messages: Message[];
  currentTeacher?: AITeacher | null;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, currentTeacher }) => {
  const { settings } = useSettings();
  const [feedbacks, setFeedbacks] = useState<{[key: string]: 'good' | 'bad' | null}>({});
  const [copiedMessages, setCopiedMessages] = useState<{[key: string]: boolean}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // デバッグ用：メッセージpropsをログ出力
  useEffect(() => {
    console.log('🎨 [DEBUG] ChatMessages propsを受信:', {
      メッセージ数: messages.length,
      現在の先生: currentTeacher?.displayName,
      メッセージ詳細: messages.map(m => ({ 
        id: m.id, 
        sender: m.sender, 
        text: m.text.substring(0, 30),
        timestamp: m.timestamp
      }))
    });
  }, [messages, currentTeacher]);

  const scrollToBottom = () => {
    // より確実なスクロール動作
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }, 100);
  };

  useEffect(() => {
    // メッセージが更新された時に確実に下部にスクロール
    scrollToBottom();
  }, [messages]);

  // 初回レンダリング時にも下部にスクロール
  useEffect(() => {
    scrollToBottom();
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFeedback = async (messageId: string, type: 'good' | 'bad', message: Message) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    // 同じタイプのフィードバックならキャンセル、違うタイプなら更新
    const newFeedbackType = feedbacks[messageId] === type ? null : type;
    
    setFeedbacks(prev => ({
      ...prev,
      [messageId]: newFeedbackType
    }));
    
    if (newFeedbackType && currentTeacher) {
      // Firebaseにフィードバックを保存
      try {
        // セッションIDを生成（ユーザーID + 日付）
        const sessionId = `${currentUser.id || 'unknown'}_${new Date().toISOString().split('T')[0]}`;
        
        await firebaseFeedbackService.saveFeedback({
          messageId,
          sessionId,
          type: newFeedbackType,
          studentId: currentUser.id || 'unknown',
          studentName: currentUser.displayName || 'Unknown User',
          teacherId: currentTeacher.id,
          teacherName: currentTeacher.displayName,
          messageText: message.text,
          category: message.category || '未分類',
          mode: message.mode || 'normal'
        });
        
        console.log(`Firebase feedback saved: ${newFeedbackType} for message ${messageId}`);
      } catch (error) {
        console.error('Firebase feedback save error:', error);
      }
    } else {
      // フィードバックをキャンセル（削除）
      try {
        await firebaseFeedbackService.deleteFeedbackByMessageId(messageId);
        console.log(`Firebase feedback cancelled for message ${messageId}`);
      } catch (error) {
        console.error('Firebase feedback delete error:', error);
      }
    }
  };

  const handleCopy = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessages(prev => ({ ...prev, [messageId]: true }));
      setTimeout(() => {
        setCopiedMessages(prev => ({ ...prev, [messageId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRegenerate = (messageId: string) => {
    // TODO: メッセージ再生成機能を実装
    console.log('Regenerate message:', messageId);
  };

  const handleShare = (messageId: string, text: string) => {
    // TODO: 共有機能を実装
    console.log('Share message:', messageId, text);
  };

  // チャットバブルスタイルを取得
  const getBubbleStyles = (sender: 'user' | 'ai') => {
    const baseStyles = "px-4 py-3 shadow-sm";
    
    if (sender === 'user') {
      switch (settings.chatBubbleStyle) {
        case 'classic':
          return `${baseStyles} bg-blue-500 text-white rounded-lg`;
        case 'minimal':
          return `${baseStyles} bg-blue-600 text-white rounded-md border-l-4 border-blue-800`;
        case 'modern':
        default:
          return `${baseStyles} bg-blue-600 text-white rounded-2xl`;
      }
    } else {
      switch (settings.chatBubbleStyle) {
        case 'classic':
          return `${baseStyles} bg-gray-100 text-gray-800 rounded-lg border border-gray-200`;
        case 'minimal':
          return `${baseStyles} bg-white text-gray-800 rounded-md border-l-4 border-gray-300 border border-gray-200`;
        case 'modern':
        default:
          return `${baseStyles} bg-white text-gray-800 rounded-2xl border border-gray-200`;
      }
    }
  };

  // フォントサイズスタイルを取得
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-base';
      case 'medium':
      default:
        return 'text-sm';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col space-y-6 min-h-full justify-end">
          {(() => {
            console.log('🎨 [DEBUG] メッセージをレンダリング中:', messages.length, 'メッセージ');
            return null;
          })()}
          {messages.map((message) => {
            console.log('🎨 [DEBUG] 個別メッセージレンダリング:', { id: message.id, sender: message.sender, text: message.text.substring(0, 30) });
            return (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <div className="flex items-start space-x-3 max-w-3xl w-full">
                    {/* AI先生のアバター */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0 mt-1 border border-gray-200">
                      {currentTeacher?.image ? (
                        <img 
                          src={currentTeacher.image} 
                          alt={currentTeacher.displayName || currentTeacher.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">👨‍🏫</span>
                      )}
                    </div>
                    
                    {/* メッセージコンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className={getBubbleStyles('ai')}>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`${getFontSizeClass()} font-medium ${settings.chatBubbleStyle === 'minimal' ? 'text-gray-900' : 'text-gray-900'}`}>
                            {currentTeacher?.displayName || 'AI先生'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="max-w-none">
                          <p className={`${getFontSizeClass()} leading-relaxed whitespace-pre-wrap text-inherit`}>{message.text}</p>
                        </div>
                      </div>
                      
                      {/* フィードバックとアクションボタン */}
                      <div className="flex items-center space-x-1 mt-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        {/* いいねボタン */}
                        <button
                          onClick={() => handleFeedback(message.id, 'good', message)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            feedbacks[message.id] === 'good'
                              ? 'bg-green-100 text-green-600 shadow-sm'
                              : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title="この回答は役に立った"
                        >
                          <ThumbsUp size={16} />
                        </button>
                        
                        {/* だめボタン */}
                        <button
                          onClick={() => handleFeedback(message.id, 'bad', message)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            feedbacks[message.id] === 'bad'
                              ? 'bg-red-100 text-red-600 shadow-sm'
                              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title="この回答は役に立たなかった"
                        >
                          <ThumbsDown size={16} />
                        </button>
                        
                        {/* コピーボタン */}
                        <button
                          onClick={() => handleCopy(message.id, message.text)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            copiedMessages[message.id]
                              ? 'bg-blue-100 text-blue-600 shadow-sm'
                              : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title={copiedMessages[message.id] ? 'コピー済み' : 'コピー'}
                        >
                          <Copy size={16} />
                        </button>
                        
                        {/* 再生成ボタン */}
                        <button
                          onClick={() => handleRegenerate(message.id)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                          title="回答を再生成"
                        >
                          <RotateCcw size={16} />
                        </button>
                        
                        {/* 共有ボタン */}
                        <button
                          onClick={() => handleShare(message.id, message.text)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200"
                          title="この回答を共有"
                        >
                          <Share size={16} />
                        </button>
                      </div>

                      {/* フィードバック状態表示 */}
                      {feedbacks[message.id] && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                          {feedbacks[message.id] === 'good' ? (
                            <span className="text-green-600 dark:text-green-400">👍 フィードバックありがとうございます</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">👎 フィードバックありがとうございます。改善に努めます。</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {message.sender === 'user' && (
                  <div className="max-w-sm lg:max-w-lg">
                    <div className={getBubbleStyles('user')}>
                      <p className={`${getFontSizeClass()} leading-relaxed`}>{message.text}</p>
                      <p className={`text-xs mt-1 ${settings.chatBubbleStyle === 'minimal' ? 'text-blue-300' : 'text-blue-200'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatMessages;