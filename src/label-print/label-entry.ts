// npm packages
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';

// Assign to window (types already declared in globals.d.ts)
(window as any).XLSX = XLSX;
(window as any).DOMPurify = DOMPurify;

// Shared modules (순서 유지 - window.* 전역 설정)
import '../shared/sanitize.ts';
import '../shared/theme.ts';
import '../shared/logger.ts';
import '../shared/error-handler.ts';
import '../shared/network-status.ts';
import '../shared/loading-manager.ts';

// Main script
import './label-app.ts';
