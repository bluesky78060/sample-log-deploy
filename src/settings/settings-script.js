// Firebase 설정 저장 키 (firebase-config.js의 FIREBASE_CONFIG_KEY와 동일 값)
const SETTINGS_FIREBASE_KEY = 'firebase_config';
const SAMPLE_TYPES = [
    { key: 'soil', name: '토양', icon: '🌱', storagePrefix: 'test_soilSampleLogs' },
    { key: 'water', name: '수질분석', icon: '💧', storagePrefix: 'test_waterSampleLogs' },
    { key: 'pesticide', name: '잔류농약', icon: '🧪', storagePrefix: 'test_pesticideSampleLogs' },
    { key: 'compost', name: '가축분뇨퇴비', icon: '🐄', storagePrefix: 'test_compostSampleLogs' },
    { key: 'heavyMetal', name: '토양 중금속', icon: '⚗️', storagePrefix: 'test_heavyMetalSampleLogs' }
];

// Electron 환경 확인
const isElectron = window.electronAPI?.isElectron === true;

// ========================================
// 인증 파일 관련 함수 (Electron 전용)
// ========================================

// 인증 파일 상태 확인 및 UI 업데이트
async function checkAuthFileStatus() {
    const statusEl = document.getElementById('authFileStatus');
    const uploadArea = document.getElementById('authFileUploadArea');
    const infoArea = document.getElementById('authFileInfo');

    if (!isElectron) {
        // 웹 환경: localStorage에서 설정 확인
        if (window.firebaseConfig?.isEnabled?.()) {
            statusEl.className = 'status-badge connected';
            statusEl.textContent = '● 연결됨';
            uploadArea.style.display = 'none';
            infoArea.style.display = 'block';
            document.getElementById('authFileProjectId').textContent = '웹 환경 - 설정 저장됨';
        } else {
            statusEl.className = 'status-badge disconnected';
            statusEl.textContent = '● 미등록';
            uploadArea.style.display = 'block';
            infoArea.style.display = 'none';
        }
        // 웹 환경에서도 인증 파일 업로드 가능하도록 섹션 표시
        document.querySelector('#authFileSection .alert-info').innerHTML = sanitizeHTML(
            '<strong>인증 파일이란?</strong><br>' +
            'Firebase 접근을 위한 인증 파일을 업로드하면 자동으로 설정됩니다.<br>' +
            '<small style="color: #64748b;">(웹 환경: 설정이 브라우저에 저장됩니다)</small>'
        );
        return;
    }

    try {
        const result = await window.electronAPI.readAuthFile();

        if (result.exists && result.content) {
            try {
                const config = JSON.parse(result.content);
                if (config.projectId) {
                    // 인증 파일 등록됨
                    statusEl.className = 'status-badge connected';
                    statusEl.textContent = '● 등록됨';
                    uploadArea.style.display = 'none';
                    infoArea.style.display = 'block';
                    document.getElementById('authFileProjectId').textContent = `프로젝트: ${config.projectId}`;
                    return;
                }
            } catch (e) {
                console.error('인증 파일 파싱 오류:', e);
            }
        }

        // 인증 파일 미등록
        statusEl.className = 'status-badge disconnected';
        statusEl.textContent = '● 미등록';
        uploadArea.style.display = 'block';
        infoArea.style.display = 'none';
    } catch (error) {
        console.error('인증 파일 확인 오류:', error);
    }
}

// 인증 파일 저장
async function saveAuthFile(content) {
    try {
        // JSON 파싱 검증
        const config = JSON.parse(content);
        if (!config.apiKey || !config.projectId) {
            alert('유효하지 않은 인증 파일입니다.\nAPI Key와 Project ID가 필요합니다.');
            return false;
        }

        if (!isElectron) {
            // 웹 환경: localStorage에 저장
            if (window.firebaseConfig?.saveConfig) {
                window.firebaseConfig.saveConfig(config);
            }

            // Firebase 재초기화
            if (window.firebaseConfig?.reinitialize) {
                const initResult = await window.firebaseConfig.reinitialize();
                if (initResult) {
                    alert('인증 파일이 적용되고 Firebase가 연결되었습니다.\n프로젝트: ' + config.projectId);
                } else {
                    alert('인증 파일이 저장되었지만 Firebase 연결에 실패했습니다.\n페이지를 새로고침해주세요.');
                }
            } else {
                alert('인증 파일이 저장되었습니다.\n페이지를 새로고침하면 적용됩니다.');
            }
            await checkAuthFileStatus();
            updateConnectionStatus();
            return true;
        }

        // Electron 환경: 파일 시스템에 저장
        const result = await window.electronAPI.saveAuthFile(content);
        if (result.success) {
            // Firebase 재초기화 (새 인증 파일 적용)
            if (window.firebaseConfig?.reinitialize) {
                const initResult = await window.firebaseConfig.reinitialize();
                if (initResult) {
                    alert('인증 파일이 등록되고 Firebase가 연결되었습니다.\n프로젝트: ' + config.projectId);
                } else {
                    alert('인증 파일은 등록되었지만 Firebase 연결에 실패했습니다.\n앱을 재시작해주세요.');
                }
            } else {
                alert('인증 파일이 등록되었습니다.\n앱을 재시작하면 적용됩니다.');
            }
            await checkAuthFileStatus();
            updateConnectionStatus();
            return true;
        } else {
            alert('인증 파일 저장 실패: ' + (result.error || '알 수 없는 오류'));
            return false;
        }
    } catch (error) {
        alert('인증 파일 형식이 올바르지 않습니다.\nJSON 형식의 파일이 필요합니다.');
        return false;
    }
}

// 인증 파일 삭제
async function deleteAuthFile() {
    if (!confirm('인증 파일을 삭제하시겠습니까?\nFirebase 연결이 해제됩니다.')) {
        return;
    }

    if (!isElectron) {
        // 웹 환경: localStorage에서 삭제
        if (window.firebaseConfig?.resetConfig) {
            window.firebaseConfig.resetConfig();
        }
        alert('Firebase 설정이 삭제되었습니다.');
        await checkAuthFileStatus();
        updateConnectionStatus();
        return;
    }

    try {
        const result = await window.electronAPI.deleteAuthFile();
        if (result.success) {
            // Firebase 설정도 초기화
            if (window.firebaseConfig?.resetConfig) {
                window.firebaseConfig.resetConfig();
            }
            alert('인증 파일이 삭제되었습니다.');
            await checkAuthFileStatus();
            updateConnectionStatus();
        } else {
            alert('인증 파일 삭제 실패: ' + (result.error || '알 수 없는 오류'));
        }
    } catch (error) {
        alert('인증 파일 삭제 중 오류 발생: ' + error.message);
    }
}

// 파일 선택 버튼 클릭 (Electron 네이티브 다이얼로그 사용)
document.getElementById('selectAuthFileBtn')?.addEventListener('click', async () => {
    if (isElectron && window.electronAPI?.selectAuthFile) {
        // Electron 네이티브 파일 선택 다이얼로그
        try {
            const result = await window.electronAPI.selectAuthFile();
            if (result.canceled) {
                return;
            }
            if (result.success) {
                // Firebase 재초기화 (새 인증 파일 적용)
                if (window.firebaseConfig?.reinitialize) {
                    const initResult = await window.firebaseConfig.reinitialize();
                    if (initResult) {
                        alert('인증 파일이 등록되고 Firebase가 연결되었습니다.\n프로젝트: ' + result.projectId);
                    } else {
                        alert('인증 파일은 등록되었지만 Firebase 연결에 실패했습니다.\n앱을 재시작해주세요.');
                    }
                } else {
                    alert('인증 파일이 등록되었습니다.\n앱을 재시작하면 적용됩니다.\n프로젝트: ' + result.projectId);
                }
                await checkAuthFileStatus();
                updateConnectionStatus();
            } else {
                alert('인증 파일 등록 실패: ' + (result.error || '알 수 없는 오류'));
            }
        } catch (error) {
            alert('파일 선택 중 오류 발생: ' + error.message);
        }
    } else {
        // 웹 환경 폴백
        document.getElementById('authFileInput').click();
    }
});

// 파일 선택 처리 (웹 환경용)
document.getElementById('authFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        await saveAuthFile(event.target.result);
    };
    reader.readAsText(file);

    // 입력 초기화
    e.target.value = '';
});

// 인증 파일 삭제 버튼
document.getElementById('deleteAuthFileBtn')?.addEventListener('click', deleteAuthFile);

// 드래그 앤 드롭 지원
const uploadArea = document.getElementById('authFileUploadArea');
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.querySelector('div').style.borderColor = '#3b82f6';
        uploadArea.querySelector('div').style.background = '#eff6ff';
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.querySelector('div').style.borderColor = '#cbd5e1';
        uploadArea.querySelector('div').style.background = '#f8fafc';
    });

    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.querySelector('div').style.borderColor = '#cbd5e1';
        uploadArea.querySelector('div').style.background = '#f8fafc';

        const file = e.dataTransfer.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            await saveAuthFile(event.target.result);
        };
        reader.readAsText(file);
    });
}

// 수동 설정 토글
function toggleManualSettings() {
    const content = document.getElementById('manualSettingsContent');
    const toggle = document.getElementById('manualSettingsToggle');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲ 접기';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▼ 펼치기';
    }
}

// ========================================
// 기존 Firebase 설정 관련 함수
// ========================================

// 저장된 설정 로드
function loadSavedConfig() {
    const saved = localStorage.getItem(SETTINGS_FIREBASE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            document.getElementById('apiKey').value = config.apiKey || '';
            document.getElementById('projectId').value = config.projectId || '';
            document.getElementById('authDomain').value = config.authDomain || '';
            document.getElementById('storageBucket').value = config.storageBucket || '';
            document.getElementById('messagingSenderId').value = config.messagingSenderId || '';
            document.getElementById('appId').value = config.appId || '';
        } catch (e) {
            console.error('Firebase 설정 파싱 오류:', e);
            localStorage.removeItem(SETTINGS_FIREBASE_KEY);
        }
    }
}

