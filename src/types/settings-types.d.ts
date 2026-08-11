/**
 * @fileoverview Settings Module Type Definitions
 * @description Types for Firebase settings, encryption, migration, and storage mode management
 */

// ========================================
// Sample Type Configuration
// ========================================

/**
 * Sample type configuration for settings
 */
interface SampleTypeConfig {
  key: string;
  name: string;
  icon: string;
  storagePrefix: string;
}

/**
 * File type mapping (key -> file name key)
 */
interface FileTypeMap {
  soil: string;
  water: string;
  pesticide: string;
  compost: string;
  heavyMetal: string;
  [key: string]: string;
}

// ========================================
// Firebase Configuration Types
// ========================================

/**
 * Firebase configuration object
 */
interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

/**
 * Firebase config manager interface (extended for settings)
 */
interface FirebaseConfigManagerExtended extends FirebaseConfigManager {
  saveConfig?(config: FirebaseConfig): void;
  resetConfig?(): void;
  reinitialize?(): Promise<boolean>;
}

// ========================================
// Migration Types
// ========================================

/**
 * Migration scan result for encryption/decryption
 */
interface MigrationScanResult {
  source: 'firebase' | 'autosave' | 'webAutosave' | 'localStorage';
  type: string;
  typeName: string;
  typeIcon: string;
  year: number;
  plaintextCount: number;
  encryptedCount: number;
  totalCount?: number;
  // Firebase-specific
  collectionName?: string;
  // Autosave-specific
  filePath?: string;
  fileName?: string;
  // localStorage-specific
  storageKey?: string;
  // Decryption status
  status?: 'encrypted' | 'plaintext';
}

/**
 * Migration progress state
 */
interface MigrationProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'idle' | 'scanning' | 'processing' | 'completed' | 'error';
  message: string;
}

// ========================================
// Storage Mode Types
// ========================================

/**
 * Storage mode labels for UI
 */
interface StorageModeLabels {
  local: string;
  cloud: string;
  cloudOnly: string;
  [key: string]: string;
}

// ========================================
// Network Access Types
// ========================================

/**
 * Network access check result
 */
interface NetworkAccessCheckResult {
  allowed: boolean;
  reason: string;
  needsSetup?: boolean;
}

/**
 * Network access manager interface
 */
interface NetworkAccessManager {
  getAllowedGateway(): string | null;
  saveGateway(ip: string): void;
  removeGateway(): void;
  getCurrentIP(): Promise<string | null>;
  checkAccess(): Promise<NetworkAccessCheckResult>;
}

// ========================================
// Cache Status Types
// ========================================

/**
 * Cache status information
 */
interface CacheStatus {
  totalKeys: number;
  totalSizeMB: string;
  lastClear: {
    lastClear: Date | null;
  };
}

/**
 * Cache manager interface (extended for settings)
 */
interface CacheManagerExtended {
  getCacheStatus(): CacheStatus;
  clearCache(includeSettings?: boolean): void;
}

// ========================================
// Encryption Manager Types (Extended)
// ========================================

/**
 * Extended encryption manager for settings page
 */
interface EncryptionManagerExtended extends EncryptionManager {
  initSilent?(): Promise<boolean>;
  verifyPassword?(password: string): Promise<boolean>;
  checkRecoveryBlobExists?(): Promise<boolean>;
  recoverPassword?(): Promise<{ success: boolean; error?: string }>;
  regenerateRecoveryKey?(): Promise<{ success: boolean; message?: string }>;
  reset?(): void;
}

// ========================================
// Crypto Utils Types (Extended)
// ========================================

/**
 * Extended crypto utils for settings page
 */
interface CryptoUtilsExtended extends CryptoUtils {
  createPasswordRulesHTML?(prefix: string): string;
  bindPasswordValidation?(options: PasswordValidationOptions): void;
  SENSITIVE_FIELDS?: string[];
}

/**
 * Password validation binding options
 */
interface PasswordValidationOptions {
  prefix: string;
  input: HTMLInputElement;
  submitBtn: HTMLButtonElement;
  submitColor?: string;
  verifyMode?: boolean;
}

// ========================================
// Firebase Diagnostics Types
// ========================================

/**
 * Firebase diagnostic check result
 */
interface DiagnosticCheck {
  passed: boolean;
  message: string;
}

/**
 * Firebase diagnostic recommendation
 */
interface DiagnosticRecommendation {
  priority: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Firebase diagnostics result
 */
interface FirebaseDiagnosticsResult {
  overallStatus: 'ok' | 'warning' | 'error';
  checks: Record<string, DiagnosticCheck>;
  recommendations: DiagnosticRecommendation[];
}

/**
 * Firebase diagnostics manager
 */
interface FirebaseDiagnosticsManager {
  diagnose(): Promise<FirebaseDiagnosticsResult>;
  attemptAutoRecovery(): Promise<{ success: boolean; message: string }>;
}

// ========================================
// DOM Element Types for Settings
// ========================================

/**
 * Settings page DOM elements
 */
interface SettingsElements {
  // Auth file elements
  authFileStatus: HTMLElement | null;
  authFileUploadArea: HTMLElement | null;
  authFileInfo: HTMLElement | null;
  authFileProjectId: HTMLElement | null;
  selectAuthFileBtn: HTMLButtonElement | null;
  deleteAuthFileBtn: HTMLButtonElement | null;
  authFileInput: HTMLInputElement | null;

