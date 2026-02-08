// ========================================
// 경로 보안 유틸리티
// Path Traversal 및 기타 경로 관련 보안 취약점 방지
// ========================================

/**
 * 경로 보안 검증 유틸리티
 */
const PathSecurity = {
    /**
     * 위험한 경로 패턴 검사
     * @param {string} path - 검사할 경로
     * @returns {{safe: boolean, reason?: string}}
     */
    checkDangerousPatterns(path) {
        if (!path || typeof path !== 'string') {
            return { safe: false, reason: '유효하지 않은 경로입니다.' };
        }

        // Null 바이트 검사
        if (path.includes('\0')) {
            return { safe: false, reason: 'Null 바이트가 포함된 경로입니다.' };
        }

        // 상대 경로 패턴 검사
        const dangerousPatterns = [
            '../',
            '..\\',
            '..%2F',
            '..%5C',
            '%2e%2e%2f',
            '%2e%2e%5c',
            '..%252f',
            '..%255c'
        ];

        for (const pattern of dangerousPatterns) {
            if (path.toLowerCase().includes(pattern.toLowerCase())) {
                return { safe: false, reason: '상대 경로 패턴이 감지되었습니다.' };
            }
        }

        // URL 인코딩된 위험 문자 검사
        if (/%[0-9a-fA-F]{2}/.test(path)) {
            // URL 디코딩 후 재검사
            try {
                const decoded = decodeURIComponent(path);
                if (decoded !== path) {
                    // 디코딩된 경로로 재귀적으로 검사
                    return this.checkDangerousPatterns(decoded);
                }
            } catch (e) {
                return { safe: false, reason: '잘못된 URL 인코딩이 포함되어 있습니다.' };
            }
        }

        // 절대 경로로 시작하는 Windows 네트워크 경로 차단
        if (/^\\\\/.test(path)) {
            return { safe: false, reason: '네트워크 경로는 허용되지 않습니다.' };
        }

        return { safe: true };
    },

    /**
     * 파일명 유효성 검사
     * @param {string} filename - 검사할 파일명
     * @returns {{valid: boolean, reason?: string}}
     */
    validateFilename(filename) {
        if (!filename) {
            return { valid: false, reason: '파일명이 비어있습니다.' };
        }

        // 예약된 파일명 (Windows)
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];

        const nameWithoutExt = filename.split('.')[0].toUpperCase();
        if (reservedNames.includes(nameWithoutExt)) {
            return { valid: false, reason: '시스템 예약 파일명입니다.' };
        }

        // 허용되지 않는 문자
        const invalidChars = /[<>:"|?*\x00-\x1f]/;
        if (invalidChars.test(filename)) {
            return { valid: false, reason: '파일명에 허용되지 않은 문자가 포함되어 있습니다.' };
        }

        // 파일명 길이 제한
        if (filename.length > 255) {
            return { valid: false, reason: '파일명이 너무 깁니다 (최대 255자).' };
        }

        // 점으로만 구성된 파일명 차단
        if (/^\.+$/.test(filename)) {
            return { valid: false, reason: '유효하지 않은 파일명입니다.' };
        }

        return { valid: true };
    },

    /**
     * 경로 정규화 (렌더러 프로세스용)
     * @param {string} inputPath - 입력 경로
     * @returns {string} 정규화된 경로
     */
    normalizePath(inputPath) {
        if (!inputPath) return '';

        // 백슬래시를 슬래시로 통일
        let normalized = inputPath.replace(/\\/g, '/');

        // 연속된 슬래시 제거
        normalized = normalized.replace(/\/+/g, '/');

        // 끝의 슬래시 제거 (루트가 아닌 경우)
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    },

    /**
     * 허용된 확장자 검사
     * @param {string} filename - 파일명
     * @param {string[]} allowedExtensions - 허용된 확장자 목록
     * @returns {boolean}
     */
    checkAllowedExtension(filename, allowedExtensions) {
        if (!allowedExtensions || allowedExtensions.length === 0) {
            return true; // 제한 없음
        }

        const ext = filename.split('.').pop().toLowerCase();
        return allowedExtensions.includes(ext);
    },

    /**
     * 안전한 경로 조합 (렌더러 프로세스용)
     * @param {...string} parts - 경로 구성 요소들
     * @returns {string} 조합된 경로
     */
    safejoin(...parts) {
        const filtered = parts.filter(part => {
            if (!part || typeof part !== 'string') return false;
            const check = this.checkDangerousPatterns(part);
            return check.safe;
        });

        return this.normalizePath(filtered.join('/'));
    }
};

// CommonJS 스타일로 내보내기 (브라우저 호환성)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathSecurity;
} else {
    window.PathSecurity = PathSecurity;
}