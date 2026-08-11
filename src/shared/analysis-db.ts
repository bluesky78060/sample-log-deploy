/**
 * @fileoverview 분석결과 저장소 (IndexedDB / Dexie) - TypeScript 포팅
 *
 * 흙토람·시료별 검사 결과를 IndexedDB에 영속 저장한다.
 * 기존 localStorage(`{type}TestResults_${year}` / `test_soilTestResults_${year}`)의
 * 5MB 한계를 회피하고, 부분 업데이트 시 직렬화 비용을 줄이며,
 * 향후 인덱스 기반 통계의 토대를 마련한다.
 *
 * 데이터 형상:
 *   row = { type, year, sampleKey, ...fields }
 *   복합 PK: [type+year+sampleKey], 인덱스: type, year, [type+year]
 *
 * 마이그레이션:
 *   - 앱 첫 가동(또는 마커 부재) 시 localStorage의 `{type}TestResults_${year}` 및
 *     테스트 프로젝트의 `test_` 접두사 키(`test_soilTestResults_${year}`)를
 *     스캔해 IDB로 일괄 이관.
 *   - 멱등: 마이그레이션 완료 마커(`localStorage.analysis_db_migrated_v1`)로 재실행 방지.
 *   - localStorage 원본은 그대로 보존(rollback / 동기 폴백 안전).
 *
 * 공개 API: window.AnalysisDB (및 ES export)
 *   - init(): Promise<void>
 *   - isReady(): boolean
 *   - getMap(type, year): Promise<AnalysisMap>
 *   - saveMap(type, year, map): Promise<void>
 *   - saveOne(type, year, sampleKey, fields): Promise<void>
 *   - deleteYear(type, year): Promise<void>
 *   - migrateFromLocalStorage(): Promise<MigrationResult>
 */

import Dexie from 'dexie';
import type { Table } from 'dexie';

// ========================================
// 타입 정의
// ========================================

/** 단일 시료 결과 필드 묶음(임의 키/값 — 시료 타입별로 형상이 다름) */
export type AnalysisFields = Record<string, unknown>;

/** IDB 행 형상: 복합 PK 3필드 + 임의 필드 */
export interface AnalysisRow {
    type: string;
    year: string;
    sampleKey: string;
    [field: string]: unknown;
}

/** { [sampleKey]: { ...fields } } — 기존 localStorage 호환 맵 */
export type AnalysisMap = Record<string, AnalysisFields>;

export interface MigrationResult {
    migrated: number;
    scanned: number;
}

export interface AnalysisDBApi {
    init(): Promise<void>;
    isReady(): boolean;
    getMap(type: string, year: string | number): Promise<AnalysisMap>;
    saveMap(type: string, year: string | number, map: AnalysisMap): Promise<void>;
    saveOne(type: string, year: string | number, sampleKey: string, fields: AnalysisFields): Promise<void>;
    deleteYear(type: string, year: string | number): Promise<void>;
    migrateFromLocalStorage(): Promise<MigrationResult>;
}

// ========================================
// 상수 / DB 정의
// ========================================

const DB_NAME = 'SampleAnalysisDB';
const TABLE = 'analysisResults';
const MIGRATION_FLAG = 'analysis_db_migrated_v1';

/**
 * 마이그레이션 대상 localStorage 키 패턴.
 * - 일반: `{type}TestResults_{year}`  (compostTestResults_2026 등)
 * - 테스트 프로젝트: `test_{type}TestResults_{year}` (test_soilTestResults_2026)
 * 선택적 `test_` 접두사를 흡수하고 IDB type 으로는 접두사를 제거한 type 을 사용한다.
 */
const LS_KEY_PATTERN = /^(?:test_)?([a-zA-Z][a-zA-Z0-9]*)TestResults_(\d{4})$/;

type AnalysisTable = Table<AnalysisRow, [string, string, string]>;

class SampleAnalysisDB extends Dexie {
    analysisResults!: AnalysisTable;

    constructor() {
        super(DB_NAME);
        this.version(1).stores({
            // 복합 PK + type/year/[type+year] 인덱스
            [TABLE]: '[type+year+sampleKey], type, year, [type+year]',
        });
        this.analysisResults = this.table(TABLE);
    }
}

const db = new SampleAnalysisDB();

let _ready = false;

// ========================================
// 로깅 헬퍼 (window.logger 폴백)
// ========================================

function logInfo(...args: unknown[]): void {
    (window.logger?.info ?? console.log)(...args);
}
function logWarn(...args: unknown[]): void {
    (window.logger?.warn ?? console.warn)(...args);
}
function logError(...args: unknown[]): void {
    (window.logger?.error ?? console.error)(...args);
}

// ========================================
// API 구현
// ========================================

