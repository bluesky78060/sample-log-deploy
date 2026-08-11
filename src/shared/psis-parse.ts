// ========================================
// psis-parse.ts — 농촌진흥청 PSIS 농약등록정보 API(XML) 순수 파서 (TS 이식)
// ========================================
// Node(main process) + 브라우저 양용. 외부 의존성 없음(순수 함수) → 단위테스트 대상.
// 응답 XML에서 농약 용도(useName: 살충제/살균제/제초제 등)를 추출한다.
//
// 설계:
//  - <errorCode> 가 있으면 인증 실패 등 → { useName: null, error: '<code>: <msg>' }
//  - 정상 응답: 한 농약은 여러 작물 레코드를 가지며 같은 용도를 반복하므로,
//    모든 <useName> 값을 수집해 "가장 빈도 높은 비어있지 않은 값"(다수결)을 채택.
//  - 태그 중첩/네임스페이스(prefix:useName)에 관대하게 정규식 추출.
//  - XML 엔티티(&amp; &lt; &gt; &quot; &apos; &#nn;)를 디코드하고 트림.
// ========================================

export interface PsisUseNameResult {
  useName: string | null;
  error: string | null;
}

/** XML 엔티티 디코드 (숫자/16진수 참조 포함). */
export function decodeEntities(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, d: string) => {
      const code = parseInt(d, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * XML 문자열에서 주어진 (네임스페이스 무시) 로컬 태그명의 모든 텍스트 값을 추출.
 */
export function extractTagValues(xml: unknown, localName: string): string[] {
  if (typeof xml !== 'string' || !xml) return [];
  // (?:\w+:)? 로 네임스페이스 prefix 허용, 속성도 허용. 내용은 비탐욕 캡처.
  const re = new RegExp(
    '<(?:[\\w.-]+:)?' + localName + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + localName + '>',
    'gi'
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(decodeEntities(m[1]).trim());
  }
  return out;
}

/** 첫 번째 매칭 태그의 텍스트(트림·디코드)만 반환. 없으면 null. */
export function extractFirstTagValue(xml: unknown, localName: string): string | null {
  const vals = extractTagValues(xml, localName);
  return vals.length ? vals[0] : null;
}

/**
 * RDA 용도 표기(짧은 형태)를 앱 표준 라벨로 정규화한다.
 * 실제 API는 '살충'/'살균'/'제초'처럼 접미사 '제' 없이 반환한다.
 * 정적표·배지 클래스는 '살충제' 형식을 기대하므로 '제'를 보강한다.
 */
export function normalizeUseName(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/제$/.test(s)) return s;
  return s + '제';
}

/**
 * 응답 XML에서 농약 용도(useName)를 추출한다.
 */
export function parsePsisUseName(xmlString: unknown): PsisUseNameResult {
  if (typeof xmlString !== 'string' || !xmlString.trim()) {
    return { useName: null, error: 'empty_response' };
  }

  // 1) 에러 응답 우선 처리: <errorCode>...</errorCode>
  const errorCode = extractFirstTagValue(xmlString, 'errorCode');
  if (errorCode) {
    const errorMsg = extractFirstTagValue(xmlString, 'errorMsg') || '';
    return { useName: null, error: `${errorCode}: ${errorMsg}`.trim() };
  }

  // 2) 모든 useName 수집 후 다수결(비어있지 않은 값 중 최빈)
  const values = extractTagValues(xmlString, 'useName').filter((v) => v !== '');
  if (!values.length) {
    return { useName: null, error: null };
  }

  const counts = new Map<string, number>();
  let best: string | null = null;
  let bestCount = 0;
  for (const v of values) {
    const next = (counts.get(v) || 0) + 1;
    counts.set(v, next);
    if (next > bestCount) {
      bestCount = next;
      best = v;
    }
  }
  return { useName: normalizeUseName(best), error: null };
}

export interface PsisParseApi {
  parsePsisUseName: (xmlString: unknown) => PsisUseNameResult;
  normalizeUseName: (raw: unknown) => string | null;
  decodeEntities: (str: unknown) => string;
  extractTagValues: (xml: unknown, localName: string) => string[];
}

export const PsisParse: PsisParseApi = {
  parsePsisUseName,
  normalizeUseName,
  decodeEntities,
  extractTagValues,
};

if (typeof window !== 'undefined') {
  (window as unknown as { PsisParse?: PsisParseApi }).PsisParse = PsisParse;
}

export default PsisParse;
