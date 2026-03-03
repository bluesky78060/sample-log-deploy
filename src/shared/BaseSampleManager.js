// ========================================
// Base Sample Manager 클래스
// 모든 시료 타입의 공통 기능을 관리하는 기본 클래스
// ========================================

/**
 * 시료 관리의 기본 클래스
 * 모든 시료 타입 (soil, water, compost, pesticide, heavy-metal)이 공통으로 사용하는 기능 제공
 */
class BaseSampleManager {
    /**
     * @param {Object} config - 시료 타입별 설정
     * @param {string} config.moduleKey - 모듈 키 (예: 'soil', 'water')
     * @param {string} config.moduleName - 모듈 표시명 (예: '토양', '수질분석')
     * @param {string} config.storageKey - localStorage 키 (예: 'soilSampleLogs')
     * @param {boolean} config.debug - 디버그 모드 여부
     */
    constructor(config) {
        // 설정
        this.moduleKey = config.moduleKey;
        this.moduleName = config.moduleName;
        this.storageKey = config.storageKey;
        this.sampleType = config.sampleType || config.moduleName;
        this.autoSaveFile = config.autoSaveFile || `${config.moduleKey}-autosave.json`;
        this.debug = config.debug || false;

        // 상태
        this.sampleLogs = [];
        this.selectedYear = new Date().getFullYear().toString();
        this.editingId = null;
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.totalPages = 1;
        this.isCloudSyncing = false;
        this.cloudSyncPromise = null;  // Promise-based lock
        this.listViewStale = true;  // PER-5: 목록 뷰 리렌더 필요 여부
        this._firebaseCache = new Map();  // PER-9: 연도별 Firebase 데이터 캐시 { data, timestamp }
        this._firebaseCacheTTL = 30000;   // PER-9: 캐시 유효 시간 (30초)

        // PaginationManager 인스턴스
        this.pagination = null;

        // DOM 참조 (서브클래스에서 설정)
        this.form = null;
        this.tableBody = null;
        this.emptyState = null;
        this.recordCountEl = null;

        // 자동 저장 관련
        this.autoSaveTimer = null;
        this.lastSavedDataHash = null;

        // FileAPI 인스턴스
        if (window.createFileAPI) {
            this.FileAPI = window.createFileAPI(this.moduleKey);
        }
    }

    // ========================================
    // 초기화
    // ========================================

    /**
     * 매니저 초기화
     */
    async init() {
        try {
            this.log('초기화 시작');

            // FileAPI 초기화
            if (this.FileAPI) {
                await this.FileAPI.init(this.getCurrentYear());
            }

            // Firebase + AutoSave 병렬 초기화
            await Promise.all([
                this.initFirebase(),
                this.initAutoSave()
            ]);

            // UI 초기화 (DOM 요소 캐싱)
            this.initUI();

            // 데이터가 있는 연도 찾기
            this.selectedYear = this.findYearWithData();
            this.syncYearSelects(this.selectedYear);
            this.log('선택된 연도:', this.selectedYear);

            // 선택된 연도의 데이터 로드
            await this.loadYearData(this.selectedYear);

            // 이벤트 리스너 설정
            this.setupEventListeners();

            // 타입별 추가 이벤트 (서브클래스 hook)
            this.setupTypeSpecificEvents();

            // hash 기반 뷰 전환
            this.handleHashChange();
            window.addEventListener('hashchange', () => this.handleHashChange());

            this.log('초기화 완료');
        } catch (error) {
            (window.logger?.error || console.error)('매니저 초기화 실패:', error);
        }
    }

