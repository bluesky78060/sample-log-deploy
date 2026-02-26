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
class ExcelImportManager {
    /**
     * @param {Object} config
     * @param {Array<{key:string, label:string}>} config.appFields - 앱 필드 정의
     * @param {Object<string, string>} config.autoMapRules - 자동매핑 규칙 (엑셀헤더 → 앱필드키)
     * @param {Object} config.templateConfig - 서식 다운로드 설정
     * @param {string[]} config.templateConfig.headers - 서식 헤더
     * @param {Array} config.templateConfig.sampleRow - 예시 행
     * @param {Array<{wch:number}>} config.templateConfig.colWidths - 컬럼 너비
     * @param {string} config.templateConfig.sheetName - 시트명
     * @param {string} config.templateConfig.fileName - 파일명 (확장자 제외)
     * @param {Array<{key:string, label:string}>} config.previewColumns - 미리보기 테이블 컬럼
     * @param {Function} config.buildRecord - (getVal, parseExcelDate, commonData, rowIdx) => object
     * @param {Function} [config.skipRowCheck] - (record, rowIdx) => string|null (경고 메시지 또는 null)
     * @param {Function} [config.renderPreviewCell] - (record, columnKey) => string (커스텀 셀 렌더링)
     * @param {Function} config.onImportComplete - (records) => void
     * @param {Function} config.getCommonData - () => object
     * @param {Function} [config.validateStep1] - () => {valid:boolean, message?:string}
     * @param {Function} [config.autoNumberFilter] - (log) => boolean (접수번호 채번 시 필터)
     * @param {Function} [config.autoNumberExtract] - (log) => number|NaN (접수번호에서 숫자 추출)
     * @param {boolean} [config.setDefaultDate=true] - importDate 기본값을 오늘로 설정할지 여부
     * @param {Function} [config.postBuildRecords] - (records) => void (레코드 빌드 후 추가 처리)
     */
    constructor(config) {
        this.config = config;

        // 상태
        this._currentStep = 1;
        this._excelHeaders = [];
        this._excelData = [];
        this._columnMapping = {};
        this._parsedLogs = [];

        // DOM 요소 (init에서 캐싱)
        this._els = {};
    }

