/**
 * @fileoverview Electron 메인 프로세스
 * @description 앱 초기화, 창 관리, IPC 핸들러 정의
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { autoUpdater } = require('electron-updater');

// 자동 업데이트 설정
autoUpdater.logger = console;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// GitHub 릴리스에서 업데이트 확인하도록 설정
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'bluesky78060',
  repo: 'sample-log-electron'
});

// Windows 설치/제거 시 바로가기 생성/삭제 처리
if (require('electron-squirrel-startup')) {
  app.quit();
}

/** @type {Electron.BrowserWindow | null} */
let mainWindow = null;

/**
 * 허용된 경로인지 검증 (Path Traversal 방지)
 * realpath를 사용하여 심볼릭 링크 해석 후 실제 경로 확인
 * @param {string} filePath - 검증할 파일 경로
 * @returns {{valid: boolean, resolvedPath?: string, error?: string}} 검증 결과
 */
function validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return { valid: false, error: '유효하지 않은 파일 경로입니다.' };
    }

    // 추가 보안 검사
    // 1. Null 바이트 검사
    if (filePath.includes('\0')) {
        return { valid: false, error: '잘못된 파일 경로입니다. (null byte detected)' };
    }

    // 2. 상대 경로 요소 검사 (정규화 전) - 더 엄격한 검사
    const dangerousPatterns = [
        '../', '..\\', // 기본 상대 경로
        '..%2F', '..%5C', // URL 인코딩된 상대 경로
        '%2e%2e%2f', '%2e%2e%5c', // URL 인코딩된 점
        '..%252f', '..%255c', // 이중 인코딩
        '/../', '/..\\', // 절대 경로 내 상대 경로
        '\\..\\'  // Windows UNC 경로
    ];

    for (const pattern of dangerousPatterns) {
        if (filePath.toLowerCase().includes(pattern.toLowerCase())) {
            return { valid: false, error: '상대 경로 패턴이 감지되었습니다.' };
        }
    }

    // 3. URL 인코딩 감지 및 차단
    if (/%[0-9a-fA-F]{2}/.test(filePath)) {
        return { valid: false, error: 'URL 인코딩된 경로는 허용되지 않습니다.' };
    }

    // 3. 파일명 유효성 검사 - 위험한 문자만 차단
    const basename = path.basename(filePath);
    const invalidFilenameChars = /[<>:"|?*\x00-\x1f\\]/;
    if (basename && invalidFilenameChars.test(basename)) {
        return { valid: false, error: '파일명에 허용되지 않은 문자가 포함되어 있습니다.' };
    }

    // 허용된 디렉토리 목록
    const allowedDirs = [
        app.getPath('userData'),      // 앱 데이터 폴더
        app.getPath('documents'),     // 문서 폴더
        app.getPath('downloads'),     // 다운로드 폴더
        app.getPath('desktop'),       // 바탕화면
        // app.getPath('home') 제거 - 너무 광범위한 접근 권한

        // 대신 특정 하위 폴더만 허용
        path.join(app.getPath('documents'), 'SampleLog'), // 문서 폴더 내 앱 전용 폴더
        path.join(app.getPath('downloads'), 'SampleLog')  // 다운로드 폴더 내 앱 전용 폴더
    ];

    try {
        // 경로를 절대 경로로 변환
        const absolutePath = path.resolve(filePath);

        // 파일/디렉토리가 존재하면 realpath로 심볼릭 링크 해석
        let realPath;
        if (fs.existsSync(absolutePath)) {
            realPath = fs.realpathSync(absolutePath);
        } else {
            // 파일이 없으면 부모 디렉토리 확인
            const parentDir = path.dirname(absolutePath);
            if (fs.existsSync(parentDir)) {
                const realParent = fs.realpathSync(parentDir);
                realPath = path.join(realParent, path.basename(absolutePath));
            } else {
                realPath = absolutePath;
            }
        }

        // 정규화된 실제 경로가 허용된 디렉토리 내부인지 확인
        const isAllowedPath = allowedDirs.some(allowedDir => {
            try {
                // 허용된 디렉토리도 realpath로 해석
                const realAllowedDir = fs.existsSync(allowedDir)
                    ? fs.realpathSync(allowedDir)
                    : allowedDir;
                return realPath.startsWith(realAllowedDir + path.sep) || realPath === realAllowedDir;
            } catch {
                return false;
            }
        });

        if (!isAllowedPath) {
            return { valid: false, error: '허용되지 않은 경로입니다.' };
        }

        return { valid: true, resolvedPath: realPath };
    } catch (error) {
        return { valid: false, error: '경로 검증 중 오류가 발생했습니다: ' + error.message };
    }
}

