/**
 * AddressAutocomplete - 주소 자동완성 공통 모듈 (TypeScript 이식)
 *
 * 검색 전략: JUSO(도로명주소) API 단독 사용
 *   - 디바운스 300ms + localStorage 1h 캐시
 *   - 행정구역 단위 dedup (시·군|면|리)
 *   - 정적 데이터(bonghwaData) 의존 제거 (juso API가 전국 데이터 제공)
 *
 * 메인 프로젝트 src/shared/autocomplete-manager.js 의 TypeScript 이식.
 *
 * 사용법:
 *   window.AddressAutocomplete.bind(input, list, {
 *       onInput: () => {},           // input 이벤트 후 호출 (선택)
 *       onSelect: (value, ctx) => {},// 주소 선택 완료 후 호출 (ctx.source='juso': zipNo/roadAddr 등)
 *       onShowModal: (result, input) => {},  // 사용 안 함 (정적 파싱 제거)
 *   });
 */

const JUSO_DEBOUNCE_MS = 300;
const JUSO_CACHE_TTL_MS = 60 * 60 * 1000; // 1시간
const JUSO_CACHE_PREFIX = 'juso_cache:';
// 같은 (시·군, 읍·면·동, 리) 지번이 다수 들어오므로 최대치(50)를 받아 행정구역 단위 dedup 후 노출.
// main process / juso-service 양쪽에서 50으로 클램프되므로 50이 실효 상한.
const JUSO_RESULT_SIZE = 50;
const JUSO_MAX_DISPLAY = 20; // dedup 후 최대 노출 건수
const JUSO_MIN_QUERY_LEN = 2; // 1글자 입력에는 폴백 호출하지 않음
const JUSO_CACHE_MAX_ENTRIES = 100; // localStorage 캐시 최대 항목 수
// liNm: 리 이름 보존 필수 (없으면 같은 면의 다른 리들이 dedup되어 1건으로 합쳐짐)
// mtYn: '1'이면 산 필지 - 자동완성에서 산/일반 분리 + 체크박스 자동 동기화에 사용
const JUSO_ALLOWED_FIELDS = ['zipNo', 'roadAddr', 'jibunAddr', 'siNm', 'sggNm', 'emdNm', 'liNm', 'mtYn'] as const;

// 설정의 '기본 시·도'(설정 페이지에서 저장). 리 단독 검색 범위를 사용 기관 지역으로 좁힌다.
const DEFAULT_REGION_STORAGE_KEY = 'app_default_sido';

/** 캐시에 저장되는 화이트리스트 항목 */
type CachedJusoItem = Record<(typeof JUSO_ALLOWED_FIELDS)[number], string>;

/** 정적(local) suggestion 항목 */
interface LocalSuggestion {
  village?: string;
  district?: string;
  region?: string;
  regionKey?: string;
  isMountain?: boolean;
  displayText?: string;
}

/** 입력값 파싱 결과 */
interface ParsedVillage {
  village: string;
  hasMountainKeyword: boolean;
  lotNumber: string;
  isBareVillage: boolean;
}

/** bind 옵션 */
interface BindOptions {
  regionKeys?: string[] | null;
  regionNames?: string[];
  enableJusoFallback?: boolean;
  getDefaultRegion?: () => string;
  onInput?: () => void;
  onSelect?: (value: string, ctx: SelectContext) => void;
  onShowModal?: (result: unknown, input: HTMLInputElement) => void;
}

/** onSelect 콜백 두 번째 인자 */
interface SelectContext {
  source: 'juso' | 'local';
  zipNo?: string;
  roadAddr?: string;
  jibunAddr?: string;
  sido?: string;
  sigungu?: string;
  emd?: string;
  isMountain: boolean;
}

let cacheSweepDone = false;

/**
 * 캐시 키 목록 수집
 */
function listCacheKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(JUSO_CACHE_PREFIX)) keys.push(k);
    }
  } catch (_) {
    /* private mode 등 */
  }
  return keys;
}

/**
 * 모듈 초기화 시 1회만 실행: TTL 만료 항목 정리 + 최대 항목 수 초과 시 오래된 것 제거
 */
