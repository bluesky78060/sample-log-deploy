/**
 * @fileoverview 네트워크 기반 Firebase 접근 제어 모듈
 * @description 웹 환경에서만 특정 네트워크(게이트웨이)에서 Firebase 접근 허용
 *              Electron 환경에서는 항상 허용
 *
 * 설정 파일: network-config.js (gitignore 대상)
 * - window.NETWORK_CONFIG.ALLOWED_GATEWAY에서 게이트웨이 IP 로드
 * - 설정 파일이 없으면 웹 접근 거부 (보안 기본값)
 */

// logger는 logger.js에서 window.logger로 전역 설정됨

const NetworkAccess = {
    // localStorage 키
    STORAGE_KEY: 'networkAccessConfig',

    /**
     * 허용된 게이트웨이 IP 가져오기
     * network-config.js에서 로드, 없으면 null (접근 거부)
     * @returns {string|null}
     */
    getAllowedGateway() {
        return window.NETWORK_CONFIG?.ALLOWED_GATEWAY || null;
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
        // 웹 환경: 설정 파일의 게이트웨이 서브넷에서만 허용
        // ============================================================
        const allowedGateway = this.getAllowedGateway();

        // 설정 파일이 없으면 접근 거부 (보안 기본값)
        if (!allowedGateway) {
            logger.warn('[NetworkAccess] 네트워크 설정 없음 - 접근 거부');
            return { allowed: false, reason: '네트워크 설정 파일 없음 (network-config.js)', ip: null };
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
    }
};

// 전역으로 내보내기
window.NetworkAccess = NetworkAccess;

// 환경별 안내 메시지
if (window.electronAPI?.isElectron === true || window.location.protocol === 'file:') {
    // Electron 환경: 네트워크 체크 안함
    logger.info('[NetworkAccess] Electron 환경 - 네트워크 체크 비활성화 (항상 허용)');
} else {
    // 웹 환경: 네트워크 체크 활성화
    const gateway = NetworkAccess.getAllowedGateway();
    logger.info('[NetworkAccess] 웹 환경 - 네트워크 체크 활성화');
    if (gateway) {
        logger.info(`[NetworkAccess] 허용된 게이트웨이: ${gateway}`);
    } else {
        logger.warn('[NetworkAccess] 네트워크 설정 파일(network-config.js) 없음 - 모든 접근 거부됨');
    }
    console.log('  NetworkAccess.printStatus() - 현재 상태 확인');
    console.log('  NetworkAccess.registerCurrentAsAdmin() - 현재 IP를 관리자로 등록 (예외 허용)');
}
