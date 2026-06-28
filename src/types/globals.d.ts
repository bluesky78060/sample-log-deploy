/**
 * @fileoverview Global Type Definitions
 * @description Window interface extensions and global type declarations
 */

// ========================================
// Electron API Types
// ========================================

/**
 * Save dialog options for Electron file dialogs
 */
interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Open dialog options for Electron file dialogs
 */
interface OpenDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

/**
 * Result of a file write operation
 */
interface WriteResult {
  success: boolean;
  error?: string;
}

/**
 * Result of a file read operation
 */
interface ReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Result of folder selection
 */
interface SelectFolderResult {
  success: boolean;
  canceled?: boolean;
  folder?: string;
  path?: string;
}

/**
 * Auth file operation result
 */
interface AuthFileResult {
  success: boolean;
  exists?: boolean;
  content?: string;
  error?: string;
  canceled?: boolean;
  projectId?: string;
}

/**
 * Key file operation result
 */
interface KeyFileResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Electron API exposed via contextBridge
 */
interface ElectronAPI {
  // Environment
  isElectron: true;

  // File dialogs
  saveFileDialog(options: SaveDialogOptions): Promise<string | null>;
  openFileDialog(options: OpenDialogOptions): Promise<string | null>;

  // File operations
  writeFile(filePath: string, content: string | ArrayBuffer): Promise<WriteResult>;
  readFile(filePath: string): Promise<ReadResult>;

  // Auto-save paths
  getAutoSavePath(type: string, year: number | string): Promise<string>;
  selectAutoSaveFolder(): Promise<SelectFolderResult>;
  getAutoSaveFolder(): Promise<string>;

  // App info
  getAppPath(): Promise<string>;
  getVersion(): Promise<string>;

  // Firebase auth file
  readAuthFile(): Promise<AuthFileResult>;
  saveAuthFile(content: string): Promise<WriteResult>;
  deleteAuthFile(): Promise<WriteResult>;
  checkAuthFile(): Promise<boolean>;
  selectAuthFile(): Promise<AuthFileResult>;

  // Encryption key file
  keyFileExists(): Promise<boolean>;
  readKeyFile(): Promise<string | null>;
  saveKeyFile(content: string): Promise<KeyFileResult>;
  exportKeyFile(content: string): Promise<KeyFileResult>;
  importKeyFile(): Promise<KeyFileResult>;

  // Salt and recovery
  saveSalt(saltBase64: string): Promise<WriteResult>;
  loadSalt(): Promise<string | null>;
  saveRecoveryBlob(blobJson: string): Promise<WriteResult>;
  loadRecoveryBlob(): Promise<string | null>;

  // Session password (stored in main process memory)
  storeSessionPassword(password: string): Promise<void>;
  getSessionPassword(): Promise<string | null>;
  clearSessionPassword(): Promise<void>;

  // Auto-update
  quitAndInstall?(): void;

  // Heuktoram popup
  openHeuktoram?(): Promise<boolean>;

  // Water analysis popup
  openWaterAnalysis?(): Promise<boolean>;

  // Pesticide analysis popup
  openPesticideAnalysis?(): Promise<boolean>;

  // Compost analysis popup
  openCompostAnalysis?(): Promise<boolean>;

  // Heavy metal analysis popup
  openHeavyMetalAnalysis?(): Promise<boolean>;

  // VWORLD geocoding (IPC via main process, no Origin restriction)
  vworldGeocode?(address: string): Promise<boolean | null>;

  // JUSO(도로명주소) 검색 (IPC via main process, key는 main 보유)
  jusoSearch?(payload: { keyword: string; page?: number; size?: number }): Promise<JusoSearchResult>;

  // MRL(식품안전나라) 내장 API 키 게터 (키는 main env 보유 — 렌더러가 직접 fetch)
  mrlGetApiKey?(): Promise<string>;

  // PSIS(농촌진흥청) 농약 용도 조회 (IPC via main process, http 엔드포인트)
  psisLookupUse?(payload: { korName: string }): Promise<PsisLookupUseResult>;
}

// ========================================
// MRL / PSIS Types (SAMPL-1-112 Phase 1)
// ========================================

/** psis:lookup-use IPC 반환 형태 */
interface PsisLookupUseResult {
  useName: string | null;
  error?: string;
}

/** mrl-name-canon (window.MrlNameCanon) */
interface MrlNameCanonApi {
  canonicalizeKor(name: unknown): string;
  stripIsomerSuffix(key: unknown): string;
  KOR_ALIAS: Record<string, string>;
  baseNorm(s: unknown): string;
}

/** mrl-search 후보 항목 */
interface MrlPesticideCandidate {
  kor: string;
  engNames: string[];
  inMrl: boolean;
}

/** mrl-search (window.MrlSearch) */
interface MrlSearchApi {
  normalize(str: unknown): string;
  hasKorean(str: unknown): boolean;
  buildKorToEngIndex(
    nameMapEntries: Record<string, { kor?: string; [k: string]: unknown }> | null | undefined
  ): Map<string, string[]>;
  engNamesForKor(kor: string, korToEngIndex: Map<string, string[]> | null | undefined): string[];
  findPesticideCandidates(
    query: string,
    korPesticideNames: string[] | null | undefined,
    nameMapEntries: Record<string, { kor?: string; [k: string]: unknown }> | null | undefined,
    limit?: number
  ): MrlPesticideCandidate[];
}

/** psis-parse (window.PsisParse) */
interface PsisParseApi {
  parsePsisUseName(xmlString: unknown): { useName: string | null; error: string | null };
  normalizeUseName(raw: unknown): string | null;
  decodeEntities(str: unknown): string;
  extractTagValues(xml: unknown, localName: string): string[];
}