function sweepJusoCacheOnce(): void {
  if (cacheSweepDone) return;
  cacheSweepDone = true;
  try {
    const now = Date.now();
    const entries: Array<{ key: string; ts: number }> = [];
    for (const key of listCacheKeys()) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) {
          localStorage.removeItem(key);
          continue;
        }
        const obj = JSON.parse(raw);
        const ts = Number(obj && obj.ts);
        if (!ts || now - ts > JUSO_CACHE_TTL_MS) {
          localStorage.removeItem(key);
        } else {
          entries.push({ key, ts });
        }
      } catch (_) {
        try {
          localStorage.removeItem(key);
        } catch (__) {
          /* noop */
        }
      }
    }
    // 최대 항목 수 초과 시 오래된 것부터 제거
    if (entries.length > JUSO_CACHE_MAX_ENTRIES) {
      entries.sort((a, b) => a.ts - b.ts);
      const toRemove = entries.length - JUSO_CACHE_MAX_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        try {
          localStorage.removeItem(entries[i].key);
        } catch (_) {
          /* noop */
        }
      }
    }
  } catch (_) {
    /* 조용히 실패 */
  }
}

/**
 * 모든 JUSO 캐시 항목 제거 (설정 페이지 등에서 사용)
 */
function clearAllJusoCache(): number {
  try {
    const keys = listCacheKeys();
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (_) {
        /* noop */
      }
    });
    return keys.length;
  } catch (_) {
    return 0;
  }
}

/**
 * localStorage 캐시 조회 (TTL 검증)
 */
function getJusoCache(query: string): CachedJusoItem[] | null {
  try {
    const raw = localStorage.getItem(JUSO_CACHE_PREFIX + query);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    if (Date.now() - Number(obj.ts || 0) > JUSO_CACHE_TTL_MS) {
      try {
        localStorage.removeItem(JUSO_CACHE_PREFIX + query);
      } catch (_) {
        /* noop */
      }
      return null;
    }
    return Array.isArray(obj.items) ? (obj.items as CachedJusoItem[]) : null;
  } catch (_) {
    return null;
  }
}

/**
 * JUSO 응답 항목을 캐시에 저장 - 화이트리스트 필드만 저장 (XSS·용량 방어)
 */
function setJusoCache(query: string, items: unknown): void {
  try {
    const arr = Array.isArray(items) ? items : [];
    const safeItems = arr.slice(0, JUSO_RESULT_SIZE).map((raw) => {
      const out = {} as CachedJusoItem;
      if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        JUSO_ALLOWED_FIELDS.forEach((f) => {
          const v = r[f];
          out[f] = typeof v === 'string' ? v : v == null ? '' : String(v);
        });
      }
      return out;
    });
    localStorage.setItem(JUSO_CACHE_PREFIX + query, JSON.stringify({ ts: Date.now(), items: safeItems }));
  } catch (_) {
    /* quota exceeded 등 - 치명적이지 않음 */
  }
}

/**
 * 정적 데이터 기반 제안 목록 렌더링
 */
function renderSuggestions(list: HTMLElement, suggestions: LocalSuggestion[]): void {
  const fragment = document.createDocumentFragment();
  suggestions.forEach((item) => {
    const li = document.createElement('li');
    li.dataset.source = 'local';
    li.dataset.village = item.village || '';
    li.dataset.district = item.district || '';
    li.dataset.regionKey = item.regionKey || '';
    li.dataset.region = item.region || '';
    li.dataset.isMountain = String(item.isMountain || false);
    li.textContent = item.displayText || '';
    fragment.appendChild(li);
  });
  list.replaceChildren(fragment);
  list.classList.add('show');
}

/**
 * JUSO API 응답 기반 제안 목록 렌더링
 * 지번 단위 raw 결과를 (시·군, 읍·면·동, 리) 행정구역 단위로 dedup하여 깔끔하게 노출.
 * 표시: 'liNm (siNm sggNm emdNm)' 또는 'emdNm (siNm sggNm)' (리가 없으면 읍·면·동 단위)
 */
