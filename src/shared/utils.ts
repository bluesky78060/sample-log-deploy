// ========================================
// 공통 유틸리티 모듈
// 모든 시료 모듈에서 공통으로 사용하는 함수들
// ========================================

// ========================================
// 타입 정의
// ========================================

/** 토스트 메시지 타입 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/** 자동 저장 상태 */
type AutoSaveStatus = 'active' | 'inactive' | 'saving' | 'error' | 'pending' | 'syncing';

/** 면적 단위 */
type AreaUnit = 'pyeong' | 'm2';

/** localStorage 사용량 정보 */
interface LocalStorageUsage {
    used: number;
    total: number;
    percent: number;
    usedMB: string;
    totalMB: string;
}

/** 뷰 전환 옵션 */
interface ViewSwitcherOptions {
    views: NodeListOf<Element>;
    navItems: NodeListOf<Element>;
    onListView?: () => void;
}

/** 연도 핸들러 옵션 */
interface YearHandlerOptions {
    storageKeyPrefix: string;
    loadYearData: (year: string) => void;
    FileAPI: FileAPIInstance;
    showToast?: (message: string, type?: ToastType) => void;
}

/** 연도 핸들러 반환값 */
interface YearHandlerResult {
    getStorageKey: (year: string) => string;
    setupYearSelect: (yearSelect: HTMLSelectElement, state: { selectedYear: string }) => void;
}

/** 파일 API 인스턴스 인터페이스 */
interface FileAPIInstance {
    autoSavePath: string | null;
    autoSaveFileName?: string | null;
    sampleType?: string;
    init?(year: number | string): Promise<void>;
    updateAutoSavePath(year: number | string): Promise<void>;
    saveFile(content: string, suggestedName?: string): Promise<boolean>;
    openFile(): Promise<string | null>;
    autoSave(content: string): Promise<boolean>;
    loadAutoSave(): Promise<string | null>;
    saveExcel?(buffer: ArrayBuffer, suggestedName?: string): Promise<boolean>;
}

/** 자동 저장 초기화 옵션 */
interface InitAutoSaveOptions {
    moduleKey: string;
    moduleName: string;
    FileAPI: FileAPIInstance;
    currentYear: string;
    log?: (...args: unknown[]) => void;
    showToast?: (message: string, type?: ToastType) => void;
}

/** 자동 저장 수행 옵션 */
interface PerformAutoSaveOptions {
    FileAPI: FileAPIInstance;
    moduleKey: string;
    data: unknown[];
    webFileHandle?: FileSystemFileHandle;
    log?: (...args: unknown[]) => void;
}

/** 자동 저장 토글 옵션 */
interface AutoSaveToggleOptions {
    moduleKey: string;
    FileAPI: FileAPIInstance;
    getWebFileHandle?: () => FileSystemFileHandle | null;
    setWebFileHandle?: (handle: FileSystemFileHandle | null) => void;
    autoSaveCallback?: () => Promise<void>;
    showToast?: (message: string, type?: ToastType) => void;
    log?: (...args: unknown[]) => void;
}

/** 자동 저장 폴더 버튼 옵션 */
interface AutoSaveFolderButtonOptions {
    moduleKey: string;
    FileAPI: FileAPIInstance;
    selectedYear: string;
    getWebFileHandle?: () => FileSystemFileHandle | null;
    setWebFileHandle?: (handle: FileSystemFileHandle | null) => void;
    autoSaveCallback?: () => Promise<void>;
    showToast?: (message: string, type?: ToastType) => void;
}

/** JSON 저장 옵션 */
interface SaveJSONOptions {
    sampleType: string;
    data: unknown[];
    FileAPI: FileAPIInstance;
    filePrefix: string;
    showToast?: (message: string, type?: ToastType) => void;
}

/** JSON 파일 구조 */
interface JSONFileData {
    version: string;
    exportDate: string;
    sampleType?: string;
    totalRecords: number;
    data: unknown[];
}

/** JSON 로드 핸들러 옵션 */
interface JSONLoadHandlerOptions {
    inputElement: HTMLInputElement;
    getData: () => unknown[];
    setData: (data: unknown[]) => void;
    saveData: () => void;
    renderData: () => void;
    showToast?: (message: string, type?: ToastType) => void;
    deduplicateById?: boolean;
}

/** Electron 로드 핸들러 옵션 */
interface ElectronLoadHandlerOptions {
    buttonElement: HTMLElement;
    FileAPI: FileAPIInstance;
    getData: () => unknown[];
    setData: (data: unknown[]) => void;
    saveData: () => void;
    renderData: () => void;
    showToast?: (message: string, type?: ToastType) => void;
    deduplicateById?: boolean;
}

/** JSON 저장 핸들러 옵션 */
interface JSONSaveHandlerOptions {
    buttonElement: HTMLElement;
    sampleType: string;
    getData: () => unknown[];
    FileAPI: FileAPIInstance;
    filePrefix: string;
    showToast?: (message: string, type?: ToastType) => void;
}

/** safeSetJSON 옵션 */
interface SafeSetJSONOptions {
    onQuotaExceeded?: (usage: LocalStorageUsage) => void;
    showToast?: (message: string, type?: ToastType) => void;
}

