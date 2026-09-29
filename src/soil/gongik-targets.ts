/**
 * 공익직불제 일괄 적용 대상 선별 (순수 함수)
 *
 * `applyGongikBulk`의 대상 필터링 조건을 DOM/부수효과에서 분리하여 테스트 가능하게 한다.
 * landClass1이 없거나 undefined/null/''인 레코드는 기본값(DEFAULT_LAND_CLASS)으로 폴백되므로
 * '공익직불제'에 매칭되지 않는다.
 */

import { DEFAULT_LAND_CLASS } from './reception-number';

/** 기본 경지구분 1차 — 기존 import 경로 유지용 별칭 */
export const GONGIK_LAND_CLASS1_DEFAULT = DEFAULT_LAND_CLASS;

/** 공익직불제 대상 판별 대상이 되는 최소 형태 */
export interface GongikSelectable {
    landClass1?: string | null;
}

/**
 * 경지구분 1차가 '공익직불제'인 레코드만 반환.
 * @param logs 대상 레코드 배열
 * @param landClass1Default landClass1 미지정 시 폴백 (기본 DEFAULT_LAND_CLASS)
 */
export function selectGongikTargets<T extends GongikSelectable>(
    logs: readonly T[],
    landClass1Default: string = GONGIK_LAND_CLASS1_DEFAULT
): T[] {
    if (!Array.isArray(logs)) return [];
    return logs.filter(l => (l.landClass1 || landClass1Default) === '공익직불제');
}
