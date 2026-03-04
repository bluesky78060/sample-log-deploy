/**
 * @fileoverview 네트워크 기반 Firebase 접근 제어 모듈
 * @description 웹 환경에서만 특정 네트워크(게이트웨이)에서 Firebase 접근 허용
 *              Electron 환경에서는 항상 허용
 *
 * 게이트웨이 IP 우선순위:
 * 1. localStorage (사용자가 웹에서 직접 입력/설정에서 수정)
 * 2. network-config.js 파일 (gitignore 대상, 폴백)
 * 3. 없으면 → 최초 접속 시 입력 모달 표시
 */

// logger는 logger.js에서 window.logger로 전역 설정됨

const NetworkAccess = {
    // localStorage 키
    STORAGE_KEY: 'networkAccessConfig',
    GATEWAY_STORAGE_KEY: 'networkGatewayIP',

    /**
     * 허용된 게이트웨이 IP 가져오기
     * 우선순위: localStorage > network-config.js > null
     * @returns {string|null}
     */
    getAllowedGateway() {
        // 1. localStorage에서 먼저 확인
        try {
            const saved = localStorage.getItem(this.GATEWAY_STORAGE_KEY);
            if (saved) return saved;
        } catch (e) { /* ignore */ }
        // 2. network-config.js 폴백
        return window.NETWORK_CONFIG?.ALLOWED_GATEWAY || null;
    },

    /**
     * 게이트웨이 IP 저장 (localStorage)
     * @param {string} ip
     */
    saveGateway(ip) {
        try {
            localStorage.setItem(this.GATEWAY_STORAGE_KEY, ip);
            logger.info('[NetworkAccess] 게이트웨이 저장됨:', ip);
        } catch (e) {
            logger.error('[NetworkAccess] 게이트웨이 저장 실패:', e);
        }
    },

    /**
     * 저장된 게이트웨이 IP 삭제
     */
    removeGateway() {
        try {
            localStorage.removeItem(this.GATEWAY_STORAGE_KEY);
            logger.info('[NetworkAccess] 게이트웨이 삭제됨');
        } catch (e) { /* ignore */ }
    },

    // 기본 설정 (웹 환경에서 사용)
    defaultConfig: {
        // 관리자 IP (항상 허용)
        adminIPs: [],
        // IP 조회 타임아웃 (ms)
        timeout: 5000
    },

    // 현재 IP 캐시
    _currentIP: null,
    _lastCheck: null,
    _cacheTimeout: 60000, // 1분간 캐시

    /**
     * 설정 로드
     * @returns {Object}
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return { ...this.defaultConfig, ...JSON.parse(saved) };
            }
        } catch (e) {
            logger.error('[NetworkAccess] 설정 로드 실패:', e);
        }
        return { ...this.defaultConfig };
    },

    /**
     * 설정 저장
     * @param {Object} config
     */
    saveConfig(config) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
            logger.info('[NetworkAccess] 설정 저장됨:', config);
        } catch (e) {
            logger.error('[NetworkAccess] 설정 저장 실패:', e);
        }
    },

    /**
     * 현재 공인 IP 조회
     * @param {number} [timeoutMs] - 타임아웃 (ms), 미지정 시 설정값 사용
     * @returns {Promise<string|null>}
     */
    async getCurrentIP(timeoutMs) {
        // 캐시된 IP가 있고 유효하면 반환
        if (this._currentIP && this._lastCheck) {
            const elapsed = Date.now() - this._lastCheck;
            if (elapsed < this._cacheTimeout) {
                return this._currentIP;
            }
        }

        const configTimeout = timeoutMs || this.loadConfig().timeout;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), configTimeout);

            const response = await fetch('https://api.ipify.org?format=json', {
                signal: controller.signal
            });
            clearTimeout(timeout);

            const data = await response.json();
            this._currentIP = data.ip;
            this._lastCheck = Date.now();

            logger.info('[NetworkAccess] 현재 IP:', this._currentIP);
            return this._currentIP;

        } catch (error) {
            logger.warn('[NetworkAccess] IP 조회 실패:', error.message);
            return null;
        }
    },

    /**
     * IP에서 서브넷 프리픽스 추출 (예: '192.168.1.100' → '192.168.1.')
     * @param {string} ip
     * @returns {string}
     */
    getSubnetPrefix(ip) {
        if (!ip) return '';
        const parts = ip.split('.');
        if (parts.length !== 4) return '';
        return parts.slice(0, 3).join('.') + '.';
    },

    /**
     * 현재 IP가 허용된 네트워크인지 확인
     * @returns {Promise<{allowed: boolean, reason: string, ip: string|null}>}
     */
    async checkAccess() {
        // ============================================================
        // Electron 환경: 항상 허용 (네트워크 체크 안함)
        // ============================================================
        if (window.electronAPI?.isElectron === true) {
            return { allowed: true, reason: 'Electron 환경 (항상 허용)', ip: null };
        }

        // Electron 앱에서 file:// 프로토콜인 경우 (로컬 실행)
        if (window.location.protocol === 'file:') {
            return { allowed: true, reason: 'Electron 로컬 실행', ip: null };
        }

        // ============================================================
        // 웹 환경: 설정된 게이트웨이 서브넷에서만 허용
        // ============================================================
        const allowedGateway = this.getAllowedGateway();

        // 게이트웨이 설정이 없으면 입력 모달 표시
        if (!allowedGateway) {
            logger.warn('[NetworkAccess] 게이트웨이 설정 없음 - 입력 필요');
            return { allowed: false, reason: '게이트웨이 미설정', ip: null, needsSetup: true };
        }

        const allowedSubnet = this.getSubnetPrefix(allowedGateway);
        const currentIP = await this.getCurrentIP();

        if (!currentIP) {
            logger.warn('[NetworkAccess] IP 확인 불가 - 접근 거부');
            return { allowed: false, reason: 'IP 확인 불가', ip: null };
        }

        // 공인 IP가 허용된 서브넷인지 확인
        if (currentIP.startsWith(allowedSubnet)) {
            logger.info('[NetworkAccess] 허용된 네트워크:', currentIP);
            return { allowed: true, reason: `허용된 네트워크 (${allowedGateway})`, ip: currentIP };
        }

        // 관리자 IP 체크 (추가 허용)
        const config = this.loadConfig();
        if (config.adminIPs && config.adminIPs.includes(currentIP)) {
            return { allowed: true, reason: '관리자 IP', ip: currentIP };
        }

        logger.warn('[NetworkAccess] 허용되지 않은 네트워크:', currentIP);
        return { allowed: false, reason: `허용되지 않은 네트워크 (허용: ${allowedSubnet}x)`, ip: currentIP };
    },

    /**
     * Firebase 접근 허용 여부 (간단 버전)
     * @returns {Promise<boolean>}
     */
    async isAllowed() {
        const result = await this.checkAccess();
        return result.allowed;
    },

    // ========================================
    // 관리자 설정 함수들
    // ========================================

    /**
     * 관리자 IP 추가
     * @param {string} ip
     */
    addAdminIP(ip) {
        const config = this.loadConfig();
        if (!config.adminIPs.includes(ip)) {
            config.adminIPs.push(ip);
            this.saveConfig(config);
        }
    },

    /**
     * 관리자 IP 제거
     * @param {string} ip
     */
    removeAdminIP(ip) {
        const config = this.loadConfig();
        config.adminIPs = config.adminIPs.filter(i => i !== ip);
        this.saveConfig(config);
    },

    /**
     * 현재 IP를 관리자로 등록
     * @returns {Promise<string|null>} 등록된 IP
     */
    async registerCurrentAsAdmin() {
        const ip = await this.getCurrentIP();
        if (ip) {
            this.addAdminIP(ip);
            return ip;
        }
        return null;
    },

    /**
     * 설정 초기화
     */
    resetConfig() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.GATEWAY_STORAGE_KEY);
        this._currentIP = null;
        this._lastCheck = null;
        logger.info('[NetworkAccess] 설정 초기화됨');
    },

    /**
     * 현재 설정 상태 출력 (디버그용)
     */
    async printStatus() {
        const config = this.loadConfig();
        const currentIP = await this.getCurrentIP();
        const access = await this.checkAccess();
        const isElectron = window.electronAPI?.isElectron === true || window.location.protocol === 'file:';
        const allowedGateway = this.getAllowedGateway();

        console.log('========================================');
        logger.info('[NetworkAccess] 현재 상태');
        console.log('========================================');
        console.log('환경:', isElectron ? 'Electron (네트워크 체크 안함)' : '웹 (네트워크 체크 활성화)');
        console.log('허용된 게이트웨이:', allowedGateway || '설정 없음');
        console.log('허용된 서브넷:', allowedGateway ? this.getSubnetPrefix(allowedGateway) + 'x' : '없음');
        console.log('현재 공인 IP:', currentIP || '확인 불가');
        console.log('접근 허용:', access.allowed, `(${access.reason})`);
        console.log('관리자 IP (예외):', config.adminIPs || []);
        console.log('========================================');

        return { config, currentIP, access, isElectron, allowedGateway };
    },

    // ========================================
    // 게이트웨이 설정 모달 (웹 최초 접속용)
    // ========================================

    /**
     * 게이트웨이 IP 입력 모달 표시
     * @returns {Promise<string|null>} 입력된 게이트웨이 IP 또는 null (취소)
     */
    showGatewaySetupModal() {
        return new Promise((resolve) => {
            // 기존 모달이 있으면 제거
            const existing = document.getElementById('gatewaySetupModal');
            if (existing) existing.remove();

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

            const overlay = document.createElement('div');
            overlay.id = 'gatewaySetupModal';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', 'Noto Sans KR', sans-serif;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: ${isDark ? '#292524' : '#fff'}; border-radius: 16px;
                padding: 2rem; max-width: 420px; width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                color: ${isDark ? '#E7E5E4' : '#3C3530'};
            `;

            modal.innerHTML = `
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌐</div>
                    <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">네트워크 설정</h2>
                    <p style="font-size: 0.85rem; color: ${isDark ? '#A8A29E' : '#6B6460'}; line-height: 1.5;">
                        Firebase 데이터 접근을 위해<br>허용할 게이트웨이 IP를 입력하세요.
                    </p>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-size: 0.8rem; font-weight: 500; color: ${isDark ? '#A8A29E' : '#6B6460'}; margin-bottom: 0.5rem;">
                        게이트웨이 IP 주소
                    </label>
                    <input type="text" id="gatewayIPInput"
                        placeholder="예: 203.xxx.xxx.xxx"
                        style="width: 100%; padding: 0.75rem 1rem; border: 1.5px solid ${isDark ? '#57534E' : '#E8E4DF'};
                        border-radius: 8px; font-size: 0.95rem; font-family: monospace;
                        background: ${isDark ? '#1C1917' : '#FAFAF9'}; color: ${isDark ? '#E7E5E4' : '#3C3530'};
                        outline: none; transition: border-color 0.2s;">
                    <p style="font-size: 0.75rem; color: ${isDark ? '#78716C' : '#94a3b8'}; margin-top: 0.5rem;">
                        같은 서브넷(xxx.xxx.xxx.*)의 접속만 허용됩니다.<br>
                        나중에 설정 페이지에서 변경할 수 있습니다.
                    </p>
                </div>
                <div style="display: flex; gap: 0.75rem;">
                    <button id="gatewaySkipBtn" style="
                        flex: 1; padding: 0.7rem; border-radius: 8px; border: 1.5px solid ${isDark ? '#57534E' : '#E8E4DF'};
                        background: ${isDark ? '#1C1917' : '#f5f5f0'}; color: ${isDark ? '#A8A29E' : '#6B6460'};
                        font-size: 0.875rem; cursor: pointer; font-weight: 500;">
                        건너뛰기
                    </button>
                    <button id="gatewaySaveBtn" style="
                        flex: 1; padding: 0.7rem; border-radius: 8px; border: none;
                        background: #7C9082; color: white;
                        font-size: 0.875rem; cursor: pointer; font-weight: 500;">
                        저장
                    </button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const input = document.getElementById('gatewayIPInput');
            const saveBtn = document.getElementById('gatewaySaveBtn');
            const skipBtn = document.getElementById('gatewaySkipBtn');

            input.focus();

            // IP 유효성 검사 (기본)
            function isValidIP(ip) {
                const parts = ip.trim().split('.');
                if (parts.length !== 4) return false;
                return parts.every(p => {
                    const num = Number(p);
                    return Number.isInteger(num) && num >= 0 && num <= 255;
                });
            }

            input.addEventListener('focus', () => {
                input.style.borderColor = '#7C9082';
                input.style.boxShadow = '0 0 0 3px rgba(124, 144, 130, 0.12)';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = isDark ? '#57534E' : '#E8E4DF';
                input.style.boxShadow = 'none';
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveBtn.click();
            });

            saveBtn.addEventListener('click', () => {
                const ip = input.value.trim();
                if (!ip) {
                    input.style.borderColor = '#dc2626';
                    input.placeholder = 'IP 주소를 입력하세요';
                    return;
                }
                if (!isValidIP(ip)) {
                    input.style.borderColor = '#dc2626';
                    input.value = '';
                    input.placeholder = '올바른 IP 형식: 0~255.0~255.0~255.0~255';
                    return;
                }
                NetworkAccess.saveGateway(ip);
                overlay.remove();
                resolve(ip);
            });

            skipBtn.addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });
        });
    },

    /**
     * 웹 최초 접속 시 게이트웨이 설정 필요 여부 확인 후 모달 표시
     * @returns {Promise<boolean>} 설정 완료 여부
     */
    async promptGatewayIfNeeded() {
        // Electron 환경이면 불필요
        if (window.electronAPI?.isElectron === true || window.location.protocol === 'file:') {
            return true;
        }
        // 이미 게이트웨이가 설정되어 있으면 불필요
        if (this.getAllowedGateway()) {
            return true;
        }
        // 모달 표시
        const ip = await this.showGatewaySetupModal();
        return !!ip;
    }
};

// 전역으로 내보내기
window.NetworkAccess = NetworkAccess;

// 환경별 안내 메시지
if (window.electronAPI?.isElectron === true || window.location.protocol === 'file:') {
    logger.info('[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)');
} else {
    const gateway = NetworkAccess.getAllowedGateway();
    logger.info('[NetworkAccess] 웹 환경 - 네트워크 체크 활성화');
    if (gateway) {
        logger.info(`[NetworkAccess] 허용된 게이트웨이: ${gateway}`);
    } else {
        logger.warn('[NetworkAccess] 게이트웨이 미설정 - 최초 접속 시 입력 필요');
    }
}
