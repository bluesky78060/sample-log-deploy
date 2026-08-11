import { describe, it, expect } from 'vitest';

// 메인 tests/unit/psis-parse.test.js 의 TS 이식.
// 순수 함수 모듈 → ESM named import (Node require 폴백 제거).
import {
  parsePsisUseName,
  normalizeUseName,
  decodeEntities,
  extractTagValues,
} from '../../src/shared/psis-parse';

describe('psis-parse — parsePsisUseName', () => {
  it('단일 useName 정상 추출', () => {
    const xml = `<service><list><useName>살충제</useName></list></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살충제', error: null });
  });

  it('다중 작물 동일 용도 → 다수결로 동일 값 반환', () => {
    const xml = `
            <service>
                <list><cropName>사과</cropName><useName>살균제</useName></list>
                <list><cropName>배</cropName><useName>살균제</useName></list>
                <list><cropName>포도</cropName><useName>살균제</useName></list>
            </service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살균제', error: null });
  });

  it('서로 다른 용도 혼재 시 가장 빈도 높은 값 채택(다수결)', () => {
    const xml = `
            <list><useName>제초제</useName></list>
            <list><useName>제초제</useName></list>
            <list><useName>살충제</useName></list>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '제초제', error: null });
  });

  it('빈 useName은 무시하고 비어있지 않은 최빈값 반환', () => {
    const xml = `
            <list><useName></useName></list>
            <list><useName>  </useName></list>
            <list><useName>살응애제</useName></list>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살응애제', error: null });
  });

  it('errorCode 응답 → error 메시지 조합, useName null', () => {
    const xml = `<service><errorCode>ERR_101</errorCode><errorMsg>인증키가 유효하지 않습니다</errorMsg></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: null, error: 'ERR_101: 인증키가 유효하지 않습니다' });
  });

  it('errorCode만 있고 errorMsg 없으면 코드만 반환', () => {
    const xml = `<service><errorCode>ERR_500</errorCode></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: null, error: 'ERR_500:' });
  });

  it('빈 문자열 → empty_response 에러', () => {
    expect(parsePsisUseName('')).toEqual({ useName: null, error: 'empty_response' });
    expect(parsePsisUseName('   ')).toEqual({ useName: null, error: 'empty_response' });
  });

  it('비문자열 입력 → empty_response 에러', () => {
    expect(parsePsisUseName(null)).toEqual({ useName: null, error: 'empty_response' });
    expect(parsePsisUseName(undefined)).toEqual({ useName: null, error: 'empty_response' });
    expect(parsePsisUseName(123)).toEqual({ useName: null, error: 'empty_response' });
  });

  it('useName 태그가 전혀 없는 정상 XML → useName null, error null', () => {
    const xml = `<service><list><cropName>벼</cropName></list></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: null, error: null });
  });

  it('XML 엔티티 디코드 후 추출', () => {
    const xml = `<list><useName>살충제 &amp; 살균제</useName></list>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살충제 & 살균제', error: null });
  });

  it('네임스페이스 prefix / 속성 포함 태그도 추출', () => {
    const xml = `<ns:useName xml:lang="ko">생장조정제</ns:useName>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '생장조정제', error: null });
  });

  it('값 주변 공백 트림', () => {
    const xml = `<useName>\n   살선충제   \n</useName>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살선충제', error: null });
  });

  it('error 응답이 list보다 먼저 처리됨(useName 있어도 error 우선)', () => {
    const xml = `<service><errorCode>ERR_201</errorCode><errorMsg>한도초과</errorMsg><list><useName>살충제</useName></list></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: null, error: 'ERR_201: 한도초과' });
  });

  // 실제 API는 '제' 없는 짧은 형태를 반환한다 (살충/살균/제초). 정규화 검증.
  it('짧은 형태 살충 → 표준 살충제로 정규화', () => {
    const xml = `<service><item><useName>살충</useName></item></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살충제', error: null });
  });

  it('짧은 형태 살균/제초도 정규화', () => {
    expect(parsePsisUseName('<item><useName>살균</useName></item>')).toEqual({ useName: '살균제', error: null });
    expect(parsePsisUseName('<item><useName>제초</useName></item>')).toEqual({ useName: '제초제', error: null });
  });

  it('실제 PSIS 응답(다이아지논 유제, item·여러 작물) → 살충제', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<service><totalCount>56</totalCount><list>
<item><cropName>겨자채</cropName><useName>살충</useName><pestiKorName>다이아지논 유제</pestiKorName><engName>Diazinon EC 34 %</engName></item>
<item><cropName>배추</cropName><useName>살충</useName><pestiKorName>다이아지논 유제</pestiKorName><engName>Diazinon EC 34 %</engName></item>
</list></service>`;
    expect(parsePsisUseName(xml)).toEqual({ useName: '살충제', error: null });
  });
});

describe('psis-parse — normalizeUseName', () => {
  it('짧은 형태에 제 보강', () => {
    expect(normalizeUseName('살충')).toBe('살충제');
    expect(normalizeUseName('살균')).toBe('살균제');
    expect(normalizeUseName('제초')).toBe('제초제');
    expect(normalizeUseName('생장조정')).toBe('생장조정제');
  });
  it('이미 표준형(…제)이면 유지', () => {
    expect(normalizeUseName('살충제')).toBe('살충제');
    expect(normalizeUseName('생장조정제')).toBe('생장조정제');
  });
  it('공백 트림 후 처리', () => {
    expect(normalizeUseName('  살충  ')).toBe('살충제');
  });
  it('null/빈값 → null', () => {
    expect(normalizeUseName(null)).toBe(null);
    expect(normalizeUseName('')).toBe(null);
    expect(normalizeUseName('   ')).toBe(null);
  });
});

describe('psis-parse — decodeEntities', () => {
  it('명명 엔티티 디코드', () => {
    expect(decodeEntities('a&amp;b&lt;c&gt;d&quot;e&apos;f')).toBe('a&b<c>d"e\'f');
  });
  it('숫자/16진수 참조 디코드', () => {
    expect(decodeEntities('&#65;&#x42;')).toBe('AB');
  });
  it('null/undefined → 빈 문자열', () => {
    expect(decodeEntities(null)).toBe('');
    expect(decodeEntities(undefined)).toBe('');
  });
});

describe('psis-parse — extractTagValues', () => {
  it('여러 값 순서대로 수집', () => {
    const xml = `<useName>a</useName><x/><useName>b</useName>`;
    expect(extractTagValues(xml, 'useName')).toEqual(['a', 'b']);
  });
  it('대상 없으면 빈 배열', () => {
    expect(extractTagValues('<other>x</other>', 'useName')).toEqual([]);
  });
});
