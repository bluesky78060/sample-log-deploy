/**
 * @fileoverview 잔류농약 분석결과 조회 페이지
 * 접수 데이터 + 분석 결과(pesticideTestResults)를 합쳐서
 * 시료별 검출 농약 목록을 테이블로 표시
 */

// ========================================
// Types
// ========================================

/** 검출 농약 1건 */
interface Detection {
    name: string;
    rawValue?: string | number;
    value: string | number;
    method: string;
}

/** 분석 결과 (시료 1건에 대한 분석 결과) */
interface TestResult {
    testDate?: string;
    allNd?: boolean;
    detections?: Detection[];
    updatedAt?: string;
    [key: string]: unknown;
}

/** 시료 접수 로그 */
interface SampleLog {
    id: string;
    receptionNumber?: string;
    date?: string;
    name?: string;
    requestContent?: string;
    cropName?: string;
    purpose?: string;
    isComplete?: boolean;
    [key: string]: unknown;
}

/** 필터된 행 */
interface FilteredRow {
    log: SampleLog;
    result: TestResult | null;
}

/** 필터 상태 */
type FilterStatus = 'all' | 'detected' | 'clean' | 'noResult';

// 모듈 스코프로 전환 (declare global 사용을 위해)
export {};

// Window 확장
declare global {
    interface Window {
        ThemeManager?: { init(): void; setTheme(theme: string): void };
        pesticideAnalysisViewer?: PesticideAnalysisViewer;
    }
}

// ========================================
// PesticideAnalysisViewer
// ========================================

class PesticideAnalysisViewer {
    private selectedYear: string;
    private sampleLogs: SampleLog[];
    private testResults: Record<string, TestResult>;
    private filterStatus: FilterStatus;
    private preSelectedLogIds: Set<string> | null;

    // DOM elements
    private yearSelect: HTMLSelectElement | null;
    private filterSelect: HTMLSelectElement | null;
    private exportBtn: HTMLElement | null;
    private tableBody: HTMLElement | null;
    private emptyState: HTMLElement | null;
    private recordCount: HTMLElement | null;

    constructor() {
        this.selectedYear = new Date().getFullYear().toString();
        this.sampleLogs = [];
        this.testResults = {};
        this.filterStatus = 'all';
        this.preSelectedLogIds = null;

        this.yearSelect = null;
        this.filterSelect = null;
        this.exportBtn = null;
        this.tableBody = null;
        this.emptyState = null;
        this.recordCount = null;

        this.init();
    }

    private init(): void {
        this.cacheElements();
        this.setDefaultYear();
        this.restoreFromPesticidePage();
        this.bindEvents();
        this.loadData();
        this.render();

        if (window.ThemeManager) {
            window.ThemeManager.init();
            this.setupThemeToggle();
        }

        this.syncFromFirestore();
    }

    private cacheElements(): void {
        this.yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
        this.filterSelect = document.getElementById('filterStatus') as HTMLSelectElement | null;
        this.exportBtn = document.getElementById('exportBtn');
        this.tableBody = document.getElementById('tableBody');
        this.emptyState = document.getElementById('emptyState');
        this.recordCount = document.getElementById('recordCount');
    }

    private setDefaultYear(): void {
        const year = new Date().getFullYear().toString();
        this.selectedYear = year;
        if (this.yearSelect) this.yearSelect.value = year;
    }

