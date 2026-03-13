/**
 * @fileoverview 통합 스토리지 매니저
 * @description localStorage와 Firestore를 통합 관리하는 모듈
 *
 * 동작 방식:
 * 1. Firebase 설정이 있으면 → Firestore + localStorage 동시 저장 (동기화)
 * 2. Firebase 설정이 없으면 → localStorage만 사용 (기존 방식)
 *
 * 오프라인 지원:
 * - Firestore IndexedDB 캐시로 오프라인에서도 읽기/쓰기 가능
 * - 온라인 복귀 시 자동 동기화
 */

// ========================================
// Type Definitions
// ========================================

/** 스토리지 모드 타입 */
type StorageModeType = 'local' | 'cloud' | 'cloudOnly';

/** 스토리지 모드 상수 인터페이스 */
interface StorageModeConstants {
    readonly LOCAL_ONLY: 'local';
    readonly CLOUD_SYNC: 'cloud';
    readonly CLOUD_ONLY: 'cloudOnly';
}

/** 스토리지 모드 옵션 */
interface StorageModeOption {
    value: StorageModeType;
    label: string;
    description: string;
    available: boolean;
}

/** 스토리지 모드 설정 결과 */
interface SetModeResult {
    success: boolean;
    message: string;
}

/** 동기화 상태 내부 */
interface InternalSyncStatus {
    lastSyncTime: Date | null;
    pendingChanges: number;
    isOnline: boolean;
}

/** 동기화 상태 (외부 반환용) */
interface SyncStatusResult {
    lastSyncTime: Date | null;
    pendingChanges: number;
    isOnline: boolean;
    mode: StorageModeType;
    isCloudEnabled: boolean;
    isOfflineSupported: boolean;
}

/** 마이그레이션 결과 */
interface MigrationResult {
    success: boolean;
    count: number;
    message?: string;
}

/** 데이터 항목 인터페이스 (최소 id 필드 필요) */
interface DataItem {
    id?: string;
    [key: string]: unknown;
}

/** StorageManager API 인터페이스 */
interface StorageManagerAPI {
    init: () => Promise<StorageModeType>;
    save: (sampleType: string, year: number, localStorageKey: string, data: DataItem[]) => Promise<boolean>;
    saveItem: (sampleType: string, year: number, localStorageKey: string, item: DataItem) => Promise<boolean>;
    load: (sampleType: string, year: number, localStorageKey: string) => Promise<DataItem[]>;
    delete: (sampleType: string, year: number, localStorageKey: string, itemId: string) => Promise<boolean>;
    subscribe: (
        sampleType: string,
        year: number,
        localStorageKey: string,
        onUpdate: (documents: DataItem[], fromCache: boolean) => void
    ) => (() => void) | null;
    migrate: (sampleType: string, year: number, localStorageKey: string) => Promise<MigrationResult>;
    sync: () => Promise<void>;
    getMode: () => StorageModeType;
    setMode: (mode: StorageModeType) => SetModeResult;
    getAvailableModes: () => StorageModeOption[];
    getStatus: () => SyncStatusResult;
    isCloudEnabled: () => boolean;
    generateId: () => string;
    MODES: StorageModeConstants;
}

// ========================================
// Constants
// ========================================

// 스토리지 모드
const STORAGE_MODE: StorageModeConstants = {
    LOCAL_ONLY: 'local',      // localStorage만 사용
    CLOUD_SYNC: 'cloud',      // Firestore + localStorage 동기화
    CLOUD_ONLY: 'cloudOnly'   // Firestore만 사용 (권장하지 않음)
} as const;

// 현재 모드
let currentMode: StorageModeType = STORAGE_MODE.LOCAL_ONLY;

/** @type {boolean} 디버그 모드 (프로덕션에서는 false) */
const DEBUG_STORAGE: boolean = false;

/** 조건부 로깅 */
const logStorage = (...args: unknown[]): void => {
    if (DEBUG_STORAGE) {
        (window.logger?.debug || console.log)('[Storage]', ...args);
    }
};

// 동기화 상태
const syncStatus: InternalSyncStatus = {
    lastSyncTime: null,
    pendingChanges: 0,
    isOnline: navigator.onLine
};

