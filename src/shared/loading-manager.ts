/**
 * @fileoverview 로딩 상태 관리 모듈
 * @description 비동기 작업의 로딩 상태를 시각적으로 표시
 */

interface LoadingOperation {
    message: string;
    onCancel: (() => void) | null;
    showProgress: boolean;
    progress: number;
}

interface LoadingOptions {
    cancellable?: boolean;
    onCancel?: (() => void) | null;
    showProgress?: boolean;
}

interface OperationStatus {
    id: string;
    message: string;
    progress: number;
    cancellable: boolean;
}

interface LoadingStatus {
    activeCount: number;
    operations: OperationStatus[];
}

class LoadingManager {
    private activeOperations: Map<string, LoadingOperation>;
    private overlay: HTMLDivElement;

    constructor() {
        this.activeOperations = new Map();  // 현재 진행 중인 작업들
        this.overlay = null!; // createOverlay에서 초기화됨
        this.createOverlay();
    }

    /**
     * 로딩 오버레이 DOM 생성
     */
    createOverlay(): void {
        // 이미 존재하면 제거
        const existing = document.getElementById('loadingOverlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'loadingOverlay';
        this.overlay.className = 'loading-overlay';

        this.overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-message">처리 중...</p>
                <div class="loading-progress-container hidden">
                    <div class="loading-progress-bar">
                        <div class="loading-progress-fill"></div>
                    </div>
                    <span class="loading-progress-text">0%</span>
                </div>
                <button class="loading-cancel hidden">취소</button>
            </div>
        `;

        document.body.appendChild(this.overlay);
    }

    /**
     * 로딩 시작
     * @param {string} operationId - 작업 고유 ID
     * @param {string} message - 표시할 메시지
     * @param {Object} options - 옵션
     * @param {boolean} options.cancellable - 취소 가능 여부
     * @param {Function} options.onCancel - 취소 콜백
     * @param {boolean} options.showProgress - 진행률 표시 여부
     */
    show(operationId: string, message: string, options: LoadingOptions = {}): void {
        const {
            cancellable = false,
            onCancel = null,
            showProgress = false
        } = options;

        // 작업 등록
        this.activeOperations.set(operationId, {
            message,
            onCancel,
            showProgress,
            progress: 0
        });

        // UI 업데이트
        this.updateUI();
    }

    /**
     * 로딩 종료
     * @param {string} operationId - 작업 고유 ID
     */
    hide(operationId: string): void {
        this.activeOperations.delete(operationId);
        this.updateUI();
    }

    /**
     * 진행률 업데이트
     * @param {string} operationId - 작업 고유 ID
     * @param {number} progress - 진행률 (0-100)
     * @param {string} message - 업데이트할 메시지 (선택적)
     */
    updateProgress(operationId: string, progress: number, message: string | null = null): void {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.progress = Math.min(100, Math.max(0, progress));
        if (message) operation.message = message;

        this.updateUI();
    }

    /**
     * 메시지만 업데이트
     * @param {string} operationId - 작업 고유 ID
     * @param {string} message - 새 메시지
     */
    updateMessage(operationId: string, message: string): void {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.message = message;
        this.updateUI();
    }

    /**
     * UI 업데이트 (내부 메서드)
     */
    private updateUI(): void {
        // 활성 작업이 없으면 오버레이 숨기기
        if (this.activeOperations.size === 0) {
            this.overlay.classList.remove('visible');
            return;
        }

        // 첫 번째 작업의 정보 표시 (여러 작업이 있어도 하나만 표시)
        const firstOperation = Array.from(this.activeOperations.values())[0];
        const firstId = Array.from(this.activeOperations.keys())[0];

        // 메시지 업데이트
        const messageEl = this.overlay.querySelector('.loading-message') as HTMLElement;
        messageEl.textContent = firstOperation.message;

        // 진행률 표시
        const progressContainer = this.overlay.querySelector('.loading-progress-container') as HTMLElement;
        const progressFill = this.overlay.querySelector('.loading-progress-fill') as HTMLElement;
        const progressText = this.overlay.querySelector('.loading-progress-text') as HTMLElement;

        if (firstOperation.showProgress) {
            progressContainer.classList.remove('hidden');
            progressFill.style.width = `${firstOperation.progress}%`;
            progressText.textContent = `${Math.round(firstOperation.progress)}%`;
        } else {
            progressContainer.classList.add('hidden');
        }

        // 취소 버튼
        const cancelBtn = this.overlay.querySelector('.loading-cancel') as HTMLButtonElement;
        if (firstOperation.onCancel && typeof firstOperation.onCancel === 'function') {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => {
                firstOperation.onCancel!();
                this.hide(firstId);
            };
        } else {
            cancelBtn.classList.add('hidden');
        }

        // 오버레이 표시
        this.overlay.classList.add('visible');
    }

    /**
     * 모든 작업 취소
     */
    cancelAll(): void {
        this.activeOperations.forEach((operation, operationId) => {
            if (operation.onCancel) {
                try {
                    operation.onCancel();
                } catch (error) {
                    console.error('[LoadingManager] Cancel error:', error);
                }
            }
        });
        this.activeOperations.clear();
        this.updateUI();
    }

    /**
     * 현재 상태 조회
     */
    getStatus(): LoadingStatus {
        return {
            activeCount: this.activeOperations.size,
            operations: Array.from(this.activeOperations.entries()).map(([id, op]) => ({
                id,
                message: op.message,
                progress: op.progress,
                cancellable: !!op.onCancel
            }))
        };
    }
}

// 전역 타입 확장
declare global {
    interface Window {
        loadingManager: LoadingManager;
    }
}

// 전역 싱글톤 인스턴스
window.loadingManager = new LoadingManager();

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}

export default LoadingManager;
