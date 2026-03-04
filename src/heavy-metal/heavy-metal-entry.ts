// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
(window as any).XLSX = XLSX;
(window as any).DOMPurify = DOMPurify;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.js';
import '../shared/constants.js';
import '../shared/file-api.js';
import '../shared/utils.js';
import '../shared/toast.js';
import '../shared/pagination.js';
import '../shared/address.js';
import '../shared/address-parser.js';
import '../shared/search-filter.js';
import '../shared/form-validator.js';
import '../shared/theme.js';
import '../shared/tooltip.js';
import '../shared/logger.js';
import '../shared/error-handler.js';
import '../shared/network-status.js';
import '../shared/loading-manager.js';
import '../shared/network-config.js';
import '../shared/network-access.js';
import '../shared/firebase-config.js';
import '../shared/firebase-diagnostics.js';
// 암호화 모듈 (테스트 전용 - firestore-db 이전에 로드)
import '../shared/crypto-utils.js';
import '../shared/encryption-manager.js';
import '../shared/firestore-db.js';
import '../shared/storage-manager.js';
import '../shared/sync-utils.js';
import '../shared/VirtualListManager.js';
import '../shared/BaseSampleManager.js';
import '../shared/excel-import-manager.js';

// Data
import '../cropData.js';
import '../bonghwaData.js';

// Main script
import './heavy-metal-script.js';