function renderJusoSuggestions(list: HTMLElement, items: ReadonlyArray<Partial<JusoAddressItem>>): void {
  const fragment = document.createDocumentFragment();
  const seen = new Set<string>();
  let added = 0;
  // mtYn 무시: 행정구역(시·군|면|리) 단위로만 dedup. 산 여부는 사용자 입력 키워드로 판별.
  for (const it of items) {
    const sido = it.siNm || '';
    const sigungu = it.sggNm || '';
    const emd = it.emdNm || '';
    const li = it.liNm || '';
    const village = li || emd;
    if (!village) continue;
    const key = makeDedupKey(sigungu, emd, village);
    if (seen.has(key)) continue;
    seen.add(key);

    const liEl = document.createElement('li');
    liEl.dataset.source = 'juso';
    liEl.dataset.zipNo = it.zipNo || '';
    liEl.dataset.roadAddr = it.roadAddr || '';
    liEl.dataset.jibunAddr = it.jibunAddr || '';
    liEl.dataset.region = sido;
    liEl.dataset.district = sigungu;
    liEl.dataset.village = village;
    liEl.dataset.emd = emd;
    liEl.dataset.liName = li;
    liEl.dataset.isMountain = 'false';

    const context = [sido, sigungu, li ? emd : null].filter(Boolean).join(' ');
    liEl.textContent = `${village} (${context})`;
    liEl.classList.add('juso-suggestion');
    fragment.appendChild(liEl);
    added++;
    if (added >= JUSO_MAX_DISPLAY) break;
  }
  list.replaceChildren(fragment);
  if (added > 0) list.classList.add('show');
  else list.classList.remove('show');
}

/**
 * 사용자 입력값에서 리(里)/동 이름과 산 키워드, 지번을 분리.
 * 예: '문단리 산 123' → { village:'문단리', hasMountainKeyword:true, lotNumber:'123' }
 *     '문단리 123'    → { village:'문단리', hasMountainKeyword:false, lotNumber:'123' }
 *     '문단리'        → { village:'문단리', hasMountainKeyword:false, lotNumber:'' }
 * juso API는 지번 검색을 지원하지 않으므로 검색은 village만 사용.
 */
function extractVillageAndLot(value: string): ParsedVillage {
  const trimmed = (value || '').trim();
  const m = trimmed.match(/^([가-힣]+[리동])(?:\s+(산)\s*)?(?:\s+(\d+(?:-\d+)?))?$/);
  // isBareVillage=true: 시·도/시·군 없이 '리/동[+산][+지번]'만 입력한 경우 (SAMPL-1-83).
  //   이때 JUSO 키워드 검색은 전국 동명 리가 결과(최대 50건)를 채워 사용 기관 리가 누락되므로
  //   기본 시·도를 prefix해 검색 범위를 좁힌다(buildJusoSearchKey).
  if (m) return { village: m[1], hasMountainKeyword: !!m[2], lotNumber: m[3] || '', isBareVillage: true };
  // 패턴 매칭 안 되면 입력 그대로 검색 (시·도/시·군을 이미 포함한 복합 입력으로 간주)
  return { village: trimmed, hasMountainKeyword: false, lotNumber: '', isBareVillage: false };
}

/**
 * 설정에 저장된 기본 시·도 반환(없으면 빈 문자열).
 */
function getDefaultRegion(): string {
  try {
    return (localStorage.getItem(DEFAULT_REGION_STORAGE_KEY) || '').trim();
  } catch (_) {
    return '';
  }
}

/**
 * 기본 시·도 해석 — 결합도 분리(soil SLS-1-118).
 * bind 옵션으로 getDefaultRegion 함수를 주입하면 그 값을 쓰고(시료 타입별 오버라이드/캐시 가능),
 * 미주입 시에만 공통 모듈 기본값(설정 localStorage 'app_default_sido')으로 폴백.
 */
function resolveDefaultRegion(options?: { getDefaultRegion?: () => string } | null): string {
  if (options && typeof options.getDefaultRegion === 'function') {
    try {
      return (options.getDefaultRegion() || '').trim();
    } catch (_) {
      return '';
    }
  }
  return getDefaultRegion();
}

/**
 * JUSO 검색에 보낼 최종 키워드 생성.
 * 리 단독 입력 + 기본 시·도 설정 시 '시·도 리'로 prefix해 검색 범위를 좁힌다.
 * 시·도를 포함한 복합 입력이거나 기본 시·도 미설정이면 village(리)만 그대로 사용.
 */
