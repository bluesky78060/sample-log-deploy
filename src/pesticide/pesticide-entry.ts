// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';

// Assign to window (types already declared in globals.d.ts)
window.XLSX = XLSX as any;
window.DOMPurify = DOMPurify as any;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.ts';
import '../shared/constants.ts';
import '../shared/file-api.ts';
import '../shared/utils.ts';
import '../shared/toast.ts';
import '../shared/pagination.ts';
import '../shared/juso-service.ts';
import '../shared/address.ts';
import '../shared/address-parser.ts';
import '../shared/autocomplete-manager.ts';
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
import '../cropData.ts';
import '../bonghwaData.ts';

// MRL(농약 잔류허용기준) 인프라 (SAMPL-1-112 Phase 1)
// 의존성 순서대로 side-effect import — window.* 전역 설정 순서 보장.
// (name-map → use-type → name-canon → search → psis-parse → api)
// 누락 시 window.MrlApi 등이 undefined 가 되어 기능이 죽는다. PesticideSampleManager 보다 앞.
import '../shared/pesticide-name-map.ts';
import '../shared/pesticide-use-type.ts';
import '../shared/mrl-name-canon.ts';
import '../shared/mrl-search.ts';
import '../shared/psis-parse.ts';
import '../shared/mrl-api.ts';

// Pesticide-specific modules
import './PesticideSampleManager';

// Main script
import './pesticide-script';