/** Window 확장 인터페이스 */
interface WindowExtensions {
    electronAPI?: {
        isElectron: true;
        selectAutoSaveFolder(): Promise<{ success: boolean; folder?: string; canceled?: boolean }>;
        getAutoSavePath(moduleKey: string, year: string): Promise<string>;
        getAutoSaveFolder(): Promise<string>;
    };
    isElectron?: boolean;
    logger?: {
        debug: (...args: unknown[]) => void;
        info: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
    };
    showToast?: (message: string, type?: ToastType) => void;
    selectWebAutoSaveFolder?: () => Promise<{ success: boolean; folderName?: string }>;
    hasWebAutoSaveFolder?: () => boolean;
    getWebDirHandle?: () => FileSystemDirectoryHandle | null;
    STORAGE?: {
        LOCAL_STORAGE_LIMIT_BYTES: number;
    };
    CryptoUtils?: {
        encryptForFile(data: unknown): Promise<string>;
        decryptFromFile(content: string): Promise<{ data: unknown[] } | unknown[] | null>;
    };
    SampleUtils?: SampleUtilsInterface;
}

/** ID를 가진 아이템 */
interface ItemWithId {
    id: string;
    [key: string]: unknown;
}

// ========================================
// 정규식 상수 - 모듈 레벨 호이스팅 (js-hoist-regexp)
// ========================================
const REGEX_NON_DIGIT = /[^\d]/g;

// ========================================
// 전역 에러 핸들러
// ========================================

/**
 * 전역 에러 핸들러 설정
 * 처리되지 않은 Promise rejection 및 일반 에러 캐치
 */
function setupGlobalErrorHandler(): void {
    // 처리되지 않은 Promise rejection 캐치
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const win = window as Window & WindowExtensions;
        const logError = win.logger?.error || console.error;
        logError('처리되지 않은 Promise rejection:', event.reason);

        // 네트워크 에러인 경우 사용자에게 알림
        const reason = event.reason as { message?: string; code?: string } | undefined;
        if (reason?.message?.includes('network') ||
            reason?.message?.includes('fetch') ||
            reason?.code === 'unavailable') {
            if (win.showToast) {
                win.showToast('네트워크 연결을 확인해주세요.', 'error');
            }
        }

        // 기본 동작 방지 (콘솔 에러 중복 방지)
        event.preventDefault();
    });

    // 전역 에러 캐치
    window.addEventListener('error', (event: ErrorEvent) => {
        const win = window as Window & WindowExtensions;
        const logError = win.logger?.error || console.error;
        logError('전역 에러:', event.error || event.message);

        // 스크립트 로드 실패
        const target = event.target as HTMLElement | null;
        if (target?.tagName === 'SCRIPT') {
            logError('스크립트 로드 실패:', (target as HTMLScriptElement).src);
        }
    });
}

// 글로벌 에러 핸들러 자동 설정
setupGlobalErrorHandler();

/**
 * 전화번호 자동 포맷팅
 * @param value - 입력값
 * @returns 포맷된 전화번호
 */
function formatPhoneNumber(value: string): string {
    const numbers = value.replace(REGEX_NON_DIGIT, '');

    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
        if (numbers.startsWith('02')) {
            // 서울 지역번호
            if (numbers.length <= 9) {
                return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
            } else {
                return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
            }
        } else {
            // 휴대폰 또는 일반 지역번호
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
        }
    }
    return value;
}

/**
 * 전화번호 입력 이벤트 핸들러 설정
 * @param input - 전화번호 입력 요소
 */
function setupPhoneNumberInput(input: HTMLInputElement | null): void {
    if (!input) return;

    input.addEventListener('input', function(this: HTMLInputElement) {
        const cursorPos = this.selectionStart ?? 0;
        const oldLength = this.value.length;
        this.value = formatPhoneNumber(this.value);
        const newLength = this.value.length;
        const newCursorPos = cursorPos + (newLength - oldLength);
        this.setSelectionRange(newCursorPos, newCursorPos);
    });
}

/**
 * 숫자 천 단위 구분자 포맷팅
 * @param value - 숫자 값
 * @returns 포맷된 숫자
 */
function formatNumber(value: string | number): string {
    const num = parseFloat(String(value));
    if (isNaN(num)) return '0';
    return num.toLocaleString('ko-KR');
}

/**
 * 면적 포맷팅
 * @param value - 면적 값
 * @returns 포맷된 면적
 */
function formatArea(value: string | number): string {
    return formatNumber(value);
}

/**
 * 단위 라벨 반환
 * @param unit - 단위 코드 ('pyeong' 또는 'm2')
 * @returns 단위 라벨
 */
function getUnitLabel(unit: AreaUnit): string {
    return unit === 'pyeong' ? '평' : '㎡';
}

/**
 * 면적과 단위를 함께 포맷팅
 * @param area - 면적 값
 * @param unit - 단위 코드
 * @returns 포맷된 문자열
 */
function formatAreaWithUnit(area: string | number, unit: AreaUnit): string {
    return `${formatArea(area)} ${getUnitLabel(unit)}`;
}

/**
 * 뷰 전환 함수 생성기
 * @param options - 옵션
 * @returns switchView 함수
 */
