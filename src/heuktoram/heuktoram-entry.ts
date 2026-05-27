// npm packages
import * as XLSX from 'xlsx-js-style';
(window as Window & { XLSX?: typeof XLSX }).XLSX = XLSX;

// Shared modules
import '../shared/sanitize';
import '../bonghwaData';
import '../shared/constants';
import '../shared/utils';
import '../shared/toast';
import '../shared/address';
import '../shared/address-parser';
import '../shared/theme';
import '../shared/tooltip';
import '../shared/logger';

// 결과 가져오기 모달 (Phase 1.5: 파일 + 텍스트)
import './heuktoram-result-importer.js';

// Main script
import './heuktoram-script';
