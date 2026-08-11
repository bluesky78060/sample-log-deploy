import { describe, it, expect, beforeAll } from 'vitest';

// 메인 tests/unit/mrl-search.test.js 의 TS 이식. .ts side-effect import 로 window.MrlSearch 노출.
let MrlSearch: typeof import('../../src/shared/mrl-search').MrlSearch;

beforeAll(async () => {
  await import('../../src/shared/mrl-search');
  MrlSearch = (window as unknown as { MrlSearch: typeof MrlSearch }).MrlSearch;
});

// 샘플 name-map: 영문키 → { kor }
const NAME_MAP = {
  Diazinon: { kor: '다이아지논', confidence: 'exact', score: 1.0 },
  'Parathion-methyl': { kor: '파라티온메틸', confidence: 'exact', score: 1.0 },
  Chlorpyrifos: { kor: '클로르피리포스', confidence: 'exact', score: 1.0 },
  // 동일 한글명에 두 영문 표기가 매핑되는 케이스
  DDT: { kor: '디디티', confidence: 'exact', score: 1.0 },
  'p,p-DDT': { kor: '디디티', confidence: 'manual', score: 1.0 },
};

// MRL 데이터에 존재하는 고유 한글 농약명 (캐시는 한글)
const MRL_KOR = ['다이아지논', '클로르피리포스', '아바멕틴'];

describe('MrlSearch.normalize', () => {
  it('공백 제거 + 소문자화 + 괄호 제거', () => {
    expect(MrlSearch.normalize(' Di a (foo) Zinon ')).toBe('diazinon');
    expect(MrlSearch.normalize('다이아지논(Diazinon)')).toBe('다이아지논');
  });
  it('빈 입력은 빈 문자열', () => {
    expect(MrlSearch.normalize('')).toBe('');
    expect(MrlSearch.normalize(null)).toBe('');
    expect(MrlSearch.normalize(undefined)).toBe('');
  });
});

describe('MrlSearch.hasKorean', () => {
  it('한글 포함 판정', () => {
    expect(MrlSearch.hasKorean('다이아지논')).toBe(true);
    expect(MrlSearch.hasKorean('Diazinon')).toBe(false);
    expect(MrlSearch.hasKorean('Dia다지논')).toBe(true);
    expect(MrlSearch.hasKorean('')).toBe(false);
  });
});

describe('MrlSearch.buildKorToEngIndex / engNamesForKor', () => {
  it('한글 → 영문 역방향 인덱스 (다대일 병합)', () => {
    const idx = MrlSearch.buildKorToEngIndex(NAME_MAP);
    expect(idx.get('다이아지논')).toEqual(['Diazinon']);
    expect(idx.get('디디티')!.sort()).toEqual(['DDT', 'p,p-DDT']);
  });
  it('engNamesForKor 조회', () => {
    const idx = MrlSearch.buildKorToEngIndex(NAME_MAP);
    expect(MrlSearch.engNamesForKor('클로르피리포스', idx)).toEqual(['Chlorpyrifos']);
    expect(MrlSearch.engNamesForKor('없는농약', idx)).toEqual([]);
  });
});

describe('MrlSearch.findPesticideCandidates — 한글 입력', () => {
  it('MRL 한글 농약명 부분일치 + 영문 병기', () => {
    const res = MrlSearch.findPesticideCandidates('다이아', MRL_KOR, NAME_MAP);
    const dia = res.find((r) => r.kor === '다이아지논');
    expect(dia).toBeTruthy();
    expect(dia!.inMrl).toBe(true);
    expect(dia!.engNames).toEqual(['Diazinon']);
  });

  it('name-map에만 있고 MRL에 없는 농약은 inMrl=false', () => {
    const res = MrlSearch.findPesticideCandidates('파라티온', MRL_KOR, NAME_MAP);
    const par = res.find((r) => r.kor === '파라티온메틸');
    expect(par).toBeTruthy();
    expect(par!.inMrl).toBe(false);
    expect(par!.engNames).toEqual(['Parathion-methyl']);
  });

  it('MRL 보유 농약이 정렬상 앞선다', () => {
    // '클로르' → 클로르피리포스(MRL 보유)
    const res = MrlSearch.findPesticideCandidates('클로르', MRL_KOR, NAME_MAP);
    expect(res[0].kor).toBe('클로르피리포스');
    expect(res[0].inMrl).toBe(true);
  });
});

describe('MrlSearch.findPesticideCandidates — 영문 입력', () => {
  it('영문 부분일치 → 한글 변환 (대소문자 무시)', () => {
    const res = MrlSearch.findPesticideCandidates('diaz', MRL_KOR, NAME_MAP);
    const dia = res.find((r) => r.kor === '다이아지논');
    expect(dia).toBeTruthy();
    expect(dia!.inMrl).toBe(true);
    expect(dia!.engNames).toContain('Diazinon');
  });

  it('영문 매칭이 MRL에 없으면 inMrl=false', () => {
    const res = MrlSearch.findPesticideCandidates('Parathion', MRL_KOR, NAME_MAP);
    const par = res.find((r) => r.kor === '파라티온메틸');
    expect(par).toBeTruthy();
    expect(par!.inMrl).toBe(false);
  });

  it('다대일 영문 표기는 같은 한글 후보 1개로 병합', () => {
    const res = MrlSearch.findPesticideCandidates('ddt', MRL_KOR, NAME_MAP);
    const ddt = res.filter((r) => r.kor === '디디티');
    expect(ddt.length).toBe(1);
    expect(ddt[0].engNames.sort()).toEqual(['DDT', 'p,p-DDT']);
  });
});

describe('MrlSearch.findPesticideCandidates — 경계 케이스', () => {
  it('빈 검색어는 빈 배열', () => {
    expect(MrlSearch.findPesticideCandidates('', MRL_KOR, NAME_MAP)).toEqual([]);
    expect(MrlSearch.findPesticideCandidates('   ', MRL_KOR, NAME_MAP)).toEqual([]);
  });
  it('name-map 없이도 MRL 데이터만으로 동작', () => {
    const res = MrlSearch.findPesticideCandidates('아바멕틴', MRL_KOR, null);
    expect(res.length).toBe(1);
    expect(res[0].kor).toBe('아바멕틴');
    expect(res[0].inMrl).toBe(true);
    expect(res[0].engNames).toEqual([]);
  });
  it('limit 적용', () => {
    const many = ['가가1', '가가2', '가가3', '가가4'];
    const res = MrlSearch.findPesticideCandidates('가가', many, null, 2);
    expect(res.length).toBe(2);
  });
});
