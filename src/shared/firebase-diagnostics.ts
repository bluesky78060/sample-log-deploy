/**
 * @fileoverview Firebase 연결 진단 및 복구 도구
 * @description Firebase 연결 문제 자동 감지 및 복구
 */

interface CheckResult {
    passed: boolean;
    message: string;
    details: Record<string, unknown>;
}

interface DiagnosisChecks {
    configLoaded?: CheckResult;
    initialized?: CheckResult;
    authenticated?: CheckResult;
    networkOnline?: CheckResult;
    firestoreConnection?: CheckResult;
    offlineQueue?: CheckResult;
    collectionNames?: CheckResult;
}

type DiagnosisStatus = 'healthy' | 'offline' | 'degraded' | 'error' | 'unknown';

interface Recommendation {
    priority: 'critical' | 'warning' | 'info';
    message: string;
    action: 'checkAuthFile' | 'reinitialize' | 'checkNetwork' | 'reconnect' | 'processQueue';
}

interface DiagnosisResult {
    timestamp: string;
    checks: DiagnosisChecks;
    overallStatus: DiagnosisStatus;
    recommendations: Recommendation[];
}

interface RecoveryResult {
    success: boolean;
    message: string;
    canRetry?: boolean;
    diagnosis?: DiagnosisResult;
}

interface CollectionCheckDetails {
    [sampleType: string]: {
        actual: string;
        hasPrefix: boolean;
        year: number;
    };
}

class FirebaseDiagnostics {
    private lastCheckTime: number | null = null;
    private checkInterval: number | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 3;

    /**
     * Firebase 연결 상태 전체 진단
     */
    async diagnose(): Promise<DiagnosisResult> {
        const results: DiagnosisResult = {
            timestamp: new Date().toISOString(),
            checks: {},
            overallStatus: 'unknown',
            recommendations: []
        };

        // 1. Firebase 설정 확인
        results.checks.configLoaded = this.checkConfigLoaded();

        // 2. Firebase 초기화 확인
        results.checks.initialized = this.checkInitialized();

        // 3. 인증 상태 확인
        results.checks.authenticated = await this.checkAuthentication();

        // 4. 네트워크 연결 확인
        results.checks.networkOnline = this.checkNetworkStatus();

        // 5. Firestore 연결 확인
        if (results.checks.initialized.passed) {
            results.checks.firestoreConnection = await this.checkFirestoreConnection();
        }

        // 6. 오프라인 큐 상태 확인
        results.checks.offlineQueue = this.checkOfflineQueue();

        // 7. 컬렉션 이름 검증
        results.checks.collectionNames = this.checkCollectionNames();

        // 전체 상태 판단
        results.overallStatus = this.determineOverallStatus(results.checks);

        // 권장 사항 생성
        results.recommendations = this.generateRecommendations(results.checks);

        this.lastCheckTime = Date.now();

        return results;
    }

    /**
     * Firebase 설정 로드 여부 확인
     */
    private checkConfigLoaded(): CheckResult {
        const hasConfig = !!(window.firebaseConfig &&
                         typeof window.firebaseConfig.getDb === 'function');

        return {
            passed: hasConfig,
            message: hasConfig ? 'Firebase 설정이 로드되었습니다.' : 'Firebase 설정을 찾을 수 없습니다.',
            details: {
                configExists: !!window.firebaseConfig,
                isEnabled: window.firebaseConfig?.isEnabled() || false
            }
        };
    }

    /**
     * Firebase 초기화 확인
     */
    private checkInitialized(): CheckResult {
        const db = window.firebaseConfig?.getDb();
        const initialized = !!db;

        return {
            passed: initialized,
            message: initialized ? 'Firebase가 초기화되었습니다.' : 'Firebase가 초기화되지 않았습니다.',
            details: {
                hasDb: !!db
            }
        };
    }

    /**
     * 인증 상태 확인
     */
    private async checkAuthentication(): Promise<CheckResult> {
        try {
            const auth = (window.firebaseConfig as { getAuth?: () => unknown })?.getAuth?.();
            if (!auth) {
                return {
                    passed: false,
                    message: '인증 객체를 찾을 수 없습니다.',
                    details: { authExists: false }
                };
            }

            const user = (auth as { currentUser?: { uid?: string } }).currentUser;
            const isAuthenticated = !!user;

            return {
                passed: true,  // 인증은 선택사항
                message: isAuthenticated ? '인증되었습니다.' : '익명 모드입니다.',
                details: {
                    authenticated: isAuthenticated,
                    userId: user?.uid || null
                }
            };
        } catch (error) {
            return {
                passed: false,
                message: `인증 확인 실패: ${(error as Error).message}`,
                details: { error: (error as Error).message }
            };
        }
    }