// 설정 저장
document.getElementById('firebaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const config = {
        apiKey: document.getElementById('apiKey').value.trim(),
        projectId: document.getElementById('projectId').value.trim(),
        authDomain: document.getElementById('authDomain').value.trim(),
        storageBucket: document.getElementById('storageBucket').value.trim(),
        messagingSenderId: document.getElementById('messagingSenderId').value.trim(),
        appId: document.getElementById('appId').value.trim()
    };

    localStorage.setItem(SETTINGS_FIREBASE_KEY, JSON.stringify(config));

    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = 'status-badge';
    statusEl.style.background = '#e0f2fe';
    statusEl.style.color = '#0369a1';
    statusEl.textContent = '● 저장됨';

    alert('설정이 저장되었습니다. "연결 테스트" 버튼을 눌러 연결을 확인하세요.');
});

// 연결 상태 업데이트
function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (window.firebaseConfig?.isEnabled?.()) {
        statusEl.className = 'status-badge connected';
        statusEl.textContent = '● 연결됨';
        document.getElementById('migrateAllBtn').disabled = false;
    } else {
        statusEl.className = 'status-badge disconnected';
        statusEl.textContent = '● 미연결';
    }
}

// 연결 테스트
document.getElementById('testConnectionBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('connectionStatus');
    const authStatusEl = document.getElementById('authFileStatus');

    statusEl.className = 'status-badge';
    statusEl.style.background = '#fef3c7';
    statusEl.style.color = '#92400e';
    statusEl.textContent = '● 연결 중...';

    try {
        // Firebase 초기화 시도
        const initialized = await window.firebaseConfig.initialize();

        if (initialized) {
            statusEl.className = 'status-badge connected';
            statusEl.style.background = '#dcfce7';
            statusEl.style.color = '#16a34a';
            statusEl.textContent = '● 연결됨';

            if (authStatusEl) {
                authStatusEl.className = 'status-badge connected';
                authStatusEl.textContent = '● 연결됨';
            }

            document.getElementById('migrateAllBtn').disabled = false;
            renderMigrationList();
            alert('Firebase 연결 성공!');
        } else {
            statusEl.className = 'status-badge disconnected';
            statusEl.style.background = '#fef3c7';
            statusEl.style.color = '#d97706';
            statusEl.textContent = '● 미연결';

            if (isElectron) {
                alert('Firebase 연결 실패.\n인증 파일이 등록되어 있는지 확인하세요.');
            } else {
                alert('Firebase 연결 실패.\n수동 설정값을 확인해주세요.');
            }
        }
    } catch (error) {
        statusEl.className = 'status-badge error';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#dc2626';
        statusEl.textContent = '● 연결 실패';
        console.error('연결 테스트 실패:', error);
        alert('연결 실패: ' + error.message);
    }
});

// 마이그레이션 목록 렌더링 (모든 연도 포함, DOM API 사용 - XSS 방지)
function renderMigrationList() {
    const container = document.getElementById('migrationList');
    const currentYear = new Date().getFullYear();
    const MIN_YEAR = 2020;

    container.innerHTML = '';

    SAMPLE_TYPES.forEach(type => {
        // 모든 연도의 데이터 수집
        let totalCount = 0;
        const yearDetails = [];

        for (let year = MIN_YEAR; year <= currentYear; year++) {
            const storageKey = `${type.storagePrefix}_${year}`;
            const data = localStorage.getItem(storageKey);
            let count = 0;
            if (data) {
                try { count = JSON.parse(data).length; } catch (e) { console.error(`${storageKey} 파싱 오류:`, e); }
            }
            if (count > 0) {
                totalCount += count;
                yearDetails.push(`${year}년: ${count}건`);
            }
        }

        // DOM 요소 생성
        const item = document.createElement('div');
        item.className = 'migration-item';

        const info = document.createElement('div');
        info.className = 'migration-item-info';

        const icon = document.createElement('span');
        icon.className = 'migration-item-icon';
        icon.textContent = type.icon;

        const textDiv = document.createElement('div');

        const name = document.createElement('div');
        name.className = 'migration-item-name';
        name.textContent = type.name;

        const count = document.createElement('div');
        count.className = 'migration-item-count';
        count.textContent = `${totalCount}건 ${yearDetails.length > 0 ? '(' + yearDetails.join(', ') + ')' : ''}`;

        textDiv.appendChild(name);
        textDiv.appendChild(count);
        info.appendChild(icon);
        info.appendChild(textDiv);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.textContent = '마이그레이션';
        btn.disabled = totalCount === 0;
        btn.addEventListener('click', () => migrateTypeAllYears(type.key, type.storagePrefix));

        item.appendChild(info);
        item.appendChild(btn);
        container.appendChild(item);
    });
}

// 개별 타입의 모든 연도 마이그레이션
async function migrateTypeAllYears(sampleType, storagePrefix) {
    if (!window.storageManager?.isCloudEnabled()) {
        alert('Firebase가 연결되지 않았습니다.');
        return;
    }

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = 2020;
    let totalCount = 0;
    let successYears = [];

    try {
        for (let year = MIN_YEAR; year <= currentYear; year++) {
            const storageKey = `${storagePrefix}_${year}`;
            const data = localStorage.getItem(storageKey);
            if (data) {
                const result = await window.storageManager.migrate(sampleType, year, storageKey);
                if (result.success && result.count > 0) {
                    totalCount += result.count;
                    successYears.push(`${year}년: ${result.count}건`);
                }
            }
        }

        if (totalCount > 0) {
            alert(`마이그레이션 완료!\n\n총 ${totalCount}건\n${successYears.join('\n')}`);
            renderMigrationList();
        } else {
            alert('마이그레이션할 데이터가 없습니다.');
        }
    } catch (error) {
        alert('마이그레이션 중 오류 발생: ' + error.message);
    }
}

// 전체 마이그레이션 (모든 타입, 모든 연도)
document.getElementById('migrateAllBtn').addEventListener('click', async () => {
    if (!confirm('모든 데이터를 Firebase로 마이그레이션하시겠습니까?\n(2020년 ~ 현재 연도의 모든 데이터)')) {
        return;
    }

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = 2020;
    let totalCount = 0;
    let details = [];

    for (const type of SAMPLE_TYPES) {
        let typeCount = 0;

        for (let year = MIN_YEAR; year <= currentYear; year++) {
            const storageKey = `${type.storagePrefix}_${year}`;
            const data = localStorage.getItem(storageKey);
            if (data) {
                try {
                    const result = await window.storageManager.migrate(type.key, year, storageKey);
                    if (result.success && result.count > 0) {
                        totalCount += result.count;
                        typeCount += result.count;
                    }
                } catch (error) {
                    console.error(`${type.name} ${year}년 마이그레이션 실패:`, error);
                }
            }
        }

        if (typeCount > 0) {
            details.push(`${type.name}: ${typeCount}건`);
        }
    }

    alert(`전체 마이그레이션 완료!\n\n총 ${totalCount}건\n${details.join('\n')}`);
    renderMigrationList();
});