function createViewSwitcher(options: ViewSwitcherOptions): (viewName: string) => void {
    const { views, navItems, onListView } = options;

    return function switchView(viewName: string): void {
        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        // 목록 뷰로 전환 시 콜백 실행
        if (viewName === 'list' && typeof onListView === 'function') {
            onListView();
        }
    };
}

/**
 * 네비게이션 이벤트 핸들러 설정
 * @param navItems - 네비게이션 버튼들
 * @param switchView - 뷰 전환 함수
 */
function setupNavigation(navItems: NodeListOf<Element>, switchView: (viewName: string) => void): void {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = (item as HTMLElement).dataset.view;
            if (viewName) {
                switchView(viewName);
            }
        });
    });
}

/**
 * 연도 선택 핸들러 생성기
 * @param options - 옵션
 * @returns { getStorageKey, setupYearSelect }
 */
function createYearHandler(options: YearHandlerOptions): YearHandlerResult {
    const { storageKeyPrefix, loadYearData, FileAPI, showToast } = options;
    const win = window as Window & WindowExtensions;

    /**
     * 년도별 스토리지 키 생성
     * @param year - 연도
     * @returns 스토리지 키
     */
    function getStorageKey(year: string): string {
        return `${storageKeyPrefix}_${year}`;
    }

    /**
     * 연도 선택 이벤트 설정
     * @param yearSelect - 연도 선택 요소
     * @param state - 상태 객체 (selectedYear 포함)
     */
    function setupYearSelect(yearSelect: HTMLSelectElement | null, state: { selectedYear: string }): void {
        if (!yearSelect) return;

        yearSelect.addEventListener('change', async (e: Event) => {
            const target = e.target as HTMLSelectElement;
            state.selectedYear = target.value;
            loadYearData(state.selectedYear);

            // 자동 저장 경로도 연도별로 업데이트
            if (win.isElectron && FileAPI) {
                await FileAPI.updateAutoSavePath(state.selectedYear);
            }

            if (showToast) {
                showToast(`${state.selectedYear}년 데이터를 불러왔습니다.`, 'success');
            }
        });
    }

    return { getStorageKey, setupYearSelect };
}

/**
 * localStorage에서 안전하게 JSON 파싱
 * @param key - localStorage 키
 * @param defaultValue - 파싱 실패 시 기본값
 * @returns 파싱된 값 또는 기본값
 */
function safeParseJSON<T = unknown[]>(key: string, defaultValue: T = [] as unknown as T): T {
    const win = window as Window & WindowExtensions;
    try {
        const value = localStorage.getItem(key);
        if (!value) return defaultValue;
        return JSON.parse(value) as T;
    } catch (error) {
        const logError = win.logger?.error || console.error;
        logError(`JSON 파싱 오류 (${key}):`, error);
        return defaultValue;
    }
}

/**
 * localStorage 사용량 확인
 * @returns { used: number, total: number, percent: number }
 */
function getLocalStorageUsage(): LocalStorageUsage {
    const win = window as Window & WindowExtensions;
    let used = 0;
    for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            used += (localStorage[key].length + key.length) * 2; // UTF-16
        }
    }
    const total = win.STORAGE?.LOCAL_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024;
    return {
        used,
        total,
        percent: Math.round((used / total) * 100),
        usedMB: (used / (1024 * 1024)).toFixed(2),
        totalMB: (total / (1024 * 1024)).toFixed(0)
    };
}

/**
 * localStorage에 안전하게 JSON 저장 (용량 초과 방지)
 * @param key - localStorage 키
 * @param data - 저장할 데이터
 * @param options - 옵션
 * @returns 저장 성공 여부
 */
