// ========================================
// 공통 주소 검색 모듈
// 행정안전부 도로명주소 검색 API(juso) 기반 자체 모달 UI
// SAMPL-1-47: Kakao(Daum) Postcode CDN 의존 제거
// ========================================

// ========================================
// Type Definitions
// ========================================

/**
 * AddressManager 옵션
 */
interface AddressManagerOptions {
  searchBtn: HTMLElement | null;
  postcodeInput: HTMLInputElement | null;
  roadInput: HTMLInputElement | null;
  detailInput: HTMLInputElement | null;
  hiddenInput: HTMLInputElement | null;
  modal: HTMLElement | null;
  closeBtn: HTMLElement | null;
  container: HTMLElement | null;
}

/**
 * 주소 선택 완료 시 사용하는 Kakao 호환 응답 형식 (juso → adapter)
 */
interface AddressSelectedData {
  zonecode: string;
  roadAddress: string;
  jibunAddress?: string;
  bname: string;
  buildingName: string;
  apartment: 'Y' | 'N';
  sido?: string;
  sigungu?: string;
}

/**
 * 봉화 지역 데이터 엔트리
 */
interface BonghwaMyeon {
  name: string;
  villages: Array<{ name: string }>;
}

/**
 * 주소 검색 결과
 */
interface AddressSearchResult {
  myeon: string;
  ri: string;
  fullAddress: string;
}

// ========================================
// AddressManager 클래스 (juso API)
// ========================================

/**
 * 주소 검색 관리자 클래스 (juso API)
 *
 * 입력 단어로 juso API를 호출해 도로명/지번 주소를 검색하고,
 * 선택 시 우편번호/도로명 주소 필드를 채운 뒤 모달을 닫는다.
 */
class AddressManager {
  private searchBtn: HTMLElement | null;
  private postcodeInput: HTMLInputElement | null;
  private roadInput: HTMLInputElement | null;
  private detailInput: HTMLInputElement | null;
  private hiddenInput: HTMLInputElement | null;
  private modal: HTMLElement | null;
  private closeBtn: HTMLElement | null;
  private container: HTMLElement | null;

  private _page = 1;
  private _pageSize = 10;
  private _lastKeyword = '';
  private _total = 0;
  private _items: JusoAddressItem[] = [];
  private _searching = false;
  private _uiReady = false;
  private _delegateBound = false;

  constructor(options: AddressManagerOptions) {
    this.searchBtn = options.searchBtn;
    this.postcodeInput = options.postcodeInput;
    this.roadInput = options.roadInput;
    this.detailInput = options.detailInput;
    this.hiddenInput = options.hiddenInput;
    this.modal = options.modal;
    this.closeBtn = options.closeBtn;
    this.container = options.container;

    this.init();
  }

