/**
 * @fileoverview Settings page script - TypeScript version
 * @description Firebase settings, encryption, migration, and storage mode management
 */

import type {
  SampleTypeConfig,
  FileTypeMap,
  FirebaseConfig,
  MigrationScanResult,
  StorageModeLabels,
} from '../types/settings-types';

// ========================================
// Constants
// ========================================

/** Firebase configuration storage key */
const SETTINGS_FIREBASE_KEY = 'firebase_config';

/** Sample types configuration */
const SAMPLE_TYPES: SampleTypeConfig[] = [
  { key: 'soil', name: '토양', icon: '🌱', storagePrefix: 'test_soilSampleLogs' },
  { key: 'water', name: '수질분석', icon: '💧', storagePrefix: 'test_waterSampleLogs' },
  { key: 'pesticide', name: '잔류농약', icon: '🧪', storagePrefix: 'test_pesticideSampleLogs' },
  { key: 'compost', name: '가축분뇨퇴비', icon: '🐄', storagePrefix: 'test_compostSampleLogs' },
  { key: 'heavyMetal', name: '토양 중금속', icon: '⚗️', storagePrefix: 'test_heavyMetalSampleLogs' },
];

/** File type key mapping */
const FILE_TYPE_MAP: FileTypeMap = {
  soil: 'soil',
  water: 'water',
  pesticide: 'pesticide',
  compost: 'compost',
  heavyMetal: 'heavy-metal',
};

/** Organization name constants */
const DEFAULT_ORG_NAME = '봉화군농업기술센터 안전성분석센터';
const ORG_NAME_KEY = 'app_org_name';

/** Minimum year for data scanning */
const MIN_YEAR = 2020;

// ========================================
// Environment Detection
// ========================================

const isElectron: boolean = window.electronAPI?.isElectron === true;

// ========================================
// Migration State
// ========================================

let encMigrationScanResults: MigrationScanResult[] = [];
let decMigrationScanResults: MigrationScanResult[] = [];

// ========================================
// Utility Functions
// ========================================

/**
 * Get element by ID with type assertion
 */
function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Get current year
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Show toast notification
 */
function showToast(message: string, type?: string): void {
  if (window.showToast) {
    window.showToast(message, type as 'success' | 'error' | 'warning' | 'info');
  }
}

/**
 * Sanitize HTML for safe insertion
 */
function sanitizeHTML(html: string): string {
  if (typeof window.DOMPurify?.sanitize === 'function') {
    return window.DOMPurify.sanitize(html);
  }
  // Fallback: escape HTML entities
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// ========================================
// Auth File Functions (Electron)
// ========================================

/**
 * Check auth file status and update UI
 */
async function checkAuthFileStatus(): Promise<void> {
  (window.logger?.debug || console.log)('[checkAuthFileStatus] Starting...');
  const statusEl = getElement<HTMLElement>('authFileStatus');
  const uploadArea = getElement<HTMLElement>('authFileUploadArea');
  const infoArea = getElement<HTMLElement>('authFileInfo');

  (window.logger?.debug || console.log)('[checkAuthFileStatus] Elements:', { statusEl, uploadArea, infoArea });

  if (!statusEl || !uploadArea || !infoArea) {
    (window.logger?.warn || console.warn)('[checkAuthFileStatus] Missing elements!');
    return;
  }

  if (!isElectron) {
    // Web environment: check localStorage config
    if (window.firebaseConfig?.isEnabled?.()) {
      statusEl.className = 'status-badge connected';
      statusEl.textContent = '● 연결됨';
      uploadArea.style.display = 'none';
      infoArea.style.display = 'block';
      const projectIdEl = getElement<HTMLElement>('authFileProjectId');
      if (projectIdEl) {
        projectIdEl.textContent = '웹 환경 - 설정 저장됨';
      }
    } else {
      statusEl.className = 'status-badge disconnected';
      statusEl.textContent = '● 미등록';
      uploadArea.style.display = 'block';
      infoArea.style.display = 'none';
    }

    const alertInfo = document.querySelector('#authFileSection .alert-info');
    if (alertInfo) {
      alertInfo.innerHTML = sanitizeHTML(
        '<strong>인증 파일이란?</strong><br>' +
        'Firebase 접근을 위한 인증 파일을 업로드하면 자동으로 설정됩니다.<br>' +
        '<small style="color: #64748b;">(웹 환경: 설정이 브라우저에 저장됩니다)</small>'
      );
    }
    return;
  }

  try {
    (window.logger?.debug || console.log)('[checkAuthFileStatus] Reading auth file...');
    const result = await window.electronAPI!.readAuthFile();
    (window.logger?.debug || console.log)('[checkAuthFileStatus] Read result:', result);

    if (result.exists && result.content) {
      try {
        const config = JSON.parse(result.content) as FirebaseConfig;
        (window.logger?.debug || console.log)('[checkAuthFileStatus] Parsed config:', config);
        if (config.projectId) {
          (window.logger?.debug || console.log)('[checkAuthFileStatus] Updating UI to connected state');
          statusEl.className = 'status-badge connected';
          statusEl.textContent = '● 등록됨';
          uploadArea.style.display = 'none';
          infoArea.style.display = 'block';
          const projectIdEl = getElement<HTMLElement>('authFileProjectId');
          if (projectIdEl) {
            projectIdEl.textContent = `프로젝트: ${config.projectId}`;
          }
          (window.logger?.debug || console.log)('[checkAuthFileStatus] UI updated successfully');
          return;
        }
      } catch (e) {
        (window.logger?.error || console.error)('[checkAuthFileStatus] 인증 파일 파싱 오류:', e);
      }
    }

    (window.logger?.debug || console.log)('[checkAuthFileStatus] Updating UI to disconnected state');
    statusEl.className = 'status-badge disconnected';
    statusEl.textContent = '● 미등록';
    uploadArea.style.display = 'block';
    infoArea.style.display = 'none';
  } catch (error) {
    (window.logger?.error || console.error)('[checkAuthFileStatus] 인증 파일 확인 오류:', error);
  }
}

/**
 * Save auth file content
 */
async function saveAuthFile(content: string): Promise<boolean> {
  try {
    const config = JSON.parse(content) as FirebaseConfig;
    if (!config.apiKey || !config.projectId) {
      showToast('유효하지 않은 인증 파일입니다.\nAPI Key와 Project ID가 필요합니다.', 'error');
      return false;
    }

    if (!isElectron) {
      // Web environment: save to localStorage
      if (window.firebaseConfig?.saveConfig) {
        window.firebaseConfig.saveConfig(config);
      }

      if (window.firebaseConfig?.reinitialize) {
        const initResult = await window.firebaseConfig.reinitialize();
        if (initResult) {
          showToast('인증 파일이 적용되고 Firebase가 연결되었습니다.\n프로젝트: ' + config.projectId);
        } else {
          showToast('인증 파일이 저장되었지만 Firebase 연결에 실패했습니다.\n페이지를 새로고침해주세요.');
        }
      } else {
        showToast('인증 파일이 저장되었습니다.\n페이지를 새로고침하면 적용됩니다.');
      }
      await checkAuthFileStatus();
      updateConnectionStatus();
      return true;
    }

    // Electron environment: save to file system
    const result = await window.electronAPI!.saveAuthFile(content);
    if (result.success) {
      if (window.firebaseConfig?.reinitialize) {
        const initResult = await window.firebaseConfig.reinitialize();
        if (initResult) {
          showToast('인증 파일이 등록되고 Firebase가 연결되었습니다.\n프로젝트: ' + config.projectId);
        } else {
          showToast('인증 파일은 등록되었지만 Firebase 연결에 실패했습니다.\n앱을 재시작해주세요.');
        }
      } else {
        showToast('인증 파일이 등록되었습니다.\n앱을 재시작하면 적용됩니다.');
      }
      await checkAuthFileStatus();
      updateConnectionStatus();
      return true;
    } else {
      showToast('인증 파일 저장 실패: ' + (result.error || '알 수 없는 오류'));
      return false;
    }
  } catch {
    showToast('인증 파일 형식이 올바르지 않습니다.\nJSON 형식의 파일이 필요합니다.');
    return false;
  }
}

/**
 * Delete auth file
 */
async function deleteAuthFile(): Promise<void> {
  if (!confirm('인증 파일을 삭제하시겠습니까?\nFirebase 연결이 해제됩니다.')) {
    return;
  }

  if (!isElectron) {
    if (window.firebaseConfig?.resetConfig) {
      window.firebaseConfig.resetConfig();
    }
    showToast('Firebase 설정이 삭제되었습니다.');
    await checkAuthFileStatus();
    updateConnectionStatus();
    return;
  }

  try {
    const result = await window.electronAPI!.deleteAuthFile();
    if (result.success) {
      if (window.firebaseConfig?.resetConfig) {
        window.firebaseConfig.resetConfig();
      }
      showToast('인증 파일이 삭제되었습니다.');
      await checkAuthFileStatus();
      updateConnectionStatus();
    } else {
      showToast('인증 파일 삭제 실패: ' + (result.error || '알 수 없는 오류'));
    }
  } catch (error) {
    showToast('인증 파일 삭제 중 오류 발생: ' + (error as Error).message);
  }
}

// ========================================
// Firebase Config Functions
// ========================================

/**
 * Load saved Firebase config from localStorage
 */
function loadSavedConfig(): void {
  const saved = localStorage.getItem(SETTINGS_FIREBASE_KEY);
  if (saved) {
    try {
      const config = JSON.parse(saved) as FirebaseConfig;
      const apiKeyEl = getElement<HTMLInputElement>('apiKey');
      const projectIdEl = getElement<HTMLInputElement>('projectId');
      const authDomainEl = getElement<HTMLInputElement>('authDomain');
      const storageBucketEl = getElement<HTMLInputElement>('storageBucket');
      const messagingSenderIdEl = getElement<HTMLInputElement>('messagingSenderId');
      const appIdEl = getElement<HTMLInputElement>('appId');

      if (apiKeyEl) apiKeyEl.value = config.apiKey || '';
      if (projectIdEl) projectIdEl.value = config.projectId || '';
      if (authDomainEl) authDomainEl.value = config.authDomain || '';
      if (storageBucketEl) storageBucketEl.value = config.storageBucket || '';
      if (messagingSenderIdEl) messagingSenderIdEl.value = config.messagingSenderId || '';
      if (appIdEl) appIdEl.value = config.appId || '';
    } catch (e) {
      (window.logger?.error || console.error)('Firebase 설정 파싱 오류:', e);
      localStorage.removeItem(SETTINGS_FIREBASE_KEY);
    }
  }
}

/**
 * Update connection status badge
 * Note: This shows Firebase configuration status (whether Firebase is set up),
 * NOT storage mode. Storage mode is shown separately in "저장 모드 선택" section.
 */
function updateConnectionStatus(): void {
  const statusEl = getElement<HTMLElement>('connectionStatus');
  const migrateAllBtn = getElement<HTMLButtonElement>('migrateAllBtn');

  if (!statusEl) return;

  const isFirebaseEnabled = window.firebaseConfig?.isEnabled?.() || false;

  // Debug logging
  (window.logger?.debug || console.log)('[updateConnectionStatus] Firebase enabled:', isFirebaseEnabled);
  (window.logger?.debug || console.log)('[updateConnectionStatus] firebaseConfig exists:', !!window.firebaseConfig);
  (window.logger?.debug || console.log)('[updateConnectionStatus] isEnabled function exists:', !!window.firebaseConfig?.isEnabled);

  // Firebase 설정이 있고 초기화되었으면 "연결됨" (저장 모드와 무관)
  if (isFirebaseEnabled) {
    statusEl.className = 'status-badge connected';
    statusEl.textContent = '● 연결됨';
    if (migrateAllBtn) migrateAllBtn.disabled = false;
  } else {
    // Firebase 설정이 없거나 초기화 실패
    statusEl.className = 'status-badge disconnected';
    statusEl.textContent = '● 미연결';
    if (migrateAllBtn) migrateAllBtn.disabled = true;
  }
}

/**
 * Toggle manual settings panel
 */
function toggleManualSettings(): void {
  const content = getElement<HTMLElement>('manualSettingsContent');
  const toggle = getElement<HTMLElement>('manualSettingsToggle');

  if (!content || !toggle) return;

  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.textContent = '▲ 접기';
  } else {
    content.style.display = 'none';
    toggle.textContent = '▼ 펼치기';
  }
}

