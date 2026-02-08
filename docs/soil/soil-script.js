/**
 * @fileoverview 토양 시료 전용 스크립트
 * @description 토양 분석용 시료 접수/관리 기능
 */

// ========================================
// 상수 및 설정
// ========================================

/** @type {string} */
const SAMPLE_TYPE = '토양';

/** @type {string} */
const STORAGE_KEY = 'soilSampleLogs';

/** @type {string} */
const AUTO_SAVE_FILE = 'soil-autosave.json';

/**
 * 디버그 로그 함수 (window.DEBUG 사용 - constants.js에서 설정)
 * @param {...any} args - 로그 인자
 * @returns {void}
 */
const log = (...args) => window.DEBUG && console.log(...args);

// 공통 모듈에서 가져온 변수/함수 사용 (../shared/*.js)
// window.isElectron, createFileAPI 등은 window 객체를 통해 접근
const FileAPI = window.createFileAPI('soil');

document.addEventListener('DOMContentLoaded', async () => {
    log('🚀 페이지 로드 시작 - DOMContentLoaded');
    log(window.isElectron ? '🖥️ Electron 환경 감지됨' : '🌐 웹 브라우저 환경');

    // 파일 API 초기화 (현재 년도로)
    const currentYear = new Date().getFullYear().toString();
    await FileAPI.init(currentYear);

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
        moduleKey: 'soil',
        moduleName: '토양',
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

    const form = document.getElementById('sampleForm');
    const tableBody = document.getElementById('logTableBody');
    const emptyState = document.getElementById('emptyState');
    const dateInput = document.getElementById('date');
    const paginationContainer = document.getElementById('pagination');

    // ========================================
    // 페이지네이션 설정
    // ========================================
    let currentPage = 1;
    let itemsPerPage = parseInt(localStorage.getItem('soilItemsPerPage'), 10) || 100;
    let totalPages = 1;
    let currentFlatRows = []; // 현재 표시할 평탄화된 데이터

    // 페이지네이션 요소들
    const paginationInfo = document.getElementById('paginationInfo');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    // 페이지당 항목 수 초기화
    if (itemsPerPageSelect) {
        itemsPerPageSelect.value = itemsPerPage;
    }

    log('✅ 기본 요소 로드 완료');

    // ========================================
    // 년도 선택 기능
    // ========================================
    const yearSelect = document.getElementById('yearSelect');
    const listYearSelect = document.getElementById('listYearSelect');
    const listViewTitle = document.getElementById('listViewTitle');

    // 데이터가 있는 연도 자동 감지 (현재 연도부터 과거로 검색)
    function findYearWithData() {
        const currentYear = new Date().getFullYear();
        // 현재 연도부터 2020년까지 검색
        for (let year = currentYear; year >= 2020; year--) {
            const key = `${STORAGE_KEY}_${year}`;
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

    // 년도별 스토리지 키 생성
    function getStorageKey(year) {
        return `${STORAGE_KEY}_${year}`;
    }

    // 년도 선택 시 제목 업데이트
    function updateListViewTitle() {
        if (listViewTitle) {
            listViewTitle.textContent = `토양 접수 목록`;
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
    // 면적 포맷팅 함수 - 공통 모듈 사용
    // ========================================
    const { formatArea, getUnitLabel, formatAreaWithUnit } = window.SampleUtils;

    // ========================================
    // 새로운 UI - 네비게이션 시스템
    // ========================================
    const navItems = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const recordCountEl = document.getElementById('recordCount');
    const emptyParcels = document.getElementById('emptyParcels');

    // 뷰 전환 함수
    function switchView(viewName) {
        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        // 목록 뷰로 전환 시 테이블 새로고침
        if (viewName === 'list') {
            renderLogs(sampleLogs);
        }
    }

    // 네비게이션 클릭 이벤트
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            switchView(viewName);
        });
    });

    // URL hash에 따른 뷰 전환 (예: #listView → 접수목록 뷰로 이동)
    function handleHashChange() {
        const hash = window.location.hash;
        if (hash === '#listView') {
            switchView('list');
        } else if (hash === '#formView') {
            switchView('form');
        }
    }

    // 페이지 로드 시 hash 확인
    handleHashChange();

    // hash 변경 시 뷰 전환
    window.addEventListener('hashchange', handleHashChange);

    // 빈 상태에서 "새 시료 접수하기" 버튼
    const btnGoForm = document.querySelector('.btn-go-form');
    if (btnGoForm) {
        btnGoForm.addEventListener('click', () => switchView('form'));
    }

    // 빈 필지 상태에서 "첫 번째 필지 추가" 버튼
    const btnAddParcelEmpty = document.querySelector('.btn-add-parcel-empty');
    if (btnAddParcelEmpty) {
        btnAddParcelEmpty.addEventListener('click', () => {
            addParcel();
        });
    }

    // 레코드 카운트 업데이트
    function updateRecordCount() {
        if (recordCountEl) {
            recordCountEl.textContent = `${sampleLogs.length}건`;
        }
    }

    // 토스트 메시지 - 공통 모듈 사용 (../shared/toast.js)
    const showToast = window.showToast;

    // 빈 필지 상태 표시/숨김
    function updateEmptyParcelsState() {
        log(`📊 updateEmptyParcelsState 호출 - 필지 개수: ${parcels ? parcels.length : 'parcels 정의 안됨'}`);
        if (emptyParcels) {
            if (parcels.length === 0) {
                emptyParcels.style.display = 'block';
                log('   - emptyParcels 표시');
            } else {
                emptyParcels.style.display = 'none';
                log('   - emptyParcels 숨김');
            }
        } else {
            window.logger.error('❌ emptyParcels 요소를 찾을 수 없습니다!');
        }
    }

    // 목적 선택 요소
    const purposeSelect = document.getElementById('purpose');

    // ========================================
    // 전화번호 자동 하이픈 - 공통 모듈 사용
    // ========================================
    const phoneNumberInput = document.getElementById('phoneNumber');
    window.SampleUtils.setupPhoneNumberInput(phoneNumberInput);

    // ========================================
    // 수령 방법 선택
    // ========================================
    const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
    const receptionMethodInput = document.getElementById('receptionMethod');

    receptionMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 버튼에서 active 클래스 제거
            receptionMethodBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            btn.classList.add('active');
            // hidden input에 값 설정
            receptionMethodInput.value = btn.dataset.method;
        });
    });

    // ========================================
    // 시료 타입 네비게이션 선택 (토양 전용)
    // ========================================
    const sampleTypeBtns = document.querySelectorAll('.type-btn');

    sampleTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 모든 버튼에서 active 클래스 제거
            sampleTypeBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            btn.classList.add('active');

            // 접수 뷰가 아니면 접수 뷰로 전환
            switchView('form');
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

    // 오늘 날짜를 기본값으로 설정
    dateInput.valueAsDate = new Date();

    // LocalStorage에서 데이터 로드 (년도별) - safeParseJSON 사용으로 에러 핸들링
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
                const cloudData = await window.storageManager.load('soil', parseInt(year), getStorageKey(year));
                if (cloudData && cloudData.length > 0) {
                    // localStorage에도 저장 (캐시)
                    localStorage.setItem(getStorageKey(year), JSON.stringify(cloudData));
                    log('☁️ Firebase에서 데이터 로드:', cloudData.length, '건');
                    return cloudData;
                }
            }
            // firestoreDb 직접 사용 (storageManager가 초기화되지 않은 경우)
            if (window.firestoreDb?.isEnabled()) {
                const cloudData = await window.firestoreDb.getAll('soil', parseInt(year));
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
                const cloudData = await window.firestoreDb.getAll('soil', parseInt(year), { skipOrder: true });

                if (cloudData && cloudData.length > 0) {
                    // Firebase 데이터를 primary로 사용
                    sampleLogs = cloudData;
                    log('☁️ Firebase 데이터 로드 완료:', sampleLogs.length, '건');

                    // localStorage에 캐싱
                    localStorage.setItem(yearStorageKey, JSON.stringify(sampleLogs));
                    log('💾 로컬 캐싱 완료');

                    renderLogs(sampleLogs);
                    const receptionInput = document.getElementById('receptionNumber');
                    if (receptionInput) {
                        receptionInput.value = generateNextReceptionNumber();
                    }
                    updateListViewTitle();

                    // 자동저장 실행 (JSON 파일)
                    const autoSaveEnabled = localStorage.getItem('soilAutoSaveEnabled') === 'true';
                    if (autoSaveEnabled && window.isElectron && FileAPI.autoSavePath) {
                        SampleUtils.performAutoSave({
                            FileAPI: FileAPI,
                            moduleKey: SAMPLE_TYPE,
                            data: sampleLogs,
                            log: log
                        });
                    }
                    return;
                } else {
                    log('☁️ Firebase에 데이터 없음, localStorage 확인');
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
            const cloudData = await window.firestoreDb.getAll('soil', parseInt(year), { skipOrder: true });

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
                const autoSaveEnabled = localStorage.getItem('soilAutoSaveEnabled') === 'true';
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

    // 선택된 연도의 자동 저장 파일 로드 (연도 전환 시 사용)
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
    // 접수번호 자동 카운터
    // ========================================
    const receptionNumberInput = document.getElementById('receptionNumber');
    const subCategorySelect = document.getElementById('subCategory');

    // 다음 접수번호 생성 (일반용)
    function generateNextReceptionNumber() {
        let maxNumber = 0;

        // 기존 데이터에서 최대 번호 찾기 (성토 제외)
        // 형식: 1, 2, 3 (숫자만)
        sampleLogs.forEach(log => {
            if (log.receptionNumber && log.subCategory !== '성토') {
                // 숫자만 추출 (하위필지 번호 제외: "1-1" -> "1")
                const baseNumber = log.receptionNumber.split('-')[0];
                // 성토 접두사 확인 (F로 시작하면 제외)
                if (baseNumber.startsWith('F')) return;
                const num = parseInt(baseNumber, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });

        // 다음 번호 생성
        const nextNumber = maxNumber + 1;
        log(`📋 다음 접수번호 생성: ${nextNumber} (기존 최대: ${maxNumber})`);
        return String(nextNumber);
    }

    // 다음 접수번호 생성 (성토용)
    function generateNextFillReceptionNumber() {
        let maxNumber = 0;

        // 기존 성토 데이터에서 최대 번호 찾기
        // 형식: F1, F2, F3
        sampleLogs.forEach(log => {
            if (log.receptionNumber && log.subCategory === '성토') {
                // F 접두사 제거 후 숫자 추출
                const baseNumber = log.receptionNumber.split('-')[0];
                const numStr = baseNumber.replace('F', '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });

        // 다음 번호 생성 (F 접두사)
        const nextNumber = maxNumber + 1;
        log(`📋 다음 성토 접수번호 생성: F${nextNumber} (기존 최대: ${maxNumber})`);
        return `F${nextNumber}`;
    }

    // 구분 변경 시 접수번호 및 UI 업데이트
    subCategorySelect.addEventListener('change', (e) => {
        const isFill = e.target.value === '성토';

        // 접수번호 변경
        if (isFill) {
            receptionNumberInput.value = generateNextFillReceptionNumber();
        } else {
            receptionNumberInput.value = generateNextReceptionNumber();
        }

        // 필지 카드 UI 모드 변경
        updateParcelCardsMode(isFill);
    });

    // 필지 카드 성토 모드 UI 업데이트
    function updateParcelCardsMode(isFillMode) {
        const parcelsContainer = document.getElementById('parcelsContainer');
        log(`🏗️ 성토 모드 변경: ${isFillMode}, parcelsContainer: ${parcelsContainer ? '있음' : '없음'}`);
        if (parcelsContainer) {
            if (isFillMode) {
                parcelsContainer.classList.add('fill-mode');
                log('✅ fill-mode 클래스 추가됨');
            } else {
                parcelsContainer.classList.remove('fill-mode');
                log('✅ fill-mode 클래스 제거됨');
            }
        }
    }

    // 초기 데이터 로드 (Firebase 우선)
    await loadYearData(selectedYear);

    // 초기 접수번호 설정
    receptionNumberInput.value = generateNextReceptionNumber();

    // ========================================
    // 필지 관리 시스템
    // ========================================
    const parcelsContainer = document.getElementById('parcelsContainer');
    const addParcelBtn = document.getElementById('addParcelBtn');
    const parcelsDataInput = document.getElementById('parcelsData');

    log('🗺️ 필지 관리 시스템 초기화');
    log(`   - parcelsContainer: ${parcelsContainer ? '✅ 찾음' : '❌ 없음'}`);
    log(`   - addParcelBtn: ${addParcelBtn ? '✅ 찾음' : '❌ 없음'}`);

    if (!parcelsContainer) {
        window.logger.error('❌ 치명적 오류: parcelsContainer를 찾을 수 없습니다!');
    }

    let parcels = []; // 필지 배열
    let parcelIdCounter = 0;

    // 필지 추가 버튼
    if (addParcelBtn) {
        addParcelBtn.addEventListener('click', () => {
            addParcel();
        });
    }

    // 초기 필지 1개 추가
    log('📝 초기 필지 추가 중...');
    addParcel();

    // 접수번호 변경 시 모든 필지의 번호 업데이트
    receptionNumberInput.addEventListener('input', () => {
        updateAllParcelNumbers();
    });

    // 모든 필지의 번호 업데이트
    function updateAllParcelNumbers() {
        parcels.forEach((parcel, idx) => {
            updateSubLotsDisplay(parcel.id);
            updateCropsAreaDisplay(parcel.id);
        });
    }

    // 필지 추가 함수
    function addParcel() {
        log('✨ 필지 추가 함수 호출됨');
        const parcelId = `parcel-${parcelIdCounter++}`;
        const parcel = {
            id: parcelId,
            lotAddress: '',
            isMountain: false, // 산 여부
            subLots: [], // 이제 { lotAddress: string, crops: [{name, area}] } 형태의 객체 배열
            crops: [],
            note: '' // 필지별 비고
        };
        parcels.push(parcel);
        log(`   - 생성된 필지 ID: ${parcelId}`);
        log(`   - 전체 필지 개수: ${parcels.length}`);

        renderParcelCard(parcel, parcels.length);
        updateParcelsData();
        updateEmptyParcelsState();
    }

    // 필지 카드 렌더링
    function renderParcelCard(parcel, index) {
        log(`📍 필지 카드 렌더링 시작: ${parcel.id}, index: ${index}`);

        const card = document.createElement('div');
        card.className = 'parcel-card';
        card.id = parcel.id;

        // 기존 작물 데이터가 있으면 첫 번째 것 사용
        const firstCrop = parcel.crops[0] || { name: '', area: '' };
        const parcelNumber = index; // 필지 번호 (1, 2, 3...)

        log(`   - 첫 번째 작물:`, firstCrop);
        log(`   - 필지 번호: ${parcelNumber}`);

        // XSS 방지: 사용자 입력 데이터 이스케이프
        const safeLotAddress = escapeHTML(parcel.lotAddress);
        const safeCropName = escapeHTML(firstCrop.name);
        const safeCropArea = escapeHTML(firstCrop.area);

        // 필지별 구분 (논/밭/과수/시설)
        const parcelCategory = parcel.category || '';

        card.innerHTML = sanitizeHTML(`
            <div class="parcel-card-header">
                <h4>필지 ${parcelNumber}</h4>
                <div class="parcel-category-radios" data-id="${parcel.id}">
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="" ${parcelCategory === '' ? 'checked' : ''}>
                        <span>-</span>
                    </label>
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="논" ${parcelCategory === '논' ? 'checked' : ''}>
                        <span>논</span>
                    </label>
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="밭" ${parcelCategory === '밭' ? 'checked' : ''}>
                        <span>밭</span>
                    </label>
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="과수" ${parcelCategory === '과수' ? 'checked' : ''}>
                        <span>과수</span>
                    </label>
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="시설" ${parcelCategory === '시설' ? 'checked' : ''}>
                        <span>시설</span>
                    </label>
                    <label class="parcel-category-label">
                        <input type="radio" name="parcel-category-${parcel.id}" value="임야" ${parcelCategory === '임야' ? 'checked' : ''}>
                        <span>임야</span>
                    </label>
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
                                // XSS 방지
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
                        <label for="parcel-note-${parcel.id}">비고</label>
                        <input type="text" class="parcel-note-input"
                               id="parcel-note-${parcel.id}"
                               name="parcel-note-${parcel.id}"
                               data-id="${parcel.id}"
                               placeholder="필지 관련 메모"
                               value="${escapeHTML(parcel.note || '')}">
                    </div>
                </div>
                <div class="parcel-summary" id="summary-${parcel.id}">
                    ${renderParcelSummary(parcel)}
                </div>
            </div>
        `);

        if (!parcelsContainer) {
            window.logger.error('❌ parcelsContainer를 찾을 수 없습니다!');
            return;
        }

        parcelsContainer.appendChild(card);
        log(`   ✅ 필지 카드가 DOM에 추가되었습니다`);

        // 직접 입력 자동완성 이벤트 바인딩
        bindDirectCropAutocomplete(parcel.id);
        // 필지 주소 자동완성 이벤트 바인딩
        bindLotAddressAutocomplete(parcel.id);
        // 하위 지번 자동완성 이벤트 바인딩
        bindSubLotAutocomplete(parcel.id);
        // 면적 단위 변환 이벤트 바인딩
        bindAreaUnitConversion(parcel.id);
        // 필지별 구분 라디오 버튼 이벤트 바인딩
        bindParcelCategoryRadio(parcel.id);

        log(`   ✅ 모든 이벤트 바인딩 완료`);
    }

    // 필지별 구분 라디오 버튼 이벤트 바인딩
    function bindParcelCategoryRadio(parcelId) {
        const radioContainer = document.querySelector(`.parcel-category-radios[data-id="${parcelId}"]`);
        if (!radioContainer) return;

        const radios = radioContainer.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const category = e.target.value;
                const parcel = parcels.find(p => p.id === parcelId);
                if (parcel) {
                    parcel.category = category;
                    log(`📍 필지 ${parcelId} 구분 변경: ${category || '없음'}`);
                    updateSummary();
                    triggerAutoSave();
                }
            });
        });
    }

    // 면적 단위 변환 이벤트 바인딩
    function bindAreaUnitConversion(parcelId) {
        const areaInput = document.getElementById(`area-direct-${parcelId}`);
        const unitToggle = document.getElementById(`area-unit-${parcelId}`);

        if (!areaInput || !unitToggle) return;

        const unitButtons = unitToggle.querySelectorAll('.unit-btn');

        unitButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newUnit = btn.dataset.value;
                const previousUnit = unitToggle.dataset.unit;

                // 이미 같은 단위면 무시
                if (newUnit === previousUnit) return;

                // 버튼 활성화 상태 변경
                unitButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                unitToggle.dataset.unit = newUnit;

                // 면적 값은 변환하지 않고 단위만 변경 (입력한 값 그대로 유지)
            });
        });
    }

    // 필지 주소 자동완성 바인딩 (봉화군 한정)
    function bindLotAddressAutocomplete(parcelId) {
        const lotInput = document.querySelector(`.lot-address-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`lotAutocomplete-${parcelId}`);

        if (!lotInput || !autocompleteList) return;

        // 입력 시 자동완성 목록 표시
        lotInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // 이미 완전한 주소면 자동완성 비활성화 (시/군으로 시작)
            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                updateParcelLotAddress(parcelId);
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                // 세 번째 인자 true: 산 지번 옵션 포함
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

            updateParcelLotAddress(parcelId);
        });

        // Enter 키 입력 시 자동 변환
        lotInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const value = lotInput.value.trim();

                // 이미 완전한 주소면 무시 (시/군으로 시작)
                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                // parseParcelAddress 사용 (세 지역 통합)
                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);

                    if (result) {
                        // 세 지역 간 중복인 경우
                        if (result.isDuplicate) {
                            // 지역 선택 모달 표시
                            showRegionSelectionModal(result, parcelId, lotInput);
                        }
                        // 단일 지역 내 중복인 경우
                        else if (result.alternatives && result.alternatives.length > 1) {
                            // 같은 지역 내 중복 리 선택 UI 표시
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            // 단일 매칭 - 바로 변환
                            lotInput.value = result.fullAddress;
                            autocompleteList.classList.remove('show');
                            updateParcelLotAddress(parcelId);
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
                const lotNumber = e.target.dataset.lot || '';

                // 로컬 지역명 매핑
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                // 산 지번이면 "리 산" 형식
                const villageWithMountain = isMountain ? `${village} 산` : village;

                // 기존 입력에서 지번 추출 (산 키워드 제외)
                const currentValue = lotInput.value.trim();
                const match = currentValue.match(/\d+(-\d+)?$/);
                const extractedLotNumber = lotNumber || (match ? match[0] : '');

                const fullAddress = extractedLotNumber
                    ? `${region} ${district} ${villageWithMountain} ${extractedLotNumber}`
                    : `${region} ${district} ${villageWithMountain}`;

                lotInput.value = fullAddress;
                autocompleteList.classList.remove('show');
                updateParcelLotAddress(parcelId);
            }
        });

        // 포커스 아웃 시 목록 숨김
        lotInput.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteList.classList.remove('show');
            }, 200);
        });
    }

    // 하위 지번 자동완성 바인딩 (봉화군 한정)
    function bindSubLotAutocomplete(parcelId) {
        const subLotInput = document.querySelector(`.sub-lot-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`subLotAutocomplete-${parcelId}`);

        if (!subLotInput || !autocompleteList) return;

        // 입력 시 자동완성 목록 표시
        subLotInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // 이미 완전한 주소면 자동완성 비활성화 (시/군으로 시작)
            if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                autocompleteList.classList.remove('show');
                return;
            }

            if (value.length > 0 && typeof suggestRegionVillages === 'function') {
                // 세 번째 인자 true: 산 지번 옵션 포함
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

        // Enter 키 입력 시 자동 변환
        subLotInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const value = subLotInput.value.trim();

                // 이미 완전한 주소면 무시 (시/군으로 시작)
                if (value.startsWith('봉화군') || value.startsWith('영주시') || value.startsWith('울진군')) {
                    autocompleteList.classList.remove('show');
                    return;
                }

                // parseParcelAddress 사용 (세 지역 통합)
                if (typeof parseParcelAddress === 'function') {
                    const result = parseParcelAddress(value);

                    if (result) {
                        // 세 지역 간 중복인 경우
                        if (result.isDuplicate) {
                            // 지역 선택 모달 표시
                            showRegionSelectionModal(result, parcelId, subLotInput);
                        }
                        // 단일 지역 내 중복인 경우
                        else if (result.alternatives && result.alternatives.length > 1) {
                            // 같은 지역 내 중복 리 선택 UI 표시
                            autocompleteList.innerHTML = sanitizeHTML(result.alternatives.map(district => `
                                <li data-village="${result.village}" data-district="${district}" data-lot="${result.lotNumber}" data-region-key="${result.regionKey}">
                                    ${result.region} ${district} ${result.village} ${result.lotNumber || ''}
                                </li>
                            `).join(''));
                            autocompleteList.classList.add('show');
                        } else {
                            // 단일 매칭 - 바로 변환
                            subLotInput.value = result.fullAddress;
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
                const lotNumber = e.target.dataset.lot || '';

                // 로컬 지역명 매핑
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                // 산 지번이면 "리 산" 형식
                const villageWithMountain = isMountain ? `${village} 산` : village;

                // 기존 입력에서 지번 추출 (산 키워드 제외)
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

        // 포커스 아웃 시 목록 숨김
        subLotInput.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteList.classList.remove('show');
            }, 200);
        });
    }

    /**
     * 필지 주소 업데이트 (중복 허용 - 비고로 구분)
     * @description 같은 필지에 여러 시료 접수 가능. 비고 필드로 구분.
     * @param {string} parcelId - 필지 고유 ID
     * @returns {void}
     */
    function updateParcelLotAddress(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        const lotInput = document.querySelector(`.lot-address-input[data-id="${parcelId}"]`);

        if (parcel && lotInput) {
            const newValue = lotInput.value.trim();

            // 빈 필지 주소 검증
            if (!newValue) {
                showToast('필지 주소를 입력해주세요.', 'warning');
                lotInput.focus();
                return;
            }

            parcel.lotAddress = newValue;
            updateParcelsData();
            updateParcelSummary(parcelId);
        }
    }

    // 직접 입력 필드 자동완성 바인딩
    function bindDirectCropAutocomplete(parcelId) {
        log('🌾 bindDirectCropAutocomplete called for parcelId:', parcelId);

        const cropInput = document.querySelector(`.crop-direct-input[data-id="${parcelId}"]`);
        const autocompleteList = document.getElementById(`autocomplete-direct-${parcelId}`);

        log('  cropInput:', cropInput);
        log('  autocompleteList:', autocompleteList);

        if (!cropInput || !autocompleteList) {
            console.warn('⚠️ Missing elements for parcel', parcelId);
            return;
        }

        cropInput.addEventListener('input', (e) => {
            log('✏️ DIRECT CROP INPUT EVENT!', e.target.value);

            const value = e.target.value.trim().toLowerCase();

            if (value.length > 0 && typeof CROP_DATA !== 'undefined') {
                const matches = CROP_DATA.filter(crop =>
                    crop.name.toLowerCase().includes(value)
                ).slice(0, 8);

                log('🔍 Direct crop matches:', matches.length);

                if (matches.length > 0) {
                    autocompleteList.innerHTML = sanitizeHTML(matches.map(crop => `
                        <li data-code="${crop.code}" data-name="${crop.name}">${crop.name} (${crop.category})</li>
                    `).join(''));

                    // 위치 설정
                    const rect = cropInput.getBoundingClientRect();
                    autocompleteList.style.left = `${rect.left}px`;
                    autocompleteList.style.top = `${rect.bottom + 2}px`;
                    autocompleteList.style.width = `${rect.width}px`;

                    autocompleteList.classList.add('show');
                    log('✅ Direct crop autocomplete shown at position:', rect);
                } else {
                    autocompleteList.classList.remove('show');
                    log('❌ No matches found');
                }
            } else {
                autocompleteList.classList.remove('show');
                log('⚠️ Empty value or CROP_DATA unavailable');
            }

            // 첫 번째 작물 업데이트
            updateFirstCrop(parcelId);
        });

        cropInput.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteList.classList.remove('show');
            }, 200);
        });

        autocompleteList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                log('🎯 Direct crop item clicked');

                const name = e.target.dataset.name;
                cropInput.value = name;
                autocompleteList.classList.remove('show');
                updateFirstCrop(parcelId);

                // 면적 입력으로 포커스
                const areaInput = document.querySelector(`.area-direct-input[data-id="${parcelId}"]`);
                if (areaInput) areaInput.focus();

                log('✅ Direct crop selected:', name);
            }
        });

        log('✅ Direct crop autocomplete events bound');
    }

    // 첫 번째 작물 업데이트
    function updateFirstCrop(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        const cropInput = document.querySelector(`.crop-direct-input[data-id="${parcelId}"]`);
        const areaInput = document.querySelector(`.area-direct-input[data-id="${parcelId}"]`);
        const unitToggle = document.getElementById(`area-unit-${parcelId}`);

        if (!parcel || !cropInput || !areaInput) return;

        const cropName = cropInput.value.trim();
        let cropArea = areaInput.value.trim();
        const unit = unitToggle ? unitToggle.dataset.unit : 'm2'; // 토글 버튼의 data-unit 속성에서 단위 가져오기

        // 작물명과 면적이 모두 있어야 유효한 작물로 저장
        if (cropName && cropArea) {
            if (parcel.crops.length === 0) {
                parcel.crops.push({ name: cropName, area: cropArea, code: '', unit: unit });
            } else {
                parcel.crops[0].name = cropName;
                parcel.crops[0].area = cropArea;
                parcel.crops[0].unit = unit;
            }
        } else {
            // 작물명 또는 면적이 없으면 첫 번째 작물 제거
            if (parcel.crops.length === 1 && (!parcel.crops[0].name || !parcel.crops[0].area)) {
                parcel.crops = [];
            }
        }

        updateParcelSummary(parcelId);
        updateParcelsData();
    }

    // 필지 요약 렌더링
    function renderParcelSummary(parcel) {
        // 모든 작물 수집 (메인 + 하위 지번)
        const allCrops = [
            ...parcel.crops,
            ...parcel.subLots.flatMap(subLot => {
                if (typeof subLot === 'string') return [];
                return subLot.crops || [];
            })
        ].filter(c => c.name && c.area);

        // 단위별 면적 합산
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

        // 면적 표시 문자열 생성
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

    // 필지 컨테이너 이벤트 위임
    parcelsContainer.addEventListener('click', (e) => {
        const target = e.target;

        // 필지 삭제
        if (target.classList.contains('btn-remove-parcel')) {
            const parcelId = target.dataset.id;
            if (parcels.length > 1) {
                parcels = parcels.filter(p => p.id !== parcelId);
                document.getElementById(parcelId).remove();
                updateParcelNumbers();
                updateParcelsData();
            } else {
                alert('최소 1개의 필지가 필요합니다.');
            }
        }

        // 하위 필지 추가 (중복 허용 - 비고로 구분)
        if (target.classList.contains('btn-add-sub-lot-icon')) {
            const parcelId = target.dataset.id;
            const input = document.querySelector(`.sub-lot-input[data-id="${parcelId}"]`);
            const value = input.value.trim();
            if (value) {
                const parcel = parcels.find(p => p.id === parcelId);
                parcel.subLots.push({
                    lotAddress: value,
                    crops: []
                });
                updateSubLotsDisplay(parcelId);
                updateParcelSummary(parcelId);
                updateParcelsData();
                input.value = '';
            }
        }

        // 하위 지번 제거
        if (target.classList.contains('remove-sub-lot')) {
            const subLotIndex = parseInt(target.dataset.index, 10);
            const container = target.closest('.sub-lots-container');
            const parcelId = container.id.replace('subLots-', '');
            const parcel = parcels.find(p => p.id === parcelId);
            parcel.subLots.splice(subLotIndex, 1);
            updateSubLotsDisplay(parcelId);
            updateParcelSummary(parcelId);
            updateParcelsData();
        }

        // 하위 지번 작물 추가 버튼
        if (target.classList.contains('btn-add-sublot-crop')) {
            const parcelId = target.dataset.parcelId;
            const subLotIndex = parseInt(target.dataset.sublotIndex, 10);
            openSubLotCropModal(parcelId, subLotIndex);
        }

        // 하위 지번 작물 제거
        if (target.classList.contains('remove-sublot-crop')) {
            const subLotIndex = parseInt(target.dataset.sublotIndex, 10);
            const cropIndex = parseInt(target.dataset.cropIndex, 10);
            const container = target.closest('.sub-lots-container');
            const parcelId = container.id.replace('subLots-', '');
            const parcel = parcels.find(p => p.id === parcelId);

            if (parcel.subLots[subLotIndex] && parcel.subLots[subLotIndex].crops) {
                parcel.subLots[subLotIndex].crops.splice(cropIndex, 1);
                updateSubLotsDisplay(parcelId);
                updateParcelSummary(parcelId);
                updateParcelsData();
            }
        }

        // 작물 추가 버튼
        if (target.classList.contains('btn-add-crop-area') || target.classList.contains('btn-add-crop-compact')) {
            const parcelId = target.dataset.id;
            openCropAreaModal(parcelId);
        }

        // 작물 제거
        if (target.classList.contains('remove-crop-area')) {
            const item = target.closest('.crop-area-item');
            const container = target.closest('.crops-area-container');
            if (!container) return;
            const parcelId = container.id.replace('cropsArea-', '');
            const index = parseInt(item.dataset.index, 10);
            const parcel = parcels.find(p => p.id === parcelId);
            if (parcel && parcel.crops[index]) {
                parcel.crops.splice(index, 1);
                updateCropsAreaDisplay(parcelId);
                updateParcelSummary(parcelId);
                updateParcelsData();
            }
        }
    });

    // 필지 주소 입력 이벤트 (실시간 저장, 중복 체크는 blur에서)
    parcelsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('lot-address-input')) {
            const parcelId = e.target.dataset.id;
            const parcel = parcels.find(p => p.id === parcelId);
            // 임시 저장 (중복 체크는 blur 시점에)
            parcel._tempLotAddress = e.target.value;
            parcel.lotAddress = e.target.value;
            updateParcelsData();
        }

        // 직접 면적 입력 이벤트
        if (e.target.classList.contains('area-direct-input')) {
            const parcelId = e.target.dataset.id;
            updateFirstCrop(parcelId);
        }

        // 필지별 비고 입력 이벤트
        if (e.target.classList.contains('parcel-note-input')) {
            const parcelId = e.target.dataset.id;
            const parcel = parcels.find(p => p.id === parcelId);
            if (parcel) {
                parcel.note = e.target.value;
                updateParcelsData();
                log(`📝 필지 비고 업데이트: ${parcelId} = "${e.target.value}"`);
            }
        }
    });

    // 필지별 비고 blur 이벤트 (확실한 저장)
    parcelsContainer.addEventListener('blur', (e) => {
        if (e.target.classList.contains('parcel-note-input')) {
            const parcelId = e.target.dataset.id;
            const parcel = parcels.find(p => p.id === parcelId);
            if (parcel) {
                parcel.note = e.target.value;
                updateParcelsData();
            }
        }
    }, true);

    // 필지 주소 blur 이벤트 (중복 허용 - 값 저장만 수행)
    parcelsContainer.addEventListener('blur', (e) => {
        if (e.target.classList.contains('lot-address-input')) {
            const parcelId = e.target.dataset.id;
            const parcel = parcels.find(p => p.id === parcelId);
            if (parcel) {
                parcel.lotAddress = e.target.value.trim();
                updateParcelsData();
            }
        }
    }, true);

    // 산 체크박스 변경 이벤트
    parcelsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('mountain-checkbox')) {
            const parcelId = e.target.dataset.id;
            const parcel = parcels.find(p => p.id === parcelId);
            if (parcel) {
                parcel.isMountain = e.target.checked;
                updateParcelsData();
            }
        }
    });

    // 하위 지번 입력에서 엔터키
    parcelsContainer.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('sub-lot-input') && e.key === 'Enter') {
            e.preventDefault();
            const addBtn = document.querySelector(`.btn-add-sub-lot-icon[data-id="${e.target.dataset.id}"]`);
            addBtn.click();
        }
    });

    // 접수번호 가져오기 (연도 제외, 번호만)
    function getReceptionNumber() {
        const receptionInput = document.getElementById('receptionNumber');
        if (!receptionInput) {
            console.warn('접수번호 입력란을 찾을 수 없습니다');
            return '';
        }

        const value = receptionInput.value.trim();
        if (!value) {
            console.warn('접수번호가 비어있습니다');
            return '';
        }

        // "2024-001" 형식에서 "-" 뒤의 번호만 추출
        const parts = value.split('-');
        if (parts.length >= 2) {
            const numberPart = parts.slice(1).join('-'); // 연도 제외한 나머지 (예: "001" 또는 "001-A")
            log(`접수번호 추출: ${value} → ${numberPart}`);
            return numberPart;
        }

        // "-"가 없으면 그대로 반환
        log(`접수번호 형식 확인: ${value}`);
        return value;
    }

    // 하위 지번 표시 업데이트
    function updateSubLotsDisplay(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        const parcelIndex = parcels.indexOf(parcel) + 1; // 필지 순번 (1, 2, 3...)
        const container = document.getElementById(`subLots-${parcelId}`);

        // 필지번호-하위번호 형식 (예: 1-1, 1-2, 2-1, 2-2)
        container.innerHTML = sanitizeHTML(parcel.subLots.map((subLot, idx) => {
            const number = `${parcelIndex}-${idx + 1}`;
            const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
            const crops = typeof subLot === 'string' ? [] : (subLot.crops || []);
            const subLotCropsId = 'subLotCrops-' + parcelId + '-' + idx;
            // XSS 방지: 사용자 입력 데이터 이스케이프
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

    // 작물 면적 표시 업데이트
    function updateCropsAreaDisplay(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        if (!parcel) return;

        const container = document.getElementById(`cropsArea-${parcelId}`);

        // 컨테이너가 없으면 리턴 (모달에서 호출되는 경우)
        if (!container) return;

        // 첫 번째 작물은 직접 입력 필드에 표시되므로 slice(1)
        container.innerHTML = sanitizeHTML(parcel.crops.slice(1).map((crop, idx) => {
            // 지번 정보 표시
            const subLotLabel = getSubLotLabel(crop.subLotTarget, parcel);
            // XSS 방지: 사용자 입력 데이터 이스케이프
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

    // 지번 라벨 생성
    function getSubLotLabel(subLotTarget, parcel) {
        if (!subLotTarget || subLotTarget === 'all') return '';
        if (!parcel.subLots || parcel.subLots.length === 0) return '';

        const idx = parcel.subLots.indexOf(subLotTarget);
        if (idx >= 0) {
            return `[${subLotTarget}]`;
        }
        return '';
    }

    // 필지 요약 업데이트
    function updateParcelSummary(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        const summaryEl = document.getElementById(`summary-${parcelId}`);
        summaryEl.innerHTML = sanitizeHTML(renderParcelSummary(parcel));
    }

    // 필지 번호 업데이트
    function updateParcelNumbers() {
        const cards = parcelsContainer.querySelectorAll('.parcel-card');
        cards.forEach((card, idx) => {
            card.querySelector('h4').textContent = `필지 ${idx + 1}`;
        });
    }

    // 필지 데이터를 hidden input에 저장
    function updateParcelsData() {
        parcelsDataInput.value = JSON.stringify(parcels);
    }

    // ========================================
    // 작물+면적 입력 모달
    // ========================================
    const cropAreaModal = document.getElementById('cropAreaModal');
    const cropAreaList = document.getElementById('cropAreaList');
    const addCropAreaBtn = document.getElementById('addCropAreaBtn');
    const confirmCropAreaBtn = document.getElementById('confirmCropAreaBtn');
    const cancelCropAreaBtn = document.getElementById('cancelCropAreaBtn');
    const closeCropAreaModalBtn = document.getElementById('closeCropAreaModal');

    log('🔍 Modal elements initialization:');
    log('cropAreaModal:', cropAreaModal);
    log('cropAreaList:', cropAreaList);
    log('addCropAreaBtn:', addCropAreaBtn);
    log('CROP_DATA loaded:', typeof CROP_DATA !== 'undefined', CROP_DATA ? CROP_DATA.length : 0);

    let currentParcelIdForCrop = null;
    let tempCropAreas = [];

    function openCropAreaModal(parcelId) {
        log('🎯 openCropAreaModal called with parcelId:', parcelId);
        currentParcelIdForCrop = parcelId;
        const parcel = parcels.find(p => p.id === parcelId);
        log('📦 Parcel found:', parcel);
        // 기존 작물 데이터에 subLotTarget이 없으면 'all'로 초기화
        tempCropAreas = parcel.crops.map(c => ({
            ...c,
            subLotTarget: c.subLotTarget || 'all'
        }));
        log('🌾 tempCropAreas initialized:', tempCropAreas);

        renderCropAreaModal();
        cropAreaModal.classList.remove('hidden');
        log('✅ Modal shown, classList:', cropAreaModal.classList.toString());
    }

    // 현재 필지의 지번 옵션 가져오기
    function getSubLotOptions(parcelId) {
        const parcel = parcels.find(p => p.id === parcelId);
        if (!parcel) return [];

        const options = [{ value: 'all', label: '전체 (상위 필지 전체)' }];

        if (parcel.subLots && parcel.subLots.length > 0) {
            parcel.subLots.forEach((lot, idx) => {
                options.push({
                    value: lot,
                    label: `하위 ${idx + 1}: ${lot}`
                });
            });
        }

        return options;
    }

    function closeCropAreaModalFn() {
        cropAreaModal.classList.add('hidden');
        currentParcelIdForCrop = null;
        tempCropAreas = [];
    }

    closeCropAreaModalBtn.addEventListener('click', closeCropAreaModalFn);
    cancelCropAreaBtn.addEventListener('click', closeCropAreaModalFn);
    cropAreaModal.querySelector('.modal-overlay').addEventListener('click', closeCropAreaModalFn);

    // 작물 행 추가
    addCropAreaBtn.addEventListener('click', () => {
        tempCropAreas.push({ name: '', area: '', code: '' });
        renderCropAreaModal();
    });

    // 모달 내 작물 목록 렌더링
    function renderCropAreaModal() {
        log('🔧 renderCropAreaModal called');
        log('📊 cropAreaList element:', cropAreaList);
        log('🌾 tempCropAreas:', tempCropAreas);

        if (tempCropAreas.length === 0) {
            tempCropAreas.push({ name: '', area: '', code: '', subLotTarget: 'all' });
        }

        // 지번 옵션 가져오기
        const subLotOptions = getSubLotOptions(currentParcelIdForCrop);
        const hasSubLots = subLotOptions.length > 1; // 'all' 외에 하위 지번이 있는지

        cropAreaList.innerHTML = sanitizeHTML(tempCropAreas.map((crop, idx) => `
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

        // 자동완성 이벤트 바인딩
        bindAutocompleteEvents();
    }

    // 자동완성 이벤트 바인딩 (간소화된 직접 바인딩 방식)
    function bindAutocompleteEvents() {
        log('🔧 bindAutocompleteEvents called');
        log('📋 cropAreaList element:', cropAreaList);
        log('🌾 CROP_DATA available:', typeof CROP_DATA !== 'undefined', CROP_DATA ? CROP_DATA.length : 0);

        // 작물 검색 input 요소들 찾기
        const searchInputs = cropAreaList.querySelectorAll('.crop-search-input');
        log('🔍 Found', searchInputs.length, 'crop search inputs');

        searchInputs.forEach((input, index) => {
            log(`  - Input ${index}:`, input, 'data-index:', input.dataset.index);

            // input 이벤트
            input.addEventListener('input', (e) => {
                log('✏️ INPUT EVENT FIRED!', e.target.value);

                const idx = parseInt(e.target.dataset.index, 10);
                const value = e.target.value.trim().toLowerCase();
                const autocompleteList = document.getElementById(`autocomplete-${idx}`);

                log('📝 Processing input - idx:', idx, 'value:', value, 'list:', autocompleteList);

                tempCropAreas[idx].name = e.target.value;
                tempCropAreas[idx].code = '';

                if (value.length > 0 && typeof CROP_DATA !== 'undefined') {
                    const matches = CROP_DATA.filter(crop =>
                        crop.name.toLowerCase().includes(value)
                    ).slice(0, 10);

                    log('🔍 Found', matches.length, 'matches');

                    if (matches.length > 0) {
                        autocompleteList.innerHTML = sanitizeHTML(matches.map(crop => `
                            <li data-code="${crop.code}" data-name="${crop.name}">${crop.name} (${crop.category})</li>
                        `).join(''));

                        const rect = e.target.getBoundingClientRect();
                        autocompleteList.style.top = `${rect.bottom + 2}px`;
                        autocompleteList.style.left = `${rect.left}px`;
                        autocompleteList.style.width = `${rect.width}px`;

                        autocompleteList.classList.add('show');
                        log('✅ Autocomplete shown');
                    } else {
                        autocompleteList.classList.remove('show');
                    }
                } else {
                    autocompleteList.classList.remove('show');
                }
            });

            // blur 이벤트
            input.addEventListener('blur', () => {
                setTimeout(() => {
                    const idx = parseInt(input.dataset.index, 10);
                    const autocompleteList = document.getElementById(`autocomplete-${idx}`);
                    if (autocompleteList) {
                        autocompleteList.classList.remove('show');
                    }
                }, 200);
            });
        });

        // 자동완성 항목 클릭
        const autocompleteLists = cropAreaList.querySelectorAll('.crop-autocomplete-list');
        log('🔍 Found', autocompleteLists.length, 'autocomplete lists');

        autocompleteLists.forEach(list => {
            list.addEventListener('click', (e) => {
                if (e.target.tagName === 'LI') {
                    log('🎯 Autocomplete item clicked');

                    const idx = parseInt(list.id.replace('autocomplete-', ''));
                    const name = e.target.dataset.name;
                    const code = e.target.dataset.code;

                    tempCropAreas[idx].name = name;
                    tempCropAreas[idx].code = code;

                    const input = cropAreaList.querySelector(`.crop-search-input[data-index="${idx}"]`);
                    input.value = name;
                    list.classList.remove('show');

                    const areaInput = cropAreaList.querySelector(`.area-input[data-index="${idx}"]`);
                    if (areaInput) areaInput.focus();

                    log('✅ Crop selected:', name);
                }
            });
        });

        // 면적 입력 이벤트
        cropAreaList.querySelectorAll('.area-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                tempCropAreas[idx].area = e.target.value;
            });
        });

        // 면적 단위 변환 이벤트 (단위만 변경, 값은 그대로 유지)
        cropAreaList.querySelectorAll('.area-unit-modal-select').forEach((select, idx) => {
            select.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index, 10);
                const newUnit = e.target.value;

                // tempCropAreas 단위 업데이트 (값은 변환하지 않음)
                tempCropAreas[index].unit = newUnit;
            });
        });

        // 지번 선택 이벤트
        cropAreaList.querySelectorAll('.sublot-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                tempCropAreas[idx].subLotTarget = e.target.value;
            });
        });

        // 행 삭제 버튼
        cropAreaList.querySelectorAll('.btn-remove-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                if (tempCropAreas.length > 1) {
                    tempCropAreas.splice(idx, 1);
                    renderCropAreaModal();
                }
            });
        });

        // 모달 내 단위 토글 버튼
        cropAreaList.querySelectorAll('.area-unit-modal-toggle .unit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toggle = e.target.closest('.area-unit-modal-toggle');
                const value = e.target.dataset.value;

                // 모든 버튼에서 active 제거 후 클릭된 버튼에 추가
                toggle.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // data-unit 속성 업데이트
                toggle.dataset.unit = value;
            });
        });

        log('✅ All event bindings complete');
    }

    // ========================================
    // 하위 지번 작물 추가 모달
    // ========================================
    let currentSubLotParcelId = null;
    let currentSubLotIndex = null;

    function openSubLotCropModal(parcelId, subLotIndex) {
        log('🎯 openSubLotCropModal called with parcelId:', parcelId, 'subLotIndex:', subLotIndex);
        currentSubLotParcelId = parcelId;
        currentSubLotIndex = subLotIndex;

        const parcel = parcels.find(p => p.id === parcelId);
        const subLot = parcel.subLots[subLotIndex];
        log('📦 Sub-lot found:', subLot);

        // 기존 작물 데이터 로드
        tempCropAreas = subLot.crops && subLot.crops.length > 0
            ? subLot.crops.map(c => ({ ...c }))
            : [{ name: '', area: '', code: '' }];
        log('🌾 tempCropAreas for sublot:', tempCropAreas);

        renderCropAreaModal();
        cropAreaModal.classList.remove('hidden');
        log('✅ Sublot modal shown, classList:', cropAreaModal.classList.toString());
    }

    // 작물 확인 버튼 - 통합 핸들러
    log('🎯 Binding confirmCropAreaBtn click handler:', confirmCropAreaBtn);
    confirmCropAreaBtn.addEventListener('click', () => {
        log('✅ Confirm button clicked!');
        log('tempCropAreas:', tempCropAreas);
        log('currentParcelIdForCrop:', currentParcelIdForCrop);
        log('currentSubLotParcelId:', currentSubLotParcelId);
        log('currentSubLotIndex:', currentSubLotIndex);

        // 유효한 작물만 저장 (이름과 면적이 모두 있는 것)
        // 단위 정보도 함께 저장 (변환 없이 원본 값 유지)
        const validCrops = tempCropAreas.filter(c => c.name.trim() && c.area).map((crop, idx) => {
            const unitToggle = document.getElementById(`area-unit-modal-${idx}`);
            const unit = unitToggle ? unitToggle.dataset.unit : 'm2';

            return {
                ...crop,
                unit: unit
            };
        });

        // 하위 지번 작물 추가 모드
        if (currentSubLotParcelId && currentSubLotIndex !== null) {
            const parcel = parcels.find(p => p.id === currentSubLotParcelId);
            if (parcel.subLots[currentSubLotIndex]) {
                // 기존 문자열 형식이면 객체로 변환
                if (typeof parcel.subLots[currentSubLotIndex] === 'string') {
                    const lotAddress = parcel.subLots[currentSubLotIndex];
                    parcel.subLots[currentSubLotIndex] = {
                        lotAddress: lotAddress,
                        crops: []
                    };
                }
                parcel.subLots[currentSubLotIndex].crops = validCrops;
            }

            updateSubLotsDisplay(currentSubLotParcelId);
            updateParcelSummary(currentSubLotParcelId);
            updateParcelsData();

            currentSubLotParcelId = null;
            currentSubLotIndex = null;
        }
        // 메인 필지 작물 추가 모드
        else {
            const parcel = parcels.find(p => p.id === currentParcelIdForCrop);
            const receptionNumber = getReceptionNumber();

            // 모달에서 관리하는 작물 목록으로 교체 (중복 방지)
            parcel.crops = validCrops;

            log('📋 작물 저장 완료:', parcel.crops);

            updateCropsAreaDisplay(currentParcelIdForCrop);
            updateParcelSummary(currentParcelIdForCrop);
            updateParcelsData();
        }

        closeCropAreaModalFn();
    });

    // ========================================
    // 폼 제출 핸들러
    // ========================================
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 필지 데이터 검증
        const validParcels = parcels.filter(p => p.lotAddress.trim());
        if (validParcels.length === 0) {
            showToast('최소 1개의 필지 주소를 입력해주세요.', 'warning');
            return;
        }

        const formData = new FormData(form);

        // 수정 모드인 경우
        if (editingLogId) {
            const logIndex = sampleLogs.findIndex(l => l.id === editingLogId);
            if (logIndex === -1) {
                showToast('수정할 데이터를 찾을 수 없습니다.', 'error');
                return;
            }

            const existingLog = sampleLogs[logIndex];
            // 첫 번째 필지의 구분이 있으면 해당 값 사용
            const firstParcelCategory = validParcels[0]?.category;
            const mainSubCategory = formData.get('subCategory') || '-';
            const effectiveSubCategory = firstParcelCategory || mainSubCategory;

            const updatedLog = {
                ...existingLog,
                receptionNumber: formData.get('receptionNumber'),
                date: formData.get('date'),
                name: formData.get('name'),
                phoneNumber: formData.get('phoneNumber'),
                address: formData.get('address'),
                subCategory: effectiveSubCategory,
                purpose: formData.get('purpose'),
                receptionMethod: formData.get('receptionMethod') || '-',
                note: formData.get('note') || '',
                parcels: validParcels.map(p => ({
                    id: p.id || crypto.randomUUID(),
                    lotAddress: p.lotAddress,
                    isMountain: p.isMountain || false,
                    subLots: [...p.subLots],
                    crops: p.crops.map(c => ({ ...c })),
                    category: p.category || '', // 필지별 구분 저장
                    note: p.note || '' // 필지별 비고 저장
                })),
                updatedAt: new Date().toISOString()
            };

            // 호환성을 위한 기존 필드 (첫 번째 필지 기준)
            if (validParcels.length > 0) {
                const firstParcel = validParcels[0];
                updatedLog.lotAddress = firstParcel.lotAddress;
                updatedLog.area = firstParcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString();
                updatedLog.cropsDisplay = firstParcel.crops.map(c => c.name).join(', ') || '-';
            }

            sampleLogs[logIndex] = updatedLog;
            saveLogs();
            renderLogs(sampleLogs);

            // 수정 모드 해제
            cancelEditMode();

            showToast('수정이 완료되었습니다.', 'success');
            switchView('list');
            return;
        }

        // 신규 등록 모드 - 각 필지마다 별도의 접수번호 부여
        const baseReceptionNumber = formData.get('receptionNumber');

        // 접수번호 중복 검증 (localStorage에서 최신 데이터 확인)
        const isFillNumber = baseReceptionNumber.startsWith('F');
        const baseNumber = isFillNumber
            ? parseInt(baseReceptionNumber.replace('F', ''), 10) || 1
            : parseInt(baseReceptionNumber, 10) || 1;

        const numbersToCheck = validParcels.map((_, index) => {
            const num = baseNumber + index;
            return isFillNumber ? `F${num}` : String(num);
        });

        // localStorage에서 최신 데이터 다시 로드하여 중복 확인
        const yearStorageKey = getStorageKey(selectedYear);
        const latestLogs = SampleUtils.safeParseJSON(yearStorageKey, []);

        // 중복되는 접수번호 찾기
        const duplicateNumbers = numbersToCheck.filter(numToCheck => {
            return latestLogs.some(log => {
                const logBaseNumber = (log.receptionNumber || '').split('-')[0];
                return logBaseNumber === numToCheck;
            });
        });

        if (duplicateNumbers.length > 0) {
            // 메모리의 sampleLogs도 최신 상태로 동기화
            sampleLogs = latestLogs;
            renderLogs(sampleLogs);

            // 다음 사용 가능한 번호 찾기
            const nextAvailable = isFillNumber
                ? generateNextFillReceptionNumber()
                : generateNextReceptionNumber();
            receptionNumberInput.value = nextAvailable;

            showToast(`접수번호 ${duplicateNumbers.join(', ')}이(가) 이미 존재합니다. ${nextAvailable}번으로 변경되었습니다.`, 'warning');
            return;
        }

        const commonData = {
            date: formData.get('date'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            subCategory: formData.get('subCategory') || '-',
            purpose: formData.get('purpose'),
            receptionMethod: formData.get('receptionMethod') || '-',
            note: formData.get('note') || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 그룹 ID 생성 (같은 접수건 그룹화용)
        const groupId = crypto.randomUUID();

        // 각 필지별로 별도 레코드 생성 (각 필지는 독립적인 접수번호)
        // baseNumber, isFillNumber는 위에서 중복 검증 시 이미 계산됨
        const newLogs = validParcels.map((parcel, index) => {
            // 각 필지는 순차적인 접수번호 (1, 2, 3... 또는 F1, F2, F3...)
            const num = baseNumber + index;
            const receptionNumber = isFillNumber ? `F${num}` : String(num);

            // 필지별 구분이 있으면 필지별 구분 사용, 없으면 메인 구분 사용
            const parcelSubCategory = parcel.category || commonData.subCategory;

            return {
                id: crypto.randomUUID(),
                receptionNumber,
                ...commonData,
                subCategory: parcelSubCategory, // 필지별 구분 우선 적용
                groupId, // 같은 접수건임을 표시
                parcelIndex: index + 1,
                totalParcels: validParcels.length,
                parcels: [{
                    id: crypto.randomUUID(),
                    lotAddress: parcel.lotAddress,
                    isMountain: parcel.isMountain || false, // 산 여부
                    subLots: [...parcel.subLots],
                    crops: parcel.crops.map(c => ({ ...c })),
                    category: parcel.category || '', // 필지별 구분 저장
                    note: parcel.note || '' // 필지별 비고 저장
                }],
                // 호환성을 위한 기존 필드
                lotAddress: parcel.lotAddress,
                area: parcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0).toString(),
                cropsDisplay: parcel.crops.map(c => c.name).join(', ') || '-'
            };
        });

        // 모든 레코드 저장 (순서대로 뒤에 추가)
        newLogs.forEach(log => sampleLogs.push(log));
        saveLogs();
        renderLogs(sampleLogs);
        form.reset();
        dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        addressPostcode.value = '';
        addressRoad.value = '';
        addressDetail.value = '';
        addressHidden.value = '';

        // 필지 초기화
        parcels = [];
        parcelIdCounter = 0;
        parcelsContainer.innerHTML = '';
        addParcel();

        // 다음 접수번호 자동 생성
        receptionNumberInput.value = generateNextReceptionNumber();

        const parcelCount = newLogs.length;
        showToast(`${parcelCount}건의 시료가 접수되었습니다.`, 'success');

        // 등록 결과 모달 표시 (첫 번째 레코드 기준, 전체 필지 정보 포함)
        const resultData = {
            ...newLogs[newLogs.length - 1], // 첫 번째 접수번호 기준
            parcels: validParcels.map(p => ({
                lotAddress: p.lotAddress,
                isMountain: p.isMountain || false,
                subLots: [...p.subLots],
                crops: p.crops.map(c => ({ ...c }))
            })),
            totalRegistered: parcelCount
        };
        showRegistrationResult(resultData);

        switchView('list');
    });

    // 검색 모달 핸들러
    const listSearchModal = document.getElementById('listSearchModal');
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

    // 현재 검색 필터 상태
    let currentSearchFilter = {
        dateFrom: '',
        dateTo: '',
        name: '',
        receptionFrom: '',
        receptionTo: '',
        lot: '',
        purpose: '',
        completed: ''
    };

    // 목적(용도) 필터 드롭다운
    const purposeFilter = document.getElementById('purposeFilter');
    if (purposeFilter) {
        purposeFilter.addEventListener('change', (e) => {
            currentSearchFilter.purpose = e.target.value;
            filterAndRenderLogs();
        });
    }

    // 완료 상태 필터 드롭다운
    const completedFilter = document.getElementById('completedFilter');
    if (completedFilter) {
        completedFilter.addEventListener('change', (e) => {
            currentSearchFilter.completed = e.target.value;
            filterAndRenderLogs();
        });
    }

    // 접수번호에서 숫자 부분 추출 (예: "토양-2025-001" → 1)
    function extractReceptionNumber(receptionNumber) {
        const match = receptionNumber.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    }

    function filterAndRenderLogs() {
        const filteredLogs = sampleLogs.filter(log => {
            // 성명 검색
            const matchesName = !currentSearchFilter.name ||
                log.name.toLowerCase().includes(currentSearchFilter.name);

            // 접수번호 범위 검색
            let matchesReception = true;
            if (currentSearchFilter.receptionFrom || currentSearchFilter.receptionTo) {
                const logNum = extractReceptionNumber(log.receptionNumber);
                const fromNum = currentSearchFilter.receptionFrom ? parseInt(currentSearchFilter.receptionFrom, 10) : 0;
                const toNum = currentSearchFilter.receptionTo ? parseInt(currentSearchFilter.receptionTo, 10) : Infinity;

                if (fromNum && logNum < fromNum) {
                    matchesReception = false;
                }
                if (toNum !== Infinity && logNum > toNum) {
                    matchesReception = false;
                }
            }

            // 날짜 범위 검색
            let matchesDate = true;
            if (currentSearchFilter.dateFrom || currentSearchFilter.dateTo) {
                const logDate = log.date; // YYYY-MM-DD 형식
                if (currentSearchFilter.dateFrom && logDate < currentSearchFilter.dateFrom) {
                    matchesDate = false;
                }
                if (currentSearchFilter.dateTo && logDate > currentSearchFilter.dateTo) {
                    matchesDate = false;
                }
            }

            // 지번 검색 (parcels 배열의 lotAddress + subLots 조합 검색)
            // lotAddress에는 "리+지번" 형태로 저장됨 (예: "문단리 123")
            // subLots에는 하위 지번들이 저장됨 (예: "123-1", "123-2" 또는 객체 형태)
            let matchesLot = true;
            if (currentSearchFilter.lot) {
                matchesLot = false;
                // 검색어 전체를 소문자로 변환
                const searchQuery = currentSearchFilter.lot.trim().toLowerCase();
                // 검색어를 공백으로 분리 (예: "문단리 123" → ["문단리", "123"])
                const searchTerms = searchQuery.split(/\s+/).filter(t => t);

                // subLot에서 지번 값 추출하는 헬퍼 함수
                const getSubLotAddress = (subLot) => {
                    if (typeof subLot === 'string') return subLot.toLowerCase();
                    if (subLot && typeof subLot === 'object' && subLot.lotAddress) {
                        return subLot.lotAddress.toLowerCase();
                    }
                    return '';
                };

                if (log.parcels && log.parcels.length > 0) {
                    matchesLot = log.parcels.some(parcel => {
                        const lotAddrLower = parcel.lotAddress ? parcel.lotAddress.toLowerCase() : '';

                        // 방법 1: 전체 검색어가 lotAddress에 포함되는지 확인
                        // 예: "문단리 123" 검색 → lotAddress "문단리 123"에 포함됨
                        if (lotAddrLower.includes(searchQuery)) {
                            return true;
                        }

                        // 방법 2: 모든 검색어가 lotAddress에 포함되는지 확인
                        // 예: "문단리 123" → lotAddress에 "문단리"와 "123"이 모두 포함
                        if (searchTerms.every(term => lotAddrLower.includes(term))) {
                            return true;
                        }

                        // 방법 3: 검색어가 하나만 있는 경우 subLots에서도 검색
                        if (searchTerms.length === 1) {
                            const term = searchTerms[0];
                            // subLots 검색
                            if (parcel.subLots && parcel.subLots.length > 0) {
                                if (parcel.subLots.some(subLot => {
                                    const addr = getSubLotAddress(subLot);
                                    return addr && addr.includes(term);
                                })) {
                                    return true;
                                }
                            }
                        }

                        // 방법 4: 리 + 지번 조합 검색 (lotAddress에 리, subLots에 지번)
                        // 예: lotAddress "문단리", subLots ["123", "124"]
                        if (searchTerms.length >= 2) {
                            const riTerm = searchTerms[0];
                            const lotTerms = searchTerms.slice(1);

                            // lotAddress에 리 이름이 포함되어야 함
                            const matchesRi = lotAddrLower.includes(riTerm);

                            if (matchesRi && parcel.subLots && parcel.subLots.length > 0) {
                                // subLots에서 지번 검색
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

            // 목적(용도) 필터
            const matchesPurpose = !currentSearchFilter.purpose ||
                (log.purpose || '') === currentSearchFilter.purpose;

            // 완료 상태 필터
            let matchesCompleted = true;
            if (currentSearchFilter.completed === 'completed') {
                matchesCompleted = log.completed === true;
            } else if (currentSearchFilter.completed === 'incomplete') {
                matchesCompleted = !log.completed;
            }

            return matchesName && matchesReception && matchesDate && matchesLot && matchesPurpose && matchesCompleted;
        });

        renderLogs(filteredLogs);
        updateSearchButtonState();
    }

    function updateSearchButtonState() {
        const hasFilter = currentSearchFilter.dateFrom || currentSearchFilter.dateTo ||
            currentSearchFilter.name || currentSearchFilter.receptionFrom ||
            currentSearchFilter.receptionTo || currentSearchFilter.lot || currentSearchFilter.purpose ||
            currentSearchFilter.completed;
        if (hasFilter) {
            openSearchModalBtn.classList.add('has-filter');
            openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색 중');
        } else {
            openSearchModalBtn.classList.remove('has-filter');
            openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색');
        }
        // 목적 필터 드롭다운에 활성 상태 표시
        if (purposeFilter) {
            if (currentSearchFilter.purpose) {
                purposeFilter.classList.add('has-filter');
            } else {
                purposeFilter.classList.remove('has-filter');
            }
        }
    }

    // 모달 열기
    openSearchModalBtn.addEventListener('click', () => {
        searchDateFromInput.value = currentSearchFilter.dateFrom;
        searchDateToInput.value = currentSearchFilter.dateTo;
        searchNameInput.value = currentSearchFilter.name;
        searchReceptionFromInput.value = currentSearchFilter.receptionFrom;
        searchReceptionToInput.value = currentSearchFilter.receptionTo;
        searchLotInput.value = currentSearchFilter.lot;
        listSearchModal.classList.remove('hidden');
        searchNameInput.focus();
    });

    // 모달 닫기
    function closeSearchModal() {
        listSearchModal.classList.add('hidden');
    }

    closeSearchModalBtn.addEventListener('click', closeSearchModal);
    listSearchModal.querySelector('.modal-overlay').addEventListener('click', closeSearchModal);

    // 날짜 초기화
    clearSearchDateBtn.addEventListener('click', () => {
        searchDateFromInput.value = '';
        searchDateToInput.value = '';
    });

    // 접수번호 초기화
    if (clearSearchReceptionBtn) {
        clearSearchReceptionBtn.addEventListener('click', () => {
            searchReceptionFromInput.value = '';
            searchReceptionToInput.value = '';
        });
    }

    // 지번 초기화
    if (clearSearchLotBtn) {
        clearSearchLotBtn.addEventListener('click', () => {
            searchLotInput.value = '';
        });
    }

    // 전체 초기화
    resetSearchBtn.addEventListener('click', () => {
        searchDateFromInput.value = '';
        searchDateToInput.value = '';
        searchNameInput.value = '';
        searchReceptionFromInput.value = '';
        searchReceptionToInput.value = '';
        searchLotInput.value = '';
        if (purposeFilter) purposeFilter.value = '';
        if (completedFilter) completedFilter.value = '';
        currentSearchFilter = { dateFrom: '', dateTo: '', name: '', receptionFrom: '', receptionTo: '', lot: '', purpose: '', completed: '' };
        filterAndRenderLogs();
        closeSearchModal();
    });

    // 검색 적용
    applySearchBtn.addEventListener('click', () => {
        currentSearchFilter.dateFrom = searchDateFromInput.value;
        currentSearchFilter.dateTo = searchDateToInput.value;
        currentSearchFilter.name = searchNameInput.value.toLowerCase();
        currentSearchFilter.receptionFrom = searchReceptionFromInput.value;
        currentSearchFilter.receptionTo = searchReceptionToInput.value;
        currentSearchFilter.lot = searchLotInput.value.toLowerCase();
        filterAndRenderLogs();
        closeSearchModal();
    });

    // Enter 키로 검색
    const searchInputs = [searchNameInput, searchReceptionFromInput, searchReceptionToInput, searchLotInput];
    searchInputs.forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    applySearchBtn.click();
                }
            });
        }
    });

    // ========================================
    // 수정 모드 관리
    // ========================================
    let editingLogId = null; // 현재 수정 중인 로그 ID

    // 수정 모드 취소 함수
    function cancelEditMode() {
        editingLogId = null;

        // 네비게이션 바 버튼 원래대로 복원
        const navSubmitBtn = document.getElementById('navSubmitBtn');
        if (navSubmitBtn) {
            navSubmitBtn.title = '접수 등록';
            navSubmitBtn.classList.remove('btn-edit-mode');
        }

        // 폼 초기화
        form.reset();
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
        dateInput.valueAsDate = new Date();

        // 주소 필드 초기화
        addressPostcode.value = '';
        addressRoad.value = '';
        addressDetail.value = '';
        addressHidden.value = '';

        // 필지 초기화
        parcels = [];
        parcelIdCounter = 0;
        parcelsContainer.innerHTML = '';
        addParcel();

        // 다음 접수번호 자동 생성
        receptionNumberInput.value = generateNextReceptionNumber();
    }

    // 수정할 데이터를 폼에 채우기
    function populateFormForEdit(log) {
        editingLogId = log.id;

        // 기본 필드 채우기
        receptionNumberInput.value = log.receptionNumber || '';
        dateInput.value = log.date || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';

        // 주소 필드 처리
        if (log.address) {
            // 주소 파싱 시도: "(우편번호) 도로명주소 상세주소" 형식
            const addressMatch = log.address.match(/^\((\d{5})\)\s*(.+)$/);
            if (addressMatch) {
                addressPostcode.value = addressMatch[1];
                const roadAndDetail = addressMatch[2];
                // 상세주소 분리 시도 (괄호 뒤의 내용을 상세주소로)
                const detailMatch = roadAndDetail.match(/^(.+?\))\s*(.*)$/);
                if (detailMatch) {
                    addressRoad.value = detailMatch[1];
                    addressDetail.value = detailMatch[2];
                } else {
                    addressRoad.value = roadAndDetail;
                    addressDetail.value = '';
                }
            } else {
                addressRoad.value = log.address;
            }
            addressHidden.value = log.address;
        }

        // 구분 (하위 카테고리) 선택
        const subCategorySelect = document.getElementById('subCategory');
        if (subCategorySelect) {
            // 수정 모드에서 활성화하고 옵션 설정
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

        // 목적 선택
        if (purposeSelect) {
            purposeSelect.value = log.purpose || '';
        }

        // 수령 방법 선택
        const receptionMethodBtns = document.querySelectorAll('.reception-method-btn');
        receptionMethodBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.method === log.receptionMethod) {
                btn.classList.add('active');
            }
        });
        const receptionMethodInput = document.getElementById('receptionMethod');
        if (receptionMethodInput) {
            receptionMethodInput.value = log.receptionMethod || '';
        }

        // 비고 필드 채우기
        const noteInput = document.getElementById('note');
        if (noteInput) {
            noteInput.value = log.note || '';
        }

        // 필지 데이터 채우기
        parcels = [];
        parcelIdCounter = 0;
        parcelsContainer.innerHTML = '';

        if (log.parcels && log.parcels.length > 0) {
            log.parcels.forEach(parcel => {
                const parcelId = `parcel-${parcelIdCounter++}`;
                const newParcel = {
                    id: parcelId,
                    lotAddress: parcel.lotAddress || '',
                    isMountain: parcel.isMountain || false,
                    subLots: parcel.subLots ? [...parcel.subLots] : [],
                    crops: parcel.crops ? parcel.crops.map(c => ({ ...c })) : [],
                    category: parcel.category || '', // 필지별 구분 불러오기
                    note: parcel.note || '' // 필지별 비고 불러오기
                };
                parcels.push(newParcel);
                renderParcelCard(newParcel, parcels.length);
            });
        } else {
            // 기존 데이터 호환 (parcels 배열이 없는 경우)
            addParcel();
            if (log.lotAddress) {
                parcels[0].lotAddress = log.lotAddress;
                const lotInput = document.querySelector(`.lot-address-input[data-id="${parcels[0].id}"]`);
                if (lotInput) lotInput.value = log.lotAddress;
            }
        }

        updateParcelsData();

        // 네비게이션 바 버튼 텍스트/스타일 변경
        const navSubmitBtn = document.getElementById('navSubmitBtn');
        if (navSubmitBtn) {
            navSubmitBtn.title = '수정 완료';
            navSubmitBtn.classList.add('btn-edit-mode');
        }

        // 시료 접수 화면으로 전환
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('formView').classList.add('active');

        // 네비게이션 버튼 활성화 상태 변경
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-btn[data-view="form"]').classList.add('active');

        // 폼 상단으로 스크롤
        setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // 삭제 및 수정 핸들러 (이벤트 위임 - closest로 버튼 찾기)
    tableBody.addEventListener('click', (e) => {
        // 완료 버튼
        const completeBtn = e.target.closest('.btn-complete');
        if (completeBtn) {
            const id = completeBtn.dataset.id;
            const log = sampleLogs.find(l => String(l.id) === id);
            if (log) {
                // 완료 상태 토글
                const newCompletedStatus = !log.completed;

                // 접수번호에서 기본 번호 추출 (예: "2025-001-1" -> "2025-001")
                const receptionNumber = log.receptionNumber || '';
                const baseNumber = receptionNumber.split('-').slice(0, 2).join('-');

                // 같은 기본 번호를 가진 모든 시료 찾기 (하위 필지 포함)
                const relatedLogs = sampleLogs.filter(l => {
                    const logBaseNumber = (l.receptionNumber || '').split('-').slice(0, 2).join('-');
                    return logBaseNumber === baseNumber && baseNumber !== '';
                });

                // 모든 관련 시료의 완료 상태 업데이트
                relatedLogs.forEach(relatedLog => {
                    relatedLog.completed = newCompletedStatus;
                    relatedLog.updatedAt = new Date().toISOString();

                    // 각 행의 UI 업데이트 (동일한 ID를 가진 모든 행을 찾아야 함)
                    const relatedRows = tableBody.querySelectorAll(`tr[data-id="${relatedLog.id}"]`);

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

                saveLogs();

                // 토스트 메시지 (그룹 개수 표시)
                const count = relatedLogs.length;
                if (newCompletedStatus) {
                    showToast(count > 1 ? `${count}개 시료가 완료 처리되었습니다` : '완료 처리되었습니다', 'success');
                } else {
                    showToast(count > 1 ? `${count}개 시료가 완료 취소되었습니다` : '완료 취소되었습니다', 'success');
                }
            }
        }

        // 삭제 버튼 (closest로 버튼 찾기 - Electron 호환성)
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm('정말 삭제하시겠습니까?')) {
                sampleLogs = sampleLogs.filter(log => log.id !== id);
                saveLogs();
                renderLogs(sampleLogs);

                // Firebase에서도 삭제
                if (window.firestoreDb?.isEnabled()) {
                    window.firestoreDb.delete('soil', parseInt(selectedYear), id)
                        .then(() => log('☁️ Firebase 삭제 완료:', id))
                        .catch(err => window.logger.error('Firebase 삭제 실패:', err));
                }

                // 삭제한 항목이 수정 중이던 항목이면 수정 모드 취소
                if (editingLogId === id) {
                    cancelEditMode();
                }
            }
        }

        // 수정 버튼 (closest로 버튼 찾기 - Electron 호환성)
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const logItem = sampleLogs.find(l => String(l.id) === id);
            if (logItem) {
                populateFormForEdit(logItem);
            }
        }
    });

    // ========================================
    // 체크박스 선택 기능
    // ========================================
    const selectAllCheckbox = document.getElementById('selectAll');

    // 전체 선택 체크박스 이벤트
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            updateSelectedCount();
        });
    }

    // 개별 체크박스 이벤트 (이벤트 위임)
    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            updateSelectAllState();
            updateSelectedCount();
        }
    });

    // 전체 선택 체크박스 상태 업데이트
    function updateSelectAllState() {
        const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');

        if (selectAllCheckbox) {
            if (rowCheckboxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedBoxes.length === rowCheckboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            }
        }
    }

    // 선택된 항목 수 업데이트
    function updateSelectedCount() {
        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
        const count = checkedBoxes.length;
        // 선택 개수는 필요시 UI에 표시 가능
        log(`${count}개 항목 선택됨`);
    }

    // 선택된 항목 ID 가져오기
    function getSelectedIds() {
        const checkedBoxes = tableBody.querySelectorAll('.row-checkbox:checked');
        return Array.from(checkedBoxes).map(cb => cb.dataset.id);
    }

    // 전역에서 사용 가능하도록 window에 등록
    window.getSelectedIds = getSelectedIds;

    // ========================================
    // 전체 보기/기본 보기 토글 기능
    // ========================================
    const viewToggleBtn = document.getElementById('viewToggleBtn');
    const logTable = document.getElementById('logTable');
    let isFullView = false;

    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isFullView = !isFullView;

            const toggleText = viewToggleBtn.querySelector('.toggle-text');
            const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');

            if (isFullView) {
                // 전체 보기 모드 - 숨겨진 컬럼 표시
                logTable.classList.add('full-view');
                toggleText.textContent = '기본 보기';
                toggleIcon.textContent = '👁️‍🗨️';
                viewToggleBtn.classList.add('active');
            } else {
                // 기본 보기 모드 - 숨겨진 컬럼 숨김
                logTable.classList.remove('full-view');
                toggleText.textContent = '전체 보기';
                toggleIcon.textContent = '👁️';
                viewToggleBtn.classList.remove('active');
            }
        });
    }

    // ========================================
    // 라벨 인쇄 기능
    // ========================================
    const btnLabelPrint = document.getElementById('btnLabelPrint');

    if (btnLabelPrint) {
        btnLabelPrint.addEventListener('click', () => {
            const selectedIds = getSelectedIds();

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
            // 주소에서 우편번호 분리
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

    // ========================================
    // 선택 삭제 기능
    // ========================================
    const btnBulkDelete = document.getElementById('btnBulkDelete');

    if (btnBulkDelete) {
        btnBulkDelete.addEventListener('click', () => {
            const selectedIds = getSelectedIds();

            if (selectedIds.length === 0) {
                alert('삭제할 항목을 선택해주세요.');
                return;
            }

            if (!confirm(`선택한 ${selectedIds.length}건을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) {
                return;
            }

            // 선택된 항목 삭제
            sampleLogs = sampleLogs.filter(log => !selectedIds.includes(String(log.id)));
            saveLogs();
            renderLogs(sampleLogs);

            // Firebase에서도 삭제
            if (window.firestoreDb?.isEnabled()) {
                Promise.all(selectedIds.map(id =>
                    window.firestoreDb.delete('soil', parseInt(selectedYear), id)
                ))
                    .then(() => log('☁️ Firebase 일괄 삭제 완료:', selectedIds.length, '건'))
                    .catch(err => window.logger.error('Firebase 일괄 삭제 실패:', err));
            }

            // 전체 선택 체크박스 해제
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }

            // 삭제한 항목이 수정 중이던 항목이면 수정 모드 취소
            if (selectedIds.includes(editingLogId)) {
                cancelEditMode();
            }

            showToast(`${selectedIds.length}건이 삭제되었습니다.`, 'success');
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

            // 전체 선택 체크박스 해제
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }

            closeMailDateModalFn();
            showToast(`${updatedCount}건의 발송일자가 입력되었습니다.`, 'success');
        });
    }

    if (btnBulkMailDate) {
        btnBulkMailDate.addEventListener('click', () => {
            const selectedIds = getSelectedIds();

            if (selectedIds.length === 0) {
                showToast('발송일자를 입력할 항목을 선택해주세요.', 'warning');
                return;
            }

            openMailDateModal(selectedIds);
        });
    }

    // ========================================
    // 통계 기능
    // ========================================
    const btnStatistics = document.getElementById('btnStatistics');
    const statisticsModal = document.getElementById('statisticsModal');
    const closeStatisticsModal = document.getElementById('closeStatisticsModal');
    const closeStatisticsBtn = document.getElementById('closeStatisticsBtn');

    if (btnStatistics) {
        btnStatistics.addEventListener('click', () => {
            openStatisticsModal();
        });
    }

    if (closeStatisticsModal) {
        closeStatisticsModal.addEventListener('click', () => {
            statisticsModal.classList.add('hidden');
        });
    }

    if (closeStatisticsBtn) {
        closeStatisticsBtn.addEventListener('click', () => {
            statisticsModal.classList.add('hidden');
        });
    }

    // 통계 모달 외부 클릭 시 닫기
    if (statisticsModal) {
        statisticsModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                statisticsModal.classList.add('hidden');
            }
        });
    }

    function openStatisticsModal() {
        if (!statisticsModal) return;

        // 통계 데이터 계산
        const stats = calculateStatistics();

        // 요약 카드 업데이트
        document.getElementById('statTotalCount').textContent = stats.total;
        document.getElementById('statCompletedCount').textContent = stats.completed;
        document.getElementById('statPendingCount').textContent = stats.pending;

        // 차트 렌더링
        renderBarChart('statsByCategory', stats.bySubCategory, 'category');
        renderBarChart('statsByPurpose', stats.byPurpose, 'purpose');
        renderMonthlyChart('statsByMonth', stats.byMonth);
        renderQuarterlySummary('statsQuarterly', stats.byQuarter);
        renderBarChart('statsByReceptionMethod', stats.byReceptionMethod, 'method');

        // 모달 표시
        statisticsModal.classList.remove('hidden');
    }

    function calculateStatistics() {
        const total = sampleLogs.length;
        const completed = sampleLogs.filter(log => log.isCompleted).length;
        const pending = total - completed;

        // 구분별 집계 (논/밭/과수/시설/임야/성토)
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

        sampleLogs.forEach(log => {
            const category = log.subCategory || '기타';
            if (!bySubCategory[category]) {
                bySubCategory[category] = { count: 0, ...categoryMapping[category] || categoryMapping['기타'] };
            }
            bySubCategory[category].count++;
        });

        // 목적(용도)별 집계
        const byPurpose = {};
        const purposeMapping = {
            '일반재배': { label: '🌾 일반재배', class: 'purpose-general' },
            '유기': { label: '♻️ 유기', class: 'purpose-organic' },
            '무농약': { label: '🍃 무농약', class: 'purpose-nopesticide' },
            'GAP': { label: '✅ GAP', class: 'purpose-gap' },
            '저탄소': { label: '🌱 저탄소', class: 'purpose-lowcarbon' }
        };

        sampleLogs.forEach(log => {
            const purpose = log.purpose || '기타';
            if (!byPurpose[purpose]) {
                byPurpose[purpose] = { count: 0, ...purposeMapping[purpose] || { label: purpose, class: 'purpose-general' } };
            }
            byPurpose[purpose].count++;
        });

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
                label: monthNames[i - 1],
                class: 'month'
            };
        }

        // 데이터 집계
        sampleLogs.forEach(log => {
            if (log.date) {
                const monthNum = log.date.substring(5, 7); // MM
                if (byMonth[monthNum]) {
                    byMonth[monthNum].count++;
                    if (log.isCompleted) {
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

        // 수령 방법별 집계
        const byReceptionMethod = {};
        const methodMapping = {
            '우편': { label: '📮 우편', class: 'method-mail' },
            '이메일': { label: '📧 이메일', class: 'method-email' },
            '팩스': { label: '📠 팩스', class: 'method-fax' },
            '직접방문': { label: '🚶 직접방문', class: 'method-visit' }
        };

        sampleLogs.forEach(log => {
            const method = log.receptionMethod || '기타';
            if (!byReceptionMethod[method]) {
                byReceptionMethod[method] = { count: 0, ...methodMapping[method] || { label: method, class: 'method-mail' } };
            }
            byReceptionMethod[method].count++;
        });

        return {
            total,
            completed,
            pending,
            bySubCategory,
            byPurpose,
            byMonth,
            byQuarter,
            byReceptionMethod
        };
    }

    function renderBarChart(containerId, data, prefix) {
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
    // 기존 작물 검색 모달 기능 (기존 코드 호환)
    // ========================================
    const cropModal = document.getElementById('cropModal');
    const openCropModalBtn = document.getElementById('openCropModalBtn');
    const closeCropModalBtn = document.getElementById('closeCropModal');
    const cropSearchInput = document.getElementById('cropSearchInput');
    const cropCategoryFilter = document.getElementById('cropCategoryFilter');
    const cropList = document.getElementById('cropList');
    const cropResultCount = document.getElementById('cropResultCount');
    const selectedCropTags = document.getElementById('selectedCropTags');
    const selectedCropCount = document.getElementById('selectedCropCount');
    const confirmCropBtn = document.getElementById('confirmCropSelection');
    const cancelCropBtn = document.getElementById('cancelCropSelection');
    const clearCropBtn = document.getElementById('clearCropSelection');

    let tempSelectedCrops = [];
    let confirmedCrops = [];

    // 카테고리 필터 옵션 초기화
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

    // 기존 모달은 숨김 처리 (새 시스템 사용)
    if (openCropModalBtn) {
        openCropModalBtn.style.display = 'none';
    }

    function closeModal() {
        if (cropModal) {
            cropModal.classList.add('hidden');
        }
    }

    if (closeCropModalBtn) closeCropModalBtn.addEventListener('click', closeModal);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', closeModal);
    if (cropModal) cropModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // ========================================
    // 엑셀 내보내기 핸들러
    // ========================================

    // parseAddressParts는 ../shared/address-parser.js에서 전역으로 제공됨

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => {
        if (sampleLogs.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        // 필지별로 행을 펼쳐서 Excel 데이터 생성 (접수 목록과 동일한 방식)
        // 최신 데이터가 아래쪽에 표시되도록 역순 정렬
        const reversedLogs = [...sampleLogs].reverse();
        const excelData = [];

        reversedLogs.forEach(log => {
            // 주소 파싱 (시도, 시군구, 읍면동, 나머지주소 분리)
            const addressParts = parseAddressParts(log.address || '');
            // 전체 주소
            const fullAddress = log.address || '-';

            if (log.parcels && log.parcels.length > 0) {
                log.parcels.forEach((parcel, pIdx) => {
                    // 메인 필지의 작물 정보
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ')
                        : '-';
                    const totalArea = parcel.crops
                        ? parcel.crops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0)
                        : 0;

                    // 메인 필지 행 추가 (산 여부 표시)
                    const excelLotAddress = parcel.lotAddress
                        ? (parcel.isMountain ? `${parcel.lotAddress} (산)` : parcel.lotAddress)
                        : '-';
                    excelData.push({
                        '접수번호': log.receptionNumber,
                        '접수일자': log.date,
                        '구분': log.subCategory || '-',
                        '목적(용도)': log.purpose || '-',
                        '성명': log.name,
                        '전화번호': log.phoneNumber,
                        '시도': addressParts.sido || '-',
                        '시군구': addressParts.sigungu || '-',
                        '읍면동': addressParts.eupmyeondong || '-',
                        '나머지주소': addressParts.rest || '-',
                        '전체주소': fullAddress,
                        '필지 주소': excelLotAddress,
                        '작물': cropsDisplay,
                        '면적(m²)': totalArea > 0 ? totalArea : '-',
                        '수령 방법': log.receptionMethod || '-',
                        '비고': log.note || '-',
                        '완료여부': (log.isCompleted || log.completed) ? '완료' : '미완료',
                        '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                    });

                    // 하위 필지 데이터 추가 (접수 목록과 동일한 방식)
                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, sIdx) => {
                            const subLotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);

                            const subLotCropsDisplay = subLotCrops.length > 0
                                ? subLotCrops.map(c => c.name).join(', ')
                                : '-';
                            const subLotTotalArea = subLotCrops.length > 0
                                ? subLotCrops.reduce((sum, c) => sum + (parseFloat(c.area) || 0), 0)
                                : 0;

                            excelData.push({
                                '접수번호': `${log.receptionNumber}-${sIdx + 1}`,
                                '접수일자': log.date,
                                '구분': log.subCategory || '-',
                                '목적(용도)': log.purpose || '-',
                                '성명': log.name,
                                '전화번호': log.phoneNumber,
                                '시도': addressParts.sido || '-',
                                '시군구': addressParts.sigungu || '-',
                                '읍면동': addressParts.eupmyeondong || '-',
                                '나머지주소': addressParts.rest || '-',
                                '전체주소': fullAddress,
                                '필지 주소': subLotAddress,
                                '작물': subLotCropsDisplay,
                                '면적(m²)': subLotTotalArea > 0 ? subLotTotalArea : '-',
                                '수령 방법': log.receptionMethod || '-',
                                '비고': log.note || '-',
                                '완료여부': (log.isCompleted || log.completed) ? '완료' : '미완료',
                                '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                            });
                        });
                    }
                });
            } else {
                // 기존 데이터 호환
                excelData.push({
                    '접수번호': log.receptionNumber,
                    '접수일자': log.date,
                    '구분': log.subCategory || '-',
                    '목적(용도)': log.purpose || '-',
                    '성명': log.name,
                    '전화번호': log.phoneNumber,
                    '시도': addressParts.sido || '-',
                    '시군구': addressParts.sigungu || '-',
                    '읍면동': addressParts.eupmyeondong || '-',
                    '나머지주소': addressParts.rest || '-',
                    '전체주소': fullAddress,
                    '필지 주소': log.lotAddress || '-',
                    '작물': log.cropsDisplay || '-',
                    '면적(m²)': log.area || '-',
                    '수령 방법': log.receptionMethod || '-',
                    '비고': log.note || '-',
                    '완료여부': (log.isCompleted || log.completed) ? '완료' : '미완료',
                    '등록일시': log.createdAt ? new Date(log.createdAt).toLocaleString('ko-KR') : '-'
                });
            }
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 14 },  // 접수번호
            { wch: 12 },  // 접수일자
            { wch: 8 },   // 구분
            { wch: 12 },  // 목적(용도)
            { wch: 10 },  // 성명
            { wch: 15 },  // 전화번호
            { wch: 12 },  // 시도
            { wch: 10 },  // 시군구
            { wch: 10 },  // 읍면동
            { wch: 25 },  // 나머지주소
            { wch: 30 },  // 필지 주소
            { wch: 15 },  // 작물
            { wch: 10 },  // 면적
            { wch: 10 },  // 수령 방법
            { wch: 20 },  // 비고
            { wch: 8 },   // 완료여부
            { wch: 18 }   // 등록일시
        ];

        XLSX.utils.book_append_sheet(wb, ws, '시료접수대장');

        const today = new Date().toISOString().slice(0, 10);
        const filename = `토양_접수대장_${today}.xlsx`;

        XLSX.writeFile(wb, filename);
    });

    // ========================================
    // JSON 저장/불러오기 기능
    // ========================================
    const saveJsonBtn = document.getElementById('saveJsonBtn');
    const loadJsonInput = document.getElementById('loadJsonInput');

    // 자동 저장용 Web File Handle
    let autoSaveFileHandle = null;

    // 자동 저장 수행 함수 (saveLogs에서 호출)
    async function autoSaveToFile() {
        return await SampleUtils.performAutoSave({
            FileAPI: FileAPI,
            moduleKey: 'soil',
            data: sampleLogs,
            webFileHandle: autoSaveFileHandle,
            log: log
        });
    }

    // 자동 저장 폴더/파일 선택 버튼 설정 (공통 모듈 사용)
    SampleUtils.setupAutoSaveFolderButton({
        moduleKey: 'soil',
        FileAPI: FileAPI,
        selectedYear: selectedYear,
        getWebFileHandle: () => autoSaveFileHandle,
        setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
        autoSaveCallback: autoSaveToFile,
        showToast: showToast
    });

    // JSON 저장 버튼 핸들러 (공통 모듈 사용)
    SampleUtils.setupJSONSaveHandler({
        buttonElement: saveJsonBtn,
        sampleType: SAMPLE_TYPE,
        getData: () => sampleLogs,
        FileAPI: FileAPI,
        filePrefix: '시료접수대장',
        showToast: showToast
    });

    // JSON 불러오기 핸들러 (공통 모듈 사용, ID 기반 중복 제거)
    SampleUtils.setupJSONLoadHandler({
        inputElement: loadJsonInput,
        getData: () => sampleLogs,
        setData: (data) => { sampleLogs = data; },
        saveData: saveLogs,
        renderData: () => renderLogs(sampleLogs),
        showToast: showToast,
        deduplicateById: true
    });

    // ========================================
    // 전체화면 뷰어 열기
    // ========================================
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

                // ID가 없는 항목에 ID 추가
                const dataWithIds = sampleLogs.map(item => ({
                    ...item,
                    id: item.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 11))
                }));

                await window.firestoreDb.batchSave('soil', parseInt(selectedYear), dataWithIds);

                // localStorage도 업데이트 (ID 포함)
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

    // ========================================
    // 자동 저장 토글 이벤트 설정 (공통 모듈 사용)
    // ========================================
    SampleUtils.setupAutoSaveToggle({
        moduleKey: 'soil',
        FileAPI: FileAPI,
        getWebFileHandle: () => autoSaveFileHandle,
        setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
        autoSaveCallback: autoSaveToFile,
        showToast: showToast,
        log: log
    });

    // ========================================
    // 헬퍼 함수들
    // ========================================
    async function saveLogs() {
        const yearStorageKey = getStorageKey(selectedYear);

        // 1. ID가 없는 항목에 ID 추가
        sampleLogs = sampleLogs.map(item => ({
            ...item,
            id: item.id || (Date.now().toString(36) + Math.random().toString(36).substring(2, 11))
        }));

        // 2. Firebase가 활성화되어 있으면 Firebase에 먼저 저장
        if (window.firestoreDb?.isEnabled()) {
            try {
                log('☁️ Firebase에 데이터 저장 중...');
                await window.firestoreDb.batchSave('soil', parseInt(selectedYear), sampleLogs);
                log('☁️ Firebase 저장 완료:', sampleLogs.length, '건');

                // Firebase 저장 성공 후 localStorage에 캐싱
                localStorage.setItem(yearStorageKey, JSON.stringify(sampleLogs));
                log('💾 로컬 캐싱 완료');
            } catch (err) {
                window.logger.error('Firebase 저장 실패:', err);
                showToast('클라우드 저장 실패', 'error');

                // Firebase 실패 시 localStorage를 primary로 사용
                localStorage.setItem(yearStorageKey, JSON.stringify(sampleLogs));
                log('💾 로컬 저장으로 폴백');
            }
        } else {
            // Firebase가 비활성화된 경우에만 localStorage 사용
            localStorage.setItem(yearStorageKey, JSON.stringify(sampleLogs));
            log('💾 로컬 저장 완료:', sampleLogs.length, '건');
        }

        // 3. 자동 저장 실행 (Electron: FileAPI.autoSavePath, Web: autoSaveFileHandle)
        const autoSaveEnabled = localStorage.getItem('soilAutoSaveEnabled') === 'true';
        if (autoSaveEnabled && (window.isElectron ? FileAPI.autoSavePath : autoSaveFileHandle)) {
            autoSaveToFile();
        }

        sessionStorage.setItem('lastSaveTime', new Date().toISOString());
    }

    // 데이터를 평탄화하여 테이블 행으로 변환 (하위 지번별로 행 분리)
    function flattenLogsForTable(logs) {
        const rows = [];

        logs.forEach(log => {
            if (log.parcels && log.parcels.length > 0) {
                let subLotIndex = 1;

                log.parcels.forEach(parcel => {
                    const cropsDisplay = parcel.crops && parcel.crops.length > 0
                        ? parcel.crops.map(c => c.name).join(', ')
                        : '-';

                    // 단위별 면적 합산
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

                    // 면적 표시 문자열 생성
                    const areaParts = [];
                    if (m2Total > 0) areaParts.push(`${m2Total.toLocaleString()}㎡`);
                    if (pyeongTotal > 0) areaParts.push(`${pyeongTotal.toLocaleString()}평`);
                    const areaDisplay = areaParts.length > 0 ? areaParts.join(' / ') : '-';

                    // 메인 필지 행 추가 (산 여부 표시)
                    const lotAddressDisplay = parcel.lotAddress
                        ? (parcel.isMountain ? `${parcel.lotAddress} (산)` : parcel.lotAddress)
                        : '-';
                    rows.push({
                        ...log,
                        _isFirstRow: subLotIndex === 1,
                        _subLotIndex: subLotIndex,
                        _displayNumber: log.receptionNumber,
                        _lotAddress: lotAddressDisplay,
                        _cropsDisplay: cropsDisplay,
                        _areaDisplay: areaDisplay
                    });
                    subLotIndex++;

                    // 하위 지번이 있는 경우 각각 별도 행으로 추가 (하위 지번을 필지 주소에 표시)
                    if (parcel.subLots && parcel.subLots.length > 0) {
                        parcel.subLots.forEach((subLot, idx) => {
                            // 문자열/객체 모두 호환
                            const lotAddress = typeof subLot === 'string' ? subLot : subLot.lotAddress;
                            const subLotCrops = typeof subLot === 'string' ? [] : (subLot.crops || []);

                            const subLotCropsDisplay = subLotCrops.length > 0
                                ? subLotCrops.map(c => c.name).join(', ')
                                : '-';

                            // 하위 지번 단위별 면적 합산
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

                            // 하위 지번 면적 표시 문자열 생성
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

                // 필지가 없거나 모든 필지에 데이터가 없는 경우 최소 1행
                if (subLotIndex === 1) {
                    rows.push({
                        ...log,
                        _isFirstRow: true,
                        _subLotIndex: 1,
                        _displayNumber: log.receptionNumber,
                        _lotAddress: '-',
                        _subLot: '-',
                        _cropsDisplay: '-',
                        _areaDisplay: '-'
                    });
                }
            } else {
                // 기존 데이터 호환 (parcels 배열이 없는 경우)
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

    function renderLogs(logs) {
        tableBody.innerHTML = '';

        // 레코드 카운트 업데이트
        updateRecordCount();

        if (logs.length === 0) {
            emptyState.classList.remove('hidden');
            if (paginationContainer) paginationContainer.style.display = 'none';
        } else {
            emptyState.classList.add('hidden');
            if (paginationContainer) paginationContainer.style.display = 'flex';

            // 접수번호 기준 오름차순 정렬
            const sortedLogs = [...logs].sort((a, b) => {
                const numA = parseInt(a.receptionNumber, 10) || 0;
                const numB = parseInt(b.receptionNumber, 10) || 0;
                return numA - numB;
            });

            // 데이터 평탄화
            currentFlatRows = flattenLogsForTable(sortedLogs);

            // 페이지네이션 계산
            totalPages = Math.ceil(currentFlatRows.length / itemsPerPage);
            if (currentPage > totalPages) currentPage = totalPages || 1;

            // 현재 페이지 데이터 추출
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageRows = currentFlatRows.slice(startIndex, endIndex);

            pageRows.forEach((row) => {
                // 하위 카테고리와 재배 작물을 합쳐서 표시
                let subCategoryDisplay = row.subCategory || '';
                if (row._cropsDisplay !== '-') {
                    subCategoryDisplay = subCategoryDisplay
                        ? `${subCategoryDisplay} (${row._cropsDisplay})`
                        : row._cropsDisplay;
                }
                subCategoryDisplay = subCategoryDisplay || '-';

                // 완료 상태 확인
                const isCompleted = row.completed || false;

                const tr = document.createElement('tr');
                tr.className = isCompleted ? 'row-completed' : '';
                // 수령 방법 텍스트
                const methodText = row.receptionMethod || '-';

                // 주소에서 우편번호 분리 (예: "(12345) 서울시..." -> 우편번호: "12345", 주소: "서울시...")
                const addressFull = row.address || '';
                const zipMatch = addressFull.match(/^\((\d{5})\)\s*/);
                const zipcode = zipMatch ? zipMatch[1] : '';
                const addressOnly = zipMatch ? addressFull.replace(zipMatch[0], '') : addressFull;

                // 뷰용 주소: 시도 패턴이 있을 때만 제거
                const displayAddress = addressOnly && addressOnly !== '-' && SIDO_PATTERN.test(addressOnly)
                    ? addressOnly.replace(SIDO_PATTERN, '')
                    : (addressOnly || '-');

                // XSS 방지: 사용자 입력 데이터 이스케이프
                const safeName = escapeHTML(row.name);
                const safeAddress = escapeHTML(addressOnly || '-');
                const safeDisplayAddress = escapeHTML(displayAddress);
                const safeLotAddress = escapeHTML(row._lotAddress);
                const safeCrops = escapeHTML(row._cropsDisplay);
                const safePhone = escapeHTML(row.phoneNumber || '-');
                // 비고: 전체 비고 + 필지별 비고 결합
                const parcelNote = row.parcels && row.parcels[0] && row.parcels[0].note ? row.parcels[0].note : '';
                const combinedNote = [row.note, parcelNote].filter(n => n && n.trim()).join(' / ') || '-';
                const safeNote = escapeHTML(combinedNote);
                const safeMethod = escapeHTML(methodText);

                tr.dataset.id = row.id;

                // 체크박스 열
                const tdCheckbox = document.createElement('td');
                tdCheckbox.className = 'col-checkbox';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'row-checkbox';
                checkbox.dataset.id = row.id;
                tdCheckbox.appendChild(checkbox);
                tr.appendChild(tdCheckbox);

                // 완료 버튼 열
                const tdComplete = document.createElement('td');
                tdComplete.className = 'col-complete';
                const btnComplete = document.createElement('button');
                btnComplete.className = `btn-complete ${isCompleted ? 'completed' : ''}`;
                btnComplete.dataset.id = row.id;
                btnComplete.title = isCompleted ? '완료 취소' : '완료';
                btnComplete.textContent = isCompleted ? '✔' : '';
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
                tdPurpose.textContent = row.purpose || '-';
                tr.appendChild(tdPurpose);

                // 성명
                const tdName = document.createElement('td');
                tdName.textContent = row.name;
                tr.appendChild(tdName);

                // 우편번호
                const tdZipcode = document.createElement('td');
                tdZipcode.className = 'col-zipcode';
                tdZipcode.textContent = zipcode || '-';
                tr.appendChild(tdZipcode);

                // 주소 - 시도 제외하고 전체 표시
                const tdAddress = document.createElement('td');
                tdAddress.className = 'col-address';
                tdAddress.textContent = safeDisplayAddress;
                tr.appendChild(tdAddress);

                // 필지 주소
                const tdLotAddress = document.createElement('td');
                tdLotAddress.textContent = row._lotAddress;
                tr.appendChild(tdLotAddress);

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
                tableBody.appendChild(tr);
            });

            // 페이지네이션 UI 업데이트
            updatePaginationUI();
        }
    }

    // ========================================
    // 페이지네이션 함수들
    // ========================================
    function updatePaginationUI() {
        const totalItems = currentFlatRows.length;
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        // 정보 텍스트 업데이트
        if (paginationInfo) {
            paginationInfo.textContent = `${totalItems.toLocaleString()}건 중 ${startItem.toLocaleString()}-${endItem.toLocaleString()}`;
        }

        // 버튼 상태 업데이트
        if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
        if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;

        // 페이지 번호 버튼 생성
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

        // 첫 페이지 표시
        if (startPage > 1) {
            pageNumbersContainer.appendChild(createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        // 중간 페이지들
        for (let i = startPage; i <= endPage; i++) {
            pageNumbersContainer.appendChild(createPageButton(i));
        }

        // 마지막 페이지 표시
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
        // 테이블 상단으로 스크롤
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
            localStorage.setItem('soilItemsPerPage', itemsPerPage);
            currentPage = 1;
            renderLogs(sampleLogs);
        });
    }

    // 폼 리셋 시 필지도 초기화
    form.addEventListener('reset', () => {
        setTimeout(() => {
            parcels = [];
            parcelIdCounter = 0;
            parcelsContainer.innerHTML = '';
            addParcel();
        }, 0);
    });

    /**
     * 폼 초기화 (접수번호, 접수일자 유지)
     * @description 접수번호와 접수일자를 제외한 모든 입력 필드를 초기화
     */
    function resetFormKeepReceptionInfo() {
        // 접수번호와 접수일자 값 저장
        const receptionNumber = document.getElementById('receptionNumber')?.value;
        const date = document.getElementById('date')?.value;

        // 폼 초기화
        form.reset();

        // 접수번호와 접수일자 복원
        setTimeout(() => {
            if (receptionNumber) {
                document.getElementById('receptionNumber').value = receptionNumber;
            }
            if (date) {
                document.getElementById('date').value = date;
            }
        }, 10);
    }

    // 네비게이션 바 초기화/접수등록 버튼
    const navResetBtn = document.getElementById('navResetBtn');
    const navSubmitBtn = document.getElementById('navSubmitBtn');

    if (navResetBtn) {
        navResetBtn.addEventListener('click', () => {
            resetFormKeepReceptionInfo();
        });
    }

    if (navSubmitBtn) {
        navSubmitBtn.addEventListener('click', () => {
            form.requestSubmit();
        });
    }

    // ========================================
    // 등록 결과 모달
    // ========================================
    const registrationResultModal = document.getElementById('registrationResultModal');
    const closeRegistrationModal = document.getElementById('closeRegistrationModal');
    const closeResultBtn = document.getElementById('closeResultBtn');
    const exportResultBtn = document.getElementById('exportResultBtn');
    const resultTableBody = document.getElementById('resultTableBody');
    let currentRegistrationData = null;

    function showRegistrationResult(logData) {
        currentRegistrationData = logData;

        // 기본 정보 행 추가
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

        // 공통 유틸리티로 기본 테이블 생성 (XSS 방지)
        BaseSampleManager.buildResultTable(resultTableBody, basicRows);

        // 필지 정보 추가 (토양 전용)
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

                // 필지 헤더
                const header = document.createElement('div');
                header.className = 'parcel-header';
                header.textContent = `필지 ${idx + 1}`;
                parcelDiv.appendChild(header);

                // 지번 주소
                const addressDiv = document.createElement('div');
                addressDiv.textContent = parcel.lotAddress;
                parcelDiv.appendChild(addressDiv);

                // 하위 지번
                if (parcel.subLots && parcel.subLots.length > 0) {
                    const subLotsDiv = document.createElement('div');
                    subLotsDiv.className = 'text-sm text-gray';
                    subLotsDiv.textContent = '하위 지번: ' + parcel.subLots.map(s =>
                        typeof s === 'string' ? s : s.lotAddress
                    ).join(', ');
                    parcelDiv.appendChild(subLotsDiv);
                }

                // 작물 정보
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
            resultTableBody.appendChild(tr);
        }

        // 모달 표시
        registrationResultModal.classList.remove('hidden');
    }

    function closeRegistrationResultModal() {
        registrationResultModal.classList.add('hidden');
        currentRegistrationData = null;
    }

    // 모달 닫기 이벤트
    closeRegistrationModal.addEventListener('click', closeRegistrationResultModal);
    closeResultBtn.addEventListener('click', closeRegistrationResultModal);

    // 수정 버튼 클릭 이벤트
    const editResultBtn = document.getElementById('editResultBtn');
    if (editResultBtn) {
        editResultBtn.addEventListener('click', () => {
            if (currentRegistrationData) {
                const dataToEdit = currentRegistrationData;  // 데이터 복사 (모달 닫기 전)
                closeRegistrationResultModal();
                populateFormForEdit(dataToEdit);
            }
        });
    }

    // 오버레이 클릭으로 닫기
    registrationResultModal.querySelector('.modal-overlay').addEventListener('click', closeRegistrationResultModal);

    // 엑셀로 내보내기
    exportResultBtn.addEventListener('click', () => {
        if (!currentRegistrationData) return;

        const excelData = [];

        // 기본 정보
        excelData.push({
            '항목': '접수번호',
            '내용': currentRegistrationData.receptionNumber
        });
        excelData.push({
            '항목': '접수일자',
            '내용': currentRegistrationData.date
        });
        excelData.push({
            '항목': '구분',
            '내용': currentRegistrationData.subCategory || '-'
        });
        excelData.push({
            '항목': '목적 (용도)',
            '내용': currentRegistrationData.purpose || '-'
        });
        excelData.push({
            '항목': '성명',
            '내용': currentRegistrationData.name
        });
        excelData.push({
            '항목': '전화번호',
            '내용': currentRegistrationData.phoneNumber
        });
        excelData.push({
            '항목': '주소',
            '내용': currentRegistrationData.address || '-'
        });
        excelData.push({
            '항목': '수령 방법',
            '내용': currentRegistrationData.receptionMethod || '-'
        });
        excelData.push({
            '항목': '비고',
            '내용': currentRegistrationData.note || '-'
        });

        // 필지 정보
        if (currentRegistrationData.parcels && currentRegistrationData.parcels.length > 0) {
            excelData.push({
                '항목': '',
                '내용': ''
            });
            excelData.push({
                '항목': '=== 필지 정보 ===',
                '내용': ''
            });

            currentRegistrationData.parcels.forEach((parcel, idx) => {
                excelData.push({
                    '항목': `필지 ${idx + 1}`,
                    '내용': parcel.lotAddress
                });

                if (parcel.subLots && parcel.subLots.length > 0) {
                    excelData.push({
                        '항목': '  하위 필지',
                        '내용': parcel.subLots.map(s => typeof s === 'string' ? s : s.lotAddress).join(', ')
                    });
                }

                if (parcel.crops && parcel.crops.length > 0) {
                    parcel.crops.forEach(crop => {
                        excelData.push({
                            '항목': '  작물',
                            '내용': `${crop.name} (${formatArea(crop.area)}m²)`
                        });
                    });
                }
            });
        }

        // 엑셀 파일 생성
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 20 },
            { wch: 50 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, '등록결과');

        const fileName = `등록결과_${currentRegistrationData.receptionNumber}_${currentRegistrationData.name}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showToast('엑셀 파일로 내보내기 완료', 'success');
    });

    // ========================================
    // 지역 선택 모달 (중복 리 이름)
    // ========================================
    const regionSelectionModal = document.getElementById('regionSelectionModal');
    const closeRegionModal = document.getElementById('closeRegionModal');
    const cancelRegionSelection = document.getElementById('cancelRegionSelection');
    const duplicateVillageName = document.getElementById('duplicateVillageName');
    const regionOptions = document.getElementById('regionOptions');

    let currentRegionSelection = null;

    function showRegionSelectionModal(parseResult, parcelId, inputElement) {
        currentRegionSelection = {
            result: parseResult,
            parcelId,
            inputElement
        };

        // 리 이름 표시
        duplicateVillageName.textContent = parseResult.villageName;

        // 지역 옵션 생성
        regionOptions.innerHTML = sanitizeHTML(parseResult.locations.map((location, index) => `
            <div class="region-option" data-index="${index}">
                <div class="region-option-content">
                    <div class="region-option-title">${location.fullAddress}</div>
                    <div class="region-option-subtitle">${location.region} ${location.district}</div>
                </div>
                <div class="region-option-icon">→</div>
            </div>
        `).join(''));

        // 옵션 클릭 이벤트
        regionOptions.querySelectorAll('.region-option').forEach(option => {
            option.addEventListener('click', () => {
                const index = parseInt(option.dataset.index, 10);
                selectRegion(index);
            });
        });

        // 모달 표시
        regionSelectionModal.classList.remove('hidden');
    }

    function selectRegion(index) {
        if (!currentRegionSelection) return;

        const location = currentRegionSelection.result.locations[index];
        const lotNumber = currentRegionSelection.result.lotNumber;
        const fullAddress = lotNumber ? `${location.fullAddress} ${lotNumber}` : location.fullAddress;

        // 입력 필드 업데이트
        currentRegionSelection.inputElement.value = fullAddress;

        // 필지 데이터 업데이트
        updateParcelLotAddress(currentRegionSelection.parcelId);

        // 모달 닫기
        closeRegionSelectionModal();

        showToast('지역이 선택되었습니다', 'success');
    }

    function closeRegionSelectionModal() {
        regionSelectionModal.classList.add('hidden');
        currentRegionSelection = null;
    }

    closeRegionModal.addEventListener('click', closeRegionSelectionModal);
    cancelRegionSelection.addEventListener('click', closeRegionSelectionModal);

    // 오버레이 클릭 시 닫기
    regionSelectionModal.querySelector('.modal-overlay').addEventListener('click', closeRegionSelectionModal);

    // ========================================
    // Electron 환경: 자동 저장 파일에서 데이터 로드
    // ========================================
    if (window.isElectron && FileAPI.autoSavePath) {
        const autoSaveData = await window.loadFromAutoSaveFile();
        if (autoSaveData && autoSaveData.length > 0) {
            if (sampleLogs.length === 0) {
                sampleLogs = autoSaveData;
                localStorage.setItem(getStorageKey(selectedYear), JSON.stringify(sampleLogs));
                log('📂 토양 자동 저장 파일에서 데이터 로드됨:', autoSaveData.length, '건');
                renderLogs(sampleLogs);
                receptionNumberInput.value = generateNextReceptionNumber();
            }
        }
    }

    log('✅ 토양 시료 접수 페이지 초기화 완료');
});
