/**
 * @fileoverview 가져오기 미리보기 계산 — 중복 판정 + 접수번호 자동부여 (순수 로직)
 *
 * 메인 프로젝트 `src/soil/soil-result-importer.js`의 `_existingNumbers`/`_recompute`를
 * TS로 포팅한다 (SAMPL-1-124 Phase B-2).
 *
 * 메인은 이 로직이 모달 메서드로 `window.soilManager`와 `localStorage`를 직접 읽어
 * 테스트할 수 없었다. 여기서는 기존 레코드와 다음번호를 **인자로 받아** 순수 함수로 만든다
 * (호출부가 매니저에서 값을 꺼내 넘긴다 — Phase B-2b 모달).
 */

import { LAND_CLASS1_DEFAULT, type ColumnMapping } from './soil-import-mapping';

/** 기존 접수 레코드에서 이 계산에 필요한 최소 형태 */
export interface ExistingLogLike {
    receptionNumber?: string | number | null;
    landClass1?: string | null;
    subCategory?: string | null;
}

/** 미리보기 행 1건이 만들어낼 접수 레코드 */
export interface PreviewRecord {
    receptionNumber?: string;
    name: string;
    phoneNumber: string;
    lotAddress: string;
    cropsDisplay: string;
    area: string;
    subCategory: string;
    purpose: string;
    note: string;
    businessRegNo: string;
    addressRoad: string;
    date: string;
    landClass1: string;
}

export type PreviewStatus = 'new' | 'dup' | 'err';

export interface PreviewItem {
    status: PreviewStatus;
    /** 표에 보여줄 접수번호(또는 오류 표시) */
    display: string;
    rec: PreviewRecord;
    /** 자동부여로 번호를 만든 행 */
    auto?: boolean;
    /** 중복이고 건너뛰기 정책이라 등록되지 않는 행 */
    skip?: boolean;
    /** 오류 사유 */
    reason?: string;
}

export interface PreviewStats {
    total: number;
    new: number;
    dup: number;
    err: number;
}

export interface PreviewResult {
    items: PreviewItem[];
    stats: PreviewStats;
    /** 실제 등록될 건수 = new + (덮어쓰기 정책의 dup) */
    willImport: number;
    landClass1: string;
}

export type DupPolicy = 'skip' | 'overwrite';

export interface ComputePreviewOptions {
    /** 파싱된 데이터 행 (헤더 제외) */
    rows: readonly string[][];
    /** 컬럼 매핑 { 필드키: 컬럼인덱스 } */
    mapping: ColumnMapping;
    /** 일괄 적용할 경지구분 1차 */
    landClass1?: string;
    /** 접수번호 자동부여 여부 (매핑이 없으면 자동으로 켜진다) */
    autoNumber?: boolean;
    /** 중복 시 정책 */
    dupPolicy?: DupPolicy;
    /** 기존 접수번호 집합 (collectExistingNumbers 결과) */
    existing?: ReadonlySet<string>;
    /**
     * 자동부여 시작 번호. 매니저의 `getNextNumberForClass()` 결과를 넘긴다.
     * 넘기지 않으면 `existing`의 최대값 + 1로 계산한다(매니저 미준비 시 폴백).
     */
    nextNumber?: number | null;
}

/**
 * 기존 레코드에서 "같은 연도 + 같은 경지구분1차" 범위의 접수번호 집합을 만든다.
 *
 * 제외 조건은 매니저의 `getNextNumberForClass`와 같아야 한다 — 어긋나면
 * 미리보기가 보여준 번호와 실제 저장 번호가 달라진다:
 * - 성토(`subCategory === '성토'`)는 별도 시퀀스
 * - `F` 접두 번호(성토 채번)도 제외
 * - 서브넘버(`5-1`)는 기본번호(`5`)로 접어 넣는다
 */
export function collectExistingNumbers(
    logs: readonly ExistingLogLike[] | null | undefined,
    landClass1: string,
): Set<string> {
    const set = new Set<string>();
    for (const log of logs ?? []) {
        if (!log || !log.receptionNumber) continue;
        if ((log.landClass1 || LAND_CLASS1_DEFAULT) !== landClass1) continue;
        if (log.subCategory === '성토') continue;

        const base = String(log.receptionNumber).split('-')[0].trim();
        if (base.startsWith('F')) continue;
        set.add(base);
    }
    return set;
}

/** existing 집합에서 다음 번호를 추정한다 (매니저 미준비 시 폴백) */
function inferNextNumber(existing: ReadonlySet<string>): number {
    let maxN = 0;
    existing.forEach((n) => {
        const v = Number.parseInt(n, 10);
        if (!Number.isNaN(v) && v > maxN) maxN = v;
    });
    return maxN + 1;
}

/**
 * 파싱된 행 + 매핑 → 미리보기 결과.
 *
 * 반환 `null`은 "미리보기를 만들 수 없음"이다:
 * - 데이터 행이 없다
 * - 매핑이 하나도 없다
 * - 식별 필드(성명·지번주소·접수번호) 중 아무것도 매핑되지 않았다
 *   → 이름도 주소도 없이 등록하면 어떤 행인지 식별할 수 없다
 */