/** pesticide-use-type (window.PesticideUseType / window.PESTICIDE_USE_TYPE) */
interface PesticideUseTypeApi {
  get(engName: unknown): string | null;
  getByKor(korName: unknown): string | null;
  normalize(str: unknown): string;
  USE_TYPES: string[];
  meta: Record<string, unknown>;
}

/** pesticide-name-map (window.PESTICIDE_NAME_MAP) */
interface PesticideNameMapData {
  meta?: Record<string, unknown>;
  map: Record<string, { kor: string; confidence?: string; score?: number; [k: string]: unknown }>;
}

/** MrlApi (window.MrlApi) — 느슨한 타입(거대 API 표면) */
interface MrlApiInstance {
  getApiKey(): string;
  setApiKey(key: string): boolean;
  hasApiKey(): boolean;
  ensureEmbeddedKey(): Promise<string>;
  init(): Promise<boolean>;
  sync(onProgress?: (p: { loaded: number; total: number }) => void): Promise<{ success: boolean; count?: number; error?: string }>;
  syncIfStale(onProgress?: (p: { loaded: number; total: number }) => void): Promise<{ success: boolean; count?: number; error?: string; fromCache?: boolean }>;
  getCacheStatus(): { cached: boolean; expired: boolean | null; count: number; timestamp: number | null; ageMs?: number };
  clearCache(): boolean;
  lookup(crop: string, pesticide: string): Record<string, unknown> | null;
  lookupByEng(crop: string, engPesticide: string): Record<string, unknown>;
  lookupFlexible(crop: string, pesticideName: string): Record<string, unknown>;
  searchNames(query: string, field?: 'crop' | 'pesticide', limit?: number): string[];
  getAllByPesticide(pesticide: string): Array<Record<string, unknown>>;
  getAllByCrop(crop: string): Array<Record<string, unknown>>;
  engToKor(engName: string): { kor: string; confidence?: string; score?: number } | null;
  resolvePesticideName(name: string): { kor: string; confidence?: string; source: string; score?: number } | null;
  parseCropName(raw: unknown): string;
  resolveCropAlias(cropName: string): string;
  judge(detected: number | null, mrl: number | null): 'pass' | 'fail' | 'unknown';
  isReady(): boolean;
  getRowCount(): number;
  CACHE_TTL_MS: number;
  SERVICE_ID: string;
}

// ========================================
// JUSO(도로명주소) API Types (SAMPL-1-110)
// ========================================

/** JUSO addrLinkApi 응답 항목 (results.juso[i]) */
interface JusoAddressItem {
  zipNo?: string;     // 우편번호
  roadAddr?: string;  // 도로명주소(참고항목 포함)
  jibunAddr?: string; // 지번주소
  siNm?: string;      // 시도명
  sggNm?: string;     // 시군구명
  emdNm?: string;     // 읍면동명
  liNm?: string;      // 법정리명
  mtYn?: string;      // 산 여부 ('0' 대지, '1' 산)
  [k: string]: unknown;
}

/** juso:search IPC 반환 형태 */
interface JusoSearchResult {
  ok: boolean;
  items?: JusoAddressItem[];
  total?: number;
  page?: number;
  size?: number;
  error?: string;
}

// ========================================
// Firebase / Firestore Types
// ========================================

/**
 * Firebase configuration manager
 */
interface FirebaseConfigManager {
  initialize(): Promise<boolean>;
  isEnabled(): boolean;
  isOfflineSupported(): boolean;
  getDb(): FirebaseFirestore.Firestore | null;
  getCurrentUserId(): string | null;
  isConfigValid(config: unknown): boolean;
  // Settings page extensions
  saveConfig?(config: { apiKey: string; projectId: string; authDomain?: string; storageBucket?: string; messagingSenderId?: string; appId?: string }): void;
  resetConfig?(): void;
  reinitialize?(): Promise<boolean>;
}

/**
 * Firestore database operations
 */
interface FirestoreDb {
  init(): Promise<boolean>;
  save(sampleType: string, year: number, docId: string, data: Record<string, unknown>): Promise<boolean>;
  get(sampleType: string, year: number, docId: string): Promise<Record<string, unknown> | null>;
  getAll(sampleType: string, year: number, options?: { skipOrder?: boolean }): Promise<Array<Record<string, unknown>>>;
  getAllWithMeta?(sampleType: string, year: number, options?: { skipOrder?: boolean }): Promise<{ documents: Array<Record<string, unknown>>; fromCache: boolean }>;
  delete(sampleType: string, year: number, docId: string): Promise<boolean>;
  batchSave(sampleType: string, year: number, documents: Array<Record<string, unknown>>, options?: { signal?: AbortSignal }): Promise<boolean>;
  migrate(sampleType: string, year: number, localStorageKey: string): Promise<{ success: boolean; count: number }>;
  subscribe(sampleType: string, year: number, callback: (documents: Array<Record<string, unknown>>, fromCache: boolean) => void): (() => void) | null;
  isEnabled(): boolean;
  isOfflineEnabled(): boolean;
  getCollectionName(sampleType: string, year: number): string;
}

/**
 * Firebase diagnostics tool
 */
interface FirebaseDiagnostics {
  diagnose(): Promise<DiagnosisResult>;
  attemptAutoRecovery(): Promise<RecoveryResult>;
  startHealthCheck(intervalMs?: number): void;
  stopHealthCheck(): void;
  showDiagnosticsUI(): void;
}

interface CheckResult {
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
}

interface DiagnosisResult {
  timestamp: string;
  checks: Record<string, CheckResult>;
  overallStatus: 'healthy' | 'offline' | 'degraded' | 'error' | 'unknown';
  recommendations: Array<{
    priority: 'critical' | 'warning' | 'info';
    message: string;
    action: string;
  }>;
}

interface RecoveryResult {
  success: boolean;
  message: string;
  canRetry?: boolean;
  diagnosis?: DiagnosisResult;
}

