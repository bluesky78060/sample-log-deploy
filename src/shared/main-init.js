// 매주 금요일 자동 캐시 클리어 체크
if (window.CacheManager) {
    CacheManager.checkAndAutoClean();
}

// 기관명 표시
(function() {
    const orgName = localStorage.getItem('app_org_name');
    if (orgName) {
        const el = document.getElementById('orgNameDisplay');
        if (el) el.textContent = orgName;
    }
})();

// 버전 정보 자동 표시
(async function() {
    const versionEl = document.getElementById('appVersion');
    if (window.electronAPI?.getVersion) {
        try {
            const version = await window.electronAPI.getVersion();
            if (version) versionEl.textContent = 'v' + version;
        } catch (e) {
            (window.logger?.info || console.info)('버전 정보 가져오기 실패:', e);
        }
    }
})();

// Firebase + 암호화 초기화 (앱 시작 시 비밀번호 프롬프트 표시)
(async function() {
    try {
        if (window.firebaseConfig?.initialize) {
            const initialized = await window.firebaseConfig.initialize();
            if (initialized && window.firestoreDb?.init) {
                await window.firestoreDb.init();
            }
        }
        // 암호화 매니저 초기화 (비밀번호 프롬프트 표시)
        if (window.firestoreDb?.isEnabled() && window.encryptionManager?.init) {
            await window.encryptionManager.init();
        }
    } catch (err) {
        (window.logger?.warn || console.warn)('Firebase/암호화 초기화:', err);
    }
})();

// 스토리지 매니저 초기화 및 동기화 상태 표시
(async function() {
    const syncStatusEl = document.getElementById('syncStatus');
    if (window.storageManager) {
        const mode = await window.storageManager.init();
        if (mode === 'cloud') {
            syncStatusEl.style.display = 'block';
            updateSyncStatus();
        }
    }
})();

// 동기화 상태 업데이트
function updateSyncStatus() {
    const syncStatusEl = document.getElementById('syncStatus');
    if (!syncStatusEl || !window.storageManager) return;

    const status = window.storageManager.getStatus();
    const iconEl = syncStatusEl.querySelector('.sync-icon');
    const textEl = syncStatusEl.querySelector('.sync-text');

    if (status.isOnline) {
        iconEl.textContent = '☁️';
        textEl.textContent = '클라우드 동기화';
        syncStatusEl.style.color = '#22c55e';
    } else {
        iconEl.textContent = '📴';
        textEl.textContent = '오프라인 모드';
        syncStatusEl.style.color = '#f59e0b';
    }
}

// 온라인/오프라인 상태 변경 감지
window.addEventListener('online', updateSyncStatus);
window.addEventListener('offline', updateSyncStatus);

// ========================================
// 전체 동기화 기능
// ========================================
const SAMPLE_TYPES = [
    { type: 'soil', name: '토양', icon: '🌱', storagePrefix: 'soilSampleLogs' },
    { type: 'water', name: '수질분석', icon: '💧', storagePrefix: 'waterSampleLogs' },
    { type: 'compost', name: '퇴·액비', icon: '🐄', storagePrefix: 'compostSampleLogs' },
    { type: 'heavyMetal', name: '토양 중금속', icon: '⚗️', storagePrefix: 'heavyMetalSampleLogs' },
    { type: 'pesticide', name: '잔류농약', icon: '🧪', storagePrefix: 'pesticideSampleLogs' }
];

const MIN_YEAR = 2020;
const syncBtn = document.getElementById('syncBtn');
const syncModal = document.getElementById('syncModal');
const syncModalBody = document.getElementById('syncModalBody');
const syncModalClose = document.getElementById('syncModalClose');
const syncModalOk = document.getElementById('syncModalOk');

// 모달 닫기
function closeSyncModal() {
    syncModal.classList.remove('show');
}

syncModalClose?.addEventListener('click', closeSyncModal);
syncModalOk?.addEventListener('click', closeSyncModal);
syncModal?.addEventListener('click', (e) => {
    if (e.target === syncModal) closeSyncModal();
});