  // Firebase form elements
  apiKey: HTMLInputElement | null;
  projectId: HTMLInputElement | null;
  authDomain: HTMLInputElement | null;
  storageBucket: HTMLInputElement | null;
  messagingSenderId: HTMLInputElement | null;
  appId: HTMLInputElement | null;
  firebaseForm: HTMLFormElement | null;
  connectionStatus: HTMLElement | null;
  testConnectionBtn: HTMLButtonElement | null;

  // Migration elements
  migrationList: HTMLElement | null;
  migrateAllBtn: HTMLButtonElement | null;

  // Cache elements
  cacheDataCount: HTMLElement | null;
  cacheDataSize: HTMLElement | null;
  lastCacheClear: HTMLElement | null;
  clearCacheBtn: HTMLButtonElement | null;
  refreshCacheStatusBtn: HTMLButtonElement | null;

  // Network access elements
  networkAccessStatus: HTMLElement | null;
  currentEnvironment: HTMLElement | null;
  allowedGateway: HTMLElement | null;
  currentPublicIP: HTMLElement | null;
  currentAccessStatus: HTMLElement | null;
  gatewayIPEdit: HTMLInputElement | null;
  saveGatewayBtn: HTMLButtonElement | null;
  deleteGatewayBtn: HTMLButtonElement | null;
  gatewaySaveStatus: HTMLElement | null;
  checkNetworkBtn: HTMLButtonElement | null;

  // Organization name elements
  orgName: HTMLInputElement | null;
  saveOrgNameBtn: HTMLButtonElement | null;
  resetOrgNameBtn: HTMLButtonElement | null;
  orgNameSaveStatus: HTMLElement | null;

  // Storage mode elements
  storageModeStatus: HTMLElement | null;

  // Encryption elements
  encryptionStatus: HTMLElement | null;
  encStatusText: HTMLElement | null;
  encKeySourceText: HTMLElement | null;
  encInactiveActions: HTMLElement | null;
  encActiveActions: HTMLElement | null;
  encMigrationSection: HTMLElement | null;
  decMigrationSection: HTMLElement | null;
  encEnterPwBtn: HTMLButtonElement | null;
  encChangePwBtn: HTMLButtonElement | null;
  encRecoverBtn: HTMLButtonElement | null;
  encRegenRecoveryBtn: HTMLButtonElement | null;
  encExportKeyBtn: HTMLButtonElement | null;
  encImportKeyBtn: HTMLButtonElement | null;
  encImportKeyBtnInactive: HTMLButtonElement | null;

  // Encryption migration elements
  encMigrationStatus: HTMLElement | null;
  encMigrationList: HTMLElement | null;
  encMigrationProgress: HTMLElement | null;
  encMigrationProgressBar: HTMLElement | null;
  encMigrationProgressText: HTMLElement | null;
  scanPlaintextBtn: HTMLButtonElement | null;
  encryptAllBtn: HTMLButtonElement | null;

  // Decryption migration elements
  decMigrationStatus: HTMLElement | null;
  decMigrationList: HTMLElement | null;
  decMigrationProgress: HTMLElement | null;
  decMigrationProgressBar: HTMLElement | null;
  decMigrationProgressText: HTMLElement | null;
  scanEncryptedBtn: HTMLButtonElement | null;
  decryptAllBtn: HTMLButtonElement | null;

  // Lock overlay
  settingsLockOverlay: HTMLElement | null;
  settingsContent: HTMLElement | null;

  // Export/import
  exportAllBtn: HTMLButtonElement | null;

  // Manual settings toggle
  manualSettingsContent: HTMLElement | null;
  manualSettingsToggle: HTMLElement | null;
}

// ========================================
// Window Extensions for Settings
// ========================================

declare global {
  interface Window {
    // Firebase config extension
    firebaseConfig?: FirebaseConfigManagerExtended;

    // Network access
    NetworkAccess?: NetworkAccessManager;

    // Cache manager extension
    CacheManager?: CacheManagerExtended;

    // Encryption manager extension
    encryptionManager?: EncryptionManagerExtended;

    // Crypto utils extension
    CryptoUtils?: CryptoUtilsExtended;

    // Firebase diagnostics
    firebaseDiagnostics?: FirebaseDiagnosticsManager;

    // Web directory handle for File System Access API
    getWebDirHandle?: () => FileSystemDirectoryHandle | null;

    // Global diagnostic functions
    runFirebaseDiagnostics?: () => Promise<FirebaseDiagnosticsResult>;
    reconnectFirebase?: () => Promise<{ success: boolean; message: string }>;

    // Firebase Firestore namespace (for FieldValue.delete())
    firebase?: {
      firestore: {
        FieldValue: {
          delete(): unknown;
          serverTimestamp(): unknown;
        };
      };
    };
  }
}

// ========================================
// Export Types
// ========================================

export type {
  SampleTypeConfig,
  FileTypeMap,
  FirebaseConfig,
  FirebaseConfigManagerExtended,
  MigrationScanResult,
  MigrationProgress,
  StorageModeLabels,
  NetworkAccessCheckResult,
  NetworkAccessManager,
  CacheStatus,
  CacheManagerExtended,
  EncryptionManagerExtended,
  CryptoUtilsExtended,
  PasswordValidationOptions,
  DiagnosticCheck,
  DiagnosticRecommendation,
  FirebaseDiagnosticsResult,
  FirebaseDiagnosticsManager,
  SettingsElements,
};
