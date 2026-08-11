/**
 * 접수번호 채번 순수 로직 (DOM/매니저 비의존 · 단위 테스트 대상)
 *
 * 토양 접수번호 규칙:
 *  - 같은 경지구분 1차(landClass1) 범위 내에서 독립적으로 max+1 채번한다.
 *  - 일반 시료와 성토(subCategory='성토', 'F' 접두) 시료는 서로 다른 번호 체계를 쓴다.
 *  - 접수번호의 본번은 '12-3'처럼 '-' 뒤 가지번호를 가질 수 있어 split('-')[0]로 본번만 본다.
 *
 * SoilSampleManager의 generateNextReceptionNumber / generateNextFillReceptionNumber 가
 * 모두 이 함수에 위임한다(알고리즘 단일화).
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

export const DEFAULT_LAND_CLASS = '농가의뢰';

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
        if (!log || !log.receptionNumber) continue;
        // 성토/일반 체계 분리
        const isFill = log.subCategory === '성토';
        if (fill !== isFill) continue;
        // 같은 경지구분 1차 범위만
        if ((log.landClass1 || def) !== target) continue;

        const baseNumber = String(log.receptionNumber).split('-')[0];
        // 일반 체계에서는 'F' 접두(성토 흔적) 번호를 제외
        if (!fill && baseNumber.startsWith('F')) continue;

        const numStr = fill ? baseNumber.replace('F', '') : baseNumber;
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
    }
    return maxNumber + 1;
}