// 온라인/오프라인 이벤트 리스너
window.addEventListener('online', (): void => {
    syncStatus.isOnline = true;
    logStorage('네트워크 연결됨 - 동기화 시작');
    triggerSync();
});

window.addEventListener('offline', (): void => {
    syncStatus.isOnline = false;
    logStorage('오프라인 모드 - 로컬 저장소 사용');
});

// ========================================
// Functions
// ========================================

/**
 * 스토리지 매니저 초기화
 * 저장된 모드가 있으면 우선 복원, 없으면 자동 감지
 * @returns {Promise<StorageModeType>} 현재 스토리지 모드
 */
async function initStorageManager(): Promise<StorageModeType> {
    // 1. 저장된 모드 복원 시도
    const savedMode = localStorage.getItem('storageMode') as StorageModeType | null;
    const validModes: StorageModeType[] = Object.values(STORAGE_MODE);

    // 2. Firebase 초기화 시도 (인증 파일에서 설정을 로드함)
    let firebaseReady = false;
    if (window.firebaseConfig?.initialize) {
        try {
            const initialized = await window.firebaseConfig.initialize();
            if (initialized) {
                await window.firestoreDb?.init();
                firebaseReady = true;
            }
        } catch (err) {
            (window.logger?.warn || console.warn)('[Storage] Firebase 초기화 실패:', err);
        }
    }

    // 3. 모드 결정
    if (savedMode && validModes.includes(savedMode)) {
        // 저장된 모드가 cloud 계열인데 Firebase가 안 되면 local로 폴백
        if ((savedMode === STORAGE_MODE.CLOUD_SYNC || savedMode === STORAGE_MODE.CLOUD_ONLY) && !firebaseReady) {
            currentMode = STORAGE_MODE.LOCAL_ONLY;
            logStorage('저장된 모드가 클라우드이지만 Firebase 미연결 → 로컬 폴백');
        } else {
            currentMode = savedMode;
            logStorage(`저장된 모드 복원: ${savedMode}`);
        }
    } else {
        // 저장된 모드 없음 → 자동 감지 (기존 로직)
        currentMode = firebaseReady ? STORAGE_MODE.CLOUD_SYNC : STORAGE_MODE.LOCAL_ONLY;
        logStorage(firebaseReady ? '클라우드 동기화 모드 (자동 감지)' : '로컬 전용 모드 (자동 감지)');
    }

    return currentMode;
}

/**
 * 스토리지 모드 변경 + localStorage에 영구 저장
 * @param {StorageModeType} mode - STORAGE_MODE 값 ('local', 'cloud', 'cloudOnly')
 * @returns {SetModeResult}
 */
function setStorageMode(mode: StorageModeType): SetModeResult {
    const validModes: StorageModeType[] = Object.values(STORAGE_MODE);
    if (!validModes.includes(mode)) {
        return { success: false, message: `유효하지 않은 모드: ${mode}` };
    }

    // cloud 계열 선택 시 Firebase 확인
    if ((mode === STORAGE_MODE.CLOUD_SYNC || mode === STORAGE_MODE.CLOUD_ONLY) && !window.firestoreDb?.isEnabled()) {
        return { success: false, message: 'Firebase가 연결되지 않아 클라우드 모드를 사용할 수 없습니다.' };
    }

    currentMode = mode;
    localStorage.setItem('storageMode', mode);
    logStorage(`모드 변경: ${mode}`);

    // 모드 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('storage-mode-changed', { detail: { mode } }));

    return { success: true, message: `저장 모드가 변경되었습니다: ${mode}` };
}

/**
 * 사용 가능한 모드 목록 반환 (UI에서 사용)
 * @returns {StorageModeOption[]}
 */
function getAvailableModes(): StorageModeOption[] {
    const firebaseConnected: boolean = window.firestoreDb?.isEnabled() || false;

    return [
        {
            value: STORAGE_MODE.LOCAL_ONLY,
            label: '로컬 저장소만',
            description: '이 컴퓨터에만 저장됩니다. 오프라인에서 완전히 동작하며, 다른 기기와 데이터를 공유할 수 없습니다.',
            available: true
        },
        {
            value: STORAGE_MODE.CLOUD_SYNC,
            label: '클라우드 동기화',
            description: '로컬 + Firebase에 동시 저장합니다. 오프라인에서도 작동하며, 온라인 시 자동으로 동기화됩니다.',
            available: firebaseConnected
        },
        {
            value: STORAGE_MODE.CLOUD_ONLY,
            label: '클라우드 전용',
            description: 'Firebase에만 저장합니다. 인터넷 연결이 필수이며, 오프라인 시 데이터 접근이 제한됩니다.',
            available: firebaseConnected
        }
    ];
}

