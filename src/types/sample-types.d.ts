/**
 * @fileoverview Sample Type Definitions
 * @description Interfaces for all sample types (soil, water, compost, pesticide, heavy-metal)
 */

// ========================================
// Common Sample Types
// ========================================

/**
 * Sample module key identifiers
 */
type SampleModuleKey = 'soil' | 'water' | 'compost' | 'pesticide' | 'heavyMetal' | 'heavy-metal';

/**
 * Reception method types
 */
type ReceptionMethod = 'walk-in' | 'mail' | 'phone' | '방문' | '우편' | '전화';

/**
 * Sample completion status
 */
type SampleStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Test result types
 */
type TestResult = 'pass' | 'fail' | 'pending' | '적합' | '부적합' | '미완료';

/**
 * Area unit types
 */
type AreaUnit = 'pyeong' | 'm2';

// ========================================
// Base Sample Interface
// ========================================

/**
 * Base interface for all sample types
 */
interface BaseSample {
  /** Unique identifier (UUID) */
  id: string;

  /** Reception date (YYYY-MM-DD format) */
  접수일: string;

  /** Reception number (sequential per type/year) */
  접수번호: string;

  /** Applicant name */
  성명: string;

  /** Applicant phone number */
  전화번호?: string;

  /** Reception method */
  수령방법?: ReceptionMethod | string;

  /** Additional notes */
  비고?: string;

  /** Completion status */
  completed?: boolean;

  /** Firebase timestamps */
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

/**
 * Firebase Firestore timestamp
 */
interface FirebaseTimestamp {
  seconds: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

// ========================================
// Soil Sample Types
// ========================================

/**
 * Crop area information within a parcel
 */
interface CropArea {
  /** Crop name */
  작물명: string;

  /** Cultivation area */
  재배면적: number | string;

  /** Area unit */
  단위: AreaUnit;
}

/**
 * Sub-lot (필지) information
 */
interface SubLot {
  /** Lot number (지번) */
  지번: string;

  /** Region (읍/면/동) */
  읍면동?: string;

  /** Village (리/마을) */
  리?: string;

  /** Crops in this lot */
  작물?: CropArea[];
}

/**
 * Parcel information for soil samples
 */
interface SoilParcel {
  /** Parcel ID (internal) */
  id: string | number;

  /** Region (읍/면/동) */
  읍면동: string;

  /** Village (리/마을) */
  리: string;

  /** Lot number (지번) */
  지번: string;

  /** Sub-lots (multiple lots per parcel) */
  subLots?: SubLot[];

  /** Crops and areas */
  작물재배면적?: CropArea[];

  /** Purpose of soil test */
  검정목적?: string;
}

/**
 * Soil sample interface
 */
interface SoilSample extends BaseSample {
  /** Sample category */
  구분?: '토양' | '농업용수' | string;

  /** Sub-category */
  세부구분?: string;

  /** Address information */
  주소?: string;
  도로명주소?: string;
  상세주소?: string;
  우편번호?: string;

  /** Parcel data (JSON string or array) */
  parcels?: SoilParcel[] | string;

  /** Flattened parcel info for table display */
  읍면동?: string;
  리?: string;
  지번?: string;
  작물명?: string;
  재배면적?: number | string;
  면적단위?: AreaUnit;
  검정목적?: string;

  /** Test results */
  결과?: TestResult | string;

  /** Mail dispatch date */
  우편발송일?: string;
}

// ========================================
// Water Sample Types
// ========================================

/**
 * Water quality test item
 */
interface WaterTestItem {
  /** Test item name */
  항목명: string;

  /** Test result value */
  결과값?: string | number;

  /** Reference value */
  기준값?: string | number;

  /** Unit */
  단위?: string;
}

/**
 * Water sample interface
 */
interface WaterSample extends BaseSample {
  /** Sample source type */
  수원종류?: string;

  /** Sample location */
  채수지점?: string;

  /** Address */
  주소?: string;

  /** Purpose of water test */
  검정목적?: string;

  /** Test items */
  검사항목?: WaterTestItem[] | string;

  /** Overall result */
  결과?: TestResult | string;

  /** Report number */
  성적서번호?: string;

  /** Test date */
  검사일?: string;

  /** Report issue date */
  발급일?: string;
}

// ========================================
// Compost Sample Types
// ========================================

/**
 * Compost/liquid fertilizer sample interface
 */
interface CompostSample extends BaseSample {
  /** Reception number */
  receptionNumber: string;

  /** Reception date */
  date: string;

  /** Applicant type (개인 or 법인) */
  applicantType?: '개인' | '법인' | string;

