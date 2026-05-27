/**
 * @fileoverview 토양 중금속 분석결과 조회 (TypeScript)
 * 중금속 접수 데이터(heavyMetalSampleLogs)를 읽어와 분석 결과를 입력하고
 * 엑셀(.xlsx)로 내보내는 페이지 스크립트
 *
 * 토양환경보전법 시행규칙 기준: 8개 중금속 항목
 */

export {};

// ========================================
// 타입 정의
// ========================================

interface HeavyMetalField {
    key: string;
    label: string;
    unit: string;
    standard1: number;
    standard2: number;
    standard3: number;
}

interface HeavyMetalSampleLog {
    id: string;
    receptionNumber?: string;
    name?: string;
    date?: string;
    samplingLocation?: string;
    purpose?: string;
    isComplete?: boolean;
    [key: string]: unknown;
}

interface HeavyMetalFlatRow {
    key: string;
    log: HeavyMetalSampleLog;
}

interface HeavyMetalTestResult {
    testDate?: string;
    judgment?: 'pass' | 'fail' | '';
    [key: string]: string | undefined;
}

interface FocusedCell {
    rowIdx: number;
    colIdx: number;
}

// Window 확장
declare global {
    interface Window {
        ThemeManager?: { init(): void; setTheme(theme: string): void };
        heavyMetalAnalysisManager?: HeavyMetalAnalysisManager;
        sanitizeExcelAoa?: (aoa: unknown[][]) => unknown[][];
    }
}

// ========================================
// 상수 정의 — 토양환경보전법 시행규칙
// ========================================

const HEAVY_METAL_FIELDS: HeavyMetalField[] = [
    { key: 'cadmium',   label: '카드뮴(Cd)',     unit: 'mg/kg', standard1: 4,   standard2: 10,  standard3: 60 },
    { key: 'copper',    label: '구리(Cu)',       unit: 'mg/kg', standard1: 150, standard2: 500, standard3: 2000 },
    { key: 'arsenic',   label: '비소(As)',       unit: 'mg/kg', standard1: 25,  standard2: 50,  standard3: 200 },
    { key: 'mercury',   label: '수은(Hg)',       unit: 'mg/kg', standard1: 4,   standard2: 10,  standard3: 20 },
    { key: 'lead',      label: '납(Pb)',         unit: 'mg/kg', standard1: 200, standard2: 400, standard3: 700 },
    { key: 'chromium6', label: '6가크롬(Cr6+)',  unit: 'mg/kg', standard1: 5,   standard2: 15,  standard3: 40 },
    { key: 'zinc',      label: '아연(Zn)',       unit: 'mg/kg', standard1: 300, standard2: 600, standard3: 2000 },
    { key: 'nickel',    label: '니켈(Ni)',       unit: 'mg/kg', standard1: 100, standard2: 200, standard3: 500 },
];

// ========================================
// HeavyMetalAnalysisManager 클래스
// ========================================

class HeavyMetalAnalysisManager {
    private selectedYear: string;
    private sampleLogs: HeavyMetalSampleLog[];
    private testResults: Record<string, HeavyMetalTestResult>;
    private flatRows: HeavyMetalFlatRow[];
    private selectedKeys: Set<string>;
    private focusedCell: FocusedCell | null;
    private resultFields: string[];
    private fieldInfoMap: Record<string, HeavyMetalField>;
    private preSelectedLogIds: Set<string> | null;

    // DOM elements
    private yearSelect: HTMLSelectElement | null;
    private bulkTestDateInput: HTMLInputElement | null;
    private bulkResultSelect: HTMLSelectElement | null;
    private selectAllCheckbox: HTMLInputElement | null;
    private selectAllBtn: HTMLButtonElement | null;
    private applyBulkBtn: HTMLButtonElement | null;
    private exportBtn: HTMLButtonElement | null;
    private tableBody: HTMLTableSectionElement | null;
    private emptyState: HTMLElement | null;
    private recordCount: HTMLElement | null;

