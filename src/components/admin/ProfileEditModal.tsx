import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { nativeDialog } from '../../services/nativeDialog';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    role: 'admin' | 'student';
  };
  onSave: (newDisplayName: string) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      await nativeDialog.showWarning('入力エラー', '表示名を入力してください', '表示名は必須項目です。');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(displayName.trim());
      onClose();
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      await nativeDialog.showError('更新失敗', 'プロフィールの更新に失敗しました', error instanceof Error ? error.message : '不明なエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            プロフィール編集
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザーID
            </label>
            <input
              type="text"
              value={currentUser.username}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示名
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="表示名を入力"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              右上に表示される名前です（最大20文字）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              役割
            </label>
            <input
              type="text"
              value={currentUser.role === 'admin' ? '管理者' : '生徒'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || displayName.trim() === currentUser.displayName}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Save size={16} />
            <span>{isSaving ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;