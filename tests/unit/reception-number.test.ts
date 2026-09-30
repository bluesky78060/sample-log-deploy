import { describe, it, expect } from 'vitest'
import { computeNextNumber, type ReceptionLogLike, type ComputeNextNumberOptions } from '../../src/soil/reception-number'

// 테스트 대상: 경지구분 1차(landClass1)별 독립 접수번호 시퀀스 + 성토(F) 분리 + 폴백 (SAMPL-1-84 / SAMPL-1-122)
const next = (
    logs: ReadonlyArray<ReceptionLogLike> | null | undefined,
    target?: string,
    opts?: ComputeNextNumberOptions
) => computeNextNumber(logs, target, opts)

describe('computeNextNumber — 경지구분 1차별 독립 시퀀스', () => {
    it('빈 배열이면 1', () => {
        expect(next([], '농가의뢰')).toBe(1)
    })

    it('같은 경지구분 범위에서 max+1', () => {
        const logs = [
            { receptionNumber: '1', landClass1: '농가의뢰' },
            { receptionNumber: '2', landClass1: '농가의뢰' },
            { receptionNumber: '3', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰')).toBe(4)
    })

    it('경지구분별로 독립 시퀀스 (농가의뢰 ↔ 개량제 병존)', () => {
        const logs = [
            { receptionNumber: '1', landClass1: '농가의뢰' },
            { receptionNumber: '2', landClass1: '농가의뢰' },
            { receptionNumber: '1', landClass1: '개량제' }
        ]
        expect(next(logs, '농가의뢰')).toBe(3)
        expect(next(logs, '개량제')).toBe(2)
        expect(next(logs, '직불')).toBe(1) // 해당 분류 레코드 없음 → 1
    })

    it('본번만 비교 (가지번호 -1, -2 무시)', () => {
        const logs = [
            { receptionNumber: '5', landClass1: '농가의뢰' },
            { receptionNumber: '5-1', landClass1: '농가의뢰' },
            { receptionNumber: '5-2', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰')).toBe(6)
    })
})

describe('computeNextNumber — landClass1 폴백 (누락 = 농가의뢰)', () => {
    it('landClass1 누락 레코드는 기본값(농가의뢰)으로 분류', () => {
        const logs = [
            { receptionNumber: '1' },              // landClass1 없음 → 농가의뢰
            { receptionNumber: '2', landClass1: '' } // 빈 문자열 → 농가의뢰
        ]
        expect(next(logs, '농가의뢰')).toBe(3)
        expect(next(logs, '개량제')).toBe(1)
    })

    it('targetClass 미지정 시 기본값(농가의뢰) 사용', () => {
        const logs = [{ receptionNumber: '7', landClass1: '농가의뢰' }]
        expect(next(logs)).toBe(8)
    })
})

describe('computeNextNumber — 성토(F) 번호 체계 분리', () => {
    it('일반 채번은 성토(F) 레코드 제외', () => {
        const logs = [
            { receptionNumber: '1', landClass1: '농가의뢰' },
            { receptionNumber: 'F1', subCategory: '성토', landClass1: '농가의뢰' },
            { receptionNumber: 'F2', subCategory: '성토', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰')).toBe(2)
    })

    it('성토 채번은 일반 레코드 제외 + F 접두 숫자 비교', () => {
        const logs = [
            { receptionNumber: '1', landClass1: '농가의뢰' },
            { receptionNumber: '2', landClass1: '농가의뢰' },
            { receptionNumber: 'F1', subCategory: '성토', landClass1: '농가의뢰' },
            { receptionNumber: 'F3', subCategory: '성토', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰', { fill: true })).toBe(4)
    })

    it('성토 채번은 더 큰 일반 번호를 끌어오지 않는다', () => {
        const logs = [
            { receptionNumber: '10', landClass1: '농가의뢰' },
            { receptionNumber: 'F3', subCategory: '성토', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰', { fill: true })).toBe(4)
    })

    // F 없는 성토(레거시·필지 구분 성토)는 일반 번호를 점유한다 — 폼 중복 검사가 본번만 보므로
    // 제외하면 일반 채번이 그 번호를 다시 내고 등록이 영구히 막힌다 (Fable 검증 PA/PG 재현)
    it('일반 채번은 F 접두가 없는 성토 레코드의 번호를 건너뛴다', () => {
        const logs = [
            { receptionNumber: '1', landClass1: '농가의뢰' },
            { receptionNumber: '20', subCategory: '성토', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰')).toBe(21)
        expect(next(logs, '농가의뢰', { fill: true })).toBe(21) // 성토 풀에도 든다
    })

    it('성토 채번도 경지구분별 독립', () => {
        const logs = [
            { receptionNumber: 'F1', subCategory: '성토', landClass1: '농가의뢰' },
            { receptionNumber: 'F2', subCategory: '성토', landClass1: '개량제' }
        ]
        expect(next(logs, '농가의뢰', { fill: true })).toBe(2)
        expect(next(logs, '개량제', { fill: true })).toBe(3)
        expect(next(logs, '직불', { fill: true })).toBe(1)
    })
})

describe('computeNextNumber — 안전성', () => {
    it('null/undefined 입력 안전 처리', () => {
        expect(next(null, '농가의뢰')).toBe(1)
        expect(next(undefined, '농가의뢰')).toBe(1)
    })

    it('receptionNumber 없는 레코드 무시', () => {
        const logs = [
            { landClass1: '농가의뢰' },
            { receptionNumber: '', landClass1: '농가의뢰' },
            { receptionNumber: '4', landClass1: '농가의뢰' }
        ]
        expect(next(logs, '농가의뢰')).toBe(5)
    })
})
