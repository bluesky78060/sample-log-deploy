/**
 * @fileoverview 엑셀 컬럼 헤더 → 접수 필드 자동 매핑 (순수 로직, DOM 비의존)
 *
 * 메인 프로젝트 `src/soil/soil-result-importer.js`의 매핑 로직을 TS로 포팅한다 (SAMPL-1-124).
 * 메인은 IIFE 안에서 `window.SoilResultImporter._fns`로 노출했으나, 이 프로젝트는 ESM이므로
 * 순수 로직만 별도 모듈로 분리해 모달 UI(soil-result-importer.ts)와 독립적으로 테스트한다.
 *
 * 기술센터마다 엑셀 컬럼명이 제각각이라 동의어를 폭넓게 등록하고,
 * 모든 (필드 × 컬럼) 쌍을 점수화한 뒤 greedy 1:1 할당으로 결정적 매핑을 만든다.
 */

/** 매핑 대상 접수 필드 정의 */
export interface TargetField {
    /** record 필드명 */
    key: string;
    /** 매핑 UI 표시명 */
    label: string;
    /** 미매핑을 허용하는 필드 */
    optional?: boolean;
    /** 경지구분1차='공익직불제'일 때 강조하는 필드 */
    gongik?: boolean;
    /** 자동 매핑용 헤더 키워드(정규화 전) */
    auto: string[];
}

/** 사전계산된 정규화 키워드 */
interface NormKeyword {
    nk: string;
    /** 영문/숫자 전용 키워드 — 2글자는 완전일치만 허용한다 */
    ascii: boolean;
}

/** 헤더 배열 → { 필드키: 컬럼인덱스 } */
export type ColumnMapping = Record<string, number>;

export const LAND_CLASS1_OPTIONS = [
    '개량제', '전략', '직불', '자체', '기타', '친환경',
    '유기농', '무농약', 'GAP', '농가의뢰', '대표필지', '공익직불제',
] as const;

export const LAND_CLASS1_DEFAULT = '농가의뢰';

/**
 * 매핑 대상 필드 (순서 = 매핑 UI 표시 순서 = 동점 시 우선순위).
 * 메인 `TARGET_FIELDS`와 키워드 목록이 일치해야 한다 — 한쪽만 고치면 두 프로젝트의
 * 매핑 결과가 갈린다.
 */
export const TARGET_FIELDS: TargetField[] = [
    {
        key: 'receptionNumber', label: '접수번호', optional: true,
        auto: ['접수번호', '접수no', '접수번호no', '번호', '연번', '순번', '일련번호', '관리번호', '정렬번호', 'no', 'num', 'seq', 'index', 'id'],
    },
    {
        key: 'name', label: '성명',
        auto: ['성명', '이름', '성함', '의뢰인', '의뢰자', '의뢰인명', '농가명', '농가', '경영체명', '농업인', '농업인명', '신청인', '신청자', '신청인명', '대표자', '대표자명', '경작자', '경작자명', '경작인', '민원인', '고객명', '고객', '토지소유자', '소유자', '소유자명', '재배자', 'name', 'farmer', 'applicant', 'owner'],
    },
    {
        key: 'phoneNumber', label: '연락처',
        auto: ['연락처', '전화', '전화번호', '휴대폰', '휴대폰번호', '핸드폰', '핸드폰번호', '휴대전화', '휴대전화번호', '연락전화', '연락번호', '핸펀', 'phone', 'tel', 'telephone', 'hp', 'mobile', 'cell', 'cellphone', 'contact'],
    },
    {
        key: 'lotAddress', label: '지번주소',
        auto: ['지번주소', '지번', '소재지', '소재지지번', '토지소재지', '필지', '필지주소', '시료채취지', '채취지', '채취지주소', '경작지', '경작지주소', '농지', '농지주소', '토지주소', '포장주소', '포장위치', '시료위치', '주소', 'address', 'addr', 'jibun', 'lot', 'parcel'],
    },
    {
        key: 'cropsDisplay', label: '작물',
        auto: ['작물', '작물명', '재배작물', '재배작목', '작목', '작목명', '품목', '품목명', '재배품목', '경작작물', 'crop', 'crops', 'item'],
    },
    {
        key: 'area', label: '면적',
        auto: ['면적', '재배면적', '경작면적', '필지면적', '농지면적', '포장면적', '시료면적', '제곱미터', '평방미터', 'area', 'size'],
    },
    {
        key: 'subCategory', label: '구분',
        auto: ['구분', '지목', '토지구분', '전답구분', '논밭구분', '시료구분', '경지지목', 'category', 'type', 'gubun'],
    },
    {
        key: 'purpose', label: '목적',
        auto: ['목적', '용도', '사용용도', '분석목적', '검정목적', '신청목적', '의뢰목적', '시료목적', 'purpose', 'usage', 'use'],
    },
    {
        key: 'note', label: '비고',
        auto: ['비고', '비고란', '메모', '참고', '참고사항', '특이사항', '기타', '기타사항', '코멘트', 'note', 'notes', 'remark', 'remarks', 'memo', 'comment', 'comments', 'etc'],
    },
    // ── 공익직불제용 (선택) ──
    {
        key: 'businessRegNo', label: '경영체등록번호', optional: true, gongik: true,
        auto: ['경영체등록번호', '농업경영체등록번호', '농업경영체', '경영체', '경영체번호', '경영체등록', '등록번호', '경영등록번호', 'businessregno', 'bizregno', 'bizno', 'businessno', 'farmbizno'],
    },
    {
        key: 'addressRoad', label: '농가주소(경작자)', optional: true, gongik: true,
        // '농가' 단독은 성명(name)과 의미가 충돌하므로 제외하고 '농가주소' 등 명시 키워드만 쓴다
        auto: ['농가주소', '농업인주소', '경영체주소', '경작자주소', '거주지주소', '거주지', '도로명주소', '도로명', '주소도로명', '신청인주소', '의뢰인주소', '대표자주소', 'farmeraddr', 'addressroad', 'roadaddr', 'roadaddress'],
    },
    {
        key: 'date', label: '접수일자', optional: true, gongik: true,
        auto: ['접수일자', '접수일', '접수날짜', '조사일자', '조사일', '분석의뢰일', '의뢰일', '의뢰일자', '신청일', '신청일자', '채취일', '채취일자', '시료채취일', '등록일', '등록일자', '일자', '날짜', 'date', 'regdate', 'recvdate'],
    },
];

