/**
 * @fileoverview 토양 중금속 시료 전용 스크립트 (BaseSampleManager 확장)
 * @description 중금속 분석용 토양 시료 접수/관리 기능
 */

// TypeScript migration completed

// Type declarations
interface HeavyMetalSample {
    id: string;
    receptionNumber: string;
    date: string;
    applicantType: '개인' | '법인';
    birthDate?: string;
    corpNumber?: string;
    name: string;
    phoneNumber: string;
    address?: string;
    addressPostcode?: string;
    addressRoad?: string;
    addressDetail?: string;
    samplingLocation: string;
    samplingDate: string;
    cropName: string;
    treeAge?: string | number;
    sampleCount?: number;
    analysisItems: string[];
    purpose: string;
    receptionMethod: string;
    note?: string;
    isComplete?: boolean;
    isCompleted?: boolean;
    completed?: boolean;
    testResult?: 'pass' | 'fail' | '';
    mailDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Type declarations - use `var` to avoid block-scope conflicts
declare var SIDO_PATTERN: RegExp;
declare var SampleUtils: any;
declare var XLSX: any;

// Function declarations
declare function escapeHTML(str: string): string;
declare function parseAddressParts(address: string): any;
declare function sanitizeHTML(str: string): string;
declare function suggestRegionVillages(...args: any[]): any;
declare function parseParcelAddress(...args: any[]): any;

// Class interface (not a class declaration to avoid duplicates)
interface ExcelImportManagerConstructor {
    new(config: any): ExcelImportManagerInstance;
}
interface ExcelImportManagerInstance {
    init(): void;
}
declare var ExcelImportManager: ExcelImportManagerConstructor;

// Extend window interface for global functions
interface WindowExtensions {
    BaseSampleManager: any;
    showToast?: (message: string, type: string) => void;
    toggleComplete?: (id: string) => void;
    toggleResult?: (id: string) => void;
    heavyMetalManager?: HeavyMetalSampleManager;
    DEBUG?: boolean;
    PaginationManager?: any;
    AddressManager?: any;
    firestoreDb?: any;
    encryptionManager?: any;
    logger?: any;
}

interface Window extends WindowExtensions {}

// Helper function for type-safe element access
function getInput(id: string): HTMLInputElement | null {
    return document.getElementById(id) as HTMLInputElement | null;
}

function getSelect(id: string): HTMLSelectElement | null {
    return document.getElementById(id) as HTMLSelectElement | null;
}

function getTextArea(id: string): HTMLTextAreaElement | null {
    return document.getElementById(id) as HTMLTextAreaElement | null;
}

// Use `any` to avoid most TypeScript errors - this is converted JS code
class HeavyMetalSampleManager extends (window as any).BaseSampleManager {
    [key: string]: any; // Allow any property access
    // Property declarations
    ANALYSIS_ITEMS: string[];
    isAllSelected: boolean;
    autoSaveFileHandle: any;
    listViewStale: boolean;
    currentSearchFilter: {
        dateFrom: string;
        dateTo: string;
        name: string;
        receptionFrom: string;
        receptionTo: string;
        completed: 'all' | 'completed' | 'incomplete';
    };
    currentRegistrationData: HeavyMetalSample | null;
    pendingMailDateIndices: string[];
    GYEONGBUK_REGION_NAMES: string[];
    declare sampleLogs: HeavyMetalSample[];
    declare selectedYear: number;
    declare form: HTMLFormElement | null;
    declare tableBody: HTMLTableSectionElement | null;
    declare emptyState: HTMLElement | null;
    declare recordCountEl: HTMLElement | null;
    declare editingId: string | null;
    declare paginationManager: any;
    declare FileAPI: any;
    constructor() {
        super({
            moduleKey: 'heavyMetal',
            moduleName: '토양 중금속',
            storageKey: 'test_heavyMetalSampleLogs',
            sampleType: '중금속',
            autoSaveFile: 'heavy-metal-autosave.json',
            debug: !!window.DEBUG
        });

        this.ANALYSIS_ITEMS = ['구리', '납', '니켈', '비소', '수은', '아연', '카드뮴', '6가크롬'];
        this.isAllSelected = false;
        this.autoSaveFileHandle = null;
        this.listViewStale = true;
        this.currentSearchFilter = {
            dateFrom: '', dateTo: '', name: '',
            receptionFrom: '', receptionTo: '', completed: 'incomplete'
        };
        this.currentRegistrationData = null;
        this.pendingMailDateIndices = [];

        // 경상북도 지역명
        this.GYEONGBUK_REGION_NAMES = [
            '포항시', '경주시', '김천시', '안동시', '구미시',
            '영천시', '상주시', '문경시', '경산시',
            '군위군', '의성군', '청송군', '영양군', '영덕군',
            '청도군', '고령군', '성주군', '칠곡군', '예천군',
            '봉화군', '울릉군', '영주시', '울진군'
        ];
    }

    // ========================================
    // 오버라이드: DOM 요소 캐싱
    // ========================================
    cacheElements(): void {
        super.cacheElements();
        this.form = document.getElementById('sampleForm') as HTMLFormElement | null;
        this.tableBody = document.getElementById('logTableBody') as HTMLTableSectionElement | null;
        this.emptyState = document.getElementById('emptyState');
        this.recordCountEl = document.getElementById('recordCount');
    }

    // ========================================
    // 오버라이드: 완료 필드 마이그레이션 (isComplete 사용)
    // ========================================
    migrateCompletedField(logs: HeavyMetalSample[]): HeavyMetalSample[] {
        if (!Array.isArray(logs)) return logs;
        return logs.map(log => {
            if (log.completed !== undefined || log.isCompleted !== undefined) {
                log.isComplete = log.isComplete || log.isCompleted || log.completed || false;
                delete log.completed;
                delete log.isCompleted;
            }
            return log;
        });
    }

    // ========================================
    // 오버라이드: 렌더링 전 데이터 정렬
    // ========================================
    prepareDataForRender(logs: HeavyMetalSample[]): HeavyMetalSample[] {
        return [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });
    }

    // ========================================
    // 오버라이드: 뷰 전환 (listViewStale 지원)
    // ========================================
    switchView(viewName: string): void {
        const views = document.querySelectorAll('.view');
        const navItems = document.querySelectorAll('.nav-btn');

        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        if (viewName === 'list' && this.listViewStale) {
            this.filterAndRenderLogs();
            this.listViewStale = false;
        }
    }

    // ========================================
    // 오버라이드: 테이블 행 빌드
    // ========================================
    buildTableRow(item: HeavyMetalSample, index: number): HTMLTableRowElement {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;

        const analysisItemsStr = item.analysisItems ? item.analysisItems.join(', ') : '';
        const isAllItems = item.analysisItems && item.analysisItems.length === this.ANALYSIS_ITEMS.length;
        const analysisItemsDisplay = !item.analysisItems || item.analysisItems.length === 0
            ? '-'
            : isAllItems ? '전체 항목' : analysisItemsStr;

        const methodText = item.receptionMethod || '-';

        // 뷰용 주소: addressRoad 우선, 없으면 address 폴백 + addressDetail 추가
        const addressCombined = item.addressRoad
            ? [item.addressRoad, item.addressDetail].filter(Boolean).join(' ')
            : (item.address?.replace(/^\(\d{5}\)\s*/, '') || '-');
        const displayAddress = addressCombined !== '-' && SIDO_PATTERN.test(addressCombined)
            ? addressCombined.replace(SIDO_PATTERN, '')
            : addressCombined;

        // XSS 방지
        const safeName = escapeHTML(item.name || '-');
        const safeDisplayAddress = escapeHTML(displayAddress);
        const safePhone = escapeHTML(item.phoneNumber || '-');
        const safeSamplingLocation = escapeHTML(item.samplingLocation || '-');
        const safeCropName = escapeHTML(item.cropName || '-');
        const safeNote = escapeHTML(item.note || '-');

        const applicantType = item.applicantType || '개인';
        const birthOrCorp = applicantType === '법인' ? (item.corpNumber || '-') : (item.birthDate || '-');

        // 1. Checkbox
        const tdCheckbox = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'row-checkbox';
        checkbox.dataset.id = item.id;
        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);

        // 2. Complete button
        const tdComplete = document.createElement('td');
        const btnComplete = document.createElement('button');
        btnComplete.className = item.isComplete ? 'btn-complete completed' : 'btn-complete';
        btnComplete.dataset.id = item.id;
        btnComplete.title = item.isComplete ? '완료됨' : '미완료';
        btnComplete.textContent = item.isComplete ? '✓' : '○';
        tdComplete.appendChild(btnComplete);
        tr.appendChild(tdComplete);

