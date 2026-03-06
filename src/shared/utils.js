// ========================================
// 공통 유틸리티 모듈
// 모든 시료 모듈에서 공통으로 사용하는 함수들
// ========================================

// ========================================
// 정규식 상수 - 모듈 레벨 호이스팅 (js-hoist-regexp)
// ========================================
const REGEX_NON_DIGIT = /[^\d]/g;

// ========================================
// 전역 에러 핸들러
// ========================================

/**
 * 전역 에러 핸들러 설정
 * 처리되지 않은 Promise rejection 및 일반 에러 캐치
 */
function setupGlobalErrorHandler() {
    // 처리되지 않은 Promise rejection 캐치
    window.addEventListener('unhandledrejection', (event) => {
        (window.logger?.error || console.error)('처리되지 않은 Promise rejection:', event.reason);

        // 네트워크 에러인 경우 사용자에게 알림
        if (event.reason?.message?.includes('network') ||
            event.reason?.message?.includes('fetch') ||
            event.reason?.code === 'unavailable') {
            if (window.showToast) {
                window.showToast('네트워크 연결을 확인해주세요.', 'error');
            }
        }

        // 기본 동작 방지 (콘솔 에러 중복 방지)
        event.preventDefault();
    });

    // 전역 에러 캐치
    window.addEventListener('error', (event) => {
        (window.logger?.error || console.error)('전역 에러:', event.error || event.message);

        // 스크립트 로드 실패
        if (event.target?.tagName === 'SCRIPT') {
            (window.logger?.error || console.error)('스크립트 로드 실패:', event.target.src);
        }
    });
}

// 글로벌 에러 핸들러 자동 설정
setupGlobalErrorHandler();

/**
 * 전화번호 자동 포맷팅
 * @param {string} value - 입력값
 * @returns {string} 포맷된 전화번호
 */
function formatPhoneNumber(value) {
    const numbers = value.replace(REGEX_NON_DIGIT, '');

    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
        if (numbers.startsWith('02')) {
            // 서울 지역번호
            if (numbers.length <= 9) {
                return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
            } else {
                return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
            }
        } else {
            // 휴대폰 또는 일반 지역번호
            return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
        }
    }
    return value;
}

/**
 * 전화번호 입력 이벤트 핸들러 설정
 * @param {HTMLInputElement} input - 전화번호 입력 요소
 */
function setupPhoneNumberInput(input) {
    if (!input) return;

    input.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const oldLength = this.value.length;
        this.value = formatPhoneNumber(this.value);
        const newLength = this.value.length;
        const newCursorPos = cursorPos + (newLength - oldLength);
        this.setSelectionRange(newCursorPos, newCursorPos);
    });
}

/**
 * 숫자 천 단위 구분자 포맷팅
 * @param {string|number} value - 숫자 값
 * @returns {string} 포맷된 숫자
 */
function formatNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('ko-KR');
}

/**
 * 면적 포맷팅
 * @param {string|number} value - 면적 값
 * @returns {string} 포맷된 면적
 */
function formatArea(value) {
    return formatNumber(value);
}

/**
 * 단위 라벨 반환
 * @param {string} unit - 단위 코드 ('pyeong' 또는 'm2')
 * @returns {string} 단위 라벨
 */
function getUnitLabel(unit) {
    return unit === 'pyeong' ? '평' : '㎡';
}

/**
 * 면적과 단위를 함께 포맷팅
 * @param {string|number} area - 면적 값
 * @param {string} unit - 단위 코드
 * @returns {string} 포맷된 문자열
 */
function formatAreaWithUnit(area, unit) {
    return `${formatArea(area)} ${getUnitLabel(unit)}`;
}

/**
 * 뷰 전환 함수 생성기
 * @param {Object} options - 옵션
 * @param {NodeList} options.views - 뷰 요소들
 * @param {NodeList} options.navItems - 네비게이션 버튼들
 * @param {Function} [options.onListView] - 목록 뷰 전환 시 콜백
 * @returns {Function} switchView 함수
 */
function createViewSwitcher(options) {
    const { views, navItems, onListView } = options;

    return function switchView(viewName) {
        views.forEach(view => view.classList.remove('active'));
        navItems.forEach(nav => nav.classList.remove('active'));

        const targetView = document.getElementById(`${viewName}View`);
        const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        // 목록 뷰로 전환 시 콜백 실행
        if (viewName === 'list' && typeof onListView === 'function') {
            onListView();
        }
    };
}

