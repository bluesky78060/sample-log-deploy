// ========================================
// MRL 농약명 검색 매칭 (순수 함수, TS 이식)
// ========================================
// 한글/영문 농약명 입력을 정규화하고, name-map(영↔한)과
// MRL 데이터(한글 농약명)를 교차 매칭하기 위한 순수 함수 모음.
//
// [M4] 메인 mrl-search.js 의 `require('./mrl-name-canon.js')` Node 폴백 분기 제거.
//   렌더러 ESM 전용 — canon 모듈은 정적 import(또는 window.MrlNameCanon)로 참조한다.
//
// 데이터 언어 전제:
//   - 식품안전나라 I1050 캐시: 농약명/식품명 모두 "한글"
//   - PESTICIDE_NAME_MAP.map: 영문명(키) → { kor, confidence, ... }
//   따라서 영문 검색은 name-map으로 영→한 변환 후 한글 농약명과 매칭한다.
// ========================================

import * as Canon from './mrl-name-canon';

export interface NameMapEntryLike {
  kor?: string;
  [k: string]: unknown;
}

export interface PesticideCandidate {
  kor: string;
  engNames: string[];
  inMrl: boolean;
}

/**
 * 검색어/이름 정규화: 공백 제거, 괄호 부가표기 제거, 소문자화
 * MrlApi.normalize와 동일한 규칙(테스트 일관성 위해 재구현).
 */
export function normalize(str: unknown): string {
  if (!str) return '';
  return String(str)
    .replace(/\([^)]*\)/g, '') // 괄호 안 제거
    .replace(/\s+/g, '') // 공백 제거
    .toLowerCase();
}

/** 한글 포함 여부 */
export function hasKorean(str: unknown): boolean {
  return /[가-힣]/.test(String(str || ''));
}

/**
 * name-map(영문키 → {kor}) 으로부터 한글→영문 역방향 인덱스 구축.
 * 동일 한글명에 여러 영문명이 매핑될 수 있어 배열로 보관.
 */
export function buildKorToEngIndex(
  nameMapEntries: Record<string, NameMapEntryLike> | null | undefined
): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  if (!nameMapEntries || typeof nameMapEntries !== 'object') return idx;
  for (const eng of Object.keys(nameMapEntries)) {
    const entry = nameMapEntries[eng];
    const kor = entry && entry.kor;
    if (!kor) continue;
    const key = normalize(kor);
    if (!key) continue;
    if (!idx.has(key)) idx.set(key, []);
    const arr = idx.get(key)!;
    if (!arr.includes(eng)) arr.push(eng);
  }
  return idx;
}

/** 특정 한글 농약명에 대응하는 영문명 목록 조회. */
export function engNamesForKor(
  kor: string,
  korToEngIndex: Map<string, string[]> | null | undefined
): string[] {
  if (!kor || !korToEngIndex) return [];
  return korToEngIndex.get(normalize(kor)) || [];
}

/**
 * 농약 검색 후보 계산 (순수 함수).
 * 반환: [{ kor, engNames: string[], inMrl: boolean }] (kor 기준 고유)
 */
