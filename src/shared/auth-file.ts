/**
 * @fileoverview Firebase 인증 파일 관리 모듈
 * @description 인증 파일(.json)을 통한 Firebase 접근 제어
 */

/// <reference path="../types/globals.d.ts" />

/**
 * 인증 파일 체크 결과
 */
interface AuthCheckResult {
    valid: boolean;
    reason: string;
}

/**
 * 인증 파일 작업 결과
 */
interface AuthOperationResult {
    success: boolean;
    message: string;
}

/**
 * Firebase 설정 구조
 */
interface FirebaseAuthConfig {
    apiKey: string;
    projectId: string;
    authDomain?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
}

/**
 * AuthFile 인터페이스
 */
interface IAuthFile {
    AUTH_FILE_NAME: string;
    isElectron(): boolean;
    checkAuthFile(): Promise<AuthCheckResult>;
    saveAuthFile(content: string): Promise<AuthOperationResult>;
    deleteAuthFile(): Promise<AuthOperationResult>;
    isAuthenticated(): Promise<boolean>;
    resetCache(): void;
    showAuthFileFormat(): void;
}

/**
 * Window 인터페이스 확장
 */
declare global {
    interface Window {
        AuthFile?: IAuthFile;
    }
}

const AuthFile: IAuthFile = {
    // 인증 파일명
    AUTH_FILE_NAME: 'firebase-auth.json',

    // 캐시
    _isAuthenticated: null as boolean | null,
    _authChecked: false as boolean,

    /**
     * Electron 환경인지 확인
     * @returns boolean
     */
    isElectron(): boolean {
        return window.electronAPI?.isElectron === true;
    },

    /**
     * 인증 파일 존재 및 유효성 확인
     * @returns Promise<AuthCheckResult>
     */
    async checkAuthFile(): Promise<AuthCheckResult> {
        // 이미 체크한 경우 캐시 반환
        if (this._authChecked) {
            return {
                valid: this._isAuthenticated ?? false,
                reason: this._isAuthenticated ? '인증됨 (캐시)' : '미인증 (캐시)'
            };
        }

        // 웹 환경에서는 인증 파일 체크 불가 - 네트워크 체크로 대체
        if (!this.isElectron()) {
            (window.logger?.info || console.info)('[AuthFile] 웹 환경 - 인증 파일 체크 건너뜀');
            return { valid: true, reason: '웹 환경 (네트워크 체크 사용)' };
        }

        try {
            // Electron API를 통해 인증 파일 읽기
            if (!window.electronAPI?.readAuthFile) {
                (window.logger?.warn || console.warn)('[AuthFile] readAuthFile API 없음');
                return { valid: false, reason: 'API 미지원' };
            }

            const result = await window.electronAPI.readAuthFile();

            if (!result.exists) {
                (window.logger?.info || console.info)('[AuthFile] 인증 파일 없음');
                this._isAuthenticated = false;
                this._authChecked = true;
                return { valid: false, reason: '인증 파일 없음' };
            }

            // 파일 내용 검증 (JSON 형식의 Firebase 설정인지 확인)
            try {
                const config = JSON.parse(result.content || '') as Partial<FirebaseAuthConfig>;
                if (config.apiKey && config.projectId) {
                    this._isAuthenticated = true;
                    this._authChecked = true;
                    return { valid: true, reason: '인증 파일 유효' };
                } else {
                    this._isAuthenticated = false;
                    this._authChecked = true;
                    return { valid: false, reason: '인증 파일에 필수 설정(apiKey, projectId) 없음' };
                }
            } catch {
                this._isAuthenticated = false;
                this._authChecked = true;
                return { valid: false, reason: '인증 파일 형식 오류 (JSON 아님)' };
            }

        } catch (error) {
            const err = error as Error;
            (window.logger?.error || console.error)('[AuthFile] 인증 파일 확인 실패:', error);
            this._isAuthenticated = false;
            this._authChecked = true;
            return { valid: false, reason: '파일 읽기 오류: ' + err.message };
        }
    },

    /**
     * 인증 파일 저장 (설정 페이지에서 업로드 시)
     * @param content - 파일 내용
     * @returns Promise<AuthOperationResult>
     */
    async saveAuthFile(content: string): Promise<AuthOperationResult> {
        if (!this.isElectron()) {
            return { success: false, message: '웹 환경에서는 저장할 수 없습니다' };
        }

        try {
            if (!window.electronAPI?.saveAuthFile) {
                return { success: false, message: 'API 미지원' };
            }

            // JSON 형식 검증
            try {
                const config = JSON.parse(content) as Partial<FirebaseAuthConfig>;
                if (!config.apiKey || !config.projectId) {
                    return { success: false, message: '유효하지 않은 인증 파일입니다 (apiKey, projectId 필요)' };
                }
            } catch {
                return { success: false, message: '유효하지 않은 인증 파일입니다 (JSON 형식 아님)' };
            }

            const result = await window.electronAPI.saveAuthFile(content);

            if (result.success) {
                // 캐시 업데이트
                this._isAuthenticated = true;
                this._authChecked = true;
                return { success: true, message: '인증 파일이 저장되었습니다' };
            } else {
                return { success: false, message: result.error || '저장 실패' };
            }

        } catch (error) {
            const err = error as Error;
            (window.logger?.error || console.error)('[AuthFile] 인증 파일 저장 실패:', error);
            return { success: false, message: '저장 오류: ' + err.message };
        }
    },

    /**
     * 인증 파일 삭제
     * @returns Promise<AuthOperationResult>
     */
    async deleteAuthFile(): Promise<AuthOperationResult> {
        if (!this.isElectron()) {
            return { success: false, message: '웹 환경에서는 삭제할 수 없습니다' };
        }

        try {
            if (!window.electronAPI?.deleteAuthFile) {
                return { success: false, message: 'API 미지원' };
            }

            const result = await window.electronAPI.deleteAuthFile();

            if (result.success) {
                // 캐시 초기화
                this._isAuthenticated = false;
                this._authChecked = true;
                return { success: true, message: '인증 파일이 삭제되었습니다' };
            } else {
                return { success: false, message: result.error || '삭제 실패' };
            }

        } catch (error) {
            const err = error as Error;
            (window.logger?.error || console.error)('[AuthFile] 인증 파일 삭제 실패:', error);
            return { success: false, message: '삭제 오류: ' + err.message };
        }
    },

    /**
     * 인증 상태 확인 (간단 버전)
     * @returns Promise<boolean>
     */
    async isAuthenticated(): Promise<boolean> {
        const result = await this.checkAuthFile();
        return result.valid;
    },

    /**
     * 캐시 초기화 (재검증 필요 시)
     */
    resetCache(): void {
        this._isAuthenticated = null;
        this._authChecked = false;
    },

    /**
     * 인증 파일 형식 안내 (관리자용)
     */
    showAuthFileFormat(): void {
        (window.logger?.info || console.info)('Firebase 인증 파일은 다음 JSON 형식이어야 합니다:');
        (window.logger?.info || console.info)('{ "apiKey": "...", "projectId": "...", "authDomain": "..." }');
        (window.logger?.info || console.info)('설정 페이지에서 파일을 업로드하세요.');
    }
} as IAuthFile & { _isAuthenticated: boolean | null; _authChecked: boolean };

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.AuthFile = AuthFile;
}

// ES6 모듈 내보내기
export { AuthFile };
export type { AuthCheckResult, AuthOperationResult, FirebaseAuthConfig, IAuthFile };
