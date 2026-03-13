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

// Main script
import './heuktoram-script';
