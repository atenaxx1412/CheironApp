import { geminiApiService } from './geminiApiService';
import { firebaseAITeacherService } from './firebaseAITeacherService';
import { firebaseTeacherPersonalityService } from './firebaseTeacherPersonalityService';
import { teacherCacheService, CachedMessage } from './teacherCacheService';
import { AITeacher } from '../types';

export interface ChatRequest {
  message: string;
  teacherId: string;
  category?: string;
  mode?: string;
  sessionId?: string; // キャッシュ用のセッションID
  useCache?: boolean; // キャッシュを使用するかどうか
  responseLength?: 'auto' | 'short' | 'medium' | 'long'; // 応答長制御
}

export interface ChatResponse {
  response: string;
  teacher: AITeacher;
  timestamp: string;
  tokenUsed?: number;
}

export class AiChatService {
  
  // AI先生との会話を処理
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // 先生情報を取得
      const teacher = await firebaseAITeacherService.getTeacherById(request.teacherId);
      if (!teacher) {
        throw new Error('指定された先生が見つかりません');
      }

      // NGワードチェック
      const ngWordCheck = this.checkNGWords(request.message, teacher);
      if (ngWordCheck.hasNGWord) {
        return {
          response: ngWordCheck.message,
          teacher,
          timestamp: new Date().toISOString()
        };
      }

      // 制限トピックチェック
      const restrictedTopicCheck = this.checkRestrictedTopics(request.message, teacher);
      if (restrictedTopicCheck.isRestricted) {
        return {
          response: restrictedTopicCheck.message,
          teacher,
          timestamp: new Date().toISOString()
        };
      }

      // 先生の性格情報を構築（50問データを使用）
      const teacherPersonality = await this.buildTeacherPersonality(teacher);
      
      // キャッシュからコンテキストを構築
      let contextWithHistory = await this.buildContextFromCache(request, teacherPersonality);
      
      // 応答長制御の分析と指示を追加
      let cachedMessages: CachedMessage[] | undefined;
      if (request.useCache && request.sessionId) {
        const existingCache = await teacherCacheService.getTopicCache(teacher.id, request.sessionId);
        cachedMessages = existingCache?.messages;
      }
      
      const responseAnalysis = this.analyzeMessageForResponseLength(
        request.message, 
        request.category, 
        request.responseLength
      );
      
      const adjustedLengthInstruction = this.adjustResponseLengthByContext(
        responseAnalysis.lengthInstruction,
        cachedMessages
      );
      
      // 応答長指示をコンテキストに追加
      contextWithHistory += `

【応答長制御指示】
${adjustedLengthInstruction}
メッセージタイプ: ${responseAnalysis.messageType}
推奨長: ${responseAnalysis.recommendedLength}

【重要】
上記の指示に従って、適切な長さで返答してください。長すぎず短すぎず、内容に応じた最適な長さを心がけてください。
`;
      
      // 相談分野に応じたコンテキスト追加
      const contextualPrompt = this.addCategoryContext(request.message, request.category);
      
      // モードに応じたプロンプト調整
      const finalPrompt = this.addModeContext(contextualPrompt, request.mode);
      
      // 返信カスタマイズを適用
      const customizedPrompt = this.applyResponseCustomization(finalPrompt, request, teacher);
      
      // Gemini APIで回答生成（応答長制御付きコンテキストを使用）
      const response = await geminiApiService.generateResponse(customizedPrompt, contextWithHistory);
      
      // キャッシュに会話を保存（非同期で実行し、エラーが発生しても処理を継続）
      if (request.useCache && request.sessionId) {
        this.saveChatToCache(request, response).catch(error => {
          console.error('チャット履歴キャッシュ保存エラー:', error);
        });
      }
      
