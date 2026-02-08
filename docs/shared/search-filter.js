// ========================================
// 공통 검색/필터 모듈
// 테이블 데이터 필터링 및 검색 기능
// ========================================

/**
 * 검색 필터 생성기
 * @param {Object} options - 설정 옵션
 * @param {Array} options.searchFields - 검색 대상 필드 목록
 * @returns {Object} 필터 유틸리티 객체
 */
function createSearchFilter(options = {}) {
    const { searchFields = ['name', 'address', 'phone'] } = options;

    /**
     * 텍스트 검색 (대소문자 무시)
     * @param {string} text - 검색 대상 텍스트
     * @param {string} searchTerm - 검색어
     * @returns {boolean} 매칭 여부
     */
    function matchesText(text, searchTerm) {
        if (!searchTerm) return true;
        if (!text) return false;
        return String(text).toLowerCase().includes(searchTerm.toLowerCase());
    }

    /**
     * 날짜 범위 검색
     * @param {string} dateStr - 검색 대상 날짜 문자열
     * @param {string} fromDate - 시작 날짜 (YYYY-MM-DD)
     * @param {string} toDate - 종료 날짜 (YYYY-MM-DD)
     * @returns {boolean} 범위 내 여부
     */
    function matchesDateRange(dateStr, fromDate, toDate) {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return false;

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;

        if (fromDate && new Date(fromDate) > date) return false;
        if (toDate && new Date(toDate) < date) return false;

        return true;
    }

    /**
     * 정확한 값 매칭
     * @param {*} value - 검색 대상 값
     * @param {*} filterValue - 필터 값
     * @returns {boolean} 매칭 여부
     */
    function matchesExact(value, filterValue) {
        if (filterValue === null || filterValue === undefined || filterValue === '') return true;
        return String(value) === String(filterValue);
    }

    /**
     * 배열 내 포함 여부
     * @param {*} value - 검색 대상 값
     * @param {Array} filterValues - 필터 값 배열
     * @returns {boolean} 포함 여부
     */
    function matchesIn(value, filterValues) {
        if (!filterValues || filterValues.length === 0) return true;
        return filterValues.includes(value);
    }

    /**
     * 데이터 필터링
     * @param {Array} data - 필터링할 데이터 배열
     * @param {Object} filters - 필터 조건 객체
     * @returns {Array} 필터링된 데이터
     */
    function filterData(data, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }

        return data.filter(item => {
            for (const [key, filter] of Object.entries(filters)) {
                if (filter === null || filter === undefined || filter === '') continue;

                const value = item[key];

                // 필터 타입에 따른 처리
                if (typeof filter === 'object' && filter !== null) {
                    // 범위 필터 (from, to)
                    if ('from' in filter || 'to' in filter) {
                        if (!matchesDateRange(value, filter.from, filter.to)) {
                            return false;
                        }
                    }
                    // 배열 필터 (in)
                    else if (Array.isArray(filter)) {
                        if (!matchesIn(value, filter)) {
                            return false;
                        }
                    }
                } else {
                    // 텍스트 검색
                    if (!matchesText(value, filter)) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    /**
     * 다중 필드 텍스트 검색
     * @param {Array} data - 검색할 데이터 배열
     * @param {string} searchTerm - 검색어
     * @param {Array} fields - 검색 대상 필드 목록 (기본값: searchFields)
     * @returns {Array} 검색 결과
     */
    function searchData(data, searchTerm, fields = searchFields) {
        if (!searchTerm) return data;

        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (!value) return false;
                return String(value).toLowerCase().includes(term);
            });
        });
    }

    /**
     * 복합 필터 및 검색
     * @param {Array} data - 데이터 배열
     * @param {Object} options - 필터 옵션
     * @param {string} options.searchTerm - 검색어
     * @param {Array} options.searchFields - 검색 필드 (기본값: searchFields)
     * @param {Object} options.filters - 추가 필터 조건
     * @returns {Array} 필터링된 데이터
     */
    function filterAndSearch(data, options = {}) {
        const { searchTerm, searchFields: fields, filters } = options;

        let result = data;

        // 필터 적용
        if (filters) {
            result = filterData(result, filters);
        }

        // 검색 적용
        if (searchTerm) {
            result = searchData(result, searchTerm, fields);
        }

        return result;
    }

    return {
        matchesText,
        matchesDateRange,
        matchesExact,
        matchesIn,
        filterData,
        searchData,
        filterAndSearch
    };
}

/**
 * 검색 입력 디바운스 설정
 * @param {HTMLInputElement} input - 검색 입력 요소
 * @param {Function} callback - 검색 콜백 함수
 * @param {number} delay - 디바운스 지연 시간 (ms)
 */
function setupSearchDebounce(input, callback, delay = window.TIMER?.DEBOUNCE_DELAY || 300) {
    if (!input) return;

    let timeoutId = null;

    input.addEventListener('input', (e) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            callback(e.target.value);
        }, delay);
    });

    // Enter 키 즉시 검색
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            callback(e.target.value);
        }
    });
}

/**
 * 검색 초기화 버튼 설정
 * @param {HTMLElement} resetBtn - 초기화 버튼
 * @param {Array} inputs - 초기화할 입력 요소 배열
 * @param {Function} callback - 초기화 후 콜백
 */
function setupSearchReset(resetBtn, inputs, callback) {
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        inputs.forEach(input => {
            if (input) {
                input.value = '';
            }
        });
        if (callback) {
            callback();
        }
    });
}

/**
 * 검색 결과 하이라이트
 * @param {string} text - 원본 텍스트
 * @param {string} searchTerm - 검색어
 * @returns {string} 하이라이트된 HTML
 */
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text || '';

    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 전역으로 내보내기
window.SearchFilter = {
    create: createSearchFilter,
    setupDebounce: setupSearchDebounce,
    setupReset: setupSearchReset,
    highlight: highlightSearchTerm
};