async function init(): Promise<void> {
    if (_ready) return;
    try {
        await db.open();
        _ready = true;
        // 자동 마이그레이션(멱등) — 마커가 없을 때만 1회
        if (!localStorage.getItem(MIGRATION_FLAG)) {
            const { migrated, scanned } = await migrateFromLocalStorage();
            try {
                localStorage.setItem(MIGRATION_FLAG, String(Date.now()));
            } catch {
                /* quota 초과 무시 — IDB 가 진짜 저장소 */
            }
            logInfo(`[AnalysisDB] localStorage→IDB 마이그레이션: ${migrated}건 (스캔 ${scanned}키)`);
        }
    } catch (e) {
        _ready = false;
        logError('[AnalysisDB] init 실패:', e);
        throw e;
    }
}

function isReady(): boolean {
    return _ready;
}

/**
 * 단일 type+year 의 결과 맵 조회.
 * @returns { [sampleKey]: { ...fields } } (기존 localStorage 호환 형상)
 */
async function getMap(type: string, year: string | number): Promise<AnalysisMap> {
    if (!_ready) return {};
    const t = String(type);
    const y = String(year);
    const rows = await db.analysisResults.where('[type+year]').equals([t, y]).toArray();
    const map: AnalysisMap = {};
    for (const row of rows) {
        const { type: _t, year: _y, sampleKey, ...fields } = row;
        void _t;
        void _y;
        map[sampleKey] = fields;
    }
    return map;
}

/**
 * type+year 의 결과 맵 전체 저장(연도 단위 upsert).
 * 입력 맵에 없는 sampleKey 는 삭제(연도 단위 전체 동기화 의미).
 */
async function saveMap(type: string, year: string | number, map: AnalysisMap): Promise<void> {
    if (!_ready) return;
    const t = String(type);
    const y = String(year);
    const rows: AnalysisRow[] = Object.entries(map || {}).map(([sampleKey, fields]) => ({
        type: t,
        year: y,
        sampleKey: String(sampleKey),
        ...(fields && typeof fields === 'object' ? fields : {}),
    }));
    await db.transaction('rw', db.analysisResults, async () => {
        // 기존 동일 (type, year) 모두 삭제 → 신규 일괄 삽입 (연도 단위 동기화)
        await db.analysisResults.where('[type+year]').equals([t, y]).delete();
        if (rows.length > 0) await db.analysisResults.bulkPut(rows);
    });
}

/**
 * 단일 시료 upsert(필드 병합 아님 — 전체 교체).
 * 부분 병합이 필요하면 호출 측에서 기존 객체를 합쳐 넘길 것.
 */
async function saveOne(
    type: string,
    year: string | number,
    sampleKey: string,
    fields: AnalysisFields,
): Promise<void> {
    if (!_ready) return;
    await db.analysisResults.put({
        type: String(type),
        year: String(year),
        sampleKey: String(sampleKey),
        ...(fields && typeof fields === 'object' ? fields : {}),
    });
}

async function deleteYear(type: string, year: string | number): Promise<void> {
    if (!_ready) return;
    await db.analysisResults.where('[type+year]').equals([String(type), String(year)]).delete();
}

/**
 * localStorage 의 `{type}TestResults_${year}`(및 `test_` 접두사) 패턴을 IDB 로 일괄 이관.
 * 멱등: 동일 [type+year+sampleKey] 는 put 으로 덮어쓴다. localStorage 원본은 유지.
 */
async function migrateFromLocalStorage(): Promise<MigrationResult> {
    let migrated = 0;
    let scanned = 0;
    if (!_ready) return { migrated, scanned };

    // 1단계: 모든 LS 키를 먼저 수집(반복 중 LS 변경에 강건). key(i) 순서는
    // 브라우저별 미정의이므로 스냅샷 후 처리.
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
    }

    const rowsToInsert: AnalysisRow[] = [];
    for (const key of allKeys) {
        const m = key.match(LS_KEY_PATTERN);
        if (!m) continue;
        scanned++;
        const [, type, year] = m;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const data: unknown = JSON.parse(raw);
            if (!data || typeof data !== 'object') continue;
            for (const [sampleKey, fields] of Object.entries(data as Record<string, unknown>)) {
                rowsToInsert.push({
                    type: String(type),
                    year: String(year),
                    sampleKey: String(sampleKey),
                    ...(fields && typeof fields === 'object' ? (fields as AnalysisFields) : {}),
                });
            }
        } catch (e) {
            logWarn(`[AnalysisDB] ${key} 파싱 실패:`, e);
        }
    }

    // 2단계: 트랜잭션으로 일괄 삽입(중간 실패 시 부분 상태 방지)
    if (rowsToInsert.length > 0) {
        await db.transaction('rw', db.analysisResults, async () => {
            await db.analysisResults.bulkPut(rowsToInsert);
        });
        migrated = rowsToInsert.length;
    }
    return { migrated, scanned };
}

// ========================================
// 전역 노출 + ES export
// ========================================

const AnalysisDB: AnalysisDBApi = {
    init,
    isReady,
    getMap,
    saveMap,
    saveOne,
    deleteYear,
    migrateFromLocalStorage,
};

// 비-모듈 스크립트(window.* 패턴) 호환을 위해 전역 노출
(window as Window & { AnalysisDB?: AnalysisDBApi }).AnalysisDB = AnalysisDB;

export { AnalysisDB };
export default AnalysisDB;