/**
 * Firebase migration tool
 */
interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  overwrite?: boolean;
  force?: boolean;
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void;
}

interface MigrationAllResult {
  timestamp: string;
  results: Array<{
    type: string;
    success: boolean;
    source?: string;
    target?: string;
    copied: number;
    message?: string;
    error?: string;
    skipped?: boolean;
  }>;
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
}

declare class FirebaseMigrationTool {
  constructor();
  init(): Promise<void>;
  countDocuments(collectionName: string): Promise<number>;
  checkStatus(): Promise<Record<string, {
    original: { name: string; count: number };
    test: { name: string; count: number };
    needsMigration: boolean;
  }>>;
  migrateCollection(sourceCollection: string, targetCollection: string, options?: MigrationOptions): Promise<{
    success: boolean;
    source?: string;
    target?: string;
    copied: number;
    message?: string;
    error?: string;
  }>;
  migrateAll(options?: MigrationOptions): Promise<MigrationAllResult>;
  saveLog(result: MigrationAllResult): void;
  getLog(): Array<{ timestamp: string; result: MigrationAllResult }>;
  clearLog(): void;
}

// ========================================
// Storage Manager Types
// ========================================

type StorageMode = 'local' | 'cloud' | 'cloudOnly';

interface StorageModeOption {
  value: StorageMode;
  label: string;
  description: string;
  available: boolean;
}

interface SyncStatus {
  lastSyncTime: Date | null;
  pendingChanges: number;
  isOnline: boolean;
  mode: StorageMode;
  isCloudEnabled: boolean;
  isOfflineSupported: boolean;
}

interface StorageManager {
  init(): Promise<StorageMode>;
  save(sampleType: string, year: number, localStorageKey: string, data: unknown[]): Promise<boolean>;
  saveItem(sampleType: string, year: number, localStorageKey: string, item: Record<string, unknown>): Promise<boolean>;
  load(sampleType: string, year: number, localStorageKey: string): Promise<unknown[]>;
  delete(sampleType: string, year: number, localStorageKey: string, itemId: string): Promise<boolean>;
  subscribe(sampleType: string, year: number, localStorageKey: string, onUpdate: (documents: unknown[], fromCache: boolean) => void): (() => void) | null;
  migrate(sampleType: string, year: number, localStorageKey: string): Promise<{ success: boolean; count: number; message?: string }>;
  sync(): Promise<void>;
  getMode(): StorageMode;
  setMode(mode: StorageMode): { success: boolean; message: string };
  getAvailableModes(): StorageModeOption[];
  getStatus(): SyncStatus;
  isCloudEnabled(): boolean;
  generateId(): string;
  MODES: {
    LOCAL_ONLY: 'local';
    CLOUD_SYNC: 'cloud';
    CLOUD_ONLY: 'cloudOnly';
  };
}

// ========================================
// Encryption Manager Types
// ========================================

interface EncryptionManager {
  init(): Promise<boolean>;
  isReady(): boolean;
  getKey(): CryptoKey | null;
  getKeySource(): 'firebase' | 'local' | 'generated' | null;
  isFirstTimeSetup(): boolean;
  exportKeyFile(): Promise<{ success: boolean; error?: string }>;
  importKeyFile(): Promise<{ success: boolean; error?: string }>;
  changePassword(): Promise<{ success: boolean; error?: string }>;
  recoverWithKey(): Promise<{ success: boolean; error?: string }>;
  resetAll(): Promise<void>;
  // Settings page extensions
  initSilent?(): Promise<boolean>;
  verifyPassword?(password: string): Promise<boolean>;
  checkRecoveryBlobExists?(): Promise<boolean>;
  recoverPassword?(): Promise<{ success: boolean; error?: string }>;
  regenerateRecoveryKey?(): Promise<{ success: boolean; message?: string }>;
  reset?(): void;
}

// ========================================
// Crypto Utils Types
// ========================================

interface CryptoUtils {
  generateKeyFileContent(): string;
  deriveKey(password: string, salt: ArrayBuffer, keyFile: string): Promise<CryptoKey>;
  encryptRecord<T>(record: T, key: CryptoKey): Promise<string>;
  decryptRecord<T>(encryptedData: string, key: CryptoKey): Promise<T>;
  encryptForFile(data: unknown): Promise<string>;
  decryptFromFile<T>(encryptedContent: string): Promise<T | null>;
}

// ========================================
// File API Types
// ========================================

interface FileAPIInstance {
  autoSavePath: string | null;
  autoSaveFileName: string | null;
  sampleType: string;
  init(year: number | string): Promise<void>;
  updateAutoSavePath(year: number | string): Promise<void>;
  saveFile(content: string, suggestedName?: string): Promise<boolean>;
  openFile(): Promise<string | null>;
  autoSave(content: string): Promise<boolean>;
  loadAutoSave(): Promise<string | null>;
  saveExcel?(buffer: ArrayBuffer, suggestedName?: string): Promise<boolean>;
}

// ========================================
// UI Component Types
// ========================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  actionLabel?: string;
  action?: () => void;
  persistent?: boolean;
}

interface LoadingManager {
  show(operationId: string, message: string, options?: { showProgress?: boolean; cancellable?: boolean; onCancel?: () => void }): void;
  hide(operationId: string): void;
  updateProgress(operationId: string, progress: number, message?: string): void;
}

interface NetworkStatus {
  isOnline: boolean;
  queueOperation(operation: () => Promise<unknown>, metadata: Record<string, unknown>): void;
}

// ========================================
// Error Handler Types
// ========================================

type ErrorContext = 'FIREBASE_SYNC' | 'FIREBASE_LOAD' | 'FILE_OPERATION' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN';

interface ErrorHandler {
  handle(error: Error | unknown, context?: ErrorContext, options?: { silent?: boolean }): void;
}

