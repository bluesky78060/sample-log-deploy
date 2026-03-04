/**
 * @fileoverview 퇴·액비 부숙도 검사 위탁서 스크립트
 * CompostSampleManager - BaseSampleManager 상속
 */

// ========================================
// 상수 및 설정
// ========================================

/** @type {string} */
const DEFAULT_SAMPLE_TYPE = '가축분퇴비';

/** @type {string} */
const SAMPLE_TYPE = 'compost';

/** @type {string} */
const STORAGE_KEY = 'test_compostSampleLogs';

/** @type {string} */
const AUTO_SAVE_FILE = 'compost-autosave.json';

// ========================================
// CompostSampleManager 클래스
// ========================================

class CompostSampleManager extends window.BaseSampleManager {
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
        this.currentSearchFilter = {
            dateFrom: '',
            dateTo: '',
            name: '',
            receptionFrom: '',
            receptionTo: '',
            completed: 'incomplete'
        };
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

        // compost 전용 엑셀 저장 함수 추가
        if (this.FileAPI) {
            this.FileAPI.saveExcel = async function(buffer, suggestedName = 'data.xlsx') {
                if (window.isElectron) {
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

    cacheElements() {
        super.cacheElements();

        // Override different IDs
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');

        // Compost-specific elements
        this.dateInput = document.getElementById('date');
        this.applicantTypeSelect = document.getElementById('applicantType');
        this.birthDateField = document.getElementById('birthDateField');
        this.corpNumberField = document.getElementById('corpNumberField');
        this.birthDateInput = document.getElementById('birthDate');
        this.corpNumberInput = document.getElementById('corpNumber');
        this.animalTypeRadios = document.querySelectorAll('input[name="animalType"]');
        this.animalTypeOtherInput = document.getElementById('animalTypeOther');
        this.farmAddressFullInput = document.getElementById('farmAddressFull');
        this.farmAreaInput = document.getElementById('farmArea');
        this.areaUnitToggle = document.getElementById('areaUnitToggle');
        this.farmAreaUnitInput = document.getElementById('farmAreaUnit');
        this.receptionNumberInput = document.getElementById('receptionNumber');
        this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        this.receptionMethodInput = document.getElementById('receptionMethod');
        this.navSubmitBtn = document.getElementById('navSubmitBtn');
        this.navResetBtn = document.getElementById('navResetBtn');
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox');

        // Address refs
        this.addressPostcode = document.getElementById('addressPostcode');
        this.addressRoad = document.getElementById('addressRoad');
        this.addressDetail = document.getElementById('addressDetail');
        this.addressHidden = document.getElementById('address');

        // Registration result modal refs
        this.registrationResultModal = document.getElementById('registrationResultModal');
        this.resultTableBody = document.getElementById('resultTableBody');
    }

    // ========================================
    // Override: 뷰 초기화
    // ========================================

    initViews() {
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
    // Override: completed 필드 마이그레이션 (compost는 isComplete 사용)
    // ========================================

    migrateCompletedField(logs) {
        if (!Array.isArray(logs)) return logs;
        return logs.map(log => {
            if (log.completed !== undefined || log.isCompleted !== undefined) {
                log.isComplete = log.isComplete || log.isCompleted || log.completed || false;
                delete log.completed;
                delete log.isCompleted;
            }
            if (log.isComplete === undefined) {
                log.isComplete = false;
            }
            return log;
        });
    }

    // ========================================
    // Override: 렌더링 전 데이터 정렬 (접수번호 오름차순)
    // ========================================

    prepareDataForRender(logs) {
        return [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });
    }

    // ========================================
    // Override: 뷰 전환 (listViewStale 지원)
    // ========================================

    switchView(viewName) {
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
    // Override: 레코드 수 업데이트 (총 접두사 없음)
    // ========================================

    updateRecordCount() {
        if (this.recordCountEl) {
            this.recordCountEl.textContent = `${this.sampleLogs.length}건`;
        }
    }

    // ========================================
    // Override: 연도 변경 시 hook
    // ========================================

    onYearChange(newYear) {
        this.updateListViewTitle();
    }

    // onBeforeSave: BaseSampleManager.saveLogs에서 listViewStale 설정하므로 별도 오버라이드 불필요

    // ========================================
    // Override: 저장 후 hook (자동 저장)
    // ========================================

    onAfterSave(data) {
        // 자동 저장 (Electron 환경)
        if (window.isElectron && this.FileAPI?.autoSavePath && document.getElementById('autoSaveToggle')?.checked) {
            const autoSaveContent = JSON.stringify(data, null, 2);
            this.FileAPI.autoSave(autoSaveContent);
        }
    }

    // ========================================
    // Override: 테이블 행 빌드 (PaginationManager용)
    // ========================================

    buildTableRow(logItem, index) {
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
        inputMoisture.value = logItem.moisture || '';
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
            const areaValue = parseInt(logItem.farmArea, 10);
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

        // 22. Action buttons (edit/delete)
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

    submitForm() {
        const formData = new FormData(this.form);

        // 축종 (기타 선택 시 입력값 사용)
        let animalType = formData.get('animalType');
        if (animalType === '기타') {
            animalType = this.animalTypeOtherInput.value || '기타';
        }

        // 법인여부
        const applicantType = formData.get('applicantType') || '개인';

        if (this.editingId) {
            // === 수정 모드 ===
            const log = this.sampleLogs.find(l => l.id === this.editingId);
            if (log) {
                log.receptionNumber = formData.get('receptionNumber');
                log.date = formData.get('date');
                log.applicantType = applicantType;
                log.birthDate = applicantType === '개인' ? formData.get('birthDate') : '';
                log.corpNumber = applicantType === '법인' ? formData.get('corpNumber') : '';
                log.farmName = formData.get('farmName');
                log.name = formData.get('name');
                log.phoneNumber = formData.get('phoneNumber');
                log.address = formData.get('address');
                log.addressPostcode = formData.get('addressPostcode');
                log.addressRoad = formData.get('addressRoad');
                log.addressDetail = formData.get('addressDetail');
                log.farmAddress = formData.get('farmAddressFull');
                log.farmArea = this.parseFormattedNumber(formData.get('farmArea') || '');
                log.farmAreaUnit = formData.get('farmAreaUnit') || 'm2';
                log.sampleType = formData.get('sampleType');
                log.animalType = animalType;
                log.productionDate = formData.get('productionDate');
                log.sampleCount = formData.get('sampleCount') || '1';
                log.rawMaterials = formData.get('rawMaterials');
                log.purpose = formData.get('purpose');
                log.receptionMethod = formData.get('receptionMethod');
                log.note = formData.get('note');
                log.updatedAt = new Date().toISOString();

                this.saveLogs();
                this.showToast('수정이 완료되었습니다.', 'success');
                this.resetForm();
                this.receptionNumberInput.value = this.generateNextReceptionNumber();
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
            const data = {
                id: SampleUtils.generateUUID(),
                receptionNumber: formData.get('receptionNumber'),
                date: formData.get('date'),
                applicantType: applicantType,
                birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
                corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
                farmName: formData.get('farmName'),
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                addressPostcode: formData.get('addressPostcode'),
                addressRoad: formData.get('addressRoad'),
                addressDetail: formData.get('addressDetail'),
                farmAddress: formData.get('farmAddressFull'),
                farmArea: this.parseFormattedNumber(formData.get('farmArea') || ''),
                farmAreaUnit: formData.get('farmAreaUnit') || 'm2',
                sampleType: formData.get('sampleType'),
                animalType: animalType,
                productionDate: formData.get('productionDate'),
                sampleCount: formData.get('sampleCount') || '1',
                rawMaterials: formData.get('rawMaterials'),
                purpose: formData.get('purpose'),
                receptionMethod: formData.get('receptionMethod'),
                note: formData.get('note'),
                isComplete: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.sampleLogs.push(data);
            this.saveLogs();

            this.showToast('시료가 등록되었습니다.', 'success');
            this.showRegistrationResult(data);

            this.resetForm();
            this.receptionNumberInput.value = this.generateNextReceptionNumber();
        }
    }

    // ========================================
    // Override: 샘플 편집
    // ========================================

    editSample(id) {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        this.editingId = id;

        // 폼에 데이터 채우기
        this.receptionNumberInput.value = log.receptionNumber || '';
        this.dateInput.value = log.date || '';

        // 법인여부/생년월일/법인번호 설정
        const applicantType = log.applicantType || '개인';
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.value = applicantType;
            if (applicantType === '법인') {
                this.birthDateField.classList.add('hidden');
                this.corpNumberField.classList.remove('hidden');
                if (this.corpNumberInput) this.corpNumberInput.value = log.corpNumber || '';
                if (this.birthDateInput) this.birthDateInput.value = '';
            } else {
                this.birthDateField.classList.remove('hidden');
                this.corpNumberField.classList.add('hidden');
                if (this.birthDateInput) this.birthDateInput.value = log.birthDate || '';
                if (this.corpNumberInput) this.corpNumberInput.value = '';
            }
        }

        // 의뢰자 정보
        document.getElementById('farmName').value = log.farmName || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        this.addressPostcode.value = log.addressPostcode || '';
        this.addressRoad.value = log.addressRoad || '';
        this.addressDetail.value = log.addressDetail || '';
        this.addressHidden.value = log.address || '';

        // 농장 정보
        if (this.farmAddressFullInput) {
            this.farmAddressFullInput.value = log.farmAddress || '';
        }
        document.getElementById('farmArea').value = log.farmArea ? this.formatNumberWithCommas(log.farmArea) : '';

        // 면적 단위 복원
        const savedUnit = log.farmAreaUnit || 'm2';
        if (this.areaUnitToggle) {
            this.areaUnitToggle.dataset.unit = savedUnit;
            this.areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.value === savedUnit);
            });
        }
        if (this.farmAreaUnitInput) {
            this.farmAreaUnitInput.value = savedUnit;
        }

        // 시료종류 설정
        const sampleTypeRadios = document.querySelectorAll('input[name="sampleType"]');
        sampleTypeRadios.forEach(radio => {
            radio.checked = radio.value === log.sampleType;
        });

        // 축종 설정
        let animalTypeFound = false;
        this.animalTypeRadios.forEach(radio => {
            if (radio.value === log.animalType) {
                radio.checked = true;
                animalTypeFound = true;
            } else if (radio.value === '기타' && !animalTypeFound && log.animalType && !['소', '돼지', '닭·오리 등'].includes(log.animalType)) {
                radio.checked = true;
                this.animalTypeOtherInput.value = log.animalType;
                this.animalTypeOtherInput.classList.remove('hidden');
            }
        });

        // 생산 정보
        document.getElementById('productionDate').value = log.productionDate || '';
        document.getElementById('sampleCount').value = log.sampleCount || 1;
        document.getElementById('rawMaterials').value = log.rawMaterials || '';
        document.getElementById('purpose').value = log.purpose || '';
        document.getElementById('note').value = log.note || '';

        // 통보방법 선택
        this.receptionMethodBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.method === log.receptionMethod);
        });
        this.receptionMethodInput.value = log.receptionMethod || '';

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

    resetForm() {
        // 접수번호와 접수일자 값 저장
        const receptionNumber = this.receptionNumberInput?.value;
        const date = this.dateInput?.value;

        this.form.reset();

        // 접수번호와 접수일자 복원
        if (receptionNumber) {
            this.receptionNumberInput.value = receptionNumber;
        }
        if (date) {
            this.dateInput.value = date;
        } else {
            this.dateInput.valueAsDate = new Date();
        }

        // 통보방법 초기화
        this.receptionMethodBtns.forEach(b => b.classList.remove('active'));
        this.receptionMethodInput.value = '';

        // 개인/법인 초기화
        if (this.applicantTypeSelect) {
            this.applicantTypeSelect.value = '개인';
            this.birthDateField.classList.remove('hidden');
            this.corpNumberField.classList.add('hidden');
        }
        if (this.birthDateInput) this.birthDateInput.value = '';
        if (this.corpNumberInput) this.corpNumberInput.value = '';

        // 시료종류 초기화 (첫 번째 라디오 선택)
        const sampleTypeRadios = document.querySelectorAll('input[name="sampleType"]');
        if (sampleTypeRadios.length > 0) {
            sampleTypeRadios[0].checked = true;
        }

        // 축종 초기화 (첫 번째 라디오 선택)
        if (this.animalTypeRadios.length > 0) {
            this.animalTypeRadios[0].checked = true;
        }
        this.animalTypeOtherInput.classList.add('hidden');
        this.animalTypeOtherInput.value = '';

        // 면적 단위 초기화
        if (this.areaUnitToggle) {
            this.areaUnitToggle.dataset.unit = 'm2';
            this.areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.value === 'm2');
            });
        }
        if (this.farmAreaUnitInput) {
            this.farmAreaUnitInput.value = 'm2';
        }

        // 접수번호 갱신
        const nextNumber = this.generateNextReceptionNumber();
        this.receptionNumberInput.value = nextNumber;

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

    setupTypeSpecificEvents() {
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
                const isCorpSelected = this.applicantTypeSelect.value === '법인';
                if (isCorpSelected) {
                    this.birthDateField.classList.add('hidden');
                    this.corpNumberField.classList.remove('hidden');
                    this.birthDateInput.value = '';
                } else {
                    this.birthDateField.classList.remove('hidden');
                    this.corpNumberField.classList.add('hidden');
                    this.corpNumberInput.value = '';
                }
            });
        }

        // -- 법인번호 자동 하이픈 --
        if (this.corpNumberInput) {
            this.corpNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length > 13) value = value.slice(0, 13);
                if (value.length > 6) {
                    value = value.slice(0, 6) + '-' + value.slice(6);
                }
                e.target.value = value;
            });
        }

        // -- 전화번호 자동 하이픈 (공통 모듈 사용) --
        const phoneNumberInput = document.getElementById('phoneNumber');
        window.SampleUtils.setupPhoneNumberInput(phoneNumberInput);

        // -- 통보방법 선택 --
        this.receptionMethodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.receptionMethodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.receptionMethodInput.value = btn.dataset.method;
            });
        });

        // -- 축종 기타 입력 필드 처리 --
        this.animalTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === '기타' && radio.checked) {
                    this.animalTypeOtherInput.classList.remove('hidden');
                    this.animalTypeOtherInput.focus();
                } else {
                    this.animalTypeOtherInput.classList.add('hidden');
                    this.animalTypeOtherInput.value = '';
                }
            });
        });

        // -- 면적 천단위 콤마 포맷팅 --
        if (this.farmAreaInput) {
            this.farmAreaInput.addEventListener('input', (e) => {
                const formatted = this.formatNumberWithCommas(e.target.value);
                e.target.value = formatted;
            });
        }

        // -- 면적 단위 토글 --
        if (this.areaUnitToggle) {
            this.areaUnitToggle.querySelectorAll('.unit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const value = btn.dataset.value;
                    this.areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.areaUnitToggle.dataset.unit = value;
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
                if (this.form.checkValidity()) {
                    this.submitForm();
                } else {
                    this.form.reportValidity();
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
    }

    // ========================================
    // 등록 결과 모달
    // ========================================

    setupRegistrationResultModal() {
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
            this.registrationResultModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeRegistrationResultModal());
        }
    }

    showRegistrationResult(data) {
        if (!this.registrationResultModal || !this.resultTableBody) return;

        this.currentRegistrationData = data;

        const rows = [
            { label: '접수번호', value: data.receptionNumber },
            { label: '접수일자', value: data.date },
            { label: '상호(농장명)', value: data.farmName },
            { label: '성명(대표자)', value: data.name },
            { label: '연락처', value: data.phoneNumber },
            { label: '시료종류', value: data.sampleType },
            { label: '축종', value: data.animalType },
            { label: '생산일자', value: data.productionDate },
            { label: '시료수', value: `${data.sampleCount || 1}점` },
            { label: '원료 및 투입비율', value: data.rawMaterials },
            { label: '목적(용도)', value: data.purpose },
            { label: '통보방법', value: data.receptionMethod },
            { label: '비고', value: data.note }
        ];

        BaseSampleManager.buildResultTable(this.resultTableBody, rows);
        this.registrationResultModal.classList.remove('hidden');
    }

    closeRegistrationResultModal() {
        if (this.registrationResultModal) {
            this.registrationResultModal.classList.add('hidden');
        }
        this.currentRegistrationData = null;
    }

    // ========================================
    // 테이블 이벤트 위임 (compost-specific)
    // ========================================

    setupCompostTableEvents() {
        if (!this.tableBody) return;

        // 클릭 이벤트 위임
        this.tableBody.addEventListener('click', (e) => {
            // select, input 요소 클릭 시 이벤트 무시 (드롭다운/입력 동작 보호)
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'OPTION') {
                return;
            }

            // 완료 버튼
            const completeBtn = e.target.closest('.btn-complete');
            if (completeBtn) {
                const id = completeBtn.dataset.id;
                this.toggleComplete(id);
                return;
            }

            // 판정 버튼
            const resultBtn = e.target.closest('.btn-result');
            if (resultBtn) {
                const id = resultBtn.dataset.id;
                this.toggleTestResult(id);
                return;
            }

            // 삭제 버튼
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (confirm('이 항목을 삭제하시겠습니까?')) {
                    this.deleteSample(id);
                }
                return;
            }

            // 수정 버튼
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                const id = editBtn.dataset.id;
                this.editSample(id);
                return;
            }
        });

        // 부숙도 드롭다운 변경 이벤트
        this.tableBody.addEventListener('change', (e) => {
            const maturitySelect = e.target.closest('.maturity-select');
            if (maturitySelect) {
                const id = maturitySelect.dataset.id;
                this.updateMaturity(id, maturitySelect.value);
                return;
            }
        });

        // 함수율 입력 변경 이벤트 (blur 시 저장)
        this.tableBody.addEventListener('blur', (e) => {
            const moistureInput = e.target.closest('.moisture-input');
            if (moistureInput) {
                const id = moistureInput.dataset.id;
                this.updateMoisture(id, moistureInput.value);
                return;
            }
        }, true); // capture phase for blur event

        // 함수율 Enter 키 입력 시 저장
        this.tableBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const moistureInput = e.target.closest('.moisture-input');
                if (moistureInput) {
                    const id = moistureInput.dataset.id;
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

    generateNextReceptionNumber() {
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

    toggleComplete(id) {
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

    toggleTestResult(id) {
        const log = this.sampleLogs.find(l => String(l.id) === id);
        if (log) {
            if (!log.testResult || log.testResult === '') {
                log.testResult = 'pass';
            } else if (log.testResult === 'pass') {
                log.testResult = 'fail';
            } else {
                log.testResult = '';
            }
            log.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.filterAndRenderLogs();
        }
    }

    // BaseSampleManager의 setupTableEventDelegation()이 toggleResult를 호출하므로 alias
    toggleResult(id) {
        this.toggleTestResult(id);
    }

    // ========================================
    // 부숙도 / 함수율 업데이트
    // ========================================

    updateMaturity(id, value) {
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            logItem.maturity = value;
            logItem.updatedAt = new Date().toISOString();
            this.saveLogs();
            this.log('부숙도 업데이트:', id, value);
        }
    }

    updateMoisture(id, value) {
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

    getSampleTypeBadge(type) {
        const typeMap = {
            '가축분퇴비': { class: 'compost', icon: '🌿' },
            '가축분뇨발효액': { class: 'liquid', icon: '💧' }
        };
        const config = typeMap[type] || { class: 'other', icon: '📦' };
        return `<span class="sample-type-badge ${config.class}">${config.icon} ${escapeHTML(type || '기타')}</span>`;
    }

    getAnimalTypeBadge(type) {
        const typeMap = {
            '소': { class: 'cow', icon: '🐄' },
            '돼지': { class: 'pig', icon: '🐷' },
            '닭·오리 등': { class: 'chicken', icon: '🐔' }
        };
        const config = typeMap[type] || { class: 'other', icon: '🐾' };
        return `<span class="animal-type-badge ${config.class}">${config.icon} ${escapeHTML(type || '기타')}</span>`;
    }

    // ========================================
    // 전체 선택 / 선택 삭제
    // ========================================

    setupBulkActions() {
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.row-checkbox');
                checkboxes.forEach(cb => cb.checked = this.selectAllCheckbox.checked);
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        const tableBody = this.tableBody || document.querySelector('tbody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const nameCell = e.target.closest('.col-name');
                if (nameCell && nameCell.dataset.name) {
                    const targetName = nameCell.dataset.name;
                    const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
                    const targetCheckboxes = [];

                    rowCheckboxes.forEach(cb => {
                        const tr = cb.closest('tr');
                        const nc = tr?.querySelector('.col-name');
                        if (nc && nc.dataset.name === targetName) {
                            targetCheckboxes.push(cb);
                        }
                    });

                    if (targetCheckboxes.length === 0) return;
                    const allChecked = targetCheckboxes.every(cb => cb.checked);
                    targetCheckboxes.forEach(cb => { cb.checked = !allChecked; });

                    if (this.selectAllCheckbox) {
                        const allBoxes = tableBody.querySelectorAll('.row-checkbox');
                        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
                        this.selectAllCheckbox.checked = allBoxes.length > 0 && checkedBoxes.length === allBoxes.length;
                        this.selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allBoxes.length;
                    }
                }
            });

            // 개별 체크박스 변경 시 전체 선택 상태 갱신
            tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('row-checkbox')) {
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
                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

                if (selectedIds.length === 0) {
                    showToast('삭제할 항목을 선택해주세요.', 'warning');
                    return;
                }

                if (confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?`)) {
                    this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                    this.saveLogs();
                    this.filterAndRenderLogs();
                    this.selectAllCheckbox.checked = false;

                    // Firebase에서도 삭제 (await로 완료 보장)
                    if (window.firestoreDb?.isEnabled()) {
                        try {
                            await Promise.all(selectedIds.map(id =>
                                window.firestoreDb.delete('compost', parseInt(this.selectedYear), id)
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

    setupLabelPrint() {
        const printLabelBtn = document.getElementById('printLabelBtn');
        if (!printLabelBtn) return;

        printLabelBtn.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

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

    openLabelPrintWithData(logs) {
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

    setupBulkMailDate() {
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const mailDateModal = document.getElementById('mailDateModal');
        const closeMailDateModal = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');
        const mailDateInput = document.getElementById('mailDateInput');
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
                this.selectAllCheckbox.checked = false;

                closeModalFn();
                this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

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

    setupStatisticsModal() {
        const statsBtn = document.getElementById('statsBtn');
        const statsModal = document.getElementById('statsModal');
        const closeStatsModal = document.getElementById('closeStatsModal');
        const closeStatsBtn2 = document.getElementById('closeStatsBtn2');

        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatistics());
        }
        if (closeStatsModal) {
            closeStatsModal.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
        if (closeStatsBtn2) {
            closeStatsBtn2.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
        if (statsModal) {
            statsModal.querySelector('.modal-overlay')?.addEventListener('click', () => statsModal.classList.add('hidden'));
        }
    }

    showStatistics() {
        const statsModal = document.getElementById('statsModal');
        const total = this.sampleLogs.length;
        const completed = this.sampleLogs.filter(l => l.isComplete).length;
        const pending = total - completed;

        document.getElementById('statTotalCount').textContent = total;
        document.getElementById('statCompletedCount').textContent = completed;
        document.getElementById('statPendingCount').textContent = pending;

        // 시료종류별
        const bySampleType = {};
        this.sampleLogs.forEach(l => {
            const type = l.sampleType || '미지정';
            bySampleType[type] = (bySampleType[type] || 0) + 1;
        });
        this.renderStatsChart('statsByCompostType', bySampleType, total, 'compost');

        // 축종별
        const byAnimalType = {};
        this.sampleLogs.forEach(l => {
            const type = l.animalType || '미지정';
            byAnimalType[type] = (byAnimalType[type] || 0) + 1;
        });
        this.renderStatsChart('statsByAnimalType', byAnimalType, total, 'animal');

        // 수령방법별
        const byReceptionMethod = {};
        this.sampleLogs.forEach(l => {
            const method = l.receptionMethod || '미지정';
            byReceptionMethod[method] = (byReceptionMethod[method] || 0) + 1;
        });
        this.renderStatsChart('statsByReceptionMethod', byReceptionMethod, total, 'method');

        // 월별 집계
        const byMonth = {};
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
        const byQuarter = {
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

            byQuarter[quarter].count += data.count;
            byQuarter[quarter].completed += data.completed;
            byQuarter[quarter].pending += data.pending;
        });

        this.renderMonthlyChart('statsByMonth', byMonth);
        this.renderQuarterlySummary('statsQuarterly', byQuarter);

        statsModal.classList.remove('hidden');
    }

    renderMonthlyChart(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
        const maxCount = Math.max(...entries.map(([, v]) => v.count), 1);
        const totalCount = entries.reduce((sum, [, v]) => sum + v.count, 0);

        if (totalCount === 0) {
            container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>');
            return;
        }

        container.innerHTML = sanitizeHTML(`
            <div class="monthly-chart">
                <div class="monthly-bars">
                    ${entries.map(([key, value]) => {
                        const heightPercent = maxCount > 0 ? (value.count / maxCount) * 100 : 0;
                        const completedPercent = value.count > 0 ? (value.completed / value.count) * 100 : 0;
                        return `
                            <div class="monthly-bar-group">
                                <div class="monthly-bar-container">
                                    <div class="monthly-bar-stack" style="height: ${heightPercent}%">
                                        <div class="monthly-bar-completed" style="height: ${completedPercent}%" title="완료: ${value.completed}건"></div>
                                        <div class="monthly-bar-pending" style="height: ${100 - completedPercent}%" title="미완료: ${value.pending}건"></div>
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
    }

    renderQuarterlySummary(containerId, data) {
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

    renderStatsChart(containerId, data, total, category) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        const compostClassMap = {
            '가축분퇴비': 'compost-manure',
            '가축분액비': 'compost-liquid',
            '기타': 'compost-other'
        };
        const animalClassMap = {
            '소': 'animal-cow',
            '돼지': 'animal-pig',
            '닭': 'animal-chicken',
            '오리': 'animal-duck',
            '말': 'animal-horse',
            '혼합': 'animal-mixed',
            '기타': 'animal-other'
        };
        const methodClassMap = {
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
                        <div class="stat-bar-fill ${barClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="stat-bar-value">${count}건 (${percentage}%)</div>
                </div>
            `;
        }).join(''));
    }

    // ========================================
    // 검색 모달
    // ========================================

    setupSearchModal() {
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const listSearchModal = document.getElementById('listSearchModal');
        const closeSearchModal = document.getElementById('closeSearchModal');
        const applySearchBtn = document.getElementById('applySearchBtn');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const searchDateFromInput = document.getElementById('searchDateFromInput');
        const searchDateToInput = document.getElementById('searchDateToInput');
        const searchNameInput = document.getElementById('searchNameInput');
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput');
        const searchReceptionToInput = document.getElementById('searchReceptionToInput');
        const clearSearchDate = document.getElementById('clearSearchDate');
        const clearSearchReception = document.getElementById('clearSearchReception');
        const completedFilter = document.getElementById('completedFilter');

        // 완료 상태 필터 드롭다운
        if (completedFilter) {
            completedFilter.addEventListener('change', (e) => {
                this.currentSearchFilter.completed = e.target.value;
                this.filterAndRenderLogs();
            });
        }

        if (openSearchModalBtn) {
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
            closeSearchModal.addEventListener('click', () => listSearchModal.classList.add('hidden'));
        }
        if (listSearchModal) {
            listSearchModal.querySelector('.modal-overlay').addEventListener('click', () => listSearchModal.classList.add('hidden'));
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
                listSearchModal.classList.add('hidden');
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
                listSearchModal.classList.add('hidden');
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

    extractReceptionNumber(receptionNumber) {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    filterAndRenderLogs() {
        const filtered = this.sampleLogs.filter(log => {
            // 성명 검색
            const matchesName = !this.currentSearchFilter.name ||
                (log.name || '').toLowerCase().includes(this.currentSearchFilter.name);

            // 접수번호 범위 검색
            let matchesReception = true;
            if (this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo) {
                const logNum = this.extractReceptionNumber(log.receptionNumber || '');
                const fromNum = this.currentSearchFilter.receptionFrom ? parseInt(this.currentSearchFilter.receptionFrom, 10) : 0;
                const toNum = this.currentSearchFilter.receptionTo ? parseInt(this.currentSearchFilter.receptionTo, 10) : Infinity;
                if (fromNum && logNum < fromNum) matchesReception = false;
                if (toNum !== Infinity && logNum > toNum) matchesReception = false;
            }

            // 날짜 범위 검색
            let matchesDate = true;
            if (this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo) {
                const logDate = log.date;
                if (this.currentSearchFilter.dateFrom && logDate < this.currentSearchFilter.dateFrom) matchesDate = false;
                if (this.currentSearchFilter.dateTo && logDate > this.currentSearchFilter.dateTo) matchesDate = false;
            }

            // 완료 상태 필터
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
    }

    updateSearchButtonState() {
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
            this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo ||
            (this.currentSearchFilter.completed && this.currentSearchFilter.completed !== 'incomplete');
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
    // 엑셀 내보내기
    // ========================================

    setupExcelExport() {
        const exportBtn = document.getElementById('exportBtn');
        if (!exportBtn) return;

        exportBtn.addEventListener('click', () => {
            if (this.sampleLogs.length === 0) {
                showToast('내보낼 데이터가 없습니다.', 'warning');
                return;
            }

            // 선택된 항목이 있으면 해당 항목만 내보내기
            const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
            const logsToExport = selectedIds.length > 0
                ? this.sampleLogs.filter(log => selectedIds.includes(log.id))
                : this.sampleLogs;

            if (selectedIds.length > 0) {
                this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
            }

            const excelData = logsToExport.map(log => {
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
                    '농장명': log.farmName || '-',
                    '대표자': log.name || '-',
                    '연락처': log.phoneNumber || '-',
                    '우편번호': log.addressPostcode || '-',
                    '시도': addressParts.sido || '-',
                    '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-',
                    '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                    '전체주소': fullAddress,
                    '농장주소': log.farmAddress || '-',
                    '농장면적': areaDisplay,
                    '시료종류': log.sampleType || '-',
                    '축종': log.animalType || '-',
                    '원료(부재료)': log.rawMaterials || '-',
                    '생산일': log.productionDate || '-',
                    '시료수': log.sampleCount || '-',
                    '검사목적': log.purpose || '-',
                    '통보방법': log.receptionMethod || '-',
                    '비고': log.note || '-',
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

            if (window.isElectron) {
                const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                this.FileAPI.saveExcel(xlsxData, fileName).then(saved => {
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

    setupJSONHandlers() {
        const jsonHandlerOptions = {
            getData: () => this.sampleLogs,
            setData: (data) => { this.sampleLogs = data; },
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

    setupAutoSaveHandlers() {
        const autoSaveToFile = async () => {
            return await SampleUtils.performAutoSave({
                FileAPI: this.FileAPI,
                moduleKey: 'compost',
                data: this.sampleLogs,
                webFileHandle: this.autoSaveFileHandle,
                log: (...args) => this.log(...args)
            });
        };

        window.triggerCompostAutoSave = autoSaveToFile;

        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'compost',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: window.showToast
        });

        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'compost',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: autoSaveToFile,
            showToast: window.showToast,
            log: (...args) => this.log(...args)
        });
    }

    // ========================================
    // 전체 보기/기본 보기 토글
    // ========================================

    setupColumnToggle() {
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

    bindFarmAddressAutocomplete() {
        const farmAddressInput = document.getElementById('farmAddressFull');
        const autocompleteList = document.getElementById('farmAddressAutocomplete');

        if (!farmAddressInput || !autocompleteList) return;

        // 입력 시 자동완성 목록 표시
        farmAddressInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // 이미 완전한 주소면 자동완성 비활성화
            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin', 'pohang_buk', 'pohang_nam'], true);

                if (suggestions.length > 0) {
                    autocompleteList.innerHTML = sanitizeHTML(suggestions.map(item => `
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
        farmAddressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const value = farmAddressInput.value.trim();

                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);

                    if (result) {
                        if (result.isDuplicate) {
                            autocompleteList.innerHTML = sanitizeHTML(result.locations.map(loc => `
                                <li data-village="${result.villageName}" data-district="${loc.district}" data-region-key="${loc.regionKey}" data-lot="${result.lotNumber}">
                                    ${loc.fullAddress} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            const fullAddress = `${result.region} ${result.district} ${result.village}${result.lotNumber ? ' ' + result.lotNumber : ''}`;
                            farmAddressInput.value = fullAddress;
                            autocompleteList.classList.remove('show');
                        }
                    }
                }
            }
        });

        // 자동완성 목록 클릭 선택
        autocompleteList.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (li) {
                const village = li.dataset.village;
                const district = li.dataset.district;
                const regionKey = li.dataset.regionKey;
                const isMountain = li.dataset.isMountain === 'true';
                const lot = li.dataset.lot || '';

                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                const villageWithMountain = isMountain ? `${village} 산` : village;

                const currentValue = farmAddressInput.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLot = lot || (match ? match[0] : '');

                const fullAddress = `${region} ${district} ${villageWithMountain}${extractedLot ? ' ' + extractedLot : ''}`;
                farmAddressInput.value = fullAddress;
                autocompleteList.classList.remove('show');
            }
        });

        // 외부 클릭 시 자동완성 목록 숨기기
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.lot-address-autocomplete-wrapper')) {
                autocompleteList.classList.remove('show');
            }
        });
    }

    // ========================================
    // 엑셀 가져오기 (ExcelImportManager)
    // ========================================

    setupExcelImport() {
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
                date: document.getElementById('importDate').value || new Date().toISOString().slice(0, 10),
                name: document.getElementById('importName').value.trim(),
                phone: document.getElementById('importPhone').value.trim(),
                address: document.getElementById('importAddress').value.trim(),
                method: document.getElementById('importMethod').value,
                purpose: document.getElementById('importPurpose').value.trim(),
                now: new Date().toISOString()
            }),
            buildRecord: (getVal, parseExcelDate, common, rowIdx) => {
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
            skipRowCheck: (record, rowIdx) => {
                if (!record.farmName && !record.name && !record.sampleType) {
                    return `행 ${rowIdx + 2}: 농장명, 대표자, 시료종류가 모두 비어 있어 건너뜁니다.`;
                }
                return null;
            },
            getExistingLogs: () => this.sampleLogs,
            onImportComplete: (records) => {
                records.forEach(logEntry => this.sampleLogs.push(logEntry));
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

    async loadAutoSaveOnInit() {
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
            const autoSaveData = await window.loadFromAutoSaveFile();
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

    formatNumberWithCommas(value) {
        const num = String(value).replace(/[^\d]/g, '');
        if (!num) return '';
        return parseInt(num, 10).toLocaleString('ko-KR');
    }

    parseFormattedNumber(value) {
        return value.replace(/,/g, '');
    }

    updateListViewTitle() {
        const listViewTitle = document.getElementById('listViewTitle');
        if (listViewTitle) {
            listViewTitle.textContent = '퇴·액비 접수 목록';
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
