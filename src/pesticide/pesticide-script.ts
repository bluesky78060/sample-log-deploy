/**
 * @fileoverview 잔류농약 시료 전용 스크립트
 * PesticideSampleManager - BaseSampleManager 상속
 */

import type { PesticideSample } from '../types/sample-types';

// ========================================
// 상수 및 설정
// ========================================

/** Sample type name */
const SAMPLE_TYPE = '잔류농약' as const;

/** Storage key for localStorage */
const STORAGE_KEY = 'test_pesticideSampleLogs' as const;

/** Auto-save file name */
const AUTO_SAVE_FILE = 'pesticide-autosave.json' as const;

/** Conversion constant for area units (pyeong to m²) */
const PYEONG_TO_M2 = 3.305785;

// ========================================
// Type Definitions
// ========================================

/**
 * Pesticide test result
 */
type PesticideResult = 'pass' | 'fail' | null;

/**
 * Request item for pesticide test
 */
interface RequestItem {
  producerAddress: string;
  requestContent: string;
  index: number;
}

/**
 * Parcel information (legacy compatibility)
 */
interface Parcel {
  id: number;
  region: string;
  village: string;
  lot: string;
  crops?: CropSelection[];
}

/**
 * Crop selection for parcel
 */
interface CropSelection {
  cropName: string;
  area: number;
  unit: string;
}

/**
 * Search filter for pesticide samples
 */
interface PesticideSearchFilter {
  dateFrom: string;
  dateTo: string;
  name: string;
  receptionFrom: string;
  receptionTo: string;
  completed: 'all' | 'completed' | 'incomplete';
}

/**
 * Pagination state
 */
interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * Registration result data
 */
interface RegistrationResult {
  id: string;
  receptionNumber: string;
  date: string;
  name: string;
  producerName?: string;
  producerAddress?: string;
  requestContent?: string;
}

/**
 * Extended pesticide sample with internal fields
 */
interface PesticideSampleData {
  // PesticideSample fields
  접수일?: string;
  접수번호?: string;
  성명?: string;
  전화번호?: string;
  수령방법?: string;
  비고?: string;
  시료명?: string;
  생산자?: string;
  생산자주소?: string;
  생산지?: string;
  농산물명?: string;
  채취일?: string;
  검사일?: string;
  검사항목?: any;
  검사항목수?: number;
  결과?: string;
  성적서번호?: string;
  증명서발급일?: string;

  // Internal fields
  id: string;
  date?: string;
  receptionNumber?: string;
  name?: string;
  applicantType?: '개인' | '법인';
  birthDate?: string;
  corpNumber?: string;
  phoneNumber?: string;
  address?: string;
  addressPostcode?: string;
  addressRoad?: string;
  addressDetail?: string;
  subCategory?: string;
  purpose?: string;
  receptionMethod?: string;
  note?: string;
  producerName?: string;
  producerAddress?: string;
  requestContent?: string;
  completed?: boolean;
  isComplete?: boolean;
  testResult?: PesticideResult;
  createdAt?: string;
  updatedAt?: string;
  mailSentDate?: string;
  parcels?: Parcel[] | string;
}

/**
 * Flattened table row for rendering
 */
interface PesticideTableRow extends PesticideSampleData {
  logId?: string;
  requestIndex?: number;
  requestCount?: number;
}

// Window types are already declared in globals.d.ts
// Only add pesticide-specific extensions here

/**
 * FileAPI instance interface
 */
interface FileAPIInstance {
  init: (year: string | number) => Promise<void>;
  autoSavePath?: string;
  saveExcel?: (buffer: ArrayBuffer, suggestedName?: string) => Promise<boolean>;
}

/**
 * Excel import configuration
 */
interface ExcelImportConfig {
  appFields: Array<{ key: string; label: string }>;
  autoMapRules: Record<string, string>;
  templateConfig: {
    headers: string[];
    sampleRow: string[];
    colWidths: Array<{ wch: number }>;
    sheetName: string;
    fileName: string;
  };
  previewColumns: Array<{ key: string; label: string }>;
  getCommonData: () => any;
  buildRecord: (getVal: (key: string) => string, parseExcelDate: (val: any) => string | null, common: any) => PesticideSampleData;
  skipRowCheck: (record: any, rowIdx: number) => string | null;
  getExistingLogs: () => PesticideSampleData[];
  onImportComplete: (records: PesticideSampleData[]) => void;
}

/**
 * Excel import manager instance
 */
interface ExcelImportManagerInstance {
  init: () => void;
}

// ========================================
// PesticideSampleManager 클래스
// ========================================

/**
 * 잔류농약 시료 관리 매니저
 * BaseSampleManager를 확장하여 잔류농약 특화 기능 구현
 */
class PesticideSampleManager extends ((window as any).BaseSampleManager as any) {
  // Type declarations for inherited properties
  declare sampleLogs: PesticideSampleData[];
  declare selectedYear: string;
  declare editingId: string | null;
  declare currentPage: number;
  declare itemsPerPage: number;
  declare totalPages: number;
  declare moduleKey: string;
  declare moduleName: string;
  declare storageKey: string;
  declare sampleType: string;
  declare autoSaveFile: string;
  declare debug: boolean;
  declare FileAPI: FileAPIInstance | null;

  // Pesticide-specific state
  listViewStale: boolean;
  currentSearchFilter: PesticideSearchFilter;
  isFullView: boolean;
  autoSaveFileHandle: any;
  currentRegistrationData: RegistrationResult | null;

  // Request items
  requestItemCounter: number;

  // Parcel system (legacy compat)
  parcels: Parcel[];
  parcelIdCounter: number;

  // Crop modal state
  currentParcelIdForCrop: number | null;
  tempCropAreas: CropSelection[];
  currentSubLotParcelId: number | null;
  currentSubLotIndex: number | null;

  // Crop search modal state
  tempSelectedCrops: CropSelection[];
  confirmedCrops: CropSelection[];

  // Region selection
  currentRegionSelection: any;

  // Mail date
  pendingMailDateIds: string[];

  // Pagination (pesticide uses its own pagination)
  currentFlatRows: PesticideTableRow[];

  // DOM refs
  dateInput: HTMLInputElement | null;
  applicantTypeSelect: HTMLSelectElement | null;
  birthDateField: HTMLElement | null;
  corpNumberField: HTMLElement | null;
  birthDateInput: HTMLInputElement | null;
  corpNumberInput: HTMLInputElement | null;
  receptionNumberInput: HTMLInputElement | null;
  receptionMethodBtns: NodeListOf<HTMLButtonElement> | null;
  receptionMethodInput: HTMLInputElement | null;
  navSubmitBtn: HTMLButtonElement | null;
  navResetBtn: HTMLButtonElement | null;
  selectAllCheckbox: HTMLInputElement | null;
  paginationContainer: HTMLElement | null;
  paginationInfo: HTMLElement | null;
  itemsPerPageSelect: HTMLSelectElement | null;
  pageNumbersContainer: HTMLElement | null;
  firstPageBtn: HTMLButtonElement | null;
  prevPageBtn: HTMLButtonElement | null;
  nextPageBtn: HTMLButtonElement | null;
  lastPageBtn: HTMLButtonElement | null;
  addressPostcode: HTMLInputElement | null;
  addressRoad: HTMLInputElement | null;
  addressDetail: HTMLInputElement | null;
  addressHidden: HTMLInputElement | null;
  addressManager: any;
  producerAddressInput: HTMLInputElement | null;
  producerAddressAutocomplete: HTMLElement | null;
  requestItemsList: HTMLElement | null;
  registrationResultModal: HTMLElement | null;
  resultTableBody: HTMLElement | null;
  parcelsContainer: HTMLElement | null;
  cropAreaModal: HTMLElement | null;
  cropAreaList: HTMLElement | null;

  // Area formatting utilities (from SampleUtils)
  formatArea: (value: number | string) => string;
  getUnitLabel: (unit: string) => string;
  formatAreaWithUnit: (area: number | string, unit: string) => string;

  constructor() {
    super({
      moduleKey: 'pesticide',
      moduleName: '잔류농약',
      storageKey: STORAGE_KEY,
      sampleType: SAMPLE_TYPE,
      autoSaveFile: AUTO_SAVE_FILE,
      debug: !!window.DEBUG
    });

    // Pesticide-specific state
    this.listViewStale = true;
    this.currentSearchFilter = {
      dateFrom: '',
      dateTo: '',
      name: '',
      receptionFrom: '',
      receptionTo: '',
      completed: 'incomplete'
    };
    this.isFullView = false;
    this.autoSaveFileHandle = null;
    this.currentRegistrationData = null;

    // Request items
    this.requestItemCounter = 1;

    // Parcel system (legacy compat)
    this.parcels = [];
    this.parcelIdCounter = 0;

    // Crop modal state
    this.currentParcelIdForCrop = null;
    this.tempCropAreas = [];
    this.currentSubLotParcelId = null;
    this.currentSubLotIndex = null;

    // Crop search modal state
    this.tempSelectedCrops = [];
    this.confirmedCrops = [];

    // Region selection
    this.currentRegionSelection = null;

    // Mail date
    this.pendingMailDateIds = [];

    // Pagination
    this.currentFlatRows = [];

    // DOM refs (set in cacheElements)
    this.dateInput = null;
    this.applicantTypeSelect = null;
    this.birthDateField = null;
    this.corpNumberField = null;
    this.birthDateInput = null;
    this.corpNumberInput = null;
    this.receptionNumberInput = null;
    this.receptionMethodBtns = null;
    this.receptionMethodInput = null;
    this.navSubmitBtn = null;
    this.navResetBtn = null;
    this.selectAllCheckbox = null;
    this.paginationContainer = null;
    this.paginationInfo = null;
    this.itemsPerPageSelect = null;
    this.pageNumbersContainer = null;
    this.firstPageBtn = null;
    this.prevPageBtn = null;
    this.nextPageBtn = null;
    this.lastPageBtn = null;
    this.addressPostcode = null;
    this.addressRoad = null;
    this.addressDetail = null;
    this.addressHidden = null;
    this.addressManager = null;
    this.producerAddressInput = null;
    this.producerAddressAutocomplete = null;
    this.requestItemsList = null;
    this.registrationResultModal = null;
    this.resultTableBody = null;
    this.parcelsContainer = null;
    this.cropAreaModal = null;
    this.cropAreaList = null;

    // Area formatting from common module
    this.formatArea = ((window as any).SampleUtils?.formatArea || ((v: any) => String(v))) as any;
    this.getUnitLabel = ((window as any).SampleUtils?.getUnitLabel || ((v: any) => v)) as any;
    this.formatAreaWithUnit = ((window as any).SampleUtils?.formatAreaWithUnit || ((area: any, unit: any) => `${area} ${unit}`)) as any;

    // pesticide-specific FileAPI excel save
    if (this.FileAPI) {
      this.FileAPI.saveExcel = async function (buffer: ArrayBuffer, suggestedName = 'data.xlsx'): Promise<boolean> {
        if (window.isElectron && window.electronAPI) {
          const filePath = await window.electronAPI.saveFileDialog({
            title: '엑셀 파일 저장',
            defaultPath: suggestedName,
            filters: [
              { name: 'Excel Files', extensions: ['xlsx'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });
          if (filePath) {
            const result = await window.electronAPI.writeFile(filePath, buffer);
            return result.success;
          }
          return false;
        }
        return false;
      };
    }
  }

  // NOTE: The remaining implementation is imported from the original JS file
  // to avoid duplication and maintain compatibility during migration.
  // Full TypeScript conversion will be completed in a future iteration.
}

// Import the rest of the implementation from the original JS file
// This maintains functionality while we incrementally add type safety
import('./pesticide-script.js');

// ========================================
// 인스턴스 생성 및 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  const manager = new PesticideSampleManager();
  await manager.init();
  window.pesticideManager = manager;
});

export default PesticideSampleManager;
export type { PesticideSampleData, PesticideResult, RequestItem, PesticideSearchFilter, RegistrationResult };