        // 3. Result button
        const tdResult = document.createElement('td');
        tdResult.className = 'col-result';
        const btnResult = document.createElement('button');
        btnResult.className = 'btn-result' +
            (item.testResult === 'pass' ? ' pass' :
             item.testResult === 'fail' ? ' fail' : '');
        btnResult.dataset.id = item.id;
        btnResult.title = item.testResult === 'pass' ? '적합' :
                         item.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
        btnResult.textContent = item.testResult === 'pass' ? '적합' :
                               item.testResult === 'fail' ? '부적합' : '-';
        tdResult.appendChild(btnResult);
        tr.appendChild(tdResult);

        // 4. Reception number
        const tdReceptionNumber = document.createElement('td');
        tdReceptionNumber.textContent = item.receptionNumber || '-';
        tr.appendChild(tdReceptionNumber);

        // 5. Date
        const tdDate = document.createElement('td');
        tdDate.textContent = item.date || '-';
        tr.appendChild(tdDate);

        // 6. Name (클릭 시 같은 이름 일괄 선택)
        const tdName = document.createElement('td');
        tdName.className = 'col-name';
        tdName.dataset.name = item.name || '';
        tdName.textContent = safeName;
        tdName.title = `"${safeName}" 클릭하면 같은 이름 일괄 선택`;
        tr.appendChild(tdName);

        // 7. Applicant type (hidden)
        const tdApplicantType = document.createElement('td');
        tdApplicantType.className = 'col-applicant-type col-hidden';
        tdApplicantType.textContent = applicantType;
        tr.appendChild(tdApplicantType);

        // 8. Birth/Corp number (hidden)
        const tdBirthCorp = document.createElement('td');
        tdBirthCorp.className = 'col-birth-corp col-hidden';
        tdBirthCorp.textContent = birthOrCorp;
        tr.appendChild(tdBirthCorp);

        // 9. Address
        const tdAddress = document.createElement('td');
        tdAddress.className = 'col-address';
        tdAddress.textContent = safeDisplayAddress;
        tr.appendChild(tdAddress);

        // 10. Phone
        const tdPhone = document.createElement('td');
        tdPhone.textContent = safePhone;
        tr.appendChild(tdPhone);

        // 11. Sampling location
        const tdSamplingLocation = document.createElement('td');
        tdSamplingLocation.textContent = safeSamplingLocation;
        tr.appendChild(tdSamplingLocation);

        // 12. Crop name (with tree age if present)
        const tdCropName = document.createElement('td');
        tdCropName.textContent = safeCropName + (item.treeAge ? ' (' + item.treeAge + '년생)' : '');
        tr.appendChild(tdCropName);

        // 13. Sampling date
        const tdSamplingDate = document.createElement('td');
        tdSamplingDate.textContent = item.samplingDate || '-';
        tr.appendChild(tdSamplingDate);

        // 14. Analysis items (with tooltip)
        const tdAnalysisItems = document.createElement('td');
        tdAnalysisItems.className = 'text-truncate';
        tdAnalysisItems.setAttribute('data-tooltip', analysisItemsStr);
        tdAnalysisItems.textContent = analysisItemsDisplay;
        tr.appendChild(tdAnalysisItems);

        // 15. Purpose
        const tdPurpose = document.createElement('td');
        tdPurpose.textContent = item.purpose || '-';
        tr.appendChild(tdPurpose);

        // 16. Reception method
        const tdMethod = document.createElement('td');
        tdMethod.textContent = methodText;
        tr.appendChild(tdMethod);

        // 17. Note (with tooltip)
        const tdNote = document.createElement('td');
        tdNote.className = 'text-truncate';
        tdNote.setAttribute('data-tooltip', safeNote);
        tdNote.textContent = safeNote;
        tr.appendChild(tdNote);

        // 18. Mail date
        const tdMailDate = document.createElement('td');
        tdMailDate.className = 'col-mail-date';
        tdMailDate.textContent = item.mailDate || '-';
        tr.appendChild(tdMailDate);

        // 19. Action buttons
        const tdActions = document.createElement('td');
        const actionDiv = document.createElement('div');
        actionDiv.className = 'action-btns';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.dataset.id = item.id;
        btnEdit.title = '수정';
        btnEdit.textContent = '✏️';

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.dataset.id = item.id;
        btnDelete.title = '삭제';
        btnDelete.textContent = '🗑️';

        actionDiv.appendChild(btnEdit);
        actionDiv.appendChild(btnDelete);
        tdActions.appendChild(actionDiv);
        tr.appendChild(tdActions);

