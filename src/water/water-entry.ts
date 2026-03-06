// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';

// Type-safe window assignments
(window as Window & typeof globalThis & { XLSX: typeof XLSX }).XLSX = XLSX;
(window as Window & typeof globalThis & { DOMPurify: typeof DOMPurify }).DOMPurify = DOMPurify;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.ts';
import '../shared/constants.ts';
import '../shared/file-api.ts';
import '../shared/utils.ts';
import '../shared/toast.ts';
import '../shared/pagination.ts';
import '../shared/address.ts';
import '../shared/address-parser.ts';
import '../shared/search-filter.ts';
import '../shared/form-validator.ts';
import '../shared/theme.ts';
import '../shared/tooltip.ts';
import '../shared/logger.ts';
import '../shared/error-handler.ts';
import '../shared/network-status.ts';
import '../shared/loading-manager.ts';
import '../shared/network-config.ts';
import '../shared/network-access.ts';
import '../shared/firebase-config.ts';
import '../shared/firebase-diagnostics.ts';
// 암호화 모듈 (테스트 전용 - firestore-db 이전에 로드)
import '../shared/crypto-utils.ts';
import '../shared/encryption-manager.ts';
import '../shared/firestore-db.ts';
import '../shared/storage-manager.ts';
import '../shared/sync-utils.ts';
import '../shared/VirtualListManager.ts';
import '../shared/BaseSampleManager.ts';
import '../shared/excel-import-manager.ts';

// Data
import '../bonghwaData.ts';

// Main script
import './water-script';
