/**
 * 보안 스토리지 모듈
 * localStorage에 민감한 데이터를 암호화하여 저장
 *
 * 주의: 이것은 클라이언트 사이드 보호입니다.
 * 완벽한 보안을 위해서는 서버 사이드 보호가 필요합니다.
 */

/// <reference path="../types/globals.d.ts" />

/**
 * 보안 수준 타입
 */
type SecurityLevel = 'high' | 'low';

/**
 * SecureStorage 인터페이스
 */
interface ISecureStorage {
    setItem(key: string, data: unknown): Promise<boolean>;
    getItem<T = unknown>(key: string): Promise<T | null>;
    removeItem(key: string): void;
    clear(): void;
    rotateKey(): Promise<boolean>;
    getSecurityLevel(): SecurityLevel;
}

/**
 * Window 인터페이스 확장
 */
declare global {
    interface Window {
        secureStorage?: SecureStorage;
        SecureStorage?: typeof SecureStorage;
    }
}

class SecureStorage implements ISecureStorage {
    private encryptionKey: string;
    private cryptoAvailable: boolean;

    constructor() {
        // 암호화 키 생성 또는 복원
        this.encryptionKey = this.getOrCreateKey();

        // Web Crypto API 사용 가능 여부
        this.cryptoAvailable = typeof crypto !== 'undefined' && !!crypto.subtle;

        if (!this.cryptoAvailable) {
            (window.logger?.error || console.error)('[SecureStorage] ⚠️ Web Crypto API를 사용할 수 없습니다.');
            (window.logger?.error || console.error)('[SecureStorage] ⚠️ 민감한 데이터 암호화가 불가능합니다.');
            (window.logger?.error || console.error)('[SecureStorage] ⚠️ 최신 브라우저를 사용하거나 HTTPS 환경에서 실행하세요.');
        }
    }

    /**
     * 암호화 키 생성 또는 복원
     * @private
     */
    private getOrCreateKey(): string {
        const keyName = 'samplelog_secure_key';

        try {
            // 기존 키 확인
            let key = localStorage.getItem(keyName);

            if (!key) {
                // 새 키 생성
                key = this.generateRandomKey();
                localStorage.setItem(keyName, key);
            }

            return key;
        } catch (error) {
            (window.logger?.error || console.error)('[SecureStorage] 키 생성/복원 실패:', error);
            // 메모리에만 존재하는 임시 키
            return this.generateRandomKey();
        }
    }

