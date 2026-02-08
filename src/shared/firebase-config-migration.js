/**
 * Firebase 설정 보안 마이그레이션 도구
 * Base64 인코딩에서 암호화 스토리지로 마이그레이션
 */

import { secureStorage } from './secure-storage.js';

const FIREBASE_CONFIG_KEY = 'firebaseConfig';
const SECURE_CONFIG_KEY = 'firebase_config';
const MIGRATION_FLAG = 'firebase_config_migrated';

/**
 * 기존 Firebase 설정을 보안 스토리지로 마이그레이션
 * @returns {Promise<boolean>} 마이그레이션 성공 여부
 */
export async function migrateFirebaseConfig() {
    try {
        // 이미 마이그레이션했는지 확인
        if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
            (window.logger?.info || console.log)('[Firebase Migration] 이미 마이그레이션 완료됨');
            return true;
        }

        // 기존 설정 로드
        const oldConfig = loadOldConfig();
        if (!oldConfig) {
            (window.logger?.info || console.log)('[Firebase Migration] 마이그레이션할 설정이 없음');
            return false;
        }

        // 보안 스토리지에 저장
        const success = await secureStorage.setItem(SECURE_CONFIG_KEY, oldConfig);
        if (!success) {
            (window.logger?.error || console.error)('[Firebase Migration] 보안 스토리지 저장 실패');
            return false;
        }

        // 마이그레이션 플래그 설정
        localStorage.setItem(MIGRATION_FLAG, 'true');

        // 기존 평문/Base64 설정은 유지 (롤백 가능)
        (window.logger?.info || console.log)('[Firebase Migration] 마이그레이션 완료');
        return true;

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase Migration] 마이그레이션 실패:', error);
        return false;
    }
}

/**
 * 기존 설정 로드 (Base64 및 평문 지원)
 * @returns {Object|null}
 */
function loadOldConfig() {
    try {
        const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (!saved) return null;

        let config;

        // Base64 인코딩 확인
        if (saved.startsWith('eyJ')) {
            try {
                // Base64 디코딩
                const decoded = atob(saved);
                const unescaped = decodeURIComponent(decoded);
                config = JSON.parse(unescaped);
            } catch {
                // 디코딩 실패 시 평문으로 시도
                config = JSON.parse(saved);
            }
        } else {
            // 평문 데이터
            config = JSON.parse(saved);
        }

        // 유효성 검증
        if (config && config.apiKey && config.projectId) {
            return config;
        }

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase Migration] 기존 설정 로드 실패:', error);
    }

    return null;
}

/**
 * Firebase 설정 로드 (보안 스토리지 우선, 기존 방식 폴백)
 * @returns {Promise<Object|null>}
 */
export async function loadFirebaseConfig() {
    try {
        // 1. 보안 스토리지에서 로드 시도
        const secureConfig = await secureStorage.getItem(SECURE_CONFIG_KEY);
        if (secureConfig) {
            return secureConfig;
        }

        // 2. 마이그레이션 시도
        const migrated = await migrateFirebaseConfig();
        if (migrated) {
            return await secureStorage.getItem(SECURE_CONFIG_KEY);
        }

        // 3. 기존 방식으로 로드
        return loadOldConfig();

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase Config] 설정 로드 실패:', error);
        return null;
    }
}

/**
 * Firebase 설정 저장 (보안 스토리지 사용)
 * @param {Object} config - Firebase 설정
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export async function saveFirebaseConfig(config) {
    try {
        // 보안 스토리지에 저장
        const success = await secureStorage.setItem(SECURE_CONFIG_KEY, config);

        if (success) {
            // 마이그레이션 플래그 설정
            localStorage.setItem(MIGRATION_FLAG, 'true');

            // 기존 평문 설정 제거 (선택적)
            // localStorage.removeItem(FIREBASE_CONFIG_KEY);
        }

        return success;

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase Config] 설정 저장 실패:', error);
        return false;
    }
}

/**
 * 보안 수준 확인
 * @returns {Object} 보안 상태
 */
export async function getSecurityStatus() {
    const migrated = localStorage.getItem(MIGRATION_FLAG) === 'true';
    const secureConfig = await secureStorage.getItem(SECURE_CONFIG_KEY);
    const oldConfig = loadOldConfig();

    return {
        migrated,
        hasSecureConfig: !!secureConfig,
        hasOldConfig: !!oldConfig,
        storageSecurityLevel: secureStorage.getSecurityLevel(),
        recommendation: migrated ? '안전' : '마이그레이션 권장'
    };
}

/**
 * 설정 롤백 (비상용)
 */
export async function rollbackMigration() {
    try {
        // 보안 스토리지에서 설정 제거
        secureStorage.removeItem(SECURE_CONFIG_KEY);

        // 마이그레이션 플래그 제거
        localStorage.removeItem(MIGRATION_FLAG);

        (window.logger?.info || console.log)('[Firebase Migration] 롤백 완료');
        return true;

    } catch (error) {
        (window.logger?.error || console.error)('[Firebase Migration] 롤백 실패:', error);
        return false;
    }
}

// 자동 마이그레이션 (페이지 로드 시)
if (typeof window !== 'undefined') {
    window.addEventListener('load', async () => {
        const status = await getSecurityStatus();
        if (!status.migrated && status.hasOldConfig) {
            (window.logger?.info || console.log)('[Firebase Migration] 자동 마이그레이션 시작...');
            await migrateFirebaseConfig();
        }
    });

    // 디버깅용 전역 노출
    window.firebaseMigration = {
        migrate: migrateFirebaseConfig,
        getStatus: getSecurityStatus,
        rollback: rollbackMigration
    };
}