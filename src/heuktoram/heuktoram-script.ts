/**
 * @fileoverview 흙토람 토양검정 일괄입력 서식 내보내기 (TypeScript)
 * 토양 접수 데이터(test_soilSampleLogs)를 읽어와 검정 결과를 입력하고
 * 흙토람 서식(.xlsx)으로 내보내는 페이지 스크립트
 */

export {};

// ========================================
// 타입 정의
// ========================================

interface SoilCrop {
  name?: string;
  area?: string | number;
  unit?: 'pyeong' | 'm2' | string;
  code?: string;
}

interface SoilSubLot {
  lotAddress?: string;
  isMountain?: boolean;
  crops?: SoilCrop[];
}

interface SoilParcel {
  lotAddress?: string;
  category?: string;
  purpose?: string;
  isMountain?: boolean;
  crops?: SoilCrop[];
  subLots?: (SoilSubLot | string)[];
}

interface SoilLog {
  id: string;
  receptionNumber?: string;
  name?: string;
  date?: string;
  address?: string;
  addressPostcode?: string;
  addressRoad?: string;
  addressDetail?: string;
  phoneNumber?: string;
  subCategory?: string;
  purpose?: string;
  parcels?: SoilParcel[];
}

interface SoilTestResult {
  testDate?: string;
  soiling?: string;
  clay?: string;
  pH?: string;
  organicMatter?: string;
  availableP?: string;
  exK?: string;
  exCa?: string;
  exMg?: string;
  silica?: string;
  ec?: string;
  limeReq?: string;
  NO3N?: string;
  cec?: string;
  NH4N?: string;
  usageCode?: string;
  [key: string]: string | undefined;
}

interface HeuktoramRow {
  key: string;
  displayNumber: string;
  baseReceptionNumber?: string;  // 부번 제거된 본 접수번호 (예: '468-1' → '468')
  log: SoilLog;
  parcel: SoilParcel | null;
  parcelIdx: number;
  crop?: SoilCrop;
  cropIdx?: number;
  subLot: SoilSubLot | null;
  subLotIdx: number;
  isSubLot: boolean;
}

interface ParsedLotAddress {
  sido: string;
  sigungu: string;
  eupmyeondong: string;
  ri: string;
  isMountain: boolean;
  jibun1: string;
  jibun2: string;
}

interface ParsedPersonAddress {
  sido: string;
  sigungu: string;
  eupmyeondong: string;
  roadName: string;
  mainNum: string;
  subNum: string;
  dongFloorHo: string;
  note: string;
}

interface FocusedCell {
  rowIdx: number;
  colIdx: number;
}

// Window 확장
declare global {
  interface Window {
    XLSX?: typeof import('xlsx-js-style');
    REGION_NAMES?: Record<string, string>;
    showToast?: (msg: string, type?: string) => void;
    logger?: { error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void };
    ThemeManager?: { init(): void; setTheme(theme: string): void };
    parseAddressParts?: (address: string) => { sido?: string; sigungu?: string; eupmyeondong?: string; rest?: string };
    heuktoramManager?: HeuktoramManager;
  }
}

// ========================================
// 상수 정의
// ========================================

const PYEONG_TO_SQM = 3.3058;

// ========================================
// 공익직불제 이행점검 일괄입력 양식 — 헤더 템플릿 (SAMPL-1-116, 메인 SAMPL-1-87 이식)
// 데이터는 C열(절대 인덱스 2)부터 시작. 헤더맵 키는 C 기준 상대 인덱스(0=C, 1=D, ...).
// ========================================
const GONGIK_WS_TOTAL_COLS = 40;  // 데이터 열 수 (C~AN)
const GONGIK_WS_C = 2;            // 데이터 시작 절대 인덱스(C열) — A,B는 빈 열(숨김)
const GONGIK_WS_GUIDE = '* 아래 형식과 같이 입력되어야만 일괄입력을 할 수 있습니다.\n'
  + '  - 경영체등록번호는 10자리 숫자로 입력하세요.\n'
  + '  - 신청자 전화번호는 \'-\' 없이 입력하세요(예: 01023456789).\n'
  + '  - 대상지면적의 단위는 ㎡(제곱미터)로 숫자만 입력하세요.\n'
  + '  - 기준년도는 \'직불제 - 이행점검 적합기준 보기\' 메뉴의 \'이행점검명\'을 입력하세요.\n'
  + '  - 원활한 일괄입력을 위하여 1회당 300건 이하의 자료 입력을 권장드립니다.';

// 2행: 대분류 헤더 (C 기준 상대 인덱스)
const GONGIK_WS_HEADER2: Record<number, string> = {
  0: '차수', 1: '시료채취일자', 2: '토양검정일', 3: '분석의뢰일(접수일자)', 4: '용도구분',
  6: '채취자명', 7: '시료번호', 8: '경영체등록번호', 9: '경작자명', 10: '대상지',
  17: '상세주소', 18: '경지구분', 20: '경작자 주소', 21: '신청자 전화번호', 22: '대상지면적(㎡)',
  23: '작물명 또는 작물코드', 24: '기준년도', 25: '화학성분값'
};

// 3행: 소분류 헤더 (C 기준 상대 인덱스)
const GONGIK_WS_HEADER3: Record<number, string> = {
  4: '구분', 5: '시행전후', 10: '시도', 11: '시군구', 12: '읍면동', 13: '리', 14: '일반·산',
  15: '지번 1', 16: '지번 2', 18: '1차', 19: '2차',
  25: '점토함량', 26: 'pH', 27: '유기물', 28: '유효인산', 29: '교환성칼륨', 30: '교환성칼슘',
  31: '교환성마그네슘', 32: '유효규산', 33: '전기전도도', 34: '석회소요량', 35: '질산태질소',
  36: '양이온치환용량', 37: '암모니아태질소'
};

