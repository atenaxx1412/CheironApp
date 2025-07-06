import React, { useState, useEffect } from 'react';
import { AITeacher } from '../../types';
import { LogOut, Settings, History, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { firebaseAITeacherService } from '../../services/firebaseAITeacherService';
import ChatSettingsModal from './ChatSettingsModal';
import ChatHistoryModal from './ChatHistoryModal';

// 画像パスを相対パスで設定
const logoPath = './Cheiron_64x64.png';

interface ChatHeaderProps {
  currentTeacher?: AITeacher | null;
  allTeachers?: AITeacher[];
  showTeacherSelector?: boolean;
  onTeacherChange?: () => void;
  onToggleTeacherSelector?: () => void;
  onSelectTeacher?: (teacher: AITeacher) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentTeacher: propCurrentTeacher,
  allTeachers: propAllTeachers = [],
  showTeacherSelector: propShowTeacherSelector = false,
  onTeacherChange,
  onToggleTeacherSelector,
  onSelectTeacher
}) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [localCurrentTeacher, setLocalCurrentTeacher] = useState<AITeacher | null>(null);
  const [localAllTeachers, setLocalAllTeachers] = useState<AITeacher[]>([]);
  const [localShowTeacherSelector, setLocalShowTeacherSelector] = useState(false);
  
  // propsから来た値を優先、なければlocal stateを使用
  const currentTeacher = propCurrentTeacher !== undefined ? propCurrentTeacher : localCurrentTeacher;
  const allTeachers = propAllTeachers.length > 0 ? propAllTeachers : localAllTeachers;
  const showTeacherSelector = onToggleTeacherSelector ? propShowTeacherSelector : localShowTeacherSelector;
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadTeacherData();
  }, []);

  // ドロップダウンを閉じるためのイベントリスナー
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.teacher-selector')) {
        if (onToggleTeacherSelector) {
          // この場合、親コンポーネントが管理しているので、ここでは何もしない
        } else {
          setLocalShowTeacherSelector(false);
        }
      }
    };

    if (showTeacherSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTeacherSelector, onToggleTeacherSelector]);

  const loadTeacherData = async () => {
    if (propAllTeachers.length > 0) return; // propsから来た場合は何もしない
    try {
      const teachers = await firebaseAITeacherService.getAllTeachers();
      setLocalAllTeachers(teachers);
      if (teachers.length > 0 && !localCurrentTeacher) {
        setLocalCurrentTeacher(teachers[0]);
      }
    } catch (error) {
      console.error('先生データ読み込みエラー:', error);
    }
  };

  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = allTeachers.find(t => t.id === teacherId);
    if (selectedTeacher) {
      if (onSelectTeacher) {
        onSelectTeacher(selectedTeacher);
      } else {
        setLocalCurrentTeacher(selectedTeacher);
        setLocalShowTeacherSelector(false);
      }
      if (onTeacherChange) {
        onTeacherChange();
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // ローカルストレージをクリア
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // モーダルを閉じる
    setShowLogoutConfirm(false);
    
    // Electronの場合はページ全体をリロード
    window.location.reload();
  };


  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Cheiron Logo and Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img 
                src={logoPath} 
                alt="Cheiron Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cheiron</h1>
            </div>
          </div>

          {/* AI先生選択ドロップダウン */}
          <div className="relative teacher-selector">
            <button
              onClick={() => {
                if (onToggleTeacherSelector) {
                  onToggleTeacherSelector();
                } else {
                  setLocalShowTeacherSelector(!localShowTeacherSelector);
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            >
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {currentTeacher?.image ? (
                  <img 
                    src={currentTeacher.image} 
                    alt={currentTeacher.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm">👨‍🏫</span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {currentTeacher?.displayName || 'AI先生を選択'}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {/* 先生選択ドロップダウンメニュー */}
            {showTeacherSelector && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700">AI先生を選択してください</p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {allTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => handleTeacherChange(teacher.id)}
                      className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors ${
                        currentTeacher?.id === teacher.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {teacher.image ? (
                          <img 
                            src={teacher.image} 
                            alt={teacher.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">👨‍🏫</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-gray-900">{teacher.displayName}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teacher.specialties.slice(0, 2).map((specialty) => (
                            <span key={specialty} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      {currentTeacher?.id === teacher.id && (
                        <div className="text-blue-600 text-sm font-medium">選択中</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {user.displayName}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-3 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="履歴"
          >
            <History size={22} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="設定"
          >
            <Settings size={22} />
          </button>
          <button
            onClick={handleLogout}
            className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="ログアウト"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* 設定モーダル */}
      <ChatSettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      {/* 履歴モーダル */}
      <ChatHistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
      />

      {/* ログアウト確認ダイアログ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ログアウト確認</h3>
              <p className="text-gray-600 mb-6">本当にログアウトしますか？</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;