function safeSetJSON(key: string, data: unknown, options: SafeSetJSONOptions = {}): boolean {
    const { onQuotaExceeded, showToast } = options;
    const win = window as Window & WindowExtensions;
    const logError = win.logger?.error || console.error;

    try {
        const jsonString = JSON.stringify(data);
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        const err = error as { name?: string; code?: number; message?: string };
        if (err.name === 'QuotaExceededError' ||
            err.code === 22 || // Chrome
            err.code === 1014 || // Firefox
            err.message?.includes('quota')) {

            logError('localStorage 용량 초과:', error);

            const usage = getLocalStorageUsage();
            const message = `저장 공간이 부족합니다.\n현재 사용량: ${usage.usedMB}MB / ${usage.totalMB}MB (${usage.percent}%)\n\n오래된 데이터를 삭제하거나 JSON 파일로 백업 후 정리해주세요.`;

            if (showToast) {
                showToast('저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'error');
            } else {
                alert(message);
            }

            if (onQuotaExceeded) {
                onQuotaExceeded(usage);
            }

            return false;
        }

        logError('localStorage 저장 오류:', error);
        return false;
    }
}

/**
 * 데이터 마이그레이션 (년도 없는 기존 데이터를 현재 년도로 이동)
 * @param oldKey - 기존 스토리지 키
 * @param newKey - 새 스토리지 키
 * @param log - 로그 함수
 * @returns 마이그레이션된 데이터
 */
function migrateOldData(oldKey: string, newKey: string, log: (...args: unknown[]) => void = console.log): unknown[] {
    const newData = safeParseJSON<unknown[]>(newKey, []);
    if (newData.length > 0) return newData;

    const oldData = safeParseJSON<unknown[]>(oldKey, []);
    if (oldData.length > 0) {
        localStorage.setItem(newKey, JSON.stringify(oldData));
        log('📂 기존 데이터를 년도별 저장소로 마이그레이션:', oldData.length, '건');
        return oldData;
    }

    return [];
}

/**
 * 자동 저장 상태 UI 업데이트
 * @param status - 상태 (active, inactive, saving, error, pending, syncing)
 */
function updateAutoSaveStatus(status: AutoSaveStatus): void {
    const autoSaveStatus = document.getElementById('autoSaveStatus');
    if (!autoSaveStatus) return;

    const statusText = autoSaveStatus.querySelector('.status-text');

    autoSaveStatus.classList.remove('hidden', 'active', 'saving', 'error');

    switch (status) {
        case 'active':
            autoSaveStatus.classList.add('active');
            if (statusText) statusText.textContent = '자동저장 활성';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'saving':
            autoSaveStatus.classList.add('saving');
            if (statusText) statusText.textContent = '저장 중...';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'syncing':
            autoSaveStatus.classList.add('saving');
            if (statusText) statusText.textContent = '동기화 중...';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'error':
            autoSaveStatus.classList.add('error');
            if (statusText) statusText.textContent = '저장 오류';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'pending':
            autoSaveStatus.classList.add('active');
            if (statusText) statusText.textContent = '대기 중';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'inactive':
        default:
            autoSaveStatus.classList.add('hidden');
            if (statusText) statusText.textContent = '';
            break;
    }
}

/**
 * 자동 저장 초기화 (Electron & Web 환경 지원)
 * @param options - 옵션
 */
async function initAutoSave(options: InitAutoSaveOptions): Promise<void> {
    const { moduleKey, moduleName, FileAPI, currentYear, log = console.log, showToast } = options;
    const win = window as Window & WindowExtensions;

    const autoSaveToggle = document.getElementById('autoSaveToggle') as HTMLInputElement | null;
    const folderSelectedKey = `${moduleKey}AutoSaveFolderSelected`;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (win.isElectron && win.electronAPI) {
        // Electron 환경
        const hasSelectedFolder = localStorage.getItem(folderSelectedKey) === 'true';

        if (!hasSelectedFolder) {
            // 잠시 후 폴더 선택 다이얼로그 표시 (UI 로드 후)
            setTimeout(async () => {
                const confirmSelect = confirm(`${moduleName} 자동 저장 기능을 사용하시겠습니까?\n\n저장할 폴더를 선택해주세요.`);
                if (confirmSelect) {
                    try {
                        const result = await win.electronAPI!.selectAutoSaveFolder();
                        if (result.success) {
                            FileAPI.autoSavePath = await win.electronAPI!.getAutoSavePath(moduleKey, currentYear);
                            localStorage.setItem(folderSelectedKey, 'true');
                            localStorage.setItem(enabledKey, 'true');
                            if (autoSaveToggle) {
                                autoSaveToggle.checked = true;
                                autoSaveToggle.dispatchEvent(new Event('change'));
                            }
                            updateAutoSaveStatus('active');
                            log(`📁 ${moduleName} 자동 저장 폴더 설정됨:`, result.folder);
                        }
                    } catch (error) {
                        const logError = win.logger?.error || console.error;
                        logError('폴더 선택 오류:', error);
                    }
                }
            }, 500);
        } else {
            // 이전에 폴더를 선택한 경우, 자동 저장 경로 설정
            FileAPI.autoSavePath = await win.electronAPI!.getAutoSavePath(moduleKey, currentYear);

            // 사용자가 설정한 자동저장 상태 복원 (기본값: true - 최초 폴더 선택 시 true로 설정됨)
            const autoSaveEnabled = localStorage.getItem(enabledKey) !== 'false';
            if (autoSaveToggle) {
                autoSaveToggle.checked = autoSaveEnabled;
            }
            updateAutoSaveStatus(autoSaveEnabled ? 'active' : 'inactive');
            log(`📁 ${moduleName} 자동 저장 경로:`, FileAPI.autoSavePath, '활성화:', autoSaveEnabled);
        }
    } else {
        // Web 환경 - File System Access API로 폴더 선택 자동저장
        const hasSelectedFolder = localStorage.getItem(folderSelectedKey) === 'true';
        const supportsDirectoryPicker = 'showDirectoryPicker' in window;

        if (!hasSelectedFolder && supportsDirectoryPicker) {
            // 최초 방문: 폴더 선택 안내
            setTimeout(async () => {
                const confirmSelect = confirm(
                    `${moduleName} 자동 저장 기능을 사용하시겠습니까?\n\n` +
                    '저장할 폴더를 선택하면 데이터가 파일로 자동 백업됩니다.\n' +
                    '(브라우저 데이터 삭제 시에도 파일은 안전합니다)'
                );
                if (confirmSelect && win.selectWebAutoSaveFolder) {
                    try {
                        const result = await win.selectWebAutoSaveFolder();
                        if (result.success) {
                            localStorage.setItem(folderSelectedKey, 'true');
                            localStorage.setItem(enabledKey, 'true');
                            if (autoSaveToggle) {
                                autoSaveToggle.checked = true;
                                autoSaveToggle.dispatchEvent(new Event('change'));
                            }
                            updateAutoSaveStatus('active');
                            log(`📁 ${moduleName} 자동 저장 폴더 설정됨: ${result.folderName}`);
                            if (showToast) showToast(`자동 저장 폴더가 설정되었습니다: ${result.folderName}`, 'success');
                        }
                    } catch (error) {
                        const logError = win.logger?.error || console.error;
                        logError('폴더 선택 오류:', error);
                    }
                }
            }, 500);
        } else if (hasSelectedFolder && supportsDirectoryPicker) {
            // 이전에 폴더를 선택했으나 웹은 새로고침하면 핸들이 사라짐 → 재선택 필요
            const autoSaveEnabled = localStorage.getItem(enabledKey) !== 'false';
            if (autoSaveToggle) {
                autoSaveToggle.checked = autoSaveEnabled;
            }

            if (autoSaveEnabled && !win.hasWebAutoSaveFolder?.()) {
                // 폴더 핸들이 없으면 재선택 안내 (사용자 제스처 필요)
                updateAutoSaveStatus('pending');
                log(`📁 ${moduleName} 자동 저장: 폴더 재선택 필요 (브라우저 새로고침 후)`);
            } else {
                updateAutoSaveStatus(autoSaveEnabled ? 'active' : 'inactive');
            }
        } else {
            // showDirectoryPicker 미지원 (Firefox 등)
            const autoSaveEnabled = localStorage.getItem(enabledKey) === 'true';
            if (autoSaveToggle && autoSaveEnabled) {
                autoSaveToggle.checked = true;
                updateAutoSaveStatus('pending');
            }
        }
    }
}

/**
 * 자동 저장 파일에서 데이터 로드
 * @param FileAPI - 파일 API 인스턴스
 * @param log - 로그 함수
 * @returns 로드된 데이터 또는 null
 */
async function loadFromAutoSaveFile(FileAPI: FileAPIInstance, log: (...args: unknown[]) => void = console.log): Promise<unknown[] | null> {
    const win = window as Window & WindowExtensions;
    // Electron: autoSavePath 필요, Web: 폴더 핸들 필요
    const canLoad = (win.isElectron && FileAPI.autoSavePath) ||
                    (!win.isElectron && win.hasWebAutoSaveFolder?.());
    if (!canLoad) return null;

    try {
        const content = await FileAPI.loadAutoSave();
        if (content) {
            let parsed: { data?: unknown[] } | unknown[] | null;
            if (win.CryptoUtils?.decryptFromFile) {
                parsed = await win.CryptoUtils.decryptFromFile(content);
            } else {
                parsed = JSON.parse(content) as { data?: unknown[] } | unknown[];
            }
            if (!parsed) return null;
            const loadedData = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown[] }).data;
            if (Array.isArray(loadedData) && loadedData.length > 0) {
                log('📂 자동 저장 파일에서 데이터 로드:', loadedData.length, '건');
                return loadedData;
            }
        }
    } catch (error) {
        const logError = win.logger?.error || console.error;
        logError('자동 저장 파일 로드 오류:', error);
    }
    return null;
}

