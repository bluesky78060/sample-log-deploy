// ========================================
// 캐시 관리 모듈
// localStorage 캐시 주기적 클리어 및 수동 클리어 기능
// ========================================

// ========================================
// Type Definitions
// ========================================

/** 캐시 클리어 결과 */
interface ClearCacheResult {
    success: boolean;
    clearedCount: number;
    clearedKeys: string[];
}

/** 마지막 클리어 정보 */
interface LastClearInfo {
    lastClear: Date | null;
    lastAutoClear: AutoClearRecord | null;
}

/** 자동 클리어 기록 */
interface AutoClearRecord {
    timestamp: number;
    date: string;
    clearedCount: number;
}

/** 타입별 캐시 상세 */
interface CacheTypeDetail {
    count: number;
    size: number;
}

/** 캐시 상태 */
interface CacheStatus {
    totalKeys: number;
    totalSize: number;
    totalSizeMB: string;
    details: Record<string, CacheTypeDetail>;
    lastClear: LastClearInfo;
}

/** CacheManager API 인터페이스 */
interface CacheManagerAPI {
    clearCache(showAlert?: boolean): ClearCacheResult;
    checkAndAutoClean(): void;
    getLastClearInfo(): LastClearInfo;
    getCacheStatus(): CacheStatus;
    isFriday(): boolean;
    wasAlreadyClearedThisWeek(): boolean;
}

// ========================================
// CacheManager Implementation
// ========================================

/**
 * CacheManager - localStorage 캐시 관리
 * - 매주 금요일 자동 클리어
 * - 수동 클리어 기능
 * - 설정 및 중요 데이터 보존
 */