/** 동점 처리용: TARGET_FIELDS 정의 순서 (앞 필드 우선) */
const FIELD_ORDER = new Map<string, number>(TARGET_FIELDS.map((f, i) => [f.key, i]));

// ── 자동매핑 점수 상수 ──────────────────────────────────────────
// 구간 베이스 간격(≥200)이 가산항(키워드/헤더 길이, 현실상 ≤ ~12)보다 훨씬 커서
// 길이에 관계없이 EXACT > AFFIX > INCLUDE > RINCLUDE 불변식이 항상 성립한다.
const SCORE_EXACT = 1000;    // 완전 일치 (헤더 == 키워드)
const SCORE_AFFIX = 500;     // 접두/접미 일치
const SCORE_INCLUDE = 300;   // 부분 포함 (키워드 ⊂ 헤더)
const SCORE_RINCLUDE = 100;  // 역포함 (헤더 ⊂ 키워드, 약식 표기)

/**
 * 영문/숫자 전용 키워드 판별. 2글자(no/id/hp 등)는 완전일치 전용으로 제한해
 * 우연한 부분일치 과매칭을 막는다(한글은 글자당 정보량이 커서 2글자도 허용).
 */
const ASCII_KEYWORD = /^[a-z0-9]+$/;

/**
 * 헤더 정규화: 공백·괄호·㎡ 외에 흔한 구분기호도 제거해
 * '전화 번호' · '전화-번호' · '주소(도로명)' 같은 변형을 한 형태로 수렴시킨다.
 */