function buildJusoSearchKey(parsed: ParsedVillage | null | undefined, defaultRegion?: string): string {
  const village = (parsed && parsed.village) || '';
  const region = defaultRegion != null ? defaultRegion : getDefaultRegion();
  if (parsed && parsed.isBareVillage && region) {
    return `${region} ${village}`.trim();
  }
  return village;
}

/**
 * 행정구역 dedup 키 표준화 헬퍼.
 * 형식: `${시·군}|${면}|${리}` - 정적/JUSO 양쪽에서 동일 키 보장.
 * 산/일반 구분은 사용자 입력 키워드(extractVillageAndLot.hasMountainKeyword)로 처리.
 */
function makeDedupKey(sigungu: string, emdMyeon: string, liVillage: string): string {
  return `${sigungu || ''}|${emdMyeon || ''}|${liVillage || ''}`;
}

/**
 * 정적(local) suggestion + JUSO raw items를 행정구역 단위로 병합/dedup 렌더링.
 * 정적 결과를 앞에 배치(score 우선)하고, 같은 행정구역이 JUSO에 또 있으면 dedup.
 */
function renderMergedSuggestions(
  list: HTMLElement,
  localSuggestions: LocalSuggestion[] | null,
  jusoItems: ReadonlyArray<Partial<JusoAddressItem>> | null,
): void {
  const fragment = document.createDocumentFragment();
  const seen = new Set<string>();
  let added = 0;

  // 1) 정적 결과 먼저
  for (const item of localSuggestions || []) {
    const village = item.village || '';
    const district = item.district || '';
    const region = item.region || '';
    const key = makeDedupKey(region, district, village);
    if (seen.has(key)) continue;
    seen.add(key);
    const li = document.createElement('li');
    li.dataset.source = 'local';
    li.dataset.village = village;
    li.dataset.district = district;
    li.dataset.regionKey = item.regionKey || '';
    li.dataset.region = region;
    li.dataset.isMountain = String(item.isMountain || false);
    li.textContent = item.displayText || `${village} (${region} ${district})`;
    fragment.appendChild(li);
    added++;
    if (added >= JUSO_MAX_DISPLAY) break;
  }

  // 2) JUSO 결과 보강 (행정구역 단위 dedup) - 산/일반 분리 없음, mtYn 무시
  for (const it of jusoItems || []) {
    if (added >= JUSO_MAX_DISPLAY) break;
    const sido = it.siNm || '';
    const sigungu = it.sggNm || '';
    const emd = it.emdNm || '';
    const liNm = it.liNm || '';
    const village = liNm || emd;
    if (!village) continue;
    const key = makeDedupKey(sigungu, emd, village);
    if (seen.has(key)) continue;
    seen.add(key);
    const liEl = document.createElement('li');
    liEl.dataset.source = 'juso';
    liEl.dataset.zipNo = it.zipNo || '';
    liEl.dataset.roadAddr = it.roadAddr || '';
    liEl.dataset.jibunAddr = it.jibunAddr || '';
    liEl.dataset.region = sido;
    liEl.dataset.district = sigungu;
    liEl.dataset.village = village;
    liEl.dataset.emd = emd;
    liEl.dataset.liName = liNm;
    liEl.dataset.isMountain = 'false';
    const context = [sido, sigungu, liNm ? emd : null].filter(Boolean).join(' ');
    liEl.textContent = `${village} (${context})`;
    liEl.classList.add('juso-suggestion');
    fragment.appendChild(liEl);
    added++;
  }

  list.replaceChildren(fragment);
  if (added > 0) list.classList.add('show');
  else list.classList.remove('show');
}

/**
 * 선택된 LI에서 전체 주소 문자열 생성
 */