/**
 * 한글 메뉴 템플릿 생성
 * @returns {Electron.MenuItemConstructorOptions[]}
 */
const createMenuTemplate = () => {
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    {
      label: '파일',
      submenu: [
        { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '종료', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: '편집',
      submenu: [
        { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '다시 실행', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '모두 선택', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '확대', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '축소', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '원래 크기', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '전체 화면', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: '개발자 도구', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' }
      ]
    },
    {
      label: '창',
      submenu: [
        { label: '최소화', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '닫기', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  // macOS 앱 메뉴 추가
  if (process.platform === 'darwin') {
    template.unshift({
      label: '시료 접수 대장',
      submenu: [
        { label: '시료 접수 대장 정보', role: 'about' },
        { type: 'separator' },
        { label: '환경설정...', accelerator: 'Command+,', enabled: false },
        { type: 'separator' },
        { label: '서비스', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: '시료 접수 대장 숨기기', accelerator: 'Command+H', role: 'hide' },
        { label: '기타 숨기기', accelerator: 'Command+Alt+H', role: 'hideOthers' },
        { label: '모두 표시', role: 'unhide' },
        { type: 'separator' },
        { label: '종료', accelerator: 'Command+Q', role: 'quit' }
      ]
    });
  }

  return template;
};

/**
 * 메인 윈도우 생성
 * @returns {void}
 */
const createWindow = () => {
  // 브라우저 창 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '시료 접수 대장',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 내부 링크 네비게이션 허용 (soil/, water/ 등 하위 폴더)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // file:// 프로토콜이고 src 폴더 내의 파일이면 허용
    if (url.startsWith('file://') && url.includes('/src/')) {
      // 허용 - 아무것도 하지 않음
    }
  });

  // 개발 모드에서 DevTools 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
};

// Electron 초기화 완료 후 브라우저 창 생성 준비
app.whenReady().then(() => {
  // CSP (Content-Security-Policy) 및 보안 헤더 설정
  // file:// 프로토콜에만 적용 (외부 URL은 가로채지 않음)
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['file:///*'] },  // 필터: file:// URL만 가로채기 (macOS/Linux)
    (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' file:; " +
          // unsafe-eval 제거 완료: eval(), Function(), setTimeout(string) 사용 차단
          // unsafe-inline은 단계적 마이그레이션을 위해 일시적으로 유지 (추후 해시 방식으로 전환 예정)
          "script-src 'self' 'unsafe-inline' file: https://cdn.tailwindcss.com https://www.gstatic.com https://cdn.sheetjs.com https://t1.daumcdn.net https://cdnjs.cloudflare.com; " +
          "style-src 'self' 'unsafe-inline' file: https://fonts.googleapis.com; " +
          "font-src 'self' file: https://fonts.gstatic.com; " +
          "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.ipify.org https://www.gstatic.com https://cdnjs.cloudflare.com; " +
          "img-src 'self' file: data:; " +
          "frame-src 'self' https://t1.daumcdn.net https://postcode.map.daum.net https://*.daumcdn.net; " +  // Daum 우편번호 API iframe
          "object-src 'none'; " +  // Flash, Java 등 플러그인 차단
          "base-uri 'self'; " +     // <base> 태그 제한
          "form-action 'self'; " +   // 폼 제출 대상 제한
          "frame-ancestors 'none'; " + // iframe 내 로드 방지
          "upgrade-insecure-requests;"  // HTTP를 HTTPS로 업그레이드
        ],
        // 추가 보안 헤더
        'X-Content-Type-Options': ['nosniff'],  // MIME 타입 스니핑 방지
        'X-Frame-Options': ['DENY'],  // 클릭재킹 방지
        'X-XSS-Protection': ['1; mode=block'],  // XSS 필터 활성화 (레거시 브라우저용)
        'Referrer-Policy': ['strict-origin-when-cross-origin'],  // Referrer 정보 제한
        'Permissions-Policy': [  // 브라우저 기능 제한
          "camera=(), " +
          "microphone=(), " +
          "geolocation=(), " +
          "payment=()"
        ]
      }
    });
  });

  // 한글 메뉴 적용
  const menu = Menu.buildFromTemplate(createMenuTemplate());
  Menu.setApplicationMenu(menu);

  createWindow();

  // 패키징된 앱에서만 자동 업데이트 체크
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // macOS에서 dock 아이콘 클릭 시 창이 없으면 새로 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ========================================
// 자동 업데이트 이벤트 핸들러
// ========================================