  /** Birth date (for 개인) */
  birthDate?: string;

  /** Corporation number (for 법인) */
  corpNumber?: string;

  /** Farm/company name */
  farmName?: string;
  companyName?: string;

  /** Applicant name */
  name?: string;

  /** Phone number */
  phoneNumber?: string;

  /** Address information */
  address?: string;
  addressPostcode?: string;
  addressRoad?: string;
  addressDetail?: string;

  /** Farm address */
  farmAddress?: string;

  /** Farm area */
  farmArea?: string | number;
  farmAreaUnit?: 'pyeong' | 'm2' | 'ha';

  /** Sample type */
  sampleType?: '가축분퇴비' | '가축분뇨발효액' | string;

  /** Animal type */
  animalType?: '소' | '돼지' | '닭·오리 등' | '기타' | string;

  /** Production date */
  productionDate?: string;

  /** Sample count */
  sampleCount?: string | number;

  /** Raw materials */
  rawMaterials?: string;

  /** Test purpose */
  purpose?: string;

  /** Reception method */
  receptionMethod?: '직접수령' | '우편' | string;

  /** Notes */
  note?: string;

  /** Completion status */
  isComplete?: boolean;

  /** Test result */
  testResult?: 'pass' | 'fail' | '' | null;

  /** Maturity level (부숙도) */
  maturity?: '부숙초기' | '부숙중기' | '부숙후기' | '부숙완료' | '' | string;

  /** Moisture content (함수율) */
  moisture?: string | number;

  /** Mail dispatch date */
  mailDate?: string;

  /** Timestamps */
  createdAt?: string;
  updatedAt?: string;
}

// ========================================
// Pesticide Sample Types
// ========================================

/**
 * Pesticide residue test item
 */
interface PesticideTestItem {
  /** Pesticide name */
  농약명: string;

  /** Detected amount */
  검출량?: number;

  /** Detection limit */
  검출한계?: number;

  /** Maximum residue limit (MRL) */
  잔류허용기준?: number;

  /** Unit (usually ppm or mg/kg) */
  단위?: string;

  /** Result */
  판정?: '적합' | '부적합' | string;
}

/**
 * Pesticide residue sample interface
 */
interface PesticideSample extends BaseSample {
  /** Sample name / crop type */
  시료명?: string;

  /** Producer name */
  생산자?: string;

  /** Producer address */
  생산자주소?: string;

  /** Production location */
  생산지?: string;

  /** Crop name */
  농산물명?: string;

  /** Sample collection date */
  채취일?: string;

  /** Test date */
  검사일?: string;

  /** Test items (individual pesticides) */
  검사항목?: PesticideTestItem[] | string;

  /** Number of pesticides tested */
  검사항목수?: number;

  /** Overall result */
  결과?: TestResult | string;

  /** Report number */
  성적서번호?: string;

  /** Certificate issue date */
  증명서발급일?: string;
}

// ========================================
// Heavy Metal Sample Types
// ========================================

/**
 * Heavy metal test item
 */
interface HeavyMetalTestItem {
  /** Element name (e.g., Cd, Pb, As, Hg) */
  항목명: string;

  /** Detected concentration */
  검출농도?: number;

  /** Standard limit */
  기준농도?: number;

  /** Unit (usually mg/kg) */
  단위?: string;

  /** Result */
  판정?: '적합' | '부적합' | string;
}

/**
 * Heavy metal (soil contamination) sample interface
 */
interface HeavyMetalSample extends BaseSample {
  /** Sample location */
  채취지점?: string;

  /** Address */
  주소?: string;

  /** Region */
  읍면동?: string;

  /** Village */
  리?: string;

  /** Lot number */
  지번?: string;

  /** Land use type */
  지목?: string;

  /** Sample depth */
  채취심도?: string;

  /** Sample collection date */
  채취일?: string;

  /** Test purpose */
  검사목적?: string;

  /** Test items (individual metals) */
  검사항목?: HeavyMetalTestItem[] | string;

  /** Overall result */
  결과?: TestResult | string;

  /** Soil grade */
  토양등급?: '1등급' | '2등급' | '3등급' | string;

  /** Report number */
  성적서번호?: string;
}

// ========================================
// Sample Data Container Types
// ========================================

/**
 * Exported JSON file structure
 */
interface SampleExportData<T extends BaseSample = BaseSample> {
  /** Export format version */
  version: string;

  /** Export date (ISO 8601) */
  exportDate: string;

  /** Sample type name */
  sampleType?: string;

  /** Total number of records */
  totalRecords: number;

  /** Sample data array */
  data: T[];