function buildFullAddress(li: HTMLElement, currentInputValue: string): string {
  // JUSO 결과: 행정구역 + 사용자 입력 지번/산 키워드 결합
  if (li.dataset.source === 'juso') {
    const region = li.dataset.region || '';
    const district = li.dataset.district || '';
    const emd = li.dataset.emd || '';
    const liName = li.dataset.liName || '';
    const isMountainLi = li.dataset.isMountain === 'true';
    const villageBase = liName || emd;
    // 사용자 입력에서 산 키워드 + 지번 추출
    const parsed = extractVillageAndLot(currentInputValue || '');
    const isMountain = isMountainLi || parsed.hasMountainKeyword;
    const villageWithMt = isMountain ? `${villageBase} 산` : villageBase;
    const parts = [region];
    if (district) parts.push(district);
    if (liName && emd) parts.push(emd);
    parts.push(villageWithMt);
    if (parsed.lotNumber) parts.push(parsed.lotNumber);
    const result = parts.filter(Boolean).join(' ').trim();
    // 지번이 없으면 fallback으로 juso의 첫 지번 주소 사용
    return (
      result ||
      li.dataset.jibunAddr ||
      li.dataset.roadAddr ||
      (li.textContent || '').replace(/\s*\[\d{5}\]\s*$/, '').trim()
    );
  }
  const village = li.dataset.village || '';
  const district = li.dataset.district || '';
  const regionKey = li.dataset.regionKey || '';
  const isMountain = li.dataset.isMountain === 'true';
  const lotNumber = li.dataset.lot || '';
  const region = li.dataset.region || regionKey;
  const villageWithMountain = isMountain ? `${village} 산` : village;
  const match = (currentInputValue || '').match(/\d+(-\d+)?$/);
  const extractedLot = lotNumber || (match ? match[0] : '');
  return extractedLot
    ? `${region} ${district} ${villageWithMountain} ${extractedLot}`.trim()
    : `${region} ${district} ${villageWithMountain}`.trim();
}

/**
 * 선택된 LI에서 부가 컨텍스트 추출 (onSelect 콜백 두 번째 인자)
 */
function buildSelectContext(li: HTMLElement, currentInputValue: string): SelectContext {
  // 사용자 입력의 '산' 키워드로 isMountain 결정 (juso의 mtYn 무시)
  const parsed = extractVillageAndLot(currentInputValue || '');
  if (li.dataset.source === 'juso') {
    return {
      source: 'juso',
      zipNo: li.dataset.zipNo || '',
      roadAddr: li.dataset.roadAddr || '',
      jibunAddr: li.dataset.jibunAddr || '',
      sido: li.dataset.region || '',
      sigungu: li.dataset.district || '',
      emd: li.dataset.village || '',
      isMountain: parsed.hasMountainKeyword,
    };
  }
  return {
    source: 'local',
    isMountain: li.dataset.isMountain === 'true' || parsed.hasMountainKeyword,
  };
}

/**
 * 이미 완전한 주소인지 확인
 */
function isFullAddress(value: string, regionNames?: string[]): boolean {
  // 정적 시·군 default 제거됨. 호출처가 명시한 regionNames만 사용.
  // 전국 단위로 동작하므로 default 시·도 prefix 검사가 의미 없어짐.
  const names = Array.isArray(regionNames) ? regionNames : [];
  return names.length > 0 && names.some((name) => value.startsWith(name));
}

/** window.JusoService 헬퍼 타입 (juso-service.ts가 전역 노출) */
interface JusoServiceLike {
  search: (keyword: string, options?: { page?: number; size?: number }) => Promise<JusoSearchResult>;
}

function getJusoService(): JusoServiceLike | null {
  const svc = (window as Window & { JusoService?: JusoServiceLike }).JusoService;
  if (svc && typeof svc.search === 'function') return svc;
  return null;
}

/**
 * JUSO 검색 → 결과를 list에 렌더 (캐시 우선, 없으면 API 호출)
 * @returns Promise<number> 매칭 건수
 */
