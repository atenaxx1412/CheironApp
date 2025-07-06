import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import { Category, ChatMode } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  category: Category;
  setCategory: (category: Category) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  isAnonymous: boolean;
  setIsAnonymous: (anonymous: boolean) => void;
  responseLength?: 'auto' | 'short' | 'medium' | 'long';
  setResponseLength?: (length: 'auto' | 'short' | 'medium' | 'long') => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  category, 
  setCategory, 
  mode, 
  setMode, 
  isAnonymous, 
  setIsAnonymous,
  responseLength = 'auto',
  setResponseLength
}) => {
  const { t } = useSettings();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showResponseLengthDropdown, setShowResponseLengthDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 7 * 24); // 最大7行 (24px per line)
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // ドロップダウンを閉じるためのイベントリスナー
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.category-dropdown')) {
        setShowCategoryDropdown(false);
      }
      if (!target.closest('.mode-dropdown')) {
        setShowModeDropdown(false);
      }
      if (!target.closest('.response-length-dropdown')) {
        setShowResponseLengthDropdown(false);
      }
    };

    if (showCategoryDropdown || showModeDropdown || showResponseLengthDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown, showModeDropdown, showResponseLengthDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const messageToSend = message.trim();
    setMessage(''); // メッセージを即座にクリア
    setSending(true);
    
    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      // エラーの場合はメッセージを復元
      setMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // 選択肢の定義
  const categoryOptions: { value: Category; label: string }[] = [
    { value: '日常会話', label: t.dailyConversation },
    { value: '進路', label: t.careerConsultation },
    { value: '学習', label: t.studyConsultation },
    { value: '人間関係', label: t.relationships }
  ];

  const modeOptions: { value: ChatMode; label: string }[] = [
    { value: 'normal', label: t.normal },
    { value: 'detailed', label: t.detailed },
    { value: 'quick', label: t.quick },
    { value: 'encouraging', label: t.encouraging }
  ];

  const responseLengthOptions: { value: 'auto' | 'short' | 'medium' | 'long'; label: string }[] = [
    { value: 'auto', label: '自動' },
    { value: 'short', label: '簡潔' },
    { value: 'medium', label: '普通' },
    { value: 'long', label: '詳しく' }
  ];

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          {/* 入力コンテナ */}
          <div 
            className={`relative transition-all duration-300 ease-in-out ${
              isFocused || message.trim() 
                ? 'bg-white rounded-2xl border border-gray-300 shadow-lg scale-[1.02]' 
                : 'bg-gray-50 rounded-3xl border border-gray-200 shadow-sm'
            }`}
          >
            {/* テキストエリア */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.askCheiron}
              className="w-full pl-6 pr-16 py-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
              rows={1}
              disabled={sending}
              style={{
                minHeight: '50px',
                maxHeight: '168px', // 7行分の高さ
                lineHeight: '24px',
                outline: 'none',
                boxShadow: 'none'
              }}
            />

            {/* 送信ボタン */}
            <div className="absolute right-4 bottom-4">
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className={`p-2 rounded-full transition-all duration-200 ${
                  message.trim() && !sending
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg scale-100'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed scale-90'
                } focus:outline-none focus:ring-0`}
                title={t.send}
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>

          {/* ヘルプテキスト */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            <span>{t.sendWithEnter}</span>
          </div>

          {/* 設定エリア */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
            {/* 相談分野選択 */}
            <div className="flex items-center gap-2">
              <label className="text-gray-600 font-medium">{t.consultationCategory}:</label>
              <div className="relative category-dropdown">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="pl-3 pr-8 py-2 border border-gray-300 rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-blue-50 transition-all duration-200 cursor-pointer min-w-[120px] shadow-sm text-sm font-medium flex items-center justify-between"
                >
                  <span>{categoryOptions.find(opt => opt.value === category)?.label}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {categoryOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setCategory(option.value);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          category === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 返答スタイル選択 */}
            <div className="flex items-center gap-2">
              <label className="text-gray-600 font-medium">{t.responseStyle}:</label>
              <div className="relative mode-dropdown">
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  className="pl-3 pr-8 py-2 border border-gray-300 rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-blue-50 transition-all duration-200 cursor-pointer min-w-[120px] shadow-sm text-sm font-medium flex items-center justify-between"
                >
                  <span>{modeOptions.find(opt => opt.value === mode)?.label}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showModeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showModeDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {modeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setMode(option.value);
                          setShowModeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          mode === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 応答長制御 */}
            {setResponseLength && (
              <div className="flex items-center gap-2">
                <label className="text-gray-600 font-medium">応答長:</label>
                <div className="relative response-length-dropdown">
                  <button
                    onClick={() => setShowResponseLengthDropdown(!showResponseLengthDropdown)}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-blue-50 transition-all duration-200 cursor-pointer min-w-[100px] shadow-sm text-sm font-medium flex items-center justify-between"
                  >
                    <span>{responseLengthOptions.find(opt => opt.value === responseLength)?.label}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showResponseLengthDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showResponseLengthDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {responseLengthOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setResponseLength(option.value);
                            setShowResponseLengthDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            responseLength === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;