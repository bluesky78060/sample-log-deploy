// ========================================
// MRL API 모듈 (식품안전나라 OpenAPI) — TS 이식
// ========================================
// 서비스: I1050 (식품별 농약잔류허용기준)
// 출처: https://openapi.foodsafetykorea.go.kr
// 전체 ~18,129건 / 농약-식품 쌍으로 MRL 값 제공
//
// 키 우선순위: localStorage('mrl_api_key') > window.electronAPI.mrlGetApiKey()
// 메인과 동일하게 window.MrlApi 전역으로 노출. 렌더러가 직접 fetch.
// (보안 M1: 식품안전나라 무료·저위험 키 — env→IPC(mrl:get-api-key) 전달, 의도된 트레이드오프.)
// ========================================

/* eslint-disable @typescript-eslint/no-explicit-any */

// ----- 느슨한 타입 정의 (거대 데이터 구조 → typecheck-gate 회귀 방지) -----
type LogLevel = 'info' | 'warn' | 'error' | string;

/** 식품안전나라 I1050 원본 row (표준화 형태) */
interface MrlRow {
  FOOD_KOR_NM?: string;
  AGCHM_KOR_NM?: string;
  MRL_VAL?: string;
  LCLAS_NM?: string;
  MLSFC_NM?: string;
  STEP?: string;
  TMPR_STDR_APPLC_YN?: string;
  [k: string]: unknown;
}

interface CacheMeta {
  version?: number;
  timestamp?: number;
  count?: number;
}

interface LookupResult {
  value: number | null;
  unit: string;
  crop: string;
  pesticide: string;
  category: string;
  midCategory: string;
  records: MrlRow[];
  matchLevel: string;
  exact: boolean;
}