// 전체 동기화 실행
async function syncAllData() {
    // Firebase가 아직 초기화되지 않았으면 초기화 시도
    if (!window.firestoreDb?.isEnabled()) {
        if (window.firebaseConfig?.initialize) {
            try {
                const initialized = await window.firebaseConfig.initialize();
                if (initialized) {
                    await window.firestoreDb?.init();
                }
            } catch (err) {
                (window.logger?.warn || console.warn)('Firebase 초기화 실패:', err);
            }
        }
    }

    // 초기화 후에도 여전히 비활성화 상태면 에러
    if (!window.firestoreDb?.isEnabled()) {
        alert('Firebase가 설정되지 않았습니다.\n설정 페이지에서 인증 파일을 등록해주세요.');
        return;
    }

    syncBtn.classList.add('syncing');
    const currentYear = new Date().getFullYear();
    const results = [];
    const totalSteps = SAMPLE_TYPES.length * (currentYear - MIN_YEAR + 1);
    let completedSteps = 0;

    // 진행 상태 모달 표시
    showSyncProgress(SAMPLE_TYPES);

    try {
        for (let i = 0; i < SAMPLE_TYPES.length; i++) {
            const sampleType = SAMPLE_TYPES[i];
            let totalLoaded = 0;
            let yearsWithData = [];

            // 현재 시료 타입 진행 중 표시
            updateSyncItemStatus(i, 'syncing', '동기화 중...');

            // 모든 연도 동기화 (2020년부터 현재 연도까지)
            for (let year = MIN_YEAR; year <= currentYear; year++) {
                try {
                    const cloudData = await window.firestoreDb.getAll(sampleType.type, year);
                    const storageKey = `${sampleType.storagePrefix}_${year}`;

                    if (cloudData && cloudData.length > 0) {
                        // Firebase 데이터를 localStorage에 저장
                        localStorage.setItem(storageKey, JSON.stringify(cloudData));
                        totalLoaded += cloudData.length;
                        yearsWithData.push({ year, count: cloudData.length });
                    }
                } catch (err) {
                    (window.logger?.error || console.error)(`${sampleType.name} ${year}년 동기화 오류:`, err);
                }

                // 진행률 업데이트
                completedSteps++;
                updateSyncProgress(completedSteps, totalSteps, `${sampleType.name} ${year}년...`);
            }

            // 완료 상태 업데이트
            const statusText = totalLoaded > 0 ? `${totalLoaded}건 완료` : '데이터 없음';
            updateSyncItemStatus(i, totalLoaded > 0 ? 'success' : '', statusText);

            results.push({
                type: sampleType.type,
                name: sampleType.name,
                icon: sampleType.icon,
                totalCount: totalLoaded,
                yearsWithData: yearsWithData,
                success: true
            });
        }

        // 결과 표시
        showSyncResults(results);

    } catch (error) {
        (window.logger?.error || console.error)('동기화 오류:', error);
        alert('동기화 중 오류가 발생했습니다: ' + error.message);
    } finally {
        syncBtn.classList.remove('syncing');
    }
}

// 동기화 진행 상태 모달 표시
function showSyncProgress(sampleTypes) {
    let html = `
        <div class="sync-progress">
            <div class="sync-progress-text">
                <span id="syncProgressLabel">준비 중...</span>
                <span id="syncProgressPercent">0%</span>
            </div>
            <div class="sync-progress-bar">
                <div class="sync-progress-fill" id="syncProgressFill"></div>
            </div>
        </div>
    `;

    sampleTypes.forEach((type, index) => {
        html += `
            <div class="sync-result-item" id="syncItem${index}">
                <div class="sync-result-type">
                    <span>${escapeHTML(type.icon)}</span>
                    <span>${escapeHTML(type.name)}</span>
                </div>
                <div class="sync-result-count" id="syncStatus${index}">대기 중</div>
            </div>
        `;
    });

    syncModalBody.innerHTML = html;
    syncModal.classList.add('show');
}

// 진행률 업데이트
function updateSyncProgress(completed, total, label) {
    const percent = Math.round((completed / total) * 100);
    const progressFill = document.getElementById('syncProgressFill');
    const progressLabel = document.getElementById('syncProgressLabel');
    const progressPercent = document.getElementById('syncProgressPercent');

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = label;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
}

// 개별 항목 상태 업데이트
function updateSyncItemStatus(index, statusClass, statusText) {
    const item = document.getElementById(`syncItem${index}`);
    const status = document.getElementById(`syncStatus${index}`);

    if (item) {
        item.className = `sync-result-item ${statusClass}`;
    }
    if (status) {
        status.className = `sync-result-count ${statusClass}`;
        status.textContent = statusText;
    }
}

// 동기화 결과 표시
function showSyncResults(results) {
    let totalItems = 0;
    let html = '';

    results.forEach(result => {
        totalItems += result.totalCount;
        const statusClass = result.totalCount > 0 ? 'success' : '';
        const yearInfo = result.yearsWithData.length > 0
            ? result.yearsWithData.map(y => `${y.year}년: ${y.count}건`).join(', ')
            : '데이터 없음';

        html += `
            <div class="sync-result-item">
                <div class="sync-result-type">
                    <span>${escapeHTML(result.icon)}</span>
                    <span>${escapeHTML(result.name)}</span>
                </div>
                <div class="sync-result-count ${statusClass}">
                    ${result.totalCount > 0 ? `${result.totalCount}건 동기화` : '데이터 없음'}
                </div>
            </div>
        `;
    });

    // 총합 표시
    html += `
        <div class="sync-result-item" style="margin-top: 1rem; background: linear-gradient(135deg, #22c55e20, #3b82f620);">
            <div class="sync-result-type">
                <span>📊</span>
                <span><strong>총 동기화</strong></span>
            </div>
            <div class="sync-result-count success">
                <strong>${totalItems}건</strong>
            </div>
        </div>
    `;

    syncModalBody.innerHTML = html;
    syncModal.classList.add('show');
}

// 동기화 버튼 클릭 이벤트
syncBtn?.addEventListener('click', syncAllData);