/**
 * 네비게이션 이벤트 핸들러 설정
 * @param {NodeList} navItems - 네비게이션 버튼들
 * @param {Function} switchView - 뷰 전환 함수
 */
function setupNavigation(navItems, switchView) {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            if (viewName) {
                switchView(viewName);
            }
        });
    });
}

/**
 * 연도 선택 핸들러 생성기
 * @param {Object} options - 옵션
 * @param {string} storageKeyPrefix - 스토리지 키 접두사
 * @param {Function} loadYearData - 연도 데이터 로드 함수
 * @param {Object} FileAPI - 파일 API 인스턴스
 * @param {Function} showToast - 토스트 메시지 함수
 * @returns {Object} { getStorageKey, setupYearSelect }
 */
function createYearHandler(options) {
    const { storageKeyPrefix, loadYearData, FileAPI, showToast } = options;

    /**
     * 년도별 스토리지 키 생성
     * @param {string} year - 연도
     * @returns {string} 스토리지 키
     */
    function getStorageKey(year) {
        return `${storageKeyPrefix}_${year}`;
    }

    /**
     * 연도 선택 이벤트 설정
     * @param {HTMLSelectElement} yearSelect - 연도 선택 요소
     * @param {Object} state - 상태 객체 (selectedYear 포함)
     */
    function setupYearSelect(yearSelect, state) {
        if (!yearSelect) return;

        yearSelect.addEventListener('change', async (e) => {
            state.selectedYear = e.target.value;
            loadYearData(state.selectedYear);

            // 자동 저장 경로도 연도별로 업데이트
            if (window.isElectron && FileAPI) {
                await FileAPI.updateAutoSavePath(state.selectedYear);
            }

            if (showToast) {
                showToast(`${state.selectedYear}년 데이터를 불러왔습니다.`, 'success');
            }
        });
    }

    return { getStorageKey, setupYearSelect };
}

/**
 * localStorage에서 안전하게 JSON 파싱
 * @param {string} key - localStorage 키
 * @param {*} defaultValue - 파싱 실패 시 기본값
 * @returns {*} 파싱된 값 또는 기본값
 */
function safeParseJSON(key, defaultValue = []) {
    try {
        const value = localStorage.getItem(key);
        if (!value) return defaultValue;
        return JSON.parse(value);
    } catch (error) {
        (window.logger?.error || console.error)(`JSON 파싱 오류 (${key}):`, error);
        return defaultValue;
    }
}

/**
 * localStorage 사용량 확인
 * @returns {Object} { used: number, total: number, percent: number }
 */
function getLocalStorageUsage() {
    let used = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            used += (localStorage[key].length + key.length) * 2; // UTF-16
        }
    }
    const total = window.STORAGE?.LOCAL_STORAGE_LIMIT_BYTES || 5 * 1024 * 1024;
    return {
        used,
        total,
        percent: Math.round((used / total) * 100),
        usedMB: (used / (1024 * 1024)).toFixed(2),
        totalMB: (total / (1024 * 1024)).toFixed(0)
    };
}

/**
 * localStorage에 안전하게 JSON 저장 (용량 초과 방지)
 * @param {string} key - localStorage 키
 * @param {*} data - 저장할 데이터
 * @param {Object} [options] - 옵션
 * @param {Function} [options.onQuotaExceeded] - 용량 초과 시 콜백
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 * @returns {boolean} 저장 성공 여부
 */
function safeSetJSON(key, data, options = {}) {
    const { onQuotaExceeded, showToast } = options;

    try {
        const jsonString = JSON.stringify(data);
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError' ||
            error.code === 22 || // Chrome
            error.code === 1014 || // Firefox
            error.message.includes('quota')) {

            (window.logger?.error || console.error)('localStorage 용량 초과:', error);

            const usage = getLocalStorageUsage();
            const message = `저장 공간이 부족합니다.\n현재 사용량: ${usage.usedMB}MB / ${usage.totalMB}MB (${usage.percent}%)\n\n오래된 데이터를 삭제하거나 JSON 파일로 백업 후 정리해주세요.`;

            if (showToast) {
                showToast('저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'error');
            } else {
                alert(message);
            }

            if (onQuotaExceeded) {
                onQuotaExceeded(usage);
            }

            return false;
        }

        (window.logger?.error || console.error)('localStorage 저장 오류:', error);
        return false;
    }
}

