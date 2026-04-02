/**
 * ExcelImportManager - 엑셀 가져오기 공통 모듈
 *
 * 모든 시료 타입(토양, 수질, 퇴액비, 중금속, 잔류농약)의
 * 엑셀 가져오기 3단계 위자드를 공통화합니다.
 *
 * 사용법:
 *   const importer = new ExcelImportManager({ ...config });
 *   importer.init();
 *
 * @global window.ExcelImportManager
 */

// ========================================
// 타입 정의
// ========================================

/** 앱 필드 정의 */
interface AppField {
    key: string;
    label: string;
}

/** 컬럼 너비 정의 */
interface ColumnWidth {
    wch: number;
}

/** 템플릿 설정 */
interface TemplateConfig {
    headers: string[];
    sampleRow: unknown[];
    colWidths: ColumnWidth[];
    sheetName: string;
    fileName: string;
}

/** 미리보기 컬럼 */
interface PreviewColumn {
    key: string;
    label: string;
}

/** 공통 데이터 (getCommonData 반환값) */
interface CommonData {
    [key: string]: unknown;
}

/** 가져온 레코드 */
interface ImportedRecord {
    id?: string;
    receptionNumber?: string;
    [key: string]: unknown;
}

/** 유효성 검사 결과 */
interface ValidationResult {
    valid: boolean;
    message?: string;
}

/** 기존 로그 (접수번호 채번용) */
interface ExistingLog {
    receptionNumber?: string;
    [key: string]: unknown;
}

/** 값 가져오기 함수 타입 */
type GetValFunction = (field: string) => string;

/** 엑셀 날짜 파싱 함수 타입 */
type ParseExcelDateFunction = (val: unknown) => string;

/** ExcelImportManager 설정 */
interface ExcelImportManagerConfig {
    /** 앱 필드 정의 */
    appFields: AppField[];

    /** 자동매핑 규칙 (엑셀헤더 → 앱필드키) */
    autoMapRules: Record<string, string>;

    /** 서식 다운로드 설정 */
    templateConfig: TemplateConfig;

    /** 미리보기 테이블 컬럼 */
    previewColumns: PreviewColumn[];

    /** 레코드 빌드 함수 */
    buildRecord: (
        getVal: GetValFunction,
        parseExcelDate: ParseExcelDateFunction,
        commonData: CommonData,
        rowIdx: number
    ) => ImportedRecord | null;

    /** 행 건너뛰기 체크 함수 (경고 메시지 또는 null 반환) */
    skipRowCheck?: (record: ImportedRecord, rowIdx: number) => string | null;

    /** 커스텀 셀 렌더링 함수 */
    renderPreviewCell?: (record: ImportedRecord, columnKey: string) => string | undefined;

    /** 가져오기 완료 콜백 */
    onImportComplete: (records: ImportedRecord[]) => void;

    /** 공통 데이터 가져오기 함수 */
    getCommonData: () => CommonData;

    /** Step1 유효성 검증 함수 */
    validateStep1?: () => ValidationResult;

    /** 접수번호 채번 시 필터 함수 */
    autoNumberFilter?: (log: ExistingLog) => boolean;

    /** 접수번호에서 숫자 추출 함수 */
    autoNumberExtract?: (log: ExistingLog) => number;

    /** importDate 기본값을 오늘로 설정할지 여부 */
    setDefaultDate?: boolean;

    /** 레코드 빌드 후 추가 처리 함수 */
    postBuildRecords?: (records: ImportedRecord[]) => void;

    /** 기존 로그 가져오기 함수 (접수번호 채번용) */
    getExistingLogs?: () => ExistingLog[];
}

/** DOM 요소 캐시 */
interface ExcelImportDOMElements {
    input: HTMLInputElement | null;
    modal: HTMLElement | null;
    closeBtn: HTMLElement | null;
    cancelBtn: HTMLElement | null;
    nextBtn: HTMLButtonElement | null;
    prevBtn: HTMLButtonElement | null;
    step1: HTMLElement | null;
    step2: HTMLElement | null;
    step3: HTMLElement | null;
    mappingArea: HTMLElement | null;
    previewHead: HTMLElement | null;
    previewBody: HTMLElement | null;
    previewSummary: HTMLElement | null;
    warnings: HTMLElement | null;
}

/** 컬럼 매핑 (인덱스 → 필드키) */
type ColumnMapping = Record<number, string>;