    /**
     * 네트워크 상태 확인
     */
    private checkNetworkStatus(): CheckResult {
        const isOnline = navigator.onLine;
        const networkStatus = window.networkStatus as { isOnline?: boolean; offlineQueue?: unknown[] } | undefined;

        return {
            passed: isOnline,
            message: isOnline ? '온라인 상태입니다.' : '오프라인 상태입니다.',
            details: {
                navigatorOnline: isOnline,
                networkStatusOnline: networkStatus?.isOnline,
                queueSize: networkStatus?.offlineQueue?.length || 0
            }
        };
    }

    /**
     * Firestore 연결 테스트
     */
    private async checkFirestoreConnection(): Promise<CheckResult> {
        try {
            const db = window.firebaseConfig?.getDb();
            if (!db) {
                return {
                    passed: false,
                    message: 'Firestore DB를 찾을 수 없습니다.',
                    details: {}
                };
            }

            // 간단한 읽기 테스트 (타임아웃 5초)
            const testPromise = db.collection('_connection_test').limit(1).get();
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            await Promise.race([testPromise, timeoutPromise]);

            return {
                passed: true,
                message: 'Firestore 연결이 정상입니다.',
                details: { connectionTest: 'success' }
            };
        } catch (error) {
            return {
                passed: false,
                message: `Firestore 연결 실패: ${(error as Error).message}`,
                details: {
                    error: (error as Error).message,
                    code: (error as { code?: string }).code
                }
            };
        }
    }

    /**
     * 오프라인 큐 상태 확인
     */
    private checkOfflineQueue(): CheckResult {
        const networkStatus = window.networkStatus as { offlineQueue?: unknown[]; getQueueStatus?: () => unknown } | undefined;
        const queueSize = networkStatus?.offlineQueue?.length || 0;

        return {
            passed: true,  // 큐는 항상 정상
            message: queueSize > 0
                ? `오프라인 큐에 ${queueSize}개 작업이 대기 중입니다.`
                : '오프라인 큐가 비어있습니다.',
            details: {
                queueSize,
                queueItems: networkStatus?.getQueueStatus?.() || null
            }
        };
    }

    /**
     * 컬렉션 이름 검증
     */
    private checkCollectionNames(): CheckResult {
        const sampleTypes = ['soil', 'water', 'compost', 'heavyMetal', 'pesticide'];
        const year = new Date().getFullYear();

        const results: CollectionCheckDetails = {};

        // firestoreDb의 getCollectionName 함수를 직접 호출하여 실제 이름 검증
        if (window.firestoreDb && typeof window.firestoreDb.getCollectionName === 'function') {
            sampleTypes.forEach(type => {
                const actualName = window.firestoreDb!.getCollectionName(type, year);
                const expectedPrefix = 'test_';

                results[type] = {
                    actual: actualName,
                    hasPrefix: actualName.startsWith(expectedPrefix),
                    year: year
                };
            });
        } else {
            return {
                passed: false,
                message: 'firestoreDb 모듈을 찾을 수 없습니다.',
                details: { error: 'Module not loaded' }
            };
        }

        const allValid = Object.values(results).every(r => r.hasPrefix);

        return {
            passed: allValid,
            message: allValid
                ? '모든 컬렉션 이름이 올바릅니다.'
                : '일부 컬렉션 이름에 test_ 접두사가 없습니다.',
            details: results
        };
    }

    /**
     * 전체 상태 판단
     */
    private determineOverallStatus(checks: DiagnosisChecks): DiagnosisStatus {
        const criticalChecks: Array<keyof DiagnosisChecks> = ['configLoaded', 'initialized'];
        const failedCritical = criticalChecks.some(key => !checks[key]?.passed);

        if (failedCritical) {
            return 'error';
        }

        if (!checks.networkOnline?.passed) {
            return 'offline';
        }

        if (checks.firestoreConnection && !checks.firestoreConnection.passed) {
            return 'degraded';
        }

        return 'healthy';
    }