// ========================================
// Event Delegator Types
// ========================================

interface EventDelegator {
  on(eventType: string, selector: string, callback: (event: Event, target: HTMLElement) => void): void;
  off(eventType: string, selector?: string): void;
  destroy(): void;
}

// ========================================
// Sample Utils Types
// ========================================

interface SampleUtils {
  // Formatting
  formatPhoneNumber(value: string): string;
  setupPhoneNumberInput(input: HTMLInputElement): void;
  formatNumber(value: string | number): string;
  formatArea(value: string | number): string;
  getUnitLabel(unit: 'pyeong' | 'm2'): string;
  formatAreaWithUnit(area: string | number, unit: 'pyeong' | 'm2'): string;
  formatDate(date: Date | string): string;

  // View & Navigation
  createViewSwitcher(options: { views: NodeListOf<Element>; navItems: NodeListOf<Element>; onListView?: () => void }): (viewName: string) => void;
  setupNavigation(navItems: NodeListOf<Element>, switchView: (viewName: string) => void): void;

  // Year & Data
  createYearHandler(options: {
    storageKeyPrefix: string;
    loadYearData: (year: string) => void;
    FileAPI: FileAPIInstance;
    showToast?: (message: string, type?: ToastType) => void;
  }): { getStorageKey: (year: string) => string; setupYearSelect: (yearSelect: HTMLSelectElement, state: { selectedYear: string }) => void };
  safeParseJSON<T>(key: string, defaultValue?: T): T;
  safeSetJSON(key: string, data: unknown, options?: { onQuotaExceeded?: (usage: LocalStorageUsage) => void; showToast?: (message: string, type?: ToastType) => void }): boolean;
  getLocalStorageUsage(): LocalStorageUsage;
  migrateOldData(oldKey: string, newKey: string, log?: (...args: unknown[]) => void): unknown[];

  // Auto-save
  updateAutoSaveStatus(status: 'active' | 'inactive' | 'saving' | 'error' | 'pending' | 'syncing'): void;
  initAutoSave(options: AutoSaveInitOptions): Promise<void>;
  loadFromAutoSaveFile(FileAPI: FileAPIInstance, log?: (...args: unknown[]) => void): Promise<unknown[] | null>;
  performAutoSave(options: PerformAutoSaveOptions): Promise<boolean>;
  setupAutoSaveToggle(options: AutoSaveToggleOptions): void;
  setupAutoSaveFolderButton(options: AutoSaveFolderButtonOptions): void;

  // JSON save/load
  saveJSON(options: SaveJSONOptions): Promise<boolean>;
  mergeJSONData(currentData: unknown[], loadedData: unknown[], deduplicateById: boolean): unknown[];
  setupJSONLoadHandler(options: JSONLoadHandlerOptions): void;
  setupElectronLoadHandler(options: ElectronLoadHandlerOptions): void;
  setupJSONSaveHandler(options: JSONSaveHandlerOptions): void;

  // Utilities
  createLogger(debug: boolean): (...args: unknown[]) => void;
  setTodayDate(dateInput: HTMLInputElement): void;
  generateUUID(): string;
}

interface LocalStorageUsage {
  used: number;
  total: number;
  percent: number;
  usedMB: string;
  totalMB: string;
}

interface AutoSaveInitOptions {
  moduleKey: string;
  moduleName: string;
  FileAPI: FileAPIInstance;
  currentYear: string;
  log?: (...args: unknown[]) => void;
  showToast?: (message: string, type?: ToastType) => void;
}

interface PerformAutoSaveOptions {
  FileAPI: FileAPIInstance;
  moduleKey: string;
  data: unknown[];
  webFileHandle?: FileSystemFileHandle;
  log?: (...args: unknown[]) => void;
}

interface AutoSaveToggleOptions {
  moduleKey: string;
  FileAPI: FileAPIInstance;
  getWebFileHandle?: () => FileSystemFileHandle | null;
  setWebFileHandle?: (handle: FileSystemFileHandle | null) => void;
  autoSaveCallback?: () => Promise<void>;
  showToast?: (message: string, type?: ToastType) => void;
  log?: (...args: unknown[]) => void;
}

interface AutoSaveFolderButtonOptions {
  moduleKey: string;
  FileAPI: FileAPIInstance;
  selectedYear: string;
  getWebFileHandle?: () => FileSystemFileHandle | null;
  setWebFileHandle?: (handle: FileSystemFileHandle | null) => void;
  autoSaveCallback?: () => Promise<void>;
  showToast?: (message: string, type?: ToastType) => void;
}

interface SaveJSONOptions {
  sampleType: string;
  data: unknown[];
  FileAPI: FileAPIInstance;
  filePrefix: string;
  showToast?: (message: string, type?: ToastType) => void;
}

interface JSONLoadHandlerOptions {
  inputElement: HTMLInputElement;
  getData: () => unknown[];
  setData: (data: unknown[]) => void;
  saveData: () => void;
  renderData: () => void;
  showToast?: (message: string, type?: ToastType) => void;
  deduplicateById?: boolean;
}

interface ElectronLoadHandlerOptions {
  buttonElement: HTMLElement;
  FileAPI: FileAPIInstance;
  getData: () => unknown[];
  setData: (data: unknown[]) => void;
  saveData: () => void;
  renderData: () => void;
  showToast?: (message: string, type?: ToastType) => void;
  deduplicateById?: boolean;
}

interface JSONSaveHandlerOptions {
  buttonElement: HTMLElement;
  sampleType: string;
  getData: () => unknown[];
  FileAPI: FileAPIInstance;
  filePrefix: string;
  showToast?: (message: string, type?: ToastType) => void;
}

// ========================================
// Sync Utils Types
// ========================================

interface SyncUtils {
  smartMerge<T extends { id: string }>(localData: T[], firebaseData: T[]): T[];
}