/** XLSX 라이브러리 인터페이스 */
interface XLSXUtils {
    book_new(): XLSXWorkbook;
    aoa_to_sheet(data: unknown[][]): XLSXWorksheet;
    book_append_sheet(workbook: XLSXWorkbook, worksheet: XLSXWorksheet, name: string): void;
    sheet_to_json<T = unknown[]>(worksheet: XLSXWorksheet, opts?: { header?: number; defval?: unknown }): T[];
}

interface XLSXWorkbook {
    SheetNames: string[];
    Sheets: Record<string, XLSXWorksheet>;
}

interface XLSXWorksheet {
    '!cols'?: ColumnWidth[];
    [cell: string]: unknown;
}

interface XLSX {
    utils: XLSXUtils;
    read(data: ArrayBuffer | Uint8Array, opts?: { type?: string }): XLSXWorkbook;
    writeFile(workbook: XLSXWorkbook, filename: string): void;
}

/** Window 확장 */
interface WindowWithXLSX {
    XLSX?: XLSX;
    escapeHTML?: (str: string) => string;
}

/** showToast 전역 함수 */
declare function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void;

// ========================================
// ExcelImportManager 클래스
// ========================================

class ExcelImportManager {
    private config: ExcelImportManagerConfig;
    private _currentStep: number;
    private _excelHeaders: string[];
    private _excelData: unknown[][];
    private _columnMapping: ColumnMapping;
    private _parsedLogs: ImportedRecord[];
    private _els: ExcelImportDOMElements;

    /**
     * @param config - ExcelImportManager 설정
     */
    constructor(config: ExcelImportManagerConfig) {
        this.config = config;

        // 상태
        this._currentStep = 1;
        this._excelHeaders = [];
        this._excelData = [];
        this._columnMapping = {};
        this._parsedLogs = [];

        // DOM 요소 (init에서 캐싱)
        this._els = {
            input: null,
            modal: null,
            closeBtn: null,
            cancelBtn: null,
            nextBtn: null,
            prevBtn: null,
            step1: null,
            step2: null,
            step3: null,
            mappingArea: null,
            previewHead: null,
            previewBody: null,
            previewSummary: null,
            warnings: null,
        };
    }