/**
 * 데이터 마이그레이션 (년도 없는 기존 데이터를 현재 년도로 이동)
 * @param {string} oldKey - 기존 스토리지 키
 * @param {string} newKey - 새 스토리지 키
 * @param {Function} log - 로그 함수
 * @returns {Array} 마이그레이션된 데이터
 */
function migrateOldData(oldKey, newKey, log = console.log) {
    const newData = safeParseJSON(newKey, []);
    if (newData.length > 0) return newData;

    const oldData = safeParseJSON(oldKey, []);
    if (oldData.length > 0) {
        localStorage.setItem(newKey, JSON.stringify(oldData));
        log('📂 기존 데이터를 년도별 저장소로 마이그레이션:', oldData.length, '건');
        return oldData;
    }

    return [];
}

/**
 * 자동 저장 상태 UI 업데이트
 * @param {string} status - 상태 (active, inactive, saving, error, pending, syncing)
 */
function updateAutoSaveStatus(status) {
    const autoSaveStatus = document.getElementById('autoSaveStatus');
    if (!autoSaveStatus) return;

    const statusDot = autoSaveStatus.querySelector('.status-dot');
    const statusText = autoSaveStatus.querySelector('.status-text');

    autoSaveStatus.classList.remove('hidden', 'active', 'saving', 'error');

    switch (status) {
        case 'active':
            autoSaveStatus.classList.add('active');
            if (statusText) statusText.textContent = '자동저장 활성';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'saving':
            autoSaveStatus.classList.add('saving');
            if (statusText) statusText.textContent = '저장 중...';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'syncing':
            autoSaveStatus.classList.add('saving');
            if (statusText) statusText.textContent = '동기화 중...';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'error':
            autoSaveStatus.classList.add('error');
            if (statusText) statusText.textContent = '저장 오류';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'pending':
            autoSaveStatus.classList.add('active');
            if (statusText) statusText.textContent = '대기 중';
            autoSaveStatus.classList.remove('hidden');
            break;
        case 'inactive':
        default:
            autoSaveStatus.classList.add('hidden');
            if (statusText) statusText.textContent = '';
            break;
    }
}

/**
 * 자동 저장 초기화 (Electron & Web 환경 지원)
 * @param {Object} options - 옵션
 * @param {string} options.moduleKey - 모듈 키 (soil, water, etc.)
 * @param {string} options.moduleName - 모듈 이름 (한글)
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {string} options.currentYear - 현재 연도
 * @param {Function} [options.log] - 로그 함수
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 */
async function initAutoSave(options) {
    const { moduleKey, moduleName, FileAPI, currentYear, log = console.log, showToast } = options;

    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const folderSelectedKey = `${moduleKey}AutoSaveFolderSelected`;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (window.isElectron) {
        // Electron 환경
        const hasSelectedFolder = localStorage.getItem(folderSelectedKey) === 'true';

        // 다른 시료 타입에서 이미 폴더를 선택했는지 확인 (앱 전체 공유)
        let folderAlreadyConfigured = hasSelectedFolder;
        if (!folderAlreadyConfigured) {
            try {
                const currentFolder = await window.electronAPI.getAutoSaveFolder();
                const appPath = await window.electronAPI.getAppPath();
                // 기본 경로가 아닌 사용자 지정 폴더가 있으면 이미 설정된 것
                if (currentFolder && currentFolder !== appPath) {
                    folderAlreadyConfigured = true;
                    localStorage.setItem(folderSelectedKey, 'true');
                    localStorage.setItem(enabledKey, 'true');
                    log(`📁 ${moduleName} 자동 저장 폴더 이미 설정됨 (다른 시료 타입에서):`, currentFolder);
                }
            } catch (e) {
                // getAutoSaveFolder/getAppPath 미지원 시 무시
            }
        }

        if (!folderAlreadyConfigured) {
            // 잠시 후 폴더 선택 다이얼로그 표시 (UI 로드 후)
            setTimeout(async () => {
                const confirmSelect = confirm(`${moduleName} 자동 저장 기능을 사용하시겠습니까?\n\n저장할 폴더를 선택해주세요.`);
                if (confirmSelect) {
                    try {
                        const result = await window.electronAPI.selectAutoSaveFolder();
                        if (result.success) {
                            FileAPI.autoSavePath = await window.electronAPI.getAutoSavePath(moduleKey, currentYear);
                            localStorage.setItem(folderSelectedKey, 'true');
                            localStorage.setItem(enabledKey, 'true');
                            if (autoSaveToggle) {
                                autoSaveToggle.checked = true;
                                autoSaveToggle.dispatchEvent(new Event('change'));
                            }
                            updateAutoSaveStatus('active');
                            log(`📁 ${moduleName} 자동 저장 폴더 설정됨:`, result.folder);
                        }
                    } catch (error) {
                        (window.logger?.error || console.error)('폴더 선택 오류:', error);
                    }
                }
            }, 500);
        } else {
            // 이전에 폴더를 선택한 경우, 자동 저장 경로 설정
            FileAPI.autoSavePath = await window.electronAPI.getAutoSavePath(moduleKey, currentYear);

            // 사용자가 설정한 자동저장 상태 복원 (기본값: true - 최초 폴더 선택 시 true로 설정됨)
            const autoSaveEnabled = localStorage.getItem(enabledKey) !== 'false';
            if (autoSaveToggle) {
                autoSaveToggle.checked = autoSaveEnabled;
            }
            updateAutoSaveStatus(autoSaveEnabled ? 'active' : 'inactive');
            log(`📁 ${moduleName} 자동 저장 경로:`, FileAPI.autoSavePath, '활성화:', autoSaveEnabled);
        }
    } else {
        // Web 환경 - 자동저장 상태 복원
        const autoSaveEnabled = localStorage.getItem(enabledKey) === 'true';
        if (autoSaveToggle && autoSaveEnabled) {
            autoSaveToggle.checked = true;
            updateAutoSaveStatus('pending');
        }
    }
}

