// ========================================
// 공통 검색/필터 모듈
// 테이블 데이터 필터링 및 검색 기능
// ========================================

/** 날짜 범위 필터 타입 */
export interface DateRangeFilter {
    from?: string;
    to?: string;
}

/** 필터 값 타입 (문자열, 배열, 날짜 범위) */
export type FilterValue = string | number | string[] | DateRangeFilter | null | undefined;

/** 필터 조건 객체 타입 */
export type Filters = Record<string, FilterValue>;

/** 데이터 항목 타입 */
export type DataItem = Record<string, unknown>;

/** 검색 필터 옵션 */
export interface SearchFilterOptions {
    searchFields?: string[];
}

/** 복합 필터 및 검색 옵션 */
export interface FilterAndSearchOptions {
    searchTerm?: string;
    searchFields?: string[];
    filters?: Filters;
}

/** 검색 필터 인스턴스 인터페이스 */
export interface SearchFilterInstance {
    matchesText: (text: unknown, searchTerm: string) => boolean;
    matchesDateRange: (dateStr: unknown, fromDate?: string, toDate?: string) => boolean;
    matchesExact: (value: unknown, filterValue: unknown) => boolean;
    matchesIn: (value: unknown, filterValues: unknown[] | null | undefined) => boolean;
    filterData: <T extends DataItem>(data: T[], filters: Filters) => T[];
    searchData: <T extends DataItem>(data: T[], searchTerm: string, fields?: string[]) => T[];
    filterAndSearch: <T extends DataItem>(data: T[], options?: FilterAndSearchOptions) => T[];
}

/** SearchFilter 네임스페이스 타입 */
export interface SearchFilterNamespace {
    create: (options?: SearchFilterOptions) => SearchFilterInstance;
    setupDebounce: (input: HTMLInputElement | null, callback: (value: string) => void, delay?: number) => void;
    setupReset: (resetBtn: HTMLElement | null, inputs: (HTMLInputElement | null)[], callback?: () => void) => void;
    highlight: (text: unknown, searchTerm: string) => string;
}

/**
 * 검색 필터 생성기
 * @param options - 설정 옵션
 * @returns 필터 유틸리티 객체
 */
function createSearchFilter(options: SearchFilterOptions = {}): SearchFilterInstance {
    const { searchFields = ['name', 'address', 'phone'] } = options;

    /**
     * 텍스트 검색 (대소문자 무시)
     * @param text - 검색 대상 텍스트
     * @param searchTerm - 검색어
     * @returns 매칭 여부
     */
    function matchesText(text: unknown, searchTerm: string): boolean {
        if (!searchTerm) return true;
        if (!text) return false;
        return String(text).toLowerCase().includes(searchTerm.toLowerCase());
    }

    /**
     * 날짜 범위 검색
     * @param dateStr - 검색 대상 날짜 문자열
     * @param fromDate - 시작 날짜 (YYYY-MM-DD)
     * @param toDate - 종료 날짜 (YYYY-MM-DD)
     * @returns 범위 내 여부
     */
    function matchesDateRange(dateStr: unknown, fromDate?: string, toDate?: string): boolean {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return false;

        const date = new Date(String(dateStr));
        if (isNaN(date.getTime())) return false;

        if (fromDate && new Date(fromDate) > date) return false;
        if (toDate && new Date(toDate) < date) return false;

        return true;
    }

    /**
     * 정확한 값 매칭
     * @param value - 검색 대상 값
     * @param filterValue - 필터 값
     * @returns 매칭 여부
     */
    function matchesExact(value: unknown, filterValue: unknown): boolean {
        if (filterValue === null || filterValue === undefined || filterValue === '') return true;
        return String(value) === String(filterValue);
    }

    /**
     * 배열 내 포함 여부
     * @param value - 검색 대상 값
     * @param filterValues - 필터 값 배열
     * @returns 포함 여부
     */
    function matchesIn(value: unknown, filterValues: unknown[] | null | undefined): boolean {
        if (!filterValues || filterValues.length === 0) return true;
        return filterValues.includes(value);
    }

    /**
     * 데이터 필터링
     * @param data - 필터링할 데이터 배열
     * @param filters - 필터 조건 객체
     * @returns 필터링된 데이터
     */
    function filterData<T extends DataItem>(data: T[], filters: Filters): T[] {
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
                        const rangeFilter = filter as DateRangeFilter;
                        if (!matchesDateRange(value, rangeFilter.from, rangeFilter.to)) {
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
                    if (!matchesText(value, String(filter))) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    /**
     * 다중 필드 텍스트 검색
     * @param data - 검색할 데이터 배열
     * @param searchTerm - 검색어
     * @param fields - 검색 대상 필드 목록 (기본값: searchFields)
     * @returns 검색 결과
     */
    function searchData<T extends DataItem>(data: T[], searchTerm: string, fields: string[] = searchFields): T[] {
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
     * @param data - 데이터 배열
     * @param options - 필터 옵션
     * @returns 필터링된 데이터
     */
    function filterAndSearch<T extends DataItem>(data: T[], options: FilterAndSearchOptions = {}): T[] {
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
 * @param input - 검색 입력 요소
 * @param callback - 검색 콜백 함수
 * @param delay - 디바운스 지연 시간 (ms)
 */
function setupSearchDebounce(input: HTMLInputElement | null, callback: (value: string) => void, delay: number = window.TIMER?.DEBOUNCE_DELAY || 300): void {
    if (!input) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    input.addEventListener('input', (e: Event) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            callback((e.target as HTMLInputElement).value);
        }, delay);
    });

    // Enter 키 즉시 검색
    input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            callback((e.target as HTMLInputElement).value);
        }
    });
}

/**
 * 검색 초기화 버튼 설정
 * @param resetBtn - 초기화 버튼
 * @param inputs - 초기화할 입력 요소 배열
 * @param callback - 초기화 후 콜백
 */
function setupSearchReset(resetBtn: HTMLElement | null, inputs: (HTMLInputElement | null)[], callback?: () => void): void {
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
 * @param text - 원본 텍스트
 * @param searchTerm - 검색어
 * @returns 하이라이트된 HTML
 */
function highlightSearchTerm(text: unknown, searchTerm: string): string {
    if (!searchTerm || !text) return window.escapeHTML ? window.escapeHTML(String(text || '')) : String(text || '');

    const safeText = window.escapeHTML ? window.escapeHTML(String(text)) : String(text);
    const safeTermForRegex = window.escapeHTML
        ? window.escapeHTML(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeTermForRegex})`, 'gi');
    return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 전역으로 내보내기 (타입 충돌 방지를 위해 as any 사용)
(window as any).SearchFilter = {
    create: createSearchFilter,
    setupDebounce: setupSearchDebounce,
    setupReset: setupSearchReset,
    highlight: highlightSearchTerm
};

// ES 모듈 export
export { createSearchFilter, setupSearchDebounce, setupSearchReset, highlightSearchTerm };