// 전체 데이터 내보내기
document.getElementById('exportAllBtn').addEventListener('click', () => {
    const currentYear = new Date().getFullYear();
    const allData = {};

    SAMPLE_TYPES.forEach(type => {
        const storageKey = `${type.storagePrefix}_${currentYear}`;
        const data = localStorage.getItem(storageKey);
        if (data) {
            try { allData[type.key] = JSON.parse(data); } catch (e) { console.error(`${type.key} 파싱 오류:`, e); }
        }
    });

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-log-backup-${currentYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// ========================================
// 캐시 관리 UI
// ========================================

// 캐시 상태 표시
function updateCacheStatusUI() {
    if (!window.CacheManager) return;

    const status = CacheManager.getCacheStatus();

    document.getElementById('cacheDataCount').textContent = `${status.totalKeys}건`;
    document.getElementById('cacheDataSize').textContent = `${status.totalSizeMB} MB`;

    const lastClearEl = document.getElementById('lastCacheClear');
    if (status.lastClear.lastClear) {
        const lastDate = status.lastClear.lastClear;
        lastClearEl.textContent = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')} ${String(lastDate.getHours()).padStart(2, '0')}:${String(lastDate.getMinutes()).padStart(2, '0')}`;
    } else {
        lastClearEl.textContent = '없음';
    }
}

// 캐시 삭제 버튼
document.getElementById('clearCacheBtn').addEventListener('click', () => {
    if (!confirm('캐시된 시료 데이터를 삭제하시겠습니까?\n\n삭제 후 앱을 새로고침하면 Firebase에서 데이터를 다시 불러옵니다.\n(Firebase 설정 및 연결 정보는 유지됩니다)')) {
        return;
    }

    if (window.CacheManager) {
        CacheManager.clearCache(true);
        updateCacheStatusUI();
    }
});

// 상태 새로고침 버튼
document.getElementById('refreshCacheStatusBtn').addEventListener('click', () => {
    updateCacheStatusUI();
});

// 초기 상태 표시
updateCacheStatusUI();

// ========================================
// 네트워크 접근 제어 UI
// ========================================

function initNetworkAccessUI() {
    if (!window.NetworkAccess) return;

    const statusEl = document.getElementById('networkAccessStatus');
    const envEl = document.getElementById('currentEnvironment');
    const gatewayEl = document.getElementById('allowedGateway');
    const publicIPEl = document.getElementById('currentPublicIP');
    const accessEl = document.getElementById('currentAccessStatus');
    const gatewayInput = document.getElementById('gatewayIPEdit');
    const saveGatewayBtn = document.getElementById('saveGatewayBtn');
    const deleteGatewayBtn = document.getElementById('deleteGatewayBtn');
    const gatewaySaveStatus = document.getElementById('gatewaySaveStatus');

    // 환경 표시
    const isElectron = window.electronAPI?.isElectron === true || window.location.protocol === 'file:';
    envEl.textContent = isElectron ? 'Electron (항상 허용)' : '웹 브라우저';

    // 게이트웨이 표시 업데이트
    function updateGatewayDisplay() {
        const allowedGateway = NetworkAccess.getAllowedGateway();
        if (allowedGateway) {
            gatewayEl.textContent = allowedGateway;
            gatewayEl.style.color = '';
            gatewayInput.value = allowedGateway;
        } else {
            gatewayEl.textContent = '설정 없음';
            gatewayEl.style.color = '#dc2626';
            gatewayInput.value = '';
        }
    }

    updateGatewayDisplay();

    // IP 유효성 검사
    function isValidIP(ip) {
        const parts = ip.trim().split('.');
        if (parts.length !== 4) return false;
        return parts.every(p => {
            const num = Number(p);
            return Number.isInteger(num) && num >= 0 && num <= 255;
        });
    }

    // 게이트웨이 저장
    saveGatewayBtn.addEventListener('click', () => {
        const ip = gatewayInput.value.trim();
        if (!ip) {
            gatewayInput.style.borderColor = '#dc2626';
            gatewayInput.placeholder = 'IP 주소를 입력하세요';
            return;
        }
        if (!isValidIP(ip)) {
            gatewayInput.style.borderColor = '#dc2626';
            gatewayInput.value = '';
            gatewayInput.placeholder = '올바른 IP 형식: 0~255.0~255.0~255.0~255';
            return;
        }
        NetworkAccess.saveGateway(ip);
        gatewayInput.style.borderColor = '';
        updateGatewayDisplay();
        refreshNetworkStatus();

        // 저장 완료 표시
        gatewaySaveStatus.style.display = 'inline';
        setTimeout(() => { gatewaySaveStatus.style.display = 'none'; }, 2000);

        if (window.showToast) {
            window.showToast('게이트웨이 IP가 저장되었습니다.', 'success');
        }
    });

    // 게이트웨이 삭제
    deleteGatewayBtn.addEventListener('click', () => {
        if (!confirm('게이트웨이 설정을 삭제하시겠습니까?\n다음 접속 시 재입력이 필요합니다.')) return;
        NetworkAccess.removeGateway();
        updateGatewayDisplay();
        refreshNetworkStatus();

        if (window.showToast) {
            window.showToast('게이트웨이 설정이 삭제되었습니다.', 'info');
        }
    });

    // 네트워크 상태 확인
    async function refreshNetworkStatus() {
        publicIPEl.textContent = '확인 중...';
        accessEl.textContent = '확인 중...';

        const publicIP = await NetworkAccess.getCurrentIP();
        publicIPEl.textContent = publicIP || '확인 불가';

        const access = await NetworkAccess.checkAccess();
        const reason = access.needsSetup ? '게이트웨이 미설정' : access.reason;
        accessEl.textContent = access.allowed ? `허용 (${reason})` : `거부 (${reason})`;
        accessEl.style.color = access.allowed ? '#16a34a' : '#dc2626';

        // 상태 배지 업데이트
        if (access.allowed) {
            statusEl.className = 'status-badge connected';
            statusEl.textContent = '● 허용';
        } else {
            statusEl.className = 'status-badge disconnected';
            statusEl.textContent = '● 거부';
        }

        // 게이트웨이 표시도 갱신
        updateGatewayDisplay();
    }

    document.getElementById('checkNetworkBtn').addEventListener('click', refreshNetworkStatus);

    // 초기 상태 확인
    refreshNetworkStatus();
}

initNetworkAccessUI();

// ========================================
// 기관명 설정
// ========================================
const DEFAULT_ORG_NAME = '봉화군농업기술센터 안전성분석센터';
const ORG_NAME_KEY = 'app_org_name';

function loadOrgName() {
    const saved = localStorage.getItem(ORG_NAME_KEY);
    document.getElementById('orgName').value = saved || DEFAULT_ORG_NAME;
}

document.getElementById('saveOrgNameBtn').addEventListener('click', () => {
    const value = document.getElementById('orgName').value.trim();
    if (!value) {
        alert('기관명을 입력해주세요.');
        return;
    }
    localStorage.setItem(ORG_NAME_KEY, value);
    const statusEl = document.getElementById('orgNameSaveStatus');
    statusEl.style.display = 'inline';
    setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
});

document.getElementById('resetOrgNameBtn').addEventListener('click', () => {
    if (!confirm('기관명을 기본값으로 복원하시겠습니까?')) return;
    localStorage.removeItem(ORG_NAME_KEY);
    document.getElementById('orgName').value = DEFAULT_ORG_NAME;
    const statusEl = document.getElementById('orgNameSaveStatus');
    statusEl.textContent = '기본값 복원됨';
    statusEl.style.display = 'inline';
    setTimeout(() => {
        statusEl.textContent = '저장됨';
        statusEl.style.display = 'none';
    }, 2000);
});

loadOrgName();

// ========================================
// 저장 모드 선택 UI
// ========================================

/**
 * 저장 모드 UI 초기화 — 현재 모드로 라디오 버튼 선택 + 가용 상태 반영
 */
function initStorageModeUI() {
    if (!window.storageManager) return;

    const currentMode = window.storageManager.getMode();
    const modes = window.storageManager.getAvailableModes();
    const statusEl = document.getElementById('storageModeStatus');

    // 모드별 라디오 + 라벨 상태 업데이트
    modes.forEach(mode => {
        const radio = document.querySelector(`input[name="storageMode"][value="${mode.value}"]`);
        const label = document.querySelector(`.storage-mode-option[data-mode="${mode.value}"]`);
        if (!radio || !label) return;

        radio.disabled = !mode.available;

        if (mode.value === currentMode) {
            radio.checked = true;
        }
    });

    // 상태 배지 업데이트
    updateStorageModeStatus(currentMode);

    // 라디오 변경 이벤트
    document.querySelectorAll('input[name="storageMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            changeStorageMode(e.target.value);
        });
    });
}

/**
 * 저장 모드 상태 배지 업데이트
 * @param {string} mode
 */
function updateStorageModeStatus(mode) {
    const statusEl = document.getElementById('storageModeStatus');
    if (!statusEl) return;

    const modeLabels = {
        'local': '로컬 전용',
        'cloud': '클라우드 동기화',
        'cloudOnly': '클라우드 전용'
    };

    statusEl.textContent = `● ${modeLabels[mode] || mode}`;

    if (mode === 'cloud') {
        statusEl.className = 'status-badge connected';
    } else if (mode === 'cloudOnly') {
        statusEl.className = 'status-badge';
        statusEl.style.background = '#dbeafe';
        statusEl.style.color = '#1d4ed8';
    } else {
        statusEl.className = 'status-badge disconnected';
    }
}

/**
 * 저장 모드 변경 처리
 * @param {string} newMode
 */
function changeStorageMode(newMode) {
    if (!window.storageManager) return;

    const currentMode = window.storageManager.getMode();
    if (newMode === currentMode) return;

    const modeLabels = {
        'local': '로컬 저장소만',
        'cloud': '클라우드 동기화',
        'cloudOnly': '클라우드 전용'
    };

    if (!confirm(`저장 모드를 "${modeLabels[newMode]}"(으)로 변경하시겠습니까?\n\n기존 데이터는 삭제되지 않습니다.\n변경 후 앱을 새로고침하면 새 모드가 적용됩니다.`)) {
        // 취소 시 원래 모드로 되돌림
        const radio = document.querySelector(`input[name="storageMode"][value="${currentMode}"]`);
        if (radio) radio.checked = true;
        return;
    }

    const result = window.storageManager.setMode(newMode);

    if (result.success) {
        updateStorageModeStatus(newMode);
        alert(`저장 모드가 "${modeLabels[newMode]}"(으)로 변경되었습니다.\n다른 시료 페이지에서는 새로고침 후 적용됩니다.`);
    } else {
        // 실패 시 원래 모드로 되돌림
        const radio = document.querySelector(`input[name="storageMode"][value="${currentMode}"]`);
        if (radio) radio.checked = true;
        alert(result.message);
    }
}

// 초기화
loadSavedConfig();
renderMigrationList();

// 인증 파일 상태 확인 (Electron)
checkAuthFileStatus();

// 연결 상태 확인 + 암호화 초기화
(async function() {
    if (window.storageManager) {
        const mode = await window.storageManager.init();
        const statusEl = document.getElementById('connectionStatus');
        if (mode === 'cloud' || mode === 'cloudOnly') {
            statusEl.className = 'status-badge connected';
            statusEl.textContent = '● 연결됨';
            document.getElementById('migrateAllBtn').disabled = false;

            // 인증 파일 섹션도 연결됨으로 표시
            const authStatusEl = document.getElementById('authFileStatus');
            if (authStatusEl) {
                authStatusEl.className = 'status-badge connected';
                authStatusEl.textContent = '● 연결됨';
            }
        }

        // 저장 모드 UI 초기화
        initStorageModeUI();
    }

    // Firebase + 암호화 초기화
    try {
        let fbOk = false;
        if (window.firebaseConfig?.initialize) {
            fbOk = await window.firebaseConfig.initialize();
            if (fbOk && window.firestoreDb?.init) {
                await window.firestoreDb.init();
            }
        }
        // 암호화는 Firebase 없이도 초기화 (로컬 모드 지원)
        if (window.encryptionManager?.init) {
            await window.encryptionManager.init();
        }
    } catch (err) {
        console.warn('[Settings] Firebase/Encryption init error:', err);
    }

    // 암호화 활성 시 비밀번호 확인 후 설정 표시
    const lockOverlay = document.getElementById('settingsLockOverlay');
    const settingsContent = document.getElementById('settingsContent');

    if (window.encryptionManager?.isReady()) {
        // 암호화 활성 → 비밀번호 확인 필요
        const verified = await showSettingsPasswordPrompt();
        if (!verified) {
            // 비밀번호 확인 실패/취소 → 메인 페이지로 이동
            window.location.href = '../index.html';
            return;
        }
    }

    // 비밀번호 확인 완료 또는 암호화 비활성 → 설정 표시
    lockOverlay.style.display = 'none';
    settingsContent.style.display = 'block';

    // 암호화 상태 UI 업데이트
    updateEncryptionStatusUI();
})();

