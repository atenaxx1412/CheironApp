import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { firebaseChatService } from '../services/firebaseChatService';
import { firebaseStudentService } from '../services/firebaseStudentService';
import { nativeDialog } from '../services/nativeDialog';

// 画像をimportで読み込み
const logoPath = process.env.PUBLIC_URL + '/Cheiron_256x256.png';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState('Cheiron');
  const navigate = useNavigate();

  useEffect(() => {
    setAppName('Cheiron');
  }, []);

  // 管理者用のモックデータ
  const mockUsers: Record<string, { password: string; user: User }> = {
    admin: {
      password: 'admin123',
      user: {
        id: '1',
        username: 'admin',
        displayName: '田中先生',
        role: 'admin'
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. まず管理者アカウントをチェック
      const mockUser = mockUsers[username];
      if (mockUser && mockUser.password === password) {
        localStorage.setItem('user', JSON.stringify(mockUser.user));
        localStorage.setItem('token', 'mock-token-' + Date.now());

        if (mockUser.user.role === 'admin') {
          navigate('/admin');
          return;
        }
      }

      // 2. Firebaseから生徒データを取得してログイン認証
      try {
        const students = await firebaseStudentService.getAllStudents();
        const student = students.find(s => s.loginId === username && s.password === password);

        if (student) {
          // 生徒認証成功
          const user: User = {
            id: student.id,
            username: student.loginId || student.username,
            displayName: student.name,
            role: 'student'
          };

          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', 'firebase-student-token-' + Date.now());

          // Firebaseと同期
          await firebaseChatService.syncUserWithFirebase();
          console.log('生徒ログイン成功:', student.name);
          
          navigate('/chat');
          return;
        }
      } catch (error) {
        console.error('Firebase生徒認証エラー:', error);
      }


      // 認証失敗
      if (window.electronAPI && window.electronAPI.showErrorDialog) {
        try {
          await window.electronAPI.showErrorDialog(
            'ログイン認証エラー',
            '入力されたユーザーIDまたはパスワードが正しくありません。\n\n正しい認証情報を入力してから、もう一度お試しください。'
          );
        } catch (error) {
          console.warn('Electron dialog failed, using nativeDialog fallback:', error);
          await nativeDialog.showError('ログイン認証エラー', 'ユーザーIDまたはパスワードが間違っています', '正しい認証情報を入力してから、もう一度お試しください。');
        }
      } else {
        await nativeDialog.showError('ログイン認証エラー', 'ユーザーIDまたはパスワードが間違っています', '正しい認証情報を入力してから、もう一度お試しください。');
      }
      
    } catch (error) {
      console.error('ログインエラー:', error);
      if (window.electronAPI && window.electronAPI.showErrorDialog) {
        try {
          await window.electronAPI.showErrorDialog(
            'システムエラー',
            'ログイン処理中にエラーが発生しました。\n\nネットワーク接続を確認し、しばらく時間をおいてから再度お試しください。'
          );
        } catch (dialogError) {
          console.warn('Electron dialog failed, using nativeDialog fallback:', dialogError);
          await nativeDialog.showError('システムエラー', 'ログイン処理中にエラーが発生しました', 'ネットワーク接続を確認し、しばらく時間をおいてから再度お試しください。');
        }
      } else {
        await nativeDialog.showError('システムエラー', 'ログイン処理中にエラーが発生しました', 'ネットワーク接続を確認し、しばらく時間をおいてから再度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-32 w-32 flex items-center justify-center mb-6">
            <img 
              src={logoPath} 
              alt="Cheiron Logo" 
              className="h-full w-full object-contain rounded-full shadow-lg"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {appName}
          </h2>
          <p className="text-sm text-gray-600">
            ログインしてください
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                ユーザーID
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin または生徒ID"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワード"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p><strong>管理者用アカウント:</strong></p>
            <p>admin / admin123</p>
            <p className="mt-2 text-blue-600"><strong>生徒は管理者が設定したログインID/パスワードを使用</strong></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;