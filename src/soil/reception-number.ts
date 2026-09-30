/**
 * 접수번호 채번 순수 로직 (DOM/매니저 비의존 · 단위 테스트 대상)
 *
 * 토양 접수번호 규칙:
 *  - 같은 경지구분 1차(landClass1) 범위 내에서 독립적으로 max+1 채번한다.
 *  - 일반 시료와 성토(subCategory='성토', 'F' 접두) 시료는 서로 다른 번호 체계를 쓴다.
 *  - 접수번호의 본번은 '12-3'처럼 '-' 뒤 가지번호를 가질 수 있어 split('-')[0]로 본번만 본다.
 *
 * SoilSampleManager의 채번 메서드는 모두 computeNextNumber에, 가져오기 미리보기의
 * 중복 판정은 receptionBaseKey에 위임한다(분류 규칙 단일화).
 */

/** 채번 계산에 필요한 최소 로그 형태 */
export interface ReceptionLogLike {
    receptionNumber?: string;
    subCategory?: string;
    landClass1?: string;
}

export interface ComputeNextNumberOptions {
    /** true면 성토(F) 번호 체계, false면 일반 */
    fill?: boolean;
    /** landClass1 누락 로그의 기본 분류 */
    defaultClass?: string;
}

/** 경지구분 1차 기본값 — 이 파일 밖에서 이 문자열을 다시 적지 않는다 */
export const DEFAULT_LAND_CLASS = '농가의뢰';

/** 경지구분 1차 값 목록 (폼·목록 탭·가져오기 모달이 공유) */
export const LAND_CLASS1_OPTIONS = [
    '개량제', '전략', '직불', '자체', '기타', '친환경',
    '유기농', '무농약', 'GAP', DEFAULT_LAND_CLASS, '대표필지', '공익직불제',
] as const;

/** receptionBaseKey가 읽는 필드 — 저장소 원본은 숫자·null도 섞여 있다 */
export interface ReceptionKeySource {
    receptionNumber?: string | number | null;
    subCategory?: string | null;
    landClass1?: string | null;
}

/**
 * 성토(F) 시퀀스 레코드인가. 구분이 '성토'가 아니어도 번호가 F면 성토 풀이다 — 폼 등록은 필지 카드의
 * 구분을 저장하므로 F1 레코드가 '논'으로 남을 수 있고, 그걸 어느 풀에도 넣지 않으면 성토 채번이 F1을
 * 다시 내놓아 중복 검사에 막힌다. 흙토람 형제 판정도 이 함수를 쓴다.
 */
export function isFillLog(log: { receptionNumber?: string | number | null; subCategory?: string | null }): boolean {
    return log.subCategory === '성토' || String(log.receptionNumber ?? '').trim().startsWith('F');
}

/**
 * 채번(computeNextNumber)과 가져오기 중복 판정(collectExistingNumbers)이 공유하는 분류 규칙.
 * 대상 풀이면 비교 키(본번, 성토는 F를 뗀 숫자부)를, 아니면 null을 돌려준다.
 * targetClass는 호출부가 확정해 넘긴다 — 빈 값을 기본값으로 폴백하는지가 두 호출부에서 다르다.
 *
 * F 없는 성토 레코드는 양쪽 풀에 든다. 일반 풀에서 빼면 일반 채번이 그 번호를 다시 내고,
 * 폼 중복 검사는 본번만 보므로 같은 번호를 영구히 거부한다(등록 불가).
 */
export function receptionBaseKey(
    log: ReceptionKeySource | null | undefined,
    fill: boolean,
    targetClass: string,
    defaultClass: string = DEFAULT_LAND_CLASS,
): string | null {
    if (!log || !log.receptionNumber) return null;
    if ((log.landClass1 || defaultClass) !== targetClass) return null;

    const base = String(log.receptionNumber).split('-')[0].trim();
    if (fill) return isFillLog(log) ? base.replace('F', '') : null;
    return base.startsWith('F') ? null : base;
}

/**
 * 주어진 로그 배열에서 targetClass 범위의 다음 접수번호(정수)를 계산.
 * @param logs 시료 로그 배열
 * @param targetClass 기준 경지구분 1차
 * @param opts fill / defaultClass 옵션
 * @returns 다음 번호(정수). 성토도 정수를 반환하며 'F' 접두는 호출측이 붙인다.
 */