/**
 * 자동 저장 수행 (Electron & Web 환경 지원)
 * @param options - 옵션
 * @returns 성공 여부
 */
async function performAutoSave(options: PerformAutoSaveOptions): Promise<boolean> {
    const { FileAPI, moduleKey, data, webFileHandle, log = console.log } = options;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;
    const win = window as Window & WindowExtensions;

    if (localStorage.getItem(enabledKey) !== 'true') return false;

    const saveObj: JSONFileData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        data: data
    };
    const saveData = win.CryptoUtils?.encryptForFile
        ? await win.CryptoUtils.encryptForFile(saveObj)
        : JSON.stringify(saveObj, null, 2);

    try {
        updateAutoSaveStatus('saving');

        if (win.isElectron) {
            // Electron 환경
            if (!FileAPI.autoSavePath) {
                updateAutoSaveStatus('error');
                return false;
            }
            const success = await FileAPI.autoSave(saveData);
            if (success) {
                log('💾 자동 저장 완료');
                updateAutoSaveStatus('active');
            } else {
                updateAutoSaveStatus('error');
            }
            return success;
        } else {
            // Web 환경
            if (!webFileHandle) {
                updateAutoSaveStatus('error');
                return false;
            }
            try {
                const writable = await webFileHandle.createWritable();
                await writable.write(saveData);
                await writable.close();
                log('💾 자동 저장 완료 (Web)');
                updateAutoSaveStatus('active');
                return true;
            } catch (error) {
                if (webFileHandle) {
                    const logError = win.logger?.error || console.error;
                    logError('Web 자동 저장 오류:', error);
                }
                updateAutoSaveStatus('error');
                return false;
            }
        }
    } catch (error) {
        const logError = win.logger?.error || console.error;
        logError('자동 저장 오류:', error);
        updateAutoSaveStatus('error');
        return false;
    }
}

/**
 * 자동 저장 토글 이벤트 설정
 * @param options - 옵션
 */