    /**
     * 권장 사항 생성
     */
    private generateRecommendations(checks: DiagnosisChecks): Recommendation[] {
        const recommendations: Recommendation[] = [];

        if (!checks.configLoaded?.passed) {
            recommendations.push({
                priority: 'critical',
                message: 'Firebase 설정 파일(firebase-auth.json)을 확인하세요.',
                action: 'checkAuthFile'
            });
        }

        if (!checks.initialized?.passed) {
            recommendations.push({
                priority: 'critical',
                message: 'Firebase 초기화 코드를 확인하세요.',
                action: 'reinitialize'
            });
        }

        if (!checks.networkOnline?.passed) {
            recommendations.push({
                priority: 'warning',
                message: '인터넷 연결을 확인하세요. 오프라인 모드로 작동 중입니다.',
                action: 'checkNetwork'
            });
        }

        if (checks.firestoreConnection && !checks.firestoreConnection.passed) {
            recommendations.push({
                priority: 'warning',
                message: 'Firestore 연결을 재시도하세요.',
                action: 'reconnect'
            });
        }

        const queueSize = checks.offlineQueue?.details?.queueSize as number | undefined;
        if (queueSize && queueSize > 0) {
            recommendations.push({
                priority: 'info',
                message: `${queueSize}개의 작업이 동기화 대기 중입니다.`,
                action: 'processQueue'
            });
        }

        return recommendations;
    }

    /**
     * 자동 복구 시도
     */
    async attemptAutoRecovery(): Promise<RecoveryResult> {
        (window.logger?.debug || console.log)('[Firebase Diagnostics] 자동 복구 시작...');

        const diagnosis = await this.diagnose();

        if (diagnosis.overallStatus === 'healthy') {
            (window.logger?.debug || console.log)('[Firebase Diagnostics] 연결 상태 정상');
            return { success: true, message: '연결 정상' };
        }

        // 네트워크 문제
        if (diagnosis.overallStatus === 'offline') {
            (window.logger?.debug || console.log)('[Firebase Diagnostics] 오프라인 상태 - 큐 사용 중');
            return {
                success: false,
                message: '오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다.',
                canRetry: true
            };
        }

        // Firebase 재초기화 시도
        if (!diagnosis.checks.initialized?.passed) {
            try {
                (window.logger?.debug || console.log)('[Firebase Diagnostics] Firebase 재초기화 시도...');
                if (window.firebaseConfig?.initialize) {
                    await window.firebaseConfig.initialize();
                    return { success: true, message: 'Firebase 재초기화 성공' };
                }
            } catch (error) {
                (window.logger?.error || console.error)('[Firebase Diagnostics] 재초기화 실패:', error);
            }
        }

        return {
            success: false,
            message: '자동 복구 실패. 수동 확인이 필요합니다.',
            diagnosis
        };
    }

    /**
     * 주기적 연결 체크 시작
     */
    startHealthCheck(intervalMs = 60000): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = window.setInterval(async () => {
            const diagnosis = await this.diagnose();

            if (diagnosis.overallStatus !== 'healthy') {
                (window.logger?.warn || console.warn)('[Firebase Diagnostics] 연결 문제 감지:', diagnosis);

                if (typeof window.showToast === 'function') {
                    window.showToast('Firebase 연결 문제가 감지되었습니다.', 'warning', {
                        actionLabel: '진단',
                        action: () => this.showDiagnosticsUI()
                    });
                }
            }
        }, intervalMs);
    }

    /**
     * 헬스 체크 중지
     */
    stopHealthCheck(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * 진단 UI 표시
     */
    showDiagnosticsUI(): void {
        // 콘솔에 진단 결과 출력
        this.diagnose().then(result => {
            console.group('🔍 Firebase 진단 결과');
            (window.logger?.debug || console.log)('전체 상태:', result.overallStatus);
            (window.logger?.debug || console.log)('검사 항목:', result.checks);
            (window.logger?.debug || console.log)('권장 사항:', result.recommendations);
            console.groupEnd();

            // 토스트로도 표시
            if (typeof window.showToast === 'function') {
                const statusMessages: Record<DiagnosisStatus, string> = {
                    'healthy': 'Firebase 연결 정상',
                    'offline': '오프라인 모드 (큐 사용 중)',
                    'degraded': 'Firebase 연결 불안정',
                    'error': 'Firebase 설정 오류',
                    'unknown': 'Firebase 상태 불명'
                };

                window.showToast(
                    statusMessages[result.overallStatus],
                    result.overallStatus === 'healthy' ? 'success' : 'warning'
                );
            }
        });
    }
}

// 전역 인스턴스
window.firebaseDiagnostics = new FirebaseDiagnostics();

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDiagnostics;
}