export function normalizeHeader(text: unknown): string {
    return String(text ?? '')
        .replace(/[\s()[\]{}㎡㎥\-_/.,·:;|*#]/g, '')
        .toLowerCase();
}

/**
 * 키워드 정규화 사전계산. 필드 객체를 변형(mutation)하지 않고 별도 Map에 담는다
 * (메인은 `f._autoNorm`을 필드에 부착했다 — TS에서는 타입을 더럽히지 않는 쪽을 택했다).
 */
const AUTO_NORMS: Map<string, NormKeyword[]> = new Map(
    TARGET_FIELDS.map((f) => {
        const seen = new Set<string>();
        const norms: NormKeyword[] = [];
        for (const kw of f.auto) {
            const nk = normalizeHeader(kw);
            if (!nk || seen.has(nk)) continue;
            seen.add(nk);
            norms.push({ nk, ascii: ASCII_KEYWORD.test(nk) });
        }
        return [f.key, norms];
    }),
);

/** 테스트·디버깅용: 필드키 → 사전계산된 정규화 키워드 */
export function getAutoNorms(fieldKey: string): NormKeyword[] {
    return AUTO_NORMS.get(fieldKey) ?? [];
}

/**
 * 정규화 헤더 `nh`와 필드 키워드의 적합도 점수.
 *
 * - `0` 매칭 없음
 * - `SCORE_EXACT + len` 완전 일치 (신뢰도 최상)
 * - `SCORE_AFFIX + len` 헤더가 키워드로 시작/끝남
 * - `SCORE_INCLUDE + len` 키워드가 헤더에 포함
 * - `SCORE_RINCLUDE + len` 헤더가 키워드에 포함 (헤더가 더 짧은 약식)
 *
 * 같은 필드의 여러 키워드 중 최고 점수를 채택한다.
 * 영문 2글자 키워드는 완전일치 외 매칭에서 제외해(minMatch=3) 'no'·'id' 등의 과매칭을 막는다.
 */
export function scoreFieldHeader(autoNorms: NormKeyword[], nh: string): number {
    if (!nh) return 0;
    let best = 0;
    for (const { nk, ascii } of autoNorms) {
        const minMatch = ascii ? 3 : 2;
        let s = 0;
        if (nh === nk) {
            s = SCORE_EXACT + nk.length;
        } else if (nk.length >= minMatch && (nh.startsWith(nk) || nh.endsWith(nk))) {
            s = SCORE_AFFIX + nk.length;
        } else if (nk.length >= minMatch && nh.includes(nk)) {
            s = SCORE_INCLUDE + nk.length;
        } else if (nk.length >= 3 && nh.length >= 3 && nk.includes(nh)) {
            // 헤더가 키워드보다 짧은 약식(예: 헤더 '경영체' ⊂ 키워드 '경영체번호').
            // 약식은 한글/영문 구분 없이 3글자 이상만 허용(minMatch 미적용, 의도적 고정).
            // 가산항은 헤더 길이 — 더 긴 약식일수록 신뢰도가 높으므로 차등한다.
            s = SCORE_RINCLUDE + nh.length;
        }
        if (s > best) best = s;
    }
    return best;
}

/**
 * 헤더 배열 → `{ 필드키: 컬럼인덱스 }` 자동 매핑.
 *
 * 모든 (필드 × 컬럼) 쌍을 점수화한 뒤 [점수 ↓ → FIELD_ORDER → colIdx ↑] 순으로 정렬해
 * 필드·컬럼을 각각 1회씩 greedy 할당한다. 전역 최적에 가까운 결정적 매칭이다.
 */
export function computeAutoMapping(headers: readonly unknown[] | null | undefined): ColumnMapping {
    const normHeaders = (headers ?? []).map((h) => normalizeHeader(h));
    const candidates: Array<{ fieldKey: string; colIdx: number; score: number }> = [];

    for (const f of TARGET_FIELDS) {
        const norms = AUTO_NORMS.get(f.key) ?? [];
        normHeaders.forEach((nh, colIdx) => {
            if (!nh) return;
            const score = scoreFieldHeader(norms, nh);
            if (score > 0) candidates.push({ fieldKey: f.key, colIdx, score });
        });
    }

    candidates.sort((a, b) =>
        b.score - a.score
        || (FIELD_ORDER.get(a.fieldKey) ?? 0) - (FIELD_ORDER.get(b.fieldKey) ?? 0)
        || a.colIdx - b.colIdx,
    );

    const mapping: ColumnMapping = {};
    const usedCols = new Set<number>();
    for (const c of candidates) {
        if (mapping[c.fieldKey] != null || usedCols.has(c.colIdx)) continue;
        mapping[c.fieldKey] = c.colIdx;
        usedCols.add(c.colIdx);
    }
    return mapping;
}

/**
 * 교차 필드 동일 키워드 점검(개발 보조). 두 필드 이상에 같은 정규화 키워드가 등록되면
 * 동점이 FIELD_ORDER로만 갈리므로, 의도치 않은 중복을 경고로 노출한다.
 *
 * @returns 중복 키워드 설명 목록 (없으면 빈 배열)
 */
export function auditDuplicateKeywords(): string[] {
    const seen = new Map<string, string[]>();
    for (const f of TARGET_FIELDS) {
        for (const { nk } of AUTO_NORMS.get(f.key) ?? []) {
            if (!seen.has(nk)) seen.set(nk, []);
            seen.get(nk)!.push(f.key);
        }
    }
    const dups: string[] = [];
    for (const [nk, keys] of seen) {
        if (keys.length > 1) dups.push(`${nk} → [${keys.join(', ')}]`);
    }
    if (dups.length) {
        const warn = (globalThis as { logger?: { warn?: (...a: unknown[]) => void } }).logger?.warn
            ?? console.warn;
        warn('[자동매핑] 교차 필드 중복 키워드(우선순위 FIELD_ORDER 적용):', dups.join(' / '));
    }
    return dups;
}