const MrlApi = (function () {
  // ========================================
  // 상수
  // ========================================
  const SERVICE_ID = 'I1050';
  // HTTPS 사용 필수: Electron renderer CSP 및 웹 mixed content 정책 대응
  const BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api';
  const CHUNK_SIZE = 1000; // 한 번에 최대 1000건
  const MAX_RECORDS = 25000; // 안전장치 (현재 ~18,000건)

  // localStorage 키 (메인과 동일)
  const STORAGE_KEY_DATA = 'mrl_cache_data'; // 전체 데이터 인덱스
  const STORAGE_KEY_META = 'mrl_cache_meta'; // 메타(timestamp, total, version)
  const STORAGE_KEY_API_KEY = 'mrl_api_key'; // API 인증키

  // 캐시 TTL
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

  // 현재 스키마 버전 (캐시 호환성 체크용)
  const CACHE_SCHEMA_VERSION = 1;

  // ========================================
  // 내부 상태
  // ========================================
  let lookupMap: Map<string, MrlRow[]> | null = null;
  let allRows: MrlRow[] | null = null;
  let foodToCategoryMap: Map<string, string> | null = null;
  let categoryFallbackMap: Map<string, string[]> | null = null;
  let isLoaded = false;
  let syncPromise: Promise<{ success: boolean; count?: number; error?: string }> | null = null;

  // Electron 내장 API 키 캐시 (mrlGetApiKey IPC로 한 번만 조회)
  let _embeddedApiKey = '';
  let _embeddedKeyPromise: Promise<string> | null = null;

  /**
   * Electron 내장 API 키를 보장 로드 (메모이즈, 웹에서는 즉시 resolve).
   */
  function ensureEmbeddedKey(): Promise<string> {
    if (_embeddedKeyPromise) return _embeddedKeyPromise;
    _embeddedKeyPromise = (async () => {
      const w = typeof window !== 'undefined' ? (window as any) : null;
      if (w && w.electronAPI?.isElectron && typeof w.electronAPI.mrlGetApiKey === 'function') {
        try {
          const embeddedKey = await w.electronAPI.mrlGetApiKey();
          if (embeddedKey) {
            _embeddedApiKey = embeddedKey;
            log('info', '내장 API 키 로드 완료 (IPC)');
          }
        } catch (e) {
          log('warn', '내장 API 키 IPC 조회 실패', e);
        }
      }
      return _embeddedApiKey;
    })();
    return _embeddedKeyPromise;
  }

  // ========================================
  // 로깅 헬퍼
  // ========================================
  function log(level: LogLevel, ...args: unknown[]): void {
    const logger = (typeof window !== 'undefined' && (window as any).logger) || null;
    if (logger && typeof logger[level] === 'function') {
      logger[level]('[MrlApi]', ...args);
    } else if (level === 'error' || level === 'warn') {
      (console as any)[level]('[MrlApi]', ...args);
    }
  }

  // ========================================
  // API 키 관리
  // ========================================
  function getApiKey(): string {
    try {
      // 우선순위 1: 사용자 수동 설정 (localStorage)
      const manual = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (manual) return manual;
    } catch (e) {
      log('warn', 'API 키 읽기 실패', e);
    }
    // 우선순위 2: Electron 내장 키 (init() 시점에 캐시됨, 웹에서는 항상 '')
    return _embeddedApiKey || '';
  }

  function setApiKey(key: string): boolean {
    try {
      const trimmed = (key || '').trim();
      if (trimmed) {
        localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
      return true;
    } catch (e) {
      log('error', 'API 키 저장 실패', e);
      return false;
    }
  }

  function hasApiKey(): boolean {
    return !!getApiKey();
  }

  // ========================================
  // 문자열 정규화 (조회 키 생성)
  // ========================================
  function normalize(str: unknown): string {
    if (!str) return '';
    return String(str)
      .replace(/\([^)]*\)/g, '') // 괄호 안 제거
      .replace(/\s+/g, '') // 공백 제거
      .toLowerCase();
  }

  // ========================================
  // 작물명 파싱 (의뢰물품 → 기본 작물명)
  // ========================================
  function parseCropName(raw: unknown): string {
    if (!raw) return '';
    let s = String(raw).trim();
    if (!s || s === '-') return '';

    // 1) 괄호 내용 제거 (여러 번)
    s = s.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');

    // 2) "외 N종" 패턴 제거
    s = s.replace(/외\s*\d+\s*종/g, '');
    s = s.replace(/등\s*\d+\s*종/g, '');

    // 3) 쉼표/세미콜론/슬래시로 구분된 경우 첫 항목만
    const parts = s.split(/[,;/]/);
    s = parts[0] || '';

    // 4) 수량 + 단위 제거
    const UNIT_PATTERN =
      /\d+(\.\d+)?\s*(kg|mg|ml|ℓ|포기|상자|박스|묶음|다발|송이|개입|톤|개(?![가-힣a-zA-Z])|[glt](?![가-힣a-zA-Z])|봉(?![가-힣a-zA-Z])|포(?![가-힣a-zA-Z])|단(?![가-힣a-zA-Z]))/gi;
    s = s.replace(UNIT_PATTERN, '');

    // 5) 숫자만 남은 경우도 제거
    s = s.replace(/\d+(\.\d+)?/g, '');

    // 6) 앞뒤 공백/특수문자 정리
    s = s.replace(/^[\s,\-·•]+|[\s,\-·•]+$/g, '');

    return s.trim();
  }

  // ========================================
  // 작물 별명(alias) 매핑
  // ========================================
  const CROP_ALIAS_MAP: Record<string, string> = {
    // === 대두(콩) 품종 ===
    서리태: '대두', 서리태콩: '대두', 서목태: '대두', 검정콩: '대두',
    흰콩: '대두', 백태: '대두', 약콩: '대두', 쥐눈이콩: '대두',
    노란콩: '대두', 콩나물콩: '대두', 장류콩: '대두', 나물콩: '대두',
    메주콩: '대두', 청대콩: '대두', 콩: '대두', 작두콩: '대두',
    // === 기타 두류 ===
    동부콩: '동부', 완두콩: '완두',
    // === 옥수수 품종 ===
    찰옥수수: '옥수수', 단옥수수: '옥수수', 강낭옥수수: '옥수수',
    초당옥수수: '옥수수', 풋옥수수: '옥수수', 보통옥수수: '옥수수',
    // === 보리 품종 ===
    찰보리: '보리', 쌀보리: '보리', 겉보리: '보리', 맥주보리: '보리',
    // === 벼/쌀 ===
    벼: '쌀', 밭벼: '쌀',
    // === 수수/기장/조 ===
    찰수수: '수수', 찰기장: '기장', 차조: '조', 메조: '조',
    // === 고추 ===
    청양고추: '고추', 아삭이고추: '고추', 풋고추: '고추', 홍고추: '고추',
    꽈리고추: '고추', 오이고추: '고추', 당초: '고추',
    건고추: '고추(건조)', 마른고추: '고추(건조)',
    // === 감귤류 ===
    한라봉: '감귤', 천혜향: '감귤', 레드향: '감귤', 황금향: '감귤',
    카라향: '감귤', 불지화: '감귤', 금귤: '감귤',
    감귤만감: '감귤', 감귤온주: '감귤', 부지화: '감귤',
    // === 감 ===
    단감: '감', 떫은감: '감',
    // === 토마토 ===
    방울토마토: '토마토', 대추토마토: '토마토', 스테비아토마토: '토마토',
    송이토마토: '토마토',
    // === 사과 ===
    부사: '사과', 홍로: '사과', 아오리: '사과', 감홍: '사과',
    추광: '사과', 시나노골드: '사과', 꽃사과: '사과',
    // === 배 ===
    신고배: '배', 원황: '배', 황금배: '배', 돌배: '배',
    // === 복숭아 ===
    개복숭아: '복숭아',
    // === 자두 ===
    서양자두: '자두',
    // === 감자 ===
    수미: '감자', 남작: '감자', 대서: '감자', 홍감자: '감자',
    // === 고구마 ===
    밤고구마: '고구마', 꿀고구마: '고구마', 호박고구마: '고구마',
    // === 호박 ===
    단호박: '호박', 맷돌호박: '호박', 애호박: '호박',
    주키니호박: '호박', 밤호박: '호박', 수세미: '호박',
    // === 수박 ===
    복수박: '수박', 애플수박: '수박',
    // === 기타 과채류 ===
    파프리카: '피망', 울외: '참외',
    // === 파/부추 ===
    쪽파: '파', 대파: '파', 실파: '파',
    두메부추: '부추',
    // === 배추 ===
    알배추: '배추', 봄배추: '배추', 김장배추: '배추',
    얼갈이배추: '엇갈이배추', 방울양배추: '양배추',
    // === 무 ===
    총각무: '무(뿌리)', 열무: '무(잎)', 알타리무: '무(뿌리)',
    시래기용무: '무(잎)', 게걸무: '무(뿌리)',
    // === 미나리 ===
    논미나리: '미나리', 밭미나리: '미나리',
    // === 비트 ===
    비트: '비트(뿌리)',
    // === 팥/녹두 ===
    적두: '팥', 거피팥: '팥',
    // === 들깨 ===
    들깨: '들깻잎', 깻잎: '들깻잎', 잎들깨: '들깻잎',
    // === 마늘 ===
    깐마늘: '마늘', 쪽마늘: '마늘', 다진마늘: '마늘',
    // === 포도 ===
    샤인머스캣: '포도', 캠벨: '포도', 거봉: '포도', MBA: '포도', 산머루: '머루',
    // === 딸기 ===
    설향: '딸기', 장희: '딸기', 나무딸기: '딸기',
    블랙베리: '딸기', 라즈베리: '딸기',
    // === 블루베리 ===
    하니베리: '블루베리', 허니베리: '블루베리', 하스카프: '블루베리',
    // === 키위 ===
    참다래: '키위(참다래)', 골드키위: '키위(참다래)',
    // === 밤 ===
    밤나무: '밤',
    // === 채소/엽채류 ===
    로메인: '양상추', 치커리: '엽채류', 삼엽채: '엽채류', 엔다이브: '엽채류',
    곤드레: '엽채류', 곰취: '엽채류', 갯방풍: '엽채류',
    병풍취: '엽채류', 모시대: '엽채류', 누룩치: '엽채류',
    고구마순: '엽경채류', 고비: '고사리',
    쑥: '쑥갓', 개똥쑥: '쑥',
    서양냉이: '냉이', 당아욱: '아욱',
    // === 허브/향신 ===
    레몬밤: '허브류(생)', 페퍼민트: '민트', 스피아민트: '민트',
    라벤더: '라벤더(생)',
    // === 약용/특용 ===
    인삼: '수삼', 홍삼: '건삼', 묘삼: '수삼', 산양삼: '수삼',
    당귀: '당귀(잎)', 둥글레: '둥글레(뿌리)',
    산초나무: '산초(열매)', 마가목: '마가목(열매)',
    꾸지뽕나무: '꾸지뽕(열매)',
  };

  function resolveCropAlias(cropName: string): string {
    if (!cropName) return cropName;
    return CROP_ALIAS_MAP[cropName] || cropName;
  }

  function makeKey(crop: string, pesticide: string): string {
    return normalize(crop) + '|' + normalize(pesticide);
  }

  // ========================================
  // 네트워크 호출 (단일 청크)
  // ========================================
  async function fetchChunk(
    key: string,
    start: number,
    end: number
  ): Promise<{ rows: MrlRow[]; totalCount: number }> {
    const url = `${BASE_URL}/${encodeURIComponent(key)}/${SERVICE_ID}/json/${start}/${end}`;
    const res = await fetch(url);

    // 인증 실패 시 서버가 text/html을 반환 (alert 스크립트)
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();

    if (contentType.includes('text/html') || text.trim().startsWith('<')) {
      throw new Error('AUTH_INVALID: 인증키가 유효하지 않거나 활성화되지 않았습니다');
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('PARSE_ERROR: 응답 파싱 실패 - ' + text.slice(0, 100));
    }

    const payload = data && data[SERVICE_ID];
    if (!payload) {
      throw new Error('INVALID_RESPONSE: 응답 형식이 예상과 다릅니다');
    }

    const result = payload.RESULT;
    if (result && result.CODE && result.CODE !== 'INFO-000') {
      throw new Error(`API_ERROR[${result.CODE}]: ${result.MSG || 'Unknown'}`);
    }

    return {
      rows: (payload.row || []) as MrlRow[],
      totalCount: parseInt(payload.total_count || '0', 10) || 0,
    };
  }

  // ========================================
  // 전체 다운로드 (청크 반복)
  // ========================================
  async function downloadAll(
    onProgress?: (p: { loaded: number; total: number }) => void
  ): Promise<MrlRow[]> {
    const key = getApiKey();
    if (!key) {
      throw new Error('NO_API_KEY: API 인증키가 설정되지 않았습니다');
    }

    log('info', '전체 다운로드 시작');
    const collected: MrlRow[] = [];
    let total = 0;

    for (let start = 1; start <= MAX_RECORDS; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE - 1;
      try {
        const chunk = await fetchChunk(key, start, end);
        if (start === 1) {
          total = chunk.totalCount;
          log('info', `전체 건수: ${total}`);
        }
        if (!chunk.rows.length) break;
        collected.push(...chunk.rows);

        if (typeof onProgress === 'function') {
          onProgress({ loaded: collected.length, total: total || collected.length });
        }

        if (total && collected.length >= total) break;
      } catch (err) {
        log('error', `청크 ${start}~${end} 실패`, err);
        throw err;
      }
    }

    log('info', `다운로드 완료: ${collected.length}건`);
    return collected;
  }

  // ========================================
  // 인덱싱 (조회용 Map 생성)
  // ========================================
  function buildIndex(rows: MrlRow[]): Map<string, MrlRow[]> {
    const map = new Map<string, MrlRow[]>();
    const ftc = new Map<string, string>(); // food → mid category
    const cfb = new Map<string, string[]>(); // mid category → [fallback food names]

    for (const r of rows) {
      const crop = r.FOOD_KOR_NM;
      const pest = r.AGCHM_KOR_NM;
      const mid = r.MLSFC_NM || '';
      if (!crop || !pest) continue;

      const k = makeKey(crop, pest);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);

      if (mid && !ftc.has(crop)) {
        ftc.set(crop, mid);
      }
    }

    const midCategories = new Set(ftc.values());
    for (const mid of midCategories) {
      const midKor = mid.split('(')[0].trim();
      if (!midKor) continue;

      const foodsInMid: string[] = [];
      for (const [food, m] of ftc.entries()) {
        if (m === mid) foodsInMid.push(food);
      }

      const fallbacks = foodsInMid.filter((f) => f.includes(midKor) || midKor.includes(f));
      if (fallbacks.length > 0) {
        cfb.set(mid, fallbacks);
      }
    }

    foodToCategoryMap = ftc;
    categoryFallbackMap = cfb;

    log('info', `인덱스 구축: ${map.size}키, 식품→중분류 ${ftc.size}건, 분류 fallback ${cfb.size}건`);
    return map;
  }

  // ========================================
  // 캐시 저장/로드
  // ========================================
  function saveCache(rows: MrlRow[]): boolean {
    try {
      const slim = rows.map((r) => ({
        food: r.FOOD_KOR_NM || '',
        pest: r.AGCHM_KOR_NM || '',
        mrl: r.MRL_VAL || '',
        lclas: r.LCLAS_NM || '',
        mlsfc: r.MLSFC_NM || '',
        step: r.STEP || '',
        tmpr: r.TMPR_STDR_APPLC_YN || '',
      }));

      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(slim));
      localStorage.setItem(
        STORAGE_KEY_META,
        JSON.stringify({
          version: CACHE_SCHEMA_VERSION,
          timestamp: Date.now(),
          count: slim.length,
        })
      );
      log('info', `캐시 저장: ${slim.length}건`);
      return true;
    } catch (e) {
      log('error', '캐시 저장 실패 (용량 초과 가능)', e);
      return false;
    }
  }

  function loadCache(): { rows: MrlRow[]; meta: CacheMeta } | null {
    try {
      const metaRaw = localStorage.getItem(STORAGE_KEY_META);
      const dataRaw = localStorage.getItem(STORAGE_KEY_DATA);
      if (!metaRaw || !dataRaw) return null;

      const meta: CacheMeta = JSON.parse(metaRaw);
      if (meta.version !== CACHE_SCHEMA_VERSION) {
        log('warn', '캐시 스키마 버전 불일치 - 무효화');
        clearCache();
        return null;
      }

      const slim = JSON.parse(dataRaw) as Array<Record<string, string>>;
      const rows: MrlRow[] = slim.map((s) => ({
        FOOD_KOR_NM: s.food,
        AGCHM_KOR_NM: s.pest,
        MRL_VAL: s.mrl,
        LCLAS_NM: s.lclas,
        MLSFC_NM: s.mlsfc || '',
        STEP: s.step,
        TMPR_STDR_APPLC_YN: s.tmpr,
      }));

      return { rows, meta };
    } catch (e) {
      log('warn', '캐시 로드 실패', e);
      return null;
    }
  }

  function clearCache(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_META);
      lookupMap = null;
      allRows = null;
      foodToCategoryMap = null;
      categoryFallbackMap = null;
      isLoaded = false;
      log('info', '캐시 삭제');
      return true;
    } catch (e) {
      log('error', '캐시 삭제 실패', e);
      return false;
    }
  }

  function getCacheStatus(): {
    cached: boolean;
    expired: boolean | null;
    count: number;
    timestamp: number | null;
    ageMs?: number;
  } {
    try {
      const metaRaw = localStorage.getItem(STORAGE_KEY_META);
      if (!metaRaw) {
        return { cached: false, expired: null, count: 0, timestamp: null };
      }
      const meta: CacheMeta = JSON.parse(metaRaw);
      const age = Date.now() - (meta.timestamp || 0);
      return {
        cached: true,
        expired: age > CACHE_TTL_MS,
        count: meta.count || 0,
        timestamp: meta.timestamp || null,
        ageMs: age,
      };
    } catch {
      return { cached: false, expired: null, count: 0, timestamp: null };
    }
  }

  // ========================================
  // 초기화 (캐시 로드만, 네트워크 X)
  // ========================================
  async function init(): Promise<boolean> {
    if (isLoaded) return true;

    // Electron 내장 API 키 보장 로드 (메모이즈 — 실제 IPC는 최초 1회만)
    await ensureEmbeddedKey();

    const loaded = loadCache();
    if (loaded && loaded.rows && loaded.rows.length) {
      allRows = loaded.rows;
      lookupMap = buildIndex(loaded.rows);
      isLoaded = true;
      log('info', `초기화 완료: ${loaded.rows.length}건 (캐시)`);
      return true;
    }
    log('info', '캐시 없음 - sync() 필요');
    return false;
  }

  // ========================================
  // 전체 동기화 (네트워크 다운로드 + 캐시 저장)
  // ========================================
  async function sync(
    onProgress?: (p: { loaded: number; total: number }) => void
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
      try {
        const rows = await downloadAll(onProgress);
        allRows = rows;
        lookupMap = buildIndex(rows);
        isLoaded = true;
        saveCache(rows);
        return { success: true, count: rows.length };
      } catch (err) {
        log('error', '동기화 실패', err);
        return { success: false, error: (err as Error).message };
      } finally {
        syncPromise = null;
      }
    })();

    return syncPromise;
  }

  /** 캐시가 만료됐거나 없으면 동기화 */
  async function syncIfStale(
    onProgress?: (p: { loaded: number; total: number }) => void
  ): Promise<{ success: boolean; count?: number; error?: string; fromCache?: boolean }> {
    const status = getCacheStatus();
    if (status.cached && !status.expired) {
      if (!isLoaded) await init();
      return { success: true, count: status.count, fromCache: true };
    }
    return await sync(onProgress);
  }

  // ========================================
  // 농약명 영한 매핑 (window.PESTICIDE_NAME_MAP)
  // ========================================
  function engToKor(
    engName: string
  ): { kor: string; confidence?: string; score?: number } | null {
    if (!engName) return null;
    const nameMap =
      (typeof window !== 'undefined' && (window as any).PESTICIDE_NAME_MAP) || null;
    if (!nameMap || !nameMap.map) return null;
    const entry = nameMap.map[engName];
    if (!entry) return null;
    return {
      kor: entry.kor,
      confidence: entry.confidence,
      score: entry.score,
    };
  }

  function resolvePesticideName(
    name: string
  ): { kor: string; confidence?: string; source: string; score?: number } | null {
    if (!name) return null;
    const hasKorean = /[가-힣]/.test(name);
    if (hasKorean) {
      return { kor: name, confidence: 'input', source: 'korean-input' };
    }
    const mapped = engToKor(name);
    if (mapped) {
      return {
        kor: mapped.kor,
        confidence: mapped.confidence,
        source: 'name-map',
        score: mapped.score,
      };
    }
    return null;
  }

  // ========================================
  // 조회
  // ========================================
  function pickStrictest(records: MrlRow[]): { minVal: number | null; minRecord: MrlRow | null } {
    let minVal: number | null = null;
    let minRecord: MrlRow | null = null;
    for (const r of records) {
      const v = parseFloat(r.MRL_VAL || '');
      if (isNaN(v)) continue;
      if (minVal === null || v < minVal) {
        minVal = v;
        minRecord = r;
      }
    }
    return { minVal, minRecord };
  }

  function lookupWithCategoryFallback(
    cropName: string,
    pesticide: string
  ): { records: MrlRow[]; fallbackCrop: string; mid: string } | null {
    if (!foodToCategoryMap || !categoryFallbackMap || !lookupMap) return null;

    const mid = foodToCategoryMap.get(cropName);
    if (!mid) return null;

    const fallbacks = categoryFallbackMap.get(mid);
    if (!fallbacks || !fallbacks.length) return null;

    const sorted = [...fallbacks].sort((a, b) => {
      const aExclude = a.includes('제외') ? 0 : 1;
      const bExclude = b.includes('제외') ? 0 : 1;
      return aExclude - bExclude;
    });

    for (const fallbackCrop of sorted) {
      if (fallbackCrop === cropName) continue;
      const k = makeKey(fallbackCrop, pesticide);
      const records = lookupMap.get(k);
      if (records && records.length) {
        return { records, fallbackCrop, mid };
      }
    }
    return null;
  }

  function lookup(crop: string, pesticide: string): LookupResult | null {
    if (!isLoaded || !lookupMap) return null;
    if (!crop || !pesticide) return null;

    const parsedCrop = parseCropName(crop);
    const aliasedCrop = resolveCropAlias(parsedCrop || crop);
    const cropCandidates = [crop];
    if (parsedCrop && parsedCrop !== crop) cropCandidates.push(parsedCrop);
    if (aliasedCrop && !cropCandidates.includes(aliasedCrop)) cropCandidates.push(aliasedCrop);

    let records: MrlRow[] | null = null;
    let matchedCrop = crop;
    let matchLevel = 'exact'; // exact | parsed | alias | category
    for (const c of cropCandidates) {
      const k = makeKey(c, pesticide);
      const r = lookupMap.get(k);
      if (r && r.length) {
        records = r;
        matchedCrop = c;
        matchLevel = c === crop ? 'exact' : c === aliasedCrop ? 'alias' : 'parsed';
        break;
      }
    }

    if (!records) {
      const targetCrop = aliasedCrop || parsedCrop || crop;
      const fallback = lookupWithCategoryFallback(targetCrop, pesticide);
      if (fallback) {
        records = fallback.records;
        matchedCrop = fallback.fallbackCrop;
        matchLevel = 'category';
      }
    }

    if (!records || !records.length) return null;

    void matchedCrop;
    const { minVal, minRecord } = pickStrictest(records);

    return {
      value: minVal,
      unit: 'mg/kg',
      crop: minRecord ? minRecord.FOOD_KOR_NM || crop : crop,
      pesticide: minRecord ? minRecord.AGCHM_KOR_NM || pesticide : pesticide,
      category: minRecord ? minRecord.LCLAS_NM || '' : '',
      midCategory: minRecord ? minRecord.MLSFC_NM || '' : '',
      records: records,
      matchLevel: matchLevel,
      exact: matchLevel === 'exact' || matchLevel === 'parsed',
    };
  }

  /** 부분 일치 조회 (작물/농약명 검색) */
  function searchNames(query: string, field: 'crop' | 'pesticide' = 'pesticide', limit = 20): string[] {
    if (!isLoaded || !allRows) return [];
    if (!query) return [];

    const q = normalize(query);
    const key = field === 'crop' ? 'FOOD_KOR_NM' : 'AGCHM_KOR_NM';
    const set = new Set<string>();

    for (const r of allRows) {
      const name = r[key] as string | undefined;
      if (!name) continue;
      if (normalize(name).includes(q)) {
        set.add(name);
        if (set.size >= limit) break;
      }
    }

    return Array.from(set);
  }

  /** 영문 농약명으로 조회 (매핑 테이블 경유) */
  function lookupByEng(crop: string, engPesticide: string): any {
    const mapped = engToKor(engPesticide);
    if (!mapped) {
      return {
        value: null,
        error: 'NO_MAPPING',
        engPesticide,
        message: '농약명 매핑 정보가 없습니다',
      };
    }
    const result = lookup(crop, mapped.kor);
    if (!result) {
      return {
        value: null,
        error: 'NO_MRL',
        engPesticide,
        korPesticide: mapped.kor,
        mappingConfidence: mapped.confidence,
        message: `${crop} + ${mapped.kor} MRL 기준 없음`,
      };
    }
    return Object.assign({}, result, {
      engPesticide,
      korPesticide: mapped.kor,
      mappingConfidence: mapped.confidence,
      mappingScore: mapped.score,
    });
  }

  /** 유연 조회: 한글/영문 자동 판별 */
  function lookupFlexible(crop: string, pesticideName: string): any {
    const resolved = resolvePesticideName(pesticideName);
    if (!resolved) {
      return { value: null, error: 'NO_MAPPING', input: pesticideName };
    }
    const result = lookup(crop, resolved.kor);
    if (!result) {
      return {
        value: null,
        error: 'NO_MRL',
        input: pesticideName,
        korPesticide: resolved.kor,
        mappingConfidence: resolved.confidence,
      };
    }
    return Object.assign({}, result, {
      input: pesticideName,
      korPesticide: resolved.kor,
      mappingConfidence: resolved.confidence,
    });
  }

  // canon 인덱스(canon → rows[]) lazy 캐시: allRows 교체 시 무효화(_canonIdxRows로 식별)
  let _canonIndex: Map<string, MrlRow[]> | null = null;
  let _canonIdxRows: MrlRow[] | null = null;

  function getCanonIndex(): Map<string, MrlRow[]> | null {
    const C = (typeof window !== 'undefined' && (window as any).MrlNameCanon) || null;
    if (!C) return null; // canon 모듈 없으면 인덱스 미사용 → 폴백 경로
    if (_canonIndex && _canonIdxRows === allRows) return _canonIndex;

    const canon = C.canonicalizeKor;
    const strip = C.stripIsomerSuffix;
    const idx = new Map<string, MrlRow[]>();
    const push = (key: string, r: MrlRow): void => {
      if (!key) return;
      let arr = idx.get(key);
      if (!arr) {
        arr = [];
        idx.set(key, arr);
      }
      arr.push(r);
    };
    for (const r of allRows || []) {
      const rc = canon(r.AGCHM_KOR_NM);
      push(rc, r);
      const rcs = strip(rc);
      if (rcs !== rc) push(rcs, r);
    }
    _canonIndex = idx;
    _canonIdxRows = allRows;
    return idx;
  }

  /** 특정 농약의 모든 식품별 MRL 조회 (canon 음역 정규화) */
  function getAllByPesticide(pesticide: string): MrlRow[] {
    if (!isLoaded || !allRows) return [];

    const C = (typeof window !== 'undefined' && (window as any).MrlNameCanon) || null;
    if (!C) {
      const q = normalize(pesticide);
      return allRows.filter((r) => normalize(r.AGCHM_KOR_NM) === q);
    }

    const canon = C.canonicalizeKor;
    const strip = C.stripIsomerSuffix;
    const qc = canon(pesticide);
    const qcs = strip(qc);

    const idx = getCanonIndex();
    if (idx) {
      const out: MrlRow[] = [];
      const seen = new Set<MrlRow>();
      for (const key of qc === qcs ? [qc] : [qc, qcs]) {
        const arr = idx.get(key);
        if (!arr) continue;
        for (const r of arr) {
          if (seen.has(r)) continue;
          seen.add(r);
          out.push(r);
        }
      }
      return out;
    }

    return allRows.filter((r) => {
      const rc = canon(r.AGCHM_KOR_NM);
      return rc === qc || rc === qcs || strip(rc) === qc;
    });
  }

  /** 특정 식품의 모든 농약별 MRL 조회 */
  function getAllByCrop(crop: string): MrlRow[] {
    if (!isLoaded || !allRows) return [];
    const q = normalize(crop);
    return allRows.filter((r) => normalize(r.FOOD_KOR_NM) === q);
  }

  // ========================================
  // 판정 헬퍼
  // ========================================
  function judge(detected: number | null, mrl: number | null): 'pass' | 'fail' | 'unknown' {
    if (mrl === null || mrl === undefined || isNaN(mrl)) return 'unknown';
    if (detected === null || detected === undefined || isNaN(detected)) return 'unknown';
    return Number(detected) <= Number(mrl) ? 'pass' : 'fail';
  }

  // ========================================
  // 공개 API
  // ========================================
  return {
    // 키 관리
    getApiKey,
    setApiKey,
    hasApiKey,
    ensureEmbeddedKey,

    // 초기화/동기화
    init,
    sync,
    syncIfStale,

    // 캐시 관리
    getCacheStatus,
    clearCache,

    // 조회
    lookup,
    lookupByEng,
    lookupFlexible,
    searchNames,
    getAllByPesticide,
    getAllByCrop,

    // 농약명 매핑
    engToKor,
    resolvePesticideName,

    // 작물명 파싱/별명
    parseCropName,
    resolveCropAlias,

    // 판정
    judge,

    // 상태 확인
    isReady: (): boolean => isLoaded,
    getRowCount: (): number => (allRows ? allRows.length : 0),

    // 상수 노출 (테스트/UI용)
    CACHE_TTL_MS,
    SERVICE_ID,
  };
})();

export type MrlApiType = typeof MrlApi;

// 브라우저 전역 노출
if (typeof window !== 'undefined') {
  (window as unknown as { MrlApi?: typeof MrlApi }).MrlApi = MrlApi;
  // Electron 내장 API 키 선제 로드 (fire-and-forget, 웹에서는 즉시 종료)
  MrlApi.ensureEmbeddedKey();
}

export { MrlApi };
export default MrlApi;
