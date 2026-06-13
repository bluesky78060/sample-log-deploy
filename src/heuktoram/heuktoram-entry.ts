// npm packages
import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
(window as Window & { XLSX?: typeof XLSX; JSZip?: typeof JSZip }).XLSX = XLSX;
(window as Window & { XLSX?: typeof XLSX; JSZip?: typeof JSZip }).JSZip = JSZip;

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
import '../shared/analysis-db';

// 결과 가져오기 모달 (Phase 1.5: 파일 + 텍스트)
import './heuktoram-result-importer.js';

// Main script
import './heuktoram-script';
