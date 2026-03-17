/**
 * @fileoverview Electron 메인 프로세스
 * @description 앱 초기화, 창 관리, IPC 핸들러 정의
 */

import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  session,
  safeStorage,
  type MenuItemConstructorOptions,
  type IpcMainInvokeEvent,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { autoUpdater } from 'electron-updater';

// ========================================
// Type Definitions
// ========================================

interface Settings {
  autoSaveFolder?: string;
  theme?: string;
  itemsPerPage?: number;
  firebaseConfig?: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

interface FileOperationResult {
  success: boolean;
  error?: string;
  content?: string;
}

interface RateLimiterEntry {
  start: number;
  count: number;
}

// ========================================
// IPC Rate Limiter Constants
// ========================================

/**
 * IPC Rate Limiter 설정
 * - WINDOW_MS: 측정 윈도우 (밀리초)
 * - MAX_CALLS_FILE: 파일 작업 최대 호출 수 (보안상 제한적)
 * - MAX_CALLS_GENERAL: 일반 IPC 최대 호출 수
 */
const IPC_RATE_LIMIT = {
  WINDOW_MS: 1000,
  MAX_CALLS_FILE: 10,      // 파일 작업: 초당 10회 (보안 강화)
  MAX_CALLS_GENERAL: 30,   // 일반 IPC: 초당 30회
} as const;

// ========================================
// Release Channel Configuration
// ========================================

const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL || 'stable';

// ========================================
// Auto Updater Configuration
// ========================================

autoUpdater.logger = console;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// GitHub 릴리스에서 업데이트 확인하도록 설정 (Release channel 반영)
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'bluesky78060',
  repo: 'sample-log-electron',
  releaseType: RELEASE_CHANNEL === 'beta' ? 'prerelease' : 'release',
});

// ========================================
// Error Handling
// ========================================

// EPIPE 에러 무시 (부모 프로세스 파이프가 닫힌 경우 console.log에서 발생)
process.stdout?.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EPIPE') throw err;
});
process.stderr?.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EPIPE') throw err;
});
process.on('uncaughtException', (err) => {
  if (err.message === 'write EPIPE') return;
  console.error('[Uncaught Exception]', err);
  app.quit();
});

// ========================================
// Windows Squirrel Startup
// ========================================

// Windows 설치/제거 시 바로가기 생성/삭제 처리
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
  app.quit();
}

// ========================================
// Main Window
// ========================================

let mainWindow: BrowserWindow | null = null;

// ========================================
// Path Validation
// ========================================

/**
 * 허용된 경로인지 검증 (Path Traversal 방지)
 * realpath를 사용하여 심볼릭 링크 해석 후 실제 경로 확인
 */
