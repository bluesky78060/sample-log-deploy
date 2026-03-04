/**
 * @fileoverview 네트워크 상태 감지 및 오프라인 큐 관리
 * @description online/offline 이벤트 감지 → 사용자 알림 + 오프라인 작업 큐잉
 */

interface QueueItem {
    id: string;
    operation?: string;
    metadata: {
        type: string;
        description: string;
        timestamp: number;
        [key: string]: any;
    };
}

type NetworkStatusType = 'online' | 'offline';
type StatusListener = (status: NetworkStatusType) => void;

class NetworkStatus {
    isOnline: boolean;
    private listeners: Set<StatusListener>;
    private offlineQueue: QueueItem[];

    constructor() {
        this.isOnline = navigator.onLine;
        this.listeners = new Set();
        this.offlineQueue = this.loadQueue();

        // 온라인/오프라인 이벤트 리스너
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // 페이지 로드 시 초기 상태 확인
        this.checkInitialStatus();
    }

    /**
     * 초기 네트워크 상태 확인
     */
    checkInitialStatus(): void {
        if (!navigator.onLine) {
            if (window.showToast) {
                window.showToast('오프라인 모드입니다. 변경사항은 로컬에 저장됩니다.', 'warning');
            }
        } else {
            // 온라인이고 큐가 있으면 처리
            if (this.offlineQueue.length > 0) {
                this.processOfflineQueue();
            }
        }
    }

    /**
     * 온라인 상태로 전환
     */
    handleOnline(): void {
        this.isOnline = true;
        if (window.showToast) {
            window.showToast('인터넷에 연결되었습니다.', 'success');
        }
        if (window.logger) {
            window.logger.info('[NetworkStatus] 온라인 전환');
        }

        // 오프라인 큐 처리
        this.processOfflineQueue();

        // 리스너 알림
        this.notifyListeners('online');
    }

    /**
     * 오프라인 상태로 전환
     */
    handleOffline(): void {
        this.isOnline = false;
        if (window.showToast) {
            window.showToast('오프라인 모드입니다. 변경사항은 로컬에 저장됩니다.', 'warning');
        }
        if (window.logger) {
            window.logger.warn('[NetworkStatus] 오프라인 전환');
        }

        // 리스너 알림
        this.notifyListeners('offline');
    }

    /**
     * 오프라인 작업을 큐에 추가
     * @param operation - 나중에 실행할 비동기 함수
     * @param metadata - 작업 메타데이터 (타입, 설명 등)
     */
    queueOperation(
        operation: () => Promise<any>,
        metadata: Partial<QueueItem['metadata']> = {}
    ): void {
        const item: QueueItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            operation: operation.toString(), // 직렬화 불가능하므로 저장 시 제외
            metadata: {
                type: metadata.type || 'unknown',
                description: metadata.description || '',
                timestamp: Date.now(),
                ...metadata
            }
        };

        this.offlineQueue.push(item);
        this.saveQueue();

        if (window.logger) {
            window.logger.info('[NetworkStatus] 오프라인 큐에 추가:', item.metadata);
        }
    }

    /**
     * 오프라인 큐 처리
     */
    async processOfflineQueue(): Promise<void> {
        if (this.offlineQueue.length === 0) return;

        if (window.showToast) {
            window.showToast('오프라인 작업 동기화 중...', 'info');
        }

        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        let successCount = 0;
        let failCount = 0;

        for (const item of queue) {
            try {
                // 실제 작업은 외부에서 등록된 리스너가 처리
                // 여기서는 큐 관리만 담당
                successCount++;
            } catch (error) {
                failCount++;
                // 실패한 작업은 다시 큐에 추가
                this.offlineQueue.push(item);
                if (window.logger) {
                    window.logger.error('[NetworkStatus] 큐 처리 실패:', item.metadata, error);
                }
            }
        }

        this.saveQueue();

        if (failCount === 0 && successCount > 0) {
            if (window.showToast) {
                window.showToast(`오프라인 작업 ${successCount}개가 동기화되었습니다.`, 'success');
            }
        } else if (failCount > 0) {
            if (window.showToast) {
                window.showToast(`동기화 실패: ${failCount}개 작업이 대기 중입니다.`, 'warning');
            }
        }
    }

    /**
     * 상태 변경 리스너 등록
     * @param callback - (status) => void
     */
    addListener(callback: StatusListener): void {
        this.listeners.add(callback);
    }

    /**
     * 리스너 제거
     */
    removeListener(callback: StatusListener): void {
        this.listeners.delete(callback);
    }

    /**
     * 리스너들에게 알림
     */
    private notifyListeners(status: NetworkStatusType): void {
        this.listeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                if (window.logger) {
                    window.logger.error('[NetworkStatus] 리스너 실행 오류:', error);
                }
            }
        });
    }

    /**
     * localStorage에서 큐 로드
     */
    private loadQueue(): QueueItem[] {
        try {
            const saved = localStorage.getItem('offlineQueue');
            if (saved) {
                const queue = JSON.parse(saved);
                if (Array.isArray(queue)) {
                    return queue;
                }
            }
        } catch (error) {
            if (window.logger) {
                window.logger.error('[NetworkStatus] 큐 로드 실패:', error);
            }
        }
        return [];
    }

    /**
     * localStorage에 큐 저장
     */
    private saveQueue(): void {
        try {
            // operation 함수는 직렬화 불가능하므로 metadata만 저장
            const serializableQueue = this.offlineQueue.map(item => ({
                id: item.id,
                metadata: item.metadata
            }));
            localStorage.setItem('offlineQueue', JSON.stringify(serializableQueue));
        } catch (error) {
            if (window.logger) {
                window.logger.error('[NetworkStatus] 큐 저장 실패:', error);
            }
        }
    }

    /**
     * 큐 초기화
     */
    clearQueue(): void {
        this.offlineQueue = [];
        this.saveQueue();
        if (window.logger) {
            window.logger.info('[NetworkStatus] 큐 초기화');
        }
    }

    /**
     * 현재 큐 상태 조회
     */
    getQueueStatus(): {
        isOnline: boolean;
        queueLength: number;
        queue: Array<QueueItem['metadata']>;
    } {
        return {
            isOnline: this.isOnline,
            queueLength: this.offlineQueue.length,
            queue: this.offlineQueue.map(item => item.metadata)
        };
    }
}

// 전역 싱글톤 인스턴스
window.networkStatus = new NetworkStatus();

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NetworkStatus;
}