/**
 * 안전한 Firebase 설정 파서
 * eval() 없이 정규식으로만 각 필드를 추출
 *
 * @param configStr - Firebase config 객체 문자열
 * @returns 파싱된 Firebase 설정 또는 null
 */
function safeParseFirebaseConfig(configStr: string): FirebaseConfig | null {
  try {
    const config: Partial<FirebaseConfig> = {};

    // 주석 제거
    const cleaned = configStr
      .replace(/\/\/.*$/gm, '')           // 한 줄 주석 제거
      .replace(/\/\*[\s\S]*?\*\//g, '');  // 여러 줄 주석 제거

    // Firebase 설정의 각 필드를 개별적으로 추출
    const fields: Array<keyof FirebaseConfig> = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
      'measurementId'
    ];

    for (const field of fields) {
      // 패턴: fieldName: "value" 또는 fieldName: 'value'
      // 함수 호출이나 다른 표현식은 무시하고 오직 문자열 리터럴만 추출
      const pattern = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`);
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        config[field] = match[1];
      }
    }

    // 필수 필드 확인
    if (config.apiKey && config.projectId) {
      return config as FirebaseConfig;
    }

    return null;
  } catch (error) {
    (window.logger?.error || console.error)('[safeParseFirebaseConfig] 파싱 실패:', error);
    return null;
  }
}

/**
 * Parse quick setup code (Firebase config) from textarea
 * Supports both JavaScript object and JSON format
 */
function parseQuickSetup(): void {
  const textarea = getElement<HTMLTextAreaElement>('quickSetupPaste');
  if (!textarea) return;

  const code = textarea.value.trim();
  if (!code) {
    alert('설정 코드를 붙여넣어주세요.');
    return;
  }

  try {
    let config: FirebaseConfig | null = null;

    // Try to extract firebaseConfig object from JavaScript code
    const jsMatch = code.match(/firebaseConfig\s*=\s*({[\s\S]*?});/);
    if (jsMatch) {
      // 안전한 파서: eval() 대신 정규식으로 각 필드를 개별 추출
      config = safeParseFirebaseConfig(jsMatch[1]);
    } else {
      // Try JSON parse
      const jsonMatch = code.match(/({[\s\S]*})/);
      if (jsonMatch) {
        config = JSON.parse(jsonMatch[1]);
      }
    }

    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('유효한 Firebase 설정을 찾을 수 없습니다.');
    }

    // Fill form fields
    const fields = [
      { id: 'apiKey', value: config.apiKey },
      { id: 'projectId', value: config.projectId },
      { id: 'authDomain', value: config.authDomain || '' },
      { id: 'storageBucket', value: config.storageBucket || '' },
      { id: 'messagingSenderId', value: config.messagingSenderId || '' },
      { id: 'appId', value: config.appId || '' },
    ];

    fields.forEach(({ id, value }) => {
      const input = getElement<HTMLInputElement>(id);
      if (input) input.value = value;
    });

    // Clear textarea
    textarea.value = '';

    // Show success message
    textarea.style.borderColor = '#22c55e';
    textarea.placeholder = '✅ 자동 입력 완료! 아래에서 확인 후 "설정 저장" 버튼을 클릭하세요.';

    setTimeout(() => {
      textarea.style.borderColor = '';
    }, 2000);

    // Scroll to form
    const form = getElement<HTMLElement>('firebaseForm');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

  } catch (error) {
    (window.logger?.error || console.error)('[QuickSetup] Parse error:', error);
    alert('설정 코드를 파싱하는 중 오류가 발생했습니다.\n\nFirebase Console에서 다음 형식으로 복사해주세요:\n\nconst firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};');
  }
}

// Make parseQuickSetup available globally
(window as Window & { parseQuickSetup?: typeof parseQuickSetup }).parseQuickSetup = parseQuickSetup;

// ========================================
// Migration List Rendering
// ========================================

/**
 * Render migration list (all years included)
 */
function renderMigrationList(): void {
  const container = getElement<HTMLElement>('migrationList');
  if (!container) return;

  const currentYear = getCurrentYear();
  container.innerHTML = '';

  SAMPLE_TYPES.forEach((type) => {
    let totalCount = 0;
    const yearDetails: string[] = [];

    for (let year = MIN_YEAR; year <= currentYear; year++) {
      const storageKey = `${type.storagePrefix}_${year}`;
      const data = localStorage.getItem(storageKey);
      let count = 0;
      if (data) {
        try {
          count = JSON.parse(data).length;
        } catch (e) {
          (window.logger?.error || console.error)(`${storageKey} 파싱 오류:`, e);
        }
      }
      if (count > 0) {
        totalCount += count;
        yearDetails.push(`${year}년: ${count}건`);
      }
    }

    // Create DOM elements
    const item = document.createElement('div');
    item.className = 'migration-item';

    const info = document.createElement('div');
    info.className = 'migration-item-info';

    const icon = document.createElement('span');
    icon.className = 'migration-item-icon';
    icon.textContent = type.icon;

    const textDiv = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'migration-item-name';
    name.textContent = type.name;

    const countDiv = document.createElement('div');
    countDiv.className = 'migration-item-count';
    countDiv.textContent = `${totalCount}건 ${yearDetails.length > 0 ? '(' + yearDetails.join(', ') + ')' : ''}`;

    textDiv.appendChild(name);
    textDiv.appendChild(countDiv);
    info.appendChild(icon);
    info.appendChild(textDiv);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = '마이그레이션';
    btn.disabled = totalCount === 0;
    btn.addEventListener('click', () => migrateTypeAllYears(type.key, type.storagePrefix));

    item.appendChild(info);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

/**
 * Migrate all years for a specific sample type
 */
async function migrateTypeAllYears(sampleType: string, storagePrefix: string): Promise<void> {
  if (!window.storageManager?.isCloudEnabled()) {
    showToast('Firebase가 연결되지 않았습니다.');
    return;
  }

  const currentYear = getCurrentYear();
  let totalCount = 0;
  const successYears: string[] = [];

  try {
    for (let year = MIN_YEAR; year <= currentYear; year++) {
      const storageKey = `${storagePrefix}_${year}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        const result = await window.storageManager.migrate(sampleType, year, storageKey);
        if (result.success && result.count > 0) {
          totalCount += result.count;
          successYears.push(`${year}년: ${result.count}건`);
        }
      }
    }

    if (totalCount > 0) {
      alert(`마이그레이션 완료!\n\n총 ${totalCount}건\n${successYears.join('\n')}`);
      renderMigrationList();
    } else {
      showToast('마이그레이션할 데이터가 없습니다.');
    }
  } catch (error) {
    showToast('마이그레이션 중 오류 발생: ' + (error as Error).message);
  }
}

// ========================================
// Cache Management
// ========================================

/**
 * Update cache status UI
 */
function updateCacheStatusUI(): void {
  if (!window.CacheManager) return;

  const status = window.CacheManager.getCacheStatus();

  const cacheDataCount = getElement<HTMLElement>('cacheDataCount');
  const cacheDataSize = getElement<HTMLElement>('cacheDataSize');
  const lastCacheClear = getElement<HTMLElement>('lastCacheClear');

  if (cacheDataCount) cacheDataCount.textContent = `${status.totalKeys}건`;
  if (cacheDataSize) cacheDataSize.textContent = `${status.totalSizeMB} MB`;

  if (lastCacheClear) {
    if (status.lastClear.lastClear) {
      const lastDate = status.lastClear.lastClear;
      lastCacheClear.textContent = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')} ${String(lastDate.getHours()).padStart(2, '0')}:${String(lastDate.getMinutes()).padStart(2, '0')}`;
    } else {
      lastCacheClear.textContent = '없음';
    }
  }
}

// ========================================
// Network Access Control
// ========================================

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = Number(p);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

/**
 * Initialize network access UI
 */
function initNetworkAccessUI(): void {
  if (!window.NetworkAccess) return;

  const statusEl = getElement<HTMLElement>('networkAccessStatus');
  const envEl = getElement<HTMLElement>('currentEnvironment');
  const gatewayEl = getElement<HTMLElement>('allowedGateway');
  const publicIPEl = getElement<HTMLElement>('currentPublicIP');
  const accessEl = getElement<HTMLElement>('currentAccessStatus');
  const gatewayInput = getElement<HTMLInputElement>('gatewayIPEdit');
  const saveGatewayBtn = getElement<HTMLButtonElement>('saveGatewayBtn');
  const deleteGatewayBtn = getElement<HTMLButtonElement>('deleteGatewayBtn');
  const gatewaySaveStatus = getElement<HTMLElement>('gatewaySaveStatus');

  if (!envEl) return;

  const isElectronEnv = window.electronAPI?.isElectron === true || window.location.protocol === 'file:';
  envEl.textContent = isElectronEnv ? 'Electron (항상 허용)' : '웹 브라우저';

  function updateGatewayDisplay(): void {
    if (!gatewayEl || !gatewayInput) return;
    const allowedGateway = window.NetworkAccess!.getAllowedGateway();
    if (allowedGateway) {
      gatewayEl.textContent = allowedGateway;
      gatewayEl.style.color = '';
      gatewayInput.value = allowedGateway;
    } else {
      gatewayEl.textContent = '설정 없음';
      gatewayEl.style.color = '#dc2626';
      gatewayInput.value = '';
    }
  }

  updateGatewayDisplay();

  async function refreshNetworkStatus(): Promise<void> {
    if (!publicIPEl || !accessEl || !statusEl) return;

    publicIPEl.textContent = '확인 중...';
    accessEl.textContent = '확인 중...';

    const publicIP = await window.NetworkAccess!.getCurrentIP();
    publicIPEl.textContent = publicIP || '확인 불가';

    const access = await window.NetworkAccess!.checkAccess();
    const reason = access.needsSetup ? '게이트웨이 미설정' : access.reason;
    accessEl.textContent = access.allowed ? `허용 (${reason})` : `거부 (${reason})`;
    accessEl.style.color = access.allowed ? '#16a34a' : '#dc2626';

    if (access.allowed) {
      statusEl.className = 'status-badge connected';
      statusEl.textContent = '● 허용';
    } else {
      statusEl.className = 'status-badge disconnected';
      statusEl.textContent = '● 거부';
    }

    updateGatewayDisplay();
  }

  saveGatewayBtn?.addEventListener('click', () => {
    if (!gatewayInput) return;
    const ip = gatewayInput.value.trim();
    if (!ip) {
      gatewayInput.style.borderColor = '#dc2626';
      gatewayInput.placeholder = 'IP 주소를 입력하세요';
      return;
    }
    if (!isValidIP(ip)) {
      gatewayInput.style.borderColor = '#dc2626';
      gatewayInput.value = '';
      gatewayInput.placeholder = '올바른 IP 형식: 0~255.0~255.0~255.0~255';
      return;
    }
    window.NetworkAccess!.saveGateway(ip);
    gatewayInput.style.borderColor = '';
    updateGatewayDisplay();
    refreshNetworkStatus();

    if (gatewaySaveStatus) {
      gatewaySaveStatus.style.display = 'inline';
      setTimeout(() => {
        gatewaySaveStatus.style.display = 'none';
      }, 2000);
    }

    showToast('게이트웨이 IP가 저장되었습니다.', 'success');
  });

  deleteGatewayBtn?.addEventListener('click', () => {
    if (!confirm('게이트웨이 설정을 삭제하시겠습니까?\n다음 접속 시 재입력이 필요합니다.')) return;
    window.NetworkAccess!.removeGateway();
    updateGatewayDisplay();
    refreshNetworkStatus();
    showToast('게이트웨이 설정이 삭제되었습니다.', 'info');
  });

  const checkNetworkBtn = getElement<HTMLButtonElement>('checkNetworkBtn');
  checkNetworkBtn?.addEventListener('click', refreshNetworkStatus);

  refreshNetworkStatus();
}

