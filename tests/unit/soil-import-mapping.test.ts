/**
 * @fileoverview 엑셀 컬럼 헤더 → 접수 필드 자동 매핑 단위 테스트 (SAMPL-1-124)
 *
 * 메인 프로젝트 `tests/unit/soil-result-importer.test.js`를 TS로 이식한다.
 * 메인은 IIFE가 노출하는 `window.SoilResultImporter._fns`를 통해 접근했으나
 * 이 프로젝트는 ESM이므로 모듈을 직접 import한다.
 *
 * 두 프로젝트의 매핑 결과가 갈리지 않도록 **같은 케이스를 같은 기대값으로** 유지한다.
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeHeader,
    computeAutoMapping,
    auditDuplicateKeywords,
    TARGET_FIELDS,
    LAND_CLASS1_DEFAULT,
    LAND_CLASS1_OPTIONS,
} from '../../src/soil/soil-import-mapping';

const map = (headers: unknown[]) => computeAutoMapping(headers);
const norm = (s: unknown) => normalizeHeader(s);

describe('normalizeHeader — 헤더 정규화', () => {
    it('공백·구분기호·괄호·㎡ 제거 + 소문자화', () => {
        expect(norm('전화 번호')).toBe('전화번호');
        expect(norm('전화-번호')).toBe('전화번호');
        expect(norm('주소(도로명)')).toBe('주소도로명');
        expect(norm('면적㎡')).toBe('면적');
        expect(norm('  No.  ')).toBe('no');
    });

    it('null/undefined → 빈 문자열', () => {
        expect(norm(null)).toBe('');
        expect(norm(undefined)).toBe('');
    });
});

describe('computeAutoMapping — 한글 표준 헤더', () => {
    it('대표적인 헤더 세트를 올바른 필드로 매핑', () => {
        const m = map(['접수번호', '성명', '연락처', '지번주소', '작물', '면적', '구분', '목적', '비고']);
        expect(m.receptionNumber).toBe(0);
        expect(m.name).toBe(1);
        expect(m.phoneNumber).toBe(2);
        expect(m.lotAddress).toBe(3);
        expect(m.cropsDisplay).toBe(4);
        expect(m.area).toBe(5);
        expect(m.subCategory).toBe(6);
        expect(m.purpose).toBe(7);
        expect(m.note).toBe(8);
    });

    it('기관별 동의어 변형도 인식 (의뢰인/휴대폰/소재지/재배작물 등)', () => {
        const m = map(['의뢰인', '휴대폰번호', '소재지', '재배작물', '재배면적']);
        expect(m.name).toBe(0);
        expect(m.phoneNumber).toBe(1);
        expect(m.lotAddress).toBe(2);
        expect(m.cropsDisplay).toBe(3);
        expect(m.area).toBe(4);
    });
});

describe('computeAutoMapping — 영문 헤더', () => {
    it('영문 컬럼명 인식', () => {
        const m = map(['name', 'phone', 'address', 'crop', 'area']);
        expect(m.name).toBe(0);
        expect(m.phoneNumber).toBe(1);
        expect(m.lotAddress).toBe(2);
        expect(m.cropsDisplay).toBe(3);
        expect(m.area).toBe(4);
    });

    it('2글자 영문 키워드(no)는 완전일치만 — 무관 헤더에 과매칭 안 함', () => {
        // 'note'는 'no'를 부분포함하지만 영문 2글자는 완전일치 전용 → receptionNumber로 잘못 안 감
        const m = map(['note']);
        expect(m.note).toBe(0);
        expect(m.receptionNumber).toBeUndefined();
    });
});

describe('computeAutoMapping — 충돌·우선순위·중복 컬럼', () => {
    it('각 필드·컬럼은 1회만 할당 (1:1 greedy)', () => {
        const m = map(['성명', '성명']);
        const assignedCols = Object.values(m);
        expect(new Set(assignedCols).size).toBe(assignedCols.length);
        expect(m.name).toBe(0); // 동점 시 앞 컬럼 우선
    });

    it('완전일치가 부분일치보다 우선 (EXACT > INCLUDE)', () => {
        const m = map(['접수번호', '관리번호']);
        expect(m.receptionNumber).toBe(0); // '접수번호' 완전일치 우선
    });

    it('매칭 없는 헤더는 미할당', () => {
        const m = map(['알수없는컬럼', 'xyz']);
        expect(Object.keys(m).length).toBe(0);
    });

    it('빈 헤더 배열 → 빈 매핑', () => {
        expect(map([])).toEqual({});
        expect(map(['', '', ''])).toEqual({});
    });

    it('null/undefined 입력도 빈 매핑 (TS 포팅 시 추가)', () => {
        expect(computeAutoMapping(null)).toEqual({});
        expect(computeAutoMapping(undefined)).toEqual({});
    });
});

describe('computeAutoMapping — 공익직불제(선택) 필드', () => {
    it('경영체등록번호·접수일자 인식', () => {
        const m = map(['경영체등록번호', '접수일자']);
        expect(m.businessRegNo).toBe(0);
        expect(m.date).toBe(1);
    });
});

describe('auditDuplicateKeywords — 교차 필드 중복 키워드 점검', () => {
    it('배열을 반환 (정의상 중복 0건이 바람직)', () => {
        const dups = auditDuplicateKeywords();
        expect(Array.isArray(dups)).toBe(true);
    });
});

describe('TARGET_FIELDS — 메인과의 계약', () => {
    it('필드 12개, 순서가 매핑 우선순위다', () => {
        expect(TARGET_FIELDS).toHaveLength(12);
        expect(TARGET_FIELDS.map((f) => f.key)).toEqual([
            'receptionNumber', 'name', 'phoneNumber', 'lotAddress', 'cropsDisplay',
            'area', 'subCategory', 'purpose', 'note',
            'businessRegNo', 'addressRoad', 'date',
        ]);
    });

    it('필수 필드와 선택 필드 구분', () => {
        const optional = TARGET_FIELDS.filter((f) => f.optional).map((f) => f.key);
        expect(optional).toEqual(['receptionNumber', 'businessRegNo', 'addressRoad', 'date']);
    });

    it('공익직불제 강조 필드 3개', () => {
        expect(TARGET_FIELDS.filter((f) => f.gongik).map((f) => f.key))
            .toEqual(['businessRegNo', 'addressRoad', 'date']);
    });

    it('키워드 중복 없음 (같은 필드 내)', () => {
        for (const f of TARGET_FIELDS) {
            const norms = f.auto.map(normalizeHeader).filter(Boolean);
            expect(new Set(norms).size, `${f.key} 내부 키워드 중복`).toBe(norms.length);
        }
    });
});

describe('경지구분 1차', () => {
    it('11값 + 공익직불제 = 12개, 기본값은 농가의뢰', () => {
        expect(LAND_CLASS1_OPTIONS).toHaveLength(12);
        expect(LAND_CLASS1_OPTIONS).toContain('공익직불제');
        expect(LAND_CLASS1_DEFAULT).toBe('농가의뢰');
        expect(LAND_CLASS1_OPTIONS).toContain(LAND_CLASS1_DEFAULT);
    });
});