    /**
     * 랜덤 키 생성
     * @private
     */
    private generateRandomKey(): string {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return btoa(String.fromCharCode.apply(null, array as unknown as number[]));
        } else {
            // 폴백: Math.random 사용 (보안성 낮음)
            return btoa(Math.random().toString(36).substring(2, 15) +
                       Math.random().toString(36).substring(2, 15));
        }
    }

    /**
     * 데이터 암호화 (Web Crypto API)
     * @private
     */
    private async encryptWithCrypto(data: unknown): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));

        // 키 생성
        const keyBuffer = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(this.encryptionKey.slice(0, 32).padEnd(32, '0')),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        // IV 생성
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // 암호화
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            keyBuffer,
            dataBuffer
        );

        // IV와 암호화된 데이터를 결합
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        return btoa(String.fromCharCode.apply(null, combined as unknown as number[]));
    }

    /**
     * 데이터 복호화 (Web Crypto API)
     * @private
     */
    private async decryptWithCrypto<T = unknown>(encryptedData: string): Promise<T> {
        const combined = new Uint8Array(
            atob(encryptedData).split('').map(char => char.charCodeAt(0))
        );

        // IV와 데이터 분리
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        // 키 생성
        const keyBuffer = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(this.encryptionKey.slice(0, 32).padEnd(32, '0')),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        // 복호화
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            keyBuffer,
            data
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer)) as T;
    }

    /**
     * 안전하지 않은 폴백 암호화 (더 이상 사용하지 않음)
     * Web Crypto API가 없을 때는 민감한 데이터를 암호화하지 않습니다.
     *
     * @deprecated XOR 암호화는 암호학적으로 취약하므로 제거됨
     * @private
     */
    private unsafeFallbackEncrypt(data: unknown): string {
        // 경고: 암호화 없이 Base64 인코딩만 수행
        // 이것은 암호화가 아니며, 단순 난독화일 뿐입니다
        (window.logger?.warn || console.warn)('[SecureStorage] ⚠️ 암호화 없이 데이터를 저장합니다 (보안 취약)');
        return btoa(JSON.stringify(data));
    }

    /**
     * 안전하지 않은 폴백 복호화
     *
     * @deprecated
     * @private
     */
    private unsafeFallbackDecrypt<T = unknown>(encodedData: string): T {
        (window.logger?.warn || console.warn)('[SecureStorage] ⚠️ 암호화되지 않은 데이터를 읽습니다');
        return JSON.parse(atob(encodedData)) as T;
    }

    /**
     * 데이터 저장
     * @param key - 저장할 키
     * @param data - 저장할 데이터
     * @returns 성공 여부
     */
    async setItem(key: string, data: unknown): Promise<boolean> {
        try {
            let encrypted: string;

            if (this.cryptoAvailable) {
                encrypted = await this.encryptWithCrypto(data);
            } else {
                // Web Crypto API 없음 - 보안상 저장 거부
                (window.logger?.error || console.error)('[SecureStorage] ❌ Web Crypto API 미지원 - 민감한 데이터 저장 거부');
                (window as any).showToast?.('보안 기능을 사용할 수 없습니다. 브라우저를 업데이트해주세요.', 'error');
                return false;
            }

            localStorage.setItem(`secure_${key}`, encrypted);
            return true;
        } catch (error) {
            (window.logger?.error || console.error)('[SecureStorage] 저장 실패:', error);
            return false;
        }
    }

    /**
     * 데이터 읽기
     * @param key - 읽을 키
     * @returns 복호화된 데이터
     */
    async getItem<T = unknown>(key: string): Promise<T | null> {
        try {
            const encrypted = localStorage.getItem(`secure_${key}`);

            if (!encrypted) {
                return null;
            }

            if (this.cryptoAvailable) {
                return await this.decryptWithCrypto<T>(encrypted);
            } else {
                // Web Crypto API 없음 - 레거시 데이터 읽기 시도 (마이그레이션용)
                (window.logger?.warn || console.warn)('[SecureStorage] ⚠️ Web Crypto API 미지원 - 레거시 데이터 읽기 시도');
                try {
                    return this.unsafeFallbackDecrypt<T>(encrypted);
                } catch {
                    (window.logger?.error || console.error)('[SecureStorage] ❌ 레거시 데이터 읽기 실패');
                    return null;
                }
            }
        } catch (error) {
            (window.logger?.error || console.error)('[SecureStorage] 읽기 실패:', error);
            return null;
        }
    }

    /**
     * 데이터 삭제
     * @param key - 삭제할 키
     */
    removeItem(key: string): void {
        localStorage.removeItem(`secure_${key}`);
    }

    /**
     * 모든 보안 데이터 삭제
     */
    clear(): void {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('secure_')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * 키 회전 (보안 강화)
     * @returns 성공 여부
     */
    async rotateKey(): Promise<boolean> {
        try {
            // 모든 보안 데이터 백업
            const backup: Record<string, unknown> = {};
            const keys = Object.keys(localStorage);

            for (const key of keys) {
                if (key.startsWith('secure_')) {
                    const realKey = key.replace('secure_', '');
                    backup[realKey] = await this.getItem(realKey);
                }
            }

            // 새 키 생성
            this.encryptionKey = this.generateRandomKey();
            localStorage.setItem('samplelog_secure_key', this.encryptionKey);

            // 새 키로 모든 데이터 재암호화
            for (const [key, value] of Object.entries(backup)) {
                await this.setItem(key, value);
            }

            return true;
        } catch (error) {
            (window.logger?.error || console.error)('[SecureStorage] 키 회전 실패:', error);
            return false;
        }
    }

    /**
     * 보안 수준 확인
     * @returns 'high' | 'medium' | 'low'
     */
    getSecurityLevel(): SecurityLevel {
        if (this.cryptoAvailable) {
            return 'high'; // Web Crypto API 사용 (AES-GCM 암호화)
        } else {
            return 'low'; // Web Crypto API 없음 (암호화 없음, 보안 취약)
        }
    }
}

// 싱글톤 인스턴스 생성
const secureStorage = new SecureStorage();

// 전역 노출 (디버깅용)
if (typeof window !== 'undefined') {
    window.secureStorage = secureStorage;
}

// ES6 모듈 내보내기
export { secureStorage, SecureStorage };
export type { SecurityLevel, ISecureStorage };

// CommonJS 호환성
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { secureStorage, SecureStorage };
}
