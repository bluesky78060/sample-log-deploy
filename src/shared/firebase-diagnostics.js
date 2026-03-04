/**
 * @fileoverview Firebase 연결 진단 및 복구 도구
 * @description Firebase 연결 문제 자동 감지 및 복구
 */

class FirebaseDiagnostics {
    constructor() {
        this.lastCheckTime = null;
        this.checkInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    /**
     * Firebase 연결 상태 전체 진단
     * @returns {Promise<Object>} 진단 결과
     */
    async diagnose() {
        const results = {
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
    checkConfigLoaded() {
        const hasConfig = window.firebaseConfig &&
                         typeof window.firebaseConfig.getDb === 'function';

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
    checkInitialized() {
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
    async checkAuthentication() {
        try {
            const auth = window.firebaseConfig?.getAuth();
            if (!auth) {
                return {
                    passed: false,
                    message: '인증 객체를 찾을 수 없습니다.',
                    details: { authExists: false }
                };
            }

            const user = auth.currentUser;
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
                message: `인증 확인 실패: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * 네트워크 상태 확인
     */
    checkNetworkStatus() {
        const isOnline = navigator.onLine;
        const networkStatus = window.networkStatus;

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
    async checkFirestoreConnection() {
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
            const timeoutPromise = new Promise((_, reject) =>
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
                message: `Firestore 연결 실패: ${error.message}`,
                details: {
                    error: error.message,
                    code: error.code
                }
            };
        }
    }

    /**
     * 오프라인 큐 상태 확인
     */
    checkOfflineQueue() {
        const networkStatus = window.networkStatus;
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
    checkCollectionNames() {
        const sampleTypes = ['soil', 'water', 'compost', 'heavyMetal', 'pesticide'];
        const year = new Date().getFullYear();

        const results = {};

        // firestoreDb의 getCollectionName 함수를 직접 호출하여 실제 이름 검증
        if (window.firestoreDb && typeof window.firestoreDb.getCollectionName === 'function') {
            sampleTypes.forEach(type => {
                const actualName = window.firestoreDb.getCollectionName(type, year);
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
    determineOverallStatus(checks) {
        const criticalChecks = ['configLoaded', 'initialized'];
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
    generateRecommendations(checks) {
        const recommendations = [];

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

        if (checks.offlineQueue?.details?.queueSize > 0) {
            recommendations.push({
                priority: 'info',
                message: `${checks.offlineQueue.details.queueSize}개의 작업이 동기화 대기 중입니다.`,
                action: 'processQueue'
            });
        }

        return recommendations;
    }

    /**
     * 자동 복구 시도
     */
    async attemptAutoRecovery() {
        console.log('[Firebase Diagnostics] 자동 복구 시작...');

        const diagnosis = await this.diagnose();

        if (diagnosis.overallStatus === 'healthy') {
            console.log('[Firebase Diagnostics] 연결 상태 정상');
            return { success: true, message: '연결 정상' };
        }

        // 네트워크 문제
        if (diagnosis.overallStatus === 'offline') {
            console.log('[Firebase Diagnostics] 오프라인 상태 - 큐 사용 중');
            return {
                success: false,
                message: '오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다.',
                canRetry: true
            };
        }

        // Firebase 재초기화 시도
        if (!diagnosis.checks.initialized?.passed) {
            try {
                console.log('[Firebase Diagnostics] Firebase 재초기화 시도...');
                if (window.firebaseConfig?.init) {
                    await window.firebaseConfig.init();
                    return { success: true, message: 'Firebase 재초기화 성공' };
                }
            } catch (error) {
                console.error('[Firebase Diagnostics] 재초기화 실패:', error);
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
    startHealthCheck(intervalMs = 60000) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(async () => {
            const diagnosis = await this.diagnose();

            if (diagnosis.overallStatus !== 'healthy') {
                console.warn('[Firebase Diagnostics] 연결 문제 감지:', diagnosis);

                if (window.showToast) {
                    showToast('Firebase 연결 문제가 감지되었습니다.', 'warning', {
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
    stopHealthCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * 진단 UI 표시
     */
    showDiagnosticsUI() {
        // 콘솔에 진단 결과 출력
        this.diagnose().then(result => {
            console.group('🔍 Firebase 진단 결과');
            console.log('전체 상태:', result.overallStatus);
            console.log('검사 항목:', result.checks);
            console.log('권장 사항:', result.recommendations);
            console.groupEnd();

            // 토스트로도 표시
            if (window.showToast) {
                const statusMessages = {
                    'healthy': 'Firebase 연결 정상',
                    'offline': '오프라인 모드 (큐 사용 중)',
                    'degraded': 'Firebase 연결 불안정',
                    'error': 'Firebase 설정 오류'
                };

                showToast(statusMessages[result.overallStatus],
                         result.overallStatus === 'healthy' ? 'success' : 'warning');
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