// ========================================
// 설정 진입 비밀번호 확인
// ========================================

function showSettingsPasswordPrompt() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('settingsLockOverlay');
        overlay.innerHTML = `
            <div style="
                background: white; border-radius: 20px; padding: 36px;
                width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; flex-direction: column; gap: 20px;
            ">
                <div style="display: flex; justify-content: center;">
                    <div style="
                        width: 64px; height: 64px; border-radius: 50%;
                        background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                    </div>
                </div>
                <div style="text-align: center;">
                    <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #111827;">
                        설정 접근 확인
                    </h3>
                    <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                        설정 페이지에 접근하려면 암호화 비밀번호를 입력해주세요.
                    </p>
                </div>

                ${CryptoUtils.createPasswordRulesHTML('settings')}

                <div>
                    <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                    <div style="position: relative;">
                        <input type="password" id="settings-pw-input" placeholder="비밀번호를 입력하세요" maxlength="64"
                            style="
                                width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                border: 1px solid #D1D5DB; border-radius: 10px;
                                box-sizing: border-box; outline: none; background: #F9FAFB;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                        />
                        <button type="button" id="settings-toggle-pw" style="
                            position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                            background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                        " title="비밀번호 표시/숨기기">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                        </button>
                    </div>
                    <div id="settings-pw-error" style="
                        color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                    "></div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button id="settings-pw-cancel" style="
                        flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                        border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                        transition: background 0.2s;
                    ">돌아가기</button>
                    <button id="settings-pw-submit" style="
                        flex: 1; padding: 12px 20px; border: none;
                        background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                        color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                        transition: opacity 0.2s;
                    " disabled>확인</button>
                </div>
            </div>
        `;
        overlay.style.background = 'rgba(0,0,0,0.5)';

        const input = document.getElementById('settings-pw-input');
        const submitBtn = document.getElementById('settings-pw-submit');
        const cancelBtn = document.getElementById('settings-pw-cancel');
        const errDiv = document.getElementById('settings-pw-error');

        CryptoUtils.bindPasswordValidation({
            prefix: 'settings', input, submitBtn, submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)', verifyMode: true
        });

        // 비밀번호 표시/숨기기 토글
        const toggleBtn = document.getElementById('settings-toggle-pw');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                toggleBtn.innerHTML = isPassword
                    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            });
        }

        // 입력 포커스 스타일
        input.addEventListener('focus', () => { input.style.borderColor = '#22C55E'; input.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; });
        input.addEventListener('blur', () => { input.style.borderColor = '#D1D5DB'; input.style.boxShadow = 'none'; });

        // errDiv 숨기기를 input 이벤트에 추가
        input.addEventListener('input', () => { errDiv.style.display = 'none'; });

        // 상수 시간 문자열 비교 (타이밍 공격 방지)
        function timingSafeEqual(a, b) {
            if (typeof a !== 'string' || typeof b !== 'string') return false;
            const len = Math.max(a.length, b.length);
            let result = a.length ^ b.length;
            for (let i = 0; i < len; i++) { result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); }
            return result === 0;
        }

        async function submit() {
            const pw = input.value;
            if (!pw) {
                errDiv.textContent = '비밀번호를 입력해주세요.';
                errDiv.style.display = 'block';
                return;
            }

            // 1차: 세션 비밀번호와 비교 (상수 시간)
            let verified = false;
            if (window.electronAPI?.getSessionPassword) {
                const storedPw = await window.electronAPI.getSessionPassword();
                if (storedPw && timingSafeEqual(pw, storedPw)) {
                    verified = true;
                }
            }

            // 2차: 세션 비밀번호 없으면 encryptionManager.verifyPassword로 검증
            if (!verified && window.encryptionManager?.verifyPassword) {
                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = '확인 중...';
                    verified = await window.encryptionManager.verifyPassword(pw);
                } catch (e) {
                    console.warn('[Settings] Password verification failed:', e.message);
                    verified = false;
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '확인';
                }
            }

            if (!verified) {
                errDiv.textContent = '비밀번호가 올바르지 않습니다.';
                errDiv.style.display = 'block';
                input.style.borderColor = '#e74c3c';
                input.value = '';
                input.focus();
                return;
            }

            resolve(true);
        }

        submitBtn.addEventListener('click', submit);
        cancelBtn.addEventListener('click', () => resolve(false));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !submitBtn.disabled) submit();
            if (e.key === 'Escape') resolve(false);
        });
        input.addEventListener('input', () => {
            errDiv.style.display = 'none';
            input.style.borderColor = '#ddd';
        });
        setTimeout(() => input.focus(), 100);
    });
}

// ========================================
// 암호화 설정 UI
// ========================================

function updateEncryptionStatusUI() {
    const statusBadge = document.getElementById('encryptionStatus');
    const statusText = document.getElementById('encStatusText');
    const keySourceText = document.getElementById('encKeySourceText');
    const inactiveActions = document.getElementById('encInactiveActions');
    const activeActions = document.getElementById('encActiveActions');
    const migrationSection = document.getElementById('encMigrationSection');
    const decMigrationSection = document.getElementById('decMigrationSection');

    if (window.encryptionManager?.isReady()) {
        statusBadge.className = 'status-badge connected';
        statusBadge.textContent = '● 활성';
        statusText.textContent = '암호화 활성 (AES-256-GCM)';
        statusText.style.color = '#16a34a';

        const source = window.encryptionManager.getKeySource();
        const sourceMap = { firebase: 'Firebase 클라우드', local: '로컬 키 파일', generated: '새로 생성됨' };
        keySourceText.textContent = sourceMap[source] || source || '-';

        inactiveActions.style.display = 'none';
        activeActions.style.display = 'block';

        // 마이그레이션 섹션 표시 (암호화 활성 시)
        migrationSection.style.display = 'block';
        if (decMigrationSection) decMigrationSection.style.display = 'block';
    } else {
        statusBadge.className = 'status-badge disconnected';
        statusBadge.textContent = '● 비활성';
        statusText.textContent = '암호화 비활성 (비밀번호 미입력)';
        statusText.style.color = '#d97706';
        keySourceText.textContent = '-';

        inactiveActions.style.display = 'block';
        activeActions.style.display = 'none';

        // 복구 블롭 존재 여부 확인 → 복구 버튼 표시
        if (window.encryptionManager?.checkRecoveryBlobExists) {
            window.encryptionManager.checkRecoveryBlobExists().then(exists => {
                const recoverBtn = document.getElementById('encRecoverBtn');
                if (recoverBtn) {
                    recoverBtn.style.display = exists ? 'inline-block' : 'none';
                }
            });
        }

        // 암호화 비활성 시 마이그레이션 섹션 숨김
        migrationSection.style.display = 'none';
        if (decMigrationSection) decMigrationSection.style.display = 'none';
    }
}

// 비밀번호 입력 버튼 (비활성 상태에서)
document.getElementById('encEnterPwBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager) {
        // 초기화 재시도 (비밀번호 프롬프트 표시)
        window.encryptionManager.reset();
        try {
            // Firebase 초기화 시도 (실패해도 로컬 암호화는 계속)
            if (window.firebaseConfig?.initialize) {
                const fbOk = await window.firebaseConfig.initialize();
                if (fbOk && window.firestoreDb?.init) {
                    await window.firestoreDb.init();
                }
            }
            await window.encryptionManager.init();
        } catch (err) {
            console.warn('[Settings] Encryption init retry error:', err);
        }
        updateEncryptionStatusUI();
    }
});

// 비밀번호 변경 버튼
document.getElementById('encChangePwBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager?.changePassword) {
        const result = await window.encryptionManager.changePassword();
        updateEncryptionStatusUI();
    }
});

// 비밀번호 복구 버튼
document.getElementById('encRecoverBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager?.recoverPassword) {
        const result = await window.encryptionManager.recoverPassword();
        if (result.success) {
            updateEncryptionStatusUI();
        }
    }
});

// 복구 키 발급/재발급 버튼
document.getElementById('encRegenRecoveryBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager?.regenerateRecoveryKey) {
        const result = await window.encryptionManager.regenerateRecoveryKey();
        if (!result.success) {
            alert(result.message);
        }
    }
});

// ========================================
// 키 파일 내보내기/가져오기
// ========================================

document.getElementById('encExportKeyBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager?.exportKeyFile) {
        const result = await window.encryptionManager.exportKeyFile();
        if (!result.success && result.error !== '취소됨') {
            alert('키 파일 내보내기 실패: ' + result.error);
        }
    }
});

document.getElementById('encImportKeyBtn')?.addEventListener('click', async () => {
    if (window.encryptionManager?.importKeyFile) {
        const result = await window.encryptionManager.importKeyFile();
        if (result.success) {
            updateEncryptionStatusUI();
            alert('키 파일을 가져왔습니다.\n비밀번호를 입력하여 암호화를 활성화하세요.');
        } else if (result.error !== '취소됨') {
            alert('키 파일 가져오기 실패: ' + result.error);
        }
    }
});