    /**
     * DOM 요소 캐싱 및 이벤트 리스너 설정
     */
    init() {
        // DOM 요소 캐싱
        this._els = {
            input: document.getElementById('excelImportInput'),
            modal: document.getElementById('excelImportModal'),
            closeBtn: document.getElementById('closeExcelImportModal'),
            cancelBtn: document.getElementById('cancelExcelImportBtn'),
            nextBtn: document.getElementById('excelImportNextBtn'),
            prevBtn: document.getElementById('excelImportPrevBtn'),
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
            const importDateEl = document.getElementById('importDate');
            if (importDateEl) {
                importDateEl.valueAsDate = new Date();
            }
        }

        // 서식 다운로드 버튼
        this._bindDownloadButtons();

        // 파일 선택
        if (this._els.input) {
            this._els.input.addEventListener('change', (e) => this._handleFileSelect(e));
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
        const closeHandler = () => this._closeModal();
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

    _bindDownloadButtons() {
        const handler = () => this._downloadTemplate();
        const navBtn = document.getElementById('downloadTemplateNavBtn');
        if (navBtn) navBtn.addEventListener('click', handler);
        const modalBtn = document.getElementById('downloadTemplateBtn');
        if (modalBtn) modalBtn.addEventListener('click', handler);
    }

    _downloadTemplate() {
        const tc = this.config.templateConfig;
        const wb = XLSX.utils.book_new();
        const wsData = [tc.headers, tc.sampleRow];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = tc.colWidths;
        XLSX.utils.book_append_sheet(wb, ws, tc.sheetName);
        XLSX.writeFile(wb, tc.fileName + '.xlsx');
        showToast('서식 파일을 다운로드했습니다.', 'success');
    }

    // ========================================
    // 파일 선택 및 파싱
    // ========================================

    _handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (jsonData.length < 2) {
                    showToast('데이터가 없거나 헤더만 있습니다.', 'error');
                    return;
                }

                this._excelHeaders = jsonData[0].map(h => String(h).trim());
                this._excelData = jsonData.slice(1).filter(row =>
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
                this._els.modal.classList.remove('hidden');

            } catch (err) {
                console.error('엑셀 파싱 오류:', err);
                showToast('엑셀 파일을 읽을 수 없습니다.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);

        // input 초기화 (같은 파일 다시 선택 가능)
        this._els.input.value = '';
    }

    // ========================================
    // 자동 매핑
    // ========================================

    _autoMap() {
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

    _showStep(step) {
        this._els.step1.classList.toggle('hidden', step !== 1);
        this._els.step2.classList.toggle('hidden', step !== 2);
        this._els.step3.classList.toggle('hidden', step !== 3);
        this._els.prevBtn.classList.toggle('hidden', step === 1);
        this._els.nextBtn.textContent = step === 3 ? '가져오기' : '다음';
    }

    // ========================================
    // 컬럼 매핑 UI
    // ========================================

    _renderColumnMapping() {
        const area = this._els.mappingArea;
        area.innerHTML = '';

        this._excelHeaders.forEach((header, idx) => {
            if (!header) return;

            const row = document.createElement('div');
            row.className = 'mapping-row' + (this._columnMapping[idx] ? ' mapped' : '');

            const sampleValue = this._excelData[0]?.[idx] ?? '';

            const safeHeader = window.escapeHTML(header);
            const safeSampleValue = window.escapeHTML(String(sampleValue || ''));
            row.innerHTML = `
                <span class="mapping-excel-col" title="${safeHeader}">${safeHeader}</span>
                <span class="mapping-arrow">\u2192</span>
                <select class="mapping-select" data-col-idx="${idx}">
                    <option value="">-- 건너뛰기 --</option>
                    ${this.config.appFields.map(f =>
                        `<option value="${f.key}" ${this._columnMapping[idx] === f.key ? 'selected' : ''}>${f.label}</option>`
                    ).join('')}
                </select>
                <span class="mapping-sample" title="${safeSampleValue}">예: ${safeSampleValue}</span>
            `;

            const select = row.querySelector('.mapping-select');
            select.addEventListener('change', (e) => {
                const colIdx = parseInt(e.target.dataset.colIdx);
                const value = e.target.value;

                if (value) {
                    // 기존 매핑에서 같은 필드 제거 (중복 방지)
                    for (const [k, v] of Object.entries(this._columnMapping)) {
                        if (v === value && parseInt(k) !== colIdx) {
                            delete this._columnMapping[k];
                            const otherSelect = area.querySelector(`select[data-col-idx="${k}"]`);
                            if (otherSelect) {
                                otherSelect.value = '';
                                otherSelect.closest('.mapping-row').classList.remove('mapped');
                            }
                        }
                    }
                    this._columnMapping[colIdx] = value;
                } else {
                    delete this._columnMapping[colIdx];
                }

                row.classList.toggle('mapped', !!value);
            });

            area.appendChild(row);
        });
    }

    // ========================================
    // 엑셀 날짜 파싱 (공통 유틸)
    // ========================================

    static parseExcelDate(val) {
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

    _buildPreview() {
        const commonData = this.config.getCommonData();

        // 역매핑: 앱 필드 → 엑셀 컬럼 인덱스
        const fieldToCol = {};
        for (const [colIdx, field] of Object.entries(this._columnMapping)) {
            fieldToCol[field] = parseInt(colIdx);
        }

        const warnings = [];
        this._parsedLogs = [];

        // getVal 유틸 함수
        const getVal = (row, field) => {
            if (fieldToCol[field] !== undefined) {
                const val = row[fieldToCol[field]];
                return val !== undefined && val !== null ? String(val).trim() : '';
            }
            return '';
        };

        // 각 행 처리
        this._excelData.forEach((row, rowIdx) => {
            const record = this.config.buildRecord(
                (field) => getVal(row, field),
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

    _autoAssignReceptionNumbers() {
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

            let n;
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

    _renderPreview(warnings) {
        this._els.previewSummary.textContent = `총 ${this._parsedLogs.length}건의 데이터를 가져옵니다.`;

        // 헤더
        const cols = this.config.previewColumns;
        this._els.previewHead.innerHTML = '<tr>' +
            cols.map(c => `<th>${window.escapeHTML(c.label)}</th>`).join('') +
            '</tr>';

        // 본문
        const renderCell = this.config.renderPreviewCell;
        this._els.previewBody.innerHTML = this._parsedLogs.map(l => {
            const cells = cols.map(c => {
                if (renderCell) {
                    const custom = renderCell(l, c.key);
                    if (custom !== undefined) return `<td>${custom}</td>`;
                }
                const val = l[c.key];
                return `<td>${window.escapeHTML(val !== undefined && val !== null ? String(val) : '')}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        // 경고
        if (warnings.length > 0) {
            this._els.warnings.textContent = warnings.join('\n');
            this._els.warnings.classList.remove('hidden');
        } else {
            this._els.warnings.classList.add('hidden');
        }
    }

    // ========================================
    // 다음/가져오기 버튼 핸들러
    // ========================================

    _handleNext() {
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
                const importDate = document.getElementById('importDate')?.value;
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
            this._els.modal.classList.add('hidden');

            showToast(`${this._parsedLogs.length}건의 데이터를 가져왔습니다.`, 'success');

            // 상태 초기화
            this._reset();
        }
    }

    // ========================================
    // 이전 버튼 핸들러
    // ========================================

    _handlePrev() {
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

    _closeModal() {
        this._els.modal.classList.add('hidden');
        this._currentStep = 1;
        this._showStep(1);
    }

    // ========================================
    // 상태 초기화
    // ========================================

    _reset() {
        this._parsedLogs = [];
        this._excelData = [];
        this._excelHeaders = [];
        this._columnMapping = {};
    }
}

window.ExcelImportManager = ExcelImportManager;
