/**
 * @fileoverview JUSO(도로명주소) API 렌더러 측 헬퍼 (SAMPL-1-110)
 * @description Electron main 프로세스의 `juso:search` IPC를 호출하고,
 *              결과를 자동완성 모듈이 사용하는 표준 형태로 변환한다.
 *
 * 메인 프로젝트 src/shared/juso-service.js 의 TypeScript 이식.
 *
 * 사용:
 *   const r = await JusoService.search('봉화군 봉화읍 삼계리');
 *   r.items.forEach(it => console.log(it.roadAddr, it.zipNo));
 */

// SQL 인젝션 방지 (renderer 측, UX 즉시 피드백용).
// SAMPL-1-47 H-2: defense-in-depth 의도적 중복.
//   main 카운터파트: src/index.ts (sanitizeJusoKeyword + JUSO_SQL_RESERVED/JUSO_BAD_CHARS)
//   양쪽 sync 필수 — 목록 변경 시 두 파일 동시에 수정할 것.
//   renderer 측은 UX(즉시 에러 표시)용, main이 보안 신뢰 경계.
const SQL_RESERVED = [
  'OR', 'SELECT', 'INSERT', 'DELETE', 'UPDATE',
  'CREATE', 'DROP', 'EXEC', 'UNION', 'FETCH',
  'DECLARE', 'TRUNCATE',
];
const BAD_CHARS = /[<>=%]/;

export interface JusoSanitizeResult {
  ok: boolean;
  value?: string;
  error?: string;
}

export interface JusoSearchOptions {
  page?: number;
  size?: number;
}

/** 자동완성 모듈이 사용하는 표준 엔트리 */
export interface JusoAutocompleteEntry {
  village: string;
  district: string;
  region: string;
  regionKey: string;
  isMountain: boolean;
  displayText: string;
  score: number;
  zipNo: string;
  roadAddr: string;
  jibunAddr: string;
}

function sanitizeKeyword(q: unknown): JusoSanitizeResult {
  const s = String(q ?? '').trim();
  if (!s) return { ok: false, error: '검색어를 입력해 주세요.' };
  if (s.length > 80) return { ok: false, error: '검색어가 너무 깁니다 (최대 80자).' };
  if (BAD_CHARS.test(s)) return { ok: false, error: '<, >, =, % 문자는 사용할 수 없습니다.' };
  for (const w of SQL_RESERVED) {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    if (re.test(s)) return { ok: false, error: `"${w}" 같은 예약어는 사용할 수 없습니다.` };
  }
  return { ok: true, value: s };
}

/**
 * JUSO API 검색 (Electron main 경유)
 * @param keyword 검색어 (예: "봉화군 봉화읍 삼계리")
 */
async function search(keyword: string, options: JusoSearchOptions = {}): Promise<JusoSearchResult> {
  const chk = sanitizeKeyword(keyword);
  if (!chk.ok) return { ok: false, error: chk.error, items: [], total: 0 };

  const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  if (!api?.jusoSearch) {
    return {
      ok: false,
      error: 'JUSO API는 데스크톱 앱(Electron) 환경에서만 사용 가능합니다.',
      items: [],
      total: 0,
    };
  }

  const page = Math.max(1, Math.min(100, Number(options.page) || 1));
  const size = Math.max(1, Math.min(50, Number(options.size) || 10));

  try {
    const res = await api.jusoSearch({ keyword: chk.value as string, page, size });
    if (!res || res.ok === false) {
      return { ok: false, error: res?.error || 'JUSO 호출 실패', items: [], total: 0 };
    }
    return {
      ok: true,
      items: Array.isArray(res.items) ? res.items : [],
      total: Number(res.total) || 0,
    };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'JUSO 호출 오류', items: [], total: 0 };
  }
}

/** JUSO 응답 1건을 자동완성 모듈이 쓰는 표준 객체로 매핑 */
function toAutocompleteEntry(item: JusoAddressItem | null | undefined): JusoAutocompleteEntry {
  const it = (item && typeof item === 'object') ? item : ({} as JusoAddressItem);
  return {
    village: it.emdNm || '',
    district: it.sggNm || '',
    region: it.siNm || '',
    regionKey: '__juso__',
    isMountain: false,
    displayText: it.roadAddr || it.jibunAddr || '',
    score: 0,
    zipNo: it.zipNo || '',
    roadAddr: it.roadAddr || '',
    jibunAddr: it.jibunAddr || '',
  };
}

function mapToAutocompleteEntries(items: JusoAddressItem[] | undefined): JusoAutocompleteEntry[] {
  return (Array.isArray(items) ? items : []).map(toAutocompleteEntry);
}

export const JusoService = {
  search,
  sanitizeKeyword,
  toAutocompleteEntry,
  mapToAutocompleteEntries,
};

// 전역 노출 (렌더러에서 window.JusoService 사용)
(window as Window & { JusoService?: typeof JusoService }).JusoService = JusoService;