/**
 * 데이터 저장
 * @param {string} sampleType - 시료 타입 (soil, water, compost, heavyMetal, pesticide)
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @param {DataItem[]} data - 저장할 데이터 배열
 * @returns {Promise<boolean>} 성공 여부
 */
async function saveData(sampleType: string, year: number, localStorageKey: string, data: DataItem[]): Promise<boolean> {
    try {
        // 1. localStorage에 항상 저장 (백업 및 오프라인 지원)
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        logStorage(`localStorage 저장: ${localStorageKey}`);

        // 2. 클라우드 동기화 모드면 Firestore에도 저장
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            const documentsWithId: DataItem[] = data.map((item: DataItem) => ({
                ...item,
                id: item.id || generateId()
            }));

            await window.firestoreDb.batchSave(sampleType, year, documentsWithId);
            syncStatus.lastSyncTime = new Date();
        }

        return true;
    } catch (error) {
        (window.logger?.error || console.error)('데이터 저장 실패:', error);
        return false;
    }
}

/**
 * 단일 항목 저장
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @param {DataItem} item - 저장할 항목
 * @returns {Promise<boolean>} 성공 여부
 */
async function saveItem(sampleType: string, year: number, localStorageKey: string, item: DataItem): Promise<boolean> {
    try {
        // localStorage에서 기존 데이터 로드
        const existingData: DataItem[] = JSON.parse(localStorage.getItem(localStorageKey) || '[]');

        // ID 확인/생성
        const itemWithId: DataItem = {
            ...item,
            id: item.id || generateId()
        };

        // 기존 항목 업데이트 또는 새 항목 추가
        const index: number = existingData.findIndex((d: DataItem) => d.id === itemWithId.id);
        if (index >= 0) {
            existingData[index] = itemWithId;
        } else {
            existingData.push(itemWithId);
        }

        // localStorage 저장
        localStorage.setItem(localStorageKey, JSON.stringify(existingData));

        // Firestore 저장
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            await window.firestoreDb.save(sampleType, year, itemWithId.id!, itemWithId);
            syncStatus.lastSyncTime = new Date();
        }

        return true;
    } catch (error) {
        (window.logger?.error || console.error)('항목 저장 실패:', error);
        return false;
    }
}

/**
 * 데이터 로드
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @returns {Promise<DataItem[]>} 데이터 배열
 */
async function loadData(sampleType: string, year: number, localStorageKey: string): Promise<DataItem[]> {
    try {
        // 클라우드 동기화 모드이고 온라인이면 Firestore에서 로드
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            const cloudData: DataItem[] = await window.firestoreDb.getAll(sampleType, year);

            if (cloudData.length > 0) {
                // 클라우드 데이터로 localStorage 업데이트
                localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
                syncStatus.lastSyncTime = new Date();
                return cloudData;
            }
        }

        // localStorage에서 로드 (오프라인 또는 클라우드 데이터 없음)
        const localData: string | null = localStorage.getItem(localStorageKey);
        return localData ? JSON.parse(localData) : [];
    } catch (error) {
        (window.logger?.error || console.error)('데이터 로드 실패:', error);
        // 에러 시 localStorage 폴백
        const localData: string | null = localStorage.getItem(localStorageKey);
        return localData ? JSON.parse(localData) : [];
    }
}

/**
 * 항목 삭제
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @param {string} itemId - 삭제할 항목 ID
 * @returns {Promise<boolean>} 성공 여부
 */
async function deleteItem(sampleType: string, year: number, localStorageKey: string, itemId: string): Promise<boolean> {
    try {
        // localStorage에서 삭제
        const existingData: DataItem[] = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const filteredData: DataItem[] = existingData.filter((item: DataItem) => item.id !== itemId);
        localStorage.setItem(localStorageKey, JSON.stringify(filteredData));

        // Firestore에서 삭제
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            await window.firestoreDb.delete(sampleType, year, itemId);
            syncStatus.lastSyncTime = new Date();
        }

        return true;
    } catch (error) {
        (window.logger?.error || console.error)('항목 삭제 실패:', error);
        return false;
    }
}

