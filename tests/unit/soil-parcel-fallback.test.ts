import { describe, it, expect } from 'vitest';
import { resolveParcelCategory, resolveParcelPurpose, cropsFromDisplay } from '../../src/soil/soil-parcel-fallback';

// 메인 tests/unit/soil-log-record.test.js의 SAMPL-1-119 관련 케이스 이식
// (code-review 반영: SAMPL-1-122 포팅에 묻어온 parcels[0] 폴백 로직 회귀 테스트)

describe('폼 복원 폴백 (SAMPL-1-119/120) — resolveParcelCategory', () => {
    it('필지별 값이 있으면 그대로 사용', () => {
        expect(resolveParcelCategory('밭', { subCategory: '논' })).toBe('밭');
    });
    it('필지별 값 비면 최상위 subCategory로 폴백', () => {
        expect(resolveParcelCategory('', { subCategory: '논' })).toBe('논');
        expect(resolveParcelCategory('', { subCategory: '과수' })).toBe('과수');
    });
    it("'-' 센티넬 subCategory는 빈 문자열로 처리", () => {
        expect(resolveParcelCategory('', { subCategory: '-' })).toBe('');
    });
    it('둘 다 없으면 빈 문자열', () => {
        expect(resolveParcelCategory('', {})).toBe('');
        expect(resolveParcelCategory('', null)).toBe('');
    });
});

describe('폼 복원 폴백 (SAMPL-1-119/120) — resolveParcelPurpose', () => {
    it('필지별 값 우선', () => {
        expect(resolveParcelPurpose('무농약', { purpose: 'GAP' })).toBe('무농약');
    });
    it('필지별 값 비면 최상위 purpose로 폴백', () => {
        expect(resolveParcelPurpose('', { purpose: '일반재배' })).toBe('일반재배');
    });
    it('둘 다 없으면 빈 문자열', () => {
        expect(resolveParcelPurpose('', {})).toBe('');
        expect(resolveParcelPurpose('', null)).toBe('');
    });
});

describe('폼 복원 폴백 (SAMPL-1-119/120) — cropsFromDisplay', () => {
    it('단일 작물: area 부여', () => {
        expect(cropsFromDisplay({ cropsDisplay: '고추', area: '1000' }))
            .toEqual([{ name: '고추', area: '1000' }]);
    });
    it('콤마 결합형: 첫 작물에만 area, 나머지는 빈 면적', () => {
        expect(cropsFromDisplay({ cropsDisplay: '고추, 배추', area: '1500' }))
            .toEqual([{ name: '고추', area: '1500' }, { name: '배추', area: '' }]);
    });
    it("빈 cropsDisplay/'-' 센티넬은 빈 배열", () => {
        expect(cropsFromDisplay({ cropsDisplay: '', area: '1000' })).toEqual([]);
        expect(cropsFromDisplay({ cropsDisplay: '-', area: '1000' })).toEqual([]);
        expect(cropsFromDisplay(null)).toEqual([]);
    });
    it('area 없으면 빈 문자열', () => {
        expect(cropsFromDisplay({ cropsDisplay: '벼' })).toEqual([{ name: '벼', area: '' }]);
    });
});

describe('그룹 수정 시나리오 — parcels[0]이 빈 레코드도 최상위 필드로 복원', () => {
    // populateFormForGroupEdit/populateFormForEdit이 실제로 겪는 상황을 재현:
    // parcels[0]의 category/purpose/cropsDisplay가 비어있는 레거시·부분저장 레코드
    it('필지 category/purpose가 비어도 log 최상위 subCategory/purpose로 렌더된다', () => {
        const log = { subCategory: '밭', purpose: '유기농', cropsDisplay: '감자,옥수수', area: '800' };
        const parcel = { category: '', purpose: '' };

        expect(resolveParcelCategory(parcel.category, log)).toBe('밭');
        expect(resolveParcelPurpose(parcel.purpose, log)).toBe('유기농');
        expect(cropsFromDisplay(log)).toEqual([
            { name: '감자', area: '800' },
            { name: '옥수수', area: '' },
        ]);
    });

    it('정상 데이터(필지별 값 존재)는 폴백이 발동하지 않아 동작 보존', () => {
        const log = { subCategory: '밭', purpose: '유기농' };
        const parcel = { category: '논', purpose: '일반재배' };

        expect(resolveParcelCategory(parcel.category, log)).toBe('논');
        expect(resolveParcelPurpose(parcel.purpose, log)).toBe('일반재배');
    });
});