autoUpdater.on('checking-for-update', () => {
  console.log('업데이트 확인 중...');
});

autoUpdater.on('update-available', (info) => {
  console.log('업데이트 가능:', info.version);
  dialog.showMessageBox({
    type: 'info',
    title: '업데이트 발견',
    message: `새 버전(${info.version})이 있습니다.\n다운로드를 시작합니다.`,
    buttons: ['확인']
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('현재 최신 버전입니다:', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`다운로드 진행: ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: '업데이트 준비 완료',
    message: `새 버전(${info.version})이 다운로드되었습니다.\n재시작하여 업데이트를 적용하시겠습니까?`,
    buttons: ['재시작', '나중에']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  // 404 오류 (릴리스 파일 없음)는 무시 - macOS 빌드가 없을 때 발생
  if (err.message && err.message.includes('404')) {
    console.log('업데이트 파일 없음 (정상):', err.message);
    return;
  }
  console.error('업데이트 오류:', err);
});

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ========================================
// 파일 시스템 IPC 핸들러
// ========================================

// 파일 저장 다이얼로그
ipcMain.handle('save-file-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: options.title || '파일 저장',
        defaultPath: options.defaultPath || '',
        filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePath) {
        return result.filePath;
    }
    return null;
});

// 파일 열기 다이얼로그
ipcMain.handle('open-file-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options.title || '파일 열기',
        filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// 파일 쓰기 (경로 검증 포함)
ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        // 경로 검증
        const validation = validateFilePath(filePath);
        if (!validation.valid) {
            console.warn(`[보안] 파일 쓰기 거부: ${filePath} - ${validation.error}`);
            return { success: false, error: validation.error };
        }

        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 파일 읽기 (경로 검증 포함)
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        // 경로 검증
        const validation = validateFilePath(filePath);
        if (!validation.valid) {
            console.warn(`[보안] 파일 읽기 거부: ${filePath} - ${validation.error}`);
            return { success: false, error: validation.error };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * @typedef {Object} Settings
 * @property {string} [autoSaveFolder] - 자동 저장 폴더 경로
 */

/**
 * 자동 저장 설정 파일 경로
 * @returns {string}
 */
function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * 설정 로드
 * @returns {Settings}
 */
function loadSettings() {
    try {
        const settingsPath = getSettingsPath();
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('설정 로드 오류:', error);
    }
    return {};
}

/**
 * 설정 저장
 * @param {Settings} settings - 저장할 설정 객체
 * @returns {boolean}
 */
function saveSettings(settings) {
    try {
        const settingsPath = getSettingsPath();
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('설정 저장 오류:', error);
        return false;
    }
}

// 자동 저장 경로 가져오기 (타입별, 연도별로 다른 파일명 사용)
ipcMain.handle('get-auto-save-path', async (event, type, year) => {
    const settings = loadSettings();
    // 연도가 있으면 연도별 파일명 생성 (예: auto-save-heavy-metal-2025.json)
    let fileName;
    if (type && year) {
        fileName = `auto-save-${type}-${year}.json`;
    } else if (type) {
        fileName = `auto-save-${type}.json`;
    } else if (year) {
        fileName = `auto-save-${year}.json`;
    } else {
        fileName = 'auto-save.json';
    }

    if (settings.autoSaveFolder) {
        return path.join(settings.autoSaveFolder, fileName);
    }
    // 기본 경로
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, fileName);
});

// 자동 저장 폴더 선택
ipcMain.handle('select-auto-save-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: '자동 저장 폴더 선택',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: '폴더 선택'
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
    }

    const selectedFolder = result.filePaths[0];
    const settings = loadSettings();
    settings.autoSaveFolder = selectedFolder;
    saveSettings(settings);

    // 선택한 폴더 경로와 전체 경로 모두 반환
    const defaultFileName = 'auto-save.json';
    return {
        success: true,
        folder: selectedFolder,
        path: path.join(selectedFolder, defaultFileName)
    };
});

// 현재 자동 저장 폴더 가져오기
ipcMain.handle('get-auto-save-folder', async () => {
    const settings = loadSettings();
    return settings.autoSaveFolder || app.getPath('userData');
});

// 앱 데이터 경로 가져오기
ipcMain.handle('get-app-path', async () => {
    return app.getPath('userData');
});

// 앱 버전 가져오기
ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
});

// ========================================
// Firebase 인증 파일 IPC 핸들러
// ========================================

/**
 * Firebase 인증 파일 경로
 * @returns {string}
 */
function getAuthFilePath() {
    return path.join(app.getPath('userData'), 'firebase-auth.json');
}

// 인증 파일 읽기
ipcMain.handle('read-auth-file', async () => {
    try {
        const authFilePath = getAuthFilePath();

        if (!fs.existsSync(authFilePath)) {
            return { exists: false };
        }

        const content = fs.readFileSync(authFilePath, 'utf8');
        return { exists: true, content };
    } catch (error) {
        console.error('[AuthFile] 읽기 오류:', error);
        return { exists: false, error: error.message };
    }
});

// 인증 파일 저장 (메인 프로세스에서도 검증 - defense-in-depth)
ipcMain.handle('save-auth-file', async (event, content) => {
    try {
        // 크기 제한 (10KB)
        if (!content || typeof content !== 'string' || content.length > 10240) {
            return { success: false, error: '유효하지 않은 내용입니다 (최대 10KB).' };
        }

        // JSON 및 필수 필드 검증
        let config;
        try {
            config = JSON.parse(content);
        } catch {
            return { success: false, error: '유효한 JSON 형식이 아닙니다.' };
        }
        if (!config.apiKey || !config.projectId) {
            return { success: false, error: 'apiKey와 projectId가 필요합니다.' };
        }

        const authFilePath = getAuthFilePath();

        // 경로 검증 추가 (defense-in-depth)
        const validation = validateFilePath(authFilePath);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        fs.writeFileSync(authFilePath, content, { encoding: 'utf8', mode: 0o600 });
        console.log('[AuthFile] 저장 완료:', authFilePath);
        return { success: true };
    } catch (error) {
        console.error('[AuthFile] 저장 오류:', error);
        return { success: false, error: error.message };
    }
});

// 인증 파일 삭제
ipcMain.handle('delete-auth-file', async () => {
    try {
        const authFilePath = getAuthFilePath();

        if (fs.existsSync(authFilePath)) {
            fs.unlinkSync(authFilePath);
            console.log('[AuthFile] 삭제 완료:', authFilePath);
        }

        return { success: true };
    } catch (error) {
        console.error('[AuthFile] 삭제 오류:', error);
        return { success: false, error: error.message };
    }
});

// 인증 파일 존재 여부 확인
ipcMain.handle('check-auth-file', async () => {
    try {
        const authFilePath = getAuthFilePath();
        const exists = fs.existsSync(authFilePath);
        return { exists };
    } catch (error) {
        console.error('[AuthFile] 확인 오류:', error);
        return { exists: false, error: error.message };
    }
});

// 인증 파일 선택 다이얼로그 (Electron 네이티브)
ipcMain.handle('select-auth-file', async () => {
    try {
        // 기본 경로: 앱 실행 디렉토리 (프로젝트 루트)
        const defaultPath = process.cwd();
        console.log('[AuthFile] 파일 선택 다이얼로그 열림, 기본 경로:', defaultPath);

        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Firebase 인증 파일 선택 (firebase-auth.json)',
            defaultPath: defaultPath,
            buttonLabel: '선택',
            filters: [
                { name: 'JSON 파일', extensions: ['json'] },
                { name: '모든 파일', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        // 선택한 파일 읽기 (크기 제한: 10KB - 인증 파일은 1KB 미만이어야 정상)
        const selectedPath = result.filePaths[0];
        const stat = fs.statSync(selectedPath);
        if (stat.size > 10240) {
            return { success: false, error: '파일이 너무 큽니다 (최대 10KB). 올바른 인증 파일인지 확인하세요.' };
        }
        // 선택된 파일 경로 검증
        const pathValidation = validateFilePath(selectedPath);
        if (!pathValidation.valid) {
            return { success: false, error: pathValidation.error };
        }

        const content = fs.readFileSync(selectedPath, 'utf8');

        // JSON 유효성 검사
        try {
            const config = JSON.parse(content);
            if (!config.apiKey || !config.projectId) {
                return { success: false, error: '유효하지 않은 인증 파일입니다. apiKey와 projectId가 필요합니다.' };
            }

            // 인증 파일로 저장
            const authFilePath = getAuthFilePath();
            fs.writeFileSync(authFilePath, content, { encoding: 'utf8', mode: 0o600 });
            console.log('[AuthFile] 선택 및 저장 완료:', authFilePath);

            return { success: true, projectId: config.projectId };
        } catch (parseError) {
            return { success: false, error: '파일이 올바른 JSON 형식이 아닙니다.' };
        }
    } catch (error) {
        console.error('[AuthFile] 선택 오류:', error);
        return { success: false, error: error.message };
    }
});
