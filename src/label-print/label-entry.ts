// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';

// Assign to window (types already declared in globals.d.ts)
(window as any).XLSX = XLSX;
(window as any).DOMPurify = DOMPurify;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.js';
import '../shared/theme.js';
import '../shared/logger.js';
import '../shared/error-handler.js';
import '../shared/network-status.js';
import '../shared/loading-manager.js';

// Main script
import './label-app.ts';