async function validateFilePath(filePath: string): Promise<ValidationResult> {
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
    '../',
    '..\\', // 기본 상대 경로
    '..%2F',
    '..%5C', // URL 인코딩된 상대 경로
    '%2e%2e%2f',
    '%2e%2e%5c', // URL 인코딩된 점
    '..%252f',
    '..%255c', // 이중 인코딩
    '/../',
    '/..\\', // 절대 경로 내 상대 경로
    '\\..\\', // Windows UNC 경로
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

  // 4. 파일명 유효성 검사 - 위험한 문자만 차단
  const basename = path.basename(filePath);
  const invalidFilenameChars = /[<>:"|?*\x00-\x1f\\]/;
  if (basename && invalidFilenameChars.test(basename)) {
    return { valid: false, error: '파일명에 허용되지 않은 문자가 포함되어 있습니다.' };
  }

  // 허용된 디렉토리 목록
  const allowedDirs = [
    app.getPath('userData'), // 앱 데이터 폴더
    app.getPath('documents'), // 문서 폴더
    app.getPath('downloads'), // 다운로드 폴더
    app.getPath('desktop'), // 바탕화면

    // 특정 하위 폴더만 허용
    path.join(app.getPath('documents'), 'SampleLog'),
    path.join(app.getPath('downloads'), 'SampleLog'),
  ];

  // 사용자가 설정한 자동저장 폴더도 허용 경로에 추가
  try {
    const settings = loadSettings();
    if (settings.autoSaveFolder) {
      allowedDirs.push(settings.autoSaveFolder);
    }
  } catch {
    // 설정 로드 실패 시 무시
  }

  try {
    // 경로를 절대 경로로 변환
    const absolutePath = path.resolve(filePath);

    // PER-10: 비동기 I/O로 전환 (메인 스레드 블로킹 방지)
    let realPath: string;
    try {
      await fs.promises.access(absolutePath);
      realPath = await fs.promises.realpath(absolutePath);
    } catch {
      // 파일이 없으면 부모 디렉토리 확인
      const parentDir = path.dirname(absolutePath);
      try {
        await fs.promises.access(parentDir);
        const realParent = await fs.promises.realpath(parentDir);
        realPath = path.join(realParent, path.basename(absolutePath));
      } catch {
        realPath = absolutePath;
      }
    }

    // 정규화된 실제 경로가 허용된 디렉토리 내부인지 확인
    const allowedChecks = await Promise.all(
      allowedDirs.map(async (allowedDir) => {
        try {
          let realAllowedDir: string;
          try {
            await fs.promises.access(allowedDir);
            realAllowedDir = await fs.promises.realpath(allowedDir);
          } catch {
            realAllowedDir = allowedDir;
          }
          return realPath.startsWith(realAllowedDir + path.sep) || realPath === realAllowedDir;
        } catch {
          return false;
        }
      })
    );

    if (!allowedChecks.some(Boolean)) {
      return { valid: false, error: '허용되지 않은 경로입니다.' };
    }

    return { valid: true, resolvedPath: realPath };
  } catch (error) {
    return { valid: false, error: '경로 검증 중 오류가 발생했습니다: ' + (error as Error).message };
  }
}

// ========================================
// Menu Template
// ========================================

/**
 * 한글 메뉴 템플릿 생성
 */
const createMenuTemplate = (): MenuItemConstructorOptions[] => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '파일',
      submenu: [
        { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '종료', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
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
        { label: '모두 선택', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
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
        { label: '개발자 도구', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
      ],
    },
    {
      label: '창',
      submenu: [
        { label: '최소화', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '닫기', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
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
        { label: '종료', accelerator: 'Command+Q', role: 'quit' },
      ],
    });
  }

  return template;
};

// ========================================
// Window Creation
// ========================================

/**
 * 메인 윈도우 생성
 */
const createWindow = (): void => {
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
      nodeIntegration: false,
    },
  });

  // 앱 로드 전략:
  // 1. VITE_DEV_SERVER_URL 환경변수가 있으면 Vite dev server 사용
  // 2. 없으면 Vite dev server(localhost:3000)에 연결 시도
  // 3. 둘 다 안 되면 빌드된 docs/index.html 로드
  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3005';
  const docsPath = path.join(__dirname, '..', 'docs', 'index.html');

  async function loadApp(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(VITE_DEV_SERVER_URL, { timeout: 1000 }, (res) => {
          res.destroy();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      mainWindow!.loadURL(VITE_DEV_SERVER_URL);
      console.log(`[App] Vite dev server에서 로드: ${VITE_DEV_SERVER_URL}`);
    } catch {
      if (fs.existsSync(docsPath)) {
        mainWindow!.loadFile(docsPath);
        console.log(`[App] 빌드된 파일에서 로드: ${docsPath}`);
      } else {
        mainWindow!.loadURL(
          `data:text/html;charset=utf-8,
          <h2 style="font-family:sans-serif;padding:2rem;">앱을 시작할 수 없습니다</h2>
          <p style="font-family:sans-serif;padding:0 2rem;">
            <code>npm run build</code> 로 빌드하거나<br>
            <code>npm run dev</code> 로 개발 서버를 시작해주세요.
          </p>`
        );
      }
    }
  }

  // Content Security Policy 설정 (보안 경고 제거)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // 개발 모드: Vite HMR 허용
          process.env.NODE_ENV === 'development'
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:* ws://localhost:* https://t1.kakaocdn.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://t1.kakaocdn.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:* https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.ipify.org; frame-src 'self' http://postcode.map.daum.net https://postcode.map.daum.net http://*.daumcdn.net https://*.daumcdn.net http://postcode.map.kakao.com https://postcode.map.kakao.com http://*.kakaocdn.net https://*.kakaocdn.net;"
            // 프로덕션: Kakao postcode SDK가 http://postcode.map.kakao.com을 직접 로드하므로 HTTP도 허용
            : "default-src 'self'; script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://t1.kakaocdn.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.ipify.org; frame-src 'self' http://postcode.map.daum.net https://postcode.map.daum.net http://*.daumcdn.net https://*.daumcdn.net http://postcode.map.kakao.com https://postcode.map.kakao.com http://*.kakaocdn.net https://*.kakaocdn.net;"
        ]
      }
    });
  });

  loadApp();

  // Beta indicator in title (if beta channel)
  if (RELEASE_CHANNEL === 'beta') {
    mainWindow.setTitle(mainWindow.getTitle() + ' [BETA]');
  }

  // 내부 링크 네비게이션 허용 (docs/ 하위 폴더)
  mainWindow.webContents.on('will-navigate', (_event, url) => {
    if (url.startsWith('file://') && (url.includes('/docs/') || url.includes('/src/'))) {
      // 허용
    }
  });

  // 개발 모드에서 DevTools 열기
  if (
    process.env.DEV_MODE === '1' ||
    process.argv.includes('--dev') ||
    process.env.NODE_ENV === 'development'
  ) {
    mainWindow.webContents.openDevTools();
  }
};

