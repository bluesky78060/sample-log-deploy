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
  date: string;

  /** Reception number (sequential per type/year) */
  receptionNumber: string;

  /** Applicant name */
  name: string;

  /** Applicant phone number */
  phoneNumber?: string;

  /** Reception method */
  receptionMethod?: ReceptionMethod | string;

  /** Additional notes */
  note?: string;

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
  cropName: string;

  /** Cultivation area */
  area: number | string;

  /** Area unit */
  unit: AreaUnit;
}

/**
 * Sub-lot (필지) information
 */
interface SubLot {
  /** Lot number (지번) */
  lotNumber: string;

  /** Region (읍/면/동) */
  district?: string;

  /** Village (리/마을) */
  village?: string;

  /** Crops in this lot */
  crops?: CropArea[];
}

/**
 * Parcel information for soil samples
 */
interface SoilParcel {
  /** Parcel ID (internal) */
  id: string | number;

  /** Region (읍/면/동) */
  district: string;

  /** Village (리/마을) */
  village: string;

  /** Lot number (지번) */
  lotNumber: string;

  /** Sub-lots (multiple lots per parcel) */
  subLots?: SubLot[];

  /** Crops and areas (실제 사용 필드) */
  crops?: CropArea[];

  /** @deprecated 코드에서는 crops 사용 — alias로만 유지 */
  cropAreas?: CropArea[];

  /** 경지구분 (논·밭·과수·시설·임야·성토) */
  category?: string;

  /** Purpose of soil test (용도/목적) */
  purpose?: string;

  /** Lot address (필지 전체 주소 텍스트) */
  lotAddress?: string;
}

/**
 * Soil sample interface
 */
interface SoilSample extends BaseSample {
  /** Sample category */
  category?: '토양' | '농업용수' | string;

  /** Sub-category */
  subCategory?: string;

  /** 경지구분 1차 (landClass1) — 접수번호 독립 채번/통계/필터 기준 */
  landClass1?: string;

  /** 공익직불제 전용 — 차수 ('1' | '2') */
  gongikOrder?: string;

  /** 공익직불제 전용 — 기준년도(이행점검명) */
  gongikBaseYear?: string;

  /** 공익직불제 전용 — 경영체등록번호 (엑셀 가져오기에서 채워짐, 표시 전용) */
  businessRegNo?: string;

  /** 필지 PNU 코드 보존 (주소 자동완성/엑셀 가져오기 시 채워짐) */
  basePnu?: string;

  /** Address information */
  address?: string;
  addressRoad?: string;
  addressDetail?: string;
  addressPostcode?: string;

  /** Parcel data (JSON string or array) */
  parcels?: SoilParcel[] | string;

  /** Flattened parcel info for table display */
  district?: string;
  village?: string;
  lotNumber?: string;
  cropName?: string;
  area?: number | string;
  areaUnit?: AreaUnit;
  purpose?: string;

  /** Test results */
  testResult?: TestResult | string;

  /** Mail dispatch date */
  mailDate?: string;
}

// ========================================
// Water Sample Types
// ========================================

/**
 * Water quality test item
 */
interface WaterTestItem {
  /** Test item name */
  itemName: string;

  /** Test result value */
  resultValue?: string | number;

  /** Reference value */
  referenceValue?: string | number;

  /** Unit */
  unit?: string;
}

/**
 * Water sample interface
 */
interface WaterSample extends BaseSample {
  /** Sample source type */
  waterSourceType?: string;

  /** Sample location */
  samplingPoint?: string;

  /** Address */
  address?: string;

  /** Purpose of water test */
  purpose?: string;

  /** Test items */
  testItems?: WaterTestItem[] | string;

  /** Overall result */
  testResult?: TestResult | string;

  /** Report number */
  reportNumber?: string;

  /** Test date */
  testDate?: string;

  /** Report issue date */
  issueDate?: string;
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
  pesticideName: string;

  /** Detected amount */
  detectedAmount?: number;

  /** Detection limit */
  detectionLimit?: number;

  /** Maximum residue limit (MRL) */
  maxResidueLimit?: number;

  /** Unit (usually ppm or mg/kg) */
  unit?: string;

  /** Result */
  verdict?: '적합' | '부적합' | string;
}

/**
 * Pesticide residue sample interface
 */
interface PesticideSample extends BaseSample {
  /** Sample name / crop type */
  sampleName?: string;

  /** Producer name */
  producerName?: string;

  /** Producer address */
  producerAddress?: string;

  /** Production location */
  productionLocation?: string;

  /** Crop name */
  requestContent?: string;

  /** Sample collection date */
  samplingDate?: string;

  /** Test date */
  testDate?: string;

  /** Test items (individual pesticides) */
  testItems?: PesticideTestItem[] | string;

  /** Number of pesticides tested */
  testItemCount?: number;

  /** Overall result */
  testResult?: TestResult | string;

  /** Report number */
  reportNumber?: string;

  /** Certificate issue date */
  certificateDate?: string;
}

// ========================================
// Heavy Metal Sample Types
// ========================================

/**
 * Heavy metal test item
 */
interface HeavyMetalTestItem {
  /** Element name (e.g., Cd, Pb, As, Hg) */
  elementName: string;

  /** Detected concentration */
  detectedConcentration?: number;

  /** Standard limit */
  standardLimit?: number;

  /** Unit (usually mg/kg) */
  unit?: string;

  /** Result */
  verdict?: '적합' | '부적합' | string;
}

/**
 * Heavy metal (soil contamination) sample interface
 */
interface HeavyMetalSample extends BaseSample {
  /** Sample location */
  samplingLocation?: string;

  /** Address */
  address?: string;

  /** Region */
  district?: string;

  /** Village */
  village?: string;

  /** Lot number */
  lotNumber?: string;

  /** Land use type */
  landUseType?: string;

  /** Sample depth */
  samplingDepth?: string;

  /** Sample collection date */
  samplingDate?: string;

  /** Test purpose */
  purpose?: string;

  /** Test items (individual metals) */
  testItems?: HeavyMetalTestItem[] | string;

  /** Overall result */
  testResult?: TestResult | string;

  /** Soil grade */
  soilGrade?: '1등급' | '2등급' | '3등급' | string;

  /** Report number */
  reportNumber?: string;
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
  district: string;

  /** Village (리/마을) */
  village: string;

  /** Lot number (지번) */
  lotNumber: string;
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