    /**
     * DOM 요소 캐싱 및 이벤트 리스너 설정
     */
    init(): void {
        // DOM 요소 캐싱
        this._els = {
            input: document.getElementById('excelImportInput') as HTMLInputElement | null,
            modal: document.getElementById('excelImportModal'),
            closeBtn: document.getElementById('closeExcelImportModal'),
            cancelBtn: document.getElementById('cancelExcelImportBtn'),
            nextBtn: document.getElementById('excelImportNextBtn') as HTMLButtonElement | null,
            prevBtn: document.getElementById('excelImportPrevBtn') as HTMLButtonElement | null,
            step1: document.getElementById('excelImportStep1'),
            step2: document.getElementById('excelImportStep2'),
            step3: document.getElementById('excelImportStep3'),
            mappingArea: document.getElementById('columnMappingArea'),
            previewHead: document.getElementById('previewTableHead'),
            previewBody: document.getElementById('previewTableBody'),
            previewSummary: document.getElementById('previewSummary'),
            warnings: document.getElementById('importWarnings'),
        };

        // 기본값: 오늘 날짜
        if (this.config.setDefaultDate !== false) {
            const importDateEl = document.getElementById('importDate') as HTMLInputElement | null;
            if (importDateEl) {
                importDateEl.valueAsDate = new Date();
            }
        }

        // 서식 다운로드 버튼
        this._bindDownloadButtons();

        // 파일 선택
        if (this._els.input) {
            this._els.input.addEventListener('change', (e: Event) => this._handleFileSelect(e));
        }

        // 다음/가져오기 버튼
        if (this._els.nextBtn) {
            this._els.nextBtn.addEventListener('click', () => this._handleNext());
        }

        // 이전 버튼
        if (this._els.prevBtn) {
            this._els.prevBtn.addEventListener('click', () => this._handlePrev());
        }

        // 닫기/취소
        const closeHandler = (): void => this._closeModal();
        if (this._els.closeBtn) {
            this._els.closeBtn.addEventListener('click', closeHandler);
        }
        if (this._els.cancelBtn) {
            this._els.cancelBtn.addEventListener('click', closeHandler);
        }
        // 오버레이 클릭 닫기
        const overlay = this._els.modal?.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeHandler);
        }
    }

    // ========================================
    // 서식 다운로드
    // ========================================

    private _bindDownloadButtons(): void {
        const handler = (): void => this._downloadTemplate();
        const navBtn = document.getElementById('downloadTemplateNavBtn');
        if (navBtn) navBtn.addEventListener('click', handler);
        const modalBtn = document.getElementById('downloadTemplateBtn');
        if (modalBtn) modalBtn.addEventListener('click', handler);
    }

    private _downloadTemplate(): void {
        const win = window as WindowWithXLSX;
        const XLSX = win.XLSX;
        if (!XLSX) {
            showToast('XLSX 라이브러리가 로드되지 않았습니다.', 'error');
            return;
        }

        const tc = this.config.templateConfig;
        const wb = XLSX.utils.book_new();
        const wsData: unknown[][] = [tc.headers, tc.sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = tc.colWidths;
        XLSX.utils.book_append_sheet(wb, ws, tc.sheetName);
        XLSX.writeFile(wb, tc.fileName + '.xlsx');
        showToast('서식 파일을 다운로드했습니다.', 'success');
    }

    // ========================================
    // 파일 선택 및 파싱
    // ========================================

    private _handleFileSelect(e: Event): void {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const win = window as WindowWithXLSX;
        const XLSX = win.XLSX;
        if (!XLSX) {
            showToast('XLSX 라이브러리가 로드되지 않았습니다.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) {
                    showToast('데이터가 없거나 헤더만 있습니다.', 'error');
                    return;
                }

                this._excelHeaders = (jsonData[0] as unknown[]).map(h => String(h).trim());
                this._excelData = jsonData.slice(1).filter((row: unknown[]) =>
                    row.some(cell => cell !== '' && cell !== null && cell !== undefined)
                );

                if (this._excelData.length === 0) {
                    showToast('데이터 행이 없습니다.', 'error');
                    return;
                }

                // 자동 매핑 수행
                this._autoMap();

                // 모달 열기 (1단계)
                this._currentStep = 1;
                this._showStep(1);
                this._els.modal?.classList.remove('hidden');

            } catch (err) {
                (window.logger?.error || console.error)('엑셀 파싱 오류:', err);
                showToast('엑셀 파일을 읽을 수 없습니다.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);

        // input 초기화 (같은 파일 다시 선택 가능)
        if (this._els.input) {
            this._els.input.value = '';
        }
    }

    // ========================================
    // 자동 매핑
    // ========================================

    private _autoMap(): void {
        this._columnMapping = {};
        const rules = this.config.autoMapRules;

        this._excelHeaders.forEach((header, idx) => {
            const normalizedHeader = header.replace(/\s+/g, '').toLowerCase();
            for (const [pattern, field] of Object.entries(rules)) {
                if (normalizedHeader === pattern.replace(/\s+/g, '').toLowerCase() ||
                    header === pattern) {
                    const alreadyMapped = Object.values(this._columnMapping).includes(field);
                    if (!alreadyMapped) {
                        this._columnMapping[idx] = field;
                    }
                    break;
                }
            }
        });
    }

    // ========================================
    // 단계 UI 전환
    // ========================================

    private _showStep(step: number): void {
        this._els.step1?.classList.toggle('hidden', step !== 1);
        this._els.step2?.classList.toggle('hidden', step !== 2);
        this._els.step3?.classList.toggle('hidden', step !== 3);
        this._els.prevBtn?.classList.toggle('hidden', step === 1);
        if (this._els.nextBtn) {
            this._els.nextBtn.textContent = step === 3 ? '가져오기' : '다음';
        }
    }

    // ========================================
    // 컬럼 매핑 UI
    // ========================================

    private _renderColumnMapping(): void {
        const area = this._els.mappingArea;
        if (!area) return;
        area.innerHTML = '';

        const win = window as WindowWithXLSX;
        const escapeHTML = win.escapeHTML || ((s: string): string => s);

        this._excelHeaders.forEach((header, idx) => {
            if (!header) return;

            const row = document.createElement('div');
            row.className = 'mapping-row' + (this._columnMapping[idx] ? ' mapped' : '');

            const sampleValue = this._excelData[0]?.[idx] ?? '';

            const safeHeader = escapeHTML(header);
            const safeSampleValue = escapeHTML(String(sampleValue || ''));
            row.innerHTML = `
                <span class="mapping-excel-col" title="${safeHeader}">${safeHeader}</span>
                <span class="mapping-arrow">\u2192</span>
                <select class="mapping-select" data-col-idx="${idx}">
                    <option value="">-- 건너뛰기 --</option>
                    ${this.config.appFields.map(f =>
                        `<option value="${window.escapeHTML(f.key)}" ${this._columnMapping[idx] === f.key ? 'selected' : ''}>${window.escapeHTML(f.label)}</option>`
                    ).join('')}
                </select>
                <span class="mapping-sample" title="${safeSampleValue}">예: ${safeSampleValue}</span>
            `;

            const select = row.querySelector('.mapping-select') as HTMLSelectElement | null;
            if (select) {
                select.addEventListener('change', (e: Event) => {
                    const target = e.target as HTMLSelectElement;
                    const colIdx = parseInt(target.dataset.colIdx || '0', 10);
                    const value = target.value;

                    if (value) {
                        // 기존 매핑에서 같은 필드 제거 (중복 방지)
                        for (const [k, v] of Object.entries(this._columnMapping)) {
                            if (v === value && parseInt(k, 10) !== colIdx) {
                                delete this._columnMapping[parseInt(k, 10)];
                                const otherSelect = area.querySelector(`select[data-col-idx="${k}"]`) as HTMLSelectElement | null;
                                if (otherSelect) {
                                    otherSelect.value = '';
                                    otherSelect.closest('.mapping-row')?.classList.remove('mapped');
                                }
                            }
                        }
                        this._columnMapping[colIdx] = value;
                    } else {
                        delete this._columnMapping[colIdx];
                    }

                    row.classList.toggle('mapped', !!value);
                });
            }

            area.appendChild(row);
        });
    }

    // ========================================
    // 엑셀 날짜 파싱 (공통 유틸)
    // ========================================

    static parseExcelDate(val: unknown): string {
        if (!val) return '';
        // 이미 문자열 날짜 형식
        if (typeof val === 'string' && val.match(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/)) {
            return val.replace(/[./]/g, '-');
        }
        // 엑셀 시리얼 날짜 (숫자)
        if (typeof val === 'number' && val > 30000 && val < 100000) {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().slice(0, 10);
        }
        return String(val);
    }

    // ========================================
    // 미리보기 빌드
    // ========================================

    private _buildPreview(): void {
        const commonData = this.config.getCommonData();

        // 역매핑: 앱 필드 → 엑셀 컬럼 인덱스
        const fieldToCol: Record<string, number> = {};
        for (const [colIdx, field] of Object.entries(this._columnMapping)) {
            fieldToCol[field] = parseInt(colIdx, 10);
        }

        const warnings: string[] = [];
        this._parsedLogs = [];

        // getVal 유틸 함수
        const getVal: GetValFunction = (field: string): string => {
            if (fieldToCol[field] !== undefined) {
                const val = this._excelData[0]?.[fieldToCol[field]];
                return val !== undefined && val !== null ? String(val).trim() : '';
            }
            return '';
        };

        // 각 행 처리
        this._excelData.forEach((row, rowIdx) => {
            const rowGetVal: GetValFunction = (field: string): string => {
                if (fieldToCol[field] !== undefined) {
                    const val = row[fieldToCol[field]];
                    return val !== undefined && val !== null ? String(val).trim() : '';
                }
                return '';
            };

            const record = this.config.buildRecord(
                rowGetVal,
                ExcelImportManager.parseExcelDate,
                commonData,
                rowIdx
            );

            // null 반환 시 건너뛰기 (buildRecord 내부에서 skip 결정)
            if (record === null) return;

            // skipRowCheck 콜백으로 경고/건너뛰기 처리
            if (this.config.skipRowCheck) {
                const warning = this.config.skipRowCheck(record, rowIdx);
                if (warning) {
                    warnings.push(warning);
                    return;
                }
            }

            this._parsedLogs.push(record);
        });

        // 레코드 빌드 후 추가 처리 (예: totalParcels 설정)
        if (this.config.postBuildRecords) {
            this.config.postBuildRecords(this._parsedLogs);
        }

        // 접수번호 자동 채번
        this._autoAssignReceptionNumbers();

        // 미리보기 테이블 렌더링
        this._renderPreview(warnings);
    }

    // ========================================
    // 접수번호 자동 채번
    // ========================================

    private _autoAssignReceptionNumbers(): void {
        const hasReceptionNumbers = this._parsedLogs.some(l => l.receptionNumber !== '');
        if (hasReceptionNumbers) return;

        // 기존 데이터에서 최대 번호 구하기
        const existingLogs = this.config.getExistingLogs ? this.config.getExistingLogs() : [];
        let maxNum = 0;

        const extractFn = this.config.autoNumberExtract;
        const filterFn = this.config.autoNumberFilter;

        existingLogs.forEach(log => {
            if (!log.receptionNumber) return;
            if (filterFn && !filterFn(log)) return;

            let n: number;
            if (extractFn) {
                n = extractFn(log);
            } else {
                n = parseInt(log.receptionNumber, 10);
            }
            if (!isNaN(n) && n > maxNum) maxNum = n;
        });

        this._parsedLogs.forEach((l, i) => {
            l.receptionNumber = String(maxNum + i + 1);
        });
    }

    // ========================================
    // 미리보기 테이블 렌더링
    // ========================================

    private _renderPreview(warnings: string[]): void {
        const win = window as WindowWithXLSX;
        const escapeHTML = win.escapeHTML || ((s: string): string => s);

        if (this._els.previewSummary) {
            this._els.previewSummary.textContent = `총 ${this._parsedLogs.length}건의 데이터를 가져옵니다.`;
        }

        // 헤더
        const cols = this.config.previewColumns;
        if (this._els.previewHead) {
            this._els.previewHead.innerHTML = '<tr>' +
                cols.map(c => `<th>${escapeHTML(c.label)}</th>`).join('') +
                '</tr>';
        }

        // 본문
        const renderCell = this.config.renderPreviewCell;
        if (this._els.previewBody) {
            this._els.previewBody.innerHTML = this._parsedLogs.map(l => {
                const cells = cols.map(c => {
                    if (renderCell) {
                        const custom = renderCell(l, c.key);
                        if (custom !== undefined) return '<td>' + window.escapeHTML(String(custom)) + '</td>';
                    }
                    const val = l[c.key];
                    return `<td>${escapeHTML(val !== undefined && val !== null ? String(val) : '')}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
        }

        // 경고
        if (this._els.warnings) {
            if (warnings.length > 0) {
                this._els.warnings.textContent = warnings.join('\n');
                this._els.warnings.classList.remove('hidden');
            } else {
                this._els.warnings.classList.add('hidden');
            }
        }
    }

    // ========================================
    // 다음/가져오기 버튼 핸들러
    // ========================================

    private _handleNext(): void {
        if (this._currentStep === 1) {
            // Step1 유효성 검증
            if (this.config.validateStep1) {
                const result = this.config.validateStep1();
                if (!result.valid) {
                    showToast(result.message || '입력값을 확인하세요.', 'error');
                    return;
                }
            } else {
                // 기본 검증: 접수일자
                const importDate = (document.getElementById('importDate') as HTMLInputElement | null)?.value;
                if (!importDate) {
                    showToast('접수일자를 입력하세요.', 'error');
                    return;
                }
            }

            this._currentStep = 2;
            this._renderColumnMapping();
            this._showStep(2);

        } else if (this._currentStep === 2) {
            if (Object.keys(this._columnMapping).length === 0) {
                showToast('최소 1개의 컬럼을 매핑하세요.', 'error');
                return;
            }

            this._currentStep = 3;
            this._buildPreview();
            this._showStep(3);

        } else if (this._currentStep === 3) {
            if (this._parsedLogs.length === 0) {
                showToast('가져올 데이터가 없습니다.', 'error');
                return;
            }

            // 가져오기 완료 콜백
            this.config.onImportComplete(this._parsedLogs);

            // 모달 닫기
            this._els.modal?.classList.add('hidden');

            showToast(`${this._parsedLogs.length}건의 데이터를 가져왔습니다.`, 'success');

            // 상태 초기화
            this._reset();
        }
    }

    // ========================================
    // 이전 버튼 핸들러
    // ========================================

    private _handlePrev(): void {
        if (this._currentStep === 2) {
            this._currentStep = 1;
            this._showStep(1);
        } else if (this._currentStep === 3) {
            this._currentStep = 2;
            this._showStep(2);
        }
    }

    // ========================================
    // 모달 닫기
    // ========================================

    private _closeModal(): void {
        this._els.modal?.classList.add('hidden');
        this._currentStep = 1;
        this._showStep(1);
    }

    // ========================================
    // 상태 초기화
    // ========================================

    private _reset(): void {
        this._parsedLogs = [];
        this._excelData = [];
        this._excelHeaders = [];
        this._columnMapping = {};
    }
}

// 전역으로 내보내기
(window as unknown as { ExcelImportManager?: typeof ExcelImportManager }).ExcelImportManager = ExcelImportManager;

export {
    // 타입 내보내기
    AppField,
    ColumnWidth,
    TemplateConfig,
    PreviewColumn,
    CommonData,
    ImportedRecord,
    ValidationResult,
    ExistingLog,
    GetValFunction,
    ParseExcelDateFunction,
    ExcelImportManagerConfig,
    ExcelImportDOMElements,
    ColumnMapping,

    // 클래스 내보내기
    ExcelImportManager
};
