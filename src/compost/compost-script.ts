/**
 * @fileoverview 퇴·액비 부숙도 검사 위탁서 스크립트
 * CompostSampleManager - BaseSampleManager 상속
 */

import type { CompostSample } from '../types/sample-types';
import { BaseSampleManager, type BaseSampleManagerConfig } from '../shared/BaseSampleManager';

// ========================================
// 상수 및 설정
// ========================================

const DEFAULT_SAMPLE_TYPE = '가축분퇴비';
const SAMPLE_TYPE = 'compost';
const STORAGE_KEY = 'test_compostSampleLogs';
const AUTO_SAVE_FILE = 'compost-autosave.json';

// ========================================
// Interfaces
// ========================================

// SearchFilter → BaseSearchFilter로 통합 (BaseSampleManager에서 상속)

interface MonthStats {
    count: number;
    completed: number;
    pending: number;
    label: string;
    class?: string;
}

interface QuarterStats {
    count: number;
    completed: number;
    pending: number;
    label: string;
}

interface CompostFieldDef {
    key: string;
    label: string;
    unit: string;
    standard: string;
    type?: 'select';
    options?: string[];
}

interface CompostTestResult {
    id: string;
    testDate?: string;
    judgment?: string;
    animalType?: string;
    moisture?: string;
    maturity?: string;
    salinity?: string;
    copper?: string;
    zinc?: string;
    updatedAt?: string;
    [key: string]: string | undefined;
}

// ========================================
// CompostSampleManager 클래스
// ========================================

class CompostSampleManager extends BaseSampleManager<CompostSample> {
    // 분석 항목 정의
    static COMPOST_FIELDS: Record<string, CompostFieldDef[]> = {
        // === 퇴비 (가축분퇴비) ===
        compost_common: [
            { key: 'moisture', label: '함수율', unit: '%', standard: '70 이하' },
            { key: 'maturity', label: '부숙도', unit: '', type: 'select', options: ['', '미부숙', '부숙초기', '부숙중기', '부숙완료', '완전부숙'], standard: '부숙중기 이상' },
        ],
        compost_cattle: [
            { key: 'salinity', label: '염분', unit: '%', standard: '2.5 이하' },
        ],
        compost_pig: [
            { key: 'copper', label: '구리(Cu)', unit: 'mg/kg', standard: '500 이하' },
            { key: 'zinc', label: '아연(Zn)', unit: 'mg/kg', standard: '1,200 이하' },
        ],
        // === 액비 (가축분뇨발효액) ===
        liquid_common: [
            { key: 'moisture', label: '함수율', unit: '%', standard: '95 이하' },
            { key: 'maturity', label: '부숙도', unit: '', type: 'select', options: ['', '미부숙', '부숙초기', '부숙중기', '부숙완료', '완전부숙'], standard: '부숙중기 이상' },
        ],
        liquid_pig: [
            { key: 'copper', label: '구리(Cu)', unit: 'mg/kg', standard: '70 이하' },
            { key: 'zinc', label: '아연(Zn)', unit: 'mg/kg', standard: '170 이하' },
        ],
    };

    /** 부숙도 순서 (높을수록 잘 부숙됨) */
    static MATURITY_ORDER: Record<string, number> = {
        '미부숙': 0, '부숙초기': 1, '부숙중기': 2, '부숙완료': 3, '완전부숙': 4
    };

    // Compost-specific state
    currentRegistrationData: CompostSample | null;
    listViewStale: boolean;
    // currentSearchFilter는 BaseSampleManager에서 상속
    isFullView: boolean;
    autoSaveFileHandle: any;
    pendingMailDateIds: string[];

    // Analysis modal state
    _caLogId: string | null;
    _caAreaSqm: number;
    _cachedCompostResults: Record<string, CompostTestResult> | null;

    // Compost-specific DOM refs
    dateInput: HTMLInputElement | null;
    applicantTypeSelect: HTMLSelectElement | null;
    birthDateField: HTMLElement | null;
    corpNumberField: HTMLElement | null;
    birthDateInput: HTMLInputElement | null;
    corpNumberInput: HTMLInputElement | null;
    animalTypeRadios: NodeListOf<HTMLInputElement> | null;
    animalTypeOtherInput: HTMLInputElement | null;
    farmAddressFullInput: HTMLInputElement | null;
    farmAreaInput: HTMLInputElement | null;
    areaUnitToggle: HTMLElement | null;
    farmAreaUnitInput: HTMLInputElement | null;
    receptionNumberInput: HTMLInputElement | null;
    receptionMethodBtns: NodeListOf<Element> | null;
    receptionMethodInput: HTMLInputElement | null;
    navSubmitBtn: HTMLButtonElement | null;
    navResetBtn: HTMLButtonElement | null;
    selectAllCheckbox: HTMLInputElement | null;
    addressPostcode: HTMLInputElement | null;
    addressRoad: HTMLInputElement | null;
    addressDetail: HTMLInputElement | null;
    addressHidden: HTMLInputElement | null;
    addressManager: any;
    registrationResultModal: HTMLElement | null;
    resultTableBody: HTMLTableSectionElement | null;

