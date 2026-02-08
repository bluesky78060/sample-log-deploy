/**
 * 프로덕션 환경을 위한 로깅 시스템
 * 개발 환경과 프로덕션 환경에서 다른 로깅 동작을 제공
 */

class Logger {
    constructor() {
        // Electron 환경에서 패키지 여부 확인
        this.isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
        this.isPackaged = this.isElectron && window.electronAPI?.isPackaged === true;

        // 개발 환경 여부
        this.isDev = !this.isPackaged &&
            (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

        // 로그 레벨 설정 (debug < info < warn < error)
        this.logLevel = this.isDev ? 'debug' : 'error';

        // 로그 버퍼 (프로덕션에서 에러 발생 시 컨텍스트 제공용)
        this.logBuffer = [];
        this.bufferSize = 50; // 최근 50개 로그 유지

        // 로그 레벨 숫자 맵
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        // 메서드 바인딩 (this 컨텍스트 유지)
        this.debug = this.debug.bind(this);
        this.info = this.info.bind(this);
        this.warn = this.warn.bind(this);
        this.error = this.error.bind(this);
        this.addToBuffer = this.addToBuffer.bind(this);
    }

    /**
     * 로그 레벨 설정
     * @param {string} level - 'debug', 'info', 'warn', 'error'
     */
    setLogLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
        }
    }

    /**
     * 로그 버퍼에 추가
     * @private
     */
    addToBuffer(level, args) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ')
        };

        this.logBuffer.push(entry);

        // 버퍼 크기 제한
        if (this.logBuffer.length > this.bufferSize) {
            this.logBuffer.shift();
        }
    }

    /**
     * 로그 출력 여부 확인
     * @private
     */
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.logLevel];
    }

    /**
     * 디버그 로그 (개발 환경에서만)
     */
    debug(...args) {
        this.addToBuffer('debug', args);

        if (this.shouldLog('debug')) {
            console.log('[DEBUG]', new Date().toLocaleTimeString(), ...args);
        }
    }

    /**
     * 정보성 로그
     */
    info(...args) {
        this.addToBuffer('info', args);

        if (this.shouldLog('info')) {
            console.info('[INFO]', new Date().toLocaleTimeString(), ...args);
        }
    }

    /**
     * 경고 로그
     */
    warn(...args) {
        this.addToBuffer('warn', args);

        if (this.shouldLog('warn')) {
            console.warn('[WARN]', new Date().toLocaleTimeString(), ...args);
        }
    }

    /**
     * 에러 로그 (항상 출력)
     */
    error(...args) {
        this.addToBuffer('error', args);

        // 에러는 항상 출력
        console.error('[ERROR]', new Date().toLocaleTimeString(), ...args);

        // 프로덕션에서는 에러 리포팅 서비스로 전송
        if (!this.isDev) {
            this.reportError(args);
        }
    }

    /**
     * 에러 리포팅 (프로덕션 전용)
     * @private
     */
    reportError(errorData) {
        // 에러 발생 시 최근 로그 버퍼도 함께 전송
        const errorReport = {
            error: errorData,
            context: this.logBuffer.slice(-20), // 최근 20개 로그
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            appVersion: window.electronAPI?.getVersion?.() || 'unknown'
        };

        // TODO: 실제 에러 리포팅 서비스 연동
        // 예: Sentry, LogRocket, Rollbar 등
        // 지금은 로컬 스토리지에 저장
        try {
            const errors = JSON.parse(localStorage.getItem('errorReports') || '[]');
            errors.push(errorReport);

            // 최대 100개 에러만 유지
            if (errors.length > 100) {
                errors.shift();
            }

            localStorage.setItem('errorReports', JSON.stringify(errors));
        } catch (e) {
            // 로컬 스토리지 에러는 무시
        }
    }

    /**
     * 성능 측정 시작
     */
    time(label) {
        if (this.shouldLog('debug')) {
            console.time(`[PERF] ${label}`);
        }
    }

    /**
     * 성능 측정 종료
     */
    timeEnd(label) {
        if (this.shouldLog('debug')) {
            console.timeEnd(`[PERF] ${label}`);
        }
    }

    /**
     * 테이블 형태로 데이터 출력 (개발용)
     */
    table(data) {
        if (this.shouldLog('debug')) {
            console.table(data);
        }
    }

    /**
     * 그룹 시작
     */
    group(label) {
        if (this.shouldLog('debug')) {
            console.group(`[GROUP] ${label}`);
        }
    }

    /**
     * 그룹 종료
     */
    groupEnd() {
        if (this.shouldLog('debug')) {
            console.groupEnd();
        }
    }

    /**
     * 조건부 로깅
     */
    assert(condition, ...args) {
        if (!condition) {
            this.error('Assertion failed:', ...args);
        }
    }

    /**
     * 로그 버퍼 내보내기
     */
    exportLogs() {
        return this.logBuffer;
    }

    /**
     * 로그 버퍼 초기화
     */
    clearBuffer() {
        this.logBuffer = [];
    }

    /**
     * 에러 리포트 가져오기 (디버깅용)
     */
    getErrorReports() {
        try {
            return JSON.parse(localStorage.getItem('errorReports') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * 에러 리포트 초기화
     */
    clearErrorReports() {
        localStorage.removeItem('errorReports');
    }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

// 전역 변수로 노출 (디버깅용)
if (typeof window !== 'undefined') {
    window.logger = logger;

    // 개발 환경에서 로그 레벨 변경 헬퍼
    window.setLogLevel = (level) => logger.setLogLevel(level);

    // console 메서드 대체 옵션 (선택적)
    if (typeof process !== 'undefined' && process.env?.REPLACE_CONSOLE === 'true') {
        window.console.log = (...args) => logger.debug(...args);
        window.console.info = (...args) => logger.info(...args);
        window.console.warn = (...args) => logger.warn(...args);
        // error는 대체하지 않음 (스택 트레이스 보존)
    }
}

// 브라우저 환경에서는 window.logger로 접근 가능
// CommonJS 호환성 (Node.js 환경용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logger, Logger };
}