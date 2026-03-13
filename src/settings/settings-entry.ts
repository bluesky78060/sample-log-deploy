/**
 * @fileoverview Settings page entry point - TypeScript version
 * @description Module imports and initialization for settings page
 */

// npm packages
import DOMPurify from 'dompurify';
(window as unknown as { DOMPurify: typeof DOMPurify }).DOMPurify = DOMPurify;

// Shared modules (order matters - window.* global setup)
import '../shared/logger.ts';
import '../shared/error-handler.ts';
import '../shared/network-status.ts';
import '../shared/loading-manager.ts';
import '../shared/network-config.ts';
import '../shared/network-access.ts';
import '../shared/firebase-config.ts';
import '../shared/firebase-diagnostics.ts';
// Encryption modules (test only - load before firestore-db)
import '../shared/crypto-utils.ts';
import '../shared/encryption-manager.ts';
import '../shared/firestore-db.ts';
import '../shared/storage-manager.ts';
import '../shared/sanitize.ts';
import '../shared/toast.ts';
import '../shared/theme.ts';
import '../shared/cache-manager.ts';

// Main script
import * as SettingsScript from './settings-script';

// Make functions globally available for HTML onclick handlers
declare global {
  interface Window {
    toggleManualSettings: typeof SettingsScript.toggleManualSettings;
    parseQuickSetup: typeof SettingsScript.parseQuickSetup;
  }
}

// Assign to window with side-effect to prevent tree-shaking
(window as any).toggleManualSettings = SettingsScript.toggleManualSettings;
(window as any).parseQuickSetup = SettingsScript.parseQuickSetup;

// Keep functions alive
if (false) {
  SettingsScript.toggleManualSettings();
  SettingsScript.parseQuickSetup();
}

// ========================================
// Page Initialization
// ========================================

/**
 * Initialize settings page
 */
async function initSettingsPage(): Promise<void> {
  (window.logger?.debug || console.log)('[Settings] Initializing settings page...');

  // Initialize encryption manager silently (no modal)
  if ((window as any).encryptionManager?.initSilent) {
    try {
      await (window as any).encryptionManager.initSilent();
      (window.logger?.debug || console.log)('[Settings] Encryption manager initialized');
    } catch (err) {
      (window.logger?.warn || console.warn)('[Settings] Encryption manager init failed:', err);
    }
  }

  // Show password prompt
  const passwordVerified = await SettingsScript.showSettingsPasswordPrompt();

  if (!passwordVerified) {
    (window.logger?.error || console.error)('[Settings] Password verification failed - redirecting to main page');
    window.location.href = '../index.html';
    return;
  }

  (window.logger?.debug || console.log)('[Settings] Password verified, loading settings...');

  // Check auth file status first
  await SettingsScript.checkAuthFileStatus();

  // Load saved Firebase config
  SettingsScript.loadSavedConfig();

  // Load organization name
  SettingsScript.loadOrgName();

  // Initialize Firebase if auth file exists
  if ((window as any).firebaseConfig?.initialize) {
    try {
      const initialized = await (window as any).firebaseConfig.initialize();
      (window.logger?.debug || console.log)('[Settings] Firebase initialization result:', initialized);
    } catch (err) {
      (window.logger?.warn || console.warn)('[Settings] Firebase initialization failed:', err);
    }
  }

  // Initialize storage manager (always, regardless of Firebase status)
  if ((window as any).storageManager?.init) {
    try {
      await (window as any).storageManager.init();
      (window.logger?.debug || console.log)('[Settings] Storage manager initialized');
    } catch (err) {
      (window.logger?.warn || console.warn)('[Settings] Storage manager init failed:', err);
    }
  }

  // Initialize UI components
  await Promise.all([
    SettingsScript.initStorageModeUI(),
    SettingsScript.updateEncryptionStatusUI(),
    SettingsScript.initNetworkAccessUI(),
    SettingsScript.updateCacheStatusUI(),
  ]);

  // Update UI after all initialization
  SettingsScript.updateConnectionStatus();

  (window.logger?.debug || console.log)('[Settings] Settings page initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  initSettingsPage();
}