    constructor() {
        super({
            moduleKey: 'compost',
            moduleName: '퇴·액비',
            storageKey: STORAGE_KEY,
            sampleType: SAMPLE_TYPE,
            autoSaveFile: AUTO_SAVE_FILE,
            debug: !!window.DEBUG
        });

        // Compost-specific state
        this.currentRegistrationData = null;
        this.listViewStale = true;
        // currentSearchFilter는 BaseSampleManager에서 초기화
        this.isFullView = false;
        this.autoSaveFileHandle = null;
        this.pendingMailDateIds = [];

        // Compost-specific DOM refs (set in cacheElements)
        this.dateInput = null;
        this.applicantTypeSelect = null;
        this.birthDateField = null;
        this.corpNumberField = null;
        this.birthDateInput = null;
        this.corpNumberInput = null;
        this.animalTypeRadios = null;
        this.animalTypeOtherInput = null;
        this.farmAddressFullInput = null;
        this.farmAreaInput = null;
        this.areaUnitToggle = null;
        this.farmAreaUnitInput = null;
        this.receptionNumberInput = null;
        this.receptionMethodBtns = null;
        this.receptionMethodInput = null;
        this.navSubmitBtn = null;
        this.navResetBtn = null;
        this.selectAllCheckbox = null;

        // Address manager ref
        this.addressPostcode = null;
        this.addressRoad = null;
        this.addressDetail = null;
        this.addressHidden = null;
        this.addressManager = null;

        // Registration result modal refs
        this.registrationResultModal = null;
        this.resultTableBody = null;

        // Analysis modal state
        this._caLogId = null;
        this._caAreaSqm = 0;
        this._cachedCompostResults = null;

        // compost 전용 엑셀 저장 함수 추가
        if (this.FileAPI) {
            this.FileAPI.saveExcel = async function(buffer: ArrayBuffer, suggestedName: string = 'data.xlsx'): Promise<boolean> {
                if (window.isElectron && window.electronAPI) {
                    const filePath = await window.electronAPI.saveFileDialog({
                        title: '엑셀 파일 저장',
                        defaultPath: suggestedName,
                        filters: [
                            { name: 'Excel Files', extensions: ['xlsx'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });
                    if (filePath) {
                        const result = await window.electronAPI.writeFile(filePath, buffer);
                        return result.success;
                    }
                    return false;
                }
                return false;
            };
        }
    }

    // ========================================
    // Override: DOM 요소 캐싱
    // ========================================

    cacheElements(): void {
        super.cacheElements();

        // Override different IDs
        this.tableBody = document.getElementById('logTableBody') as HTMLTableSectionElement | null;
        this.emptyState = document.getElementById('emptyState') as HTMLElement | null;

        // Compost-specific elements
        this.dateInput = document.getElementById('date') as HTMLInputElement | null;
        this.applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement | null;
        this.birthDateField = document.getElementById('birthDateField') as HTMLElement | null;
        this.corpNumberField = document.getElementById('corpNumberField') as HTMLElement | null;
        this.birthDateInput = document.getElementById('birthDate') as HTMLInputElement | null;
        this.corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement | null;
        this.animalTypeRadios = document.querySelectorAll('input[name="animalType"]');
        this.animalTypeOtherInput = document.getElementById('animalTypeOther') as HTMLInputElement | null;
        this.farmAddressFullInput = document.getElementById('farmAddressFull') as HTMLInputElement | null;
        this.farmAreaInput = document.getElementById('farmArea') as HTMLInputElement | null;
        this.areaUnitToggle = document.getElementById('areaUnitToggle') as HTMLElement | null;
        this.farmAreaUnitInput = document.getElementById('farmAreaUnit') as HTMLInputElement | null;
        this.receptionNumberInput = document.getElementById('receptionNumber') as HTMLInputElement | null;
        this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        this.receptionMethodInput = document.getElementById('receptionMethod') as HTMLInputElement | null;
        this.navSubmitBtn = document.getElementById('navSubmitBtn') as HTMLButtonElement | null;
        this.navResetBtn = document.getElementById('navResetBtn') as HTMLButtonElement | null;
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox') as HTMLInputElement | null;

        // Address refs
        this.addressPostcode = document.getElementById('addressPostcode') as HTMLInputElement | null;
        this.addressRoad = document.getElementById('addressRoad') as HTMLInputElement | null;
        this.addressDetail = document.getElementById('addressDetail') as HTMLInputElement | null;
        this.addressHidden = document.getElementById('address') as HTMLInputElement | null;

        // Registration result modal refs
        this.registrationResultModal = document.getElementById('registrationResultModal') as HTMLElement | null;
        this.resultTableBody = document.getElementById('resultTableBody') as HTMLTableSectionElement | null;
    }

    // ========================================
    // Override: 뷰 초기화
    // ========================================

    initViews(): void {
        // 오늘 날짜 설정
        if (this.dateInput) {
            this.dateInput.valueAsDate = new Date();
        }

        // 기존 데이터 마이그레이션 (년도 없는 기존 데이터를 현재 년도로 이동)
        const oldData = SampleUtils.safeParseJSON(this.storageKey, []);
        if (oldData.length > 0) {
            const yearKey = this.getStorageKey(this.selectedYear);
            if (!localStorage.getItem(yearKey)) {
                localStorage.setItem(yearKey, JSON.stringify(oldData));
                this.log('기존 데이터를 년도별 저장소로 마이그레이션:', oldData.length, '건');
            }
        }

        // 리스트 뷰 제목 업데이트
        this.updateListViewTitle();
    }

    // ========================================
    // Override: 레코드 수 업데이트 (총 접두사 없음)
    // ========================================

    updateRecordCount(): void {
        if (this.recordCountEl) {
            this.recordCountEl.textContent = `${this.sampleLogs.length}건`;
        }
    }

    // ========================================
    // Override: 연도 변경 시 hook
    // ========================================

    onYearChange(newYear: string): void {
        this.updateListViewTitle();
        this._cachedCompostResults = null;
        this.syncCompostTestResultsFromFirestore();
    }

    // onBeforeSave: BaseSampleManager.saveLogs에서 listViewStale 설정하므로 별도 오버라이드 불필요

    // ========================================
    // Override: 저장 후 hook (자동 저장)
    // ========================================

    onAfterSave(data: CompostSample[]): void {
        // 자동 저장 (Electron 환경)
        const autoSaveToggle = document.getElementById('autoSaveToggle') as HTMLInputElement | null;
        if (window.isElectron && this.FileAPI?.autoSavePath && autoSaveToggle?.checked) {
            const autoSaveContent = JSON.stringify(data, null, 2);
            this.FileAPI.autoSave(autoSaveContent);
        }
    }

    // ========================================
    // Override: 테이블 행 빌드 (PaginationManager용)
    // ========================================

    buildTableRow(logItem: CompostSample, index: number): HTMLTableRowElement {
        const row = document.createElement('tr');
        row.dataset.id = logItem.id;

        const sampleTypeBadge = this.getSampleTypeBadge(logItem.sampleType);
        const animalTypeBadge = this.getAnimalTypeBadge(logItem.animalType);
        const fullAddress = [logItem.addressRoad, logItem.addressDetail].filter(Boolean).join(' ') || '-';
        // 뷰용 주소: 시도 패턴이 있을 때만 제거
        const displayAddress = fullAddress !== '-' && SIDO_PATTERN.test(fullAddress)
            ? fullAddress.replace(SIDO_PATTERN, '')
            : fullAddress;

        // XSS 방지: 사용자 입력 데이터 이스케이프
        const safeFarmName = escapeHTML(logItem.farmName || logItem.companyName || '-');
        const safeName = escapeHTML(logItem.name || '-');
        const safeDisplayAddress = escapeHTML(displayAddress);
        const safeFarmAddress = escapeHTML(logItem.farmAddress || '-');
        const safePhone = escapeHTML(logItem.phoneNumber || '-');
        const safeNote = escapeHTML(logItem.note || '-');

        // 법인여부 및 생년월일/법인번호
        const applicantType = logItem.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (logItem.corpNumber || '-') : (logItem.birthDate || '-');

        // 1. Checkbox column
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'col-checkbox';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.dataset.id = logItem.id;
        tdCheckbox.appendChild(checkbox);
        row.appendChild(tdCheckbox);

        // 2. Complete button column
        const tdComplete = document.createElement('td');
        tdComplete.className = 'col-complete';
        const btnComplete = document.createElement('button');
        btnComplete.className = `btn-complete ${logItem.isComplete ? 'completed' : ''}`;
        btnComplete.dataset.id = logItem.id;
        btnComplete.title = logItem.isComplete ? '완료됨' : '완료 표시';
        btnComplete.textContent = logItem.isComplete ? '✅' : '⬜';
        tdComplete.appendChild(btnComplete);
        row.appendChild(tdComplete);

        // 3. Result button column
        const tdResult = document.createElement('td');
        tdResult.className = 'col-result';
        const btnResult = document.createElement('button');
        btnResult.className = `btn-result ${logItem.testResult === 'pass' ? 'pass' : logItem.testResult === 'fail' ? 'fail' : ''}`;
        btnResult.dataset.id = logItem.id;
        btnResult.title = logItem.testResult === 'pass' ? '적합' : logItem.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
        btnResult.textContent = logItem.testResult === 'pass' ? '적합' : logItem.testResult === 'fail' ? '부적합' : '-';
        tdResult.appendChild(btnResult);
        row.appendChild(tdResult);

        // 3-1. Maturity level (부숙도) dropdown
        const tdMaturity = document.createElement('td');
        tdMaturity.className = 'col-maturity';
        const selectMaturity = document.createElement('select');
        selectMaturity.className = 'maturity-select';
        selectMaturity.dataset.id = logItem.id;
        const maturityOptions = ['', '부숙초기', '부숙중기', '부숙후기', '부숙완료'];
        maturityOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt || '-';
            if (logItem.maturity === opt) option.selected = true;
            selectMaturity.appendChild(option);
        });
        tdMaturity.appendChild(selectMaturity);
        row.appendChild(tdMaturity);

        // 3-2. Moisture content (함수율) input
        const tdMoisture = document.createElement('td');
        tdMoisture.className = 'col-moisture';
        const inputMoisture = document.createElement('input');
        inputMoisture.type = 'text';
        inputMoisture.className = 'moisture-input';
        inputMoisture.dataset.id = logItem.id;
        inputMoisture.value = String(logItem.moisture || '');
        inputMoisture.placeholder = '%';
        inputMoisture.maxLength = 10;
        tdMoisture.appendChild(inputMoisture);
        row.appendChild(tdMoisture);

        // 4. Reception number
        const tdReceptionNumber = document.createElement('td');
        tdReceptionNumber.textContent = logItem.receptionNumber || '-';
        row.appendChild(tdReceptionNumber);

        // 5. Date
        const tdDate = document.createElement('td');
        tdDate.textContent = logItem.date || '-';
        row.appendChild(tdDate);

        // 6. Applicant type (hidden)
        const tdApplicantType = document.createElement('td');
        tdApplicantType.className = 'col-applicant-type col-hidden';
        tdApplicantType.textContent = applicantType;
        row.appendChild(tdApplicantType);

        // 7. Birth/Corp number (hidden)
        const tdBirthCorp = document.createElement('td');
        tdBirthCorp.className = 'col-birth-corp col-hidden';
        tdBirthCorp.textContent = birthOrCorp;
        row.appendChild(tdBirthCorp);

        // 8. Farm name
        const tdFarmName = document.createElement('td');
        tdFarmName.textContent = safeFarmName;
        row.appendChild(tdFarmName);

        // 9. Name (클릭 시 같은 이름 일괄 선택)
        const tdName = document.createElement('td');
        tdName.className = 'col-name';
        tdName.dataset.name = logItem.name || '';
        tdName.textContent = safeName;
        tdName.title = `"${safeName}" 클릭하면 같은 이름 일괄 선택`;
        row.appendChild(tdName);

        // 10. Postcode (hidden)
        const tdPostcode = document.createElement('td');
        tdPostcode.className = 'col-postcode col-hidden';
        tdPostcode.textContent = logItem.addressPostcode || '-';
        row.appendChild(tdPostcode);

        // 11. Address - 뷰에서는 시도 제외하고 전체 표시
        const tdAddress = document.createElement('td');
        tdAddress.className = 'col-address';
        tdAddress.textContent = safeDisplayAddress;
        row.appendChild(tdAddress);

        // 12. Farm address
        const tdFarmAddress = document.createElement('td');
        tdFarmAddress.className = 'col-farm-address';
        tdFarmAddress.textContent = safeFarmAddress;
        row.appendChild(tdFarmAddress);

        // 13. Farm area (평이면 m2로 환산해서 표시)
        const tdFarmArea = document.createElement('td');
        if (logItem.farmArea) {
            const areaValue = parseInt(String(logItem.farmArea), 10);
            if (logItem.farmAreaUnit === 'pyeong') {
                // 평 -> m2 환산 (1평 = 3.3058 m2)
                const m2Value = Math.round(areaValue * 3.3058);
                tdFarmArea.textContent = m2Value.toLocaleString('ko-KR') + ' m\u00B2';
            } else {
                tdFarmArea.textContent = areaValue.toLocaleString('ko-KR') + ' m\u00B2';
            }
        } else {
            tdFarmArea.textContent = '-';
        }
        row.appendChild(tdFarmArea);

        // 14. Sample type badge
        const tdSampleType = document.createElement('td');
        tdSampleType.innerHTML = sampleTypeBadge;
        row.appendChild(tdSampleType);

        // 15. Animal type badge
        const tdAnimalType = document.createElement('td');
        tdAnimalType.innerHTML = animalTypeBadge;
        row.appendChild(tdAnimalType);

        // 16. Production date
        const tdProductionDate = document.createElement('td');
        tdProductionDate.textContent = logItem.productionDate || '-';
        row.appendChild(tdProductionDate);

        // 17. Purpose
        const tdPurpose = document.createElement('td');
        tdPurpose.textContent = logItem.purpose || '-';
        row.appendChild(tdPurpose);

        // 18. Phone
        const tdPhone = document.createElement('td');
        tdPhone.textContent = safePhone;
        row.appendChild(tdPhone);

        // 19. Reception method
        const tdReceptionMethod = document.createElement('td');
        tdReceptionMethod.textContent = logItem.receptionMethod || '-';
        row.appendChild(tdReceptionMethod);

        // 20. Note (with tooltip)
        const tdNote = document.createElement('td');
        tdNote.className = 'col-note text-truncate';
        tdNote.dataset.tooltip = safeNote;
        tdNote.textContent = safeNote;
        row.appendChild(tdNote);

        // 21. Mail date
        const tdMailDate = document.createElement('td');
        tdMailDate.className = 'col-mail-date';
        tdMailDate.textContent = logItem.mailDate || '-';
        row.appendChild(tdMailDate);

        // 22. Analysis result button
        const tdAnalysis = document.createElement('td');
        tdAnalysis.className = 'col-analysis';
        const btnAnalysis = document.createElement('button');
        btnAnalysis.className = 'btn-analysis-open';
        btnAnalysis.dataset.id = logItem.id;
        btnAnalysis.title = '분석결과 입력/수정';
        const existingResult = this.loadCompostTestResult(logItem.id);
        if (existingResult && (existingResult.moisture || existingResult.maturity)) {
            btnAnalysis.classList.add('has-result');
            btnAnalysis.textContent = '결과확인';
        } else {
            btnAnalysis.textContent = '결과입력';
        }
        tdAnalysis.appendChild(btnAnalysis);
        row.appendChild(tdAnalysis);

        // 23. Action buttons (edit/delete)
        const tdAction = document.createElement('td');
        tdAction.className = 'col-action';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.dataset.id = logItem.id;
        btnEdit.title = '수정';
        btnEdit.textContent = '✏️';
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.dataset.id = logItem.id;
        btnDelete.title = '삭제';
        btnDelete.textContent = '🗑️';
        tdAction.appendChild(btnEdit);
        tdAction.appendChild(btnDelete);
        row.appendChild(tdAction);

        if (logItem.isComplete) {
            row.classList.add('row-completed');
        }

        return row;
    }

    // ========================================
    // Override: 폼 제출
    // ========================================

    submitForm(): void {
        if (!this.form) return;
        const formData = new FormData(this.form);

        // Helper to get string value from FormData
        const getString = (key: string): string => String(formData.get(key) || '');

        // 축종 (기타 선택 시 입력값 사용)
        let animalType = getString('animalType');
        if (animalType === '기타') {
            animalType = this.animalTypeOtherInput?.value || '기타';
        }

        // 법인여부
        const applicantType = getString('applicantType') || '개인';

        if (this.editingId) {
            // === 수정 모드 ===
            const log = this.sampleLogs.find(l => l.id === this.editingId);
            if (log) {
                log.receptionNumber = getString('receptionNumber');
                log.date = getString('date');
                log.applicantType = applicantType;
                log.birthDate = applicantType === '개인' ? getString('birthDate') : '';
                log.corpNumber = applicantType === '법인' ? getString('corpNumber') : '';
                log.farmName = getString('farmName');
                log.name = getString('name');
                log.phoneNumber = getString('phoneNumber');
                log.address = getString('address');
                log.addressPostcode = getString('addressPostcode');
                log.addressRoad = getString('addressRoad');
                log.addressDetail = getString('addressDetail');
                log.farmAddress = getString('farmAddressFull');
                log.farmArea = this.parseFormattedNumber(getString('farmArea'));
                log.farmAreaUnit = (getString('farmAreaUnit') || 'm2') as 'pyeong' | 'm2' | 'ha' | undefined;
                log.sampleType = getString('sampleType');
                log.animalType = animalType;
                log.productionDate = getString('productionDate');
                log.sampleCount = getString('sampleCount') || '1';
                log.rawMaterials = getString('rawMaterials');
                log.purpose = getString('purpose');
                log.receptionMethod = getString('receptionMethod');
                log.note = getString('note');
                log.updatedAt = new Date().toISOString();

                this.saveLogs();
                this.showToast('수정이 완료되었습니다.', 'success');
                this.resetForm();
                if (this.receptionNumberInput) {
                    this.receptionNumberInput.value = this.generateNextReceptionNumber();
                }
                this.editingId = null;

                // 제출 버튼 원래대로
                if (this.navSubmitBtn) {
                    this.navSubmitBtn.title = '접수 등록';
                    this.navSubmitBtn.classList.remove('btn-edit-mode');
                }

                // 목록 뷰로 전환
                this.switchView('list');
            }
        } else {
            // === 신규 등록 모드 ===
            const data: CompostSample = {
                id: SampleUtils.generateUUID(),
                receptionNumber: getString('receptionNumber'),
                date: getString('date'),
                applicantType: applicantType,
                birthDate: applicantType === '개인' ? getString('birthDate') : '',
                corpNumber: applicantType === '법인' ? getString('corpNumber') : '',
                farmName: getString('farmName'),
                name: getString('name'),
                phoneNumber: getString('phoneNumber'),
                address: getString('address'),
                addressPostcode: getString('addressPostcode'),
                addressRoad: getString('addressRoad'),
                addressDetail: getString('addressDetail'),
                farmAddress: getString('farmAddressFull'),
                farmArea: this.parseFormattedNumber(getString('farmArea')),
                farmAreaUnit: (getString('farmAreaUnit') || 'm2') as 'pyeong' | 'm2' | 'ha' | undefined,
                sampleType: getString('sampleType'),
                animalType: animalType,
                productionDate: getString('productionDate'),
                sampleCount: getString('sampleCount') || '1',
                rawMaterials: getString('rawMaterials'),
                purpose: getString('purpose'),
                receptionMethod: getString('receptionMethod'),
                note: getString('note'),
                isComplete: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // BaseSample fields already set above: date, receptionNumber, name
            };

            this.sampleLogs.push(data);
            this.saveLogs();

            this.showToast('시료가 등록되었습니다.', 'success');
            this.showRegistrationResult(data);

            this.resetForm();
            if (this.receptionNumberInput) {
                this.receptionNumberInput.value = this.generateNextReceptionNumber();
            }
        }
    }

    // ========================================
    // Override: 샘플 편집
    // ========================================

    editSample(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        this.editingId = id;

        // 폼에 데이터 채우기
        if (this.receptionNumberInput) this.receptionNumberInput.value = log.receptionNumber || '';
        if (this.dateInput) this.dateInput.value = log.date || '';

        // 법인여부/생년월일/법인번호 설정
        const applicantType = log.applicantType || '개인';
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.value = applicantType;
            if (applicantType === '법인') {
                if (this.birthDateField) this.birthDateField.classList.add('hidden');
                if (this.corpNumberField) this.corpNumberField.classList.remove('hidden');
                if (this.corpNumberInput) this.corpNumberInput.value = log.corpNumber || '';
                if (this.birthDateInput) this.birthDateInput.value = '';
            } else {
                if (this.birthDateField) this.birthDateField.classList.remove('hidden');
                if (this.corpNumberField) this.corpNumberField.classList.add('hidden');
                if (this.birthDateInput) this.birthDateInput.value = log.birthDate || '';
                if (this.corpNumberInput) this.corpNumberInput.value = '';
            }
        }

        // 의뢰자 정보
        const farmNameEl = document.getElementById('farmName') as HTMLInputElement | null;
        const nameEl = document.getElementById('name') as HTMLInputElement | null;
        const phoneEl = document.getElementById('phoneNumber') as HTMLInputElement | null;
        if (farmNameEl) farmNameEl.value = log.farmName || '';
        if (nameEl) nameEl.value = log.name || '';
        if (phoneEl) phoneEl.value = log.phoneNumber || '';
        if (this.addressPostcode) this.addressPostcode.value = log.addressPostcode || '';
        if (this.addressRoad) this.addressRoad.value = log.addressRoad || '';
        if (this.addressDetail) this.addressDetail.value = log.addressDetail || '';
        if (this.addressHidden) this.addressHidden.value = log.address || '';

        // 농장 정보
        if (this.farmAddressFullInput) {
            this.farmAddressFullInput.value = log.farmAddress || '';
        }
        const farmAreaEl = document.getElementById('farmArea') as HTMLInputElement | null;
        if (farmAreaEl) farmAreaEl.value = log.farmArea ? this.formatNumberWithCommas(log.farmArea) : '';

        // 면적 단위 복원
        const savedUnit = log.farmAreaUnit || 'm2';
        if (this.areaUnitToggle) {
            this.areaUnitToggle.dataset.unit = savedUnit;
            this.areaUnitToggle.querySelectorAll<HTMLElement>('.unit-btn').forEach((b: HTMLElement) => {
                b.classList.toggle('active', b.dataset.value === savedUnit);
            });
        }
        if (this.farmAreaUnitInput) {
            this.farmAreaUnitInput.value = savedUnit;
        }

        // 시료종류 설정
        const sampleTypeRadios = document.querySelectorAll<HTMLInputElement>('input[name="sampleType"]');
        sampleTypeRadios.forEach((radio: HTMLInputElement) => {
            radio.checked = radio.value === log.sampleType;
        });

        // 축종 설정
        let animalTypeFound = false;
        if (this.animalTypeRadios) {
            this.animalTypeRadios.forEach((radio: HTMLInputElement) => {
                if (radio.value === log.animalType) {
                    radio.checked = true;
                    animalTypeFound = true;
                } else if (radio.value === '기타' && !animalTypeFound && log.animalType && !['소', '돼지', '닭·오리 등'].includes(log.animalType)) {
                    radio.checked = true;
                    if (this.animalTypeOtherInput) {
                        this.animalTypeOtherInput.value = log.animalType;
                        this.animalTypeOtherInput.classList.remove('hidden');
                    }
                }
            });
        }

        // 생산 정보
        const productionDateEl = document.getElementById('productionDate') as HTMLInputElement | null;
        const sampleCountEl = document.getElementById('sampleCount') as HTMLInputElement | null;
        const rawMaterialsEl = document.getElementById('rawMaterials') as HTMLInputElement | null;
        const purposeEl = document.getElementById('purpose') as HTMLInputElement | null;
        const noteEl = document.getElementById('note') as HTMLInputElement | null;
        if (productionDateEl) productionDateEl.value = log.productionDate || '';
        if (sampleCountEl) sampleCountEl.value = String(log.sampleCount || 1);
        if (rawMaterialsEl) rawMaterialsEl.value = log.rawMaterials || '';
        if (purposeEl) purposeEl.value = log.purpose || '';
        if (noteEl) noteEl.value = log.note || '';

        // 통보방법 선택
        if (this.receptionMethodBtns) {
            this.receptionMethodBtns.forEach((b: Element) => {
                const btn = b as HTMLElement;
                btn.classList.toggle('active', btn.dataset.method === log.receptionMethod);
            });
        }
        if (this.receptionMethodInput) this.receptionMethodInput.value = log.receptionMethod || '';

        this.switchView('form');
        this.showToast('수정 모드입니다. 변경 후 등록 버튼을 클릭하세요.', 'warning');

        // 제출 버튼 스타일 변경 (수정 모드 표시)
        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '수정 완료';
            this.navSubmitBtn.classList.add('btn-edit-mode');
        }
    }

    // ========================================
    // Override: 폼 초기화
    // ========================================

    resetForm(): void {
        // 접수번호와 접수일자 값 저장
        const receptionNumber = this.receptionNumberInput?.value;
        const date = this.dateInput?.value;

        if (this.form) this.form.reset();

        // 접수번호와 접수일자 복원
        if (receptionNumber && this.receptionNumberInput) {
            this.receptionNumberInput.value = receptionNumber;
        }
        if (date && this.dateInput) {
            this.dateInput.value = date;
        } else if (this.dateInput) {
            this.dateInput.valueAsDate = new Date();
        }

        // 통보방법 초기화
        if (this.receptionMethodBtns) {
            this.receptionMethodBtns.forEach((b: Element) => (b as HTMLElement).classList.remove('active'));
        }
        if (this.receptionMethodInput) this.receptionMethodInput.value = '';

        // 개인/법인 초기화
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.value = '개인';
            if (this.birthDateField) this.birthDateField.classList.remove('hidden');
            if (this.corpNumberField) this.corpNumberField.classList.add('hidden');
        }
        if (this.birthDateInput) this.birthDateInput.value = '';
        if (this.corpNumberInput) this.corpNumberInput.value = '';

        // 시료종류 초기화 (첫 번째 라디오 선택)
        const sampleTypeRadios = document.querySelectorAll<HTMLInputElement>('input[name="sampleType"]');
        if (sampleTypeRadios.length > 0) {
            sampleTypeRadios[0].checked = true;
        }

        // 축종 초기화 (첫 번째 라디오 선택)
        if (this.animalTypeRadios && this.animalTypeRadios.length > 0) {
            this.animalTypeRadios[0].checked = true;
        }
        if (this.animalTypeOtherInput) {
            this.animalTypeOtherInput.classList.add('hidden');
            this.animalTypeOtherInput.value = '';
        }

        // 면적 단위 초기화
        if (this.areaUnitToggle) {
            this.areaUnitToggle.dataset.unit = 'm2';
            this.areaUnitToggle.querySelectorAll<HTMLElement>('.unit-btn').forEach((b: HTMLElement) => {
                b.classList.toggle('active', b.dataset.value === 'm2');
            });
        }
        if (this.farmAreaUnitInput) {
            this.farmAreaUnitInput.value = 'm2';
        }

        // 접수번호 갱신
        const nextNumber = this.generateNextReceptionNumber();
        if (this.receptionNumberInput) this.receptionNumberInput.value = nextNumber;

        // 수정 모드 해제
        this.editingId = null;

        // 제출 버튼 스타일 복원
        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '접수 등록';
            this.navSubmitBtn.classList.remove('btn-edit-mode');
        }
    }

    // ========================================
    // Override: 타입별 이벤트 설정
    // ========================================

    setupTypeSpecificEvents(): void {
        // -- 주소 검색 (AddressManager) --
        this.addressManager = new window.AddressManager({
            searchBtn: document.getElementById('searchAddressBtn'),
            postcodeInput: this.addressPostcode,
            roadInput: this.addressRoad,
            detailInput: this.addressDetail,
            hiddenInput: this.addressHidden,
            modal: document.getElementById('addressModal'),
            closeBtn: document.getElementById('closeAddressModal'),
            container: document.getElementById('daumPostcodeContainer')
        });

        // -- 개인/법인 선택 전환 --
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.addEventListener('change', () => {
                if (!this.applicantTypeSelect) return;
                const isCorpSelected = this.applicantTypeSelect.value === '법인';
                if (isCorpSelected) {
                    if (this.birthDateField) this.birthDateField.classList.add('hidden');
                    if (this.corpNumberField) this.corpNumberField.classList.remove('hidden');
                    if (this.birthDateInput) this.birthDateInput.value = '';
                } else {
                    if (this.birthDateField) this.birthDateField.classList.remove('hidden');
                    if (this.corpNumberField) this.corpNumberField.classList.add('hidden');
                    if (this.corpNumberInput) this.corpNumberInput.value = '';
                }
            });
        }

        // -- 법인번호 자동 하이픈 --
        if (this.corpNumberInput) {
            this.corpNumberInput.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                let value = target.value.replace(/[^0-9]/g, '');
                if (value.length > 13) value = value.slice(0, 13);
                if (value.length > 6) {
                    value = value.slice(0, 6) + '-' + value.slice(6);
                }
                target.value = value;
            });
        }

        // -- 전화번호 자동 하이픈 (공통 모듈 사용) --
        const phoneNumberInput = document.getElementById('phoneNumber');
        window.SampleUtils.setupPhoneNumberInput(phoneNumberInput);

        // -- 통보방법 선택 --
        if (this.receptionMethodBtns) {
            this.receptionMethodBtns.forEach((btn: Element) => {
                btn.addEventListener('click', () => {
                    if (this.receptionMethodBtns) {
                        this.receptionMethodBtns.forEach((b: Element) => (b as HTMLElement).classList.remove('active'));
                    }
                    (btn as HTMLElement).classList.add('active');
                    if (this.receptionMethodInput) {
                        this.receptionMethodInput.value = (btn as HTMLElement).dataset.method || '';
                    }
                });
            });
        }

        // -- 축종 기타 입력 필드 처리 --
        if (this.animalTypeRadios) {
            this.animalTypeRadios.forEach((radio: HTMLInputElement) => {
                radio.addEventListener('change', () => {
                    if (radio.value === '기타' && radio.checked) {
                        if (this.animalTypeOtherInput) {
                            this.animalTypeOtherInput.classList.remove('hidden');
                            this.animalTypeOtherInput.focus();
                        }
                    } else {
                        if (this.animalTypeOtherInput) {
                            this.animalTypeOtherInput.classList.add('hidden');
                            this.animalTypeOtherInput.value = '';
                        }
                    }
                });
            });
        }

        // -- 면적 천단위 콤마 포맷팅 --
        if (this.farmAreaInput) {
            this.farmAreaInput.addEventListener('input', (e: Event) => {
                const target = e.target as HTMLInputElement;
                const formatted = this.formatNumberWithCommas(target.value);
                target.value = formatted;
            });
        }

        // -- 면적 단위 토글 --
        if (this.areaUnitToggle) {
            this.areaUnitToggle.querySelectorAll<HTMLElement>('.unit-btn').forEach((btn: HTMLElement) => {
                btn.addEventListener('click', () => {
                    const value = btn.dataset.value || 'm2';
                    if (this.areaUnitToggle) {
                        this.areaUnitToggle.querySelectorAll('.unit-btn').forEach((b: Element) => (b as HTMLElement).classList.remove('active'));
                        this.areaUnitToggle.dataset.unit = value;
                    }
                    btn.classList.add('active');
                    if (this.farmAreaUnitInput) {
                        this.farmAreaUnitInput.value = value;
                    }
                });
            });
        }

        // -- 접수번호 초기 설정 --
        if (this.receptionNumberInput) {
            this.receptionNumberInput.value = this.generateNextReceptionNumber();
        }

        // -- 네비게이션 접수/초기화 버튼 --
        if (this.navSubmitBtn) {
            this.navSubmitBtn.addEventListener('click', () => {
                if (this.form?.checkValidity()) {
                    this.submitForm();
                } else {
                    this.form?.reportValidity();
                }
            });
        }
        if (this.navResetBtn) {
            this.navResetBtn.addEventListener('click', () => {
                if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
                    this.resetForm();
                }
            });
        }

        // -- 빈 상태에서 "새 시료 접수하기" 버튼 --
        const btnGoForm = document.querySelector('.btn-go-form');
        if (btnGoForm) {
            btnGoForm.addEventListener('click', () => this.switchView('form'));
        }

        // -- 오늘 날짜 설정 (dateInput은 이미 initViews에서 설정) --

        // -- 등록 결과 모달 이벤트 --
        this.setupRegistrationResultModal();

        // -- 테이블 이벤트 위임 (compost-specific) --
        this.setupCompostTableEvents();

        // -- 전체 선택 / 선택 삭제 --
        this.setupBulkActions();

        // -- 라벨 인쇄 --
        this.setupLabelPrint();

        // -- 일괄 우편발송일자 --
        this.setupBulkMailDate();

        // -- 통계 모달 --
        this.setupStatisticsModal();

        // -- 검색 모달 --
        this.setupSearchModal();

        // -- 엑셀 내보내기 --
        this.setupExcelExport();

        // -- JSON 저장/불러오기 --
        this.setupJSONHandlers();

        // -- 자동 저장 설정 --
        this.setupAutoSaveHandlers();

        // -- 전체 보기/기본 보기 토글 --
        this.setupColumnToggle();

        // -- 농장주소 자동완성 --
        this.bindFarmAddressAutocomplete();

        // -- 엑셀 가져오기 (ExcelImportManager) --
        this.setupExcelImport();

        // -- Electron 자동 저장 파일 로드 --
        this.loadAutoSaveOnInit();

        // -- 분석결과 모달 초기화 --
        this.initCompostAnalysisModal();

        // -- Firestore 분석결과 동기화 --
        this.syncCompostTestResultsFromFirestore();

        // -- 검정결과 조회 버튼 --
        const compostAnalysisViewBtn = document.getElementById('compostAnalysisViewBtn');
        if (compostAnalysisViewBtn) {
            compostAnalysisViewBtn.addEventListener('click', () => {
                localStorage.setItem('compostAnalysis_year', this.selectedYear);
                const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked'))
                    .map(cb => cb.dataset.id)
                    .filter(Boolean) as string[];
                localStorage.setItem('compostAnalysis_selected_ids', JSON.stringify(selectedIds));

                const isElectron = window.electronAPI?.isElectron === true;
                if (isElectron && window.electronAPI?.openCompostAnalysis) {
                    window.electronAPI.openCompostAnalysis();
                } else {
                    const popup = window.open('../compost-analysis/index.html', '_blank');
                    if (!popup) window.location.href = '../compost-analysis/index.html';
                }
            });
        }
    }

    // ========================================
    // 등록 결과 모달
    // ========================================

    setupRegistrationResultModal(): void {
        const closeRegistrationModal = document.getElementById('closeRegistrationModal');
        const closeResultBtn = document.getElementById('closeResultBtn');
        const editResultBtn = document.getElementById('editResultBtn');

        if (closeRegistrationModal) {
            closeRegistrationModal.addEventListener('click', () => this.closeRegistrationResultModal());
        }
        if (closeResultBtn) {
            closeResultBtn.addEventListener('click', () => this.closeRegistrationResultModal());
        }
        if (editResultBtn) {
            editResultBtn.addEventListener('click', () => {
                if (this.currentRegistrationData) {
                    const dataToEdit = this.currentRegistrationData;
                    this.closeRegistrationResultModal();
                    this.editSample(String(dataToEdit.id));
                }
            });
        }
        if (this.registrationResultModal) {
            this.registrationResultModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeRegistrationResultModal());
        }
    }

    showRegistrationResult(data: CompostSample): void {
        if (!this.registrationResultModal || !this.resultTableBody) return;

        this.currentRegistrationData = data;

        const rows: { label: string; value: string; isMultiline?: boolean }[] = [
            { label: '접수번호', value: data.receptionNumber || '' },
            { label: '접수일자', value: data.date || '' },
            { label: '상호(농장명)', value: data.farmName || '' },
            { label: '성명(대표자)', value: data.name || '' },
            { label: '연락처', value: data.phoneNumber || '' },
            { label: '시료종류', value: data.sampleType || '' },
            { label: '축종', value: data.animalType || '' },
            { label: '생산일자', value: data.productionDate || '' },
            { label: '시료수', value: `${data.sampleCount || 1}점` },
            { label: '원료 및 투입비율', value: data.rawMaterials || '' },
            { label: '목적(용도)', value: data.purpose || '' },
            { label: '통보방법', value: data.receptionMethod || '' },
            { label: '비고', value: data.note || '' }
        ];

        BaseSampleManager.buildResultTable(this.resultTableBody, rows);
        this.registrationResultModal.classList.remove('hidden');
    }

    closeRegistrationResultModal(): void {
        if (this.registrationResultModal) {
            this.registrationResultModal.classList.add('hidden');
        }
        this.currentRegistrationData = null;
    }

    // ========================================
    // 테이블 이벤트 위임 (compost-specific)
    // ========================================

    setupCompostTableEvents(): void {
        if (!this.tableBody) return;

        // 클릭 이벤트 위임
        this.tableBody.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            // select, input 요소 클릭 시 이벤트 무시 (드롭다운/입력 동작 보호)
            if (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.tagName === 'OPTION') {
                return;
            }

            // 완료 버튼
            const completeBtn = target.closest('.btn-complete') as HTMLElement | null;
            if (completeBtn) {
                const id = completeBtn.dataset.id || '';
                this.toggleComplete(id);
                return;
            }

            // 판정 버튼
            const resultBtn = target.closest('.btn-result') as HTMLElement | null;
            if (resultBtn) {
                const id = resultBtn.dataset.id || '';
                this.toggleTestResult(id);
                return;
            }

            // 삭제 버튼
            const deleteBtn = target.closest('.btn-delete') as HTMLElement | null;
            if (deleteBtn) {
                const id = deleteBtn.dataset.id || '';
                if (confirm('이 항목을 삭제하시겠습니까?')) {
                    this.deleteSample(id);
                }
                return;
            }

            // 수정 버튼
            const editBtn = target.closest('.btn-edit') as HTMLElement | null;
            if (editBtn) {
                const id = editBtn.dataset.id || '';
                this.editSample(id);
                return;
            }

            // 분석결과 버튼
            const analysisBtn = target.closest('.btn-analysis-open') as HTMLElement | null;
            if (analysisBtn) {
                this.openCompostAnalysisModal(analysisBtn.dataset.id || '');
                return;
            }
        });

        // 부숙도 드롭다운 변경 이벤트
        this.tableBody.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLElement;
            const maturitySelect = target.closest('.maturity-select') as HTMLSelectElement | null;
            if (maturitySelect) {
                const id = maturitySelect.dataset.id || '';
                this.updateMaturity(id, maturitySelect.value);
                return;
            }
        });

        // 함수율 입력 변경 이벤트 (blur 시 저장)
        this.tableBody.addEventListener('blur', (e: Event) => {
            const target = e.target as HTMLElement;
            const moistureInput = target.closest('.moisture-input') as HTMLInputElement | null;
            if (moistureInput) {
                const id = moistureInput.dataset.id || '';
                this.updateMoisture(id, moistureInput.value);
                return;
            }
        }, true); // capture phase for blur event

        // 함수율 Enter 키 입력 시 저장
        this.tableBody.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                const moistureInput = target.closest('.moisture-input') as HTMLInputElement | null;
                if (moistureInput) {
                    const id = moistureInput.dataset.id || '';
                    this.updateMoisture(id, moistureInput.value);
                    moistureInput.blur();
                    return;
                }
            }
        });
    }

    // ========================================
    // 접수번호 자동 생성
    // ========================================

    generateNextReceptionNumber(): string {
        let maxNumber = 0;

        this.sampleLogs.forEach(log => {
            if (log.receptionNumber) {
                const num = parseInt(log.receptionNumber, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });

        const nextNumber = maxNumber + 1;
        return String(nextNumber);
    }

    // ========================================
    // 완료 토글
    // ========================================

    toggleComplete(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            log.isComplete = !log.isComplete;
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.filterAndRenderLogs();
        }
    }

    // ========================================
    // 판정 결과 토글 (미판정 -> 적합 -> 부적합 -> 미판정)
    // ========================================

    toggleTestResult(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            if (!log.testResult) {
                log.testResult = 'pass';
            } else if (log.testResult === 'pass') {
                log.testResult = 'fail';
            } else {
                log.testResult = null;
            }
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.filterAndRenderLogs();
        }
    }

    // BaseSampleManager의 setupTableEventDelegation()이 toggleResult를 호출하므로 alias
    toggleResult(id: string): void {
        this.toggleTestResult(id);
    }

    // ========================================
    // 부숙도 / 함수율 업데이트
    // ========================================

    updateMaturity(id: string, value: string): void {
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            logItem.maturity = value;
            logItem.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.log('부숙도 업데이트:', id, value);
        }
    }

    updateMoisture(id: string, value: string): void {
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            logItem.moisture = value;
            logItem.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.log('함수율 업데이트:', id, value);
        }
    }

    // ========================================
    // 시료종류/축종 뱃지
    // ========================================

    getSampleTypeBadge(type?: string): string {
        const typeMap: Record<string, { class: string; icon: string }> = {
            '가축분퇴비': { class: 'compost', icon: '🌿' },
            '가축분뇨발효액': { class: 'liquid', icon: '💧' }
        };
        const config = type && typeMap[type] ? typeMap[type] : { class: 'other', icon: '📦' };
        return `<span class="sample-type-badge ${config.class}">${config.icon} ${escapeHTML(type || '기타')}</span>`;
    }

    getAnimalTypeBadge(type?: string): string {
        const typeMap: Record<string, { class: string; icon: string }> = {
            '소': { class: 'cow', icon: '🐄' },
            '돼지': { class: 'pig', icon: '🐷' },
            '닭·오리 등': { class: 'chicken', icon: '🐔' }
        };
        const config = type && typeMap[type] ? typeMap[type] : { class: 'other', icon: '🐾' };
        return `<span class="animal-type-badge ${config.class}">${config.icon} ${escapeHTML(type || '기타')}</span>`;
    }

    // ========================================
    // 전체 선택 / 선택 삭제
    // ========================================

    setupBulkActions(): void {
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll<HTMLInputElement>('.row-checkbox');
                checkboxes.forEach((cb: HTMLInputElement) => cb.checked = this.selectAllCheckbox!.checked);
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        const tableBody = this.tableBody || document.querySelector('tbody');
        if (tableBody) {
            tableBody.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const nameCell = target.closest('.col-name') as HTMLElement | null;
                if (nameCell && nameCell.dataset.name) {
                    const targetName = nameCell.dataset.name;
                    const rowCheckboxes = tableBody.querySelectorAll<HTMLInputElement>('.row-checkbox');
                    const targetCheckboxes: HTMLInputElement[] = [];

                    rowCheckboxes.forEach((cb: HTMLInputElement) => {
                        const tr = cb.closest('tr');
                        const nc = tr?.querySelector('.col-name') as HTMLElement | null;
                        if (nc && nc.dataset.name === targetName) {
                            targetCheckboxes.push(cb);
                        }
                    });

                    if (targetCheckboxes.length === 0) return;
                    const allChecked = targetCheckboxes.every((cb: HTMLInputElement) => cb.checked);
                    targetCheckboxes.forEach((cb: HTMLInputElement) => { cb.checked = !allChecked; });

                    if (this.selectAllCheckbox) {
                        const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                        this.selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        this.selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });

            // 개별 체크박스 변경 시 전체 선택 상태 갱신
            tableBody.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('row-checkbox')) {
                    const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                    const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                    if (this.selectAllCheckbox) {
                        this.selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        this.selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });
        }

        const btnBulkDelete = document.getElementById('deleteSelectedBtn');
        if (btnBulkDelete) {
            btnBulkDelete.addEventListener('click', async () => {
                const selectedIds = Array.from(document.querySelectorAll<HTMLElement>('.row-checkbox:checked')).map(cb => cb.dataset.id);

                if (selectedIds.length === 0) {
                    showToast('삭제할 항목을 선택해주세요.', 'warning');
                    return;
                }

                if (confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?`)) {
                    this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                    this.saveLogs();
                    this.filterAndRenderLogs();
                    if (this.selectAllCheckbox) this.selectAllCheckbox.checked = false;

                    // Firebase에서도 삭제 (await로 완료 보장)
                    if (window.firestoreDb?.isEnabled()) {
                        try {
                            await Promise.all(selectedIds.map((id: string | undefined) =>
                                window.firestoreDb!.delete('compost', parseInt(this.selectedYear), id || '')
                            ));
                            this.log('Firebase 일괄 삭제 완료:', selectedIds.length, '건');
                        } catch (err) {
                            (window.logger?.error || console.error)('Firebase 일괄 삭제 실패:', err);
                        }
                    }

                    this.showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
                }
            });
        }
    }

    // ========================================
    // 라벨 인쇄
    // ========================================

    setupLabelPrint(): void {
        const printLabelBtn = document.getElementById('printLabelBtn');
        if (!printLabelBtn) return;

        printLabelBtn.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')).map(cb => cb.dataset.id);

            if (selectedIds.length === 0) {
                if (this.sampleLogs.length === 0) {
                    showToast('인쇄할 데이터가 없습니다.', 'warning');
                    return;
                }

                if (!confirm(`선택된 항목이 없습니다.\n전체 ${this.sampleLogs.length}건을 라벨 인쇄하시겠습니까?`)) {
                    return;
                }

                this.openLabelPrintWithData(this.sampleLogs);
            } else {
                const selectedLogs = this.sampleLogs.filter(log => selectedIds.includes(String(log.id)));
                this.openLabelPrintWithData(selectedLogs);
            }
        });
    }

    openLabelPrintWithData(logs: CompostSample[]): void {
        const labelData = logs.map(log => {
            const addressParts = [];
            if (log.addressRoad) addressParts.push(log.addressRoad);
            if (log.addressDetail) addressParts.push(log.addressDetail);
            const address = addressParts.join(' ');

            return {
                name: log.name || '',
                address: address,
                postalCode: log.addressPostcode || ''
            };
        });

        // 중복 제거 (주소 기준)
        const uniqueMap = new Map();
        labelData.forEach(item => {
            const key = `${item.address}|${item.postalCode}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        });
        const uniqueLabelData = Array.from(uniqueMap.values());

        const duplicateCount = labelData.length - uniqueLabelData.length;
        if (duplicateCount > 0) {
            this.showToast(`주소 중복 ${duplicateCount}건 제거됨 (총 ${uniqueLabelData.length}건)`, 'info');
        }

        localStorage.setItem('labelPrintData', JSON.stringify(uniqueLabelData));
        window.location.href = '../label-print/index.html';
    }

    // ========================================
    // 일괄 우편발송일자 입력 (모달)
    // ========================================

    setupBulkMailDate(): void {
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const mailDateModal = document.getElementById('mailDateModal');
        const closeMailDateModal = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');
        const mailDateInput = document.getElementById('mailDateInput') as HTMLInputElement | null;
        const mailDateInfo = document.getElementById('mailDateInfo');

        const closeModalFn = () => {
            if (mailDateModal) mailDateModal.classList.add('hidden');
            this.pendingMailDateIds = [];
        };

        if (closeMailDateModal) closeMailDateModal.addEventListener('click', closeModalFn);
        if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', closeModalFn);
        if (mailDateModal) {
            mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', closeModalFn);
        }

        if (confirmMailDateBtn) {
            confirmMailDateBtn.addEventListener('click', () => {
                const inputDate = mailDateInput?.value;

                if (!inputDate) {
                    this.showToast('날짜를 선택해주세요.', 'warning');
                    return;
                }

                let updatedCount = 0;
                this.sampleLogs = this.sampleLogs.map(log => {
                    if (this.pendingMailDateIds.includes(String(log.id))) {
                        updatedCount++;
                        return { ...log, mailDate: inputDate, updatedAt: new Date().toISOString() };
                    }
                    return log;
                });

                this.saveLogs();
                this.filterAndRenderLogs();
                if (this.selectAllCheckbox) this.selectAllCheckbox.checked = false;

                closeModalFn();
                this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')).map(cb => cb.dataset.id).filter((id): id is string => id !== undefined);

                if (selectedIds.length === 0) {
                    this.showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                    return;
                }

                this.pendingMailDateIds = selectedIds;
                const today = new Date().toISOString().split('T')[0];
                if (mailDateInput) mailDateInput.value = today;
                if (mailDateInfo) mailDateInfo.textContent = `선택한 ${selectedIds.length}건의 우편발송일자를 입력하세요.`;
                if (mailDateModal) mailDateModal.classList.remove('hidden');
            });
        }
    }

    // ========================================
    // 통계 모달
    // ========================================

    setupStatisticsModal(): void {
        const statsBtn = document.getElementById('statsBtn');
        const statsModal = document.getElementById('statsModal');
        const closeStatsModal = document.getElementById('closeStatsModal');
        const closeStatsBtn2 = document.getElementById('closeStatsBtn2');

        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatistics());
        }
        if (closeStatsModal && statsModal) {
            closeStatsModal.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
        if (closeStatsBtn2 && statsModal) {
            closeStatsBtn2.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
        if (statsModal) {
            statsModal.querySelector('.modal-overlay')?.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
    }

    showStatistics(): void {
        const statsModal = document.getElementById('statsModal');
        const total = this.sampleLogs.length;
        const completed = this.sampleLogs.filter(l => l.isComplete).length;
        const pending = total - completed;

        const statTotalCount = document.getElementById('statTotalCount');
        const statCompletedCount = document.getElementById('statCompletedCount');
        const statPendingCount = document.getElementById('statPendingCount');
        if (statTotalCount) statTotalCount.textContent = String(total);
        if (statCompletedCount) statCompletedCount.textContent = String(completed);
        if (statPendingCount) statPendingCount.textContent = String(pending);

        // 시료종류별
        const bySampleType: Record<string, number> = { '가축분퇴비': 0, '가축분뇨발효액': 0 };
        this.sampleLogs.forEach(l => {
            const type = l.sampleType || '기타';
            if (!(type in bySampleType)) bySampleType[type] = 0;
            bySampleType[type]++;
        });
        this.renderStatsChart('statsByCompostType', bySampleType, total, 'compost');

        // 축종별
        const byAnimalType: Record<string, number> = { '소': 0, '돼지': 0, '닭·오리 등': 0, '기타': 0 };
        this.sampleLogs.forEach(l => {
            const type = l.animalType || '기타';
            if (!(type in byAnimalType)) byAnimalType[type] = 0;
            byAnimalType[type]++;
        });
        this.renderStatsChart('statsByAnimalType', byAnimalType, total, 'animal');

        // 수령방법별
        const byReceptionMethod: Record<string, number> = { '우편': 0, '이메일': 0, '팩스': 0, '방문': 0 };
        this.sampleLogs.forEach(l => {
            const raw = l.receptionMethod;
            const method = (raw && raw.trim() && raw !== '-') ? raw : '기타';
            if (method === '기타') return;
            if (!(method in byReceptionMethod)) byReceptionMethod[method] = 0;
            byReceptionMethod[method]++;
        });
        this.renderStatsChart('statsByReceptionMethod', byReceptionMethod, total, 'method');

        // 월별 집계
        const byMonth: Record<string, MonthStats> = {};
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        for (let i = 1; i <= 12; i++) {
            const monthKey = String(i).padStart(2, '0');
            byMonth[monthKey] = {
                count: 0,
                completed: 0,
                pending: 0,
                label: monthNames[i - 1],
                class: 'month'
            };
        }

        this.sampleLogs.forEach(l => {
            if (l.date) {
                const monthNum = l.date.substring(5, 7);
                if (byMonth[monthNum]) {
                    byMonth[monthNum].count++;
                    if (l.isComplete) {
                        byMonth[monthNum].completed++;
                    } else {
                        byMonth[monthNum].pending++;
                    }
                }
            }
        });

        // 분기별 집계
        const byQuarter: Record<string, QuarterStats> = {
            Q1: { count: 0, completed: 0, pending: 0, label: '1분기 (1~3월)' },
            Q2: { count: 0, completed: 0, pending: 0, label: '2분기 (4~6월)' },
            Q3: { count: 0, completed: 0, pending: 0, label: '3분기 (7~9월)' },
            Q4: { count: 0, completed: 0, pending: 0, label: '4분기 (10~12월)' }
        };

        Object.entries(byMonth).forEach(([monthKey, data]) => {
            const monthNum = parseInt(monthKey, 10);
            let quarter: string;
            if (monthNum <= 3) quarter = 'Q1';
            else if (monthNum <= 6) quarter = 'Q2';
            else if (monthNum <= 9) quarter = 'Q3';
            else quarter = 'Q4';

            byQuarter[quarter].count += data.count;
            byQuarter[quarter].completed += data.completed;
            byQuarter[quarter].pending += data.pending;
        });

        this.renderMonthlyChart('statsByMonth', byMonth);
        this.renderQuarterlySummary('statsQuarterly', byQuarter);

        if (statsModal) statsModal.classList.remove('hidden');
    }

    renderMonthlyChart(containerId: string, data: Record<string, MonthStats>): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
        const maxCount = Math.max(...entries.map(([, v]) => v.count), 1);
        container.innerHTML = sanitizeHTML(`
            <div class="monthly-chart">
                <div class="monthly-bars">
                    ${entries.map(([key, value]) => {
                        const heightPercent = maxCount > 0 ? (value.count / maxCount) * 100 : 0;
                        const completedPercent = value.count > 0 ? (value.completed / value.count) * 100 : 0;
                        return `
                            <div class="monthly-bar-group">
                                <div class="monthly-bar-container">
                                    <div class="monthly-bar-stack" data-h="${heightPercent.toFixed(1)}">
                                        <div class="monthly-bar-completed" data-h="${completedPercent.toFixed(1)}" title="완료: ${value.completed}건"></div>
                                        <div class="monthly-bar-pending" data-h="${(100 - completedPercent).toFixed(1)}" title="미완료: ${value.pending}건"></div>
                                    </div>
                                    ${value.count > 0 ? `<span class="monthly-bar-value">${value.count}</span>` : ''}
                                </div>
                                <span class="monthly-bar-label">${value.label}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="monthly-legend">
                    <span class="legend-item"><span class="legend-color completed"></span> 완료</span>
                    <span class="legend-item"><span class="legend-color pending"></span> 미완료</span>
                </div>
            </div>
        `);
        container.querySelectorAll('.monthly-bar-stack[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
        container.querySelectorAll('.monthly-bar-completed[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
        container.querySelectorAll('.monthly-bar-pending[data-h]').forEach(el => { (el as HTMLElement).style.height = el.getAttribute('data-h') + '%'; });
    }

    renderQuarterlySummary(containerId: string, data: Record<string, QuarterStats>): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const totalCount = Object.values(data).reduce((sum, q) => sum + q.count, 0);

        container.innerHTML = sanitizeHTML(`
            <div class="quarterly-summary">
                ${Object.entries(data).map(([key, value]) => {
                    const percent = totalCount > 0 ? ((value.count / totalCount) * 100).toFixed(1) : 0;
                    return `
                        <div class="quarterly-item">
                            <div class="quarterly-label">${value.label}</div>
                            <div class="quarterly-stats">
                                <span class="quarterly-count">${value.count}건</span>
                                <span class="quarterly-percent">(${percent}%)</span>
                            </div>
                            <div class="quarterly-detail">
                                <span class="quarterly-completed">완료 ${value.completed}</span>
                                <span class="quarterly-pending">미완료 ${value.pending}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `);
    }

    renderStatsChart(containerId: string, data: Record<string, number>, total: number, category: string): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        const compostClassMap: Record<string, string> = {
            '가축분퇴비': 'compost-manure',
            '가축분액비': 'compost-liquid',
            '기타': 'compost-other'
        };
        const animalClassMap: Record<string, string> = {
            '소': 'animal-cow',
            '돼지': 'animal-pig',
            '닭': 'animal-chicken',
            '오리': 'animal-duck',
            '말': 'animal-horse',
            '혼합': 'animal-mixed',
            '기타': 'animal-other'
        };
        const methodClassMap: Record<string, string> = {
            '우편': 'method-mail',
            '이메일': 'method-email',
            '팩스': 'method-fax',
            '직접방문': 'method-visit'
        };

        container.innerHTML = sanitizeHTML(entries.map(([label, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            let barClass = '';
            if (category === 'compost') {
                barClass = compostClassMap[label] || 'compost-other';
            } else if (category === 'animal') {
                barClass = animalClassMap[label] || 'animal-other';
            } else if (category === 'method') {
                barClass = methodClassMap[label] || 'method-other';
            }
            return `
                <div class="stat-bar-item">
                    <div class="stat-bar-label">${label}</div>
                    <div class="stat-bar-wrapper">
                        <div class="stat-bar-fill ${barClass}" data-w="${percentage}"></div>
                    </div>
                    <div class="stat-bar-value">${count}건 (${percentage}%)</div>
                </div>
            `;
        }).join(''));
        container.querySelectorAll('.stat-bar-fill[data-w]').forEach(el => { (el as HTMLElement).style.width = el.getAttribute('data-w') + '%'; });
    }

    // ========================================
    // 검색 모달
    // ========================================

    setupSearchModal(): void {
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const listSearchModal = document.getElementById('listSearchModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const applySearchBtn = document.getElementById('applySearchBtn');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const searchDateFromInput = document.getElementById('searchDateFromInput') as HTMLInputElement | null;
        const searchDateToInput = document.getElementById('searchDateToInput') as HTMLInputElement | null;
        const searchNameInput = document.getElementById('searchNameInput') as HTMLInputElement | null;
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput') as HTMLInputElement | null;
        const searchReceptionToInput = document.getElementById('searchReceptionToInput') as HTMLInputElement | null;
        const clearSearchDate = document.getElementById('clearSearchDate');
        const clearSearchReception = document.getElementById('clearSearchReception');
        const completedFilter = document.getElementById('completedFilter') as HTMLSelectElement | null;

        // 완료 상태 필터 드롭다운
        if (completedFilter) {
            completedFilter.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                this.currentSearchFilter.completed = target.value as 'all' | 'completed' | 'incomplete';
                this.filterAndRenderLogs();
            });
        }

        if (openSearchModalBtn && listSearchModal) {
            openSearchModalBtn.addEventListener('click', () => {
                if (searchDateFromInput) searchDateFromInput.value = this.currentSearchFilter.dateFrom;
                if (searchDateToInput) searchDateToInput.value = this.currentSearchFilter.dateTo;
                if (searchNameInput) searchNameInput.value = this.currentSearchFilter.name;
                if (searchReceptionFromInput) searchReceptionFromInput.value = this.currentSearchFilter.receptionFrom;
                if (searchReceptionToInput) searchReceptionToInput.value = this.currentSearchFilter.receptionTo;
                listSearchModal.classList.remove('hidden');
                if (searchNameInput) searchNameInput.focus();
            });
        }
        if (closeSearchModal && listSearchModal) {
            closeSearchModal.addEventListener('click', () => listSearchModal.classList.add('hidden'));
        }
        if (listSearchModal) {
            listSearchModal.querySelector('.modal-overlay')?.addEventListener('click', () => listSearchModal.classList.add('hidden'));
        }
        if (clearSearchDate) {
            clearSearchDate.addEventListener('click', () => {
                if (searchDateFromInput) searchDateFromInput.value = '';
                if (searchDateToInput) searchDateToInput.value = '';
            });
        }
        if (clearSearchReception) {
            clearSearchReception.addEventListener('click', () => {
                if (searchReceptionFromInput) searchReceptionFromInput.value = '';
                if (searchReceptionToInput) searchReceptionToInput.value = '';
            });
        }
        if (resetSearchBtn && listSearchModal) {
            resetSearchBtn.addEventListener('click', () => {
                if (searchDateFromInput) searchDateFromInput.value = '';
                if (searchDateToInput) searchDateToInput.value = '';
                if (searchNameInput) searchNameInput.value = '';
                if (searchReceptionFromInput) searchReceptionFromInput.value = '';
                if (searchReceptionToInput) searchReceptionToInput.value = '';
                if (completedFilter) completedFilter.value = 'incomplete';
                this.currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', completed: 'incomplete' };
                this.filterAndRenderLogs();
                this.updateSearchButtonState();
                listSearchModal.classList.add('hidden');
            });
        }
        if (applySearchBtn && listSearchModal) {
            applySearchBtn.addEventListener('click', () => {
                this.currentSearchFilter.dateFrom = searchDateFromInput ? searchDateFromInput.value : '';
                this.currentSearchFilter.dateTo = searchDateToInput ? searchDateToInput.value : '';
                this.currentSearchFilter.name = searchNameInput ? searchNameInput.value.toLowerCase() : '';
                this.currentSearchFilter.receptionFrom = searchReceptionFromInput ? searchReceptionFromInput.value : '';
                this.currentSearchFilter.receptionTo = searchReceptionToInput ? searchReceptionToInput.value : '';
                this.filterAndRenderLogs();
                listSearchModal.classList.add('hidden');
            });
        }

        // Enter 키로 검색
        [searchNameInput, searchReceptionFromInput, searchReceptionToInput].forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && applySearchBtn) applySearchBtn.click();
                });
            }
        });
    }

    // extractReceptionNumber, filterAndRenderLogs, updateSearchButtonState
    // BaseSampleManager에서 상속

    // ========================================
    // 엑셀 내보내기
    // ========================================

    setupExcelExport(): void {
        const exportBtn = document.getElementById('exportBtn');
        if (!exportBtn) return;

        exportBtn.addEventListener('click', () => {
            if (this.sampleLogs.length === 0) {
                showToast('내보낼 데이터가 없습니다.', 'warning');
                return;
            }

            // 선택된 항목이 있으면 해당 항목만 내보내기
            const selectedIds = Array.from(document.querySelectorAll<HTMLInputElement>('.row-checkbox:checked')).map(cb => cb.dataset.id);
            const logsToExport = selectedIds.length > 0
                ? this.sampleLogs.filter(log => selectedIds.includes(log.id))
                : this.sampleLogs;

            if (selectedIds.length > 0) {
                this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
            }

            const sortedLogs = [...logsToExport].sort((a, b) => {
                const aNum = parseInt(String(a.receptionNumber).replace(/\D/g, ''), 10) || 0;
                const bNum = parseInt(String(b.receptionNumber).replace(/\D/g, ''), 10) || 0;
                return aNum - bNum;
            });
            const sanitizeCell = (window as any).SampleUtils?.sanitizeExcelCell ?? ((v: string) => v);
            const excelData = sortedLogs.map(log => {
                let areaDisplay = '-';
                if (log.farmArea) {
                    const unit = log.farmAreaUnit === 'pyeong' ? '평' : 'm\u00B2';
                    areaDisplay = `${log.farmArea} ${unit}`;
                }

                const applicantType = log.applicantType || '개인';
                const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');
                const addressParts = parseAddressParts(log.addressRoad || log.address || '');
                const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

                return {
                    '접수번호': log.receptionNumber || '-',
                    '접수일자': log.date || '-',
                    '법인여부': applicantType,
                    '생년월일/법인번호': birthOrCorp,
                    '농장명': sanitizeCell(log.farmName || '-'),
                    '대표자': sanitizeCell(log.name || '-'),
                    '연락처': log.phoneNumber || '-',
                    '우편번호': log.addressPostcode || '-',
                    '시도': addressParts.sido || '-',
                    '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-',
                    '나머지주소': sanitizeCell((addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-'),
                    '전체주소': sanitizeCell(fullAddress),
                    '농장주소': sanitizeCell(log.farmAddress || '-'),
                    '농장면적': areaDisplay,
                    '시료종류': log.sampleType || '-',
                    '축종': log.animalType || '-',
                    '원료(부재료)': sanitizeCell(log.rawMaterials || '-'),
                    '생산일': log.productionDate || '-',
                    '시료수': log.sampleCount || '-',
                    '검사목적': log.purpose || '-',
                    '통보방법': log.receptionMethod || '-',
                    '비고': sanitizeCell(log.note || '-'),
                    '완료여부': log.isComplete ? '완료' : '미완료',
                    '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            ws['!cols'] = [
                { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 15 },
                { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 8 },
                { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 25 },
                { wch: 40 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
                { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 8 },
                { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 8 },
                { wch: 20 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, '퇴액비 접수목록');

            const fileName = `퇴액비_접수목록_${new Date().toISOString().split('T')[0]}.xlsx`;

            if (window.isElectron && this.FileAPI?.saveExcel) {
                const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                this.FileAPI.saveExcel(xlsxData, fileName).then((saved: boolean) => {
                    if (saved) {
                        this.showToast('엑셀 파일로 내보내기 완료', 'success');
                    }
                });
            } else {
                XLSX.writeFile(wb, fileName);
                this.showToast('엑셀 파일로 내보내기 완료', 'success');
            }
        });
    }

    // ========================================
    // JSON 저장/불러오기
    // ========================================

    setupJSONHandlers(): void {
        const jsonHandlerOptions = {
            getData: () => this.sampleLogs,
            setData: (data: CompostSample[]) => { this.sampleLogs = data; },
            saveData: () => this.saveLogs(),
            renderData: () => this.filterAndRenderLogs(),
            showToast: window.showToast
        };

        SampleUtils.setupJSONSaveHandler({
            buttonElement: document.getElementById('saveJsonBtn'),
            sampleType: SAMPLE_TYPE,
            getData: () => this.sampleLogs,
            FileAPI: this.FileAPI,
            filePrefix: 'compost-samples',
            showToast: window.showToast
        });

        SampleUtils.setupJSONLoadHandler({
            inputElement: document.getElementById('loadJsonInput'),
            ...jsonHandlerOptions
        });

        SampleUtils.setupElectronLoadHandler({
            buttonElement: document.getElementById('loadFileBtn'),
            FileAPI: this.FileAPI,
            ...jsonHandlerOptions
        });
    }

    // ========================================
    // 자동 저장 설정
    // ========================================

    setupAutoSaveHandlers(): void {
        const autoSaveToFile = async () => {
            return await SampleUtils.performAutoSave({
                FileAPI: this.FileAPI,
                moduleKey: 'compost',
                data: this.sampleLogs,
                webFileHandle: this.autoSaveFileHandle,
                log: (...args: unknown[]) => this.log(...args)
            });
        };

        window.triggerCompostAutoSave = autoSaveToFile;

        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'compost',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle: FileSystemFileHandle | null) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: window.showToast
        });

        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'compost',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle: FileSystemFileHandle | null) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: window.showToast,
            log: (...args: unknown[]) => this.log(...args)
        });
    }

    // ========================================
    // 전체 보기/기본 보기 토글
    // ========================================

    setupColumnToggle(): void {
        const viewToggleBtn = document.getElementById('toggleColumnsBtn');
        const logTable = document.querySelector('.data-table');

        if (viewToggleBtn && logTable) {
            viewToggleBtn.addEventListener('click', () => {
                this.isFullView = !this.isFullView;

                const toggleText = viewToggleBtn.querySelector('.toggle-text');
                const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');

                if (this.isFullView) {
                    logTable.classList.add('full-view');
                    if (toggleText) toggleText.textContent = '기본 보기';
                    if (toggleIcon) toggleIcon.textContent = '👁️‍🗨️';
                    viewToggleBtn.classList.add('active');
                } else {
                    logTable.classList.remove('full-view');
                    if (toggleText) toggleText.textContent = '전체 보기';
                    if (toggleIcon) toggleIcon.textContent = '👁️';
                    viewToggleBtn.classList.remove('active');
                }
            });
        }
    }

    // ========================================
    // 농장주소 자동완성
    // ========================================

    bindFarmAddressAutocomplete(): void {
        const farmAddressInput = document.getElementById('farmAddressFull');
        const autocompleteList = document.getElementById('farmAddressAutocomplete');

        if (!farmAddressInput || !autocompleteList) return;

        // 입력 시 자동완성 목록 표시
        (farmAddressInput as HTMLInputElement).addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const value = target.value.trim();

            // 이미 완전한 주소면 자동완성 비활성화
            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin', 'pohang_buk', 'pohang_nam'], true);

                if (suggestions.length > 0) {
                    autocompleteList.innerHTML = sanitizeHTML(suggestions.map((item: { village: string; district: string; regionKey: string; region?: string; isMountain: boolean; displayText: string }) => `
                        <li data-village="${item.village}" data-district="${item.district}" data-region-key="${item.regionKey}" data-region="${item.region || ''}" data-is-mountain="${item.isMountain}">
                            ${item.displayText}
                        </li>
                    `).join(''));
                    autocompleteList.classList.add('show');
                } else {
                    autocompleteList.classList.remove('show');
                }
            } else {
                autocompleteList.classList.remove('show');
            }
        });

        // Enter 키 입력 시 자동 변환
        (farmAddressInput as HTMLInputElement).addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const value = (farmAddressInput as HTMLInputElement).value.trim();

                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);

                    if (result) {
                        if (result.isDuplicate && result.locations) {
                            autocompleteList.innerHTML = sanitizeHTML(result.locations.map((loc) => `
                                <li data-village="${result.villageName}" data-district="${(loc as { district?: string }).district || ''}" data-region-key="${(loc as { regionKey?: string }).regionKey || ''}" data-lot="${result.lotNumber}">
                                    ${loc.fullAddress} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map((district: string) => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            const fullAddress = `${result.region} ${result.district} ${result.village}${result.lotNumber ? ' ' + result.lotNumber : ''}`;
                            (farmAddressInput as HTMLInputElement).value = fullAddress;
                            autocompleteList.classList.remove('show');
                        }
                    }
                }
            }
        });

        // 자동완성 목록 클릭 선택
        autocompleteList.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            const li = target.closest('li') as HTMLElement | null;
            if (li) {
                const village = li.dataset.village;
                const district = li.dataset.district;
                const regionKey = li.dataset.regionKey || '';
                const isMountain = li.dataset.isMountain === 'true';
                const lot = li.dataset.lot || '';

                const LOCAL_REGIONS: Record<string, string> = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                const villageWithMountain = isMountain ? `${village} 산` : village;

                const currentValue = (farmAddressInput as HTMLInputElement).value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLot = lot || (match ? match[0] : '');

                const fullAddress = `${region} ${district} ${villageWithMountain}${extractedLot ? ' ' + extractedLot : ''}`;
                (farmAddressInput as HTMLInputElement).value = fullAddress;
                autocompleteList.classList.remove('show');
            }
        });

        // 외부 클릭 시 자동완성 목록 숨기기
        document.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.lot-address-autocomplete-wrapper')) {
                autocompleteList.classList.remove('show');
            }
        });
    }

    // ========================================
    // 엑셀 가져오기 (ExcelImportManager)
    // ========================================

    setupExcelImport(): void {
        const excelImporter = new ExcelImportManager({
            appFields: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'farmName', label: '농장명' },
                { key: 'name', label: '대표자' },
                { key: 'phoneNumber', label: '전화번호' },
                { key: 'address', label: '주소' },
                { key: 'farmAddress', label: '농장주소' },
                { key: 'sampleType', label: '시료종류' },
                { key: 'animalType', label: '축종' },
                { key: 'rawMaterials', label: '원료(부재료)' },
                { key: 'productionDate', label: '생산일' },
                { key: 'purpose', label: '검사목적' },
                { key: 'receptionMethod', label: '통보방법' },
                { key: 'note', label: '비고' }
            ],
            autoMapRules: {
                '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
                '접수일자': 'date', '날짜': 'date', '일자': 'date',
                '농장명': 'farmName', '상호': 'farmName', '농장': 'farmName',
                '대표자': 'name', '성명': 'name', '이름': 'name', '의뢰인': 'name',
                '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber',
                '주소': 'address', '의뢰인주소': 'address',
                '농장주소': 'farmAddress', '농장소재지': 'farmAddress',
                '시료종류': 'sampleType', '시료': 'sampleType', '퇴비종류': 'sampleType',
                '축종': 'animalType', '가축': 'animalType',
                '원료': 'rawMaterials', '부재료': 'rawMaterials', '원료(부재료)': 'rawMaterials',
                '생산일': 'productionDate', '생산일자': 'productionDate', '채취일': 'productionDate',
                '검사목적': 'purpose', '목적': 'purpose', '용도': 'purpose',
                '통보방법': 'receptionMethod', '수령방법': 'receptionMethod',
                '비고': 'note', '메모': 'note'
            },
            templateConfig: {
                headers: ['접수번호', '농장명', '대표자', '시료종류', '축종', '원료(부재료)', '생산일', '검사목적', '비고'],
                sampleRow: ['1', '봉화농장', '홍길동', '가축분퇴비', '소', '톱밥, 왕겨', '2026-01-15', '비료공정규격', ''],
                colWidths: [
                    { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 14 },
                    { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 20 }
                ],
                sheetName: '퇴액비시료',
                fileName: '퇴액비_가져오기_서식'
            },
            previewColumns: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'farmName', label: '농장명' },
                { key: 'name', label: '대표자' },
                { key: 'sampleType', label: '시료종류' },
                { key: 'animalType', label: '축종' },
                { key: 'rawMaterials', label: '원료' },
                { key: 'note', label: '비고' }
            ],
            getCommonData: () => ({
                date: (document.getElementById('importDate') as HTMLInputElement | null)?.value || new Date().toISOString().slice(0, 10),
                name: (document.getElementById('importName') as HTMLInputElement | null)?.value.trim() || '',
                phone: (document.getElementById('importPhone') as HTMLInputElement | null)?.value.trim() || '',
                address: (document.getElementById('importAddress') as HTMLInputElement | null)?.value.trim() || '',
                method: (document.getElementById('importMethod') as HTMLSelectElement | null)?.value || '',
                purpose: (document.getElementById('importPurpose') as HTMLInputElement | null)?.value.trim() || '',
                now: new Date().toISOString()
            }),
            buildRecord: (getVal: (key: string) => string, parseExcelDate: (val: string) => string, common: { date: string; name: string; phone: string; address: string; method: string; purpose: string; now: string }, rowIdx: number) => {
                const receptionNumber = getVal('receptionNumber') || '';
                const dateVal = getVal('date');
                const date = parseExcelDate(dateVal) || common.date;
                const farmName = getVal('farmName') || '';
                const name = getVal('name') || common.name;
                const phoneNumber = getVal('phoneNumber') || common.phone;
                const address = getVal('address') || common.address;
                const farmAddress = getVal('farmAddress') || '';
                const sampleType = getVal('sampleType') || '가축분퇴비';
                const animalType = getVal('animalType') || '';
                const rawMaterials = getVal('rawMaterials') || '';
                const productionDateVal = getVal('productionDate');
                const productionDate = parseExcelDate(productionDateVal) || '';
                const purpose = getVal('purpose') || common.purpose;
                const receptionMethod = getVal('receptionMethod') || common.method;
                const note = getVal('note') || '';

                return {
                    id: SampleUtils.generateUUID() + '_' + rowIdx,
                    receptionNumber,
                    date,
                    applicantType: '개인',
                    birthDate: '',
                    corpNumber: '',
                    farmName,
                    name,
                    phoneNumber,
                    address,
                    addressPostcode: '',
                    addressRoad: address,
                    addressDetail: '',
                    farmAddress,
                    farmArea: 0,
                    farmAreaUnit: 'm2',
                    sampleType,
                    animalType,
                    productionDate,
                    sampleCount: '1',
                    rawMaterials,
                    purpose,
                    receptionMethod,
                    note,
                    isComplete: false,
                    createdAt: common.now,
                    updatedAt: common.now
                };
            },
            skipRowCheck: (record: CompostSample, rowIdx: number) => {
                if (!record.farmName && !record.name && !record.sampleType) {
                    return `행 ${rowIdx + 2}: 농장명, 대표자, 시료종류가 모두 비어 있어 건너뜁니다.`;
                }
                return null;
            },
            getExistingLogs: () => this.sampleLogs,
            onImportComplete: (records: CompostSample[]) => {
                records.forEach((logEntry: CompostSample) => this.sampleLogs.push(logEntry));
                this.sampleLogs.sort((a, b) => {
                    const numA = parseInt(a.receptionNumber) || 0;
                    const numB = parseInt(b.receptionNumber) || 0;
                    if (numA !== numB) return numA - numB;
                    return (a.receptionNumber || '').localeCompare(b.receptionNumber || '');
                });
                this.saveLogs();
                this.filterAndRenderLogs();
            }
        });
        excelImporter.init();
    }

    // ========================================
    // Electron 자동 저장 파일 로드
    // ========================================

    async loadAutoSaveOnInit(): Promise<void> {
        // 로컬 모드에서만 auto-save 로드 (Firebase 모드에서는 로드 안함)
        if (window.firebaseConfig?.isEnabled()) {
            this.log('Firebase 모드: 자동 저장 로드 비활성화됨');
            return;
        }

        // 로컬 모드: auto-save 파일에서 로드
        if (!window.isElectron || !this.FileAPI?.autoSavePath || this.sampleLogs.length > 0) {
            return;
        }

        try {
            const autoSaveData = await window.loadFromAutoSaveFile?.() as CompostSample[] | undefined;
            if (autoSaveData && autoSaveData.length > 0) {
                this.sampleLogs = autoSaveData;
                localStorage.setItem(this.getStorageKey(this.selectedYear), JSON.stringify(this.sampleLogs));
                this.filterAndRenderLogs();
                if (this.receptionNumberInput) {
                    this.receptionNumberInput.value = this.generateNextReceptionNumber();
                }
                this.log('로컬 모드: 자동 저장 파일에서 데이터 로드됨:', autoSaveData.length, '건');
            }
        } catch (error) {
            this.log('자동 저장 파일 로드 오류:', error);
        }
    }

    // ========================================
    // 유틸리티 메서드
    // ========================================

    formatNumberWithCommas(value: string | number): string {
        const num = String(value).replace(/[^\d]/g, '');
        if (!num) return '';
        return parseInt(num, 10).toLocaleString('ko-KR');
    }

    parseFormattedNumber(value: string): string {
        return value.replace(/,/g, '');
    }

    updateListViewTitle(): void {
        const listViewTitle = document.getElementById('listViewTitle');
        if (listViewTitle) {
            listViewTitle.textContent = '퇴·액비 접수 목록';
        }
    }

    // ========================================
    // 퇴·액비 분석결과 모달
    // ========================================

    getFieldsForSample(sampleType: string, animalType: string): CompostFieldDef[] {
        const isLiquid = sampleType === '가축분뇨발효액';
        const F = CompostSampleManager.COMPOST_FIELDS;

        const fields: CompostFieldDef[] = isLiquid
            ? [...F.liquid_common]
            : [...F.compost_common];

        if (isLiquid) {
            // 액비: 돼지만 구리/아연 추가
            if (animalType === '돼지') fields.push(...F.liquid_pig);
        } else {
            // 퇴비: 소→염분, 돼지→구리/아연
            if (animalType === '소') fields.push(...F.compost_cattle);
            else if (animalType === '돼지') fields.push(...F.compost_pig);
        }

        return fields;
    }

    initCompostAnalysisModal(): void {
        const modal = document.getElementById('compostAnalysisModal');
        if (!modal) return;

        const closeModal = (): void => { modal.classList.add('hidden'); this._caLogId = null; };
        document.getElementById('closeCompostAnalysisModal')?.addEventListener('click', closeModal);
        document.getElementById('cancelCompostAnalysisBtn')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); });

        document.getElementById('saveCompostAnalysisBtn')?.addEventListener('click', () => this.saveCompostAnalysis());
    }

    openCompostAnalysisModal(logId: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === String(logId));
        if (!log) return;

        const modal = document.getElementById('compostAnalysisModal');
        if (!modal) return;

        this._caLogId = logId;

        // 시료 정보
        const caReceptionNumber = document.getElementById('caReceptionNumber');
        const caDate = document.getElementById('caDate');
        const caName = document.getElementById('caName');
        const caSampleType = document.getElementById('caSampleType');
        const caPurpose = document.getElementById('caPurpose');
        if (caReceptionNumber) caReceptionNumber.textContent = log.receptionNumber || '-';
        if (caDate) caDate.textContent = log.date || '-';
        if (caName) caName.textContent = log.name || '-';
        if (caSampleType) caSampleType.textContent = log.sampleType || '-';
        if (caPurpose) caPurpose.textContent = log.purpose || '-';

        const animalEl = document.getElementById('caAnimalType');
        const animalType = log.animalType || '-';
        if (animalEl) animalEl.textContent = animalType;

        // 면적 기반 부숙도 기준 동적 설정
        const sampleType = log.sampleType || '가축분퇴비';
        const areaSqm = this.getAreaInSqm(log.farmArea, log.farmAreaUnit);
        const maturityStandard = areaSqm >= 1500 ? '부숙완료 이상' : '부숙중기 이상';

        // 시료종류+축종별 분석 항목 렌더
        const fields = this.getFieldsForSample(sampleType, animalType);
        // 부숙도 기준을 면적에 따라 동적 변경
        const adjustedFields = fields.map(f => {
            if (f.key === 'maturity') return { ...f, standard: `${maturityStandard} (${areaSqm > 0 ? areaSqm.toLocaleString() + '\u33A1' : '면적미입력'})` };
            return f;
        });
        this._caAreaSqm = areaSqm;
        this.renderCompostFields(adjustedFields);

        // 기존 결과 로드
        const existing = this.loadCompostTestResult(logId);
        if (existing) {
            const caTestDate = document.getElementById('caTestDate') as HTMLInputElement | null;
            if (caTestDate) caTestDate.value = existing.testDate || '';
            for (const field of fields) {
                const input = document.getElementById(`ca_${field.key}`) as HTMLInputElement | HTMLSelectElement | null;
                if (input) input.value = existing[field.key] || '';
            }
            const judgment = existing.judgment || '';
            if (['', 'pass', 'fail'].includes(judgment)) {
                const radio = document.querySelector(`input[name="caJudgment"][value="${judgment}"]`) as HTMLInputElement | null;
                if (radio) radio.checked = true;
            }
        } else {
            const caTestDate = document.getElementById('caTestDate') as HTMLInputElement | null;
            if (caTestDate) caTestDate.value = '';
            // 기존 인라인 함수율/부숙도 값 가져오기
            for (const field of fields) {
                const input = document.getElementById(`ca_${field.key}`) as HTMLInputElement | HTMLSelectElement | null;
                if (input) {
                    if (field.key === 'moisture') input.value = String(log.moisture || '');
                    else if (field.key === 'maturity') input.value = log.maturity || '';
                    else input.value = '';
                }
            }
            const defaultRadio = document.querySelector('input[name="caJudgment"][value=""]') as HTMLInputElement | null;
            if (defaultRadio) defaultRadio.checked = true;
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            const firstInput = modal.querySelector('.ca-result-input, .ca-result-select') as HTMLElement | null;
            if (firstInput) firstInput.focus();
        }, 100);
    }

    renderCompostFields(fields: CompostFieldDef[]): void {
        const tbody = document.getElementById('caFieldsBody') as HTMLTableSectionElement | null;
        if (!tbody) return;
        tbody.innerHTML = '';

        fields.forEach(field => {
            const tr = document.createElement('tr');

            const tdName = document.createElement('td');
            tdName.className = 'ca-col-name';
            tdName.textContent = field.label;
            tr.appendChild(tdName);

            const tdUnit = document.createElement('td');
            tdUnit.className = 'ca-col-unit';
            tdUnit.textContent = field.unit || '-';
            tr.appendChild(tdUnit);

            // 기준값
            const tdStandard = document.createElement('td');
            tdStandard.className = 'ca-col-standard';
            tdStandard.textContent = field.standard || '-';
            tr.appendChild(tdStandard);

            const tdValue = document.createElement('td');
            tdValue.className = 'ca-col-value';

            const tdStatus = document.createElement('td');
            tdStatus.className = 'ca-col-status';
            tdStatus.id = `ca_status_${field.key}`;

            if (field.type === 'select') {
                const select = document.createElement('select');
                select.className = 'ca-result-select';
                select.id = `ca_${field.key}`;
                (field.options || []).forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt || '선택';
                    select.appendChild(option);
                });
                // 부숙도 변경 시 상태 업데이트
                select.addEventListener('change', () => {
                    this.checkCompostFieldStatus(field, select.value, tdStatus);
                });
                tdValue.appendChild(select);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'ca-result-input';
                input.id = `ca_${field.key}`;
                input.placeholder = field.unit || '-';
                input.autocomplete = 'off';
                // 입력 시 기준 비교
                input.addEventListener('input', () => {
                    this.checkCompostFieldStatus(field, input.value, tdStatus);
                });
                input.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextRow = tr.nextElementSibling;
                        if (nextRow) {
                            const nextInput = nextRow.querySelector('.ca-result-input, .ca-result-select') as HTMLElement | null;
                            if (nextInput) nextInput.focus();
                        }
                    }
                });
                tdValue.appendChild(input);
            }
            tr.appendChild(tdValue);
            tr.appendChild(tdStatus);

            tbody.appendChild(tr);
        });
    }

    /**
     * 면적을 ㎡로 환산
     */
    getAreaInSqm(area: string | number | undefined, unit: string | undefined): number {
        const val = parseFloat(String(area));
        if (isNaN(val)) return 0;
        return unit === 'pyeong' ? Math.round(val * 3.3058) : val;
    }

    autoJudgeCompost(result: CompostTestResult, animalType: string, log: CompostSample): string {
        // 데이터가 없으면 판정하지 않음
        const hasData = result.moisture || result.maturity || result.salinity || result.copper || result.zinc;
        if (!hasData) return '';

        let pass = true;
        const isLiquid = log?.sampleType === '가축분뇨발효액';
        const moistureLimit = isLiquid ? 95 : 70;

        // 함수율: 퇴비 70% / 액비 95%
        if (result.moisture) {
            const m = parseFloat(result.moisture);
            if (!isNaN(m) && m > moistureLimit) pass = false;
        }

        // 부숙도: 면적 기준
        if (result.maturity) {
            const order = CompostSampleManager.MATURITY_ORDER[result.maturity];
            const areaSqm = log ? this.getAreaInSqm(log.farmArea, log.farmAreaUnit) : 0;
            const requiredLevel = areaSqm >= 1500 ? 3 : 2;
            if (order !== undefined && order < requiredLevel) pass = false;
        }

        if (isLiquid) {
            // 액비: 돼지만 구리 70 / 아연 170
            if (animalType === '돼지') {
                if (result.copper) {
                    const cu = parseFloat(result.copper);
                    if (!isNaN(cu) && cu > 70) pass = false;
                }
                if (result.zinc) {
                    const zn = parseFloat(result.zinc);
                    if (!isNaN(zn) && zn > 170) pass = false;
                }
            }
        } else {
            // 퇴비: 소→염분 2.5%, 돼지→구리 500/아연 1200
            if (animalType === '소' && result.salinity) {
                const s = parseFloat(result.salinity);
                if (!isNaN(s) && s > 2.5) pass = false;
            }
            if (animalType === '돼지') {
                if (result.copper) {
                    const cu = parseFloat(result.copper);
                    if (!isNaN(cu) && cu > 500) pass = false;
                }
                if (result.zinc) {
                    const zn = parseFloat(result.zinc);
                    if (!isNaN(zn) && zn > 1200) pass = false;
                }
            }
        }

        return pass ? 'pass' : 'fail';
    }

    checkCompostFieldStatus(field: CompostFieldDef, value: string, statusEl: HTMLElement): void {
        if (!value || !statusEl) {
            if (statusEl) statusEl.innerHTML = '';
            return;
        }

        let isOk = true;

        if (field.key === 'maturity') {
            // 면적 기준: 1500㎡ 이상 → 부숙완료(3) 이상, 미만 → 부숙중기(2) 이상
            const order = CompostSampleManager.MATURITY_ORDER[value];
            const requiredLevel = (this._caAreaSqm && this._caAreaSqm >= 1500) ? 3 : 2;
            isOk = order !== undefined && order >= requiredLevel;
        } else if (field.standard) {
            const num = parseFloat(value.replace(/,/g, ''));
            if (isNaN(num)) { statusEl.innerHTML = ''; return; }

            const cleanStd = field.standard.replace(/,/g, '');
            const maxMatch = cleanStd.match(/^([\d.]+)\s*이하$/);
            if (maxMatch) {
                isOk = num <= parseFloat(maxMatch[1]);
            }
        }

        statusEl.textContent = '';
        const span = document.createElement('span');
        span.style.color = isOk ? '#16a34a' : '#dc2626';
        span.textContent = isOk ? '\u2713' : '\u2715';
        statusEl.appendChild(span);
    }

    saveCompostAnalysis(): void {
        const logId = this._caLogId;
        if (!logId) return;

        const log = this.sampleLogs.find(l => String(l.id) === String(logId));
        if (!log) return;

        const fields = this.getFieldsForSample(log.sampleType || '가축분퇴비', log.animalType || '');
        const allResults = this.loadAllCompostTestResults();

        const result: CompostTestResult = {
            id: logId,
            testDate: (document.getElementById('caTestDate') as HTMLInputElement | null)?.value || '',
            judgment: (document.querySelector('input[name="caJudgment"]:checked') as HTMLInputElement | null)?.value || '',
            animalType: log.animalType || '',
            updatedAt: new Date().toISOString()
        };

        for (const field of fields) {
            const input = document.getElementById(`ca_${field.key}`) as HTMLInputElement | HTMLSelectElement | null;
            if (input) result[field.key] = input.value.trim();
        }

        // 자동 판정: 모든 항목이 기준 이내이면 적합, 하나라도 초과면 부적합
        const autoJudgment = this.autoJudgeCompost(result, log.animalType || '', log);
        if (!result.judgment) result.judgment = autoJudgment;

        allResults[logId] = result;
        this.saveAllCompostTestResults(allResults);

        // 접수 데이터에 함수율/부숙도 동기화
        if (result.moisture) log.moisture = result.moisture;
        if (result.maturity) log.maturity = result.maturity;
        log.testResult = (result.judgment || '') as 'pass' | 'fail' | '' | null;
        this.saveLogs();

        document.getElementById('compostAnalysisModal')?.classList.add('hidden');
        this._caLogId = null;
        this.filterAndRenderLogs();
        this.showToast('분석결과가 저장되었습니다.', 'success');
    }

    // === 분석결과 데이터 저장/로드 ===

    loadCompostTestResult(logId: string): CompostTestResult | null {
        if (!this._cachedCompostResults) {
            this._cachedCompostResults = this.loadAllCompostTestResults();
        }
        return this._cachedCompostResults[logId] || null;
    }

    loadAllCompostTestResults(): Record<string, CompostTestResult> {
        const key = `compostTestResults_${this.selectedYear}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return {};
            return JSON.parse(data) || {};
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 검사 결과 로드 실패:', e);
            return {};
        }
    }

    saveAllCompostTestResults(results: Record<string, CompostTestResult>): void {
        const key = `compostTestResults_${this.selectedYear}`;
        try {
            localStorage.setItem(key, JSON.stringify(results));
            this._cachedCompostResults = results;
            this.syncCompostTestResultsToFirestore(results);
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 검사 결과 저장 실패:', e);
        }
    }

    async syncCompostTestResultsToFirestore(results: Record<string, CompostTestResult>): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const entries = Object.entries(results);
            if (entries.length === 0) return;
            const documents = entries.map(([docKey, data]) => ({ ...data, id: docKey, _resultKey: docKey }));
            await window.firestoreDb.batchSave('compostTestResults', year, documents);
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 Firestore 동기화 실패:', e);
        }
    }

    async syncCompostTestResultsFromFirestore(): Promise<void> {
        if (!window.firestoreDb?.isEnabled()) return;
        try {
            const year = parseInt(this.selectedYear);
            const cloudData = await window.firestoreDb.getAll('compostTestResults', year);
            if (!cloudData || cloudData.length === 0) return;

            const cloudMap: Record<string, CompostTestResult> = {};
            for (const doc of cloudData) {
                const docRecord = doc as Record<string, unknown>;
                const key = (docRecord._resultKey as string) || (docRecord.id as string);
                if (key) {
                    const entry = { ...docRecord } as Record<string, unknown>;
                    delete entry._resultKey;
                    delete entry.syncedAt;
                    cloudMap[key] = entry as unknown as CompostTestResult;
                }
            }

            const localResults = this.loadAllCompostTestResults();
            const merged: Record<string, CompostTestResult> = { ...localResults };
            for (const [key, cloudVal] of Object.entries(cloudMap)) {
                const localVal = merged[key];
                if (!localVal || !localVal.updatedAt || new Date(cloudVal.updatedAt || '') >= new Date(localVal.updatedAt || '')) {
                    merged[key] = cloudVal;
                }
            }

            const lsKey = `compostTestResults_${this.selectedYear}`;
            localStorage.setItem(lsKey, JSON.stringify(merged));
            this._cachedCompostResults = merged;

            // 접수 데이터 판정/함수율/부숙도 동기화
            let syncCount = 0;
            for (const [resultId, resultData] of Object.entries(merged)) {
                const logItem = this.sampleLogs.find(l => String(l.id) === String(resultId));
                if (logItem) {
                    if (resultData.judgment) logItem.testResult = resultData.judgment as 'pass' | 'fail' | '' | null;
                    if (resultData.moisture) logItem.moisture = resultData.moisture;
                    if (resultData.maturity) logItem.maturity = resultData.maturity;
                    syncCount++;
                }
            }
            if (syncCount > 0) this.saveLogs();
            this.filterAndRenderLogs();
        } catch (e) {
            (window.logger?.error || console.error)('퇴·액비 Firestore 로드 실패:', e);
        }
    }
}


// ========================================
// 인스턴스 생성 및 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const manager = new CompostSampleManager();
    await manager.init();
    window.compostManager = manager;
});
