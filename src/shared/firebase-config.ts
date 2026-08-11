/**
 * @fileoverview Firebase 설정 및 초기화 (compat 버전)
 * @description Firebase Firestore 연결 설정
 *
 * 인증 파일(firebase-auth.json)이 있어야 Firebase에 접근 가능
 * 인증 파일이 없으면 로컬 모드로만 동작
 */
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Firebase compat type definitions - using any to avoid type errors
type FirebaseAuth = any;
type FirebaseFirestore = any;

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
const logFirebase = (...args: unknown[]): void => {
    if (DEBUG_FIREBASE) {
        (window.logger?.info || (window.logger?.debug || console.log))('[Firebase]', ...args);
    }
};

let db: FirebaseFirestore | null = null;
let auth: FirebaseAuth | null = null;
let isFirebaseEnabled = false;
let isOfflineEnabled = false;
let isAuthenticated = false;
let firebaseConfigData: FirebaseConfig | null = null;

// localStorage 키 (사용자가 직접 설정한 경우)
const FIREBASE_CONFIG_KEY = 'firebase_config';

interface FirebaseConfig {
    apiKey: string;
    projectId: string;
    authDomain?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
}

interface AuthFileResult {
    exists: boolean;
    content?: string;
}

/**
 * 간단한 Base64 인코딩/디코딩 (민감 정보 난독화용)
 * 참고: 이것은 암호화가 아니며, 단순 난독화 목적
 */
const obfuscate = {
    encode: (str: string): string => {
        try {
            return btoa(encodeURIComponent(str));
        } catch {
            return str;
        }
    },
    decode: (str: string): string => {
        try {
            return decodeURIComponent(atob(str));
        } catch {
            return str;
        }
    }
};

/**
 * 인증 파일에서 Firebase 설정 로드 (Electron 전용)
 */
async function loadFirebaseConfigFromAuthFile(): Promise<FirebaseConfig | null> {
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

        // 상세 디버그 로그
        logFirebase('readAuthFile 결과:', {
            success: result.success,
            exists: result.exists,
            hasContent: !!result.content,
            contentLength: result.content?.length || 0
        });

        if (!result.success || !result.content) {
            logFirebase('인증 파일 없음 - 로컬 모드로 동작 (success:', result.success, ', exists:', result.exists, ', content:', !!result.content, ')');
            return null;
        }

        // JSON 파싱
        const config = JSON.parse(result.content!) as FirebaseConfig;

        // 필수 필드 확인
        if (config.apiKey && config.projectId) {
            logFirebase('인증 파일에서 Firebase 설정 로드됨');
            return config;
        } else {
            logFirebase('인증 파일에 필수 설정 없음');
            return null;
        }

    } catch (error) {
        (window.logger?.error || (window.logger?.error || console.error))('[Firebase] 인증 파일 로드 실패:', error);
        return null;
    }
}

/**
 * localStorage에서 Firebase 설정 로드 (백업용)
 * 난독화된 데이터와 레거시 평문 데이터 모두 지원
 */