  /**
   * 초기화 - 모달 이벤트 + 버튼 위임
   */
  private init(): void {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.modal) {
      const overlay = this.modal.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeModal());
      }
    }
    // 주소 검색 버튼 클릭 이벤트 (직접 + 위임 fallback)
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.openSearch());
    }
    if (!this._delegateBound) {
      this._delegateBound = true;
      const expectedId = this.searchBtn?.id || 'searchAddressBtn';
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        const hit = target?.closest?.('#' + expectedId);
        if (!hit) return;
        // 직접 listener와 중복 트리거 방지: 이미 모달이 보이면 무시
        if (this.modal && !this.modal.classList.contains('hidden')) return;
        this.openSearch();
      });
    }
    if (this.detailInput) {
      this.detailInput.addEventListener('input', () => this.updateFullAddress());
    }
  }

  /**
   * 주소 검색 모달 열기 - 자체 UI를 container 내부에 렌더링
   */
  public openSearch(): void {
    if (!this.container) {
      alert('주소 검색 컨테이너가 존재하지 않습니다.');
      return;
    }
    const w = window as Window & { JusoService?: { search: unknown } };
    if (!w.JusoService || !window.electronAPI?.jusoSearch) {
      alert('juso 주소 검색은 데스크톱(Electron) 환경에서만 사용 가능합니다.');
      return;
    }

    if (this.modal) {
      this.modal.classList.remove('hidden');
    }

    this._renderSearchUI();
    // 자동 포커스 (모달 트랜지션 고려)
    setTimeout(() => {
      const input = this.container?.querySelector<HTMLInputElement>('.juso-search-input');
      if (input) input.focus();
    }, 50);
  }

  /**
   * 검색 UI 컨테이너 내부 마크업 + 이벤트 바인딩
   */
  private _renderSearchUI(): void {
    if (!this.container) return;
    // 중복 렌더 방지 (delegation + direct binding 동시 트리거 케이스)
    if (this._uiReady && this.container.querySelector('.juso-search-input')) return;
    const safeId = 'juso-' + Math.random().toString(36).slice(2, 8);
    this.container.innerHTML = `
            <div class="juso-search-wrap" data-id="${safeId}">
                <div class="juso-search-row">
                    <input type="text" class="juso-search-input"
                        placeholder="도로명/지번/건물명 검색 (예: 봉화읍 봉성로 1)"
                        autocomplete="off" maxlength="80">
                    <button type="button" class="juso-search-btn">검색</button>
                </div>
                <div class="juso-search-hint">예: <em>봉화읍 봉성로</em>, <em>봉화군 삼계리</em>, <em>봉화초등학교</em></div>
                <div class="juso-search-status" aria-live="polite"></div>
                <ul class="juso-search-results"></ul>
                <div class="juso-search-pager">
                    <button type="button" class="juso-page-prev" disabled>← 이전</button>
                    <span class="juso-page-info">0 건</span>
                    <button type="button" class="juso-page-next" disabled>다음 →</button>
                </div>
            </div>
        `;

    const input = this.container.querySelector<HTMLInputElement>('.juso-search-input');
    const btn = this.container.querySelector<HTMLButtonElement>('.juso-search-btn');
    const results = this.container.querySelector<HTMLElement>('.juso-search-results');
    const prevBtn = this.container.querySelector<HTMLButtonElement>('.juso-page-prev');
    const nextBtn = this.container.querySelector<HTMLButtonElement>('.juso-page-next');
    if (!input || !btn || !results || !prevBtn || !nextBtn) return;

    const doSearch = (page = 1): void => {
      const keyword = (input.value || '').trim();
      if (!keyword) return;
      this._lastKeyword = keyword;
      this._page = page;
      void this._runSearch();
    };

    btn.addEventListener('click', () => doSearch(1));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch(1);
      }
    });
    prevBtn.addEventListener('click', () => {
      if (this._page > 1) doSearch(this._page - 1);
    });
    nextBtn.addEventListener('click', () => {
      const maxPage = Math.max(1, Math.ceil(this._total / this._pageSize));
      if (this._page < maxPage) doSearch(this._page + 1);
    });

    results.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const li = target.closest<HTMLElement>('li[data-idx]');
      if (!li) return;
      const idx = Number(li.dataset.idx);
      const item = this._items[idx];
      if (item) this._onJusoSelected(item);
    });
    // 키보드 Enter 지원
    results.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active.dataset && active.dataset.idx !== undefined) {
        e.preventDefault();
        const idx = Number(active.dataset.idx);
        const item = this._items[idx];
        if (item) this._onJusoSelected(item);
      }
    });

    this._uiReady = true;
  }

  /**
   * 실제 검색 실행 (JusoService 호출 + 렌더링)
   */
  private async _runSearch(): Promise<void> {
    if (this._searching || !this.container) return;
    const statusEl = this.container.querySelector<HTMLElement>('.juso-search-status');
    const resultsEl = this.container.querySelector<HTMLElement>('.juso-search-results');
    const prevBtn = this.container.querySelector<HTMLButtonElement>('.juso-page-prev');
    const nextBtn = this.container.querySelector<HTMLButtonElement>('.juso-page-next');
    const infoEl = this.container.querySelector<HTMLElement>('.juso-page-info');
    const searchBtn = this.container.querySelector<HTMLButtonElement>('.juso-search-btn');
    const svc = (window as Window & { JusoService?: JusoServiceApi }).JusoService;
    if (!statusEl || !resultsEl || !prevBtn || !nextBtn || !infoEl || !svc) return;

    this._searching = true;
    if (searchBtn) searchBtn.disabled = true;
    statusEl.textContent = '검색 중...';
    resultsEl.innerHTML = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    try {
      const r = await svc.search(this._lastKeyword, {
        page: this._page,
        size: this._pageSize,
      });
      if (!r.ok) {
        statusEl.textContent = `오류: ${r.error || '검색 실패'}`;
        infoEl.textContent = '0 건';
        this._items = [];
        this._total = 0;
        return;
      }
      this._items = r.items || [];
      this._total = Number(r.total) || 0;
      if (this._items.length === 0) {
        statusEl.textContent = '검색 결과가 없습니다.';
        infoEl.textContent = '0 건';
        return;
      }
      statusEl.textContent = '';
      this._renderResults(resultsEl);
      const maxPage = Math.max(1, Math.ceil(this._total / this._pageSize));
      infoEl.textContent = `${this._total.toLocaleString()} 건 (${this._page}/${maxPage})`;
      prevBtn.disabled = this._page <= 1;
      nextBtn.disabled = this._page >= maxPage;
    } catch (err) {
      statusEl.textContent = `오류: ${(err as Error)?.message || '알 수 없는 오류'}`;
    } finally {
      this._searching = false;
      if (searchBtn) searchBtn.disabled = false;
    }
  }

  /**
   * 결과 리스트 렌더링 (XSS 안전: escapeHTML 경유)
   */
  private _renderResults(ul: HTMLElement): void {
    const esc =
      (window as Window & { escapeHTML?: (s: string | null | undefined) => string }).escapeHTML ||
      ((s: unknown): string =>
        String(s ?? '').replace(
          /[&<>"']/g,
          (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
        ));
    const html = this._items
      .map((it, idx) => {
        const road = esc((it.roadAddr as string) || (it.roadAddrPart1 as string) || '');
        const jibun = esc((it.jibunAddr as string) || '');
        const zip = esc((it.zipNo as string) || '');
        const bdNm = esc((it.bdNm as string) || '');
        return `
                <li data-idx="${idx}" tabindex="0">
                    <div class="juso-item-road">
                        <span class="juso-zip">[${zip}]</span>
                        <strong>${road}</strong>
                        ${bdNm ? `<span class="juso-bdnm">(${bdNm})</span>` : ''}
                    </div>
                    <div class="juso-item-jibun">지번: ${jibun}</div>
                </li>
            `;
      })
      .join('');
    ul.innerHTML = html;
  }

  /**
   * 결과 선택 핸들러: juso 형식을 Kakao 형식으로 매핑 후 onAddressSelected로 위임
   */
  private _onJusoSelected(juso: JusoAddressItem): void {
    // SAMPL-1-47 M-3: juso.bdKdcd === '1' → 공동주택 (Y) 매핑
    const isApartment = String((juso.bdKdcd as string) || '') === '1';
    const adapted: AddressSelectedData = {
      zonecode: (juso.zipNo as string) || '',
      roadAddress: (juso.roadAddr as string) || (juso.roadAddrPart1 as string) || '',
      jibunAddress: (juso.jibunAddr as string) || '',
      bname: (juso.liNm as string) || (juso.emdNm as string) || '',
      buildingName: (juso.bdNm as string) || '',
      apartment: isApartment ? 'Y' : 'N',
      sido: (juso.siNm as string) || '',
      sigungu: (juso.sggNm as string) || '',
    };
    this.onAddressSelected(adapted);
  }

  /**
   * 주소 선택 완료 핸들러 (Kakao 응답 형식 어댑터를 받음)
   */
  private onAddressSelected(data: AddressSelectedData): void {
    const roadAddr = data.roadAddress || '';
    let extraRoadAddr = '';

    // SAMPL-1-47 M-5: 문자 클래스 내 |는 리터럴 파이프로 잘못 매칭 → 정정 + /g 제거
    if (data.bname && /[동로가]$/.test(data.bname)) {
      extraRoadAddr += data.bname;
    }
    if (data.buildingName && data.apartment === 'Y') {
      extraRoadAddr += extraRoadAddr !== '' ? ', ' + data.buildingName : data.buildingName;
    }
    if (extraRoadAddr !== '') {
      extraRoadAddr = ' (' + extraRoadAddr + ')';
    }

    if (this.postcodeInput) this.postcodeInput.value = data.zonecode || '';
    if (this.roadInput) this.roadInput.value = roadAddr + extraRoadAddr;

    if (this.detailInput) {
      this.detailInput.focus();
    }

    this.updateFullAddress();
    this.closeModal();
  }

  /**
   * 모달 닫기
   */
  public closeModal(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
    setTimeout(() => {
      if (this.container) {
        this.container.innerHTML = '';
      }
      this._uiReady = false;
      this._items = [];
      this._page = 1;
      this._total = 0;
      this._lastKeyword = '';
    }, 100);
  }

  /**
   * 전체 주소 업데이트
   */
  public updateFullAddress(): void {
    if (!this.hiddenInput) return;

    const postcode = this.postcodeInput?.value || '';
    const road = this.roadInput?.value || '';
    const detail = this.detailInput?.value || '';

    if (postcode && road) {
      this.hiddenInput.value = `(${postcode}) ${road}${detail ? ' ' + detail : ''}`;
    } else {
      this.hiddenInput.value = '';
    }
  }

  /**
   * 주소 필드 초기화
   */
  public clear(): void {
    if (this.postcodeInput) this.postcodeInput.value = '';
    if (this.roadInput) this.roadInput.value = '';
    if (this.detailInput) this.detailInput.value = '';
    if (this.hiddenInput) this.hiddenInput.value = '';
  }

  /**
   * 주소 값 설정
   */
  public setValue(postcode: string, road: string, detail: string): void {
    if (this.postcodeInput) this.postcodeInput.value = postcode || '';
    if (this.roadInput) this.roadInput.value = road || '';
    if (this.detailInput) this.detailInput.value = detail || '';
    this.updateFullAddress();
  }
}

// juso 자체 모달 스타일 (외부 CSS 의존성 제거 위해 일회성 주입)
(function injectJusoStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('juso-search-style')) return;
  const style = document.createElement('style');
  style.id = 'juso-search-style';
  style.textContent = `
        /* JUSO 검색 모달은 Daum iframe(1080px)보다 좁게 (SAMPL-1-110) */
        #addressModal .modal-content.modal-large { max-width: 560px; width: 90vw; }
        .juso-search-wrap { display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
        .juso-search-row { display: flex; gap: 6px; }
        .juso-search-input { flex: 1; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; }
        .juso-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
        .juso-search-btn { padding: 8px 14px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .juso-search-btn:hover { background: #1d4ed8; }
        .juso-search-hint { font-size: 12px; color: #6b7280; }
        .juso-search-hint em { font-style: normal; color: #2563eb; }
        .juso-search-status { min-height: 18px; font-size: 12px; color: #6b7280; }
        .juso-search-results { list-style: none; padding: 0; margin: 0; max-height: 360px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px; }
        .juso-search-results:empty { border: 0; }
        .juso-search-results li { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; outline: none; }
        .juso-search-results li:last-child { border-bottom: 0; }
        .juso-search-results li:hover, .juso-search-results li:focus { background: #eff6ff; }
        .juso-item-road { font-size: 14px; color: #111827; }
        .juso-item-road strong { font-weight: 600; }
        .juso-zip { display: inline-block; min-width: 50px; color: #2563eb; font-size: 12px; margin-right: 4px; }
        .juso-bdnm { color: #6b7280; font-size: 12px; margin-left: 4px; }
        .juso-item-jibun { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .juso-search-pager { display: flex; justify-content: space-between; align-items: center; padding-top: 4px; font-size: 13px; }
        .juso-search-pager button { padding: 4px 10px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; }
        .juso-search-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .juso-page-info { color: #6b7280; }
        /* 다크 모드 */
        [data-theme="dark"] .juso-search-input { background: #1f2937; color: #f9fafb; border-color: #374151; }
        [data-theme="dark"] .juso-search-input:focus { border-color: #60a5fa; }
        [data-theme="dark"] .juso-search-hint, [data-theme="dark"] .juso-search-status, [data-theme="dark"] .juso-page-info, [data-theme="dark"] .juso-item-jibun, [data-theme="dark"] .juso-bdnm { color: #9ca3af; }
        [data-theme="dark"] .juso-search-results { border-color: #374151; }
        [data-theme="dark"] .juso-search-results li { border-color: #1f2937; color: #e5e7eb; }
        [data-theme="dark"] .juso-search-results li:hover, [data-theme="dark"] .juso-search-results li:focus { background: #1e3a8a; }
        [data-theme="dark"] .juso-item-road { color: #f9fafb; }
        [data-theme="dark"] .juso-search-pager button { background: #1f2937; border-color: #374151; color: #e5e7eb; }
        [data-theme="dark"] .juso-zip { color: #60a5fa; }
    `;
  document.head.appendChild(style);
})();