// ========================================
// Pagination Manager Types
// ========================================

interface PaginationManagerOptions {
  storageKey?: string;
  defaultItemsPerPage?: number;
  onPageChange?: (page: number, pageData: unknown[]) => void;
  renderRow?: (item: unknown, index: number) => HTMLElement | null;
  getFilteredData?: () => unknown[];
}

interface PaginationManagerInstance {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  setData(data: unknown[]): void;
  setTableElements(tableBody: HTMLElement | null, emptyState: HTMLElement | null): void;
  goToPage(page: number): void;
  updatePagination(): void;
  reset(): void;
  getPageRange(): { start: number; end: number };
}

// ========================================
// Virtual List Manager Types
// ========================================

interface VirtualListManagerOptions {
  container: HTMLElement;
  rowHeight: number;
  overscan?: number;
  renderRow: (item: unknown, index: number) => HTMLElement;
}

interface VirtualListManager {
  setData(data: unknown[]): void;
  scrollToIndex(index: number): void;
  refresh(): void;
  destroy(): void;
}

// ========================================
// XLSX Types (SheetJS)
// ========================================

interface XLSXWorkbook {
  SheetNames: string[];
  Sheets: { [key: string]: XLSXWorksheet };
}

interface XLSXWorksheet {
  [cell: string]: unknown;
}

interface XLSX {
  utils: {
    book_new(): XLSXWorkbook;
    json_to_sheet(data: unknown[], opts?: unknown): XLSXWorksheet;
    book_append_sheet(workbook: XLSXWorkbook, worksheet: XLSXWorksheet, name: string): void;
    aoa_to_sheet(data: unknown[][]): XLSXWorksheet;
    sheet_to_json<T = unknown>(worksheet: XLSXWorksheet, opts?: { header?: number | string[] }): T[];
  };
  write(workbook: XLSXWorkbook, opts: { bookType: string; type: string }): ArrayBuffer;
  read(data: string | ArrayBuffer, opts?: { type?: string }): XLSXWorkbook;
}

// ========================================
// DOMPurify Types
// ========================================

interface DOMPurify {
  sanitize(dirty: string, config?: Record<string, unknown>): string;
}

// ========================================
// Timer Constants Types
// ========================================

interface TimerConstants {
  TOAST_DURATION: number;
  TOAST_FADE_OUT: number;
  DEBOUNCE_DELAY: number;
  AUTO_SAVE_DELAY: number;
}

// ========================================
// Storage Constants Types
// ========================================

interface StorageConstants {
  LOCAL_STORAGE_LIMIT_BYTES: number;
}

// ========================================
// File System Access API Types
// ========================================

interface FileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  abort(): Promise<void>;
  close(): Promise<void>;
}

interface ShowDirectoryPickerOptions {
  mode?: 'read' | 'readwrite';
}

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface ShowOpenFilePickerOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}

// ========================================
// Window Interface Extension
// ========================================

/** 주소 자동완성 선택 컨텍스트 (onSelect 콜백 2번째 인자) */
interface AddressAutocompleteSelectContext {
  source: 'juso' | 'local';
  zipNo?: string;
  roadAddr?: string;
  jibunAddr?: string;
  sido?: string;
  sigungu?: string;
  emd?: string;
  isMountain: boolean;
}

/** 주소 자동완성 bind 옵션 */
interface AddressAutocompleteBindOptions {
  regionKeys?: string[] | null;
  regionNames?: string[];
  enableJusoFallback?: boolean;
  getDefaultRegion?: () => string;
  onInput?: () => void;
  onSelect?: (value: string, ctx: AddressAutocompleteSelectContext) => void;
  onShowModal?: (result: unknown, input: HTMLInputElement) => void;
}

/** JUSO 자동완성 공통 모듈 (window.AddressAutocomplete) */
interface AddressAutocompleteApi {
  bind(input: HTMLInputElement | null, list: HTMLElement | null, options?: AddressAutocompleteBindOptions): void;
  clearAllJusoCache(): number;
  renderSuggestions(list: HTMLElement, suggestions: unknown[]): void;
  renderJusoSuggestions(list: HTMLElement, items: unknown[]): void;
  buildFullAddress(li: HTMLElement, currentInputValue: string): string;
  buildSelectContext(li: HTMLElement, currentInputValue: string): AddressAutocompleteSelectContext;
}

/** JUSO 검색 헬퍼 (window.JusoService) */
interface JusoServiceApi {
  search(keyword: string, options?: { page?: number; size?: number }): Promise<JusoSearchResult>;
}

interface Window {
  // Environment
  electronAPI?: ElectronAPI;
  isElectron: boolean;

  // Address (JUSO 자동완성 + 검색)
  AddressAutocomplete: AddressAutocompleteApi;
  JusoService?: JusoServiceApi;

  // MRL(농약 잔류허용기준) 인프라 (SAMPL-1-112 Phase 1)
  MrlApi?: MrlApiInstance;
  MrlSearch?: MrlSearchApi;
  MrlNameCanon?: MrlNameCanonApi;
  PsisParse?: PsisParseApi;
  PESTICIDE_NAME_MAP?: PesticideNameMapData;
  PesticideUseType?: PesticideUseTypeApi;
  PESTICIDE_USE_TYPE?: PesticideUseTypeApi;

  // Firebase
  firebaseConfig?: FirebaseConfigManager;
  firestoreDb?: FirestoreDb;
  firebaseInitialized?: boolean;
  firestoreInitialized?: boolean;
  firebaseDiagnostics?: FirebaseDiagnostics;
  FirebaseMigrationTool?: typeof FirebaseMigrationTool;
  runFirebaseMigration?: (options?: MigrationOptions) => Promise<MigrationAllResult>;

  // Storage
  storageManager?: StorageManager;

