import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { migrationService } from './services/migrationService';
import { cacheCleanupService } from './services/cacheCleanupService';

function App() {
  // アプリ起動時にマイグレーションとキャッシュクリーンアップを実行
  useEffect(() => {
    const runInitialization = async () => {
      try {
        // マイグレーション実行
        if (migrationService.isMigrationNeeded()) {
          console.log('マイグレーションが必要です。実行中...');
          await migrationService.runFullMigration();
        } else {
          console.log('マイグレーションは完了しています');
        }

        // キャッシュクリーンアップサービス開始
        cacheCleanupService.startAutoCleanup();
        
      } catch (error) {
        console.error('初期化エラー:', error);
      }
    };
    
    runInitialization();

    // クリーンアップ関数
    return () => {
      cacheCleanupService.stopAutoCleanup();
    };
  }, []);

  const isAuthenticated = () => {
    return localStorage.getItem('user') && localStorage.getItem('token');
  };

  const getUserRole = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        return parsedUser.role;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const PrivateRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
    children, 
    requiredRole 
  }) => {
    if (!isAuthenticated()) {
      return <Navigate to="/" replace />;
    }

    if (requiredRole && getUserRole() !== requiredRole) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <SettingsProvider>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route 
                path="/" 
                element={
                  isAuthenticated() ? (
                    getUserRole() === 'admin' ? (
                      <Navigate to="/admin" replace />
                    ) : (
                      <Navigate to="/chat" replace />
                    )
                  ) : (
                    <LoginPage />
                  )
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <PrivateRoute requiredRole="student">
                    <ChatPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute requiredRole="admin">
                    <AdminPage />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </SettingsProvider>
  );
}

export default App;