function loadFirebaseConfigFromStorage(): FirebaseConfig | null {
    try {
        const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (saved) {
            let config: FirebaseConfig;
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
        (window.logger?.error || (window.logger?.error || console.error))('Firebase 설정 로드 실패:', e);
    }
    return null;
}

/**
 * Firebase 설정 로드 (인증 파일 우선)
 */
async function loadFirebaseConfig(): Promise<FirebaseConfig | null> {
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
 */
function isFirebaseConfigValid(config: FirebaseConfig | null): boolean {
    if (!config) return false;

    return !!(config.apiKey &&
           config.apiKey.trim() !== '' &&
           config.projectId &&
           config.projectId.trim() !== '');
}

/**
 * Firebase 초기화 (compat 버전)
 */
async function initializeFirebase(): Promise<boolean> {
    logFirebase('초기화 시작...');

    // 이미 초기화되어 있으면 true 반환
    if (isFirebaseEnabled && db) {
        logFirebase('이미 초기화됨');
        return true;
    }

    // 오프라인 상태 확인
    if (!navigator.onLine) {
        logFirebase('오프라인 상태 - 로컬 모드로 동작');
        (window.logger?.info || (window.logger?.info || console.info))('[Firebase] 인터넷 연결 없음. 로컬 모드로 동작합니다.');
        return false;
    }

    // 네트워크 접근 체크 (웹 환경용)
    if (typeof (window as typeof window & { NetworkAccess?: { checkAccess: () => Promise<{ allowed: boolean; needsSetup?: boolean; reason?: string }> } }).NetworkAccess !== 'undefined') {
        const NetworkAccess = (window as typeof window & { NetworkAccess: { checkAccess: () => Promise<{ allowed: boolean; needsSetup?: boolean; reason?: string }> } }).NetworkAccess;
        let accessResult = await NetworkAccess.checkAccess();
        logFirebase('네트워크 접근 체크:', accessResult);

        // 게이트웨이 미설정 시 입력 모달 표시 후 재확인
        if (!accessResult.allowed && accessResult.needsSetup) {
            // Skip setup prompt for now
            logFirebase('네트워크 접근 거부: 게이트웨이 미설정');
        }

        if (!accessResult.allowed) {
            logFirebase('네트워크 접근 거부:', accessResult.reason);
            (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 허용되지 않은 네트워크입니다. 로컬 모드로 동작합니다.');
            return false;
        }
    }

    // firebase compat SDK가 로드되었는지 확인
    if (typeof firebase === 'undefined') {
        (window.logger?.error || (window.logger?.error || console.error))('[Firebase] SDK가 로드되지 않았습니다. firebase-app-compat.js를 먼저 로드하세요.');
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
        if (!(firebase as any).apps.length) {
            (firebase as any).initializeApp(firebaseConfigData);

            // Firebase 로그 레벨 설정 (deprecation 경고 억제)
            if ((firebase as any).firestore && typeof (firebase as any).firestore.setLogLevel === 'function') {
                (firebase as any).firestore.setLogLevel('error'); // 'silent', 'error', 'warn', 'info', 'debug'
            }
        }

        db = (firebase as any).firestore();
        logFirebase('Firestore 연결됨');

        // 익명 인증 수행
        try {
            auth = (firebase as any).auth();
            const userCredential = await auth.signInAnonymously();
            isAuthenticated = true;
            logFirebase('익명 인증 성공:', userCredential.user?.uid);
        } catch (authError) {
            (window.logger?.error || (window.logger?.error || console.error))('[Firebase] 익명 인증 실패:', authError);
            isAuthenticated = false;

            // 인증 실패 시 보안 규칙에 따라 Firestore 접근이 제한될 수 있음
            // 보안 규칙이 request.auth != null을 요구하면 초기화 실패로 처리
            const errorCode = (authError as { code?: string }).code || '';
            if (errorCode === 'auth/operation-not-allowed') {
                (window.logger?.error || (window.logger?.error || console.error))('[Firebase] 익명 인증이 비활성화되어 있습니다. Firebase Console에서 활성화하세요.');
                // 익명 인증이 비활성화된 경우 초기화 실패
                return false;
            } else if (errorCode === 'auth/network-request-failed') {
                (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 네트워크 오류로 인증 실패. 오프라인 모드로 계속 진행합니다.');
                // 네트워크 오류는 오프라인 모드로 계속 진행
            } else {
                (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 인증 없이 계속 진행 (보안 규칙에 따라 제한될 수 있음)');
            }
        }

        // 오프라인 지원 활성화 (멀티탭 동기화 모드)
        try {
            await db.enablePersistence({ synchronizeTabs: true });
            isOfflineEnabled = true;
            logFirebase('오프라인 지원 활성화됨 (멀티탭 동기화)');
        } catch (err) {
            const error = err as { code?: string; message?: string };
            (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 오프라인 지원 에러:', error.code, error.message);
            if (error.code === 'failed-precondition') {
                (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 여러 탭이 열려 있어 오프라인 지원이 제한됩니다.');
            } else if (error.code === 'unimplemented') {
                (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 이 브라우저는 오프라인 지원을 지원하지 않습니다.');
            }
        }

        isFirebaseEnabled = true;
        logFirebase('초기화 완료:', firebaseConfigData.projectId);

        // 오프라인/온라인 전환 시 Firestore 네트워크 제어
        window.addEventListener('offline', () => {
            logFirebase('네트워크 끊김 감지 - Firestore 네트워크 비활성화');
            if (db) {
                db.disableNetwork().catch(() => {});
            }
        });
        window.addEventListener('online', () => {
            logFirebase('네트워크 복구 감지 - Firestore 네트워크 활성화');
            if (db) {
                db.enableNetwork().catch(() => {});
            }
        });

        return true;
    } catch (error) {
        (window.logger?.error || (window.logger?.error || console.error))('[Firebase] 초기화 실패:', error);
        (window.logger?.error || (window.logger?.error || console.error))('[Firebase] 에러 상세:', (error as Error).message, (error as Error).stack);
        return false;
    }
}

/**
 * Firestore DB 인스턴스 반환
 */
function getDb(): FirebaseFirestore | null {
    return db;
}

/**
 * Firebase 활성화 여부 확인
 */
function isEnabled(): boolean {
    return isFirebaseEnabled;
}

/**
 * 오프라인 지원 활성화 여부 확인
 */
function isOfflineSupported(): boolean {
    return isOfflineEnabled;
}

/**
 * 인증 여부 확인
 */
function isUserAuthenticated(): boolean {
    return isAuthenticated;
}

/**
 * 현재 사용자 UID 반환
 */
function getCurrentUserId(): string | null {
    return auth?.currentUser?.uid || null;
}

/**
 * Firebase 설정 저장 (설정 페이지에서 사용)
 * 난독화하여 저장 (평문 노출 방지)
 */
function saveFirebaseConfig(config: FirebaseConfig): void {
    try {
        const encoded = obfuscate.encode(JSON.stringify(config));
        localStorage.setItem(FIREBASE_CONFIG_KEY, encoded);
        logFirebase('설정 저장됨 (난독화)');
    } catch (e) {
        (window.logger?.error || (window.logger?.error || console.error))('Firebase 설정 저장 실패:', e);
    }
}

/**
 * Firebase 설정 초기화
 */
function resetFirebaseConfig(): void {
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
 */
async function reinitializeFirebase(): Promise<boolean> {
    logFirebase('재초기화 시작...');

    // 기존 상태 초기화
    isFirebaseEnabled = false;
    isAuthenticated = false;
    isOfflineEnabled = false;
    db = null;
    auth = null;
    firebaseConfigData = null;

    // Firebase 앱이 이미 있으면 삭제
    if (typeof firebase !== 'undefined' && (firebase as any).apps.length > 0) {
        try {
            await (firebase as any).app().delete();
            logFirebase('기존 Firebase 앱 삭제됨');
        } catch (e) {
            (window.logger?.warn || (window.logger?.warn || console.warn))('[Firebase] 앱 삭제 실패:', e);
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
    getCurrentUserId: getCurrentUserId,
    isConfigValid: isFirebaseConfigValid,
    saveConfig: saveFirebaseConfig,
    resetConfig: resetFirebaseConfig
};