  // Analysis results (IndexedDB / Dexie)
  AnalysisDB?: {
    init(): Promise<void>;
    isReady(): boolean;
    getMap(type: string, year: string | number): Promise<Record<string, Record<string, unknown>>>;
    saveMap(type: string, year: string | number, map: Record<string, Record<string, unknown>>): Promise<void>;
    saveOne(type: string, year: string | number, sampleKey: string, fields: Record<string, unknown>): Promise<void>;
    deleteYear(type: string, year: string | number): Promise<void>;
    migrateFromLocalStorage(): Promise<{ migrated: number; scanned: number }>;
  };

  // Encryption
  encryptionManager?: EncryptionManager;
  CryptoUtils?: CryptoUtils;

  // File API
  createFileAPI?: (sampleType: string) => FileAPIInstance;
  selectWebAutoSaveFolder?: () => Promise<{ success: boolean; folderName?: string; error?: string }>;
  hasWebAutoSaveFolder?: () => boolean;
  getWebDirHandle?: () => FileSystemDirectoryHandle | null;
  saveLargeFile?: (content: string, fileName: string, options?: { signal?: AbortSignal }) => Promise<boolean>;

  // File System Access API
  showDirectoryPicker?: (options?: ShowDirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  showSaveFilePicker?: (options?: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (options?: ShowOpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;

  // UI Components
  showToast?: (message: string, type?: ToastType, durationOrOptions?: number | ToastOptions) => void;
  loadingManager?: LoadingManager;
  networkStatus?: NetworkStatus;
  ErrorHandler?: ErrorHandler;
  EventDelegator?: new (container: HTMLElement) => EventDelegator;

  // Sample Utils
  SampleUtils?: SampleUtils;
  SyncUtils?: SyncUtils;
  formatPhoneNumber?: (value: string) => string;

  // Managers
  PaginationManager?: new (options: PaginationManagerOptions) => PaginationManagerInstance;
  VirtualListManager?: new (options: VirtualListManagerOptions) => VirtualListManager;
  BaseSampleManager?: typeof BaseSampleManager;
  SoilSampleManager?: typeof SoilSampleManager;
  WaterSampleManager?: typeof WaterSampleManager;
  CompostSampleManager?: typeof CompostSampleManager;
  PesticideSampleManager?: typeof PesticideSampleManager;
  HeavyMetalSampleManager?: typeof HeavyMetalSampleManager;

  // External Libraries
  XLSX?: XLSX;
  DOMPurify?: DOMPurify;

  // Cache Manager
  CacheManager?: {
    checkAndAutoClean(): void;
    getCacheStatus(): {
      totalKeys: number;
      totalSizeMB: string;
      lastClear: {
        lastClear: Date | null;
      };
    };
    clearOldCache?(): void;
  };

  // Bonghwa Data (Address/Region)
  bonghwaData?: BonghwaData;
  bonghwaEupMyeonDong?: Record<string, string[]>;

  // Constants
  TIMER?: TimerConstants;
  STORAGE?: StorageConstants;
  DEBUG?: boolean;

  // Logger
  logger?: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };

  // Global functions exposed by modules
  loadFromAutoSaveFile?: () => Promise<unknown[] | null>;

  // Pesticide data (exposed by pesticide-data.ts)
  PESTICIDE_ANALYSIS_DATA?: import('../shared/pesticide-data').PesticideDataItem[];
  getPesticidesByMethod?: (method: string) => import('../shared/pesticide-data').PesticideDataItem[];
  searchPesticides?: (query: string, method?: string, limit?: number) => import('../shared/pesticide-data').PesticideDataItem[];
  getPesticideStats?: () => import('../shared/pesticide-data').PesticideStats;
  QUALITATIVE_PESTICIDES?: Set<string>;
  isQualitativePesticide?: (name: string) => boolean;

  // Allow dynamic property access
  [key: string]: unknown;
}

// ========================================
// Bonghwa Data Types
// ========================================

interface BonghwaRegion {
  name: string;
  villages?: string[];
  lots?: string[];
}

interface BonghwaData {
  regions: Record<string, BonghwaRegion>;
  getRegions(): string[];
  getVillages(region: string): string[];
  getLots(region: string, village: string): string[];
}

// ========================================
// Base Sample Manager Type
// ========================================

declare class BaseSampleManager {
  constructor(config: BaseSampleManagerConfig);

  // Config
  moduleKey: string;
  moduleName: string;
  storageKey: string;
  sampleType: string;
  autoSaveFile: string;
  debug: boolean;

  // State
  sampleLogs: unknown[];
  selectedYear: string;
  editingId: string | null;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  isCloudSyncing: boolean;
  cloudSyncPromise: Promise<void> | null;
  listViewStale: boolean;

  // DOM References
  form: HTMLFormElement | null;
  tableBody: HTMLElement | null;
  emptyState: HTMLElement | null;
  recordCountEl: HTMLElement | null;

  // File API
  FileAPI?: FileAPIInstance;

  // Pagination
  pagination: PaginationManagerInstance | null;

  // Methods
  init(): Promise<void>;
  initFirebase(): Promise<void>;
  initAutoSave(): Promise<void>;
  initUI(): void;
  initViews(): void;
  initPagination(): void;

  getCurrentYear(): number;
  getStorageKey(year: string): string;
  findYearWithData(): string;
  syncYearSelects(newYear: string): void;
  onYearChange(newYear: string): void;

  saveLogs(): Promise<void>;
  deleteSample(id: string): Promise<void>;
  loadYearData(year: string): Promise<void>;
  syncWithCloud(year: string, localLogs: unknown[]): Promise<void>;
  loadFromFirebase(year: string): Promise<{ data: unknown[]; fromCache: boolean }>;
  smartMerge<T>(localData: T[], firebaseData: T[], options?: { allowDeletions?: boolean }): T[];
  hasChanges(data1: unknown, data2: unknown): boolean;

  triggerAutoSave(): void;
  performAutoSave(): Promise<void>;
  hashData(data: unknown): string;

  cacheElements(): void;
  setupTableEventDelegation(): void;
  destroy(): void;
  switchView(viewName: string): void;
  updateRecordCount(): void;
  showToast(message: string, type?: ToastType): void;

  setupEventListeners(): void;
  setupNavigation(): void;
  setupFormEvents(): void;
  setupYearSelection(): void;
  setupPhoneFormatting(): void;
  setupReceptionMethod(): void;

  generateId(): string;
  log(...args: unknown[]): void;

  // Abstract methods (to be overridden by subclasses)
  filterAndRenderLogs(): void;
  renderLogs(logs: unknown[]): void;
  submitForm(): void;
  editSample(id: string): void;
  resetForm(): void;
  buildTableRow(item: unknown, index: number): HTMLElement | null;
  prepareDataForRender(logs: unknown[]): unknown[];
  getAdditionalMigrations(): Array<(logs: unknown[]) => unknown[] | void>;
  migrateCompletedField(logs: unknown[]): unknown[];
  handleHashChange(): void;
  setupTypeSpecificEvents(): void;
  onPageChange(page: number, pageData: unknown[]): void;
  onAfterLoad(data: unknown[], year: string): unknown[];
  onBeforeSave(data: unknown[]): unknown[];
  onAfterSave(data: unknown[]): void;

  // Static methods
  static buildResultTable(tableBody: HTMLElement, rows: Array<{ label: string; value: string; isMultiline?: boolean }>): void;
}

interface BaseSampleManagerConfig {
  moduleKey: string;
  moduleName: string;
  storageKey: string;
  sampleType?: string;
  autoSaveFile?: string;
  debug?: boolean;
}

// ========================================
// Soil-Specific Types
// ========================================

interface SoilCrop {
  name: string;
  area: string;
  code?: string;
  unit?: 'pyeong' | 'm2';
  subLotTarget?: string;
}

interface SoilSubLot {
  lotAddress: string;
  crops?: SoilCrop[];
}

interface SoilParcel {
  id: string;
  lotAddress: string;
  isMountain: boolean;
  subLots: (string | SoilSubLot)[];
  crops: SoilCrop[];
  category: string;
  purpose: string;
  note: string;
}

interface SoilLog {
  id: string;
  receptionNumber: string;
  date: string;
  name: string;
  phoneNumber: string;
  address: string;
  subCategory: string;
  purpose: string;
  receptionMethod: string;
  note: string;
  groupId?: string;
  parcelIndex?: number;
  totalParcels?: number;
  parcels: SoilParcel[];
  lotAddress?: string;
  area?: string;
  cropsDisplay?: string;
  isComplete?: boolean;
  completed?: boolean;
  isCompleted?: boolean;
  mailDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface SoilFlatRow {
  logId: string;
  log: SoilLog;
  parcel: SoilParcel;
  parcelIndex: number;
  subLot?: string | SoilSubLot;
  subLotIndex?: number;
  receptionNumber: string;
  lotAddress: string;
  cropsDisplay: string;
  totalArea: number;
}

interface SoilSearchFilter {
  dateFrom: string;
  dateTo: string;
  name: string;
  receptionFrom: string;
  receptionTo: string;
  lot: string;
  purpose: string;
  completed: 'all' | 'completed' | 'incomplete' | '';
}

interface RegionSelectionModalData {
  result: ParsedParcelAddress;
  parcelId: string;
  inputElement: HTMLInputElement;
}

interface ParsedParcelAddress {
  villageName?: string;
  village?: string;
  district?: string;
  region?: string;
  regionKey?: string;
  lotNumber?: string;
  fullAddress?: string;
  isDuplicate?: boolean;
  alternatives?: string[];
  locations?: Array<{
    fullAddress: string;
    region: string;
    district: string;
  }>;
}

interface AddressSuggestion {
  village: string;
  district: string;
  regionKey: string;
  region?: string;
  isMountain: boolean;
  displayText: string;
}

interface SoilStatistics {
  total: number;
  completed: number;
  pending: number;
  bySubCategory: Record<string, StatItem>;
  byPurpose: Record<string, StatItem>;
  byMonth: Record<string, MonthStatItem>;
  byQuarter: Record<string, QuarterStatItem>;
  byReceptionMethod: Record<string, StatItem>;
}

interface StatItem {
  count: number;
  label: string;
  class: string;
}

interface MonthStatItem extends StatItem {
  completed: number;
  pending: number;
}

interface QuarterStatItem {
  count: number;
  completed: number;
  pending: number;
  label: string;
}

// ========================================
// Sample Manager Subclass Type Augmentation
// ========================================

// Note: These are type augmentations for classes defined in JS files.
// The actual class definitions are in the respective module scripts.

interface SoilSampleManagerMembers {
  // Soil-specific state
  parcels: SoilParcel[];
  parcelIdCounter: number;
  currentRegistrationData: SoilLog | null;
  listViewStale: boolean;
  currentSearchFilter: SoilSearchFilter;
  isFullView: boolean;
  autoSaveFileHandle: FileSystemFileHandle | null;
  regionSelectionModalData: RegionSelectionModalData | null;
  editingLogId: string | null;
  pendingMailDateIds: string[];
  currentFlatRows: SoilFlatRow[];

  // Modal state
  currentParcelIdForCrop: string | null;
  tempCropAreas: SoilCrop[];
  currentSubLotParcelId: string | null;
  currentSubLotIndex: number | null;
  tempSelectedCrops: SoilCrop[];
  confirmedCrops: SoilCrop[];

  // DOM refs
  dateInput: HTMLInputElement | null;
  parcelsContainer: HTMLElement | null;
  addParcelBtn: HTMLButtonElement | null;
  parcelsDataInput: HTMLInputElement | null;
  emptyParcels: HTMLElement | null;
  paginationContainer: HTMLElement | null;
  receptionNumberInput: HTMLInputElement | null;
  subCategorySelect: HTMLSelectElement | null;
  purposeSelect: HTMLSelectElement | null;
  receptionMethodBtns: NodeListOf<HTMLButtonElement> | null;
  receptionMethodInput: HTMLInputElement | null;
  navSubmitBtn: HTMLButtonElement | null;
  navResetBtn: HTMLButtonElement | null;
  selectAllCheckbox: HTMLInputElement | null;
  logTable: HTMLTableElement | null;
  listViewTitle: HTMLElement | null;
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
  addressManager: unknown;
  cropAreaModal: HTMLElement | null;
  cropAreaList: HTMLElement | null;
  addCropAreaBtn: HTMLButtonElement | null;
  confirmCropAreaBtn: HTMLButtonElement | null;
  cancelCropAreaBtn: HTMLButtonElement | null;
  closeCropAreaModalBtn: HTMLButtonElement | null;
  registrationResultModal: HTMLElement | null;
  resultTableBody: HTMLTableSectionElement | null;
  listSearchModal: HTMLElement | null;
  statisticsModal: HTMLElement | null;
  mailDateModal: HTMLElement | null;
  regionSelectionModal: HTMLElement | null;

  // Utility functions
  formatArea: ((value: string | number) => string) | undefined;
  getUnitLabel: ((unit: string) => string) | undefined;
  formatAreaWithUnit: ((value: string | number, unit?: string) => string) | undefined;

  // Parcel methods
  addParcel(): void;
  removeParcel(parcelId: string): void;
  updateEmptyParcelsState(): void;
  updateParcelNumbers(): void;
  updateParcelsData(): void;
  updateAllParcelNumbers(): void;
  updateParcelCardsMode(isFillMode: boolean): void;
  renderParcelCard(parcel: SoilParcel, index: number): void;
  bindParcelSelects(parcelId: string): void;
  bindAreaUnitConversion(parcelId: string): void;
  bindLotAddressAutocomplete(parcelId: string): void;
  bindSubLotAutocomplete(parcelId: string): void;
  bindDirectCropAutocomplete(parcelId: string): void;
  updateParcelLotAddress(parcelId: string): void;
  updateFirstCrop(parcelId: string): void;
  renderParcelSummary(parcel: SoilParcel): string;
  updateParcelSummary(parcelId: string): void;
  updateSubLotsDisplay(parcelId: string): void;
  updateCropsAreaDisplay(parcelId: string): void;
  getSubLotLabel(subLotTarget: string | undefined, parcel: SoilParcel): string;

  // Crop modal methods
  openCropAreaModal(parcelId: string): void;
  getSubLotOptions(parcelId: string): Array<{ value: string; label: string }>;
  closeCropAreaModalFn(): void;
  renderCropAreaModal(): void;
  bindAutocompleteEvents(): void;
  openSubLotCropModal(parcelId: string, subLotIndex: number): void;
  confirmCropArea(): void;

  // Form methods
  submitForm(): void;
  editSample(id: string): void;
  cancelEditMode(): void;
  resetForm(): void;
  populateFormForEdit(log: SoilLog): void;

  // Reception number methods
  generateNextReceptionNumber(): string;
  generateNextFillReceptionNumber(): string;
  getReceptionNumber(): string;

  // Search/filter methods
  extractReceptionNumber(receptionNumber: string): number;
  filterAndRenderLogs(): void;
  updateSearchButtonState(): void;

  // Statistics methods
  calculateStatistics(): SoilStatistics;
  openStatisticsModal(): void;
  renderBarChart(containerId: string, data: Record<string, StatItem>, prefix: string): void;
  renderMonthlyChart(containerId: string, data: Record<string, MonthStatItem>): void;
  renderQuarterlySummary(containerId: string, data: Record<string, QuarterStatItem>): void;

  // Selection methods
  updateSelectAllState(): void;
  updateSelectedCount(): void;
  getSelectedIds(): string[];
  selectByName(name: string): void;

  // Label print methods
  openLabelPrintWithData(logs: SoilLog[]): void;

  // Registration result methods
  showRegistrationResult(logData: SoilLog): void;
  closeRegistrationResultModal(): void;

  // Region selection methods
  showRegionSelectionModal(parseResult: ParsedParcelAddress, parcelId: string, inputElement: HTMLInputElement): void;
  selectRegion(index: number): void;
  closeRegionSelectionModal(): void;

  // Data methods
  flattenLogsForTable(logs: SoilLog[]): SoilFlatRow[];
  renderCurrentPage(): void;
  updateListViewTitle(): void;
  updatePaginationUI(): void;
}

// Note: Sample manager classes are defined as JS classes extending BaseSampleManager
// These interface definitions provide type information for their members

// ========================================
// Module Declarations for External Libraries
// ========================================

declare module 'firebase/compat/app' {
  const firebase: unknown;
  export default firebase;
}

declare module 'firebase/compat/firestore' {}

// ========================================
// Global Declarations
// ========================================

declare const isElectron: boolean;
declare function showToast(message: string, type?: ToastType): void;

// Sanitization functions
declare function escapeHTML(str: string): string;
declare function sanitizeHTML(html: string): string;

// Address parsing functions
declare function parseParcelAddress(value: string): ParsedParcelAddress | null;
declare function suggestRegionVillages(
  value: string,
  regions: string[],
  includeMountain?: boolean
): AddressSuggestion[];
declare function parseAddressParts(address: string): {
  sido?: string;
  sigungu?: string;
  eupmyeondong?: string;
  rest?: string;
};

// Crop data
declare const CROP_DATA: Array<{ name: string; code: string; category: string }>;
declare const CROP_CATEGORIES: string[];
