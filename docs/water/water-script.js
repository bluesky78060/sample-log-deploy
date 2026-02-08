/**
 * @fileoverview 수질분석 시료 전용 스크립트
 * @description 수질 분석용 시료 접수/관리 기능
 */

// ========================================
// 상수 및 설정
// ========================================

/** @type {string} */
const SAMPLE_TYPE = '물';

/** @type {string} */
const STORAGE_KEY = 'waterSampleLogs';

/** @type {string} */
const AUTO_SAVE_FILE = 'water-autosave.json';

/**
 * 고유 ID 생성 함수 (충돌 방지)
 * @returns {string} 고유 ID
 */
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 11);

/**
 * 디버그 로그 함수 (window.DEBUG 사용 - constants.js에서 설정)
 * @param {...any} args - 로그 인자
 * @returns {void}
 */
const log = (...args) => window.DEBUG && console.log(...args);

// 공통 모듈에서 가져온 변수/함수 사용 (../shared/*.js)
// window.isElectron, window.createFileAPI 등 전역 변수 사용
const FileAPI = window.createFileAPI('water');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 수질분석 페이지 로드 시작');
    console.log('DOMContentLoaded 이벤트 발생');
    log('🚀 수질분석 페이지 로드 시작');
    log(window.isElectron ? '🖥️ Electron 환경' : '🌐 웹 브라우저 환경');

    // 필수 요소 체크
    console.log('필수 요소 체크:', {
        form: !!document.getElementById('sampleForm'),
        tableBody: !!document.getElementById('logTableBody'),
        SampleUtils: !!window.SampleUtils,
        showToast: !!window.showToast
    });

    // 파일 API 초기화 (현재 년도로)
    const currentYear = new Date().getFullYear().toString();
    try {
        console.log('FileAPI 초기화 시작, FileAPI:', !!FileAPI);
        await FileAPI.init(currentYear);
        console.log('FileAPI 초기화 완료');
    } catch (error) {
        console.error('초기화 중 에러 발생:', error);
        return;
    }

    // Firebase 초기화와 자동 저장 초기화를 병렬로 실행 (async-parallel)
    let firebaseReady = false;

    // Firebase 초기화 Promise
    const firebaseInitPromise = (async () => {
        try {
            if (window.firebaseConfig?.initialize) {
                const firebaseInitialized = await window.firebaseConfig.initialize();
                if (firebaseInitialized && window.firestoreDb?.init) {
                    await window.firestoreDb.init();
                    log('☁️ Firebase 초기화 완료');
                    return true;
                }
            }
        } catch (err) {
            console.warn('Firebase 초기화 실패, 로컬 모드로 동작:', err);
        }
        return false;
    })();

    // 자동 저장 초기화 Promise
    const autoSaveInitPromise = SampleUtils.initAutoSave({
        moduleKey: 'water',
        moduleName: '수질분석',
        FileAPI: FileAPI,
        currentYear: currentYear,
        log: log,
        showToast: window.showToast
    });

    // 병렬 실행 후 결과 대기
    const [firebaseResult] = await Promise.all([firebaseInitPromise, autoSaveInitPromise]);
    firebaseReady = firebaseResult;

    // 자동 저장 파일에서 데이터 로드하는 함수 (공통 모듈 사용)
    window.loadFromAutoSaveFile = async function() {
        return await SampleUtils.loadFromAutoSaveFile(FileAPI, log);
    };

    // ========================================
    // DOM 요소
    // ========================================
    const form = document.getElementById('sampleForm');
    const tableBody = document.getElementById('logTableBody');
    const emptyState = document.getElementById('emptyState');
    const dateInput = document.getElementById('date');
    const navItems = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const recordCountEl = document.getElementById('recordCount');
    const paginationContainer = document.getElementById('pagination');

    // ========================================
    // 페이지네이션 설정
    // ========================================
    let currentPage = 1;
    let itemsPerPage = parseInt(localStorage.getItem('waterItemsPerPage'), 10) || 100;
    let totalPages = 1;
    let currentDisplayLogs = [];

    const paginationInfo = document.getElementById('paginationInfo');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    if (itemsPerPageSelect) {
        itemsPerPageSelect.value = itemsPerPage;
    }

    // 오늘 날짜 설정
    dateInput.valueAsDate = new Date();

    // ========================================
    // 년도 선택 기능
    // ========================================
    const yearSelect = document.getElementById('yearSelect');
    const listYearSelect = document.getElementById('listYearSelect');
    const listViewTitle = document.getElementById('listViewTitle');

    // 년도별 스토리지 키 생성
    function getStorageKey(year) {
        return `${STORAGE_KEY}_${year}`;
    }

    // 데이터가 있는 연도 자동 감지 (현재 연도부터 과거로 검색)
    function findYearWithData() {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= 2020; year--) {
            const key = getStorageKey(year);
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return year.toString();
                    }
                } catch (e) {}
            }
        }
        return currentYear.toString();
    }

    let selectedYear = findYearWithData();

    // 감지된 년도로 드롭다운 기본값 설정
    if (yearSelect) {
        yearSelect.value = selectedYear;
    }
    if (listYearSelect) {
        listYearSelect.value = selectedYear;
    }

    // 년도 선택 시 제목 업데이트
    function updateListViewTitle() {
        if (listViewTitle) {
            listViewTitle.textContent = `수질분석 접수 목록`;
        }
    }

    // 두 연도 선택 드롭다운 동기화
    function syncYearSelects(newYear) {
        if (yearSelect) yearSelect.value = newYear;
        if (listYearSelect) listYearSelect.value = newYear;
    }

    // 초기 제목 설정
    updateListViewTitle();

    // ========================================
    // 데이터 로드 (년도별) - safeParseJSON 사용으로 에러 핸들링
    // ========================================
    let sampleLogs = SampleUtils.safeParseJSON(getStorageKey(selectedYear), []);

    // 기존 데이터 마이그레이션 (년도 없는 기존 데이터를 현재 년도로 이동)
    const oldData = SampleUtils.safeParseJSON(STORAGE_KEY, []);
    if (oldData.length > 0 && sampleLogs.length === 0) {
        sampleLogs = oldData;
        localStorage.setItem(getStorageKey(selectedYear), JSON.stringify(sampleLogs));
        log('📂 기존 데이터를 년도별 저장소로 마이그레이션:', sampleLogs.length, '건');
    }

    // Firebase에서 데이터 로드 (클라우드 동기화)
    async function loadFromFirebase(year) {
        try {
            // storageManager가 클라우드 모드인지 확인
            if (window.storageManager?.isCloudEnabled()) {
                const cloudData = await window.storageManager.load('water', parseInt(year), getStorageKey(year));
                if (cloudData && cloudData.length > 0) {
                    // localStorage에도 저장 (캐시)
                    localStorage.setItem(getStorageKey(year), JSON.stringify(cloudData));
                    log('☁️ Firebase에서 데이터 로드:', cloudData.length, '건');
                    return cloudData;
                }
            }
            // firestoreDb 직접 사용 (storageManager가 초기화되지 않은 경우)
            if (window.firestoreDb?.isEnabled()) {
                const cloudData = await window.firestoreDb.getAll('water', parseInt(year));
                if (cloudData && cloudData.length > 0) {
                    // localStorage에도 저장 (캐시)
                    localStorage.setItem(getStorageKey(year), JSON.stringify(cloudData));
                    log('☁️ Firebase에서 데이터 로드 (직접):', cloudData.length, '건');
                    return cloudData;
                }
            }
        } catch (error) {
            window.logger.error('Firebase 데이터 로드 실패:', error);
        }
        return null;
    }

    // 년도별 데이터 로드 함수 (Firebase 우선, 로컬 폴백)
    async function loadYearData(year) {
        const yearStorageKey = getStorageKey(year);

        // 1. Firebase에서 먼저 로드 시도
        if (window.firestoreDb?.isEnabled()) {
            try {
                log('☁️ Firebase에서 데이터 로드 중...');
                const cloudData = await window.firestoreDb.getAll('water', parseInt(year), { skipOrder: true });

                if (cloudData && cloudData.length > 0) {
                    const localData = SampleUtils.safeParseJSON(yearStorageKey, []);

                    // 스마트 병합: 최신 데이터 선택
                    const mergedData = smartMerge(localData, cloudData);
                    sampleLogs = mergedData.data;
                    localStorage.setItem(yearStorageKey, JSON.stringify(mergedData.data));

                    renderLogs(sampleLogs);
                    const receptionInput = document.getElementById('receptionNumber');
                    if (receptionInput) {
                        receptionInput.value = generateNextReceptionNumber();
                    }
                    updateListViewTitle();

                    if (mergedData.hasChanges) {
                        log('☁️ Firebase에서 동기화 완료:', mergedData.data.length, '건');
                        const msgs = [];
                        if (mergedData.updated > 0) msgs.push(`${mergedData.updated}건 업데이트`);
                        if (mergedData.added > 0) msgs.push(`${mergedData.added}건 추가`);
                        if (mergedData.deleted > 0) msgs.push(`${mergedData.deleted}건 삭제`);
                        showToast(`클라우드에서 동기화됨 (${msgs.join(', ')})`, 'success');

                        // 자동저장 실행 (JSON 파일)
                        const autoSaveEnabled = localStorage.getItem('waterAutoSaveEnabled') === 'true';
                        if (autoSaveEnabled && window.isElectron && FileAPI.autoSavePath) {
                            SampleUtils.performAutoSave({
                                FileAPI: FileAPI,
                                moduleKey: 'water',
                                data: sampleLogs,
                                log: log
                            });
                        }
                    } else {
                        log('☁️ Firebase 로드 완료:', cloudData.length, '건');
                    }
                    return;
                }
            } catch (error) {
                window.logger.error('Firebase 로드 실패, 로컬 데이터 사용:', error);
            }
        }

        // 2. Firebase 사용 불가 또는 데이터 없음 → 로컬에서 로드
        sampleLogs = SampleUtils.safeParseJSON(yearStorageKey, []);
        renderLogs(sampleLogs);

        const receptionInput = document.getElementById('receptionNumber');
        if (receptionInput) {
            receptionInput.value = generateNextReceptionNumber();
        }
        updateListViewTitle();
    }

    // 클라우드 동기화 함수 (백그라운드 실행)
    async function syncWithCloud(year) {
        try {
            if (!window.firestoreDb?.isEnabled()) return;

            log('☁️ 클라우드 동기화 시작...');
            const cloudData = await window.firestoreDb.getAll('water', parseInt(year), { skipOrder: true });

            if (!cloudData || cloudData.length === 0) {
                log('☁️ 클라우드에 데이터 없음');
                return;
            }

            const yearStorageKey = getStorageKey(year);
            const localData = SampleUtils.safeParseJSON(yearStorageKey, []);

            // 스마트 병합: ID 기반으로 최신 데이터 선택
            const mergedData = smartMerge(localData, cloudData);

            // 변경사항이 있으면 업데이트
            if (mergedData.hasChanges) {
                sampleLogs = mergedData.data;
                localStorage.setItem(yearStorageKey, JSON.stringify(mergedData.data));
                renderLogs(sampleLogs);
                const receptionInput = document.getElementById('receptionNumber');
                if (receptionInput) {
                    receptionInput.value = generateNextReceptionNumber();
                }
                log('☁️ 클라우드에서 동기화 완료:', mergedData.data.length, '건');
                const msgs = [];
                if (mergedData.updated > 0) msgs.push(`${mergedData.updated}건 업데이트`);
                if (mergedData.added > 0) msgs.push(`${mergedData.added}건 추가`);
                if (mergedData.deleted > 0) msgs.push(`${mergedData.deleted}건 삭제`);
                showToast(`클라우드에서 동기화됨 (${msgs.join(', ')})`, 'success');

                // 자동저장 실행 (JSON 파일)
                const autoSaveEnabled = localStorage.getItem('waterAutoSaveEnabled') === 'true';
                if (autoSaveEnabled && window.isElectron && FileAPI.autoSavePath) {
                    SampleUtils.performAutoSave({
                        FileAPI: FileAPI,
                        moduleKey: SAMPLE_TYPE,
                        data: sampleLogs,
                        log: log
                    });
                }
            } else {
                log('☁️ 로컬과 클라우드 데이터 동일 (', localData.length, '건)');
            }
        } catch (error) {
            window.logger.error('클라우드 동기화 실패:', error);
        }
    }

    // 스마트 병합 함수 참조 (공통 모듈 사용)
    const smartMerge = window.SyncUtils.smartMerge;

    // 연도 전환 시 자동 저장 파일에서 데이터 복원
    async function loadAutoSaveForSelectedYear() {
        if (!window.isElectron || !FileAPI.autoSavePath || sampleLogs.length > 0) return;

        const autoSaveData = await window.loadFromAutoSaveFile();
        if (autoSaveData && autoSaveData.length > 0) {
            sampleLogs = autoSaveData;
            localStorage.setItem(getStorageKey(selectedYear), JSON.stringify(sampleLogs));
            renderLogs(sampleLogs);
            const receptionInput = document.getElementById('receptionNumber');
            if (receptionInput) {
                receptionInput.value = generateNextReceptionNumber();
            }
            log(`📂 ${selectedYear}년 자동 저장 데이터 로드:`, autoSaveData.length, '건');
        }
    }

    // 년도 선택 이벤트 (접수 폼)
    if (yearSelect) {
        yearSelect.addEventListener('change', async (e) => {
            selectedYear = e.target.value;
            syncYearSelects(selectedYear);
            loadYearData(selectedYear);
            // 자동 저장 경로도 연도별로 업데이트
            if (window.isElectron) {
                await FileAPI.updateAutoSavePath(selectedYear);
                await loadAutoSaveForSelectedYear();
            }
            showToast(`${selectedYear}년 데이터를 불러왔습니다.`, 'success');
        });
    }

    // 년도 선택 이벤트 (조회 뷰)
    if (listYearSelect) {
        listYearSelect.addEventListener('change', async (e) => {
            selectedYear = e.target.value;
            syncYearSelects(selectedYear);
            loadYearData(selectedYear);
            // 자동 저장 경로도 연도별로 업데이트
            if (window.isElectron) {
                await FileAPI.updateAutoSavePath(selectedYear);
                await loadAutoSaveForSelectedYear();
            }
            showToast(`${selectedYear}년 데이터를 불러왔습니다.`, 'success');
        });
    }

    // ========================================
    // 뷰 전환
    // ========================================
    function switchView(viewName) {
        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        if (viewName === 'list') {
            renderLogs(sampleLogs);
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
        });
    });

    // 빈 상태에서 "새 시료 접수하기" 버튼
    const btnGoForm = document.querySelector('.btn-go-form');
    if (btnGoForm) {
        btnGoForm.addEventListener('click', () => switchView('form'));
    }

    // 토스트 메시지 - 공통 모듈 사용 (../shared/toast.js)
    const showToast = window.showToast;

    // ========================================
    // 레코드 카운트 업데이트
    // ========================================
    function updateRecordCount() {
        if (recordCountEl) {
            recordCountEl.textContent = `${sampleLogs.length}건`;
        }
    }

    // ========================================
    // 전화번호 자동 하이픈 - 공통 모듈 사용
    // ========================================
    const phoneNumberInput = document.getElementById('phoneNumber');
    window.SampleUtils.setupPhoneNumberInput(phoneNumberInput);

    // ========================================
    // 개인/법인 선택 전환
    // ========================================
    const applicantTypeSelect = document.getElementById('applicantType');
    const birthDateField = document.getElementById('birthDateField');
    const corpNumberField = document.getElementById('corpNumberField');
    const birthDateInput = document.getElementById('birthDate');
    const corpNumberInput = document.getElementById('corpNumber');

    if (applicantTypeSelect) {
        applicantTypeSelect.addEventListener('change', () => {
            const isCorpSelected = applicantTypeSelect.value === '법인';
            if (isCorpSelected) {
                birthDateField.classList.add('hidden');
                corpNumberField.classList.remove('hidden');
                birthDateInput.value = '';
            } else {
                birthDateField.classList.remove('hidden');
                corpNumberField.classList.add('hidden');
                corpNumberInput.value = '';
            }
        });
    }

    // 법인번호 자동 하이픈 (######-#######)
    if (corpNumberInput) {
        corpNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length > 13) value = value.slice(0, 13);
            if (value.length > 6) {
                value = value.slice(0, 6) + '-' + value.slice(6);
            }
            e.target.value = value;
        });
    }

    // ========================================
    // 전체 보기 토글 (숨김 컬럼 표시)
    // ========================================
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    let isFullView = false;

    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isFullView = !isFullView;
            const hiddenCols = document.querySelectorAll('.col-zipcode, .col-applicant-type, .col-birth-corp');
            hiddenCols.forEach(col => {
                if (isFullView) {
                    col.classList.remove('hidden');
                } else {
                    col.classList.add('hidden');
                }
            });
            // 버튼 텍스트 변경
            const toggleText = viewToggleBtn.querySelector('.toggle-text');
            if (toggleText) {
                toggleText.textContent = isFullView ? '기본 보기' : '전체 보기';
            }
        });
    }

    // ========================================
    // 통보방법 선택
    // ========================================
    const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
    const receptionMethodInput = document.getElementById('receptionMethod');

    receptionMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            receptionMethodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            receptionMethodInput.value = btn.dataset.method;
        });
    });

    // 주소 검색 - 공통 모듈 사용 (../shared/address.js)
    const addressPostcode = document.getElementById('addressPostcode');
    const addressRoad = document.getElementById('addressRoad');
    const addressDetail = document.getElementById('addressDetail');
    const addressHidden = document.getElementById('address');

    const addressManager = new window.AddressManager({
        searchBtn: document.getElementById('searchAddressBtn'),
        postcodeInput: addressPostcode,
        roadInput: addressRoad,
        detailInput: addressDetail,
        hiddenInput: addressHidden,
        modal: document.getElementById('addressModal'),
        closeBtn: document.getElementById('closeAddressModal'),
        container: document.getElementById('daumPostcodeContainer')
    });

    // ========================================
    // 검사항목 선택 시 상세정보 토글
    // ========================================
    const testItemRadios = document.querySelectorAll('input[name="testItems"]');
    const livingWaterItems = document.getElementById('livingWaterItems');
    const agriculturalWaterItems = document.getElementById('agriculturalWaterItems');

    testItemRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === '생활용수') {
                livingWaterItems.classList.add('active');
                agriculturalWaterItems.classList.remove('active');
            } else {
                livingWaterItems.classList.remove('active');
                agriculturalWaterItems.classList.add('active');
            }
        });
    });

    // ========================================
    // 접수번호 자동 생성
    // ========================================
    const receptionNumberInput = document.getElementById('receptionNumber');

    function generateNextReceptionNumber() {
        let maxNumber = 0;

        sampleLogs.forEach(log => {
            if (log.receptionNumber) {
                // 수질은 쉼표로 구분된 개별 번호 형식 (예: "5, 6, 7")
                // 마지막 번호를 찾아서 그 다음 번호를 반환
                const numbers = log.receptionNumber.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                if (numbers.length > 0) {
                    const lastNum = Math.max(...numbers);
                    if (lastNum > maxNumber) {
                        maxNumber = lastNum;
                    }
                }
            }
        });

        const nextNumber = maxNumber + 1;
        return String(nextNumber);
    }

    receptionNumberInput.value = generateNextReceptionNumber();

    // 수정 모드 상태 변수 (상단에 선언)
    let editingId = null;
    let currentRegistrationData = null;  // 마지막 등록된 시료 데이터 (모달 수정 버튼용)

    // ========================================
    // 동적 채취장소 관리
    // ========================================
    const sampleCountInput = document.getElementById('sampleCount');
    const samplingLocationsList = document.getElementById('samplingLocationsList');
    const locationCountBadge = document.getElementById('locationCountBadge');

    // 채취장소 필드 생성 함수
    function createSamplingLocationItem(index) {
        const item = document.createElement('div');
        item.className = 'sampling-location-item';
        item.dataset.index = index;
        item.innerHTML = sanitizeHTML(`
            <span class="location-number">${index + 1}</span>
            <div class="location-autocomplete-wrapper">
                <input type="text" class="sampling-location-input" name="samplingLocations[]" required placeholder="리+지번 입력 (예: 내성리 123, 내성리 산 45)">
                <ul class="location-autocomplete-list"></ul>
            </div>
            <input type="text" class="sampling-crop-input" name="samplingCrops[]" placeholder="주작목">
        `);
        return item;
    }

    // 채취장소 필드 개수 업데이트
    function updateSamplingLocations(count) {
        const currentCount = samplingLocationsList.children.length;
        count = Math.max(1, parseInt(count, 10) || 1);

        // 필드 추가
        if (count > currentCount) {
            for (let i = currentCount; i < count; i++) {
                const item = createSamplingLocationItem(i);
                samplingLocationsList.appendChild(item);
                // 새로 추가된 필드에 자동완성 바인딩
                bindLocationAutocomplete(item.querySelector('.sampling-location-input'), item.querySelector('.location-autocomplete-list'));
            }
        }
        // 필드 제거
        else if (count < currentCount) {
            for (let i = currentCount - 1; i >= count; i--) {
                samplingLocationsList.children[i].remove();
            }
        }

        // 배지 업데이트
        locationCountBadge.textContent = `${count}개`;
    }

    // 접수번호 범위 업데이트 (시료수에 따라) - 수질은 개별 번호 형식 (1, 2, 3)
    function updateReceptionNumberRange(count) {
        count = Math.max(1, parseInt(count, 10) || 1);
        const baseNumber = parseInt(receptionNumberInput.dataset.baseNumber || receptionNumberInput.value.split(',')[0].trim(), 10);

        if (count === 1) {
            receptionNumberInput.value = String(baseNumber);
        } else {
            // 수질은 개별 번호로 표시 (예: "5, 6, 7")
            const numbers = [];
            for (let i = 0; i < count; i++) {
                numbers.push(baseNumber + i);
            }
            receptionNumberInput.value = numbers.join(', ');
        }
    }

    // 초기 기본 번호 저장
    receptionNumberInput.dataset.baseNumber = receptionNumberInput.value;

    // 시료수 변경 시 채취장소 필드 및 접수번호 업데이트
    if (sampleCountInput) {
        sampleCountInput.addEventListener('change', (e) => {
            updateSamplingLocations(e.target.value);
            updateReceptionNumberRange(e.target.value);
        });
        sampleCountInput.addEventListener('input', (e) => {
            updateSamplingLocations(e.target.value);
            updateReceptionNumberRange(e.target.value);
        });
    }

    // 채취장소 추가/삭제 버튼
    const btnAddLocation = document.getElementById('btnAddLocation');
    const btnRemoveLocation = document.getElementById('btnRemoveLocation');

    if (btnAddLocation) {
        btnAddLocation.addEventListener('click', () => {
            const currentCount = samplingLocationsList.children.length;
            const newCount = currentCount + 1;
            updateSamplingLocations(newCount);
            // 시료수도 동기화
            if (sampleCountInput) {
                sampleCountInput.value = newCount;
            }
            updateReceptionNumberRange(newCount);
        });
    }

    if (btnRemoveLocation) {
        btnRemoveLocation.addEventListener('click', () => {
            const currentCount = samplingLocationsList.children.length;
            if (currentCount > 1) {
                const newCount = currentCount - 1;
                updateSamplingLocations(newCount);
                // 시료수도 동기화
                if (sampleCountInput) {
                    sampleCountInput.value = newCount;
                }
                updateReceptionNumberRange(newCount);
            }
        });
    }

    // ========================================
    // 채취장소 자동완성 (경상북도 전체)
    // ========================================

    // 경상북도 전체 시/군 목록
    const GYEONGBUK_REGIONS = [
        'pohang', 'gyeongju', 'gimcheon', 'andong', 'gumi',
        'yeongcheon', 'sangju', 'mungyeong', 'gyeongsan',
        'gunwi', 'uiseong', 'cheongsong', 'yeongyang', 'yeongdeok',
        'cheongdo', 'goryeong', 'seongju', 'chilgok', 'yecheon',
        'bonghwa', 'ulleung', 'yeongju', 'uljin'
    ];

    // 경상북도 시/군 한글명 목록 (주소 시작 체크용)
    const GYEONGBUK_REGION_NAMES = [
        '포항시', '경주시', '김천시', '안동시', '구미시',
        '영천시', '상주시', '문경시', '경산시',
        '군위군', '의성군', '청송군', '영양군', '영덕군',
        '청도군', '고령군', '성주군', '칠곡군', '예천군',
        '봉화군', '울릉군', '영주시', '울진군'
    ];

    function bindLocationAutocomplete(input, autocompleteList) {
        if (!input || !autocompleteList) {
            console.warn('채취장소 자동완성: input 또는 autocompleteList가 없습니다');
            return;
        }
        if (typeof suggestRegionVillages !== 'function') {
            console.warn('채취장소 자동완성: suggestRegionVillages 함수를 찾을 수 없습니다');
            return;
        }

        // 입력 시 자동완성 목록 표시
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // 이미 완전한 주소면 자동완성 비활성화 (시/군으로 시작)
            if (GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length >= 1) {
                // 경상북도 전체에서 검색 (null을 전달하면 기본값으로 전체 검색), 산 지번 옵션 포함
                const suggestions = suggestRegionVillages(value, null, true);

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

        // Enter 키 처리 - 주소 변환
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = input.value.trim();

                // 이미 완전한 주소면 무시
                if (GYEONGBUK_REGION_NAMES.some(name => value.startsWith(name))) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);
                    if (result) {
                        // 여러 지역에서 중복되는 경우 (isDuplicate: true)
                        if (result.isDuplicate && result.locations) {
                            autocompleteList.innerHTML = sanitizeHTML(result.locations.map(loc => `
                                <li data-village="${result.villageName}" data-district="${loc.district}" data-region-key="${loc.regionKey}" data-lot="${result.lotNumber || ''}">
                                    ${loc.fullAddress} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        }
                        // 단일 지역 내 중복인 경우
                        else if (result.alternatives && result.alternatives.length > 1) {
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            // 단일 매칭 - 바로 변환
                            input.value = result.fullAddress;
                            autocompleteList.classList.remove('show');
                        }
                    }
                }
            }
        });

        // 자동완성 목록 클릭 시
        autocompleteList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const village = e.target.dataset.village;
                const district = e.target.dataset.district;
                const regionKey = e.target.dataset.regionKey;
                const isMountain = e.target.dataset.isMountain === 'true';
                const lot = e.target.dataset.lot;

                // 로컬 지역명 매핑
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                // 산 지번이면 "리 산" 형식
                const villageWithMountain = isMountain ? `${village} 산` : village;

                // 기존 입력에서 지번 추출 (산 키워드 제외)
                const currentValue = input.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLot = lot || (match ? match[0] : '');

                // 지번이 있으면 포함
                const fullAddress = extractedLot
                    ? `${region} ${district} ${villageWithMountain} ${extractedLot}`
                    : `${region} ${district} ${villageWithMountain}`;

                input.value = fullAddress;
                autocompleteList.classList.remove('show');
            }
        });

        // 포커스 아웃 시 목록 숨김
        input.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteList.classList.remove('show');
            }, 200);
        });
    }

    // 초기 채취장소 필드에 자동완성 바인딩
    const initialLocationItems = samplingLocationsList.querySelectorAll('.sampling-location-item');
    log('초기 채취장소 필드 개수:', initialLocationItems.length);
    log('suggestRegionVillages 함수 존재:', typeof suggestRegionVillages === 'function');
    log('parseRegionAddress 함수 존재:', typeof parseRegionAddress === 'function');

    initialLocationItems.forEach((item, index) => {
        const input = item.querySelector('.sampling-location-input');
        const list = item.querySelector('.location-autocomplete-list');
        log(`채취장소 ${index + 1} 바인딩:`, { input: !!input, list: !!list });
        bindLocationAutocomplete(input, list);
    });

    // 모든 채취장소 값 가져오기
    function getAllSamplingLocations() {
        const inputs = samplingLocationsList.querySelectorAll('.sampling-location-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
    }

    // 모든 주작목 값 가져오기
    function getAllSamplingCrops() {
        const inputs = samplingLocationsList.querySelectorAll('.sampling-crop-input');
        return Array.from(inputs).map(input => input.value.trim());
    }

    // 채취장소와 주작목 값 설정 (수정 시 사용)
    function setSamplingLocations(locations, crops = []) {
        if (!Array.isArray(locations)) {
            locations = [locations];
        }
        if (!Array.isArray(crops)) {
            crops = [crops];
        }
        locations = locations.filter(l => l);

        const count = Math.max(1, locations.length);
        updateSamplingLocations(count);

        const locationInputs = samplingLocationsList.querySelectorAll('.sampling-location-input');
        const cropInputs = samplingLocationsList.querySelectorAll('.sampling-crop-input');

        locations.forEach((loc, i) => {
            if (locationInputs[i]) {
                locationInputs[i].value = loc;
            }
            if (cropInputs[i] && crops[i]) {
                cropInputs[i].value = crops[i];
            }
        });
    }

    // ========================================
    // 폼 제출
    // ========================================
    const navSubmitBtn = document.getElementById('navSubmitBtn');
    const navResetBtn = document.getElementById('navResetBtn');

    if (navSubmitBtn) {
        navSubmitBtn.addEventListener('click', () => {
            if (form.checkValidity()) {
                if (editingId) {
                    updateSample();
                } else {
                    submitForm();
                }
            } else {
                form.reportValidity();
            }
        });
    }

    if (navResetBtn) {
        navResetBtn.addEventListener('click', () => {
            if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
                resetForm();
            }
        });
    }

    function submitForm() {
        const formData = new FormData(form);
        const samplingLocations = getAllSamplingLocations();
        const samplingCrops = getAllSamplingCrops();

        // 접수번호 파싱 (예: "1, 2, 3" -> [1, 2, 3])
        const receptionNumberStr = formData.get('receptionNumber') || generateNextReceptionNumber();
        const receptionNumbers = receptionNumberStr.split(',').map(n => n.trim()).filter(n => n);

        // 공통 데이터 (신청자 정보)
        const applicantType = formData.get('applicantType') || '개인';
        const commonData = {
            sampleType: SAMPLE_TYPE,
            date: formData.get('date'),
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
            corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            addressPostcode: formData.get('addressPostcode'),
            addressRoad: formData.get('addressRoad'),
            addressDetail: formData.get('addressDetail'),
            receptionMethod: formData.get('receptionMethod'),
            sampleName: formData.get('sampleName'),
            purpose: formData.get('purpose'),
            testItems: formData.get('testItems'),
            note: formData.get('note'),
            isComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 채취장소별로 개별 행 생성
        const newLogs = [];
        for (let i = 0; i < samplingLocations.length; i++) {
            const data = {
                ...commonData,
                id: generateId(),
                receptionNumber: receptionNumbers[i] || String(parseInt(receptionNumbers[0], 10) + i),
                sampleCount: '1', // 각 행은 시료 1개
                samplingLocation: samplingLocations[i] || '',
                mainCrop: samplingCrops[i] || ''
            };
            newLogs.push(data);
            sampleLogs.push(data);
        }

        saveLogs();

        const totalCount = samplingLocations.length;
        showToast(`시료 ${totalCount}건이 등록되었습니다.`, 'success');

        // 결과 모달 표시 (첫 번째 데이터 기준, 전체 개수 표시)
        const resultData = {
            ...newLogs[0],
            receptionNumber: receptionNumbers.join(', '),
            sampleCount: String(totalCount),
            samplingLocation: samplingLocations.join(', '),
            mainCrop: samplingCrops.filter(c => c).join(', ')
        };
        showRegistrationResult(resultData);

        resetForm();
        receptionNumberInput.value = generateNextReceptionNumber();
    }

    function resetForm() {
        // 접수번호와 접수일자 값 저장
        const receptionNumber = receptionNumberInput?.value;
        const date = dateInput?.value;

        form.reset();

        // 접수번호와 접수일자 복원
        if (receptionNumber) {
            receptionNumberInput.value = receptionNumber;
        }
        if (date) {
            dateInput.value = date;
        } else {
            dateInput.valueAsDate = new Date();
        }
        receptionMethodBtns.forEach(b => b.classList.remove('active'));
        receptionMethodInput.value = '';

        // 개인/법인 초기화
        if (applicantTypeSelect) {
            applicantTypeSelect.value = '개인';
            birthDateField.classList.remove('hidden');
            corpNumberField.classList.add('hidden');
        }
        if (birthDateInput) birthDateInput.value = '';
        if (corpNumberInput) corpNumberInput.value = '';

        // 검사항목 초기화
        const livingWaterRadio = document.querySelector('input[name="testItems"][value="생활용수"]');
        if (livingWaterRadio) {
            livingWaterRadio.checked = true;
            livingWaterItems.classList.add('active');
            agriculturalWaterItems.classList.remove('active');
        }

        // 채취장소 및 주작목 초기화 (1개로 리셋)
        updateSamplingLocations(1);
        const firstLocationInput = samplingLocationsList.querySelector('.sampling-location-input');
        const firstCropInput = samplingLocationsList.querySelector('.sampling-crop-input');
        if (firstLocationInput) {
            firstLocationInput.value = '';
        }
        if (firstCropInput) {
            firstCropInput.value = '';
        }

        // 접수번호 갱신 및 기본 번호 저장
        const nextNumber = generateNextReceptionNumber();
        receptionNumberInput.value = nextNumber;
        receptionNumberInput.dataset.baseNumber = nextNumber;

        // 수정 모드 해제
        editingId = null;

        // 제출 버튼 스타일 복원
        if (navSubmitBtn) {
            navSubmitBtn.title = '접수 등록';
            navSubmitBtn.classList.remove('btn-edit-mode');
        }
    }

    // ========================================
    // 등록 결과 모달
    // ========================================
    const registrationResultModal = document.getElementById('registrationResultModal');
    const closeRegistrationModal = document.getElementById('closeRegistrationModal');
    const closeResultBtn = document.getElementById('closeResultBtn');
    const resultTableBody = document.getElementById('resultTableBody');

    function showRegistrationResult(data) {
        if (!registrationResultModal || !resultTableBody) return;

        // 마지막 등록된 시료 데이터 저장 (수정 버튼용)
        currentRegistrationData = data;

        // 테이블 행 데이터
        const rows = [
            { label: '접수번호', value: data.receptionNumber },
            { label: '접수일자', value: data.date },
            { label: '성명', value: data.name },
            { label: '연락처', value: data.phoneNumber },
            { label: '시료명', value: data.sampleName },
            { label: '시료수', value: `${data.sampleCount}점` },
            { label: '채취장소', value: data.samplingLocation },
            { label: '목적', value: data.purpose },
            { label: '검사항목', value: data.testItems },
            { label: '통보방법', value: data.receptionMethod },
            { label: '비고', value: data.note }
        ];

        // 공통 유틸리티 사용
        BaseSampleManager.buildResultTable(resultTableBody, rows);

        registrationResultModal.classList.remove('hidden');
    }

    function closeRegistrationResultModal() {
        if (registrationResultModal) {
            registrationResultModal.classList.add('hidden');
        }
        currentRegistrationData = null;
    }

    if (closeRegistrationModal) {
        closeRegistrationModal.addEventListener('click', closeRegistrationResultModal);
    }
    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', closeRegistrationResultModal);
    }
    // 수정 버튼 클릭 이벤트
    const editResultBtn = document.getElementById('editResultBtn');
    if (editResultBtn) {
        editResultBtn.addEventListener('click', () => {
            if (currentRegistrationData) {
                const dataToEdit = currentRegistrationData;
                closeRegistrationResultModal();
                editSample(String(dataToEdit.id));
            }
        });
    }
    if (registrationResultModal) {
        registrationResultModal.querySelector('.modal-overlay').addEventListener('click', closeRegistrationResultModal);
    }

    // ========================================
    // 데이터 저장
    // ========================================
    function saveLogs() {
        const yearStorageKey = getStorageKey(selectedYear);

        // 1. ID가 없는 항목에 ID 추가 (로컬 저장 전에 처리)
        sampleLogs = sampleLogs.map(item => ({
            ...item,
            id: item.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 11))
        }));

        // 2. 로컬(localStorage)에 먼저 저장
        localStorage.setItem(yearStorageKey, JSON.stringify(sampleLogs));
        updateRecordCount();
        log('💾 로컬 저장 완료:', sampleLogs.length, '건');

        // 3. Firebase 클라우드에 마이그레이션 (백그라운드)
        if (window.firestoreDb?.isEnabled()) {
            window.firestoreDb.batchSave('water', parseInt(selectedYear), sampleLogs)
                .then(() => log('☁️ Firebase 마이그레이션 완료'))
                .catch(err => {
                    window.logger.error('Firebase 마이그레이션 실패:', err);
                    showToast('클라우드 동기화 실패', 'error');
                });
        }

        // 4. 자동 저장 (Electron 환경)
        if (window.isElectron && FileAPI.autoSavePath && document.getElementById('autoSaveToggle')?.checked) {
            const autoSaveContent = JSON.stringify(sampleLogs, null, 2);
            FileAPI.autoSave(autoSaveContent);
        }
    }

    // ========================================
    // 목록 렌더링
    // ========================================
    function renderLogs(logs) {
        tableBody.innerHTML = '';

        if (logs.length === 0) {
            emptyState.style.display = 'flex';
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'flex';

        // 정렬된 데이터 저장
        currentDisplayLogs = [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });

        // 페이지네이션 계산
        totalPages = Math.ceil(currentDisplayLogs.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        // 현재 페이지 데이터 추출
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageLogs = currentDisplayLogs.slice(startIndex, endIndex);

        pageLogs.forEach(log => {
            const row = document.createElement('tr');
            row.dataset.id = log.id;

            // 주소에서 우편번호 분리 (예: "(12345) 서울시..." -> 우편번호: "12345", 주소: "서울시...")
            const addressFull = log.address || '';
            const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
            const zipcode = zipMatch ? zipMatch[1] : (log.addressPostcode || '');
            const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

            // 뷰용 주소: 시도 패턴이 있을 때만 제거
            const displayAddress = addressOnly && addressOnly !== '-' && SIDO_PATTERN.test(addressOnly)
                ? addressOnly.replace(SIDO_PATTERN, '')
                : (addressOnly || '-');

            // XSS 방지: 사용자 입력 데이터 이스케이프
            const safeName = escapeHTML(log.name || '-');
            const safeAddress = escapeHTML(addressOnly || '-');
            const safeDisplayAddress = escapeHTML(displayAddress);
            const safeSampleName = escapeHTML(log.sampleName || '-');
            const safeSamplingLocation = escapeHTML(log.samplingLocation || '-');
            const safeMainCrop = escapeHTML(log.mainCrop || '-');
            const safePhone = escapeHTML(log.phoneNumber || '-');
            const safeNote = escapeHTML(log.note || '-');

            // 법인여부 및 생년월일/법인번호
            const applicantType = log.applicantType || '개인';
            const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

            // 테이블 행 생성: DOM 요소 사용 (XSS 방지)
            // 1. Checkbox column
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'col-checkbox';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkbox.dataset.id = log.id;
            tdCheckbox.appendChild(checkbox);
            row.appendChild(tdCheckbox);

            // 2. Complete button column
            const tdComplete = document.createElement('td');
            tdComplete.className = 'col-complete';
            const btnComplete = document.createElement('button');
            btnComplete.className = `btn-complete ${log.isComplete ? 'completed' : ''}`;
            btnComplete.dataset.id = log.id;
            btnComplete.title = log.isComplete ? '완료됨' : '완료 표시';
            btnComplete.textContent = log.isComplete ? '✅' : '⬜';
            tdComplete.appendChild(btnComplete);
            row.appendChild(tdComplete);

            // 3. Result button column
            const tdResult = document.createElement('td');
            tdResult.className = 'col-result';
            const btnResult = document.createElement('button');
            btnResult.className = `btn-result ${log.testResult === 'pass' ? 'pass' : log.testResult === 'fail' ? 'fail' : ''}`;
            btnResult.dataset.id = log.id;
            btnResult.title = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '미판정 (클릭하여 변경)';
            btnResult.textContent = log.testResult === 'pass' ? '적합' : log.testResult === 'fail' ? '부적합' : '-';
            tdResult.appendChild(btnResult);
            row.appendChild(tdResult);

            // 4. Reception number
            const tdReceptionNumber = document.createElement('td');
            tdReceptionNumber.textContent = log.receptionNumber || '-';
            row.appendChild(tdReceptionNumber);

            // 5. Date
            const tdDate = document.createElement('td');
            tdDate.textContent = log.date || '-';
            row.appendChild(tdDate);

            // 6. Applicant type (hidden)
            const tdApplicantType = document.createElement('td');
            tdApplicantType.className = 'col-applicant-type hidden';
            tdApplicantType.textContent = applicantType;
            row.appendChild(tdApplicantType);

            // 7. Birth/Corp number (hidden)
            const tdBirthCorp = document.createElement('td');
            tdBirthCorp.className = 'col-birth-corp hidden';
            tdBirthCorp.textContent = birthOrCorp;
            row.appendChild(tdBirthCorp);

            // 8. Name
            const tdName = document.createElement('td');
            tdName.textContent = safeName;
            row.appendChild(tdName);

            // 9. Zipcode (hidden)
            const tdZipcode = document.createElement('td');
            tdZipcode.className = 'col-zipcode hidden';
            tdZipcode.textContent = zipcode || '-';
            row.appendChild(tdZipcode);

            // 10. Address - 시도 제외하고 전체 표시
            const tdAddress = document.createElement('td');
            tdAddress.className = 'col-address';
            tdAddress.textContent = safeDisplayAddress;
            row.appendChild(tdAddress);

            // 11. Sampling location (with tooltip)
            const tdSamplingLocation = document.createElement('td');
            tdSamplingLocation.className = 'text-truncate';
            tdSamplingLocation.dataset.tooltip = safeSamplingLocation;
            tdSamplingLocation.textContent = safeSamplingLocation;
            row.appendChild(tdSamplingLocation);

            // 12. Sample name
            const tdSampleName = document.createElement('td');
            tdSampleName.textContent = safeSampleName;
            row.appendChild(tdSampleName);

            // 13. Sample count
            const tdSampleCount = document.createElement('td');
            tdSampleCount.textContent = `${String(log.sampleCount || 1)}점`;
            row.appendChild(tdSampleCount);

            // 14. Main crop (with tooltip)
            const tdMainCrop = document.createElement('td');
            tdMainCrop.className = 'text-truncate';
            tdMainCrop.dataset.tooltip = safeMainCrop;
            tdMainCrop.textContent = safeMainCrop;
            row.appendChild(tdMainCrop);

            // 15. Purpose
            const tdPurpose = document.createElement('td');
            tdPurpose.textContent = log.purpose || '-';
            row.appendChild(tdPurpose);

            // 16. Test items
            const tdTestItems = document.createElement('td');
            tdTestItems.textContent = log.testItems || '-';
            row.appendChild(tdTestItems);

            // 17. Phone
            const tdPhone = document.createElement('td');
            tdPhone.textContent = safePhone;
            row.appendChild(tdPhone);

            // 18. Reception method
            const tdReceptionMethod = document.createElement('td');
            tdReceptionMethod.textContent = log.receptionMethod || '-';
            row.appendChild(tdReceptionMethod);

            // 19. Note (with tooltip)
            const tdNote = document.createElement('td');
            tdNote.className = 'col-note text-truncate';
            tdNote.dataset.tooltip = safeNote;
            tdNote.textContent = safeNote;
            row.appendChild(tdNote);

            // 20. Mail date
            const tdMailDate = document.createElement('td');
            tdMailDate.className = 'col-mail-date';
            tdMailDate.textContent = log.mailDate || '-';
            row.appendChild(tdMailDate);

            // 21. Action buttons (edit/delete)
            const tdAction = document.createElement('td');
            tdAction.className = 'col-action';
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-edit';
            btnEdit.dataset.id = log.id;
            btnEdit.title = '수정';
            btnEdit.textContent = '✏️';
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.dataset.id = log.id;
            btnDelete.title = '삭제';
            btnDelete.textContent = '🗑️';
            tdAction.appendChild(btnEdit);
            tdAction.appendChild(btnDelete);
            row.appendChild(tdAction);

            if (log.isComplete) {
                row.classList.add('row-completed');
            }

            tableBody.appendChild(row);
        });

        // 이벤트 바인딩
        bindTableEvents();
        updateRecordCount();
        updatePaginationUI();
    }

    // ========================================
    // 페이지네이션 함수들
    // ========================================
    function updatePaginationUI() {
        const totalItems = currentDisplayLogs.length;
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        if (paginationInfo) {
            paginationInfo.textContent = `${totalItems.toLocaleString()}건 중 ${startItem.toLocaleString()}-${endItem.toLocaleString()}`;
        }

        if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
        if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;

        renderPageNumbers();
    }

    function renderPageNumbers() {
        if (!pageNumbersContainer) return;
        pageNumbersContainer.innerHTML = '';

        if (totalPages <= 1) return;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pageNumbersContainer.appendChild(createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbersContainer.appendChild(createPageButton(i));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            pageNumbersContainer.appendChild(createPageButton(totalPages));
        }
    }

    function createPageButton(pageNum) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (pageNum === currentPage ? ' active' : '');
        btn.textContent = pageNum;
        btn.addEventListener('click', () => goToPage(pageNum));
        return btn;
    }

    function goToPage(page) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        renderLogs(sampleLogs);
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) tableContainer.scrollTop = 0;
    }

    // 페이지네이션 이벤트 리스너
    if (firstPageBtn) firstPageBtn.addEventListener('click', () => goToPage(1));
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    if (lastPageBtn) lastPageBtn.addEventListener('click', () => goToPage(totalPages));

    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value, 10);
            localStorage.setItem('waterItemsPerPage', itemsPerPage);
            currentPage = 1;
            renderLogs(sampleLogs);
        });
    }

    // 테이블 이벤트 위임 (한 번만 등록)
    tableBody?.addEventListener('click', (e) => {
        // 완료 버튼
        const completeBtn = e.target.closest('.btn-complete');
        if (completeBtn) {
            const id = completeBtn.dataset.id;
            toggleComplete(id);
            return;
        }

        // 판정 버튼 (적합/부적합 토글)
        const resultBtn = e.target.closest('.btn-result');
        if (resultBtn) {
            const id = resultBtn.dataset.id;
            toggleTestResult(id);
            return;
        }

        // 삭제 버튼
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('이 항목을 삭제하시겠습니까?')) {
                deleteSample(id);
            }
            return;
        }

        // 수정 버튼
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const id = editBtn.dataset.id;
            editSample(id);
            return;
        }
    });

    function bindTableEvents() {
        // 이벤트 위임으로 대체됨 - 이 함수는 호환성을 위해 유지
    }

    function toggleComplete(id) {
        const log = sampleLogs.find(l => String(l.id) === id);
        if (log) {
            log.isComplete = !log.isComplete;
            log.updatedAt = new Date().toISOString();
            saveLogs();
            renderLogs(sampleLogs);
        }
    }

    // 판정 결과 토글 (미판정 → 적합 → 부적합 → 미판정)
    function toggleTestResult(id) {
        const log = sampleLogs.find(l => String(l.id) === id);
        if (log) {
            if (!log.testResult || log.testResult === '') {
                log.testResult = 'pass';  // 미판정 → 적합
            } else if (log.testResult === 'pass') {
                log.testResult = 'fail';  // 적합 → 부적합
            } else {
                log.testResult = '';      // 부적합 → 미판정
            }
            log.updatedAt = new Date().toISOString();
            saveLogs();
            renderLogs(sampleLogs);
        }
    }

    function deleteSample(id) {
        sampleLogs = sampleLogs.filter(l => String(l.id) !== id);
        saveLogs();
        renderLogs(sampleLogs);

        // Firebase에서도 삭제
        if (window.firestoreDb?.isEnabled()) {
            window.firestoreDb.delete('water', parseInt(selectedYear), id)
                .then(() => log('☁️ Firebase 삭제 완료:', id))
                .catch(err => window.logger.error('Firebase 삭제 실패:', err));
        }

        showToast('삭제되었습니다.', 'success');
    }

    function editSample(id) {
        const log = sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        editingId = id;

        try {
            // 폼에 데이터 채우기
            if (receptionNumberInput) receptionNumberInput.value = log.receptionNumber || '';
            if (dateInput) dateInput.value = log.date || '';

            const nameEl = document.getElementById('name');
            const phoneEl = document.getElementById('phoneNumber');
            const sampleNameEl = document.getElementById('sampleName');
            const sampleCountEl = document.getElementById('sampleCount');
            const noteEl = document.getElementById('note');

            if (nameEl) nameEl.value = log.name || '';
            if (phoneEl) phoneEl.value = log.phoneNumber || '';
            if (addressPostcode) addressPostcode.value = log.addressPostcode || '';
            if (addressRoad) addressRoad.value = log.addressRoad || '';
            if (addressDetail) addressDetail.value = log.addressDetail || '';
            if (addressHidden) addressHidden.value = log.address || '';
            if (sampleNameEl) sampleNameEl.value = log.sampleName || '';
            if (sampleCountEl) sampleCountEl.value = log.sampleCount || 1;
            if (noteEl) noteEl.value = log.note || '';

            // 법인여부/생년월일/법인번호 설정
            const applicantType = log.applicantType || '개인';
            if (applicantTypeSelect) {
                applicantTypeSelect.value = applicantType;
                if (applicantType === '법인') {
                    birthDateField.classList.add('hidden');
                    corpNumberField.classList.remove('hidden');
                    if (corpNumberInput) corpNumberInput.value = log.corpNumber || '';
                    if (birthDateInput) birthDateInput.value = '';
                } else {
                    birthDateField.classList.remove('hidden');
                    corpNumberField.classList.add('hidden');
                    if (birthDateInput) birthDateInput.value = log.birthDate || '';
                    if (corpNumberInput) corpNumberInput.value = '';
                }
            }

            // 채취장소 및 주작목 설정 (배열 또는 문자열)
            const crops = log.samplingCrops || [];
            if (log.samplingLocations && Array.isArray(log.samplingLocations)) {
                setSamplingLocations(log.samplingLocations, crops);
            } else if (log.samplingLocation) {
                // 이전 데이터 호환: 문자열을 쉼표로 분리
                const locations = log.samplingLocation.split(',').map(s => s.trim());
                setSamplingLocations(locations, crops);
            }

            // 통보방법 선택
            if (receptionMethodBtns) {
                receptionMethodBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.method === log.receptionMethod);
                });
            }
            if (receptionMethodInput) receptionMethodInput.value = log.receptionMethod || '';

            // 목적 선택
            const purposeRadio = document.querySelector(`input[name="purpose"][value="${log.purpose}"]`);
            if (purposeRadio) purposeRadio.checked = true;

            // 검사항목 선택
            const testItemsRadio = document.querySelector(`input[name="testItems"][value="${log.testItems}"]`);
            if (testItemsRadio) {
                testItemsRadio.checked = true;
                if (log.testItems === '생활용수') {
                    if (livingWaterItems) livingWaterItems.classList.add('active');
                    if (agriculturalWaterItems) agriculturalWaterItems.classList.remove('active');
                } else {
                    if (livingWaterItems) livingWaterItems.classList.remove('active');
                    if (agriculturalWaterItems) agriculturalWaterItems.classList.add('active');
                }
            }

            switchView('form');
            showToast('수정 모드입니다. 변경 후 등록 버튼을 클릭하세요.', 'warning');

            // 제출 버튼 스타일 변경 (수정 모드 표시)
            if (navSubmitBtn) {
                navSubmitBtn.title = '수정 완료';
                navSubmitBtn.classList.add('btn-edit-mode');
            }
        } catch (error) {
            window.logger.error('editSample 에러:', error);
            showToast('수정 모드 전환 중 오류가 발생했습니다.', 'error');
        }
    }

    function updateSample() {
        const formData = new FormData(form);
        const log = sampleLogs.find(l => l.id === editingId);
        const samplingLocations = getAllSamplingLocations();
        const samplingCrops = getAllSamplingCrops();

        if (log) {
            log.receptionNumber = formData.get('receptionNumber');
            log.date = formData.get('date');
            const applicantType = formData.get('applicantType') || '개인';
            log.applicantType = applicantType;
            log.birthDate = applicantType === '개인' ? formData.get('birthDate') : '';
            log.corpNumber = applicantType === '법인' ? formData.get('corpNumber') : '';
            log.name = formData.get('name');
            log.phoneNumber = formData.get('phoneNumber');
            log.address = formData.get('address');
            log.addressPostcode = formData.get('addressPostcode');
            log.addressRoad = formData.get('addressRoad');
            log.addressDetail = formData.get('addressDetail');
            log.receptionMethod = formData.get('receptionMethod');
            log.sampleName = formData.get('sampleName');
            log.sampleCount = formData.get('sampleCount');
            log.samplingLocations = samplingLocations;
            log.samplingLocation = samplingLocations.join(', '); // 호환성을 위해 문자열로도 저장
            log.samplingCrops = samplingCrops;
            log.mainCrop = samplingCrops.filter(c => c).join(', '); // 호환성을 위해 문자열로도 저장
            log.purpose = formData.get('purpose');
            log.testItems = formData.get('testItems');
            log.note = formData.get('note');
            log.updatedAt = new Date().toISOString();

            saveLogs();
            showToast('수정이 완료되었습니다.', 'success');
            resetForm();
            receptionNumberInput.value = generateNextReceptionNumber();
            editingId = null;

            // 제출 버튼 원래대로
            if (navSubmitBtn) {
                navSubmitBtn.title = '접수 등록';
                navSubmitBtn.classList.remove('btn-edit-mode');
            }

            // 목록 뷰로 전환
            switchView('list');
        }
    }

    // ========================================
    // 전체 선택 / 선택 삭제
    // ========================================
    const selectAllCheckbox = document.getElementById('selectAll');
    const btnBulkDelete = document.getElementById('btnBulkDelete');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        });
    }

    // ========================================
    // 라벨 인쇄 기능
    // ========================================
    const btnLabelPrint = document.getElementById('btnLabelPrint');

    if (btnLabelPrint) {
        btnLabelPrint.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

            if (selectedIds.length === 0) {
                // 선택된 항목이 없으면 전체 데이터 사용 여부 확인
                if (sampleLogs.length === 0) {
                    alert('인쇄할 데이터가 없습니다.');
                    return;
                }

                if (!confirm(`선택된 항목이 없습니다.\n전체 ${sampleLogs.length}건을 라벨 인쇄하시겠습니까?`)) {
                    return;
                }

                // 전체 데이터로 라벨 인쇄
                openLabelPrintWithData(sampleLogs);
            } else {
                // 선택된 데이터만 라벨 인쇄 (ID 타입 일치를 위해 문자열로 변환)
                const selectedLogs = sampleLogs.filter(log => selectedIds.includes(String(log.id)));
                openLabelPrintWithData(selectedLogs);
            }
        });
    }

    // 라벨 인쇄 페이지로 데이터 전달
    function openLabelPrintWithData(logs) {
        // 라벨 인쇄에 필요한 데이터 형식으로 변환
        const labelData = logs.map(log => {
            // 주소 조합 (도로명주소 + 상세주소)
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

        // 중복이 있었으면 알림
        const duplicateCount = labelData.length - uniqueLabelData.length;
        if (duplicateCount > 0) {
            showToast(`주소 중복 ${duplicateCount}건 제거됨 (총 ${uniqueLabelData.length}건)`, 'info');
        }

        // localStorage에 데이터 저장
        localStorage.setItem('labelPrintData', JSON.stringify(uniqueLabelData));

        // 라벨 인쇄 페이지로 이동
        window.location.href = '../label-print/index.html';
    }

    if (btnBulkDelete) {
        btnBulkDelete.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

            if (selectedIds.length === 0) {
                alert('삭제할 항목을 선택해주세요.');
                return;
            }

            if (confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?`)) {
                sampleLogs = sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
                saveLogs();
                renderLogs(sampleLogs);
                selectAllCheckbox.checked = false;

                // Firebase에서도 삭제
                if (window.firestoreDb?.isEnabled()) {
                    Promise.all(selectedIds.map(id =>
                        window.firestoreDb.delete('water', parseInt(selectedYear), id)
                    ))
                        .then(() => log('☁️ Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
                        .catch(err => window.logger.error('Firebase 일괄 삭제 실패:', err));
                }

                showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
            }
        });
    }

    // ========================================
    // 일괄 우편발송일자 입력 기능 (모달 사용)
    // ========================================
    const btnBulkMailDate = document.getElementById('btnBulkMailDate');
    const mailDateModal = document.getElementById('mailDateModal');
    const closeMailDateModal = document.getElementById('closeMailDateModal');
    const cancelMailDateBtn = document.getElementById('cancelMailDateBtn');
    const confirmMailDateBtn = document.getElementById('confirmMailDateBtn');
    const mailDateInput = document.getElementById('mailDateInput');
    const mailDateInfo = document.getElementById('mailDateInfo');

    let pendingMailDateIds = [];

    function openMailDateModal(selectedIds) {
        pendingMailDateIds = selectedIds;
        const today = new Date().toISOString().split('T')[0];
        if (mailDateInput) mailDateInput.value = today;
        if (mailDateInfo) mailDateInfo.textContent = `선택한 ${selectedIds.length}건의 우편발송일자를 입력하세요.`;
        if (mailDateModal) mailDateModal.classList.remove('hidden');
    }

    function closeMailDateModalFn() {
        if (mailDateModal) mailDateModal.classList.add('hidden');
        pendingMailDateIds = [];
    }

    if (closeMailDateModal) closeMailDateModal.addEventListener('click', closeMailDateModalFn);
    if (cancelMailDateBtn) cancelMailDateBtn.addEventListener('click', closeMailDateModalFn);
    if (mailDateModal) {
        mailDateModal.querySelector('.modal-overlay')?.addEventListener('click', closeMailDateModalFn);
    }

    if (confirmMailDateBtn) {
        confirmMailDateBtn.addEventListener('click', () => {
            const inputDate = mailDateInput?.value;

            if (!inputDate) {
                showToast('날짜를 선택해주세요.', 'warning');
                return;
            }

            // 선택된 항목에 발송일자 입력
            let updatedCount = 0;
            sampleLogs = sampleLogs.map(log => {
                if (pendingMailDateIds.includes(String(log.id))) {
                    updatedCount++;
                    return { ...log, mailDate: inputDate, updatedAt: new Date().toISOString() };
                }
                return log;
            });

            saveLogs();
            renderLogs(sampleLogs);
            selectAllCheckbox.checked = false;

            closeMailDateModalFn();
            showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
        });
    }

    if (btnBulkMailDate) {
        btnBulkMailDate.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);

            if (selectedIds.length === 0) {
                showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                return;
            }

            openMailDateModal(selectedIds);
        });
    }

    // ========================================
    // 통계 모달
    // ========================================
    const btnStatistics = document.getElementById('btnStatistics');
    const statisticsModal = document.getElementById('statisticsModal');
    const closeStatisticsModal = document.getElementById('closeStatisticsModal');
    const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

    if (btnStatistics) {
        btnStatistics.addEventListener('click', showStatistics);
    }

    if (closeStatisticsModal) {
        closeStatisticsModal.addEventListener('click', () => statisticsModal.classList.add('hidden'));
    }
    if (closeStatisticsBtn) {
        closeStatisticsBtn.addEventListener('click', () => statisticsModal.classList.add('hidden'));
    }
    if (statisticsModal) {
        statisticsModal.querySelector('.modal-overlay').addEventListener('click', () => statisticsModal.classList.add('hidden'));
    }

    function showStatistics() {
        const total = sampleLogs.length;
        const completed = sampleLogs.filter(l => l.isComplete).length;
        const pending = total - completed;

        document.getElementById('statTotalCount').textContent = total;
        document.getElementById('statCompletedCount').textContent = completed;
        document.getElementById('statPendingCount').textContent = pending;

        // 시료명별
        const byWaterType = {};
        sampleLogs.forEach(l => {
            const type = l.sampleName || '미지정';
            byWaterType[type] = (byWaterType[type] || 0) + 1;
        });
        renderStatsChart('statsByWaterType', byWaterType, total);

        // 목적별
        const byPurpose = {};
        sampleLogs.forEach(l => {
            const purpose = l.purpose || '미지정';
            byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
        });
        renderStatsChart('statsByPurpose', byPurpose, total);

        // 검사항목별
        const byTestItems = {};
        sampleLogs.forEach(l => {
            const items = l.testItems || '미지정';
            byTestItems[items] = (byTestItems[items] || 0) + 1;
        });
        renderStatsChart('statsByTestItems', byTestItems, total);

        // 월별 집계 (1~12월 전체, 완료/미완료 구분)
        const byMonth = {};
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        // 1~12월 초기화
        for (let i = 1; i <= 12; i++) {
            const monthKey = String(i).padStart(2, '0');
            byMonth[monthKey] = {
                count: 0,
                completed: 0,
                pending: 0,
                label: monthNames[i - 1]
            };
        }

        // 데이터 집계
        sampleLogs.forEach(l => {
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

        renderMonthlyChart('statsByMonth', byMonth);
        renderQuarterlySummary('statsQuarterly', byQuarter);

        statisticsModal.classList.remove('hidden');
    }

    function renderStatsChart(containerId, data, total) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        // 검사항목별 클래스 매핑
        const testItemsClassMap = {
            '생활용수': 'test-living',
            '농업용수': 'test-agricultural'
        };

        // 시료명별 클래스 매핑
        const waterTypeClassMap = {
            '지하수': 'water-underground',
            '하천수': 'water-river',
            '저수지': 'water-reservoir',
            '수돗물': 'water-tap'
        };

        container.innerHTML = sanitizeHTML(entries.map(([label, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            // 검사항목별 또는 시료명별 클래스 결정
            const barClass = testItemsClassMap[label] || waterTypeClassMap[label] || 'water-other';
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

    /**
     * 월별 차트 렌더링 (1~12월 전체, 완료/미완료 스택)
     */
    function renderMonthlyChart(containerId, data) {
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

    /**
     * 분기별 요약 렌더링
     */
    function renderQuarterlySummary(containerId, data) {
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
    // 검색 모달
    // ========================================
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

    // 현재 검색 필터 상태
    let currentSearchFilter = {
        dateFrom: '',
        dateTo: '',
        name: '',
        receptionFrom: '',
        receptionTo: '',
        completed: ''
    };

    // 완료 상태 필터 드롭다운
    const completedFilter = document.getElementById('completedFilter');
    if (completedFilter) {
        completedFilter.addEventListener('change', (e) => {
            currentSearchFilter.completed = e.target.value;
            filterAndRenderLogs();
        });
    }

    // 접수번호에서 숫자 부분 추출
    function extractReceptionNumber(receptionNumber) {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    function filterAndRenderLogs() {
        const filtered = sampleLogs.filter(log => {
            // 성명 검색
            const matchesName = !currentSearchFilter.name ||
                log.name.toLowerCase().includes(currentSearchFilter.name);

            // 접수번호 범위 검색
            let matchesReception = true;
            if (currentSearchFilter.receptionFrom || currentSearchFilter.receptionTo) {
                const logNum = extractReceptionNumber(log.receptionNumber);
                const fromNum = currentSearchFilter.receptionFrom ? parseInt(currentSearchFilter.receptionFrom, 10) : 0;
                const toNum = currentSearchFilter.receptionTo ? parseInt(currentSearchFilter.receptionTo, 10) : Infinity;
                if (fromNum && logNum < fromNum) matchesReception = false;
                if (toNum !== Infinity && logNum > toNum) matchesReception = false;
            }

            // 날짜 범위 검색
            let matchesDate = true;
            if (currentSearchFilter.dateFrom || currentSearchFilter.dateTo) {
                const logDate = log.date;
                if (currentSearchFilter.dateFrom && logDate < currentSearchFilter.dateFrom) matchesDate = false;
                if (currentSearchFilter.dateTo && logDate > currentSearchFilter.dateTo) matchesDate = false;
            }

            // 완료 상태 필터
            let matchesCompleted = true;
            if (currentSearchFilter.completed === 'completed') {
                matchesCompleted = log.completed === true;
            } else if (currentSearchFilter.completed === 'incomplete') {
                matchesCompleted = !log.completed;
            }

            return matchesName && matchesReception && matchesDate && matchesCompleted;
        });

        renderLogs(filtered);
        updateSearchButtonState();
    }

    function updateSearchButtonState() {
        const hasFilter = currentSearchFilter.dateFrom || currentSearchFilter.dateTo ||
            currentSearchFilter.name || currentSearchFilter.receptionFrom || currentSearchFilter.receptionTo ||
            currentSearchFilter.completed;
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

    if (openSearchModalBtn) {
        openSearchModalBtn.addEventListener('click', () => {
            if (searchDateFromInput) searchDateFromInput.value = currentSearchFilter.dateFrom;
            if (searchDateToInput) searchDateToInput.value = currentSearchFilter.dateTo;
            if (searchNameInput) searchNameInput.value = currentSearchFilter.name;
            if (searchReceptionFromInput) searchReceptionFromInput.value = currentSearchFilter.receptionFrom;
            if (searchReceptionToInput) searchReceptionToInput.value = currentSearchFilter.receptionTo;
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
            if (completedFilter) completedFilter.value = '';
            currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', completed: '' };
            filterAndRenderLogs();
            listSearchModal.classList.add('hidden');
        });
    }
    if (applySearchBtn) {
        applySearchBtn.addEventListener('click', () => {
            currentSearchFilter.dateFrom = searchDateFromInput ? searchDateFromInput.value : '';
            currentSearchFilter.dateTo = searchDateToInput ? searchDateToInput.value : '';
            currentSearchFilter.name = searchNameInput ? searchNameInput.value.toLowerCase() : '';
            currentSearchFilter.receptionFrom = searchReceptionFromInput ? searchReceptionFromInput.value : '';
            currentSearchFilter.receptionTo = searchReceptionToInput ? searchReceptionToInput.value : '';
            filterAndRenderLogs();
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

    // ========================================
    // JSON 저장/불러오기 (공통 모듈 사용)
    // ========================================
    SampleUtils.setupJSONSaveHandler({
        buttonElement: document.getElementById('saveJsonBtn'),
        sampleType: SAMPLE_TYPE,
        getData: () => sampleLogs,
        FileAPI: FileAPI,
        filePrefix: 'water-samples',
        showToast: showToast
    });

    SampleUtils.setupJSONLoadHandler({
        inputElement: document.getElementById('loadJsonInput'),
        getData: () => sampleLogs,
        setData: (data) => { sampleLogs = data; },
        saveData: saveLogs,
        renderData: () => renderLogs(sampleLogs),
        showToast: showToast
    });

    // ========================================
    // 엑셀 내보내기
    // ========================================
    const exportBtn = document.getElementById('exportBtn');

    // parseAddressParts는 ../shared/address-parser.js에서 전역으로 제공됨

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (sampleLogs.length === 0) {
                alert('내보낼 데이터가 없습니다.');
                return;
            }

            const exportData = sampleLogs.map(log => {
                // 도로명주소에서 시도/시군구/읍면동 분리
                const addressParts = parseAddressParts(log.addressRoad || log.address || '');
                // 전체 주소
                const fullAddress = [log.addressRoad, log.addressDetail].filter(Boolean).join(' ') || '-';

                // 법인여부에 따라 생년월일 또는 법인번호 결정
                const applicantType = log.applicantType || '개인';
                const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

                return {
                    '접수번호': log.receptionNumber || '-',
                    '접수일자': log.date || '-',
                    '법인여부': applicantType,
                    '생년월일/법인번호': birthOrCorp,
                    '성명': log.name || '-',
                    '연락처': log.phoneNumber || '-',
                    '시도': addressParts.sido || '-',
                    '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-',
                    '나머지주소': (addressParts.rest + (log.addressDetail ? ' ' + log.addressDetail : '')).trim() || '-',
                    '전체주소': fullAddress,
                    '우편번호': log.addressPostcode || '-',
                    '채취장소': log.samplingLocation || '-',
                    '시료명': log.sampleName || '-',
                    '시료수': log.sampleCount || '-',
                    '주작목': log.mainCrop || '-',
                    '목적': log.purpose || '-',
                    '검사항목': log.testItems || '-',
                    '통보방법': log.receptionMethod || '-',
                    '비고': log.note || '-',
                    '완료여부': log.isComplete ? '완료' : '미완료',
                    '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                };
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // 열 너비 설정
            ws['!cols'] = [
                { wch: 10 },  // 접수번호
                { wch: 12 },  // 접수일자
                { wch: 8 },   // 법인여부
                { wch: 15 },  // 생년월일/법인번호
                { wch: 10 },  // 성명
                { wch: 15 },  // 연락처
                { wch: 12 },  // 시도
                { wch: 12 },  // 시군구
                { wch: 10 },  // 읍면동
                { wch: 30 },  // 나머지주소
                { wch: 8 },   // 우편번호
                { wch: 25 },  // 채취장소
                { wch: 15 },  // 시료명
                { wch: 8 },   // 시료수
                { wch: 15 },  // 주작목
                { wch: 15 },  // 목적
                { wch: 25 },  // 검사항목
                { wch: 10 },  // 통보방법
                { wch: 20 },  // 비고
                { wch: 8 },   // 완료여부
                { wch: 20 }   // 등록일시
            ];

            XLSX.utils.book_append_sheet(wb, ws, '수질분석 접수');
            XLSX.writeFile(wb, `수질분석_접수대장_${new Date().toISOString().split('T')[0]}.xlsx`);
            showToast('엑셀 파일이 저장되었습니다.', 'success');
        });
    }

    // ========================================
    // 자동 저장 설정 (공통 모듈 사용)
    // ========================================
    let autoSaveFileHandle = null;

    // 자동 저장 수행 함수 (saveLogs에서 호출)
    async function autoSaveToFile() {
        return await SampleUtils.performAutoSave({
            FileAPI: FileAPI,
            moduleKey: 'water',
            data: sampleLogs,
            webFileHandle: autoSaveFileHandle,
            log: log
        });
    }

    // 데이터 변경 시 자동 저장 트리거
    window.triggerWaterAutoSave = autoSaveToFile;

    // 자동 저장 폴더/파일 선택 버튼 설정 (공통 모듈 사용)
    SampleUtils.setupAutoSaveFolderButton({
        moduleKey: 'water',
        FileAPI: FileAPI,
        selectedYear: selectedYear,
        getWebFileHandle: () => autoSaveFileHandle,
        setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
        autoSaveCallback: autoSaveToFile,
        showToast: showToast
    });

    // 자동 저장 토글 이벤트 설정 (공통 모듈 사용)
    SampleUtils.setupAutoSaveToggle({
        moduleKey: 'water',
        FileAPI: FileAPI,
        getWebFileHandle: () => autoSaveFileHandle,
        setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
        autoSaveCallback: autoSaveToFile,
        showToast: showToast,
        log: log
    });

    // ========================================
    // 클라우드 마이그레이션 버튼
    // ========================================
    const migrateBtn = document.getElementById('migrateBtn');
    if (migrateBtn) {
        migrateBtn.addEventListener('click', async () => {
            // Firebase 초기화 시도
            let firebaseInitialized = false;
            let firestoreInitialized = false;
            let initError = null;

            try {
                if (window.firebaseConfig?.initialize) {
                    firebaseInitialized = await window.firebaseConfig.initialize();
                    window.logger.info('Firebase 초기화 결과:', firebaseInitialized);
                }
            } catch (err) {
                window.logger.error('Firebase 초기화 에러:', err);
                initError = err;
            }

            try {
                if (firebaseInitialized && window.firestoreDb?.init) {
                    firestoreInitialized = await window.firestoreDb.init();
                    window.logger.info('Firestore 초기화 결과:', firestoreInitialized);
                }
            } catch (err) {
                window.logger.error('Firestore 초기화 에러:', err);
                initError = err;
            }

            if (!window.firestoreDb?.isEnabled()) {
                if (initError) {
                    showToast('Firebase 초기화 실패: ' + initError.message, 'error');
                } else if (!firebaseInitialized) {
                    showToast('Firebase 연결 실패. 콘솔에서 에러를 확인하세요.', 'error');
                } else if (!firestoreInitialized) {
                    showToast('Firestore 모듈 로드 실패. 페이지를 새로고침하세요.', 'error');
                } else {
                    showToast('Firebase가 설정되지 않았습니다.', 'error');
                }
                return;
            }

            if (sampleLogs.length === 0) {
                showToast('마이그레이션할 데이터가 없습니다.', 'warning');
                return;
            }

            if (!confirm(`현재 ${selectedYear}년 데이터 ${sampleLogs.length}건을 클라우드에 업로드하시겠습니까?`)) {
                return;
            }

            try {
                migrateBtn.disabled = true;
                migrateBtn.textContent = '⏳';

                const dataWithIds = sampleLogs.map(item => ({
                    ...item,
                    id: item.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 11))
                }));

                await window.firestoreDb.batchSave('water', parseInt(selectedYear), dataWithIds);

                sampleLogs = dataWithIds;
                localStorage.setItem(getStorageKey(selectedYear), JSON.stringify(sampleLogs));

                showToast(`${dataWithIds.length}건 클라우드 업로드 완료`, 'success');
            } catch (error) {
                window.logger.error('마이그레이션 실패:', error);
                showToast('클라우드 업로드 실패: ' + error.message, 'error');
            } finally {
                migrateBtn.disabled = false;
                migrateBtn.textContent = '☁️';
            }
        });
    }

    // Electron 환경에서 자동 저장 파일 로드
    if (window.isElectron && FileAPI.autoSavePath) {
        const autoSaveData = await window.loadFromAutoSaveFile();
        if (autoSaveData && autoSaveData.length > 0) {
            sampleLogs = autoSaveData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleLogs));
            log('📂 수질 자동 저장 파일에서 데이터 로드됨:', autoSaveData.length, '건');
            renderLogs(sampleLogs);
        }
    }

    // ========================================
    // 초기 렌더링
    // ========================================

    // 초기 데이터 로드 (Firebase 우선)
    await loadYearData(selectedYear);

    log('✅ 수질분석 페이지 초기화 완료');
});
