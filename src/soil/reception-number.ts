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
 * 채번(computeNextNumber)과 가져오기 중복 판정(collectExistingNumbers)이 공유하는 분류 규칙.
 * 대상 풀이면 비교 키(본번, 성토는 F를 뗀 숫자부)를, 아니면 null을 돌려준다.
 * targetClass는 호출부가 확정해 넘긴다 — 빈 값을 기본값으로 폴백하는지가 두 호출부에서 다르다.
 */
export function receptionBaseKey(
    log: ReceptionKeySource | null | undefined,
    fill: boolean,
    targetClass: string,
    defaultClass: string = DEFAULT_LAND_CLASS,
): string | null {
    if (!log || !log.receptionNumber) return null;
    if ((log.landClass1 || defaultClass) !== targetClass) return null;
    if (fill !== (log.subCategory === '성토')) return null;

    const base = String(log.receptionNumber).split('-')[0].trim();
    if (!fill && base.startsWith('F')) return null;
    return fill ? base.replace('F', '') : base;
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
