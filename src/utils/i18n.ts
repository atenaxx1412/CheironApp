// 多言語対応のための基本的なi18nシステム

export type Language = 'ja' | 'en';

export interface Translations {
  // 設定関連
  settings: string;
  chatSettings: string;
  displayTheme: string;
  light: string;
  dark: string;
  system: string;
  language: string;
  fontSize: string;
  small: string;
  medium: string;
  large: string;
  chatBubbleStyle: string;
  modern: string;
  classic: string;
  minimal: string;
  notifications: string;
  enableNotifications: string;
  enableSounds: string;
  resetToDefault: string;
  cancel: string;
  save: string;
  
  // ナビゲーション関連
  history: string;
  logout: string;
  chatHistory: string;
  welcome: string;
  
  // チャット関連
  askCheiron: string;
  send: string;
  sendWithEnter: string;
  consultationCategory: string;
  responseStyle: string;
  anonymousMode: string;
  dailyConversation: string;
  careerConsultation: string;
  studyConsultation: string;
  relationships: string;
  normal: string;
  detailed: string;
  quick: string;
  encouraging: string;
  
  // フィードバック関連
  helpful: string;
  notHelpful: string;
  copy: string;
  regenerate: string;
  share: string;
  feedbackThanks: string;
  feedbackImprove: string;
  
  // 確認ダイアログ
  confirmLogout: string;
  confirmLogoutMessage: string;
  confirmReset: string;
  confirmResetMessage: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  irreversible: string;
  
  // 履歴関連
  searchHistory: string;
  selectConversation: string;
  noHistoryFound: string;
  delete: string;
  all: string;
  
  // 一般
  loading: string;
  error: string;
  success: string;
}

const translations: Record<Language, Translations> = {
  ja: {
    // 設定関連
    settings: '設定',
    chatSettings: 'チャット設定',
    displayTheme: '表示テーマ',
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム',
    language: '言語',
    fontSize: 'フォントサイズ',
    small: '小',
    medium: '中',
    large: '大',
    chatBubbleStyle: 'チャットバブルスタイル',
    modern: 'モダン',
    classic: 'クラシック',
    minimal: 'ミニマル',
    notifications: '通知・音声',
    enableNotifications: '通知を有効にする',
    enableSounds: '効果音を有効にする',
    resetToDefault: 'デフォルトに戻す',
    cancel: 'キャンセル',
    save: '保存',
    
    // ナビゲーション関連
    history: '履歴',
    logout: 'ログアウト',
    chatHistory: 'チャット履歴',
    welcome: 'ようこそ',
    
    // チャット関連
    askCheiron: 'Cheiron に質問してください...',
    send: '送信',
    sendWithEnter: 'Enterで送信、Shift+Enterで改行',
    consultationCategory: '会話内容',
    responseStyle: 'モード',
    anonymousMode: '匿名モード',
    dailyConversation: '日常会話',
    careerConsultation: '進路相談',
    studyConsultation: '学習相談',
    relationships: '人間関係',
    normal: '通常',
    detailed: '詳しく',
    quick: 'さくっと',
    encouraging: '励まし',
    
    // フィードバック関連
    helpful: 'この回答は役に立った',
    notHelpful: 'この回答は役に立たなかった',
    copy: 'コピー',
    regenerate: '回答を再生成',
    share: 'この回答を共有',
    feedbackThanks: 'フィードバックありがとうございます',
    feedbackImprove: 'フィードバックありがとうございます。改善に努めます。',
    
    // 確認ダイアログ
    confirmLogout: 'ログアウト確認',
    confirmLogoutMessage: '本当にログアウトしますか？',
    confirmReset: '設定をリセット',
    confirmResetMessage: '設定をデフォルトに戻しますか？',
    confirmDelete: '削除確認',
    confirmDeleteMessage: 'この会話履歴を削除しますか？',
    irreversible: 'この操作は取り消せません。',
    
    // 履歴関連
    searchHistory: '履歴を検索...',
    selectConversation: '会話を選択してください',
    noHistoryFound: '履歴が見つかりません',
    delete: '削除',
    all: 'すべて',
    
    // 一般
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功'
  },
  
  en: {
    // 設定関連
    settings: 'Settings',
    chatSettings: 'Chat Settings',
    displayTheme: 'Display Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language',
    fontSize: 'Font Size',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    chatBubbleStyle: 'Chat Bubble Style',
    modern: 'Modern',
    classic: 'Classic',
    minimal: 'Minimal',
    notifications: 'Notifications & Sound',
    enableNotifications: 'Enable notifications',
    enableSounds: 'Enable sound effects',
    resetToDefault: 'Reset to default',
    cancel: 'Cancel',
    save: 'Save',
    
    // ナビゲーション関連
    history: 'History',
    logout: 'Logout',
    chatHistory: 'Chat History',
    welcome: 'Welcome',
    
    // チャット関連
    askCheiron: 'Ask Cheiron...',
    send: 'Send',
    sendWithEnter: 'Enter to send, Shift+Enter for new line',
    consultationCategory: 'Content',
    responseStyle: 'Mode',
    anonymousMode: 'Anonymous Mode',
    dailyConversation: 'Daily Chat',
    careerConsultation: 'Career Advice',
    studyConsultation: 'Study Help',
    relationships: 'Relationships',
    normal: 'Normal',
    detailed: 'Detailed',
    quick: 'Quick',
    encouraging: 'Encouraging',
    
    // フィードバック関連
    helpful: 'This answer was helpful',
    notHelpful: 'This answer was not helpful',
    copy: 'Copy',
    regenerate: 'Regenerate response',
    share: 'Share this response',
    feedbackThanks: 'Thank you for your feedback',
    feedbackImprove: 'Thank you for your feedback. We will work to improve.',
    
    // 確認ダイアログ
    confirmLogout: 'Confirm Logout',
    confirmLogoutMessage: 'Are you sure you want to logout?',
    confirmReset: 'Reset Settings',
    confirmResetMessage: 'Reset settings to default?',
    confirmDelete: 'Confirm Delete',
    confirmDeleteMessage: 'Delete this conversation history?',
    irreversible: 'This action cannot be undone.',
    
    // 履歴関連
    searchHistory: 'Search history...',
    selectConversation: 'Select a conversation',
    noHistoryFound: 'No history found',
    delete: 'Delete',
    all: 'All',
    
    // 一般
    loading: 'Loading...',
    error: 'Error',
    success: 'Success'
  }
};

export const getTranslations = (language: Language): Translations => {
  return translations[language];
};

export const t = (key: keyof Translations, language: Language): string => {
  return translations[language][key] || key;
};