    constructor() {
        this.selectedYear = new Date().getFullYear().toString();
        this.sampleLogs = [];
        this.testResults = {};
        this.flatRows = [];
        this.selectedKeys = new Set();
        this.focusedCell = null;
        this.preSelectedLogIds = null;

        // 결과 필드 (순서: testDate + 8항목 + judgment)
        this.resultFields = [
            'testDate',
            ...HEAVY_METAL_FIELDS.map(f => f.key),
            'judgment'
        ];

        // 필드 정보 맵
        this.fieldInfoMap = {};
        for (const f of HEAVY_METAL_FIELDS) {
            this.fieldInfoMap[f.key] = { ...f };
        }

        // DOM elements initialized in cacheElements
        this.yearSelect = null;
        this.bulkTestDateInput = null;
        this.bulkResultSelect = null;
        this.selectAllCheckbox = null;
        this.selectAllBtn = null;
        this.applyBulkBtn = null;
        this.exportBtn = null;
        this.tableBody = null;
        this.emptyState = null;
        this.recordCount = null;

        this.init();
    }

    // ========================================
    // 초기화
    // ========================================

    private init(): void {
        this.cacheElements();
        this.setDefaultYear();
        this.restoreFromHeavyMetalPage();
        this.bindEvents();
        this.loadData();
        this.render();

        // Firestore에서 분석 결과 동기화 (비동기)
        this.syncTestResultsFromFirestore();

        if (window.ThemeManager) {
            window.ThemeManager.init();
            this.setupThemeToggle();
        }
    }

    private cacheElements(): void {
        this.yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
        this.bulkTestDateInput = document.getElementById('bulkTestDate') as HTMLInputElement | null;
        this.bulkResultSelect = document.getElementById('bulkResult') as HTMLSelectElement | null;
        this.selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement | null;
        this.selectAllBtn = document.getElementById('selectAllBtn') as HTMLButtonElement | null;
        this.applyBulkBtn = document.getElementById('applyBulkBtn') as HTMLButtonElement | null;
        this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement | null;
        this.tableBody = document.getElementById('tableBody') as HTMLTableSectionElement | null;
        this.emptyState = document.getElementById('emptyState');
        this.recordCount = document.getElementById('recordCount');
    }

