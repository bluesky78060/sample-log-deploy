// ========================================
// mrl-name-canon.ts — 농약 한글명 음역 정규화 (SAMPL-1-105, TS 이식)
// ========================================
// 문제: 식품안전나라 MRL 데이터(AGCHM_KOR_NM)와 연구소 name-map(pesticide-name-map)이
//       같은 영문 농약을 서로 다른 한글로 음역한다.
//         Buprofezin   : 부프로페진(name-map) ↔ 뷰프로페진(MRL)
//         Isofenphos   : 이소펜포스         ↔ 아이소펜포스
//         Lufenuron    : 루페누론           ↔ 루페뉴론
//         Permethrin-cis: 시스-퍼메트린(이성질체 접두) ↔ 퍼메트린(MRL 기준명)
//       이 때문에 영문 검색 → name-map 한글 → MRL 대조가 실패해 'MRL 기준없음'으로 오표시됨.
// 해결: 알려진 음역 동치 규칙으로 양쪽을 같은 canonical 키로 정규화한 뒤 비교한다.
//
// 공개 API (window.MrlNameCanon / named exports):
//   canonicalizeKor(name)  : 한글 농약명 → canonical 키 (비교 전용, 표시용 아님)
//   stripIsomerSuffix(key) : canonical 키에서 이성질체/광학 접미사 제거(보조 매칭)
//   KOR_ALIAS              : name-map 한글 → MRL 한글 검증된 별칭(불규칙 케이스)
//
// 의존성 없음(순수) → 단위테스트 대상. mrl-api.ts·mrl-search.ts 양쪽에서 재사용.
// ========================================

// 검증된 불규칙 별칭: name-map(연구소) 한글 → 식품안전나라 한글.
//  - 메소밀: name-map 표기 오류(Methomyl 정명은 '메토밀')
export const KOR_ALIAS: Record<string, string> = {
  메소밀: '메토밀', // Methomyl
};

/** 기본 정규화: 괄호 부가표기·공백·하이픈·가운뎃점·마침표 제거 + 소문자화. */
export function baseNorm(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/\([^)]*\)/g, '')
    .replace(/[\s\-·.]/g, '')
    .toLowerCase();
}

// 입체/이성질체 접두 표기 (제거 대상): 시스/트랜스/감마/람다/알파/베타/델타 + 그리스문자
const STEREO_PREFIX = /^(시스|트랜스|감마|람다|알파|베타|델타|cis|trans|[αβγδλ])/;

/**
 * 음역 동치 정규화. 알려진 변형만 한 방향으로 흡수한다.
 * @param name 한글 농약명
 * @returns canonical 비교 키
 */
export function canonicalizeKor(name: unknown): string {
  if (name == null) return '';
  // 0) 검증된 별칭 우선 치환 (정규화 전 원문 기준)
  const trimmed = String(name).trim();
  const aliased = Object.prototype.hasOwnProperty.call(KOR_ALIAS, trimmed)
    ? KOR_ALIAS[trimmed]
    : name;

  let x = baseNorm(aliased);
  if (!x) return '';

  // 1) 입체 이성질체 접두 제거 (시스-퍼메트린 → 퍼메트린)
  x = x.replace(STEREO_PREFIX, '');

  // 2) 음역 동치 규칙 (순서 의존: 긴 패턴 먼저)
  const rules: Array<[RegExp, string]> = [
    [/아이소/g, '이소'], // iso: 아이소펜포스 → 이소펜포스
    [/아이드/g, '이드'], // -ide
    [/마이드/g, '미드'], // -amide
    [/아이/g, '이'],
    // yu(ㅠ) ↔ u(ㅜ) 모음 계열 일반화
    [/뷰/g, '부'], [/뮤/g, '무'], [/뉴/g, '누'], [/퓨/g, '푸'],
    [/슈/g, '수'], [/류/g, '루'], [/큐/g, '쿠'], [/듀/g, '두'],
    [/쥬/g, '주'], [/츄/g, '추'], [/휴/g, '후'], [/규/g, '구'],
    [/슐/g, '설'], // sulf
    [/라르/g, '라'], // -lar
    [/톨라/g, '토라'],
    [/러/g, '레'], // -ler-
    [/사이/g, '시'], // cy
    [/에스/g, 's'], // -S- 라틴 동치
  ];
  for (const [re, to] of rules) x = x.replace(re, to);
  return x;
}

/** canonical 키에서 이성질체/광학/대사체 접미사 제거(보조 매칭용). */
export function stripIsomerSuffix(key: unknown): string {
  if (!key) return '';
  return String(key)
    .replace(/(b1a|b1b|a3|a4|m1|옥손|설폰|설폭사이드|에놀|sulfone|sulfoxide|oxon)$/, '')
    .replace(/[ezrs]$/, '');
}

export interface MrlNameCanonApi {
  canonicalizeKor: (name: unknown) => string;
  stripIsomerSuffix: (key: unknown) => string;
  KOR_ALIAS: Record<string, string>;
  baseNorm: (s: unknown) => string;
}

export const MrlNameCanon: MrlNameCanonApi = {
  canonicalizeKor,
  stripIsomerSuffix,
  KOR_ALIAS,
  baseNorm,
};

if (typeof window !== 'undefined') {
  (window as unknown as { MrlNameCanon?: MrlNameCanonApi }).MrlNameCanon = MrlNameCanon;
}

export default MrlNameCanon;
