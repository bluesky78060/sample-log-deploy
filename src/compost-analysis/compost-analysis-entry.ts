// npm packages
import * as XLSX from 'xlsx-js-style';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).XLSX = XLSX;

// Shared modules
import '../shared/sanitize';
import '../shared/constants';
import '../shared/utils';
import '../shared/toast';
import '../shared/theme';
import '../shared/tooltip';
import '../shared/logger';
import '../shared/analysis-db';

// Main script
import './compost-analysis-script';