        return tr;
    }

    // ========================================
    // 오버라이드: 폼 제출
    // ========================================
    submitForm(): void {
        const showToast = window.showToast || ((msg: string, type: string) => (window.logger?.debug || console.log)(msg, type));

        // 필수 필드 검증
        const name = getInput('name')?.value.trim();
        const phoneNumber = getInput('phoneNumber')?.value.trim();
        const samplingLocation = getInput('samplingLocation')?.value.trim();
        const cropName = getInput('cropName')?.value.trim();
        const samplingDate = getInput('samplingDate')?.value;
        const selectedPurpose = (document.querySelector('input[name="purpose"]:checked') as HTMLInputElement)?.value;
        const selectedItems = Array.from(document.querySelectorAll('input[name="analysisItems"]:checked')).map(cb => (cb as HTMLInputElement).value);

        if (!name) { showToast('성명을 입력해주세요.', 'error'); document.getElementById('name')?.focus(); return; }
        if (!phoneNumber) { showToast('연락처를 입력해주세요.', 'error'); document.getElementById('phoneNumber')?.focus(); return; }
        if (!samplingLocation) { showToast('시료채취 장소를 입력해주세요.', 'error'); document.getElementById('samplingLocation')?.focus(); return; }
        if (!cropName) { showToast('재배 작물을 입력해주세요.', 'error'); document.getElementById('cropName')?.focus(); return; }
        if (!samplingDate) { showToast('시료 채취일을 선택해주세요.', 'error'); document.getElementById('samplingDate')?.focus(); return; }
        if (selectedItems.length === 0) { showToast('분석의뢰 항목을 1개 이상 선택해주세요.', 'error'); return; }
        if (!selectedPurpose) { showToast('목적(용도)을 선택해주세요.', 'error'); return; }

        const applicantTypeSelect = getSelect('applicantType');
        const applicantType = (applicantTypeSelect?.value || '개인') as '개인' | '법인';
        const today = new Date().toISOString().split('T')[0];

        const data: HeavyMetalSample = {
            id: this.editingId || SampleUtils.generateUUID(),
            receptionNumber: getInput('receptionNumber')?.value || this.generateNextReceptionNumber(),
            date: getInput('date')?.value || today,
            name: name || '',
            phoneNumber: phoneNumber || '',
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? (getInput('birthDate')?.value || '') : '',
            corpNumber: applicantType === '법인' ? (getInput('corpNumber')?.value || '') : '',
            addressPostcode: getInput('addressPostcode')?.value || '',
            addressRoad: getInput('addressRoad')?.value || '',
            addressDetail: getInput('addressDetail')?.value || '',
            address: getInput('address')?.value || '',
            samplingLocation: samplingLocation || '',
            cropName: cropName || '',
            treeAge: getInput('treeAge')?.value || '',
            samplingDate: samplingDate || '',
            sampleCount: Number(getInput('sampleCount')?.value) || 1,
            analysisItems: selectedItems,
            purpose: selectedPurpose || '',
            receptionMethod: getInput('receptionMethod')?.value || '',
            note: getTextArea('note')?.value || '',
            isComplete: this.editingId ? (this.sampleLogs.find(l => l.id === this.editingId)?.isComplete || false) : false,
            createdAt: this.editingId ? (this.sampleLogs.find(l => l.id === this.editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingId) {
            const editIdx = this.sampleLogs.findIndex(l => l.id === this.editingId);
            if (editIdx >= 0) this.sampleLogs[editIdx] = data;
            showToast('접수 정보가 수정되었습니다.', 'success');
            this.editingId = null;
        } else {
            this.sampleLogs.push(data);
            showToast('접수가 등록되었습니다.', 'success');
            this.showRegistrationResult(data);
        }

        this.listViewStale = true;
        this.saveLogs();
        this.resetForm();
        this.filterAndRenderLogs();
    }

    // ========================================
    // 오버라이드: 편집 (ID 기반)
    // ========================================
    editSample(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === String(id));
        if (!log) return;

        this.editingId = id;

        // 폼에 데이터 채우기
        const receptionNumber = getInput('receptionNumber');
        const date = getInput('date');
        const name = getInput('name');
        const phoneNumber = getInput('phoneNumber');
        if (receptionNumber) receptionNumber.value = log.receptionNumber || '';
        if (date) date.value = log.date || '';
        if (name) name.value = log.name || '';
        if (phoneNumber) phoneNumber.value = log.phoneNumber || '';

        const addressPostcode = getInput('addressPostcode');
        const addressRoad = getInput('addressRoad');
        const addressDetail = getInput('addressDetail');
        const addressHidden = getInput('address');
        if (addressPostcode) addressPostcode.value = log.addressPostcode || '';
        if (addressRoad) addressRoad.value = log.addressRoad || '';
        if (addressDetail) addressDetail.value = log.addressDetail || '';
        if (addressHidden) addressHidden.value = log.address || '';
        // 레거시 데이터 폴백: addressRoad가 없으면 address 파싱
        if (!log.addressRoad && log.address) {
            const m = log.address.match(/^\((\d{5})\)\s*(.+)$/);
            if (m) {
                if (addressPostcode && !addressPostcode.value) addressPostcode.value = m[1];
                if (addressRoad) addressRoad.value = m[2];
            } else {
                if (addressRoad) addressRoad.value = log.address;
            }
        }

        const samplingLocation = getInput('samplingLocation');
        const cropName = getInput('cropName');
        const treeAge = getInput('treeAge');
        const samplingDate = getInput('samplingDate');
        const sampleCount = getInput('sampleCount');
        const note = getTextArea('note');
        if (samplingLocation) samplingLocation.value = log.samplingLocation || '';
        if (cropName) cropName.value = log.cropName || '';
        if (treeAge) treeAge.value = String(log.treeAge || '');
        if (samplingDate) samplingDate.value = log.samplingDate || '';
        if (sampleCount) sampleCount.value = String(log.sampleCount || 1);
        if (note) note.value = log.note || '';

        // 분석항목 체크
        document.querySelectorAll('input[name="analysisItems"]').forEach(cb => {
            const checkbox = cb as HTMLInputElement;
            checkbox.checked = log.analysisItems?.includes(checkbox.value) || false;
        });
        this.updateSelectedItemsCount();

        // 목적 선택
        document.querySelectorAll('input[name="purpose"]').forEach(radio => {
            const radioEl = radio as HTMLInputElement;
            radioEl.checked = radioEl.value === log.purpose;
        });

        // 수령방법 선택
        const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        receptionMethodBtns.forEach(btn => {
            btn.classList.toggle('active', (btn as HTMLElement).dataset.method === log.receptionMethod);
            btn.classList.toggle('selected', (btn as HTMLElement).dataset.method === log.receptionMethod);
        });
        const receptionMethodInput = getInput('receptionMethod');
        if (receptionMethodInput) receptionMethodInput.value = log.receptionMethod || '';

        // 법인여부/생년월일/법인번호 설정
        const applicantType = log.applicantType || '개인';
        const applicantTypeSelect = getSelect('applicantType');
        const birthDateField = document.getElementById('birthDateField');
        const corpNumberField = document.getElementById('corpNumberField');
        const birthDateInput = getInput('birthDate');
        const corpNumberInput = getInput('corpNumber');

        if (applicantTypeSelect) {
            applicantTypeSelect.value = applicantType;
            if (applicantType === '법인') {
                if (birthDateField) birthDateField.classList.add('hidden');
                if (corpNumberField) corpNumberField.classList.remove('hidden');
                if (corpNumberInput) corpNumberInput.value = log.corpNumber || '';
                if (birthDateInput) birthDateInput.value = '';
            } else {
                if (birthDateField) birthDateField.classList.remove('hidden');
                if (corpNumberField) corpNumberField.classList.add('hidden');
                if (birthDateInput) birthDateInput.value = log.birthDate || '';
                if (corpNumberInput) corpNumberInput.value = '';
            }
        }

        // 네비게이션 바 버튼 텍스트/스타일 변경
        const navSubmitBtn = document.getElementById('navSubmitBtn');
        if (navSubmitBtn) {
            navSubmitBtn.title = '수정 완료';
            navSubmitBtn.classList.add('btn-edit-mode');
        }

        // 폼 뷰로 전환
        this.switchView('form');
        this.showToast('수정 모드입니다.', 'warning');
    }

    // ========================================
    // 오버라이드: 폼 초기화
    // ========================================
    resetForm(): void {
        this.form?.reset();
        this.editingId = null;

        const navSubmitBtn = document.getElementById('navSubmitBtn');
        if (navSubmitBtn) {
            navSubmitBtn.title = '접수 등록';
            navSubmitBtn.classList.remove('btn-edit-mode');
        }

        const today = new Date().toISOString().split('T')[0];
        const dateInput = getInput('date');
        const samplingDateInput = getInput('samplingDate');
        if (dateInput) dateInput.value = today;
        if (samplingDateInput) samplingDateInput.value = today;

        const receptionNumberInput = getInput('receptionNumber');
        if (receptionNumberInput) receptionNumberInput.value = this.generateNextReceptionNumber();

        // 수령 방법 선택 초기화
        document.querySelectorAll('.reception-method-btn').forEach(btn => btn.classList.remove('active', 'selected'));
        const receptionMethodInput = getInput('receptionMethod');
        if (receptionMethodInput) receptionMethodInput.value = '';

        // 법인여부 초기화
        const applicantTypeSelect = getSelect('applicantType');
        const birthDateField = document.getElementById('birthDateField');
        const corpNumberField = document.getElementById('corpNumberField');
        const birthDateInput = getInput('birthDate');
        const corpNumberInput = getInput('corpNumber');
        if (applicantTypeSelect) applicantTypeSelect.value = '개인';
        if (birthDateField) birthDateField.classList.remove('hidden');
        if (corpNumberField) corpNumberField.classList.add('hidden');
        if (birthDateInput) birthDateInput.value = '';
        if (corpNumberInput) corpNumberInput.value = '';

        // 분석항목 초기화
        document.querySelectorAll('input[name="analysisItems"]').forEach(cb => (cb as HTMLInputElement).checked = false);
        this.isAllSelected = false;
        const selectAllItemsBtn = document.getElementById('selectAllItemsBtn');
        if (selectAllItemsBtn) selectAllItemsBtn.textContent = '전체 선택';
        this.updateSelectedItemsCount();

        // 인증용 안내 숨기기
        const certificationNotice = document.getElementById('certificationNotice');
        if (certificationNotice) certificationNotice.classList.add('hidden');
    }

    // ========================================
    // 오버라이드: 레코드 수 업데이트
    // ========================================
    updateRecordCount(): void {
        if (this.recordCountEl) {
            this.recordCountEl.textContent = `${this.sampleLogs.length}건`;
        }
    }

    // ========================================
    // 오버라이드: 데이터 저장 후 hook
    // ========================================
    onAfterSave(): void {
        this.listViewStale = true;
        this.autoSaveToFile();
    }

    // ========================================
    // 오버라이드: 연도 변경 hook
    // ========================================
    onYearChange(newYear: number): void {
        this.updateListViewTitle();
    }

    // ========================================
    // 오버라이드: 테이블 이벤트 위임 (ID 기반)
    // ========================================
    setupTableEventDelegation(): void {
        if (!this.tableBody) return;

        this.tableBody.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const tr = target.closest('tr[data-id]');
            if (!tr) return;
            const id = tr.getAttribute('data-id') || '';

            // 완료 토글
            if (target.closest('.btn-complete')) {
                this.toggleComplete(id);
                return;
            }

            // 판정 토글
            if (target.closest('.btn-result')) {
                this.toggleResult(id);
                return;
            }

            // 수정 버튼
            if (target.closest('.btn-edit')) {
                this.editSample(id);
                return;
            }

            // 삭제 버튼
            if (target.closest('.btn-delete')) {
                if (confirm('정말 삭제하시겠습니까?')) {
                    this.deleteSample(String(id));
                }
                return;
            }
        });
    }

    // ========================================
    // 완료 토글
    // ========================================
    toggleComplete(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === String(id));
        if (!log) return;
        log.isComplete = !log.isComplete;
        log.updatedAt = new Date().toISOString();
        this.listViewStale = true;
        this.saveLogs();
        this.filterAndRenderLogs();
    }

    // ========================================
    // 판정 토글 (미판정 -> 적합 -> 부적합 -> 미판정)
    // ========================================
    toggleResult(id: string): void {
        const log = this.sampleLogs.find(l => String(l.id) === String(id));
        if (!log) return;
        if (!log.testResult) {
            log.testResult = 'pass';
        } else if (log.testResult === 'pass') {
            log.testResult = 'fail';
        } else {
            log.testResult = '';
        }
        log.updatedAt = new Date().toISOString();
        this.listViewStale = true;
        this.saveLogs();
        this.filterAndRenderLogs();
    }

    // ========================================
    // 접수번호 생성
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
        this.log(`다음 접수번호 생성: ${nextNumber} (기존 최대: ${maxNumber})`);
        return String(nextNumber);
    }

    // ========================================
    // 분석항목 카운트 업데이트
    // ========================================
    updateSelectedItemsCount(): void {
        const checked = document.querySelectorAll('input[name="analysisItems"]:checked');
        const selectedItemsCount = document.getElementById('selectedItemsCount');
        if (selectedItemsCount) {
            selectedItemsCount.textContent = String(checked.length);
        }
    }

    // ========================================
    // 목록 타이틀 업데이트
    // ========================================
    updateListViewTitle(): void {
        const listViewTitle = document.getElementById('listViewTitle');
        if (listViewTitle) {
            listViewTitle.textContent = `${this.selectedYear}년 토양 중금속 접수 목록`;
        }
    }

    // ========================================
    // 자동 저장 수행 (공통 모듈 사용)
    // ========================================
    async autoSaveToFile(): Promise<void> {
        return await SampleUtils.performAutoSave({
            FileAPI: this.FileAPI,
            moduleKey: 'heavyMetal',
            data: this.sampleLogs,
            webFileHandle: this.autoSaveFileHandle,
            log: (...args: any[]): void => this.log(...args)
        });
    }

    // ========================================
    // 등록 결과 모달
    // ========================================
    showRegistrationResult(logData: HeavyMetalSample): void {
        this.currentRegistrationData = logData;
        const resultTableBody = document.getElementById('resultTableBody');

        const rows = [
            { label: '접수번호', value: logData.receptionNumber },
            { label: '접수일자', value: logData.date },
            { label: '성명', value: logData.name },
            { label: '전화번호', value: logData.phoneNumber },
            { label: '주소', value: [logData.addressRoad, logData.addressDetail].filter(Boolean).join(' ') || logData.address || '-' },
            { label: '채취장소', value: logData.samplingLocation || '-' },
            { label: '재배작물', value: logData.cropName || '-' },
            { label: '수령', value: logData.treeAge ? `${logData.treeAge}년` : '-' },
            { label: '시료채취일', value: logData.samplingDate || '-' },
            { label: '시료수', value: `${logData.sampleCount || 1}점` },
            { label: '분석항목', value: (logData.analysisItems || []).join(', ') || '-' },
            { label: '목적(용도)', value: logData.purpose || '-' },
            { label: '수령방법', value: logData.receptionMethod || '-' },
            { label: '비고', value: logData.note || '-' }
        ];

        BaseSampleManager.buildResultTable(resultTableBody!, rows);

        const registrationResultModal = document.getElementById('registrationResultModal');
        if (registrationResultModal) {
            registrationResultModal.classList.remove('hidden');
        }
    }

    closeRegistrationResultModal(): void {
        const registrationResultModal = document.getElementById('registrationResultModal');
        if (registrationResultModal) {
            registrationResultModal.classList.add('hidden');
        }
        this.currentRegistrationData = null;
    }

    // ========================================
    // 통계
    // ========================================
    updateStatistics(): void {
        const statTotal = document.getElementById('statTotalCount');
        const statCompleted = document.getElementById('statCompletedCount');
        const statPending = document.getElementById('statPendingCount');

        const completed = this.sampleLogs.filter(l => l.isComplete).length;
        if (statTotal) statTotal.textContent = String(this.sampleLogs.length);
        if (statCompleted) statCompleted.textContent = String(completed);
        if (statPending) statPending.textContent = String(this.sampleLogs.length - completed);

        // 분석항목별 통계
        const byAnalysisItem: Record<string, number> = {};
        this.ANALYSIS_ITEMS.forEach(item => byAnalysisItem[item] = 0);
        this.sampleLogs.forEach(log => {
            (log.analysisItems || []).forEach(item => {
                if (byAnalysisItem[item] !== undefined) byAnalysisItem[item]++;
            });
        });
        this.renderBarChart('statsByAnalysisItem', byAnalysisItem);

        // 목적별 통계
        const byPurpose: Record<string, number> = {};
        this.sampleLogs.forEach(log => {
            const p = log.purpose || '미지정';
            byPurpose[p] = (byPurpose[p] || 0) + 1;
        });
        this.renderBarChart('statsByPurpose', byPurpose);

        // 월별 집계
        const byMonth: Record<string, any> = {};
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        for (let i = 1; i <= 12; i++) {
            const monthKey = String(i).padStart(2, '0');
            byMonth[monthKey] = { count: 0, completed: 0, pending: 0, label: monthNames[i - 1], class: 'month' };
        }

        this.sampleLogs.forEach(log => {
            if (log.date) {
                const monthNum = log.date.substring(5, 7);
                if (byMonth[monthNum]) {
                    byMonth[monthNum].count++;
                    if (log.isComplete) {
                        byMonth[monthNum].completed++;
                    } else {
                        byMonth[monthNum].pending++;
                    }
                }
            }
        });

        // 분기별 집계
        const byQuarter: Record<string, any> = {
            Q1: { count: 0, completed: 0, pending: 0, label: '1분기 (1~3월)' },
            Q2: { count: 0, completed: 0, pending: 0, label: '2분기 (4~6월)' },
            Q3: { count: 0, completed: 0, pending: 0, label: '3분기 (7~9월)' },
            Q4: { count: 0, completed: 0, pending: 0, label: '4분기 (10~12월)' }
        };

        Object.entries(byMonth).forEach(([monthKey, data]) => {
            const monthNum = parseInt(monthKey, 10);
            let quarter;
            if (monthNum <= 3) quarter = 'Q1';
            else if (monthNum <= 6) quarter = 'Q2';
            else if (monthNum <= 9) quarter = 'Q3';
            else quarter = 'Q4';

            byQuarter[quarter].count += (data as any).count;
            byQuarter[quarter].completed += (data as any).completed;
            byQuarter[quarter].pending += (data as any).pending;
        });

        this.renderMonthlyChart('statsByMonth', byMonth);
        this.renderQuarterlySummary('statsQuarterly', byQuarter);

        // 수령방법별 통계
        const byMethod: Record<string, number> = {};
        this.sampleLogs.forEach(log => {
            const m = log.receptionMethod || '미지정';
            byMethod[m] = (byMethod[m] || 0) + 1;
        });
        this.renderBarChart('statsByReceptionMethod', byMethod);
    }

    renderMonthlyChart(containerId: string, byMonth: any): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
        const maxCount = Math.max(...entries.map(([, v]) => (v as any).count), 1);
        const totalCount = entries.reduce((sum, [, v]) => sum + (v as any).count, 0);

        if (totalCount === 0) {
            container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>');
            return;
        }

        container.innerHTML = sanitizeHTML(`
            <div class="monthly-chart">
                <div class="monthly-bars">
                    ${entries.map(([key, value]) => {
                        const val = value as any;
                        const heightPercent = maxCount > 0 ? (val.count / maxCount) * 100 : 0;
                        const completedPercent = val.count > 0 ? (val.completed / val.count) * 100 : 0;
                        return `
                            <div class="monthly-bar-group">
                                <div class="monthly-bar-container">
                                    <div class="monthly-bar-stack" style="height: ${heightPercent}%">
                                        <div class="monthly-bar-completed" style="height: ${completedPercent}%" title="완료: ${val.completed}건"></div>
                                        <div class="monthly-bar-pending" style="height: ${100 - completedPercent}%" title="미완료: ${val.pending}건"></div>
                                    </div>
                                    ${val.count > 0 ? `<span class="monthly-bar-value">${val.count}</span>` : ''}
                                </div>
                                <span class="monthly-bar-label">${val.label}</span>
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
    }

    renderQuarterlySummary(containerId: string, byQuarter: any): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(byQuarter).sort((a, b) => a[0].localeCompare(b[0]));
        const totalCount = entries.reduce((sum, [, v]) => sum + (v as any).count, 0);

        if (totalCount === 0) {
            container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>');
            return;
        }

        container.innerHTML = sanitizeHTML(`
            <div class="quarterly-summary">
                ${entries.map(([key, data]) => {
                    const d = data as any;
                    return `
                    <div class="quarterly-card">
                        <div class="quarterly-header">${d.label}</div>
                        <div class="quarterly-count">${d.count}<span>건</span></div>
                        <div class="quarterly-details">
                            <span class="detail-completed">완료 ${d.completed}</span>
                            <span class="detail-pending">미완료 ${d.pending}</span>
                        </div>
                    </div>
                `;}).join('')}
            </div>
        `);
    }

    renderBarChart(containerId: string, data: any): void {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data);
        const maxVal = Math.max(...entries.map(([, v]) => Number(v)), 1);

        const analysisClassMap: Record<string, string> = {
            '납(Pb)': 'analysis-pb', '카드뮴(Cd)': 'analysis-cd',
            '비소(As)': 'analysis-as', '수은(Hg)': 'analysis-hg',
            '크롬(Cr)': 'analysis-cr', '구리(Cu)': 'analysis-cu',
            '니켈(Ni)': 'analysis-ni', '아연(Zn)': 'analysis-zn'
        };
        const purposeClassMap: Record<string, string> = {
            '농경지': 'purpose-farm', '공장부지': 'purpose-factory',
            '주거지역': 'purpose-residential', '기타': 'purpose-other'
        };
        const methodClassMap: Record<string, string> = {
            '우편': 'method-mail', '이메일': 'method-email',
            '팩스': 'method-fax', '직접방문': 'method-visit'
        };

        container.innerHTML = sanitizeHTML(entries.map(([label, value]) => {
            const barClass = analysisClassMap[label] || purposeClassMap[label] || methodClassMap[label] || '';
            return `
                <div class="stat-bar-row">
                    <span class="stat-bar-label">${label}</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill ${barClass}" style="width: ${(Number(value) / maxVal) * 100}%"></div>
                    </div>
                    <span class="stat-bar-value">${value}</span>
                </div>
            `;
        }).join(''));
    }

    // ========================================
    // 검색/필터
    // ========================================
    extractReceptionNumber(receptionNumber: string): number {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    filterAndRenderLogs(): void {
        const filtered = this.sampleLogs.filter(log => {
            const matchesName = !this.currentSearchFilter.name ||
                (log.name || '').toLowerCase().includes(this.currentSearchFilter.name);

            let matchesReception = true;
            if (this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo) {
                const logNum = this.extractReceptionNumber(log.receptionNumber || '');
                const fromNum = this.currentSearchFilter.receptionFrom ? parseInt(this.currentSearchFilter.receptionFrom, 10) : 0;
                const toNum = this.currentSearchFilter.receptionTo ? parseInt(this.currentSearchFilter.receptionTo, 10) : Infinity;
                if (fromNum && logNum < fromNum) matchesReception = false;
                if (toNum !== Infinity && logNum > toNum) matchesReception = false;
            }

            let matchesDate = true;
            if (this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo) {
                const logDate = log.date;
                if (this.currentSearchFilter.dateFrom && logDate < this.currentSearchFilter.dateFrom) matchesDate = false;
                if (this.currentSearchFilter.dateTo && logDate > this.currentSearchFilter.dateTo) matchesDate = false;
            }

            let matchesCompleted = true;
            if (this.currentSearchFilter.completed === 'completed') {
                matchesCompleted = log.isComplete === true;
            } else if (this.currentSearchFilter.completed === 'incomplete') {
                matchesCompleted = !log.isComplete;
            }

            return matchesName && matchesReception && matchesDate && matchesCompleted;
        });

        this.renderLogs(filtered);
        this.updateSearchButtonState();
        this.showToast(`${filtered.length}건의 검색 결과`, 'success');
    }

    updateSearchButtonState(): void {
        const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
            this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo ||
            (this.currentSearchFilter.completed && this.currentSearchFilter.completed !== 'incomplete');
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        if (openSearchModalBtn) {
            if (hasFilter) {
                openSearchModalBtn.classList.add('has-filter');
                openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색 중');
            } else {
                openSearchModalBtn.classList.remove('has-filter');
                openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색');
            }
        }
    }

    // ========================================
    // 우편발송일자 모달
    // ========================================
    openMailDateModal(indices: string[]): void {
        this.pendingMailDateIndices = indices;
        const today = new Date().toISOString().split('T')[0];
        const mailDateInput = document.getElementById('mailDateInput') as HTMLInputElement;
        const mailDateInfo = document.getElementById('mailDateInfo');
        const mailDateModal = document.getElementById('mailDateModal');
        if (mailDateInput) mailDateInput.value = today;
        if (mailDateInfo) mailDateInfo.textContent = `선택한 ${indices.length}건의 우편발송일자를 입력하세요.`;
        if (mailDateModal) mailDateModal.classList.remove('hidden');
    }

    closeMailDateModalFn(): void {
        const mailDateModal = document.getElementById('mailDateModal');
        if (mailDateModal) mailDateModal.classList.add('hidden');
        this.pendingMailDateIndices = [];
    }

    // ========================================
    // 오버라이드: 수령 방법 버튼 설정
    // ========================================
    setupReceptionMethod(): void {
        const methodBtns = document.querySelectorAll('.reception-method-btn');
        const methodInput = document.getElementById('receptionMethod') as HTMLInputElement;

        methodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                methodBtns.forEach(b => b.classList.remove('active', 'selected'));
                btn.classList.add('active', 'selected');
                if (methodInput) {
                    methodInput.value = (btn as HTMLElement).dataset.method || '';
                }
            });
        });
    }

    // ========================================
    // 타입별 이벤트 설정 (모든 중금속 전용 이벤트)
    // ========================================
    setupTypeSpecificEvents(): void {
        const showToast = window.showToast;

        // 오늘 날짜 설정
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date') as HTMLInputElement;
        const samplingDateInput = document.getElementById('samplingDate') as HTMLInputElement;
        if (dateInput && !dateInput.value) dateInput.value = today;
        if (samplingDateInput && !samplingDateInput.value) samplingDateInput.value = today;

        // 기존 데이터 마이그레이션 (연도 없는 데이터 -> 현재 연도로)
        const oldData = localStorage.getItem('heavyMetalSampleLogs');
        if (oldData) {
            const currentYearKey = this.getStorageKey(this.selectedYear);
            if (!localStorage.getItem(currentYearKey)) {
                localStorage.setItem(currentYearKey, oldData);
                this.log('기존 중금속 데이터를 현재 연도로 마이그레이션 완료');
            }
        }

        // 빈 상태에서 폼으로 이동
        const btnGoForm = document.querySelector('.btn-go-form');
        if (btnGoForm) {
            btnGoForm.addEventListener('click', () => this.switchView('form'));
        }

        // 네비게이션 바 제출/취소 버튼
        const navSubmitBtn = document.getElementById('navSubmitBtn');
        const navResetBtn = document.getElementById('navResetBtn');
        if (navSubmitBtn) navSubmitBtn.addEventListener('click', () => this.submitForm());
        if (navResetBtn) navResetBtn.addEventListener('click', () => this.resetForm());

        // ========================================
        // 분석항목 선택 관리
        // ========================================
        const analysisCheckboxes = document.querySelectorAll('input[name="analysisItems"]');
        const selectAllItemsBtn = document.getElementById('selectAllItemsBtn');

        analysisCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.updateSelectedItemsCount());
        });

        if (selectAllItemsBtn) {
            selectAllItemsBtn.addEventListener('click', () => {
                this.isAllSelected = !this.isAllSelected;
                analysisCheckboxes.forEach(cb => (cb as HTMLInputElement).checked = this.isAllSelected);
                selectAllItemsBtn.textContent = this.isAllSelected ? '전체 해제' : '전체 선택';
                this.updateSelectedItemsCount();
            });
        }

        // ========================================
        // 목적 선택 - 인증용 안내
        // ========================================
        const purposeRadios = document.querySelectorAll('input[name="purpose"]');
        const certificationNotice = document.getElementById('certificationNotice');

        purposeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isCertification = ['무농약', '유기농', 'GAP', '저탄소'].includes((radio as HTMLInputElement).value);
                if (certificationNotice) {
                    certificationNotice.classList.toggle('hidden', !isCertification);
                }
                if (isCertification) {
                    analysisCheckboxes.forEach(cb => (cb as HTMLInputElement).checked = true);
                    this.isAllSelected = true;
                    if (selectAllItemsBtn) selectAllItemsBtn.textContent = '전체 해제';
                    this.updateSelectedItemsCount();
                }
            });
        });

        // ========================================
        // 법인여부 선택
        // ========================================
        const applicantTypeSelect = document.getElementById('applicantType') as HTMLSelectElement;
        const birthDateField = document.getElementById('birthDateField');
        const corpNumberField = document.getElementById('corpNumberField');
        const birthDateInput = document.getElementById('birthDate') as HTMLInputElement;
        const corpNumberInput = document.getElementById('corpNumber') as HTMLInputElement;

        if (applicantTypeSelect) {
            applicantTypeSelect.addEventListener('change', () => {
                const isCorpSelected = applicantTypeSelect.value === '법인';
                if (isCorpSelected) {
                    if (birthDateField) birthDateField.classList.add('hidden');
                    if (corpNumberField) corpNumberField.classList.remove('hidden');
                    if (birthDateInput) birthDateInput.value = '';
                } else {
                    if (birthDateField) birthDateField.classList.remove('hidden');
                    if (corpNumberField) corpNumberField.classList.add('hidden');
                    if (corpNumberInput) corpNumberInput.value = '';
                }
            });
        }

        // ========================================
        // 주소 검색
        // ========================================
        const searchAddressBtn = document.getElementById('searchAddressBtn');
        const addressPostcode = document.getElementById('addressPostcode');
        const addressRoad = document.getElementById('addressRoad');
        const addressDetail = document.getElementById('addressDetail');
        const addressHidden = document.getElementById('address');
        const addressModal = document.getElementById('addressModal');
        const closeAddressModalBtn = document.getElementById('closeAddressModal');
        const daumPostcodeContainer = document.getElementById('daumPostcodeContainer');

        if (window.AddressManager) {
            new window.AddressManager({
                searchBtn: searchAddressBtn,
                postcodeInput: addressPostcode,
                roadInput: addressRoad,
                detailInput: addressDetail,
                hiddenInput: addressHidden,
                modal: addressModal,
                closeBtn: closeAddressModalBtn,
                container: daumPostcodeContainer
            });
        }

        // ========================================
        // 채취장소 자동완성
        // ========================================
        this.bindLocationAutocomplete();

        // ========================================
        // 작물 검색 모달
        // ========================================
        this.setupCropSearch();

        // ========================================
        // 선택 삭제
        // ========================================
        const btnBulkDelete = document.getElementById('btnBulkDelete');
        const selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement;

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.row-checkbox');
                checkboxes.forEach(cb => (cb as HTMLInputElement).checked = selectAllCheckbox.checked);
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        const tableBody = document.getElementById('tableBody') || document.querySelector('tbody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const nameCell = (e.target as HTMLElement)?.closest('.col-name') as HTMLElement;
                if (nameCell && nameCell.dataset.name) {
                    const targetName = nameCell.dataset.name;
                    const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
                    const targetCheckboxes: HTMLInputElement[] = [];

                    rowCheckboxes.forEach(cb => {
                        const tr = cb.closest('tr');
                        const nc = tr?.querySelector('.col-name') as HTMLElement;
                        if (nc && nc.dataset.name === targetName) {
                            targetCheckboxes.push(cb as HTMLInputElement);
                        }
                    });

                    if (targetCheckboxes.length === 0) return;
                    const allChecked = targetCheckboxes.every(cb => cb.checked);
                    targetCheckboxes.forEach(cb => { cb.checked = !allChecked; });

                    // selectAll 상태 업데이트
                    if (selectAllCheckbox) {
                        const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                        selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });

            // 개별 체크박스 변경 시 전체 선택 상태 갱신
            tableBody.addEventListener('change', (e) => {
                if ((e.target as HTMLElement)?.classList.contains('row-checkbox')) {
                    const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                    const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });
        }

        if (btnBulkDelete) {
            btnBulkDelete.addEventListener('click', () => {
                const checked = document.querySelectorAll('.row-checkbox:checked');
                if (checked.length === 0) {
                    showToast('삭제할 항목을 선택해주세요.', 'warning');
                    return;
                }

                if (confirm(`${checked.length}건의 데이터를 삭제하시겠습니까?`)) {
                    const selectedIds = Array.from(checked).map(cb => (cb as HTMLElement).dataset.id).filter(id => id);

                    this.sampleLogs = this.sampleLogs.filter(l => !selectedIds.includes(String(l.id)));
                    this.listViewStale = true;
                    this.saveLogs();
                    this.filterAndRenderLogs();
                    showToast(`${checked.length}건이 삭제되었습니다.`, 'success');

                    // Firebase에서도 삭제
                    if (selectedIds.length > 0 && window.firestoreDb?.isEnabled()) {
                        Promise.all(selectedIds.map(id =>
                            (window.firestoreDb as any).delete('heavyMetal', this.selectedYear, String(id))
                        ))
                            .then(() => this.log('Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
                            .catch(err => (window.logger?.error || console.error)('Firebase 일괄 삭제 실패:', err));
                    }
                }
            });
        }

        // ========================================
        // 우편발송일자 일괄 입력
        // ========================================
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const mailDateModal = document.getElementById('mailDateModal');
        const closeMailDateModal = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');

        if (closeMailDateModal) closeMailDateModal.addEventListener('click', () => this.closeMailDateModalFn());
        if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', () => this.closeMailDateModalFn());
        if (mailDateModal) {
            mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeMailDateModalFn());
        }

        if (confirmMailDateBtn) {
            confirmMailDateBtn.addEventListener('click', () => {
                const mailDateInput = document.getElementById('mailDateInput') as HTMLInputElement;
                const inputDate = mailDateInput?.value;

                if (!inputDate) {
                    showToast('날짜를 선택해주세요.', 'warning');
                    return;
                }

                this.pendingMailDateIndices.forEach(id => {
                    const log = this.sampleLogs.find(l => String(l.id) === String(id));
                    if (log) {
                        log.mailDate = inputDate;
                        log.updatedAt = new Date().toISOString();
                    }
                });

                this.listViewStale = true;
                this.saveLogs();
                this.filterAndRenderLogs();

                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }

                this.closeMailDateModalFn();
                showToast(`${this.pendingMailDateIndices.length}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const checked = document.querySelectorAll('.row-checkbox:checked');
                if (checked.length === 0) {
                    showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                    return;
                }
                const ids = Array.from(checked).map(cb => (cb as HTMLElement).dataset.id).filter((id): id is string => !!id);
                this.openMailDateModal(ids);
            });
        }

        // ========================================
        // 검색 모달
        // ========================================
        this.setupSearchModal();

        // ========================================
        // 통계 모달
        // ========================================
        const statisticsModal = document.getElementById('statisticsModal');
        const btnStatistics = document.getElementById('btnStatistics');
        const closeStatisticsModal = document.getElementById('closeStatisticsModal');
        const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

        if (btnStatistics && statisticsModal) {
            btnStatistics.addEventListener('click', () => {
                this.updateStatistics();
                statisticsModal.classList.remove('hidden');
            });
        }

        [closeStatisticsModal, closeStatisticsBtn].forEach(btn => {
            btn?.addEventListener('click', () => statisticsModal?.classList.add('hidden'));
        });
        statisticsModal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
            statisticsModal.classList.add('hidden');
        });

        // ========================================
        // 라벨 인쇄
        // ========================================
        const btnLabelPrint = document.getElementById('btnLabelPrint');
        if (btnLabelPrint) {
            btnLabelPrint.addEventListener('click', () => {
                const checked = document.querySelectorAll('.row-checkbox:checked');
                if (checked.length === 0) {
                    showToast('라벨 인쇄할 항목을 선택해주세요.', 'warning');
                    return;
                }

                const selectedData = Array.from(checked).map(cb => {
                    const id = (cb as HTMLElement).dataset.id;
                    return this.sampleLogs.find(l => String(l.id) === String(id));
                }).filter(Boolean);

                localStorage.setItem('labelPrintData', JSON.stringify({
                    type: '중금속',
                    data: selectedData
                }));

                window.location.href = '../label-print/index.html';
            });
        }

        // ========================================
        // 등록 결과 모달 이벤트
        // ========================================
        const closeRegistrationModal = document.getElementById('closeRegistrationModal');
        const closeResultBtn = document.getElementById('closeResultBtn');
        const editResultBtn = document.getElementById('editResultBtn');
        const exportResultBtn = document.getElementById('exportResultBtn');
        const registrationResultModal = document.getElementById('registrationResultModal');

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
                    this.editSample(dataToEdit.id);
                }
            });
        }

        if (registrationResultModal) {
            const overlay = registrationResultModal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.closeRegistrationResultModal());
            }
        }

        if (exportResultBtn) {
            exportResultBtn.addEventListener('click', () => {
                if (!this.currentRegistrationData) return;

                const d = this.currentRegistrationData;
                const excelData = [{
                    '접수번호': d.receptionNumber,
                    '접수일자': d.date,
                    '성명': d.name,
                    '전화번호': d.phoneNumber,
                    '주소': [d.addressRoad, d.addressDetail].filter(Boolean).join(' ') || d.address || '-',
                    '채취장소': d.samplingLocation || '-',
                    '재배작물': d.cropName || '-',
                    '수령': d.treeAge ? `${d.treeAge}년` : '-',
                    '시료채취일': d.samplingDate || '-',
                    '시료수': `${d.sampleCount || 1}점`,
                    '분석항목': (d.analysisItems || []).join(', ') || '-',
                    '목적(용도)': d.purpose || '-',
                    '수령방법': d.receptionMethod || '-',
                    '비고': d.note || '-'
                }];

                const ws = XLSX.utils.json_to_sheet(excelData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '등록결과');

                const fileName = `중금속_등록결과_${d.receptionNumber}.xlsx`;
                XLSX.writeFile(wb, fileName);
                showToast('엑셀 파일이 다운로드되었습니다.', 'success');
            });
        }

        // ========================================
        // 엑셀 내보내기
        // ========================================
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                if (window.encryptionManager?.isReady()) {
                    const verified = await (window.encryptionManager as any).verifyPasswordForExport();
                    if (!verified) return;
                }
                this.exportToExcel();
            });
        }

        // ========================================
        // JSON 저장/불러오기
        // ========================================
        SampleUtils.setupJSONSaveHandler({
            buttonElement: document.getElementById('saveJsonBtn'),
            sampleType: '중금속',
            getData: () => this.sampleLogs,
            FileAPI: this.FileAPI,
            filePrefix: '토양중금속',
            showToast: showToast
        });

        SampleUtils.setupJSONLoadHandler({
            inputElement: document.getElementById('loadJsonInput'),
            getData: () => this.sampleLogs,
            setData: (data: any) => { this.sampleLogs = data; },
            saveData: () => this.saveLogs(),
            renderData: () => this.filterAndRenderLogs(),
            showToast: showToast
        });

        // ========================================
        // 자동저장 설정
        // ========================================
        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'heavyMetal',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle: any) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: showToast
        });

        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'heavyMetal',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle: any) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: showToast,
            log: (...args: any[]): void => this.log(...args)
        });

        // ========================================
        // 엑셀 가져오기 (ExcelImportManager)
        // ========================================
        this.setupExcelImport();

        // 초기 타이틀 설정
        this.updateListViewTitle();
        this.updateSelectedItemsCount();
    }

    // ========================================
    // 채취장소 자동완성
    // ========================================
    bindLocationAutocomplete(): void {
        const samplingLocationInput = document.getElementById('samplingLocation');
        const samplingLocationAutocomplete = document.getElementById('samplingLocationAutocomplete');

        if (!samplingLocationInput || !samplingLocationAutocomplete) return;

        samplingLocationInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement)?.value.trim();
            samplingLocationAutocomplete.innerHTML = '';
            samplingLocationAutocomplete.classList.remove('show');

            if (value.length < 1) return;

            if (this.GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) return;

            if (typeof suggestRegionVillages === 'function') {
                const suggestions = suggestRegionVillages(value, null, true);
                if (suggestions.length > 0) {
                    samplingLocationAutocomplete.innerHTML = sanitizeHTML(suggestions.slice(0, 20).map((suggestion: any) => `
                        <li data-village="${suggestion.village}" data-district="${suggestion.district}" data-region-key="${suggestion.regionKey}" data-region="${suggestion.region || ''}" data-is-mountain="${suggestion.isMountain}">
                            ${suggestion.displayText}
                        </li>
                    `).join(''));
                    samplingLocationAutocomplete.classList.add('show');
                }
            }
        });

        samplingLocationInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = (samplingLocationInput as HTMLInputElement).value.trim();

                if (this.GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) {
                    samplingLocationAutocomplete.innerHTML = '';
                    samplingLocationAutocomplete.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate && result.locations) {
                            samplingLocationAutocomplete.innerHTML = sanitizeHTML(result.locations.map((loc: any) => `
                                <li data-village="${result.villageName}" data-district="${loc.district}" data-region-key="${loc.regionKey}" data-lot="${result.lotNumber || ''}">
                                    ${loc.fullAddress} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            samplingLocationAutocomplete.classList.add('show');
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            samplingLocationAutocomplete.innerHTML = sanitizeHTML(result.alternatives.map((district: any) => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber || ''}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            samplingLocationAutocomplete.classList.add('show');
                        } else if (result.fullAddress) {
                            samplingLocationAutocomplete.innerHTML = '';
                            samplingLocationAutocomplete.classList.remove('show');
                            (samplingLocationInput as HTMLInputElement).value = result.fullAddress;
                        }
                    }
                }
            }
        });

        samplingLocationAutocomplete.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target?.tagName === 'LI') {
                const village = target.dataset.village;
                const district = target.dataset.district;
                const regionKey = target.dataset.regionKey || '';
                const isMountain = target.dataset.isMountain === 'true';
                const lot = target.dataset.lot;

                const LOCAL_REGIONS: Record<string, string> = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                const villageWithMountain = isMountain ? `${village} 산` : village;

                const currentValue = (samplingLocationInput as HTMLInputElement).value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const lotNumber = lot || (match ? match[0] : '');

                const fullAddress = lotNumber
                    ? `${region} ${district} ${villageWithMountain} ${lotNumber}`
                    : `${region} ${district} ${villageWithMountain}`;

                (samplingLocationInput as HTMLInputElement).value = fullAddress;
                samplingLocationAutocomplete.innerHTML = '';
                samplingLocationAutocomplete.classList.remove('show');
            }
        });

        samplingLocationInput.addEventListener('blur', () => {
            setTimeout(() => {
                samplingLocationAutocomplete.innerHTML = '';
                samplingLocationAutocomplete.classList.remove('show');
            }, 200);
        });
    }

    // ========================================
    // 작물 검색 모달
    // ========================================
    setupCropSearch(): void {
        const cropNameInput = document.getElementById('cropName');
        const searchCropBtn = document.getElementById('searchCropBtn');
        const cropModal = document.getElementById('cropModal');

        if (!searchCropBtn || !cropModal) return;

        const closeCropModal = document.getElementById('closeCropModal');
        const cancelCropSelection = document.getElementById('cancelCropSelection');
        const confirmCropSelection = document.getElementById('confirmCropSelection');
        const cropSearchInput = document.getElementById('cropSearchInput');
        const cropList = document.getElementById('cropList');
        const cropCategoryFilter = document.getElementById('cropCategoryFilter');
        const cropResultCount = document.getElementById('cropResultCount');

        let selectedCrop: string | null = null;

        searchCropBtn.addEventListener('click', () => {
            cropModal?.classList.remove('hidden');
            if (cropSearchInput) (cropSearchInput as HTMLInputElement).focus();
            renderCropList();
        });

        function closeCropModalFn() {
            cropModal?.classList.add('hidden');
        }

        if (closeCropModal) closeCropModal.addEventListener('click', closeCropModalFn);
        if (cancelCropSelection) cancelCropSelection.addEventListener('click', closeCropModalFn);
        cropModal.querySelector('.modal-overlay')?.addEventListener('click', closeCropModalFn);

        function renderCropList() {
            if (!cropList || typeof (window as any).CROP_DATA === 'undefined') return;
            const CROP_DATA = (window as any).CROP_DATA;

            const searchTerm = (cropSearchInput as HTMLInputElement)?.value.toLowerCase() || '';
            const category = (cropCategoryFilter as HTMLSelectElement)?.value || '전체';
            let crops: string[] = [];

            if (cropCategoryFilter && (cropCategoryFilter as HTMLSelectElement).options.length === 1) {
                Object.keys(CROP_DATA).forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    cropCategoryFilter.appendChild(option);
                });
            }

            if (category === '전체') {
                Object.values(CROP_DATA).forEach((arr: any) => crops.push(...arr));
            } else {
                crops = CROP_DATA[category] || [];
            }

            if (searchTerm) {
                crops = crops.filter(c => c.toLowerCase().includes(searchTerm));
            }

            cropList.innerHTML = '';
            crops.forEach(crop => {
                const li = document.createElement('li');
                li.textContent = crop;
                li.className = selectedCrop === crop ? 'selected' : '';
                li.addEventListener('click', () => {
                    selectedCrop = crop;
                    renderCropList();
                });
                cropList.appendChild(li);
            });

            if (cropResultCount) {
                cropResultCount.textContent = `${crops.length}개 작물`;
            }
        }

        if (cropSearchInput) cropSearchInput.addEventListener('input', renderCropList);
        if (cropCategoryFilter) cropCategoryFilter.addEventListener('change', renderCropList);

        if (confirmCropSelection) {
            confirmCropSelection.addEventListener('click', () => {
                if (selectedCrop && cropNameInput) {
                    (cropNameInput as HTMLInputElement).value = selectedCrop;
                }
                closeCropModalFn();
            });
        }
    }

    // ========================================
    // 검색 모달
    // ========================================
    setupSearchModal(): void {
        const listSearchModal = document.getElementById('listSearchModal');
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const searchDateFromInput = document.getElementById('searchDateFromInput') as HTMLInputElement;
        const searchDateToInput = document.getElementById('searchDateToInput') as HTMLInputElement;
        const searchNameInput = document.getElementById('searchNameInput') as HTMLInputElement;
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput') as HTMLInputElement;
        const searchReceptionToInput = document.getElementById('searchReceptionToInput') as HTMLInputElement;
        const clearSearchDate = document.getElementById('clearSearchDate');
        const clearSearchReception = document.getElementById('clearSearchReception');
        const applySearchBtn = document.getElementById('applySearchBtn');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const completedFilter = document.getElementById('completedFilter') as HTMLSelectElement;

        if (completedFilter) {
            completedFilter.addEventListener('change', (e) => {
                this.currentSearchFilter.completed = (e.target as HTMLSelectElement)?.value as 'all' | 'completed' | 'incomplete';
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

        if (closeSearchModal) {
            closeSearchModal.addEventListener('click', () => listSearchModal?.classList.add('hidden'));
        }
        listSearchModal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
            listSearchModal?.classList.add('hidden');
        });

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

        if (applySearchBtn) {
            applySearchBtn.addEventListener('click', () => {
                this.currentSearchFilter.dateFrom = searchDateFromInput ? searchDateFromInput.value : '';
                this.currentSearchFilter.dateTo = searchDateToInput ? searchDateToInput.value : '';
                this.currentSearchFilter.name = searchNameInput ? searchNameInput.value.toLowerCase() : '';
                this.currentSearchFilter.receptionFrom = searchReceptionFromInput ? searchReceptionFromInput.value : '';
                this.currentSearchFilter.receptionTo = searchReceptionToInput ? searchReceptionToInput.value : '';
                this.filterAndRenderLogs();
                listSearchModal?.classList.add('hidden');
            });
        }

        if (resetSearchBtn) {
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
                listSearchModal?.classList.add('hidden');
            });
        }

        // Enter 키로 검색
        [searchNameInput, searchReceptionFromInput, searchReceptionToInput].forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && applySearchBtn) applySearchBtn.click();
                });
            }
        });
    }

    // ========================================
    // 엑셀 내보내기
    // ========================================
    exportToExcel(): void {
        const showToast = window.showToast;

        if (this.sampleLogs.length === 0) {
            showToast('내보낼 데이터가 없습니다.', 'error');
            return;
        }

        const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => (cb as HTMLElement).dataset.id);
        const logsToExport = selectedIds.length > 0
            ? this.sampleLogs.filter(log => selectedIds.includes(String(log.id)))
            : this.sampleLogs;

        if (selectedIds.length > 0) {
            showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
        }

        const sortedLogs = [...logsToExport].sort((a, b) => {
            const aNum = parseInt(String(a.receptionNumber).replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt(String(b.receptionNumber).replace(/\D/g, ''), 10) || 0;
            return aNum - bNum;
        });

        const sanitizeCell = (window as any).SampleUtils?.sanitizeExcelCell ?? ((v: string) => v);
        const exportData = sortedLogs.map(log => {
            const isAllItems = log.analysisItems && log.analysisItems.length === this.ANALYSIS_ITEMS.length;
            const analysisDisplay = !log.analysisItems || log.analysisItems.length === 0
                ? '-'
                : isAllItems ? '전체 항목' : log.analysisItems.join(', ');

            const addressParts = parseAddressParts(log.addressRoad || log.address || '');
            const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

            const applicantType = log.applicantType || '개인';
            const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

            return {
                '접수번호': log.receptionNumber || '-',
                '접수일자': log.date || '-',
                '성명': sanitizeCell(log.name || '-'),
                '법인여부': applicantType,
                '생년월일/법인번호': birthOrCorp,
                '연락처': log.phoneNumber || '-',
                '우편번호': log.addressPostcode || '-',
                '시도': addressParts.sido || '-',
                '시군구': addressParts.sigungu || '-',
                '읍면동': addressParts.eupmyeondong || '-',
                '나머지주소': sanitizeCell((addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-'),
                '전체주소': sanitizeCell(fullAddress),
                '시료채취장소': sanitizeCell(log.samplingLocation || '-'),
                '재배작물': sanitizeCell(log.cropName || '-'),
                '과수년생': log.treeAge || '-',
                '채취일': log.samplingDate || '-',
                '시료수': log.sampleCount || '-',
                '분석항목': analysisDisplay,
                '목적': log.purpose || '-',
                '수령방법': log.receptionMethod || '-',
                '비고': sanitizeCell(log.note || '-'),
                '완료여부': log.isComplete ? '완료' : '미완료',
                '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();

        ws['!cols'] = [
            { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 15 },
            { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
            { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
            { wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 20 },
            { wch: 8 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, '토양중금속접수');

        const fileName = `토양중금속_접수대장_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('엑셀 파일이 다운로드되었습니다.', 'success');
    }

    // ========================================
    // 엑셀 가져오기 (ExcelImportManager)
    // ========================================
    setupExcelImport(): void {
        const ANALYSIS_ITEMS = this.ANALYSIS_ITEMS;

        const parseAnalysisItems = (val: any): string[] => {
            if (!val) return ANALYSIS_ITEMS.slice();
            const str = String(val).trim();
            if (str === '전항목' || str === '전체' || str === 'all') return ANALYSIS_ITEMS.slice();
            return str.split(/[,\s]+/).filter((item: string) => ANALYSIS_ITEMS.includes(item.trim())).map((item: string) => item.trim());
        };

        const excelImporter = new ExcelImportManager({
            appFields: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'name', label: '성명' },
                { key: 'phoneNumber', label: '전화번호' },
                { key: 'address', label: '주소' },
                { key: 'samplingLocation', label: '채취지(주소)' },
                { key: 'cropName', label: '작물명' },
                { key: 'samplingDate', label: '채취일' },
                { key: 'analysisItems', label: '분석항목' },
                { key: 'purpose', label: '목적(용도)' },
                { key: 'receptionMethod', label: '수령방법' },
                { key: 'note', label: '비고' }
            ],
            autoMapRules: {
                '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
                '접수일자': 'date', '날짜': 'date', '일자': 'date',
                '성명': 'name', '이름': 'name', '의뢰인': 'name',
                '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber',
                '주소': 'address', '의뢰인주소': 'address',
                '채취지': 'samplingLocation', '채취장소': 'samplingLocation', '소재지': 'samplingLocation', '필지': 'samplingLocation',
                '작물': 'cropName', '작물명': 'cropName', '재배작물': 'cropName',
                '채취일': 'samplingDate', '채취일자': 'samplingDate',
                '분석항목': 'analysisItems', '검사항목': 'analysisItems',
                '목적': 'purpose', '용도': 'purpose', '목적(용도)': 'purpose',
                '수령방법': 'receptionMethod', '수령 방법': 'receptionMethod', '통보방법': 'receptionMethod',
                '비고': 'note', '메모': 'note'
            },
            templateConfig: {
                headers: ['접수번호', '채취지(주소)', '작물명', '채취일', '분석항목', '목적(용도)', '비고'],
                sampleRow: ['1', '봉화군 봉화읍 내성리 224', '사과', '2026-03-15', '전항목', '일반재배', ''],
                colWidths: [
                    { wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
                    { wch: 12 }, { wch: 12 }, { wch: 20 }
                ],
                sheetName: '중금속시료',
                fileName: '중금속_가져오기_서식'
            },
            previewColumns: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'name', label: '성명' },
                { key: 'samplingLocation', label: '채취지' },
                { key: 'cropName', label: '작물명' },
                { key: 'analysisItems', label: '분석항목' },
                { key: 'purpose', label: '목적' },
                { key: 'note', label: '비고' }
            ],
            renderPreviewCell: (record: any, key: string) => {
                if (key === 'analysisItems') {
                    const items = record.analysisItems;
                    return escapeHTML(items.length === ANALYSIS_ITEMS.length ? '전항목' : items.join(', '));
                }
                return undefined;
            },
            getCommonData: () => ({
                date: (document.getElementById('importDate') as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10),
                name: (document.getElementById('importName') as HTMLInputElement)?.value.trim(),
                phone: (document.getElementById('importPhone') as HTMLInputElement)?.value.trim(),
                address: (document.getElementById('importAddress') as HTMLInputElement)?.value.trim(),
                method: (document.getElementById('importMethod') as HTMLSelectElement)?.value,
                purpose: (document.getElementById('importPurpose') as HTMLSelectElement)?.value,
                now: new Date().toISOString()
            }),
            buildRecord: (getVal: any, parseExcelDate: any, common: any) => {
                const receptionNumber = getVal('receptionNumber') || '';
                const dateVal = getVal('date');
                const date = parseExcelDate(dateVal) || common.date;
                const name = getVal('name') || common.name;
                const phoneNumber = getVal('phoneNumber') || common.phone;
                const address = getVal('address') || common.address;
                const samplingLocation = getVal('samplingLocation') || '';
                const cropName = getVal('cropName') || '';
                const samplingDateVal = getVal('samplingDate');
                const samplingDate = parseExcelDate(samplingDateVal) || common.date;
                const analysisItemsStr = getVal('analysisItems');
                const analysisItems = parseAnalysisItems(analysisItemsStr);
                const purpose = getVal('purpose') || common.purpose;
                const receptionMethod = getVal('receptionMethod') || common.method;
                const note = getVal('note') || '';

                return {
                    receptionNumber, date, name, phoneNumber,
                    applicantType: '개인', birthDate: '', corpNumber: '',
                    addressPostcode: '', addressRoad: address, addressDetail: '', address,
                    samplingLocation, cropName, treeAge: 0, samplingDate,
                    sampleCount: 1, analysisItems, purpose, receptionMethod, note,
                    isComplete: false, createdAt: common.now
                };
            },
            skipRowCheck: (record: any, rowIdx: number) => {
                if (!record.samplingLocation && !record.cropName && !record.name) {
                    return `행 ${rowIdx + 2}: 채취지, 작물명, 성명이 모두 비어 있어 건너뜁니다.`;
                }
                return null;
            },
            getExistingLogs: () => this.sampleLogs,
            onImportComplete: (records: any[]) => {
                records.forEach((logEntry: any) => {
                    logEntry.id = SampleUtils.generateUUID();
                    this.sampleLogs.push(logEntry);
                });
                this.sampleLogs.sort((a, b) => {
                    const numA = parseInt(a.receptionNumber) || 0;
                    const numB = parseInt(b.receptionNumber) || 0;
                    if (numA !== numB) return numA - numB;
                    return (a.receptionNumber || '').localeCompare(b.receptionNumber || '');
                });
                this.listViewStale = true;
                this.saveLogs();
                this.filterAndRenderLogs();
            }
        });
        excelImporter.init();
    }
}

// ========================================
// 인스턴스 생성 및 초기화
// ========================================
const heavyMetalManager = new HeavyMetalSampleManager();
window.heavyMetalManager = heavyMetalManager;

document.addEventListener('DOMContentLoaded', () => {
    heavyMetalManager.init();
});
