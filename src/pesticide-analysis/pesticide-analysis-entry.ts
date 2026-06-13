// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';

// Assign to window (types already declared in globals.d.ts)
window.XLSX = XLSX as any;
window.DOMPurify = DOMPurify as any;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.ts';
import '../shared/constants.ts';
import '../shared/utils.ts';
import '../shared/toast.ts';
import '../shared/theme.ts';
import '../shared/tooltip.ts';
import '../shared/logger.ts';
import '../shared/firebase-config.ts';
import '../shared/firestore-db.ts';
import '../shared/analysis-db.ts';

// Main script
import './pesticide-analysis-script';
