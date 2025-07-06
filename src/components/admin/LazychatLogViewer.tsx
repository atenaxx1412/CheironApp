import React, { useState, useEffect, useCallback } from 'react';
import { ChatSession, Category } from '../../types/chat';
import { firebaseChatService } from '../../services/firebaseChatService';
import { Search, Filter, Calendar, User, MessageSquare, Clock, Eye, ChevronDown } from 'lucide-react';

interface LazyChatLogViewerProps {
  onSessionSelect?: (session: ChatSession) => void;
}

const LazyChatLogViewer: React.FC<LazyChatLogViewerProps> = ({ onSessionSelect }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;

  // 初回読み込み（最新10件のみ）
  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      console.log('チャット履歴の初回読み込み開始...');
      
      // 最新10件のみ取得
      const sessions = await firebaseChatService.getAllChatSessions();
      const limitedSessions = sessions.slice(0, ITEMS_PER_PAGE);
      
      setChatSessions(limitedSessions);
      setHasMore(sessions.length > ITEMS_PER_PAGE);
      
      console.log(`チャット履歴 ${limitedSessions.length}件を読み込み完了`);
    } catch (error) {
      console.error('初回データ読み込みエラー:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // 追加データを読み込む
  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      console.log(`ページ ${page + 1} を読み込み中...`);
      
      const allSessions = await firebaseChatService.getAllChatSessions();
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newSessions = allSessions.slice(startIndex, endIndex);
      
      if (newSessions.length === 0) {
        setHasMore(false);
      } else {
        setChatSessions(prev => [...prev, ...newSessions]);
        setPage(prev => prev + 1);
        setHasMore(allSessions.length > endIndex);
      }
      
      console.log(`追加で ${newSessions.length}件を読み込み完了`);
    } catch (error) {
      console.error('追加データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // 初回読み込み
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // フィルタされたセッション
  const filteredSessions = chatSessions.filter(session => {
    // 検索クエリでフィルタ
    if (searchQuery && !session.studentName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // カテゴリでフィルタ
    if (selectedCategory !== 'all' && session.category !== selectedCategory) {
      return false;
    }
    
    // 日付範囲でフィルタ
    if (selectedDateRange !== 'all') {
      const sessionDate = new Date(session.updatedAt);
      const now = new Date();
      
      switch (selectedDateRange) {
        case 'today':
          if (sessionDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (sessionDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (sessionDate < monthAgo) return false;
          break;
      }
    }
    
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 初回読み込み中の表示
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">チャット履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 検索・フィルタ */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="生徒名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* カテゴリフィルタ */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全カテゴリ</option>
            <option value="進路">進路</option>
            <option value="学習">学習</option>
            <option value="人間関係">人間関係</option>
            <option value="日常会話">日常会話</option>
          </select>

          {/* 日付範囲フィルタ */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全期間</option>
            <option value="today">今日</option>
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
          </select>

          {/* 統計情報 */}
          <div className="flex items-center text-sm text-gray-600">
            <MessageSquare size={16} className="mr-2" />
            <span>{filteredSessions.length}件表示</span>
          </div>
        </div>
      </div>

      {/* チャットセッション一覧 */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {searchQuery || selectedCategory !== 'all' || selectedDateRange !== 'all'
                ? 'フィルタ条件に一致するチャットが見つかりません'
                : 'まだチャット履歴がありません'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSessionSelect?.(session)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{session.studentName}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {session.category}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {session.messages.length}件
                    </span>
                    {session.urgencyLevel > 3 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        緊急
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock size={14} />
                    <span>{formatDate(session.updatedAt)}</span>
                  </div>
                </div>
                
                {session.messages.length > 0 && (
                  <div className="text-sm text-gray-600 ml-5">
                    最新: {session.messages[session.messages.length - 1].text.slice(0, 60)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* もっと読み込むボタン */}
        {hasMore && !initialLoading && (
          <div className="p-4 border-t">
            <button
              onClick={loadMoreData}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>読み込み中...</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span>さらに読み込む</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LazyChatLogViewer;