/**
 * @fileoverview 퇴·액비 분석결과 조회 (TypeScript)
 * 퇴·액비 접수 데이터(compostSampleLogs)를 읽어와 분석 결과를 입력하고
 * 엑셀(.xlsx)로 내보내는 페이지 스크립트
 *
 * 가축분퇴비·액비 공정규격: 함수율, 부숙도, 염분, 구리(Cu), 아연(Zn)
 */

export {};

// ========================================
// 타입 정의
// ========================================

interface CompostResultField {
    key: string;
    label: string;
    unit: string;
    type?: 'select';
    options?: string[];
}

interface CompostSampleLog {
    id: string;
    receptionNumber?: string;
    name?: string;
    date?: string;
    animalType?: string;
    sampleType?: string;
    isComplete?: boolean;
    [key: string]: unknown;
}

interface CompostFlatRow {
    key: string;
    log: CompostSampleLog;
}

interface CompostTestResult {
    testDate?: string;
    moisture?: string;
    maturity?: string;
    salinity?: string;
    copper?: string;
    zinc?: string;
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
        compostAnalysisManager?: CompostAnalysisManager;
        sanitizeExcelAoa?: (aoa: unknown[][]) => unknown[][];
    }
}

// ========================================
// 상수 정의 — 분석 항목 (FLAT 배열)
// ========================================

const ALL_COMPOST_RESULT_FIELDS: CompostResultField[] = [
    { key: 'moisture', label: '함수율', unit: '%' },
    {
        key: 'maturity',
        label: '부숙도',
        unit: '',
        type: 'select',
        options: ['', '미부숙', '부숙초기', '부숙중기', '부숙완료', '완전부숙'],
    },
    { key: 'salinity', label: '염분', unit: '%' },
    { key: 'copper', label: '구리(Cu)', unit: 'mg/kg' },
    { key: 'zinc', label: '아연(Zn)', unit: 'mg/kg' },
];

// 결과 필드 순서: testDate + 분석항목 + judgment
const RESULT_FIELD_KEYS = [
    'testDate',
    ...ALL_COMPOST_RESULT_FIELDS.map(f => f.key),
    'judgment',
];

// ========================================
// CompostAnalysisManager 클래스
// ========================================

class CompostAnalysisManager {
    private selectedYear: string;
    private sampleLogs: CompostSampleLog[];
    private testResults: Record<string, CompostTestResult>;
    private flatRows: CompostFlatRow[];
    private selectedKeys: Set<string>;
    private focusedCell: FocusedCell | null;
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
        this.restoreFromCompostPage();
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

