/**
 * @fileoverview Firebase 설정 및 초기화 (compat 버전)
 * @description Firebase Firestore 연결 설정
 *
 * 인증 파일(firebase-auth.json)이 있어야 Firebase에 접근 가능
 * 인증 파일이 없으면 로컬 모드로만 동작
 */

// ========================================
// Firebase 초기화 상태
// ========================================

/**
 * 디버그 모드 - 개발 환경에서만 활성화
 * Electron: process.env.NODE_ENV 또는 --dev 플래그 확인
 * Web: localStorage의 debug 플래그 확인
 */
const DEBUG_FIREBASE = (() => {
    // Electron 환경
    if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV === 'development' || process.argv?.includes('--dev');
    }
    // 웹 환경
    try {
        return localStorage.getItem('DEBUG_MODE') === 'true';
    } catch {
        return false;
    }
})();

/** 조건부 로깅 */
const logFirebase = (...args) => DEBUG_FIREBASE && console.log('[Firebase]', ...args);

let db = null;
let auth = null;
let isFirebaseEnabled = false;
let isOfflineEnabled = false;
let isAuthenticated = false;
let firebaseConfigData = null;

// localStorage 키 (사용자가 직접 설정한 경우)
const FIREBASE_CONFIG_KEY = 'firebase_config';

/**
 * 간단한 Base64 인코딩/디코딩 (민감 정보 난독화용)
 * 참고: 이것은 암호화가 아니며, 단순 난독화 목적
 */
const obfuscate = {
    encode: (str) => {
        try {
            return btoa(encodeURIComponent(str));
        } catch {
            return str;
        }
    },
    decode: (str) => {
        try {
            return decodeURIComponent(atob(str));
        } catch {
            return str;
        }
    }
};

/**
 * 인증 파일에서 Firebase 설정 로드 (Electron 전용)
 * @returns {Promise<Object|null>}
 */
async function loadFirebaseConfigFromAuthFile() {
    // Electron 환경이 아니면 null 반환
    if (!window.electronAPI?.isElectron) {
        logFirebase('웹 환경 - 인증 파일 사용 불가');
        return null;
    }

    try {
        if (!window.electronAPI?.readAuthFile) {
            logFirebase('readAuthFile API 없음');
            return null;
        }

        const result = await window.electronAPI.readAuthFile();

        if (!result.exists) {
            logFirebase('인증 파일 없음 - 로컬 모드로 동작');
            return null;
        }

        // JSON 파싱
        const config = JSON.parse(result.content);

        // 필수 필드 확인
        if (config.apiKey && config.projectId) {
            logFirebase('인증 파일에서 Firebase 설정 로드됨');
            return config;
        } else {
            logFirebase('인증 파일에 필수 설정 없음');
            return null;
        }

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase] 인증 파일 로드 실패:', error);
        return null;
    }
}

/**
 * localStorage에서 Firebase 설정 로드 (백업용)
 * 난독화된 데이터와 레거시 평문 데이터 모두 지원
 * @returns {Object|null}
 */
function loadFirebaseConfigFromStorage() {
    try {
        const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (saved) {
            let config;
            // 난독화된 데이터인지 확인 (Base64 인코딩된 JSON은 'eyJ'로 시작)
            if (saved.startsWith('eyJ')) {
                try {
                    config = JSON.parse(obfuscate.decode(saved));
                } catch {
                    // 디코딩 실패 시 레거시 평문으로 시도
                    config = JSON.parse(saved);
                }
            } else {
                // 레거시 평문 데이터
                config = JSON.parse(saved);
            }
            if (config.apiKey && config.projectId) {
                return config;
            }
        }
    } catch (e) {
        (window.logger?.error || console.error)('Firebase 설정 로드 실패:', e);
    }
    return null;
}

/**
 * Firebase 설정 로드 (인증 파일 우선)
 * @returns {Promise<Object|null>}
 */
async function loadFirebaseConfig() {
    // 1. 인증 파일에서 로드 (Electron)
    const authFileConfig = await loadFirebaseConfigFromAuthFile();
    if (authFileConfig) {
        return authFileConfig;
    }

    // 2. localStorage에서 로드 (웹 또는 백업)
    const storageConfig = loadFirebaseConfigFromStorage();
    if (storageConfig) {
        logFirebase('localStorage에서 설정 로드됨');
        return storageConfig;
    }

    // 3. 설정 없음
    logFirebase('Firebase 설정 없음 - 로컬 모드로 동작');
    return null;
}

/**
 * Firebase 설정이 유효한지 확인
 * @param {Object} config
 * @returns {boolean}
 */
function isFirebaseConfigValid(config) {
    if (!config) return false;

    return config.apiKey &&
           config.apiKey.trim() !== '' &&
           config.projectId &&
           config.projectId.trim() !== '';
}

/**
 * Firebase 초기화 (compat 버전)
 * @returns {Promise<boolean>} 초기화 성공 여부
 */
