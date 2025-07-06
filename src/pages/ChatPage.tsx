import React, { useState, useEffect, useCallback } from 'react';
import ChatHeader from '../components/chat/ChatHeader';
import ChatMessages from '../components/chat/ChatMessages';
import ChatInput from '../components/chat/ChatInput';
import { Message, Category, ChatMode, AITeacher } from '../types';
import { firebaseChatService } from '../services/firebaseChatService';
import { firebaseAITeacherService } from '../services/firebaseAITeacherService';
import { aiChatService } from '../services/aiChatService';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [category, setCategory] = useState<Category>('日常会話');
  const [mode, setMode] = useState<ChatMode>('normal');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<AITeacher | null>(null);
  const [allTeachers, setAllTeachers] = useState<AITeacher[]>([]);
  const [showTeacherSelector, setShowTeacherSelector] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [unsubscribeRef, setUnsubscribeRef] = useState<(() => void) | null>(null);
  const [responseLength, setResponseLength] = useState<'auto' | 'short' | 'medium' | 'long'>('auto');
  // subscriptionRetryCount は不要（ローカルステート方式に変更）

  // 画面初期化のみ（セッション作成なし）
  const initializePage = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Gemini AIサービスを初期化
      await aiChatService.initializeService();
      console.log('Gemini AIサービスが初期化されました');
      
      // ユーザーとFirebase生徒データを同期
      await firebaseChatService.syncUserWithFirebase();
      
      // Firebaseから先生情報を取得
      const teachers = await firebaseAITeacherService.getAllTeachers();
      setAllTeachers(teachers);
      
      // 最初の先生をデフォルトとして設定（または前回選択した先生）
      const lastSelectedTeacherId = localStorage.getItem('lastSelectedTeacher');
      const defaultTeacher = lastSelectedTeacherId 
        ? teachers.find(t => t.id === lastSelectedTeacherId) || teachers[0]
        : teachers[0];
      setCurrentTeacher(defaultTeacher);
      
      // AI挨拶をローカル表示用にセット（Firebaseには保存しない）
      if (defaultTeacher) {
        // Firebaseの先生データから挨拶を取得（先生固有の挨拶を優先）
        const greetingText = defaultTeacher.greeting || 'こんにちは！どんなことでも気軽に相談してくださいね。';
        setMessages([{
          id: 'greeting-' + Date.now(),
          text: greetingText,
          sender: 'ai',
          timestamp: new Date().toISOString(),
          category: category,
          mode: mode
        }]);
      }
      
    } catch (error) {
      console.error('ページ初期化エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [category, mode]);

  // createChatSession関数は不要（handleSendMessage内で直接処理）

  // setupMessageSubscription関数は不要（ローカルステート方式に変更）

  useEffect(() => {
    // 画面初期化のみ実行（セッション作成なし）
    initializePage();
  }, [initializePage]);

  // メッセージ状態の変更を監視（デバッグ用）
  useEffect(() => {
    console.log('📨 [DEBUG] メッセージ状態変更:', {
      メッセージ数: messages.length,
      セッションID: currentSessionId,
      チャット開始: hasStartedChat,
      サブスクリプション: !!unsubscribeRef,
      メッセージ詳細: messages.map(m => ({ 
        id: m.id, 
        sender: m.sender, 
        text: m.text.substring(0, 30),
        timestamp: m.timestamp
      }))
    });
  }, [messages, currentSessionId, hasStartedChat, unsubscribeRef]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (unsubscribeRef) {
        console.log('🧹 Cleaning up Firebase subscription');
        unsubscribeRef();
      }
    };
  }, [unsubscribeRef]);

  const handleTeacherChange = () => {
    // 既存のリアルタイム購読をクリーンアップ
    if (unsubscribeRef) {
      unsubscribeRef();
      setUnsubscribeRef(null);
    }
    
    // 先生が変更された時にページを再初期化（セッションは作成しない）
    setHasStartedChat(false);
    setCurrentSessionId('');
    setMessages([]);
    initializePage();
  };
  
  const handleSelectTeacher = (teacher: AITeacher) => {
    // 既存のリアルタイム購読をクリーンアップ
    if (unsubscribeRef) {
      unsubscribeRef();
      setUnsubscribeRef(null);
    }
    
    setCurrentTeacher(teacher);
    localStorage.setItem('lastSelectedTeacher', teacher.id);
    setShowTeacherSelector(false);
    // ページを再初期化（セッションは作成しない）
    setHasStartedChat(false);
    setCurrentSessionId('');
    setMessages([]);
    initializePage();
  };

  const handleSendMessage = async (text: string): Promise<void> => {
    try {
      console.log('🔄 メッセージ送信開始:', text.substring(0, 50));
      setIsLoading(true);
      
      let sessionId = currentSessionId;
      
      // 最初のメッセージ送信時にセッションを作成
      if (!hasStartedChat) {
        console.log('🆕 初回メッセージ送信 - セッションを作成');
        sessionId = await firebaseChatService.createChatSession(category, mode, isAnonymous);
        setCurrentSessionId(sessionId);
        setHasStartedChat(true);
        console.log('✅ セッション作成完了:', sessionId);
      }
      
      if (!sessionId) {
        throw new Error('セッションの作成に失敗しました');
      }
      
      // 1. ユーザーメッセージを即座にローカル表示に追加
      const userMessage: Message = {
        id: 'user-' + Date.now(),
        text,
        sender: 'user',
        timestamp: new Date().toISOString(),
        category,
        mode,
        sessionId
      };
      
      setMessages(prevMessages => {
        console.log('👤 ユーザーメッセージをローカル表示に追加');
        return [...prevMessages, userMessage];
      });
      
      // 2. AI応答を生成
      console.log('🤖 AI応答生成中...');
      const aiResponse = await firebaseChatService.generateAIResponse(
        text, 
        category, 
        mode, 
        responseLength,
        sessionId,
        true
      );
      console.log('✅ AI応答生成完了:', aiResponse.substring(0, 50));
      
      // 3. AI応答を即座にローカル表示に追加
      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        category,
        mode,
        sessionId
      };
      
      setMessages(prevMessages => {
        console.log('🤖 AI応答をローカル表示に追加');
        return [...prevMessages, aiMessage];
      });
      
      // 4. 背景でFirebaseに保存（表示は既に完了）
      console.log('💾 Firebaseに保存中...');
      try {
        await firebaseChatService.sendMessage(sessionId, text, 'user', category, mode);
        await firebaseChatService.sendMessage(sessionId, aiResponse, 'ai', category, mode);
        console.log('✅ Firebase保存完了');
      } catch (firebaseError) {
        console.warn('⚠️ Firebase保存エラー（表示は正常）:', firebaseError);
      }
      
      console.log('🎉 メッセージ送信完了');
      
    } catch (error) {
      console.error('❌ メッセージ送信エラー:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ローディング表示用のコンポーネント
  if (isLoading && messages.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <ChatHeader onTeacherChange={handleTeacherChange} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">チャットを初期化中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatHeader
        currentTeacher={currentTeacher}
        allTeachers={allTeachers}
        showTeacherSelector={showTeacherSelector}
        onTeacherChange={handleTeacherChange}
        onToggleTeacherSelector={() => setShowTeacherSelector(!showTeacherSelector)}
        onSelectTeacher={handleSelectTeacher}
      />
      <ChatMessages messages={messages} currentTeacher={currentTeacher} />
      <ChatInput 
        onSendMessage={handleSendMessage}
        category={category}
        setCategory={setCategory}
        mode={mode}
        setMode={setMode}
        isAnonymous={isAnonymous}
        setIsAnonymous={setIsAnonymous}
        responseLength={responseLength}
        setResponseLength={setResponseLength}
      />
    </div>
  );
};

export default ChatPage;