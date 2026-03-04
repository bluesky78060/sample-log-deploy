/**
 * @fileoverview 통일된 에러 처리 시스템
 * @description 모든 에러를 일관되게 처리하여 사용자 피드백 + 로깅 제공
 */

class ErrorHandler {
    /**
     * 에러 처리 (로깅 + 사용자 피드백)
     * @param {Error} error - 발생한 에러
     * @param {string} context - 에러 컨텍스트 (예: 'FILE_WRITE', 'NETWORK')
     * @param {Object} options - 옵션
     * @param {boolean} options.silent - true면 토스트 알림 표시 안 함
     * @param {Function} options.retry - 재시도 콜백
     * @param {*} options.fallback - 에러 시 반환할 기본값
     * @param {boolean} options.showRetryButton - true면 토스트에 재시도 버튼 표시
     * @returns {*} retry 실행 결과 또는 fallback 값
     */
    static handle(error, context, options = {}) {
        const {
            silent = false,
            retry = null,
            fallback = null,
            showRetryButton = true  // 기본값: 재시도 버튼 표시
        } = options;

        // 1. 로거로 에러 기록 (window.logger 사용)
        if (window.logger) {
            window.logger.error(`[${context}]`, error);
        } else {
            console.error(`[${context}]`, error);
        }

        // 2. 사용자 피드백 (토스트)
        if (!silent && window.showToast) {
            const message = this.getUserMessage(error, context);

            // 재시도 가능한 경우 액션 버튼 추가
            if (showRetryButton && retry && typeof retry === 'function') {
                window.showToast(message, 'error', {
                    duration: 5000,  // 재시도 버튼이 있으면 더 오래 표시
                    actionLabel: '다시 시도',
                    action: () => {
                        try {
                            retry();
                        } catch (retryError) {
                            ErrorHandler.handle(retryError, context, {
                                ...options,
                                showRetryButton: false  // 재시도 실패 시 버튼 표시 안 함
                            });
                        }
                    }
                });
            } else {
                window.showToast(message, 'error');
            }
        }

        // 3. 재시도 콜백 실행 (버튼이 아닌 즉시 실행)
        if (!showRetryButton && retry && typeof retry === 'function') {
            try {
                return retry();
            } catch (retryError) {
                if (window.logger) {
                    window.logger.error(`[${context}] 재시도 실패:`, retryError);
                } else {
                    console.error(`[${context}] 재시도 실패:`, retryError);
                }
            }
        }

        // 4. 폴백 값 반환
        return fallback;
    }

    /**
     * 에러 컨텍스트별 사용자 친화적 메시지 생성
     * @param {Error} error - 에러 객체
     * @param {string} context - 에러 컨텍스트
     * @returns {string} 한국어 에러 메시지
     */
    static getUserMessage(error, context) {
        const messages = {
            'NETWORK': '네트워크 연결을 확인해주세요.',
            'FILE_READ': '파일을 읽을 수 없습니다.',
            'FILE_WRITE': '파일 저장에 실패했습니다.',
            'FIREBASE_SYNC': '클라우드 동기화에 실패했습니다. 로컬에 저장됩니다.',
            'FIREBASE_LOAD': '클라우드 데이터를 불러올 수 없습니다.',
            'VALIDATION': '입력값을 확인해주세요.',
            'ENCRYPTION': '암호화 처리 중 오류가 발생했습니다.',
            'DECRYPTION': '복호화에 실패했습니다. 비밀번호를 확인해주세요.',
            'PERMISSION': '권한이 없습니다.',
            'UNKNOWN': '오류가 발생했습니다.'
        };

        return messages[context] || messages['UNKNOWN'];
    }

    /**
     * 비동기 작업을 try-catch로 감싸서 실행
     * @param {Function} asyncFn - 비동기 함수
     * @param {string} context - 에러 컨텍스트
     * @param {Object} options - handle() 옵션
     * @returns {Promise<*>} 결과 또는 fallback
     */
    static async wrap(asyncFn, context, options = {}) {
        try {
            return await asyncFn();
        } catch (error) {
            return this.handle(error, context, options);
        }
    }
}

// 전역으로 내보내기
window.ErrorHandler = ErrorHandler;

// CommonJS export (Electron main process용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
