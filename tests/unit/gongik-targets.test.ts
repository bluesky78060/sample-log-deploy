import { describe, it, expect } from 'vitest';
import { selectGongikTargets, GONGIK_LAND_CLASS1_DEFAULT } from '../../src/soil/gongik-targets';

// SAMPL-1-123: applyGongikBulk 대상 필터링 조건을 순수 함수로 분리하여 회귀 테스트
// (메인 soil-script.js:767 필터 로직과 동일: (l.landClass1 || LAND_CLASS1_DEFAULT) === '공익직불제')

describe('selectGongikTargets — 공익직불제 대상 선별', () => {
    it('빈 배열은 빈 배열 반환', () => {
        expect(selectGongikTargets([])).toEqual([]);
    });

    it('혼합 landClass1에서 공익직불제만 선별', () => {
        const logs = [
            { id: '1', landClass1: '공익직불제' },
            { id: '2', landClass1: '농가의뢰' },
            { id: '3', landClass1: '대표필지' },
            { id: '4', landClass1: '공익직불제' },
        ];
        const result = selectGongikTargets(logs);
        expect(result.map(l => l.id)).toEqual(['1', '4']);
    });

    it('landClass1 누락(undefined)은 기본값 폴백(농가의뢰)으로 매칭되지 않음', () => {
        const logs = [
            { id: '1' },                              // undefined → 농가의뢰
            { id: '2', landClass1: undefined },       // undefined → 농가의뢰
            { id: '3', landClass1: '' },              // '' → 농가의뢰
            { id: '4', landClass1: null },            // null → 농가의뢰
            { id: '5', landClass1: '공익직불제' },
        ];
        const result = selectGongikTargets(logs);
        expect(result.map(l => l.id)).toEqual(['5']);
    });

    it('기본 폴백값 상수는 농가의뢰 (공익직불제 아님)', () => {
        expect(GONGIK_LAND_CLASS1_DEFAULT).toBe('농가의뢰');
        expect(GONGIK_LAND_CLASS1_DEFAULT).not.toBe('공익직불제');
    });
});