    private restoreFromPesticidePage(): void {
        const year = localStorage.getItem('pesticideAnalysis_year');
        if (year) {
            this.selectedYear = year;
            if (this.yearSelect) this.yearSelect.value = year;
            localStorage.removeItem('pesticideAnalysis_year');
        }

        const selectedIdsJson = localStorage.getItem('pesticideAnalysis_selected_ids');
        if (selectedIdsJson) {
            try {
                const ids: unknown = JSON.parse(selectedIdsJson);
                this.preSelectedLogIds = Array.isArray(ids) && ids.length > 0 ? new Set(ids as string[]) : null;
            } catch {
                this.preSelectedLogIds = null;
            }
            localStorage.removeItem('pesticideAnalysis_selected_ids');
        }

        document.getElementById('backBtn')?.addEventListener('click', () => window.close());
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
            this.loadData();
            this.render();
        });

        this.filterSelect?.addEventListener('change', () => {
            this.filterStatus = this.filterSelect!.value as FilterStatus;
            this.render();
        });

        this.exportBtn?.addEventListener('click', () => this.exportToExcel());
    }

    // ========================================
    // 데이터 로드
    // ========================================

    private loadData(): void {
        this.sampleLogs = this.loadSampleLogs();
        this.testResults = this.loadTestResults();
    }

    private loadSampleLogs(): SampleLog[] {
        const key = `pesticideSampleLogs_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return [];
            const parsed: unknown = JSON.parse(data);
            if (!Array.isArray(parsed)) return [];
            return (parsed as SampleLog[]).sort((a, b) => {
                const toNum = (s: string | undefined): number => {
                    if (!s) return Infinity;
                    const n = parseFloat(String(s));
                    return isNaN(n) ? Infinity : n;
                };
                return toNum(a.receptionNumber) - toNum(b.receptionNumber);
            });
        } catch {
            return [];
        }
    }

    private loadTestResults(): Record<string, TestResult> {
        const key = `pesticideTestResults_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return {};
            return (JSON.parse(data) as Record<string, TestResult>) || {};
        } catch {
            return {};
        }
    }

    private async syncFromFirestore(): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const cloudData = await window.firestoreDb.getAll('pesticideTestResults', year);
            if (!cloudData || cloudData.length === 0) return;

            const cloudMap: Record<string, TestResult> = {};
            for (const doc of cloudData) {
                const key = (doc as Record<string, unknown>)._resultKey as string || (doc as Record<string, unknown>).id as string;
                if (key) {
                    const { _resultKey, syncedAt, updatedAt: _, ...rest } = doc as Record<string, unknown>;
                    void _resultKey;
                    void syncedAt;
                    cloudMap[key] = rest as TestResult;
                }
            }

            // updatedAt 기준 병합 (최신 데이터 우선)
            for (const [key, cloudVal] of Object.entries(cloudMap)) {
                const localVal = this.testResults[key];
                if (!localVal || !localVal.updatedAt || new Date(cloudVal.updatedAt || '') >= new Date(localVal.updatedAt)) {
                    this.testResults[key] = cloudVal;
                }
            }
            localStorage.setItem(`pesticideTestResults_${this.selectedYear}`, JSON.stringify(this.testResults));
            this.render();
        } catch (e: unknown) {
            (window.logger?.error || console.error)('Firestore 동기화 실패:', e);
        }
    }

    // ========================================
    // 렌더링
    // ========================================

    private render(): void {
        if (!this.tableBody) return;

        const rows = this.getFilteredRows();

        if (rows.length === 0) {
            this.tableBody.innerHTML = '';
            if (this.emptyState) this.emptyState.style.display = 'flex';
            if (this.recordCount) this.recordCount.textContent = '0건';
            return;
        }

        if (this.emptyState) this.emptyState.style.display = 'none';
        if (this.recordCount) this.recordCount.textContent = `${rows.length}건`;

        const fragment = document.createDocumentFragment();
        for (const { log, result } of rows) {
            const trs = this.createTableRows(log, result);
            for (const tr of trs) fragment.appendChild(tr);
        }

        this.tableBody.innerHTML = '';
        this.tableBody.appendChild(fragment);
    }

    private getFilteredRows(): FilteredRow[] {
        const logsToShow = (this.preSelectedLogIds && this.preSelectedLogIds.size > 0)
            ? this.sampleLogs.filter(log => this.preSelectedLogIds!.has(log.id))
            : this.sampleLogs;

        return logsToShow
            .map(log => ({
                log,
                result: this.testResults[log.id] || null
            }))
            .filter(({ result }) => {
                if (this.filterStatus === 'all') return true;
                if (this.filterStatus === 'detected') return (result?.detections?.length ?? 0) > 0;
                if (this.filterStatus === 'clean') return result?.allNd === true;
                if (this.filterStatus === 'noResult') return !result || (!result.allNd && (!result.detections || result.detections.length === 0));
                return true;
            });
    }

    /**
     * 시료 1건에 대해 검출 농약 수만큼 행 배열을 반환
     * 접수정보 셀은 rowSpan으로 병합
     */
    private createTableRows(log: SampleLog, result: TestResult | null): HTMLTableRowElement[] {
        const detections = result?.detections || [];
        const isAllNd = result?.allNd || false;
        const rowCount = Math.max(detections.length, 1);
        const rows: HTMLTableRowElement[] = [];

        for (let i = 0; i < rowCount; i++) {
            const tr = document.createElement('tr');
            if (log.isComplete) tr.classList.add('row-completed');
            if (i > 0) tr.classList.add('det-sub-row');

            // 첫 번째 행에만 접수 정보 (rowSpan 적용)
            if (i === 0) {
                this.addMergedCell(tr, 'col-num sticky-col', log.receptionNumber || '-', rowCount);
                this.addMergedCell(tr, 'col-date sticky-col', log.date || '-', rowCount);
                this.addMergedCell(tr, 'col-name sticky-col', log.name || '-', rowCount);
                this.addMergedCell(tr, 'col-crop sticky-col', log.requestContent || log.cropName || '-', rowCount);
                this.addMergedCell(tr, 'col-purpose sticky-col', log.purpose || '-', rowCount);
                this.addMergedCell(tr, 'col-test-date', result?.testDate || '-', rowCount);

                // 검출수
                const tdCount = document.createElement('td');
                tdCount.className = 'col-detection-count';
                if (rowCount > 1) tdCount.rowSpan = rowCount;
                if (isAllNd) {
                    tdCount.textContent = '불검출';
                    tdCount.classList.add('all-clean');
                } else if (detections.length === 0) {
                    tdCount.textContent = '-';
                    tdCount.classList.add('no-result');
                } else {
                    tdCount.textContent = `${detections.length}종`;
                    tdCount.classList.add('has-detected');
                }
                tr.appendChild(tdCount);
            }

            // 농약명 / 검출량 / 분석법
            if (detections.length === 0) {
                // 미입력 또는 전체 불검출
                const tdName = document.createElement('td');
                tdName.className = 'col-det-name';
                if (isAllNd) {
                    tdName.textContent = '전체 불검출';
                    tdName.classList.add('det-clean');
                } else {
                    tdName.textContent = '미입력';
                    tdName.classList.add('det-empty');
                }
                tr.appendChild(tdName);
                this.addCell(tr, 'col-det-raw', '');
                this.addCell(tr, 'col-det-value', '');
                this.addCell(tr, 'col-det-method', '');
            } else {
                const det = detections[i];
                const tdDetName = document.createElement('td');
                tdDetName.className = 'col-det-name';
                tdDetName.textContent = det.name || '';
                tr.appendChild(tdDetName);

                this.addCell(tr, 'col-det-raw', det.rawValue ? `${det.rawValue}` : '');
                this.addCell(tr, 'col-det-value', det.value ? `${det.value}` : '');
                this.addCell(tr, 'col-det-method', det.method || '');
            }

            // 판정 (첫 행에만)
            if (i === 0) {
                const tdJudgment = document.createElement('td');
                tdJudgment.className = 'col-judgment';
                if (rowCount > 1) tdJudgment.rowSpan = rowCount;
                if (isAllNd) {
                    tdJudgment.textContent = '불검출';
                    tdJudgment.classList.add('judgment-pass');
                } else if (detections.length > 0) {
                    tdJudgment.textContent = '검출';
                    tdJudgment.classList.add('judgment-fail');
                } else {
                    tdJudgment.textContent = '-';
                }
                tr.appendChild(tdJudgment);
            }

            rows.push(tr);
        }

        return rows;
    }

    private addMergedCell(tr: HTMLTableRowElement, className: string, text: string, rowSpan: number): void {
        const td = document.createElement('td');
        td.className = className;
        td.textContent = text;
        if (rowSpan > 1) td.rowSpan = rowSpan;
        tr.appendChild(td);
    }

    private addCell(tr: HTMLTableRowElement, className: string, text: string): void {
        const td = document.createElement('td');
        td.className = className;
        td.textContent = text;
        tr.appendChild(td);
    }

    // ========================================
    // 내보내기
    // ========================================

    private exportToExcel(): void {
        const rows = this.getFilteredRows();
        if (rows.length === 0) {
            if (window.showToast) window.showToast('내보낼 데이터가 없습니다.', 'warning');
            return;
        }

        try {
            const XLSX = window.XLSX;
            if (!XLSX) {
                if (window.showToast) window.showToast('XLSX 라이브러리를 찾을 수 없습니다.', 'error');
                return;
            }

            const wb = XLSX.utils.book_new();
            const data: (string | number)[][] = [];

            // 헤더
            data.push(['접수번호', '접수일자', '성명', '의뢰물품', '목적', '검사일자', '검출수', '검출농약', '기기분석값(ng/kg)', '검출량(mg/kg)', '분석법', '판정']);

            // 데이터 행: 시료당 검출 농약 수만큼 행 생성
            for (const { log, result } of rows) {
                const detections = result?.detections || [];
                const isAllNd = result?.allNd || false;
                const judgment = isAllNd ? '불검출' : (detections.length > 0 ? '검출' : '');
                const countStr = detections.length > 0 ? `${detections.length}종` : (isAllNd ? '불검출' : '');

                const baseRow: (string | number)[] = [
                    log.receptionNumber || '',
                    log.date || '',
                    log.name || '',
                    log.requestContent || log.cropName || '',
                    log.purpose || '',
                    result?.testDate || '',
                    countStr,
                ];

                if (detections.length === 0) {
                    // 검출 없음: 1행
                    data.push([...baseRow, isAllNd ? '전체 불검출' : '', '', '', '', judgment]);
                } else {
                    // 첫 번째 검출 농약: 접수 정보 포함
                    data.push([...baseRow, detections[0].name || '', detections[0].rawValue || '', detections[0].value || '', detections[0].method || '', judgment]);

                    // 2번째 이후: 접수 정보 빈칸, 검출 농약만
                    for (let i = 1; i < detections.length; i++) {
                        data.push(['', '', '', '', '', '', '', detections[i].name || '', detections[i].rawValue || '', detections[i].value || '', detections[i].method || '', '']);
                    }
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(data);

            const totalCols = data[0]?.length || 11;
            // 병합할 컬럼: 접수번호(0), 접수일자(1), 성명(2), 의뢰물품(3), 목적(4), 검사일자(5), 검출수(6), 판정(10)
            const mergeCols = [0, 1, 2, 3, 4, 5, 6, 10];
            const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];

            // 각 시료의 시작행과 검출 수를 추적하여 셀 병합
            let currentRow = 1; // 0은 헤더
            for (const { result } of rows) {
                const detections = result?.detections || [];
                const rowSpan = Math.max(detections.length, 1);

                if (rowSpan > 1) {
                    for (const col of mergeCols) {
                        merges.push({
                            s: { r: currentRow, c: col },
                            e: { r: currentRow + rowSpan - 1, c: col }
                        });
                    }
                }
                currentRow += rowSpan;
            }

            ws['!merges'] = merges;

            // 스타일
            const borderStyle = { style: 'thin' as const, color: { rgb: '808080' } };
            const border = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

            const headerStyle = {
                fill: { fgColor: { rgb: 'B4C6E7' } },
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border
            };

            const dataStyle = {
                alignment: { horizontal: 'center' as const, vertical: 'center' as const },
                border
            };

            const nameStyle = {
                alignment: { horizontal: 'left' as const, vertical: 'center' as const },
                border
            };

            for (let c = 0; c < totalCols; c++) {
                const col = (XLSX.utils as any).encode_col(c) as string;
                // 헤더
                const h = col + '1';
                if (!ws[h]) ws[h] = { v: '', t: 's' };
                (ws[h] as Record<string, unknown>).s = headerStyle;

                // 데이터 행
                for (let r = 1; r < data.length; r++) {
                    const addr = col + (r + 1);
                    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
                    (ws[addr] as Record<string, unknown>).s = (c === 7) ? nameStyle : dataStyle; // 검출농약 컬럼은 왼쪽 정렬
                }
            }

            ws['!cols'] = [
                { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
                { wch: 10 }, { wch: 12 }, { wch: 8 },
                { wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 8 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, '잔류농약분석결과');
            (XLSX as any).writeFile(wb, `잔류농약분석결과_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);

            if (window.showToast) window.showToast(`${rows.length}건 내보냈습니다.`, 'success');
        } catch (e: unknown) {
            (window.logger?.error || console.error)('내보내기 실패:', e);
            if (window.showToast) window.showToast('내보내기에 실패했습니다.', 'error');
        }
    }
}

// 초기화
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

    window.pesticideAnalysisViewer = new PesticideAnalysisViewer();
});