document.getElementById('encImportKeyBtnInactive')?.addEventListener('click', async () => {
    if (window.encryptionManager?.importKeyFile) {
        const result = await window.encryptionManager.importKeyFile();
        if (result.success) {
            updateEncryptionStatusUI();
            alert('키 파일을 가져왔습니다.\n비밀번호를 입력하여 암호화를 활성화하세요.');
        } else if (result.error !== '취소됨') {
            alert('키 파일 가져오기 실패: ' + result.error);
        }
    }
});

// ========================================
// 암호화 마이그레이션
// ========================================

/** 스캔 결과 저장 (컬렉션별) */
let encMigrationScanResults = [];

/**
 * 평문 데이터 스캔 - Firebase 컬렉션 + 로컬 autosave 파일에서 _enc / _localEnc 유무 확인
 */
async function scanPlaintextData() {
    if (!window.encryptionManager?.isReady()) {
        alert('암호화가 활성화되어야 합니다. (비밀번호 입력 필요)');
        return;
    }

    const statusBadge = document.getElementById('encMigrationStatus');
    statusBadge.className = 'status-badge';
    statusBadge.style.background = '#fef3c7';
    statusBadge.style.color = '#92400e';
    statusBadge.textContent = '● 스캔 중...';

    const scanBtn = document.getElementById('scanPlaintextBtn');
    scanBtn.disabled = true;
    scanBtn.textContent = '스캔 중...';

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = 2020;
    encMigrationScanResults = [];

    try {
        // 1. Firebase 컬렉션 스캔
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                for (const type of SAMPLE_TYPES) {
                    for (let year = MIN_YEAR; year <= currentYear; year++) {
                        const collectionName = window.firestoreDb.getCollectionName(type.key, year);
                        try {
                            const snapshot = await db.collection(collectionName).get();
                            if (snapshot.empty) continue;

                            let plaintextCount = 0;
                            let encryptedCount = 0;

                            snapshot.forEach(doc => {
                                const data = doc.data();
                                if (data._enc) {
                                    encryptedCount++;
                                } else {
                                    plaintextCount++;
                                }
                            });

                            if (plaintextCount > 0 || encryptedCount > 0) {
                                encMigrationScanResults.push({
                                    source: 'firebase',
                                    type: type.key,
                                    typeName: type.name,
                                    typeIcon: type.icon,
                                    year,
                                    collectionName,
                                    plaintextCount,
                                    encryptedCount,
                                    totalCount: plaintextCount + encryptedCount
                                });
                            }
                        } catch (err) {
                            console.warn(`[Migration] ${collectionName} 스캔 실패:`, err.message);
                        }
                    }
                }
            }
        }

        // 2. 로컬 autosave 파일 스캔 (Electron 전용)
        if (isElectron) {
            for (const type of SAMPLE_TYPES) {
                for (let year = MIN_YEAR; year <= currentYear; year++) {
                    try {
                        const filePath = await window.electronAPI.getAutoSavePath(type.key, year);
                        if (!filePath) continue;

                        const result = await window.electronAPI.readFile(filePath);
                        if (!result.success || !result.content) continue;

                        const parsed = JSON.parse(result.content);
                        // 암호화되지 않은 평문 파일 (data 배열이 있고 _localEnc가 없는 경우)
                        if (parsed && !parsed._localEnc && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
                            encMigrationScanResults.push({
                                source: 'autosave',
                                type: type.key,
                                typeName: type.name,
                                typeIcon: type.icon,
                                year,
                                filePath,
                                plaintextCount: parsed.data.length,
                                encryptedCount: 0,
                                totalCount: parsed.data.length
                            });
                        }
                    } catch (err) {
                        // 파일 없거나 파싱 실패 - 무시
                    }
                }
            }
        }

        // 3. localStorage 데이터 스캔 (웹 로컬 모드)
        for (const type of SAMPLE_TYPES) {
            for (let year = MIN_YEAR; year <= currentYear; year++) {
                try {
                    const storageKey = `${type.storagePrefix}_${year}`;
                    const raw = localStorage.getItem(storageKey);
                    if (!raw) continue;

                    const data = JSON.parse(raw);
                    if (!Array.isArray(data) || data.length === 0) continue;

                    let plaintextCount = 0;
                    let encryptedCount = 0;
                    data.forEach(item => {
                        if (item._enc) {
                            encryptedCount++;
                        } else {
                            plaintextCount++;
                        }
                    });

                    if (plaintextCount > 0) {
                        encMigrationScanResults.push({
                            source: 'localStorage',
                            type: type.key,
                            typeName: type.name,
                            typeIcon: type.icon,
                            year,
                            storageKey,
                            plaintextCount,
                            encryptedCount,
                            totalCount: plaintextCount + encryptedCount
                        });
                    }
                } catch (err) {
                    // 파싱 실패 - 무시
                }
            }
        }

        renderEncMigrationList();

        const totalPlaintext = encMigrationScanResults.reduce((sum, r) => sum + r.plaintextCount, 0);
        if (totalPlaintext > 0) {
            statusBadge.className = 'status-badge';
            statusBadge.style.background = '#fef3c7';
            statusBadge.style.color = '#92400e';
            statusBadge.textContent = `● 평문 ${totalPlaintext}건`;
            document.getElementById('encryptAllBtn').disabled = false;
        } else {
            statusBadge.className = 'status-badge connected';
            statusBadge.textContent = '● 전체 암호화됨';
            document.getElementById('encryptAllBtn').disabled = true;
        }
    } catch (err) {
        console.error('[Migration] 스캔 오류:', err);
        statusBadge.className = 'status-badge error';
        statusBadge.textContent = '● 스캔 실패';
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 평문 데이터 스캔';
    }
}

/**
 * 스캔 결과 목록 렌더링 (DOM API 사용 - XSS 방지)
 */
function renderEncMigrationList() {
    const container = document.getElementById('encMigrationList');
    container.innerHTML = '';

    if (encMigrationScanResults.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align: center; color: #94a3b8; padding: 1rem;';
        empty.textContent = '데이터가 있는 컬렉션이 없습니다.';
        container.appendChild(empty);
        return;
    }

    encMigrationScanResults.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'migration-item';

        const info = document.createElement('div');
        info.className = 'migration-item-info';

        const icon = document.createElement('span');
        icon.className = 'migration-item-icon';
        icon.textContent = result.typeIcon;

        const textDiv = document.createElement('div');

        const name = document.createElement('div');
        name.className = 'migration-item-name';
        if (result.source === 'autosave') {
            name.textContent = `${result.typeName} ${result.year}년 (자동저장 파일)`;
        } else if (result.source === 'localStorage') {
            name.textContent = `${result.typeName} ${result.year}년 (로컬 데이터)`;
        } else {
            name.textContent = `${result.typeName} ${result.year}년 (Firebase)`;
        }

        const countDiv = document.createElement('div');
        countDiv.className = 'migration-item-count';

        if (result.plaintextCount > 0) {
            const plaintextSpan = document.createElement('span');
            plaintextSpan.style.color = '#dc2626';
            plaintextSpan.style.fontWeight = '600';
            plaintextSpan.textContent = `평문 ${result.plaintextCount}건`;
            countDiv.appendChild(plaintextSpan);

            if (result.encryptedCount > 0) {
                countDiv.appendChild(document.createTextNode(' / '));
            }
        }
        if (result.encryptedCount > 0) {
            const encSpan = document.createElement('span');
            encSpan.style.color = '#16a34a';
            encSpan.textContent = `암호화 ${result.encryptedCount}건`;
            countDiv.appendChild(encSpan);
        }

        textDiv.appendChild(name);
        textDiv.appendChild(countDiv);
        info.appendChild(icon);
        info.appendChild(textDiv);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.style.fontSize = '0.8rem';
        btn.style.padding = '0.5rem 1rem';

        if (result.plaintextCount > 0) {
            btn.textContent = '암호화';
            btn.addEventListener('click', () => encryptSingleItem(index));
        } else {
            btn.textContent = '완료';
            btn.disabled = true;
            btn.style.background = '#94a3b8';
        }

        item.appendChild(info);
        item.appendChild(btn);
        container.appendChild(item);
    });
}

/**
 * 단일 컬렉션의 평문 데이터를 암호화
 */
/** 마이그레이션 관련 모든 버튼 비활성화/활성화 */
function setMigrationButtonsEnabled(enabled) {
    const scanBtn = document.getElementById('scanPlaintextBtn');
    const encryptAllBtn = document.getElementById('encryptAllBtn');
    if (scanBtn) scanBtn.disabled = !enabled;
    if (encryptAllBtn) encryptAllBtn.disabled = !enabled;

    // 개별 컬렉션 암호화 버튼들
    const listContainer = document.getElementById('encMigrationList');
    if (listContainer) {
        listContainer.querySelectorAll('button').forEach(btn => {
            btn.disabled = !enabled;
        });
    }
}

async function encryptSingleItem(resultIndex) {
    const result = encMigrationScanResults[resultIndex];
    if (!result || result.plaintextCount === 0) return;

    let label;
    if (result.source === 'autosave') {
        label = `${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)`;
    } else if (result.source === 'localStorage') {
        label = `${result.typeName} ${result.year}년 로컬 데이터 (${result.plaintextCount}건)`;
    } else {
        label = `${result.typeName} ${result.year}년 Firebase 데이터 ${result.plaintextCount}건`;
    }

    if (!confirm(`${label}을(를) 암호화하시겠습니까?`)) {
        return;
    }

    // 모든 마이그레이션 버튼 비활성화 (레이스 컨디션 방지)
    setMigrationButtonsEnabled(false);

    try {
        if (result.source === 'autosave') {
            await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
        } else if (result.source === 'localStorage') {
            await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
        } else {
            await encryptPlaintextInCollection(result.collectionName, result.plaintextCount);
        }
    } finally {
        setMigrationButtonsEnabled(true);
    }

    // 재스캔
    await scanPlaintextData();
}

/**
 * 컬렉션 내 평문 데이터를 일괄 암호화
 * @param {string} collectionName - 컬렉션 이름
 * @param {number} expectedCount - 예상 평문 건수 (프로그레스용)
 */
