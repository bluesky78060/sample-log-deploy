// ========================================
// Event Delegator
// 이벤트 위임 유틸리티
// ========================================

/**
 * 이벤트 위임을 통해 동적 요소의 이벤트를 효율적으로 처리
 * 메모리 누수 방지 및 성능 개선
 */
class EventDelegator {
    /**
     * @param {HTMLElement} container - 이벤트를 위임받을 컨테이너 요소
     */
    constructor(container) {
        this.container = container;
        this.handlers = new Map();
        this.boundHandlers = new Map();
    }

    /**
     * 이벤트 위임 등록
     * @param {string} eventType - 이벤트 타입 (click, change, input 등)
     * @param {string} selector - CSS 선택자
     * @param {Function} handler - 핸들러 함수 (event, target) => void
     */
    on(eventType, selector, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);

            // 바운드 핸들러 생성 및 저장 (나중에 제거하기 위함)
            const boundHandler = (e) => this.handleEvent(eventType, e);
            this.boundHandlers.set(eventType, boundHandler);
            this.container.addEventListener(eventType, boundHandler);
        }

        this.handlers.get(eventType).push({ selector, handler });
    }

    /**
     * 이벤트 위임 해제
     * @param {string} eventType - 이벤트 타입
     * @param {string} selector - CSS 선택자 (optional, 없으면 해당 타입 전체 해제)
     */
    off(eventType, selector = null) {
        if (!this.handlers.has(eventType)) return;

        if (selector === null) {
            // 해당 이벤트 타입 전체 해제
            this.handlers.delete(eventType);
            const boundHandler = this.boundHandlers.get(eventType);
            if (boundHandler) {
                this.container.removeEventListener(eventType, boundHandler);
                this.boundHandlers.delete(eventType);
            }
        } else {
            // 특정 선택자만 해제
            const handlers = this.handlers.get(eventType);
            const filtered = handlers.filter(h => h.selector !== selector);
            this.handlers.set(eventType, filtered);
        }
    }

    /**
     * 이벤트 처리
     * @private
     */
    handleEvent(eventType, event) {
        const handlers = this.handlers.get(eventType) || [];

        for (const { selector, handler } of handlers) {
            const target = event.target.closest(selector);
            if (target && this.container.contains(target)) {
                handler.call(target, event, target);
            }
        }
    }

    /**
     * 모든 이벤트 리스너 정리
     * 메모리 누수 방지를 위해 컴포넌트 언마운트 시 호출
     */
    destroy() {
        // 모든 이벤트 리스너 제거
        for (const [eventType, boundHandler] of this.boundHandlers) {
            this.container.removeEventListener(eventType, boundHandler);
        }

        this.handlers.clear();
        this.boundHandlers.clear();
    }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventDelegator;
} else {
    window.EventDelegator = EventDelegator;
}
