import { describe, it, expect } from 'vitest'
import { receptionBaseKey, computeNextNumber, DEFAULT_LAND_CLASS, matchImportRow, isFillImportRow, importedSubCategory, importRowConflict, isFillLog } from '../../src/soil/reception-number'
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

// SAMPL-1-152·2-28 수정 라운드: 미리보기와 매니저가 같이 쓰는 가져오기 매칭
describe('matchImportRow', () => {
    const L = DEFAULT_LAND_CLASS
    const logs = [
        { receptionNumber: '5', landClass1: L },
        { receptionNumber: '8-1', landClass1: L },
        { receptionNumber: '8-2', landClass1: L },
        { receptionNumber: 'F3', landClass1: L, subCategory: '성토' },
        { receptionNumber: '7', landClass1: '공익직불제' },
        { receptionNumber: '9-1', landClass1: L },
        { receptionNumber: '12', landClass1: L, subCategory: '성토' },  // F 없는 옛 성토 레코드
    ]

    it('전체 번호 일치 → match, 같은 본번 가지번호 여럿 → ambiguous, 없으면 none', () => {
        expect(matchImportRow(logs, '5', L)).toEqual({ kind: 'match', target: logs[0] })
        expect(matchImportRow(logs, '8-2', L)).toEqual({ kind: 'match', target: logs[2] })
        expect(matchImportRow(logs, '8', L).kind).toBe('ambiguous')
        expect(matchImportRow(logs, '7', L).kind).toBe('none')
    })

    it("'N'은 가지번호 레코드 한 건으로 접지만 'N-M'은 N으로 접지 않는다", () => {
        expect(matchImportRow(logs, '9', L)).toEqual({ kind: 'match', target: logs[5] })
        expect(matchImportRow(logs, '5-1', L)).toEqual({ kind: 'subrow', parent: '5' })
        // 정확히 N인 레코드가 없으면 다른 가지번호가 있어도 새 레코드다
        expect(matchImportRow(logs, '9-2', L).kind).toBe('none')
        expect(matchImportRow(logs, '8-3', L).kind).toBe('none')
    })

    it('정확한 번호 탐색은 풀보다 먼저 한다', () => {
        expect(matchImportRow(logs, '12', L)).toEqual({ kind: 'match', target: logs[6] })
        expect(matchImportRow(logs, 'F3', L)).toEqual({ kind: 'match', target: logs[3] })
    })

    it('번호 풀은 F 접두로 정하고, 구분과 어긋나는 행은 오류다', () => {
        expect(isFillImportRow('F3', '')).toBe(true)
        expect(isFillImportRow('', '성토')).toBe(true)
        expect(importRowConflict('F3', '논')).not.toBeNull()
        expect(importRowConflict('7', '성토')).not.toBeNull()
        expect(importRowConflict('F3', '')).toBeNull()
        expect(importRowConflict('F3', '성토')).toBeNull()
        expect(importedSubCategory('F9', '')).toBe('성토')
        expect(importedSubCategory('9', '')).toBe('')
    })
})

describe('isFillLog — 구분이 성토가 아니어도 F 번호는 성토 풀', () => {
    it('F1(논) 레코드가 있으면 성토 다음 번호는 2', () => {
        const logs = [{ receptionNumber: 'F1', subCategory: '논', landClass1: DEFAULT_LAND_CLASS }]
        expect(isFillLog(logs[0])).toBe(true)
        expect(computeNextNumber(logs, DEFAULT_LAND_CLASS, { fill: true })).toBe(2)
        expect(computeNextNumber(logs, DEFAULT_LAND_CLASS, { fill: false })).toBe(1)
    })
})