    /**
     * Firebase 초기화
     */
    async initFirebase() {
        if (window.firebaseConfig?.initialize && !window.firebaseInitialized) {
            try {
                window.firebaseInitialized = await window.firebaseConfig.initialize();
                this.log('Firebase 초기화 결과:', window.firebaseInitialized);
            } catch (err) {
                (window.logger?.error || console.error)('Firebase 초기화 에러:', err);
            }
        }

        if (window.firebaseInitialized && window.firestoreDb?.init && !window.firestoreInitialized) {
            try {
                window.firestoreInitialized = await window.firestoreDb.init();
                this.log('Firestore 초기화 결과:', window.firestoreInitialized);
            } catch (err) {
                (window.logger?.error || console.error)('Firestore 초기화 에러:', err);
            }
        }
    }

    // ========================================
    // 연도 관리
    // ========================================

    /**
     * 현재 연도 반환
     */
    getCurrentYear() {
        return new Date().getFullYear();
    }

    /**
     * 연도별 스토리지 키 생성
     * @param {string} year - 연도
     */
    getStorageKey(year) {
        return `${this.storageKey}_${year}`;
    }

    /**
     * 데이터가 있는 연도 자동 감지
     */
    findYearWithData() {
        const currentYear = this.getCurrentYear();
        // 현재 연도부터 2020년까지 검색
        for (let year = currentYear; year >= 2020; year--) {
            const key = this.getStorageKey(year);
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return year.toString();
                    }
                } catch (e) {
                    this.log('JSON 파싱 오류 (무시됨):', key, e.message);
                }
            }
        }
        return currentYear.toString();
    }

    /**
     * 연도 선택 드롭다운 동기화
     * @param {string} newYear - 새로운 연도
     */
    syncYearSelects(newYear) {
        const yearSelect = document.getElementById('yearSelect');
        const listYearSelect = document.getElementById('listYearSelect');

        if (yearSelect) yearSelect.value = newYear;
        if (listYearSelect) listYearSelect.value = newYear;

        this.selectedYear = newYear;
        this.onYearChange(newYear);
    }

    // ========================================
    // 데이터 관리
    // ========================================

    /**
     * 데이터 저장
     */
    async saveLogs() {
        this.listViewStale = true;  // PER-5: 데이터 변경 시 목록 리렌더 필요
        this._firebaseCache.delete(this.selectedYear);  // PER-9: 캐시 무효화
        // 저장 전 hook (서브클래스에서 데이터 가공)
        const processed = this.onBeforeSave(this.sampleLogs);
        if (processed) this.sampleLogs = processed;

        const yearStorageKey = this.getStorageKey(this.selectedYear);

        // ID 생성 (없는 경우)
        this.sampleLogs = this.sampleLogs.map(item => ({
            ...item,
            id: item.id || this.generateId()
        }));

        // Firebase가 활성화되어 있으면 Firebase에 먼저 저장
        if (window.firebaseConfig?.isEnabled()) {
            try {
                this.log(` Firebase에 데이터 저장 중...`);
                await window.firestoreDb.batchSave(this.moduleKey, parseInt(this.selectedYear), this.sampleLogs);
                this.log('☁️ Firebase 저장 완료:', this.sampleLogs.length, '건');

                // 성공 후 localStorage에 캐싱
                localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));
                this.log(` localStorage에 캐싱 완료`);
            } catch (err) {
                (window.logger?.error || console.error)('Firebase 저장 실패:', err);
                this.showToast('Firebase 저장 실패', 'error');

                // Firebase 저장 실패 시에만 localStorage를 primary로 사용
                localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));
                this.log('💾 로컬 저장으로 폴백');
            }
        } else {
            // Firebase가 비활성화된 경우에만 localStorage 사용
            this.log(` Firebase 비활성화, localStorage에만 저장`);
            localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));
            this.log('💾 로컬 저장 완료:', this.sampleLogs.length, '건');
        }

        // 자동 저장 트리거
        this.triggerAutoSave();

        // 레코드 수 업데이트
        this.updateRecordCount();

        // 저장 후 hook
        this.onAfterSave(this.sampleLogs);
    }

    /**
     * 샘플 삭제 - Firebase 우선
     * @param {string} id - 삭제할 샘플 ID
     */
    async deleteSample(id) {
        this.listViewStale = true;  // PER-5
        this._firebaseCache.delete(this.selectedYear);  // PER-9: 캐시 무효화
        // Firebase가 활성화되어 있으면 Firebase에서 먼저 삭제
        if (window.firebaseConfig?.isEnabled()) {
            try {
                this.log(` Firebase에서 데이터 삭제 중... ID:`, id);
                await window.firestoreDb.delete(this.moduleKey, parseInt(this.selectedYear), id);
                this.log('☁️ Firebase 삭제 완료:', id);

                // Firebase 삭제 성공 후 로컬 데이터도 업데이트
                this.sampleLogs = this.sampleLogs.filter(l => String(l.id) !== id);

                // localStorage 캐시 업데이트
                const yearStorageKey = this.getStorageKey(this.selectedYear);
                localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));

                // UI 업데이트 (기본 필터 적용)
                this.filterAndRenderLogs();
                this.updateRecordCount();

                this.showToast('삭제되었습니다.', 'success');
            } catch (err) {
                (window.logger?.error || console.error)('Firebase 삭제 실패:', err);
                this.showToast('Firebase 삭제 실패', 'error');
            }
        } else {
            // Firebase가 비활성화된 경우에만 로컬 삭제
            this.log(` Firebase 비활성화, 로컬에서만 삭제`);
            this.sampleLogs = this.sampleLogs.filter(l => String(l.id) !== id);
            await this.saveLogs();
            this.filterAndRenderLogs();
            this.showToast('삭제되었습니다.', 'success');
        }
    }

    /**
     * 년도별 데이터 로드
     * @param {string} year - 연도
     */
    async loadYearData(year) {
        this.listViewStale = true;  // PER-5
        this.log(`📅 ${year}년 데이터 로드 시작`);

        try {
            const yearStorageKey = this.getStorageKey(year);
            this.log(` loadYearData - storageKey:`, yearStorageKey);

            // Firebase가 활성화되어 있으면 Firebase에서 먼저 데이터 로드
            if (window.firebaseConfig?.isEnabled()) {
                try {
                    // PER-9: TTL 기반 Firebase 캐시 확인
                    const cacheEntry = this._firebaseCache.get(year);
                    const cacheValid = cacheEntry && (Date.now() - cacheEntry.timestamp < this._firebaseCacheTTL);
                    this.log(cacheValid ? ` Firebase 캐시 사용 (${year}년)` : ` Firebase에서 데이터 로드 시작`);
                    const firebaseLogs = cacheValid ? cacheEntry.data : await this.loadFromFirebase(year);

                    if (firebaseLogs && firebaseLogs.length > 0) {
                        this.log(` Firebase 데이터:`, firebaseLogs.length, '건');
                        this.sampleLogs = firebaseLogs;

                        // PER-9: TTL 포함 캐시 저장
                        if (!cacheValid) this._firebaseCache.set(year, { data: firebaseLogs, timestamp: Date.now() });

                        // Firebase 데이터를 localStorage에 저장 (캐싱)
                        localStorage.setItem(yearStorageKey, JSON.stringify(firebaseLogs));
                        this.log(` Firebase 데이터를 localStorage에 캐싱`);
                    } else {
                        this.log(` Firebase에 데이터 없음, localStorage 확인`);
                        // Firebase에 데이터가 없으면 localStorage 확인
                        const localData = localStorage.getItem(yearStorageKey);
                        if (localData) {
                            try {
                                this.sampleLogs = JSON.parse(localData);
                                if (!Array.isArray(this.sampleLogs)) {
                                    this.sampleLogs = [];
                                }
                            } catch (e) {
                                this.sampleLogs = [];
                            }
                        } else {
                            this.sampleLogs = [];
                        }
                    }
                } catch (error) {
                    (window.logger?.error || console.error)('Firebase 로드 실패:', error);
                    // Firebase 로드 실패 시 localStorage 폴백
                    const localData = localStorage.getItem(yearStorageKey);
                    if (localData) {
                        try {
                            this.sampleLogs = JSON.parse(localData);
                        } catch (e) {
                            this.sampleLogs = [];
                        }
                    } else {
                        this.sampleLogs = [];
                    }
                }
            } else {
                this.log(` Firebase 비활성화, localStorage에서 로드`);
                // Firebase가 비활성화되어 있으면 localStorage에서 로드
                const localData = localStorage.getItem(yearStorageKey);
                if (localData) {
                    try {
                        this.sampleLogs = JSON.parse(localData);
                        if (!Array.isArray(this.sampleLogs)) {
                            this.sampleLogs = [];
                        }
                    } catch (e) {
                        this.sampleLogs = [];
                    }
                } else {
                    this.sampleLogs = [];
                }
            }

            this.log(` 최종 sampleLogs 설정:`, this.sampleLogs.length, '건');
            // 공통 마이그레이션 적용
            this.sampleLogs = this.migrateCompletedField(this.sampleLogs);

            // 추가 마이그레이션 (서브클래스 hook)
            const migrations = this.getAdditionalMigrations();
            for (const migrate of migrations) {
                const result = migrate(this.sampleLogs);
                if (result) this.sampleLogs = result;
            }

            // 후처리 hook (예: water의 smartMerge)
            const processed = this.onAfterLoad(this.sampleLogs, year);
            if (processed) this.sampleLogs = processed;

            // UI 업데이트 (기본 필터 적용)
            this.filterAndRenderLogs();
            this.updateRecordCount();

            // 다음 접수번호 설정 (서브클래스에서 구현된 경우)
            if (typeof this.generateNextReceptionNumber === 'function') {
                const nextNumber = this.generateNextReceptionNumber();
                const receptionNumberInput = document.getElementById('receptionNumber');
                if (receptionNumberInput && nextNumber) {
                    receptionNumberInput.value = nextNumber;
                }
            }

            // FileAPI 경로 업데이트
            if (this.FileAPI) {
                await this.FileAPI.updateAutoSavePath(year);
            }

            // 자동 저장 트리거
            this.triggerAutoSave();

            this.log(`✅ ${year}년 데이터 로드 완료:`, this.sampleLogs.length, '건');
        } catch (error) {
            (window.logger?.error || console.error)('데이터 로드 실패:', error);
            this.showToast('데이터 로드 실패', 'error');
        }
    }

    /**
     * 클라우드 동기화
     * @param {string} year - 연도
     * @param {Array} localLogs - 로컬 로그 데이터
     */
    async syncWithCloud(year, localLogs) {
        if (!window.firebaseConfig?.isEnabled()) {
            return;
        }

        // Promise-based lock: 이미 동기화 중이면 기존 작업 완료 대기
        if (this.cloudSyncPromise) {
            this.log('⏳ 기존 동기화 작업 대기 중...');
            await this.cloudSyncPromise;
            return;
        }

        this.cloudSyncPromise = (async () => {
            this.isCloudSyncing = true;
            this.log('☁️ 클라우드 동기화 시작');

            try {
                const firebaseLogs = await this.loadFromFirebase(year);

                if (firebaseLogs && firebaseLogs.length > 0) {
                    const mergedLogs = this.smartMerge(localLogs, firebaseLogs);

                    if (mergedLogs.length !== localLogs.length ||
                        this.hasChanges(localLogs, mergedLogs)) {

                        this.sampleLogs = mergedLogs;
                        localStorage.setItem(this.getStorageKey(year), JSON.stringify(mergedLogs));
                        this.log('✅ 클라우드 데이터 병합 완료');
                    }
                }
            } finally {
                this.isCloudSyncing = false;
                this.cloudSyncPromise = null;
            }
        })();

        await this.cloudSyncPromise;
    }

    /**
     * Firebase에서 데이터 로드
     * @param {string} year - 연도
     */
    async loadFromFirebase(year) {
        try {
            this.log(` Firebase getAll 호출 - moduleKey: ${this.moduleKey}, year: ${year}`);
            this.log(` Firebase 상태:`, {
                isEnabled: window.firestoreDb?.isEnabled ? window.firestoreDb.isEnabled() : 'isEnabled 메서드 없음',
                getAll: typeof window.firestoreDb?.getAll,
                firestoreDb: !!window.firestoreDb
            });

            const data = await window.firestoreDb.getAll(this.moduleKey, parseInt(year));
            this.log(` Firebase 응답:`, data ? `${data.length}건` : 'null/undefined');
            this.log(` Firebase 데이터 샘플:`, data && data.length > 0 ? data[0] : 'No data');
            return data || [];
        } catch (error) {
            console.error(`[${this.moduleName}] Firebase 로드 오류 상세:`, error);
            (window.logger?.error || console.error)('Firebase 로드 실패:', error);
            return [];
        }
    }

    /**
     * 스마트 병합 - utils.js의 함수 사용
     */
    smartMerge(localData, firebaseData) {
        if (window.SyncUtils?.smartMerge) {
            return window.SyncUtils.smartMerge(localData, firebaseData);
        }
        // 폴백: Firebase 데이터 우선
        return firebaseData;
    }

    /**
     * 데이터 변경 감지 (최적화: 배열의 경우 id/updatedAt만 비교)
     */
    hasChanges(data1, data2) {
        if (!Array.isArray(data1) || !Array.isArray(data2)) {
            return JSON.stringify(data1) !== JSON.stringify(data2);
        }
        if (data1.length !== data2.length) return true;
        for (let i = 0; i < data1.length; i++) {
            if (data1[i].id !== data2[i].id) return true;
            if (data1[i].updatedAt !== data2[i].updatedAt) return true;
        }
        return false;
    }

    // ========================================
    // 자동 저장
    // ========================================

    /**
     * 자동 저장 초기화
     */
    async initAutoSave() {
        if (!this.FileAPI || !window.isElectron) {
            return;
        }

        // SampleUtils가 있으면 사용
        if (window.SampleUtils?.initAutoSave) {
            await window.SampleUtils.initAutoSave({
                moduleKey: this.moduleKey,
                moduleName: this.moduleName,
                FileAPI: this.FileAPI,
                currentYear: this.selectedYear,
                log: (...args) => this.log(...args),
                showToast: window.showToast
            });

            // 자동 저장 파일에서 데이터 로드하는 함수
            window.loadFromAutoSaveFile = async () => {
                return await window.SampleUtils.loadFromAutoSaveFile(this.FileAPI, (...args) => this.log(...args));
            };
        } else {
            // 폴백: 기본 자동 저장 처리
            try {
                const savedData = await this.FileAPI.loadAutoSave();
                if (savedData) {
                    this.lastSavedDataHash = this.hashData(savedData);
                }
            } catch (error) {
                this.log('자동 저장 데이터 로드 실패:', error);
            }
        }
    }

    /**
     * 자동 저장 트리거
     */
    triggerAutoSave() {
        if (!this.FileAPI || !window.isElectron) {
            return;
        }

        // 기존 타이머 클리어
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // 3초 후 저장
        this.autoSaveTimer = setTimeout(() => {
            this.performAutoSave();
        }, 3000);
    }

    /**
     * 자동 저장 수행
     */
    async performAutoSave() {
        try {
            // 자동 저장 활성화 여부 확인
            const enabledKey = `${this.moduleKey}AutoSaveEnabled`;
            if (localStorage.getItem(enabledKey) !== 'true') return;

            const currentDataHash = this.hashData(this.sampleLogs);

            // 데이터가 변경된 경우만 저장
            if (currentDataHash !== this.lastSavedDataHash) {
                const content = JSON.stringify({
                    version: '2.0',
                    exportDate: new Date().toISOString(),
                    totalRecords: this.sampleLogs.length,
                    data: this.sampleLogs
                }, null, 2);
                const result = await this.FileAPI.autoSave(content);

                if (result) {
                    this.lastSavedDataHash = currentDataHash;
                    this.log('✅ 자동 저장 완료');
                }
            }
        } catch (error) {
            this.log('자동 저장 실패:', error);
        }
    }

    /**
     * 데이터 해시 생성
     */
    hashData(data) {
        const str = JSON.stringify(data);
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    // ========================================
    // UI 관리
    // ========================================

    /**
     * UI 초기화
     */
    initUI() {
        // DOM 요소 캐싱
        this.cacheElements();

        // 뷰 초기화
        this.initViews();

        // 페이지네이션 초기화
        this.initPagination();

        // 이벤트 위임 설정
        this.setupTableEventDelegation();
    }

    /**
     * 테이블 이벤트 위임 설정 (메모리 효율적인 이벤트 처리)
     */
    setupTableEventDelegation() {
        if (!this.tableBody || !window.EventDelegator) return;

        this.tableDelegator = new window.EventDelegator(this.tableBody);

        // 수정 버튼
        this.tableDelegator.on('click', '.btn-edit', (e, target) => {
            const id = target.dataset.id;
            if (id) this.editSample(id);
        });

        // 삭제 버튼
        this.tableDelegator.on('click', '.btn-delete', (e, target) => {
            const id = target.dataset.id;
            if (id && confirm('이 항목을 삭제하시겠습니까?')) {
                this.deleteSample(id);
            }
        });

        // 완료 토글 버튼
        this.tableDelegator.on('click', '.btn-complete', (e, target) => {
            const id = target.dataset.id;
            if (id && typeof this.toggleComplete === 'function') {
                this.toggleComplete(id);
            }
        });

        // 판정 토글 버튼
        this.tableDelegator.on('click', '.btn-result', (e, target) => {
            const id = target.dataset.id;
            if (id && typeof this.toggleResult === 'function') {
                this.toggleResult(id);
            }
        });

        // 접수번호 클릭 (편집)
        this.tableDelegator.on('click', '.btn-link.edit-btn', (e, target) => {
            e.preventDefault();
            const row = target.closest('tr');
            const editBtn = row?.querySelector('.btn-edit');
            const id = editBtn?.dataset.id;
            if (id) this.editSample(id);
        });
    }

    /**
     * 리소스 정리 (메모리 누수 방지)
     */
    destroy() {
        // 이벤트 위임 정리
        if (this.tableDelegator) {
            this.tableDelegator.destroy();
            this.tableDelegator = null;
        }

        // 자동 저장 타이머 정리
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        // 참조 정리
        this.form = null;
        this.tableBody = null;
        this.emptyState = null;
        this.recordCountEl = null;
    }

    /**
     * DOM 요소 캐싱
     */
    cacheElements() {
        this.form = document.getElementById('sampleForm');
        this.tableBody = document.getElementById('sampleTableBody');
        this.emptyState = document.querySelector('.empty-state');
        this.recordCountEl = document.getElementById('recordCount');
    }

    /**
     * 뷰 전환
     * @param {string} viewName - 뷰 이름
     */
    switchView(viewName) {
        const views = document.querySelectorAll('.view');
        const navItems = document.querySelectorAll('.nav-btn');

        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        // 목록 뷰로 전환 시 변경된 경우에만 테이블 새로고침 (PER-5)
        if (viewName === 'list' && this.listViewStale) {
            this.filterAndRenderLogs();
            this.listViewStale = false;
        }
    }

    /**
     * 레코드 수 업데이트
     */
    updateRecordCount() {
        if (this.recordCountEl) {
            this.recordCountEl.textContent = `총 ${this.sampleLogs.length}건`;
        }
    }

    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        }
    }

    // ========================================
    // 이벤트 리스너
    // ========================================

    /**
     * 이벤트 리스너 설정
     */
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

    /**
     * 네비게이션 이벤트 설정
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-btn');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewName = item.dataset.view;
                this.switchView(viewName);
            });
        });
    }

    /**
     * 폼 이벤트 설정
     */
    setupFormEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitForm();
            });

            // 취소 버튼
            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.resetForm();
                    this.editingId = null;
                    this.switchView('register');
                });
            }
        }
    }

    /**
     * 연도 선택 이벤트 설정
     */
    setupYearSelection() {
        const yearSelect = document.getElementById('yearSelect');
        const listYearSelect = document.getElementById('listYearSelect');

        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.syncYearSelects(e.target.value);
                this.loadYearData(e.target.value);
            });
        }

        if (listYearSelect) {
            listYearSelect.addEventListener('change', (e) => {
                this.syncYearSelects(e.target.value);
                this.loadYearData(e.target.value);
            });
        }
    }

    /**
     * 전화번호 포맷팅 설정
     */
    setupPhoneFormatting() {
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput && window.formatPhoneNumber) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = window.formatPhoneNumber(e.target.value);
            });
        }
    }

    /**
     * 수령 방법 버튼 설정
     */
    setupReceptionMethod() {
        const methodBtns = document.querySelectorAll('.method-btn');
        const methodInput = document.getElementById('receptionMethod');

        methodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                methodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (methodInput) {
                    methodInput.value = btn.dataset.value;
                }
            });
        });
    }

    // ========================================
    // 유틸리티 메서드
    // ========================================

    /**
     * 고유 ID 생성
     */
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return (typeof SampleUtils !== 'undefined' && SampleUtils.generateUUID) ? SampleUtils.generateUUID() : crypto.randomUUID();
    }

    /**
     * 디버그 로그
     */
    log(...args) {
        if (this.debug) {
            (window.logger?.debug || console.log)(`[${this.moduleName}]`, ...args);
        }
    }

    // ========================================
    // 추상 메서드 (서브클래스에서 구현 필요)
    // ========================================

    /**
     * 필터를 적용한 렌더링 (서브클래스에서 override)
     * 기본 구현은 renderLogs를 직접 호출 (필터 없음)
     */
    filterAndRenderLogs() {
        this.renderLogs(this.sampleLogs);
    }

    /**
     * 로그 렌더링 (테이블 그리기)
     * @abstract
     */
    renderLogs(logs) {
        // 서브클래스의 prepareDataForRender hook (soil/pesticide: flattenLogsForTable)
        const preparedData = this.prepareDataForRender(logs);

        if (this.pagination) {
            this.pagination.setData(preparedData);
        } else {
            // PaginationManager 없이 직접 렌더링 (폴백)
            if (this.tableBody) {
                this.tableBody.innerHTML = '';
                preparedData.forEach((item, index) => {
                    const row = this.buildTableRow(item, index);
                    if (row) this.tableBody.appendChild(row);
                });
            }
        }
    }

    /**
     * 폼 제출 처리
     * @abstract
     */
    submitForm() {
        throw new Error('submitForm must be implemented by subclass');
    }

    /**
     * 샘플 편집
     * @abstract
     */
    editSample(id) {
        throw new Error('editSample must be implemented by subclass');
    }

    /**
     * 폼 초기화
     * @abstract
     */
    resetForm() {
        throw new Error('resetForm must be implemented by subclass');
    }

    /**
     * 테이블 행 빌드 (PaginationManager에서 호출)
     * @abstract
     * @param {Object} item - 데이터 항목
     * @param {number} index - 인덱스
     * @returns {HTMLElement} tr 요소
     */
    buildTableRow(item, index) {
        // 서브클래스에서 구현 필요
        // PaginationManager 미사용 시에는 구현하지 않아도 됨
        return null;
    }

    /**
     * 렌더링 전 데이터 가공 (soil/pesticide: flattenLogsForTable)
     * @param {Array} logs - 원본 데이터
     * @returns {Array} 가공된 데이터
     */
    prepareDataForRender(logs) {
        return logs;
    }

    /**
     * 추가 마이그레이션 함수 목록 (pesticide: migrateProducerAddress 등)
     * @returns {Array<Function>} 마이그레이션 함수 배열
     */
    getAdditionalMigrations() {
        return [];
    }

    /**
     * 공통 completed 필드 마이그레이션
     * @param {Array} logs - 데이터
     * @returns {Array} 마이그레이션된 데이터
     */
    migrateCompletedField(logs) {
        if (!Array.isArray(logs)) return logs;
        return logs.map(log => {
            if (log.completed === undefined) {
                return { ...log, completed: false };
            }
            return log;
        });
    }

    /**
     * hash 기반 뷰 전환
     */
    handleHashChange() {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            this.switchView(hash);
        }
    }

    /**
     * 타입별 추가 이벤트 설정 (서브클래스에서 override)
     */
    setupTypeSpecificEvents() {
        // 서브클래스에서 오버라이드
    }

    /**
     * 페이지 변경 시 콜백 (서브클래스에서 override)
     */
    onPageChange(page, pageData) {
        // 서브클래스에서 오버라이드 가능
    }

    /**
     * 데이터 로드 후처리 hook
     */
    onAfterLoad(data, year) {
        return data;
    }

    // ========================================
    // Hook 메서드 (선택적 오버라이드)
    // ========================================

    /**
     * 뷰 초기화 시 호출
     */
    initViews() {
        // 서브클래스에서 오버라이드 가능
    }

    /**
     * 페이지네이션 초기화
     */
    initPagination() {
        if (!window.PaginationManager) return;

        this.pagination = new window.PaginationManager({
            storageKey: `${this.moduleKey}ItemsPerPage`,
            defaultItemsPerPage: 100,
            onPageChange: (page, pageData) => {
                this.onPageChange(page, pageData);
            },
            renderRow: (item, index) => {
                return this.buildTableRow(item, index);
            }
        });

        this.pagination.setTableElements(
            this.tableBody,
            this.emptyState
        );
    }

    /**
     * 연도 변경 시 호출
     */
    onYearChange(newYear) {
        // 서브클래스에서 오버라이드 가능
    }

    /**
     * 데이터 저장 전 처리
     */
    onBeforeSave(data) {
        return data;
    }

    /**
     * 데이터 저장 후 처리
     */
    onAfterSave(data) {
        // 서브클래스에서 오버라이드 가능
    }

    // ========================================
    // 정적 유틸리티 메서드
    // ========================================

    /**
     * 등록 결과 테이블 빌드 (DOM 직접 조작으로 XSS 방지)
     * @param {HTMLElement} tableBody - tbody 요소
     * @param {Array<{label: string, value: string, isMultiline?: boolean}>} rows - 테이블 행 데이터
     */
    static buildResultTable(tableBody, rows) {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        rows.forEach(({ label, value, isMultiline }) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            const td = document.createElement('td');

            th.textContent = label;

            if (isMultiline && value && value !== '-') {
                // 줄바꿈을 <br>로 변환 (의뢰물품명 등)
                const div = document.createElement('div');
                div.className = 'request-content';
                String(value).split('\n').forEach((line, idx, arr) => {
                    div.appendChild(document.createTextNode(line));
                    if (idx < arr.length - 1) {
                        div.appendChild(document.createElement('br'));
                    }
                });
                td.appendChild(div);
            } else {
                td.textContent = value || '-';
            }

            tr.appendChild(th);
            tr.appendChild(td);
            tableBody.appendChild(tr);
        });
    }
}

// 전역으로 내보내기 (Vite 번들 환경에서도 window에 노출)
window.BaseSampleManager = BaseSampleManager;