async function searchAndRenderJuso(value: string, list: HTMLElement, defaultRegion?: string): Promise<number> {
  // 리 단독 입력이면 기본 시·도를 prefix(입력 핸들러와 동일 규칙). 캐시 키도 동일하게 정규화 (SAMPL-1-83).
  // defaultRegion: 호출부 주입값. 미지정 시 buildJusoSearchKey가 설정값으로 폴백.
  const parsed = extractVillageAndLot(value);
  const searchKey = buildJusoSearchKey(parsed, defaultRegion) || parsed.village || value;
  // 1) 캐시 적중
  const cached = getJusoCache(searchKey);
  if (cached) {
    if (cached.length > 0) {
      renderJusoSuggestions(list, cached);
      return cached.length;
    }
    return 0;
  }
  // 2) API 호출
  const svc = getJusoService();
  if (!svc) return 0;
  try {
    const r = await svc.search(searchKey, { size: JUSO_RESULT_SIZE });
    const items = r && r.ok && Array.isArray(r.items) ? r.items : [];
    setJusoCache(searchKey, items);
    if (items.length > 0) renderJusoSuggestions(list, items);
    return items.length;
  } catch (_) {
    return 0;
  }
}

/**
 * Enter 키 처리: 정적 파싱 우선 + JUSO 폴백
 */
async function handleEnterKey(input: HTMLInputElement, list: HTMLElement, options: BindOptions): Promise<void> {
  const value = input.value.trim();
  const parse = (window as Window & { parseParcelAddress?: (v: string) => ParsedParcelAddress | null })
    .parseParcelAddress;
  const result = typeof parse === 'function' ? parse(value) : null;

  // 정적 파싱 성공 분기
  if (result) {
    if (result.isDuplicate) {
      if (typeof options.onShowModal === 'function') {
        options.onShowModal(result, input);
        return;
      } else if (result.locations) {
        const fragment = document.createDocumentFragment();
        result.locations.forEach((loc) => {
          const li = document.createElement('li');
          li.dataset.source = 'local';
          li.dataset.village = result.villageName || result.village || '';
          li.dataset.district = loc.district || '';
          li.dataset.regionKey = (loc as { regionKey?: string }).regionKey || '';
          li.dataset.lot = result.lotNumber || '';
          li.textContent = (loc.fullAddress || '') + (result.lotNumber ? ' ' + result.lotNumber : '');
          fragment.appendChild(li);
        });
        list.replaceChildren(fragment);
        list.classList.add('show');
        return;
      }
    } else if (result.alternatives && result.alternatives.length > 1) {
      const fragment = document.createDocumentFragment();
      result.alternatives.forEach((district) => {
        const li = document.createElement('li');
        li.dataset.source = 'local';
        li.dataset.village = result.village || '';
        li.dataset.district = district || '';
        li.dataset.lot = result.lotNumber || '';
        li.dataset.regionKey = result.regionKey || '';
        li.textContent = [result.region, district, result.village, result.lotNumber || ''].filter(Boolean).join(' ');
        fragment.appendChild(li);
      });
      list.replaceChildren(fragment);
      list.classList.add('show');
      return;
    } else {
      input.value = result.fullAddress || '';
      list.classList.remove('show');
      if (typeof options.onSelect === 'function') {
        options.onSelect(input.value, { source: 'local', isMountain: false });
      }
      return;
    }
  }

  // 정적 파싱 실패 → JUSO 폴백
  if (options.enableJusoFallback === false) return;
  if (value.length < JUSO_MIN_QUERY_LEN) return;
  await searchAndRenderJuso(value, list, resolveDefaultRegion(options));
}

/**
 * 주소 자동완성 바인딩
 */
