/**
 * @fileoverview 토양 시료 전용 스크립트 - TypeScript
 * SoilSampleManager - BaseSampleManager 상속
 */

import type { SoilSample, SoilLog, SoilParcel, SoilCrop, SoilSubLot, SoilFlatRow, SoilSearchFilter, ParsedParcelAddress, RegionSelectionModalData, SoilStatistics } from '../types/sample-types';
import { BaseSampleManager } from '../shared/BaseSampleManager';

// ========================================
// 상수 및 설정
// ========================================

const SAMPLE_TYPE = '토양';
const STORAGE_KEY = 'test_soilSampleLogs';
const AUTO_SAVE_FILE = 'soil-autosave.json';

// ========================================
// SoilSampleManager 클래스
// ========================================

class SoilSampleManager extends BaseSampleManager<SoilSample> {
    // Soil-specific state
    parcels: SoilParcel[];
    parcelIdCounter: number;
    currentRegistrationData: SoilLog | null;
    listViewStale: boolean;
    currentSearchFilter: SoilSearchFilter;
    isFullView: boolean;
    autoSaveFileHandle: FileSystemFileHandle | null;
    regionSelectionModalData: RegionSelectionModalData | null;
    editingLogId: string | null;
    pendingMailDateIds: string[];
    currentFlatRows: SoilFlatRow[];

    // Modal state
    currentParcelIdForCrop: string | null;
    tempCropAreas: SoilCrop[];
    currentSubLotParcelId: string | null;
    currentSubLotIndex: number | null;
    tempSelectedCrops: SoilCrop[];
    confirmedCrops: SoilCrop[];

    // Soil-specific DOM refs
    dateInput: HTMLInputElement | null;
    parcelsContainer: HTMLElement | null;
    addParcelBtn: HTMLButtonElement | null;
    parcelsDataInput: HTMLInputElement | null;
    emptyParcels: HTMLElement | null;
    paginationContainer: HTMLElement | null;
    receptionNumberInput: HTMLInputElement | null;
    subCategorySelect: HTMLSelectElement | null;
    purposeSelect: HTMLSelectElement | null;
    receptionMethodBtns: NodeListOf<HTMLButtonElement> | null;
    receptionMethodInput: HTMLInputElement | null;
    navSubmitBtn: HTMLButtonElement | null;
    navResetBtn: HTMLButtonElement | null;
    selectAllCheckbox: HTMLInputElement | null;
    logTable: HTMLTableElement | null;
    listViewTitle: HTMLElement | null;
    paginationInfo: HTMLElement | null;
    itemsPerPageSelect: HTMLSelectElement | null;
    pageNumbersContainer: HTMLElement | null;
    firstPageBtn: HTMLButtonElement | null;
    prevPageBtn: HTMLButtonElement | null;
    nextPageBtn: HTMLButtonElement | null;
    lastPageBtn: HTMLButtonElement | null;
    addressPostcode: HTMLInputElement | null;
    addressRoad: HTMLInputElement | null;
    addressDetail: HTMLInputElement | null;
    addressHidden: HTMLInputElement | null;
    addressManager: any;
    cropAreaModal: HTMLElement | null;
    cropAreaList: HTMLElement | null;
    addCropAreaBtn: HTMLButtonElement | null;
    confirmCropAreaBtn: HTMLButtonElement | null;
    cancelCropAreaBtn: HTMLButtonElement | null;
    closeCropAreaModalBtn: HTMLButtonElement | null;
    registrationResultModal: HTMLElement | null;
    resultTableBody: HTMLTableSectionElement | null;
    listSearchModal: HTMLElement | null;
    statisticsModal: HTMLElement | null;
    mailDateModal: HTMLElement | null;
    regionSelectionModal: HTMLElement | null;

