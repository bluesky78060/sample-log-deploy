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
  shell,
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
  MAX_CALLS_EXTERNAL: 5,   // 외부 API(JUSO 등): 초당 5회 (외부 쿼터 보호)
} as const;

// ========================================
// Release Channel Configuration
// ========================================

const RELEASE_CHANNEL = process.env.RELEASE_CHANNEL || 'stable';
const isDev =
  process.argv.includes('--dev') ||
  process.env.NODE_ENV === 'development' ||
  process.env.DEV_MODE === '1';

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

/**
 * M-3: 앱의 실제 docs 디렉토리 절대 경로 (will-navigate 검증용)
 * realpath로 심볼릭 링크 해석 (존재하지 않으면 resolve 경로 사용)
 */
const DOCS_DIR = (() => {
    const resolved = path.resolve(__dirname, '..', 'docs');
    try {
        return fs.realpathSync(resolved);
    } catch {
        return resolved;
    }
})();

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
    // 개발 모드에서만 Vite dev server 연결 시도
    if (isDev) {
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
        return;
      } catch {
        console.log('[App] Dev server 연결 실패, 빌드된 파일로 폴백');
      }
    }

    // 프로덕션: 빌드된 파일 직접 로드
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

  loadApp();

  // Beta indicator in title (if beta channel)
  if (RELEASE_CHANNEL === 'beta') {
    mainWindow.setTitle(mainWindow.getTitle() + ' [BETA]');
  }

  // M-3: 내부 링크 네비게이션 허용 (실제 docs 디렉토리 기준 검증)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) {
      try {
        const fileUrl = new URL(url);
        const filePath = decodeURIComponent(fileUrl.pathname);
        // Windows: pathname이 /C:/... 형식 → 선행 슬래시 제거
        const normalizedPath = process.platform === 'win32' ? filePath.replace(/^\//, '') : filePath;
        let realFilePath: string;
        try {
          realFilePath = fs.realpathSync(normalizedPath);
        } catch {
          realFilePath = path.resolve(normalizedPath);
        }
        if (realFilePath.startsWith(DOCS_DIR + path.sep) || realFilePath === DOCS_DIR) {
          return; // 허용
        }
      } catch {
        // 경로 파싱 실패 시 차단
      }
      event.preventDefault();
    }
  });

  // SEC(SAMPL-2-18): 신규 창 생성 차단 (window.open / target=_blank)
  // will-navigate는 같은 창 내 이동만 막으므로 새 BrowserWindow 생성은 별도 차단 필요.
  // 외부 https 링크는 OS 기본 브라우저로 위임하고, 그 외(file:/data: 포함)는 모두 거부한다.
  // 참고: 앱은 renderer에서 window.open을 사용하지만 Electron 경로에서는
  //  (1) 분석 팝업이 isElectron 가드로 IPC(electronAPI.openX)를 타고
  //  (2) viewer.html 팝업은 버튼/파일이 없는 죽은 코드라 호출되지 않으므로 현재 기능 무파손.
  //  (viewer 기능 복구나 가드 제거 시에는 내부 file:// 경로 허용 분기를 여기 추가할 것)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      // Promise 거부가 unhandledRejection이 되지 않도록 swallow (외부 브라우저 위임 실패는 무시 가능)
      void shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
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
  // SEC(SAMPL-2-18): 모든 webContents(메인+분석/팝업 창)에 신규 창 생성 일괄 차단.
  // 메인 윈도우는 createWindow에서 https 외부링크를 shell.openExternal로 위임하지만,
  // 자식 창들은 외부 링크가 필요 없으므로 전역적으로 신규 창을 거부한다.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });

  // 개발 모드에서 캐시 클리어
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
              "script-src 'self' file: https://cdn.tailwindcss.com https://www.gstatic.com https://cdn.sheetjs.com https://cdnjs.cloudflare.com; " +
              "style-src 'self' 'unsafe-inline' file: https://fonts.googleapis.com; " +
              "font-src 'self' file: https://fonts.gstatic.com; " +
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.ipify.org https://www.gstatic.com https://cdnjs.cloudflare.com https://openapi.foodsafetykorea.go.kr; " +
              "img-src 'self' file: data:; " +
              "frame-src 'self'; " + // (SAMPL-1-110) Daum/Kakao 우편번호 iframe 제거 — JUSO 검색으로 전환
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
  // 외부 API 채널 목록 (외부 쿼터 보호를 위해 더 낮은 제한)
  const externalChannels = new Set(['juso:search', 'vworld-geocode', 'psis:lookup-use']);

  return {
    check(channel: string): boolean {
      const now = Date.now();
      const entry = callCounts.get(channel);
      const maxCalls = fileChannels.has(channel)
        ? IPC_RATE_LIMIT.MAX_CALLS_FILE
        : externalChannels.has(channel)
          ? IPC_RATE_LIMIT.MAX_CALLS_EXTERNAL
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
// 수질분석 결과 입력 팝업 윈도우
// ========================================

let waterAnalysisWindow: BrowserWindow | null = null;

ipcMain.handle('open-water-analysis', async () => {
  if (waterAnalysisWindow && !waterAnalysisWindow.isDestroyed()) {
    waterAnalysisWindow.focus();
    return true;
  }

  waterAnalysisWindow = new BrowserWindow({
    width: 1500,
    height: 850,
    minWidth: 1100,
    minHeight: 600,
    title: '수질분석 결과 입력',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  waterAnalysisWindow.on('closed', () => { waterAnalysisWindow = null; });

  const waterAnalysisPath = path.join(__dirname, '..', 'docs', 'water-analysis', 'index.html');

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
      waterAnalysisWindow.loadURL(`${VITE_DEV_SERVER_URL}/water-analysis/`);
      return true;
    } catch {
      // 개발 서버 없으면 파일 로드로 폴백
    }
  }

  if (fs.existsSync(waterAnalysisPath)) {
    waterAnalysisWindow.loadFile(waterAnalysisPath);
  } else {
    dialog.showErrorBox('오류', '수질분석 결과 입력 페이지를 찾을 수 없습니다. 먼저 빌드를 실행해 주세요.');
    waterAnalysisWindow.close();
    return false;
  }
  return true;
});

// ========================================
// 잔류농약 분석결과 조회 팝업 윈도우
// ========================================

let pesticideAnalysisWindow: BrowserWindow | null = null;

ipcMain.handle('open-pesticide-analysis', async () => {
  if (pesticideAnalysisWindow && !pesticideAnalysisWindow.isDestroyed()) {
    pesticideAnalysisWindow.focus();
    return true;
  }

  pesticideAnalysisWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1000,
    minHeight: 600,
    title: '잔류농약 분석결과 조회',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  pesticideAnalysisWindow.on('closed', () => { pesticideAnalysisWindow = null; });

  const pesticideAnalysisPath = path.join(__dirname, '..', 'docs', 'pesticide-analysis', 'index.html');

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
      pesticideAnalysisWindow.loadURL(`${VITE_DEV_SERVER_URL}/pesticide-analysis/`);
      return true;
    } catch {
      // 개발 서버 없으면 파일 로드로 폴백
    }
  }

  if (fs.existsSync(pesticideAnalysisPath)) {
    pesticideAnalysisWindow.loadFile(pesticideAnalysisPath);
  } else {
    dialog.showErrorBox('오류', '잔류농약 분석결과 페이지를 찾을 수 없습니다. 먼저 빌드를 실행해 주세요.');
    pesticideAnalysisWindow.close();
    return false;
  }
  return true;
});