async function encryptPlaintextInCollection(collectionName, expectedCount) {
    const db = window.firebaseConfig.getDb();
    const key = window.encryptionManager.getKey();
    if (!db || !key) return;

    const progressDiv = document.getElementById('encMigrationProgress');
    const progressBar = document.getElementById('encMigrationProgressBar');
    const progressText = document.getElementById('encMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${collectionName} 암호화 중...`;

    try {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) return;

        // 평문 문서만 필터
        const plaintextDocs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data._enc) {
                plaintextDocs.push({ ref: doc.ref, id: doc.id, data });
            }
        });

        if (plaintextDocs.length === 0) {
            progressText.textContent = '평문 데이터가 없습니다.';
            return;
        }

        const BATCH_SIZE = 200;
        let processed = 0;

        for (let i = 0; i < plaintextDocs.length; i += BATCH_SIZE) {
            const chunk = plaintextDocs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let batchHasOps = false;

            for (const { ref, id, data } of chunk) {
                try {
                    const encrypted = await window.CryptoUtils.encryptRecord({ ...data }, key);
                    const saveData = { ...encrypted };

                    if (encrypted._enc) {
                        // 민감 필드 평문 삭제
                        for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                            if (!(field in saveData) || saveData[field] === undefined) {
                                saveData[field] = firebase.firestore.FieldValue.delete();
                            }
                        }
                    } else {
                        // 민감 필드가 없는 레코드도 처리 완료 마커 추가
                        saveData._enc = { v: 1 };
                    }
                    saveData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

                    batch.set(ref, saveData, { merge: true });
                    batchHasOps = true;
                } catch (docErr) {
                    console.warn(`[Migration] ${collectionName}/${id}: 암호화 실패 -`, docErr.message);
                }

                processed++;
                const pct = Math.round((processed / plaintextDocs.length) * 100);
                progressBar.style.width = pct + '%';
                progressText.textContent = `${collectionName}: ${processed}/${plaintextDocs.length}건 처리 중...`;
            }

            if (batchHasOps) {
                await batch.commit();
            }
        }

        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
        progressText.textContent = `${collectionName}: ${processed}건 암호화 완료!`;

        console.log(`[Migration] ${collectionName}: ${processed}건 암호화 완료`);
    } catch (err) {
        console.error(`[Migration] ${collectionName} 암호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * 로컬 autosave 파일을 암호화
 */
async function encryptAutoSaveFile(filePath, typeName, year) {
    const progressDiv = document.getElementById('encMigrationProgress');
    const progressBar = document.getElementById('encMigrationProgressBar');
    const progressText = document.getElementById('encMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 중...`;

    try {
        const result = await window.electronAPI.readFile(filePath);
        if (!result.success || !result.content) {
            progressText.textContent = '파일 읽기 실패';
            progressBar.style.background = '#dc2626';
            return;
        }

        progressBar.style.width = '30%';

        // CryptoUtils.encryptForFile로 암호화
        const encrypted = await window.CryptoUtils.encryptForFile(result.content);
        if (!encrypted) {
            progressText.textContent = '암호화 실패';
            progressBar.style.background = '#dc2626';
            return;
        }

        progressBar.style.width = '70%';

        const writeResult = await window.electronAPI.writeFile(filePath, encrypted);
        if (writeResult.success) {
            progressBar.style.width = '100%';
            progressBar.style.background = '#22c55e';
            progressText.textContent = `${typeName} ${year}년 자동저장 파일 암호화 완료!`;
            console.log(`[Migration] ${typeName} ${year}년 autosave 암호화 완료`);
        } else {
            progressBar.style.background = '#dc2626';
            progressText.textContent = '파일 저장 실패';
        }
    } catch (err) {
        console.error(`[Migration] autosave 암호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * localStorage 데이터를 암호화
 * @param {string} storageKey - localStorage 키 (예: test_soilSampleLogs_2026)
 * @param {string} typeName - 시료 타입명
 * @param {number} year - 연도
 */
async function encryptLocalStorageData(storageKey, typeName, year) {
    const key = window.encryptionManager.getKey();
    if (!key) return;

    const progressDiv = document.getElementById('encMigrationProgress');
    const progressBar = document.getElementById('encMigrationProgressBar');
    const progressText = document.getElementById('encMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${typeName} ${year}년 로컬 데이터 암호화 중...`;

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            progressText.textContent = '데이터를 찾을 수 없습니다.';
            progressBar.style.background = '#dc2626';
            return;
        }

        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) {
            progressText.textContent = '암호화할 데이터가 없습니다.';
            return;
        }

        let processed = 0;
        const encryptedData = [];

        for (const item of data) {
            try {
                if (item._enc) {
                    // 이미 암호화된 항목은 그대로 유지
                    encryptedData.push(item);
                } else {
                    const encrypted = await window.CryptoUtils.encryptRecord({ ...item }, key);
                    encryptedData.push(encrypted);
                }
            } catch (itemErr) {
                console.warn(`[Migration] ${storageKey}: 항목 암호화 실패 -`, itemErr.message);
                encryptedData.push(item); // 실패 시 원본 유지
            }

            processed++;
            const pct = Math.round((processed / data.length) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = `${typeName} ${year}년: ${processed}/${data.length}건 처리 중...`;
        }

        // localStorage에 저장
        localStorage.setItem(storageKey, JSON.stringify(encryptedData));

        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
        progressText.textContent = `${typeName} ${year}년 로컬 데이터 ${processed}건 암호화 완료!`;
        console.log(`[Migration] ${storageKey}: ${processed}건 암호화 완료`);
    } catch (err) {
        console.error(`[Migration] ${storageKey} 암호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * 모든 평문 데이터를 일괄 암호화 (Firebase + autosave)
 */
async function encryptAllPlaintext() {
    const plaintextResults = encMigrationScanResults.filter(r => r.plaintextCount > 0);
    if (plaintextResults.length === 0) {
        alert('암호화할 평문 데이터가 없습니다.');
        return;
    }

    const firebaseResults = plaintextResults.filter(r => r.source === 'firebase');
    const autosaveResults = plaintextResults.filter(r => r.source === 'autosave');
    const localStorageResults = plaintextResults.filter(r => r.source === 'localStorage');

    const details = [];
    if (firebaseResults.length > 0) {
        const totalFb = firebaseResults.reduce((sum, r) => sum + r.plaintextCount, 0);
        details.push(`Firebase: ${totalFb}건`);
        firebaseResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
    }
    if (autosaveResults.length > 0) {
        details.push(`자동저장 파일: ${autosaveResults.length}개`);
        autosaveResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
    }
    if (localStorageResults.length > 0) {
        const totalLs = localStorageResults.reduce((sum, r) => sum + r.plaintextCount, 0);
        details.push(`로컬 데이터: ${totalLs}건`);
        localStorageResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년: ${r.plaintextCount}건`));
    }

    const totalPlaintext = plaintextResults.reduce((sum, r) => sum + r.plaintextCount, 0);
    if (!confirm(`총 ${totalPlaintext}건의 평문 데이터를 암호화하시겠습니까?\n\n${details.join('\n')}`)) {
        return;
    }

    // 모든 마이그레이션 버튼 비활성화 (레이스 컨디션 방지)
    setMigrationButtonsEnabled(false);

    try {
        for (const result of firebaseResults) {
            await encryptPlaintextInCollection(result.collectionName, result.plaintextCount);
        }
        for (const result of autosaveResults) {
            await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
        }
        for (const result of localStorageResults) {
            await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
        }
    } finally {
        setMigrationButtonsEnabled(true);
    }

    alert(`암호화 완료! 총 ${totalPlaintext}건이 처리되었습니다.`);

    // 재스캔
    await scanPlaintextData();
}

// 이벤트 리스너 등록
document.getElementById('scanPlaintextBtn')?.addEventListener('click', scanPlaintextData);
document.getElementById('encryptAllBtn')?.addEventListener('click', encryptAllPlaintext);

// ========================================
// 평문 마이그레이션 (복호화)
// ========================================

/** 복호화 스캔 결과 저장 */
let decMigrationScanResults = [];

/**
 * 암호화 데이터 스캔 - Firebase 컬렉션 + 로컬 autosave 파일
 */
