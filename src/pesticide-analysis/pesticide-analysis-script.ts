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
    engName?: string;
    equipment?: string;
    origRaw?: string;
    origDil?: string;
    origVal?: string;
    acidRaw?: string;
    acidDil?: string;
    acidVal?: string;
    value: string | number;
    // Legacy fields
    rawValue?: string | number;
    dilution?: string;
    method?: string;
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
    /** 진행 중인 IDB 저장 promise (fire-and-forget 갭 차단용) */
    private _pendingIdbSave: Promise<void> | null = null;
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

    private async init(): Promise<void> {
        this.cacheElements();
        this.setDefaultYear();
        this.restoreFromPesticidePage();
        this.bindEvents();
        // 분석결과 IDB 초기화 + localStorage 자동 마이그레이션(멱등)
        try { await window.AnalysisDB?.init(); } catch (e) {
            (window.logger?.warn || console.warn)('AnalysisDB 초기화 실패(LS 폴백):', e);
        }
        await this.loadData();
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
            void this.loadData().then(() => this.render());
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

    private async loadData(): Promise<void> {
        this.sampleLogs = this.loadSampleLogs();
        this.testResults = await this.loadTestResults();
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

    private async loadTestResults(): Promise<Record<string, TestResult>> {
        const key = `pesticideTestResults_${this.selectedYear}`;
        // IDB 우선 (init에서 마이그레이션 완료 보장)
        if (window.AnalysisDB?.isReady?.()) {
            try {
                if (this._pendingIdbSave) { await this._pendingIdbSave.catch(() => {}); }
                const map = await window.AnalysisDB.getMap('pesticide', this.selectedYear);
                const typed = (map as Record<string, TestResult>) || {};
                if (Object.keys(typed).length > 0) return typed;
                // IDB 비어 있음 → LS 자가복구 폴백
                (window.logger?.warn || console.warn)('[AnalysisDB] pesticide IDB 빈 맵, LS 자가복구 시도 year=', this.selectedYear);
                const lsData = localStorage.getItem(key);
                if (!lsData) return {};
                const lsParsed = (JSON.parse(lsData) as Record<string, TestResult>) || {};
                if (Object.keys(lsParsed).length > 0) {
                    this._pendingIdbSave = window.AnalysisDB.saveMap('pesticide', this.selectedYear, lsParsed)
                        .catch(e2 => { (window.logger?.error || console.error)('IDB 자가복구 저장 실패:', e2); });
                }
                return lsParsed;
            } catch (e) {
                (window.logger?.warn || console.warn)('IDB 검사 결과 로드 실패, LS 폴백:', e);
            }
        }
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
                    const { _resultKey, syncedAt, ...rest } = doc as Record<string, unknown>;
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
            if (window.AnalysisDB?.isReady?.()) {
                this._pendingIdbSave = window.AnalysisDB.saveMap('pesticide', this.selectedYear, this.testResults)
                    .catch(() => {});
            }
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
        const detCount = detections.length;
        // 1 detection = 2행 (Original + Acid), 미입력/불검출 = 1행
        const totalRows = detCount > 0 ? detCount * 2 : 1;
        const rows: HTMLTableRowElement[] = [];

        if (detCount === 0) {
            // 미입력 또는 전체 불검출: 1행
            const tr = document.createElement('tr');
            if (log.isComplete) tr.classList.add('row-completed');

            this.addCell(tr, 'col-num sticky-col', log.receptionNumber || '-');
            this.addCell(tr, 'col-date sticky-col', log.date || '-');
            this.addCell(tr, 'col-name sticky-col', log.name || '-');
            this.addCell(tr, 'col-crop sticky-col', log.requestContent || log.cropName || '-');
            this.addCell(tr, 'col-purpose sticky-col', log.purpose || '-');
            this.addCell(tr, 'col-test-date', result?.testDate || '-');

            const tdCount = document.createElement('td');
            tdCount.className = 'col-detection-count';
            if (isAllNd) { tdCount.textContent = '불검출'; tdCount.classList.add('all-clean'); }
            else { tdCount.textContent = '-'; tdCount.classList.add('no-result'); }
            tr.appendChild(tdCount);

            this.addCell(tr, 'col-det-equip', '');
            const tdName = document.createElement('td');
            tdName.className = 'col-det-name';
            tdName.colSpan = 4;
            if (isAllNd) { tdName.textContent = '전체 불검출'; tdName.classList.add('det-clean'); }
            else { tdName.textContent = '미입력'; tdName.classList.add('det-empty'); }
            tr.appendChild(tdName);

            const tdJ = document.createElement('td');
            tdJ.className = 'col-judgment';
            if (isAllNd) { tdJ.textContent = '불검출'; tdJ.classList.add('judgment-pass'); }
            else { tdJ.textContent = '-'; }
            tr.appendChild(tdJ);

            rows.push(tr);
        } else {
            // 검출 농약 있음: detection당 2행
            for (let i = 0; i < detCount; i++) {
                const det = detections[i];
                const isFirst = i === 0;

                // Original 행
                const trOrig = document.createElement('tr');
                if (log.isComplete) trOrig.classList.add('row-completed');

                if (isFirst) {
                    this.addMergedCell(trOrig, 'col-num sticky-col', log.receptionNumber || '-', totalRows);
                    this.addMergedCell(trOrig, 'col-date sticky-col', log.date || '-', totalRows);
                    this.addMergedCell(trOrig, 'col-name sticky-col', log.name || '-', totalRows);
                    this.addMergedCell(trOrig, 'col-crop sticky-col', log.requestContent || log.cropName || '-', totalRows);
                    this.addMergedCell(trOrig, 'col-purpose sticky-col', log.purpose || '-', totalRows);
                    this.addMergedCell(trOrig, 'col-test-date', result?.testDate || '-', totalRows);

                    const tdCount = document.createElement('td');
                    tdCount.className = 'col-detection-count';
                    tdCount.rowSpan = totalRows;
                    tdCount.textContent = `${detCount}종`;
                    tdCount.classList.add('has-detected');
                    trOrig.appendChild(tdCount);
                }

                // 장비 + 농약명 (2행 병합)
                const equipVal = det.equipment || '';
                const equipClass = equipVal === 'LC' ? 'col-det-equip equip-lc' : 'col-det-equip equip-gc';
                this.addMergedCell(trOrig, equipClass, equipVal, 2);
                // 정성 농약 매칭: engName 우선, 없으면 name 사용
                const lookupName = det.engName || det.name || '';
                const isQual = window.isQualitativePesticide?.(lookupName);
                const nameClass = isQual ? 'col-det-name det-name-qualitative' : 'col-det-name';
                this.addMergedCell(trOrig, nameClass, det.name || '', 2);

                // Original 분석 결과
                this.addCell(trOrig, 'col-det-val', String(det.origRaw || det.rawValue || ''));
                this.addCell(trOrig, 'col-det-val', String(det.origDil || det.dilution || ''));
                this.addCell(trOrig, 'col-det-val', String(det.origVal || det.value || ''));
                const tdOrigType = document.createElement('td');
                tdOrigType.className = 'col-det-type pa-type-orig';
                tdOrigType.textContent = 'Original';
                trOrig.appendChild(tdOrigType);

                // 판정 (첫 detection의 Original 행에만)
                if (isFirst) {
                    const tdJ = document.createElement('td');
                    tdJ.className = 'col-judgment';
                    tdJ.rowSpan = totalRows;
                    tdJ.textContent = '검출';
                    tdJ.classList.add('judgment-fail');
                    trOrig.appendChild(tdJ);
                }

                rows.push(trOrig);

                // Acid 행
                const trAcid = document.createElement('tr');
                trAcid.className = 'det-acid-row';
                if (log.isComplete) trAcid.classList.add('row-completed');

                this.addCell(trAcid, 'col-det-val', det.acidRaw || '');
                this.addCell(trAcid, 'col-det-val', det.acidDil || '');
                this.addCell(trAcid, 'col-det-val', det.acidVal || '');
                const tdAcidType = document.createElement('td');
                tdAcidType.className = 'col-det-type pa-type-acid';
                tdAcidType.textContent = 'Acid';
                trAcid.appendChild(tdAcidType);

                rows.push(trAcid);
            }
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
            // 정성 농약명 행 인덱스 추적 (engName 기준 매칭)
            const qualRowIndices = new Set<number>();
            const isQualFn = window.isQualitativePesticide;

            // 헤더
            data.push(['접수번호', '접수일자', '성명', '의뢰물품', '목적', '검사일자', '검출수', '장비', '검출농약', '기기분석값\nng/kg', '희석배수', '검출량\nmg/kg', '분석법', '판정']);

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
                    data.push([...baseRow, '', isAllNd ? '전체 불검출' : '', '', '', '', '', judgment]);
                } else {
                    for (let i = 0; i < detections.length; i++) {
                        const d = detections[i];
                        const isFirst = i === 0;
                        const rowBase: (string | number)[] = isFirst ? [...baseRow] : ['', '', '', '', '', '', ''];

                        // Original 행
                        const origRowIdx = data.length; // 0-based, 헤더 포함
                        data.push([...rowBase, d.equipment || '', d.name || '',
                            d.origRaw || d.rawValue || '', d.origDil || d.dilution || '', d.origVal || d.value || '',
                            'Original', isFirst ? judgment : '']);

                        // Acid 행
                        data.push(['', '', '', '', '', '', '', '', '',
                            d.acidRaw || '', d.acidDil || '', d.acidVal || '',
                            'Acid', '']);

                        // 정성 농약 추적 (engName 우선)
                        const lookupName = d.engName || d.name || '';
                        if (isQualFn?.(lookupName)) {
                            qualRowIndices.add(origRowIdx);
                        }
                    }
                }
            }

            const ws = XLSX.utils.aoa_to_sheet(data);

            const totalCols = data[0]?.length || 14;
            // 셀 병합
            const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
            // 접수정보 병합 컬럼: 0~6
            const infoMergeCols = [0, 1, 2, 3, 4, 5, 6];
            // 장비+농약명 병합 컬럼: 7, 8
            const detMergeCols = [7, 8];
            // 판정 컬럼: 13
            const judgmentCol = 13;

            let currentRow = 1; // 0은 헤더
            for (const { result } of rows) {
                const detections = result?.detections || [];
                const detCount = Math.max(detections.length, 1);
                const totalRows = detections.length > 0 ? detCount * 2 : 1;

                // 접수정보 + 판정: 전체 행 병합
                if (totalRows > 1) {
                    for (const col of infoMergeCols) {
                        merges.push({ s: { r: currentRow, c: col }, e: { r: currentRow + totalRows - 1, c: col } });
                    }
                    merges.push({ s: { r: currentRow, c: judgmentCol }, e: { r: currentRow + totalRows - 1, c: judgmentCol } });
                }

                // 장비+농약명: 각 detection의 2행씩 병합
                if (detections.length > 0) {
                    for (let i = 0; i < detections.length; i++) {
                        const detStartRow = currentRow + (i * 2);
                        for (const col of detMergeCols) {
                            merges.push({ s: { r: detStartRow, c: col }, e: { r: detStartRow + 1, c: col } });
                        }
                    }
                }

                currentRow += totalRows;
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

            // 정성 농약명 파란색 스타일
            const qualNameStyle = {
                alignment: { horizontal: 'left' as const, vertical: 'center' as const },
                font: { bold: true, color: { rgb: '1D4ED8' } },
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

                    if (c === 8) {
                        // 농약명 컬럼: 행 인덱스 기반 정성 매칭 (engName 사용)
                        const isQual = qualRowIndices.has(r);
                        (ws[addr] as Record<string, unknown>).s = isQual ? qualNameStyle : nameStyle;
                    } else {
                        (ws[addr] as Record<string, unknown>).s = dataStyle;
                    }
                }
            }

            ws['!cols'] = [
                { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
                { wch: 10 }, { wch: 12 }, { wch: 8 },
                { wch: 5 }, { wch: 22 },
                { wch: 12 }, { wch: 8 }, { wch: 10 },
                { wch: 8 }, { wch: 8 }
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
