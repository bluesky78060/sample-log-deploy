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
  const statusEl = getElement<HTMLElement>('authFileStatus');
  const uploadArea = getElement<HTMLElement>('authFileUploadArea');
  const infoArea = getElement<HTMLElement>('authFileInfo');

  if (!statusEl || !uploadArea || !infoArea) return;

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
    const result = await window.electronAPI!.readAuthFile();

    if (result.success && result.content) {
      try {
        const config = JSON.parse(result.content) as FirebaseConfig;
        if (config.projectId) {
          statusEl.className = 'status-badge connected';
          statusEl.textContent = '● 등록됨';
          uploadArea.style.display = 'none';
          infoArea.style.display = 'block';
          const projectIdEl = getElement<HTMLElement>('authFileProjectId');
          if (projectIdEl) {
            projectIdEl.textContent = `프로젝트: ${config.projectId}`;
          }
          return;
        }
      } catch (e) {
        console.error('인증 파일 파싱 오류:', e);
      }
    }

    statusEl.className = 'status-badge disconnected';
    statusEl.textContent = '● 미등록';
    uploadArea.style.display = 'block';
    infoArea.style.display = 'none';
  } catch (error) {
    console.error('인증 파일 확인 오류:', error);
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
      console.error('Firebase 설정 파싱 오류:', e);
      localStorage.removeItem(SETTINGS_FIREBASE_KEY);
    }
  }
}

/**
 * Update connection status badge
 */
function updateConnectionStatus(): void {
  const statusEl = getElement<HTMLElement>('connectionStatus');
  const migrateAllBtn = getElement<HTMLButtonElement>('migrateAllBtn');

  if (!statusEl) return;

  if (window.firebaseConfig?.isEnabled?.()) {
    statusEl.className = 'status-badge connected';
    statusEl.textContent = '● 연결됨';
    if (migrateAllBtn) migrateAllBtn.disabled = false;
  } else {
    statusEl.className = 'status-badge disconnected';
    statusEl.textContent = '● 미연결';
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

// Make toggleManualSettings available globally
(window as Window & { toggleManualSettings?: typeof toggleManualSettings }).toggleManualSettings = toggleManualSettings;

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
          console.error(`${storageKey} 파싱 오류:`, e);
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
          console.warn('[Settings] Password verification failed:', (e as Error).message);
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

      resolve(true);
    }

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => resolve(false));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) submit();
      if (e.key === 'Escape') resolve(false);
    });
    input.addEventListener('input', () => {
      errDiv.style.display = 'none';
      input.style.borderColor = '#ddd';
    });
    setTimeout(() => input.focus(), 100);
  });
}

// ========================================
// Export functions for module usage
// ========================================

export {
  SAMPLE_TYPES,
  FILE_TYPE_MAP,
  isElectron,
  checkAuthFileStatus,
  saveAuthFile,
  deleteAuthFile,
  loadSavedConfig,
  updateConnectionStatus,
  toggleManualSettings,
  renderMigrationList,
  migrateTypeAllYears,
  updateCacheStatusUI,
  initNetworkAccessUI,
  loadOrgName,
  initStorageModeUI,
  updateStorageModeStatus,
  changeStorageMode,
  updateEncryptionStatusUI,
  showSettingsPasswordPrompt,
  encMigrationScanResults,
  decMigrationScanResults,
};
