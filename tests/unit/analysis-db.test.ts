/**
 * @fileoverview analysis-db (IndexedDB / Dexie) 단위 테스트
 * fake-indexeddb 로 jsdom 환경에 IndexedDB 를 주입한 뒤 마이그레이션/CRUD 멱등성을 검증.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import Dexie from 'dexie';

// 인메모리 localStorage (jsdom Storage 의 clear 미지원 회피 + 마이그레이션 키 스캔 지원)
function makeLocalStorage(): Storage {
    const store = new Map<string, string>();
    return {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; },
    } as Storage;
}

// window.logger 무음 처리 (테스트 로그 노이즈 제거)
beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = makeLocalStorage();
    (window as unknown as { logger?: unknown }).logger = {
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    };
});

afterEach(() => {
    // IndexedDB 초기화 (각 테스트 격리)
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    vi.resetModules();
});

/**
 * 모듈을 매 테스트마다 새로 import 해 내부 _ready/싱글톤 상태를 격리.
 * Dexie 싱글톤이 module 캐시에 남을 수 있어, DB 를 명시적으로 삭제해 데이터 격리를 보장.
 */
async function freshModule() {
    vi.resetModules();
    // 이전 테스트의 IDB 데이터 제거 (싱글톤 connection 재사용 대비)
    try { await Dexie.delete('SampleAnalysisDB'); } catch { /* noop */ }
    const mod = await import('../../src/shared/analysis-db');
    return mod.AnalysisDB;
}