  /** Encryption marker (for encrypted exports) */
  encrypted?: boolean;
}

/**
 * Sample statistics
 */
interface SampleStatistics {
  /** Total samples */
  total: number;

  /** Completed samples */
  completed: number;

  /** Pending samples */
  pending: number;

  /** Pass rate (%) */
  passRate?: number;

  /** By region breakdown */
  byRegion?: Record<string, number>;

  /** By month breakdown */
  byMonth?: Record<string, number>;
}

// ========================================
// Search/Filter Types
// ========================================

/**
 * Common search filter for samples
 */
interface SampleSearchFilter {
  /** Date range start */
  dateFrom?: string;

  /** Date range end */
  dateTo?: string;

  /** Applicant name search */
  name?: string;

  /** Reception number range start */
  receptionFrom?: string;

  /** Reception number range end */
  receptionTo?: string;

  /** Lot number search */
  lot?: string;

  /** Purpose filter */
  purpose?: string;

  /** Completion status filter */
  completed?: 'all' | 'completed' | 'incomplete';

  /** Result filter */
  result?: 'all' | 'pass' | 'fail' | 'pending';

  /** Region filter */
  region?: string;
}

// ========================================
// Soil-specific Type Aliases
// ========================================

/**
 * Soil log (same as SoilSample)
 */
type SoilLog = SoilSample;

/**
 * Soil crop (same as CropArea)
 */
type SoilCrop = CropArea;

/**
 * Soil sub-lot (same as SubLot)
 */
type SoilSubLot = SubLot;

/**
 * Soil flat row (same as SoilTableRow)
 */
type SoilFlatRow = SoilTableRow;

/**
 * Soil search filter (same as SampleSearchFilter)
 */
type SoilSearchFilter = SampleSearchFilter;

/**
 * Soil statistics (same as SampleStatistics)
 */
type SoilStatistics = SampleStatistics;

/**
 * Parsed parcel address from user input
 */
interface ParsedParcelAddress {
  /** Region (읍/면/동) */
  읍면동: string;

  /** Village (리/마을) */
  리: string;

  /** Lot number (지번) */
  지번: string;
}

/**
 * Region selection modal data
 */
interface RegionSelectionModalData {
  /** Selected region */
  region: string;

  /** Selected village */
  village: string;

  /** Parcel ID being edited */
  parcelId?: string | number;

  /** Callback function */
  callback?: (region: string, village: string) => void;
}

// ========================================
// Table Row Types (for rendering)
// ========================================

/**
 * Flattened soil sample row for table display
 */
interface SoilTableRow extends SoilSample {
  /** Original log ID (for grouped parcels) */
  logId?: string;

  /** Parcel index within the log */
  parcelIndex?: number;

  /** Sub-lot index within the parcel */
  subLotIndex?: number;

  /** Display-ready parcel count */
  parcelCount?: number;
}

/**
 * Generic table row for rendering
 */
interface TableRowData {
  /** Row identifier */
  id: string;

  /** Data for each column */
  [key: string]: unknown;
}

// ========================================
// Form Data Types
// ========================================

/**
 * Form field validation state
 */
interface FormValidationState {
  /** Field is valid */
  valid: boolean;

  /** Error message if invalid */
  error?: string;

  /** Touched state */
  touched?: boolean;
}

/**
 * Form submission result
 */
interface FormSubmissionResult {
  /** Submission successful */
  success: boolean;

  /** Created/updated sample data */
  data?: BaseSample;

  /** Error message if failed */
  error?: string;

  /** Validation errors by field */
  validationErrors?: Record<string, string>;
}

// ========================================
// Export all types
// ========================================

export {
  // Module types
  SampleModuleKey,
  ReceptionMethod,
  SampleStatus,
  TestResult,
  AreaUnit,

  // Base types
  BaseSample,
  FirebaseTimestamp,

  // Soil types
  CropArea,
  SubLot,
  SoilParcel,
  SoilSample,
  SoilTableRow,

  // Soil-specific type aliases
  SoilLog,
  SoilCrop,
  SoilSubLot,
  SoilFlatRow,
  SoilSearchFilter,
  SoilStatistics,
  ParsedParcelAddress,
  RegionSelectionModalData,

  // Water types
  WaterTestItem,
  WaterSample,

  // Compost types
  CompostSample,

  // Pesticide types
  PesticideTestItem,
  PesticideSample,

  // Heavy metal types
  HeavyMetalTestItem,
  HeavyMetalSample,

  // Container types
  SampleExportData,
  SampleStatistics,

  // Search/filter types
  SampleSearchFilter,

  // Table types
  TableRowData,

  // Form types
  FormValidationState,
  FormSubmissionResult,
};