function bind(input: HTMLInputElement | null, list: HTMLElement | null, options: BindOptions = {}): void {
  if (!input || !list) return;

  // 중복 바인딩 가드
  if (input.dataset.autocompleteBound === '1') return;
  input.dataset.autocompleteBound = '1';

  // 모듈 첫 사용 시 캐시 sweep 1회 실행
  sweepJusoCacheOnce();

  const regionKeys = Object.prototype.hasOwnProperty.call(options, 'regionKeys') ? options.regionKeys : null;
  const enableJusoFallback = options.enableJusoFallback !== false;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastQuery = '';

  const cancelDebounce = (): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const suggest = (window as Window & {
    suggestRegionVillages?: (v: string, regions: string[] | null, includeMountain?: boolean) => LocalSuggestion[];
  }).suggestRegionVillages;

  input.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value.trim();

    if (!value || isFullAddress(value, options.regionNames)) {
      list.classList.remove('show');
      cancelDebounce();
      if (typeof options.onInput === 'function') options.onInput();
      return;
    }

    // 1) 정적 검색 즉시 시도 (있으면 우선 표시 - JUSO 도착 전까지의 갭 채움)
    let localSuggestions: LocalSuggestion[] = [];
    if (typeof suggest === 'function') {
      localSuggestions = suggest(value, regionKeys ?? null, true);
    }
    if (localSuggestions.length > 0) {
      renderSuggestions(list, localSuggestions);
    } else {
      list.classList.remove('show');
    }

    // 2) JUSO 폴백을 항상 호출하여 다른 시·군의 같은 이름 리도 병합 표시
    if (!enableJusoFallback || value.length < JUSO_MIN_QUERY_LEN) {
      cancelDebounce();
      if (typeof options.onInput === 'function') options.onInput();
      return;
    }

    // 사용자 입력에서 리 이름만 분리 (juso는 지번 검색 미지원이라 village로만 검색)
    // 리 단독 입력이면 기본 시·도를 prefix해 전국 동명 리에 의한 누락 방지 (SAMPL-1-83)
    const parsed = extractVillageAndLot(value);
    const searchKey = buildJusoSearchKey(parsed, resolveDefaultRegion(options)) || parsed.village || value;
    if (searchKey.length < JUSO_MIN_QUERY_LEN) {
      cancelDebounce();
      if (typeof options.onInput === 'function') options.onInput();
      return;
    }

    const cached = getJusoCache(searchKey);
    if (cached) {
      cancelDebounce();
      if (cached.length > 0 || localSuggestions.length > 0) {
        renderMergedSuggestions(list, localSuggestions, cached);
      }
      if (typeof options.onInput === 'function') options.onInput();
      return;
    }

    cancelDebounce();
    lastQuery = searchKey;
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      if (lastQuery !== searchKey) return;
      const svc = getJusoService();
      if (!svc) return;
      try {
        const r = await svc.search(searchKey, { size: JUSO_RESULT_SIZE });
        if (lastQuery !== searchKey) return;
        const items = r && r.ok && Array.isArray(r.items) ? r.items : [];
        setJusoCache(searchKey, items);
        const freshLocal = typeof suggest === 'function' ? suggest(searchKey, regionKeys ?? null, true) : [];
        if (items.length > 0 || freshLocal.length > 0) {
          renderMergedSuggestions(list, freshLocal, items);
        }
      } catch (_) {
        /* 네트워크 실패 - 정적 결과 유지 */
      }
    }, JUSO_DEBOUNCE_MS);

    if (typeof options.onInput === 'function') options.onInput();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      cancelDebounce();
      const value = input.value.trim();
      if (!value || isFullAddress(value, options.regionNames)) {
        list.classList.remove('show');
        return;
      }
      void handleEnterKey(input, list, { ...options, enableJusoFallback });
    }
  });

  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'LI') {
      const originalInput = input.value.trim();
      input.value = buildFullAddress(target, originalInput);
      list.classList.remove('show');
      if (typeof options.onSelect === 'function') {
        options.onSelect(input.value, buildSelectContext(target, originalInput));
      }
    }
  });

  input.addEventListener('blur', () => {
    cancelDebounce();
    setTimeout(() => list.classList.remove('show'), 200);
  });
}

const AddressAutocomplete = {
  bind,
  renderSuggestions,
  renderJusoSuggestions,
  buildFullAddress,
  buildSelectContext,
  clearAllJusoCache,
  // 디버깅/테스트용 노출
  _getJusoCache: getJusoCache,
  _setJusoCache: setJusoCache,
  _sweepJusoCacheOnce: sweepJusoCacheOnce,
  _extractVillageAndLot: extractVillageAndLot,
  _buildJusoSearchKey: buildJusoSearchKey,
  _resolveDefaultRegion: resolveDefaultRegion,
  _getDefaultRegion: getDefaultRegion,
};

// 전역 노출 (렌더러에서 window.AddressAutocomplete 사용)
// globals.d.ts의 AddressAutocompleteApi와 런타임 호환 (render* 파라미터는 구체 타입, 디버그용 _* 멤버 추가 노출)
window.AddressAutocomplete = AddressAutocomplete as unknown as Window['AddressAutocomplete'];

export { AddressAutocomplete };
export type { BindOptions, SelectContext };