/**
 * 실시간 동기화 구독
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @param {Function} onUpdate - 업데이트 콜백
 * @returns {Function|null} 구독 해제 함수
 */
function subscribeToUpdates(
    sampleType: string,
    year: number,
    localStorageKey: string,
    onUpdate: (documents: DataItem[], fromCache: boolean) => void
): (() => void) | null {
    if (currentMode !== STORAGE_MODE.CLOUD_SYNC || !window.firestoreDb?.isEnabled()) {
        return null;
    }

    return window.firestoreDb.subscribe(sampleType, year, (documents: DataItem[], fromCache: boolean): void => {
        // localStorage 업데이트
        localStorage.setItem(localStorageKey, JSON.stringify(documents));

        // 콜백 호출
        onUpdate(documents, fromCache);

        if (!fromCache) {
            syncStatus.lastSyncTime = new Date();
        }
    });
}

/**
 * localStorage에서 Firestore로 마이그레이션
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @returns {Promise<MigrationResult>} 결과
 */
async function migrateToCloud(sampleType: string, year: number, localStorageKey: string): Promise<MigrationResult> {
    if (currentMode !== STORAGE_MODE.CLOUD_SYNC) {
        return { success: false, count: 0, message: '클라우드 동기화 모드가 아닙니다.' };
    }

    return await window.firestoreDb!.migrate(sampleType, year, localStorageKey);
}

/**
 * 수동 동기화 트리거
 */
async function triggerSync(): Promise<void> {
    if (currentMode !== STORAGE_MODE.CLOUD_SYNC || !syncStatus.isOnline) {
        return;
    }

    // 이벤트 발생으로 각 페이지에서 동기화 처리
    window.dispatchEvent(new CustomEvent('storage-sync-requested'));
}

/**
 * 고유 ID 생성
 * @returns {string} 고유 ID
 */
function generateId(): string {
    if (typeof window !== 'undefined' && window.SampleUtils?.generateUUID) {
        return window.SampleUtils.generateUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b: number) => b.toString(36)).join('').substring(0, 9);
}

/**
 * 현재 스토리지 모드 반환
 * @returns {StorageModeType} 현재 모드
 */
function getStorageMode(): StorageModeType {
    return currentMode;
}

/**
 * 동기화 상태 반환
 * @returns {SyncStatusResult} 동기화 상태
 */
function getSyncStatus(): SyncStatusResult {
    return {
        ...syncStatus,
        mode: currentMode,
        isCloudEnabled: window.firestoreDb?.isEnabled() || false,
        isOfflineSupported: window.firestoreDb?.isOfflineEnabled() || false
    };
}

/**
 * 클라우드 동기화 활성화 여부
 * @returns {boolean}
 */
function isCloudSyncEnabled(): boolean {
    return currentMode === STORAGE_MODE.CLOUD_SYNC;
}

// ========================================
// Export
// ========================================

// 전역으로 내보내기
(window as Window).storageManager = {
    init: initStorageManager,
    save: saveData,
    saveItem: saveItem,
    load: loadData,
    delete: deleteItem,
    subscribe: subscribeToUpdates,
    migrate: migrateToCloud,
    sync: triggerSync,
    getMode: getStorageMode,
    setMode: setStorageMode,
    getAvailableModes: getAvailableModes,
    getStatus: getSyncStatus,
    isCloudEnabled: isCloudSyncEnabled,
    generateId: generateId,
    MODES: STORAGE_MODE
} as StorageManager;

export {
    STORAGE_MODE,
    initStorageManager,
    setStorageMode,
    getAvailableModes,
    saveData,
    saveItem,
    loadData,
    deleteItem,
    subscribeToUpdates,
    migrateToCloud,
    triggerSync,
    generateId,
    getStorageMode,
    getSyncStatus,
    isCloudSyncEnabled
};

export type {
    StorageModeType,
    StorageModeConstants,
    StorageModeOption,
    SetModeResult,
    InternalSyncStatus,
    SyncStatusResult,
    MigrationResult,
    DataItem,
    StorageManagerAPI
};