describe('analysis-db', () => {
    it('init 전에는 isReady=false, init 후 true', async () => {
        const db = await freshModule();
        expect(db.isReady()).toBe(false);
        await db.init();
        expect(db.isReady()).toBe(true);
    });

    it('saveMap → getMap 라운드트립', async () => {
        const db = await freshModule();
        await db.init();
        await db.saveMap('compost', 2026, {
            'k1': { pH: 6.5, organic: '3.0' },
            'k2': { pH: 7.1 },
        });
        const map = await db.getMap('compost', 2026);
        expect(Object.keys(map).sort()).toEqual(['k1', 'k2']);
        expect(map.k1).toEqual({ pH: 6.5, organic: '3.0' });
        expect(map.k2).toEqual({ pH: 7.1 });
    });

    it('saveMap 은 연도 단위 전체 동기화 (없는 sampleKey 삭제)', async () => {
        const db = await freshModule();
        await db.init();
        await db.saveMap('water', 2026, { a: { v: 1 }, b: { v: 2 } });
        await db.saveMap('water', 2026, { a: { v: 10 } }); // b 제거
        const map = await db.getMap('water', 2026);
        expect(Object.keys(map)).toEqual(['a']);
        expect(map.a).toEqual({ v: 10 });
    });

    it('type/year 가 다르면 격리된다', async () => {
        const db = await freshModule();
        await db.init();
        await db.saveMap('soil', 2026, { x: { v: 'soil26' } });
        await db.saveMap('soil', 2025, { x: { v: 'soil25' } });
        await db.saveMap('water', 2026, { x: { v: 'water26' } });
        expect((await db.getMap('soil', 2026)).x).toEqual({ v: 'soil26' });
        expect((await db.getMap('soil', 2025)).x).toEqual({ v: 'soil25' });
        expect((await db.getMap('water', 2026)).x).toEqual({ v: 'water26' });
    });

    it('saveOne 단일 upsert', async () => {
        const db = await freshModule();
        await db.init();
        await db.saveOne('heavyMetal', 2026, 'm1', { cd: 0.1 });
        await db.saveOne('heavyMetal', 2026, 'm2', { pb: 5 });
        const map = await db.getMap('heavyMetal', 2026);
        expect(map.m1).toEqual({ cd: 0.1 });
        expect(map.m2).toEqual({ pb: 5 });
    });

    it('deleteYear 는 해당 연도만 제거', async () => {
        const db = await freshModule();
        await db.init();
        await db.saveMap('pesticide', 2026, { a: { v: 1 } });
        await db.saveMap('pesticide', 2025, { a: { v: 2 } });
        await db.deleteYear('pesticide', 2026);
        expect(await db.getMap('pesticide', 2026)).toEqual({});
        expect((await db.getMap('pesticide', 2025)).a).toEqual({ v: 2 });
    });

    it('init 시 localStorage 자동 마이그레이션 (일반 + test_ 접두사)', async () => {
        // 마이그레이션 대상 키들
        localStorage.setItem('compostTestResults_2026', JSON.stringify({ c1: { pH: 6 } }));
        localStorage.setItem('test_soilTestResults_2026', JSON.stringify({ s1: { pH: 5.5 } }));
        // 대상 아님 (패턴 불일치)
        localStorage.setItem('soilSampleLogs_2026', JSON.stringify([{ id: 1 }]));

        const db = await freshModule();
        await db.init();

        const compost = await db.getMap('compost', 2026);
        const soil = await db.getMap('soil', 2026);
        expect(compost.c1).toEqual({ pH: 6 });
        expect(soil.s1).toEqual({ pH: 5.5 });
        // localStorage 원본 보존 (rollback 안전)
        expect(localStorage.getItem('compostTestResults_2026')).not.toBeNull();
        expect(localStorage.getItem('test_soilTestResults_2026')).not.toBeNull();
        // 멱등 마커 설정됨
        expect(localStorage.getItem('analysis_db_migrated_v1')).not.toBeNull();
    });

    it('마이그레이션 멱등: 마커 존재 시 재이관하지 않음', async () => {
        localStorage.setItem('analysis_db_migrated_v1', String(Date.now()));
        localStorage.setItem('compostTestResults_2026', JSON.stringify({ c1: { pH: 6 } }));
        const db = await freshModule();
        await db.init();
        // 마커가 이미 있으므로 자동 마이그레이션 스킵 → IDB 비어 있음
        expect(await db.getMap('compost', 2026)).toEqual({});
    });

    it('migrateFromLocalStorage 직접 호출 결과 카운트', async () => {
        localStorage.setItem('waterTestResults_2026', JSON.stringify({ a: {}, b: {}, c: {} }));
        localStorage.setItem('analysis_db_migrated_v1', '1'); // 자동 마이그레이션 스킵
        const db = await freshModule();
        await db.init();
        const res = await db.migrateFromLocalStorage();
        expect(res.scanned).toBe(1); // 키 1개 매칭
        expect(res.migrated).toBe(3); // 행 3개
        expect(Object.keys(await db.getMap('water', 2026)).sort()).toEqual(['a', 'b', 'c']);
    });

    it('window.AnalysisDB 전역 노출', async () => {
        await freshModule();
        expect((window as unknown as { AnalysisDB?: unknown }).AnalysisDB).toBeDefined();
    });

    // -----------------------------------------------------------------------
    // 자가복구 폴백 시나리오 (SAMPL-1-72 MAJOR 수정 검증)
    // 마이그레이션 플래그가 설정된 후 IDB가 초기화/유실된 경우,
    // getMap()이 빈 객체를 반환해도 saveMap()으로 재복구할 수 있음을 검증.
    // -----------------------------------------------------------------------

    it('[자가복구] IDB 유실 후 saveMap으로 재복구하면 getMap이 데이터를 반환한다', async () => {
        // 마이그레이션 플래그 설정 (재마이그레이션 스킵 상태)
        localStorage.setItem('analysis_db_migrated_v1', String(Date.now()));
        localStorage.setItem('compostTestResults_2026', JSON.stringify({ c1: { pH: 6 }, c2: { pH: 7 } }));

        const db = await freshModule();
        await db.init();

        // 플래그 존재 → 자동 마이그레이션 스킵 → IDB 비어 있음
        const emptyMap = await db.getMap('compost', 2026);
        expect(Object.keys(emptyMap).length).toBe(0); // IDB 유실 상태

        // 자가복구: LS 데이터를 읽어 saveMap으로 IDB에 재저장
        const lsRaw = localStorage.getItem('compostTestResults_2026');
        expect(lsRaw).not.toBeNull();
        const lsParsed = JSON.parse(lsRaw!);
        await db.saveMap('compost', 2026, lsParsed);

        // 복구 후 getMap은 원본 데이터를 반환해야 함
        const recovered = await db.getMap('compost', 2026);
        expect(Object.keys(recovered).sort()).toEqual(['c1', 'c2']);
        expect(recovered.c1).toEqual({ pH: 6 });
        expect(recovered.c2).toEqual({ pH: 7 });
    });

    it('[자가복구] IDB 비어 있고 LS도 없으면 빈 객체 반환 (정상 무데이터)', async () => {
        localStorage.setItem('analysis_db_migrated_v1', String(Date.now()));
        // LS에도 데이터 없음

        const db = await freshModule();
        await db.init();

        const map = await db.getMap('water', 2025);
        expect(map).toEqual({}); // 정상 무데이터 → 빈 객체
    });
});
