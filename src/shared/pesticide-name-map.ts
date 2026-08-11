// ========================================
// 농약명 영한 매핑 테이블 (TypeScript 이식)
// 소스: 잔류농약_한글명매핑.xlsx (수동 검증) + 기존 수동 오버라이드 병합
//       + 식품안전나라 OpenAPI I1050 MRL 건수
// ========================================
// 메인 프로젝트 src/shared/pesticide-name-map.js 의 TS 이식.
//   - 데이터는 pesticide-name-map.json 에서 import (단일 출처).
//   - 메인과 동일하게 window.PESTICIDE_NAME_MAP 전역으로 노출한다
//     (mrl-api.ts / pesticide-use-type.ts 가 이 전역을 참조).
//   - 타입은 느슨하게(Record) 유지해 거대한 데이터 객체에 대한
//     typecheck-gate 회귀(baseline 717)를 유발하지 않는다.
// ========================================

import nameMapJson from './pesticide-name-map.json';

/** name-map 한 항목 (영문키 → 한글/신뢰도/점수 등) */
export interface PesticideNameMapEntry {
  kor: string;
  confidence?: string;
  score?: number;
  mrl_count?: number;
  [k: string]: unknown;
}

/** PESTICIDE_NAME_MAP 전체 형태 (meta + map). 데이터는 느슨한 타입으로 둔다. */
export interface PesticideNameMap {
  meta?: Record<string, unknown>;
  map: Record<string, PesticideNameMapEntry>;
}

// JSON 은 resolveJsonModule 로 로드되며 구조가 거대하므로 느슨하게 단언한다.
export const PESTICIDE_NAME_MAP: PesticideNameMap = nameMapJson as unknown as PesticideNameMap;

// 브라우저(렌더러) 전역 노출 — 메인 구현과 동일.
if (typeof window !== 'undefined') {
  (window as unknown as { PESTICIDE_NAME_MAP?: PesticideNameMap }).PESTICIDE_NAME_MAP =
    PESTICIDE_NAME_MAP;
}

export default PESTICIDE_NAME_MAP;
