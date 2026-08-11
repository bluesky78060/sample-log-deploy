import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

// jsdom localStorage가 clear/key를 제공하지 않는 환경 대비 — 프로젝트 표준 mock 패턴
// (tests/unit/secure-storage.test.ts와 동일).
const mockLocalStorage: Record<string, string> = {}
global.localStorage = {
    getItem: vi.fn((key: string) => (key in mockLocalStorage ? mockLocalStorage[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key]
    }),
    clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key])
    }),
    key: vi.fn((i: number) => Object.keys(mockLocalStorage)[i] ?? null),
    get length() {
        return Object.keys(mockLocalStorage).length
    },
} as Storage

// autocomplete-manager.ts를 import → window.AddressAutocomplete 노출
// 테스트 대상: 리 단독 입력 시 기본 시·도 prefix 검색 키 생성 (SAMPL-1-83, soil SLS-1-117/118 이식)
beforeAll(async () => {
    await import('../../src/shared/autocomplete-manager.ts')
})

beforeEach(() => {
    localStorage.clear()
})

const extract = (v: string) =>
    (window as Window & { AddressAutocomplete: { _extractVillageAndLot: (v: string) => unknown } })
        .AddressAutocomplete._extractVillageAndLot(v)
const buildKey = (parsed: unknown, region?: string) =>
    (window as Window & { AddressAutocomplete: { _buildJusoSearchKey: (p: unknown, r?: string) => string } })
        .AddressAutocomplete._buildJusoSearchKey(parsed, region)
const resolve = (opts: unknown) =>
    (window as Window & { AddressAutocomplete: { _resolveDefaultRegion: (o: unknown) => string } })
        .AddressAutocomplete._resolveDefaultRegion(opts)

describe('extractVillageAndLot — isBareVillage 판별', () => {
    it('리 단독 입력은 isBareVillage=true', () => {
        expect(extract('삼계리')).toMatchObject({ village: '삼계리', isBareVillage: true })
        expect(extract('문단리')).toMatchObject({ village: '문단리', isBareVillage: true })
    })
    it('리 + 지번/산도 isBareVillage=true', () => {
        expect(extract('삼계리 123')).toMatchObject({ village: '삼계리', lotNumber: '123', isBareVillage: true })
        expect(extract('삼계리 산 12-3')).toMatchObject({ village: '삼계리', hasMountainKeyword: true, lotNumber: '12-3', isBareVillage: true })
    })
    it('시·도/시·군 포함 복합 입력은 isBareVillage=false', () => {
        expect(extract('봉화읍 삼계리')).toMatchObject({ isBareVillage: false })
        expect(extract('경상북도 봉화군 삼계리')).toMatchObject({ isBareVillage: false })
    })
    it('동(洞) 단독도 isBareVillage=true', () => {
        expect(extract('내성동')).toMatchObject({ village: '내성동', isBareVillage: true })
    })
})

describe('buildJusoSearchKey — 기본 시·도 prefix', () => {
    it('리 단독 + 기본 시·도 설정 → "시·도 리"로 prefix', () => {
        expect(buildKey(extract('삼계리'), '경상북도')).toBe('경상북도 삼계리')
    })
    it('리 단독 + 기본 시·도 미설정(빈 문자열) → 리만', () => {
        expect(buildKey(extract('삼계리'), '')).toBe('삼계리')
    })
    it('시·도 포함 복합 입력 → prefix 안 함(중복 방지)', () => {
        expect(buildKey(extract('봉화읍 삼계리'), '경상북도')).toBe('봉화읍 삼계리')
    })
    it('정식 시·도+시·군 포함 입력 → 이중 prefix 안 됨', () => {
        expect(buildKey(extract('경상북도 봉화군 삼계리'), '경상북도')).toBe('경상북도 봉화군 삼계리')
    })
    it('region 인자 생략 시 localStorage app_default_sido 조회', () => {
        localStorage.setItem('app_default_sido', '충청남도')
        expect(buildKey(extract('삼계리'))).toBe('충청남도 삼계리')
    })
    it('localStorage 미설정이면 리만', () => {
        expect(buildKey(extract('삼계리'))).toBe('삼계리')
    })
    it('지번 포함 리 단독도 village만 prefix(지번은 JUSO 검색에서 제외)', () => {
        expect(buildKey(extract('삼계리 123'), '경상북도')).toBe('경상북도 삼계리')
    })
})

describe('resolveDefaultRegion — bind 옵션 주입 (결합도 분리)', () => {
    it('getDefaultRegion 옵션 주입 시 주입값을 사용(앱 키 미조회)', () => {
        localStorage.setItem('app_default_sido', '충청남도')  // 주입이 우선이면 무시
        expect(resolve({ getDefaultRegion: () => '경상북도' })).toBe('경상북도')
    })
    it('주입값 trim 처리', () => {
        expect(resolve({ getDefaultRegion: () => '  경상북도  ' })).toBe('경상북도')
    })
    it('옵션 미주입 시 설정값(localStorage)으로 폴백 — 하위호환', () => {
        localStorage.setItem('app_default_sido', '경상북도')
        expect(resolve({})).toBe('경상북도')
        expect(resolve(undefined)).toBe('경상북도')
    })
    it('미주입 + 설정 없음 → 빈 문자열', () => {
        expect(resolve({})).toBe('')
    })
    it('주입 함수가 예외를 던져도 빈 문자열로 안전 폴백', () => {
        expect(resolve({ getDefaultRegion: () => { throw new Error('boom') } })).toBe('')
    })
    it('주입 함수가 null/undefined 반환 시 빈 문자열', () => {
        expect(resolve({ getDefaultRegion: () => null })).toBe('')
        expect(resolve({ getDefaultRegion: () => undefined })).toBe('')
    })
    it('주입값으로 buildJusoSearchKey가 시·도 prefix를 생성한다(통합)', () => {
        const region = resolve({ getDefaultRegion: () => '강원특별자치도' })
        expect(buildKey(extract('삼계리'), region)).toBe('강원특별자치도 삼계리')
    })
})