      return {
        response,
        teacher,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('AI会話処理エラー:', error);
      throw new Error(`会話処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // メッセージタイプを分析して応答長を決定
  private analyzeMessageForResponseLength(message: string, category?: string, explicitLength?: string): {
    messageType: 'greeting' | 'explanation' | 'support' | 'question' | 'general';
    recommendedLength: 'short' | 'medium' | 'long';
    lengthInstruction: string;
  } {
    // 明示的な長さ指定がある場合はそれを優先
    if (explicitLength && explicitLength !== 'auto') {
      const lengthInstructions = {
        short: '1-2文で簡潔に返答してください。',
        medium: '2-4文で適度な長さで返答してください。',
        long: '4-6文で詳しく丁寧に返答してください。'
      };
      return {
        messageType: 'general',
        recommendedLength: explicitLength as 'short' | 'medium' | 'long',
        lengthInstruction: lengthInstructions[explicitLength as keyof typeof lengthInstructions]
      };
    }

    // メッセージ内容とカテゴリから自動判定
    const messageText = message.toLowerCase();
    
    // 挨拶・感謝系
    if (messageText.includes('ありがとう') || messageText.includes('こんにちは') || 
        messageText.includes('おはよう') || messageText.includes('お疲れ') ||
        messageText.includes('はい') || messageText.includes('わかりました')) {
      return {
        messageType: 'greeting',
        recommendedLength: 'short',
        lengthInstruction: '1-2文で温かく簡潔に返答してください。'
      };
    }

    // 説明・解説系
    if (messageText.includes('教えて') || messageText.includes('説明') ||
        messageText.includes('どうして') || messageText.includes('なぜ') ||
        messageText.includes('方法') || messageText.includes('やり方')) {
      return {
        messageType: 'explanation',
        recommendedLength: 'long',
        lengthInstruction: '3-5文で分かりやすく詳しく説明してください。具体例があれば含めてください。'
      };
    }

    // サポート・相談系
    if (messageText.includes('悩み') || messageText.includes('困っている') ||
        messageText.includes('不安') || messageText.includes('心配') ||
        messageText.includes('辛い') || messageText.includes('大変') ||
        category === '人間関係' || category === '進路') {
      return {
        messageType: 'support',
        recommendedLength: 'medium',
        lengthInstruction: '3-4文で温かく共感しながら、具体的なアドバイスを含めて返答してください。'
      };
    }

    // 質問系
    if (messageText.includes('？') || messageText.includes('?') ||
        messageText.includes('どう') || messageText.includes('何') ||
        messageText.startsWith('いつ') || messageText.startsWith('どこ')) {
      return {
        messageType: 'question',
        recommendedLength: 'medium',
        lengthInstruction: '2-4文で質問に対して適切な長さで答えてください。'
      };
    }

    // その他一般的なメッセージ
    const messageLength = message.length;
    if (messageLength < 20) {
      return {
        messageType: 'general',
        recommendedLength: 'short',
        lengthInstruction: '2-3文で適切に返答してください。'
      };
    } else if (messageLength > 100) {
      return {
        messageType: 'general',
        recommendedLength: 'long',
        lengthInstruction: '4-5文で内容に応じた詳しい返答をしてください。'
      };
    } else {
      return {
        messageType: 'general',
        recommendedLength: 'medium',
        lengthInstruction: '2-4文で適切な長さで返答してください。'
      };
    }
  }

  // 文脈を考慮した応答長調整
  private adjustResponseLengthByContext(
    baseInstruction: string, 
    cachedMessages?: CachedMessage[]
  ): string {
    if (!cachedMessages || cachedMessages.length === 0) {
      return baseInstruction;
    }

    // 最近のAI応答を分析
    const recentAIMessages = cachedMessages
      .filter(msg => msg.sender === 'ai')
      .slice(-3); // 直近3件

    if (recentAIMessages.length === 0) {
      return baseInstruction;
    }

    // 前回の応答長を分析
    const lastResponse = recentAIMessages[recentAIMessages.length - 1];
    const avgLength = recentAIMessages.reduce((sum, msg) => sum + msg.text.length, 0) / recentAIMessages.length;

    let contextAdjustment = '';
    
    // 長い応答が続いている場合
    if (avgLength > 200) {
      contextAdjustment = '\n注意: 前回の応答が長めでした。今回は簡潔にまとめてください。';
    }
    // 短い応答が続いている場合
    else if (avgLength < 50) {
      contextAdjustment = '\n注意: 前回の応答が短めでした。必要に応じてもう少し詳しく説明してください。';
    }
    // ユーザーの反応パターンを確認
    const userResponses = cachedMessages
      .filter(msg => msg.sender === 'user')
      .slice(-2);
    
    if (userResponses.length >= 2) {
      const hasShortResponses = userResponses.every(msg => msg.text.length < 20);
      if (hasShortResponses) {
        contextAdjustment += '\n注意: 相手の返答が短いため、簡潔な対応を心がけてください。';
      }
    }

    return baseInstruction + contextAdjustment;
  }

  // 先生の性格情報を構築（50問データを優先）
  private async buildTeacherPersonality(teacher: AITeacher): Promise<string> {
    try {
      // 50問の性格データを取得
      const personalityData = await firebaseTeacherPersonalityService.getTeacherPersonality(teacher.id);
      
      if (personalityData && personalityData.isComplete) {
        // 50問データが完成している場合は、詳細な性格プロンプトを使用
        return firebaseTeacherPersonalityService.buildPersonalityPrompt(personalityData);
      } else {
        // 50問データがない場合は、基本情報から構築
        const personality = `
名前: ${teacher.displayName}
専門分野: ${teacher.specialties.join('、')}
性格・特徴: ${teacher.personality}
挨拶: ${teacher.greeting || 'こんにちは！'}

あなたは「${teacher.displayName}」として、以下の特徴を持った先生です：
- ${teacher.personality}
- 専門分野: ${teacher.specialties.join('、')}
- 温かく親身になって生徒をサポートする
- 具体的で実践的なアドバイスを心がける
- 生徒の目線に立った分かりやすい説明をする

※ この先生はまだ50問の性格分析を完了していないため、基本的な対応をします。
`;
        return personality;
      }
    } catch (error) {
      console.error('性格データ取得エラー:', error);
      // エラーの場合は基本情報を使用
      const personality = `
名前: ${teacher.displayName}
専門分野: ${teacher.specialties.join('、')}
性格・特徴: ${teacher.personality}
挨拶: ${teacher.greeting || 'こんにちは！'}

あなたは「${teacher.displayName}」として、温かく親身になって生徒をサポートする先生です。
`;
      return personality;
    }
  }

  // キャッシュから会話履歴を取得してコンテキストを構築
  private async buildContextFromCache(request: ChatRequest, teacherPersonality: string): Promise<string> {
    // キャッシュ機能が無効または必要なパラメータがない場合は基本の性格情報を返す
    if (!request.useCache || !request.sessionId) {
      return teacherPersonality;
    }

    try {
      // キャッシュから会話履歴を取得
      const cachedData = await teacherCacheService.getTopicCache(request.teacherId, request.sessionId);
      
      if (!cachedData || !cachedData.messages || cachedData.messages.length === 0) {
        // キャッシュがない場合は基本の性格情報を返す
        return teacherPersonality;
      }

      // 会話履歴からコンテキストを構築
      const conversationHistory = this.formatConversationHistory(cachedData.messages);
      
      // 性格情報と会話履歴を組み合わせたコンテキストを作成
      const contextWithHistory = `${teacherPersonality}

【これまでの会話履歴】
${conversationHistory}

【重要な指示】
- 上記の会話履歴を踏まえて、一貫性のある対応をしてください
- 過去の会話内容を参考にしながら、生徒の状況や悩みに寄り添ってください
- 同じ質問を繰り返さず、会話の流れを自然に続けてください
- 必要に応じて過去の会話内容を引用して、より具体的なアドバイスをしてください

【現在の新しいメッセージ】`;

      return contextWithHistory;
      
    } catch (error) {
      console.error('キャッシュからのコンテキスト構築エラー:', error);
      // エラーの場合は基本の性格情報を返す
      return teacherPersonality;
    }
  }

  // 会話履歴をフォーマットしてコンテキスト用文字列に変換
  private formatConversationHistory(messages: CachedMessage[]): string {
    if (!messages || messages.length === 0) {
      return '（会話履歴なし）';
    }

    // メッセージを時系列順にソート
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 最新の10件程度に限定（コンテキストが長くなりすぎないよう）
    const recentMessages = sortedMessages.slice(-10);

    // 会話履歴を読みやすい形式でフォーマット
    const formattedHistory = recentMessages.map(message => {
      const timestamp = new Date(message.timestamp).toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const sender = message.sender === 'user' ? '生徒' : '先生';
      const importance = message.importance === 'high' ? '★' : message.importance === 'medium' ? '◆' : '●';
      
      return `${importance} [${timestamp}] ${sender}: ${message.text}`;
    }).join('\n');

    return formattedHistory;
  }

  // チャット履歴をキャッシュに保存
  private async saveChatToCache(request: ChatRequest, aiResponse: string): Promise<void> {
    if (!request.sessionId || !request.useCache) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      
      // ユーザーメッセージの重要度を判定
      const userImportance = this.determineMessageImportance(request.message, request.category);
      
      // AIレスポンスの重要度を判定
      const aiImportance = this.determineMessageImportance(aiResponse);

      // トークン数を概算（日本語文字数 × 1.5で簡易計算）
      const userTokens = Math.ceil(request.message.length * 1.5);
      const aiTokens = Math.ceil(aiResponse.length * 1.5);

      // ユーザーメッセージをキャッシュに追加
      const userMessage: CachedMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: request.message,
        sender: 'user',
        timestamp: timestamp,
        importance: userImportance,
        tokens: userTokens
      };

      await teacherCacheService.updateTopicCache(request.teacherId, request.sessionId, userMessage);

      // AIレスポンスをキャッシュに追加
      const aiMessage: CachedMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        importance: aiImportance,
        tokens: aiTokens
      };

      await teacherCacheService.updateTopicCache(request.teacherId, request.sessionId, aiMessage);

      console.log(`会話履歴をキャッシュに保存: セッション ${request.sessionId}`);
      
    } catch (error) {
      console.error('チャット履歴キャッシュ保存処理エラー:', error);
      throw error;
    }
  }

  // メッセージの重要度を判定
  private determineMessageImportance(message: string, category?: string): 'high' | 'medium' | 'low' {
    // メッセージの長さによる基本判定
    if (message.length < 50) {
      return 'low';
    } else if (message.length > 200) {
      return 'high';
    }

    // カテゴリによる判定
    if (category) {
      const highImportanceCategories = ['進路', '人間関係'];
      if (highImportanceCategories.includes(category)) {
        return 'high';
      }
    }

    // キーワードによる判定
    const highImportanceKeywords = ['進路', '将来', '悩み', '困って', '助けて', '相談', '不安', '心配'];
    const mediumImportanceKeywords = ['勉強', '学習', 'テスト', '試験', '成績'];

    const lowerMessage = message.toLowerCase();
    
    if (highImportanceKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    if (mediumImportanceKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'medium';
    }

    return 'medium'; // デフォルトは medium
  }

  // カテゴリに応じたコンテキスト追加
  private addCategoryContext(message: string, category?: string): string {
    if (!category) return message;

    const categoryContexts = {
      '進路': `
進路相談として以下の質問に答えてください。
- 将来の目標や夢を大切にしつつ、現実的なアドバイスを提供
- 具体的な進学先や職業について詳しく説明
- 生徒の適性や興味を考慮したアドバイス
- 今からできる準備や行動を具体的に提案

`,
      '学習': `
学習相談として以下の質問に答えてください。
- 効果的な勉強方法や学習習慣を提案
- 苦手科目の克服方法を具体的にアドバイス
- モチベーション維持の方法を教える
- 時間管理や計画の立て方をサポート

`,
      '人間関係': `
人間関係の相談として以下の質問に答えてください。
- 友人関係、家族関係、恋愛関係の悩みに対応
- コミュニケーションのコツやアドバイス
- ストレス解消法や心のケア方法を提案
- 相手の気持ちを理解し、建設的な解決策を提示

`
    };

    const context = categoryContexts[category as keyof typeof categoryContexts] || '';
    return context + message;
  }

  // モードに応じたプロンプト調整
  private addModeContext(message: string, mode?: string): string {
    if (!mode) return message;

    const modeContexts = {
      'detailed': `
【回答スタイル: 詳しく】
- 800-1500文字程度で詳細に説明してください
- 具体例を複数挙げて分かりやすく説明
- 段階的な手順やプロセスを丁寧に説明
- 背景情報や理由も含めて包括的に回答
- 実践的なアドバイスを具体的に提供

`,
      'quick': `
【回答スタイル: さくっと】
- 200-400文字程度で簡潔に回答してください
- 要点を絞って端的に説明
- すぐに実践できるアドバイスを中心に
- 無駄な説明は省いて核心部分のみ
- 読みやすく分かりやすい表現で

`,
      'encouraging': `
【回答スタイル: 励まし】
- 400-700文字程度で温かく励ます調子で回答
- 生徒の気持ちに寄り添い共感を示す
- 前向きで希望を与える表現を使用
- 生徒の努力や頑張りを認めて応援
- 優しく親身な先生として接する

`,
      'normal': `
【回答スタイル: 通常】
- 400-800文字程度でバランス良く回答
- 適度な詳しさで説明し、実用的なアドバイスを提供
- 生徒目線で分かりやすく親しみやすい口調
- 必要に応じて具体例を交える
- 落ち着いた信頼できる先生として対応

`
    };

    const context = modeContexts[mode as keyof typeof modeContexts] || '';
    return context + message;
  }

  // AIサービスの状態確認
  async getServiceStatus(): Promise<{
    isAvailable: boolean;
    activeKeys: number;
    todayRequests: number;
    message: string;
  }> {
    try {
      const stats = await geminiApiService.getUsageStats();
      
      return {
        isAvailable: stats.activeKeys > 0,
        activeKeys: stats.activeKeys,
        todayRequests: stats.todayRequests,
        message: stats.activeKeys > 0 
          ? 'AIサービスは正常に動作しています' 
          : 'APIキーの上限に達しています。しばらくお待ちください'
      };
      
    } catch (error) {
      console.error('サービス状態確認エラー:', error);
      return {
        isAvailable: false,
        activeKeys: 0,
        todayRequests: 0,
        message: 'AIサービスに接続できません'
      };
    }
  }

  // Gemini APIキーを初期化（初回起動時）
  async initializeService(): Promise<void> {
    try {
      await geminiApiService.initializeApiKeys();
      console.log('AI会話サービスが初期化されました');
    } catch (error) {
      console.error('AI会話サービス初期化エラー:', error);
      throw error;
    }
  }

  // NGワードチェック
  private checkNGWords(message: string, teacher: AITeacher): { hasNGWord: boolean; message: string } {
    if (!teacher.ngWords?.enabled || !teacher.ngWords.words.length) {
      return { hasNGWord: false, message: '' };
    }

    const lowerMessage = message.toLowerCase();
    const foundNGWord = teacher.ngWords.words.find(word => 
      lowerMessage.includes(word.toLowerCase())
    );

    if (foundNGWord) {
      const customMessage = teacher.ngWords.customMessage || 
        `申し訳ありませんが、「${foundNGWord}」に関する内容については、お答えできません。他の相談内容でしたら、お気軽にお聞かせください。`;
      
      return { hasNGWord: true, message: customMessage };
    }

    // NGカテゴリーもチェック
    const ngCategories = ['政治', '宗教', '暴力', '差別', '犯罪'];
    const foundCategory = ngCategories.find(category => 
      teacher.ngWords?.categories.includes(category) && lowerMessage.includes(category)
    );

    if (foundCategory) {
      const customMessage = teacher.ngWords?.customMessage || 
        `申し訳ありませんが、${foundCategory}に関するトピックについては、お答えできません。学習や進路、人間関係など、他の相談内容でしたらお気軽にお聞かせください。`;
      
      return { hasNGWord: true, message: customMessage };
    }

    return { hasNGWord: false, message: '' };
  }

  // 制限トピックチェック
  private checkRestrictedTopics(message: string, teacher: AITeacher): { isRestricted: boolean; message: string } {
    if (!teacher.responseCustomization?.enableCustomization || 
        !teacher.responseCustomization.restrictedTopics?.length) {
      return { isRestricted: false, message: '' };
    }

    const lowerMessage = message.toLowerCase();
    const foundTopic = teacher.responseCustomization.restrictedTopics.find(topic => 
      lowerMessage.includes(topic.toLowerCase())
    );

    if (foundTopic) {
      const message = `申し訳ありませんが、「${foundTopic}」に関する内容については、専門的な知識が必要なため、お答えできません。学習方法や進路相談、人間関係など、他の内容でしたらお気軽にご相談ください。`;
      return { isRestricted: true, message };
    }

    return { isRestricted: false, message: '' };
  }

  // 返信カスタマイズを適用
  private applyResponseCustomization(prompt: string, request: ChatRequest, teacher: AITeacher): string {
    if (!teacher.responseCustomization?.enableCustomization || 
        !teacher.responseCustomization.customPrompts?.length) {
      return prompt;
    }

    // カテゴリまたはモードに応じたカスタムプロンプトを探す
    const customPrompt = teacher.responseCustomization.customPrompts.find(cp => 
      (cp.category && cp.category === request.category) || 
      (cp.mode && cp.mode === request.mode)
    );

    if (customPrompt) {
      return `${customPrompt.prompt}\n\n${prompt}`;
    }

    return prompt;
  }

  // モック応答（Gemini API不可時のフォールバック）
  private getMockResponse(teacher: AITeacher, message: string): string {
    const responses = [
      `${teacher.displayName}です。${message}について、もう少し詳しく教えてもらえますか？一緒に考えてみましょう。`,
      `なるほど、${message}についてのご相談ですね。まずは現在の状況を整理してみませんか？`,
      `${message}について悩んでいるのですね。私の経験から言えることがあります。一歩ずつ解決していきましょう。`,
      `${teacher.displayName}として、${message}についてお答えします。どんな小さなことでも気軽に相談してくださいね。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// シングルトンインスタンス
export const aiChatService = new AiChatService();