/** 0-based 컬럼 인덱스 → A1 컬럼 문자 (0→A, 25→Z, 26→AA, 39→AN). XLSX.utils.encode_col 대체(타입 미노출). */
function encodeCol(index: number): string {
  let s = '';
  let c = index + 1;
  while (c > 0) {
    const rem = (c - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

/**
 * 공익직불제 양식 행 생성. 맵 키는 C 기준 상대 인덱스 → C 오프셋 적용해 절대 인덱스에 배치.
 * 0~39 범위를 벗어난 키는 무시하고 경고(외부 양식 열 수 보호).
 */
function makeGongikRow(map?: Record<number, string>): string[] {
  const r = new Array(GONGIK_WS_TOTAL_COLS + GONGIK_WS_C).fill('') as string[];
  if (map) {
    for (const k in map) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < GONGIK_WS_TOTAL_COLS) {
        r[GONGIK_WS_C + i] = map[i];
      } else {
        (window.logger?.warn || console.warn)(`[공익직불양식] 컬럼 인덱스 범위 초과 무시: ${k}`);
      }
    }
  }
  return r;
}

// localStorage 키 접두사 (테스트 프로젝트)
const STORAGE_PREFIX = 'test_';

// 시군구 → 시도 추론 테이블
const SIGUNGU_TO_SIDO: Record<string, string> = {
  // 경상남도
  '창원시': '경상남도', '진주시': '경상남도', '통영시': '경상남도', '사천시': '경상남도', '김해시': '경상남도',
  '밀양시': '경상남도', '거제시': '경상남도', '양산시': '경상남도', '의령군': '경상남도', '함안군': '경상남도',
  '창녕군': '경상남도', '남해군': '경상남도', '하동군': '경상남도', '산청군': '경상남도',
  '함양군': '경상남도', '거창군': '경상남도', '합천군': '경상남도',
  // 전북특별자치도
  '전주시': '전북특별자치도', '군산시': '전북특별자치도', '익산시': '전북특별자치도', '정읍시': '전북특별자치도',
  '남원시': '전북특별자치도', '김제시': '전북특별자치도', '완주군': '전북특별자치도', '진안군': '전북특별자치도',
  '무주군': '전북특별자치도', '장수군': '전북특별자치도', '임실군': '전북특별자치도', '순창군': '전북특별자치도',
  '고창군': '전북특별자치도', '부안군': '전북특별자치도',
  // 전라남도
  '목포시': '전라남도', '여수시': '전라남도', '순천시': '전라남도', '나주시': '전라남도', '광양시': '전라남도',
  '담양군': '전라남도', '곡성군': '전라남도', '구례군': '전라남도', '고흥군': '전라남도', '보성군': '전라남도',
  '화순군': '전라남도', '장흥군': '전라남도', '강진군': '전라남도', '해남군': '전라남도', '영암군': '전라남도',
  '무안군': '전라남도', '함평군': '전라남도', '영광군': '전라남도', '장성군': '전라남도', '완도군': '전라남도',
  '진도군': '전라남도', '신안군': '전라남도',
  // 충청북도
  '청주시': '충청북도', '충주시': '충청북도', '제천시': '충청북도', '보은군': '충청북도', '옥천군': '충청북도',
  '영동군': '충청북도', '증평군': '충청북도', '진천군': '충청북도', '괴산군': '충청북도', '음성군': '충청북도',
  '단양군': '충청북도',
  // 충청남도
  '천안시': '충청남도', '공주시': '충청남도', '보령시': '충청남도', '아산시': '충청남도', '서산시': '충청남도',
  '논산시': '충청남도', '계룡시': '충청남도', '당진시': '충청남도', '금산군': '충청남도', '부여군': '충청남도',
  '서천군': '충청남도', '청양군': '충청남도', '홍성군': '충청남도', '예산군': '충청남도', '태안군': '충청남도',
  // 강원특별자치도
  '춘천시': '강원특별자치도', '원주시': '강원특별자치도', '강릉시': '강원특별자치도', '동해시': '강원특별자치도',
  '태백시': '강원특별자치도', '속초시': '강원특별자치도', '삼척시': '강원특별자치도', '홍천군': '강원특별자치도',
  '횡성군': '강원특별자치도', '영월군': '강원특별자치도', '평창군': '강원특별자치도', '정선군': '강원특별자치도',
  '철원군': '강원특별자치도', '화천군': '강원특별자치도', '양구군': '강원특별자치도', '인제군': '강원특별자치도',
  '양양군': '강원특별자치도',
  // 경기도
  '수원시': '경기도', '성남시': '경기도', '의정부시': '경기도', '안양시': '경기도', '부천시': '경기도',
  '광명시': '경기도', '평택시': '경기도', '동두천시': '경기도', '안산시': '경기도', '고양시': '경기도',
  '과천시': '경기도', '구리시': '경기도', '남양주시': '경기도', '오산시': '경기도', '시흥시': '경기도',
  '군포시': '경기도', '의왕시': '경기도', '하남시': '경기도', '용인시': '경기도', '파주시': '경기도',
  '이천시': '경기도', '안성시': '경기도', '김포시': '경기도', '화성시': '경기도', '광주시': '경기도',
  '양주시': '경기도', '포천시': '경기도', '여주시': '경기도', '연천군': '경기도', '가평군': '경기도', '양평군': '경기도',
};

// ========================================
// HeuktoramManager 클래스
// ========================================

class HeuktoramManager {
  private selectedYear: string;
  private sampleLogs: SoilLog[];
  private testResults: Record<string, SoilTestResult>;
  /** 진행 중인 IDB 저장 promise (fire-and-forget 갭 차단용) */
  private _pendingIdbSave: Promise<void> | null = null;
  private flatRows: HeuktoramRow[];
  private selectedKeys: Set<string>;
  private focusedCell: FocusedCell | null;
  private preSelectedLogIds: Set<string> | null;

  private readonly resultFields: (keyof SoilTestResult)[];
  private readonly hiddenFields: Set<string>;
  private showAllColumns: boolean;
  private readonly fieldRanges: Record<string, { min: number; max: number; label: string; unit: string }>;

  // DOM refs
  private yearSelect: HTMLSelectElement | null;
  private collectYearInput: HTMLInputElement | null;
  private collectorInput: HTMLInputElement | null;
  private bulkTestDateInput: HTMLInputElement | null;
  private bulkUsageCodeSelect: HTMLSelectElement | null;
  private bulkBeforeAfterSelect: HTMLSelectElement | null;
  private selectAllCheckbox: HTMLInputElement | null;
  private selectAllBtn: HTMLButtonElement | null;
  private applyBulkBtn: HTMLButtonElement | null;
  private exportBtn: HTMLButtonElement | null;
  private exportFormatSelect: HTMLSelectElement | null;
  private toggleColumnsBtn: HTMLButtonElement | null;
  private tableBody: HTMLElement | null;
  private emptyState: HTMLElement | null;
  private recordCount: HTMLElement | null;
  private bulkCompleteBtn: HTMLButtonElement | null;

  constructor() {
    this.selectedYear = new Date().getFullYear().toString();
    this.sampleLogs = [];
    this.testResults = {};
    this.flatRows = [];
    this.selectedKeys = new Set();
    this.focusedCell = null;
    this.preSelectedLogIds = null;

    this.resultFields = [
      'testDate', 'soiling', 'clay', 'pH', 'organicMatter', 'availableP',
      'exK', 'exCa', 'exMg', 'silica', 'ec', 'limeReq', 'NO3N', 'cec', 'NH4N', 'usageCode'
    ];
    this.hiddenFields = new Set(['soiling', 'clay', 'NO3N', 'NH4N']);
    this.showAllColumns = false;

    // 검정 결과 유효 범위 (흙토람 기준)
    this.fieldRanges = {
      pH:            { min: 3.5,  max: 9.5,   label: 'pH',           unit: '' },
      organicMatter: { min: 1,    max: 300,   label: '유기물',        unit: 'g/kg' },
      availableP:    { min: 1,    max: 9999,  label: '유효인산',      unit: 'mg/kg' },
      exK:           { min: 0.01, max: 15,    label: '교환성 칼륨',   unit: 'cmol+/kg' },
      exCa:          { min: 0.1,  max: 35,    label: '교환성 칼슘',   unit: 'cmol+/kg' },
      exMg:          { min: 0.1,  max: 25,    label: '교환성 마그네슘', unit: 'cmol+/kg' },
      silica:        { min: 5,    max: 2000,  label: '유효규산',      unit: 'mg/kg' },
      ec:            { min: 0.01, max: 30,    label: '전기전도도',    unit: 'dS/m' }
    };

    // DOM refs (초기화)
    this.yearSelect = null;
    this.collectYearInput = null;
    this.collectorInput = null;
    this.bulkTestDateInput = null;
    this.bulkUsageCodeSelect = null;
    this.bulkBeforeAfterSelect = null;
    this.selectAllCheckbox = null;
    this.selectAllBtn = null;
    this.applyBulkBtn = null;
    this.exportBtn = null;
    this.exportFormatSelect = null;
    this.toggleColumnsBtn = null;
    this.tableBody = null;
    this.emptyState = null;
    this.recordCount = null;
    this.bulkCompleteBtn = null;

    this.init();
  }

  // ========================================
  // 초기화
  // ========================================

  private async init(): Promise<void> {
    this.cacheElements();
    this.setDefaultYear();
    this.restoreFromSoilPage();
    this.bindEvents();
    // 분석결과 IDB 초기화 + localStorage 자동 마이그레이션(멱등)
    try { await window.AnalysisDB?.init(); } catch (e) {
      (window.logger?.warn ?? console.warn)('AnalysisDB 초기화 실패(LS 폴백):', e);
    }
    await this.loadData();
    this.render();
    this.setupResultImporter();

    if (window.ThemeManager) {
      window.ThemeManager.init();
      this.setupThemeToggle();
    }
  }

  /**
   * 엑셀 결과 가져오기 모달 (Phase 1.5 — 파일 업로드 + 텍스트 붙여넣기) 연결
   * 설계: docs-internal/HEUKTORAM_RESULT_EXCEL_IMPORT_MODAL_DESIGN.md (메인 프로젝트)
   */
  private setupResultImporter(): void {
    const ImporterCtor = (window as unknown as { HeuktoramResultImporter?: new (cfg: unknown) => { init: () => void; open: () => void } }).HeuktoramResultImporter;
    if (!ImporterCtor) return;

    const fieldLabels: Partial<Record<keyof SoilTestResult, string>> = {
      pH: 'pH', organicMatter: '유기물', availableP: '유효인산',
      exK: '치환성칼륨(K)', exCa: '치환성칼슘(Ca)', exMg: '치환성마그네슘(Mg)',
      silica: '유효규산', ec: 'EC', limeReq: '석회요구량', cec: 'CEC',
    };

    // 흙토람 표준 default 소수점 자리수 (사용자가 모달에서 변경 가능)
    const fieldDecimals: Partial<Record<keyof SoilTestResult, number>> = {
      pH: 1, organicMatter: 0, availableP: 0,
      exK: 2, exCa: 2, exMg: 2,
      silica: 0, ec: 2, limeReq: 0, cec: 0,
    };

    // 모달 매핑 UI 제외 필드 (도구바 일괄적용 또는 입력 대상 외)
    const IMPORTER_EXCLUDED_FIELDS = new Set<string>(['testDate', 'NO3N', 'NH4N', 'usageCode', 'soiling', 'clay']);
    const importerFields = this.resultFields.filter(f => !IMPORTER_EXCLUDED_FIELDS.has(f as string));

    const importer = new ImporterCtor({
      resultFields: importerFields,
      fieldLabels,
      fieldDecimals,
      fieldRanges: this.fieldRanges,
      getFlatRows:    () => this.flatRows,
      getTestResults: () => this.testResults,
      applyResult:    (rowKey: string, field: string, value: unknown) => {
        if (!this.testResults[rowKey]) this.testResults[rowKey] = {} as SoilTestResult;
        (this.testResults[rowKey] as Record<string, unknown>)[field] = value;
      },
      syncToSiblings: (rowKey: string, field: string, value: unknown) =>
        this.syncToSiblings(rowKey, field as keyof SoilTestResult, value as never),
      saveTestResults: () => this.saveTestResults(),
      rerender: () => {
        this.render();
        this.validateAllRanges();
      },
    });
    importer.init();
  }

  private cacheElements(): void {
    this.yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
    this.collectYearInput = document.getElementById('collectYear') as HTMLInputElement | null;
    this.collectorInput = document.getElementById('collector') as HTMLInputElement | null;
    this.bulkTestDateInput = document.getElementById('bulkTestDate') as HTMLInputElement | null;
    this.bulkUsageCodeSelect = document.getElementById('bulkUsageCode') as HTMLSelectElement | null;
    this.bulkBeforeAfterSelect = document.getElementById('bulkBeforeAfter') as HTMLSelectElement | null;
    this.selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement | null;
    this.selectAllBtn = document.getElementById('selectAllBtn') as HTMLButtonElement | null;
    this.applyBulkBtn = document.getElementById('applyBulkBtn') as HTMLButtonElement | null;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement | null;
    this.exportFormatSelect = document.getElementById('exportFormatSelect') as HTMLSelectElement | null;
    this.toggleColumnsBtn = document.getElementById('toggleColumnsBtn') as HTMLButtonElement | null;
    this.tableBody = document.getElementById('tableBody');
    this.emptyState = document.getElementById('emptyState');
    this.recordCount = document.getElementById('recordCount');
    this.bulkCompleteBtn = document.getElementById('bulkCompleteBtn') as HTMLButtonElement | null;
  }

  /**
   * 토양 접수 대장에서 넘어온 경우 localStorage에서 연도/선택 ID 복원 (팝업 창 방식)
   */
  private restoreFromSoilPage(): void {
    const year = localStorage.getItem('heuktoram_year');
    const selectedIdsJson = localStorage.getItem('heuktoram_selected_ids');

    if (year) {
      this.selectedYear = year;
      if (this.yearSelect) this.yearSelect.value = year;
      if (this.collectYearInput) this.collectYearInput.value = year;
      localStorage.removeItem('heuktoram_year');
    }

    if (selectedIdsJson) {
      try {
        const ids: unknown = JSON.parse(selectedIdsJson);
        this.preSelectedLogIds = Array.isArray(ids) && ids.length > 0
          ? new Set(ids as string[])
          : null;
      } catch {
        this.preSelectedLogIds = null;
      }
      localStorage.removeItem('heuktoram_selected_ids');
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.close();
      });
    }
  }

  private setDefaultYear(): void {
    const year = new Date().getFullYear().toString();
    this.selectedYear = year;
    if (this.yearSelect) this.yearSelect.value = year;
    if (this.collectYearInput) this.collectYearInput.value = year;
  }

  private setupThemeToggle(): void {
    const btn = document.getElementById('themeToggleBtn') as HTMLButtonElement | null;
    if (!btn) return;
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark') btn.classList.add('dark');

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      window.ThemeManager?.setTheme(isDark ? 'light' : 'dark');
      btn.classList.toggle('dark', !isDark);
    });
  }

  private bindEvents(): void {
    this.yearSelect?.addEventListener('change', () => {
      this.selectedYear = this.yearSelect!.value;
      this.preSelectedLogIds = null;
      void this.loadData().then(() => this.render());
    });

    this.selectAllCheckbox?.addEventListener('change', () => {
      this.toggleSelectAll(this.selectAllCheckbox!.checked);
    });

    this.selectAllBtn?.addEventListener('click', () => {
      const allSelected = this.selectedKeys.size === this.flatRows.length;
      this.toggleSelectAll(!allSelected);
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.checked = !allSelected;
      }
    });

    // 토양검정일 초기화 버튼
    document.getElementById('clearBulkTestDate')?.addEventListener('click', () => {
      if (this.bulkTestDateInput) this.bulkTestDateInput.value = '';
    });

    this.bulkTestDateInput?.addEventListener('change', () => {
      const testDate = this.bulkTestDateInput!.value;
      if (!testDate) return;
      for (const row of this.flatRows) {
        if (!this.testResults[row.key]) this.testResults[row.key] = {};
        this.testResults[row.key].testDate = testDate;
      }
      this.saveTestResults();
      this.render();
      window.showToast?.(`검정일이 전체 ${this.flatRows.length}건에 적용되었습니다.`, 'info');
    });

    this.applyBulkBtn?.addEventListener('click', () => this.applyBulkValues());
    // 내보내기 — 선택된 양식으로 분기 (SAMPL-1-116)
    this.exportBtn?.addEventListener('click', () => {
      const fmt = this.exportFormatSelect?.value || 'heuktoram';
      if (fmt === 'gongik') {
        this.exportToGongik();
      } else {
        this.exportToHeuktoram();
      }
    });
    this.toggleColumnsBtn?.addEventListener('click', () => this.toggleHiddenColumns());
    this.bulkCompleteBtn?.addEventListener('click', () => this.bulkComplete());
    this.applyColumnVisibility();

    document.addEventListener('paste', (e: ClipboardEvent) => this.handlePaste(e));
    document.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeydown(e));
  }

  // ========================================
  // 데이터 로드/저장
  // ========================================

  private async loadData(): Promise<void> {
    this.sampleLogs = this.loadSampleLogs();
    this.testResults = await this.loadTestResults();
    this.buildFlatRows();
  }

  private loadSampleLogs(): SoilLog[] {
    const key = `${STORAGE_PREFIX}soilSampleLogs_${this.selectedYear}`;
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // 접수번호 오름차순 정렬 (숫자 우선, F접두사 포함, -N 접미사 포함)
      return (parsed as SoilLog[]).sort((a, b) => {
        const toNum = (s: string | undefined): number => {
          if (!s) return Infinity;
          const str = String(s).replace(/^F/i, '');
          const match = str.match(/^(\d+(?:\.\d+)?)-(\d+)$/);
          if (match) return parseFloat(match[1]) + parseInt(match[2], 10) * 0.001;
          const n = parseFloat(str);
          return isNaN(n) ? Infinity : n;
        };
        return toNum(a.receptionNumber) - toNum(b.receptionNumber);
      });
    } catch (e) {
      (window.logger?.error ?? console.error)('토양 접수 데이터 로드 실패:', e);
      return [];
    }
  }

  private async loadTestResults(): Promise<Record<string, SoilTestResult>> {
    const key = `${STORAGE_PREFIX}soilTestResults_${this.selectedYear}`;
    // IDB 우선 (init에서 마이그레이션 완료 보장)
    if (window.AnalysisDB?.isReady?.()) {
      try {
        // fire-and-forget IDB write의 갭 차단: 진행 중 저장 완료까지 대기
        if (this._pendingIdbSave) { await this._pendingIdbSave.catch(() => {}); }
        const map = await window.AnalysisDB.getMap('soil', this.selectedYear);
        const typed = (map as Record<string, SoilTestResult>) || {};
        if (Object.keys(typed).length > 0) return typed;
        // IDB 비어 있음 → LS 자가복구 폴백
        (window.logger?.warn ?? console.warn)('[AnalysisDB] soil IDB 빈 맵, LS 자가복구 시도 year=', this.selectedYear);
        const lsData = localStorage.getItem(key);
        if (!lsData) return {};
        const lsParsed = (JSON.parse(lsData) as Record<string, SoilTestResult>) || {};
        if (Object.keys(lsParsed).length > 0) {
          this._pendingIdbSave = window.AnalysisDB.saveMap('soil', this.selectedYear, lsParsed)
            .catch(e2 => { (window.logger?.error ?? console.error)('IDB 자가복구 저장 실패:', e2); });
        }
        return lsParsed;
      } catch (e) {
        (window.logger?.warn ?? console.warn)('IDB 검정 결과 로드 실패, LS 폴백:', e);
      }
    }
    // 폴백: localStorage (IDB 미초기화 또는 오류 시)
    try {
      const data = localStorage.getItem(key);
      if (!data) return {};
      return (JSON.parse(data) as Record<string, SoilTestResult>) || {};
    } catch (e) {
      (window.logger?.error ?? console.error)('검정 결과 로드 실패:', e);
      return {};
    }
  }

  private saveTestResults(): void {
    const key = `${STORAGE_PREFIX}soilTestResults_${this.selectedYear}`;
    // 깊은 복사 스냅샷: 이후 this.testResults 변경이 IDB 비동기 write에 영향 주지 않도록
    let snapshot: Record<string, SoilTestResult>;
    try { snapshot = JSON.parse(JSON.stringify(this.testResults || {})); }
    catch { snapshot = { ...(this.testResults || {}) }; }
    // LS 백업 미러 (rollback 안전 + 동기 폴백 지원)
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (e) {
      (window.logger?.warn ?? console.warn)('LS 백업 실패(IDB는 계속):', e);
    }
    // IDB 영속 저장 — 진행 중 promise 보관해 loadTestResults에서 await(갭 차단)
    if (window.AnalysisDB?.isReady?.()) {
      this._pendingIdbSave = window.AnalysisDB.saveMap('soil', this.selectedYear, snapshot)
        .catch(e => {
          (window.logger?.error ?? console.error)('IDB 검정 결과 저장 실패:', e);
        });
    }
  }

  /**
   * 접수 데이터를 필지 단위 flat 행 목록으로 변환
   */
  private buildFlatRows(): void {
    this.flatRows = [];

    const logsToProcess = (this.preSelectedLogIds && this.preSelectedLogIds.size > 0)
      ? this.sampleLogs.filter(log => this.preSelectedLogIds!.has(log.id))
      : this.sampleLogs;

    for (const log of logsToProcess) {
      if (!log.parcels || log.parcels.length === 0) {
        // 접수번호에 '-숫자' 패턴이 있으면 하위필지로 인식 (예: 468-1)
        const rNum = String(log.receptionNumber ?? '');
        const subLotMatch = rNum.match(/^(.+)-(\d+)$/);
        this.flatRows.push({
          key: `${log.id}_0_0`,
          displayNumber: log.receptionNumber ?? '',
          baseReceptionNumber: subLotMatch ? subLotMatch[1] : rNum,
          log,
          parcel: null,
          parcelIdx: 0,
          subLot: null,
          subLotIdx: -1,
          isSubLot: !!subLotMatch
        });
        continue;
      }

      // 첫 번째 필지 첫 작물이 '필지', 이후 모든 항목(다른 필지 포함)은 '하위필지'
      // 접수번호에 '-숫자' 패턴이 있으면 (예: 468-1) 전체가 하위필지
      const hasSubLotNumber = /^.+-\d+$/.test(String(log.receptionNumber ?? ''));
      let entryCounter = 0; // 접수 건 전체 카운터 (0=필지, 1+=하위필지)
      for (let pi = 0; pi < log.parcels.length; pi++) {
        const parcel = log.parcels[pi];
        const crops: SoilCrop[] = parcel.crops ?? [{ name: '', area: '', code: '' }];

        for (let ci = 0; ci < crops.length; ci++) {
          this.flatRows.push({
            key: `${log.id}_${pi}_c${ci}`,
            displayNumber: (hasSubLotNumber || entryCounter === 0)
              ? (log.receptionNumber ?? '')
              : `${log.receptionNumber}-${entryCounter}`,
            log,
            parcel,
            parcelIdx: pi,
            crop: crops[ci],
            cropIdx: ci,
            subLot: null,
            subLotIdx: -1,
            isSubLot: hasSubLotNumber || entryCounter > 0
          });
          entryCounter++;
        }

        if (parcel.subLots) {
          for (let si = 0; si < parcel.subLots.length; si++) {
            const rawSub = parcel.subLots[si];
            const sub: SoilSubLot = typeof rawSub === 'string'
              ? { lotAddress: rawSub, crops: [] }
              : rawSub;
            const subCrops: SoilCrop[] = (sub.crops && sub.crops.length > 0) ? sub.crops : [{ name: '', area: '', code: '' }];

            for (let sci = 0; sci < subCrops.length; sci++) {
              this.flatRows.push({
                key: `${log.id}_${pi}_s${si}_c${sci}`,
                displayNumber: `${log.receptionNumber}-${entryCounter}`,
                log,
                parcel,
                parcelIdx: pi,
                crop: subCrops[sci],
                cropIdx: sci,
                subLot: sub,
                subLotIdx: si,
                isSubLot: true
              });
              entryCounter++;
            }
          }
        }
      }
    }

    this.preSelectedLogIds = null;
  }

  // ========================================
  // 렌더링
  // ========================================

  private render(): void {
    if (!this.tableBody) return;

    if (this.flatRows.length === 0) {
      this.tableBody.innerHTML = '';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      if (this.recordCount) this.recordCount.textContent = '0건';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';
    if (this.recordCount) this.recordCount.textContent = `${this.flatRows.length}건`;

    const fragment = document.createDocumentFragment();
    for (let ri = 0; ri < this.flatRows.length; ri++) {
      const row = this.flatRows[ri];
      const tr = this.createTableRow(row, ri);
      fragment.appendChild(tr);
    }

    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);
    this.validateAllRanges();
  }

  private createTableRow(row: HeuktoramRow, rowIdx: number): HTMLTableRowElement {
    const tr = document.createElement('tr');
    const result = this.testResults[row.key] ?? {};

    if (row.isSubLot) tr.classList.add('sublot-row');
    if ((row.log as SoilLog & { isComplete?: boolean }).isComplete) tr.classList.add('row-completed');

    const isChecked = this.selectedKeys.has(row.key);

    // 체크박스
    const tdCheck = document.createElement('td');
    tdCheck.className = 'col-checkbox sticky-col';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isChecked;
    cb.addEventListener('change', () => {
      if (cb.checked) {
        this.selectedKeys.add(row.key);
      } else {
        this.selectedKeys.delete(row.key);
      }
      this.updateSelectAllState();
    });
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);

    // 접수번호
    const tdNum = document.createElement('td');
    tdNum.className = 'col-num sticky-col';
    tdNum.textContent = row.displayNumber || row.log.receptionNumber || '';
    tr.appendChild(tdNum);

    // 성명
    const tdName = document.createElement('td');
    tdName.className = 'col-name sticky-col';
    tdName.textContent = row.log.name ?? '';
    tr.appendChild(tdName);

    // 필지주소
    const tdAddr = document.createElement('td');
    tdAddr.className = 'col-address sticky-col';
    if (row.isSubLot && row.subLot) {
      tdAddr.textContent = row.subLot.lotAddress ?? '';
      tdAddr.classList.add('sublot-indent');
    } else if (row.parcel) {
      tdAddr.textContent = row.parcel.lotAddress ?? '';
    }
    tr.appendChild(tdAddr);

    // 작물
    const tdCrop = document.createElement('td');
    tdCrop.className = 'col-crop sticky-col';
    tdCrop.textContent = row.crop?.name ?? '';
    tr.appendChild(tdCrop);

    // 경지구분
    const tdCat = document.createElement('td');
    tdCat.className = 'col-category sticky-col';
    // ?? 는 빈 문자열을 통과시키므로 || 사용 (빈 값일 때 다음 fallback으로 진행)
    tdCat.textContent = row.parcel?.category || row.log.subCategory || '';
    tr.appendChild(tdCat);

    // 용도
    const tdPurpose = document.createElement('td');
    tdPurpose.className = 'col-purpose sticky-col';
    tdPurpose.textContent = row.parcel?.purpose || row.log.purpose || '';
    tr.appendChild(tdPurpose);

    // 면적 (평→㎡ 변환)
    const tdArea = document.createElement('td');
    tdArea.className = 'col-area sticky-col';
    let displayArea: string | number = row.crop?.area ?? '';
    if (displayArea && row.crop?.unit === 'pyeong') {
      const parsed = parseFloat(String(displayArea));
      if (!isNaN(parsed)) displayArea = Math.round(parsed * PYEONG_TO_SQM);
    }
    tdArea.textContent = String(displayArea);
    tr.appendChild(tdArea);

    // 접수일자
    const tdDate = document.createElement('td');
    tdDate.className = 'col-date sticky-col';
    tdDate.textContent = row.log.date ?? '';
    tr.appendChild(tdDate);

    // 경지구분/작물에 따라 필수 입력 필드 결정
    const requiredFields = this.getRequiredFields(
      row.parcel?.category || row.log.subCategory || '',
      row.crop?.name || ''
    );

    // 검정 결과 필드들 (편집 가능)
    for (let ci = 0; ci < this.resultFields.length; ci++) {
      const field = this.resultFields[ci];
      const td = document.createElement('td');
      const isRequired = requiredFields.has(field as string);
      const isHideable = this.hiddenFields.has(field as string);
      const isHidden = isHideable && !this.showAllColumns;

      td.className = [
        'col-result editable-cell',
        isRequired ? 'required-field' : '',
        isHideable ? 'hideable-col' : '',
        isHidden ? 'hidden' : ''
      ].filter(Boolean).join(' ');

      td.setAttribute('data-row', String(rowIdx));
      td.setAttribute('data-col', String(ci));
      td.setAttribute('data-field', field as string);
      td.contentEditable = 'true';
      td.textContent = result[field as string] ?? '';

      td.addEventListener('focus', () => {
        this.focusedCell = { rowIdx, colIdx: ci };
        td.classList.add('focused');
      });
      td.addEventListener('blur', () => {
        td.classList.remove('focused');
        this.handleCellEdit(row.key, field as string, td.textContent?.trim() ?? '');
      });
      td.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          td.blur();
          this.moveFocus(rowIdx + 1, ci, 1);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          td.blur();
          if (e.shiftKey) {
            this.moveFocusResult(rowIdx, ci - 1, -1);
          } else {
            this.moveFocusResult(rowIdx, ci + 1, 1);
          }
        }
      });

      tr.appendChild(td);
    }

    return tr;
  }

  private moveFocus(rowIdx: number, colIdx: number, direction = 1): void {
    if (colIdx >= this.resultFields.length) { colIdx = 0; rowIdx++; }
    if (colIdx < 0) { colIdx = this.resultFields.length - 1; rowIdx--; }
    if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;

    // 숨김 컬럼 건너뛰기 (전체보기 모드가 아닐 때)
    if (!this.showAllColumns && this.hiddenFields.has(this.resultFields[colIdx] as string)) {
      this.moveFocus(rowIdx, colIdx + direction, direction);
      return;
    }

    const cell = this.tableBody?.querySelector(
      `td[data-row="${rowIdx}"][data-col="${colIdx}"]`
    ) as HTMLElement | null;
    if (cell) {
      cell.focus();
      const range = document.createRange();
      range.selectNodeContents(cell);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  /**
   * Tab 키 전용 포커스 이동 (pH~cec 범위, isSubLot 행 건너뜀)
   * START_COL=3(pH), END_COL=13(cec)
   */
  private moveFocusResult(rowIdx: number, colIdx: number, direction = 1): void {
    const START_COL = 3; // pH index
    const END_COL = 13;  // cec index

    if (direction >= 0) {
      if (colIdx > END_COL) {
        colIdx = START_COL;
        rowIdx++;
      }
    } else {
      if (colIdx < START_COL) {
        colIdx = END_COL;
        rowIdx--;
      }
    }

    if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;

    // isSubLot 행 건너뜀 (무한루프 방지를 위한 while 루프)
    let safety = 0;
    while (rowIdx >= 0 && rowIdx < this.flatRows.length && this.flatRows[rowIdx].isSubLot) {
      rowIdx += direction >= 0 ? 1 : -1;
      safety++;
      if (safety > this.flatRows.length) return;
    }
    if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;

    // 숨김 컬럼 건너뜀
    let colSafety = 0;
    while (!this.showAllColumns && this.hiddenFields.has(this.resultFields[colIdx] as string)) {
      colIdx += direction >= 0 ? 1 : -1;
      colSafety++;
      if (colSafety > this.resultFields.length) return;
      if (colIdx > END_COL) colIdx = START_COL;
      if (colIdx < START_COL) colIdx = END_COL;
    }

    const cell = this.tableBody?.querySelector(
      `td[data-row="${rowIdx}"][data-col="${colIdx}"]`
    ) as HTMLElement | null;
    if (cell) {
      cell.focus();
      const range = document.createRange();
      range.selectNodeContents(cell);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  private handleCellEdit(key: string, field: string, value: string): void {
    if (!this.testResults[key]) this.testResults[key] = {};

    let sanitized = value;

    // 최소값 미만/음수 입력 시 min으로 자동 보정
    const range = this.fieldRanges[field];
    if (range && sanitized.trim() !== '') {
      const num = parseFloat(sanitized);
      if (!isNaN(num) && num < range.min) {
        const original = num;
        sanitized = String(range.min);
        const rowIdx = this.flatRows.findIndex(r => r.key === key);
        const colIdx = this.resultFields.indexOf(field as keyof SoilTestResult);
        const cell = this.tableBody?.querySelector(
          `td[data-row="${rowIdx}"][data-col="${colIdx}"]`
        ) as HTMLElement | null;
        if (cell && cell.textContent !== sanitized) {
          cell.textContent = sanitized;
        }
        const unitText = range.unit ? ` ${range.unit}` : '';
        if ((window as any).showToast) {
          (window as any).showToast(
            `ℹ️ ${range.label}: ${original}${unitText} → 최소값 ${range.min}${unitText}으로 보정됨`,
            'info'
          );
        }
      }
    }

    this.testResults[key][field] = sanitized;
    this.syncToSiblings(key, field, sanitized);
    this.saveTestResults();
    this.validateFieldRange(key, field, sanitized);
  }

  private validateFieldRange(key: string, field: string, value: string): void {
    const range = this.fieldRanges[field];
    if (!range) return;

    const rowIdx = this.flatRows.findIndex(r => r.key === key);
    const colIdx = this.resultFields.indexOf(field as keyof SoilTestResult);
    const cell = this.tableBody?.querySelector(
      `td[data-row="${rowIdx}"][data-col="${colIdx}"]`
    ) as HTMLElement | null;

    if (!value || value.trim() === '') {
      cell?.classList.remove('out-of-range');
      return;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      cell?.classList.remove('out-of-range');
      return;
    }

    const unitText = range.unit ? ` ${range.unit}` : '';
    if (num < range.min || num > range.max) {
      cell?.classList.add('out-of-range');
      if (window.showToast) {
        window.showToast(
          `⚠️ ${range.label}: ${num}${unitText} → 입력 범위 ${range.min} ~ ${range.max}${unitText}`,
          'warning'
        );
      }
    } else {
      cell?.classList.remove('out-of-range');
    }
  }

  private validateAllRanges(): void {
    for (const [key, result] of Object.entries(this.testResults)) {
      for (const field of Object.keys(this.fieldRanges)) {
        const val = result[field as keyof SoilTestResult];
        if (val) this.validateFieldRange(key, field, String(val));
      }
    }
  }

  /**
   * 같은 접수번호의 모든 행(본필지 + 하위필지)에 검정 결과 동기화
   * 같은 log.id이거나, base 접수번호(468-1 → 468)가 같은 log도 sibling으로 처리
   */
  private syncToSiblings(key: string, field: string, value: string): void {
    const editedRow = this.flatRows.find(r => r.key === key);
    if (!editedRow) return;

    const editedBase = String(editedRow.log.receptionNumber ?? '').replace(/-\d+$/, '');
    const siblingRows = this.flatRows.filter(r => {
      if (r.key === key) return false;
      if (r.log.id === editedRow.log.id) return true;
      const rBase = String(r.log.receptionNumber ?? '').replace(/-\d+$/, '');
      return !!editedBase && rBase === editedBase;
    });
    for (const sibling of siblingRows) {
      if (!this.testResults[sibling.key]) this.testResults[sibling.key] = {};
      this.testResults[sibling.key][field] = value;
    }
    this.updateSiblingCells(siblingRows, field, value);
  }

  private updateSiblingCells(siblingRows: HeuktoramRow[], field: string, value: string): void {
    const siblingKeys = new Set(siblingRows.map(r => r.key));
    for (let i = 0; i < this.flatRows.length; i++) {
      if (siblingKeys.has(this.flatRows[i].key)) {
        const rows = this.tableBody?.querySelectorAll('tr');
        const row = rows?.[i];
        if (row) {
          const cell = row.querySelector(`[data-field="${field}"]`) as HTMLElement | null;
          if (cell && cell !== document.activeElement) {
            cell.textContent = value;
          }
        }
      }
    }
  }

  // ========================================
  // 붙여넣기 처리
  // ========================================

  private handlePaste(event: ClipboardEvent): void {
    if (!this.focusedCell) return;

    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl?.classList.contains('editable-cell')) return;

    event.preventDefault();

    const clipData = event.clipboardData ?? (window as Window & { clipboardData?: DataTransfer }).clipboardData;
    const text = clipData?.getData('text/plain');
    if (!text) return;

    const rows = text.split(/\r?\n/).filter(r => r.length > 0);
    const startRow = this.focusedCell.rowIdx;
    const startCol = this.focusedCell.colIdx;
    let pastedCount = 0;

    for (let ri = 0; ri < rows.length; ri++) {
      const targetRow = startRow + ri;
      if (targetRow >= this.flatRows.length) break;

      const cols = rows[ri].split('\t');
      for (let ci = 0; ci < cols.length; ci++) {
        const targetCol = startCol + ci;
        if (targetCol >= this.resultFields.length) break;

        const field = this.resultFields[targetCol] as string;
        const value = cols[ci].trim().slice(0, 200);
        const rowKey = this.flatRows[targetRow].key;

        if (!this.testResults[rowKey]) this.testResults[rowKey] = {};
        this.testResults[rowKey][field] = value;
        this.syncToSiblings(rowKey, field, value);

        const cell = this.tableBody?.querySelector(
          `td[data-row="${targetRow}"][data-col="${targetCol}"]`
        ) as HTMLElement | null;
        if (cell) {
          cell.textContent = value;
          cell.classList.add('paste-highlight');
          setTimeout(() => cell.classList.remove('paste-highlight'), 1500);
        }
        pastedCount++;
      }
    }

    this.saveTestResults();
    if (window.showToast && pastedCount > 0) {
      window.showToast(`${pastedCount}개 셀에 데이터를 붙여넣었습니다.`, 'success');
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl?.classList.contains('editable-cell')) return;
    if (!this.focusedCell) return;

    const { rowIdx, colIdx } = this.focusedCell;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeEl.blur();
      this.moveFocus(rowIdx + 1, colIdx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeEl.blur();
      this.moveFocus(rowIdx - 1, colIdx);
    }
  }

  // ========================================
  // 전체 선택 / 일괄 적용
  // ========================================

  private toggleSelectAll(checked: boolean): void {
    this.selectedKeys.clear();
    if (checked) {
      for (const row of this.flatRows) this.selectedKeys.add(row.key);
    }
    const checkboxes = this.tableBody?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes?.forEach(cb => { cb.checked = checked; });
    this.updateSelectAllState();
  }

  private updateSelectAllState(): void {
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.checked =
        this.flatRows.length > 0 && this.selectedKeys.size === this.flatRows.length;
      this.selectAllCheckbox.indeterminate =
        this.selectedKeys.size > 0 && this.selectedKeys.size < this.flatRows.length;
    }
  }

  /**
   * 일괄 완료 처리
   * 선택 있음: 선택된 flatRow의 log.id → isComplete=true
   * 선택 없음: 전체 처리 (confirm 후)
   */
  private bulkComplete(): void {
    const selectedFlatRows = this.flatRows.filter(r => this.selectedKeys.has(r.key));
    const year = this.selectedYear;
    const storageKey = `${STORAGE_PREFIX}soilSampleLogs_${year}`;

    let logIds: Set<string>;
    if (selectedFlatRows.length === 0) {
      if (!confirm(`전체 ${this.flatRows.length}건을 완료 처리하시겠습니까?`)) return;
      logIds = new Set(this.flatRows.map(r => r.log.id));
    } else {
      logIds = new Set(selectedFlatRows.map(r => r.log.id));
    }

    try {
      const data = localStorage.getItem(storageKey);
      const logs: SoilLog[] = data ? (JSON.parse(data) as SoilLog[]) : [];
      for (const log of logs) {
        if (logIds.has(log.id)) {
          (log as SoilLog & { isComplete: boolean }).isComplete = true;
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(logs));
      this.sampleLogs = this.sampleLogs.map(log =>
        logIds.has(log.id) ? { ...log, isComplete: true } as SoilLog : log
      );
    } catch (e) {
      (window.logger?.error ?? console.error)('일괄 완료 처리 실패:', e);
      return;
    }

    this.render();
    window.showToast?.(`${logIds.size}건이 완료 처리되었습니다.`, 'success');
  }

  private applyBulkValues(): void {
    if (this.selectedKeys.size === 0) {
      window.showToast?.('선택된 항목이 없습니다.', 'warning');
      return;
    }

    const testDate = this.bulkTestDateInput?.value ?? '';
    const usageCode = this.bulkUsageCodeSelect?.value ?? '0';
    let applied = 0;

    for (const key of this.selectedKeys) {
      if (!this.testResults[key]) this.testResults[key] = {};
      if (testDate) this.testResults[key].testDate = testDate;
      this.testResults[key].usageCode = usageCode;
      applied++;
    }

    this.saveTestResults();
    this.render();
    window.showToast?.(`${applied}건에 일괄 적용했습니다.`, 'success');
  }

  // ========================================
  // 컬럼 표시/숨김
  // ========================================

  private toggleHiddenColumns(): void {
    this.showAllColumns = !this.showAllColumns;
    this.applyColumnVisibility();

    const btn = this.toggleColumnsBtn;
    if (btn) {
      const icon = btn.querySelector('.material-icons-outlined');
      const label = btn.querySelector('.util-btn-label');
      if (icon) icon.textContent = this.showAllColumns ? 'visibility_off' : 'visibility';
      if (label) label.textContent = this.showAllColumns ? '간략보기' : '전체보기';
    }
  }

  private applyColumnVisibility(): void {
    const allHideable = document.querySelectorAll('.hideable-col');
    allHideable.forEach(el => {
      if (this.showAllColumns) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  // ========================================
  // 주소 파싱
  // ========================================

  /**
   * 필지 주소를 시도/시군구/읍면동/리/지번으로 파싱
   */
  private parseLotAddress(lotAddress: string): ParsedLotAddress {
    const result: ParsedLotAddress = {
      sido: '', sigungu: '', eupmyeondong: '', ri: '',
      isMountain: false, jibun1: '', jibun2: ''
    };

    if (!lotAddress || lotAddress === '-') return result;

    const parts = lotAddress.trim().split(/\s+/);
    let idx = 0;

    const sidoList = [
      '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시',
      '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
      '강원도', '충청북도', '충청남도', '전라북도', '전북특별자치도',
      '전라남도', '경상북도', '경상남도', '제주특별자치도'
    ];

    const sigunguToSido: Record<string, string> = { ...SIGUNGU_TO_SIDO };
    if (window.REGION_NAMES) {
      Object.values(window.REGION_NAMES).forEach(sg => { sigunguToSido[sg] = '경상북도'; });
    }

    if (idx < parts.length && sidoList.includes(parts[idx])) {
      result.sido = parts[idx++];
    }

    if (idx < parts.length && /(시|군|구)$/.test(parts[idx])) {
      result.sigungu = parts[idx];
      if (!result.sido) result.sido = sigunguToSido[parts[idx]] ?? '';
      idx++;
      if (idx < parts.length && /구$/.test(parts[idx])) {
        result.sigungu += ' ' + parts[idx++];
      }
    }

    if (idx < parts.length && /(읍|면|동)$/.test(parts[idx])) {
      result.eupmyeondong = parts[idx++];
    }

    if (idx < parts.length && /리$/.test(parts[idx])) {
      const riPart = parts[idx++];
      const dashIdx = riPart.indexOf('-');
      result.ri = dashIdx >= 0 ? riPart.slice(dashIdx + 1) : riPart;
    }

    if (idx < parts.length && parts[idx] === '산') {
      result.isMountain = true;
      idx++;
    }

    if (idx < parts.length) {
      const jibunStr = parts[idx];
      const jibunParts = jibunStr.split('-');
      result.jibun1 = jibunParts[0] ?? '';
      result.jibun2 = jibunParts[1] ?? '';
    }

    return result;
  }

  /**
   * 경작자 주소 파싱 (도로명주소 또는 지번주소)
   * @param address - 도로명/지번 주소
   * @param addressDetail - 상세주소 (동/층/호 + 법정동/공동주택명)
   */
  private parsePersonAddress(address: string, addressDetail?: string): ParsedPersonAddress {
    const result: ParsedPersonAddress = {
      sido: '', sigungu: '', eupmyeondong: '',
      roadName: '', mainNum: '', subNum: '',
      dongFloorHo: '', note: ''
    };

    if (!address || address === '-') return result;

    if (typeof window.parseAddressParts === 'function') {
      const parsed = window.parseAddressParts(address);
      result.sido = parsed.sido ?? '';
      result.sigungu = parsed.sigungu ?? '';
      result.eupmyeondong = parsed.eupmyeondong ?? '';

      const rest = parsed.rest ?? '';
      const roadMatch = rest.match(/^(.+?)\s+(\d+)(?:-(\d+))?/);
      if (roadMatch) {
        result.roadName = roadMatch[1];
        result.mainNum = roadMatch[2];
        result.subNum = roadMatch[3] ?? '';
      }
    }

    // addressDetail에서 동/층/호와 (법정동, 공동주택명) 파싱
    // 괄호가 앞에 오는 경우: "(비전동, 비전현대아파트) 302동 1405호"
    // 괄호가 뒤에 오는 경우: "301동 201호 (내성리, 봉화아파트)"
    if (addressDetail) {
      const detail = addressDetail.trim();
      const bracketMatch = detail.match(/(\([^)]+\))/);
      if (bracketMatch) {
        result.note = bracketMatch[1];
        const rest = detail.replace(bracketMatch[1], '').trim();
        if (rest) result.dongFloorHo = rest;
      } else {
        result.dongFloorHo = detail;
      }
    }

    return result;
  }

  // ========================================
  // 용도구분/경지구분 변환
  // ========================================

  private getUsageCode(purpose: string, resultUsageCode?: string, bulkValue?: string): string {
    if (resultUsageCode !== undefined && resultUsageCode !== '') return resultUsageCode;
    if (bulkValue !== undefined && bulkValue !== '') return bulkValue;
    return '0';
  }

  private getCategoryCode(subCategory: string): string {
    const map: Record<string, string> = {
      '논': '논', '밭': '밭', '과수': '과수',
      '시설': '시설', '임야': '임야', '성토': '밭'
    };
    return map[subCategory] ?? '밭';
  }

  private getRequiredFields(category: string, cropName: string): Set<string> {
    const common = ['pH', 'organicMatter', 'availableP', 'exK', 'exCa', 'exMg', 'ec'];
    if (cropName?.includes('블루베리')) return new Set([...common, 'cec']);
    if (category === '논') return new Set([...common, 'silica']);
    return new Set([...common, 'limeReq']);
  }

  private getBeforeAfter(usageCode: string): string {
    if (usageCode === '0' || usageCode === '') return '';
    // bulkBeforeAfterSelect 값('N'/'Y')을 BC3/BD3 범례 표기('전-N'/'후-Y')와 일치
    const v = this.bulkBeforeAfterSelect?.value ?? 'N';
    return v === 'Y' ? '후-Y' : '전-N';
  }

  // ========================================
  // 흙토람 서식 내보내기
  // ========================================

  private async exportToHeuktoram(): Promise<void> {
    let targetRows = this.flatRows;
    if (this.selectedKeys.size > 0) {
      targetRows = this.flatRows.filter(r => this.selectedKeys.has(r.key));
    }

    if (targetRows.length === 0) {
      window.showToast?.('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    if (targetRows.length > 300) {
      if (!confirm(`${targetRows.length}건을 내보냅니다. 흙토람은 300건 이하를 권장합니다. 계속하시겠습니까?`)) {
        return;
      }
    }

    try {
      const XLSX = window.XLSX;
      if (!XLSX) throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');

      const wb = XLSX.utils.book_new();
      const wsData = this.buildWorksheetData(targetRows);
      // SAMPL-1-117: 엑셀 수식 인젝션 방어
      const sanitizeAoa = window.sanitizeExcelAoa ?? ((a: unknown[][]): unknown[][] => a);
      const ws = XLSX.utils.aoa_to_sheet(sanitizeAoa(wsData));

      ws['!cols'] = this.getColumnWidths();
      this.applyHeaderStyles(ws, wsData);
      this.applyHeaderMerges(ws);

      // 1행(제목)·2행(안내문) 행 높이 + 셀 스타일 (서식.xlsx 원본 기준)
      const wsRec = ws as Record<string, unknown>;
      const rowsArr = (wsRec['!rows'] as Array<{ hpt?: number }> | undefined) ?? [];
      rowsArr[0] = { hpt: 30 };
      rowsArr[1] = { hpt: 369.5 };
      wsRec['!rows'] = rowsArr;

      const cellA1 = (wsRec as Record<string, { v?: unknown; s?: unknown }>)['A1'];
      if (cellA1) {
        cellA1.s = {
          alignment: { horizontal: 'left' },
          font: { bold: true, sz: 20, name: '맑은 고딕' }
        };
      }
      const cellA2 = (wsRec as Record<string, { v?: unknown; s?: unknown }>)['A2'];
      if (cellA2) {
        cellA2.s = {
          alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
          font: { sz: 11, name: '맑은 고딕' }
        };
      }

      XLSX.utils.book_append_sheet(wb, ws, '일괄등록양식');

      // xlsx-js-style은 dataValidation 출력 미지원이므로 JSZip 후처리
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const validations = this.buildDataValidations(targetRows.length);
      const patchedBuffer = await this.injectDataValidations(arrayBuffer, validations);

      const fileName = `흙토람_토양검정_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      this.downloadBuffer(patchedBuffer, fileName);

      window.showToast?.(`${targetRows.length}건 흙토람 서식으로 내보냈습니다.`, 'success');
    } catch (e) {
      (window.logger?.error ?? console.error)('흙토람 내보내기 실패:', e);
      window.showToast?.('내보내기에 실패했습니다.', 'error');
    }
  }

  /** 데이터 유효성 검사 규칙 빌드 (G·H·AH 컬럼 드롭다운) */
  private buildDataValidations(dataRowCount: number): Array<{ sqref: string; options: string[] }> {
    if (dataRowCount <= 0) return [];
    const startRow = 5;
    const endRow = 4 + dataRowCount;
    return [
      {
        sqref: `G${startRow}:G${endRow}`,
        options: ['일반적인토양검정-0', '토양개량제 규산-1', '토양개량제 석회질-2', '녹비작물-3']
      },
      {
        sqref: `H${startRow}:H${endRow}`,
        options: ['전-N', '후-Y']
      },
      {
        sqref: `AH${startRow}:AH${endRow}`,
        options: ['미해당', '해당']
      }
    ];
  }

  /** JSZip으로 sheet1.xml에 <dataValidations> XML 삽입 (SheetJS Community 미지원 우회) */
  private async injectDataValidations(arrayBuffer: ArrayBuffer, validations: Array<{ sqref: string; options: string[] }>): Promise<ArrayBuffer> {
    if (!validations || validations.length === 0) return arrayBuffer;
    const JSZipCtor = (window as Window & { JSZip?: unknown }).JSZip as (new () => unknown) & { loadAsync?: (data: ArrayBuffer) => Promise<unknown> } | undefined;
    if (!JSZipCtor || typeof JSZipCtor.loadAsync !== 'function') {
      (window.logger?.warn ?? console.warn)('JSZip 미사용. 드롭다운 적용 생략.');
      return arrayBuffer;
    }

    const zip = await JSZipCtor.loadAsync(arrayBuffer) as {
      file: (path: string, data?: string) => { async: (type: string) => Promise<string> } | null;
      generateAsync: (opts: { type: string }) => Promise<ArrayBuffer>;
    };
    const sheetXmlPath = 'xl/worksheets/sheet1.xml';
    const sheetFile = zip.file(sheetXmlPath);
    if (!sheetFile) return arrayBuffer;

    let xml = await sheetFile.async('string');
    const dvXml = this.buildDataValidationsXml(validations);

    if (xml.indexOf('</mergeCells>') !== -1) {
      xml = xml.replace('</mergeCells>', '</mergeCells>' + dvXml);
    } else if (xml.indexOf('</sheetData>') !== -1) {
      xml = xml.replace('</sheetData>', '</sheetData>' + dvXml);
    }

    zip.file(sheetXmlPath, xml);
    return await zip.generateAsync({ type: 'arraybuffer' });
  }

  /** dataValidations XML 빌드 */
  private buildDataValidationsXml(validations: Array<{ sqref: string; options: string[] }>): string {
    const parts = validations.map(v => {
      const list = v.options.join(',');
      return (
        '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"'
        + ` sqref="${v.sqref}">`
        + `<formula1>&quot;${list}&quot;</formula1>`
        + '</dataValidation>'
      );
    });
    return `<dataValidations count="${validations.length}">${parts.join('')}</dataValidations>`;
  }

  /** ArrayBuffer → Blob 다운로드 */
  private downloadBuffer(arrayBuffer: ArrayBuffer, fileName: string): void {
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** 56컬럼 데이터 배열 생성 (서식.xlsx 원본 일치: 48 데이터 + 빈 AW/AX + 코드 범례 AY~BD) */
  private buildWorksheetData(rows: HeuktoramRow[]): (string | number)[][] {
    const data: (string | number)[][] = [];
    const COL_HEADER = 56;
    const COL_DATA = 50;
    const collectYear = this.collectYearInput?.value ?? this.selectedYear;
    const collector = this.collectorInput?.value ?? '';

    // 1행: 제목 (A1:AV1 병합)
    const row1 = new Array(COL_HEADER).fill('') as string[];
    row1[0] = '토양검정 일괄입력 양식';
    data.push(row1);

    // 2행: 안내문 (A2:AV2 병합) — 서식.xlsx 원본과 동일
    const row2 = new Array(COL_HEADER).fill('') as string[];
    row2[0] = '아래 형식과 같이 입력되어야만 일괄입력을 할 수 있습니다. \n'
      + '  - 필지구분은 "필지" 또는 "하위필지" 로 입력 (1,2,3,4 = 필지) (1-1, 2-1, 2-2 = 하위필지)\n'
      + '  - 하위필지는 반드시 대표필지 아래에 연속으로 입력하고 채취년도,경지구분,시료번호,검정대상지 시도 및 시군구 주소를 대표필지와 일치\n'
      + '  - 채취년도는 숫자(4자리)를 입력\n'
      + '  - 경지구분은 1차와 2차를 나눠 입력\n'
      + "  - 분석의뢰일(접수일자)는 숫자(4)-숫자(2)-숫자(2)로 정의하며 '-'로 구분하며, 필수 입력\n"
      + '  - 검정 대상지는 시도, 시군구, 읍면동, 리를 나눠 입력\n'
      + '  - 지번구분은 일반은 빈공백으로 산은 산이라고 명시하며 검정대상지번은 지번1과 지번2로 나눠 입력(지번2가 없을 경우 비워놓음)\n'
      + '  - 주소매핑여부는 자동으로 체크 됩니다. 작성하지 마세요.\n'
      + '  - 면적의 단위는 ㎡로, 숫자 형태로 입력\n'
      + "  - 토양검정일은 숫자(4)-숫자(2)-숫자(2)로 정의하며 '-'로 구분\n"
      + '  - 작물을 입력할 시에는 작물명 또는 숫자 5자리로 이루어진 작물코드 입력\n'
      + '  - 용도구분은 코드를 [일반적인토양검정-0] 선택 시에는 시행(재배) 전후를 선택 하지 마세요.(추가 내용)\n'
      + '  - 성토여부는 미해당, 해당으로 입력\n'
      + '  - 경작자 주소(추가내용)는 선택사항이므로 생략하셔도 입력에는 문제가 없습니다.\n'
      + "  - 신청인 전화번호는 '-' 없이 입력하세요(예:01023456789)\n"
      + '  - 경영체등록번호/농업인번호를 조회하기 위해서는 개인(경작자명, 생년월일 모두 입력) / 법인(법인번호) 중 한 항목만 입력하세요. (해당 필드 필수입력 항목 아님)\n'
      + '  - 생년월일은 숫자(8자리), 법인번호는 숫자(13자리)를 입력\n'
      + '  - 생년월일, 법인번호 항목은 경영체등록번호/농업인번호 조회 목적으로만 사용함 (흙토람에 등록되지 않는 정보)\n\n'
      + '원활한 일괄입력을 위하여 1회당 300건 이하의 자료 입력을 권장드립니다.';
    data.push(row2);

    // 3행: 대분류 헤더 + AY~BD 코드 범례
    const row3 = new Array(COL_HEADER).fill('') as string[];
    row3[0]  = '필지구분';
    row3[1]  = ' 채취년도';
    row3[2]  = '시료채취자';
    row3[3]  = '분석의뢰일(접수일자)';
    row3[4]  = ' 경지구분';   // E3:F3 가로 병합
    row3[6]  = '용도구분';    // G3:H3 가로 병합
    row3[8]  = '시료번호';
    row3[9]  = '대상지 주소'; // J3:M3 가로 병합
    row3[13] = '지번 구분';
    row3[14] = '지번';        // O3:P3 가로 병합
    row3[16] = '주소매핑여부';
    row3[17] = '기타주소';
    row3[18] = '면적(㎡)';
    row3[19] = '토양검정일';
    row3[20] = '경작자';
    row3[21] = '경작자 주소(이전주소기준)'; // V3:AC3 가로 병합
    row3[29] = '개인 (Agrix 조회용)';       // AD3:AE3 가로 병합
    row3[31] = '법인 (Agrix 조회용)';
    row3[32] = ' 작물명 또는\n작물코드';
    row3[33] = '성토여부';
    row3[34] = '점토함량';
    row3[35] = ' pH';
    row3[36] = ' 유기물';
    row3[37] = '유효인산';
    row3[38] = '교환성 칼륨';
    row3[39] = '교환성 칼슘';
    row3[40] = '교환성\n마그네슘';
    row3[41] = '유효규산';
    row3[42] = '전기전도도';
    row3[43] = '석회소요량';
    row3[44] = '질산태질소';
    row3[45] = '양이온\n치환용량';
    row3[46] = '암모니아태\n질소';
    row3[47] = '신청인 전화번호';
    row3[48] = '개인정보\n수집·이용 동의';
    row3[49] = '개인정보\n제3자 제공동의';
    // 코드 범례 AY=50 ~ BD=55
    row3[50] = '일반적인토양검정-0';
    row3[51] = '토양개량제 규산-1';
    row3[52] = '토양개량제 석회질-2';
    row3[53] = '녹비작물-3';
    row3[54] = '전-N';
    row3[55] = '후-Y';
    data.push(row3);

    // 4행: 소분류 헤더
    const row4 = new Array(COL_HEADER).fill('') as string[];
    row4[4]  = '1차';
    row4[5]  = '2차';
    row4[6]  = '코드';
    row4[7]  = '시행(재배)전후';
    row4[9]  = '시도';
    row4[10] = '시군구';
    row4[11] = '읍면동';
    row4[12] = '리';
    row4[14] = '지번1';
    row4[15] = '지번2';
    row4[21] = '시도';
    row4[22] = '시군구';
    row4[23] = '읍면동';
    row4[24] = '도로명';
    row4[25] = '본번';
    row4[26] = '부번';
    row4[27] = '동/층/호';
    row4[28] = '(법정동, 공동주택명)';
    row4[29] = '경작자명';
    row4[30] = '생년월일';
    row4[31] = '법인번호';
    data.push(row4);

    // 5행부터 데이터 (48컬럼)
    for (const row of rows) {
      const result = this.testResults[row.key] ?? {};
      const lotAddr = row.isSubLot && row.subLot
        ? (row.subLot.lotAddress ?? row.parcel?.lotAddress ?? '')
        : (row.parcel?.lotAddress ?? '');

      let isMountain = false;
      if (row.isSubLot && row.subLot) {
        isMountain = row.subLot.isMountain ?? false;
      } else if (row.parcel) {
        isMountain = row.parcel.isMountain ?? false;
      }

      const lotParsed = this.parseLotAddress(lotAddr);
      if (isMountain) lotParsed.isMountain = true;

      const personAddr = this.parsePersonAddress(row.log.address ?? '', row.log.addressDetail);
      const category = row.parcel?.category || row.log.subCategory || '';
      const purpose = row.parcel?.purpose || row.log.purpose || '';
      const usageCode = this.getUsageCode(purpose, result.usageCode, this.bulkUsageCodeSelect?.value);
      const soiling = (result.soiling === '해당' || category === '성토') ? '해당' : '미해당';

      const usageLabels: Record<string, string> = {
        '0': '일반적인토양검정-0', '1': '토양개량제 규산-1',
        '2': '토양개량제 석회질-2', '3': '녹비작물-3'
      };

      let areaM2: string | number = row.crop?.area ?? '';
      if (areaM2 && row.crop?.unit === 'pyeong') {
        const parsed = parseFloat(String(areaM2));
        if (!isNaN(parsed)) areaM2 = Math.round(parsed * PYEONG_TO_SQM);
      }

      const dataRow = new Array(50).fill('') as (string | number)[];
      dataRow[0]  = row.isSubLot ? '하위필지' : '필지';
      dataRow[1]  = collectYear;
      dataRow[2]  = collector || row.log.name || '';
      dataRow[3]  = row.log.date ?? '';
      dataRow[4]  = '농가의뢰';
      dataRow[5]  = this.getCategoryCode(category);
      dataRow[6]  = usageLabels[usageCode] ?? '일반적인토양검정-0';
      dataRow[7]  = this.getBeforeAfter(usageCode);
      // 하위필지(-1, -2 등)도 본 접수번호로 정규화
      dataRow[8]  = row.baseReceptionNumber ?? String(row.log.receptionNumber ?? '').replace(/-\d+$/, '') ?? '';
      dataRow[9]  = lotParsed.sido;
      dataRow[10] = lotParsed.sigungu;
      dataRow[11] = lotParsed.eupmyeondong;
      dataRow[12] = lotParsed.ri;
      dataRow[13] = lotParsed.isMountain ? '산' : '';
      dataRow[14] = lotParsed.jibun1;
      dataRow[15] = lotParsed.jibun2;
      dataRow[16] = ''; // 주소매핑여부 (빈값)
      dataRow[17] = (row.parcel as { note?: string } | undefined)?.note ?? ''; // 기타주소
      dataRow[18] = areaM2;
      dataRow[19] = result.testDate ?? '';
      dataRow[20] = row.log.name ?? '';
      dataRow[21] = personAddr.sido;
      dataRow[22] = personAddr.sigungu;
      dataRow[23] = personAddr.eupmyeondong;
      dataRow[24] = personAddr.roadName;
      dataRow[25] = personAddr.mainNum;
      dataRow[26] = personAddr.subNum;
      dataRow[27] = personAddr.dongFloorHo;
      dataRow[28] = personAddr.note;
      dataRow[29] = ''; // Agrix 경작자명 (빈값)
      dataRow[30] = ''; // 생년월일 (빈값)
      dataRow[31] = ''; // 법인번호 (빈값)
      dataRow[32] = row.crop?.name ?? row.crop?.code ?? '';
      dataRow[33] = soiling;
      dataRow[34] = result.clay ?? '';
      dataRow[35] = result.pH ?? '';
      dataRow[36] = result.organicMatter ?? '';
      dataRow[37] = result.availableP ?? '';
      dataRow[38] = result.exK ?? '';
      dataRow[39] = result.exCa ?? '';
      dataRow[40] = result.exMg ?? '';
      dataRow[41] = result.silica ?? '';
      dataRow[42] = result.ec ?? '';
      dataRow[43] = result.limeReq ?? '';
      dataRow[44] = result.NO3N ?? '';
      dataRow[45] = result.cec ?? '';
      dataRow[46] = result.NH4N ?? '';
      dataRow[47] = (row.log.phoneNumber ?? '').replace(/-/g, '');
      dataRow[48] = 'Y'; // 개인정보 수집·이용 동의
      dataRow[49] = 'Y'; // 개인정보 제3자 제공동의

      data.push(dataRow);
    }

    return data;
  }

  /** 56컬럼 너비 설정 (48 데이터 + 빈 AW/AX + 코드 범례 AY~BD) */
  private getColumnWidths(): { wch: number }[] {
    return [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
      { wch: 10 }, { wch: 8  }, { wch: 20 }, { wch: 16 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 8  }, { wch: 10 }, { wch: 8  }, { wch: 8  },
      { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 6  }, { wch: 6  }, { wch: 10 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 6  },
      { wch: 8  }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 16 },
      // 코드 범례 영역
      { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
      { wch: 8  }, { wch: 8  },
    ];
  }

  /** 셀 병합 설정 (서식.xlsx 원본 기준) */
  private applyHeaderMerges(ws: Record<string, unknown>): void {
    const merges = [
      // 1~2행 — A1:AV1, A2:AV2 (서식.xlsx 원본)
      { s: { r: 0, c: 0 }, e: { r: 0, c: 47 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 47 } },
      // 3~4행 세로 병합 (단독 컬럼)
      { s: { r: 2, c: 0  }, e: { r: 3, c: 0  } }, // A: 필지구분
      { s: { r: 2, c: 1  }, e: { r: 3, c: 1  } }, // B: 채취년도
      { s: { r: 2, c: 2  }, e: { r: 3, c: 2  } }, // C: 시료채취자
      { s: { r: 2, c: 3  }, e: { r: 3, c: 3  } }, // D: 분석의뢰일
      { s: { r: 2, c: 8  }, e: { r: 3, c: 8  } }, // I: 시료번호
      { s: { r: 2, c: 13 }, e: { r: 3, c: 13 } }, // N: 지번구분
      { s: { r: 2, c: 16 }, e: { r: 3, c: 16 } }, // Q: 주소매핑여부
      { s: { r: 2, c: 17 }, e: { r: 3, c: 17 } }, // R: 기타주소
      { s: { r: 2, c: 18 }, e: { r: 3, c: 18 } }, // S: 면적
      { s: { r: 2, c: 19 }, e: { r: 3, c: 19 } }, // T: 토양검정일
      { s: { r: 2, c: 20 }, e: { r: 3, c: 20 } }, // U: 경작자
      // AF3:AF4 세로 병합 없음 — AF3='법인 (Agrix 조회용)', AF4='법인번호' 별도 셀
      { s: { r: 2, c: 32 }, e: { r: 3, c: 32 } }, // AG: 작물명
      { s: { r: 2, c: 33 }, e: { r: 3, c: 33 } }, // AH: 성토여부
      { s: { r: 2, c: 34 }, e: { r: 3, c: 34 } }, // AI: 점토함량
      { s: { r: 2, c: 35 }, e: { r: 3, c: 35 } }, // AJ: pH
      { s: { r: 2, c: 36 }, e: { r: 3, c: 36 } }, // AK: 유기물
      { s: { r: 2, c: 37 }, e: { r: 3, c: 37 } }, // AL: 유효인산
      { s: { r: 2, c: 38 }, e: { r: 3, c: 38 } }, // AM: 교환성K
      { s: { r: 2, c: 39 }, e: { r: 3, c: 39 } }, // AN: 교환성Ca
      { s: { r: 2, c: 40 }, e: { r: 3, c: 40 } }, // AO: 교환성Mg
      { s: { r: 2, c: 41 }, e: { r: 3, c: 41 } }, // AP: 유효규산
      { s: { r: 2, c: 42 }, e: { r: 3, c: 42 } }, // AQ: EC
      { s: { r: 2, c: 43 }, e: { r: 3, c: 43 } }, // AR: 석회소요량
      { s: { r: 2, c: 44 }, e: { r: 3, c: 44 } }, // AS: NO3-N
      { s: { r: 2, c: 45 }, e: { r: 3, c: 45 } }, // AT: CEC
      { s: { r: 2, c: 46 }, e: { r: 3, c: 46 } }, // AU: NH4-N
      { s: { r: 2, c: 47 }, e: { r: 3, c: 47 } }, // AV: 전화번호
      { s: { r: 2, c: 48 }, e: { r: 3, c: 48 } }, // AW: 개인정보 수집·이용 동의
      { s: { r: 2, c: 49 }, e: { r: 3, c: 49 } }, // AX: 개인정보 제3자 제공동의
      // 3행 가로 병합 (그룹 헤더)
      { s: { r: 2, c: 4  }, e: { r: 2, c: 5  } }, // E3:F3 경지구분
      { s: { r: 2, c: 6  }, e: { r: 2, c: 7  } }, // G3:H3 용도구분
      { s: { r: 2, c: 9  }, e: { r: 2, c: 12 } }, // J3:M3 대상지 주소
      { s: { r: 2, c: 14 }, e: { r: 2, c: 15 } }, // O3:P3 지번
      { s: { r: 2, c: 21 }, e: { r: 2, c: 28 } }, // V3:AC3 경작자 주소
      { s: { r: 2, c: 29 }, e: { r: 2, c: 30 } }, // AD3:AE3 개인 Agrix
    ];

    ws['!merges'] = merges;
  }

  /** 헤더 스타일 (3·4행 회색 #C0C0C0, 코드 범례 영역은 일반 셀) + 데이터 행 정렬·테두리 */
  private applyHeaderStyles(ws: Record<string, unknown>, wsData: (string | number)[][]): void {
    const COL_HEADER = 56;
    const DATA_COL_END = 50; // 0~49만 데이터/헤더 영역, 50~55는 코드 범례
    const THIN_BORDER = {
      top:    { style: 'thin', color: { rgb: 'FF808080' } },
      bottom: { style: 'thin', color: { rgb: 'FF808080' } },
      left:   { style: 'thin', color: { rgb: 'FF808080' } },
      right:  { style: 'thin', color: { rgb: 'FF808080' } },
    };
    const CENTER_ALIGN = { horizontal: 'center', vertical: 'center', wrapText: true };

    const toCell = (r: number, c: number): string => {
      const col = c < 26
        ? String.fromCharCode(65 + c)
        : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
      return `${col}${r + 1}`;
    };

    const wsCells = ws as Record<string, { v?: unknown; t?: string; s?: unknown }>;

    for (let r = 0; r < wsData.length; r++) {
      for (let c = 0; c < COL_HEADER; c++) {
        const addr = toCell(r, c);
        const cell = wsCells[addr];

        if (r === 2) {
          // 3행: 대분류 헤더 (회색)
          if (c < DATA_COL_END) {
            if (!cell) wsCells[addr] = { v: '', t: 's' };
            wsCells[addr].s = {
              fill: { patternType: 'solid', fgColor: { rgb: 'FFC0C0C0' } },
              font: { bold: true, sz: 10 },
              alignment: CENTER_ALIGN,
              border: THIN_BORDER,
            };
          } else if (cell && cell.v !== '' && cell.v !== undefined) {
            // 코드 범례 영역(AY~BD): 배경/굵기/테두리 없음
            cell.s = {
              font: { sz: 11, name: '맑은 고딕' },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          }
        } else if (r === 3) {
          // 4행: 소분류 헤더 (회색) — 데이터 영역만
          if (c < DATA_COL_END) {
            if (!cell) wsCells[addr] = { v: '', t: 's' };
            wsCells[addr].s = {
              fill: { patternType: 'solid', fgColor: { rgb: 'FFC0C0C0' } },
              font: { bold: true, sz: 9 },
              alignment: CENTER_ALIGN,
              border: THIN_BORDER,
            };
          }
        } else if (r >= 4 && c < DATA_COL_END) {
          // 5행~ 데이터 행: 데이터 영역(0~49)만
          if (!cell) wsCells[addr] = { v: '', t: 's' };
          wsCells[addr].s = {
            alignment: CENTER_ALIGN,
            border: THIN_BORDER,
          };
        }
      }
    }
  }

  // ========================================
  // 공익직불제 이행점검 일괄입력 양식 내보내기 (SAMPL-1-116, 메인 SAMPL-1-87 이식)
  // ========================================

  private async exportToGongik(): Promise<void> {
    let targetRows = this.flatRows;
    if (this.selectedKeys.size > 0) {
      targetRows = this.flatRows.filter(r => this.selectedKeys.has(r.key));
    }

    if (targetRows.length === 0) {
      window.showToast?.('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    if (targetRows.length > 300) {
      if (!confirm(`${targetRows.length}건을 내보냅니다. 공익직불제 일괄등록은 1회 300건 이하를 권장합니다. 계속하시겠습니까?`)) {
        return;
      }
    }

    try {
      const XLSX = window.XLSX;
      if (!XLSX) throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');

      const wb = XLSX.utils.book_new();
      const wsData = this.buildGongikWorksheetData(targetRows);
      // SAMPL-1-117: 엑셀 수식 인젝션 방어
      const sanitizeAoa = window.sanitizeExcelAoa ?? ((a: unknown[][]): unknown[][] => a);
      const ws = XLSX.utils.aoa_to_sheet(sanitizeAoa(wsData));

      const wsRec = ws as Record<string, unknown>;
      wsRec['!cols'] = this.getGongikColumnWidths();
      this.applyGongikHeaderStyles(wsRec, wsData);
      this.applyGongikHeaderMerges(wsRec);

      // 1행(안내문) 높이 — wrapText 멀티라인
      const rowsArr = (wsRec['!rows'] as Array<{ hpt?: number }> | undefined) ?? [];
      rowsArr[0] = { hpt: 150 };
      wsRec['!rows'] = rowsArr;

      XLSX.utils.book_append_sheet(wb, ws, '일괄등록양식');

      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      const validations = this.buildGongikDataValidations(targetRows.length);
      const patchedBuffer = await this.injectDataValidations(arrayBuffer, validations);

      const fileName = `공익직불제_이행점검_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      this.downloadBuffer(patchedBuffer, fileName);

      window.showToast?.(`${targetRows.length}건 공익직불제 양식으로 내보냈습니다.`, 'success');
    } catch (e) {
      (window.logger?.error || console.error)('공익직불제 내보내기 실패:', e);
      window.showToast?.('내보내기에 실패했습니다.', 'error');
    }
  }

  /** 공익직불제 용도구분 코드 → 라벨 (흙토람 용도구분 라벨과 동일 기준) */
  private getGongikUsageLabel(usageCode: string): string {
    const usageLabels: Record<string, string> = {
      '0': '일반적인토양검정',
      '1': '토양개량제 규산',
      '2': '토양개량제 석회질',
      '3': '녹비작물'
    };
    return usageLabels[usageCode] || '일반적인토양검정';
  }

  /**
   * 공익직불제 시행전후 표기 (영문 BEFORE/AFTER).
   * 용도구분 0(일반)이면 AFTER. 시행전후 미선택(해당없음)도 빈값.
   */
  private getGongikBeforeAfter(usageCode: string): string {
    if (usageCode === '0' || usageCode === '') return 'AFTER';
    const v = this.bulkBeforeAfterSelect?.value || '';
    if (v === 'Y') return 'AFTER';
    if (v === 'N') return 'BEFORE';
    return '';
  }

  /**
   * 공익직불제 경지구분 1차 매핑.
   * landClass1 === '공익직불제' → '직불(일반)', 그 외 값은 원문 출력.
   */
  private getGongikLandClass1(landClass1: unknown): string {
    const v = landClass1 != null ? String(landClass1).trim() : '';
    return v === '공익직불제' ? '직불(일반)' : v;
  }

  /**
   * 공익직불제 AOA(행 배열) 빌드. 40개 데이터 컬럼을 C열(인덱스 2)부터 배치. A·B(0,1)는 비움.
   */
  private buildGongikWorksheetData(rows: HeuktoramRow[]): string[][] {
    const collector = this.collectorInput?.value || '';
    const data: string[][] = [
      makeGongikRow({ 0: GONGIK_WS_GUIDE }),
      makeGongikRow(GONGIK_WS_HEADER2),
      makeGongikRow(GONGIK_WS_HEADER3),
    ];
    for (const row of rows) {
      data.push(this._buildGongikDataRow(row, collector));
    }
    return data;
  }

  /**
   * 공익직불제 양식 데이터 행 1건 생성 (C 기준 상대 인덱스 → 절대 인덱스 C+offset).
   * 메인 레코드에 공익 전용 필드(차수/경영체등록번호/기준년도 등)는 없을 수 있어 옵셔널 캐스팅.
   */
  private _buildGongikDataRow(row: HeuktoramRow, collector: string): string[] {
    const C = GONGIK_WS_C;
    const r = row as unknown as {
      key: string;
      isSubLot?: boolean;
      baseReceptionNumber?: string;
      parcel?: { lotAddress?: string; category?: string; purpose?: string; note?: string; isMountain?: boolean };
      subLot?: { lotAddress?: string; isMountain?: boolean };
      crop?: { name?: string; code?: string; area?: string | number; unit?: string };
      log: {
        gongikOrder?: string; date?: string; businessRegNo?: string; name?: string;
        landClass1?: string; phoneNumber?: string; addressRoad?: string; address?: string;
        subCategory?: string; purpose?: string; receptionNumber?: string | number; gongikBaseYear?: string;
      };
    };
    const result = (this.testResults[r.key] ?? {}) as Record<string, string | undefined>;

    const lotAddr = r.isSubLot && r.subLot
      ? (r.subLot.lotAddress ?? r.parcel?.lotAddress ?? '')
      : (r.parcel?.lotAddress ?? '');

    let isMountain = false;
    if (r.isSubLot && r.subLot) {
      isMountain = r.subLot.isMountain ?? false;
    } else if (r.parcel) {
      isMountain = r.parcel.isMountain ?? false;
    }

    const lotParsed = this.parseLotAddress(lotAddr);
    if (isMountain) lotParsed.isMountain = true;

    const category = r.parcel?.category || r.log.subCategory || '';
    const purpose = r.parcel?.purpose || r.log.purpose || '';
    const usageCode = this.getUsageCode(purpose, result.usageCode, this.bulkUsageCodeSelect?.value);

    // 면적: 평이면 ㎡로 변환 (흙토람 export 로직과 동일)
    let areaM2: string | number = r.crop?.area ?? '';
    if (areaM2 && r.crop?.unit === 'pyeong') {
      const parsed = parseFloat(String(areaM2));
      if (!isNaN(parsed)) areaM2 = Math.round(parsed * PYEONG_TO_SQM);
    }

    const dataRow = new Array(GONGIK_WS_TOTAL_COLS + C).fill('') as string[];
    dataRow[C + 0] = r.log.gongikOrder || '1';                                            // C 차수
    dataRow[C + 1] = r.log.date || '';                                                    // D 시료채취일자
    dataRow[C + 2] = result.testDate || '';                                               // E 토양검정일
    dataRow[C + 3] = r.log.date || '';                                                    // F 분석의뢰일
    dataRow[C + 4] = this.getGongikUsageLabel(usageCode);                                 // G 용도구분-구분
    dataRow[C + 5] = this.getGongikBeforeAfter(usageCode);                                // H 시행전후
    dataRow[C + 6] = collector || r.log.name || '';                                       // I 채취자명
    dataRow[C + 7] = r.baseReceptionNumber || String(r.log.receptionNumber ?? '').replace(/-\d+$/, '') || ''; // J 시료번호
    dataRow[C + 8] = r.log.businessRegNo || '';                                           // K 경영체등록번호
    dataRow[C + 9] = r.log.name || '';                                                    // L 경작자명
    dataRow[C + 10] = lotParsed.sido;                                                     // M 시도
    dataRow[C + 11] = lotParsed.sigungu;                                                  // N 시군구
    dataRow[C + 12] = lotParsed.eupmyeondong;                                             // O 읍면동
    dataRow[C + 13] = lotParsed.ri;                                                       // P 리
    dataRow[C + 14] = lotParsed.isMountain ? '산' : '일반';                               // Q 일반·산
    dataRow[C + 15] = lotParsed.jibun1;                                                   // R 지번1
    dataRow[C + 16] = lotParsed.jibun2;                                                   // S 지번2
    dataRow[C + 17] = r.parcel?.note || '';                                               // T 상세주소
    dataRow[C + 18] = this.getGongikLandClass1(r.log.landClass1);                         // U 경지구분 1차
    dataRow[C + 19] = this.getCategoryCode(category);                                     // V 경지구분 2차
    dataRow[C + 20] = r.log.addressRoad || r.log.address || '';                           // W 경작자 주소
    dataRow[C + 21] = (r.log.phoneNumber || '').replace(/-/g, '');                        // X 신청자 전화번호
    dataRow[C + 22] = String(areaM2);                                                     // Y 대상지면적
    dataRow[C + 23] = r.crop?.name || r.crop?.code || '';                                 // Z 작물명/코드
    dataRow[C + 24] = r.log.gongikBaseYear || '';                                         // AA 기준년도
    dataRow[C + 25] = result.clay || '';                                                  // 점토함량
    dataRow[C + 26] = result.pH || '';                                                    // pH
    dataRow[C + 27] = result.organicMatter || '';                                         // 유기물
    dataRow[C + 28] = result.availableP || '';                                            // 유효인산
    dataRow[C + 29] = result.exK || '';                                                   // 교환성칼륨
    dataRow[C + 30] = result.exCa || '';                                                  // 교환성칼슘
    dataRow[C + 31] = result.exMg || '';                                                  // 교환성마그네슘
    dataRow[C + 32] = result.silica || '';                                                // 유효규산
    dataRow[C + 33] = result.ec || '';                                                    // 전기전도도
    dataRow[C + 34] = result.limeReq || '';                                               // 석회소요량
    dataRow[C + 35] = result.NO3N || '';                                                  // 질산태질소
    dataRow[C + 36] = result.cec || '';                                                   // 양이온치환용량
    dataRow[C + 37] = result.NH4N || '';                                                  // 암모니아태질소
    return dataRow;
  }

  private getGongikColumnWidths(): Array<{ wch?: number; hidden?: boolean }> {
    const widths: Array<{ wch?: number; hidden?: boolean }> = [{ hidden: true }, { hidden: true }];
    const dataWidths = [
      6, 14, 14, 18, 18, 10, 10, 10, 16, 10,
      12, 10, 10, 8, 8, 8, 8, 16, 12, 10,
      24, 16, 12, 18, 14, 10, 6, 8, 10, 12,
      12, 12, 10, 12, 12, 12, 12, 12
    ];
    for (const w of dataWidths) widths.push({ wch: w });
    return widths;
  }

  /**
   * 공익직불제 헤더 스타일. 2행(대분류)·3행(소분류) 회색 배경 + 테두리, 4행~ 데이터 테두리.
   * 데이터 영역 C(2) ~ AN(39).
   */
  private applyGongikHeaderStyles(ws: Record<string, unknown>, wsData: string[][]): void {
    const cells = ws as Record<string, { v?: unknown; t?: string; s?: unknown }>;
    const DATA_START = 2;
    const DATA_END = 40;
    const rowCount = wsData.length;

    const headerBorder = {
      top: { style: 'thin', color: { rgb: '808080' } },
      bottom: { style: 'thin', color: { rgb: '808080' } },
      left: { style: 'thin', color: { rgb: '808080' } },
      right: { style: 'thin', color: { rgb: '808080' } }
    };
    const headerBase = {
      fill: { fgColor: { rgb: 'C0C0C0' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: headerBorder
    };
    const row2Style = { ...headerBase, font: { bold: true, sz: 10 } };
    const row3Style = { ...headerBase, font: { bold: true, sz: 9 } };
    const dataStyle = {
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: headerBorder
    };

    for (let c = DATA_START; c < DATA_END; c++) {
      const col = encodeCol(c);

      const cell2 = col + '2';
      if (!cells[cell2]) cells[cell2] = { v: '', t: 's' };
      cells[cell2].s = row2Style;

      const cell3 = col + '3';
      if (!cells[cell3]) cells[cell3] = { v: '', t: 's' };
      cells[cell3].s = row3Style;

      for (let r = 3; r < rowCount; r++) {
        const addr = col + (r + 1);
        if (!cells[addr]) cells[addr] = { v: '', t: 's' };
        cells[addr].s = dataStyle;
      }
    }

    const cellC1 = cells['C1'];
    if (cellC1) {
      cellC1.s = {
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        font: { sz: 11, name: '맑은 고딕' }
      };
    }
  }

  /** 공익직불제 헤더 병합 (2단 구조). 절대 인덱스 C=2 ... AN=39. */
  private applyGongikHeaderMerges(ws: Record<string, unknown>): void {
    const C = 2;
    const merges = [
      { s: { r: 0, c: C }, e: { r: 0, c: C + 37 } },
      { s: { r: 1, c: C + 0 }, e: { r: 2, c: C + 0 } },
      { s: { r: 1, c: C + 1 }, e: { r: 2, c: C + 1 } },
      { s: { r: 1, c: C + 2 }, e: { r: 2, c: C + 2 } },
      { s: { r: 1, c: C + 3 }, e: { r: 2, c: C + 3 } },
      { s: { r: 1, c: C + 6 }, e: { r: 2, c: C + 6 } },
      { s: { r: 1, c: C + 7 }, e: { r: 2, c: C + 7 } },
      { s: { r: 1, c: C + 8 }, e: { r: 2, c: C + 8 } },
      { s: { r: 1, c: C + 9 }, e: { r: 2, c: C + 9 } },
      { s: { r: 1, c: C + 17 }, e: { r: 2, c: C + 17 } },
      { s: { r: 1, c: C + 20 }, e: { r: 2, c: C + 20 } },
      { s: { r: 1, c: C + 21 }, e: { r: 2, c: C + 21 } },
      { s: { r: 1, c: C + 22 }, e: { r: 2, c: C + 22 } },
      { s: { r: 1, c: C + 23 }, e: { r: 2, c: C + 23 } },
      { s: { r: 1, c: C + 24 }, e: { r: 2, c: C + 24 } },
      { s: { r: 1, c: C + 4 }, e: { r: 1, c: C + 5 } },
      { s: { r: 1, c: C + 10 }, e: { r: 1, c: C + 16 } },
      { s: { r: 1, c: C + 18 }, e: { r: 1, c: C + 19 } },
      { s: { r: 1, c: C + 25 }, e: { r: 1, c: C + 37 } },
    ];
    const cur = (ws['!merges'] as Array<unknown>) || [];
    ws['!merges'] = cur.concat(merges);
  }

  /**
   * 공익직불제 데이터 유효성(드롭다운) 규칙.
   * 절대열: G=용도구분 구분(C+4), H=시행전후(C+5), Q=일반·산(C+14).
   */
  private buildGongikDataValidations(dataRowCount: number): Array<{ sqref: string; options: string[] }> {
    if (dataRowCount <= 0) return [];
    const startRow = 4;
    const endRow = 3 + dataRowCount;
    const colG = encodeCol(2 + 4);
    const colH = encodeCol(2 + 5);
    const colQ = encodeCol(2 + 14);
    return [
      { sqref: `${colG}${startRow}:${colG}${endRow}`, options: ['일반적인토양검정', '토양개량제 규산', '토양개량제 석회질', '녹비작물'] },
      { sqref: `${colH}${startRow}:${colH}${endRow}`, options: ['BEFORE', 'AFTER'] },
      { sqref: `${colQ}${startRow}:${colQ}${endRow}`, options: ['일반', '산'] }
    ];
  }
}

// ========================================
// 페이지 초기화
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 5; y++) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      yearSelect.appendChild(opt);
    }
  }

  window.heuktoramManager = new HeuktoramManager();
});