// ========================================
// 퇴·액비 분석결과 조회 팝업 윈도우
// ========================================

let compostAnalysisWindow: BrowserWindow | null = null;

ipcMain.handle('open-compost-analysis', async () => {
  if (compostAnalysisWindow && !compostAnalysisWindow.isDestroyed()) {
    compostAnalysisWindow.focus();
    return true;
  }

  compostAnalysisWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1000,
    minHeight: 600,
    title: '퇴·액비 분석결과 조회',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  compostAnalysisWindow.on('closed', () => { compostAnalysisWindow = null; });

  const compostAnalysisPath = path.join(__dirname, '..', 'docs', 'compost-analysis', 'index.html');

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
      compostAnalysisWindow.loadURL(`${VITE_DEV_SERVER_URL}/compost-analysis/`);
      return true;
    } catch {
      // 개발 서버 없으면 파일 로드로 폴백
    }
  }

  if (fs.existsSync(compostAnalysisPath)) {
    compostAnalysisWindow.loadFile(compostAnalysisPath);
  } else {
    dialog.showErrorBox('오류', '퇴·액비 분석결과 페이지를 찾을 수 없습니다. 먼저 빌드를 실행해 주세요.');
    compostAnalysisWindow.close();
    return false;
  }
  return true;
});

// ========================================
// 토양 중금속 분석결과 조회 팝업 윈도우
// ========================================