export function findPesticideCandidates(
  query: string,
  korPesticideNames: string[] | null | undefined,
  nameMapEntries: Record<string, NameMapEntryLike> | null | undefined,
  limit?: number
): PesticideCandidate[] {
  const max = typeof limit === 'number' && limit > 0 ? limit : 30;
  const q = normalize(query);
  if (!q) return [];

  const korList = Array.isArray(korPesticideNames) ? korPesticideNames : [];
  const korToEngIndex = buildKorToEngIndex(nameMapEntries);

  // [M4] canon 모듈: 렌더러=window.MrlNameCanon, 그 외=정적 import (require 폴백 제거)
  const C =
    (typeof window !== 'undefined' &&
      (window as unknown as { MrlNameCanon?: Canon.MrlNameCanonApi }).MrlNameCanon) ||
    Canon;
  const canon = C ? C.canonicalizeKor : normalize;
  const strip = C ? C.stripIsomerSuffix : (x: string): string => x;

  // MRL 한글명 canon 인덱스 (inMrl 판정용): canon + 이성질체 접미 제거형 둘 다 등록
  const mrlCanon = new Set<string>();
  for (const k of korList) {
    const c = canon(k);
    mrlCanon.add(c);
    mrlCanon.add(strip(c));
  }
  const inMrlOf = (kor: string): boolean => {
    const c = canon(kor);
    return mrlCanon.has(c) || mrlCanon.has(strip(c));
  };

  // 결과 누적: key=normalize(kor) → { kor, engNames:Set, inMrl }
  const acc = new Map<string, { kor: string; engNames: Set<string>; inMrl: boolean }>();

  function add(kor: string | undefined, inMrl: boolean): void {
    if (!kor) return;
    const key = normalize(kor);
    if (!key) return;
    if (!acc.has(key)) {
      acc.set(key, {
        kor,
        engNames: new Set(engNamesForKor(kor, korToEngIndex)),
        inMrl: !!inMrl,
      });
    } else if (inMrl) {
      acc.get(key)!.inMrl = true;
    }
  }

  const korean = hasKorean(query);

  if (korean) {
    // 1a) MRL 한글 농약명 직접 부분일치
    for (const kor of korList) {
      if (normalize(kor).includes(q)) add(kor, true);
    }
    // 1b) name-map 한글값 부분일치 (MRL에 없을 수도 있는 농약 보강)
    if (nameMapEntries) {
      for (const eng of Object.keys(nameMapEntries)) {
        const entry = nameMapEntries[eng];
        const kor = entry && entry.kor;
        if (kor && normalize(kor).includes(q)) {
          add(kor, inMrlOf(kor));
        }
      }
    }
  } else {
    // 2a) name-map 영문키 부분일치 → 한글로 변환
    if (nameMapEntries) {
      for (const eng of Object.keys(nameMapEntries)) {
        if (normalize(eng).includes(q)) {
          const entry = nameMapEntries[eng];
          const kor = entry && entry.kor;
          if (kor) add(kor, inMrlOf(kor));
        }
      }
    }
    // 2b) 혹시 MRL 한글명 자체가 영문 표기를 포함하는 경우(드묾)도 보강
    for (const kor of korList) {
      if (normalize(kor).includes(q)) add(kor, true);
    }
  }

  // 정렬: MRL 보유 우선 → 이름 길이 짧은 순 → 가나다
  const result: PesticideCandidate[] = Array.from(acc.values()).map((v) => ({
    kor: v.kor,
    engNames: Array.from(v.engNames),
    inMrl: v.inMrl,
  }));

  result.sort((a, b) => {
    if (a.inMrl !== b.inMrl) return a.inMrl ? -1 : 1;
    if (a.kor.length !== b.kor.length) return a.kor.length - b.kor.length;
    return a.kor.localeCompare(b.kor, 'ko');
  });

  return result.slice(0, max);
}

export interface MrlSearchApi {
  normalize: (str: unknown) => string;
  hasKorean: (str: unknown) => boolean;
  buildKorToEngIndex: (
    nameMapEntries: Record<string, NameMapEntryLike> | null | undefined
  ) => Map<string, string[]>;
  engNamesForKor: (kor: string, korToEngIndex: Map<string, string[]> | null | undefined) => string[];
  findPesticideCandidates: (
    query: string,
    korPesticideNames: string[] | null | undefined,
    nameMapEntries: Record<string, NameMapEntryLike> | null | undefined,
    limit?: number
  ) => PesticideCandidate[];
}

export const MrlSearch: MrlSearchApi = {
  normalize,
  hasKorean,
  buildKorToEngIndex,
  engNamesForKor,
  findPesticideCandidates,
};

if (typeof window !== 'undefined') {
  (window as unknown as { MrlSearch?: MrlSearchApi }).MrlSearch = MrlSearch;
}

export default MrlSearch;
