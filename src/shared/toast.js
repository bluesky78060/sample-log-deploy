// ========================================
// 공통 Toast 알림 모듈
// ========================================
(function() {
    'use strict';

    // 상수 참조 (constants.js에서 로드)
    const TOAST_DURATION = window.TIMER?.TOAST_DURATION || 3000;
    const TOAST_FADE_OUT = window.TIMER?.TOAST_FADE_OUT || 300;

    /**
     * Toast 알림 표시
     * @param {string} message - 표시할 메시지
     * @param {string} type - 타입 (success, error, warning, info)
     * @param {number} duration - 표시 시간 (ms), 기본값 TOAST_DURATION
     */
    function showToast(message, type = 'success', duration = TOAST_DURATION) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // DOM API를 사용하여 안전하게 엘리먼트 생성
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icons[type] || icons.success;

        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;

        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);

        container.appendChild(toast);

        // 지정된 시간 후 자동 제거
        setTimeout(() => {
            toast.style.animation = `toastIn ${TOAST_FADE_OUT}ms ease reverse`;
            setTimeout(() => toast.remove(), TOAST_FADE_OUT);
        }, duration);
    }

    // 전역으로 내보내기
    window.showToast = showToast;
})();