export function computePreview(opts: ComputePreviewOptions): PreviewResult | null {
    const rows = opts.rows ?? [];
    const mapping = opts.mapping ?? {};
    const landClass1 = opts.landClass1 || LAND_CLASS1_DEFAULT;
    const dupPolicy: DupPolicy = opts.dupPolicy ?? 'skip';
    const existing = opts.existing ?? new Set<string>();

    const mappedKeys = Object.keys(mapping);
    const hasIdentity = mapping.name != null || mapping.lotAddress != null || mapping.receptionNumber != null;
    if (rows.length === 0 || mappedKeys.length === 0 || !hasIdentity) return null;

    // 접수번호 컬럼이 매핑되지 않았으면 자동부여가 강제된다
    const autoAll = Boolean(opts.autoNumber) || mapping.receptionNumber == null;

    /**
     * 자동부여 커서. `autoAll`이 아니어도 **반드시** 초기화한다 —
     * 접수번호 컬럼은 매핑됐지만 특정 행의 칸만 빈 경우에도 자동부여로 넘어가기 때문이다.
     *
     * 메인(`soil-result-importer.js:970`)은 이 초기화를 `autoAll`일 때만 해서,
     * 그 경로에 들어온 첫 행의 접수번호가 `String(null)` → 문자열 `'null'`이 됐다.
     * (다음 행부터는 `null + 1 = 1`로 이어져 1번부터 다시 시작한다.)
     */
    let nextNum: number = opts.nextNumber ?? inferNextNumber(existing);

    /** 이 배치 안에서 이미 쓴 번호 — 기존 레코드와 별도로 추적해야 배치 내 충돌을 잡는다 */
    const seenInBatch = new Set<string>();
    const items: PreviewItem[] = [];
    const stats: PreviewStats = { total: rows.length, new: 0, dup: 0, err: 0 };

    for (const row of rows) {
        const get = (key: string): string => {
            const idx = mapping[key];
            if (idx == null || idx < 0) return '';
            return String(row[idx] ?? '').trim();
        };

        const rec: PreviewRecord = {
            name: get('name'),
            phoneNumber: get('phoneNumber'),
            lotAddress: get('lotAddress'),
            cropsDisplay: get('cropsDisplay'),
            area: get('area'),
            subCategory: get('subCategory'),
            purpose: get('purpose'),
            note: get('note'),
            businessRegNo: get('businessRegNo'),
            addressRoad: get('addressRoad'),
            date: get('date'),
            landClass1,
        };

        // 성명도 주소도 없으면 어떤 행인지 식별할 수 없다
        if (!rec.name && !rec.lotAddress) {
            stats.err++;
            items.push({ status: 'err', reason: '성명·주소 없음', display: '(빈 행)', rec });
            continue;
        }

        let useAuto = autoAll;
        let recNo = '';
        if (!useAuto) {
            recNo = get('receptionNumber');
            // 매핑은 있으나 그 칸이 비어 있는 행은 자동부여로 넘긴다
            if (!recNo) useAuto = true;
        }

        if (useAuto) {
            // 기존·배치 양쪽을 피해 증가시킨다
            let candidate = nextNum;
            while (existing.has(String(candidate)) || seenInBatch.has(String(candidate))) candidate++;
            recNo = String(candidate);
            nextNum = candidate + 1;
            seenInBatch.add(recNo);
            stats.new++;
            items.push({ status: 'new', display: recNo, rec: { ...rec }, auto: true });
        } else {
            const base = recNo.split('-')[0].trim();
            const isDup = existing.has(base) || seenInBatch.has(base);
            const willBeSaved = !(isDup && dupPolicy === 'skip');
            seenInBatch.add(base);

            // 수동 번호가 실제로 저장되면 매니저의 max+1 채번이 그 번호를 넘어간다.
            // 미리보기 커서도 같이 올려야 뒤따르는 자동부여 행의 표시 번호가 실제와 맞는다
            // (예: 기존 최대 10에 수동 50을 저장하면 다음 자동번호는 11이 아니라 51이다).
            if (willBeSaved) {
                const baseNum = Number.parseInt(base, 10);
                if (!Number.isNaN(baseNum) && baseNum + 1 > nextNum) nextNum = baseNum + 1;
            }

            if (isDup) {
                stats.dup++;
                items.push({
                    status: 'dup',
                    display: recNo,
                    skip: dupPolicy === 'skip',
                    rec: { ...rec, receptionNumber: recNo },
                });
            } else {
                stats.new++;
                items.push({ status: 'new', display: recNo, rec: { ...rec, receptionNumber: recNo } });
            }
        }
    }

    const willImport = items.filter(
        (it) => it.status === 'new' || (it.status === 'dup' && !it.skip),
    ).length;

    return { items, stats, willImport, landClass1 };
}