    constructor() {
        super({
            moduleKey: 'soil',
            moduleName: '토양',
            storageKey: STORAGE_KEY,
            sampleType: SAMPLE_TYPE,
            autoSaveFile: AUTO_SAVE_FILE,
            debug: !!window.DEBUG
        });

        // Soil-specific state
        this.parcels = [];
        this.parcelIdCounter = 0;
        this.currentRegistrationData = null;
        this.listViewStale = true;
        this.currentSearchFilter = {
            dateFrom: '',
            dateTo: '',
            name: '',
            receptionFrom: '',
            receptionTo: '',
            lot: '',
            purpose: '',
            completed: 'incomplete'
        };
        this.isFullView = false;
        this.autoSaveFileHandle = null;
        this.regionSelectionModalData = null;
        this.editingLogId = null;
        this.pendingMailDateIds = [];

        // Pagination state (soil uses its own pagination, NOT PaginationManager)
        this.currentFlatRows = [];

        // Modal state
        this.currentParcelIdForCrop = null;
        this.tempCropAreas = [];
        this.currentSubLotParcelId = null;
        this.currentSubLotIndex = null;

        // Crop modal state (legacy)
        this.tempSelectedCrops = [];
        this.confirmedCrops = [];

        // Soil-specific DOM refs (set in cacheElements)
        this.dateInput = null;
        this.parcelsContainer = null;
        this.addParcelBtn = null;
        this.parcelsDataInput = null;
        this.emptyParcels = null;
        this.paginationContainer = null;
        this.receptionNumberInput = null;
        this.subCategorySelect = null;
        this.purposeSelect = null;
        this.receptionMethodBtns = null;
        this.receptionMethodInput = null;
        this.navSubmitBtn = null;
        this.navResetBtn = null;
        this.selectAllCheckbox = null;
        this.logTable = null;
        this.listViewTitle = null;

        // Pagination DOM refs
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

        // Modal refs
        this.cropAreaModal = null;
        this.cropAreaList = null;
        this.addCropAreaBtn = null;
        this.confirmCropAreaBtn = null;
        this.cancelCropAreaBtn = null;
        this.closeCropAreaModalBtn = null;
        this.registrationResultModal = null;
        this.resultTableBody = null;
        this.listSearchModal = null;
        this.statisticsModal = null;
        this.mailDateModal = null;
        this.regionSelectionModal = null;

        // Area formatting from shared utils
        if (window.SampleUtils) {
            this.formatArea = window.SampleUtils.formatArea;
            this.getUnitLabel = window.SampleUtils.getUnitLabel;
            this.formatAreaWithUnit = window.SampleUtils.formatAreaWithUnit;
        }

        // soil 전용 엑셀 저장 함수 추가
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

        // Override different IDs (soil uses logTableBody / emptyState)
        this.tableBody = document.getElementById('logTableBody');
        this.emptyState = document.getElementById('emptyState');

        // Soil-specific elements
        this.dateInput = document.getElementById('date');
        this.parcelsContainer = document.getElementById('parcelsContainer');
        this.addParcelBtn = document.getElementById('addParcelBtn');
        this.parcelsDataInput = document.getElementById('parcelsData');
        this.emptyParcels = document.getElementById('emptyParcels');
        this.paginationContainer = document.getElementById('pagination');
        this.receptionNumberInput = document.getElementById('receptionNumber');
        this.subCategorySelect = document.getElementById('subCategory');
        this.purposeSelect = document.getElementById('purpose');
        this.receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        this.receptionMethodInput = document.getElementById('receptionMethod');
        this.navSubmitBtn = document.getElementById('navSubmitBtn');
        this.navResetBtn = document.getElementById('navResetBtn');
        this.selectAllCheckbox = document.getElementById('selectAll');
        this.logTable = document.getElementById('logTable');
        this.listViewTitle = document.getElementById('listViewTitle');

        // Pagination elements
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

        // Modal refs
        this.cropAreaModal = document.getElementById('cropAreaModal');
        this.cropAreaList = document.getElementById('cropAreaList');
        this.addCropAreaBtn = document.getElementById('addCropAreaBtn');
        this.confirmCropAreaBtn = document.getElementById('confirmCropAreaBtn');
        this.cancelCropAreaBtn = document.getElementById('cancelCropAreaBtn');
        this.closeCropAreaModalBtn = document.getElementById('closeCropAreaModal');
        this.registrationResultModal = document.getElementById('registrationResultModal');
        this.resultTableBody = document.getElementById('resultTableBody');
        this.listSearchModal = document.getElementById('listSearchModal');
        this.statisticsModal = document.getElementById('statisticsModal');
        this.mailDateModal = document.getElementById('mailDateModal');
        this.regionSelectionModal = document.getElementById('regionSelectionModal');
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

        // 페이지당 항목 수 초기화
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.value = this.itemsPerPage;
        }
    }

    // ========================================
    // Override: 페이지네이션 (soil은 PaginationManager 사용 안함)
    // ========================================

    initPagination() {
        // soil은 자체 페이지네이션 사용 - PaginationManager 초기화 건너뜀
        this.itemsPerPage = parseInt(localStorage.getItem('soilItemsPerPage'), 10) || 100;
    }

    // ========================================
    // Override: completed 필드 마이그레이션 (soil은 isComplete 사용)
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
    // Override: 렌더링 전 데이터 가공 (flattenLogsForTable)
    // ========================================

    prepareDataForRender(logs) {
        return this.flattenLogsForTable(logs);
    }

    // ========================================
    // Override: switchView (listViewStale 로직)
    // ========================================

    closeAllAutocomplete() {
        document.querySelectorAll('.crop-autocomplete-list.show, .lot-address-autocomplete-list.show')
            .forEach(el => el.classList.remove('show'));
    }

    switchView(viewName) {
        this.closeAllAutocomplete();
        const views = document.querySelectorAll('.view');
        const navItems = document.querySelectorAll('.nav-btn');

        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        // 목록 뷰로 전환 시 데이터 변경이 있을 때만 새로고침
        if (viewName === 'list' && this.listViewStale) {
            this.filterAndRenderLogs();
            this.listViewStale = false;
        }
    }

    // ========================================
    // Override: updateRecordCount (no "총" prefix)
    // ========================================

    updateRecordCount() {
        if (this.recordCountEl) {
            this.recordCountEl.textContent = `${this.sampleLogs.length}건`;
        }
    }

    // ========================================
    // Override: setupReceptionMethod (different selectors)
    // ========================================

    setupReceptionMethod() {
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
    // Override: setupEventListeners
    // ========================================

    setupEventListeners() {
        // 네비게이션
        this.setupNavigation();

        // 폼 이벤트
        this.setupFormEvents();

        // 연도 선택
        this.setupYearSelection();

        // 전화번호 포맷팅
        this.setupPhoneFormatting();

        // 수령 방법 선택
        this.setupReceptionMethod();
    }

    // ========================================
    // Override: setupPhoneFormatting
    // ========================================

    setupPhoneFormatting() {
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput && window.SampleUtils?.setupPhoneNumberInput) {
            window.SampleUtils.setupPhoneNumberInput(phoneInput);
        }
    }

    // ========================================
    // Override: setupFormEvents
    // ========================================

    setupFormEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitForm();
            });

            // 폼 리셋 시 필지도 초기화
            this.form.addEventListener('reset', () => {
                setTimeout(() => {
                    this.parcels = [];
                    this.parcelIdCounter = 0;
                    if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';
                    this.addParcel();
                }, 0);
            });
        }
    }

    // ========================================
    // Override: setupYearSelection (extra auto-save logic)
    // ========================================

    setupYearSelection() {
        const yearSelect = document.getElementById('yearSelect');
        const listYearSelect = document.getElementById('listYearSelect');

        const handleYearChange = async (e) => {
            this.syncYearSelects(e.target.value);
            await this.loadYearData(e.target.value);
            // 로컬 모드에서만 auto-save 로드 (Firebase 모드에서는 로드 안함)
            if (window.isElectron && this.FileAPI && !window.firebaseConfig?.isEnabled()) {
                await this.loadAutoSaveForSelectedYear();
            }
            this.showToast(`${e.target.value}년 데이터를 불러왔습니다.`, 'success');
        };

        if (yearSelect) yearSelect.addEventListener('change', handleYearChange);
        if (listYearSelect) listYearSelect.addEventListener('change', handleYearChange);
    }

    // ========================================
    // Override: 연도 변경 hook
    // ========================================

    onYearChange(newYear) {
        this.updateListViewTitle();
    }

    // ========================================
    // Override: saveLogs (soil-specific: sessionStorage)
    // ========================================

    async saveLogs() {
        const yearStorageKey = this.getStorageKey(this.selectedYear);
        this.listViewStale = true;

        // ID가 없는 항목에 ID 추가
        this.sampleLogs = this.sampleLogs.map(item => ({
            ...item,
            id: item.id || SampleUtils.generateUUID()
        }));

        // 로컬 저장 (Firebase는 호출자에서 개별 변경분만 저장 — Quota 절감)
        localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));
        this.log('💾 로컬 저장 완료:', this.sampleLogs.length, '건');

        // 자동 저장 실행
        const autoSaveEnabled = localStorage.getItem('soilAutoSaveEnabled') === 'true';
        if (autoSaveEnabled && (window.isElectron ? this.FileAPI?.autoSavePath : this.autoSaveFileHandle)) {
            this.autoSaveToFile();
        }

        this.updateRecordCount();

        sessionStorage.setItem('lastSaveTime', new Date().toISOString());
    }

    // ========================================
    // Firebase 헬퍼 메서드 (Quota 절감용 개별/배치 저장)
    // ========================================

    firebaseSaveRecords(logs: SoilLog | SoilLog[]): void {
        if (!window.firestoreDb?.isEnabled()) return;
        const arr = Array.isArray(logs) ? logs : [logs];
        const year = parseInt(this.selectedYear);
        const promises = arr
            .filter(log => log.id)
            .map(log => window.firestoreDb!.save('soil', year, String(log.id), log as unknown as Record<string, unknown>));
        Promise.allSettled(promises).then(results => {
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                (window.logger?.error || console.error)('Firebase 저장 실패:', failed.length, '건');
                this.showToast(`클라우드 동기화 ${failed.length}건 실패`, 'warning');
            }
        });
    }

    firebaseDeleteRecords(ids: string | string[]): void {
        if (!window.firestoreDb?.isEnabled()) return;
        const arr = Array.isArray(ids) ? ids : [ids];
        const year = parseInt(this.selectedYear);
        const promises = arr.map(id => window.firestoreDb!.delete('soil', year, String(id)));
        Promise.allSettled(promises).then(results => {
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                (window.logger?.error || console.error)('Firebase 삭제 실패:', failed.length, '건');
            }
        });
    }

    firebaseBatchSync(): void {
        if (!window.firestoreDb?.isEnabled()) return;
        const snapshot = [...this.sampleLogs];
        window.firestoreDb.batchSave('soil', parseInt(this.selectedYear), snapshot as unknown as Record<string, unknown>[])
            .then(() => this.log('Firebase 전체 동기화 완료:', snapshot.length, '건'))
            .catch((err: unknown) => {
                (window.logger?.error || console.error)('Firebase 전체 동기화 실패:', err);
                this.showToast('클라우드 전체 동기화 실패', 'warning');
            });
    }

    // ========================================
    // Override: deleteSample (soil-specific: inline Firebase delete)
    // ========================================

    async deleteSample(id, receptionNumber?) {
        this.sampleLogs = this.sampleLogs.filter(log => String(log.id) !== String(id));
        await this.saveLogs();
        this.filterAndRenderLogs();

        // Firebase에서도 삭제
        this.firebaseDeleteRecords(id);

        // 삭제한 항목이 수정 중이던 항목이면 수정 모드 취소
        if (String(this.editingLogId) === String(id)) {
            this.cancelEditMode();
        }

        // 삭제된 접수번호의 기본번호를 입력란에 세팅 (재입력 편의)
        if (receptionNumber && this.receptionNumberInput) {
            const baseNumber = String(receptionNumber).split('-')[0];
            const stillExists = this.sampleLogs.some(log =>
                (log.receptionNumber || '').split('-')[0] === baseNumber
            );
            if (!stillExists) {
                this.receptionNumberInput.value = baseNumber;
            }
        }
    }

    async deleteGroup(groupId, baseReceptionNumber?) {
        const groupLogs = this.sampleLogs.filter(log => log.groupId === groupId);
        const deleteIds = groupLogs.map(log => log.id);

        this.sampleLogs = this.sampleLogs.filter(log => log.groupId !== groupId);
        await this.saveLogs();
        this.filterAndRenderLogs();

        // Firebase에서도 삭제
        this.firebaseDeleteRecords(deleteIds);

        if (deleteIds.map(String).includes(String(this.editingLogId))) this.cancelEditMode();

        // 삭제된 접수번호를 입력란에 세팅 (재입력 편의)
        if (baseReceptionNumber && this.receptionNumberInput) {
            this.receptionNumberInput.value = baseReceptionNumber;
        }

        this.showToast(`${groupLogs.length}건이 삭제되었습니다. 접수번호 ${baseReceptionNumber}번으로 재입력할 수 있습니다.`, 'success');
    }

    // ========================================
    // Override: renderLogs (soil-specific pagination)
    // ========================================

    renderLogs(logs) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        this.updateRecordCount();

        if (!logs || logs.length === 0) {
            if (this.emptyState) this.emptyState.classList.remove('hidden');
            if (this.paginationContainer) this.paginationContainer.style.display = 'none';
            this.currentFlatRows = [];
            this.updatePaginationUI();
            return;
        }

        if (this.emptyState) this.emptyState.classList.add('hidden');
        if (this.paginationContainer) this.paginationContainer.style.display = 'flex';

        // 접수번호 기준 오름차순 정렬
        const sortedLogs = [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });

        // 데이터 평탄화
        this.currentFlatRows = this.flattenLogsForTable(sortedLogs);

        // 페이지네이션 계산
        this.totalPages = Math.ceil(this.currentFlatRows.length / this.itemsPerPage) || 1;
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        this.renderCurrentPage();
    }

    // ========================================
    // Override: setupTableEventDelegation (soil uses its own)
    // ========================================

    setupTableEventDelegation() {
        // soil handles table events in setupTypeSpecificEvents via direct delegation
        // Do not call base class setupTableEventDelegation
    }

    // ========================================
    // 접수번호 생성
    // ========================================

    generateNextReceptionNumber() {
        let maxNumber = 0;
        this.sampleLogs.forEach(log => {
            if (log.receptionNumber && log.subCategory !== '성토') {
                const baseNumber = log.receptionNumber.split('-')[0];
                if (baseNumber.startsWith('F')) return;
                const num = parseInt(baseNumber, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        const nextNumber = maxNumber + 1;
        this.log('다음 접수번호 생성:', nextNumber, '(기존 최대:', maxNumber, ')');
        return String(nextNumber);
    }

    generateNextFillReceptionNumber() {
        let maxNumber = 0;
        this.sampleLogs.forEach(log => {
            if (log.receptionNumber && log.subCategory === '성토') {
                const baseNumber = log.receptionNumber.split('-')[0];
                const numStr = baseNumber.replace('F', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        const nextNumber = maxNumber + 1;
        this.log('다음 성토 접수번호 생성: F' + nextNumber, '(기존 최대:', maxNumber, ')');
        return `F${nextNumber}`;
    }

    // ========================================
    // 접수번호 가져오기 (연도 제외)
    // ========================================

    getReceptionNumber() {
        if (!this.receptionNumberInput) {
            (window.logger?.warn || console.warn)('접수번호 입력란을 찾을 수 없습니다');
            return '';
        }
        const value = this.receptionNumberInput.value.trim();
        if (!value) {
            (window.logger?.warn || console.warn)('접수번호가 비어있습니다');
            return '';
        }
        const parts = value.split('-');
        if (parts.length >= 2) {
            const numberPart = parts.slice(1).join('-');
            this.log('접수번호 추출:', value, '->', numberPart);
            return numberPart;
        }
        this.log('접수번호 형식 확인:', value);
        return value;
    }

    // ========================================
    // 필지 관리 시스템
    // ========================================

    addParcel() {
        this.log('필지 추가 함수 호출됨');
        const parcelId = `parcel-${this.parcelIdCounter++}`;
        const parcel = {
            id: parcelId,
            lotAddress: '',
            isMountain: false,
            subLots: [],
            crops: [],
            category: '',
            purpose: '',
            note: ''
        };
        this.parcels.push(parcel);
        this.log('생성된 필지 ID:', parcelId, '전체 필지 개수:', this.parcels.length);

        this.renderParcelCard(parcel, this.parcels.length);
        this.updateParcelsData();
        this.updateEmptyParcelsState();
    }

    removeParcel(parcelId) {
        if (this.parcels.length > 1) {
            this.parcels = this.parcels.filter(p => p.id !== parcelId);
            const el = document.getElementById(parcelId);
            if (el) el.remove();
            this.updateParcelNumbers();
            this.updateParcelsData();
        } else {
            alert('최소 1개의 필지가 필요합니다.');
        }
    }

    updateEmptyParcelsState() {
        if (this.emptyParcels) {
            if (this.parcels.length === 0) {
                this.emptyParcels.style.display = 'block';
            } else {
                this.emptyParcels.style.display = 'none';
            }
        }
    }

    updateParcelNumbers() {
        if (!this.parcelsContainer) return;
        const cards = this.parcelsContainer.querySelectorAll('.parcel-card');
        cards.forEach((card, idx) => {
            card.querySelector('h4').textContent = `필지 ${idx + 1}`;
        });
    }

    updateParcelsData() {
        if (this.parcelsDataInput) {
            this.parcelsDataInput.value = JSON.stringify(this.parcels);
        }
    }

    updateAllParcelNumbers() {
        this.parcels.forEach((parcel) => {
            this.updateSubLotsDisplay(parcel.id);
            this.updateCropsAreaDisplay(parcel.id);
        });
    }

    updateParcelCardsMode(isFillMode) {
        if (this.parcelsContainer) {
            if (isFillMode) {
                this.parcelsContainer.classList.add('fill-mode');
            } else {
                this.parcelsContainer.classList.remove('fill-mode');
            }
        }
    }

    // ========================================
    // 필지 카드 렌더링
    // ========================================

    renderParcelCard(parcel, index) {
        this.log('필지 카드 렌더링 시작:', parcel.id, 'index:', index);

        const card = document.createElement('div');
        card.className = 'parcel-card';
        card.id = parcel.id;

        const firstCrop = parcel.crops[0] || { name: '', area: '' };
        const parcelNumber = index;

        const safeLotAddress = escapeHTML(parcel.lotAddress);
        const safeCropName = escapeHTML(firstCrop.name);
        const parcelCategory = parcel.category || '';
        const parcelPurpose = parcel.purpose || '';
        const formatArea = this.formatArea || window.SampleUtils?.formatArea || ((v) => v);
        const formatAreaWithUnit = this.formatAreaWithUnit || window.SampleUtils?.formatAreaWithUnit || ((v) => v);

        card.innerHTML = sanitizeHTML(`
            <div class="parcel-card-header">
                <h4>필지 ${parcelNumber}</h4>
                <div class="parcel-header-selects">
                    <select class="parcel-category-select" data-id="${parcel.id}" id="parcel-category-${parcel.id}">
                        <option value="">구분</option>
                        <option value="논" ${parcelCategory === '논' ? 'selected' : ''}>논</option>
                        <option value="밭" ${parcelCategory === '밭' ? 'selected' : ''}>밭</option>
                        <option value="과수" ${parcelCategory === '과수' ? 'selected' : ''}>과수</option>
                        <option value="시설" ${parcelCategory === '시설' ? 'selected' : ''}>시설</option>
                        <option value="임야" ${parcelCategory === '임야' ? 'selected' : ''}>임야</option>
                        <option value="성토" ${parcelCategory === '성토' ? 'selected' : ''}>성토</option>
                    </select>
                    <select class="parcel-purpose-select" data-id="${parcel.id}" id="parcel-purpose-${parcel.id}">
                        <option value="">용도</option>
                        <option value="일반재배" ${parcelPurpose === '일반재배' ? 'selected' : ''}>일반재배</option>
                        <option value="무농약" ${parcelPurpose === '무농약' ? 'selected' : ''}>무농약</option>
                        <option value="유기" ${parcelPurpose === '유기' ? 'selected' : ''}>유기</option>
                        <option value="GAP" ${parcelPurpose === 'GAP' ? 'selected' : ''}>GAP</option>
                        <option value="저탄소" ${parcelPurpose === '저탄소' ? 'selected' : ''}>저탄소</option>
                    </select>
                </div>
                <button type="button" class="btn-remove-parcel" data-id="${parcel.id}">삭제</button>
            </div>
            <div class="parcel-form-grid">
                <div class="parcel-left-column">
                    <div class="parcel-form-group">
                        <label for="lot-address-${parcel.id}">
                            필지 주소 (주 지번) <span class="label-hint">* 리+지번 입력 후 Enter</span>
                        </label>
                        <div class="lot-address-row">
                            <div class="lot-address-autocomplete-wrapper">
                                <input type="text" class="lot-address-input"
                                       id="lot-address-${parcel.id}"
                                       name="lot-address-${parcel.id}"
                                       data-id="${parcel.id}"
                                       placeholder="예: 문단리 224, 문단리 산 423"
                                       value="${safeLotAddress}">
                                <ul class="lot-address-autocomplete-list" id="lotAutocomplete-${parcel.id}"></ul>
                            </div>
                        </div>
                    </div>
                    <div class="crop-area-row">
                        <div class="parcel-form-group">
                            <label for="crop-direct-${parcel.id}">작물명</label>
                            <div class="crop-autocomplete-wrapper">
                                <input type="text" class="crop-direct-input"
                                       id="crop-direct-${parcel.id}"
                                       name="crop-direct-${parcel.id}"
                                       data-id="${parcel.id}"
                                       placeholder="예: 고추"
                                       value="${safeCropName}">
                                <ul class="crop-autocomplete-list" id="autocomplete-direct-${parcel.id}"></ul>
                            </div>
                        </div>
                        <div class="parcel-form-group">
                            <label for="area-direct-${parcel.id}">면적</label>
                            <div class="area-input-group">
                                <input type="number" class="area-direct-input"
                                       id="area-direct-${parcel.id}"
                                       name="area-direct-${parcel.id}"
                                       data-id="${parcel.id}"
                                       placeholder="면적"
                                       value="${firstCrop.area}">
                                <div class="area-unit-toggle" id="area-unit-${parcel.id}" data-id="${parcel.id}" data-unit="m2">
                                    <button type="button" class="unit-btn active" data-value="m2">㎡</button>
                                    <button type="button" class="unit-btn" data-value="pyeong">평</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn-add-crop-compact" data-id="${parcel.id}">
                        <span>+</span> 추가 작물
                    </button>
                    <div class="crops-area-container" id="cropsArea-${parcel.id}">
                        ${parcel.crops.slice(1).map((crop, idx) => {
                            const safeCropNameCard = escapeHTML(crop.name);
                            return `
                                <div class="crop-area-item" data-index="${idx + 1}">
                                    <span class="crop-name">${safeCropNameCard}</span>
                                    <span class="crop-area">${formatArea(crop.area)} m²</span>
                                    <button type="button" class="remove-crop-area">&times;</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="parcel-right-column">
                    <div class="parcel-form-group">
                        <label for="sub-lot-${parcel.id}">하위 필지</label>
                        <div class="sub-lot-input-wrapper">
                            <div class="lot-address-autocomplete-wrapper">
                                <input type="text" class="sub-lot-input"
                                       id="sub-lot-${parcel.id}"
                                       name="sub-lot-${parcel.id}"
                                       data-id="${parcel.id}"
                                       placeholder="예: 문단리 224, 문단리 산 423">
                                <ul class="lot-address-autocomplete-list" id="subLotAutocomplete-${parcel.id}"></ul>
                            </div>
                            <button type="button" class="btn-add-sub-lot-icon" data-id="${parcel.id}" title="하위 필지 추가">+</button>
                        </div>
                        <div class="sub-lots-container" id="subLots-${parcel.id}">
                            ${parcel.subLots.map((subLot, idx) => {
                                const number = `${parcelNumber}-${idx + 1}`;
                                const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                                const crops = typeof subLot === 'string' ? [] : (subLot.crops || []);
                                const subLotCropsId = 'subLotCrops-' + parcel.id + '-' + idx;
                                const safeLotAddressCard = escapeHTML(lotAddress);
                                return `
                                    <div class="sub-lot-card">
                                        <div class="sub-lot-card-header">
                                            <div class="sub-lot-info">
                                                <span class="sub-lot-number">` + number + `</span>
                                                <span class="sub-lot-value">` + safeLotAddressCard + `</span>
                                            </div>
                                            <button type="button" class="remove-sub-lot" data-index="` + idx + `">&times;</button>
                                        </div>
                                        <div class="sub-lot-crops-list" id="` + subLotCropsId + `">
                                            ` + crops.map((crop, cropIdx) => {
                                                const safeCropNameSubLot = escapeHTML(crop.name);
                                                return `
                                                <div class="sub-lot-crop-item">
                                                    <span class="crop-name">` + safeCropNameSubLot + `</span>
                                                    <div class="crop-area-info">
                                                        <span class="crop-area">` + formatArea(crop.area) + ` m²</span>
                                                        <button type="button" class="remove-sublot-crop" data-sublot-index="` + idx + `" data-crop-index="` + cropIdx + `">&times;</button>
                                                    </div>
                                                </div>
                                            `;}).join('') + `
                                        </div>
                                        <button type="button" class="btn-add-sublot-crop" data-parcel-id="` + parcel.id + `" data-sublot-index="` + idx + `">
                                            + 작물 추가
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                <div class="parcel-note-row">
                    <div class="parcel-form-group parcel-note-group">
                        <label for="parcel-note-${parcel.id}">기타주소</label>
                        <input type="text" class="parcel-note-input"
                               id="parcel-note-${parcel.id}"
                               name="parcel-note-${parcel.id}"
                               data-id="${parcel.id}"
                               placeholder="예: 1동, 2동"
                               value="${escapeHTML(parcel.note || '')}">
                    </div>
                </div>
                <div class="parcel-summary" id="summary-${parcel.id}">
                    ${this.renderParcelSummary(parcel)}
                </div>
            </div>
        `);

        if (!this.parcelsContainer) {
            (window.logger?.error || console.error)('parcelsContainer를 찾을 수 없습니다!');
            return;
        }

        this.parcelsContainer.appendChild(card);

        // 이벤트 바인딩
        this.bindDirectCropAutocomplete(parcel.id);
        this.bindLotAddressAutocomplete(parcel.id);
        this.bindSubLotAutocomplete(parcel.id);
        this.bindAreaUnitConversion(parcel.id);
        this.bindParcelSelects(parcel.id);
    }

    // ========================================
    // 필지별 구분/목적 드롭다운 이벤트 바인딩
    // ========================================

    bindParcelSelects(parcelId) {
        const categorySelect = document.getElementById(`parcel-category-${parcelId}`);
        const purposeSelectEl = document.getElementById(`parcel-purpose-${parcelId}`);

        const toggleHasValue = (selectEl) => {
            selectEl.classList.toggle('has-value', selectEl.value !== '');
        };

        if (categorySelect) {
            toggleHasValue(categorySelect);
            categorySelect.addEventListener('change', (e) => {
                toggleHasValue(e.target);
                const parcel = this.parcels.find(p => p.id === parcelId);
                if (parcel) {
                    parcel.category = e.target.value;
                    this.updateParcelsData();
                }
            });
        }

        if (purposeSelectEl) {
            toggleHasValue(purposeSelectEl);
            purposeSelectEl.addEventListener('change', (e) => {
                toggleHasValue(e.target);
                const parcel = this.parcels.find(p => p.id === parcelId);
                if (parcel) {
                    parcel.purpose = e.target.value;
                    this.updateParcelsData();
                }
            });
        }
    }

    // ========================================
    // 면적 단위 변환 이벤트 바인딩
    // ========================================

    bindAreaUnitConversion(parcelId) {
        const areaInput = document.getElementById(`area-direct-${parcelId}`);
        const unitToggle = document.getElementById(`area-unit-${parcelId}`);

        if (!areaInput || !unitToggle) return;

        const unitButtons = unitToggle.querySelectorAll('.unit-btn');
        unitButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const newUnit = btn.dataset.value;
                const previousUnit = unitToggle.dataset.unit;
                if (newUnit === previousUnit) return;
                unitButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                unitToggle.dataset.unit = newUnit;
            });
        });
    }

    // ========================================
    // 필지 주소 자동완성 바인딩
    // ========================================

    bindLotAddressAutocomplete(parcelId) {
        const lotInput = document.querySelector(`.lot-address-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`lotAutocomplete-${parcelId}`);

        if (!lotInput || !autocompleteList) return;

        lotInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                this.updateParcelLotAddress(parcelId);
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
            this.updateParcelLotAddress(parcelId);
        });

        lotInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = lotInput.value.trim();
                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }
                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate) {
                            this.showRegionSelectionModal(result, parcelId, lotInput);
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            lotInput.value = result.fullAddress;
                            autocompleteList.classList.remove('show');
                            this.updateParcelLotAddress(parcelId);
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
                const lotNumber = e.target.dataset.lot || '';
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
                const villageWithMountain = isMountain ? `${village} 산` : village;
                const currentValue = lotInput.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLotNumber = lotNumber || (match ? match[0] : '');
                const fullAddress = extractedLotNumber
                    ? `${region} ${district} ${villageWithMountain} ${extractedLotNumber}`
                    : `${region} ${district} ${villageWithMountain}`;
                lotInput.value = fullAddress;
                autocompleteList.classList.remove('show');
                this.updateParcelLotAddress(parcelId);
            }
        });

        lotInput.addEventListener('blur', () => {
            setTimeout(() => { autocompleteList.classList.remove('show'); }, 200);
        });
    }

    // ========================================
    // 하위 지번 자동완성 바인딩
    // ========================================

    bindSubLotAutocomplete(parcelId) {
        const subLotInput = document.querySelector(`.sub-lot-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`subLotAutocomplete-${parcelId}`);

        if (!subLotInput || !autocompleteList) return;

        subLotInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
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

        subLotInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = subLotInput.value.trim();
                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }
                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        if (result.isDuplicate) {
                            this.showRegionSelectionModal(result, parcelId, subLotInput);
                        } else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            subLotInput.value = result.fullAddress;
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
                const lotNumber = e.target.dataset.lot || '';
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;
                const villageWithMountain = isMountain ? `${village} 산` : village;
                const currentValue = subLotInput.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLotNumber = lotNumber || (match ? match[0] : '');
                const fullAddress = extractedLotNumber
                    ? `${region} ${district} ${villageWithMountain} ${extractedLotNumber}`
                    : `${region} ${district} ${villageWithMountain}`;
                subLotInput.value = fullAddress;
                autocompleteList.classList.remove('show');
            }
        });

        subLotInput.addEventListener('blur', () => {
            setTimeout(() => { autocompleteList.classList.remove('show'); }, 200);
        });
    }

    // ========================================
    // 직접 입력 자동완성 바인딩
    // ========================================

    bindDirectCropAutocomplete(parcelId) {
        const cropInput = document.querySelector(`.crop-direct-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`autocomplete-direct-${parcelId}`);

        if (!cropInput || !autocompleteList) return;

        cropInput.addEventListener('input', (e) => {
            const value = e.target.value.trim().toLowerCase();
            if (value.length > 0 && typeof CROP_DATA !== 'undefined') {
                const matches = CROP_DATA.filter(crop =>
                    crop.name.toLowerCase().includes(value)
                ).slice(0, 8);

                if (matches.length > 0) {
                    autocompleteList.innerHTML = sanitizeHTML(matches.map(crop => `
                        <li data-code="${crop.code}" data-name="${crop.name}">${crop.name} (${crop.category})</li>
                    `).join(''));
                    const rect = cropInput.getBoundingClientRect();
                    autocompleteList.style.left = `${rect.left}px`;
                    autocompleteList.style.top = `${rect.bottom + 2}px`;
                    autocompleteList.style.width = `${rect.width}px`;
                    autocompleteList.classList.add('show');
                } else {
                    autocompleteList.classList.remove('show');
                }
            } else {
                autocompleteList.classList.remove('show');
            }
            this.updateFirstCrop(parcelId);
        });

        cropInput.addEventListener('blur', () => {
            setTimeout(() => { autocompleteList.classList.remove('show'); }, 200);
        });

        autocompleteList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const name = e.target.dataset.name;
                cropInput.value = name;
                autocompleteList.classList.remove('show');
                this.updateFirstCrop(parcelId);
                const areaInput = document.querySelector(`.area-direct-input[data-id="${parcelId}"]`);
                if (areaInput) areaInput.focus();
            }
        });
    }

    // ========================================
    // 필지 주소 업데이트
    // ========================================

    updateParcelLotAddress(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        const lotInput = document.querySelector(`.lot-address-input[data-id="${parcelId}"]`);

        if (parcel && lotInput) {
            const newValue = lotInput.value.trim();
            if (!newValue) {
                this.showToast('필지 주소를 입력해주세요.', 'warning');
                lotInput.focus();
                return;
            }
            parcel.lotAddress = newValue;
            this.updateParcelsData();
            this.updateParcelSummary(parcelId);
        }
    }

    // ========================================
    // 첫 번째 작물 업데이트
    // ========================================

    updateFirstCrop(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        const cropInput = document.querySelector(`.crop-direct-input[data-id="${parcelId}"]`);
        const areaInput = document.querySelector(`.area-direct-input[data-id="${parcelId}"]`);
        const unitToggle = document.getElementById(`area-unit-${parcelId}`);

        if (!parcel || !cropInput || !areaInput) return;

        const cropName = cropInput.value.trim();
        const cropArea = areaInput.value.trim();
        const unit = unitToggle ? unitToggle.dataset.unit : 'm2';

        if (cropName && cropArea) {
            if (parcel.crops.length === 0) {
                parcel.crops.push({ name: cropName, area: cropArea, code: '', unit: unit });
            } else {
                parcel.crops[0].name = cropName;
                parcel.crops[0].area = cropArea;
                parcel.crops[0].unit = unit;
            }
        } else {
            if (parcel.crops.length === 1 && (!parcel.crops[0].name || !parcel.crops[0].area)) {
                parcel.crops = [];
            }
        }

        this.updateParcelSummary(parcelId);
        this.updateParcelsData();
    }

    // ========================================
    // 필지 요약 렌더링
    // ========================================

    renderParcelSummary(parcel) {
        const allCrops = [
            ...parcel.crops,
            ...parcel.subLots.flatMap(subLot => {
                if (typeof subLot === 'string') return [];
                return subLot.crops || [];
            })
        ].filter(c => c.name && c.area);

        let m2Total = 0;
        let pyeongTotal = 0;
        allCrops.forEach(crop => {
            const area = parseFloat(crop.area) || 0;
            if (crop.unit === 'pyeong') {
                pyeongTotal += area;
            } else {
                m2Total += area;
            }
        });

        const cropCount = allCrops.length;
        const subLotCount = parcel.subLots.length;

        const areaParts = [];
        if (m2Total > 0) areaParts.push(`${m2Total.toLocaleString()} ㎡`);
        if (pyeongTotal > 0) areaParts.push(`${pyeongTotal.toLocaleString()} 평`);
        const areaDisplay = areaParts.length > 0 ? areaParts.join(' / ') : '0';

        return `
            <div class="summary-item">
                <span>하위 필지:</span>
                <span>${subLotCount}개</span>
            </div>
            <div class="summary-item">
                <span>작물 수:</span>
                <span>${cropCount}개</span>
            </div>
            <div class="summary-item total-area">
                <span>총 면적:</span>
                <span>${areaDisplay}</span>
            </div>
        `;
    }

    updateParcelSummary(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        const summaryEl = document.getElementById(`summary-${parcelId}`);
        if (summaryEl && parcel) {
            summaryEl.innerHTML = sanitizeHTML(this.renderParcelSummary(parcel));
        }
    }

    // ========================================
    // 하위 지번 표시 업데이트
    // ========================================

    updateSubLotsDisplay(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        const parcelIndex = this.parcels.indexOf(parcel) + 1;
        const container = document.getElementById(`subLots-${parcelId}`);
        if (!container || !parcel) return;

        const formatAreaWithUnit = this.formatAreaWithUnit || window.SampleUtils?.formatAreaWithUnit || ((v) => v);

        container.innerHTML = sanitizeHTML(parcel.subLots.map((subLot, idx) => {
            const number = `${parcelIndex}-${idx + 1}`;
            const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
            const crops = typeof subLot === 'string' ? [] : (subLot.crops || []);
            const subLotCropsId = 'subLotCrops-' + parcelId + '-' + idx;
            const safeLotAddress = escapeHTML(lotAddress);
            return `
                <div class="sub-lot-card bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="sub-lot-number bg-primary text-white px-2 py-1 rounded text-xs font-bold">` + number + `</span>
                            <span class="sub-lot-value font-medium text-slate-800 dark:text-slate-200">` + safeLotAddress + `</span>
                        </div>
                        <button type="button" class="remove-sub-lot text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 text-lg" data-index="` + idx + `">&times;</button>
                    </div>
                    <div class="sub-lot-crops-list space-y-1" id="` + subLotCropsId + `">
                        ` + crops.map((crop, cropIdx) => {
                            const safeCropName = escapeHTML(crop.name);
                            return `
                            <div class="flex items-center justify-between bg-white dark:bg-zinc-900 px-2 py-1.5 rounded text-xs">
                                <span class="font-medium text-slate-700 dark:text-slate-300">` + safeCropName + `</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-600 dark:text-slate-400">` + formatAreaWithUnit(crop.area, crop.unit || 'm2') + `</span>
                                    <button type="button" class="remove-sublot-crop text-slate-400 hover:text-red-500 text-sm" data-sublot-index="` + idx + `" data-crop-index="` + cropIdx + `">&times;</button>
                                </div>
                            </div>
                        `;}).join('') + `
                    </div>
                    <button type="button" class="btn-add-sublot-crop mt-2 w-full text-xs text-primary hover:text-primary-hover font-medium py-1.5 border border-dashed border-primary rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" data-parcel-id="` + parcelId + `" data-sublot-index="` + idx + `">
                        + 작물 추가
                    </button>
                </div>
            `;
        }).join(''));
    }

    // ========================================
    // 작물 면적 표시 업데이트
    // ========================================

    updateCropsAreaDisplay(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        if (!parcel) return;
        const container = document.getElementById(`cropsArea-${parcelId}`);
        if (!container) return;

        const formatAreaWithUnit = this.formatAreaWithUnit || window.SampleUtils?.formatAreaWithUnit || ((v) => v);

        container.innerHTML = sanitizeHTML(parcel.crops.slice(1).map((crop, idx) => {
            const subLotLabel = this.getSubLotLabel(crop.subLotTarget, parcel);
            const safeCropName = escapeHTML(crop.name);
            const safeSubLotLabel = escapeHTML(subLotLabel);
            return `
                <div class="crop-area-item" data-index="${idx + 1}">
                    <span class="crop-name">${safeCropName}</span>
                    <span class="crop-area">${formatAreaWithUnit(crop.area, crop.unit || 'm2')}</span>
                    ${subLotLabel ? `<span class="crop-sublot">${safeSubLotLabel}</span>` : ''}
                    <button type="button" class="remove-crop-area">&times;</button>
                </div>
            `;
        }).join(''));
    }

    getSubLotLabel(subLotTarget, parcel) {
        if (!subLotTarget || subLotTarget === 'all') return '';
        if (!parcel.subLots || parcel.subLots.length === 0) return '';
        const idx = parcel.subLots.indexOf(subLotTarget);
        if (idx >= 0) {
            return `[${subLotTarget}]`;
        }
        return '';
    }

    // ========================================
    // 작물+면적 입력 모달
    // ========================================

    openCropAreaModal(parcelId) {
        this.currentParcelIdForCrop = parcelId;
        const parcel = this.parcels.find(p => p.id === parcelId);
        this.tempCropAreas = parcel.crops.map(c => ({
            ...c,
            subLotTarget: c.subLotTarget || 'all'
        }));
        this.renderCropAreaModal();
        if (this.cropAreaModal) this.cropAreaModal.classList.remove('hidden');
    }

    getSubLotOptions(parcelId) {
        const parcel = this.parcels.find(p => p.id === parcelId);
        if (!parcel) return [];
        const options = [{ value: 'all', label: '전체 (상위 필지 전체)' }];
        if (parcel.subLots && parcel.subLots.length > 0) {
            parcel.subLots.forEach((lot, idx) => {
                options.push({ value: lot, label: `하위 ${idx + 1}: ${lot}` });
            });
        }
        return options;
    }

    closeCropAreaModalFn() {
        if (this.cropAreaModal) this.cropAreaModal.classList.add('hidden');
        this.currentParcelIdForCrop = null;
        this.tempCropAreas = [];
    }

    renderCropAreaModal() {
        if (this.tempCropAreas.length === 0) {
            this.tempCropAreas.push({ name: '', area: '', code: '', subLotTarget: 'all' });
        }

        const subLotOptions = this.getSubLotOptions(this.currentParcelIdForCrop || this.currentSubLotParcelId);
        const hasSubLots = subLotOptions.length > 1;

        if (!this.cropAreaList) return;

        this.cropAreaList.innerHTML = sanitizeHTML(this.tempCropAreas.map((crop, idx) => `
            <div class="crop-area-input-row" data-index="${idx}">
                <div class="crop-select-wrapper crop-autocomplete-wrapper">
                    <input type="text" class="crop-search-input"
                           id="crop-search-${idx}"
                           name="crop-search-${idx}"
                           placeholder="작물명 검색..."
                           value="${crop.name}"
                           data-index="${idx}">
                    <ul class="crop-autocomplete-list" id="autocomplete-${idx}"></ul>
                </div>
                <div class="area-input-wrapper">
                    <input type="number" class="area-input"
                           id="area-input-${idx}"
                           name="area-input-${idx}"
                           placeholder="면적"
                           value="${crop.area}"
                           data-index="${idx}">
                    <div class="area-unit-toggle area-unit-modal-toggle"
                         id="area-unit-modal-${idx}"
                         data-index="${idx}"
                         data-unit="${crop.unit || 'm2'}">
                        <button type="button" class="unit-btn ${(!crop.unit || crop.unit === 'm2') ? 'active' : ''}" data-value="m2">㎡</button>
                        <button type="button" class="unit-btn ${crop.unit === 'pyeong' ? 'active' : ''}" data-value="pyeong">평</button>
                    </div>
                </div>
                ${hasSubLots ? `
                <div class="sublot-select-wrapper">
                    <select class="sublot-select"
                            id="sublot-select-${idx}"
                            name="sublot-select-${idx}"
                            data-index="${idx}">
                        ${subLotOptions.map(opt => `
                            <option value="${opt.value}" ${crop.subLotTarget === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                ` : ''}
                <button type="button" class="btn-remove-row" data-index="${idx}">&times;</button>
            </div>
        `).join(''));

        this.bindAutocompleteEvents();
    }

    bindAutocompleteEvents() {
        if (!this.cropAreaList) return;

        const searchInputs = this.cropAreaList.querySelectorAll('.crop-search-input');

        searchInputs.forEach((input) => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                const value = e.target.value.trim().toLowerCase();
                const autocompleteList = document.getElementById(`autocomplete-${idx}`);

                this.tempCropAreas[idx].name = e.target.value;
                this.tempCropAreas[idx].code = '';

                if (value.length > 0 && typeof CROP_DATA !== 'undefined') {
                    const matches = CROP_DATA.filter(crop =>
                        crop.name.toLowerCase().includes(value)
                    ).slice(0, 10);

                    if (matches.length > 0) {
                        autocompleteList.innerHTML = sanitizeHTML(matches.map(crop => `
                            <li data-code="${crop.code}" data-name="${crop.name}">${crop.name} (${crop.category})</li>
                        `).join(''));
                        const rect = (e.target as HTMLInputElement).getBoundingClientRect();
                        autocompleteList.style.top = `${rect.bottom + 2}px`;
                        autocompleteList.style.left = `${rect.left}px`;
                        autocompleteList.style.width = `${rect.width}px`;
                        autocompleteList.classList.add('show');
                    } else {
                        autocompleteList.classList.remove('show');
                    }
                } else {
                    autocompleteList.classList.remove('show');
                }
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    const idx = parseInt(input.dataset.index, 10);
                    const autocompleteList = document.getElementById(`autocomplete-${idx}`);
                    if (autocompleteList) autocompleteList.classList.remove('show');
                }, 200);
            });
        });

        const autocompleteLists = this.cropAreaList.querySelectorAll('.crop-autocomplete-list');
        autocompleteLists.forEach(list => {
            list.addEventListener('click', (e) => {
                if (e.target.tagName === 'LI') {
                    const idx = parseInt(list.id.replace('autocomplete-', ''));
                    const name = e.target.dataset.name;
                    const code = e.target.dataset.code;
                    this.tempCropAreas[idx].name = name;
                    this.tempCropAreas[idx].code = code;
                    const input = this.cropAreaList.querySelector(`.crop-search-input[data-index="${idx}"]`);
                    input.value = name;
                    list.classList.remove('show');
                    const areaInput = this.cropAreaList.querySelector(`.area-input[data-index="${idx}"]`);
                    if (areaInput) areaInput.focus();
                }
            });
        });

        this.cropAreaList.querySelectorAll('.area-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                this.tempCropAreas[idx].area = e.target.value;
            });
        });

        this.cropAreaList.querySelectorAll('.area-unit-modal-select').forEach((select) => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                this.tempCropAreas[index].unit = e.target.value;
            });
        });

        this.cropAreaList.querySelectorAll('.sublot-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                this.tempCropAreas[idx].subLotTarget = e.target.value;
            });
        });

        this.cropAreaList.querySelectorAll('.btn-remove-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                if (this.tempCropAreas.length > 1) {
                    this.tempCropAreas.splice(idx, 1);
                    this.renderCropAreaModal();
                }
            });
        });

        this.cropAreaList.querySelectorAll('.area-unit-modal-toggle .unit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toggle = e.target.closest('.area-unit-modal-toggle');
                const value = e.target.dataset.value;
                toggle.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                toggle.dataset.unit = value;
            });
        });
    }

    // ========================================
    // 하위 지번 작물 추가 모달
    // ========================================

    openSubLotCropModal(parcelId, subLotIndex) {
        this.currentSubLotParcelId = parcelId;
        this.currentSubLotIndex = subLotIndex;

        const parcel = this.parcels.find(p => p.id === parcelId);
        const subLot = parcel.subLots[subLotIndex];

        this.tempCropAreas = subLot.crops && subLot.crops.length > 0
            ? subLot.crops.map(c => ({ ...c }))
            : [{ name: '', area: '', code: '' }];

        this.renderCropAreaModal();
        if (this.cropAreaModal) this.cropAreaModal.classList.remove('hidden');
    }

    confirmCropArea() {
        const validCrops = this.tempCropAreas.filter(c => c.name.trim() && c.area).map((crop, idx) => {
            const unitToggle = document.getElementById(`area-unit-modal-${idx}`);
            const unit = unitToggle ? unitToggle.dataset.unit : 'm2';
            return { ...crop, unit: unit };
        });

        if (this.currentSubLotParcelId && this.currentSubLotIndex !== null) {
            const parcel = this.parcels.find(p => p.id === this.currentSubLotParcelId);
            if (parcel.subLots[this.currentSubLotIndex]) {
                if (typeof parcel.subLots[this.currentSubLotIndex] === 'string') {
                    const lotAddress = parcel.subLots[this.currentSubLotIndex];
                    parcel.subLots[this.currentSubLotIndex] = { lotAddress: lotAddress, crops: [] };
                }
                parcel.subLots[this.currentSubLotIndex].crops = validCrops;
            }
            this.updateSubLotsDisplay(this.currentSubLotParcelId);
            this.updateParcelSummary(this.currentSubLotParcelId);
            this.updateParcelsData();
            this.currentSubLotParcelId = null;
            this.currentSubLotIndex = null;
        } else {
            const parcel = this.parcels.find(p => p.id === this.currentParcelIdForCrop);
            parcel.crops = validCrops;
            this.updateCropsAreaDisplay(this.currentParcelIdForCrop);
            this.updateParcelSummary(this.currentParcelIdForCrop);
            this.updateParcelsData();
        }

        this.closeCropAreaModalFn();
    }

    // ========================================
    // 폼 제출 처리
    // ========================================

    submitForm() {
        const validParcels = this.parcels.filter(p => p.lotAddress.trim());
        if (validParcels.length === 0) {
            this.showToast('최소 1개의 필지 주소를 입력해주세요.', 'warning');
            return;
        }

        const formData = new FormData(this.form);

        // 그룹 수정 모드인 경우
        if (this.editingGroupId) {
            const baseReceptionNumber = formData.get('receptionNumber');
            const isFillNumber = baseReceptionNumber.startsWith('F');
            const baseNumber = isFillNumber
                ? parseInt(baseReceptionNumber.replace('F', ''), 10) || 1
                : parseInt(baseReceptionNumber, 10) || 1;

            const commonData = {
                date: formData.get('date'),
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                addressPostcode: formData.get('addressPostcode') as string || '',
                addressRoad: formData.get('addressRoad') as string || '',
                addressDetail: formData.get('addressDetail') as string || '',
                subCategory: formData.get('subCategory') || '-',
                purpose: formData.get('purpose'),
                receptionMethod: formData.get('receptionMethod') || '-',
                note: formData.get('note') || '',
                updatedAt: new Date().toISOString()
            };

            const oldGroupLogs = this.editingGroupLogs;
            const groupId = this.editingGroupId;

            // 기존 그룹 레코드 모두 제거
            this.sampleLogs = this.sampleLogs.filter(l => l.groupId !== groupId);

            // 새 레코드 생성 (필지 수에 맞춰)
            const newLogs = validParcels.map((parcel, index) => {
                const num = baseNumber + index;
                const receptionNumber = isFillNumber ? `F${num}` : String(num);
                const parcelSubCategory = parcel.category || commonData.subCategory;
                const parcelPurpose = parcel.purpose || commonData.purpose;

                // 기존 레코드가 있으면 id, createdAt 보존
                const existingLog = oldGroupLogs[index];

                return {
                    id: existingLog?.id || crypto.randomUUID(),
                    receptionNumber,
                    ...commonData,
                    subCategory: parcelSubCategory,
                    purpose: parcelPurpose,
                    groupId,
                    parcelIndex: index + 1,
                    totalParcels: validParcels.length,
                    createdAt: existingLog?.createdAt || new Date().toISOString(),
                    isComplete: existingLog?.isComplete || false,
                    parcels: [{
                        id: crypto.randomUUID(),
                        lotAddress: parcel.lotAddress,
                        isMountain: parcel.isMountain || false,
                        subLots: [...parcel.subLots],
                        crops: parcel.crops.map(c => ({ ...c })),
                        category: parcel.category || '',
                        purpose: parcel.purpose || '',
                        note: parcel.note || ''
                    }],
                    lotAddress: parcel.lotAddress,
                    area: parcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString(),
                    cropsDisplay: parcel.crops.map(c => c.name).join(', ') || '-'
                };
            });

            newLogs.forEach(log => this.sampleLogs.push(log));
            this.saveLogs(); // localStorage 먼저 (ID 할당 보장)

            // Firebase: 삭제된 레코드 제거 + 새 레코드 저장
            const newIds = new Set(newLogs.map(l => l.id));
            const removedIds = oldGroupLogs.filter(l => !newIds.has(l.id)).map(l => l.id);
            if (removedIds.length > 0) this.firebaseDeleteRecords(removedIds);
            this.firebaseSaveRecords(newLogs);
            this.filterAndRenderLogs();
            this.cancelEditMode();
            this.showToast(`${validParcels.length}건의 필지가 수정되었습니다.`, 'success');
            this.switchView('list');
            return;
        }

        // 수정 모드인 경우
        if (this.editingLogId) {
            const logIndex = this.sampleLogs.findIndex(l => l.id === this.editingLogId);
            if (logIndex === -1) {
                this.showToast('수정할 데이터를 찾을 수 없습니다.', 'error');
                return;
            }

            const existingLog = this.sampleLogs[logIndex];
            const firstParcelCategory = validParcels[0]?.category;
            const firstParcelPurpose = validParcels[0]?.purpose;
            const mainSubCategory = formData.get('subCategory') || '-';
            const effectiveSubCategory = firstParcelCategory || mainSubCategory;
            const effectivePurpose = firstParcelPurpose || formData.get('purpose');

            const updatedLog = {
                ...existingLog,
                receptionNumber: formData.get('receptionNumber'),
                date: formData.get('date'),
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                addressPostcode: formData.get('addressPostcode') as string || '',
                addressRoad: formData.get('addressRoad') as string || '',
                addressDetail: formData.get('addressDetail') as string || '',
                subCategory: effectiveSubCategory,
                purpose: effectivePurpose,
                receptionMethod: formData.get('receptionMethod') || '-',
                note: formData.get('note') || '',
                parcels: validParcels.map(p => ({
                    id: p.id || crypto.randomUUID(),
                    lotAddress: p.lotAddress,
                    isMountain: p.isMountain || false,
                    subLots: [...p.subLots],
                    crops: p.crops.map(c => ({ ...c })),
                    category: p.category || '',
                    purpose: p.purpose || '',
                    note: p.note || ''
                })),
                updatedAt: new Date().toISOString()
            };

            if (validParcels.length > 0) {
                const firstParcel = validParcels[0];
                updatedLog.lotAddress = firstParcel.lotAddress;
                updatedLog.area = firstParcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString();
                updatedLog.cropsDisplay = firstParcel.crops.map(c => c.name).join(', ') || '-';
            }

            this.sampleLogs[logIndex] = updatedLog;
            this.saveLogs();
            this.firebaseSaveRecords(updatedLog); // Firebase 개별 저장
            this.filterAndRenderLogs();
            this.cancelEditMode();
            this.showToast('수정이 완료되었습니다.', 'success');
            this.switchView('list');
            return;
        }

        // 신규 등록 모드
        const baseReceptionNumber = formData.get('receptionNumber');
        const isFillNumber = baseReceptionNumber.startsWith('F');
        const baseNumber = isFillNumber
            ? parseInt(baseReceptionNumber.replace('F', ''), 10) || 1
            : parseInt(baseReceptionNumber, 10) || 1;

        const numbersToCheck = validParcels.map((_, index) => {
            const num = baseNumber + index;
            return isFillNumber ? `F${num}` : String(num);
        });

        const yearStorageKey = this.getStorageKey(this.selectedYear);
        const latestLogs = SampleUtils.safeParseJSON(yearStorageKey, []);

        const duplicateNumbers = numbersToCheck.filter(numToCheck => {
            return latestLogs.some(log => {
                const logBaseNumber = (log.receptionNumber || '').split('-')[0];
                return logBaseNumber === numToCheck;
            });
        });

        if (duplicateNumbers.length > 0) {
            this.sampleLogs = latestLogs;
            this.filterAndRenderLogs();
            const nextAvailable = isFillNumber
                ? this.generateNextFillReceptionNumber()
                : this.generateNextReceptionNumber();
            this.receptionNumberInput.value = nextAvailable;
            this.showToast(`접수번호 ${duplicateNumbers.join(', ')}이(가) 이미 존재합니다. ${nextAvailable}번으로 변경되었습니다.`, 'warning');
            return;
        }

        const commonData = {
            date: formData.get('date'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            addressPostcode: formData.get('addressPostcode') as string || '',
            addressRoad: formData.get('addressRoad') as string || '',
            addressDetail: formData.get('addressDetail') as string || '',
            subCategory: formData.get('subCategory') || '-',
            purpose: formData.get('purpose'),
            receptionMethod: formData.get('receptionMethod') || '-',
            note: formData.get('note') || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const groupId = crypto.randomUUID();

        const newLogs = validParcels.map((parcel, index) => {
            const num = baseNumber + index;
            const receptionNumber = isFillNumber ? `F${num}` : String(num);
            const parcelSubCategory = parcel.category || commonData.subCategory;
            const parcelPurpose = parcel.purpose || commonData.purpose;

            return {
                id: crypto.randomUUID(),
                receptionNumber,
                ...commonData,
                subCategory: parcelSubCategory,
                purpose: parcelPurpose,
                groupId,
                parcelIndex: index + 1,
                totalParcels: validParcels.length,
                parcels: [{
                    id: crypto.randomUUID(),
                    lotAddress: parcel.lotAddress,
                    isMountain: parcel.isMountain || false,
                    subLots: [...parcel.subLots],
                    crops: parcel.crops.map(c => ({ ...c })),
                    category: parcel.category || '',
                    purpose: parcel.purpose || '',
                    note: parcel.note || ''
                }],
                lotAddress: parcel.lotAddress,
                area: parcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString(),
                cropsDisplay: parcel.crops.map(c => c.name).join(', ') || '-'
            };
        });

        newLogs.forEach(log => this.sampleLogs.push(log));
        this.saveLogs();
        this.firebaseSaveRecords(newLogs); // Firebase 개별 저장
        this.filterAndRenderLogs();
        this.form.reset();
        if (this.dateInput) this.dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        if (this.addressPostcode) this.addressPostcode.value = '';
        if (this.addressRoad) this.addressRoad.value = '';
        if (this.addressDetail) this.addressDetail.value = '';
        if (this.addressHidden) this.addressHidden.value = '';

        // 필지 초기화
        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';
        this.addParcel();

        this.receptionNumberInput.value = this.generateNextReceptionNumber();

        const parcelCount = newLogs.length;
        this.showToast(`${parcelCount}건의 시료가 접수되었습니다.`, 'success');

        // 등록 결과 모달 표시
        const resultData = {
            ...newLogs[newLogs.length - 1],
            parcels: validParcels.map(p => ({
                lotAddress: p.lotAddress,
                isMountain: p.isMountain || false,
                subLots: [...p.subLots],
                crops: p.crops.map(c => ({ ...c }))
            })),
            totalRegistered: parcelCount
        };
        this.showRegistrationResult(resultData);
        this.switchView('list');
    }

    // ========================================
    // 수정 모드 관리
    // ========================================

    editSample(id) {
        const logItem = this.sampleLogs.find(l => String(l.id) === id);
        if (!logItem) return;

        // groupId가 있고 같은 그룹에 2개 이상의 레코드가 있으면 그룹 수정
        if (logItem.groupId) {
            const groupLogs = this.sampleLogs
                .filter(l => l.groupId === logItem.groupId)
                .sort((a, b) => (a.parcelIndex || 0) - (b.parcelIndex || 0));
            if (groupLogs.length > 1) {
                this.populateFormForGroupEdit(groupLogs);
                return;
            }
        }
        // 단독 레코드는 기존 방식
        this.populateFormForEdit(logItem);
    }

    cancelEditMode() {
        this.editingLogId = null;
        this.editingGroupId = null;
        this.editingGroupLogs = null;

        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '접수 등록';
            this.navSubmitBtn.classList.remove('btn-edit-mode');
        }

        this.form.reset();
        const subCatSelect = document.getElementById('subCategory');
        if (subCatSelect) {
            subCatSelect.disabled = false;
            subCatSelect.innerHTML = sanitizeHTML(`
                <option value="">선택하세요</option>
                <option value="논">🌾 논</option>
                <option value="밭">🥬 밭</option>
                <option value="과수">🍎 과수</option>
                <option value="시설">🏠 시설</option>
                <option value="임야">🌲 임야</option>
                <option value="성토">🚜 성토</option>
            `);
            subCatSelect.value = '';
        }
        if (this.dateInput) this.dateInput.valueAsDate = new Date();

        if (this.addressPostcode) this.addressPostcode.value = '';
        if (this.addressRoad) this.addressRoad.value = '';
        if (this.addressDetail) this.addressDetail.value = '';
        if (this.addressHidden) this.addressHidden.value = '';

        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';
        this.addParcel();

        this.receptionNumberInput.value = this.generateNextReceptionNumber();
    }

    resetForm() {
        this.cancelEditMode();
    }

    populateFormForEdit(log) {
        this.editingLogId = log.id;

        this.receptionNumberInput.value = log.receptionNumber || '';
        if (this.dateInput) this.dateInput.value = log.date || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';

        if (this.addressPostcode) this.addressPostcode.value = log.addressPostcode || '';
        if (this.addressRoad) this.addressRoad.value = log.addressRoad || '';
        if (this.addressDetail) this.addressDetail.value = log.addressDetail || '';
        if (this.addressHidden) this.addressHidden.value = log.address || '';
        // 레거시 데이터 폴백: addressRoad가 없으면 address 문자열 파싱
        // Note: 레거시 데이터의 경우 전체 주소가 addressRoad에 들어가며,
        // 사용자가 편집 시 다음 주소 API로 재입력하면 신규 포맷으로 저장됨
        if (!log.addressRoad && log.address) {
            const addressMatch = log.address.match(/^\((\d{5})\)\s*(.+)$/);
            if (addressMatch) {
                if (this.addressPostcode && !this.addressPostcode.value) this.addressPostcode.value = addressMatch[1];
                if (this.addressRoad) this.addressRoad.value = addressMatch[2];
            } else {
                if (this.addressRoad) this.addressRoad.value = log.address;
            }
        }

        const subCategorySelect = document.getElementById('subCategory');
        if (subCategorySelect) {
            subCategorySelect.disabled = false;
            subCategorySelect.innerHTML = sanitizeHTML(`
                <option value="">선택하세요</option>
                <option value="논">🌾 논</option>
                <option value="밭">🥬 밭</option>
                <option value="과수">🍎 과수</option>
                <option value="시설">🏠 시설</option>
                <option value="임야">🌲 임야</option>
                <option value="성토">🚜 성토</option>
            `);
            subCategorySelect.value = log.subCategory || '';
        }

        if (this.purposeSelect) {
            this.purposeSelect.value = log.purpose || '';
        }

        const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        receptionMethodBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.method === log.receptionMethod) {
                btn.classList.add('active');
            }
        });
        if (this.receptionMethodInput) {
            this.receptionMethodInput.value = log.receptionMethod || '';
        }

        const noteInput = document.getElementById('note');
        if (noteInput) noteInput.value = log.note || '';

        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';

        if (log.parcels && log.parcels.length > 0) {
            log.parcels.forEach(parcel => {
                const parcelId = `parcel-${this.parcelIdCounter++}`;
                const newParcel = {
                    id: parcelId,
                    lotAddress: parcel.lotAddress || '',
                    isMountain: parcel.isMountain || false,
                    subLots: parcel.subLots ? [...parcel.subLots] : [],
                    crops: parcel.crops ? parcel.crops.map(c => ({ ...c })) : [],
                    category: parcel.category || '',
                    purpose: parcel.purpose || '',
                    note: parcel.note || ''
                };
                this.parcels.push(newParcel);
                this.renderParcelCard(newParcel, this.parcels.length);
            });
        } else {
            this.addParcel();
            if (log.lotAddress) {
                this.parcels[0].lotAddress = log.lotAddress;
                const lotInput = document.querySelector(`.lot-address-input[data-id="${this.parcels[0].id}"]`);
                if (lotInput) lotInput.value = log.lotAddress;
            }
        }

        this.updateParcelsData();

        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '수정 완료';
            this.navSubmitBtn.classList.add('btn-edit-mode');
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('formView').classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn[data-view="form"]').classList.add('active');

        setTimeout(() => {
            this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    populateFormForGroupEdit(groupLogs) {
        const firstLog = groupLogs[0];

        // 그룹 수정 모드 플래그
        this.editingLogId = null;
        this.editingGroupId = firstLog.groupId;
        this.editingGroupLogs = groupLogs;

        // 접수번호 (기본번호만 표시 - 서브넘버 제거)
        const baseRecNum = (firstLog.receptionNumber || '').split('-')[0];
        this.receptionNumberInput.value = baseRecNum;
        if (this.dateInput) this.dateInput.value = firstLog.date || '';
        document.getElementById('name').value = firstLog.name || '';
        document.getElementById('phoneNumber').value = firstLog.phoneNumber || '';

        // 주소 필드 (신규 데이터: 직접 사용, 레거시 데이터: address 파싱 폴백)
        if (this.addressPostcode) this.addressPostcode.value = firstLog.addressPostcode || '';
        if (this.addressRoad) this.addressRoad.value = firstLog.addressRoad || '';
        if (this.addressDetail) this.addressDetail.value = firstLog.addressDetail || '';
        if (this.addressHidden) this.addressHidden.value = firstLog.address || '';
        if (!firstLog.addressRoad && firstLog.address) {
            const addressMatch = firstLog.address.match(/^\((\d{5})\)\s*(.+)$/);
            if (addressMatch) {
                if (this.addressPostcode && !this.addressPostcode.value) this.addressPostcode.value = addressMatch[1];
                if (this.addressRoad) this.addressRoad.value = addressMatch[2];
            } else {
                if (this.addressRoad) this.addressRoad.value = firstLog.address;
            }
        }

        const subCategorySelect = document.getElementById('subCategory');
        if (subCategorySelect) {
            subCategorySelect.disabled = false;
            subCategorySelect.innerHTML = sanitizeHTML(`
                <option value="">선택하세요</option>
                <option value="논">🌾 논</option>
                <option value="밭">🥬 밭</option>
                <option value="과수">🍎 과수</option>
                <option value="시설">🏠 시설</option>
                <option value="임야">🌲 임야</option>
                <option value="성토">🚜 성토</option>
            `);
            subCategorySelect.value = firstLog.subCategory || '';
        }

        if (this.purposeSelect) this.purposeSelect.value = firstLog.purpose || '';

        const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        receptionMethodBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.method === firstLog.receptionMethod) btn.classList.add('active');
        });
        if (this.receptionMethodInput) this.receptionMethodInput.value = firstLog.receptionMethod || '';

        const noteInput = document.getElementById('note');
        if (noteInput) noteInput.value = firstLog.note || '';

        // 필지 카드 렌더링 - 각 레코드의 parcels[0]를 합침
        this.parcels = [];
        this.parcelIdCounter = 0;
        if (this.parcelsContainer) this.parcelsContainer.innerHTML = '';

        // parcelIndex 기준으로 그룹화 (서브넘버 = 같은 필지의 다른 작물)
        const parcelMap = new Map();
        groupLogs.forEach(log => {
            const pIdx = log.parcelIndex || 1;
            if (!parcelMap.has(pIdx)) parcelMap.set(pIdx, []);
            parcelMap.get(pIdx).push(log);
        });

        const sortedParcelIndices = [...parcelMap.keys()].sort((a, b) => a - b);
        sortedParcelIndices.forEach(pIdx => {
            const logsForParcel = parcelMap.get(pIdx);
            const firstLog = logsForParcel[0];
            const parcel = firstLog.parcels?.[0];
            if (!parcel) return;

            // 같은 필지의 여러 작물을 합침
            const mergedCrops = [];
            logsForParcel.forEach(log => {
                const logParcel = log.parcels?.[0];
                if (logParcel?.crops) {
                    logParcel.crops.forEach(c => mergedCrops.push({ ...c }));
                }
            });

            const parcelId = `parcel-${this.parcelIdCounter++}`;
            const newParcel = {
                id: parcelId,
                lotAddress: parcel.lotAddress || '',
                isMountain: parcel.isMountain || false,
                subLots: parcel.subLots ? [...parcel.subLots] : [],
                crops: mergedCrops.length > 0 ? mergedCrops : [{ name: '', area: '' }],
                category: parcel.category || '',
                purpose: parcel.purpose || '',
                note: parcel.note || ''
            };
            this.parcels.push(newParcel);
            this.renderParcelCard(newParcel, this.parcels.length);
        });

        // 필지가 하나도 없으면 빈 카드 추가
        if (this.parcels.length === 0) this.addParcel();

        this.updateParcelsData();

        // 버튼 상태 변경
        if (this.navSubmitBtn) {
            this.navSubmitBtn.title = '수정 완료';
            this.navSubmitBtn.classList.add('btn-edit-mode');
        }

        // 폼 뷰로 전환
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('formView').classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn[data-view="form"]').classList.add('active');

        setTimeout(() => {
            this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ========================================
    // 검색/필터
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

            let matchesLot = true;
            if (this.currentSearchFilter.lot) {
                matchesLot = false;
                const searchQuery = this.currentSearchFilter.lot.trim().toLowerCase();
                const searchTerms = searchQuery.split(/\s+/).filter(t => t);

                const getSubLotAddress = (subLot) => {
                    if (typeof subLot === 'string') return subLot.toLowerCase();
                    if (subLot && typeof subLot === 'object' && subLot.lotAddress) return subLot.lotAddress.toLowerCase();
                    return '';
                };

                if (log.parcels && log.parcels.length > 0) {
                    matchesLot = log.parcels.some(parcel => {
                        const lotAddrLower = parcel.lotAddress ? parcel.lotAddress.toLowerCase() : '';
                        if (lotAddrLower.includes(searchQuery)) return true;
                        if (searchTerms.every(term => lotAddrLower.includes(term))) return true;
                        if (searchTerms.length === 1) {
                            const term = searchTerms[0];
                            if (parcel.subLots && parcel.subLots.length > 0) {
                                if (parcel.subLots.some(subLot => {
                                    const addr = getSubLotAddress(subLot);
                                    return addr && addr.includes(term);
                                })) return true;
                            }
                        }
                        if (searchTerms.length >= 2) {
                            const riTerm = searchTerms[0];
                            const lotTerms = searchTerms.slice(1);
                            const matchesRi = lotAddrLower.includes(riTerm);
                            if (matchesRi && parcel.subLots && parcel.subLots.length > 0) {
                                const matchesSubLots = lotTerms.every(lotTerm =>
                                    parcel.subLots.some(subLot => {
                                        const addr = getSubLotAddress(subLot);
                                        return addr && addr.includes(lotTerm);
                                    })
                                );
                                if (matchesSubLots) return true;
                            }
                        }
                        return false;
                    });
                }
            }

            const matchesPurpose = !this.currentSearchFilter.purpose ||
                (log.purpose || '') === this.currentSearchFilter.purpose;

            let matchesCompleted = true;
            if (this.currentSearchFilter.completed === 'completed') {
                matchesCompleted = log.isComplete === true;
            } else if (this.currentSearchFilter.completed === 'incomplete') {
                matchesCompleted = !log.isComplete;
            }

            return matchesName && matchesReception && matchesDate && matchesLot && matchesPurpose && matchesCompleted;
        });

        this.renderLogs(filteredLogs);
        this.updateSearchButtonState();
    }

    updateSearchButtonState() {
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const purposeFilter = document.getElementById('purposeFilter');
        const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
            this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom ||
            this.currentSearchFilter.receptionTo || this.currentSearchFilter.lot || this.currentSearchFilter.purpose ||
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
        if (purposeFilter) {
            if (this.currentSearchFilter.purpose) {
                purposeFilter.classList.add('has-filter');
            } else {
                purposeFilter.classList.remove('has-filter');
            }
        }
    }

    // ========================================
    // 통계 기능
    // ========================================

    calculateStatistics() {
        const total = this.sampleLogs.length;
        const completed = this.sampleLogs.filter(log => log.isComplete).length;
        const pending = total - completed;

        const bySubCategory = {};
        const categoryMapping = {
            '논': { label: '🌾 논', class: 'category-rice' },
            '밭': { label: '🥬 밭', class: 'category-field' },
            '과수': { label: '🍎 과수', class: 'category-fruit' },
            '시설': { label: '🏠 시설', class: 'category-facility' },
            '임야': { label: '🌲 임야', class: 'category-forest' },
            '성토': { label: '🏗️ 성토', class: 'category-fill' },
            '기타': { label: '📦 기타', class: 'category-other' }
        };

        this.sampleLogs.forEach(log => {
            const category = log.subCategory || '기타';
            if (!bySubCategory[category]) {
                bySubCategory[category] = { count: 0, ...categoryMapping[category] || categoryMapping['기타'] };
            }
            bySubCategory[category].count++;
        });

        const byPurpose = {};
        const purposeMapping = {
            '일반재배': { label: '🌾 일반재배', class: 'purpose-general' },
            '유기': { label: '♻️ 유기', class: 'purpose-organic' },
            '무농약': { label: '🍃 무농약', class: 'purpose-nopesticide' },
            'GAP': { label: '✅ GAP', class: 'purpose-gap' },
            '저탄소': { label: '🌱 저탄소', class: 'purpose-lowcarbon' }
        };

        this.sampleLogs.forEach(log => {
            const purpose = log.purpose || '기타';
            if (!byPurpose[purpose]) {
                byPurpose[purpose] = { count: 0, ...purposeMapping[purpose] || { label: purpose, class: 'purpose-general' } };
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
                    if (log.isComplete) { byMonth[monthNum].completed++; } else { byMonth[monthNum].pending++; }
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

        return { total, completed, pending, bySubCategory, byPurpose, byMonth, byQuarter, byReceptionMethod };
    }

    openStatisticsModal() {
        if (!this.statisticsModal) return;
        const stats = this.calculateStatistics();
        document.getElementById('statTotalCount').textContent = stats.total;
        document.getElementById('statCompletedCount').textContent = stats.completed;
        document.getElementById('statPendingCount').textContent = stats.pending;
        this.renderBarChart('statsByCategory', stats.bySubCategory, 'category');
        this.renderBarChart('statsByPurpose', stats.byPurpose, 'purpose');
        this.renderMonthlyChart('statsByMonth', stats.byMonth);
        this.renderQuarterlySummary('statsQuarterly', stats.byQuarter);
        this.renderBarChart('statsByReceptionMethod', stats.byReceptionMethod, 'method');
        this.statisticsModal.classList.remove('hidden');
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
    // 체크박스 선택 기능
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

        let badge = document.getElementById('selectedCountBadge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'selectedCountBadge';
                badge.className = 'selected-count-badge';
                const recordCount = document.getElementById('recordCount');
                if (recordCount) {
                    recordCount.parentNode.insertBefore(badge, recordCount.nextSibling);
                }
            }
            badge.textContent = `${count}건 선택`;
        } else if (badge) {
            badge.remove();
        }

        this.log(`${count}개 항목 선택됨`);
    }

    getSelectedIds() {
        const checkedBoxes = this.tableBody.querySelectorAll('.row-checkbox:checked');
        return Array.from(checkedBoxes).map(cb => cb.dataset.id);
    }

    selectByName(name) {
        const rowCheckboxes = this.tableBody.querySelectorAll('.row-checkbox');
        const targetCheckboxes = [];

        rowCheckboxes.forEach(cb => {
            const tr = cb.closest('tr');
            const nameCell = tr?.querySelector('.col-name');
            if (nameCell && nameCell.dataset.name === name) {
                targetCheckboxes.push(cb);
            }
        });

        if (targetCheckboxes.length === 0) return;

        const allChecked = targetCheckboxes.every(cb => cb.checked);
        targetCheckboxes.forEach(cb => { cb.checked = !allChecked; });

        this.updateSelectAllState();
        this.updateSelectedCount();
    }

    // ========================================
    // 라벨 인쇄 기능
    // ========================================

    openLabelPrintWithData(logs) {
        const labelData = logs.map(log => {
            const postalCode = log.addressPostcode || (log.address?.match(/^\((\d{5})\)/)?.[1] ?? '');
            const address = log.addressRoad
                ? [log.addressRoad, log.addressDetail].filter(Boolean).join(' ')
                : (log.address?.replace(/^\(\d{5}\)\s*/, '') || '');
            return { name: log.name || '', address: address, postalCode: postalCode };
        });

        const uniqueMap = new Map();
        labelData.forEach(item => {
            const key = `${item.address}|${item.postalCode}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, item);
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
    // 등록 결과 모달
    // ========================================

    showRegistrationResult(logData) {
        this.currentRegistrationData = logData;
        const formatArea = this.formatArea || window.SampleUtils?.formatArea || ((v) => v);

        const basicRows = [
            { label: '접수번호', value: logData.receptionNumber },
            { label: '접수일자', value: logData.date },
            { label: '성명', value: logData.name },
            { label: '전화번호', value: logData.phoneNumber },
            { label: '주소', value: logData.address || '-' },
            { label: '구분', value: logData.subCategory || '-' },
            { label: '목적 (용도)', value: logData.purpose || '-' },
            { label: '수령 방법', value: logData.receptionMethod || '-' },
            { label: '비고', value: logData.note || '-' }
        ];

        BaseSampleManager.buildResultTable(this.resultTableBody, basicRows);

        if (logData.parcels && logData.parcels.length > 0) {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = '필지 정보';
            th.style.verticalAlign = 'top';
            const td = document.createElement('td');
            const parcelsDiv = document.createElement('div');
            parcelsDiv.className = 'parcels-section';

            logData.parcels.forEach((parcel, idx) => {
                const parcelDiv = document.createElement('div');
                parcelDiv.className = 'parcel-item';
                const header = document.createElement('div');
                header.className = 'parcel-header';
                header.textContent = `필지 ${idx + 1}`;
                parcelDiv.appendChild(header);
                const addressDiv = document.createElement('div');
                addressDiv.textContent = parcel.lotAddress;
                parcelDiv.appendChild(addressDiv);

                if (parcel.subLots && parcel.subLots.length > 0) {
                    const subLotsDiv = document.createElement('div');
                    subLotsDiv.className = 'text-sm text-gray';
                    subLotsDiv.textContent = '하위 지번: ' + parcel.subLots.map(s =>
                        typeof s === 'string' ? s : s.lotAddress
                    ).join(', ');
                    parcelDiv.appendChild(subLotsDiv);
                }

                const noteDiv = document.createElement('div');
                noteDiv.className = 'text-sm';
                noteDiv.textContent = '기타주소: ' + (parcel.note || '-');
                parcelDiv.appendChild(noteDiv);

                if (parcel.crops && parcel.crops.length > 0) {
                    const cropList = document.createElement('div');
                    cropList.className = 'crop-list';
                    parcel.crops.forEach(crop => {
                        const cropTag = document.createElement('span');
                        cropTag.className = 'crop-tag';
                        cropTag.textContent = `${crop.name}: ${formatArea(crop.area)}m²`;
                        cropList.appendChild(cropTag);
                    });
                    parcelDiv.appendChild(cropList);
                } else {
                    const noCrop = document.createElement('span');
                    noCrop.className = 'text-gray';
                    noCrop.textContent = '작물 정보 없음';
                    parcelDiv.appendChild(noCrop);
                }

                parcelsDiv.appendChild(parcelDiv);
            });

            td.appendChild(parcelsDiv);
            tr.appendChild(th);
            tr.appendChild(td);
            this.resultTableBody.appendChild(tr);
        }

        if (this.registrationResultModal) this.registrationResultModal.classList.remove('hidden');
    }

    closeRegistrationResultModal() {
        if (this.registrationResultModal) this.registrationResultModal.classList.add('hidden');
        this.currentRegistrationData = null;
    }

    // ========================================
    // 지역 선택 모달 (중복 리 이름)
    // ========================================

    showRegionSelectionModal(parseResult, parcelId, inputElement) {
        this.regionSelectionModalData = { result: parseResult, parcelId, inputElement };
        const duplicateVillageName = document.getElementById('duplicateVillageName');
        const regionOptions = document.getElementById('regionOptions');

        if (duplicateVillageName) duplicateVillageName.textContent = parseResult.villageName;

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

        if (this.regionSelectionModal) this.regionSelectionModal.classList.remove('hidden');
    }

    selectRegion(index) {
        if (!this.regionSelectionModalData) return;
        const location = this.regionSelectionModalData.result.locations[index];
        const lotNumber = this.regionSelectionModalData.result.lotNumber;
        const fullAddress = lotNumber ? `${location.fullAddress} ${lotNumber}` : location.fullAddress;
        this.regionSelectionModalData.inputElement.value = fullAddress;
        this.updateParcelLotAddress(this.regionSelectionModalData.parcelId);
        this.closeRegionSelectionModal();
        this.showToast('지역이 선택되었습니다', 'success');
    }

    closeRegionSelectionModal() {
        if (this.regionSelectionModal) this.regionSelectionModal.classList.add('hidden');
        this.regionSelectionModalData = null;
    }

    // ========================================
    // 데이터 평탄화
    // ========================================

    flattenLogsForTable(logs) {
        const rows = [];
        logs.forEach(log => {
            if (log.parcels && log.parcels.length > 0) {
                let subLotIndex = 1;
                log.parcels.forEach(parcel => {
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ') : '-';
                    let m2Total = 0;
                    let pyeongTotal = 0;
                    if (parcel.crops) {
                        parcel.crops.forEach(c => {
                            const area = parseFloat(c.area) || 0;
                            if (c.unit === 'pyeong') { pyeongTotal += area; } else { m2Total += area; }
                        });
                    }
                    const areaParts = [];
                    if (m2Total > 0) areaParts.push(`${m2Total.toLocaleString()}㎡`);
                    if (pyeongTotal > 0) areaParts.push(`${pyeongTotal.toLocaleString()}평`);
                    const areaDisplay = areaParts.length > 0 ? areaParts.join(' / ') : '-';
                    const lotAddressDisplay = parcel.lotAddress
                        ? (parcel.isMountain ? `${parcel.lotAddress} (산)` : parcel.lotAddress) : '-';

                    rows.push({
                        ...log,
                        _isFirstRow: subLotIndex === 1,
                        _subLotIndex: subLotIndex,
                        _displayNumber: log.receptionNumber,
                        _lotAddress: lotAddressDisplay,
                        _cropsDisplay: cropsDisplay,
                        _areaDisplay: areaDisplay,
                        _parcelPurpose: parcel.purpose || ''
                    });
                    subLotIndex++;

                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, idx) => {
                            const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);
                            const subLotCropsDisplay = subLotCrops.length > 0
                                ? subLotCrops.map(c => c.name).join(', ') : '-';
                            let subM2Total = 0;
                            let subPyeongTotal = 0;
                            subLotCrops.forEach(c => {
                                const area = parseFloat(c.area) || 0;
                                if (c.unit === 'pyeong') { subPyeongTotal += area; } else { subM2Total += area; }
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
                                _areaDisplay: subAreaDisplay,
                                _parcelPurpose: parcel.purpose || ''
                            });
                            subLotIndex++;
                        });
                    }
                });

                if (subLotIndex === 1) {
                    rows.push({
                        ...log, _isFirstRow: true, _subLotIndex: 1, _displayNumber: log.receptionNumber,
                        _lotAddress: '-', _subLot: '-', _cropsDisplay: '-', _areaDisplay: '-'
                    });
                }
            } else {
                rows.push({
                    ...log, _isFirstRow: true, _subLotIndex: 1, _displayNumber: log.receptionNumber,
                    _lotAddress: log.lotAddress || '-', _subLot: '-',
                    _cropsDisplay: log.cropsDisplay || '-',
                    _areaDisplay: log.area ? parseFloat(log.area).toLocaleString() : '-'
                });
            }
        });
        return rows;
    }

    // ========================================
    // 페이지네이션
    // ========================================

    renderCurrentPage() {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        if (this.currentFlatRows.length === 0) {
            this.updatePaginationUI();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.currentFlatRows.length);
        const pageRows = this.currentFlatRows.slice(startIndex, endIndex);

        const fragment = document.createDocumentFragment();
        let prevName = startIndex > 0 ? (this.currentFlatRows[startIndex - 1]?.name || null) : null;

        pageRows.forEach((row) => {
            if (prevName !== null && row.name !== prevName) {
                const separatorTr = document.createElement('tr');
                separatorTr.className = 'farm-separator';
                const separatorTd = document.createElement('td');
                separatorTd.colSpan = 18;
                separatorTr.appendChild(separatorTd);
                fragment.appendChild(separatorTr);
            }
            prevName = row.name;

            const isComplete = row.isComplete || false;
            const tr = document.createElement('tr');
            tr.className = isComplete ? 'row-completed' : '';
            const methodText = row.receptionMethod || '-';

            const zipcode = row.addressPostcode || (row.address?.match(/^\((\d{5})\)/)?.[1] ?? '');
            const addressOnly = row.addressRoad
                ? [row.addressRoad, row.addressDetail].filter(Boolean).join(' ')
                : (row.address?.replace(/^\(\d{5}\)\s*/, '') || '');
            const displayAddress = addressOnly && addressOnly !== '-' && typeof SIDO_PATTERN !== 'undefined' && SIDO_PATTERN.test(addressOnly)
                ? addressOnly.replace(SIDO_PATTERN, '') : (addressOnly || '-');

            const parcelNote = row.parcels && row.parcels[0] && row.parcels[0].note ? row.parcels[0].note : '';
            const combinedNote = [row.note, parcelNote].filter(n => n && n.trim()).join(' / ') || '-';

            tr.dataset.id = row.id;

            // 체크박스
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'col-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.dataset.id = row.id;
            tdCheckbox.appendChild(checkbox);
            tr.appendChild(tdCheckbox);

            // 완료 버튼
            const tdComplete = document.createElement('td');
            tdComplete.className = 'col-complete';
            const btnComplete = document.createElement('button');
            btnComplete.className = `btn-complete ${isComplete ? 'completed' : ''}`;
            btnComplete.dataset.id = row.id;
            btnComplete.title = isComplete ? '완료 취소' : '완료';
            btnComplete.textContent = isComplete ? '✔' : '';
            tdComplete.appendChild(btnComplete);
            tr.appendChild(tdComplete);

            // 접수번호
            const tdNumber = document.createElement('td');
            tdNumber.textContent = row._displayNumber;
            tr.appendChild(tdNumber);

            // 날짜
            const tdDate = document.createElement('td');
            tdDate.textContent = row.date;
            tr.appendChild(tdDate);

            // 하위 카테고리
            const tdSubCategory = document.createElement('td');
            tdSubCategory.textContent = row.subCategory || '-';
            tr.appendChild(tdSubCategory);

            // 목적
            const tdPurpose = document.createElement('td');
            tdPurpose.textContent = row._parcelPurpose || row.purpose || '-';
            tr.appendChild(tdPurpose);

            // 성명 (클릭 시 같은 이름 일괄 선택)
            const tdName = document.createElement('td');
            tdName.className = 'col-name';
            tdName.dataset.name = row.name;
            tdName.textContent = row.name;
            tdName.title = `"${row.name}" 클릭하면 같은 이름 일괄 선택`;
            tr.appendChild(tdName);

            // 우편번호
            const tdZipcode = document.createElement('td');
            tdZipcode.className = 'col-zipcode';
            tdZipcode.textContent = zipcode || '-';
            tr.appendChild(tdZipcode);

            // 주소
            const tdAddress = document.createElement('td');
            tdAddress.className = 'col-address';
            tdAddress.textContent = displayAddress;
            tr.appendChild(tdAddress);

            // 필지 주소
            const tdLotAddress = document.createElement('td');
            tdLotAddress.textContent = row._lotAddress;
            tr.appendChild(tdLotAddress);

            // 기타주소
            const tdEtcAddress = document.createElement('td');
            tdEtcAddress.textContent = parcelNote || '-';
            tr.appendChild(tdEtcAddress);

            // 작물
            const tdCrops = document.createElement('td');
            tdCrops.className = 'text-truncate';
            tdCrops.setAttribute('data-tooltip', row._cropsDisplay);
            tdCrops.textContent = row._cropsDisplay;
            tr.appendChild(tdCrops);

            // 면적
            const tdArea = document.createElement('td');
            tdArea.textContent = row._areaDisplay;
            tr.appendChild(tdArea);

            // 전화번호
            const tdPhone = document.createElement('td');
            tdPhone.textContent = row.phoneNumber || '-';
            tr.appendChild(tdPhone);

            // 수령방법
            const tdMethod = document.createElement('td');
            tdMethod.textContent = methodText;
            tr.appendChild(tdMethod);

            // 비고
            const tdNote = document.createElement('td');
            tdNote.className = 'col-note';
            tdNote.title = combinedNote;
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-cell';
            noteDiv.textContent = combinedNote;
            tdNote.appendChild(noteDiv);
            tr.appendChild(tdNote);

            // 우편일자
            const tdMailDate = document.createElement('td');
            tdMailDate.className = 'col-mail-date';
            tdMailDate.textContent = row.mailDate || '-';
            tr.appendChild(tdMailDate);

            // 액션 버튼
            const tdAction = document.createElement('td');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'table-actions';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-edit';
            btnEdit.dataset.id = row.id;
            btnEdit.textContent = '수정';
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.dataset.id = row.id;
            btnDelete.textContent = '삭제';
            actionsDiv.appendChild(btnEdit);
            actionsDiv.appendChild(btnDelete);
            tdAction.appendChild(actionsDiv);
            tr.appendChild(tdAction);
            fragment.appendChild(tr);
        });

        this.tableBody.appendChild(fragment);
        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const totalItems = this.currentFlatRows.length;
        const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        if (this.paginationInfo) {
            this.paginationInfo.textContent = `${totalItems.toLocaleString()}건 중 ${startItem.toLocaleString()}-${endItem.toLocaleString()}`;
        }
        if (this.firstPageBtn) this.firstPageBtn.disabled = this.currentPage === 1;
        if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage === 1;
        if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        if (this.lastPageBtn) this.lastPageBtn.disabled = this.currentPage === this.totalPages;
        this.renderPageNumbers();
    }

    renderPageNumbers() {
        if (!this.pageNumbersContainer) return;
        if (this.totalPages <= 1) { this.pageNumbersContainer.innerHTML = ''; return; }
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
        btn.className = 'page-btn' + (pageNum === this.currentPage ? ' active' : '');
        btn.textContent = pageNum;
        btn.addEventListener('click', () => this.goToPage(pageNum));
        return btn;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.renderCurrentPage();
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.scrollTop = 0;
    }

    // ========================================
    // 자동 저장 관련
    // ========================================

    async autoSaveToFile() {
        return await SampleUtils.performAutoSave({
            FileAPI: this.FileAPI,
            moduleKey: 'soil',
            data: this.sampleLogs,
            webFileHandle: this.autoSaveFileHandle,
            log: (...args) => this.log(...args)
        });
    }

    async loadAutoSaveForSelectedYear() {
        if (!window.isElectron || !this.FileAPI?.autoSavePath || this.sampleLogs.length > 0) return;
        const autoSaveData = await window.loadFromAutoSaveFile();
        if (autoSaveData && autoSaveData.length > 0) {
            this.sampleLogs = autoSaveData;
            localStorage.setItem(this.getStorageKey(this.selectedYear), JSON.stringify(this.sampleLogs));
            this.filterAndRenderLogs();
            if (this.receptionNumberInput) {
                this.receptionNumberInput.value = this.generateNextReceptionNumber();
            }
            this.log(`${this.selectedYear}년 자동 저장 데이터 로드:`, autoSaveData.length, '건');
        }
    }

    // ========================================
    // 헬퍼
    // ========================================

    updateListViewTitle() {
        if (this.listViewTitle) {
            this.listViewTitle.textContent = '토양 접수 목록';
        }
    }

    resetFormKeepReceptionInfo() {
        const receptionNumber = this.receptionNumberInput?.value;
        const date = this.dateInput?.value;
        this.form.reset();
        setTimeout(() => {
            if (receptionNumber && this.receptionNumberInput) this.receptionNumberInput.value = receptionNumber;
            if (date && this.dateInput) this.dateInput.value = date;
        }, 10);
    }

    // ========================================
    // Override: setupTypeSpecificEvents - ALL soil-specific event handlers
    // ========================================

    setupTypeSpecificEvents() {
        const self = this;

        // 시료 타입 네비게이션 선택
        const sampleTypeBtns = document.querySelectorAll('.type-btn');
        sampleTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sampleTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchView('form');
            });
        });

        // 주소 검색 모듈
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

        // 빈 상태 버튼
        const btnGoForm = document.querySelector('.btn-go-form');
        if (btnGoForm) btnGoForm.addEventListener('click', () => this.switchView('form'));

        const btnAddParcelEmpty = document.querySelector('.btn-add-parcel-empty');
        if (btnAddParcelEmpty) btnAddParcelEmpty.addEventListener('click', () => this.addParcel());

        // 구분 변경 시 접수번호 업데이트
        if (this.subCategorySelect) {
            this.subCategorySelect.addEventListener('change', (e) => {
                const isFill = e.target.value === '성토';
                if (this.receptionNumberInput) {
                    this.receptionNumberInput.value = isFill
                        ? this.generateNextFillReceptionNumber()
                        : this.generateNextReceptionNumber();
                }
                this.updateParcelCardsMode(isFill);
            });
        }

        // 초기 필지 1개 추가
        this.addParcel();

        // 접수번호 변경 시 모든 필지 번호 업데이트
        if (this.receptionNumberInput) {
            this.receptionNumberInput.addEventListener('input', () => this.updateAllParcelNumbers());
        }

        // 필지 추가 버튼
        if (this.addParcelBtn) {
            this.addParcelBtn.addEventListener('click', () => this.addParcel());
        }

        // 필지 컨테이너 이벤트 위임
        if (this.parcelsContainer) {
            this.parcelsContainer.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('btn-remove-parcel')) {
                    this.removeParcel(target.dataset.id);
                }
                if (target.classList.contains('btn-add-sub-lot-icon')) {
                    const parcelId = target.dataset.id;
                    const input = document.querySelector(`.sub-lot-input[data-id="${parcelId}"]`);
                    const value = input.value.trim();
                    if (value) {
                        const parcel = this.parcels.find(p => p.id === parcelId);
                        parcel.subLots.push({ lotAddress: value, crops: [] });
                        this.updateSubLotsDisplay(parcelId);
                        this.updateParcelSummary(parcelId);
                        this.updateParcelsData();
                        input.value = '';
                    }
                }
                if (target.classList.contains('remove-sub-lot')) {
                    const subLotIndex = parseInt(target.dataset.index, 10);
                    const container = target.closest('.sub-lots-container');
                    const parcelId = container.id.replace('subLots-', '');
                    const parcel = this.parcels.find(p => p.id === parcelId);
                    parcel.subLots.splice(subLotIndex, 1);
                    this.updateSubLotsDisplay(parcelId);
                    this.updateParcelSummary(parcelId);
                    this.updateParcelsData();
                }
                if (target.classList.contains('btn-add-sublot-crop')) {
                    this.openSubLotCropModal(target.dataset.parcelId, parseInt(target.dataset.sublotIndex, 10));
                }
                if (target.classList.contains('remove-sublot-crop')) {
                    const subLotIndex = parseInt(target.dataset.sublotIndex, 10);
                    const cropIndex = parseInt(target.dataset.cropIndex, 10);
                    const container = target.closest('.sub-lots-container');
                    const parcelId = container.id.replace('subLots-', '');
                    const parcel = this.parcels.find(p => p.id === parcelId);
                    if (parcel.subLots[subLotIndex] && parcel.subLots[subLotIndex].crops) {
                        parcel.subLots[subLotIndex].crops.splice(cropIndex, 1);
                        this.updateSubLotsDisplay(parcelId);
                        this.updateParcelSummary(parcelId);
                        this.updateParcelsData();
                    }
                }
                if (target.classList.contains('btn-add-crop-area') || target.classList.contains('btn-add-crop-compact')) {
                    this.openCropAreaModal(target.dataset.id);
                }
                if (target.classList.contains('remove-crop-area')) {
                    const item = target.closest('.crop-area-item');
                    const container = target.closest('.crops-area-container');
                    if (!container) return;
                    const parcelId = container.id.replace('cropsArea-', '');
                    const index = parseInt(item.dataset.index, 10);
                    const parcel = this.parcels.find(p => p.id === parcelId);
                    if (parcel && parcel.crops[index]) {
                        parcel.crops.splice(index, 1);
                        this.updateCropsAreaDisplay(parcelId);
                        this.updateParcelSummary(parcelId);
                        this.updateParcelsData();
                    }
                }
            });

            this.parcelsContainer.addEventListener('input', (e) => {
                if (e.target.classList.contains('lot-address-input')) {
                    const parcelId = e.target.dataset.id;
                    const parcel = this.parcels.find(p => p.id === parcelId);
                    parcel._tempLotAddress = e.target.value;
                    parcel.lotAddress = e.target.value;
                    this.updateParcelsData();
                }
                if (e.target.classList.contains('area-direct-input')) {
                    this.updateFirstCrop(e.target.dataset.id);
                }
                if (e.target.classList.contains('parcel-note-input')) {
                    const parcelId = e.target.dataset.id;
                    const parcel = this.parcels.find(p => p.id === parcelId);
                    if (parcel) { parcel.note = e.target.value; this.updateParcelsData(); }
                }
            });

            this.parcelsContainer.addEventListener('blur', (e) => {
                if (e.target.classList.contains('parcel-note-input')) {
                    const parcel = this.parcels.find(p => p.id === e.target.dataset.id);
                    if (parcel) { parcel.note = e.target.value; this.updateParcelsData(); }
                }
                if (e.target.classList.contains('lot-address-input')) {
                    const parcel = this.parcels.find(p => p.id === e.target.dataset.id);
                    if (parcel) { parcel.lotAddress = e.target.value.trim(); this.updateParcelsData(); }
                }
            }, true);

            this.parcelsContainer.addEventListener('change', (e) => {
                if (e.target.classList.contains('mountain-checkbox')) {
                    const parcel = this.parcels.find(p => p.id === e.target.dataset.id);
                    if (parcel) { parcel.isMountain = e.target.checked; this.updateParcelsData(); }
                }
            });

            this.parcelsContainer.addEventListener('keypress', (e) => {
                if (e.target.classList.contains('sub-lot-input') && e.key === 'Enter') {
                    e.preventDefault();
                    const addBtn = document.querySelector(`.btn-add-sub-lot-icon[data-id="${e.target.dataset.id}"]`);
                    if (addBtn) addBtn.click();
                }
            });
        }

        // 작물 모달 이벤트
        if (this.closeCropAreaModalBtn) this.closeCropAreaModalBtn.addEventListener('click', () => this.closeCropAreaModalFn());
        if (this.cancelCropAreaBtn) this.cancelCropAreaBtn.addEventListener('click', () => this.closeCropAreaModalFn());
        if (this.cropAreaModal) {
            const overlay = this.cropAreaModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', () => this.closeCropAreaModalFn());
        }
        if (this.addCropAreaBtn) this.addCropAreaBtn.addEventListener('click', () => {
            this.tempCropAreas.push({ name: '', area: '', code: '' });
            this.renderCropAreaModal();
        });
        if (this.confirmCropAreaBtn) this.confirmCropAreaBtn.addEventListener('click', () => this.confirmCropArea());

        // 테이블 이벤트 위임
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const completeBtn = e.target.closest('.btn-complete');
                if (completeBtn) {
                    const id = completeBtn.dataset.id;
                    const log = this.sampleLogs.find(l => String(l.id) === id);
                    if (log) {
                        const newCompletedStatus = !log.isComplete;
                        const receptionNumber = log.receptionNumber || '';
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
                        this.firebaseSaveRecords(relatedLogs); // 완료 상태 변경분만 저장
                        const count = relatedLogs.length;
                        if (newCompletedStatus) {
                            this.showToast(count > 1 ? `${count}개 시료가 완료 처리되었습니다` : '완료 처리되었습니다', 'success');
                        } else {
                            this.showToast(count > 1 ? `${count}개 시료가 완료 취소되었습니다` : '완료 취소되었습니다', 'success');
                        }
                    }
                }

                const deleteBtn = e.target.closest('.btn-delete');
                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    const targetLog = this.sampleLogs.find(log => String(log.id) === String(id));

                    if (targetLog?.groupId) {
                        const groupLogs = this.sampleLogs.filter(log => log.groupId === targetLog.groupId);
                        if (groupLogs.length > 1) {
                            const baseNumber = (targetLog.receptionNumber || '').split('-')[0];
                            const numbers = groupLogs.map(l => l.receptionNumber).join(', ');
                            const choice = confirm(
                                `같은 접수 그룹(${numbers})이 ${groupLogs.length}건 있습니다.\n` +
                                `[확인] 그룹 전체 삭제 (삭제 후 ${baseNumber}번으로 재입력 가능)\n` +
                                `[취소] 이 항목만 삭제`
                            );
                            if (choice) {
                                this.deleteGroup(targetLog.groupId, baseNumber);
                            } else {
                                this.deleteSample(id, targetLog.receptionNumber);
                            }
                            return;
                        }
                    }

                    if (confirm('정말 삭제하시겠습니까?')) {
                        this.deleteSample(id, targetLog?.receptionNumber);
                    }
                }

                const editBtn = e.target.closest('.btn-edit');
                if (editBtn) {
                    this.editSample(editBtn.dataset.id);
                }
            });

            // 체크박스 이벤트
            this.tableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('row-checkbox')) {
                    this.updateSelectAllState();
                    this.updateSelectedCount();
                }
            });
        }

        // 전체 선택 체크박스
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const rowCheckboxes = this.tableBody.querySelectorAll('.row-checkbox');
                rowCheckboxes.forEach(cb => { cb.checked = isChecked; });
                this.updateSelectedCount();
            });
        }

        // 성명 클릭 시 같은 이름 일괄 선택
        if (this.tableBody) {
            this.tableBody.addEventListener('click', (e) => {
                const nameCell = e.target.closest('.col-name');
                if (nameCell && nameCell.dataset.name) {
                    this.selectByName(nameCell.dataset.name);
                }
            });
        }

        // 전역 등록
        window.getSelectedIds = () => this.getSelectedIds();

        // 전체 보기/기본 보기 토글
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                this.isFullView = !this.isFullView;
                const toggleText = viewToggleBtn.querySelector('.toggle-text');
                const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');
                if (this.isFullView) {
                    if (this.logTable) this.logTable.classList.add('full-view');
                    if (toggleText) toggleText.textContent = '기본 보기';
                    if (toggleIcon) toggleIcon.textContent = '👁️‍🗨️';
                    viewToggleBtn.classList.add('active');
                } else {
                    if (this.logTable) this.logTable.classList.remove('full-view');
                    if (toggleText) toggleText.textContent = '전체 보기';
                    if (toggleIcon) toggleIcon.textContent = '👁️';
                    viewToggleBtn.classList.remove('active');
                }
            });
        }

        // 검색 모달
        const openSearchModalBtn = document.getElementById('openSearchModalBtn');
        const closeSearchModalBtn = document.getElementById('closeSearchModal');
        const searchDateFromInput = document.getElementById('searchDateFromInput');
        const searchDateToInput = document.getElementById('searchDateToInput');
        const searchNameInput = document.getElementById('searchNameInput');
        const searchReceptionFromInput = document.getElementById('searchReceptionFromInput');
        const searchReceptionToInput = document.getElementById('searchReceptionToInput');
        const searchLotInput = document.getElementById('searchLotInput');
        const clearSearchDateBtn = document.getElementById('clearSearchDate');
        const clearSearchReceptionBtn = document.getElementById('clearSearchReception');
        const clearSearchLotBtn = document.getElementById('clearSearchLot');
        const resetSearchBtn = document.getElementById('resetSearchBtn');
        const applySearchBtn = document.getElementById('applySearchBtn');

        const purposeFilter = document.getElementById('purposeFilter');
        if (purposeFilter) {
            purposeFilter.addEventListener('change', (e) => {
                this.currentSearchFilter.purpose = e.target.value;
                this.filterAndRenderLogs();
            });
        }

        const completedFilter = document.getElementById('completedFilter');
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
                if (searchLotInput) searchLotInput.value = this.currentSearchFilter.lot;
                if (this.listSearchModal) this.listSearchModal.classList.remove('hidden');
                if (searchNameInput) searchNameInput.focus();
            });
        }

        const closeSearchModal = () => { if (this.listSearchModal) this.listSearchModal.classList.add('hidden'); };
        if (closeSearchModalBtn) closeSearchModalBtn.addEventListener('click', closeSearchModal);
        if (this.listSearchModal) {
            const overlay = this.listSearchModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', closeSearchModal);
        }

        if (clearSearchDateBtn) clearSearchDateBtn.addEventListener('click', () => {
            if (searchDateFromInput) searchDateFromInput.value = '';
            if (searchDateToInput) searchDateToInput.value = '';
        });
        if (clearSearchReceptionBtn) clearSearchReceptionBtn.addEventListener('click', () => {
            if (searchReceptionFromInput) searchReceptionFromInput.value = '';
            if (searchReceptionToInput) searchReceptionToInput.value = '';
        });
        if (clearSearchLotBtn) clearSearchLotBtn.addEventListener('click', () => {
            if (searchLotInput) searchLotInput.value = '';
        });

        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', () => {
                if (searchDateFromInput) searchDateFromInput.value = '';
                if (searchDateToInput) searchDateToInput.value = '';
                if (searchNameInput) searchNameInput.value = '';
                if (searchReceptionFromInput) searchReceptionFromInput.value = '';
                if (searchReceptionToInput) searchReceptionToInput.value = '';
                if (searchLotInput) searchLotInput.value = '';
                if (purposeFilter) purposeFilter.value = '';
                if (completedFilter) completedFilter.value = 'incomplete';
                this.currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', lot: '', purpose: '', completed: 'incomplete' };
                this.filterAndRenderLogs();
                closeSearchModal();
            });
        }

        if (applySearchBtn) {
            applySearchBtn.addEventListener('click', () => {
                this.currentSearchFilter.dateFrom = searchDateFromInput?.value || '';
                this.currentSearchFilter.dateTo = searchDateToInput?.value || '';
                this.currentSearchFilter.name = (searchNameInput?.value || '').toLowerCase();
                this.currentSearchFilter.receptionFrom = searchReceptionFromInput?.value || '';
                this.currentSearchFilter.receptionTo = searchReceptionToInput?.value || '';
                this.currentSearchFilter.lot = (searchLotInput?.value || '').toLowerCase();
                this.filterAndRenderLogs();
                closeSearchModal();
            });
        }

        const searchInputs = [searchNameInput, searchReceptionFromInput, searchReceptionToInput, searchLotInput];
        searchInputs.forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && applySearchBtn) applySearchBtn.click();
                });
            }
        });

        // 라벨 인쇄
        const btnLabelPrint = document.getElementById('btnLabelPrint');
        if (btnLabelPrint) {
            btnLabelPrint.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) {
                    if (this.sampleLogs.length === 0) { alert('인쇄할 데이터가 없습니다.'); return; }
                    if (!confirm(`선택된 항목이 없습니다.\n전체 ${this.sampleLogs.length}건을 라벨 인쇄하시겠습니까?`)) return;
                    this.openLabelPrintWithData(this.sampleLogs);
                } else {
                    const selectedLogs = this.sampleLogs.filter(log => selectedIds.includes(String(log.id)));
                    this.openLabelPrintWithData(selectedLogs);
                }
            });
        }

        // 선택 삭제
        const btnBulkDelete = document.getElementById('btnBulkDelete');
        if (btnBulkDelete) {
            btnBulkDelete.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) { alert('삭제할 항목을 선택해주세요.'); return; }
                if (!confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
                this.sampleLogs = this.sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                this.saveLogs();
                this.firebaseDeleteRecords(selectedIds);
                this.filterAndRenderLogs();
                if (this.selectAllCheckbox) { this.selectAllCheckbox.checked = false; this.selectAllCheckbox.indeterminate = false; }
                if (selectedIds.map(String).includes(String(this.editingLogId))) this.cancelEditMode();
                this.showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
            });
        }

        // 일괄 완료
        const btnBulkComplete = document.getElementById('btnBulkComplete');
        if (btnBulkComplete) {
            btnBulkComplete.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) { alert('완료 처리할 항목을 선택해주세요.'); return; }
                if (!confirm(`선택한 ${selectedIds.length}건을 완료 처리하시겠습니까?`)) return;
                // 선택된 ID + 같은 base 접수번호의 연관 행도 처리
                const baseNumbers = new Set(
                    selectedIds.map(id => {
                        const log = this.sampleLogs.find(l => String(l.id) === id);
                        return log ? (log.receptionNumber || '').split('-')[0] : null;
                    }).filter(Boolean)
                );
                let updatedCount = 0;
                const changedLogs: SoilLog[] = [];
                this.sampleLogs = this.sampleLogs.map(log => {
                    const base = (log.receptionNumber || '').split('-')[0];
                    if (baseNumbers.has(base) && !log.isComplete) {
                        updatedCount++;
                        const updated = { ...log, isComplete: true, updatedAt: new Date().toISOString() };
                        changedLogs.push(updated);
                        return updated;
                    }
                    return log;
                });
                this.saveLogs();
                this.firebaseSaveRecords(changedLogs);
                this.filterAndRenderLogs();
                this.showToast(`${updatedCount}건이 완료 처리되었습니다.`, 'success');
            });
        }

        // 일괄 우편발송일자
        const btnBulkMailDate = document.getElementById('btnBulkMailDate');
        const closeMailDateModal = document.getElementById('closeMailDateModal');
        const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
        const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');
        const mailDateInput = document.getElementById('mailDateInput');
        const mailDateInfo = document.getElementById('mailDateInfo');

        const closeMailDateModalFn = () => {
            if (this.mailDateModal) this.mailDateModal.classList.add('hidden');
            this.pendingMailDateIds = [];
        };

        if (closeMailDateModal) closeMailDateModal.addEventListener('click', closeMailDateModalFn);
        if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', closeMailDateModalFn);
        if (this.mailDateModal) {
            const overlay = this.mailDateModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', closeMailDateModalFn);
        }

        if (confirmMailDateBtn) {
            confirmMailDateBtn.addEventListener('click', () => {
                const inputDate = mailDateInput?.value;
                if (!inputDate) { this.showToast('날짜를 선택해주세요.', 'warning'); return; }
                let updatedCount = 0;
                const changedLogs: SoilLog[] = [];
                this.sampleLogs = this.sampleLogs.map(log => {
                    if (this.pendingMailDateIds.includes(String(log.id))) {
                        updatedCount++;
                        const updated = { ...log, mailDate: inputDate, updatedAt: new Date().toISOString() };
                        changedLogs.push(updated);
                        return updated;
                    }
                    return log;
                });
                this.saveLogs();
                this.firebaseSaveRecords(changedLogs);
                this.filterAndRenderLogs();
                if (this.selectAllCheckbox) { this.selectAllCheckbox.checked = false; this.selectAllCheckbox.indeterminate = false; }
                closeMailDateModalFn();
                this.showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
            });
        }

        if (btnBulkMailDate) {
            btnBulkMailDate.addEventListener('click', () => {
                const selectedIds = this.getSelectedIds();
                if (selectedIds.length === 0) { this.showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning'); return; }
                this.pendingMailDateIds = selectedIds;
                const today = new Date().toISOString().split('T')[0];
                if (mailDateInput) mailDateInput.value = today;
                if (mailDateInfo) mailDateInfo.textContent = `선택한 ${selectedIds.length}건의 우편발송일자를 입력하세요.`;
                if (this.mailDateModal) this.mailDateModal.classList.remove('hidden');
            });
        }

        // 통계
        const btnStatistics = document.getElementById('btnStatistics');
        const closeStatisticsModal = document.getElementById('closeStatisticsModal');
        const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

        if (btnStatistics) btnStatistics.addEventListener('click', () => this.openStatisticsModal());
        if (closeStatisticsModal) closeStatisticsModal.addEventListener('click', () => { if (this.statisticsModal) this.statisticsModal.classList.add('hidden'); });
        if (closeStatisticsBtn) closeStatisticsBtn.addEventListener('click', () => { if (this.statisticsModal) this.statisticsModal.classList.add('hidden'); });
        if (this.statisticsModal) {
            this.statisticsModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) this.statisticsModal.classList.add('hidden');
            });
        }

        // 기존 작물 모달 (숨김 처리)
        const openCropModalBtn = document.getElementById('openCropModalBtn');
        if (openCropModalBtn) openCropModalBtn.style.display = 'none';
        const cropModal = document.getElementById('cropModal');
        const closeCropModalBtn = document.getElementById('closeCropModal');
        const cancelCropBtn = document.getElementById('cancelCropSelection');
        const closeModal = () => { if (cropModal) cropModal.classList.add('hidden'); };
        if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', closeModal);
        if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeModal);
        if (cropModal) {
            const overlay = cropModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', closeModal);
        }

        // 카테고리 필터 초기화
        const cropCategoryFilter = document.getElementById('cropCategoryFilter');
        if (typeof CROP_CATEGORIES !== 'undefined' && cropCategoryFilter) {
            CROP_CATEGORIES.forEach(cat => {
                if (cat !== '전체') {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    cropCategoryFilter.appendChild(option);
                }
            });
        }

        // 엑셀 내보내기
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', () => {
            this.exportToExcel();
        });

        // 흙토람 내보내기 버튼
        const heuktoramBtn = document.getElementById('heuktoramBtn') as HTMLButtonElement | null;
        if (heuktoramBtn) {
            heuktoramBtn.addEventListener('click', () => {
                if (heuktoramBtn.disabled) return;
                heuktoramBtn.disabled = true;
                setTimeout(() => { heuktoramBtn.disabled = false; }, 3000);

                const selectedIds = this.getSelectedIds();
                localStorage.setItem('heuktoram_year', this.selectedYear ?? new Date().getFullYear().toString());
                if (selectedIds && selectedIds.length > 0) {
                    localStorage.setItem('heuktoram_selected_ids', JSON.stringify(selectedIds));
                }
                const electronAPI = (window as Window & { electronAPI?: { isElectron?: boolean; openHeuktoram?: () => Promise<boolean> } }).electronAPI;
                if (electronAPI?.isElectron === true) {
                    electronAPI.openHeuktoram?.().finally(() => { heuktoramBtn.disabled = false; });
                } else {
                    const popup = window.open('../heuktoram/index.html', '_blank', 'noopener,noreferrer');
                    if (!popup) {
                        if (confirm('팝업이 차단되었습니다. 현재 페이지를 떠나 흙토람 페이지로 이동하시겠습니까?')) {
                            window.location.href = '../heuktoram/index.html';
                        } else {
                            heuktoramBtn.disabled = false;
                        }
                    }
                }
            });
        }

        // JSON 저장/불러오기
        const saveJsonBtn = document.getElementById('saveJsonBtn');
        const loadJsonInput = document.getElementById('loadJsonInput');

        SampleUtils.setupJSONSaveHandler({
            buttonElement: saveJsonBtn,
            sampleType: SAMPLE_TYPE,
            getData: () => this.sampleLogs,
            FileAPI: this.FileAPI,
            filePrefix: '시료접수대장',
            showToast: (msg, type) => this.showToast(msg, type)
        });

        SampleUtils.setupJSONLoadHandler({
            inputElement: loadJsonInput,
            getData: () => this.sampleLogs,
            setData: (data) => { this.sampleLogs = data; },
            saveData: () => { this.saveLogs(); this.firebaseBatchSync(); },
            renderData: () => this.filterAndRenderLogs(),
            showToast: (msg, type) => this.showToast(msg, type),
            deduplicateById: true
        });

        // 자동 저장 설정
        SampleUtils.setupAutoSaveFolderButton({
            moduleKey: 'soil',
            FileAPI: this.FileAPI,
            selectedYear: this.selectedYear,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: (msg, type) => this.showToast(msg, type)
        });

        SampleUtils.setupAutoSaveToggle({
            moduleKey: 'soil',
            FileAPI: this.FileAPI,
            getWebFileHandle: () => this.autoSaveFileHandle,
            setWebFileHandle: (handle) => { this.autoSaveFileHandle = handle; },
            autoSaveCallback: () => this.autoSaveToFile(),
            showToast: (msg, type) => this.showToast(msg, type),
            log: (...args) => this.log(...args)
        });

        // 엑셀 가져오기
        this.initExcelImporter();

        // 전체화면 뷰어
        const openViewerBtn = document.getElementById('openViewerBtn');
        if (openViewerBtn) {
            openViewerBtn.addEventListener('click', () => {
                const viewerWindow = window.open('viewer.html', 'DataViewer', 'width=1400,height=800,scrollbars=yes,resizable=yes');
                if (!viewerWindow) alert('팝업이 차단되었습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
            });
        }

        // 등록 결과 모달 이벤트
        const closeRegistrationModal = document.getElementById('closeRegistrationModal');
        const closeResultBtn = document.getElementById('closeResultBtn');
        const exportResultBtn = document.getElementById('exportResultBtn');
        const editResultBtn = document.getElementById('editResultBtn');

        if (closeRegistrationModal) closeRegistrationModal.addEventListener('click', () => this.closeRegistrationResultModal());
        if (closeResultBtn) closeResultBtn.addEventListener('click', () => this.closeRegistrationResultModal());
        if (this.registrationResultModal) {
            const overlay = this.registrationResultModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', () => this.closeRegistrationResultModal());
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
        if (exportResultBtn) exportResultBtn.addEventListener('click', () => this.exportRegistrationResult());

        // 지역 선택 모달 이벤트
        const closeRegionModal = document.getElementById('closeRegionModal');
        const cancelRegionSelection = document.getElementById('cancelRegionSelection');
        if (closeRegionModal) closeRegionModal.addEventListener('click', () => this.closeRegionSelectionModal());
        if (cancelRegionSelection) cancelRegionSelection.addEventListener('click', () => this.closeRegionSelectionModal());
        if (this.regionSelectionModal) {
            const overlay = this.regionSelectionModal.querySelector('.modal-overlay');
            if (overlay) overlay.addEventListener('click', () => this.closeRegionSelectionModal());
        }

        // 네비게이션 바 버튼
        if (this.navResetBtn) this.navResetBtn.addEventListener('click', () => this.resetFormKeepReceptionInfo());
        if (this.navSubmitBtn) this.navSubmitBtn.addEventListener('click', () => this.form.requestSubmit());

        // 페이지네이션 이벤트
        if (this.firstPageBtn) this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
        if (this.prevPageBtn) this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        if (this.nextPageBtn) this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        if (this.lastPageBtn) this.lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value, 10);
                localStorage.setItem('soilItemsPerPage', this.itemsPerPage);
                this.currentPage = 1;
                this.filterAndRenderLogs();
            });
        }
    }

    // ========================================
    // 엑셀 내보내기
    // ========================================

    exportToExcel() {
        if (this.sampleLogs.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
        const selectedIds = this.getSelectedIds();
        const logsToExport = selectedIds.length > 0
            ? this.sampleLogs.filter(log => selectedIds.includes(log.id)) : this.sampleLogs;
        if (selectedIds.length > 0) this.showToast(`선택한 ${logsToExport.length}건을 내보냅니다.`, 'info');

        const sortedLogs = [...logsToExport].sort((a, b) => {
            const aNum = parseInt(String(a.receptionNumber).replace(/\D/g, ''), 10) || 0;
            const bNum = parseInt(String(b.receptionNumber).replace(/\D/g, ''), 10) || 0;
            return aNum - bNum;
        });
        const sanitizeCell = (window as any).SampleUtils?.sanitizeExcelCell ?? ((v: string) => v);
        const excelData = [];

        sortedLogs.forEach(log => {
            const addressParts = parseAddressParts(log.address || '');
            const fullAddress = log.address || '-';
            if (log.parcels && log.parcels.length > 0) {
                log.parcels.forEach((parcel) => {
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ') : '-';
                    const totalArea = parcel.crops ? parcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0) : 0;
                    const excelLotAddress = parcel.lotAddress ? (parcel.isMountain ? `${parcel.lotAddress} (산)` : parcel.lotAddress) : '-';
                    excelData.push({
                        '접수번호': log.receptionNumber, '접수일자': log.date, '구분': log.subCategory || '-',
                        '목적(용도)': parcel.purpose || log.purpose || '-', '성명': sanitizeCell(log.name), '전화번호': log.phoneNumber,
                        '시도': addressParts.sido || '-', '시군구': addressParts.sigungu || '-',
                        '읍면동': addressParts.eupmyeondong || '-', '나머지주소': sanitizeCell(addressParts.rest || '-'),
                        '전체주소': sanitizeCell(fullAddress), '필지 주소': sanitizeCell(excelLotAddress), '작물': cropsDisplay,
                        '면적(m²)': totalArea > 0 ? totalArea : '-', '수령 방법': log.receptionMethod || '-',
                        '비고': sanitizeCell(log.note || '-'), '완료여부': log.isComplete ? '완료' : '미완료',
                        '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                    });
                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, sIdx) => {
                            const subLotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);
                            const subLotCropsDisplay = subLotCrops.length > 0 ? subLotCrops.map(c => c.name).join(', ') : '-';
                            const subLotTotalArea = subLotCrops.length > 0 ? subLotCrops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0) : 0;
                            excelData.push({
                                '접수번호': `${log.receptionNumber}-${sIdx + 1}`, '접수일자': log.date,
                                '구분': log.subCategory || '-', '목적(용도)': parcel.purpose || log.purpose || '-',
                                '성명': sanitizeCell(log.name), '전화번호': log.phoneNumber, '시도': addressParts.sido || '-',
                                '시군구': addressParts.sigungu || '-', '읍면동': addressParts.eupmyeondong || '-',
                                '나머지주소': sanitizeCell(addressParts.rest || '-'), '전체주소': sanitizeCell(fullAddress),
                                '필지 주소': sanitizeCell(subLotAddress), '작물': subLotCropsDisplay,
                                '면적(m²)': subLotTotalArea > 0 ? subLotTotalArea : '-',
                                '수령 방법': log.receptionMethod || '-', '비고': sanitizeCell(log.note || '-'),
                                '완료여부': log.isComplete ? '완료' : '미완료',
                                '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                            });
                        });
                    }
                });
            } else {
                excelData.push({
                    '접수번호': log.receptionNumber, '접수일자': log.date, '구분': log.subCategory || '-',
                    '목적(용도)': log.purpose || '-', '성명': sanitizeCell(log.name), '전화번호': log.phoneNumber,
                    '시도': addressParts.sido || '-', '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-', '나머지주소': sanitizeCell(addressParts.rest || '-'),
                    '전체주소': sanitizeCell(fullAddress), '필지 주소': log.lotAddress || '-',
                    '작물': log.cropsDisplay || '-', '면적(m²)': log.area || '-',
                    '수령 방법': log.receptionMethod || '-', '비고': sanitizeCell(log.note || '-'),
                    '완료여부': log.isComplete ? '완료' : '미완료',
                    '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                });
            }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
            { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
            { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
            { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, '시료접수대장');
        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `토양_접수대장_${today}.xlsx`);
    }

    // ========================================
    // 등록 결과 엑셀 내보내기
    // ========================================

    exportRegistrationResult() {
        if (!this.currentRegistrationData) return;
        const formatArea = this.formatArea || window.SampleUtils?.formatArea || ((v) => v);
        const excelData = [];
        excelData.push({ '항목': '접수번호', '내용': this.currentRegistrationData.receptionNumber });
        excelData.push({ '항목': '접수일자', '내용': this.currentRegistrationData.date });
        excelData.push({ '항목': '구분', '내용': this.currentRegistrationData.subCategory || '-' });
        excelData.push({ '항목': '목적 (용도)', '내용': this.currentRegistrationData.purpose || '-' });
        excelData.push({ '항목': '성명', '내용': this.currentRegistrationData.name });
        excelData.push({ '항목': '전화번호', '내용': this.currentRegistrationData.phoneNumber });
        excelData.push({ '항목': '주소', '내용': this.currentRegistrationData.address || '-' });
        excelData.push({ '항목': '수령 방법', '내용': this.currentRegistrationData.receptionMethod || '-' });
        excelData.push({ '항목': '비고', '내용': this.currentRegistrationData.note || '-' });

        if (this.currentRegistrationData.parcels && this.currentRegistrationData.parcels.length > 0) {
            excelData.push({ '항목': '', '내용': '' });
            excelData.push({ '항목': '=== 필지 정보 ===', '내용': '' });
            this.currentRegistrationData.parcels.forEach((parcel, idx) => {
                excelData.push({ '항목': `필지 ${idx + 1}`, '내용': parcel.lotAddress });
                if (parcel.subLots && parcel.subLots.length > 0) {
                    excelData.push({ '항목': '  하위 필지', '내용': parcel.subLots.map(s => typeof s === 'string' ? s : s.lotAddress).join(', ') });
                }
                if (parcel.crops && parcel.crops.length > 0) {
                    parcel.crops.forEach(crop => {
                        excelData.push({ '항목': '  작물', '내용': `${crop.name} (${formatArea(crop.area)}m²)` });
                    });
                }
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 20 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, ws, '등록결과');
        XLSX.writeFile(wb, `등록결과_${this.currentRegistrationData.receptionNumber}_${this.currentRegistrationData.name}.xlsx`);
        this.showToast('엑셀 파일로 내보내기 완료', 'success');
    }

    // ========================================
    // 엑셀 가져오기 초기화
    // ========================================

    initExcelImporter() {
        const excelImporter = new ExcelImportManager({
            appFields: [
                { key: 'receptionNumber', label: '접수번호' }, { key: 'date', label: '접수일자' },
                { key: 'subCategory', label: '구분(논/밭)' }, { key: 'purpose', label: '목적(용도)' },
                { key: 'name', label: '성명' }, { key: 'phoneNumber', label: '전화번호' },
                { key: 'address', label: '주소' }, { key: 'lotAddress', label: '필지 주소' },
                { key: 'crop', label: '작물' }, { key: 'area', label: '면적(m2)' },
                { key: 'receptionMethod', label: '수령방법' }, { key: 'note', label: '비고' }
            ],
            autoMapRules: {
                '접수번호': 'receptionNumber', '번호': 'receptionNumber', 'no': 'receptionNumber',
                '접수일자': 'date', '날짜': 'date', '일자': 'date',
                '구분': 'subCategory', '분류': 'subCategory', '논밭': 'subCategory',
                '목적': 'purpose', '용도': 'purpose', '목적(용도)': 'purpose',
                '성명': 'name', '이름': 'name', '의뢰인': 'name', '의뢰자': 'name',
                '전화번호': 'phoneNumber', '연락처': 'phoneNumber', '전화': 'phoneNumber', '휴대폰': 'phoneNumber',
                '주소': 'address', '의뢰인주소': 'address', '자택주소': 'address',
                '필지': 'lotAddress', '필지주소': 'lotAddress', '필지 주소': 'lotAddress',
                '지번': 'lotAddress', '소재지': 'lotAddress', '토지소재지': 'lotAddress',
                '작물': 'crop', '작물명': 'crop', '재배작물': 'crop',
                '면적': 'area', '면적(m²)': 'area', '면적(m2)': 'area', '재배면적': 'area',
                '수령방법': 'receptionMethod', '수령 방법': 'receptionMethod',
                '비고': 'note', '메모': 'note', '참고': 'note'
            },
            templateConfig: {
                headers: ['접수번호', '구분', '목적(용도)', '필지 주소', '작물', '면적(m2)', '비고'],
                sampleRow: ['1', '밭', '일반재배', '봉화군 봉화읍 문단리 224', '고추', '1500', ''],
                colWidths: [{ wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 20 }],
                sheetName: '토양시료', fileName: '토양_가져오기_서식'
            },
            previewColumns: [
                { key: 'receptionNumber', label: '접수번호' }, { key: 'date', label: '접수일자' },
                { key: 'subCategory', label: '구분' }, { key: 'name', label: '성명' },
                { key: 'lotAddress', label: '필지 주소' }, { key: 'cropsDisplay', label: '작물' },
                { key: 'area', label: '면적(m2)' }, { key: 'note', label: '비고' }
            ],
            getCommonData: () => {
                const groupId = crypto.randomUUID();
                return {
                    date: document.getElementById('importDate').value || new Date().toISOString().slice(0, 10),
                    name: document.getElementById('importName').value.trim(),
                    phone: document.getElementById('importPhone').value.trim(),
                    address: document.getElementById('importAddress').value.trim(),
                    method: document.getElementById('importMethod').value,
                    purpose: document.getElementById('importPurpose').value,
                    groupId, now: new Date().toISOString()
                };
            },
            buildRecord: (getVal, parseExcelDate, common) => {
                const receptionNumber = getVal('receptionNumber') || '';
                const dateVal = getVal('date');
                const date = parseExcelDate(dateVal) || common.date;
                const subCategory = getVal('subCategory') || '밭';
                const purpose = getVal('purpose') || common.purpose;
                const name = getVal('name') || common.name;
                const phoneNumber = getVal('phoneNumber') || common.phone;
                const address = getVal('address') || common.address;
                const lotAddress = getVal('lotAddress') || '';
                const crop = getVal('crop') || '';
                const areaVal = getVal('area');
                const area = areaVal ? String(parseFloat(areaVal) || 0) : '0';
                const receptionMethod = getVal('receptionMethod') || common.method;
                const note = getVal('note') || '';
                return {
                    id: crypto.randomUUID(), receptionNumber, date, name, phoneNumber, address,
                    subCategory, purpose, receptionMethod, note, groupId: common.groupId,
                    parcelIndex: 0, totalParcels: 0,
                    parcels: [{ id: crypto.randomUUID(), lotAddress, isMountain: false, subLots: [],
                        crops: crop ? [{ name: crop, area: area, unit: 'm2' }] : [],
                        category: subCategory, purpose, note: '' }],
                    lotAddress, area, cropsDisplay: crop || '-',
                    createdAt: common.now, updatedAt: common.now
                };
            },
            skipRowCheck: (record) => {
                if (!record.lotAddress && record.cropsDisplay === '-' && !record.name) return `필지주소, 작물, 성명이 모두 비어 있어 건너뜁니다.`;
                return null;
            },
            postBuildRecords: (records) => {
                const total = records.length;
                records.forEach((l, i) => { l.parcelIndex = i + 1; l.totalParcels = total; });
            },
            getExistingLogs: () => this.sampleLogs,
            autoNumberFilter: (log) => {
                if (!log.receptionNumber) return false;
                if (log.subCategory === '성토') return false;
                const base = log.receptionNumber.split('-')[0];
                if (base.startsWith('F')) return false;
                return true;
            },
            autoNumberExtract: (log) => {
                const base = log.receptionNumber.split('-')[0];
                return parseInt(base, 10);
            },
            onImportComplete: (records) => {
                records.forEach(logEntry => this.sampleLogs.push(logEntry));
                this.sampleLogs.sort((a, b) => {
                    const numA = parseInt(a.receptionNumber) || 0;
                    const numB = parseInt(b.receptionNumber) || 0;
                    if (numA !== numB) return numA - numB;
                    return (a.receptionNumber || '').localeCompare(b.receptionNumber || '');
                });
                this.saveLogs();
                this.firebaseBatchSync(); // 대량 import는 전체 동기화
                this.filterAndRenderLogs();
                this.log('엑셀 가져오기 완료:', records.length, '건');
            }
        });
        excelImporter.init();
    }

    // ========================================
    // Override: 초기화 후 추가 로직
    // ========================================

    async postInit() {
        // 초기 접수번호 설정
        if (this.receptionNumberInput) {
            this.receptionNumberInput.value = this.generateNextReceptionNumber();
        }

        // 로컬 모드에서만 auto-save 로드 (Firebase 모드에서는 로드 안함)
        if (window.isElectron && this.FileAPI?.autoSavePath && !window.firebaseConfig?.isEnabled()) {
            const autoSaveData = await window.loadFromAutoSaveFile();
            if (autoSaveData && autoSaveData.length > 0 && this.sampleLogs.length === 0) {
                this.sampleLogs = autoSaveData;
                localStorage.setItem(this.getStorageKey(this.selectedYear), JSON.stringify(this.sampleLogs));
                this.log('로컬 모드: 자동 저장 파일에서 데이터 로드됨:', autoSaveData.length, '건');
                this.filterAndRenderLogs();
                if (this.receptionNumberInput) {
                    this.receptionNumberInput.value = this.generateNextReceptionNumber();
                }
            }
        }

        this.log('토양 시료 접수 페이지 초기화 완료');
    }
}

// ========================================
// 인스턴스 생성 및 초기화
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const manager = new SoilSampleManager();
    await manager.init();
    await manager.postInit();
    window.soilManager = manager;
});