async function initializeFirebase() {
    logFirebase('초기화 시작...');

    // 이미 초기화되어 있으면 true 반환
    if (isFirebaseEnabled && db) {
        logFirebase('이미 초기화됨');
        return true;
    }

    // 네트워크 접근 체크 (웹 환경용)
    if (window.NetworkAccess) {
        const accessResult = await window.NetworkAccess.checkAccess();
        logFirebase('네트워크 접근 체크:', accessResult);

        if (!accessResult.allowed) {
            logFirebase('네트워크 접근 거부:', accessResult.reason);
            (window.logger?.warn || console.warn)('[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다.');
            return false;
        }
    }

    // firebase compat SDK가 로드되었는지 확인
    if (typeof firebase === 'undefined') {
        (window.logger?.error || console.error)('[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요.');
        return false;
    }

    // Firebase 설정 로드 (인증 파일에서)
    firebaseConfigData = await loadFirebaseConfig();
    logFirebase('로드된 설정:', firebaseConfigData ? '있음' : '없음');

    if (!firebaseConfigData) {
        logFirebase('설정이 없습니다. 로컬 모드로 동작합니다.');
        return false;
    }

    logFirebase('설정값 확인:', {
        apiKey: firebaseConfigData.apiKey ? firebaseConfigData.apiKey.substring(0, 10) + '...' : '없음',
        projectId: firebaseConfigData.projectId || '없음',
        authDomain: firebaseConfigData.authDomain || '없음'
    });

    if (!isFirebaseConfigValid(firebaseConfigData)) {
        logFirebase('설정이 유효하지 않습니다.');
        return false;
    }

    try {
        logFirebase('앱 초기화 중...');

        // 이미 초기화된 앱이 있는지 확인
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfigData);
        }

        db = firebase.firestore();
        logFirebase('Firestore 연결됨');

        // 익명 인증 수행
        try {
            auth = firebase.auth();
            const userCredential = await auth.signInAnonymously();
            isAuthenticated = true;
            logFirebase('익명 인증 성공:', userCredential.user.uid);
        } catch (authError) {
            (window.logger?.error || console.error)('[Firebase] 익명 인증 실패:', authError);
            isAuthenticated = false;

            // 인증 실패 시 보안 규칙에 따라 Firestore 접근이 제한될 수 있음
            // 보안 규칙이 request.auth != null을 요구하면 초기화 실패로 처리
            const errorCode = authError.code || '';
            if (errorCode === 'auth/operation-not-allowed') {
                (window.logger?.error || console.error)('[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요.');
                // 익명 인증이 비활성화된 경우 초기화 실패
                return false;
            } else if (errorCode === 'auth/network-request-failed') {
                (window.logger?.warn || console.warn)('[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다.');
                // 네트워크 오류는 오프라인 모드로 계속 진행
            } else {
                (window.logger?.warn || console.warn)('[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)');
            }
        }

        // 오프라인 지원 활성화
        try {
            await db.enablePersistence();
            isOfflineEnabled = true;
            logFirebase('오프라인 지원 활성화됨');
        } catch (err) {
            (window.logger?.warn || console.warn)('[Firebase] 오프라인 지원 에러:', err.code, err.message);
            if (err.code === 'failed-precondition') {
                (window.logger?.warn || console.warn)('[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다.');
            } else if (err.code === 'unimplemented') {
                (window.logger?.warn || console.warn)('[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.');
            }
        }

        isFirebaseEnabled = true;
        logFirebase('초기화 완료:', firebaseConfigData.projectId);
        return true;
    } catch (error) {
        (window.logger?.error || console.error)('[Firebase] 초기화 실패:', error);
        (window.logger?.error || console.error)('[Firebase] 에러 상세:', error.message, error.stack);
        return false;
    }
}

/**
 * Firestore DB 인스턴스 반환
 * @returns {Object|null}
 */
function getDb() {
    return db;
}

/**
 * Firebase 활성화 여부 확인
 * @returns {boolean}
 */
function isEnabled() {
    return isFirebaseEnabled;
}

/**
 * 오프라인 지원 활성화 여부 확인
 * @returns {boolean}
 */
function isOfflineSupported() {
    return isOfflineEnabled;
}

/**
 * 인증 여부 확인
 * @returns {boolean}
 */
function isUserAuthenticated() {
    return isAuthenticated;
}

/**
 * 현재 사용자 UID 반환
 * @returns {string|null}
 */
function getCurrentUserId() {
    return auth?.currentUser?.uid || null;
}

/**
 * Firebase 설정 저장 (설정 페이지에서 사용)
 * 난독화하여 저장 (평문 노출 방지)
 * @param {Object} config
 */
function saveFirebaseConfig(config) {
    try {
        const encoded = obfuscate.encode(JSON.stringify(config));
        localStorage.setItem(FIREBASE_CONFIG_KEY, encoded);
        logFirebase('설정 저장됨 (난독화)');
    } catch (e) {
        (window.logger?.error || console.error)('Firebase 설정 저장 실패:', e);
    }
}

/**
 * Firebase 설정 초기화
 */
function resetFirebaseConfig() {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    isFirebaseEnabled = false;
    isAuthenticated = false;
    db = null;
    auth = null;
    firebaseConfigData = null;
    logFirebase('설정 초기화됨');
}

/**
 * Firebase 재초기화 (인증 파일 변경 후 사용)
 * @returns {Promise<boolean>} 초기화 성공 여부
 */
async function reinitializeFirebase() {
    logFirebase('재초기화 시작...');

    // 기존 상태 초기화
    isFirebaseEnabled = false;
    isAuthenticated = false;
    isOfflineEnabled = false;
    db = null;
    auth = null;
    firebaseConfigData = null;

    // Firebase 앱이 이미 있으면 삭제
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        try {
            await firebase.app().delete();
            logFirebase('기존 Firebase 앱 삭제됨');
        } catch (e) {
            (window.logger?.warn || console.warn)('[Firebase] 앱 삭제 실패:', e);
        }
    }

    // 새로운 설정으로 초기화
    return await initializeFirebase();
}

// 전역으로 내보내기
window.firebaseConfig = {
    initialize: initializeFirebase,
    reinitialize: reinitializeFirebase,
    getDb: getDb,
    isEnabled: isEnabled,
    isOfflineSupported: isOfflineSupported,
    isAuthenticated: isUserAuthenticated,
    getCurrentUserId: getCurrentUserId,
    isConfigValid: isFirebaseConfigValid,
    saveConfig: saveFirebaseConfig,
    resetConfig: resetFirebaseConfig
};
