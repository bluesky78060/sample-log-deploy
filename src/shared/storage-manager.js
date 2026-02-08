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

// 스토리지 모드
const STORAGE_MODE = {
    LOCAL_ONLY: 'local',      // localStorage만 사용
    CLOUD_SYNC: 'cloud',      // Firestore + localStorage 동기화
    CLOUD_ONLY: 'cloudOnly'   // Firestore만 사용 (권장하지 않음)
};

// 현재 모드
let currentMode = STORAGE_MODE.LOCAL_ONLY;

/** @type {boolean} 디버그 모드 (프로덕션에서는 false) */
const DEBUG_STORAGE = false;

/** 조건부 로깅 */
const logStorage = (...args) => DEBUG_STORAGE && console.log('[Storage]', ...args);

// 동기화 상태
let syncStatus = {
    lastSyncTime: null,
    pendingChanges: 0,
    isOnline: navigator.onLine
};

// 온라인/오프라인 이벤트 리스너
window.addEventListener('online', () => {
    syncStatus.isOnline = true;
    logStorage('네트워크 연결됨 - 동기화 시작');
    triggerSync();
});

window.addEventListener('offline', () => {
    syncStatus.isOnline = false;
    logStorage('오프라인 모드 - 로컬 저장소 사용');
});

/**
 * 스토리지 매니저 초기화
 * @returns {Promise<string>} 현재 스토리지 모드
 */
async function initStorageManager() {
    // Firebase 초기화 시도 (인증 파일에서 설정을 로드함)
    if (window.firebaseConfig?.initialize) {
        try {
            const initialized = await window.firebaseConfig.initialize();
            if (initialized) {
                await window.firestoreDb?.init();
                currentMode = STORAGE_MODE.CLOUD_SYNC;
                logStorage('클라우드 동기화 모드');
            }
        } catch (err) {
            (window.logger?.warn || console.warn)('[Storage] Firebase 초기화 실패:', err);
        }
    }

    if (currentMode === STORAGE_MODE.LOCAL_ONLY) {
        logStorage('로컬 전용 모드');
    }

    return currentMode;
}

/**
 * 데이터 저장
 * @param {string} sampleType - 시료 타입 (soil, water, compost, heavyMetal, pesticide)
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @param {Array} data - 저장할 데이터 배열
 * @returns {Promise<boolean>} 성공 여부
 */
async function saveData(sampleType, year, localStorageKey, data) {
    try {
        // 1. localStorage에 항상 저장 (백업 및 오프라인 지원)
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        logStorage(`localStorage 저장: ${localStorageKey}`);

        // 2. 클라우드 동기화 모드면 Firestore에도 저장
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            const documentsWithId = data.map(item => ({
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
 * @param {Object} item - 저장할 항목
 * @returns {Promise<boolean>} 성공 여부
 */
async function saveItem(sampleType, year, localStorageKey, item) {
    try {
        // localStorage에서 기존 데이터 로드
        const existingData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');

        // ID 확인/생성
        const itemWithId = {
            ...item,
            id: item.id || generateId()
        };

        // 기존 항목 업데이트 또는 새 항목 추가
        const index = existingData.findIndex(d => d.id === itemWithId.id);
        if (index >= 0) {
            existingData[index] = itemWithId;
        } else {
            existingData.push(itemWithId);
        }

        // localStorage 저장
        localStorage.setItem(localStorageKey, JSON.stringify(existingData));

        // Firestore 저장
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            await window.firestoreDb.save(sampleType, year, itemWithId.id, itemWithId);
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
 * @returns {Promise<Array>} 데이터 배열
 */
async function loadData(sampleType, year, localStorageKey) {
    try {
        // 클라우드 동기화 모드이고 온라인이면 Firestore에서 로드
        if (currentMode === STORAGE_MODE.CLOUD_SYNC && window.firestoreDb?.isEnabled()) {
            const cloudData = await window.firestoreDb.getAll(sampleType, year);

            if (cloudData.length > 0) {
                // 클라우드 데이터로 localStorage 업데이트
                localStorage.setItem(localStorageKey, JSON.stringify(cloudData));
                syncStatus.lastSyncTime = new Date();
                return cloudData;
            }
        }

        // localStorage에서 로드 (오프라인 또는 클라우드 데이터 없음)
        const localData = localStorage.getItem(localStorageKey);
        return localData ? JSON.parse(localData) : [];
    } catch (error) {
        (window.logger?.error || console.error)('데이터 로드 실패:', error);
        // 에러 시 localStorage 폴백
        const localData = localStorage.getItem(localStorageKey);
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
async function deleteItem(sampleType, year, localStorageKey, itemId) {
    try {
        // localStorage에서 삭제
        const existingData = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
        const filteredData = existingData.filter(item => item.id !== itemId);
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
function subscribeToUpdates(sampleType, year, localStorageKey, onUpdate) {
    if (currentMode !== STORAGE_MODE.CLOUD_SYNC || !window.firestoreDb?.isEnabled()) {
        return null;
    }

    return window.firestoreDb.subscribe(sampleType, year, (documents, fromCache) => {
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
 * @returns {Promise<{success: boolean, count: number}>} 결과
 */
async function migrateToCloud(sampleType, year, localStorageKey) {
    if (currentMode !== STORAGE_MODE.CLOUD_SYNC) {
        return { success: false, count: 0, message: '클라우드 동기화 모드가 아닙니다.' };
    }

    return await window.firestoreDb.migrate(sampleType, year, localStorageKey);
}

/**
 * 수동 동기화 트리거
 */
async function triggerSync() {
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
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

/**
 * 현재 스토리지 모드 반환
 * @returns {string} 현재 모드
 */
function getStorageMode() {
    return currentMode;
}

/**
 * 동기화 상태 반환
 * @returns {Object} 동기화 상태
 */
function getSyncStatus() {
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
function isCloudSyncEnabled() {
    return currentMode === STORAGE_MODE.CLOUD_SYNC;
}

// 전역으로 내보내기
window.storageManager = {
    init: initStorageManager,
    save: saveData,
    saveItem: saveItem,
    load: loadData,
    delete: deleteItem,
    subscribe: subscribeToUpdates,
    migrate: migrateToCloud,
    sync: triggerSync,
    getMode: getStorageMode,
    getStatus: getSyncStatus,
    isCloudEnabled: isCloudSyncEnabled,
    generateId: generateId,
    MODES: STORAGE_MODE
};