// ========================================
// Organization Name Settings
// ========================================

/**
 * Load organization name
 */
function loadOrgName(): void {
  const saved = localStorage.getItem(ORG_NAME_KEY);
  const orgNameInput = getElement<HTMLInputElement>('orgName');
  if (orgNameInput) {
    orgNameInput.value = saved || DEFAULT_ORG_NAME;
  }
}

// ========================================
// 기본 시·도 설정 (필지 주소 검증용)
// ========================================
const DEFAULT_SIDO_KEY = 'app_default_sido';

/**
 * Load default sido setting and wire save button
 */
function loadDefaultSido(): void {
  const sel = getElement<HTMLSelectElement>('defaultSido');
  if (sel) sel.value = localStorage.getItem(DEFAULT_SIDO_KEY) || '';

  const saveBtn = getElement<HTMLButtonElement>('saveDefaultSidoBtn');
  if (saveBtn && !(saveBtn as any)._sidoWired) {
    (saveBtn as any)._sidoWired = true;
    saveBtn.addEventListener('click', () => {
      const value = getElement<HTMLSelectElement>('defaultSido')?.value || '';
      if (value) {
        localStorage.setItem(DEFAULT_SIDO_KEY, value);
      } else {
        localStorage.removeItem(DEFAULT_SIDO_KEY);
      }
      const statusEl = getElement<HTMLElement>('defaultSidoSaveStatus');
      if (statusEl) {
        statusEl.style.display = 'inline';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      }
    });
  }
}

// settings-entry의 async 초기화(checkAuthFileStatus 등)가 비-Electron 환경에서 지연돼도
// 저장 버튼이 동작하도록 DOM 준비 시점에 독립적으로 와이어링한다(_sidoWired 가드로 멱등).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDefaultSido);
  } else {
    loadDefaultSido();
  }
}

// ========================================
// Storage Mode UI
// ========================================

/**
 * Initialize storage mode UI
 */
function initStorageModeUI(): void {
  if (!window.storageManager) return;

  const currentMode = window.storageManager.getMode();
  const modes = window.storageManager.getAvailableModes();

  modes.forEach((mode) => {
    const radio = document.querySelector<HTMLInputElement>(`input[name="storageMode"][value="${mode.value}"]`);
    const label = document.querySelector<HTMLElement>(`.storage-mode-option[data-mode="${mode.value}"]`);
    if (!radio || !label) return;

    radio.disabled = !mode.available;

    if (mode.value === currentMode) {
      radio.checked = true;
    }
  });

  updateStorageModeStatus(currentMode);

  document.querySelectorAll<HTMLInputElement>('input[name="storageMode"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      changeStorageMode(target.value as StorageMode);
    });
  });
}

/**
 * Update storage mode status badge
 */
function updateStorageModeStatus(mode: StorageMode): void {
  const statusEl = getElement<HTMLElement>('storageModeStatus');
  if (!statusEl) return;

  const modeLabels: StorageModeLabels = {
    local: '로컬 전용',
    cloud: '클라우드 동기화',
    cloudOnly: '클라우드 전용',
  };

  statusEl.textContent = `● ${modeLabels[mode] || mode}`;

  if (mode === 'cloud') {
    statusEl.className = 'status-badge connected';
  } else if (mode === 'cloudOnly') {
    statusEl.className = 'status-badge';
    statusEl.style.background = '#dbeafe';
    statusEl.style.color = '#1d4ed8';
  } else {
    statusEl.className = 'status-badge disconnected';
  }
}

/**
 * Change storage mode
 */
function changeStorageMode(newMode: StorageMode): void {
  if (!window.storageManager) return;

  const currentMode = window.storageManager.getMode();
  if (newMode === currentMode) return;

  const modeLabels: StorageModeLabels = {
    local: '로컬 저장소만',
    cloud: '클라우드 동기화',
    cloudOnly: '클라우드 전용',
  };

  if (!confirm(`저장 모드를 "${modeLabels[newMode]}"(으)로 변경하시겠습니까?\n\n기존 데이터는 삭제되지 않습니다.\n변경 후 앱을 새로고침하면 새 모드가 적용됩니다.`)) {
    const radio = document.querySelector<HTMLInputElement>(`input[name="storageMode"][value="${currentMode}"]`);
    if (radio) radio.checked = true;
    return;
  }

  const result = window.storageManager.setMode(newMode);

  if (result.success) {
    updateStorageModeStatus(newMode);
    updateConnectionStatus(); // Firebase 연결 상태도 함께 업데이트
    alert(`저장 모드가 "${modeLabels[newMode]}"(으)로 변경되었습니다.\n다른 시료 페이지에서는 새로고침 후 적용됩니다.`);
  } else {
    const radio = document.querySelector<HTMLInputElement>(`input[name="storageMode"][value="${currentMode}"]`);
    if (radio) radio.checked = true;
    alert(result.message);
  }
}

// ========================================
// Encryption Status UI
// ========================================

/**
 * Update encryption status UI
 */
function updateEncryptionStatusUI(): void {
  const statusBadge = getElement<HTMLElement>('encryptionStatus');
  const statusText = getElement<HTMLElement>('encStatusText');
  const keySourceText = getElement<HTMLElement>('encKeySourceText');
  const inactiveActions = getElement<HTMLElement>('encInactiveActions');
  const activeActions = getElement<HTMLElement>('encActiveActions');
  const migrationSection = getElement<HTMLElement>('encMigrationSection');
  const decMigrationSection = getElement<HTMLElement>('decMigrationSection');

  if (!statusBadge || !statusText || !keySourceText || !inactiveActions || !activeActions) return;

  if (window.encryptionManager?.isReady()) {
    statusBadge.className = 'status-badge connected';
    statusBadge.textContent = '● 활성';
    statusText.textContent = '암호화 활성 (AES-256-GCM)';
    statusText.style.color = '#16a34a';

    const source = window.encryptionManager.getKeySource();
    const sourceMap: Record<string, string> = {
      firebase: 'Firebase 클라우드',
      local: '로컬 키 파일',
      generated: '새로 생성됨',
    };
    keySourceText.textContent = sourceMap[source || ''] || source || '-';

    inactiveActions.style.display = 'none';
    activeActions.style.display = 'block';

    if (migrationSection) migrationSection.style.display = 'block';
    if (decMigrationSection) decMigrationSection.style.display = 'block';
  } else {
    statusBadge.className = 'status-badge disconnected';
    statusBadge.textContent = '● 비활성';
    statusText.textContent = '암호화 비활성 (비밀번호 미입력)';
    statusText.style.color = '#d97706';
    keySourceText.textContent = '-';

    inactiveActions.style.display = 'block';
    activeActions.style.display = 'none';

    if (window.encryptionManager?.checkRecoveryBlobExists) {
      window.encryptionManager.checkRecoveryBlobExists().then((exists) => {
        const recoverBtn = getElement<HTMLButtonElement>('encRecoverBtn');
        if (recoverBtn) {
          recoverBtn.style.display = exists ? 'inline-block' : 'none';
        }
      });
    }

    if (migrationSection) migrationSection.style.display = 'none';
    if (decMigrationSection) decMigrationSection.style.display = 'none';
  }
}

// ========================================
// Settings Password Prompt
// ========================================

/**
 * Show settings password prompt
 */
function showSettingsPasswordPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = getElement<HTMLElement>('settingsLockOverlay');
    if (!overlay) {
      resolve(false);
      return;
    }

    const CryptoUtilsExt = window.CryptoUtils as { createPasswordRulesHTML?: (prefix: string) => string; bindPasswordValidation?: (options: { prefix: string; input: HTMLInputElement; submitBtn: HTMLButtonElement; submitColor?: string; verifyMode?: boolean }) => void };

    overlay.innerHTML = `
      <div style="
        background: white; border-radius: 20px; padding: 36px;
        width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex; flex-direction: column; gap: 20px;
      ">
        <div style="display: flex; justify-content: center;">
          <div style="
            width: 64px; height: 64px; border-radius: 50%;
            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
        <div style="text-align: center;">
          <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #111827;">
            설정 접근 확인
          </h3>
          <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
            설정 페이지에 접근하려면 암호화 비밀번호를 입력해주세요.
          </p>
        </div>

        ${CryptoUtilsExt?.createPasswordRulesHTML ? CryptoUtilsExt.createPasswordRulesHTML('settings') : ''}

        <div>
          <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
          <div style="position: relative;">
            <input type="password" id="settings-pw-input" placeholder="비밀번호를 입력하세요" maxlength="64"
              style="
                width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                border: 1px solid #D1D5DB; border-radius: 10px;
                box-sizing: border-box; outline: none; background: #F9FAFB;
                transition: border-color 0.2s, box-shadow 0.2s;
              "
            />
            <button type="button" id="settings-toggle-pw" style="
              position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
              background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
            " title="비밀번호 표시/숨기기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <div id="settings-pw-error" style="
            color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
          "></div>
        </div>
        <div style="display: flex; gap: 12px;">
          <button id="settings-pw-cancel" style="
            flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
            border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
            transition: background 0.2s;
          ">돌아가기</button>
          <button id="settings-pw-submit" style="
            flex: 1; padding: 12px 20px; border: none;
            background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
            color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
            transition: opacity 0.2s;
          " disabled>확인</button>
        </div>
      </div>
    `;
    overlay.style.background = 'rgba(0,0,0,0.5)';

    const input = getElement<HTMLInputElement>('settings-pw-input');
    const submitBtn = getElement<HTMLButtonElement>('settings-pw-submit');
    const cancelBtn = getElement<HTMLButtonElement>('settings-pw-cancel');
    const errDiv = getElement<HTMLElement>('settings-pw-error');
    const toggleBtn = getElement<HTMLButtonElement>('settings-toggle-pw');

    if (!input || !submitBtn || !cancelBtn || !errDiv) {
      resolve(false);
      return;
    }

    if (CryptoUtilsExt?.bindPasswordValidation) {
      CryptoUtilsExt.bindPasswordValidation({
        prefix: 'settings',
        input,
        submitBtn,
        submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
        verifyMode: true,
      });
    }

    // Password toggle
    toggleBtn?.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    });

    // Focus styling
    input.addEventListener('focus', () => {
      input.style.borderColor = '#22C55E';
      input.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#D1D5DB';
      input.style.boxShadow = 'none';
    });
    input.addEventListener('input', () => {
      errDiv.style.display = 'none';
    });

    // Timing-safe string comparison
    function timingSafeEqual(a: string, b: string): boolean {
      if (typeof a !== 'string' || typeof b !== 'string') return false;
      const len = Math.max(a.length, b.length);
      let result = a.length ^ b.length;
      for (let i = 0; i < len; i++) {
        result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
      }
      return result === 0;
    }

    async function submit(): Promise<void> {
      if (!input || !errDiv || !submitBtn) return;

      const pw = input.value;
      if (!pw) {
        errDiv.textContent = '비밀번호를 입력해주세요.';
        errDiv.style.display = 'block';
        return;
      }

      let verified = false;

      // First: compare with session password
      if (window.electronAPI?.getSessionPassword) {
        const storedPw = await window.electronAPI.getSessionPassword();
        if (storedPw && timingSafeEqual(pw, storedPw)) {
          verified = true;
        }
      }

      // Second: verify with encryptionManager
      if (!verified && window.encryptionManager?.verifyPassword) {
        try {
          submitBtn.disabled = true;
          submitBtn.textContent = '확인 중...';
          verified = await window.encryptionManager.verifyPassword(pw);
        } catch (e) {
          (window.logger?.warn || console.warn)('[Settings] Password verification failed:', (e as Error).message);
          verified = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '확인';
        }
      }

      if (!verified) {
        errDiv.textContent = '비밀번호가 올바르지 않습니다.';
        errDiv.style.display = 'block';
        input.style.borderColor = '#e74c3c';
        input.value = '';
        input.focus();
        return;
      }

      // Hide overlay and show content
      if (overlay) {
        overlay.style.display = 'none';
      }
      const content = getElement<HTMLElement>('settingsContent');
      if (content) {
        content.style.display = 'block';
      }

      resolve(true);
    }

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => {
      window.location.href = '../index.html';
      resolve(false);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) submit();
      if (e.key === 'Escape') {
        window.location.href = '../index.html';
        resolve(false);
      }
    });
    input.addEventListener('input', () => {
      errDiv.style.display = 'none';
      input.style.borderColor = '#ddd';
    });
    setTimeout(() => input.focus(), 100);
  });
}

// ========================================
// Event Listeners Setup
// ========================================

/**
 * Initialize event listeners for file upload/selection
 */
function initFileUploadListeners(): void {
  // 파일 선택 버튼 클릭 (Electron 네이티브 다이얼로그 사용)
  const selectBtn = getElement<HTMLButtonElement>('selectAuthFileBtn');
  selectBtn?.addEventListener('click', async () => {
    if (isElectron && (window as any).electronAPI?.selectAuthFile) {
      // Electron 네이티브 파일 선택 다이얼로그
      try {
        const result = await (window as any).electronAPI.selectAuthFile();
        if (result.canceled) {
          return;
        }
        if (result.success) {
          // Firebase 재초기화 (새 인증 파일 적용)
          if ((window as any).firebaseConfig?.reinitialize) {
            const initResult = await (window as any).firebaseConfig.reinitialize();
            if (initResult) {
              showToast('인증 파일이 등록되고 Firebase가 연결되었습니다.\n프로젝트: ' + result.projectId);
            } else {
              showToast('인증 파일은 등록되었지만 Firebase 연결에 실패했습니다.\n앱을 재시작해주세요.');
            }
          } else {
            showToast('인증 파일이 등록되었습니다.\n앱을 재시작하면 적용됩니다.\n프로젝트: ' + result.projectId);
          }
          await checkAuthFileStatus();
          updateConnectionStatus();
        } else {
          showToast('인증 파일 등록 실패: ' + (result.error || '알 수 없는 오류'));
        }
      } catch (error) {
        showToast('파일 선택 중 오류 발생: ' + (error as Error).message);
      }
    } else {
      // 웹 환경 폴백
      getElement<HTMLInputElement>('authFileInput')?.click();
    }
  });

  // 파일 선택 처리 (웹 환경용)
  const fileInput = getElement<HTMLInputElement>('authFileInput');
  fileInput?.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      await saveAuthFile(event.target?.result as string);
    };
    reader.readAsText(file);

    // 입력 초기화
    target.value = '';
  });

  // 인증 파일 삭제 버튼
  const deleteBtn = getElement<HTMLButtonElement>('deleteAuthFileBtn');
  deleteBtn?.addEventListener('click', deleteAuthFile);

  // 연결 테스트 버튼
  const testBtn = getElement<HTMLButtonElement>('testConnectionBtn');
  testBtn?.addEventListener('click', async () => {
    const statusEl = getElement<HTMLElement>('connectionStatus');
    const authStatusEl = getElement<HTMLElement>('authFileStatus');

    if (statusEl) {
      statusEl.className = 'status-badge';
      statusEl.style.background = '#fef3c7';
      statusEl.style.color = '#92400e';
      statusEl.textContent = '● 연결 중...';
    }

    try {
      // Firebase 초기화 시도
      const initialized = await (window as any).firebaseConfig.initialize();

      if (initialized) {
        if (statusEl) {
          statusEl.className = 'status-badge connected';
          statusEl.style.background = '#dcfce7';
          statusEl.style.color = '#16a34a';
          statusEl.textContent = '● 연결됨';
        }

        if (authStatusEl) {
          authStatusEl.className = 'status-badge connected';
          authStatusEl.textContent = '● 연결됨';
        }

        const migrateBtn = getElement<HTMLButtonElement>('migrateAllBtn');
        if (migrateBtn) migrateBtn.disabled = false;

        // Update connection status for manual settings section
        updateConnectionStatus();

        renderMigrationList();
        showToast('Firebase 연결 성공!');
      } else {
        if (statusEl) {
          statusEl.className = 'status-badge disconnected';
          statusEl.style.background = '#fef3c7';
          statusEl.style.color = '#d97706';
          statusEl.textContent = '● 미연결';
        }

        if (isElectron) {
          showToast('Firebase 연결 실패.\n인증 파일이 등록되어 있는지 확인하세요.');
        } else {
          showToast('Firebase 연결 실패.\n수동 설정값을 확인해주세요.');
        }
      }
    } catch (error) {
      if (statusEl) {
        statusEl.className = 'status-badge error';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#dc2626';
        statusEl.textContent = '● 연결 실패';
      }
      (window.logger?.error || console.error)('연결 테스트 실패:', error);
      showToast('연결 실패: ' + (error as Error).message);
    }
  });

  // 드래그 앤 드롭 지원
  const uploadArea = getElement<HTMLElement>('authFileUploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      const innerDiv = uploadArea.querySelector('div') as HTMLElement;
      if (innerDiv) {
        innerDiv.style.borderColor = '#3b82f6';
        innerDiv.style.background = '#eff6ff';
      }
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      const innerDiv = uploadArea.querySelector('div') as HTMLElement;
      if (innerDiv) {
        innerDiv.style.borderColor = '#cbd5e1';
        innerDiv.style.background = '#f8fafc';
      }
    });

    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      const innerDiv = uploadArea.querySelector('div') as HTMLElement;
      if (innerDiv) {
        innerDiv.style.borderColor = '#cbd5e1';
        innerDiv.style.background = '#f8fafc';
      }

      const file = e.dataTransfer?.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        await saveAuthFile(event.target?.result as string);
      };
      reader.readAsText(file);
    });
  }
}

// Initialize event listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFileUploadListeners);
} else {
  initFileUploadListeners();
}

// ========================================
// Encryption Migration Functions
// ========================================

/**
 * Scan plaintext data for encryption migration
 */
async function scanPlaintextData(): Promise<void> {
  if (!(window as any).encryptionManager?.isReady()) {
    showToast('암호화가 활성화되어야 합니다. (비밀번호 입력 필요)');
    return;
  }

  const statusBadge = getElement<HTMLElement>('encMigrationStatus');
  if (statusBadge) {
    statusBadge.className = 'status-badge';
    statusBadge.style.background = '#fef3c7';
    statusBadge.style.color = '#92400e';
    statusBadge.textContent = '● 스캔 중...';
  }

  const scanBtn = getElement<HTMLButtonElement>('scanPlaintextBtn');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = '스캔 중...';
  }

  const currentYear = new Date().getFullYear();
  const MIN_YEAR = 2020;
  encMigrationScanResults = [];

  try {
    // 1. Firebase collections scan
    if ((window as any).firebaseConfig?.isEnabled()) {
      const db = (window as any).firebaseConfig.getDb();
      if (db) {
        for (const type of SAMPLE_TYPES) {
          for (let year = MIN_YEAR; year <= currentYear; year++) {
            const collectionName = (window as any).firestoreDb.getCollectionName(type.key, year);
            try {
              const snapshot = await db.collection(collectionName).get();
              if (snapshot.empty) continue;

              let plaintextCount = 0;
              let encryptedCount = 0;

              snapshot.forEach((doc: any) => {
                const data = doc.data();
                if (data._enc) {
                  encryptedCount++;
                } else {
                  plaintextCount++;
                }
              });

              if (plaintextCount > 0 || encryptedCount > 0) {
                encMigrationScanResults.push({
                  source: 'firebase',
                  type: type.key,
                  typeName: type.name,
                  typeIcon: type.icon,
                  year,
                  collectionName,
                  plaintextCount,
                  encryptedCount,
                  totalCount: plaintextCount + encryptedCount
                });
              }
            } catch (err) {
              (window.logger?.warn || console.warn)(`[Migration] ${collectionName} 스캔 실패:`, (err as Error).message);
            }
          }
        }
      }
    }

    // 2. Local autosave files scan (Electron only)
    if (isElectron && window.electronAPI) {
      for (const type of SAMPLE_TYPES) {
        for (let year = MIN_YEAR; year <= currentYear; year++) {
          try {
            const filePath = await window.electronAPI.getAutoSavePath(type.key, year);
            if (!filePath) continue;

            const result = await window.electronAPI.readFile(filePath);
            if (!result.success || !result.content) continue;

            const parsed = JSON.parse(result.content);
            // Unencrypted plaintext file (has data array but no _localEnc)
            if (parsed && !parsed._localEnc && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
              encMigrationScanResults.push({
                source: 'autosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                filePath,
                plaintextCount: parsed.data.length,
                encryptedCount: 0,
                totalCount: parsed.data.length,
              });
            }
          } catch {
            // File not found or parse error - ignore
          }
        }
      }
    }

    // 2-1. Web autosave files scan (File System Access API)
    if (!isElectron && (window as any).getWebDirHandle?.()) {
      const dirHandle = (window as any).getWebDirHandle();
      for (const type of SAMPLE_TYPES) {
        const fileTypeKey = FILE_TYPE_MAP[type.key] || type.key;
        for (let year = MIN_YEAR; year <= currentYear; year++) {
          try {
            const fileName = `auto-save-${fileTypeKey}-${year}.json`;
            const fileHandle = await dirHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            if (!content) continue;

            const parsed = JSON.parse(content);
            if (parsed && !parsed._localEnc && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
              encMigrationScanResults.push({
                source: 'webAutosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                fileName,
                plaintextCount: parsed.data.length,
                encryptedCount: 0,
                totalCount: parsed.data.length,
              });
            }
          } catch {
            // NotFoundError = file not found, ignore
          }
        }
      }
    }

    // 3. localStorage data scan (web local mode)
    for (const type of SAMPLE_TYPES) {
      for (let year = MIN_YEAR; year <= currentYear; year++) {
        try {
          const storageKey = `${type.storagePrefix}_${year}`;
          const raw = localStorage.getItem(storageKey);
          if (!raw) continue;

          const data = JSON.parse(raw);
          if (!Array.isArray(data) || data.length === 0) continue;

          let plaintextCount = 0;
          let encryptedCount = 0;
          data.forEach((item: any) => {
            if (item._enc) {
              encryptedCount++;
            } else {
              plaintextCount++;
            }
          });

          if (plaintextCount > 0) {
            encMigrationScanResults.push({
              source: 'localStorage',
              type: type.key,
              typeName: type.name,
              typeIcon: type.icon,
              year,
              storageKey,
              plaintextCount,
              encryptedCount,
              totalCount: plaintextCount + encryptedCount,
            });
          }
        } catch {
          // Parse error - ignore
        }
      }
    }

    renderEncMigrationList();

    const totalPlaintext = encMigrationScanResults.reduce((sum, r) => sum + r.plaintextCount, 0);
    if (statusBadge) {
      if (totalPlaintext > 0) {
        statusBadge.className = 'status-badge';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#92400e';
        statusBadge.textContent = `● 평문 ${totalPlaintext}건`;
        const encryptAllBtn = getElement<HTMLButtonElement>('encryptAllBtn');
        if (encryptAllBtn) encryptAllBtn.disabled = false;
      } else {
        statusBadge.className = 'status-badge connected';
        statusBadge.textContent = '● 전체 암호화됨';
        const encryptAllBtn = getElement<HTMLButtonElement>('encryptAllBtn');
        if (encryptAllBtn) encryptAllBtn.disabled = true;
      }
    }
  } catch (err) {
    (window.logger?.error || console.error)('[Migration] 스캔 오류:', err);
    if (statusBadge) {
      statusBadge.className = 'status-badge error';
      statusBadge.textContent = '● 스캔 실패';
    }
  } finally {
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = '🔍 평문 데이터 스캔';
    }
  }
}

