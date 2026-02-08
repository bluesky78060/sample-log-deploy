/**
 * @fileoverview 퇴·액비 성분검사 위탁서 스크립트
 * @description 가축분뇨퇴비/액비 시료 접수/관리 기능
 */

// ========================================
// 상수 및 설정
// ========================================

/** @type {string} */
const DEFAULT_SAMPLE_TYPE = '가축분퇴비';

/** @type {string} */
const SAMPLE_TYPE = 'compost';

/** @type {string} */
const STORAGE_KEY = 'compostSampleLogs';

/** @type {string} */
const AUTO_SAVE_FILE = 'compost-autosave.json';

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

// ========================================
// 페이지네이션 상태
// ========================================

/** @type {number} */
let currentPage = 1;

/** @type {number} */
let itemsPerPage = parseInt(localStorage.getItem('compostItemsPerPage'), 10) || 100;

/** @type {number} */
let totalPages = 1;

/** @type {CompostSampleLog[]} */
let currentLogsData = [];

// 공통 모듈에서 가져온 변수/함수 사용 (../shared/*.js)
// window.isElectron, window.createFileAPI 등 전역 변수 사용
const FileAPI = window.createFileAPI('compost');

// compost 전용 엑셀 저장 함수 추가
FileAPI.saveExcel = async function(buffer, suggestedName = 'data.xlsx') {
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

document.addEventListener('DOMContentLoaded', async () => {
    log('🚀 퇴·액비 성분검사 위탁서 페이지 로드 시작');
    log(window.isElectron ? '🖥️ Electron 환경' : '🌐 웹 브라우저 환경');

    // 파일 API 초기화 (현재 년도로)
    const currentYear = new Date().getFullYear().toString();
    await FileAPI.init(currentYear);

    // Firebase 초기화와 AutoSave 초기화를 병렬로 실행
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

    // AutoSave 초기화 Promise
    const autoSaveInitPromise = SampleUtils.initAutoSave({
        moduleKey: SAMPLE_TYPE,
        moduleName: '퇴·액비',
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
            listViewTitle.textContent = `퇴·액비 접수 목록`;
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
                const cloudData = await window.storageManager.load('compost', parseInt(year), getStorageKey(year));
                if (cloudData && cloudData.length > 0) {
                    // localStorage에도 저장 (캐시)
                    localStorage.setItem(getStorageKey(year), JSON.stringify(cloudData));
                    log('☁️ Firebase에서 데이터 로드:', cloudData.length, '건');
                    return cloudData;
                }
            }
            // firestoreDb 직접 사용 (storageManager가 초기화되지 않은 경우)
            if (window.firestoreDb?.isEnabled()) {
                const cloudData = await window.firestoreDb.getAll('compost', parseInt(year));
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
                const cloudData = await window.firestoreDb.getAll('compost', parseInt(year), { skipOrder: true });

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
                    const autoSaveEnabled = localStorage.getItem('compostAutoSaveEnabled') === 'true';
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
            const cloudData = await window.firestoreDb.getAll('compost', parseInt(year), { skipOrder: true });

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
                const autoSaveEnabled = localStorage.getItem('compostAutoSaveEnabled') === 'true';
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

    // 연도 전환 시 자동 저장 파일 복원
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
    // 축종 기타 입력 필드 처리
    // ========================================
    const animalTypeRadios = document.querySelectorAll('input[name="animalType"]');
    const animalTypeOtherInput = document.getElementById('animalTypeOther');

    animalTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === '기타' && radio.checked) {
                animalTypeOtherInput.classList.remove('hidden');
                animalTypeOtherInput.focus();
            } else {
                animalTypeOtherInput.classList.add('hidden');
                animalTypeOtherInput.value = '';
            }
        });
    });

    // ========================================
    // 농장 주소 (직접 입력)
    // ========================================
    const farmAddressFullInput = document.getElementById('farmAddressFull');

    // ========================================
    // 면적 천단위 콤마 포맷팅 및 단위 토글
    // ========================================
    const farmAreaInput = document.getElementById('farmArea');
    const areaUnitToggle = document.getElementById('areaUnitToggle');
    const farmAreaUnitInput = document.getElementById('farmAreaUnit');

    function formatNumberWithCommas(value) {
        // 숫자만 추출
        const num = value.replace(/[^\d]/g, '');
        if (!num) return '';
        // 천단위 콤마 적용
        return parseInt(num, 10).toLocaleString('ko-KR');
    }

    function parseFormattedNumber(value) {
        // 콤마 제거하고 숫자만 반환
        return value.replace(/,/g, '');
    }

    // 단위 라벨 반환
    function getUnitLabel(unit) {
        return unit === 'pyeong' ? '평' : '㎡';
    }

    if (farmAreaInput) {
        farmAreaInput.addEventListener('input', (e) => {
            const formatted = formatNumberWithCommas(e.target.value);
            e.target.value = formatted;
        });
    }

    // 면적 단위 토글 이벤트
    if (areaUnitToggle) {
        areaUnitToggle.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;

                // 버튼 활성화 상태 변경
                areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 데이터 속성 및 hidden input 업데이트
                areaUnitToggle.dataset.unit = value;
                if (farmAreaUnitInput) {
                    farmAreaUnitInput.value = value;
                }
            });
        });
    }

    // ========================================
    // 접수번호 자동 생성
    // ========================================
    const receptionNumberInput = document.getElementById('receptionNumber');

    function generateNextReceptionNumber() {
        let maxNumber = 0;

        sampleLogs.forEach(log => {
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

    receptionNumberInput.value = generateNextReceptionNumber();

    // 수정 모드 상태 변수
    let editingId = null;
    let currentRegistrationData = null;  // 마지막 등록된 시료 데이터 (모달 수정 버튼용)

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

        // 축종 (기타 선택 시 입력값 사용)
        let animalType = formData.get('animalType');
        if (animalType === '기타') {
            animalType = animalTypeOtherInput.value || '기타';
        }

        // 법인여부
        const applicantType = formData.get('applicantType') || '개인';

        const data = {
            id: generateId(),
            receptionNumber: formData.get('receptionNumber'),
            date: formData.get('date'),
            // 법인여부/생년월일/법인번호
            applicantType: applicantType,
            birthDate: applicantType === '개인' ? formData.get('birthDate') : '',
            corpNumber: applicantType === '법인' ? formData.get('corpNumber') : '',
            // 의뢰자 정보
            farmName: formData.get('farmName'),
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            address: formData.get('address'),
            addressPostcode: formData.get('addressPostcode'),
            addressRoad: formData.get('addressRoad'),
            addressDetail: formData.get('addressDetail'),
            farmAddress: formData.get('farmAddressFull'),
            farmArea: parseFormattedNumber(formData.get('farmArea') || ''),
            farmAreaUnit: formData.get('farmAreaUnit') || 'm2',
            // 의뢰내용
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

        sampleLogs.push(data);
        saveLogs();

        showToast('시료가 등록되었습니다.', 'success');
        showRegistrationResult(data);

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

        // 통보방법 초기화
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

        // 시료종류 초기화 (첫 번째 라디오 선택)
        const sampleTypeRadios = document.querySelectorAll('input[name="sampleType"]');
        if (sampleTypeRadios.length > 0) {
            sampleTypeRadios[0].checked = true;
        }

        // 축종 초기화 (첫 번째 라디오 선택)
        if (animalTypeRadios.length > 0) {
            animalTypeRadios[0].checked = true;
        }
        animalTypeOtherInput.classList.add('hidden');
        animalTypeOtherInput.value = '';

        // 면적 단위 초기화
        if (areaUnitToggle) {
            areaUnitToggle.dataset.unit = 'm2';
            areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.value === 'm2');
            });
        }
        if (farmAreaUnitInput) {
            farmAreaUnitInput.value = 'm2';
        }

        // 접수번호 갱신
        const nextNumber = generateNextReceptionNumber();
        receptionNumberInput.value = nextNumber;

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
                await window.firestoreDb.batchSave('compost', parseInt(selectedYear), sampleLogs);
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

        updateRecordCount();

        // 3. 자동 저장 (Electron 환경)
        if (window.isElectron && FileAPI.autoSavePath && document.getElementById('autoSaveToggle')?.checked) {
            const autoSaveContent = JSON.stringify(sampleLogs, null, 2);
            FileAPI.autoSave(autoSaveContent);
        }
    }

    // ========================================
    // 목록 렌더링
    // ========================================

    // 페이지네이션 DOM 요소
    const paginationInfo = document.getElementById('paginationInfo');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const pageNumbersContainer = document.getElementById('pageNumbers');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    const paginationContainer = document.getElementById('pagination');

    // 페이지네이션 초기화
    if (itemsPerPageSelect) {
        itemsPerPageSelect.value = itemsPerPage;
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value, 10);
            localStorage.setItem('compostItemsPerPage', itemsPerPage);
            currentPage = 1;
            renderCurrentPage();
        });
    }

    // 페이지네이션 버튼 이벤트
    if (firstPageBtn) firstPageBtn.addEventListener('click', () => goToPage(1));
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    if (lastPageBtn) lastPageBtn.addEventListener('click', () => goToPage(totalPages));

    function goToPage(page) {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        renderCurrentPage();
        const tableWrapper = document.querySelector('.table-wrapper');
        if (tableWrapper) tableWrapper.scrollTop = 0;
    }

    function renderCurrentPage() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = currentLogsData.slice(startIndex, endIndex);

        tableBody.innerHTML = '';
        pageData.forEach(logItem => {
            const row = document.createElement('tr');
            row.dataset.id = logItem.id;

            const sampleTypeBadge = getSampleTypeBadge(logItem.sampleType);
            const animalTypeBadge = getAnimalTypeBadge(logItem.animalType);
            const fullAddress = [logItem.addressRoad, logItem.addressDetail].filter(Boolean).join(' ') || '-';
            // 뷰용 주소: 시도 패턴이 있을 때만 제거
            const displayAddress = fullAddress !== '-' && SIDO_PATTERN.test(fullAddress)
                ? fullAddress.replace(SIDO_PATTERN, '')
                : fullAddress;

            // XSS 방지: 사용자 입력 데이터 이스케이프
            const safeFarmName = escapeHTML(logItem.farmName || logItem.companyName || '-');
            const safeName = escapeHTML(logItem.name || '-');
            const safeFullAddress = escapeHTML(fullAddress);
            const safeDisplayAddress = escapeHTML(displayAddress);
            const safeFarmAddress = escapeHTML(logItem.farmAddress || '-');
            const safePhone = escapeHTML(logItem.phoneNumber || '-');
            const safeNote = escapeHTML(logItem.note || '-');

            // 법인여부 및 생년월일/법인번호
            const applicantType = logItem.applicantType || '개인';
            const birthOrCorp = applicantType === '법인' ? (logItem.corpNumber || '-') : (logItem.birthDate || '-');

            // 테이블 행 생성: DOM 요소 사용 (XSS 방지)
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

            // 9. Name
            const tdName = document.createElement('td');
            tdName.textContent = safeName;
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

            // 13. Farm area (평이면 m²로 환산해서 표시)
            const tdFarmArea = document.createElement('td');
            if (logItem.farmArea) {
                const areaValue = parseInt(logItem.farmArea, 10);
                if (logItem.farmAreaUnit === 'pyeong') {
                    // 평 → m² 환산 (1평 = 3.3058 m²)
                    const m2Value = Math.round(areaValue * 3.3058);
                    tdFarmArea.textContent = m2Value.toLocaleString('ko-KR') + ' m²';
                } else {
                    tdFarmArea.textContent = areaValue.toLocaleString('ko-KR') + ' m²';
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

            tableBody.appendChild(row);
        });

        bindTableEvents();
        updatePaginationUI();
    }

    function updatePaginationUI() {
        const totalItems = currentLogsData.length;
        totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;

        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        if (paginationInfo) {
            paginationInfo.textContent = `${totalItems}건 중 ${startItem}-${endItem}`;
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
        btn.className = `page-btn ${pageNum === currentPage ? 'active' : ''}`;
        btn.textContent = pageNum;
        btn.addEventListener('click', () => goToPage(pageNum));
        return btn;
    }

    function renderLogs(logs) {
        tableBody.innerHTML = '';

        if (logs.length === 0) {
            emptyState.style.display = 'flex';
            if (paginationContainer) paginationContainer.style.display = 'none';
            currentLogsData = [];
            updatePaginationUI();
            updateRecordCount();
            return;
        }

        emptyState.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'flex';

        // 접수번호 기준 오름차순 정렬
        currentLogsData = [...logs].sort((a, b) => {
            const numA = parseInt(a.receptionNumber, 10) || 0;
            const numB = parseInt(b.receptionNumber, 10) || 0;
            return numA - numB;
        });

        totalPages = Math.ceil(currentLogsData.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        renderCurrentPage();
        updateRecordCount();
    }

    function getSampleTypeBadge(type) {
        const typeMap = {
            '가축분퇴비': { class: 'compost', icon: '🌿' },
            '가축분뇨발효액': { class: 'liquid', icon: '💧' }
        };
        const config = typeMap[type] || { class: 'other', icon: '📦' };
        return `<span class="sample-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    function getAnimalTypeBadge(type) {
        const typeMap = {
            '소': { class: 'cow', icon: '🐄' },
            '돼지': { class: 'pig', icon: '🐷' },
            '닭·오리 등': { class: 'chicken', icon: '🐔' }
        };
        const config = typeMap[type] || { class: 'other', icon: '🐾' };
        return `<span class="animal-type-badge ${config.class}">${config.icon} ${type || '기타'}</span>`;
    }

    // 테이블 이벤트 위임 (한 번만 등록)
    tableBody?.addEventListener('click', (e) => {
        // select, input 요소 클릭 시 이벤트 무시 (드롭다운/입력 동작 보호)
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'OPTION') {
            return;
        }

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

    // 부숙도 드롭다운 변경 이벤트
    tableBody?.addEventListener('change', (e) => {
        const maturitySelect = e.target.closest('.maturity-select');
        if (maturitySelect) {
            const id = maturitySelect.dataset.id;
            updateMaturity(id, maturitySelect.value);
            return;
        }
    });

    // 함수율 입력 변경 이벤트 (blur 시 저장)
    tableBody?.addEventListener('blur', (e) => {
        const moistureInput = e.target.closest('.moisture-input');
        if (moistureInput) {
            const id = moistureInput.dataset.id;
            updateMoisture(id, moistureInput.value);
            return;
        }
    }, true); // capture phase for blur event

    // 함수율 Enter 키 입력 시 저장
    tableBody?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const moistureInput = e.target.closest('.moisture-input');
            if (moistureInput) {
                const id = moistureInput.dataset.id;
                updateMoisture(id, moistureInput.value);
                moistureInput.blur();
                return;
            }
        }
    });

    function bindTableEvents() {
        // 이벤트 위임으로 대체됨 - 이 함수는 호환성을 위해 유지
    }

    // 부숙도 업데이트
    function updateMaturity(id, value) {
        const logItem = sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            logItem.maturity = value;
            logItem.updatedAt = new Date().toISOString();
            saveLogs();
            log('부숙도 업데이트:', id, value);
        }
    }

    // 함수율 업데이트
    function updateMoisture(id, value) {
        const logItem = sampleLogs.find(l => String(l.id) === id);
        if (logItem) {
            logItem.moisture = value;
            logItem.updatedAt = new Date().toISOString();
            saveLogs();
            log('함수율 업데이트:', id, value);
        }
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
            window.firestoreDb.delete('compost', parseInt(selectedYear), id)
                .then(() => log('☁️ Firebase 삭제 완료:', id))
                .catch(err => window.logger.error('Firebase 삭제 실패:', err));
        }

        showToast('삭제되었습니다.', 'success');
    }

    function editSample(id) {
        const log = sampleLogs.find(l => String(l.id) === id);
        if (!log) return;

        editingId = id;

        // 폼에 데이터 채우기
        receptionNumberInput.value = log.receptionNumber || '';
        dateInput.value = log.date || '';

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

        // 의뢰자 정보
        document.getElementById('farmName').value = log.farmName || '';
        document.getElementById('name').value = log.name || '';
        document.getElementById('phoneNumber').value = log.phoneNumber || '';
        addressPostcode.value = log.addressPostcode || '';
        addressRoad.value = log.addressRoad || '';
        addressDetail.value = log.addressDetail || '';
        addressHidden.value = log.address || '';

        // 농장 정보
        if (farmAddressFullInput) {
            farmAddressFullInput.value = log.farmAddress || '';
        }
        document.getElementById('farmArea').value = log.farmArea ? formatNumberWithCommas(log.farmArea) : '';

        // 면적 단위 복원
        const savedUnit = log.farmAreaUnit || 'm2';
        if (areaUnitToggle) {
            areaUnitToggle.dataset.unit = savedUnit;
            areaUnitToggle.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.value === savedUnit);
            });
        }
        if (farmAreaUnitInput) {
            farmAreaUnitInput.value = savedUnit;
        }

        // 시료종류 설정
        const sampleTypeRadios = document.querySelectorAll('input[name="sampleType"]');
        sampleTypeRadios.forEach(radio => {
            radio.checked = radio.value === log.sampleType;
        });

        // 축종 설정
        let animalTypeFound = false;
        animalTypeRadios.forEach(radio => {
            if (radio.value === log.animalType) {
                radio.checked = true;
                animalTypeFound = true;
            } else if (radio.value === '기타' && !animalTypeFound && log.animalType && !['소', '돼지', '닭·오리 등'].includes(log.animalType)) {
                radio.checked = true;
                animalTypeOtherInput.value = log.animalType;
                animalTypeOtherInput.classList.remove('hidden');
            }
        });

        // 생산 정보
        document.getElementById('productionDate').value = log.productionDate || '';
        document.getElementById('sampleCount').value = log.sampleCount || 1;
        document.getElementById('rawMaterials').value = log.rawMaterials || '';
        document.getElementById('purpose').value = log.purpose || '';
        document.getElementById('note').value = log.note || '';

        // 통보방법 선택
        receptionMethodBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.method === log.receptionMethod);
        });
        receptionMethodInput.value = log.receptionMethod || '';

        switchView('form');
        showToast('수정 모드입니다. 변경 후 등록 버튼을 클릭하세요.', 'warning');

        // 제출 버튼 스타일 변경 (수정 모드 표시)
        if (navSubmitBtn) {
            navSubmitBtn.title = '수정 완료';
            navSubmitBtn.classList.add('btn-edit-mode');
        }
    }

    function updateSample() {
        const formData = new FormData(form);
        const log = sampleLogs.find(l => l.id === editingId);

        // 축종 (기타 선택 시 입력값 사용)
        let animalType = formData.get('animalType');
        if (animalType === '기타') {
            animalType = animalTypeOtherInput.value || '기타';
        }

        if (log) {
            log.receptionNumber = formData.get('receptionNumber');
            log.date = formData.get('date');
            // 법인여부/생년월일/법인번호
            const applicantType = formData.get('applicantType') || '개인';
            log.applicantType = applicantType;
            log.birthDate = applicantType === '개인' ? formData.get('birthDate') : '';
            log.corpNumber = applicantType === '법인' ? formData.get('corpNumber') : '';
            // 의뢰자 정보
            log.farmName = formData.get('farmName');
            log.name = formData.get('name');
            log.phoneNumber = formData.get('phoneNumber');
            log.address = formData.get('address');
            log.addressPostcode = formData.get('addressPostcode');
            log.addressRoad = formData.get('addressRoad');
            log.addressDetail = formData.get('addressDetail');
            log.farmAddress = formData.get('farmAddressFull');
            log.farmArea = parseFormattedNumber(formData.get('farmArea') || '');
            log.farmAreaUnit = formData.get('farmAreaUnit') || 'm2';
            // 의뢰내용
            log.sampleType = formData.get('sampleType');
            log.animalType = animalType;
            log.productionDate = formData.get('productionDate');
            log.sampleCount = formData.get('sampleCount') || '1';
            log.rawMaterials = formData.get('rawMaterials');
            log.purpose = formData.get('purpose');
            log.receptionMethod = formData.get('receptionMethod');
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
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const btnBulkDelete = document.getElementById('deleteSelectedBtn');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        });
    }

    // ========================================
    // 라벨 인쇄 기능
    // ========================================
    const printLabelBtn = document.getElementById('printLabelBtn');

    if (printLabelBtn) {
        printLabelBtn.addEventListener('click', () => {
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
                        window.firestoreDb.delete('compost', parseInt(selectedYear), id)
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
    const statsBtn = document.getElementById('statsBtn');
    const statsModal = document.getElementById('statsModal');
    const closeStatsModal = document.getElementById('closeStatsModal');
    const closeStatsBtn2 = document.getElementById('closeStatsBtn2');

    if (statsBtn) {
        statsBtn.addEventListener('click', showStatistics);
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

    function showStatistics() {
        const total = sampleLogs.length;
        const completed = sampleLogs.filter(l => l.isComplete).length;
        const pending = total - completed;

        document.getElementById('statTotalCount').textContent = total;
        document.getElementById('statCompletedCount').textContent = completed;
        document.getElementById('statPendingCount').textContent = pending;

        // 시료종류별
        const bySampleType = {};
        sampleLogs.forEach(l => {
            const type = l.sampleType || '미지정';
            bySampleType[type] = (bySampleType[type] || 0) + 1;
        });
        renderStatsChart('statsByCompostType', bySampleType, total, 'compost');

        // 축종별
        const byAnimalType = {};
        sampleLogs.forEach(l => {
            const type = l.animalType || '미지정';
            byAnimalType[type] = (byAnimalType[type] || 0) + 1;
        });
        renderStatsChart('statsByAnimalType', byAnimalType, total, 'animal');

        // 수령방법별
        const byReceptionMethod = {};
        sampleLogs.forEach(l => {
            const method = l.receptionMethod || '미지정';
            byReceptionMethod[method] = (byReceptionMethod[method] || 0) + 1;
        });
        renderStatsChart('statsByReceptionMethod', byReceptionMethod, total, 'method');

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

        statsModal.classList.remove('hidden');
    }

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

    function renderQuarterlySummary(containerId, data) {
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

    function renderStatsChart(containerId, data, total, category) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

        // 시료종류별 클래스 매핑
        const compostClassMap = {
            '가축분퇴비': 'compost-manure',
            '가축분액비': 'compost-liquid',
            '기타': 'compost-other'
        };

        // 축종별 클래스 매핑
        const animalClassMap = {
            '소': 'animal-cow',
            '돼지': 'animal-pig',
            '닭': 'animal-chicken',
            '오리': 'animal-duck',
            '말': 'animal-horse',
            '혼합': 'animal-mixed',
            '기타': 'animal-other'
        };

        // 수령방법별 클래스 매핑
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
                (log.name || '').toLowerCase().includes(currentSearchFilter.name);

            // 접수번호 범위 검색
            let matchesReception = true;
            if (currentSearchFilter.receptionFrom || currentSearchFilter.receptionTo) {
                const logNum = extractReceptionNumber(log.receptionNumber || '');
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
            updateSearchButtonState();
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

            const excelData = sampleLogs.map(log => {
                // 면적 표시 (단위 포함)
                let areaDisplay = '-';
                if (log.farmArea) {
                    const unit = log.farmAreaUnit === 'pyeong' ? '평' : 'm²';
                    areaDisplay = `${log.farmArea} ${unit}`;
                }

                // 법인여부에 따라 생년월일 또는 법인번호 결정
                const applicantType = log.applicantType || '개인';
                const birthOrCorp = applicantType === '법인' ? (log.corpNumber || '-') : (log.birthDate || '-');

                // 도로명주소에서 시도/시군구/읍면동 분리
                const addressParts = parseAddressParts(log.addressRoad || log.address || '');

                // 전체 주소 (시도 포함)
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

            // 열 너비 설정
            ws['!cols'] = [
                { wch: 10 },  // 접수번호
                { wch: 12 },  // 접수일자
                { wch: 8 },   // 법인여부
                { wch: 15 },  // 생년월일/법인번호
                { wch: 15 },  // 농장명
                { wch: 10 },  // 대표자
                { wch: 15 },  // 연락처
                { wch: 8 },   // 우편번호
                { wch: 12 },  // 시도
                { wch: 10 },  // 시군구
                { wch: 10 },  // 읍면동
                { wch: 25 },  // 나머지주소
                { wch: 40 },  // 전체주소
                { wch: 30 },  // 농장주소
                { wch: 12 },  // 농장면적
                { wch: 12 },  // 시료종류
                { wch: 10 },  // 축종
                { wch: 15 },  // 원료(부재료)
                { wch: 12 },  // 생산일
                { wch: 8 },   // 시료수
                { wch: 25 },  // 검사목적
                { wch: 10 },  // 통보방법
                { wch: 20 },  // 비고
                { wch: 8 },   // 완료여부
                { wch: 20 }   // 등록일시
            ];

            XLSX.utils.book_append_sheet(wb, ws, '퇴액비 접수목록');

            const fileName = `퇴액비_접수목록_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Electron 환경에서는 FileAPI 사용
            if (window.isElectron) {
                const xlsxData = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                FileAPI.saveExcel(xlsxData, fileName).then(saved => {
                    if (saved) {
                        showToast('엑셀 파일로 내보내기 완료', 'success');
                    }
                });
            } else {
                XLSX.writeFile(wb, fileName);
                showToast('엑셀 파일로 내보내기 완료', 'success');
            }
        });
    }

    // ========================================
    // JSON 저장/불러오기 (공통 모듈 사용)
    // ========================================
    const jsonHandlerOptions = {
        getData: () => sampleLogs,
        setData: (data) => { sampleLogs = data; },
        saveData: saveLogs,
        renderData: () => renderLogs(sampleLogs),
        showToast: showToast
    };

    SampleUtils.setupJSONSaveHandler({
        buttonElement: document.getElementById('saveJsonBtn'),
        sampleType: SAMPLE_TYPE,
        getData: () => sampleLogs,
        FileAPI: FileAPI,
        filePrefix: 'compost-samples',
        showToast: showToast
    });

    SampleUtils.setupJSONLoadHandler({
        inputElement: document.getElementById('loadJsonInput'),
        ...jsonHandlerOptions
    });

    // Electron 전용: 파일 메뉴에서 불러오기
    SampleUtils.setupElectronLoadHandler({
        buttonElement: document.getElementById('loadFileBtn'),
        FileAPI: FileAPI,
        ...jsonHandlerOptions
    });

    // ========================================
    // 자동 저장 설정 (공통 모듈 사용)
    // ========================================
    let autoSaveFileHandle = null;

    // 자동 저장 수행 함수 (saveLogs에서 호출)
    async function autoSaveToFile() {
        return await SampleUtils.performAutoSave({
            FileAPI: FileAPI,
            moduleKey: 'compost',
            data: sampleLogs,
            webFileHandle: autoSaveFileHandle,
            log: log
        });
    }

    // 데이터 변경 시 자동 저장 트리거
    window.triggerCompostAutoSave = autoSaveToFile;

    // 자동 저장 폴더/파일 선택 버튼 설정 (공통 모듈 사용)
    SampleUtils.setupAutoSaveFolderButton({
        moduleKey: 'compost',
        FileAPI: FileAPI,
        selectedYear: selectedYear,
        getWebFileHandle: () => autoSaveFileHandle,
        setWebFileHandle: (handle) => { autoSaveFileHandle = handle; },
        autoSaveCallback: autoSaveToFile,
        showToast: showToast
    });

    // 자동 저장 토글 이벤트 설정 (공통 모듈 사용)
    SampleUtils.setupAutoSaveToggle({
        moduleKey: 'compost',
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

                await window.firestoreDb.batchSave('compost', parseInt(selectedYear), dataWithIds);

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
    log('🔍 자동 저장 로드 체크:', { isElectron: window.isElectron, autoSavePath: FileAPI.autoSavePath });
    if (window.isElectron && FileAPI.autoSavePath) {
        const autoSaveData = await window.loadFromAutoSaveFile();
        log('🔍 로드된 데이터:', autoSaveData);
        if (autoSaveData && autoSaveData.length > 0) {
            sampleLogs = autoSaveData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleLogs));
            log('📂 퇴액비 자동 저장 파일에서 데이터 로드됨:', autoSaveData.length, '건');
            renderLogs(sampleLogs);
        }
    } else {
        log('⚠️ 자동 저장 로드 스킵됨:', { isElectron: window.isElectron, autoSavePath: FileAPI.autoSavePath });
    }

    // ========================================
    // 전체 보기/기본 보기 토글 기능
    // ========================================
    const viewToggleBtn = document.getElementById('toggleColumnsBtn');
    const logTable = document.querySelector('.data-table');
    let isFullView = false;

    if (viewToggleBtn && logTable) {
        viewToggleBtn.addEventListener('click', () => {
            isFullView = !isFullView;

            const toggleText = viewToggleBtn.querySelector('.toggle-text');
            const toggleIcon = viewToggleBtn.querySelector('.toggle-icon');

            if (isFullView) {
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

    // ========================================
    // 농장주소 자동완성 기능
    // ========================================
    function bindFarmAddressAutocomplete() {
        const farmAddressInput = document.getElementById('farmAddressFull');
        const autocompleteList = document.getElementById('farmAddressAutocomplete');

        if (!farmAddressInput || !autocompleteList) return;

        // 입력 시 자동완성 목록 표시
        farmAddressInput.addEventListener('input', (e) => {
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
        farmAddressInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                const value = farmAddressInput.value.trim();

                // 이미 완전한 주소면 무시
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
                            // 지역 선택 목록 표시
                            autocompleteList.innerHTML = sanitizeHTML(result.locations.map(loc => `
                                <li data-village="${result.villageName}" data-district="${loc.district}" data-region-key="${loc.regionKey}" data-lot="${result.lotNumber}">
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
                        }
                        // 유일한 결과인 경우
                        else {
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

                // 로컬 지역명 매핑
                const LOCAL_REGIONS = { 'bonghwa': '봉화군', 'yeongju': '영주시', 'uljin': '울진군' };
                const region = e.target.dataset.region || LOCAL_REGIONS[regionKey] || regionKey;

                // 산 지번이면 "리 산" 형식
                const villageWithMountain = isMountain ? `${village} 산` : village;

                // 기존 입력에서 지번 추출 (산 키워드 제외)
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

    // 농장주소 자동완성 바인딩 실행
    bindFarmAddressAutocomplete();

    // ========================================
    // 초기화
    // ========================================

    // 초기 데이터 로드 (Firebase 우선)
    await loadYearData(selectedYear);
    updateRecordCount();

    log('✅ 퇴·액비 성분검사 위탁서 페이지 로드 완료');
});
