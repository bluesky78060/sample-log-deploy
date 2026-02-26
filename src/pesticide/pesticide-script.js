/**
 * @fileoverview 잔류농약 시료 전용 스크립트
 * PesticideSampleManager - BaseSampleManager 상속
 */

// ========================================
// 상수 및 설정
// ========================================

/** @type {string} */
const SAMPLE_TYPE = '잔류농약';

/** @type {string} */
const STORAGE_KEY = 'test_pesticideSampleLogs';

/** @type {string} */
const AUTO_SAVE_FILE = 'pesticide-autosave.json';

// 면적 단위 변환 상수
const PYEONG_TO_M2 = 3.305785;

// ========================================
// PesticideSampleManager 클래스
// ========================================

class PesticideSampleManager extends window.BaseSampleManager {
    constructor() {
        super({
            moduleKey: 'pesticide',
            moduleName: '잔류농약',
            storageKey: STORAGE_KEY,
            sampleType: SAMPLE_TYPE,
            autoSaveFile: AUTO_SAVE_FILE,
            debug: !!window.DEBUG
        });

        // Pesticide-specific state
        this.listViewStale = true;
        this.currentSearchFilter = {
            dateFrom: '',
            dateTo: '',
            name: '',
            receptionFrom: '',
            receptionTo: '',
            completed: ''
        };
        this.isFullView = false;
        this.autoSaveFileHandle = null;
        this.currentRegistrationData = null;

        // Request items
        this.requestItemCounter = 1;

        // Parcel system (legacy compat - pesticide doesn't use parcels actively)
        this.parcels = [];
        this.parcelIdCounter = 0;

        // Crop modal state
        this.currentParcelIdForCrop = null;
        this.tempCropAreas = [];
        this.currentSubLotParcelId = null;
        this.currentSubLotIndex = null;

        // Crop search modal state
        this.tempSelectedCrops = [];
        this.confirmedCrops = [];

        // Region selection
        this.currentRegionSelection = null;

        // Mail date
        this.pendingMailDateIds = [];

        // Pagination (pesticide uses its own pagination, NOT PaginationManager)
        this.currentFlatRows = [];

        // DOM refs (set in cacheElements)
        this.dateInput = null;
        this.applicantTypeSelect = null;
        this.birthDateField = null;
        this.corpNumberField = null;
        this.birthDateInput = null;
        this.corpNumberInput = null;
        this.receptionNumberInput = null;
        this.receptionMethodBtns = null;
        this.receptionMethodInput = null;
        this.navSubmitBtn = null;
        this.navResetBtn = null;
        this.selectAllCheckbox = null;
        this.paginationContainer = null;
        this.paginationInfo = null;
        this.itemsPerPageSelect = null;
        this.pageNumbersContainer = null;
        this.firstPageBtn = null;
        this.prevPageBtn = null;
        this.nextPageBtn = null;
        this.lastPageBtn = null;

        // Address refs
        this.addressPostcode = null;
        this.addressRoad = null;
        this.addressDetail = null;
        this.addressHidden = null;
        this.addressManager = null;

        // Producer address
        this.producerAddressInput = null;
        this.producerAddressAutocomplete = null;

        // Request items container
        this.requestItemsList = null;

        // Registration result modal refs
        this.registrationResultModal = null;
        this.resultTableBody = null;

        // Parcels container
        this.parcelsContainer = null;

        // Crop area modal refs
        this.cropAreaModal = null;
        this.cropAreaList = null;

        // Area formatting from common module
        this.formatArea = window.SampleUtils?.formatArea || (v => v);
        this.getUnitLabel = window.SampleUtils?.getUnitLabel || (v => v);
        this.formatAreaWithUnit = window.SampleUtils?.formatAreaWithUnit || ((area, unit) => `${area} ${unit}`);

        // pesticide-specific FileAPI excel save
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

        // Override different IDs (pesticide uses logTableBody / emptyState getElementById)
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');

        // Date input
        this.dateInput = document.getElementById('date');

        // Applicant type
        this.applicantTypeSelect = document.getElementById('applicantType');
        this.birthDateField = document.getElementById('birthDateField');
        this.corpNumberField = document.getElementById('corpNumberField');
        this.birthDateInput = document.getElementById('birthDate');
        this.corpNumberInput = document.getElementById('corpNumber');

        // Reception
        this.receptionNumberInput = document.getElementById('receptionNumber');
        this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        this.receptionMethodInput = document.getElementById('receptionMethod');

        // Nav buttons
        this.navSubmitBtn = document.getElementById('navSubmitBtn');
        this.navResetBtn = document.getElementById('navResetBtn');
        this.selectAllCheckbox = document.getElementById('selectAll');

        // Pagination elements
        this.paginationContainer = document.getElementById('pagination');
        this.paginationInfo = document.getElementById('paginationInfo');
        this.itemsPerPageSelect = document.getElementById('itemsPerPage');
        this.pageNumbersContainer = document.getElementById('pageNumbers');
        this.firstPageBtn = document.getElementById('firstPage');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.lastPageBtn = document.getElementById('lastPage');

        // Address refs
        this.addressPostcode = document.getElementById('addressPostcode');
        this.addressRoad = document.getElementById('addressRoad');
        this.addressDetail = document.getElementById('addressDetail');
        this.addressHidden = document.getElementById('address');

        // Producer address
        this.producerAddressInput = document.getElementById('producerAddress');
        this.producerAddressAutocomplete = document.getElementById('producerAddressAutocomplete');

        // Request items
        this.requestItemsList = document.getElementById('requestItemsList');

        // Registration result modal
        this.registrationResultModal = document.getElementById('registrationResultModal');
        this.resultTableBody = document.getElementById('resultTableBody');

        // Parcels
        this.parcelsContainer = document.getElementById('parcelsContainer');

        // Crop area modal
        this.cropAreaModal = document.getElementById('cropAreaModal');
        this.cropAreaList = document.getElementById('cropAreaList');

        // Items per page init
        this.itemsPerPage = parseInt(localStorage.getItem('pesticideItemsPerPage'), 10) || 100;
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.value = this.itemsPerPage;
        }
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
    // Override: 페이지네이션 초기화 (PaginationManager 사용 안 함)
    // ========================================

    initPagination() {
        // pesticide는 자체 페이지네이션을 사용하므로 PaginationManager 초기화하지 않음
        // 대신 setupPaginationEvents에서 자체 이벤트를 설정
    }

    // ========================================
    // Override: 테이블 이벤트 위임 (자체 이벤트 핸들러 사용)
    // ========================================

    setupTableEventDelegation() {
        // pesticide는 setupTypeSpecificEvents에서 자체 이벤트 위임을 설정하므로
        // base class의 EventDelegator를 사용하지 않음
    }

    // ========================================
    // Override: completed 필드 마이그레이션 (pesticide는 isComplete 사용)
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
    // Override: 추가 마이그레이션
    // ========================================

    getAdditionalMigrations() {
        return [
            (logs) => {
                this.migrateProducerAddress(logs);
                return logs;
            }
        ];
    }

    // 생산지 주소 마이그레이션 (면+리만 있는 주소에 봉화군 추가)
    migrateProducerAddress(logs) {
        const bonghwaDistricts = ['봉화읍', '물야면', '봉성면', '법전면', '춘양면', '소천면', '재산면', '명호면', '상운면', '석포면'];
        const districtPattern = new RegExp(`^(${bonghwaDistricts.join('|')})\\s+`);

        let migrated = 0;
        logs.forEach(log => {
            if (log.producerAddress) {
                const addr = log.producerAddress.trim();
                if (addr.startsWith('봉화군') || addr.startsWith('영주시') || addr.startsWith('울진군') || addr.startsWith('경상북도')) {
                    return;
                }
                if (districtPattern.test(addr)) {
                    log.producerAddress = '봉화군 ' + addr;
                    migrated++;
                }
            }
        });
        if (migrated > 0) {
            this.log('📍 생산지 주소 마이그레이션:', migrated, '건');
        }
        return migrated;
    }

    // ========================================
    // Override: 렌더링 전 데이터 정렬 + 평탄화
    // ========================================