function setupAutoSaveToggle(options: AutoSaveToggleOptions): void {
    const {
        moduleKey,
        setWebFileHandle,
        autoSaveCallback,
        showToast,
    } = options;
    const win = window as Window & WindowExtensions;

    const autoSaveToggle = document.getElementById('autoSaveToggle') as HTMLInputElement | null;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (!autoSaveToggle) return;

    autoSaveToggle.addEventListener('change', async () => {
        try {
            // 토글 OFF - 자동저장 비활성화
            if (!autoSaveToggle.checked) {
                if (setWebFileHandle) setWebFileHandle(null);
                localStorage.setItem(enabledKey, 'false');
                updateAutoSaveStatus('inactive');
                return;
            }

            // 토글 ON - 자동저장 활성화
            if (win.isElectron) {
                // Electron: 자동 저장 경로 사용
                localStorage.setItem(enabledKey, 'true');
                updateAutoSaveStatus('active');
                if (autoSaveCallback) await autoSaveCallback();
                if (showToast) showToast('자동 저장이 활성화되었습니다.', 'success');
            } else {
                // Web: 파일 선택 다이얼로그
                if (!('showSaveFilePicker' in window)) {
                    if (showToast) {
                        showToast('이 브라우저는 자동 저장 기능을 지원하지 않습니다.\nChrome, Edge 브라우저를 사용해주세요.', 'warning');
                    }
                    autoSaveToggle.checked = false;
                    return;
                }

                const today = new Date().toISOString().slice(0, 10);
                const handle = await (window as Window & { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
                    suggestedName: `시료접수대장_${today}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                if (setWebFileHandle) setWebFileHandle(handle);
                localStorage.setItem(enabledKey, 'true');
                updateAutoSaveStatus('active');
                if (autoSaveCallback) await autoSaveCallback();
                if (showToast) showToast('자동 저장이 활성화되었습니다.', 'success');
            }
        } catch (error) {
            const err = error as { name?: string };
            if (err.name === 'AbortError') {
                autoSaveToggle.checked = false;
                updateAutoSaveStatus('inactive');
            } else {
                const logError = win.logger?.error || console.error;
                logError('자동 저장 설정 오류:', error);
                if (showToast) showToast('자동 저장 설정에 실패했습니다.', 'error');
                autoSaveToggle.checked = false;
                localStorage.setItem(enabledKey, 'false');
                updateAutoSaveStatus('inactive');
            }
        }
    });
}

/**
 * 자동 저장 폴더 선택 버튼 설정
 * @param options - 옵션
 */
function setupAutoSaveFolderButton(options: AutoSaveFolderButtonOptions): void {
    const {
        moduleKey,
        FileAPI,
        selectedYear,
        setWebFileHandle,
        autoSaveCallback,
        showToast
    } = options;
    const win = window as Window & WindowExtensions;

    const selectAutoSaveFolderBtn = document.getElementById('selectAutoSaveFolderBtn') as HTMLButtonElement | null;
    const autoSaveToggle = document.getElementById('autoSaveToggle') as HTMLInputElement | null;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (!selectAutoSaveFolderBtn) return;

    if (win.isElectron && win.electronAPI) {
        // Electron 환경
        selectAutoSaveFolderBtn.addEventListener('click', async () => {
            try {
                const result = await win.electronAPI!.selectAutoSaveFolder();
                if (result.success) {
                    FileAPI.autoSavePath = await win.electronAPI!.getAutoSavePath(moduleKey, selectedYear);
                    if (showToast) showToast(`저장 폴더가 변경되었습니다:\n${result.folder}`, 'success');

                    if (autoSaveToggle && autoSaveToggle.checked) {
                        if (autoSaveCallback) await autoSaveCallback();
                    }
                } else if (!result.canceled) {
                    if (showToast) showToast('폴더 선택에 실패했습니다.', 'error');
                }
            } catch (error) {
                const logError = win.logger?.error || console.error;
                logError('폴더 선택 오류:', error);
                if (showToast) showToast('폴더 선택 중 오류가 발생했습니다.', 'error');
            }
        });

        // 현재 폴더 경로를 툴팁에 표시
        (async () => {
            try {
                const folder = await win.electronAPI!.getAutoSaveFolder();
                selectAutoSaveFolderBtn.title = `저장 폴더: ${folder}`;
            } catch (error) {
                const logError = win.logger?.error || console.error;
                logError('폴더 경로 조회 오류:', error);
            }
        })();
    } else {
        // Web 환경 - 폴더 선택 (showDirectoryPicker)
        const folderSelectedKey = `${moduleKey}AutoSaveFolderSelected`;

        if (win.hasWebAutoSaveFolder?.()) {
            const handle = win.getWebDirHandle?.();
            selectAutoSaveFolderBtn.title = `저장 폴더: ${handle?.name || '선택됨'}`;
        } else {
            selectAutoSaveFolderBtn.title = '자동저장 폴더 선택';
        }

        selectAutoSaveFolderBtn.addEventListener('click', async () => {
            try {
                if ('showDirectoryPicker' in window && win.selectWebAutoSaveFolder) {
                    const result = await win.selectWebAutoSaveFolder();
                    if (result.success) {
                        localStorage.setItem(folderSelectedKey, 'true');
                        localStorage.setItem(enabledKey, 'true');
                        if (autoSaveToggle) {
                            autoSaveToggle.checked = true;
                        }
                        updateAutoSaveStatus('active');
                        selectAutoSaveFolderBtn.title = `저장 폴더: ${result.folderName}`;
                        if (showToast) showToast(`자동저장 폴더가 설정되었습니다: ${result.folderName}`, 'success');
                        if (autoSaveCallback) await autoSaveCallback();
                    }
                } else {
                    if (showToast) showToast('이 브라우저에서는 폴더 선택을 지원하지 않습니다.', 'error');
                }
            } catch (error) {
                const err = error as { name?: string };
                if (err.name !== 'AbortError') {
                    const logError = win.logger?.error || console.error;
                    logError('폴더 선택 오류:', error);
                    if (showToast) showToast('폴더 선택 중 오류가 발생했습니다.', 'error');
                }
            }
        });
    }
}

/**
 * 디버그 로그 함수 생성기
 * @param debug - 디버그 모드 여부
 * @returns 로그 함수
 */
function createLogger(debug: boolean): (...args: unknown[]) => void {
    const win = window as Window & WindowExtensions;
    return (...args: unknown[]) => debug && (win.logger?.info || console.log)(...args);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param date - 날짜
 * @returns 포맷된 날짜
 */
function formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 오늘 날짜를 입력 요소에 설정
 * @param dateInput - 날짜 입력 요소
 */
function setTodayDate(dateInput: HTMLInputElement | null): void {
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

/**
 * UUID 생성 (간단한 버전)
 * @returns UUID
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 폴백: crypto.getRandomValues 기반
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c: string): string {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * JSON 파일 저장 (공통 함수)
 * @param options - 옵션
 * @returns 저장 성공 여부
 */
async function saveJSON(options: SaveJSONOptions): Promise<boolean> {
    const { sampleType, data, FileAPI, filePrefix, showToast } = options;

    if (!data || data.length === 0) {
        if (showToast) showToast('저장할 데이터가 없습니다.', 'error');
        return false;
    }

    const dataToSave: JSONFileData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        sampleType: sampleType,
        totalRecords: data.length,
        data: data
    };

    const content = JSON.stringify(dataToSave, null, 2);
    const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.json`;
    const success = await FileAPI.saveFile(content, fileName);

    if (success && showToast) {
        showToast('JSON 파일이 저장되었습니다.', 'success');
    }

    return success;
}

/**
 * JSON 데이터 병합 (ID 기반 중복 제거 지원)
 * @param currentData - 현재 데이터
 * @param loadedData - 불러온 데이터
 * @param deduplicateById - ID 기반 중복 제거 여부
 * @returns 병합된 데이터
 */
function mergeJSONData(currentData: unknown[], loadedData: unknown[], deduplicateById: boolean): unknown[] {
    if (deduplicateById) {
        const existingIds = new Set((currentData as ItemWithId[]).map(item => item.id));
        const newData = (loadedData as ItemWithId[]).filter(item => !existingIds.has(item.id));
        return [...newData, ...currentData];
    }
    return [...currentData, ...loadedData];
}

/**
 * JSON 파일 불러오기 핸들러 설정 (파일 input 요소용)
 * @param options - 옵션
 */
function setupJSONLoadHandler(options: JSONLoadHandlerOptions): void {
    const { inputElement, getData, setData, saveData, renderData, showToast, deduplicateById = false } = options;
    const win = window as Window & WindowExtensions;

    if (!inputElement) return;

    inputElement.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as { data?: unknown[] } | unknown[];
            const loadedData = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown[] }).data || [];

            if (Array.isArray(loadedData)) {
                const currentData = getData();
                if (currentData.length > 0 && confirm(`${loadedData.length}건의 데이터를 불러옵니다. 기존 데이터에 추가하시겠습니까?\n\n(취소 선택 시 기존 데이터를 대체합니다)`)) {
                    setData(mergeJSONData(currentData, loadedData, deduplicateById));
                } else {
                    setData(loadedData);
                }
                saveData();
                renderData();
                if (showToast) showToast(`${loadedData.length}건의 데이터를 불러왔습니다.`, 'success');
            } else {
                if (showToast) showToast('파일 형식이 올바르지 않습니다.', 'error');
            }
        } catch (error) {
            const logError = win.logger?.error || console.error;
            logError('JSON 파일 로드 오류:', error);
            if (showToast) showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        }

        inputElement.value = '';
    });
}

/**
 * Electron 파일 메뉴 불러오기 핸들러 설정
 * @param options - 옵션
 */
function setupElectronLoadHandler(options: ElectronLoadHandlerOptions): void {
    const { buttonElement, FileAPI, getData, setData, saveData, renderData, showToast, deduplicateById = false } = options;
    const win = window as Window & WindowExtensions;

    if (!buttonElement) return;

    buttonElement.addEventListener('click', async () => {
        const content = await FileAPI.openFile();
        if (!content) return;

        try {
            const parsed = JSON.parse(content) as { data?: unknown[] } | unknown[];
            const loadedData = Array.isArray(parsed) ? parsed : (parsed as { data?: unknown[] }).data || [];

            if (Array.isArray(loadedData)) {
                const currentData = getData();
                if (currentData.length > 0 && confirm(`${loadedData.length}건의 데이터를 불러옵니다. 기존 데이터에 추가하시겠습니까?\n\n(취소 선택 시 기존 데이터를 대체합니다)`)) {
                    setData(mergeJSONData(currentData, loadedData, deduplicateById));
                } else {
                    setData(loadedData);
                }
                saveData();
                renderData();
                if (showToast) showToast(`${loadedData.length}건의 데이터를 불러왔습니다.`, 'success');
            } else {
                if (showToast) showToast('파일 형식이 올바르지 않습니다.', 'error');
            }
        } catch (error) {
            const logError = win.logger?.error || console.error;
            logError('JSON 파일 로드 오류:', error);
            if (showToast) showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        }
    });
}

/**
 * JSON 저장 버튼 핸들러 설정
 * @param options - 옵션
 */
function setupJSONSaveHandler(options: JSONSaveHandlerOptions): void {
    const { buttonElement, sampleType, getData, FileAPI, filePrefix, showToast } = options;

    if (!buttonElement) return;

    buttonElement.addEventListener('click', async () => {
        await saveJSON({
            sampleType,
            data: getData(),
            FileAPI,
            filePrefix,
            showToast
        });
    });
}

// ========================================
// SampleUtils 인터페이스 정의
// ========================================

interface SampleUtilsInterface {
    // 포맷팅
    formatPhoneNumber: typeof formatPhoneNumber;
    setupPhoneNumberInput: typeof setupPhoneNumberInput;
    formatNumber: typeof formatNumber;
    formatArea: typeof formatArea;
    getUnitLabel: typeof getUnitLabel;
    formatAreaWithUnit: typeof formatAreaWithUnit;
    formatDate: typeof formatDate;

    // 뷰 & 네비게이션
    createViewSwitcher: typeof createViewSwitcher;
    setupNavigation: typeof setupNavigation;

    // 연도 & 데이터
    createYearHandler: typeof createYearHandler;
    safeParseJSON: typeof safeParseJSON;
    safeSetJSON: typeof safeSetJSON;
    getLocalStorageUsage: typeof getLocalStorageUsage;
    migrateOldData: typeof migrateOldData;

    // 자동 저장
    updateAutoSaveStatus: typeof updateAutoSaveStatus;
    initAutoSave: typeof initAutoSave;
    loadFromAutoSaveFile: typeof loadFromAutoSaveFile;
    performAutoSave: typeof performAutoSave;
    setupAutoSaveToggle: typeof setupAutoSaveToggle;
    setupAutoSaveFolderButton: typeof setupAutoSaveFolderButton;

    // JSON 저장/불러오기
    saveJSON: typeof saveJSON;
    mergeJSONData: typeof mergeJSONData;
    setupJSONLoadHandler: typeof setupJSONLoadHandler;
    setupElectronLoadHandler: typeof setupElectronLoadHandler;
    setupJSONSaveHandler: typeof setupJSONSaveHandler;

    // 유틸리티
    createLogger: typeof createLogger;
    setTodayDate: typeof setTodayDate;
    generateUUID: typeof generateUUID;
}

// 전역으로 내보내기
const SampleUtils: SampleUtilsInterface = {
    // 포맷팅
    formatPhoneNumber,
    setupPhoneNumberInput,
    formatNumber,
    formatArea,
    getUnitLabel,
    formatAreaWithUnit,
    formatDate,

    // 뷰 & 네비게이션
    createViewSwitcher,
    setupNavigation,

    // 연도 & 데이터
    createYearHandler,
    safeParseJSON,
    safeSetJSON,
    getLocalStorageUsage,
    migrateOldData,

    // 자동 저장
    updateAutoSaveStatus,
    initAutoSave,
    loadFromAutoSaveFile,
    performAutoSave,
    setupAutoSaveToggle,
    setupAutoSaveFolderButton,

    // JSON 저장/불러오기
    saveJSON,
    mergeJSONData,
    setupJSONLoadHandler,
    setupElectronLoadHandler,
    setupJSONSaveHandler,

    // 유틸리티
    createLogger,
    setTodayDate,
    generateUUID
};

(window as Window & WindowExtensions).SampleUtils = SampleUtils;

export {
    // 타입 내보내기
    ToastType,
    AutoSaveStatus,
    AreaUnit,
    LocalStorageUsage,
    ViewSwitcherOptions,
    YearHandlerOptions,
    YearHandlerResult,
    FileAPIInstance,
    InitAutoSaveOptions,
    PerformAutoSaveOptions,
    AutoSaveToggleOptions,
    AutoSaveFolderButtonOptions,
    SaveJSONOptions,
    JSONFileData,
    JSONLoadHandlerOptions,
    ElectronLoadHandlerOptions,
    JSONSaveHandlerOptions,
    SafeSetJSONOptions,
    SampleUtilsInterface,

    // 함수 내보내기
    formatPhoneNumber,
    setupPhoneNumberInput,
    formatNumber,
    formatArea,
    getUnitLabel,
    formatAreaWithUnit,
    formatDate,
    createViewSwitcher,
    setupNavigation,
    createYearHandler,
    safeParseJSON,
    safeSetJSON,
    getLocalStorageUsage,
    migrateOldData,
    updateAutoSaveStatus,
    initAutoSave,
    loadFromAutoSaveFile,
    performAutoSave,
    setupAutoSaveToggle,
    setupAutoSaveFolderButton,
    saveJSON,
    mergeJSONData,
    setupJSONLoadHandler,
    setupElectronLoadHandler,
    setupJSONSaveHandler,
    createLogger,
    setTodayDate,
    generateUUID,
    SampleUtils
};
