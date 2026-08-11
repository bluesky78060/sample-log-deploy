/**
 * HeuktoramResultImporter
 *
 * 흙토람 결과 입력 페이지 — 엑셀 가져오기 모달 (Phase 1: 텍스트 붙여넣기).
 * 설계 문서: docs-internal/HEUKTORAM_RESULT_EXCEL_IMPORT_MODAL_DESIGN.md
 *
 * 사용법:
 *   const importer = new HeuktoramResultImporter({
 *       resultFields, fieldLabels, fieldRanges,
 *       getFlatRows, getTestResults, applyResults, syncToSiblings, saveTestResults,
 *   });
 *   importer.init();
 *   importer.open();
 *
 * @global window.HeuktoramResultImporter
 */
(function () {
    'use strict';

    // ============================================================
    // 상수
    // ============================================================
    const FILE_SIZE_WARN  = 5  * 1024 * 1024;   // 5MB: 경고만
    const FILE_SIZE_HARD  = 50 * 1024 * 1024;   // 50MB: 거부
    const PREVIEW_MATCHED_LIMIT   = 50;          // 미리보기 매칭 셀 최대 표시
    const PREVIEW_UNMATCHED_LIMIT = 20;          // 미리보기 미매칭 행 최대 표시
    const UTF8_BOM = '﻿';                   // CSV 한글 인식용 BOM (Excel)

    // ============================================================
    // 자동 매핑 사전 (lowercase·공백제거 정규화 키)
    // ============================================================
    const HEADER_PATTERNS = {
        // 매칭 키 후보
        '시료번호':                 { type: 'matchKey' },
        '시료이름':                 { type: 'matchKey' },
        '연번':                     { type: 'matchKey' },
        '번호':                     { type: 'matchKey' },
        '검체':                     { type: 'matchKey' },
        '정체':                     { type: 'matchKey' }, // 오타 대응
        '접수번호':                 { type: 'matchKey' },

        // 흙토람 결과 필드
        'ph':                       { type: 'field', key: 'pH' },
        'ec':                       { type: 'field', key: 'ec' },
        'calculatedecvalue':        { type: 'field', key: 'ec' },
        '유기물':                   { type: 'field', key: 'organicMatter' },
        '최종결과값om(g/kg)':         { type: 'field', key: 'organicMatter' },
        'om(g/kg)':                 { type: 'field', key: 'organicMatter' },
        'om':                       { type: 'field', key: 'organicMatter' },
        '인산':                     { type: 'field', key: 'availableP' },
        '유효인산':                 { type: 'field', key: 'availableP' },
        '규산':                     { type: 'field', key: 'silica' },
        '유효규산':                 { type: 'field', key: 'silica' },
        '치환성칼륨':               { type: 'field', key: 'exK' },
        'k':                        { type: 'field', key: 'exK' },
        '치환성칼슘':               { type: 'field', key: 'exCa' },
        'ca':                       { type: 'field', key: 'exCa' },
        '치환성마그네슘':           { type: 'field', key: 'exMg' },
        'mg':                       { type: 'field', key: 'exMg' },
        '석회요구량':               { type: 'field', key: 'limeReq' },
        '석회소요량':               { type: 'field', key: 'limeReq' },
        'no3-n':                    { type: 'field', key: 'NO3N' },
        'no3n':                     { type: 'field', key: 'NO3N' },
        'nh4-n':                    { type: 'field', key: 'NH4N' },
        'nh4n':                     { type: 'field', key: 'NH4N' },
        'cec':                      { type: 'field', key: 'cec' },
        '검정일자':                 { type: 'field', key: 'testDate' },
        '검정일':                   { type: 'field', key: 'testDate' },
        '토양오염도':               { type: 'field', key: 'soiling' },
        '성토':                     { type: 'field', key: 'soiling' },
        '토성':                     { type: 'field', key: 'clay' },
        '점토함량':                 { type: 'field', key: 'clay' },
        '용도코드':                 { type: 'field', key: 'usageCode' },
        '용도구분':                 { type: 'field', key: 'usageCode' },
    };

    function normalizeHeader(text) {
        return String(text || '').replace(/[\s\r\n]/g, '').toLowerCase();
    }

    function escapeHtml(s) {
        if (window.escapeHTML) return window.escapeHTML(String(s ?? ''));
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function csvEscape(s) {
        const v = String(s ?? '');
        return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }

    // ============================================================
    // 클래스
    // ============================================================
    class HeuktoramResultImporter {
        /**
         * @param {Object} cfg
         * @param {string[]} cfg.resultFields                - 흙토람 필드 키 배열
         * @param {Object<string,string>} cfg.fieldLabels    - 필드키 → 한글 라벨
         * @param {Object} cfg.fieldRanges                   - 필드키 → {min,max,label,unit}
         * @param {() => Array} cfg.getFlatRows              - 현재 화면 시료 행 목록
         * @param {() => Object} cfg.getTestResults          - 현재 결과 객체
         * @param {(rowKey:string, field:string, value:any) => void} cfg.applyResult
         * @param {(rowKey:string, field:string, value:any) => void} cfg.syncToSiblings
         * @param {() => void} cfg.saveTestResults
         * @param {() => void} [cfg.rerender]                - 저장 후 화면 재렌더 콜백
         */
        constructor(cfg) {
            this.cfg = cfg;
            this._els = null;
            this._state = this._initialState();
        }

        _initialState() {
            return {
                mode: 'file',                     // 'file' | 'paste'
                // 파일 모드
                fileName: '',
                sheets: {},                       // { [sheetName]: { rows: any[][], maxCol: number } }
                sheetNames: [],
                activeSheet: '',
                headerRowIdx: 0,                  // 0-based; -1이면 헤더 없음
                // 텍스트 모드
                rawText: '',
                hasHeader: true,
                // 공통
                matchKeyCol: -1,                  // -1 = 미지정
                fieldMapping: {},                 // { [fieldKey]: colIdx }
                fieldDecimals: {},                // { [fieldKey]: number } 0=정수, 1~3=소수점 자리수
                opts: {
                    skipEmpty: true,
                    syncSiblings: true,
                    conflictPolicy: 'preview',    // 'preview' | 'overwrite' | 'fillBlank' | 'skip'
                },
                preview: null,
            };
        }

        /** 숫자 값을 지정 소수점 자리수로 포맷 (숫자가 아니면 원본 반환) */
        _formatValue(value, decimals) {
            if (value == null || value === '') return '';
            // 이미 문자열 형태로 들어온 경우 trim
            const raw = String(value).trim();
            if (raw === '') return '';
            const num = Number(raw);
            if (Number.isNaN(num)) return raw;        // 숫자 아니면 원본 (날짜·문자 등)
            if (typeof decimals !== 'number' || decimals < 0) return raw;
            return num.toFixed(Math.min(decimals, 6));
        }

        // ============================================================
        // 초기화
        // ============================================================
        init() {
            this._els = {
                modal:        document.getElementById('resultImporterModal'),
                openBtn:      document.getElementById('importResultBtn'),
                closeBtn:     document.getElementById('closeResultImporterBtn'),
                cancelBtn:    document.getElementById('cancelResultImporterBtn'),
                saveBtn:      document.getElementById('saveResultImporterBtn'),
                csvBtn:       document.getElementById('downloadUnmatchedCsvBtn'),
                autoMapBtn:   document.getElementById('autoMapImporterBtn'),
                clearBtn:     document.getElementById('clearImporterBtn'),
                // 모드 토글 + 패널
                modeRads:     document.querySelectorAll('input[name="importerMode"]'),
                fileMode:     document.getElementById('importerFileMode'),
                pasteMode:    document.getElementById('importerPasteMode'),
                // 파일 모드
                dropzone:     document.getElementById('importerDropzone'),
                fileInput:    document.getElementById('importerFileInput'),
                selectFileBtn:document.getElementById('importerSelectFileBtn'),
                fileInfo:     document.getElementById('importerFileInfo'),
                fileControls: document.getElementById('importerFileControls'),
                sheetSelect:  document.getElementById('importerSheetSelect'),
                headerRow:    document.getElementById('importerHeaderRow'),
                noHeaderCB:   document.getElementById('importerNoHeader'),
                filePreview:  document.getElementById('importerFilePreview'),
                filePreviewBody: document.getElementById('importerFilePreviewBody'),
                // 텍스트 모드
                textarea:     document.getElementById('importerTextarea'),
                hasHeaderCB:  document.getElementById('importerHasHeader'),
                // 공통
                matchKeySel:  document.getElementById('importerMatchKey'),
                fieldMapArea: document.getElementById('importerFieldMapping'),
                skipEmptyCB:  document.getElementById('importerSkipEmpty'),
                syncSibCB:    document.getElementById('importerSyncSiblings'),
                conflictRads: document.querySelectorAll('input[name="importerConflictPolicy"]'),
                summary:      document.getElementById('importerSummary'),
                previewList:  document.getElementById('importerPreviewList'),
            };

            if (!this._els.modal) {
                (window.logger?.warn || console.warn)('HeuktoramResultImporter: 모달 마크업 없음');
                return;
            }

            this._els.openBtn?.addEventListener('click', () => this.open());
            this._els.closeBtn?.addEventListener('click', () => this.close());
            this._els.cancelBtn?.addEventListener('click', () => this.close());
            this._els.modal.querySelector('.modal-overlay')
                ?.addEventListener('click', () => this.close());

            this._els.textarea?.addEventListener('input', () => {
                this._state.rawText = this._els.textarea.value;
                this._refreshAfterInput();
            });
            this._els.hasHeaderCB?.addEventListener('change', () => {
                this._state.hasHeader = this._els.hasHeaderCB.checked;
                this._refreshAfterInput();
            });

            // 모드 토글
            this._els.modeRads?.forEach(r => r.addEventListener('change', () => {
                if (r.checked) this._switchMode(r.value);
            }));

            // 파일 모드: 파일 선택 / 드래그앤드롭
            this._els.selectFileBtn?.addEventListener('click', () => this._els.fileInput?.click());
            this._els.fileInput?.addEventListener('change', (e) => {
                const f = e.target.files?.[0];
                if (f) this._handleFile(f);
                e.target.value = '';
            });
            const dz = this._els.dropzone;
            if (dz) {
                dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-dragover'); });
                dz.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
                dz.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dz.classList.remove('is-dragover');
                    const f = e.dataTransfer?.files?.[0];
                    if (f) this._handleFile(f);
                });
                dz.addEventListener('click', (e) => {
                    if (e.target === dz || e.target.closest('.importer-dropzone-text, .importer-dropzone-icon')) {
                        this._els.fileInput?.click();
                    }
                });
                dz.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._els.fileInput?.click();
                    }
                });
            }

            // 시트 변경 / 헤더 행 / 헤더 없음
            this._els.sheetSelect?.addEventListener('change', () => {
                this._state.activeSheet = this._els.sheetSelect.value;
                this._refreshAfterInput();
                this._renderFilePreview();
            });
            this._els.headerRow?.addEventListener('input', () => {
                const v = parseInt(this._els.headerRow.value, 10);
                if (!Number.isNaN(v) && v >= 1) {
                    this._state.headerRowIdx = v - 1;
                    this._refreshAfterInput();
                    this._renderFilePreview();
                }
            });
            this._els.noHeaderCB?.addEventListener('change', () => {
                if (this._els.noHeaderCB.checked) {
                    this._state.headerRowIdx = -1;
                    if (this._els.headerRow) this._els.headerRow.disabled = true;
                } else {
                    const v = parseInt(this._els.headerRow?.value || '1', 10);
                    this._state.headerRowIdx = (Number.isNaN(v) ? 0 : Math.max(0, v - 1));
                    if (this._els.headerRow) this._els.headerRow.disabled = false;
                }
                this._refreshAfterInput();
                this._renderFilePreview();
            });
            this._els.matchKeySel?.addEventListener('change', () => {
                this._state.matchKeyCol = parseInt(this._els.matchKeySel.value, 10);
                if (Number.isNaN(this._state.matchKeyCol)) this._state.matchKeyCol = -1;
                this._recomputePreview();
                this._renderPreview();
            });
            this._els.skipEmptyCB?.addEventListener('change', () => {
                this._state.opts.skipEmpty = this._els.skipEmptyCB.checked;
                this._recomputePreview();
                this._renderPreview();
            });
            this._els.syncSibCB?.addEventListener('change', () => {
                this._state.opts.syncSiblings = this._els.syncSibCB.checked;
            });
            this._els.conflictRads?.forEach(r => r.addEventListener('change', () => {
                if (r.checked) {
                    this._state.opts.conflictPolicy = r.value;
                    this._recomputePreview();
                    this._renderPreview();
                }
            }));

            this._els.autoMapBtn?.addEventListener('click', () => this._autoMap());
            this._els.clearBtn?.addEventListener('click', () => this._clear());
            this._els.csvBtn?.addEventListener('click', () => this._downloadUnmatchedCsv());
            this._els.saveBtn?.addEventListener('click', () => this._commit());

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this._els.modal.classList.contains('hidden')) {
                    this.close();
                }
            });
        }

        // ============================================================
        // 열기/닫기
        // ============================================================
        open() {
            if (!this._els?.modal) return;
            this._state = this._initialState();
            // 설정에서 default 소수점 자리수 복사
            this._state.fieldDecimals = { ...(this.cfg.fieldDecimals || {}) };
            // UI 초기화
            if (this._els.textarea) this._els.textarea.value = '';
            if (this._els.hasHeaderCB) this._els.hasHeaderCB.checked = true;
            if (this._els.skipEmptyCB) this._els.skipEmptyCB.checked = true;
            if (this._els.syncSibCB) this._els.syncSibCB.checked = true;
            if (this._els.fileInput) this._els.fileInput.value = '';
            if (this._els.fileInfo) {
                this._els.fileInfo.classList.add('hidden');
                this._els.fileInfo.textContent = '';
            }
            this._els.fileControls?.classList.add('hidden');
            this._els.filePreview?.classList.add('hidden');
            if (this._els.sheetSelect) this._els.sheetSelect.innerHTML = '';
            if (this._els.headerRow) {
                this._els.headerRow.value = '1';
                this._els.headerRow.disabled = false;
            }
            if (this._els.noHeaderCB) this._els.noHeaderCB.checked = false;
            this._els.modeRads?.forEach(r => { r.checked = (r.value === this._state.mode); });
            this._els.conflictRads?.forEach(r => { r.checked = (r.value === 'preview'); });
            this._switchMode(this._state.mode);
            this._renderFieldMappingArea();
            this._refreshAfterInput();
            this._els.modal.classList.remove('hidden');
        }

        _switchMode(mode) {
            // 모드가 실제로 변경될 때 인덱스 기반 매핑 초기화 (M-3 fix)
            // — file/paste 두 모드의 컬럼 인덱스가 같은 의미를 갖지 않으므로
            //   이전 매핑이 그대로 적용되면 잘못된 컬럼이 매칭/저장됨
            if (this._state.mode !== mode) {
                this._state.matchKeyCol = -1;
                this._state.fieldMapping = {};
            }
            this._state.mode = mode;
            if (mode === 'file') {
                this._els.fileMode?.classList.remove('hidden');
                this._els.pasteMode?.classList.add('hidden');
            } else {
                this._els.fileMode?.classList.add('hidden');
                this._els.pasteMode?.classList.remove('hidden');
                this._els.textarea?.focus();
            }
            this._refreshAfterInput();
        }

        close() {
            if (!this._els?.modal) return;
            this._els.modal.classList.add('hidden');
        }

        // ============================================================
        // 입력 데이터 파싱 (mode 분기)
        // ============================================================
        _parseInput() {
            if (this._state.mode === 'file') {
                return this._parseFileInput();
            }
            return this._parseTextInput();
        }

        _parseTextInput() {
            const text = this._state.rawText || '';
            if (!text.trim()) return { headers: [], rows: [], maxCol: 0 };

            const lines = text.split(/\r?\n/).filter(l => l.length > 0);
            const split = lines.map(l => l.split('\t'));
            const maxCol = split.reduce((m, r) => Math.max(m, r.length), 0);

            let headers, rows;
            if (this._state.hasHeader && split.length > 0) {
                headers = split[0].slice();
                rows = split.slice(1);
            } else {
                headers = Array.from({ length: maxCol }, (_, i) => `열 ${i + 1}`);
                rows = split;
            }
            rows = rows.map(r => {
                const padded = r.slice();
                while (padded.length < maxCol) padded.push('');
                return padded.slice(0, maxCol);
            });
            return { headers, rows, maxCol };
        }

        _parseFileInput() {
            const sheetName = this._state.activeSheet;
            const sheet = sheetName ? this._state.sheets[sheetName] : null;
            if (!sheet || !sheet.rows || sheet.rows.length === 0) {
                return { headers: [], rows: [], maxCol: 0 };
            }
            const allRows = sheet.rows;
            const maxCol = sheet.maxCol;
            const hIdx = this._state.headerRowIdx;

            let headers, rows;
            if (hIdx >= 0 && hIdx < allRows.length) {
                headers = (allRows[hIdx] || []).slice();
                rows = allRows.slice(hIdx + 1);
            } else {
                headers = Array.from({ length: maxCol }, (_, i) => `열 ${i + 1}`);
                rows = allRows;
            }
            // 셀 정규화 + maxCol 패딩, 빈 행 제외
            rows = rows
                .map(r => {
                    const padded = (r || []).map(c => this._normalizeCell(c));
                    while (padded.length < maxCol) padded.push('');
                    return padded.slice(0, maxCol);
                })
                .filter(r => r.some(c => c !== '' && c != null));

            // 헤더도 정규화
            headers = headers.map(c => this._normalizeCell(c));
            while (headers.length < maxCol) headers.push('');
            headers = headers.slice(0, maxCol);

            return { headers, rows, maxCol };
        }

        _normalizeCell(value) {
            if (value == null) return '';
            // Date 객체 → ISO 날짜 (YYYY-MM-DD)
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                const y = value.getFullYear();
                const m = String(value.getMonth() + 1).padStart(2, '0');
                const d = String(value.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            return String(value);
        }

        // ============================================================
        // 파일 처리
        // ============================================================
        async _handleFile(file) {
            if (!file) return;
            const XLSX = window.XLSX;
            if (!XLSX) {
                window.showToast?.('엑셀 라이브러리(XLSX)를 사용할 수 없습니다.', 'error');
                return;
            }
            // 50MB 초과는 거부 (메모리 폭증 방지), 5MB 초과는 경고만
            if (file.size > FILE_SIZE_HARD) {
                window.showToast?.(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(0)}MB > 50MB 한계).`, 'error');
                return;
            }
            if (file.size > FILE_SIZE_WARN) {
                window.showToast?.(`파일 큰 편입니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 처리에 시간이 걸릴 수 있습니다.`, 'warning');
            }
            try {
                const buffer = await file.arrayBuffer();
                const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
                if (!wb.SheetNames || wb.SheetNames.length === 0) {
                    window.showToast?.('시트를 찾을 수 없습니다.', 'error');
                    return;
                }

                const sheets = {};
                const sheetNames = [];
                for (const name of wb.SheetNames) {
                    const ws = wb.Sheets[name];
                    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
                    const maxCol = aoa.reduce((m, r) => Math.max(m, (r || []).length), 0);
                    sheets[name] = { rows: aoa, maxCol };
                    sheetNames.push(name);
                }

                // 상태 업데이트
                this._state.fileName = file.name;
                this._state.sheets = sheets;
                this._state.sheetNames = sheetNames;
                this._state.activeSheet = sheetNames[0];
                this._state.headerRowIdx = 0;
                this._state.fieldMapping = {};
                this._state.matchKeyCol = -1;

                // M-4 fix: paste 모드에서 파일 드롭 시 자동으로 file 모드 전환
                // (_switchMode가 mode 변경 검사로 fieldMapping reset을 또 시도하지만
                //  바로 위에서 이미 비웠으므로 idempotent)
                if (this._state.mode !== 'file') {
                    this._state.mode = 'file';
                    this._els.modeRads?.forEach(r => { r.checked = (r.value === 'file'); });
                    this._els.fileMode?.classList.remove('hidden');
                    this._els.pasteMode?.classList.add('hidden');
                }

                this._renderFileInfo();
                this._renderSheetSelect();
                if (this._els.headerRow) {
                    this._els.headerRow.value = '1';
                    this._els.headerRow.disabled = false;
                }
                if (this._els.noHeaderCB) this._els.noHeaderCB.checked = false;
                this._els.fileControls?.classList.remove('hidden');
                this._els.filePreview?.classList.remove('hidden');

                this._refreshAfterInput();
                this._renderFilePreview();
                window.showToast?.(`✅ ${file.name} 로드 완료 (시트 ${sheetNames.length}개)`, 'success');
            } catch (e) {
                (window.logger?.error || console.error)('엑셀 파일 파싱 실패:', e);
                window.showToast?.('엑셀 파일을 읽을 수 없습니다.', 'error');
            }
        }

        _renderFileInfo() {
            const el = this._els.fileInfo;
            if (!el) return;
            const sizeKB = this._state.fileName
                ? `(${this._state.sheetNames.length}개 시트)` : '';
            el.innerHTML = `<span class="material-icons-outlined">description</span> <strong>${escapeHtml(this._state.fileName)}</strong> ${escapeHtml(sizeKB)}`;
            el.classList.remove('hidden');
        }

        _renderSheetSelect() {
            const sel = this._els.sheetSelect;
            if (!sel) return;
            sel.innerHTML = '';
            for (const name of this._state.sheetNames) {
                const opt = document.createElement('option');
                opt.value = name;
                const sheet = this._state.sheets[name];
                opt.textContent = `${name} (${sheet.rows.length}행)`;
                sel.appendChild(opt);
            }
            sel.value = this._state.activeSheet;
        }

        _renderFilePreview() {
            const body = this._els.filePreviewBody;
            if (!body) return;
            const sheet = this._state.sheets[this._state.activeSheet];
            if (!sheet) { body.innerHTML = ''; return; }

            const SHOW = 5;
            const allRows = sheet.rows.slice(0, SHOW + Math.max(0, this._state.headerRowIdx));
            const hIdx = this._state.headerRowIdx;

            const trs = allRows.map((r, i) => {
                const isHeader = (i === hIdx);
                const cls = isHeader ? 'is-header-row' : '';
                const tds = (r || []).slice(0, sheet.maxCol).map(c => `<td>${escapeHtml(this._normalizeCell(c))}</td>`).join('');
                return `<tr class="${cls}"><td class="row-num">${i + 1}</td>${tds}</tr>`;
            }).join('');

            body.innerHTML = `<table class="importer-mini-table"><tbody>${trs}</tbody></table>
                <p class="importer-help importer-preview-note">${hIdx >= 0 ? `${hIdx + 1}행이 헤더 (강조 표시)` : '헤더 없음 — 모든 행이 데이터'} · 첫 ${Math.min(SHOW, sheet.rows.length)}행만 표시</p>`;
        }

        _refreshAfterInput() {
            this._renderMatchKeySelect();
            this._renderFieldMappingArea();
            this._recomputePreview();
            this._renderPreview();
        }

        // ============================================================
        // 자동 매핑
        // ============================================================
        _autoMap() {
            const { headers } = this._parseInput();
            if (headers.length === 0) {
                window.showToast?.('먼저 데이터를 붙여넣으세요.', 'warning');
                return;
            }
            // M-2 fix: cfg.resultFields(필터링된 화이트리스트)에 있는 필드만 매핑
            // — HEADER_PATTERNS에는 testDate/NO3N 등도 있으나 모달 UI에서는 제외됨.
            //   화이트리스트가 없으면 보이지 않는 필드가 자동 매핑되어 의도치 않은 저장 발생.
            const allowedFields = new Set(this.cfg.resultFields || []);
            const mapping = {};
            let matchKey = -1;
            headers.forEach((h, idx) => {
                const norm = normalizeHeader(h);
                // m-2 fix: 정확 매치 우선, 실패 시 길이 4+ 사전 키로 부분 매치 fallback
                // (짧은 키 'k'/'om'/'mg'는 단위 등에 우연 매치할 위험이 있어 제외)
                let rule = HEADER_PATTERNS[norm];
                if (!rule) {
                    const partialKey = Object.keys(HEADER_PATTERNS).find(k =>
                        k.length >= 4 && norm.includes(k)
                    );
                    if (partialKey) rule = HEADER_PATTERNS[partialKey];
                }
                if (!rule) return;
                if (rule.type === 'matchKey' && matchKey === -1) {
                    matchKey = idx;
                } else if (rule.type === 'field' && allowedFields.has(rule.key) && !mapping[rule.key]) {
                    // 동일 컬럼이 이미 다른 필드로 잡혀있지 않은지
                    if (!Object.values(mapping).includes(idx)) {
                        mapping[rule.key] = idx;
                    }
                }
            });
            this._state.matchKeyCol = matchKey;
            this._state.fieldMapping = mapping;
            // UI 동기화
            if (this._els.matchKeySel) this._els.matchKeySel.value = String(matchKey);
            this._renderFieldMappingArea();
            this._recomputePreview();
            this._renderPreview();

            const found = Object.keys(mapping).length + (matchKey >= 0 ? 1 : 0);
            window.showToast?.(`자동 매핑 ${found}건 적용 (매칭 키 ${matchKey >= 0 ? '✅' : '❌'})`,
                found > 0 ? 'success' : 'warning');
        }

        _clear() {
            this._state.rawText = '';
            this._state.matchKeyCol = -1;
            this._state.fieldMapping = {};
            this._state.sheets = {};
            this._state.sheetNames = [];
            this._state.activeSheet = '';
            this._state.fileName = '';
            this._state.headerRowIdx = 0;
            if (this._els.textarea) this._els.textarea.value = '';
            if (this._els.fileInput) this._els.fileInput.value = '';
            if (this._els.fileInfo) {
                this._els.fileInfo.classList.add('hidden');
                this._els.fileInfo.textContent = '';
            }
            if (this._els.sheetSelect) this._els.sheetSelect.innerHTML = '';
            if (this._els.headerRow) this._els.headerRow.value = '1';
            if (this._els.noHeaderCB) this._els.noHeaderCB.checked = false;
            this._els.fileControls?.classList.add('hidden');
            this._els.filePreview?.classList.add('hidden');
            this._refreshAfterInput();
        }

        // ============================================================
        // 매칭 키 셀렉트 / 필드 매핑 UI 렌더
        // ============================================================
        _renderMatchKeySelect() {
            const sel = this._els.matchKeySel;
            if (!sel) return;
            const { headers } = this._parseInput();
            sel.innerHTML = '<option value="-1">— 컬럼 선택 —</option>';
            headers.forEach((h, idx) => {
                const opt = document.createElement('option');
                opt.value = String(idx);
                opt.textContent = `${idx + 1}열${h ? ` · ${String(h).slice(0, 20)}` : ''}`;
                sel.appendChild(opt);
            });
            sel.value = String(this._state.matchKeyCol);
        }

        _renderFieldMappingArea() {
            const area = this._els.fieldMapArea;
            if (!area) return;
            const { headers } = this._parseInput();

            const fields = this.cfg.resultFields;
            const labels = this.cfg.fieldLabels || {};
            area.innerHTML = '';

            const frag = document.createDocumentFragment();
            for (const fieldKey of fields) {
                const row = document.createElement('div');
                row.className = 'importer-field-row';

                const label = document.createElement('span');
                label.className = 'importer-field-label';
                label.textContent = labels[fieldKey] || fieldKey;

                const select = document.createElement('select');
                select.className = 'importer-field-select';
                select.dataset.fieldKey = fieldKey;
                select.innerHTML = '<option value="-1">미매핑</option>';
                headers.forEach((h, idx) => {
                    const opt = document.createElement('option');
                    opt.value = String(idx);
                    opt.textContent = `${idx + 1}열${h ? ` · ${String(h).slice(0, 16)}` : ''}`;
                    select.appendChild(opt);
                });
                const cur = this._state.fieldMapping[fieldKey];
                select.value = (typeof cur === 'number' && cur >= 0) ? String(cur) : '-1';
                select.addEventListener('change', () => {
                    const v = parseInt(select.value, 10);
                    if (Number.isNaN(v) || v < 0) {
                        delete this._state.fieldMapping[fieldKey];
                    } else {
                        this._state.fieldMapping[fieldKey] = v;
                    }
                    this._recomputePreview();
                    this._renderPreview();
                });

                // 소수점 자리수 input (0=정수, 1~3=자리수)
                const decimalsWrap = document.createElement('label');
                decimalsWrap.className = 'importer-decimals-inline';
                decimalsWrap.title = '소수점 자리수 (0=정수 반올림, 1·2·3=해당 자리수까지)';
                decimalsWrap.innerHTML = '<span>소수점:</span>';
                const decInput = document.createElement('input');
                decInput.type = 'number';
                decInput.min = '0';
                decInput.max = '4';
                decInput.step = '1';
                decInput.className = 'importer-decimals-input';
                const curDec = this._state.fieldDecimals[fieldKey];
                decInput.value = (typeof curDec === 'number' && curDec >= 0) ? String(curDec) : '';
                decInput.placeholder = '원본';
                decInput.addEventListener('input', () => {
                    const raw = decInput.value.trim();
                    if (raw === '') {
                        delete this._state.fieldDecimals[fieldKey];
                    } else {
                        const v = parseInt(raw, 10);
                        if (!Number.isNaN(v) && v >= 0 && v <= 4) {
                            this._state.fieldDecimals[fieldKey] = v;
                        }
                    }
                    this._recomputePreview();
                    this._renderPreview();
                });
                decimalsWrap.appendChild(decInput);

                row.appendChild(label);
                row.appendChild(select);
                row.appendChild(decimalsWrap);
                frag.appendChild(row);
            }
            area.appendChild(frag);
        }

        // ============================================================
        // 매칭 + 미리보기 계산
        // ============================================================
        _recomputePreview() {
            const { rows } = this._parseInput();
            const fields = Object.keys(this._state.fieldMapping);
            if (rows.length === 0 || this._state.matchKeyCol < 0 || fields.length === 0) {
                this._state.preview = null;
                return;
            }

            const flatRows = (this.cfg.getFlatRows?.() || []).filter(r => !r.isSubLot);
            const keyMap = new Map();
            for (const r of flatRows) {
                const k = String(r.displayNumber ?? r.log?.receptionNumber ?? '').trim();
                if (k) keyMap.set(k, r);
            }
            const testResults = this.cfg.getTestResults?.() || {};
            const ranges = this.cfg.fieldRanges || {};

            // m-1 fix: 매칭 키 컬럼이 흙토람 필드에도 매핑된 경우 경고 수집
            const dupCols = Object.entries(this._state.fieldMapping)
                .filter(([_, c]) => c === this._state.matchKeyCol)
                .map(([f, _]) => f);

            const result = {
                matched: [],          // { rowKey, sampleNumber, field, oldValue, newValue, hasConflict, willApply, rangeWarning }
                unmatched: [],        // { excelRowIdx, key, rawRow }
                stats: { matchedCells: 0, unmatchedRows: 0, conflicts: 0, rangeWarnings: 0, totalRows: rows.length },
                warnings: [],         // 사용자에게 표시할 일반 경고 메시지
            };

            if (dupCols.length > 0) {
                const labels = this.cfg.fieldLabels || {};
                const dupNames = dupCols.map(f => labels[f] || f).join(', ');
                result.warnings.push(`⚠️ 매칭 키 컬럼이 ${dupNames}에도 매핑됨 — 시료번호가 결과값으로 저장될 수 있음`);
            }

            rows.forEach((row, ri) => {
                const rawKey = row[this._state.matchKeyCol];
                const key = String(rawKey ?? '').trim();
                if (!key) {
                    result.unmatched.push({ excelRowIdx: ri, key: '', rawRow: row });
                    result.stats.unmatchedRows++;
                    return;
                }
                const target = keyMap.get(key);
                if (!target) {
                    result.unmatched.push({ excelRowIdx: ri, key, rawRow: row });
                    result.stats.unmatchedRows++;
                    return;
                }

                for (const field of fields) {
                    const colIdx = this._state.fieldMapping[field];
                    const rawVal = row[colIdx];
                    const trimmed = (rawVal == null) ? '' : String(rawVal).trim();

                    if (this._state.opts.skipEmpty && trimmed === '') continue;

                    // 소수점 자리수 적용 (숫자가 아니면 원본 유지)
                    const decimals = this._state.fieldDecimals[field];
                    let value = (typeof decimals === 'number')
                        ? this._formatValue(trimmed, decimals)
                        : trimmed;

                    // 최소값 미만/음수 입력 시 min으로 자동 보정
                    let clampedFrom = null;
                    if (value !== '' && ranges[field]) {
                        const num = Number(value);
                        if (!Number.isNaN(num) && num < ranges[field].min) {
                            clampedFrom = num;
                            value = String(ranges[field].min);
                        }
                    }

                    const oldValue = (testResults[target.key] || {})[field] ?? '';
                    const hasConflict = (oldValue !== '' && oldValue != null && String(oldValue) !== value);

                    let willApply = true;
                    if (hasConflict) {
                        if (this._state.opts.conflictPolicy === 'fillBlank') willApply = false;
                        else if (this._state.opts.conflictPolicy === 'skip') willApply = false;
                        // overwrite, preview → willApply true
                    }

                    let rangeWarning = null;
                    if (clampedFrom !== null) {
                        rangeWarning = `${ranges[field].label}: ${clampedFrom}${ranges[field].unit || ''} → 최소값 ${ranges[field].min}으로 보정`;
                        result.stats.rangeWarnings++;
                    } else if (value !== '' && ranges[field]) {
                        const num = Number(value);
                        if (!Number.isNaN(num) && num > ranges[field].max) {
                            rangeWarning = `${ranges[field].label}: ${num}${ranges[field].unit || ''} (범위 ${ranges[field].min}~${ranges[field].max})`;
                            result.stats.rangeWarnings++;
                        }
                    }

                    if (willApply) result.stats.matchedCells++;
                    if (hasConflict) result.stats.conflicts++;

                    result.matched.push({
                        rowKey: target.key,
                        sampleNumber: key,
                        field,
                        oldValue,
                        newValue: value,
                        hasConflict,
                        willApply,
                        rangeWarning,
                    });
                }
            });

            this._state.preview = result;
        }

        // ============================================================
        // 미리보기 렌더
        // ============================================================
        _renderPreview() {
            const summary = this._els.summary;
            const list = this._els.previewList;
            const saveBtn = this._els.saveBtn;
            const csvBtn = this._els.csvBtn;
            if (!summary || !list || !saveBtn) return;

            const p = this._state.preview;
            if (!p) {
                summary.innerHTML = '<span class="importer-summary-muted">데이터·매칭 키·필드 매핑을 모두 지정하면 미리보기가 표시됩니다.</span>';
                list.innerHTML = '';
                saveBtn.disabled = true;
                if (csvBtn) csvBtn.disabled = true;
                return;
            }

            const willApplyCount = p.matched.filter(m => m.willApply).length;
            const badges = [
                `<span class="badge badge-ok">✅ ${willApplyCount}셀 저장 예정</span>`,
                `<span class="badge badge-warn">⚠️ ${p.stats.unmatchedRows}건 미매칭</span>`,
                `<span class="badge badge-info">🔵 ${p.stats.conflicts}건 기존값 충돌</span>`,
                `<span class="badge badge-warn">⚠️ ${p.stats.rangeWarnings}건 범위 초과</span>`,
                `<span class="importer-summary-muted">전체 행 ${p.stats.totalRows}건</span>`,
            ].join(' ');
            // m-1: 일반 경고 메시지 (매칭 키 중복 등)
            const warningsHtml = (p.warnings && p.warnings.length > 0)
                ? `<div class="importer-warning-bar">${p.warnings.map(w => escapeHtml(w)).join('<br>')}</div>`
                : '';
            summary.innerHTML = badges + warningsHtml;

            const items = [];
            const labels = this.cfg.fieldLabels || {};
            // 매칭된 셀 (충돌·경고 우선 정렬, 상한 제한)
            const sorted = p.matched.slice().sort((a, b) => {
                const sa = (a.hasConflict ? 2 : 0) + (a.rangeWarning ? 1 : 0);
                const sb = (b.hasConflict ? 2 : 0) + (b.rangeWarning ? 1 : 0);
                return sb - sa;
            });
            sorted.slice(0, PREVIEW_MATCHED_LIMIT).forEach(m => {
                const lbl = labels[m.field] || m.field;
                let badges = '';
                if (m.hasConflict) {
                    badges += `<span class="badge badge-info">기존: ${escapeHtml(m.oldValue)}</span>`;
                }
                if (!m.willApply) {
                    badges += '<span class="badge badge-muted">건너뜀</span>';
                }
                if (m.rangeWarning) {
                    badges += `<span class="badge badge-warn" title="${escapeHtml(m.rangeWarning)}">범위 초과</span>`;
                }
                items.push(`<li class="importer-preview-item ${m.willApply ? '' : 'is-skip'}">
                    <span class="importer-preview-key">${escapeHtml(m.sampleNumber)}</span>
                    <span class="importer-preview-field">${escapeHtml(lbl)}</span>
                    <span class="importer-preview-arrow">→</span>
                    <span class="importer-preview-value">${escapeHtml(m.newValue)}</span>
                    ${badges}
                </li>`);
            });
            // 미매칭 표시 (상한 제한)
            p.unmatched.slice(0, PREVIEW_UNMATCHED_LIMIT).forEach(u => {
                items.push(`<li class="importer-preview-item is-unmatched">
                    <span class="importer-preview-key">${escapeHtml(u.key || '(빈 키)')}</span>
                    <span class="badge badge-warn">미매칭</span>
                </li>`);
            });

            const overflow = (sorted.length > PREVIEW_MATCHED_LIMIT || p.unmatched.length > PREVIEW_UNMATCHED_LIMIT)
                ? `<li class="importer-preview-overflow">… (전체 ${sorted.length}셀 / 미매칭 ${p.unmatched.length}건)</li>`
                : '';

            list.innerHTML = items.length
                ? `<ul class="importer-preview-ul">${items.join('')}${overflow}</ul>`
                : '<div class="importer-preview-empty">저장될 항목이 없습니다.</div>';

            saveBtn.disabled = willApplyCount === 0;
            saveBtn.textContent = willApplyCount > 0 ? `${willApplyCount}셀 저장` : '저장';
            if (csvBtn) csvBtn.disabled = p.unmatched.length === 0;
        }

        // ============================================================
        // 저장 커밋
        // ============================================================
        _commit() {
            const p = this._state.preview;
            if (!p) return;
            const apply = this.cfg.applyResult;
            const sync = this.cfg.syncToSiblings;
            const save = this.cfg.saveTestResults;
            if (typeof apply !== 'function' || typeof save !== 'function') {
                window.showToast?.('저장 콜백이 연결되지 않았습니다.', 'error');
                return;
            }

            let applied = 0;
            for (const m of p.matched) {
                if (!m.willApply) continue;
                apply(m.rowKey, m.field, m.newValue);
                if (this._state.opts.syncSiblings && typeof sync === 'function') {
                    sync(m.rowKey, m.field, m.newValue);
                }
                applied++;
            }
            save();
            this.cfg.rerender?.();

            window.showToast?.(`✅ ${applied}셀 저장 완료${p.stats.unmatchedRows > 0 ? ` (미매칭 ${p.stats.unmatchedRows}건)` : ''}`,
                'success');
            this.close();
        }

        // ============================================================
        // 미매칭 CSV 다운로드
        // ============================================================
        _downloadUnmatchedCsv() {
            const p = this._state.preview;
            if (!p || p.unmatched.length === 0) return;
            const { headers } = this._parseInput();
            const csvHeaders = ['_원본행번호', ...headers.map((h, i) => h || `열${i + 1}`)].map(csvEscape).join(',');
            const lines = [csvHeaders];
            // M-1 fix: 모드별 실제 엑셀 행번호 계산
            // - file 모드: headerRowIdx가 0-based이므로 헤더 다음 행은 headerRowIdx + 2 (1-based)
            //              헤더 없음(-1)이면 첫 행이 데이터 → 1
            // - paste 모드: 헤더 있으면 +2, 없으면 +1
            const baseOffset = (this._state.mode === 'file')
                ? (this._state.headerRowIdx >= 0 ? this._state.headerRowIdx + 2 : 1)
                : (this._state.hasHeader ? 2 : 1);
            for (const u of p.unmatched) {
                const cells = [String(u.excelRowIdx + baseOffset), ...u.rawRow].map(csvEscape);
                lines.push(cells.join(','));
            }
            const csv = UTF8_BOM + lines.join('\r\n'); // UTF-8 BOM (Excel 한글 인식)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `흙토람_미매칭_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    // 글로벌 노출
    window.HeuktoramResultImporter = HeuktoramResultImporter;
})();