// ========================================
// App Initialization
// ========================================

// Electron 초기화 완료 후 브라우저 창 생성 준비
app.whenReady().then(async () => {
  // 개발 모드에서 캐시 클리어
  const isDev =
    process.argv.includes('--dev') ||
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_MODE === '1';

  if (isDev) {
    await session.defaultSession.clearCache();
    console.log('[Dev] Cache cleared');
  }

  // CSP (Content-Security-Policy) 및 보안 헤더 설정
  // file:// 프로토콜에만 적용 (외부 URL은 가로채지 않음)
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['file:///*'] }, // 필터: file:// URL만 가로채기 (macOS/Linux)
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' file:; " +
              // unsafe-eval 제거 완료: eval(), Function(), setTimeout(string) 사용 차단
              // unsafe-inline은 단계적 마이그레이션을 위해 일시적으로 유지 (추후 해시 방식으로 전환 예정)
              "script-src 'self' 'unsafe-inline' file: https://cdn.tailwindcss.com https://www.gstatic.com https://cdn.sheetjs.com https://t1.kakaocdn.net https://t1.daumcdn.net https://cdnjs.cloudflare.com; " +
              "style-src 'self' 'unsafe-inline' file: https://fonts.googleapis.com https://t1.kakaocdn.net; " +
              "font-src 'self' file: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.ipify.org https://www.gstatic.com https://cdnjs.cloudflare.com; " +
              "img-src 'self' file: data:; " +
              "frame-src 'self' http://t1.kakaocdn.net https://t1.kakaocdn.net http://postcode.map.kakao.com https://postcode.map.kakao.com http://*.kakaocdn.net https://*.kakaocdn.net http://t1.daumcdn.net https://t1.daumcdn.net http://postcode.map.daum.net https://postcode.map.daum.net http://*.daumcdn.net https://*.daumcdn.net; " + // Kakao 우편번호 API iframe (HTTP/HTTPS 모두 허용)
              "object-src 'none'; " + // Flash, Java 등 플러그인 차단
              "base-uri 'self'; " + // <base> 태그 제한
              "form-action 'self'; " + // 폼 제출 대상 제한
              "frame-ancestors 'none'; " + // iframe 내 로드 방지
              'upgrade-insecure-requests;', // HTTP를 HTTPS로 업그레이드
          ],
          // 추가 보안 헤더
          'X-Content-Type-Options': ['nosniff'], // MIME 타입 스니핑 방지
          'X-Frame-Options': ['DENY'], // 클릭재킹 방지
          'X-XSS-Protection': ['1; mode=block'], // XSS 필터 활성화 (레거시 브라우저용)
          'Referrer-Policy': ['strict-origin-when-cross-origin'], // Referrer 정보 제한
          'Permissions-Policy': [
            // 브라우저 기능 제한
            'camera=(), ' + 'microphone=(), ' + 'geolocation=(), ' + 'payment=()',
          ],
        },
      });
    }
  );

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
// Auto Updater Event Handlers
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
    buttons: ['확인'],
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('현재 최신 버전입니다:', info.version);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`다운로드 진행: ${Math.round(progressObj.percent)}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: '업데이트 준비 완료',
      message: `새 버전(${info.version})이 다운로드되었습니다.\n재시작하여 업데이트를 적용하시겠습니까?`,
      buttons: ['재시작', '나중에'],
    })
    .then((result) => {
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
// File System IPC Handlers
// ========================================

// 파일 저장 다이얼로그
ipcMain.handle('save-file-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || '파일 저장',
    defaultPath: options.defaultPath || '',
    filters: options.filters || [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

// 키 파일 내보내기 (다이얼로그 + 저장을 한 번에)
ipcMain.handle('export-key-file', async (_event, keyFileContent: string) => {
  try {
    if (typeof keyFileContent !== 'string' || keyFileContent.length < 20 || keyFileContent.length > 64) {
      return { success: false, error: 'Invalid key content' };
    }
    if (!mainWindow) return { success: false, error: 'No main window' };
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '암호화 키 파일 백업',
      defaultPath: 'sample-log.key',
      filters: [
        { name: '키 파일', extensions: ['key'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'canceled' };
    }
    fs.writeFileSync(result.filePath, keyFileContent, 'utf-8');
    console.log('[Encryption] Key file exported to:', result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('[Encryption] Key export failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 키 파일 가져오기 (다이얼로그 + 읽기를 한 번에)
ipcMain.handle('import-key-file', async () => {
  try {
    if (!mainWindow) return { success: false, error: 'No main window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '암호화 키 파일 선택',
      filters: [
        { name: '키 파일', extensions: ['key'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: 'canceled' };
    }
    const content = fs.readFileSync(result.filePaths[0], 'utf-8').trim();
    return { success: true, content };
  } catch (error) {
    console.error('[Encryption] Key import failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// 파일 열기 다이얼로그
ipcMain.handle('open-file-dialog', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || '파일 열기',
    filters: options.filters || [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// ========================================
// IPC Rate Limiter
// ========================================

const ipcRateLimiter = (() => {
  const callCounts = new Map<string, RateLimiterEntry>();
  // 파일 작업 채널 목록 (보안상 더 엄격한 제한 적용)
  const fileChannels = new Set(['write-file', 'read-file', 'save-file-dialog', 'open-file-dialog']);

  return {
    check(channel: string): boolean {
      const now = Date.now();
      const entry = callCounts.get(channel);
      const maxCalls = fileChannels.has(channel)
        ? IPC_RATE_LIMIT.MAX_CALLS_FILE
        : IPC_RATE_LIMIT.MAX_CALLS_GENERAL;

      if (!entry || now - entry.start > IPC_RATE_LIMIT.WINDOW_MS) {
        callCounts.set(channel, { start: now, count: 1 });
        return true;
      }
      entry.count++;
      if (entry.count > maxCalls) return false;
      return true;
    },
  };
})();

// ========================================
// File Read/Write IPC Handlers
// ========================================

// 파일 쓰기 (경로 검증 포함, 재시도 로직)
ipcMain.handle(
  'write-file',
  async (_event, filePath: string, content: string): Promise<FileOperationResult> => {
    try {
      if (!ipcRateLimiter.check('write-file')) {
        return { success: false, error: '요청이 너무 빈번합니다. 잠시 후 다시 시도하세요.' };
      }
      // 경로 검증
      const validation = await validateFilePath(filePath);
      if (!validation.valid) {
        console.warn(`[보안] 파일 쓰기 거부: ${filePath} - ${validation.error}`);
        return { success: false, error: validation.error };
      }

      // 재시도 로직 (간단 버전)
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await fs.promises.writeFile(filePath, content, 'utf8');
          console.log(`[IPC] 파일 쓰기 성공: ${filePath}`);
          return { success: true };
        } catch (err) {
          lastError = err as Error;
          if (attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            console.warn(
              `[IPC] 파일 쓰기 실패 (${attempt}/3), ${delay}ms 후 재시도: ${lastError.message}`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      console.error('[IPC] 파일 쓰기 최종 실패:', lastError);
      return { success: false, error: lastError?.message };
    } catch (error) {
      console.error('[IPC] write-file 핸들러 오류:', error);
      return { success: false, error: (error as Error).message };
    }
  }
);

// 파일 읽기 (경로 검증 포함, 재시도 로직)
ipcMain.handle('read-file', async (_event, filePath: string): Promise<FileOperationResult> => {
  try {
    if (!ipcRateLimiter.check('read-file')) {
      return { success: false, error: '요청이 너무 빈번합니다. 잠시 후 다시 시도하세요.' };
    }
    // 경로 검증
    const validation = await validateFilePath(filePath);
    if (!validation.valid) {
      console.warn(`[보안] 파일 읽기 거부: ${filePath} - ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const stat = await fs.promises.stat(validation.resolvedPath!);
    if (stat.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `파일이 너무 큽니다 (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB).`,
      };
    }

    // 재시도 로직
    let lastError: NodeJS.ErrnoException | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        console.log(`[IPC] 파일 읽기 성공: ${filePath}`);
        return { success: true, content };
      } catch (err) {
        lastError = err as NodeJS.ErrnoException;
        if (attempt < 3 && lastError.code !== 'ENOENT') {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(
            `[IPC] 파일 읽기 실패 (${attempt}/3), ${delay}ms 후 재시도: ${lastError.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break; // ENOENT는 재시도 불필요
        }
      }
    }

    console.error('[IPC] 파일 읽기 최종 실패:', lastError);
    return { success: false, error: lastError?.message };
  } catch (error) {
    console.error('[IPC] read-file 핸들러 오류:', error);
    return { success: false, error: (error as Error).message };
  }
});

// ========================================
// Settings Management
// ========================================

/**
 * 자동 저장 설정 파일 경로
 */
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * 설정 로드
 */
function loadSettings(): Settings {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(data) as Record<string, unknown>;
      // 무결성 검증: 허용된 키만 통과
      const ALLOWED_KEYS = ['autoSaveFolder', 'theme', 'itemsPerPage', 'firebaseConfig'] as const;
      const validated: Settings = {};
      for (const key of ALLOWED_KEYS) {
        if (key in settings) {
          (validated as Record<string, unknown>)[key] = settings[key];
        }
      }
      // autoSaveFolder 경로 검증
      if (validated.autoSaveFolder && typeof validated.autoSaveFolder === 'string') {
        if (validated.autoSaveFolder.includes('..') || validated.autoSaveFolder.includes('\0')) {
          delete validated.autoSaveFolder;
        }
      }
      return validated;
    }
  } catch (error) {
    console.error('설정 로드 오류:', error);
  }
  return {};
}

/**
 * 설정 저장
 */
function saveSettings(settings: Settings): boolean {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('설정 저장 오류:', error);
    return false;
  }
}

// ========================================
// Auto-save Path IPC Handlers
// ========================================

// 자동 저장 경로 가져오기 (타입별, 연도별로 다른 파일명 사용)
ipcMain.handle('get-auto-save-path', async (_event, type?: string, year?: number | string) => {
  // 입력 검증
  const ALLOWED_TYPES = ['soil', 'water', 'compost', 'heavy-metal', 'heavyMetal', 'pesticide', '잔류농약'];
  if (type && (typeof type !== 'string' || !ALLOWED_TYPES.includes(type))) {
    throw new Error(`허용되지 않는 시료 타입: ${type}`);
  }
  if (year && (typeof year !== 'number' && typeof year !== 'string') || (year && !/^\d{4}$/.test(String(year)))) {
    throw new Error(`유효하지 않은 연도: ${year}`);
  }
  const settings = loadSettings();
  // 연도가 있으면 연도별 파일명 생성 (예: auto-save-heavy-metal-2025.json)
  let fileName: string;
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
  if (!mainWindow) return { success: false, canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '자동 저장 폴더 선택',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: '폴더 선택',
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
    path: path.join(selectedFolder, defaultFileName),
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
// 흙토람 팝업 윈도우
// ========================================

ipcMain.handle('open-heuktoram', async () => {
  const heuktoramWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1000,
    minHeight: 600,
    title: '흙토람 내보내기',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const heuktoramPath = path.join(__dirname, '..', 'docs', 'heuktoram', 'index.html');

  // 프로덕션에서는 개발 서버 체크 없이 직접 파일 로드
  if (!app.isPackaged) {
    const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3005';
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(VITE_DEV_SERVER_URL, { timeout: 1000 }, (res) => {
          res.destroy();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      heuktoramWindow.loadURL(`${VITE_DEV_SERVER_URL}/heuktoram/`);
      return true;
    } catch {
      // 개발 서버 없으면 파일 로드로 폴백
    }
  }

  if (fs.existsSync(heuktoramPath)) {
    heuktoramWindow.loadFile(heuktoramPath);
  } else {
    dialog.showErrorBox('오류', '흙토람 페이지를 찾을 수 없습니다. 먼저 빌드를 실행해 주세요.');
    heuktoramWindow.close();
    return false;
  }
  return true;
});

// ========================================
// Firebase Auth File IPC Handlers
// ========================================

/**
 * Firebase 인증 파일 경로
 */
function getAuthFilePath(): string {
  return path.join(app.getPath('userData'), 'firebase-auth.json');
}

// 인증 파일 읽기
ipcMain.handle('read-auth-file', async () => {
  try {
    const authFilePath = getAuthFilePath();

    if (!fs.existsSync(authFilePath)) {
      return { success: false, exists: false };
    }

    const content = fs.readFileSync(authFilePath, 'utf8');
    return { success: true, exists: true, content };
  } catch (error) {
    console.error('[AuthFile] 읽기 오류:', error);
    return { success: false, exists: false, error: (error as Error).message };
  }
});

// 인증 파일 저장 (메인 프로세스에서도 검증 - defense-in-depth)
ipcMain.handle('save-auth-file', async (_event, content: string) => {
  try {
    // 크기 제한 (10KB)
    if (!content || typeof content !== 'string' || content.length > 10240) {
      return { success: false, error: '유효하지 않은 내용입니다 (최대 10KB).' };
    }

    // JSON 및 필수 필드 검증
    let config: { apiKey?: string; projectId?: string };
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
    const validation = await validateFilePath(authFilePath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    fs.writeFileSync(authFilePath, content, { encoding: 'utf8', mode: 0o600 });
    console.log('[AuthFile] 저장 완료:', authFilePath);
    return { success: true };
  } catch (error) {
    console.error('[AuthFile] 저장 오류:', error);
    return { success: false, error: (error as Error).message };
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
    return { success: false, error: (error as Error).message };
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
    return { exists: false, error: (error as Error).message };
  }
});

// 인증 파일 선택 다이얼로그 (Electron 네이티브)
ipcMain.handle('select-auth-file', async () => {
  try {
    // 기본 경로: 앱 실행 디렉토리 (프로젝트 루트)
    const defaultPath = process.cwd();
    console.log('[AuthFile] 파일 선택 다이얼로그 열림, 기본 경로:', defaultPath);

    if (!mainWindow) return { success: false, error: 'No main window' };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Firebase 인증 파일 선택 (firebase-auth.json)',
      defaultPath: defaultPath,
      buttonLabel: '선택',
      filters: [
        { name: 'JSON 파일', extensions: ['json'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    // 선택한 파일 읽기 (크기 제한: 10KB - 인증 파일은 1KB 미만이어야 정상)
    const selectedPath = result.filePaths[0];
    const stat = fs.statSync(selectedPath);
    if (stat.size > 10240) {
      return {
        success: false,
        error: '파일이 너무 큽니다 (최대 10KB). 올바른 인증 파일인지 확인하세요.',
      };
    }
    const content = fs.readFileSync(selectedPath, 'utf8');

    // JSON 유효성 검사
    try {
      const config = JSON.parse(content) as { apiKey?: string; projectId?: string };
      if (!config.apiKey || !config.projectId) {
        return {
          success: false,
          error: '유효하지 않은 인증 파일입니다. apiKey와 projectId가 필요합니다.',
        };
      }

      // 인증 파일로 저장
      const authFilePath = getAuthFilePath();
      fs.writeFileSync(authFilePath, content, { encoding: 'utf8', mode: 0o600 });
      console.log('[AuthFile] 선택 및 저장 완료:', authFilePath);

      return { success: true, projectId: config.projectId };
    } catch {
      return { success: false, error: '파일이 올바른 JSON 형식이 아닙니다.' };
    }
  } catch (error) {
    console.error('[AuthFile] 선택 오류:', error);
    return { success: false, error: (error as Error).message };
  }
});

// ========================================
// Encryption Key/Salt IPC Handlers
// ========================================

const KEY_FILE_NAME = 'sample-log.key';
const SALT_FILE = 'salt.dat';
const RECOVERY_BLOB_FILE = 'recovery-blob.dat';

/**
 * 요청이 알려진 BrowserWindow에서 왔는지 검증
 */
function isValidSender(event: IpcMainInvokeEvent): boolean {
  const validWindows = BrowserWindow.getAllWindows().map((w) => w.webContents.id);
  return validWindows.includes(event.sender.id);
}

/** 키 파일 존재 여부 확인 */
ipcMain.handle('key-file-exists', async () => {
  try {
    const keyPath = path.join(app.getPath('userData'), KEY_FILE_NAME);
    return fs.existsSync(keyPath);
  } catch {
    return false;
  }
});

/** 키 파일 읽기 (safeStorage 보호) */
ipcMain.handle('read-key-file', async () => {
  try {
    const keyPath = path.join(app.getPath('userData'), KEY_FILE_NAME);
    if (!fs.existsSync(keyPath)) {
      return null;
    }
    const data = fs.readFileSync(keyPath);

    // safeStorage로 복호화 시도
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(data);
      } catch {
        // 기존 평문 파일 → safeStorage로 마이그레이션
        const plaintext = data.toString('utf-8').trim();
        if (plaintext) {
          const encrypted = safeStorage.encryptString(plaintext);
          fs.writeFileSync(keyPath, encrypted);
          console.log('[Encryption] 키 파일을 safeStorage로 마이그레이션 완료');
          return plaintext;
        }
      }
    }
    // safeStorage 불가 시 평문 읽기
    return data.toString('utf-8').trim();
  } catch (error) {
    console.error('[Encryption] 키 파일 읽기 실패:', error);
    return null;
  }
});

/** 키 파일 저장 (safeStorage 암호화) */
ipcMain.handle('save-key-file', async (event, keyFileContent: string) => {
  if (!isValidSender(event)) return { success: false, error: 'Invalid sender' };
  // 키 파일 내용 검증: Base64 문자열, 32바이트 = ~44자
  if (typeof keyFileContent !== 'string' || keyFileContent.length < 20 || keyFileContent.length > 64) {
    return { success: false, error: 'Invalid key file format' };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(keyFileContent)) {
    return { success: false, error: 'Invalid key file encoding' };
  }
  try {
    const keyPath = path.join(app.getPath('userData'), KEY_FILE_NAME);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(keyFileContent);
      fs.writeFileSync(keyPath, encrypted);
    } else {
      fs.writeFileSync(keyPath, keyFileContent, 'utf-8');
    }
    console.log('[Encryption] 키 파일 로컬 저장 완료');
    return { success: true };
  } catch (error) {
    console.error('[Encryption] 키 파일 저장 실패:', error);
    return { success: false, error: (error as Error).message };
  }
});

/** Salt 저장 (safeStorage 암호화) */
ipcMain.handle('save-salt', async (event, saltBase64: string) => {
  if (!isValidSender(event)) return { success: false, error: 'Invalid sender' };
  // Salt 입력 검증: Base64 문자열, 적절한 길이 (16~32바이트 = 24~44자 Base64)
  if (typeof saltBase64 !== 'string' || saltBase64.length < 20 || saltBase64.length > 64) {
    return { success: false, error: 'Invalid salt format' };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(saltBase64)) {
    return { success: false, error: 'Invalid salt encoding' };
  }
  try {
    const saltPath = path.join(app.getPath('userData'), SALT_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(saltBase64);
      fs.writeFileSync(saltPath, encrypted);
      return { success: true };
    }
    // safeStorage 사용 불가 시 평문 저장 (Salt 자체는 비밀이 아니므로 보안 위험은 낮음)
    console.warn('[Security] safeStorage unavailable - salt stored as plaintext at:', saltPath);
    fs.writeFileSync(saltPath, saltBase64, 'utf-8');
    return { success: true, warning: 'safeStorage unavailable, salt stored as plaintext' };
  } catch (error) {
    console.error('[Encryption] Salt 저장 실패:', error);
    return { success: false, error: (error as Error).message };
  }
});

/** Salt 로드 (safeStorage 복호화) */
ipcMain.handle('load-salt', async () => {
  try {
    const saltPath = path.join(app.getPath('userData'), SALT_FILE);
    if (!fs.existsSync(saltPath)) {
      return null;
    }
    const data = fs.readFileSync(saltPath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    // 평문 폴백
    return data.toString('utf-8');
  } catch (error) {
    console.error('[Encryption] Salt 로드 실패:', error);
    return null;
  }
});

/** 복구 블롭 로컬 저장 (safeStorage 암호화) */
ipcMain.handle('save-recovery-blob', async (event, blobJson: string) => {
  if (!isValidSender(event)) return { success: false, error: 'Invalid sender' };
  if (typeof blobJson !== 'string' || blobJson.length < 10 || blobJson.length > 4096) {
    return { success: false, error: 'Invalid blob format' };
  }
  try {
    const blobPath = path.join(app.getPath('userData'), RECOVERY_BLOB_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(blobJson);
      fs.writeFileSync(blobPath, encrypted);
    } else {
      fs.writeFileSync(blobPath, blobJson, 'utf-8');
    }
    console.log('[Encryption] Recovery blob stored locally');
    return { success: true };
  } catch (error) {
    console.error('[Encryption] Recovery blob save failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

/** 복구 블롭 로컬 로드 (safeStorage 복호화) */
ipcMain.handle('load-recovery-blob', async () => {
  try {
    const blobPath = path.join(app.getPath('userData'), RECOVERY_BLOB_FILE);
    if (!fs.existsSync(blobPath)) {
      return null;
    }
    const data = fs.readFileSync(blobPath);
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(data);
      } catch {
        // 평문 마이그레이션
        const plaintext = data.toString('utf-8').trim();
        if (plaintext) {
          const encrypted = safeStorage.encryptString(plaintext);
          fs.writeFileSync(blobPath, encrypted);
          return plaintext;
        }
      }
    }
    return data.toString('utf-8').trim();
  } catch (error) {
    console.error('[Encryption] Recovery blob load failed:', error);
    return null;
  }
});

// ========================================
// Session Password (Memory-only)
// ========================================

/** 세션 동안만 유지되는 암호화된 비밀번호 */
let _sessionPasswordEncrypted: Buffer | null = null;

/** 세션 비밀번호 저장 (safeStorage 암호화, 메모리에만) */
ipcMain.handle('store-session-password', async (event, password: string) => {
  if (!isValidSender(event)) return false;
  if (typeof password !== 'string' || password.length === 0 || password.length > 128) return false;
  if (safeStorage.isEncryptionAvailable()) {
    _sessionPasswordEncrypted = safeStorage.encryptString(password);
  } else {
    // safeStorage 미사용 시 평문 저장 거부 - 페이지 이동마다 비밀번호 재입력 필요
    console.warn(
      '[Security] safeStorage unavailable - session password not stored (requires re-entry per page)'
    );
    _sessionPasswordEncrypted = null;
    return false;
  }
  return true;
});

/** 세션 비밀번호 반환 */
ipcMain.handle('get-session-password', async (event) => {
  if (!isValidSender(event)) return null;
  if (!_sessionPasswordEncrypted) return null;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(_sessionPasswordEncrypted);
    } catch {
      _sessionPasswordEncrypted = null;
      return null;
    }
  }
  return _sessionPasswordEncrypted.toString('utf-8');
});

/** 세션 비밀번호 삭제 */
ipcMain.handle('clear-session-password', async (event) => {
  if (!isValidSender(event)) return false;
  _sessionPasswordEncrypted = null;
  return true;
});

// ========================================
// VWORLD 지번 지오코딩 (main process → Origin 헤더 없음, 도메인 제한 우회)
// ========================================

ipcMain.handle('vworld-geocode', async (_event, { address, apiKey }: { address: string; apiKey: string }) => {
  const https = require('node:https');
  const url = `https://api.vworld.kr/req/address?service=address&request=getCoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=parcel&key=${apiKey}`;
  return new Promise<boolean | null>((resolve) => {
    const timeout = setTimeout(() => { req.destroy(); resolve(null); }, 8000);
    const req = https.get(url, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const json = JSON.parse(data);
          const ok = json?.response?.status === 'OK' &&
            parseInt(json?.response?.result?.totalCount ?? '0', 10) > 0;
          resolve(ok);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => { clearTimeout(timeout); resolve(null); });
  });
});
