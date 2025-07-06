import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, t } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetSettings();
    setShowResetConfirm(false);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings); // 変更を破棄
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{t.chatSettings}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-white hover:bg-opacity-70 rounded-lg transition-colors"
              title={t.resetToDefault}
            >
              <RotateCcw size={18} className="text-gray-600" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white hover:bg-opacity-70 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* 設定内容 */}
        <div className="p-6 space-y-8">
          {/* 外観設定セクション */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">外観</h3>
            </div>
            
            {/* テーマ設定 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t.displayTheme}</h4>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'light' }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    localSettings.theme === 'light' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{t.light}</span>
                </button>
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'dark' }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    localSettings.theme === 'dark' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{t.dark}</span>
                </button>
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'system' }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    localSettings.theme === 'system' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{t.system}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 言語・地域設定セクション */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">言語・地域</h3>
            </div>
            
            {/* 言語設定 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t.language}</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, language: 'ja' }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    localSettings.language === 'ja' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">日本語</span>
                </button>
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, language: 'en' }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    localSettings.language === 'en' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">English</span>
                </button>
              </div>
            </div>
          </div>

          {/* チャット設定セクション */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">チャット</h3>
            </div>
            
            {/* フォントサイズ */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t.fontSize}</h4>
              <div className="grid grid-cols-3 gap-3">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setLocalSettings(prev => ({ ...prev, fontSize: size }))}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      localSettings.fontSize === size 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{t[size]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* チャットバブルスタイル */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t.chatBubbleStyle}</h4>
              <div className="space-y-3">
                {(['modern', 'classic', 'minimal'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setLocalSettings(prev => ({ ...prev, chatBubbleStyle: style }))}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${
                      localSettings.chatBubbleStyle === style 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-700">{t[style]}</span>
                    <div className="flex gap-2">
                      {style === 'modern' && (
                        <>
                          <div className="w-12 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl shadow-sm"></div>
                          <div className="w-10 h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl shadow-sm"></div>
                        </>
                      )}
                      {style === 'classic' && (
                        <>
                          <div className="w-12 h-8 bg-blue-500 rounded-lg border border-blue-600"></div>
                          <div className="w-10 h-8 bg-gray-400 rounded-lg border border-gray-500"></div>
                        </>
                      )}
                      {style === 'minimal' && (
                        <>
                          <div className="w-12 h-8 bg-blue-500 rounded border-l-4 border-blue-700"></div>
                          <div className="w-10 h-8 bg-gray-400 rounded border-l-4 border-gray-600"></div>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 通知・音声設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">通知・音声</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-700">通知を有効にする</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.notifications}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">効果音を有効にする</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.soundEnabled}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* リセット確認ダイアログ */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">設定をリセット</h3>
              <p className="text-gray-600 mb-6">設定をデフォルトに戻しますか？<br />この操作は取り消せません。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSettingsModal;