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
// PesticideSampleManager 클래스 import
// ========================================

import PesticideSampleManager from './PesticideSampleManager';

// ========================================
// 인스턴스 생성 및 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  const manager = new PesticideSampleManager();
  await manager.init();
  window.pesticideManager = manager;
});