async function scanEncryptedData() {
    if (!window.encryptionManager?.isReady()) {
        alert('암호화가 활성화되어야 합니다. (비밀번호 입력 필요)');
        return;
    }

    const statusBadge = document.getElementById('decMigrationStatus');
    statusBadge.className = 'status-badge';
    statusBadge.style.background = '#fef3c7';
    statusBadge.style.color = '#92400e';
    statusBadge.textContent = '● 스캔 중...';

    const scanBtn = document.getElementById('scanEncryptedBtn');
    scanBtn.disabled = true;
    scanBtn.textContent = '스캔 중...';

    const currentYear = new Date().getFullYear();
    const MIN_YEAR = 2020;
    decMigrationScanResults = [];

    try {
        // 1. Firebase 컬렉션 스캔
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                for (const type of SAMPLE_TYPES) {
                    for (let year = MIN_YEAR; year <= currentYear; year++) {
                        const collectionName = window.firestoreDb.getCollectionName(type.key, year);
                        try {
                            const snapshot = await db.collection(collectionName).get();
                            if (snapshot.empty) continue;

                            let encryptedCount = 0;
                            let plaintextCount = 0;
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                if (data._enc && data._enc.v) {
                                    encryptedCount++;
                                } else {
                                    plaintextCount++;
                                }
                            });

                            if (encryptedCount > 0) {
                                decMigrationScanResults.push({
                                    source: 'firebase',
                                    type: type.key,
                                    typeName: type.name,
                                    typeIcon: type.icon,
                                    year,
                                    collectionName,
                                    encryptedCount,
                                    plaintextCount,
                                    totalCount: encryptedCount + plaintextCount
                                });
                            }
                        } catch (err) {
                            console.warn(`[DecMigration] ${collectionName} 스캔 실패:`, err.message);
                        }
                    }
                }
            }
        }

        // 2. 로컬 autosave 파일 스캔 (Electron 전용) - 암호화/평문 모두 감지
        if (isElectron) {
            for (const type of SAMPLE_TYPES) {
                for (let year = MIN_YEAR; year <= currentYear; year++) {
                    try {
                        const filePath = await window.electronAPI.getAutoSavePath(type.key, year);
                        if (!filePath) continue;

                        const result = await window.electronAPI.readFile(filePath);
                        if (!result.success || !result.content) continue;

                        const parsed = JSON.parse(result.content);
                        if (parsed && parsed._localEnc && parsed.iv && parsed.ct) {
                            // 레거시 통째 암호화 파일
                            decMigrationScanResults.push({
                                source: 'autosave',
                                type: type.key,
                                typeName: type.name,
                                typeIcon: type.icon,
                                year,
                                filePath,
                                encryptedCount: 1,
                                plaintextCount: 0,
                                status: 'encrypted'
                            });
                        } else if (parsed && parsed._fileEnc && Array.isArray(parsed.data)) {
                            // 레코드별 필드 암호화 파일
                            const encCount = parsed.data.filter(r => r && r._enc).length;
                            decMigrationScanResults.push({
                                source: 'autosave',
                                type: type.key,
                                typeName: type.name,
                                typeIcon: type.icon,
                                year,
                                filePath,
                                encryptedCount: encCount,
                                plaintextCount: parsed.data.length - encCount,
                                status: 'encrypted'
                            });
                        } else if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
                            // 평문 파일
                            decMigrationScanResults.push({
                                source: 'autosave',
                                type: type.key,
                                typeName: type.name,
                                typeIcon: type.icon,
                                year,
                                filePath,
                                encryptedCount: 0,
                                plaintextCount: parsed.data.length,
                                status: 'plaintext'
                            });
                        }
                    } catch (err) {
                        // 파일 없거나 파싱 실패 - 무시
                    }
                }
            }
        }

        // 3. localStorage 데이터 스캔 (웹 로컬 모드)
        for (const type of SAMPLE_TYPES) {
            for (let year = MIN_YEAR; year <= currentYear; year++) {
                try {
                    const storageKey = `${type.storagePrefix}_${year}`;
                    const raw = localStorage.getItem(storageKey);
                    if (!raw) continue;

                    const data = JSON.parse(raw);
                    if (!Array.isArray(data) || data.length === 0) continue;

                    let encryptedCount = 0;
                    let plaintextCount = 0;
                    data.forEach(item => {
                        if (item._enc && item._enc.v) {
                            encryptedCount++;
                        } else {
                            plaintextCount++;
                        }
                    });

                    if (encryptedCount > 0 || plaintextCount > 0) {
                        decMigrationScanResults.push({
                            source: 'localStorage',
                            type: type.key,
                            typeName: type.name,
                            typeIcon: type.icon,
                            year,
                            storageKey,
                            encryptedCount,
                            plaintextCount,
                            totalCount: encryptedCount + plaintextCount
                        });
                    }
                } catch (err) {
                    // 파싱 실패 - 무시
                }
            }
        }

        renderDecMigrationList();

        const totalEncrypted = decMigrationScanResults.reduce((sum, r) => sum + r.encryptedCount, 0);
        const totalAutoPlaintext = decMigrationScanResults.filter(r => r.source === 'autosave' && r.status === 'plaintext').length;
        const totalItems = totalEncrypted + totalAutoPlaintext;
        if (totalItems > 0) {
            const parts = [];
            if (totalEncrypted > 0) parts.push(`암호화 ${totalEncrypted}건`);
            if (totalAutoPlaintext > 0) parts.push(`평문 파일 ${totalAutoPlaintext}개`);
            statusBadge.className = 'status-badge';
            statusBadge.style.background = '#fef3c7';
            statusBadge.style.color = '#92400e';
            statusBadge.textContent = `● ${parts.join(' / ')}`;
            document.getElementById('decryptAllBtn').disabled = totalEncrypted === 0;
        } else {
            statusBadge.className = 'status-badge connected';
            statusBadge.textContent = '● 데이터 없음';
            document.getElementById('decryptAllBtn').disabled = true;
        }
    } catch (err) {
        console.error('[DecMigration] 스캔 오류:', err);
        statusBadge.className = 'status-badge error';
        statusBadge.textContent = '● 스캔 실패';
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 암호화 데이터 스캔';
    }
}

/**
 * 복호화 스캔 결과 목록 렌더링
 */
function renderDecMigrationList() {
    const container = document.getElementById('decMigrationList');
    container.innerHTML = '';

    if (decMigrationScanResults.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align: center; color: #94a3b8; padding: 1rem;';
        empty.textContent = '암호화된 데이터가 없습니다.';
        container.appendChild(empty);
        return;
    }

    decMigrationScanResults.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'migration-item';

        const info = document.createElement('div');
        info.className = 'migration-item-info';

        const icon = document.createElement('span');
        icon.className = 'migration-item-icon';
        icon.textContent = result.typeIcon;

        const textDiv = document.createElement('div');

        const name = document.createElement('div');
        name.className = 'migration-item-name';
        if (result.source === 'firebase') {
            name.textContent = `${result.typeName} ${result.year}년 (Firebase)`;
        } else if (result.source === 'localStorage') {
            name.textContent = `${result.typeName} ${result.year}년 (로컬 데이터)`;
        } else {
            name.textContent = `${result.typeName} ${result.year}년 (자동저장 파일)`;
        }

        const countDiv = document.createElement('div');
        countDiv.className = 'migration-item-count';

        if (result.source === 'autosave') {
            const statusSpan = document.createElement('span');
            statusSpan.style.fontWeight = '600';
            if (result.status === 'encrypted') {
                statusSpan.style.color = '#2563eb';
                statusSpan.textContent = '🔒 암호화됨';
            } else {
                statusSpan.style.color = '#dc2626';
                statusSpan.textContent = `🔓 평문 ${result.plaintextCount}건`;
            }
            countDiv.appendChild(statusSpan);
        } else {
            const encSpan = document.createElement('span');
            encSpan.style.color = '#2563eb';
            encSpan.style.fontWeight = '600';
            encSpan.textContent = `암호화 ${result.encryptedCount}건`;
            countDiv.appendChild(encSpan);

            if (result.plaintextCount > 0) {
                countDiv.appendChild(document.createTextNode(' / '));
                const ptSpan = document.createElement('span');
                ptSpan.style.color = '#94a3b8';
                ptSpan.textContent = `평문 ${result.plaintextCount}건`;
                countDiv.appendChild(ptSpan);
            }
        }

        textDiv.appendChild(name);
        textDiv.appendChild(countDiv);
        info.appendChild(icon);
        info.appendChild(textDiv);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.style.fontSize = '0.8rem';
        btn.style.padding = '0.5rem 1rem';

        if (result.source === 'autosave' && result.status === 'plaintext') {
            btn.textContent = '암호화';
            btn.style.background = '#f59e0b';
            btn.addEventListener('click', () => encryptSingleAutoSave(index));
        } else if (result.source === 'localStorage' && result.encryptedCount > 0) {
            btn.textContent = '복호화';
            btn.addEventListener('click', () => decryptSingleItem(index));
        } else if (result.source === 'localStorage' && result.plaintextCount > 0) {
            btn.textContent = '암호화';
            btn.style.background = '#f59e0b';
            btn.addEventListener('click', () => encryptSingleLocalStorage(index));
        } else {
            btn.textContent = '복호화';
            btn.addEventListener('click', () => decryptSingleItem(index));
        }

        item.appendChild(info);
        item.appendChild(btn);
        container.appendChild(item);
    });
}

/**
 * 복호화 관련 버튼 활성화/비활성화
 */
function setDecMigrationButtonsEnabled(enabled) {
    const scanBtn = document.getElementById('scanEncryptedBtn');
    const decryptAllBtn = document.getElementById('decryptAllBtn');
    if (scanBtn) scanBtn.disabled = !enabled;
    if (decryptAllBtn) decryptAllBtn.disabled = !enabled;

    const listContainer = document.getElementById('decMigrationList');
    if (listContainer) {
        listContainer.querySelectorAll('button').forEach(btn => {
            btn.disabled = !enabled;
        });
    }
}

/**
 * 단일 autosave 파일 암호화 (복호화 섹션에서 평문 파일 암호화)
 */
async function encryptSingleAutoSave(resultIndex) {
    const result = decMigrationScanResults[resultIndex];
    if (!result || result.source !== 'autosave' || result.status !== 'plaintext') return;

    if (!confirm(`${result.typeName} ${result.year}년 자동저장 파일 (${result.plaintextCount}건)을 암호화하시겠습니까?`)) {
        return;
    }

    setDecMigrationButtonsEnabled(false);

    try {
        await encryptAutoSaveFile(result.filePath, result.typeName, result.year);
    } finally {
        setDecMigrationButtonsEnabled(true);
    }

    await scanEncryptedData();
}

/**
 * 단일 localStorage 항목 암호화 (복호화 섹션에서)
 */
async function encryptSingleLocalStorage(resultIndex) {
    const result = decMigrationScanResults[resultIndex];
    if (!result || result.source !== 'localStorage') return;

    if (!confirm(`${result.typeName} ${result.year}년 로컬 데이터 (${result.plaintextCount}건)을 암호화하시겠습니까?`)) {
        return;
    }

    setDecMigrationButtonsEnabled(false);

    try {
        await encryptLocalStorageData(result.storageKey, result.typeName, result.year);
    } finally {
        setDecMigrationButtonsEnabled(true);
    }

    await scanEncryptedData();
}

