/**
 * @fileoverview 공통 상수 정의 - TypeScript
 * @description 매직 넘버를 의미 있는 상수로 관리
 */

// ========================================
// 타입 정의
// ========================================

export interface PaginationConfig {
    DEFAULT_ITEMS_PER_PAGE: number;
    MIN_ITEMS_PER_PAGE: number;
    MAX_ITEMS_PER_PAGE: number;
    PAGE_NUMBER_DISPLAY_COUNT: number;
}

export interface TimerConfig {
    TOAST_DURATION: number;
    TOAST_FADE_OUT: number;
    DEBOUNCE_DELAY: number;
    AUTO_SAVE_DELAY: number;
    UI_INIT_DELAY: number;
    ANIMATION_DURATION: number;
    AUTOCOMPLETE_DELAY: number;
}

export interface AutocompleteConfig {
    MAX_SUGGESTIONS: number;
    MIN_INPUT_LENGTH: number;
}

export interface StorageConfig {
    LOCAL_STORAGE_LIMIT_MB: number;
    LOCAL_STORAGE_LIMIT_BYTES: number;
    WARNING_THRESHOLD_PERCENT: number;
}

export interface FileConfig {
    JSON_VERSION: string;
    EXCEL_SHEET_NAME: string;
    MAX_EXPORT_ROWS: number;
}

export interface ValidationConfig {
    PHONE_MAX_LENGTH: number;
    RECEIPT_NUMBER_LENGTH: number;
    ZIPCODE_LENGTH: number;
    MIN_NAME_LENGTH: number;
    MAX_NAME_LENGTH: number;
    MAX_ADDRESS_LENGTH: number;
    MAX_NOTE_LENGTH: number;
}

export interface YearConfig {
    MIN_YEAR: number;
    MAX_YEAR_OFFSET: number;
}

export interface SampleTypeCodeConfig {
    SOIL: string;
    WATER: string;
    COMPOST: string;
    HEAVY_METAL: string;
    PESTICIDE: string;
}

export interface SampleTypeNameConfig {
    soil: string;
    water: string;
    compost: string;
    heavyMetal: string;
    pesticide: string;
}

export interface StorageKeyPrefixConfig {
    soil: string;
    water: string;
    compost: string;
    heavyMetal: string;
    pesticide: string;
}

export interface ReceptionMethodConfig {
    VISIT: string;
    MAIL: string;
    FAX: string;
}

export interface ApplicantTypeConfig {
    INDIVIDUAL: string;
    CORPORATION: string;
}

export interface AppConstants {
    DEBUG: boolean;
    APP_VERSION: string;
    PAGINATION: PaginationConfig;
    TIMER: TimerConfig;
    AUTOCOMPLETE: AutocompleteConfig;
    STORAGE: StorageConfig;
    FILE: FileConfig;
    VALIDATION: ValidationConfig;
    YEAR: YearConfig;
    SAMPLE_TYPE_CODE: SampleTypeCodeConfig;
    SAMPLE_TYPE_NAME: SampleTypeNameConfig;
    STORAGE_KEY_PREFIX: StorageKeyPrefixConfig;
    RECEPTION_METHOD: ReceptionMethodConfig;
    APPLICANT_TYPE: ApplicantTypeConfig;
}

// ========================================
// 상수 정의
// ========================================

/**
 * DEBUG 모드 설정
 * - 개발 환경에서만 활성화
 * - localStorage에서 DEBUG_MODE=true로 수동 활성화 가능
 */
export const DEBUG: boolean = (() => {
    // Node.js 환경 (Electron main process)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.NODE_ENV === 'development') return true;
    }

    // 브라우저 환경
    if (typeof localStorage !== 'undefined') {
        if (localStorage.getItem('DEBUG_MODE') === 'true') return true;
    }

    // 기본값: false (프로덕션)
    return false;
})();

/**
 * 앱 버전
 */
export const APP_VERSION: string = '1.10.0';

/**
 * 페이지네이션 관련 상수
 */
export const PAGINATION: PaginationConfig = {
    DEFAULT_ITEMS_PER_PAGE: 100,
    MIN_ITEMS_PER_PAGE: 10,
    MAX_ITEMS_PER_PAGE: 500,
    PAGE_NUMBER_DISPLAY_COUNT: 5
};

/**
 * UI 타이머 관련 상수 (ms)
 */
