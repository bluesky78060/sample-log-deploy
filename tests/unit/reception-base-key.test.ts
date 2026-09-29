import { describe, it, expect } from 'vitest'
import { receptionBaseKey, computeNextNumber, DEFAULT_LAND_CLASS } from '../../src/soil/reception-number'
import { collectExistingNumbers } from '../../src/soil/soil-import-preview'

// SAMPL-2-28: 채번과 가져오기 중복 판정이 같은 분류 규칙을 쓰는지 본다
describe('receptionBaseKey', () => {
    it('일반 풀: 본번, F 접두·성토는 null', () => {
        expect(receptionBaseKey({ receptionNumber: '5-2' }, false, DEFAULT_LAND_CLASS)).toBe('5')
        expect(receptionBaseKey({ receptionNumber: 'F5' }, false, DEFAULT_LAND_CLASS)).toBeNull()
        expect(receptionBaseKey({ receptionNumber: '5', subCategory: '성토' }, false, DEFAULT_LAND_CLASS)).toBeNull()
    })

    it('성토 풀: F를 뗀 본번, 일반은 null', () => {
        expect(receptionBaseKey({ receptionNumber: 'F7-1', subCategory: '성토' }, true, DEFAULT_LAND_CLASS)).toBe('7')
        expect(receptionBaseKey({ receptionNumber: '7' }, true, DEFAULT_LAND_CLASS)).toBeNull()
    })

    it('빈 접수번호·다른 경지구분은 null, 누락 경지구분은 기본값으로 본다', () => {
        expect(receptionBaseKey({ receptionNumber: '' }, false, DEFAULT_LAND_CLASS)).toBeNull()
        expect(receptionBaseKey({ receptionNumber: '3', landClass1: '개량제' }, false, DEFAULT_LAND_CLASS)).toBeNull()
        expect(receptionBaseKey({ receptionNumber: '3', landClass1: null }, false, DEFAULT_LAND_CLASS)).toBe('3')
    })

    it('앞뒤 공백은 두 풀 모두 잘라낸다', () => {
        expect(receptionBaseKey({ receptionNumber: ' 8 -1' }, false, DEFAULT_LAND_CLASS)).toBe('8')
        expect(receptionBaseKey({ receptionNumber: ' F8', subCategory: '성토' }, true, DEFAULT_LAND_CLASS)).toBe('8')
    })
})

describe('computeNextNumber ↔ collectExistingNumbers 일치', () => {
    const logs = [
        { receptionNumber: '10', landClass1: '농가의뢰' },
        { receptionNumber: '3-2' },
        { receptionNumber: 'F4', subCategory: '성토', landClass1: '농가의뢰' },
        { receptionNumber: '20', subCategory: '성토', landClass1: '농가의뢰' },
        { receptionNumber: '7', landClass1: '개량제' },
        { receptionNumber: 'F9', subCategory: '성토', landClass1: '개량제' },
        { receptionNumber: '' },
    ]
    const maxPlusOne = (set: Set<string>) =>
        Math.max(0, ...[...set].map(n => parseInt(n, 10)).filter(n => !isNaN(n))) + 1

    for (const cls of ['농가의뢰', '개량제', '직불']) {
        for (const fill of [false, true]) {
            it(`${cls} / ${fill ? '성토' : '일반'}`, () => {
                expect(computeNextNumber(logs, cls, { fill }))
                    .toBe(maxPlusOne(collectExistingNumbers(logs, cls, { fill })))
            })
        }
    }
})
