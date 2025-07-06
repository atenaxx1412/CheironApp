const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ビルドファイルが存在するかチェック
const buildExists = fs.existsSync(path.join(__dirname, '../build/index.html'));

// 環境変数を読み込み（buildファイルが存在する場合）
if (buildExists) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'Cheiron',
        icon: buildExists
            ? path.join(__dirname, '../build/Cheiron_256x256.png')
            : path.join(__dirname, 'Cheiron_256x256.png'), // アプリアイコンを設定
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: false, // file://プロトコルでの相対パス解決のため
            allowRunningInsecureContent: true,
            // データディレクトリを明示的に設定
            partition: 'persist:cheiron',
            preload: buildExists 
                ? path.join(__dirname, '../build/preload.js')
                : path.join(__dirname, 'preload.js')
        }
    });

    if (buildExists) {
        // loadFile()を使用して正しいベースURLを自動設定
        const indexPath = path.join(__dirname, '../build/index.html');
        mainWindow.loadFile(indexPath);
    } else {
        mainWindow.loadURL('http://localhost:3000');
    }

    // 本番ビルドでは開発者ツールを閉じる
    if (!buildExists) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// カスタムアラートダイアログの実装
ipcMain.handle('show-error-dialog', async (event, title, message) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'none', // システムアイコンを使わず、カスタムアイコンのみ
        title: title || 'Cheiron',
        message: title || 'Cheiron',  // タイトル行
        detail: message || 'エラーが発生しました', // 詳細メッセージ
        icon: buildExists
            ? path.join(__dirname, '../build/icon_boder_512x512.png')
            : path.join(__dirname, 'icon_boder_512x512.png'), // 丸いボーダー付きアイコン
        buttons: ['OK'],
        defaultId: 0,
        noLink: true,
        normalizeAccessKeys: false // アクセスキーの自動変換を無効化
    });
    return result;
});

// 汎用的なアラートダイアログ
ipcMain.handle('show-alert-dialog', async (event, title, message, type = 'info') => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'none', // カスタムアイコンを優先
        title: 'Cheiron',
        message: title || 'お知らせ',
        detail: message || '',
        icon: buildExists
            ? path.join(__dirname, '../build/icon_boder_512x512.png')
            : path.join(__dirname, 'icon_boder_512x512.png'), // 丸いボーダー付きアイコン
        buttons: ['OK'],
        defaultId: 0,
        noLink: true,
        normalizeAccessKeys: false
    });
    return result;
});

// 汎用ダイアログハンドラー（新しいダイアログサービス用）
ipcMain.handle('show-dialog', async (event, options) => {
    const {
        type = 'info',
        title = 'Cheiron',
        message,
        detail,
        buttons = ['OK'],
        defaultId = 0,
        cancelId
    } = options;

    const result = await dialog.showMessageBox(mainWindow, {
        type: 'none', // カスタムアイコンを優先
        title: title,
        message: message || 'お知らせ',
        detail: detail || '',
        icon: buildExists
            ? path.join(__dirname, '../build/icon_boder_512x512.png')
            : path.join(__dirname, 'icon_boder_512x512.png'), // 丸いボーダー付きアイコン
        buttons: buttons,
        defaultId: defaultId,
        cancelId: cancelId,
        noLink: true,
        normalizeAccessKeys: false
    });
    
    return {
        response: result.response,
        checkboxChecked: result.checkboxChecked
    };
});

// 確認ダイアログ
ipcMain.handle('show-confirm-dialog', async (event, title, message, detail = '') => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'none',
        title: 'Cheiron',
        message: title || '確認',
        detail: message || detail,
        icon: buildExists
            ? path.join(__dirname, '../build/Cheiron_512x512.png')
            : path.join(__dirname, 'Cheiron_512x512.png'),
        buttons: ['はい', 'いいえ'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        normalizeAccessKeys: false
    });
    return result.response === 0;
});