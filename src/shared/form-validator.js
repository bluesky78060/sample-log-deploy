// ========================================
// 공통 폼 유효성 검사 모듈
// 입력 값 검증 및 에러 메시지 처리
// ========================================

/**
 * 폼 유효성 검사기 생성
 * @param {Object} options - 설정 옵션
 * @returns {Object} 검증 유틸리티 객체
 */
function createFormValidator(options = {}) {
    const {
        showToast = window.showToast,
        errorClass = 'input-error',
        successClass = 'input-success'
    } = options;

    /**
     * 필수 값 검증
     * @param {*} value - 검증할 값
     * @param {string} fieldName - 필드명 (에러 메시지용)
     * @returns {Object} { valid: boolean, message: string }
     */
    function required(value, fieldName = '필드') {
        const isValid = value !== null && value !== undefined && String(value).trim() !== '';
        return {
            valid: isValid,
            message: isValid ? '' : `${fieldName}을(를) 입력해주세요.`
        };
    }

    /**
     * 최소 길이 검증
     * @param {string} value - 검증할 값
     * @param {number} minLength - 최소 길이
     * @param {string} fieldName - 필드명
     * @returns {Object} { valid: boolean, message: string }
     */
    function minLength(value, minLength, fieldName = '필드') {
        const len = String(value || '').length;
        const isValid = len >= minLength;
        return {
            valid: isValid,
            message: isValid ? '' : `${fieldName}은(는) ${minLength}자 이상이어야 합니다.`
        };
    }

    /**
     * 최대 길이 검증
     * @param {string} value - 검증할 값
     * @param {number} maxLength - 최대 길이
     * @param {string} fieldName - 필드명
     * @returns {Object} { valid: boolean, message: string }
     */
    function maxLength(value, maxLength, fieldName = '필드') {
        const len = String(value || '').length;
        const isValid = len <= maxLength;
        return {
            valid: isValid,
            message: isValid ? '' : `${fieldName}은(는) ${maxLength}자 이하여야 합니다.`
        };
    }

    /**
     * 전화번호 형식 검증
     * @param {string} value - 전화번호
     * @returns {Object} { valid: boolean, message: string }
     */
    function phoneNumber(value) {
        if (!value) return { valid: true, message: '' };

        // 숫자만 추출
        const numbers = String(value).replace(/[^\d]/g, '');
        const isValid = numbers.length >= 9 && numbers.length <= 11;
        return {
            valid: isValid,
            message: isValid ? '' : '올바른 전화번호 형식이 아닙니다.'
        };
    }

    /**
     * 우편번호 형식 검증
     * @param {string} value - 우편번호
     * @returns {Object} { valid: boolean, message: string }
     */
    function zipCode(value) {
        if (!value) return { valid: true, message: '' };

        const isValid = /^\d{5}$/.test(String(value).trim());
        return {
            valid: isValid,
            message: isValid ? '' : '우편번호는 5자리 숫자입니다.'
        };
    }

    /**
     * 날짜 형식 검증 (YYYY-MM-DD)
     * @param {string} value - 날짜 문자열
     * @param {string} fieldName - 필드명
     * @returns {Object} { valid: boolean, message: string }
     */
    function dateFormat(value, fieldName = '날짜') {
        if (!value) return { valid: true, message: '' };

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
            return { valid: false, message: `${fieldName} 형식이 올바르지 않습니다. (YYYY-MM-DD)` };
        }

        const date = new Date(value);
        const isValid = !isNaN(date.getTime());
        return {
            valid: isValid,
            message: isValid ? '' : `올바른 ${fieldName}을(를) 입력해주세요.`
        };
    }

    /**
     * 숫자 범위 검증
     * @param {number} value - 검증할 값
     * @param {number} min - 최소값
     * @param {number} max - 최대값
     * @param {string} fieldName - 필드명
     * @returns {Object} { valid: boolean, message: string }
     */
    function numberRange(value, min, max, fieldName = '값') {
        const num = Number(value);
        if (isNaN(num)) {
            return { valid: false, message: `${fieldName}은(는) 숫자여야 합니다.` };
        }

        const isValid = num >= min && num <= max;
        return {
            valid: isValid,
            message: isValid ? '' : `${fieldName}은(는) ${min}~${max} 범위여야 합니다.`
        };
    }

    /**
     * 생년월일 검증 (6자리 또는 8자리)
     * @param {string} value - 생년월일
     * @returns {Object} { valid: boolean, message: string }
     */
    function birthDate(value) {
        if (!value) return { valid: true, message: '' };

        const numbers = String(value).replace(/[^\d]/g, '');
        const isValid = numbers.length === 6 || numbers.length === 8;
        return {
            valid: isValid,
            message: isValid ? '' : '생년월일은 6자리(YYMMDD) 또는 8자리(YYYYMMDD)입니다.'
        };
    }

    /**
     * 법인번호 검증 (13자리)
     * @param {string} value - 법인번호
     * @returns {Object} { valid: boolean, message: string }
     */
    function corpNumber(value) {
        if (!value) return { valid: true, message: '' };

        const numbers = String(value).replace(/[^\d]/g, '');
        const isValid = numbers.length === 13;
        return {
            valid: isValid,
            message: isValid ? '' : '법인번호는 13자리 숫자입니다.'
        };
    }

    /**
     * 다중 검증 규칙 적용
     * @param {*} value - 검증할 값
     * @param {Array} rules - 검증 규칙 배열 [{ validator, params }]
     * @returns {Object} { valid: boolean, message: string }
     */
    function validate(value, rules) {
        for (const rule of rules) {
            const result = rule.validator(value, ...rule.params || []);
            if (!result.valid) {
                return result;
            }
        }
        return { valid: true, message: '' };
    }

    /**
     * 폼 전체 검증
     * @param {Object} formData - 폼 데이터 객체
     * @param {Object} validationRules - 필드별 검증 규칙
     * @returns {Object} { valid: boolean, errors: Object }
     */
    function validateForm(formData, validationRules) {
        const errors = {};
        let isFormValid = true;

        for (const [field, rules] of Object.entries(validationRules)) {
            const value = formData[field];
            const result = validate(value, rules);

            if (!result.valid) {
                errors[field] = result.message;
                isFormValid = false;
            }
        }

        return { valid: isFormValid, errors };
    }

    /**
     * 입력 요소에 에러 표시
     * @param {HTMLElement} input - 입력 요소
     * @param {string} message - 에러 메시지
     */
    function showInputError(input, message) {
        if (!input) return;

        input.classList.add(errorClass);
        input.classList.remove(successClass);

        // 기존 에러 메시지 제거
        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // 에러 메시지 표시
        if (message) {
            const errorEl = document.createElement('span');
            errorEl.className = 'error-message';
            errorEl.textContent = message;
            input.parentElement?.appendChild(errorEl);
        }
    }

    /**
     * 입력 요소 에러 제거
     * @param {HTMLElement} input - 입력 요소
     */
    function clearInputError(input) {
        if (!input) return;

        input.classList.remove(errorClass);

        const existingError = input.parentElement?.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * 폼 에러 표시 및 토스트 알림
     * @param {Object} errors - 에러 객체 { field: message }
     * @param {Object} inputMap - 입력 요소 맵 { field: HTMLElement }
     */
    function showFormErrors(errors, inputMap = {}) {
        const firstError = Object.values(errors)[0];
        if (firstError && showToast) {
            showToast(firstError, 'error');
        }

        for (const [field, message] of Object.entries(errors)) {
            const input = inputMap[field];
            if (input) {
                showInputError(input, message);
            }
        }
    }

    /**
     * 폼 에러 모두 제거
     * @param {Object} inputMap - 입력 요소 맵 { field: HTMLElement }
     */
    function clearFormErrors(inputMap) {
        for (const input of Object.values(inputMap)) {
            clearInputError(input);
        }
    }

    return {
        // 개별 검증기
        required,
        minLength,
        maxLength,
        phoneNumber,
        zipCode,
        dateFormat,
        numberRange,
        birthDate,
        corpNumber,

        // 복합 검증
        validate,
        validateForm,

        // UI 처리
        showInputError,
        clearInputError,
        showFormErrors,
        clearFormErrors
    };
}

// 전역으로 내보내기
window.FormValidator = {
    create: createFormValidator
};

// 기본 인스턴스 생성
window.formValidator = createFormValidator();