let heavyMetalAnalysisWindow: BrowserWindow | null = null;

ipcMain.handle('open-heavy-metal-analysis', async () => {
  if (heavyMetalAnalysisWindow && !heavyMetalAnalysisWindow.isDestroyed()) {
    heavyMetalAnalysisWindow.focus();
    return true;
  }

  heavyMetalAnalysisWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1000,
    minHeight: 600,
    title: '토양 중금속 분석결과 조회',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  heavyMetalAnalysisWindow.on('closed', () => { heavyMetalAnalysisWindow = null; });

  const heavyMetalAnalysisPath = path.join(__dirname, '..', 'docs', 'heavy-metal-analysis', 'index.html');

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
      heavyMetalAnalysisWindow.loadURL(`${VITE_DEV_SERVER_URL}/heavy-metal-analysis/`);
      return true;
    } catch {
      // 개발 서버 없으면 파일 로드로 폴백
    }
  }

  if (fs.existsSync(heavyMetalAnalysisPath)) {
    heavyMetalAnalysisWindow.loadFile(heavyMetalAnalysisPath);
  } else {
    dialog.showErrorBox('오류', '토양 중금속 분석결과 페이지를 찾을 수 없습니다. 먼저 빌드를 실행해 주세요.');
    heavyMetalAnalysisWindow.close();
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

/**
 * VWORLD API 키를 메인 프로세스에서만 로드 (SAMPL-2-19).
 * 렌더러/소스/번들에 키를 노출하지 않기 위해 빌드 시 주입된 파일/환경변수에서 읽는다.
 * 우선순위: process.env → dist/vworld-key.txt(개발/패키지) → resources/vworld-key.txt(extraResource 폴백).
 * scripts/gen-vworld-key.mjs 가 dist/vworld-key.txt 를 생성한다.
 */
function getVworldKey(): string {
  if (process.env.VWORLD_API_KEY) return process.env.VWORLD_API_KEY.trim();
  const candidates = [
    path.join(__dirname, 'vworld-key.txt'), // dist/ (asar 내부 포함)
    process.resourcesPath ? path.join(process.resourcesPath, 'vworld-key.txt') : '', // extraResource 폴백
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const v = fs.readFileSync(p, 'utf-8').trim();
        if (v) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

ipcMain.handle('vworld-geocode', async (event, { address }: { address: string }) => {
  if (!isValidSender(event)) return null;
  const apiKey = getVworldKey();
  if (!apiKey || !address) return null;
  const https = require('node:https');
  const url = `https://api.vworld.kr/req/address?service=address&request=getCoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=parcel&key=${encodeURIComponent(apiKey)}`;
  return new Promise<boolean | null>((resolve) => {
    const timeout = setTimeout(() => { req.destroy(); resolve(null); }, 8000);
    const req = https.get(url, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const json = JSON.parse(data);
          const ok = json?.response?.status === 'OK';
          resolve(ok);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => { clearTimeout(timeout); resolve(null); });
  });
});

// ========================================
// 행정안전부 도로명주소(JUSO) 검색 (SAMPL-1-110)
// main process → file:// Origin/CORS 우회. confmKey는 main에서만 보유(렌더러 미노출).
// ========================================

/**
 * JUSO API confmKey 로드 (메인 프로세스 전용, 렌더러 미노출).
 * VWORLD와 동일 패턴: process.env → dist/juso-key.txt → resources/juso-key.txt.
 * scripts/gen-juso-key.mjs 가 dist/juso-key.txt 를 생성한다.
 */
function getJusoKey(): string {
  if (process.env.JUSO_API_KEY) return process.env.JUSO_API_KEY.trim();
  const candidates = [
    path.join(__dirname, 'juso-key.txt'),
    process.resourcesPath ? path.join(process.resourcesPath, 'juso-key.txt') : '',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const v = fs.readFileSync(p, 'utf-8').trim();
        if (v) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

// JUSO 검색어 sanitize (SQL 인젝션 방어).
// SAMPL-1-47 H-2: defense-in-depth 의도적 중복 — renderer 카운터파트:
//   src/shared/juso-service.ts (동일 상수/로직). 목록 변경 시 두 파일 동시 수정 필수.
//   renderer는 즉시 UX 에러용, main이 보안 신뢰 경계.
const JUSO_SQL_RESERVED = [
  'OR', 'SELECT', 'INSERT', 'DELETE', 'UPDATE',
  'CREATE', 'DROP', 'EXEC', 'UNION', 'FETCH',
  'DECLARE', 'TRUNCATE',
];
const JUSO_BAD_CHARS = /[<>=%]/;
const JUSO_SQL_PATTERNS = JUSO_SQL_RESERVED.map((w) => ({ word: w, re: new RegExp(`\\b${w}\\b`, 'i') }));

function sanitizeJusoKeyword(q: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(q ?? '').trim();
  if (!s) return { ok: false, error: '검색어를 입력해 주세요.' };
  if (s.length > 80) return { ok: false, error: '검색어가 너무 깁니다 (최대 80자).' };
  if (JUSO_BAD_CHARS.test(s)) return { ok: false, error: '<, >, =, % 문자는 사용할 수 없습니다.' };
  for (const { word, re } of JUSO_SQL_PATTERNS) {
    if (re.test(s)) return { ok: false, error: `"${word}" 같은 예약어는 사용할 수 없습니다.` };
  }
  return { ok: true, value: s };
}

interface JusoSearchPayload {
  keyword?: unknown;
  page?: unknown;
  size?: unknown;
}

ipcMain.handle('juso:search', async (event: IpcMainInvokeEvent, payload: JusoSearchPayload) => {
  if (!isValidSender(event)) return { ok: false, error: '유효하지 않은 요청입니다.' };
  if (!ipcRateLimiter.check('juso:search')) {
    return { ok: false, error: '요청이 너무 빈번합니다. 잠시 후 다시 시도하세요.' };
  }
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: '유효하지 않은 요청입니다.' };
  }
  const chk = sanitizeJusoKeyword(payload.keyword);
  if (!chk.ok) return { ok: false, error: chk.error };

  const pageNum = Math.max(1, Math.min(100, Number(payload.page) || 1));
  const sizeNum = Math.max(1, Math.min(50, Number(payload.size) || 10));

  const apiKey = getJusoKey();
  if (!apiKey) {
    return { ok: false, error: 'JUSO_API_KEY가 설정되지 않았습니다.' };
  }

  const https = require('node:https');
  const params = new URLSearchParams({
    confmKey: apiKey,
    currentPage: String(pageNum),
    countPerPage: String(sizeNum),
    keyword: chk.value,
    resultType: 'json',
    hstryYn: 'N',
  });
  const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`;
  const MAX_RESPONSE_SIZE = 256 * 1024; // 256KB

  return new Promise((resolve) => {
    // Buffer 누적: 청크 경계 UTF-8 다중바이트(한글 3B) 잘림 방어
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let aborted = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: unknown): void => {
      if (aborted) return;
      aborted = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    const req = https.get(url, (res: any) => {
      const status = res.statusCode || 0;
      if (status < 200 || status >= 300) {
        req.destroy();
        return finish({ ok: false, error: `JUSO HTTP ${status} 오류 (점검 중이거나 API 키를 확인하세요).` });
      }
      res.on('data', (chunk: Buffer) => {
        if (aborted) return;
        chunks.push(chunk);
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          req.destroy();
          finish({ ok: false, error: 'JUSO 응답이 너무 큽니다.' });
        }
      });
      res.on('end', () => {
        if (aborted) return;
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const json = JSON.parse(data);
          const results = json?.results;
          if (!results) return finish({ ok: false, error: 'JUSO 응답 형식 오류' });
          const common = results.common || {};
          if (common.errorCode && common.errorCode !== '0') {
            return finish({ ok: false, error: `JUSO ${common.errorCode}: ${common.errorMessage || ''}`.trim() });
          }
          const items = Array.isArray(results.juso) ? results.juso : [];
          finish({
            ok: true,
            total: Number(common.totalCount || items.length || 0),
            page: Number(common.currentPage || pageNum),
            size: Number(common.countPerPage || sizeNum),
            items,
          });
        } catch {
          finish({ ok: false, error: 'JUSO 응답 파싱 오류' });
        }
      });
    });
    timeout = setTimeout(() => { req.destroy(); finish({ ok: false, error: 'JUSO 호출 시간 초과 (8초).' }); }, 8000);
    req.on('error', (err: any) => {
      console.error('[juso:search] 네트워크 오류:', err?.message);
      finish({ ok: false, error: 'JUSO 네트워크 오류' });
    });
  });
});

// ========================================
// MRL / PSIS IPC Handlers (잔류농약 기준 인프라 — SAMPL-1-112 Phase 1)
// ========================================

/**
 * 식품안전나라(MRL) API 키를 메인 프로세스에서만 로드 (SAMPL-1-114).
 * 렌더러/소스/번들에 키를 노출하지 않기 위해 빌드 시 주입된 파일/환경변수에서 읽는다.
 * 우선순위: process.env → dist/mrl-key.txt(개발/패키지) → resources/mrl-key.txt(extraResource 폴백).
 * scripts/gen-mrl-key.mjs 가 dist/mrl-key.txt 를 생성한다. (VWORLD/JUSO 패턴과 동일)
 */
function getMrlApiKey(): string {
  if (process.env.FOODSAFETY_API_KEY) return process.env.FOODSAFETY_API_KEY.trim();
  const candidates = [
    path.join(__dirname, 'mrl-key.txt'), // dist/ (asar 내부 포함)
    process.resourcesPath ? path.join(process.resourcesPath, 'mrl-key.txt') : '', // extraResource 폴백
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const v = fs.readFileSync(p, 'utf-8').trim();
        if (v) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

// MRL(식품안전나라) API 키 게터 — 렌더러가 fetch를 직접 수행하므로 키만 전달.
// 우선순위: 렌더러 localStorage('mrl_api_key') > 이 IPC 반환값 (mrl-api.ts에서 결정).
// 보안(M1): 식품안전나라 무료·저위험 키 — 렌더러 직접 fetch라 키가 노출되는 의도된 트레이드오프.
ipcMain.handle('mrl:get-api-key', (event: IpcMainInvokeEvent) => {
  // sender 검증 — 이 프로젝트 index.ts 의 모든 민감 핸들러 패턴과 일치(방어적 일관성).
  if (!isValidSender(event)) return '';
  return getMrlApiKey();
});

/**
 * PSIS(농촌진흥청 농약등록정보) API 키를 메인 프로세스에서만 로드 (SAMPL-1-114).
 * 우선순위: process.env(RDA_PSIS_API_KEY → RAD_PSIS_API_KEY 오타폴백) → dist/psis-key.txt → resources/psis-key.txt.
 * scripts/gen-psis-key.mjs 가 dist/psis-key.txt 를 생성한다. (VWORLD/JUSO/MRL 패턴과 동일)
 * 빌드 주입이 없으면 패키징 앱의 process.env 가 비어 용도조회가 비활성되므로 파일 폴백이 필수.
 */
function getPsisApiKey(): string {
  // [M2] .env/secrets 오타(RAD) 폴백 포함
  if (process.env.RDA_PSIS_API_KEY) return process.env.RDA_PSIS_API_KEY.trim();
  if (process.env.RAD_PSIS_API_KEY) return process.env.RAD_PSIS_API_KEY.trim();
  const candidates = [
    path.join(__dirname, 'psis-key.txt'), // dist/ (asar 내부 포함)
    process.resourcesPath ? path.join(process.resourcesPath, 'psis-key.txt') : '', // extraResource 폴백
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const v = fs.readFileSync(p, 'utf-8').trim();
        if (v) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

// PSIS(농촌진흥청 농약등록정보) 농약 용도 조회 — main process 경유(http 엔드포인트라 렌더러 직접 호출 불가).
// 보안: apiKey는 main process의 getPsisApiKey()에서만 참조, 로그에 키 노출 금지.
//   psis-parse.ts 와 동일 규칙의 XML 파서를 main 프로세스 자체완결을 위해 인라인 구현
//   (dist 에는 index.js/preload.js 만 emit 되므로 shared 모듈을 require 하지 않는다 — JUSO 패턴과 동일).
ipcMain.handle('psis:lookup-use', async (event: IpcMainInvokeEvent, payload?: { korName?: unknown }) => {
  if (!isValidSender(event)) return { useName: null, error: 'invalid_sender' };
  if (!ipcRateLimiter.check('psis:lookup-use')) {
    return { useName: null, error: 'rate_limited' };
  }
  const korName = payload?.korName;
  if (typeof korName !== 'string' || korName.length === 0 || korName.length > 100) {
    return { useName: null, error: 'invalid_input' };
  }
  // SAMPL-1-114: env → dist/psis-key.txt 폴백 (패키징 앱에서 process.env 빈 값 대응)
  const apiKey = getPsisApiKey();
  if (!apiKey) {
    return { useName: null, error: 'no_key' };
  }

  // ----- XML 파서 (psis-parse.ts normalizeUseName/parsePsisUseName 와 동일 규칙) -----
  const decodeEntities = (str: string): string =>
    String(str)
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => {
        const code = parseInt(h, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
      })
      .replace(/&#(\d+);/g, (_m, d: string) => {
        const code = parseInt(d, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
      })
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  const extractTagValues = (xml: string, localName: string): string[] => {
    if (typeof xml !== 'string' || !xml) return [];
    const re = new RegExp(
      '<(?:[\\w.-]+:)?' + localName + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + localName + '>',
      'gi'
    );
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) out.push(decodeEntities(m[1]).trim());
    return out;
  };
  const extractFirst = (xml: string, localName: string): string | null => {
    const v = extractTagValues(xml, localName);
    return v.length ? v[0] : null;
  };
  const normalizeUseName = (raw: string | null): string | null => {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (/제$/.test(s)) return s;
    return s + '제';
  };
  const parsePsisUseName = (xmlString: string): { useName: string | null; error: string | null } => {
    if (typeof xmlString !== 'string' || !xmlString.trim()) {
      return { useName: null, error: 'empty_response' };
    }
    const errorCode = extractFirst(xmlString, 'errorCode');
    if (errorCode) {
      const errorMsg = extractFirst(xmlString, 'errorMsg') || '';
      return { useName: null, error: `${errorCode}: ${errorMsg}`.trim() };
    }
    const values = extractTagValues(xmlString, 'useName').filter((v) => v !== '');
    if (!values.length) return { useName: null, error: null };
    const counts = new Map<string, number>();
    let best: string | null = null;
    let bestCount = 0;
    for (const v of values) {
      const next = (counts.get(v) || 0) + 1;
      counts.set(v, next);
      if (next > bestCount) {
        bestCount = next;
        best = v;
      }
    }
    return { useName: normalizeUseName(best), error: null };
  };

  // 한글 품목명은 UTF-8 encodeURIComponent로 인코딩 (apiKey는 URL에만, 로그 금지)
  const url =
    `http://psis.rda.go.kr/openApi/service.do?apiKey=${encodeURIComponent(apiKey)}` +
    `&serviceCode=SVC01&serviceType=AA001&displayCount=20&startPoint=1` +
    `&pestiKorName=${encodeURIComponent(korName)}`;
  const MAX_RESPONSE_SIZE = 512 * 1024; // 512KB
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let aborted = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (value: unknown): void => {
      if (aborted) return;
      aborted = true;
      if (timeout) clearTimeout(timeout);
      resolve(value);
    };
    const req = http.get(url, (res) => {
      const status = res.statusCode || 0;
      if (status < 200 || status >= 300) {
        req.destroy();
        return finish({ useName: null, error: `http_${status}` });
      }
      res.on('data', (chunk: Buffer) => {
        if (aborted) return;
        chunks.push(chunk);
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          req.destroy();
          finish({ useName: null, error: 'response_too_large' });
        }
      });
      res.on('end', () => {
        if (aborted) return;
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          const parsed = parsePsisUseName(body);
          if (parsed.error || !parsed.useName) {
            // 진단용 일부 로그. apiKey 는 body 에 없으나, 만약 응답이 요청 URL 을 echo 할 경우
            // apiKey 노출을 막기 위해 스니펫에서 마스킹한다(방어적).
            const snippet = body
              .slice(0, 300)
              .replace(/\s+/g, ' ')
              .replace(/apiKey=[^&\s]+/gi, 'apiKey=***');
            console.warn(
              `[psis:lookup-use] "${korName}" 결과없음/오류: ${parsed.error || 'no_useName'} | ${snippet}`
            );
          }
          finish(parsed);
        } catch {
          finish({ useName: null, error: 'parse_error' });
        }
      });
    });
    timeout = setTimeout(() => {
      req.destroy();
      finish({ useName: null, error: 'timeout' });
    }, 8000);
    req.on('error', (err: Error) => {
      console.error('[psis:lookup-use] 네트워크 오류:', err?.message);
      finish({ useName: null, error: 'network_error' });
    });
  });
});
