// ========================================
// 공통 주소 검색 모듈
// Daum 우편번호 API 및 봉화 지역 자동완성 지원
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
 * Kakao Postcode API 응답 데이터
 */
interface KakaoPostcodeData {
  roadAddress: string;
  zonecode: string;
  bname: string;
  buildingName: string;
  apartment: 'Y' | 'N';
}

/**
 * Kakao Postcode 클래스 (전역)
 */
interface KakaoPostcode {
  new (options: { oncomplete: (data: KakaoPostcodeData) => void }): {
    embed(container: HTMLElement | null): void;
  };
}

/**
 * Kakao 전역 객체
 */
interface KakaoGlobal {
  Postcode: KakaoPostcode;
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
// AddressManager 클래스
// ========================================

/**
 * 주소 검색 관리자 클래스
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
   * 초기화
   */
  private init(): void {
    // 모달 닫기 이벤트
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    // 오버레이 클릭 시 닫기
    if (this.modal) {
      const overlay = this.modal.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => this.closeModal());
      }
    }

    // 주소 검색 버튼 클릭 이벤트
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.openSearch());
    }

    // 상세 주소 입력 시 전체 주소 업데이트
    if (this.detailInput) {
      this.detailInput.addEventListener('input', () => this.updateFullAddress());
    }
  }

  /**
   * 주소 검색 모달 열기
   */
  public openSearch(): void {
    const kakao = (window as Window & { kakao?: KakaoGlobal }).kakao;
    if (typeof kakao === 'undefined' || typeof kakao.Postcode === 'undefined') {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 모달 표시
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }

    // 이전 내용 초기화
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Daum Postcode 임베드
    new kakao.Postcode({
      oncomplete: (data: KakaoPostcodeData) => this.onAddressSelected(data),
    }).embed(this.container);
  }

  /**
   * 주소 선택 완료 핸들러
   */
  private onAddressSelected(data: KakaoPostcodeData): void {
    // 도로명 주소
    const roadAddr = data.roadAddress;
    let extraRoadAddr = '';

    // 법정동명이 있을 경우 추가
    if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
      extraRoadAddr += data.bname;
    }
    // 건물명이 있고, 공동주택일 경우 추가
    if (data.buildingName !== '' && data.apartment === 'Y') {
      extraRoadAddr += extraRoadAddr !== '' ? ', ' + data.buildingName : data.buildingName;
    }
    // 표시할 참고항목이 있을 경우 괄호 추가
    if (extraRoadAddr !== '') {
      extraRoadAddr = ' (' + extraRoadAddr + ')';
    }

    // 폼에 값 설정
    if (this.postcodeInput) this.postcodeInput.value = data.zonecode;
    if (this.roadInput) this.roadInput.value = roadAddr + extraRoadAddr;

    // 상세 주소로 포커스 이동
    if (this.detailInput) {
      this.detailInput.focus();
    }

    // 전체 주소 업데이트
    this.updateFullAddress();

    // 모달 닫기
    this.closeModal();
  }

  /**
   * 모달 닫기
   */
  public closeModal(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
    // 컨테이너 초기화
    setTimeout(() => {
      if (this.container) {
        this.container.innerHTML = '';
      }
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