export function computeNextNumber(
    logs: ReadonlyArray<ReceptionLogLike> | null | undefined,
    targetClass?: string,
    opts?: ComputeNextNumberOptions
): number {
    const o = opts || {};
    const fill = !!o.fill;
    const def = o.defaultClass || DEFAULT_LAND_CLASS;
    const target = targetClass || def;

    let maxNumber = 0;
    const list = Array.isArray(logs) ? logs : [];
    for (const log of list) {
        const key = receptionBaseKey(log, fill, target, def);
        if (key === null) continue;
        const num = parseInt(key, 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
    }
    return maxNumber + 1;
}

/**
 * 가져오는 행이 성토(F) 시퀀스인가. 번호가 있으면 F 접두로만 정하고(구분과 어긋나는 행은
 * importRowConflict가 오류로 거른다), 번호가 없는 자동부여 행만 구분을 본다.
 */
export function isFillImportRow(receptionNumber: string | null | undefined, subCategory: string | null | undefined): boolean {
    const rn = String(receptionNumber ?? '').trim();
    return rn ? rn.startsWith('F') : subCategory === '성토';
}

/** 수동 번호와 구분이 어긋나는 행의 오류 사유. 어느 한쪽을 믿고 저장하면 번호 풀 밖 레코드가 생긴다 */
export function importRowConflict(receptionNumber: string | null | undefined, subCategory: string | null | undefined): string | null {
    const rn = String(receptionNumber ?? '').trim();
    if (!rn) return null;
    const fill = rn.startsWith('F');
    if (fill && subCategory && subCategory !== '성토') return 'F 번호인데 구분이 성토가 아닙니다';
    if (!fill && subCategory === '성토') return '구분이 성토인데 번호에 F가 없습니다';
    return null;
}

/**
 * 새로 저장될 레코드의 구분. 구분이 빈 F 번호 행은 성토로 저장한다. 미리보기와 매니저가 같이 쓴다.
 */
export function importedSubCategory(receptionNumber: string | undefined, subCategory: string): string {
    if (subCategory) return subCategory;
    return isFillImportRow(receptionNumber, subCategory) ? '성토' : '';
}

export type ImportMatch<T> =
    | { kind: 'none' }
    | { kind: 'match'; target: T }
    /** 같은 본번의 가지번호 레코드가 여럿이라 어느 것을 덮을지 고를 수 없다 */
    | { kind: 'ambiguous' }
    /** 'N-M' 행인데 N-M 레코드는 없고 번호가 정확히 N인 레코드가 있다 — 그 레코드의 하위필지 행으로 본다 */
    | { kind: 'subrow'; parent: string };

/**
 * 가져오기 한 행이 덮어쓸 기존 레코드. 미리보기와 매니저가 이 함수 하나로 판정한다.
 * 1) 같은 경지구분에서 번호가 정확히 같은 레코드(풀 무관). 여러 건이면 ambiguous
 * 2) 'N-M' 행: 같은 풀에 정확히 N인 레코드가 있으면 subrow, 없으면 none(새 가지번호 레코드)
 * 3) 'N' 행: 같은 풀의 가지번호 레코드 N-K가 한 건이면 그것, 여럿이면 ambiguous
 * 부모로 접는 것은 3)의 방향뿐이다 — 'N-M'을 N에 접으면 본필지가 하위필지 값으로 덮인다.
 */
export function matchImportRow<T extends ReceptionKeySource>(
    logs: ReadonlyArray<T>,
    receptionNumber: string,
    landClass1: string,
): ImportMatch<T> {
    const rn = String(receptionNumber ?? '').trim();
    if (!rn) return { kind: 'none' };
    const exact = logs.filter(l => (l.landClass1 || DEFAULT_LAND_CLASS) === landClass1
        && String(l.receptionNumber ?? '').trim() === rn);
    if (exact.length > 1) return { kind: 'ambiguous' };
    if (exact.length === 1) return { kind: 'match', target: exact[0] };

    const fill = rn.startsWith('F');
    const key = receptionBaseKey({ receptionNumber: rn, landClass1 }, fill, landClass1);
    if (key === null) return { kind: 'none' };
    const pool = logs.filter(l => receptionBaseKey(l, fill, landClass1) === key);

    const base = rn.split('-')[0].trim();
    if (base !== rn) {
        const hasParent = pool.some(l => String(l.receptionNumber ?? '').trim() === base);
        return hasParent ? { kind: 'subrow', parent: base } : { kind: 'none' };
    }
    if (pool.length === 0) return { kind: 'none' };
    return pool.length === 1 ? { kind: 'match', target: pool[0] } : { kind: 'ambiguous' };
}
