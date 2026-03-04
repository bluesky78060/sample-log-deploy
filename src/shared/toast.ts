// ========================================
// 공통 Toast 알림 모듈
// ========================================

export {};

interface ToastOptions {
    duration?: number;
    actionLabel?: string;
    action?: () => void;
    persistent?: boolean;
}

/** Toast notification type */
type ToastTypeLocal = 'success' | 'error' | 'warning' | 'info';

(function() {
    'use strict';

    // 상수 참조 (constants.js에서 로드)
    const TIMER = (window as Window & { TIMER?: { TOAST_DURATION?: number; TOAST_FADE_OUT?: number } }).TIMER;
    const TOAST_DURATION = TIMER?.TOAST_DURATION || 3000;
    const TOAST_FADE_OUT = TIMER?.TOAST_FADE_OUT || 300;

    /**
     * 메시지 내용으로 타입 자동 감지
     * @param message - 메시지
     * @returns 타입 (success, error, warning, info)
     */
    function autoDetectType(message: string): ToastTypeLocal {
        const msg = message.toLowerCase();

        // 에러 키워드
        if (msg.includes('실패') || msg.includes('오류') || msg.includes('에러') ||
            msg.includes('올바르지') || msg.includes('불가') || msg.includes('없습니다') ||
            msg.includes('초과') || msg.includes('불일치')) {
            return 'error';
        }

        // 경고 키워드
        if (msg.includes('확인') || msg.includes('선택') || msg.includes('차단') ||
            msg.includes('지원하지') || msg.includes('필요합니다') || msg.includes('새로고침')) {
            return 'warning';
        }

        // 성공 키워드
        if (msg.includes('완료') || msg.includes('성공') || msg.includes('저장') ||
            msg.includes('활성화') || msg.includes('연결') || msg.includes('등록')) {
            return 'success';
        }

        // 기본값
        return 'info';
    }

    /**
     * Toast 알림 표시
     * @param message - 표시할 메시지
     * @param type - 타입 (success, error, warning, info). 생략 시 자동 감지
     * @param durationOrOptions - 표시 시간(ms) 또는 옵션 객체
     */
    function showToast(
        message: string,
        type?: ToastTypeLocal | null,
        durationOrOptions: number | ToastOptions = TOAST_DURATION
    ): void {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }

        // 옵션 파싱
        let duration = TOAST_DURATION;
        let actionLabel: string | null = null;
        let action: (() => void) | null = null;
        let persistent = false;

        if (typeof durationOrOptions === 'object') {
            duration = durationOrOptions.duration || TOAST_DURATION;
            actionLabel = durationOrOptions.actionLabel || null;
            action = durationOrOptions.action || null;
            persistent = durationOrOptions.persistent || false;
        } else if (typeof durationOrOptions === 'number') {
            duration = durationOrOptions;
        }

        // 타입이 없으면 자동 감지
        if (!type) {
            type = autoDetectType(message);
        }

        const icons: Record<ToastTypeLocal, string> = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // 아이콘
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icons[type] || icons.success;
        toast.appendChild(iconSpan);

        // 메시지
        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;
        toast.appendChild(messageSpan);

        // 액션 버튼 (있는 경우)
        if (actionLabel && action && typeof action === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'toast-action';
            actionBtn.textContent = actionLabel;
            actionBtn.onclick = (e) => {
                e.stopPropagation();
                try {
                    action();
                } catch (error) {
                    console.error('[Toast] Action error:', error);
                }
                toast.remove();
            };
            toast.appendChild(actionBtn);
        }

        // 닫기 버튼 (persistent이거나 액션이 있는 경우)
        if (persistent || (actionLabel && action)) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '×';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                toast.remove();
            };
            toast.appendChild(closeBtn);
        }

        container.appendChild(toast);

        // 자동 제거 (persistent가 아닌 경우)
        if (!persistent) {
            setTimeout(() => {
                toast.style.animation = `toastIn ${TOAST_FADE_OUT}ms ease reverse`;
                setTimeout(() => toast.remove(), TOAST_FADE_OUT);
            }, duration);
        }
    }

    // 전역으로 내보내기
    (window as Window & { showToast?: typeof showToast }).showToast = showToast;
})();