/**
 * 단일 항목 복호화
 */
async function decryptSingleItem(resultIndex) {
    const result = decMigrationScanResults[resultIndex];
    if (!result) return;

    let label;
    if (result.source === 'firebase') {
        label = `${result.typeName} ${result.year}년 Firebase 데이터 ${result.encryptedCount}건`;
    } else if (result.source === 'localStorage') {
        label = `${result.typeName} ${result.year}년 로컬 데이터 ${result.encryptedCount}건`;
    } else {
        label = `${result.typeName} ${result.year}년 자동저장 파일`;
    }

    if (!confirm(`${label}을(를) 평문으로 변환하시겠습니까?\n\n⚠️ 복호화 후 민감 정보가 노출됩니다.`)) {
        return;
    }

    setDecMigrationButtonsEnabled(false);

    try {
        if (result.source === 'firebase') {
            await decryptFirebaseCollection(result.collectionName, result.encryptedCount);
        } else if (result.source === 'localStorage') {
            await decryptLocalStorageData(result.storageKey, result.typeName, result.year);
        } else {
            await decryptAutoSaveFile(result.filePath, result.typeName, result.year);
        }
    } finally {
        setDecMigrationButtonsEnabled(true);
    }

    await scanEncryptedData();
}

/**
 * Firebase 컬렉션의 암호화 데이터를 평문으로 복호화
 */
async function decryptFirebaseCollection(collectionName, expectedCount) {
    const db = window.firebaseConfig.getDb();
    const key = window.encryptionManager.getKey();
    if (!db || !key) return;

    const progressDiv = document.getElementById('decMigrationProgress');
    const progressBar = document.getElementById('decMigrationProgressBar');
    const progressText = document.getElementById('decMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${collectionName} 복호화 중...`;

    try {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) return;

        const encryptedDocs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data._enc && data._enc.v) {
                encryptedDocs.push({ ref: doc.ref, id: doc.id, data });
            }
        });

        if (encryptedDocs.length === 0) {
            progressText.textContent = '암호화된 데이터가 없습니다.';
            return;
        }

        const BATCH_SIZE = 200;
        let processed = 0;

        for (let i = 0; i < encryptedDocs.length; i += BATCH_SIZE) {
            const chunk = encryptedDocs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let batchHasOps = false;

            for (const { ref, id, data } of chunk) {
                try {
                    const decrypted = await window.CryptoUtils.decryptRecord({ ...data }, key);
                    const saveData = { ...decrypted };

                    // _enc 필드 삭제
                    saveData._enc = firebase.firestore.FieldValue.delete();
                    saveData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

                    batch.set(ref, saveData, { merge: true });
                    batchHasOps = true;
                } catch (docErr) {
                    console.warn(`[DecMigration] ${collectionName}/${id}: 복호화 실패 -`, docErr.message);
                }

                processed++;
                const pct = Math.round((processed / encryptedDocs.length) * 100);
                progressBar.style.width = pct + '%';
                progressText.textContent = `${collectionName}: ${processed}/${encryptedDocs.length}건 복호화 중...`;
            }

            if (batchHasOps) {
                await batch.commit();
            }
        }

        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
        progressText.textContent = `${collectionName}: ${processed}건 평문 변환 완료!`;

        console.log(`[DecMigration] ${collectionName}: ${processed}건 복호화 완료`);
    } catch (err) {
        console.error(`[DecMigration] ${collectionName} 복호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * 로컬 autosave 파일의 암호화 데이터를 평문으로 복호화
 */
async function decryptAutoSaveFile(filePath, typeName, year) {
    const progressDiv = document.getElementById('decMigrationProgress');
    const progressBar = document.getElementById('decMigrationProgressBar');
    const progressText = document.getElementById('decMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${typeName} ${year}년 자동저장 파일 복호화 중...`;

    try {
        const result = await window.electronAPI.readFile(filePath);
        if (!result.success || !result.content) {
            progressText.textContent = '파일 읽기 실패';
            progressBar.style.background = '#dc2626';
            return;
        }

        progressBar.style.width = '30%';

        // CryptoUtils.decryptFromFile로 복호화
        const decrypted = await window.CryptoUtils.decryptFromFile(result.content);
        if (!decrypted) {
            progressText.textContent = '복호화 실패 (키 불일치 또는 데이터 손상)';
            progressBar.style.background = '#dc2626';
            return;
        }

        progressBar.style.width = '70%';

        // 평문 JSON으로 다시 저장
        const plainContent = JSON.stringify(decrypted, null, 2);
        const writeResult = await window.electronAPI.writeFile(filePath, plainContent);

        if (writeResult.success) {
            progressBar.style.width = '100%';
            progressBar.style.background = '#22c55e';
            progressText.textContent = `${typeName} ${year}년 자동저장 파일 평문 변환 완료!`;
            console.log(`[DecMigration] ${typeName} ${year}년 autosave 복호화 완료`);
        } else {
            progressBar.style.background = '#dc2626';
            progressText.textContent = '파일 저장 실패';
        }
    } catch (err) {
        console.error(`[DecMigration] autosave 복호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * localStorage 데이터를 복호화
 * @param {string} storageKey - localStorage 키
 * @param {string} typeName - 시료 타입명
 * @param {number} year - 연도
 */
async function decryptLocalStorageData(storageKey, typeName, year) {
    const key = window.encryptionManager.getKey();
    if (!key) return;

    const progressDiv = document.getElementById('decMigrationProgress');
    const progressBar = document.getElementById('decMigrationProgressBar');
    const progressText = document.getElementById('decMigrationProgressText');
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.background = '#3b82f6';
    progressText.textContent = `${typeName} ${year}년 로컬 데이터 복호화 중...`;

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            progressText.textContent = '데이터를 찾을 수 없습니다.';
            progressBar.style.background = '#dc2626';
            return;
        }

        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length === 0) {
            progressText.textContent = '복호화할 데이터가 없습니다.';
            return;
        }

        let processed = 0;
        const decryptedData = [];

        for (const item of data) {
            try {
                if (item._enc && item._enc.v) {
                    const decrypted = await window.CryptoUtils.decryptRecord({ ...item }, key);
                    // _enc 필드 제거
                    delete decrypted._enc;
                    decryptedData.push(decrypted);
                } else {
                    // 이미 평문인 항목은 그대로 유지
                    decryptedData.push(item);
                }
            } catch (itemErr) {
                console.warn(`[DecMigration] ${storageKey}: 항목 복호화 실패 -`, itemErr.message);
                decryptedData.push(item); // 실패 시 원본 유지
            }

            processed++;
            const pct = Math.round((processed / data.length) * 100);
            progressBar.style.width = pct + '%';
            progressText.textContent = `${typeName} ${year}년: ${processed}/${data.length}건 복호화 중...`;
        }

        // localStorage에 저장
        localStorage.setItem(storageKey, JSON.stringify(decryptedData));

        progressBar.style.width = '100%';
        progressBar.style.background = '#22c55e';
        progressText.textContent = `${typeName} ${year}년 로컬 데이터 ${processed}건 평문 변환 완료!`;
        console.log(`[DecMigration] ${storageKey}: ${processed}건 복호화 완료`);
    } catch (err) {
        console.error(`[DecMigration] ${storageKey} 복호화 오류:`, err);
        progressBar.style.background = '#dc2626';
        progressText.textContent = `오류: ${err.message}`;
    }
}

/**
 * 전체 암호화 데이터를 평문으로 일괄 변환
 */
async function decryptAllEncrypted() {
    if (decMigrationScanResults.length === 0) {
        alert('복호화할 암호화 데이터가 없습니다.');
        return;
    }

    const firebaseResults = decMigrationScanResults.filter(r => r.source === 'firebase');
    const autosaveResults = decMigrationScanResults.filter(r => r.source === 'autosave');
    const localStorageResults = decMigrationScanResults.filter(r => r.source === 'localStorage' && r.encryptedCount > 0);

    const details = [];
    if (firebaseResults.length > 0) {
        const totalFb = firebaseResults.reduce((sum, r) => sum + r.encryptedCount, 0);
        details.push(`Firebase: ${totalFb}건`);
        firebaseResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년: ${r.encryptedCount}건`));
    }
    if (autosaveResults.length > 0) {
        details.push(`자동저장 파일: ${autosaveResults.length}개`);
        autosaveResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년`));
    }
    if (localStorageResults.length > 0) {
        const totalLs = localStorageResults.reduce((sum, r) => sum + r.encryptedCount, 0);
        details.push(`로컬 데이터: ${totalLs}건`);
        localStorageResults.forEach(r => details.push(`  ${r.typeName} ${r.year}년: ${r.encryptedCount}건`));
    }

    if (!confirm(`전체 암호화 데이터를 평문으로 변환하시겠습니까?\n\n${details.join('\n')}\n\n⚠️ 복호화 후 민감 정보가 노출됩니다.`)) {
        return;
    }

    setDecMigrationButtonsEnabled(false);

    try {
        for (const result of firebaseResults) {
            await decryptFirebaseCollection(result.collectionName, result.encryptedCount);
        }
        for (const result of autosaveResults) {
            await decryptAutoSaveFile(result.filePath, result.typeName, result.year);
        }
        for (const result of localStorageResults) {
            await decryptLocalStorageData(result.storageKey, result.typeName, result.year);
        }
    } finally {
        setDecMigrationButtonsEnabled(true);
    }

    const total = decMigrationScanResults.reduce((sum, r) => sum + r.encryptedCount, 0);
    alert(`평문 변환 완료! 총 ${total}건이 처리되었습니다.`);

    await scanEncryptedData();
}

// 평문 마이그레이션 이벤트 리스너 등록
document.getElementById('scanEncryptedBtn')?.addEventListener('click', scanEncryptedData);
document.getElementById('decryptAllBtn')?.addEventListener('click', decryptAllEncrypted);