export const TIMER: TimerConfig = {
    TOAST_DURATION: 3000,
    TOAST_FADE_OUT: 300,
    DEBOUNCE_DELAY: 300,
    AUTO_SAVE_DELAY: 1000,
    UI_INIT_DELAY: 500,
    ANIMATION_DURATION: 300,
    AUTOCOMPLETE_DELAY: 200
};

/**
 * 자동완성 관련 상수
 */
export const AUTOCOMPLETE: AutocompleteConfig = {
    MAX_SUGGESTIONS: 50,
    MIN_INPUT_LENGTH: 1
};

/**
 * 저장소 관련 상수
 */
export const STORAGE: StorageConfig = {
    LOCAL_STORAGE_LIMIT_MB: 5,
    LOCAL_STORAGE_LIMIT_BYTES: 5 * 1024 * 1024,
    WARNING_THRESHOLD_PERCENT: 80
};

/**
 * 파일 관련 상수
 */
export const FILE: FileConfig = {
    JSON_VERSION: '2.0',
    EXCEL_SHEET_NAME: '시료접수대장',
    MAX_EXPORT_ROWS: 10000
};

/**
 * 유효성 검사 관련 상수
 */
export const VALIDATION: ValidationConfig = {
    PHONE_MAX_LENGTH: 13,
    RECEIPT_NUMBER_LENGTH: 4,
    ZIPCODE_LENGTH: 5,
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 50,
    MAX_ADDRESS_LENGTH: 200,
    MAX_NOTE_LENGTH: 500
};

/**
 * 연도 관련 상수
 */
export const YEAR: YearConfig = {
    MIN_YEAR: 2020,
    MAX_YEAR_OFFSET: 1  // 현재 연도 + 1년까지 허용
};

/**
 * 시료 타입 코드
 */
export const SAMPLE_TYPE_CODE: SampleTypeCodeConfig = {
    SOIL: 'soil',
    WATER: 'water',
    COMPOST: 'compost',
    HEAVY_METAL: 'heavyMetal',
    PESTICIDE: 'pesticide'
};

/**
 * 시료 타입 한글명
 */
export const SAMPLE_TYPE_NAME: SampleTypeNameConfig = {
    soil: '토양',
    water: '수질분석',
    compost: '퇴·액비',
    heavyMetal: '토양 중금속',
    pesticide: '잔류농약'
};

/**
 * localStorage 키 접두사
 */
export const STORAGE_KEY_PREFIX: StorageKeyPrefixConfig = {
    soil: 'soilSampleLogs',
    water: 'waterSampleLogs',
    compost: 'compostSampleLogs',
    heavyMetal: 'heavyMetalSampleLogs',
    pesticide: 'pesticideSampleLogs'
};

/**
 * 수령 방법 옵션
 */
export const RECEPTION_METHOD: ReceptionMethodConfig = {
    VISIT: '방문수령',
    MAIL: '우편',
    FAX: 'FAX'
};

/**
 * 신청인 유형
 */
export const APPLICANT_TYPE: ApplicantTypeConfig = {
    INDIVIDUAL: '개인',
    CORPORATION: '법인'
};

// ========================================
// Window 전역 할당
// ========================================

// 전역으로 내보내기 (타입 충돌 방지를 위해 as any 사용)
(window as any).APP_CONSTANTS = {
    DEBUG,
    APP_VERSION,
    PAGINATION,
    TIMER,
    AUTOCOMPLETE,
    STORAGE,
    FILE,
    VALIDATION,
    YEAR,
    SAMPLE_TYPE_CODE,
    SAMPLE_TYPE_NAME,
    STORAGE_KEY_PREFIX,
    RECEPTION_METHOD,
    APPLICANT_TYPE
};

// 개별 상수도 전역으로 내보내기 (기존 코드 호환성)
(window as any).DEBUG = DEBUG;
(window as any).APP_VERSION = APP_VERSION;
(window as any).PAGINATION = PAGINATION;
(window as any).TIMER = TIMER;
(window as any).AUTOCOMPLETE = AUTOCOMPLETE;
(window as any).STORAGE = STORAGE;
(window as any).FILE = FILE;
(window as any).VALIDATION = VALIDATION;
(window as any).YEAR = YEAR;
(window as any).SAMPLE_TYPE_CODE = SAMPLE_TYPE_CODE;
(window as any).SAMPLE_TYPE_NAME = SAMPLE_TYPE_NAME;
(window as any).STORAGE_KEY_PREFIX = STORAGE_KEY_PREFIX;
(window as any).RECEPTION_METHOD = RECEPTION_METHOD;
(window as any).APPLICANT_TYPE = APPLICANT_TYPE;