// ========================================
// BonghwaAddressAutocomplete 클래스
// ========================================

/**
 * 봉화 지역 자동완성 관리자 클래스
 */
class BonghwaAddressAutocomplete {
  private input: HTMLInputElement | null;
  private list: HTMLElement | null;
  private onSelect: ((fullAddress: string, match: AddressSearchResult) => void) | null;
  private onRegionConflict:
    | ((matches: AddressSearchResult[], number: string) => void)
    | null;

  constructor(
    input: HTMLInputElement | null,
    list: HTMLElement | null,
    onSelect: (fullAddress: string, match: AddressSearchResult) => void,
    onRegionConflict: ((matches: AddressSearchResult[], number: string) => void) | null = null
  ) {
    this.input = input;
    this.list = list;
    this.onSelect = onSelect;
    this.onRegionConflict = onRegionConflict;

    if (this.input && this.list) {
      this.init();
    }
  }

  /**
   * 초기화
   */
  private init(): void {
    // 입력 이벤트
    if (this.input) {
      this.input.addEventListener('input', () => this.handleInput());

      // 엔터키 이벤트
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleEnter();
        }
      });

      // 포커스 아웃 시 목록 숨김
      this.input.addEventListener('blur', () => {
        setTimeout(() => this.hideList(), 200);
      });
    }
  }

  /**
   * 입력 핸들러
   */
  private handleInput(): void {
    if (!this.input) return;

    const value = this.input.value.trim();
    if (value.length < 1) {
      this.hideList();
      return;
    }

    // bonghwaData가 없으면 중단
    const bonghwaData = (window as Window & { bonghwaData?: BonghwaMyeon[] }).bonghwaData;
    if (!bonghwaData) {
      this.hideList();
      return;
    }

    const matches = this.searchAddress(value);
    this.showSuggestions(matches);
  }

  /**
   * 주소 검색
   */
  private searchAddress(query: string): AddressSearchResult[] {
    const results: AddressSearchResult[] = [];
    const queryLower = query.toLowerCase();

    const bonghwaData = (window as Window & { bonghwaData?: BonghwaMyeon[] }).bonghwaData;
    if (!bonghwaData) return results;

    for (const myeon of bonghwaData) {
      for (const ri of myeon.villages) {
        const fullAddr = `${myeon.name} ${ri.name}`;
        if (fullAddr.toLowerCase().includes(queryLower) || ri.name.toLowerCase().includes(queryLower)) {
          results.push({
            myeon: myeon.name,
            ri: ri.name,
            fullAddress: fullAddr,
          });
        }
      }
    }

    return results.slice(0, 10); // 최대 10개
  }

  /**
   * 자동완성 목록 표시
   */
  private showSuggestions(matches: AddressSearchResult[]): void {
    if (!this.list) return;

    this.list.innerHTML = '';

    if (matches.length === 0) {
      this.hideList();
      return;
    }

    matches.forEach((match) => {
      const li = document.createElement('li');
      li.textContent = match.fullAddress;
      li.addEventListener('click', () => {
        this.selectAddress(match);
      });
      this.list?.appendChild(li);
    });

    this.list.classList.add('show');
  }

  /**
   * 주소 선택
   */
  private selectAddress(match: AddressSearchResult): void {
    if (!this.input) return;

    const value = this.input.value.trim();
    const numberMatch = value.match(/\d+(-\d+)?$/);
    const number = numberMatch ? numberMatch[0] : '';

    const fullAddress = `${match.fullAddress}${number ? ' ' + number : ''}`;
    this.input.value = fullAddress;
    this.hideList();

    if (this.onSelect) {
      this.onSelect(fullAddress, match);
    }
  }

  /**
   * 엔터키 핸들러
   */
  private handleEnter(): void {
    if (!this.input) return;

    const value = this.input.value.trim();

    // bonghwaData가 없으면 중단
    const bonghwaData = (window as Window & { bonghwaData?: BonghwaMyeon[] }).bonghwaData;
    if (!bonghwaData) return;

    // 마을명 추출 (숫자 제외)
    const villagePart = value.replace(/\s*\d+(-\d+)?$/, '').trim();
    const numberMatch = value.match(/\d+(-\d+)?$/);
    const number = numberMatch ? numberMatch[0] : '';

    // 검색
    const matches = this.searchAddress(villagePart);

    if (matches.length === 1) {
      // 정확히 하나만 매칭
      const match = matches[0];
      const fullAddress = `${match.fullAddress}${number ? ' ' + number : ''}`;
      this.input.value = fullAddress;
      this.hideList();

      if (this.onSelect) {
        this.onSelect(fullAddress, match);
      }
    } else if (matches.length > 1 && this.onRegionConflict) {
      // 여러 개 매칭 (중복 지역)
      this.onRegionConflict(matches, number);
    }
  }

  /**
   * 목록 숨김
   */
  public hideList(): void {
    if (this.list) {
      this.list.classList.remove('show');
      this.list.innerHTML = '';
    }
  }

  /**
   * 값 설정
   */
  public setValue(value: string): void {
    if (this.input) {
      this.input.value = value || '';
    }
  }

  /**
   * 값 가져오기
   */
  public getValue(): string {
    return this.input?.value.trim() || '';
  }
}

// 전역으로 내보내기
(window as Window & { AddressManager?: typeof AddressManager }).AddressManager = AddressManager;
(
  window as Window & { BonghwaAddressAutocomplete?: typeof BonghwaAddressAutocomplete }
).BonghwaAddressAutocomplete = BonghwaAddressAutocomplete;

export { AddressManager, BonghwaAddressAutocomplete };
export type { AddressManagerOptions, AddressSearchResult, BonghwaMyeon };
