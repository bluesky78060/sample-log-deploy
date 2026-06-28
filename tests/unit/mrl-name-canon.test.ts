import { describe, it, expect, beforeAll } from 'vitest';

// 메인 tests/unit/mrl-name-canon.test.js 의 TS 이식.
// .ts 모듈 side-effect import 로 window.MrlNameCanon / window.MrlSearch 전역 노출.
let Canon: typeof import('../../src/shared/mrl-name-canon').MrlNameCanon;
let MrlSearch: typeof import('../../src/shared/mrl-search').MrlSearch;

beforeAll(async () => {
  await import('../../src/shared/mrl-name-canon');
  Canon = (window as unknown as { MrlNameCanon: typeof Canon }).MrlNameCanon;
  await import('../../src/shared/mrl-search');
  MrlSearch = (window as unknown as { MrlSearch: typeof MrlSearch }).MrlSearch;
});

describe('MrlNameCanon.canonicalizeKor — 음역 동치', () => {
  it('부프로페진 / 뷰프로페진 동일 canon (뷰→부)', () => {
    expect(Canon.canonicalizeKor('부프로페진')).toBe(Canon.canonicalizeKor('뷰프로페진'));
  });

  it('이소펜포스 / 아이소펜포스 동일 canon (아이소→이소)', () => {
    expect(Canon.canonicalizeKor('이소펜포스')).toBe(Canon.canonicalizeKor('아이소펜포스'));
  });

  it('루페누론 / 루페뉴론 동일 canon (뉴→누)', () => {
    expect(Canon.canonicalizeKor('루페누론')).toBe(Canon.canonicalizeKor('루페뉴론'));
  });

  it('시스-퍼메트린 → 퍼메트린 (입체 접두 제거)', () => {
    expect(Canon.canonicalizeKor('시스-퍼메트린')).toBe(Canon.canonicalizeKor('퍼메트린'));
  });

  it('람다-사이할로트린 입체 접두 제거 + cy(사이→시)', () => {
    expect(Canon.canonicalizeKor('람다-사이할로트린')).toBe(Canon.canonicalizeKor('시할로트린'));
  });

  it('KOR_ALIAS: 메소밀 → 메토밀 동일 canon', () => {
    expect(Canon.canonicalizeKor('메소밀')).toBe(Canon.canonicalizeKor('메토밀'));
    expect(Canon.KOR_ALIAS['메소밀']).toBe('메토밀');
  });

  it('괄호 부가표기/공백/하이픈 무시', () => {
    expect(Canon.canonicalizeKor('부프로페진 (Buprofezin)')).toBe(Canon.canonicalizeKor('뷰프로페진'));
  });

  it('s/에스 라틴 동치 (에스→s)', () => {
    expect(Canon.canonicalizeKor('에스메틸')).toBe(Canon.canonicalizeKor('s메틸'));
  });

  it('빈/널 입력은 빈 문자열', () => {
    expect(Canon.canonicalizeKor('')).toBe('');
    expect(Canon.canonicalizeKor(null)).toBe('');
    expect(Canon.canonicalizeKor(undefined)).toBe('');
  });
});

describe('MrlNameCanon.canonicalizeKor — 오매칭 방지 (서로 다른 농약은 분리)', () => {
  it('부타클로르 vs 헵타클로르는 다른 canon', () => {
    expect(Canon.canonicalizeKor('부타클로르')).not.toBe(Canon.canonicalizeKor('헵타클로르'));
  });

  it('부프로페진 vs 클로르피리포스는 다른 canon', () => {
    expect(Canon.canonicalizeKor('부프로페진')).not.toBe(Canon.canonicalizeKor('클로르피리포스'));
  });

  it('뷰타클로르 ↔ 부타클로르는 합쳐지되 헵타클로르와는 분리 유지', () => {
    expect(Canon.canonicalizeKor('뷰타클로르')).toBe(Canon.canonicalizeKor('부타클로르'));
    expect(Canon.canonicalizeKor('뷰타클로르')).not.toBe(Canon.canonicalizeKor('헵타클로르'));
  });
});

describe('MrlNameCanon.stripIsomerSuffix', () => {
  it('광학 접미(e/z/r/s) 제거', () => {
    const base = Canon.canonicalizeKor('퍼메트린');
    expect(Canon.stripIsomerSuffix(base + 's')).toBe(base);
  });

  it('대사체 접미(설폰/옥손) 제거', () => {
    expect(Canon.stripIsomerSuffix('카보설폰')).toBe('카보');
    expect(Canon.stripIsomerSuffix('말라옥손')).toBe('말라');
  });

  it('빈 입력은 빈 문자열', () => {
    expect(Canon.stripIsomerSuffix('')).toBe('');
    expect(Canon.stripIsomerSuffix(null)).toBe('');
  });
});

describe('mrl-search findPesticideCandidates — canon 경유 inMrl', () => {
  // 라이브 MRL 한글명(식품안전나라): 뷰프로페진(음역 차이)
  const MRL_KOR = ['뷰프로페진', '클로르피리포스', '아바멕틴'];
  // name-map: 영문키 → { kor }, name-map은 '부프로페진' 철자 사용
  const NAME_MAP = {
    Buprofezin: { kor: '부프로페진', confidence: 'exact', score: 1.0 },
    Chlorpyrifos: { kor: '클로르피리포스', confidence: 'exact', score: 1.0 },
  };

  it("영문 'Buprofezin' 검색 → name-map '부프로페진' 후보가 inMrl=true (canon으로 뷰프로페진과 매칭)", () => {
    const res = MrlSearch.findPesticideCandidates('Buprofezin', MRL_KOR, NAME_MAP);
    const buf = res.find((r) => r.kor === '부프로페진');
    expect(buf).toBeTruthy();
    expect(buf!.inMrl).toBe(true);
    expect(buf!.engNames).toContain('Buprofezin');
  });

  it('철자가 정확히 같은 클로르피리포스는 당연히 inMrl=true', () => {
    const res = MrlSearch.findPesticideCandidates('Chlorpyrifos', MRL_KOR, NAME_MAP);
    const c = res.find((r) => r.kor === '클로르피리포스');
    expect(c).toBeTruthy();
    expect(c!.inMrl).toBe(true);
  });

  it('한글 입력 부프로페진도 canon으로 inMrl=true (MRL은 뷰프로페진)', () => {
    const res = MrlSearch.findPesticideCandidates('부프로페진', MRL_KOR, NAME_MAP);
    const buf = res.find((r) => r.kor === '부프로페진');
    expect(buf).toBeTruthy();
    expect(buf!.inMrl).toBe(true);
  });
});