    private restoreFromHeavyMetalPage(): void {
        const year = localStorage.getItem('heavyMetalAnalysis_year');
        const selectedIdsJson = localStorage.getItem('heavyMetalAnalysis_selected_ids');

        if (year) {
            this.selectedYear = year;
            if (this.yearSelect) this.yearSelect.value = year;
            localStorage.removeItem('heavyMetalAnalysis_year');
        }

        if (selectedIdsJson) {
            try {
                const ids: unknown = JSON.parse(selectedIdsJson);
                this.preSelectedLogIds = Array.isArray(ids) && ids.length > 0 ? new Set(ids as string[]) : null;
            } catch {
                this.preSelectedLogIds = null;
            }
            localStorage.removeItem('heavyMetalAnalysis_selected_ids');
        }

        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.close();
            });
        }
    }

    private setDefaultYear(): void {
        const year = new Date().getFullYear().toString();
        this.selectedYear = year;
        if (this.yearSelect) this.yearSelect.value = year;
    }

    private setupThemeToggle(): void {
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') btn.classList.add('dark');

        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            window.ThemeManager?.setTheme(isDark ? 'light' : 'dark');
            btn.classList.toggle('dark', !isDark);
        });
    }

    private bindEvents(): void {
        this.yearSelect?.addEventListener('change', () => {
            this.selectedYear = this.yearSelect!.value;
            this.preSelectedLogIds = null;
            this.loadData();
            this.render();
        });

        this.selectAllCheckbox?.addEventListener('change', () => {
            this.toggleSelectAll(this.selectAllCheckbox!.checked);
        });

        this.selectAllBtn?.addEventListener('click', () => {
            const allSelected = this.selectedKeys.size === this.flatRows.length;
            this.toggleSelectAll(!allSelected);
            if (this.selectAllCheckbox) this.selectAllCheckbox.checked = !allSelected;
        });

        // 검사일자 전체 적용
        this.bulkTestDateInput?.addEventListener('change', () => {
            const testDate = this.bulkTestDateInput!.value;
            if (!testDate) return;
            for (const row of this.flatRows) {
                if (!this.testResults[row.key]) this.testResults[row.key] = {};
                this.testResults[row.key].testDate = testDate;
            }
            this.saveTestResults();
            this.render();
            if (window.showToast) window.showToast(`검사일자가 전체 ${this.flatRows.length}건에 적용되었습니다.`, 'info');
        });

        document.getElementById('clearTestDateBtn')?.addEventListener('click', () => {
            if (!confirm('모든 행의 검사일자를 삭제하시겠습니까?')) return;
            for (const row of this.flatRows) {
                if (this.testResults[row.key]) this.testResults[row.key].testDate = '';
            }
            if (this.bulkTestDateInput) this.bulkTestDateInput.value = '';
            this.saveTestResults();
            this.render();
            if (window.showToast) window.showToast('검사일자가 삭제되었습니다.', 'info');
        });

        this.applyBulkBtn?.addEventListener('click', () => this.applyBulkValues());
        this.exportBtn?.addEventListener('click', () => this.exportToExcel());

        document.addEventListener('paste', (e: ClipboardEvent) => this.handlePaste(e));
        document.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeydown(e));
    }

    // ========================================
    // 데이터 로드/저장
    // ========================================

    private loadData(): void {
        this.sampleLogs = this.loadSampleLogs();
        this.testResults = this.loadTestResults();
        this.buildFlatRows();
    }

    private loadSampleLogs(): HeavyMetalSampleLog[] {
        const key = `test_heavyMetalSampleLogs_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            const parsed: unknown = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return (parsed as HeavyMetalSampleLog[]).sort((a, b) => {
                const toNum = (s: string | undefined): number => {
                    if (!s) return Infinity;
                    const n = parseFloat(String(s));
                    return isNaN(n) ? Infinity : n;
                };
                return toNum(a.receptionNumber) - toNum(b.receptionNumber);
            });
        } catch (e) {
            (window.logger?.error || console.error)('중금속 접수 데이터 로드 실패:', e);
            return [];
        }
    }

    private loadTestResults(): Record<string, HeavyMetalTestResult> {
        const key = `heavyMetalTestResults_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return {};
            return (JSON.parse(data) as Record<string, HeavyMetalTestResult>) || {};
        } catch (e) {
            (window.logger?.error || console.error)('중금속 검사 결과 로드 실패:', e);
            return {};
        }
    }

    private saveTestResults(): void {
        const key = `heavyMetalTestResults_${this.selectedYear}`;
        try {
            localStorage.setItem(key, JSON.stringify(this.testResults));
            this.syncTestResultsToFirestore();
        } catch (e) {
            (window.logger?.error || console.error)('중금속 검사 결과 저장 실패:', e);
        }
    }

    private async syncTestResultsToFirestore(): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const entries = Object.entries(this.testResults);
            if (entries.length === 0) return;

            const documents = entries.map(([docKey, data]) => ({
                ...data,
                id: docKey,
                _resultKey: docKey,
            }));

            await window.firestoreDb.batchSave('heavyMetalTestResults', year, documents);
            (window.logger?.info || console.log)(`[중금속] Firestore 동기화 완료: ${documents.length}건`);
        } catch (e) {
            (window.logger?.error || console.error)('[중금속] Firestore 동기화 실패:', e);
        }
    }

    private async syncTestResultsFromFirestore(): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const cloudData = await window.firestoreDb.getAll('heavyMetalTestResults', year);
            if (!cloudData || cloudData.length === 0) return;

            const cloudMap: Record<string, HeavyMetalTestResult> = {};
            for (const doc of cloudData) {
                const docRecord = doc as Record<string, unknown>;
                const key = (docRecord._resultKey || docRecord.id) as string | undefined;
                if (key) {
                    const { _resultKey: _rk, syncedAt: _sa, updatedAt: _ua, ...rest } = docRecord;
                    void _rk; void _sa; void _ua;
                    cloudMap[key] = rest as HeavyMetalTestResult;
                }
            }

            // timestamp 기반 병합 (더 최신인 쪽 우선)
            for (const [k, cloudVal] of Object.entries(cloudMap)) {
                const localVal = this.testResults[k];
                if (!localVal || !localVal.updatedAt ||
                    (cloudVal.updatedAt && new Date(cloudVal.updatedAt) >= new Date(localVal.updatedAt))) {
                    this.testResults[k] = cloudVal;
                }
            }
            const lsKey = `heavyMetalTestResults_${this.selectedYear}`;
            localStorage.setItem(lsKey, JSON.stringify(this.testResults));
            this.render();
            (window.logger?.info || console.log)('[중금속] Firestore → localStorage 동기화 완료');
        } catch (e) {
            (window.logger?.error || console.error)('[중금속] Firestore 로드 실패:', e);
        }
    }

    private buildFlatRows(): void {
        this.flatRows = [];

        const logsToProcess = (this.preSelectedLogIds && this.preSelectedLogIds.size > 0)
            ? this.sampleLogs.filter(log => this.preSelectedLogIds!.has(log.id))
            : this.sampleLogs;

        for (const log of logsToProcess) {
            this.flatRows.push({
                key: log.id,
                log,
            });
        }

        this.preSelectedLogIds = null;
    }

    // ========================================
    // 렌더링
    // ========================================

    private render(): void {
        if (!this.tableBody) return;

        if (this.flatRows.length === 0) {
            this.tableBody.innerHTML = '';
            if (this.emptyState) this.emptyState.style.display = 'flex';
            if (this.recordCount) this.recordCount.textContent = '0건';
            return;
        }

        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.recordCount) this.recordCount.textContent = `${this.flatRows.length}건`;

        const fragment = document.createDocumentFragment();
        for (let ri = 0; ri < this.flatRows.length; ri++) {
            fragment.appendChild(this.createTableRow(this.flatRows[ri], ri));
        }

        this.tableBody.innerHTML = '';
        this.tableBody.appendChild(fragment);
        this.validateAllRanges();
    }

    private createTableRow(row: HeavyMetalFlatRow, rowIdx: number): HTMLTableRowElement {
        const tr = document.createElement('tr');
        const result = this.testResults[row.key] || {};

        tr.setAttribute('data-log-id', row.log.id);
        if (row.log.isComplete) tr.classList.add('row-completed');

        const isChecked = this.selectedKeys.has(row.key);

        // 체크박스
        const tdCheck = document.createElement('td');
        tdCheck.className = 'col-checkbox sticky-col';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isChecked;
        cb.addEventListener('change', () => {
            if (cb.checked) this.selectedKeys.add(row.key);
            else this.selectedKeys.delete(row.key);
            this.updateSelectAllState();
        });
        tdCheck.appendChild(cb);
        tr.appendChild(tdCheck);

        // 접수번호
        this.addStaticCell(tr, 'col-num sticky-col', row.log.receptionNumber || '');
        // 성명
        this.addStaticCell(tr, 'col-name sticky-col', row.log.name || '');
        // 채취장소
        const tdLoc = document.createElement('td');
        tdLoc.className = 'col-location sticky-col';
        tdLoc.textContent = row.log.samplingLocation || '';
        tr.appendChild(tdLoc);
        // 용도
        this.addStaticCell(tr, 'col-purpose sticky-col', row.log.purpose || '');
        // 접수일자
        this.addStaticCell(tr, 'col-date sticky-col', row.log.date || '');
        // 완료
        this.addStaticCell(tr, 'col-complete sticky-col', row.log.isComplete ? '완료' : '');

        // 편집 가능한 결과 필드들
        for (let ci = 0; ci < this.resultFields.length; ci++) {
            const field = this.resultFields[ci];
            const td = document.createElement('td');

            let cssClass = 'col-result editable-cell';
            if (field === 'testDate') cssClass += ' col-testdate';
            else if (field === 'judgment') cssClass += ' col-judgment';
            else cssClass += ' col-metal';

            td.className = cssClass;
            td.setAttribute('data-row', String(rowIdx));
            td.setAttribute('data-col', String(ci));
            td.setAttribute('data-field', field);

            // 판정 필드
            if (field === 'judgment') {
                const val = result[field] || '';
                td.textContent = val === 'pass' ? '적합' : val === 'fail' ? '부적합' : (val as string);
                td.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    this.cycleJudgment(row.key, td);
                });
                td.contentEditable = 'false';
            } else {
                td.textContent = result[field] || '';
                td.contentEditable = 'true';

                // 단일 셀 paste: HTML 제거, 텍스트만 허용
                td.addEventListener('paste', (e: ClipboardEvent) => {
                    e.preventDefault();
                    const text = e.clipboardData?.getData('text/plain') || '';
                    document.execCommand('insertText', false, text);
                });

                td.addEventListener('focus', () => {
                    this.focusedCell = { rowIdx, colIdx: ci };
                    td.classList.add('focused');
                });
                td.addEventListener('blur', () => {
                    td.classList.remove('focused');
                    this.focusedCell = null;
                    this.handleCellEdit(row.key, field, td.textContent?.trim() || '');
                });
                td.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        td.blur();
                        this.moveFocus(rowIdx + 1, ci);
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        td.blur();
                        this.moveFocus(rowIdx, ci + (e.shiftKey ? -1 : 1), e.shiftKey ? -1 : 1);
                    }
                });
            }

            tr.appendChild(td);
        }

        return tr;
    }

    private addStaticCell(tr: HTMLTableRowElement, className: string, text: string): void {
        const td = document.createElement('td');
        td.className = className;
        td.textContent = text;
        tr.appendChild(td);
    }

    private cycleJudgment(key: string, td: HTMLTableCellElement): void {
        if (!this.testResults[key]) this.testResults[key] = {};
        const current = this.testResults[key].judgment || '';
        let next: 'pass' | 'fail' | '' = '';
        if (current === '') next = 'pass';
        else if (current === 'pass') next = 'fail';
        else next = '';

        this.testResults[key].judgment = next;
        td.textContent = next === 'pass' ? '적합' : next === 'fail' ? '부적합' : '';
        td.classList.remove('judgment-pass', 'judgment-fail');
        if (next === 'pass') td.classList.add('judgment-pass');
        else if (next === 'fail') td.classList.add('judgment-fail');

        this.saveTestResults();
    }

    // ========================================
    // 셀 편집 / 포커스 이동
    // ========================================

    private handleCellEdit(key: string, field: string, value: string): void {
        if (!this.testResults[key]) this.testResults[key] = {};
        const maxLen = (window as Window & { SampleConstants?: { VALIDATION?: { MAX_CELL_INPUT_LENGTH?: number } } }).SampleConstants?.VALIDATION?.MAX_CELL_INPUT_LENGTH ?? 200;
        const sanitized = value.slice(0, maxLen);
        this.testResults[key][field] = sanitized;
        this.saveTestResults();
        this.validateFieldRange(key, field, sanitized);
    }

    private moveFocus(rowIdx: number, colIdx: number, direction: number = 1): void {
        if (colIdx >= this.resultFields.length) { colIdx = 0; rowIdx++; }
        if (colIdx < 0) { colIdx = this.resultFields.length - 1; rowIdx--; }
        if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;

        // judgment 컬럼 건너뛰기
        const maxIter = this.resultFields.length * 2;
        let iter = 0;
        while (iter++ < maxIter) {
            const field = this.resultFields[colIdx];
            if (field === 'judgment') { colIdx += direction; }
            else break;

            if (colIdx >= this.resultFields.length) { colIdx = 0; rowIdx++; }
            if (colIdx < 0) { colIdx = this.resultFields.length - 1; rowIdx--; }
            if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;
        }

        const cell = this.tableBody?.querySelector(`td[data-row="${rowIdx}"][data-col="${colIdx}"]`) as HTMLElement | null;
        if (cell) {
            cell.focus();
            const range = document.createRange();
            range.selectNodeContents(cell);
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    // ========================================
    // 유효성 검증
    // ========================================

    private validateFieldRange(key: string, field: string, value: string): void {
        const info = this.fieldInfoMap[field];
        if (!info) return;

        const rowIdx = this.flatRows.findIndex(r => r.key === key);
        const colIdx = this.resultFields.indexOf(field);
        const cell = this.tableBody?.querySelector(`td[data-row="${rowIdx}"][data-col="${colIdx}"]`) as HTMLElement | null;

        if (!value || value.trim() === '') {
            if (cell) cell.classList.remove('out-of-range');
            return;
        }

        const num = parseFloat(value.replace(/,/g, ''));
        if (isNaN(num)) {
            if (cell) cell.classList.remove('out-of-range');
            return;
        }

        // 1지역 기준으로 비교 (가장 엄격)
        const standard = info.standard1;
        const isOk = num <= standard;

        if (!isOk) {
            if (cell) cell.classList.add('out-of-range');
            if (window.showToast) window.showToast(`⚠️ ${info.label}: ${num} ${info.unit} → 1지역 기준 ${standard} ${info.unit} 이하`, 'warning');
        } else {
            if (cell) cell.classList.remove('out-of-range');
        }
    }

    private validateAllRanges(): void {
        for (const [key, result] of Object.entries(this.testResults)) {
            for (const field of Object.keys(result)) {
                if (this.fieldInfoMap[field]) {
                    this.validateFieldRange(key, field, result[field] || '');
                }
            }
        }
    }

    // ========================================
    // 붙여넣기
    // ========================================

    private handlePaste(event: ClipboardEvent): void {
        if (!this.focusedCell) return;
        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl || !activeEl.classList.contains('editable-cell')) return;

        event.preventDefault();
        const clipData = event.clipboardData;
        const text = clipData?.getData('text/plain');
        if (!text) return;

        const rows = text.split(/\r?\n/).filter(r => r.length > 0);
        const startRow = this.focusedCell.rowIdx;
        const startCol = this.focusedCell.colIdx;
        let pastedCount = 0;
        const maxLen = (window as Window & { SampleConstants?: { VALIDATION?: { MAX_CELL_INPUT_LENGTH?: number } } }).SampleConstants?.VALIDATION?.MAX_CELL_INPUT_LENGTH ?? 200;

        for (let ri = 0; ri < rows.length; ri++) {
            const targetRow = startRow + ri;
            if (targetRow >= this.flatRows.length) break;

            const cols = rows[ri].split('\t');
            for (let ci = 0; ci < cols.length; ci++) {
                const targetCol = startCol + ci;
                if (targetCol >= this.resultFields.length) break;

                const field = this.resultFields[targetCol];
                if (field === 'judgment') continue;

                const value = cols[ci].trim().slice(0, maxLen);
                const rowKey = this.flatRows[targetRow].key;

                if (!this.testResults[rowKey]) this.testResults[rowKey] = {};
                this.testResults[rowKey][field] = value;

                const cell = this.tableBody?.querySelector(`td[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLElement | null;
                if (cell) {
                    cell.textContent = value;
                    cell.classList.add('paste-highlight');
                    setTimeout(() => cell.classList.remove('paste-highlight'), 1500);
                }
                pastedCount++;
            }
        }

        this.saveTestResults();
        if (window.showToast && pastedCount > 0) {
            window.showToast(`${pastedCount}개 셀에 데이터를 붙여넣었습니다.`, 'success');
        }
    }

    private handleKeydown(e: KeyboardEvent): void {
        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl || !activeEl.classList.contains('editable-cell')) return;
        if (!this.focusedCell) return;

        const { rowIdx, colIdx } = this.focusedCell;
        if (e.key === 'ArrowDown') {
            e.preventDefault(); activeEl.blur(); this.moveFocus(rowIdx + 1, colIdx);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault(); activeEl.blur(); this.moveFocus(rowIdx - 1, colIdx);
        }
    }

    // ========================================
    // 전체 선택 / 일괄 적용
    // ========================================

    private toggleSelectAll(checked: boolean): void {
        this.selectedKeys.clear();
        if (checked) {
            for (const row of this.flatRows) this.selectedKeys.add(row.key);
        }
        const checkboxes = this.tableBody?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => { (cb as HTMLInputElement).checked = checked; });
        this.updateSelectAllState();
    }

    private updateSelectAllState(): void {
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = this.flatRows.length > 0 && this.selectedKeys.size === this.flatRows.length;
            this.selectAllCheckbox.indeterminate = this.selectedKeys.size > 0 && this.selectedKeys.size < this.flatRows.length;
        }
    }

    private applyBulkValues(): void {
        if (this.selectedKeys.size === 0) {
            if (window.showToast) window.showToast('선택된 항목이 없습니다.', 'warning');
            return;
        }

        const testDate = this.bulkTestDateInput?.value || '';
        const judgment = (this.bulkResultSelect?.value || '') as 'pass' | 'fail' | '';
        let applied = 0;

        for (const key of this.selectedKeys) {
            if (!this.testResults[key]) this.testResults[key] = {};
            if (testDate) this.testResults[key].testDate = testDate;
            if (judgment) this.testResults[key].judgment = judgment;
            applied++;
        }

        this.saveTestResults();
        this.render();
        if (window.showToast) window.showToast(`${applied}건에 일괄 적용했습니다.`, 'success');
    }

    // ========================================
    // 내보내기
    // ========================================

    private exportToExcel(): void {
        let targetRows = this.flatRows;
        if (this.selectedKeys.size > 0) {
            targetRows = this.flatRows.filter(r => this.selectedKeys.has(r.key));
        }

        if (targetRows.length === 0) {
            if (window.showToast) window.showToast('내보낼 데이터가 없습니다.', 'warning');
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const XLSX_LIB = (window as any).XLSX as typeof import('xlsx-js-style') | undefined;
        if (!XLSX_LIB) {
            if (window.showToast) window.showToast('XLSX 라이브러리가 로드되지 않았습니다.', 'error');
            return;
        }

        const sanitizeAoa = window.sanitizeExcelAoa ?? ((aoa: unknown[][]): unknown[][] => aoa);

        try {
            const wb = XLSX_LIB.utils.book_new();

            const wsData = this.buildSheet(targetRows);
            const ws = XLSX_LIB.utils.aoa_to_sheet(sanitizeAoa(wsData));
            this.applyExportStyles(XLSX_LIB, ws, wsData.length, HEAVY_METAL_FIELDS.length + 7);
            XLSX_LIB.utils.book_append_sheet(wb, ws, '중금속 분석결과');

            const fileName = `중금속분석결과_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX_LIB.writeFile(wb, fileName);

            if (window.showToast) {
                window.showToast(`${targetRows.length}건 중금속 분석결과를 내보냈습니다.`, 'success');
            }
        } catch (e) {
            (window.logger?.error || console.error)('중금속 내보내기 실패:', e);
            if (window.showToast) window.showToast('내보내기에 실패했습니다.', 'error');
        }
    }

    private buildSheet(rows: HeavyMetalFlatRow[]): (string | number)[][] {
        const data: (string | number)[][] = [];

        // 1행: 헤더
        const header: string[] = [
            '접수번호', '성명', '채취장소', '용도', '접수일자', '검사일자',
            ...HEAVY_METAL_FIELDS.map(f => `${f.label}\n(${f.unit})`),
            '판정'
        ];
        data.push(header);

        // 2행: 1지역 기준값
        const standards: string[] = [
            '', '', '', '', '', '',
            ...HEAVY_METAL_FIELDS.map(f => `${f.standard1} 이하`),
            ''
        ];
        data.push(standards);

        // 데이터 행
        for (const row of rows) {
            const result = this.testResults[row.key] || {};
            const dataRow: string[] = [
                row.log.receptionNumber || '',
                row.log.name || '',
                row.log.samplingLocation || '',
                row.log.purpose || '',
                row.log.date || '',
                result.testDate || '',
                ...HEAVY_METAL_FIELDS.map(f => result[f.key] || ''),
                result.judgment === 'pass' ? '적합' : result.judgment === 'fail' ? '부적합' : ''
            ];
            data.push(dataRow);
        }

        return data;
    }

    private applyExportStyles(XLSX_LIB: typeof import('xlsx-js-style'), ws: import('xlsx-js-style').WorkSheet, rowCount: number, colCount: number): void {
        const borderStyle = {
            top: { style: 'thin' as const, color: { rgb: '808080' } },
            bottom: { style: 'thin' as const, color: { rgb: '808080' } },
            left: { style: 'thin' as const, color: { rgb: '808080' } },
            right: { style: 'thin' as const, color: { rgb: '808080' } }
        };

        const headerStyle = {
            fill: { fgColor: { rgb: 'D5A6BD' } },
            font: { bold: true, sz: 10 },
            alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
            border: borderStyle
        };

        const standardStyle = {
            fill: { fgColor: { rgb: 'FCE4B5' } },
            font: { sz: 9, color: { rgb: '666666' } },
            alignment: { horizontal: 'center' as const, vertical: 'center' as const },
            border: borderStyle
        };

        const dataStyle = {
            alignment: { horizontal: 'center' as const, vertical: 'center' as const },
            border: borderStyle
        };

        for (let c = 0; c < colCount; c++) {
            const col = XLSX_LIB.utils.encode_col(c);

            const cell1 = col + '1';
            if (!ws[cell1]) ws[cell1] = { v: '', t: 's' };
            (ws[cell1] as import('xlsx-js-style').CellObject).s = headerStyle;

            const cell2 = col + '2';
            if (!ws[cell2]) ws[cell2] = { v: '', t: 's' };
            (ws[cell2] as import('xlsx-js-style').CellObject).s = standardStyle;

            for (let r = 2; r < rowCount; r++) {
                const addr = col + (r + 1);
                if (!ws[addr]) ws[addr] = { v: '', t: 's' };
                (ws[addr] as import('xlsx-js-style').CellObject).s = dataStyle;
            }
        }

        const cols: Array<{ wch: number }> = [];
        for (let c = 0; c < colCount; c++) {
            if (c < 6) cols.push({ wch: c === 2 ? 20 : 10 });
            else cols.push({ wch: 12 });
        }
        ws['!cols'] = cols;
    }
}

// ========================================
// 페이지 초기화
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 2; y <= currentYear + 5; y++) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        }
    }

    window.heavyMetalAnalysisManager = new HeavyMetalAnalysisManager();
});
