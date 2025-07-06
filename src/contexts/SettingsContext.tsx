import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslations, Translations } from '../utils/i18n';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: Language;
  fontSize: 'small' | 'medium' | 'large';
  chatBubbleStyle: 'modern' | 'classic' | 'minimal';
  notifications: boolean;
  soundEnabled: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  t: Translations;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'ja',
  fontSize: 'medium',
  chatBubbleStyle: 'modern',
  notifications: true,
  soundEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [translations, setTranslations] = useState<Translations>(getTranslations(defaultSettings.language));

  // 初期化時にlocalStorageから設定を読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.warn('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // 設定変更時にlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(settings));
    applySettings(settings);
    setTranslations(getTranslations(settings.language));
  }, [settings]);

  const applySettings = (settings: AppSettings) => {
    const root = document.documentElement;

    // テーマ適用
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', settings.theme === 'dark');
    }

    // フォントサイズ適用
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--chat-font-size', fontSizeMap[settings.fontSize]);

    // チャットバブルスタイル適用
    root.setAttribute('data-chat-style', settings.chatBubbleStyle);

    // 言語適用（htmlのlang属性）
    document.documentElement.lang = settings.language;
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, t: translations }}>
      {children}
    </SettingsContext.Provider>
  );
};