    private restoreFromCompostPage(): void {
        const year = localStorage.getItem('compostAnalysis_year');
        const selectedIdsJson = localStorage.getItem('compostAnalysis_selected_ids');

        if (year) {
            this.selectedYear = year;
            if (this.yearSelect) this.yearSelect.value = year;
            localStorage.removeItem('compostAnalysis_year');
        }

        if (selectedIdsJson) {
            try {
                const ids: unknown = JSON.parse(selectedIdsJson);
                this.preSelectedLogIds = Array.isArray(ids) && ids.length > 0 ? new Set(ids as string[]) : null;
            } catch {
                this.preSelectedLogIds = null;
            }
            localStorage.removeItem('compostAnalysis_selected_ids');
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

    private loadSampleLogs(): CompostSampleLog[] {
        // BaseSampleManager 포맷: test_compostSampleLogs_{year}
        const key = `test_compostSampleLogs_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            const parsed: unknown = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return (parsed as CompostSampleLog[]).sort((a, b) => {
                const toNum = (s: string | undefined): number => {
                    if (!s) return Infinity;
                    const n = parseFloat(String(s));
                    return isNaN(n) ? Infinity : n;
                };
                return toNum(a.receptionNumber) - toNum(b.receptionNumber);
            });
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 접수 데이터 로드 실패:', e);
            return [];
        }
    }

    private loadTestResults(): Record<string, CompostTestResult> {
        const key = `compostTestResults_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return {};
            return (JSON.parse(data) as Record<string, CompostTestResult>) || {};
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 검사 결과 로드 실패:', e);
            return {};
        }
    }

    private saveTestResults(): void {
        const key = `compostTestResults_${this.selectedYear}`;
        try {
            localStorage.setItem(key, JSON.stringify(this.testResults));
            this.syncTestResultsToFirestore();
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 검사 결과 저장 실패:', e);
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

            await window.firestoreDb.batchSave('compostTestResults', year, documents);
            (window.logger?.info || console.log)(`[퇴·액비] Firestore 동기화 완료: ${documents.length}건`);
        } catch (e) {
            (window.logger?.error || console.error)('[퇴·액비] Firestore 동기화 실패:', e);
        }
    }

    private async syncTestResultsFromFirestore(): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const cloudData = await window.firestoreDb.getAll('compostTestResults', year);
            if (!cloudData || cloudData.length === 0) return;

            const cloudMap: Record<string, CompostTestResult> = {};
            for (const doc of cloudData) {
                const docRecord = doc as Record<string, unknown>;
                const key = (docRecord._resultKey || docRecord.id) as string | undefined;
                if (key) {
                    const { _resultKey: _rk, syncedAt: _sa, updatedAt: _ua, ...rest } = docRecord;
                    void _rk; void _sa; void _ua;
                    cloudMap[key] = rest as CompostTestResult;
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
            const lsKey = `compostTestResults_${this.selectedYear}`;
            localStorage.setItem(lsKey, JSON.stringify(this.testResults));
            this.render();
            (window.logger?.info || console.log)('[퇴·액비] Firestore → localStorage 동기화 완료');
        } catch (e) {
            (window.logger?.error || console.error)('[퇴·액비] Firestore 로드 실패:', e);
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
    }

    private createTableRow(row: CompostFlatRow, rowIdx: number): HTMLTableRowElement {
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
        // 축종
        this.addStaticCell(tr, 'col-animaltype sticky-col', row.log.animalType || '');
        // 시료종류
        this.addStaticCell(tr, 'col-sampletype sticky-col', row.log.sampleType || '');
        // 접수일자
        this.addStaticCell(tr, 'col-date sticky-col', row.log.date || '');

        // 편집 가능한 결과 필드들
        for (let ci = 0; ci < RESULT_FIELD_KEYS.length; ci++) {
            const field = RESULT_FIELD_KEYS[ci];
            const fieldDef = ALL_COMPOST_RESULT_FIELDS.find(f => f.key === field);
            const td = document.createElement('td');

            let cssClass = 'col-result editable-cell';
            if (field === 'testDate') cssClass += ' col-testdate';
            else if (field === 'judgment') cssClass += ' col-judgment';
            else cssClass += ' col-field';

            td.className = cssClass;
            td.setAttribute('data-row', String(rowIdx));
            td.setAttribute('data-col', String(ci));
            td.setAttribute('data-field', field);

            if (field === 'judgment') {
                // 판정 필드: 클릭으로 토글
                const val = result[field] || '';
                td.textContent = val === 'pass' ? '적합' : val === 'fail' ? '부적합' : (val as string);
                if (val === 'pass') td.classList.add('judgment-pass');
                else if (val === 'fail') td.classList.add('judgment-fail');
                td.addEventListener('click', (e: Event) => {
                    e.preventDefault();
                    this.cycleJudgment(row.key, td);
                });
                td.contentEditable = 'false';
            } else if (fieldDef?.type === 'select') {
                // 부숙도 셀: select 드롭다운
                td.contentEditable = 'false';
                td.classList.remove('editable-cell');
                td.classList.add('select-cell');

                const sel = document.createElement('select');
                sel.className = 'cell-select';
                const options = fieldDef.options || [''];
                for (const opt of options) {
                    const o = document.createElement('option');
                    o.value = opt;
                    o.textContent = opt || '—';
                    sel.appendChild(o);
                }
                sel.value = result[field] || '';
                sel.addEventListener('change', () => {
                    this.handleCellEdit(row.key, field, sel.value);
                });
                td.appendChild(sel);
            } else {
                // 일반 편집 셀
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
    }

    private moveFocus(rowIdx: number, colIdx: number, direction: number = 1): void {
        if (colIdx >= RESULT_FIELD_KEYS.length) { colIdx = 0; rowIdx++; }
        if (colIdx < 0) { colIdx = RESULT_FIELD_KEYS.length - 1; rowIdx--; }
        if (rowIdx < 0 || rowIdx >= this.flatRows.length) return;

        // judgment 및 select 컬럼 건너뛰기
        const maxIter = RESULT_FIELD_KEYS.length * 2;
        let iter = 0;
        while (iter++ < maxIter) {
            const field = RESULT_FIELD_KEYS[colIdx];
            const fieldDef = ALL_COMPOST_RESULT_FIELDS.find(f => f.key === field);
            if (field === 'judgment' || fieldDef?.type === 'select') {
                colIdx += direction;
            } else break;

            if (colIdx >= RESULT_FIELD_KEYS.length) { colIdx = 0; rowIdx++; }
            if (colIdx < 0) { colIdx = RESULT_FIELD_KEYS.length - 1; rowIdx--; }
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
                if (targetCol >= RESULT_FIELD_KEYS.length) break;

                const field = RESULT_FIELD_KEYS[targetCol];
                if (field === 'judgment') continue;

                const fieldDef = ALL_COMPOST_RESULT_FIELDS.find(f => f.key === field);
                if (fieldDef?.type === 'select') continue;

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
            this.applyExportStyles(XLSX_LIB, ws, wsData.length, ALL_COMPOST_RESULT_FIELDS.length + 7);
            XLSX_LIB.utils.book_append_sheet(wb, ws, '퇴·액비 분석결과');

            const fileName = `퇴액비분석결과_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX_LIB.writeFile(wb, fileName);

            if (window.showToast) {
                window.showToast(`${targetRows.length}건 퇴·액비 분석결과를 내보냈습니다.`, 'success');
            }
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 내보내기 실패:', e);
            if (window.showToast) window.showToast('내보내기에 실패했습니다.', 'error');
        }
    }

    private buildSheet(rows: CompostFlatRow[]): (string | number)[][] {
        const data: (string | number)[][] = [];

        // 1행: 헤더
        const header: string[] = [
            '접수번호', '성명', '축종', '시료종류', '접수일자', '검사일자',
            ...ALL_COMPOST_RESULT_FIELDS.map(f => f.unit ? `${f.label}(${f.unit})` : f.label),
            '판정'
        ];
        data.push(header);

        // 데이터 행
        for (const row of rows) {
            const result = this.testResults[row.key] || {};
            const dataRow: string[] = [
                row.log.receptionNumber || '',
                row.log.name || '',
                row.log.animalType || '',
                row.log.sampleType || '',
                row.log.date || '',
                result.testDate || '',
                ...ALL_COMPOST_RESULT_FIELDS.map(f => result[f.key] || ''),
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
            fill: { fgColor: { rgb: 'F6D28C' } },
            font: { bold: true, sz: 10 },
            alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
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

            for (let r = 1; r < rowCount; r++) {
                const addr = col + (r + 1);
                if (!ws[addr]) ws[addr] = { v: '', t: 's' };
                (ws[addr] as import('xlsx-js-style').CellObject).s = dataStyle;
            }
        }

        const cols: Array<{ wch: number }> = [];
        for (let c = 0; c < colCount; c++) {
            if (c === 0) cols.push({ wch: 10 });
            else if (c === 1) cols.push({ wch: 10 });
            else if (c === 2) cols.push({ wch: 12 });
            else if (c === 3) cols.push({ wch: 14 });
            else if (c === 4) cols.push({ wch: 11 });
            else if (c === 5) cols.push({ wch: 11 });
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

    window.compostAnalysisManager = new CompostAnalysisManager();
});
