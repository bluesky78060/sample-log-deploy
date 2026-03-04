/**
 * @fileoverview Settings page entry point - TypeScript version
 * @description Module imports and initialization for settings page
 */

// npm packages
import DOMPurify from 'dompurify';
(window as unknown as { DOMPurify: typeof DOMPurify }).DOMPurify = DOMPurify;

// Shared modules (order matters - window.* global setup)
import '../shared/logger.js';
import '../shared/error-handler.js';
import '../shared/network-status.js';
import '../shared/loading-manager.js';
import '../shared/network-config.js';
import '../shared/network-access.js';
import '../shared/firebase-config.js';
import '../shared/firebase-diagnostics.js';
// Encryption modules (test only - load before firestore-db)
import '../shared/crypto-utils.js';
import '../shared/encryption-manager.js';
import '../shared/firestore-db.js';
import '../shared/storage-manager.js';
import '../shared/sanitize.js';
import '../shared/toast.js';
import '../shared/theme.js';
import '../shared/cache-manager.js';

// Main script
import './settings-script.js';