const CacheManager: CacheManagerAPI = (function(): CacheManagerAPI {
    // 보존해야 할 키 패턴 (시료 데이터는 클리어, 설정은 유지)
    const KEYS_TO_PRESERVE: string[] = [
        'firebase_config',        // Firebase 설정
        'autoSavePath',           // 자동 저장 경로
        'settings',               // 일반 설정
        'theme',                  // 테마 설정
        'lastCacheClear',         // 마지막 클리어 시간
        'cacheAutoCleared'        // 자동 클리어 기록
    ];

    // 시료 데이터 키 패턴 (이 패턴의 데이터가 클리어 대상)
    // 연도 포함 키(예: soilSampleLogs_2026)와 레거시 키(예: waterSampleLogs) 모두 매칭
    // test_ 접두사 포함 키(예: test_soilSampleLogs_2026)도 매칭
    const SAMPLE_DATA_PATTERNS: string[] = [
        'soilSampleLogs',
        'waterSampleLogs',
        'pesticideSampleLogs',
        'compostSampleLogs',
        'heavyMetalSampleLogs',
        'test_soilSampleLogs',
        'test_waterSampleLogs',
        'test_pesticideSampleLogs',
        'test_compostSampleLogs',
        'test_heavyMetalSampleLogs'
    ];

    /**
     * 현재 요일이 금요일인지 확인
     * @returns {boolean}
     */
    function isFriday(): boolean {
        return new Date().getDay() === 5; // 0: 일요일, 5: 금요일
    }

    /**
     * 이번 주 금요일에 이미 클리어했는지 확인
     * @returns {boolean}
     */
    function wasAlreadyClearedThisWeek(): boolean {
        const lastClear: string | null = localStorage.getItem('lastCacheClear');
        if (!lastClear) return false;

        const lastClearDate: Date = new Date(parseInt(lastClear));
        const now: Date = new Date();

        // 같은 주인지 확인 (ISO 주 기준)
        const getWeekNumber = (date: Date): number => {
            const d: Date = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart: Date = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        return lastClearDate.getFullYear() === now.getFullYear() &&
               getWeekNumber(lastClearDate) === getWeekNumber(now);
    }

    /**
     * 키가 보존 대상인지 확인
     * @param {string} key - localStorage 키
     * @returns {boolean}
     */
    function shouldPreserve(key: string): boolean {
        return KEYS_TO_PRESERVE.some((pattern: string) => key === pattern || key.startsWith(pattern));
    }

    /**
     * 키가 시료 데이터인지 확인
     * @param {string} key - localStorage 키
     * @returns {boolean}
     */
    function isSampleData(key: string): boolean {
        return SAMPLE_DATA_PATTERNS.some((pattern: string) => key.startsWith(pattern));
    }

    /**
     * 캐시 클리어 (시료 데이터만 삭제)
     * @param {boolean} showAlert - 알림 표시 여부
     * @returns {ClearCacheResult} 삭제 결과
     */
    function clearCache(showAlert: boolean = true): ClearCacheResult {
        // 보존할 데이터 백업
        const preserved: Record<string, string> = {};
        KEYS_TO_PRESERVE.forEach((key: string): void => {
            const value: string | null = localStorage.getItem(key);
            if (value) preserved[key] = value;
        });

        // 삭제할 키 수집 (시료 데이터만)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key: string | null = localStorage.key(i);
            if (key && isSampleData(key)) {
                keysToRemove.push(key);
            }
        }

        // 삭제 실행
        keysToRemove.forEach((key: string): void => localStorage.removeItem(key));

        // 보존 데이터 복원
        Object.entries(preserved).forEach(([key, value]: [string, string]): void => {
            localStorage.setItem(key, value);
        });

        // 클리어 시간 기록
        localStorage.setItem('lastCacheClear', Date.now().toString());

        const result: ClearCacheResult = {
            success: true,
            clearedCount: keysToRemove.length,
            clearedKeys: keysToRemove
        };

        if (showAlert && keysToRemove.length > 0) {
            const message: string = `캐시가 삭제되었습니다.\n삭제된 항목: ${keysToRemove.length}건\n\n앱을 새로고침하면 Firebase에서 데이터를 다시 불러옵니다.`;
            alert(message);
        }

        (window.logger?.info || console.log)('캐시 클리어 완료:', result);

        return result;
    }

    /**
     * 매주 금요일 자동 클리어 체크 및 실행
     * 앱 시작 시 호출
     */
    function checkAndAutoClean(): void {
        if (!isFriday()) {
            (window.logger?.debug || console.log)('금요일이 아님 - 자동 클리어 스킵');
            return;
        }

        if (wasAlreadyClearedThisWeek()) {
            (window.logger?.debug || console.log)('이번 주 이미 클리어됨 - 스킵');
            return;
        }

        (window.logger?.info || console.log)('금요일 자동 캐시 클리어 실행');

        const result: ClearCacheResult = clearCache(false); // 자동 클리어는 알림 없이

        // 자동 클리어 기록
        const record: AutoClearRecord = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            clearedCount: result.clearedCount
        };
        localStorage.setItem('cacheAutoCleared', JSON.stringify(record));

        // 토스트 알림 (있는 경우)
        if (result.clearedCount > 0 && window.showToast) {
            window.showToast(`금요일 자동 캐시 정리: ${result.clearedCount}건 삭제`, 'info');
        }
    }

    /**
     * 마지막 클리어 정보 조회
     * @returns {LastClearInfo}
     */
    function getLastClearInfo(): LastClearInfo {
        const lastClear: string | null = localStorage.getItem('lastCacheClear');
        const autoCleared: string | null = localStorage.getItem('cacheAutoCleared');

        return {
            lastClear: lastClear ? new Date(parseInt(lastClear)) : null,
            lastAutoClear: autoCleared ? JSON.parse(autoCleared) as AutoClearRecord : null
        };
    }

    /**
     * 현재 캐시 상태 조회
     * @returns {CacheStatus}
     */
    function getCacheStatus(): CacheStatus {
        let sampleDataCount: number = 0;
        let sampleDataSize: number = 0;
        const details: Record<string, CacheTypeDetail> = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key: string | null = localStorage.key(i);
            if (key && isSampleData(key)) {
                const value: string | null = localStorage.getItem(key);
                sampleDataCount++;
                sampleDataSize += value ? value.length : 0;

                // 타입별 집계
                const type: string = key.split('_')[0];
                if (!details[type]) {
                    details[type] = { count: 0, size: 0 };
                }
                details[type].count++;
                details[type].size += value ? value.length : 0;
            }
        }

        return {
            totalKeys: sampleDataCount,
            totalSize: sampleDataSize,
            totalSizeMB: (sampleDataSize / 1024 / 1024).toFixed(2),
            details,
            lastClear: getLastClearInfo()
        };
    }

    // Public API
    return {
        clearCache,
        checkAndAutoClean,
        getLastClearInfo,
        getCacheStatus,
        isFriday,
        wasAlreadyClearedThisWeek
    };
})();

// 전역 노출
(window as Window & { CacheManager?: CacheManagerAPI }).CacheManager = CacheManager;

// ========================================
// Export
// ========================================

export { CacheManager };

export type {
    ClearCacheResult,
    LastClearInfo,
    AutoClearRecord,
    CacheTypeDetail,
    CacheStatus,
    CacheManagerAPI
};