    prepareDataForRender(logs) {
        const sorted = [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });
        return this.flattenLogsForTable(sorted);
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
            this.renderLogs(this.sampleLogs);
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
        this.listViewStale = true;
        this.updateListViewTitle();
    }

    // ========================================
    // Override: 저장 전 hook
    // ========================================

    onBeforeSave(data) {
        this.listViewStale = true;
        return data;
    }

    // ========================================
    // Override: 저장 후 hook (자동 저장)
    // ========================================

    onAfterSave(data) {
        const autoSaveEnabled = localStorage.getItem('pesticideAutoSaveEnabled') === 'true';
        if (autoSaveEnabled && (window.isElectron ? this.FileAPI?.autoSavePath : this.autoSaveFileHandle)) {
            this.autoSaveToFile();
        }
        sessionStorage.setItem('lastSaveTime', new Date().toISOString());
    }

    // ========================================
    // Override: 수령 방법 버튼 설정 (pesticide uses .reception-method-btn with data-method)
    // ========================================

    setupReceptionMethod() {
        // pesticide uses .reception-method-btn with data-method, NOT .method-btn with data-value
        if (this.receptionMethodBtns) {
            this.receptionMethodBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.receptionMethodBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (this.receptionMethodInput) {
                        this.receptionMethodInput.value = btn.dataset.method;
                    }
                });
            });
        }
    }

    // ========================================
    // 접수번호 자동 카운터
    // ========================================

    generateNextReceptionNumber() {
        let maxNumber = 0;
        this.sampleLogs.forEach(logItem => {
            if (logItem.receptionNumber) {
                const baseNumber = logItem.receptionNumber.split('-')[0];
                const num = parseInt(baseNumber, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        const nextNumber = maxNumber + 1;
        this.log(`📋 다음 접수번호 생성: ${nextNumber} (기존 최대: ${maxNumber})`);
        return String(nextNumber);
    }

    // ========================================
    // 리스트 뷰 제목 업데이트
    // ========================================

    updateListViewTitle() {
        const listViewTitle = document.getElementById('listViewTitle');
        if (listViewTitle) {
            listViewTitle.textContent = `잔류농약 접수 목록`;
        }
    }

    // ========================================
    // 면적 변환
    // ========================================

    convertM2ToPyeong(m2) {
        return (parseFloat(m2) / PYEONG_TO_M2).toFixed(2);
    }

    convertPyeongToM2(pyeong) {
        return (parseFloat(pyeong) * PYEONG_TO_M2).toFixed(2);
    }

    // ========================================
    // 접수번호 가져오기 (연도 제외, 번호만)
    // ========================================

    getReceptionNumber() {
        if (!this.receptionNumberInput) {
            console.warn('접수번호 입력란을 찾을 수 없습니다');
            return '';
        }
        const value = this.receptionNumberInput.value.trim();
        if (!value) {
            console.warn('접수번호가 비어있습니다');
            return '';
        }
        const parts = value.split('-');
        if (parts.length >= 2) {
            const numberPart = parts.slice(1).join('-');
            this.log(`접수번호 추출: ${value} → ${numberPart}`);
            return numberPart;
        }
        this.log(`접수번호 형식 확인: ${value}`);
        return value;
    }

    // ========================================
    // 의뢰 항목 관리
    // ========================================

    addRequestItem() {
        this.requestItemCounter++;
        const index = this.requestItemCounter - 1;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'request-item';
        itemDiv.dataset.index = index;

        itemDiv.innerHTML = sanitizeHTML(`
            <div class="request-item-header">
                <span class="item-number">의뢰 ${this.requestItemCounter}</span>
                <button type="button" class="btn-remove-item" title="항목 삭제">✕</button>
            </div>
            <div class="form-row">
                <div class="form-field full-width">
                    <label>생산지 주소 <span class="label-hint">* 리+지번 입력 후 Enter</span></label>
                    <div class="producer-address-autocomplete-wrapper">
                        <input type="text" class="request-producer-address" name="producerAddress[]" placeholder="예: 문단리 123, 문단리 산 45">
                        <ul class="producer-address-autocomplete-list"></ul>
                    </div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-field full-width">
                    <label>의뢰물품명(작물명)</label>
                    <input type="text" class="request-crop-name" name="requestContent[]" placeholder="예: 사과, 배, 포도 등">
                </div>
            </div>
        `);

        this.requestItemsList.appendChild(itemDiv);

        const removeBtn = itemDiv.querySelector('.btn-remove-item');
        removeBtn.addEventListener('click', () => {
            itemDiv.remove();
            this.updateRequestItemNumbers();
            this.updateRemoveButtonsVisibility();
        });

        this.initRequestItemAutocomplete(itemDiv);
        this.updateRemoveButtonsVisibility();

        itemDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateRequestItemNumbers() {
        const items = this.requestItemsList.querySelectorAll('.request-item');
        items.forEach((item, idx) => {
            const numberSpan = item.querySelector('.item-number');
            if (numberSpan) {
                numberSpan.textContent = `의뢰 ${idx + 1}`;
            }
            item.dataset.index = idx;
        });
        this.requestItemCounter = items.length;
    }

    updateRemoveButtonsVisibility() {
        const items = this.requestItemsList.querySelectorAll('.request-item');
        items.forEach((item) => {
            const removeBtn = item.querySelector('.btn-remove-item');
            if (removeBtn) {
                removeBtn.style.display = items.length > 1 ? 'flex' : 'none';
            }
        });
    }

    initRequestItemAutocomplete(itemDiv) {
        const addressInput = itemDiv.querySelector('.request-producer-address');
        const autocompleteList = itemDiv.querySelector('.producer-address-autocomplete-list');

        if (!addressInput || !autocompleteList) return;

        addressInput.addEventListener('input', () => {
            const value = addressInput.value.trim();

            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin'], true);
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

        addressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = addressInput.value.trim();

                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate) {
                            this.showProducerRegionSelectionModal(result, addressInput);
                        } else {
                            addressInput.value = result.fullAddress;
                            autocompleteList.classList.remove('show');
                        }
                    }
                }
            }
        });

        autocompleteList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const village = e.target.dataset.village;
                const district = e.target.dataset.district;
                const regionKey = e.target.dataset.regionKey;
                const isMountain = e.target.dataset.isMountain === 'true';

                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const villageWithMountain = isMountain ? `${village} 산` : village;
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
                const fullAddress = `${region} ${district} ${villageWithMountain}`;
                const currentValue = addressInput.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const number = match ? ' ' + match[0] : '';

                addressInput.value = fullAddress + number;
                autocompleteList.classList.remove('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && !autocompleteList.contains(e.target)) {
                autocompleteList.classList.remove('show');
            }
        });
    }

    getRequestItems() {
        const items = [];
        const requestItems = this.requestItemsList?.querySelectorAll('.request-item') || [];

        requestItems.forEach((item, idx) => {
            const addressInput = item.querySelector('.request-producer-address');
            const cropInput = item.querySelector('.request-crop-name');

            const address = addressInput?.value.trim() || '';
            const crop = cropInput?.value.trim() || '';

            if (address || crop) {
                items.push({
                    index: idx,
                    producerAddress: address,
                    cropName: crop
                });
            }
        });

        return items;
    }

    resetRequestItems() {
        const items = this.requestItemsList?.querySelectorAll('.request-item') || [];
        items.forEach((item, idx) => {
            if (idx === 0) {
                const addressInput = item.querySelector('.request-producer-address');
                const cropInput = item.querySelector('.request-crop-name');
                if (addressInput) addressInput.value = '';
                if (cropInput) cropInput.value = '';
            } else {
                item.remove();
            }
        });
        this.requestItemCounter = 1;
        this.updateRemoveButtonsVisibility();
    }

    // ========================================
    // 생산지 주소 자동완성
    // ========================================

    setupProducerAddressAutocomplete() {
        if (!this.producerAddressInput || !this.producerAddressAutocomplete) return;
        this.log('📍 생산지 주소 자동완성 초기화');

        this.producerAddressInput.addEventListener('input', () => {
            const value = this.producerAddressInput.value.trim();

            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                this.producerAddressAutocomplete.classList.remove('show');
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                const suggestions = suggestRegionVillages(value, ['bonghwa', 'yeongju', 'uljin'], true);
                if (suggestions.length > 0) {
                    this.producerAddressAutocomplete.innerHTML = sanitizeHTML(suggestions.map(item => `
                        <li data-village="${item.village}" data-district="${item.district}" data-region-key="${item.regionKey}" data-region="${item.region || ''}" data-is-mountain="${item.isMountain}">
                            ${item.displayText}
                        </li>
                    `).join(''));
                    this.producerAddressAutocomplete.classList.add('show');
                } else {
                    this.producerAddressAutocomplete.classList.remove('show');
                }
            } else {
                this.producerAddressAutocomplete.classList.remove('show');
            }
        });

        this.producerAddressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.producerAddressInput.value.trim();

                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    this.producerAddressAutocomplete.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate) {
                            this.showProducerRegionSelectionModal(result, this.producerAddressInput);
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            this.producerAddressInput.value = result.fullAddress;
                            this.producerAddressAutocomplete.classList.remove('show');
                        } else {
                            this.producerAddressInput.value = result.fullAddress;
                            this.producerAddressAutocomplete.classList.remove('show');
                        }
                    }
                }
            }
        });

        this.producerAddressAutocomplete.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const village = e.target.dataset.village;
                const district = e.target.dataset.district;
                const regionKey = e.target.dataset.regionKey;
                const isMountain = e.target.dataset.isMountain === 'true';

                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const villageWithMountain = isMountain ? `${village} 산` : village;
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
                const fullAddress = `${region} ${district} ${villageWithMountain}`;
                const currentValue = this.producerAddressInput.value.trim();
                const numberMatch = currentValue.match(/\d+(-\d+)?$/);
                const number = numberMatch ? ' ' + numberMatch[0] : '';

                this.producerAddressInput.value = fullAddress + number;
                this.producerAddressAutocomplete.classList.remove('show');
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.producerAddressInput.contains(e.target) && !this.producerAddressAutocomplete.contains(e.target)) {
                this.producerAddressAutocomplete.classList.remove('show');
            }
        });
    }

    showProducerRegionSelectionModal(result, inputElement) {
        const modal = document.getElementById('regionSelectionModal');
        const duplicateVillageName = document.getElementById('duplicateVillageName');
        const regionOptions = document.getElementById('regionOptions');

        if (!modal || !regionOptions) return;

        duplicateVillageName.textContent = result.villageName;

        regionOptions.innerHTML = sanitizeHTML(result.locations.map(loc => `
            <button type="button" class="region-option-btn" data-address="${loc.fullAddress}">
                ${loc.region} ${loc.district}
            </button>
        `).join(''));

        regionOptions.querySelectorAll('.region-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = result.lotNumber ? ' ' + result.lotNumber : '';
                inputElement.value = btn.dataset.address + number;
                modal.classList.add('hidden');
            });
        });

        modal.classList.remove('hidden');
    }

    // ========================================
    // Override: 폼 제출 처리
    // ========================================

    submitForm() {
        const formData = new FormData(this.form);

        // 수정 모드인 경우
        if (this.editingId) {
            const logIndex = this.sampleLogs.findIndex(l => l.id === this.editingId);
            if (logIndex === -1) {
                this.showToast('수정할 데이터를 찾을 수 없습니다.', 'error');
                return;
            }

            const existingLog = this.sampleLogs[logIndex];
            const requestItems = this.getRequestItems();
            const firstItem = requestItems[0] || { producerAddress: '', cropName: '' };
            const applicantType = formData.get('applicantType') || '개인';

            const updatedLog = {
                ...existingLog,
                receptionNumber: formData.get('receptionNumber'),
                date: formData.get('date'),
                applicantType: applicantType,
                birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
                corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                addressPostcode: formData.get('addressPostcode') || '',
                addressRoad: formData.get('addressRoad') || '',
                addressDetail: formData.get('addressDetail') || '',
                subCategory: formData.get('subCategory') || '-',
                purpose: formData.get('purpose'),
                receptionMethod: formData.get('receptionMethod') || '-',
                note: formData.get('note') || '',
                producerName: formData.get('producerName') || '',
                producerAddress: firstItem.producerAddress,
                requestContent: firstItem.cropName,
                updatedAt: new Date().toISOString()
            };

            this.sampleLogs[logIndex] = updatedLog;
            this.saveLogs();
            this.renderLogs(this.sampleLogs);
            this.cancelEditMode();
            this.showToast('수정이 완료되었습니다.', 'success');
            this.switchView('list');
            return;
        }

        // 신규 등록 모드
        const requestItems = this.getRequestItems();

        if (requestItems.length === 0) {
            this.showToast('최소 하나의 의뢰 항목을 입력해주세요.', 'error');
            return;
        }

        const baseReceptionNumber = parseInt(formData.get('receptionNumber'), 10);
        const createdLogs = [];
        const applicantType = formData.get('applicantType') || '개인';

        requestItems.forEach((item, idx) => {
            const itemReceptionNumber = String(baseReceptionNumber + idx);

            const newLog = {
                id: crypto.randomUUID(),
                receptionNumber: itemReceptionNumber,
                date: formData.get('date'),
                applicantType: applicantType,
                birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
                corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                addressPostcode: formData.get('addressPostcode') || '',
                addressRoad: formData.get('addressRoad') || '',
                addressDetail: formData.get('addressDetail') || '',
                subCategory: formData.get('subCategory') || '-',
                purpose: formData.get('purpose'),
                receptionMethod: formData.get('receptionMethod') || '-',
                note: formData.get('note') || '',
                producerName: formData.get('producerName') || '',
                producerAddress: item.producerAddress,
                requestContent: item.cropName,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.sampleLogs.push(newLog);
            createdLogs.push(newLog);
        });

        this.saveLogs();
        this.renderLogs(this.sampleLogs);
        this.form.reset();
        this.dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        this.addressPostcode.value = '';
        this.addressRoad.value = '';
        this.addressDetail.value = '';
        this.addressHidden.value = '';

        // 의뢰 항목 초기화
        this.resetRequestItems();

        // 다음 접수번호 자동 생성
        this.receptionNumberInput.value = this.generateNextReceptionNumber();

        const itemCount = createdLogs.length;
        this.showToast(`${itemCount}건의 시료가 접수되었습니다.`, 'success');

        if (createdLogs.length === 1) {
            this.showRegistrationResult(createdLogs[0]);
        } else {
            this.showMultipleRegistrationResult(createdLogs);
        }

        this.switchView('list');
    }

    // ========================================
    // Override: 샘플 편집
    // ========================================

    editSample(id) {
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            this.populateFormForEdit(logItem);
        }
    }

    populateFormForEdit(log) {
        this.editingId = log.id;

        this.receptionNumberInput.value = log.receptionNumber || '';
        this.dateInput.value = log.date || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';

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

        // 주소 필드 처리
        if (log.address) {
            const addressMatch = log.address.match(/^\((\d{5})\)\s*(.+)$/);
            if (addressMatch) {
                this.addressPostcode.value = addressMatch[1];
                const roadAndDetail = addressMatch[2];
                const detailMatch = roadAndDetail.match(/^(.+?\))\s*(.*)$/);
                if (detailMatch) {
                    this.addressRoad.value = detailMatch[1];
                    this.addressDetail.value = detailMatch[2];
                } else {
                    this.addressRoad.value = roadAndDetail;
                    this.addressDetail.value = '';
                }
            } else {
                this.addressRoad.value = log.address;
            }
            this.addressHidden.value = log.address;
        }

        // 구분 선택
        const subCategorySelect = document.getElementById('subCategory');
        if (subCategorySelect) {
            subCategorySelect.value = log.subCategory || '';
        }

        // 목적 선택
        const purposeSelect = document.getElementById('purpose');
        if (purposeSelect) {
            purposeSelect.value = log.purpose || '';
        }

        // 수령 방법 선택
        this.receptionMethodBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.method === log.receptionMethod) {
                btn.classList.add('active');
            }
        });
        if (this.receptionMethodInput) {
            this.receptionMethodInput.value = log.receptionMethod || '';
        }

        // 비고 필드
        const noteInput = document.getElementById('note');
        if (noteInput) {
            noteInput.value = log.note || '';
        }

        // 생산자 성명
        const producerNameInput = document.getElementById('producerName');
        if (producerNameInput) {
            producerNameInput.value = log.producerName || '';
        }

        // 의뢰 항목 초기화 후 데이터 채우기
        this.resetRequestItems();
        const firstRequestItem = this.requestItemsList?.querySelector('.request-item');
        if (firstRequestItem) {
            const addressInput = firstRequestItem.querySelector('.request-producer-address');
            const cropInput = firstRequestItem.querySelector('.request-crop-name');
            if (addressInput) addressInput.value = log.producerAddress || '';
            if (cropInput) cropInput.value = log.requestContent || '';
        }

        // 네비게이션 바 버튼 변경
        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '수정 완료';
            this.navSubmitBtn.classList.add('btn-edit-mode');
        }

        // 시료 접수 화면으로 전환
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('formView').classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn[data-view="form"]').classList.add('active');

        setTimeout(() => {
            this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ========================================
    // Override: 폼 초기화
    // ========================================

    resetForm() {
        this.editingId = null;
        this.form.reset();
        this.dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        if (this.addressPostcode) this.addressPostcode.value = '';
        if (this.addressRoad) this.addressRoad.value = '';
        if (this.addressDetail) this.addressDetail.value = '';
        if (this.addressHidden) this.addressHidden.value = '';

        // 의뢰 항목 초기화
        this.resetRequestItems();

        // 다음 접수번호 자동 생성
        this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }

    cancelEditMode() {
        this.editingId = null;

        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '접수 등록';
            this.navSubmitBtn.classList.remove('btn-edit-mode');
        }

        this.form.reset();
        const subCatSelect = document.getElementById('subCategory');
        if (subCatSelect) {
            subCatSelect.disabled = true;
            subCatSelect.innerHTML = sanitizeHTML('<option value="">상위 카테고리를 먼저 선택하세요</option>');
        }
        this.dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        this.addressPostcode.value = '';
        this.addressRoad.value = '';
        this.addressDetail.value = '';
        this.addressHidden.value = '';

        // 필지 초기화
        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) {
            this.parcelsContainer.innerHTML = '';
        }

        // 의뢰 항목 초기화
        this.resetRequestItems();

        // 다음 접수번호 자동 생성
        this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }

    // ========================================
    // Override: renderLogs (자체 페이지네이션)
    // ========================================

    renderLogs(logs) {
        this.tableBody.innerHTML = '';
        this.updateRecordCount();

        if (logs.length === 0) {
            this.emptyState.classList.remove('hidden');
            if (this.paginationContainer) this.paginationContainer.style.display = 'none';
            this.currentFlatRows = [];
            this.updatePaginationUI();
        } else {
            this.emptyState.classList.add('hidden');
            if (this.paginationContainer) this.paginationContainer.style.display = 'flex';

            this.currentFlatRows = this.prepareDataForRender(logs);

            this.totalPages = Math.ceil(this.currentFlatRows.length / this.itemsPerPage) || 1;
            if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

            this.renderCurrentPage();
        }
    }

    // ========================================
    // 데이터 평탄화 (하위 지번별로 행 분리)
    // ========================================

    flattenLogsForTable(logs) {
        const rows = [];

        logs.forEach(log => {
            if (log.parcels && log.parcels.length > 0) {
                let subLotIndex = 1;

                log.parcels.forEach(parcel => {
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ')
                        : '-';

                    let m2Total = 0;
                    let pyeongTotal = 0;
                    if (parcel.crops) {
                        parcel.crops.forEach(c => {
                            const area = parseFloat(c.area) || 0;
                            if (c.unit === 'pyeong') {
                                pyeongTotal += area;
                            } else {
                                m2Total += area;
                            }
                        });
                    }

                    const areaParts = [];
                    if (m2Total > 0) areaParts.push(`${m2Total.toLocaleString()}㎡`);
                    if (pyeongTotal > 0) areaParts.push(`${pyeongTotal.toLocaleString()}평`);
                    const areaDisplay = areaParts.length > 0 ? areaParts.join(' / ') : '-';

                    rows.push({
                        ...log,
                        _isFirstRow: subLotIndex === 1,
                        _subLotIndex: subLotIndex,
                        _displayNumber: log.receptionNumber,
                        _lotAddress: parcel.lotAddress || '-',
                        _cropsDisplay: cropsDisplay,
                        _areaDisplay: areaDisplay
                    });
                    subLotIndex++;

                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, idx) => {
                            const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);

                            const subLotCropsDisplay = subLotCrops.length > 0
                                ? subLotCrops.map(c => c.name).join(', ')
                                : '-';

                            let subM2Total = 0;
                            let subPyeongTotal = 0;
                            subLotCrops.forEach(c => {
                                const area = parseFloat(c.area) || 0;
                                if (c.unit === 'pyeong') {
                                    subPyeongTotal += area;
                                } else {
                                    subM2Total += area;
                                }
                            });

                            const subAreaParts = [];
                            if (subM2Total > 0) subAreaParts.push(`${subM2Total.toLocaleString()}㎡`);
                            if (subPyeongTotal > 0) subAreaParts.push(`${subPyeongTotal.toLocaleString()}평`);
                            const subAreaDisplay = subAreaParts.length > 0 ? subAreaParts.join(' / ') : '-';

                            rows.push({
                                ...log,
                                _isFirstRow: false,
                                _subLotIndex: subLotIndex,
                                _displayNumber: `${log.receptionNumber}-${idx + 1}`,
                                _lotAddress: lotAddress,
                                _cropsDisplay: subLotCropsDisplay,
                                _areaDisplay: subAreaDisplay
                            });
                            subLotIndex++;
                        });
                    }
                });
            } else {
                rows.push({
                    ...log,
                    _isFirstRow: true,
                    _subLotIndex: 1,
                    _displayNumber: log.receptionNumber,
                    _lotAddress: log.lotAddress || '-',
                    _subLot: '-',
                    _cropsDisplay: log.cropsDisplay || '-',
                    _areaDisplay: log.area ? parseFloat(log.area).toLocaleString() : '-'
                });
            }
        });

        return rows;
    }

    // ========================================
    // 페이지네이션 시스템
    // ========================================

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderCurrentPage();
        const tableWrapper = document.querySelector('.table-wrapper');
        if (tableWrapper) tableWrapper.scrollTop = 0;
    }

    renderCurrentPage() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageRows = this.currentFlatRows.slice(startIndex, endIndex);

        this.tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        pageRows.forEach((row) => {
            const isComplete = row.isComplete || false;
            const tr = document.createElement('tr');
            tr.className = isComplete ? 'row-completed' : '';
            const methodText = row.receptionMethod || '-';

            const addressFull = row.addressRoad || row.address || '';
            const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
            const zipcode = row.addressPostcode || (zipMatch ? zipMatch[1] : '');
            const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

            const applicantType = row.applicantType || '개인';
            const birthOrCorp = applicantType === '법인' ? (row.corpNumber || '-') : (row.birthDate || '-');

            const displayAddress = addressOnly && addressOnly !== '-' && SIDO_PATTERN.test(addressOnly)
                ? addressOnly.replace(SIDO_PATTERN, '')
                : (addressOnly || '-');

            const safeName = escapeHTML(row.name);
            const safeDisplayAddress = escapeHTML(displayAddress);
            const safeProducerName = escapeHTML(row.producerName || '-');
            const producerAddrWithoutSido = (row.producerAddress || '-').replace(/^경상북도\s*/, '');
            const safeProducerAddress = escapeHTML(producerAddrWithoutSido);
            const safeRequestContent = escapeHTML(row.requestContent || '-');
            const safePhone = escapeHTML(row.phoneNumber || '-');
            const safeNote = escapeHTML(row.note || '-');

            tr.dataset.id = row.id;

            // Checkbox column
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'col-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.dataset.id = row.id;
            tdCheckbox.appendChild(checkbox);
            tr.appendChild(tdCheckbox);

            // Complete button column
            const tdComplete = document.createElement('td');
            tdComplete.className = 'col-complete';
            const btnComplete = document.createElement('button');
            btnComplete.className = 'btn-complete' + (isComplete ? ' completed' : '');
            btnComplete.dataset.id = row.id;
            btnComplete.title = isComplete ? '완료 취소' : '완료';
            btnComplete.textContent = isComplete ? '✔' : '';
            tdComplete.appendChild(btnComplete);
            tr.appendChild(tdComplete);

            // Result button column
            const tdResult = document.createElement('td');
            tdResult.className = 'col-result';
            const btnResult = document.createElement('button');
            btnResult.className = 'btn-result';
            if (row.testResult === 'pass') {
                btnResult.classList.add('pass');
                btnResult.textContent = '불검출';
                btnResult.title = '불검출';
            } else if (row.testResult === 'fail') {
                btnResult.classList.add('fail');
                btnResult.textContent = '검출';
                btnResult.title = '검출';
            } else {
                btnResult.textContent = '-';
                btnResult.title = '미판정 (클릭하여 변경)';
            }
            btnResult.dataset.id = row.id;
            tdResult.appendChild(btnResult);
            tr.appendChild(tdResult);

            // Display number
            const tdNumber = document.createElement('td');
            tdNumber.textContent = row._displayNumber;
            tr.appendChild(tdNumber);

            // Date
            const tdDate = document.createElement('td');
            tdDate.textContent = row.date;
            tr.appendChild(tdDate);

            // Applicant type (hidden)
            const tdApplicantType = document.createElement('td');
            tdApplicantType.className = 'col-applicant-type col-hidden';
            tdApplicantType.textContent = applicantType;
            tr.appendChild(tdApplicantType);

            // Birth/Corp number (hidden)
            const tdBirthCorp = document.createElement('td');
            tdBirthCorp.className = 'col-birth-corp col-hidden';
            tdBirthCorp.textContent = birthOrCorp;
            tr.appendChild(tdBirthCorp);

            // Sub category
            const tdSubCategory = document.createElement('td');
            tdSubCategory.textContent = row.subCategory || '-';
            tr.appendChild(tdSubCategory);

            // Purpose
            const tdPurpose = document.createElement('td');
            tdPurpose.textContent = row.purpose || '-';
            tr.appendChild(tdPurpose);

            // Name (클릭 시 같은 이름 일괄 선택)
            const tdName = document.createElement('td');
            tdName.className = 'col-name';
            tdName.dataset.name = row.name || '';
            tdName.textContent = safeName;
            tdName.title = `"${safeName}" 클릭하면 같은 이름 일괄 선택`;
            tr.appendChild(tdName);

            // Zipcode (hidden)
            const tdZipcode = document.createElement('td');
            tdZipcode.className = 'col-zipcode col-hidden';
            tdZipcode.textContent = zipcode || '-';
            tr.appendChild(tdZipcode);

            // Address
            const tdAddress = document.createElement('td');
            tdAddress.className = 'col-address';
            tdAddress.textContent = safeDisplayAddress;
            tr.appendChild(tdAddress);

            // Producer name
            const tdProducerName = document.createElement('td');
            tdProducerName.textContent = safeProducerName;
            tr.appendChild(tdProducerName);

            // Producer address
            const tdProducerAddress = document.createElement('td');
            tdProducerAddress.className = 'col-producer-address';
            tdProducerAddress.textContent = safeProducerAddress;
            tr.appendChild(tdProducerAddress);

            // Request content
            const tdRequestContent = document.createElement('td');
            tdRequestContent.className = 'text-truncate';
            tdRequestContent.dataset.tooltip = safeRequestContent;
            tdRequestContent.textContent = safeRequestContent;
            tr.appendChild(tdRequestContent);

            // Phone
            const tdPhone = document.createElement('td');
            tdPhone.textContent = safePhone;
            tr.appendChild(tdPhone);

            // Reception method
            const tdMethod = document.createElement('td');
            tdMethod.textContent = methodText;
            tr.appendChild(tdMethod);

            // Note
            const tdNote = document.createElement('td');
            tdNote.className = 'col-note text-truncate';
            tdNote.dataset.tooltip = safeNote;
            tdNote.textContent = safeNote;
            tr.appendChild(tdNote);

            // Mail date
            const tdMailDate = document.createElement('td');
            tdMailDate.className = 'col-mail-date';
            tdMailDate.textContent = row.mailDate || '-';
            tr.appendChild(tdMailDate);

            // Action buttons
            const tdActions = document.createElement('td');
            const divActions = document.createElement('div');
            divActions.className = 'table-actions';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-edit';
            btnEdit.dataset.id = row.id;
            btnEdit.textContent = '수정';
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.dataset.id = row.id;
            btnDelete.textContent = '삭제';
            divActions.appendChild(btnEdit);
            divActions.appendChild(btnDelete);
            tdActions.appendChild(divActions);
            tr.appendChild(tdActions);
            fragment.appendChild(tr);
        });
        this.tableBody.appendChild(fragment);

        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const totalItems = this.currentFlatRows.length;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

        const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        if (this.paginationInfo) {
            this.paginationInfo.textContent = `${totalItems}건 중 ${startItem}-${endItem}`;
        }

        if (this.firstPageBtn) this.firstPageBtn.disabled = this.currentPage === 1;
        if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage === 1;
        if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        if (this.lastPageBtn) this.lastPageBtn.disabled = this.currentPage === this.totalPages;

        this.renderPageNumbers();
    }

    renderPageNumbers() {
        if (!this.pageNumbersContainer) return;
        if (this.totalPages <= 1) {
            this.pageNumbersContainer.innerHTML = '';
            return;
        }

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        const fragment = document.createDocumentFragment();

        if (startPage > 1) {
            fragment.appendChild(this.createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                fragment.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            fragment.appendChild(this.createPageButton(i));
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                fragment.appendChild(ellipsis);
            }
            fragment.appendChild(this.createPageButton(this.totalPages));
        }

        this.pageNumbersContainer.innerHTML = '';
        this.pageNumbersContainer.appendChild(fragment);
    }

    createPageButton(pageNum) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${pageNum === this.currentPage ? 'active' : ''}`;
        btn.textContent = pageNum;
        btn.addEventListener('click', () => this.goToPage(pageNum));
        return btn;
    }

    // ========================================
    // 자동 저장
    // ========================================

    async autoSaveToFile() {
        return await SampleUtils.performAutoSave({
            FileAPI: this.FileAPI,
            moduleKey: 'pesticide',
            data: this.sampleLogs,
            webFileHandle: this.autoSaveFileHandle,
            log: (...args) => this.log(...args)
        });
    }

    // ========================================
    // 검색 필터
    // ========================================

    extractReceptionNumber(receptionNumber) {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    filterAndRenderLogs() {
        const filteredLogs = this.sampleLogs.filter(log => {
            const matchesName = !this.currentSearchFilter.name ||
                log.name.toLowerCase().includes(this.currentSearchFilter.name);

            let matchesReception = true;
            if (this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo) {
                const logNum = this.extractReceptionNumber(log.receptionNumber);
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

        this.renderLogs(filteredLogs);
        this.updateSearchButtonState();
    }

    updateSearchButtonState() {
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        if (!openSearchModalBtn) return;

        const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
            this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo ||
            this.currentSearchFilter.completed;
        if (hasFilter) {
            openSearchModalBtn.classList.add('has-filter');
            openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색 중');
        } else {
            openSearchModalBtn.classList.remove('has-filter');
            openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색');
        }
    }

    // ========================================
    // 체크박스 관리
    // ========================================

    updateSelectAllState() {
        const rowCheckboxes = this.tableBody.querySelectorAll('.row-checkbox');
        const checkedBoxes = this.tableBody.querySelectorAll('.row-checkbox:checked');

        if (this.selectAllCheckbox) {
            if (rowCheckboxes.length === 0) {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === 0) {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === rowCheckboxes.length) {
                this.selectAllCheckbox.checked = true;
                this.selectAllCheckbox.indeterminate = false;
            } else {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = true;
            }
        }
    }

    updateSelectedCount() {
        const checkedBoxes = this.tableBody.querySelectorAll('.row-checkbox:checked');
        const count = checkedBoxes.length;
        this.log(`${count}개 항목 선택됨`);
    }

    getSelectedIds() {
        const checkedBoxes = this.tableBody.querySelectorAll('.row-checkbox:checked');
        return Array.from(checkedBoxes).map(cb => cb.dataset.id);
    }

    // ========================================
    // 등록 결과 모달
    // ========================================

    showRegistrationResult(logData) {
        this.currentRegistrationData = logData;

        const rows = [
            { label: '접수번호', value: logData.receptionNumber },
            { label: '접수일자', value: logData.date },
            { label: '성명', value: logData.name },
            { label: '전화번호', value: logData.phoneNumber },
            { label: '주소', value: logData.address || '-' },
            { label: '구분', value: logData.subCategory || '-' },
            { label: '목적 (용도)', value: logData.purpose || '-' },
            { label: '수령 방법', value: logData.receptionMethod || '-' },
            { label: '생산자 성명', value: logData.producerName || '-' },
            { label: '생산지 주소', value: logData.producerAddress || '-' },
            { label: '의뢰물품명', value: logData.requestContent || '-', isMultiline: true },
            { label: '비고', value: logData.note || '-' }
        ];

        BaseSampleManager.buildResultTable(this.resultTableBody, rows);
        this.registrationResultModal.classList.remove('hidden');
    }

    showMultipleRegistrationResult(logs) {
        const modal = document.getElementById('registrationResultModal');
        const tableBody = document.getElementById('registrationResultTable');

        if (!modal || !tableBody) return;

        const rows = logs.map(log => {
            const addrWithoutSido = (log.producerAddress || '-').replace(/^경상북도\s*/, '');
            return `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${log.receptionNumber}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${addrWithoutSido}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${log.requestContent || '-'}</td>
            </tr>
        `;
        }).join('');

        tableBody.innerHTML = sanitizeHTML(`
            <div style="margin-bottom: 16px; text-align: center;">
                <span style="font-size: 2rem;">✅</span>
                <p style="font-size: 1.1rem; font-weight: 600; color: #22C55E; margin: 8px 0;">${logs.length}건 접수 완료</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background: #F3E8FF;">
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #DDD6FE;">접수번호</th>
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #DDD6FE;">생산지 주소</th>
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #DDD6FE;">의뢰물품명</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <div style="margin-top: 12px; padding: 8px; background: #F0FDF4; border-radius: 6px; font-size: 0.85rem; color: #15803D;">
                <strong>접수일:</strong> ${logs[0].date} | <strong>의뢰인:</strong> ${logs[0].name} | <strong>생산자:</strong> ${logs[0].producerName || '-'}
            </div>
        `);

        modal.classList.remove('hidden');
    }

    closeRegistrationResultModal() {
        this.registrationResultModal.classList.add('hidden');
        this.currentRegistrationData = null;
    }

    // ========================================
    // 라벨 인쇄
    // ========================================

    openLabelPrintWithData(logs) {
        const labelData = logs.map(log => {
            const addressFull = log.address || '';
            const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
            const postalCode = zipMatch ? zipMatch[1] : '';
            const address = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

            return {
                name: log.name || '',
                address: address,
                postalCode: postalCode
            };
        });

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
    // 우편발송일자 일괄 입력
    // ========================================

    openMailDateModal(selectedIds) {
        this.pendingMailDateIds = selectedIds;
        const mailDateInput = document.getElementById('mailDateInput');
        const mailDateInfo = document.getElementById('mailDateInfo');
        const mailDateModal = document.getElementById('mailDateModal');
        const today = new Date().toISOString().split('T')[0];
        if (mailDateInput) mailDateInput.value = today;
        if (mailDateInfo) mailDateInfo.textContent = `선택한 ${selectedIds.length}건의 우편발송일자를 입력하세요.`;
        if (mailDateModal) mailDateModal.classList.remove('hidden');
    }

    closeMailDateModal() {
        const mailDateModal = document.getElementById('mailDateModal');
        if (mailDateModal) mailDateModal.classList.add('hidden');
        this.pendingMailDateIds = [];
    }

    // ========================================
    // 통계 기능
    // ========================================

    calculateStatistics() {
        const total = this.sampleLogs.length;
        const completed = this.sampleLogs.filter(log => log.isComplete).length;
        const pending = total - completed;

        const byPurpose = {};
        const purposeMapping = {
            '참고용': { label: '📝 참고용', class: 'purpose-reference' },
            '제출(급식)': { label: '🍽️ 제출(급식)', class: 'purpose-meal' },
            '인증(무농약)': { label: '🍃 인증(무농약)', class: 'purpose-nopesticide' },
            '인증(유기농)': { label: '♻️ 인증(유기농)', class: 'purpose-organic' },
            '인증(GAP)': { label: '✅ 인증(GAP)', class: 'purpose-gap' },
            '인증(글로벌GAP)': { label: '🌍 인증(글로벌GAP)', class: 'purpose-globalgap' },
            '기타': { label: '📦 기타', class: 'purpose-other' }
        };

        this.sampleLogs.forEach(log => {
            const purpose = log.purpose || '기타';
            if (!byPurpose[purpose]) {
                byPurpose[purpose] = { count: 0, ...purposeMapping[purpose] || { label: purpose, class: 'purpose-other' } };
            }
            byPurpose[purpose].count++;
        });

        const byMonth = {};
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

        const byReceptionMethod = {};
        const methodMapping = {
            '우편': { label: '📮 우편', class: 'method-mail' },
            '이메일': { label: '📧 이메일', class: 'method-email' },
            '팩스': { label: '📠 팩스', class: 'method-fax' },
            '직접방문': { label: '🚶 직접방문', class: 'method-visit' }
        };

        this.sampleLogs.forEach(log => {
            const method = log.receptionMethod || '기타';
            if (!byReceptionMethod[method]) {
                byReceptionMethod[method] = { count: 0, ...methodMapping[method] || { label: method, class: 'method-mail' } };
            }
            byReceptionMethod[method].count++;
        });

        return { total, completed, pending, byPurpose, byMonth, byQuarter, byReceptionMethod };
    }

    openStatisticsModal() {
        const statisticsModal = document.getElementById('statisticsModal');
        if (!statisticsModal) return;

        const stats = this.calculateStatistics();

        document.getElementById('statTotalCount').textContent = stats.total;
        document.getElementById('statCompletedCount').textContent = stats.completed;
        document.getElementById('statPendingCount').textContent = stats.pending;

        this.renderBarChart('statsByPurpose', stats.byPurpose, 'purpose');
        this.renderMonthlyChart('statsByMonth', stats.byMonth);
        this.renderQuarterlySummary('statsQuarterly', stats.byQuarter);
        this.renderBarChart('statsByReceptionMethod', stats.byReceptionMethod, 'method');

        statisticsModal.classList.remove('hidden');
    }

    renderBarChart(containerId, data, prefix) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1].count - a[1].count);

        if (entries.length === 0) {
            container.innerHTML = sanitizeHTML('<div class="stats-empty">데이터가 없습니다</div>');
            return;
        }

        const maxCount = Math.max(...entries.map(([, v]) => v.count));

        container.innerHTML = sanitizeHTML(entries.map(([key, value]) => {
            const percent = maxCount > 0 ? (value.count / maxCount) * 100 : 0;
            const showInside = percent > 20;

            return `
                <div class="stat-bar-item">
                    <span class="stat-bar-label">${value.label}</span>
                    <div class="stat-bar-wrapper">
                        <div class="stat-bar ${value.class}" style="width: ${percent}%"></div>
                        ${showInside ? `<span class="stat-bar-count">${value.count}건</span>` : ''}
                    </div>
                    ${!showInside ? `<span style="font-size: 0.75rem; color: #6b7280; min-width: 40px;">${value.count}건</span>` : ''}
                </div>
            `;
        }).join(''));
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
                    const completionRate = value.count > 0 ? ((value.completed / value.count) * 100).toFixed(0) : 0;
                    return `
                        <div class="quarterly-item">
                            <div class="quarterly-label">${value.label}</div>
                            <div class="quarterly-stats">
                                <span class="quarterly-count">${value.count}건</span>
                                <span class="quarterly-percent">(${percent}%)</span>
                            </div>
                            <div class="quarterly-completion">
                                <div class="completion-bar">
                                    <div class="completion-fill" style="width: ${completionRate}%"></div>
                                </div>
                                <span class="completion-text">완료율 ${completionRate}%</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `);
    }

    // ========================================
    // 엑셀 내보내기
    // ========================================

    exportToExcel() {
        if (this.sampleLogs.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const selectedIds = this.getSelectedIds();
        const logsToExport = selectedIds.length > 0
            ? this.sampleLogs.filter(log => selectedIds.includes(log.id))
            : this.sampleLogs;

        if (selectedIds.length > 0) {
            this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');
        }

        const reversedLogs = [...logsToExport].reverse();
        const excelData = [];

        reversedLogs.forEach(log => {
            const applicantType = log.applicantType || '개인';
            const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');
            const addressParts = parseAddressParts(log.addressRoad || log.address || '');
            const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

            if (log.parcels && log.parcels.length > 0) {
                log.parcels.forEach((parcel, pIdx) => {
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ')
                        : '-';

                    excelData.push({
                        '접수번호': log.receptionNumber,
                        '접수일자': log.date,
                        '법인여부': applicantType,
                        '생년월일/법인번호': birthOrCorp,
                        '구분': log.subCategory || '-',
                        '목적(용도)': log.purpose || '-',
                        '성명': log.name,
                        '전화번호': log.phoneNumber,
                        '우편번호': log.addressPostcode || '-',
                        '시도': addressParts.sido || '-',
                        '시군구': addressParts.sigungu || '-',
                        '읍면동': addressParts.eupmyeondong || '-',
                        '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                        '전체주소': fullAddress,
                        '필지 주소': parcel.lotAddress || '-',
                        '작물': cropsDisplay,
                        '수령 방법': log.receptionMethod || '-',
                        '비고': log.note || '-',
                        '완료여부': log.isComplete ? '완료' : '미완료',
                        '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                    });

                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, sIdx) => {
                            const subLotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);
                            const subLotCropsDisplay = subLotCrops.length > 0 ? subLotCrops.map(c => c.name).join(', ') : '-';

                            excelData.push({
                                '접수번호': `${log.receptionNumber}-${sIdx + 1}`,
                                '접수일자': log.date,
                                '법인여부': applicantType,
                                '생년월일/법인번호': birthOrCorp,
                                '구분': log.subCategory || '-',
                                '목적(용도)': log.purpose || '-',
                                '성명': log.name,
                                '전화번호': log.phoneNumber,
                                '우편번호': log.addressPostcode || '-',
                                '시도': addressParts.sido || '-',
                                '시군구': addressParts.sigungu || '-',
                                '읍면동': addressParts.eupmyeondong || '-',
                                '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                                '전체주소': fullAddress,
                                '필지 주소': subLotAddress,
                                '작물': subLotCropsDisplay,
                                '수령 방법': log.receptionMethod || '-',
                                '비고': log.note || '-',
                                '완료여부': log.isComplete ? '완료' : '미완료',
                                '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                            });
                        });
                    }
                });
            } else {
                excelData.push({
                    '접수번호': log.receptionNumber,
                    '접수일자': log.date,
                    '법인여부': applicantType,
                    '생년월일/법인번호': birthOrCorp,
                    '구분': log.subCategory || '-',
                    '목적(용도)': log.purpose || '-',
                    '성명': log.name,
                    '전화번호': log.phoneNumber,
                    '우편번호': log.addressPostcode || '-',
                    '시도': addressParts.sido || '-',
                    '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-',
                    '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                    '전체주소': fullAddress,
                    '필지 주소': log.producerAddress || log.lotAddress || '-',
                    '작물': log.requestContent || log.cropsDisplay || '-',
                    '수령 방법': log.receptionMethod || '-',
                    '비고': log.note || '-',
                    '완료여부': log.isComplete ? '완료' : '미완료',
                    '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                });
            }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 8 },
            { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
            { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
            { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 18 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, '시료접수대장');

        const today = new Date().toISOString().slice(0, 10);
        const filename = `잔류농약_접수대장_${today}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    // ========================================
    // 등록 결과 엑셀 내보내기
    // ========================================

    exportRegistrationResult() {
        if (!this.currentRegistrationData) return;

        const excelData = [
            { '항목': '접수번호', '내용': this.currentRegistrationData.receptionNumber },
            { '항목': '접수일자', '내용': this.currentRegistrationData.date },
            { '항목': '구분', '내용': this.currentRegistrationData.subCategory || '-' },
            { '항목': '목적 (용도)', '내용': this.currentRegistrationData.purpose || '-' },
            { '항목': '성명', '내용': this.currentRegistrationData.name },
            { '항목': '전화번호', '내용': this.currentRegistrationData.phoneNumber },
            { '항목': '주소', '내용': this.currentRegistrationData.address || '-' },
            { '항목': '수령 방법', '내용': this.currentRegistrationData.receptionMethod || '-' },
            { '항목': '생산자 성명', '내용': this.currentRegistrationData.producerName || '-' },
            { '항목': '생산지 주소', '내용': this.currentRegistrationData.producerAddress || '-' },
            { '항목': '의뢰물품명', '내용': this.currentRegistrationData.requestContent || '-' },
            { '항목': '비고', '내용': this.currentRegistrationData.note || '-' }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 20 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, ws, '등록결과');

        const fileName = `등록결과_${this.currentRegistrationData.receptionNumber}_${this.currentRegistrationData.name}.xlsx`;
        XLSX.writeFile(wb, fileName);
        this.showToast('엑셀 파일로 내보내기 완료', 'success');
    }

    // ========================================
    // 지역 선택 모달 (중복 리)
    // ========================================

    showRegionSelectionModal(parseResult, parcelId, inputElement) {
        const regionSelectionModal = document.getElementById('regionSelectionModal');
        if (!regionSelectionModal) return;

        this.currentRegionSelection = {
            result: parseResult,
            parcelId,
            inputElement
        };

        const duplicateVillageName = document.getElementById('duplicateVillageName');
        if (duplicateVillageName) {
            duplicateVillageName.textContent = parseResult.villageName;
        }

        const regionOptions = document.getElementById('regionOptions');
        if (regionOptions) {
            regionOptions.innerHTML = sanitizeHTML(parseResult.locations.map((location, index) => `
                <div class="region-option" data-index="${index}">
                    <div class="region-option-content">
                        <div class="region-option-title">${location.fullAddress}</div>
                        <div class="region-option-subtitle">${location.region} ${location.district}</div>
                    </div>
                    <div class="region-option-icon">→</div>
                </div>
            `).join(''));

            regionOptions.querySelectorAll('.region-option').forEach(option => {
                option.addEventListener('click', () => {
                    const index = parseInt(option.dataset.index, 10);
                    this.selectRegion(index);
                });
            });
        }

        regionSelectionModal.classList.remove('hidden');
    }

    selectRegion(index) {
        if (!this.currentRegionSelection) return;

        const location = this.currentRegionSelection.result.locations[index];
        const lotNumber = this.currentRegionSelection.result.lotNumber;
        const fullAddress = lotNumber ? `${location.fullAddress} ${lotNumber}` : location.fullAddress;

        this.currentRegionSelection.inputElement.value = fullAddress;
        this.closeRegionSelectionModal();
        this.showToast('지역이 선택되었습니다', 'success');
    }

    closeRegionSelectionModal() {
        const regionSelectionModal = document.getElementById('regionSelectionModal');
        if (regionSelectionModal) {
            regionSelectionModal.classList.add('hidden');
        }
        this.currentRegionSelection = null;
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

        // -- 전화번호 자동 하이픈 --
        const phoneNumberInput = document.getElementById('phoneNumber');
        window.SampleUtils.setupPhoneNumberInput(phoneNumberInput);

        // -- 법인여부 선택 --
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

        // -- 시료 타입 네비게이션 --
        const sampleTypeBtns = document.querySelectorAll('.type-btn');
        sampleTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sampleTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchView('form');
            });
        });

        // -- 빈 상태 "새 시료 접수하기" 버튼 --
        const btnGoForm = document.querySelector('.btn-go-form');
        if (btnGoForm) {
            btnGoForm.addEventListener('click', () => this.switchView('form'));
        }

        // -- 생산지 주소 자동완성 --
        this.setupProducerAddressAutocomplete();

        // -- 의뢰 항목 관리 --
        const btnAddRequestItem = document.getElementById('btnAddRequestItem');
        if (btnAddRequestItem) {
            btnAddRequestItem.addEventListener('click', () => this.addRequestItem());
        }

        // 첫 번째 항목 자동완성 초기화
        const firstRequestItem = this.requestItemsList?.querySelector('.request-item');
        if (firstRequestItem) {
            this.initRequestItemAutocomplete(firstRequestItem);
            const firstRemoveBtn = firstRequestItem.querySelector('.btn-remove-item');
            if (firstRemoveBtn) {
                firstRemoveBtn.addEventListener('click', () => {
                    if (this.requestItemsList.querySelectorAll('.request-item').length > 1) {
                        firstRequestItem.remove();
                        this.updateRequestItemNumbers();
                        this.updateRemoveButtonsVisibility();
                    }
                });
            }
        }

        // -- 테이블 이벤트 위임 (완료/판정/삭제/수정) --
        this.tableBody?.addEventListener('click', (e) => {
            // 완료 버튼
            const completeBtn = e.target.closest('.btn-complete');
            if (completeBtn) {
                const id = completeBtn.dataset.id;
                const logItem = this.sampleLogs.find(l => String(l.id) === id);
                if (logItem) {
                    const newCompletedStatus = !logItem.isComplete;
                    const receptionNumber = logItem.receptionNumber || '';
                    const baseNumber = receptionNumber.split('-').slice(0, 2).join('-');

                    const relatedLogs = this.sampleLogs.filter(l => {
                        const logBaseNumber = (l.receptionNumber || '').split('-').slice(0, 2).join('-');
                        return logBaseNumber === baseNumber && baseNumber !== '';
                    });

                    relatedLogs.forEach(relatedLog => {
                        relatedLog.isComplete = newCompletedStatus;
                        relatedLog.updatedAt = new Date().toISOString();

                        const relatedRows = this.tableBody.querySelectorAll(`tr[data-id="${relatedLog.id}"]`);
                        relatedRows.forEach(relatedRow => {
                            const relatedButton = relatedRow?.querySelector('.btn-complete');
                            if (relatedButton) {
                                if (newCompletedStatus) {
                                    relatedRow.classList.add('row-completed');
                                    relatedButton.classList.add('completed');
                                    relatedButton.textContent = '✔';
                                    relatedButton.title = '완료 취소';
                                } else {
                                    relatedRow.classList.remove('row-completed');
                                    relatedButton.classList.remove('completed');
                                    relatedButton.textContent = '';
                                    relatedButton.title = '완료';
                                }
                            }
                        });
                    });

                    this.saveLogs();

                    const count = relatedLogs.length;
                    if (newCompletedStatus) {
                        this.showToast(count > 1 ? `${count}개 시료가 완료 처리되었습니다` : '완료 처리되었습니다', 'success');
                    } else {
                        this.showToast(count > 1 ? `${count}개 시료가 완료 취소되었습니다` : '완료 취소되었습니다', 'success');
                    }
                }
            }

            // 판정 버튼
            const resultBtn = e.target.closest('.btn-result');
            if (resultBtn) {
                const id = resultBtn.dataset.id;
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
                    this.renderLogs(this.sampleLogs);
                }
            }

            // 삭제 버튼
            const deleteBtn = e.target.closest('.btn-delete');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                if (confirm('정말 삭제하시겠습니까?')) {
                    this.sampleLogs = this.sampleLogs.filter(item => item.id !== id);
                    this.saveLogs();
                    this.renderLogs(this.sampleLogs);

                    if (window.firestoreDb?.isEnabled()) {
                        window.firestoreDb.delete('pesticide', parseInt(this.selectedYear), id)
                            .catch(err => (window.logger?.error || console.error)('Firebase 삭제 실패:', err));
                    }

                    if (this.editingId === id) {
                        this.cancelEditMode();
                    }
                }
            }

            // 수정 버튼
            const editBtn = e.target.closest('.btn-edit');
            if (editBtn) {
                const id = editBtn.dataset.id;
                const logItem = this.sampleLogs.find(l => String(l.id) === id);
                if (logItem) {
                    this.populateFormForEdit(logItem);
                }
            }
        });

        // -- 체크박스 선택 --
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const rowCheckboxes = this.tableBody.querySelectorAll('.row-checkbox');
                rowCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                this.updateSelectedCount();
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const nameCell = e.target.closest('.col-name');
                if (nameCell && nameCell.dataset.name) {
                    const targetName = nameCell.dataset.name;
                    const rowCheckboxes = this.tableBody.querySelectorAll('.row-checkbox');
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

                    this.updateSelectAllState();
                    this.updateSelectedCount();
                }
            });
        }

        this.tableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                this.updateSelectAllState();
                this.updateSelectedCount();
            }
        });

        window.getSelectedIds = () => this.getSelectedIds();

        // -- 전체 보기/기본 보기 토글 --
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        const logTable = document.getElementById('logTable');
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                this.isFullView = !this.isFullView;
                const toggleText = viewToggleBtn.querySelector('.toggle-text');
                const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');

                if (this.isFullView) {
                    logTable.classList.add('full-view');
                    toggleText.textContent = '기본 보기';
                    toggleIcon.textContent = '👁️‍🗨️';
                    viewToggleBtn.classList.add('active');
                } else {
                    logTable.classList.remove('full-view');
                    toggleText.textContent = '전체 보기';
                    toggleIcon.textContent = '👁️';
                    viewToggleBtn.classList.remove('active');
                }
            });
        }

        // -- 검색 모달 --
        const listSearchModal = document.getElementById('listSearchModal');
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const closeSearchModalBtn = document.getElementById('closeSearchModal');
        const searchDateFromInput = document.getElementById('searchDateFromInput');
        const searchDateToInput = document.getElementById('searchDateToInput');
        const searchNameInput = document.getElementById('searchNameInput');
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput');
        const searchReceptionToInput = document.getElementById('searchReceptionToInput');
        const clearSearchDateBtn = document.getElementById('clearSearchDate');
        const clearSearchReceptionBtn = document.getElementById('clearSearchReception');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const applySearchBtn = document.getElementById('applySearchBtn');
        const completedFilter = document.getElementById('completedFilter');

        if (completedFilter) {
            completedFilter.addEventListener('change', () => {
                this.currentSearchFilter.completed = completedFilter.value;
                this.filterAndRenderLogs();
            });
        }

        if (openSearchModalBtn) {
            openSearchModalBtn.addEventListener('click', () => {
                searchDateFromInput.value = this.currentSearchFilter.dateFrom;
                searchDateToInput.value = this.currentSearchFilter.dateTo;
                searchNameInput.value = this.currentSearchFilter.name;
                searchReceptionFromInput.value = this.currentSearchFilter.receptionFrom;
                searchReceptionToInput.value = this.currentSearchFilter.receptionTo;
                listSearchModal.classList.remove('hidden');
                searchNameInput.focus();
            });
        }

        const closeSearchModal = () => { listSearchModal.classList.add('hidden'); };

        if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', closeSearchModal);
        if (listSearchModal) listSearchModal.querySelector('.modal-overlay')?.addEventListener('click', closeSearchModal);

        if (clearSearchDateBtn) {
            clearSearchDateBtn.addEventListener('click', () => {
                searchDateFromInput.value = '';
                searchDateToInput.value = '';
            });
        }

        if (clearSearchReceptionBtn) {
            clearSearchReceptionBtn.addEventListener('click', () => {
                searchReceptionFromInput.value = '';
                searchReceptionToInput.value = '';
            });
        }

        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', () => {
                searchDateFromInput.value = '';
                searchDateToInput.value = '';
                searchNameInput.value = '';
                searchReceptionFromInput.value = '';
                searchReceptionToInput.value = '';
                if (completedFilter) completedFilter.value = '';
                this.currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', completed: '' };
                this.filterAndRenderLogs();
                closeSearchModal();
            });
        }

        if (applySearchBtn) {
            applySearchBtn.addEventListener('click', () => {
                this.currentSearchFilter.dateFrom = searchDateFromInput.value;
                this.currentSearchFilter.dateTo = searchDateToInput.value;
                this.currentSearchFilter.name = searchNameInput.value.toLowerCase();
                this.currentSearchFilter.receptionFrom = searchReceptionFromInput.value;
                this.currentSearchFilter.receptionTo = searchReceptionToInput.value;
                this.filterAndRenderLogs();
                closeSearchModal();
            });
        }

        [searchNameInput, searchReceptionFromInput, searchReceptionToInput].forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') applySearchBtn.click();
                });
            }
        });

        // -- 라벨 인쇄 --
        const btnLabelPrint = document.getElementById('btnLabelPrint');
        if (btnLabelPrint) {
            btnLabelPrint.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) {
                    if (this.sampleLogs.length === 0) {
                        alert('인쇄할 데이터가 없습니다.');
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

        // -- 선택 삭제 --
        const btnBulkDelete = document.getElementById('btnBulkDelete');
        if (btnBulkDelete) {
            btnBulkDelete.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) {
                    alert('삭제할 항목을 선택해주세요.');
                    return;
                }
                if (!confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) {
                    return;
                }

                this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                this.saveLogs();
                this.renderLogs(this.sampleLogs);

                if (window.firestoreDb?.isEnabled()) {
                    Promise.all(selectedIds.map(id =>
                        window.firestoreDb.delete('pesticide', parseInt(this.selectedYear), id)
                    ))
                        .then(() => this.log('☁️ Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
                        .catch(err => (window.logger?.error || console.error)('Firebase 일괄 삭제 실패:', err));
                }

                if (this.selectAllCheckbox) {
                    this.selectAllCheckbox.checked = false;
                    this.selectAllCheckbox.indeterminate = false;
                }

                if (selectedIds.includes(this.editingId)) {
                    this.cancelEditMode();
                }

                this.showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
            });
        }

        // -- 우편발송일자 일괄 입력 --
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const mailDateModal = document.getElementById('mailDateModal');
        const closeMailDateModalBtn = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');

        const closeMailDateModalFn = () => this.closeMailDateModal();
        if (closeMailDateModalBtn) closeMailDateModalBtn.addEventListener('click', closeMailDateModalFn);
        if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', closeMailDateModalFn);
        if (mailDateModal) {
            mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', closeMailDateModalFn);
        }

        if (confirmMailDateBtn) {
            confirmMailDateBtn.addEventListener('click', () => {
                const mailDateInput = document.getElementById('mailDateInput');
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
                this.renderLogs(this.sampleLogs);

                if (this.selectAllCheckbox) {
                    this.selectAllCheckbox.checked = false;
                    this.selectAllCheckbox.indeterminate = false;
                }

                this.closeMailDateModal();
                this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) {
                    this.showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                    return;
                }
                this.openMailDateModal(selectedIds);
            });
        }

        // -- 통계 --
        const btnStatistics = document.getElementById('btnStatistics');
        const statisticsModal = document.getElementById('statisticsModal');
        const closeStatisticsModal = document.getElementById('closeStatisticsModal');
        const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

        if (btnStatistics) {
            btnStatistics.addEventListener('click', () => this.openStatisticsModal());
        }
        if (closeStatisticsModal) {
            closeStatisticsModal.addEventListener('click', () => statisticsModal.classList.add('hidden'));
        }
        if (closeStatisticsBtn) {
            closeStatisticsBtn.addEventListener('click', () => statisticsModal.classList.add('hidden'));
        }
        if (statisticsModal) {
            statisticsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    statisticsModal.classList.add('hidden');
                }
            });
        }

        // -- 엑셀 내보내기 --
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                if (window.encryptionManager?.isReady()) {
                    const verified = await window.encryptionManager.verifyPasswordForExport();
                    if (!verified) return;
                }
                this.exportToExcel();
            });
        }

        // -- JSON 저장/불러오기 --
        const saveJsonBtn = document.getElementById('saveJsonBtn');
        const loadJsonInput = document.getElementById('loadJsonInput');

        SampleUtils.setupJSONSaveHandler({
            buttonElement: saveJsonBtn,
            sampleType: SAMPLE_TYPE,
            getData: () => this.sampleLogs,
            FileAPI: this.FileAPI,
            filePrefix: '잔류농약접수대장',
            showToast: window.showToast
        });

        SampleUtils.setupJSONLoadHandler({
            inputElement: loadJsonInput,
            getData: () => this.sampleLogs,
            setData: (data) => { this.sampleLogs = data; },
            saveData: () => this.saveLogs(),
            renderData: () => this.renderLogs(this.sampleLogs),
            showToast: window.showToast,
            deduplicateById: true
        });

        // -- 전체화면 뷰어 --
        const openViewerBtn = document.getElementById('openViewerBtn');
        if (openViewerBtn) {
            openViewerBtn.addEventListener('click', () => {
                const viewerWindow = window.open('viewer.html', 'DataViewer',
                    'width=1400,height=800,scrollbars=yes,resizable=yes');
                if (!viewerWindow) {
                    alert('팝업이 차단되었습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
                }
            });
        }

        // -- 자동 저장 토글 --
        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'pesticide',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: window.showToast,
            log: (...args) => this.log(...args)
        });

        // 자동 저장 폴더/파일 선택 버튼 설정
        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'pesticide',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: window.showToast
        });

        // 페이지 로드 시 자동 저장 상태 복원
        const autoSaveEnabled = localStorage.getItem('pesticideAutoSaveEnabled') === 'true';
        this.log('🔧 자동저장 상태 확인:', { autoSaveEnabled, isElectron: window.isElectron, autoSavePath: this.FileAPI?.autoSavePath });
        if (autoSaveEnabled && window.isElectron && this.FileAPI?.autoSavePath) {
            this.log('🔧 Electron 환경에서 자동저장 활성화');
            SampleUtils.updateAutoSaveStatus('active');
            this.autoSaveToFile();
        }

        // -- 페이지네이션 이벤트 --
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value, 10);
                localStorage.setItem('pesticideItemsPerPage', this.itemsPerPage);
                this.currentPage = 1;
                this.renderCurrentPage();
            });
        }

        if (this.firstPageBtn) this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
        if (this.prevPageBtn) this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        if (this.nextPageBtn) this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        if (this.lastPageBtn) this.lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));

        // -- 폼 리셋 핸들러 --
        this.form.addEventListener('reset', () => {
            setTimeout(() => {
                if (this.addressPostcode) this.addressPostcode.value = '';
                if (this.addressRoad) this.addressRoad.value = '';
                if (this.addressDetail) this.addressDetail.value = '';
                if (this.addressHidden) this.addressHidden.value = '';
            }, 0);
        });

        // -- 네비게이션 바 초기화/접수등록 버튼 --
        if (this.navResetBtn) {
            this.navResetBtn.addEventListener('click', () => {
                const receptionNumber = document.getElementById('receptionNumber')?.value;
                const date = document.getElementById('date')?.value;

                this.form.reset();

                setTimeout(() => {
                    if (receptionNumber) {
                        document.getElementById('receptionNumber').value = receptionNumber;
                    }
                    if (date) {
                        document.getElementById('date').value = date;
                    }
                }, 10);
            });
        }

        if (this.navSubmitBtn) {
            this.navSubmitBtn.addEventListener('click', () => {
                this.form.requestSubmit();
            });
        }

        // -- 등록 결과 모달 이벤트 --
        const closeRegistrationModal = document.getElementById('closeRegistrationModal');
        const closeResultBtn = document.getElementById('closeResultBtn');
        const exportResultBtn = document.getElementById('exportResultBtn');
        const editResultBtn = document.getElementById('editResultBtn');

        if (closeRegistrationModal) {
            closeRegistrationModal.addEventListener('click', () => this.closeRegistrationResultModal());
        }
        if (closeResultBtn) {
            closeResultBtn.addEventListener('click', () => this.closeRegistrationResultModal());
        }
        if (this.registrationResultModal) {
            this.registrationResultModal.querySelector('.modal-overlay')?.addEventListener('click', () => this.closeRegistrationResultModal());
        }

        if (editResultBtn) {
            editResultBtn.addEventListener('click', () => {
                if (this.currentRegistrationData) {
                    const dataToEdit = this.currentRegistrationData;
                    this.closeRegistrationResultModal();
                    this.populateFormForEdit(dataToEdit);
                }
            });
        }

        if (exportResultBtn) {
            exportResultBtn.addEventListener('click', () => this.exportRegistrationResult());
        }

        // -- 지역 선택 모달 --
        const regionSelectionModal = document.getElementById('regionSelectionModal');
        const closeRegionModal = document.getElementById('closeRegionModal');
        const cancelRegionSelection = document.getElementById('cancelRegionSelection');

        if (closeRegionModal) {
            closeRegionModal.addEventListener('click', () => this.closeRegionSelectionModal());
        }
        if (cancelRegionSelection) {
            cancelRegionSelection.addEventListener('click', () => this.closeRegionSelectionModal());
        }
        if (regionSelectionModal) {
            const overlay = regionSelectionModal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.closeRegionSelectionModal());
            }
        }

        // -- 기존 작물 검색 모달 (기존 코드 호환, 숨김) --
        const cropModal = document.getElementById('cropModal');
        const openCropModalBtn = document.getElementById('openCropModalBtn');
        const closeCropModalBtn = document.getElementById('closeCropModal');
        const cancelCropBtn = document.getElementById('cancelCropSelection');

        if (typeof CROP_CATEGORIES !== 'undefined') {
            const cropCategoryFilter = document.getElementById('cropCategoryFilter');
            if (cropCategoryFilter) {
                CROP_CATEGORIES.forEach(cat => {
                    if (cat !== '전체') {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = cat;
                        cropCategoryFilter.appendChild(option);
                    }
                });
            }
        }

        if (openCropModalBtn) openCropModalBtn.style.display = 'none';

        const closeModal = () => { if (cropModal) cropModal.classList.add('hidden'); };
        if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', closeModal);
        if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeModal);
        if (cropModal) cropModal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);

        // -- 엑셀 가져오기 (ExcelImportManager) --
        const excelImporter = new ExcelImportManager({
            appFields: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'subCategory', label: '구분' },
                { key: 'purpose', label: '목적(용도)' },
                { key: 'name', label: '성명' },
                { key: 'phoneNumber', label: '전화번호' },
                { key: 'address', label: '주소' },
                { key: 'producerName', label: '생산자' },
                { key: 'producerAddress', label: '생산자 주소' },
                { key: 'requestContent', label: '의뢰내용(작물)' },
                { key: 'receptionMethod', label: '수령방법' },
                { key: 'note', label: '비고' }
            ],
            autoMapRules: {
                '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
                '접수일자': 'date', '날짜': 'date', '일자': 'date',
                '구분': 'subCategory', '분류': 'subCategory',
                '목적': 'purpose', '용도': 'purpose', '목적(용도)': 'purpose',
                '성명': 'name', '이름': 'name', '의뢰인': 'name',
                '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber',
                '주소': 'address', '의뢰인주소': 'address',
                '생산자': 'producerName', '생산자명': 'producerName', '생산농가': 'producerName',
                '생산자주소': 'producerAddress', '생산지': 'producerAddress', '생산자 주소': 'producerAddress',
                '의뢰내용': 'requestContent', '작물': 'requestContent', '작물명': 'requestContent', '검체명': 'requestContent',
                '수령방법': 'receptionMethod', '수령 방법': 'receptionMethod', '통보방법': 'receptionMethod',
                '비고': 'note', '메모': 'note'
            },
            templateConfig: {
                headers: ['접수번호', '구분', '목적(용도)', '생산자', '생산자 주소', '의뢰내용(작물)', '비고'],
                sampleRow: ['1', '생산물', '참고용', '홍길동', '봉화군 봉화읍 내성리', '사과', ''],
                colWidths: [
                    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
                    { wch: 30 }, { wch: 15 }, { wch: 20 }
                ],
                sheetName: '잔류농약시료',
                fileName: '잔류농약_가져오기_서식'
            },
            previewColumns: [
                { key: 'receptionNumber', label: '접수번호' },
                { key: 'date', label: '접수일자' },
                { key: 'subCategory', label: '구분' },
                { key: 'name', label: '성명' },
                { key: 'producerName', label: '생산자' },
                { key: 'requestContent', label: '의뢰내용' },
                { key: 'purpose', label: '목적' },
                { key: 'note', label: '비고' }
            ],
            getCommonData: () => ({
                date: document.getElementById('importDate').value || new Date().toISOString().slice(0, 10),
                name: document.getElementById('importName').value.trim(),
                phone: document.getElementById('importPhone').value.trim(),
                address: document.getElementById('importAddress').value.trim(),
                method: document.getElementById('importMethod').value,
                purpose: document.getElementById('importPurpose').value,
                now: new Date().toISOString()
            }),
            buildRecord: (getVal, parseExcelDate, common) => {
                const receptionNumber = getVal('receptionNumber') || '';
                const dateVal = getVal('date');
                const date = parseExcelDate(dateVal) || common.date;
                const subCategory = getVal('subCategory') || '생산물';
                const purpose = getVal('purpose') || common.purpose;
                const name = getVal('name') || common.name;
                const phoneNumber = getVal('phoneNumber') || common.phone;
                const address = getVal('address') || common.address;
                const producerName = getVal('producerName') || '';
                const producerAddress = getVal('producerAddress') || '';
                const requestContent = getVal('requestContent') || '';
                const receptionMethod = getVal('receptionMethod') || common.method;
                const note = getVal('note') || '';

                return {
                    id: crypto.randomUUID(),
                    receptionNumber,
                    date,
                    applicantType: '개인',
                    birthDate: '',
                    corpNumber: '',
                    name,
                    phoneNumber,
                    address,
                    addressPostcode: '',
                    addressRoad: address,
                    addressDetail: '',
                    subCategory,
                    purpose,
                    receptionMethod,
                    note,
                    producerName,
                    producerAddress,
                    requestContent,
                    completed: false,
                    createdAt: common.now,
                    updatedAt: common.now
                };
            },
            skipRowCheck: (record, rowIdx) => {
                if (!record.requestContent && !record.producerName && !record.name) {
                    return `행 ${rowIdx + 2}: 의뢰내용, 생산자, 성명이 모두 비어 있어 건너뜁니다.`;
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
                this.renderLogs(this.sampleLogs);
            }
        });
        excelImporter.init();
    }
}

// ========================================
// 인스턴스 생성 및 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const manager = new PesticideSampleManager();
    await manager.init();
    window.pesticideManager = manager;
});