/**
 * 자동 저장 파일에서 데이터 로드
 * @param {Object} FileAPI - 파일 API 인스턴스
 * @param {Function} [log] - 로그 함수
 * @returns {Promise<Array|null>} 로드된 데이터 또는 null
 */
async function loadFromAutoSaveFile(FileAPI, log = console.log) {
    if (!window.isElectron || !FileAPI.autoSavePath) return null;

    try {
        const content = await FileAPI.loadAutoSave();
        if (content) {
            const parsed = JSON.parse(content);
            const loadedData = parsed.data || parsed;
            if (Array.isArray(loadedData) && loadedData.length > 0) {
                log('📂 자동 저장 파일에서 데이터 로드:', loadedData.length, '건');
                return loadedData;
            }
        }
    } catch (error) {
        (window.logger?.error || console.error)('자동 저장 파일 로드 오류:', error);
    }
    return null;
}

/**
 * 자동 저장 수행 (Electron & Web 환경 지원)
 * @param {Object} options - 옵션
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {string} options.moduleKey - 모듈 키
 * @param {Array} options.data - 저장할 데이터
 * @param {Object} [options.webFileHandle] - Web File System API 파일 핸들
 * @param {Function} [options.log] - 로그 함수
 * @returns {Promise<boolean>} 성공 여부
 */
async function performAutoSave(options) {
    const { FileAPI, moduleKey, data, webFileHandle, log = console.log } = options;
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (localStorage.getItem(enabledKey) !== 'true') return false;

    const saveData = JSON.stringify({
        version: '2.0',
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        data: data
    }, null, 2);

    try {
        updateAutoSaveStatus('saving');

        if (window.isElectron) {
            // Electron 환경
            if (!FileAPI.autoSavePath) {
                updateAutoSaveStatus('error');
                return false;
            }
            const success = await FileAPI.autoSave(saveData);
            if (success) {
                log('💾 자동 저장 완료');
                updateAutoSaveStatus('active');
            } else {
                updateAutoSaveStatus('error');
            }
            return success;
        } else {
            // Web 환경
            if (!webFileHandle) {
                updateAutoSaveStatus('error');
                return false;
            }
            try {
                const writable = await webFileHandle.createWritable();
                await writable.write(saveData);
                await writable.close();
                log('💾 자동 저장 완료 (Web)');
                updateAutoSaveStatus('active');
                return true;
            } catch (error) {
                if (webFileHandle) {
                    (window.logger?.error || console.error)('Web 자동 저장 오류:', error);
                }
                updateAutoSaveStatus('error');
                return false;
            }
        }
    } catch (error) {
        (window.logger?.error || console.error)('자동 저장 오류:', error);
        updateAutoSaveStatus('error');
        return false;
    }
}