/**
 * Render encryption migration list
 */
function renderEncMigrationList(): void {
  const container = getElement<HTMLElement>('encMigrationList');
  if (!container) return;

  container.innerHTML = '';

  if (encMigrationScanResults.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; color: #94a3b8; padding: 1rem;';
    empty.textContent = '데이터가 있는 컬렉션이 없습니다.';
    container.appendChild(empty);
    return;
  }

  encMigrationScanResults.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'migration-item';

    const info = document.createElement('div');
    info.className = 'migration-item-info';

    const icon = document.createElement('span');
    icon.className = 'migration-item-icon';
    icon.textContent = result.typeIcon;

    const textDiv = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'migration-item-name';
    if (result.source === 'autosave' || result.source === 'webAutosave') {
      name.textContent = `${result.typeName} ${result.year}년 (자동저장 파일)`;
    } else if (result.source === 'localStorage') {
      name.textContent = `${result.typeName} ${result.year}년 (로컬 데이터)`;
    } else {
      name.textContent = `${result.typeName} ${result.year}년 (Firebase)`;
    }

    const countDiv = document.createElement('div');
    countDiv.className = 'migration-item-count';

    if (result.plaintextCount > 0) {
      const plaintextSpan = document.createElement('span');
      plaintextSpan.style.color = '#dc2626';
      plaintextSpan.style.fontWeight = '600';
      plaintextSpan.textContent = `평문 ${result.plaintextCount}건`;
      countDiv.appendChild(plaintextSpan);

      if (result.encryptedCount > 0) {
        countDiv.appendChild(document.createTextNode(' / '));
      }
    }
    if (result.encryptedCount > 0) {
      const encSpan = document.createElement('span');
      encSpan.style.color = '#16a34a';
      encSpan.textContent = `암호화 ${result.encryptedCount}건`;
      countDiv.appendChild(encSpan);
    }

    textDiv.appendChild(name);
    textDiv.appendChild(countDiv);
    info.appendChild(icon);
    info.appendChild(textDiv);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.style.fontSize = '0.8rem';
    btn.style.padding = '0.5rem 1rem';

    if (result.plaintextCount > 0) {
      btn.textContent = '암호화';
      btn.addEventListener('click', () => encryptSingleItem(index));
    } else {
      btn.textContent = '완료';
      btn.disabled = true;
      btn.style.background = '#94a3b8';
    }

    item.appendChild(info);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

/**
 * Enable/disable all migration-related buttons to prevent race conditions
 */
function setMigrationButtonsEnabled(enabled: boolean): void {
  const scanBtn = getElement<HTMLButtonElement>('scanPlaintextBtn');
  const encryptAllBtn = getElement<HTMLButtonElement>('encryptAllBtn');
  if (scanBtn) scanBtn.disabled = !enabled;
  if (encryptAllBtn) encryptAllBtn.disabled = !enabled;

  // Individual collection encrypt buttons
  const listContainer = getElement<HTMLElement>('encMigrationList');
  if (listContainer) {
    listContainer.querySelectorAll('button').forEach((btn) => {
      (btn as HTMLButtonElement).disabled = !enabled;
    });
  }
}

/**
 * Encrypt a single item from the scan results
 */
async function encryptSingleItem(resultIndex: number): Promise<void> {
  const result = encMigrationScanResults[resultIndex];
  if (!result || result.plaintextCount === 0) return;

  let label: string;
  if (result.source === 'autosave') {
    label = `${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)`;
  } else if (result.source === 'webAutosave') {
    label = `${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)`;
  } else if (result.source === 'localStorage') {
    label = `${result.typeName} ${result.year}년 로컬 데이터 (${result.plaintextCount}건)`;
  } else {
    label = `${result.typeName} ${result.year}년 Firebase 데이터 ${result.plaintextCount}건`;
  }

  if (!confirm(`${label}을(를) 암호화하시겠습니까?`)) {
    return;
  }

  // Disable all migration buttons to prevent race conditions
  setMigrationButtonsEnabled(false);

  try {
    if (result.source === 'autosave' && result.filePath) {
      await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
    } else if (result.source === 'webAutosave' && result.fileName) {
      await encryptWebAutoSaveFile(result.fileName, result.typeName, result.year);
    } else if (result.source === 'localStorage' && result.storageKey) {
      await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
    } else if (result.collectionName) {
      await encryptPlaintextInCollection(result.collectionName, result.plaintextCount);
    }
  } finally {
    setMigrationButtonsEnabled(true);
  }

  // Rescan
  await scanPlaintextData();
}

/**
 * Encrypt all plaintext data in a Firebase collection
 */
async function encryptPlaintextInCollection(collectionName: string, expectedCount: number): Promise<void> {
  const db = (window as any).firebaseConfig?.getDb();
  const key = (window as any).encryptionManager?.getKey();
  if (!db || !key) return;

  const progressDiv = getElement<HTMLElement>('encMigrationProgress');
  const progressBar = getElement<HTMLElement>('encMigrationProgressBar');
  const progressText = getElement<HTMLElement>('encMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${collectionName} 암호화 중...`;

  try {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) return;

    // Filter plaintext documents
    const plaintextDocs: Array<{ ref: any; id: string; data: any }> = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (!data._enc) {
        plaintextDocs.push({ ref: doc.ref, id: doc.id, data });
      }
    });

    if (plaintextDocs.length === 0) {
      if (progressText) progressText.textContent = '평문 데이터가 없습니다.';
      return;
    }

    const BATCH_SIZE = 200;
    let processed = 0;

    for (let i = 0; i < plaintextDocs.length; i += BATCH_SIZE) {
      const chunk = plaintextDocs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      let batchHasOps = false;

      for (const { ref, id, data } of chunk) {
        try {
          const encrypted = await (window as any).CryptoUtils.encryptRecord({ ...data }, key);
          const saveData: any = { ...encrypted };

          if (encrypted._enc) {
            // Delete sensitive fields in plaintext
            for (const field of (window as any).CryptoUtils.SENSITIVE_FIELDS) {
              if (!(field in saveData) || saveData[field] === undefined) {
                saveData[field] = (window as any).firebase.firestore.FieldValue.delete();
              }
            }
          } else {
            // Add processing marker for records without sensitive fields
            saveData._enc = { v: 1 };
          }
          saveData.updatedAt = (window as any).firebase.firestore.FieldValue.serverTimestamp();

          batch.set(ref, saveData, { merge: true });
          batchHasOps = true;
        } catch (docErr) {
          (window.logger?.warn || console.warn)(`[Migration] ${collectionName}/${id}: 암호화 실패 -`, (docErr as Error).message);
        }

        processed++;
        const pct = Math.round((processed / plaintextDocs.length) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = `${collectionName}: ${processed}/${plaintextDocs.length}건 처리 중...`;
      }

      if (batchHasOps) {
        await batch.commit();
      }
    }

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${collectionName}: ${processed}건 암호화 완료!`;

    (window.logger?.debug || console.log)(`[Migration] ${collectionName}: ${processed}건 암호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[Migration] ${collectionName} 암호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Encrypt a local autosave file (Electron)
 */
async function encryptAutoSaveFile(filePath: string, typeName: string, year: number): Promise<void> {
  const progressDiv = getElement<HTMLElement>('encMigrationProgress');
  const progressBar = getElement<HTMLElement>('encMigrationProgressBar');
  const progressText = getElement<HTMLElement>('encMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 중...`;

  try {
    const result = await window.electronAPI!.readFile(filePath);
    if (!result.success || !result.content) {
      if (progressText) progressText.textContent = '파일 읽기 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '30%';

    // Encrypt using CryptoUtils.encryptForFile
    const encrypted = await (window as any).CryptoUtils.encryptForFile(result.content);
    if (!encrypted) {
      if (progressText) progressText.textContent = '암호화 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '70%';

    const writeResult = await window.electronAPI!.writeFile(filePath, encrypted);
    if (writeResult.success) {
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
      }
      if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 완료!`;
      (window.logger?.debug || console.log)(`[Migration] ${typeName} ${year}년 autosave 암호화 완료`);
    } else {
      if (progressBar) progressBar.style.background = '#dc2626';
      if (progressText) progressText.textContent = '파일 저장 실패';
    }
  } catch (err) {
    (window.logger?.error || console.error)(`[Migration] autosave 암호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Encrypt a web autosave file (File System Access API)
 */
async function encryptWebAutoSaveFile(fileName: string, typeName: string, year: number): Promise<void> {
  const dirHandle = (window as any).getWebDirHandle?.();
  if (!dirHandle) {
    showToast('자동저장 폴더가 선택되지 않았습니다.');
    return;
  }

  const progressDiv = getElement<HTMLElement>('encMigrationProgress');
  const progressBar = getElement<HTMLElement>('encMigrationProgressBar');
  const progressText = getElement<HTMLElement>('encMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 중...`;

  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    if (!content) {
      if (progressText) progressText.textContent = '파일 읽기 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '30%';

    // Encrypt using CryptoUtils.encryptForFile
    const encrypted = await (window as any).CryptoUtils.encryptForFile(content);
    if (!encrypted) {
      if (progressText) progressText.textContent = '암호화 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '70%';

    // Check permission and write file
    const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const requested = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (requested !== 'granted') {
        if (progressText) progressText.textContent = '폴더 쓰기 권한이 없습니다.';
        if (progressBar) progressBar.style.background = '#dc2626';
        return;
      }
    }

    const writeHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await writeHandle.createWritable();
    await writable.write(encrypted);
    await writable.close();

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 완료!`;
    (window.logger?.debug || console.log)(`[Migration] ${fileName} 웹 autosave 암호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[Migration] ${fileName} 웹 autosave 암호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Encrypt localStorage data
 */
async function encryptLocalStorageData(storageKey: string, typeName: string, year: number): Promise<void> {
  const key = (window as any).encryptionManager?.getKey();
  if (!key) return;

  const progressDiv = getElement<HTMLElement>('encMigrationProgress');
  const progressBar = getElement<HTMLElement>('encMigrationProgressBar');
  const progressText = getElement<HTMLElement>('encMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 로컬 데이터 암호화 중...`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      if (progressText) progressText.textContent = '데이터를 찾을 수 없습니다.';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) {
      if (progressText) progressText.textContent = '암호화할 데이터가 없습니다.';
      return;
    }

    let processed = 0;
    const encryptedData: any[] = [];

    for (const item of data) {
      try {
        if (item._enc) {
          // Already encrypted, keep as is
          encryptedData.push(item);
        } else {
          const encrypted = await (window as any).CryptoUtils.encryptRecord({ ...item }, key);
          encryptedData.push(encrypted);
        }
      } catch (itemErr) {
        (window.logger?.warn || console.warn)(`[Migration] ${storageKey}: 항목 암호화 실패 -`, (itemErr as Error).message);
        encryptedData.push(item); // Keep original on failure
      }

      processed++;
      const pct = Math.round((processed / data.length) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = `${typeName} ${year}년: ${processed}/${data.length}건 처리 중...`;
    }

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(encryptedData));

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${typeName} ${year}년 로컬 데이터 ${processed}건 암호화 완료!`;
    (window.logger?.debug || console.log)(`[Migration] ${storageKey}: ${processed}건 암호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[Migration] ${storageKey} 암호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Encrypt all plaintext data (Firebase + autosave + localStorage)
 */
async function encryptAllPlaintext(): Promise<void> {
  const plaintextResults = encMigrationScanResults.filter((r) => r.plaintextCount > 0);
  if (plaintextResults.length === 0) {
    showToast('암호화할 평문 데이터가 없습니다.');
    return;
  }

  const firebaseResults = plaintextResults.filter((r) => r.source === 'firebase');
  const autosaveResults = plaintextResults.filter((r) => r.source === 'autosave');
  const webAutosaveResults = plaintextResults.filter((r) => r.source === 'webAutosave');
  const localStorageResults = plaintextResults.filter((r) => r.source === 'localStorage');

  const details: string[] = [];
  if (firebaseResults.length > 0) {
    const totalFb = firebaseResults.reduce((sum, r) => sum + r.plaintextCount, 0);
    details.push(`Firebase: ${totalFb}건`);
    firebaseResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
  }
  if (autosaveResults.length > 0) {
    details.push(`자동저장 파일 (Electron): ${autosaveResults.length}개`);
    autosaveResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
  }
  if (webAutosaveResults.length > 0) {
    details.push(`자동저장 파일 (웹): ${webAutosaveResults.length}개`);
    webAutosaveResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
  }
  if (localStorageResults.length > 0) {
    const totalLs = localStorageResults.reduce((sum, r) => sum + r.plaintextCount, 0);
    details.push(`로컬 데이터: ${totalLs}건`);
    localStorageResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
  }

  const totalPlaintext = plaintextResults.reduce((sum, r) => sum + r.plaintextCount, 0);
  if (!confirm(`총 ${totalPlaintext}건의 평문 데이터를 암호화하시겠습니까?\n\n${details.join('\n')}`)) {
    return;
  }

  // Disable all migration buttons to prevent race conditions
  setMigrationButtonsEnabled(false);

  try {
    for (const result of firebaseResults) {
      if (result.collectionName) {
        await encryptPlaintextInCollection(result.collectionName, result.plaintextCount);
      }
    }
    for (const result of autosaveResults) {
      if (result.filePath) {
        await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
      }
    }
    for (const result of webAutosaveResults) {
      if (result.fileName) {
        await encryptWebAutoSaveFile(result.fileName, result.typeName, result.year);
      }
    }
    for (const result of localStorageResults) {
      if (result.storageKey) {
        await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
      }
    }
  } finally {
    setMigrationButtonsEnabled(true);
  }

  alert(`암호화 완료! 총 ${totalPlaintext}건이 처리되었습니다.`);

  // Rescan
  await scanPlaintextData();
}

// ========================================
// Decryption Migration Functions
// ========================================

/**
 * Scan encrypted data for decryption migration
 */
async function scanEncryptedData(): Promise<void> {
  if (!(window as any).encryptionManager?.isReady()) {
    showToast('암호화가 활성화되어야 합니다. (비밀번호 입력 필요)');
    return;
  }

  const statusBadge = getElement<HTMLElement>('decMigrationStatus');
  if (statusBadge) {
    statusBadge.className = 'status-badge';
    statusBadge.style.background = '#fef3c7';
    statusBadge.style.color = '#92400e';
    statusBadge.textContent = '● 스캔 중...';
  }

  const scanBtn = getElement<HTMLButtonElement>('scanEncryptedBtn');
  if (scanBtn) {
    scanBtn.disabled = true;
    scanBtn.textContent = '스캔 중...';
  }

  const currentYear = getCurrentYear();
  decMigrationScanResults = [];

  try {
    // 1. Firebase collections scan
    if ((window as any).firebaseConfig?.isEnabled()) {
      const db = (window as any).firebaseConfig.getDb();
      if (db) {
        for (const type of SAMPLE_TYPES) {
          for (let year = MIN_YEAR; year <= currentYear; year++) {
            const collectionName = (window as any).firestoreDb?.getCollectionName(type.key, year);
            if (!collectionName) continue;
            try {
              const snapshot = await db.collection(collectionName).get();
              if (snapshot.empty) continue;

              let encryptedCount = 0;
              let plaintextCount = 0;

              snapshot.forEach((doc: any) => {
                const data = doc.data();
                if (data._enc && data._enc.v) {
                  encryptedCount++;
                } else {
                  plaintextCount++;
                }
              });

              if (encryptedCount > 0) {
                decMigrationScanResults.push({
                  source: 'firebase',
                  type: type.key,
                  typeName: type.name,
                  typeIcon: type.icon,
                  year,
                  collectionName,
                  encryptedCount,
                  plaintextCount,
                  totalCount: encryptedCount + plaintextCount,
                });
              }
            } catch (err) {
              (window.logger?.warn || console.warn)(`[DecMigration] ${collectionName} 스캔 실패:`, (err as Error).message);
            }
          }
        }
      }
    }

    // 2. Local autosave files scan (Electron)
    if (isElectron && window.electronAPI) {
      for (const type of SAMPLE_TYPES) {
        for (let year = MIN_YEAR; year <= currentYear; year++) {
          try {
            const filePath = await window.electronAPI.getAutoSavePath(type.key, year);
            if (!filePath) continue;

            const result = await window.electronAPI.readFile(filePath);
            if (!result.success || !result.content) continue;

            const parsed = JSON.parse(result.content);
            if (parsed && parsed._localEnc && parsed.iv && parsed.ct) {
              // Legacy whole-file encrypted
              decMigrationScanResults.push({
                source: 'autosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                filePath,
                encryptedCount: 1,
                plaintextCount: 0,
                status: 'encrypted',
              });
            } else if (parsed && parsed._fileEnc && Array.isArray(parsed.data)) {
              // Per-record field encryption
              const encCount = parsed.data.filter((r: any) => r && r._enc).length;
              decMigrationScanResults.push({
                source: 'autosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                filePath,
                encryptedCount: encCount,
                plaintextCount: parsed.data.length - encCount,
                status: 'encrypted',
              });
            } else if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
              // Plaintext file
              decMigrationScanResults.push({
                source: 'autosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                filePath,
                encryptedCount: 0,
                plaintextCount: parsed.data.length,
                status: 'plaintext',
              });
            }
          } catch {
            // File not found or parse error - ignore
          }
        }
      }
    }

    // 2-1. Web autosave files scan (File System Access API)
    if (!isElectron && (window as any).getWebDirHandle?.()) {
      const dirHandle = (window as any).getWebDirHandle();
      for (const type of SAMPLE_TYPES) {
        const fileTypeKey = FILE_TYPE_MAP[type.key] || type.key;
        for (let year = MIN_YEAR; year <= currentYear; year++) {
          try {
            const fileName = `auto-save-${fileTypeKey}-${year}.json`;
            const fileHandle = await dirHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            if (!content) continue;

            const parsed = JSON.parse(content);
            if (parsed && parsed._localEnc && parsed.iv && parsed.ct) {
              decMigrationScanResults.push({
                source: 'webAutosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                fileName,
                encryptedCount: 1,
                plaintextCount: 0,
                status: 'encrypted',
              });
            } else if (parsed && parsed._fileEnc && Array.isArray(parsed.data)) {
              const encCount = parsed.data.filter((r: any) => r && r._enc).length;
              decMigrationScanResults.push({
                source: 'webAutosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                fileName,
                encryptedCount: encCount,
                plaintextCount: parsed.data.length - encCount,
                status: 'encrypted',
              });
            } else if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
              decMigrationScanResults.push({
                source: 'webAutosave',
                type: type.key,
                typeName: type.name,
                typeIcon: type.icon,
                year,
                fileName,
                encryptedCount: 0,
                plaintextCount: parsed.data.length,
                status: 'plaintext',
              });
            }
          } catch {
            // NotFoundError = file not found, ignore
          }
        }
      }
    }

    // 3. localStorage data scan
    for (const type of SAMPLE_TYPES) {
      for (let year = MIN_YEAR; year <= currentYear; year++) {
        try {
          const storageKey = `${type.storagePrefix}_${year}`;
          const raw = localStorage.getItem(storageKey);
          if (!raw) continue;

          const data = JSON.parse(raw);
          if (!Array.isArray(data) || data.length === 0) continue;

          let encryptedCount = 0;
          let plaintextCount = 0;
          data.forEach((item: any) => {
            if (item._enc && item._enc.v) {
              encryptedCount++;
            } else {
              plaintextCount++;
            }
          });

          if (encryptedCount > 0 || plaintextCount > 0) {
            decMigrationScanResults.push({
              source: 'localStorage',
              type: type.key,
              typeName: type.name,
              typeIcon: type.icon,
              year,
              storageKey,
              encryptedCount,
              plaintextCount,
              totalCount: encryptedCount + plaintextCount,
            });
          }
        } catch {
          // Parse error - ignore
        }
      }
    }

    renderDecMigrationList();

    const totalEncrypted = decMigrationScanResults.reduce((sum, r) => sum + r.encryptedCount, 0);
    const totalAutoPlaintext = decMigrationScanResults.filter((r) => r.source === 'autosave' && r.status === 'plaintext').length;
    const totalItems = totalEncrypted + totalAutoPlaintext;

    if (statusBadge) {
      if (totalItems > 0) {
        const parts: string[] = [];
        if (totalEncrypted > 0) parts.push(`암호화 ${totalEncrypted}건`);
        if (totalAutoPlaintext > 0) parts.push(`평문 파일 ${totalAutoPlaintext}개`);
        statusBadge.className = 'status-badge';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#92400e';
        statusBadge.textContent = `● ${parts.join(' / ')}`;
        const decryptAllBtn = getElement<HTMLButtonElement>('decryptAllBtn');
        if (decryptAllBtn) decryptAllBtn.disabled = totalEncrypted === 0;
      } else {
        statusBadge.className = 'status-badge connected';
        statusBadge.textContent = '● 데이터 없음';
        const decryptAllBtn = getElement<HTMLButtonElement>('decryptAllBtn');
        if (decryptAllBtn) decryptAllBtn.disabled = true;
      }
    }
  } catch (err) {
    (window.logger?.error || console.error)('[DecMigration] 스캔 오류:', err);
    if (statusBadge) {
      statusBadge.className = 'status-badge error';
      statusBadge.textContent = '● 스캔 실패';
    }
  } finally {
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = '🔍 암호화 데이터 스캔';
    }
  }
}

/**
 * Render decryption migration list
 */
function renderDecMigrationList(): void {
  const container = getElement<HTMLElement>('decMigrationList');
  if (!container) return;

  container.innerHTML = '';

  if (decMigrationScanResults.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; color: #94a3b8; padding: 1rem;';
    empty.textContent = '암호화된 데이터가 없습니다.';
    container.appendChild(empty);
    return;
  }

  decMigrationScanResults.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'migration-item';

    const info = document.createElement('div');
    info.className = 'migration-item-info';

    const icon = document.createElement('span');
    icon.className = 'migration-item-icon';
    icon.textContent = result.typeIcon;

    const textDiv = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'migration-item-name';
    if (result.source === 'firebase') {
      name.textContent = `${result.typeName} ${result.year}년 (Firebase)`;
    } else if (result.source === 'localStorage') {
      name.textContent = `${result.typeName} ${result.year}년 (로컬 데이터)`;
    } else {
      name.textContent = `${result.typeName} ${result.year}년 (자동저장 파일)`;
    }

    const countDiv = document.createElement('div');
    countDiv.className = 'migration-item-count';

    if (result.source === 'autosave' || result.source === 'webAutosave') {
      const statusSpan = document.createElement('span');
      statusSpan.style.fontWeight = '600';
      if (result.status === 'encrypted') {
        statusSpan.style.color = '#2563eb';
        statusSpan.textContent = '🔒 암호화됨';
      } else {
        statusSpan.style.color = '#dc2626';
        statusSpan.textContent = `🔓 평문 ${result.plaintextCount}건`;
      }
      countDiv.appendChild(statusSpan);
    } else {
      const encSpan = document.createElement('span');
      encSpan.style.color = '#2563eb';
      encSpan.style.fontWeight = '600';
      encSpan.textContent = `암호화 ${result.encryptedCount}건`;
      countDiv.appendChild(encSpan);

      if (result.plaintextCount > 0) {
        countDiv.appendChild(document.createTextNode(' / '));
        const ptSpan = document.createElement('span');
        ptSpan.style.color = '#94a3b8';
        ptSpan.textContent = `평문 ${result.plaintextCount}건`;
        countDiv.appendChild(ptSpan);
      }
    }

    textDiv.appendChild(name);
    textDiv.appendChild(countDiv);
    info.appendChild(icon);
    info.appendChild(textDiv);

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.style.fontSize = '0.8rem';
    btn.style.padding = '0.5rem 1rem';

    if (result.source === 'autosave' && result.status === 'plaintext') {
      btn.textContent = '암호화';
      btn.style.background = '#f59e0b';
      btn.addEventListener('click', () => encryptSingleAutoSave(index));
    } else if (result.source === 'webAutosave' && result.status === 'plaintext') {
      btn.textContent = '암호화';
      btn.style.background = '#f59e0b';
      btn.addEventListener('click', () => encryptSingleWebAutoSave(index));
    } else if (result.source === 'localStorage' && result.encryptedCount > 0) {
      btn.textContent = '복호화';
      btn.addEventListener('click', () => decryptSingleItem(index));
    } else if (result.source === 'localStorage' && result.plaintextCount > 0) {
      btn.textContent = '암호화';
      btn.style.background = '#f59e0b';
      btn.addEventListener('click', () => encryptSingleLocalStorage(index));
    } else {
      btn.textContent = '복호화';
      btn.addEventListener('click', () => decryptSingleItem(index));
    }

    item.appendChild(info);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

/**
 * Enable/disable decryption migration buttons
 */
function setDecMigrationButtonsEnabled(enabled: boolean): void {
  const scanBtn = getElement<HTMLButtonElement>('scanEncryptedBtn');
  const decryptAllBtn = getElement<HTMLButtonElement>('decryptAllBtn');
  if (scanBtn) scanBtn.disabled = !enabled;
  if (decryptAllBtn) decryptAllBtn.disabled = !enabled;

  const listContainer = getElement<HTMLElement>('decMigrationList');
  if (listContainer) {
    listContainer.querySelectorAll('button').forEach((btn) => {
      (btn as HTMLButtonElement).disabled = !enabled;
    });
  }
}

/**
 * Encrypt single autosave file (from decryption section - plaintext files)
 */
async function encryptSingleAutoSave(resultIndex: number): Promise<void> {
  const result = decMigrationScanResults[resultIndex];
  if (!result || result.source !== 'autosave' || result.status !== 'plaintext') return;

  if (!confirm(`${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)을 암호화하시겠습니까?`)) {
    return;
  }

  setDecMigrationButtonsEnabled(false);

  try {
    if (result.filePath) {
      await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
    }
  } finally {
    setDecMigrationButtonsEnabled(true);
  }

  await scanEncryptedData();
}

/**
 * Encrypt single localStorage item (from decryption section)
 */
async function encryptSingleLocalStorage(resultIndex: number): Promise<void> {
  const result = decMigrationScanResults[resultIndex];
  if (!result || result.source !== 'localStorage') return;

  if (!confirm(`${result.typeName} ${result.year}년 로컬 데이터 (${result.plaintextCount}건)을 암호화하시겠습니까?`)) {
    return;
  }

  setDecMigrationButtonsEnabled(false);

  try {
    if (result.storageKey) {
      await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
    }
  } finally {
    setDecMigrationButtonsEnabled(true);
  }

  await scanEncryptedData();
}

/**
 * Encrypt single web autosave file (from decryption section - plaintext files)
 */
async function encryptSingleWebAutoSave(resultIndex: number): Promise<void> {
  const result = decMigrationScanResults[resultIndex];
  if (!result || result.source !== 'webAutosave' || result.status !== 'plaintext') return;

  if (!confirm(`${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)을 암호화하시겠습니까?`)) {
    return;
  }

  setDecMigrationButtonsEnabled(false);

  try {
    if (result.fileName) {
      await encryptWebAutoSaveFile(result.fileName, result.typeName, result.year);
    }
  } finally {
    setDecMigrationButtonsEnabled(true);
  }

  await scanEncryptedData();
}

/**
 * Decrypt single item from scan results
 */
async function decryptSingleItem(resultIndex: number): Promise<void> {
  const result = decMigrationScanResults[resultIndex];
  if (!result) return;

  let label: string;
  if (result.source === 'firebase') {
    label = `${result.typeName} ${result.year}년 Firebase 데이터 ${result.encryptedCount}건`;
  } else if (result.source === 'localStorage') {
    label = `${result.typeName} ${result.year}년 로컬 데이터 ${result.encryptedCount}건`;
  } else if (result.source === 'webAutosave') {
    label = `${result.typeName} ${result.year}년 자동저장 파일`;
  } else {
    label = `${result.typeName} ${result.year}년 자동저장 파일`;
  }

  if (!confirm(`${label}을(를) 평문으로 변환하시겠습니까?\n\n⚠️ 복호화 후 민감 정보가 노출됩니다.`)) {
    return;
  }

  setDecMigrationButtonsEnabled(false);

  try {
    if (result.source === 'firebase' && result.collectionName) {
      await decryptFirebaseCollection(result.collectionName, result.encryptedCount);
    } else if (result.source === 'localStorage' && result.storageKey) {
      await decryptLocalStorageData(result.storageKey, result.typeName, result.year);
    } else if (result.source === 'webAutosave' && result.fileName) {
      await decryptWebAutoSaveFile(result.fileName, result.typeName, result.year);
    } else if (result.filePath) {
      await decryptAutoSaveFile(result.filePath, result.typeName, result.year);
    }
  } finally {
    setDecMigrationButtonsEnabled(true);
  }

  await scanEncryptedData();
}

/**
 * Decrypt Firebase collection data to plaintext
 */
async function decryptFirebaseCollection(collectionName: string, expectedCount: number): Promise<void> {
  const db = (window as any).firebaseConfig?.getDb();
  const key = (window as any).encryptionManager?.getKey();
  if (!db || !key) return;

  const progressDiv = getElement<HTMLElement>('decMigrationProgress');
  const progressBar = getElement<HTMLElement>('decMigrationProgressBar');
  const progressText = getElement<HTMLElement>('decMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${collectionName} 복호화 중...`;

  try {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) return;

    const encryptedDocs: Array<{ ref: any; id: string; data: any }> = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data._enc && data._enc.v) {
        encryptedDocs.push({ ref: doc.ref, id: doc.id, data });
      }
    });

    if (encryptedDocs.length === 0) {
      if (progressText) progressText.textContent = '암호화된 데이터가 없습니다.';
      return;
    }

    const BATCH_SIZE = 200;
    let processed = 0;

    for (let i = 0; i < encryptedDocs.length; i += BATCH_SIZE) {
      const chunk = encryptedDocs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      let batchHasOps = false;

      for (const { ref, id, data } of chunk) {
        try {
          const decrypted = await (window as any).CryptoUtils.decryptRecord({ ...data }, key);
          const saveData: any = { ...decrypted };

          // Delete _enc field
          saveData._enc = (window as any).firebase.firestore.FieldValue.delete();
          saveData.updatedAt = (window as any).firebase.firestore.FieldValue.serverTimestamp();

          batch.set(ref, saveData, { merge: true });
          batchHasOps = true;
        } catch (docErr) {
          (window.logger?.warn || console.warn)(`[DecMigration] ${collectionName}/${id}: 복호화 실패 -`, (docErr as Error).message);
        }

        processed++;
        const pct = Math.round((processed / encryptedDocs.length) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = `${collectionName}: ${processed}/${encryptedDocs.length}건 복호화 중...`;
      }

      if (batchHasOps) {
        await batch.commit();
      }
    }

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${collectionName}: ${processed}건 평문 변환 완료!`;

    (window.logger?.debug || console.log)(`[DecMigration] ${collectionName}: ${processed}건 복호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[DecMigration] ${collectionName} 복호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Decrypt local autosave file to plaintext
 */
async function decryptAutoSaveFile(filePath: string, typeName: string, year: number): Promise<void> {
  const progressDiv = getElement<HTMLElement>('decMigrationProgress');
  const progressBar = getElement<HTMLElement>('decMigrationProgressBar');
  const progressText = getElement<HTMLElement>('decMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 복호화 중...`;

  try {
    const result = await window.electronAPI!.readFile(filePath);
    if (!result.success || !result.content) {
      if (progressText) progressText.textContent = '파일 읽기 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '30%';

    // Decrypt using CryptoUtils.decryptFromFile
    const decrypted = await (window as any).CryptoUtils.decryptFromFile(result.content);
    if (!decrypted) {
      if (progressText) progressText.textContent = '복호화 실패 (키 불일치 또는 데이터 손상)';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '70%';

    // Save as plaintext JSON
    const plainContent = JSON.stringify(decrypted, null, 2);
    const writeResult = await window.electronAPI!.writeFile(filePath, plainContent);

    if (writeResult.success) {
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
      }
      if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 평문 변환 완료!`;
      (window.logger?.debug || console.log)(`[DecMigration] ${typeName} ${year}년 autosave 복호화 완료`);
    } else {
      if (progressBar) progressBar.style.background = '#dc2626';
      if (progressText) progressText.textContent = '파일 저장 실패';
    }
  } catch (err) {
    (window.logger?.error || console.error)(`[DecMigration] autosave 복호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Decrypt web autosave file (File System Access API)
 */
async function decryptWebAutoSaveFile(fileName: string, typeName: string, year: number): Promise<void> {
  const dirHandle = (window as any).getWebDirHandle?.();
  if (!dirHandle) {
    showToast('자동저장 폴더가 선택되지 않았습니다.');
    return;
  }

  const progressDiv = getElement<HTMLElement>('decMigrationProgress');
  const progressBar = getElement<HTMLElement>('decMigrationProgressBar');
  const progressText = getElement<HTMLElement>('decMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 복호화 중...`;

  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    if (!content) {
      if (progressText) progressText.textContent = '파일 읽기 실패';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '30%';

    // Decrypt using CryptoUtils.decryptFromFile
    const decrypted = await (window as any).CryptoUtils.decryptFromFile(content);
    if (!decrypted) {
      if (progressText) progressText.textContent = '복호화 실패 (키 불일치 또는 데이터 손상)';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    if (progressBar) progressBar.style.width = '70%';

    // Check permission and save as plaintext JSON
    const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const requested = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (requested !== 'granted') {
        if (progressText) progressText.textContent = '폴더 쓰기 권한이 없습니다.';
        if (progressBar) progressBar.style.background = '#dc2626';
        return;
      }
    }

    const plainContent = JSON.stringify(decrypted, null, 2);
    const writeHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await writeHandle.createWritable();
    await writable.write(plainContent);
    await writable.close();

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${typeName} ${year}년 자동저장 파일 평문 변환 완료!`;
    (window.logger?.debug || console.log)(`[DecMigration] ${fileName} 웹 autosave 복호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[DecMigration] ${fileName} 웹 autosave 복호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Decrypt localStorage data to plaintext
 */
async function decryptLocalStorageData(storageKey: string, typeName: string, year: number): Promise<void> {
  const key = (window as any).encryptionManager?.getKey();
  if (!key) return;

  const progressDiv = getElement<HTMLElement>('decMigrationProgress');
  const progressBar = getElement<HTMLElement>('decMigrationProgressBar');
  const progressText = getElement<HTMLElement>('decMigrationProgressText');

  if (progressDiv) progressDiv.style.display = 'block';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
  }
  if (progressText) progressText.textContent = `${typeName} ${year}년 로컬 데이터 복호화 중...`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      if (progressText) progressText.textContent = '데이터를 찾을 수 없습니다.';
      if (progressBar) progressBar.style.background = '#dc2626';
      return;
    }

    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) {
      if (progressText) progressText.textContent = '복호화할 데이터가 없습니다.';
      return;
    }

    let processed = 0;
    const decryptedData: any[] = [];

    for (const item of data) {
      try {
        if (item._enc && item._enc.v) {
          const decrypted = await (window as any).CryptoUtils.decryptRecord({ ...item }, key);
          // Remove _enc field
          delete decrypted._enc;
          decryptedData.push(decrypted);
        } else {
          // Already plaintext, keep as is
          decryptedData.push(item);
        }
      } catch (itemErr) {
        (window.logger?.warn || console.warn)(`[DecMigration] ${storageKey}: 항목 복호화 실패 -`, (itemErr as Error).message);
        decryptedData.push(item); // Keep original on failure
      }

      processed++;
      const pct = Math.round((processed / data.length) * 100);
      if (progressBar) progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = `${typeName} ${year}년: ${processed}/${data.length}건 복호화 중...`;
    }

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(decryptedData));

    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.background = '#22c55e';
    }
    if (progressText) progressText.textContent = `${typeName} ${year}년 로컬 데이터 ${processed}건 평문 변환 완료!`;
    (window.logger?.debug || console.log)(`[DecMigration] ${storageKey}: ${processed}건 복호화 완료`);
  } catch (err) {
    (window.logger?.error || console.error)(`[DecMigration] ${storageKey} 복호화 오류:`, err);
    if (progressBar) progressBar.style.background = '#dc2626';
    if (progressText) progressText.textContent = `오류: ${(err as Error).message}`;
  }
}

/**
 * Decrypt all encrypted data to plaintext
 */
async function decryptAllEncrypted(): Promise<void> {
  if (decMigrationScanResults.length === 0) {
    showToast('복호화할 암호화 데이터가 없습니다.');
    return;
  }

  const firebaseResults = decMigrationScanResults.filter((r) => r.source === 'firebase');
  const autosaveResults = decMigrationScanResults.filter((r) => r.source === 'autosave');
  const webAutosaveResults = decMigrationScanResults.filter((r) => r.source === 'webAutosave' && r.status === 'encrypted');
  const localStorageResults = decMigrationScanResults.filter((r) => r.source === 'localStorage' && r.encryptedCount > 0);

  const details: string[] = [];
  if (firebaseResults.length > 0) {
    const totalFb = firebaseResults.reduce((sum, r) => sum + r.encryptedCount, 0);
    details.push(`Firebase: ${totalFb}건`);
    firebaseResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.encryptedCount}건`));
  }
  if (autosaveResults.length > 0) {
    details.push(`자동저장 파일 (Electron): ${autosaveResults.length}개`);
    autosaveResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년`));
  }
  if (webAutosaveResults.length > 0) {
    details.push(`자동저장 파일 (웹): ${webAutosaveResults.length}개`);
    webAutosaveResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년`));
  }
  if (localStorageResults.length > 0) {
    const totalLs = localStorageResults.reduce((sum, r) => sum + r.encryptedCount, 0);
    details.push(`로컬 데이터: ${totalLs}건`);
    localStorageResults.forEach((r) => details.push(`  ${r.typeName} ${r.year}년: ${r.encryptedCount}건`));
  }

  if (!confirm(`전체 암호화 데이터를 평문으로 변환하시겠습니까?\n\n${details.join('\n')}\n\n⚠️ 복호화 후 민감 정보가 노출됩니다.`)) {
    return;
  }

  setDecMigrationButtonsEnabled(false);

  try {
    for (const result of firebaseResults) {
      if (result.collectionName) {
        await decryptFirebaseCollection(result.collectionName, result.encryptedCount);
      }
    }
    for (const result of autosaveResults) {
      if (result.filePath) {
        await decryptAutoSaveFile(result.filePath, result.typeName, result.year);
      }
    }
    for (const result of webAutosaveResults) {
      if (result.fileName) {
        await decryptWebAutoSaveFile(result.fileName, result.typeName, result.year);
      }
    }
    for (const result of localStorageResults) {
      if (result.storageKey) {
        await decryptLocalStorageData(result.storageKey, result.typeName, result.year);
      }
    }
  } finally {
    setDecMigrationButtonsEnabled(true);
  }

  const total = decMigrationScanResults.reduce((sum, r) => sum + r.encryptedCount, 0);
  alert(`평문 변환 완료! 총 ${total}건이 처리되었습니다.`);

  await scanEncryptedData();
}

/**
 * Initialize encryption migration event listeners
 */
function initEncryptionMigrationListeners(): void {
  // Encryption section listeners
  const scanPlaintextBtn = getElement<HTMLButtonElement>('scanPlaintextBtn');
  scanPlaintextBtn?.addEventListener('click', scanPlaintextData);

  const encryptAllBtn = getElement<HTMLButtonElement>('encryptAllBtn');
  encryptAllBtn?.addEventListener('click', encryptAllPlaintext);

  // Decryption section listeners
  const scanEncryptedBtn = getElement<HTMLButtonElement>('scanEncryptedBtn');
  scanEncryptedBtn?.addEventListener('click', scanEncryptedData);

  const decryptAllBtn = getElement<HTMLButtonElement>('decryptAllBtn');
  decryptAllBtn?.addEventListener('click', decryptAllEncrypted);

  // Show encryption migration section if encryption is active
  if ((window as any).encryptionManager?.isReady()) {
    const encSection = getElement<HTMLElement>('encMigrationSection');
    if (encSection) encSection.style.display = 'block';
    const decSection = getElement<HTMLElement>('decMigrationSection');
    if (decSection) decSection.style.display = 'block';
  }
}

// Initialize encryption migration listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEncryptionMigrationListeners);
} else {
  initEncryptionMigrationListeners();
}

// ========================================
// Export functions for module usage
// ========================================

export {
  // Constants
  SAMPLE_TYPES,
  FILE_TYPE_MAP,
  isElectron,
  // Auth file functions
  checkAuthFileStatus,
  saveAuthFile,
  deleteAuthFile,
  // Firebase config functions
  loadSavedConfig,
  updateConnectionStatus,
  toggleManualSettings,
  parseQuickSetup,
  // Migration list functions
  renderMigrationList,
  migrateTypeAllYears,
  // Cache management
  updateCacheStatusUI,
  // Network access
  initNetworkAccessUI,
  // Organization settings
  loadOrgName,
  loadDefaultSido,
  // Storage mode
  initStorageModeUI,
  updateStorageModeStatus,
  changeStorageMode,
  // Encryption status
  updateEncryptionStatusUI,
  showSettingsPasswordPrompt,
  // Encryption migration (scan results)
  encMigrationScanResults,
  decMigrationScanResults,
  // Encryption migration functions
  scanPlaintextData,
  renderEncMigrationList,
  setMigrationButtonsEnabled,
  encryptSingleItem,
  encryptPlaintextInCollection,
  encryptAutoSaveFile,
  encryptWebAutoSaveFile,
  encryptLocalStorageData,
  encryptAllPlaintext,
  // Decryption migration functions
  scanEncryptedData,
  renderDecMigrationList,
  setDecMigrationButtonsEnabled,
  decryptSingleItem,
  decryptFirebaseCollection,
  decryptAutoSaveFile,
  decryptWebAutoSaveFile,
  decryptLocalStorageData,
  decryptAllEncrypted,
  encryptSingleAutoSave,
  encryptSingleLocalStorage,
  encryptSingleWebAutoSave,
  // Initialization
  initEncryptionMigrationListeners,
};