/**
 * 자동 저장 토글 이벤트 설정
 * @param {Object} options - 옵션
 * @param {string} options.moduleKey - 모듈 키
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {Function} options.getWebFileHandle - Web 파일 핸들 getter
 * @param {Function} options.setWebFileHandle - Web 파일 핸들 setter
 * @param {Function} options.autoSaveCallback - 자동 저장 실행 콜백
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 * @param {Function} [options.log] - 로그 함수
 */
function setupAutoSaveToggle(options) {
    const {
        moduleKey,
        FileAPI,
        getWebFileHandle,
        setWebFileHandle,
        autoSaveCallback,
        showToast,
        log = console.log
    } = options;

    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (!autoSaveToggle) return;

    autoSaveToggle.addEventListener('change', async () => {
        try {
            // 토글 OFF - 자동저장 비활성화
            if (!autoSaveToggle.checked) {
                if (setWebFileHandle) setWebFileHandle(null);
                localStorage.setItem(enabledKey, 'false');
                updateAutoSaveStatus('inactive');
                return;
            }

            // 토글 ON - 자동저장 활성화
            if (window.isElectron) {
                // Electron: 자동 저장 경로 사용
                localStorage.setItem(enabledKey, 'true');
                updateAutoSaveStatus('active');
                if (autoSaveCallback) await autoSaveCallback();
                if (showToast) showToast('자동 저장이 활성화되었습니다.', 'success');
            } else {
                // Web: 파일 선택 다이얼로그
                if (!('showSaveFilePicker' in window)) {
                    alert('이 브라우저는 자동 저장 기능을 지원하지 않습니다.\nChrome, Edge 브라우저를 사용해주세요.');
                    autoSaveToggle.checked = false;
                    return;
                }

                const today = new Date().toISOString().slice(0, 10);
                const handle = await window.showSaveFilePicker({
                    suggestedName: `시료접수대장_${today}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                if (setWebFileHandle) setWebFileHandle(handle);
                localStorage.setItem(enabledKey, 'true');
                updateAutoSaveStatus('active');
                if (autoSaveCallback) await autoSaveCallback();
                if (showToast) showToast('자동 저장이 활성화되었습니다.', 'success');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                autoSaveToggle.checked = false;
                updateAutoSaveStatus('inactive');
            } else {
                (window.logger?.error || console.error)('자동 저장 설정 오류:', error);
                alert('자동 저장 설정에 실패했습니다.');
                autoSaveToggle.checked = false;
                localStorage.setItem(enabledKey, 'false');
                updateAutoSaveStatus('inactive');
            }
        }
    });
}

/**
 * 자동 저장 폴더 선택 버튼 설정
 * @param {Object} options - 옵션
 * @param {string} options.moduleKey - 모듈 키
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {string} options.selectedYear - 현재 선택된 연도
 * @param {Function} options.getWebFileHandle - Web 파일 핸들 getter
 * @param {Function} options.setWebFileHandle - Web 파일 핸들 setter
 * @param {Function} options.autoSaveCallback - 자동 저장 실행 콜백
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 */
function setupAutoSaveFolderButton(options) {
    const {
        moduleKey,
        FileAPI,
        selectedYear,
        getWebFileHandle,
        setWebFileHandle,
        autoSaveCallback,
        showToast
    } = options;

    const selectAutoSaveFolderBtn = document.getElementById('selectAutoSaveFolderBtn');
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const enabledKey = `${moduleKey}AutoSaveEnabled`;

    if (!selectAutoSaveFolderBtn) return;

    if (window.isElectron) {
        // Electron 환경
        selectAutoSaveFolderBtn.addEventListener('click', async () => {
            try {
                const result = await window.electronAPI.selectAutoSaveFolder();
                if (result.success) {
                    FileAPI.autoSavePath = await window.electronAPI.getAutoSavePath(moduleKey, selectedYear);
                    if (showToast) showToast(`저장 폴더가 변경되었습니다:\n${result.folder}`, 'success');

                    if (autoSaveToggle && autoSaveToggle.checked) {
                        if (autoSaveCallback) await autoSaveCallback();
                    }
                } else if (!result.canceled) {
                    if (showToast) showToast('폴더 선택에 실패했습니다.', 'error');
                }
            } catch (error) {
                (window.logger?.error || console.error)('폴더 선택 오류:', error);
                if (showToast) showToast('폴더 선택 중 오류가 발생했습니다.', 'error');
            }
        });

        // 현재 폴더 경로를 툴팁에 표시
        (async () => {
            try {
                const folder = await window.electronAPI.getAutoSaveFolder();
                selectAutoSaveFolderBtn.title = `저장 폴더: ${folder}`;
            } catch (error) {
                (window.logger?.error || console.error)('폴더 경로 조회 오류:', error);
            }
        })();
    } else {
        // Web 환경
        selectAutoSaveFolderBtn.title = '자동저장 파일 선택';
        selectAutoSaveFolderBtn.addEventListener('click', async () => {
            try {
                if ('showSaveFilePicker' in window) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'sample-logs-autosave.json',
                        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
                    });
                    if (setWebFileHandle) setWebFileHandle(handle);
                    if (showToast) showToast('자동저장 파일이 설정되었습니다.', 'success');
                    if (autoSaveToggle) {
                        autoSaveToggle.checked = true;
                        localStorage.setItem(enabledKey, 'true');
                    }
                    if (autoSaveCallback) await autoSaveCallback();
                } else {
                    if (showToast) showToast('이 브라우저에서는 파일 선택을 지원하지 않습니다.', 'error');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    (window.logger?.error || console.error)('파일 선택 오류:', error);
                    if (showToast) showToast('파일 선택 중 오류가 발생했습니다.', 'error');
                }
            }
        });
    }
}

/**
 * 디버그 로그 함수 생성기
 * @param {boolean} debug - 디버그 모드 여부
 * @returns {Function} 로그 함수
 */
function createLogger(debug) {
    return (...args) => debug && (window.logger?.info || console.log)(...args);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param {Date|string} date - 날짜
 * @returns {string} 포맷된 날짜
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 오늘 날짜를 입력 요소에 설정
 * @param {HTMLInputElement} dateInput - 날짜 입력 요소
 */
function setTodayDate(dateInput) {
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
}

/**
 * UUID 생성 (간단한 버전)
 * @returns {string} UUID
 */
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 폴백: crypto.getRandomValues 기반
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * JSON 파일 저장 (공통 함수)
 * @param {Object} options - 옵션
 * @param {string} options.sampleType - 시료 타입 이름 (예: '토양', '수질분석')
 * @param {Array} options.data - 저장할 데이터 배열
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {string} options.filePrefix - 파일명 접두사 (예: 'soil-samples', '토양중금속')
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 * @returns {Promise<boolean>} 저장 성공 여부
 */
async function saveJSON(options) {
    const { sampleType, data, FileAPI, filePrefix, showToast } = options;

    if (!data || data.length === 0) {
        if (showToast) showToast('저장할 데이터가 없습니다.', 'error');
        return false;
    }

    const dataToSave = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        sampleType: sampleType,
        totalRecords: data.length,
        data: data
    };

    const content = JSON.stringify(dataToSave, null, 2);
    const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.json`;
    const success = await FileAPI.saveFile(content, fileName);

    if (success && showToast) {
        showToast('JSON 파일이 저장되었습니다.', 'success');
    }

    return success;
}

/**
 * JSON 데이터 병합 (ID 기반 중복 제거 지원)
 * @param {Array} currentData - 현재 데이터
 * @param {Array} loadedData - 불러온 데이터
 * @param {boolean} deduplicateById - ID 기반 중복 제거 여부
 * @returns {Array} 병합된 데이터
 */
function mergeJSONData(currentData, loadedData, deduplicateById) {
    if (deduplicateById) {
        const existingIds = new Set(currentData.map(item => item.id));
        const newData = loadedData.filter(item => !existingIds.has(item.id));
        return [...newData, ...currentData];
    }
    return [...currentData, ...loadedData];
}

/**
 * JSON 파일 불러오기 핸들러 설정 (파일 input 요소용)
 * @param {Object} options - 옵션
 * @param {HTMLInputElement} options.inputElement - 파일 input 요소
 * @param {Function} options.getData - 현재 데이터 getter
 * @param {Function} options.setData - 데이터 setter
 * @param {Function} options.saveData - 데이터 저장 함수
 * @param {Function} options.renderData - 데이터 렌더링 함수
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 * @param {boolean} [options.deduplicateById=false] - ID 기반 중복 제거 여부
 */
function setupJSONLoadHandler(options) {
    const { inputElement, getData, setData, saveData, renderData, showToast, deduplicateById = false } = options;

    if (!inputElement) return;

    inputElement.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const loadedData = parsed.data || parsed;

            if (Array.isArray(loadedData)) {
                const currentData = getData();
                if (currentData.length > 0 && confirm(`${loadedData.length}건의 데이터를 불러옵니다. 기존 데이터에 추가하시겠습니까?\n\n(취소 선택 시 기존 데이터를 대체합니다)`)) {
                    setData(mergeJSONData(currentData, loadedData, deduplicateById));
                } else {
                    setData(loadedData);
                }
                saveData();
                renderData();
                if (showToast) showToast(`${loadedData.length}건의 데이터를 불러왔습니다.`, 'success');
            } else {
                if (showToast) showToast('파일 형식이 올바르지 않습니다.', 'error');
            }
        } catch (error) {
            (window.logger?.error || console.error)('JSON 파일 로드 오류:', error);
            if (showToast) showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        }

        inputElement.value = '';
    });
}

/**
 * Electron 파일 메뉴 불러오기 핸들러 설정
 * @param {Object} options - 옵션
 * @param {HTMLElement} options.buttonElement - 불러오기 버튼 요소
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {Function} options.getData - 현재 데이터 getter
 * @param {Function} options.setData - 데이터 setter
 * @param {Function} options.saveData - 데이터 저장 함수
 * @param {Function} options.renderData - 데이터 렌더링 함수
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 * @param {boolean} [options.deduplicateById=false] - ID 기반 중복 제거 여부
 */
function setupElectronLoadHandler(options) {
    const { buttonElement, FileAPI, getData, setData, saveData, renderData, showToast, deduplicateById = false } = options;

    if (!buttonElement) return;

    buttonElement.addEventListener('click', async () => {
        const content = await FileAPI.openFile();
        if (!content) return;

        try {
            const parsed = JSON.parse(content);
            const loadedData = parsed.data || parsed;

            if (Array.isArray(loadedData)) {
                const currentData = getData();
                if (currentData.length > 0 && confirm(`${loadedData.length}건의 데이터를 불러옵니다. 기존 데이터에 추가하시겠습니까?\n\n(취소 선택 시 기존 데이터를 대체합니다)`)) {
                    setData(mergeJSONData(currentData, loadedData, deduplicateById));
                } else {
                    setData(loadedData);
                }
                saveData();
                renderData();
                if (showToast) showToast(`${loadedData.length}건의 데이터를 불러왔습니다.`, 'success');
            } else {
                if (showToast) showToast('파일 형식이 올바르지 않습니다.', 'error');
            }
        } catch (error) {
            (window.logger?.error || console.error)('JSON 파일 로드 오류:', error);
            if (showToast) showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        }
    });
}

/**
 * JSON 저장 버튼 핸들러 설정
 * @param {Object} options - 옵션
 * @param {HTMLElement} options.buttonElement - 저장 버튼 요소
 * @param {string} options.sampleType - 시료 타입 이름
 * @param {Function} options.getData - 데이터 getter
 * @param {Object} options.FileAPI - 파일 API 인스턴스
 * @param {string} options.filePrefix - 파일명 접두사
 * @param {Function} [options.showToast] - 토스트 메시지 함수
 */
function setupJSONSaveHandler(options) {
    const { buttonElement, sampleType, getData, FileAPI, filePrefix, showToast } = options;

    if (!buttonElement) return;

    buttonElement.addEventListener('click', async () => {
        await saveJSON({
            sampleType,
            data: getData(),
            FileAPI,
            filePrefix,
            showToast
        });
    });
}

// 전역으로 내보내기
window.SampleUtils = {
    // 포맷팅
    formatPhoneNumber,
    setupPhoneNumberInput,
    formatNumber,
    formatArea,
    getUnitLabel,
    formatAreaWithUnit,
    formatDate,

    // 뷰 & 네비게이션
    createViewSwitcher,
    setupNavigation,

    // 연도 & 데이터
    createYearHandler,
    safeParseJSON,
    safeSetJSON,
    getLocalStorageUsage,
    migrateOldData,

    // 자동 저장
    updateAutoSaveStatus,
    initAutoSave,
    loadFromAutoSaveFile,
    performAutoSave,
    setupAutoSaveToggle,
    setupAutoSaveFolderButton,

    // JSON 저장/불러오기
    saveJSON,
    mergeJSONData,
    setupJSONLoadHandler,
    setupElectronLoadHandler,
    setupJSONSaveHandler,

    // 유틸리티
    createLogger,
    setTodayDate,
    generateUUID
};
