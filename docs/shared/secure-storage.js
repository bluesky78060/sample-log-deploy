/**
 * 보안 스토리지 모듈
 * localStorage에 민감한 데이터를 암호화하여 저장
 *
 * 주의: 이것은 클라이언트 사이드 보호입니다.
 * 완벽한 보안을 위해서는 서버 사이드 보호가 필요합니다.
 */

class SecureStorage {
    constructor() {
        // 암호화 키 생성 또는 복원
        this.encryptionKey = this.getOrCreateKey();

        // Web Crypto API 사용 가능 여부
        this.cryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;

        if (!this.cryptoAvailable) {
            console.warn('[SecureStorage] Web Crypto API를 사용할 수 없습니다. 폴백 모드로 동작합니다.');
        }
    }

    /**
     * 암호화 키 생성 또는 복원
     * @private
     */
    getOrCreateKey() {
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
            console.error('[SecureStorage] 키 생성/복원 실패:', error);
            // 메모리에만 존재하는 임시 키
            return this.generateRandomKey();
        }
    }

    /**
     * 랜덤 키 생성
     * @private
     */
    generateRandomKey() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return btoa(String.fromCharCode.apply(null, array));
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
    async encryptWithCrypto(data) {
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

        return btoa(String.fromCharCode.apply(null, combined));
    }

    /**
     * 데이터 복호화 (Web Crypto API)
     * @private
     */
    async decryptWithCrypto(encryptedData) {
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
        return JSON.parse(decoder.decode(decryptedBuffer));
    }

    /**
     * 간단한 XOR 암호화 (폴백)
     * @private
     */
    xorEncrypt(data, key) {
        const dataStr = JSON.stringify(data);
        let encrypted = '';

        for (let i = 0; i < dataStr.length; i++) {
            encrypted += String.fromCharCode(
                dataStr.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }

        return btoa(encrypted);
    }

    /**
     * 간단한 XOR 복호화 (폴백)
     * @private
     */
    xorDecrypt(encryptedData, key) {
        const encrypted = atob(encryptedData);
        let decrypted = '';

        for (let i = 0; i < encrypted.length; i++) {
            decrypted += String.fromCharCode(
                encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }

        return JSON.parse(decrypted);
    }

    /**
     * 데이터 저장
     * @param {string} key - 저장할 키
     * @param {*} data - 저장할 데이터
     * @returns {Promise<boolean>} 성공 여부
     */
    async setItem(key, data) {
        try {
            let encrypted;

            if (this.cryptoAvailable) {
                encrypted = await this.encryptWithCrypto(data);
            } else {
                encrypted = this.xorEncrypt(data, this.encryptionKey);
            }

            localStorage.setItem(`secure_${key}`, encrypted);
            return true;
        } catch (error) {
            console.error('[SecureStorage] 저장 실패:', error);
            return false;
        }
    }

    /**
     * 데이터 읽기
     * @param {string} key - 읽을 키
     * @returns {Promise<*>} 복호화된 데이터
     */
    async getItem(key) {
        try {
            const encrypted = localStorage.getItem(`secure_${key}`);

            if (!encrypted) {
                return null;
            }

            if (this.cryptoAvailable) {
                return await this.decryptWithCrypto(encrypted);
            } else {
                return this.xorDecrypt(encrypted, this.encryptionKey);
            }
        } catch (error) {
            console.error('[SecureStorage] 읽기 실패:', error);
            return null;
        }
    }

    /**
     * 데이터 삭제
     * @param {string} key - 삭제할 키
     */
    removeItem(key) {
        localStorage.removeItem(`secure_${key}`);
    }

    /**
     * 모든 보안 데이터 삭제
     */
    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('secure_')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * 키 회전 (보안 강화)
     * @returns {Promise<boolean>} 성공 여부
     */
    async rotateKey() {
        try {
            // 모든 보안 데이터 백업
            const backup = {};
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
            console.error('[SecureStorage] 키 회전 실패:', error);
            return false;
        }
    }

    /**
     * 보안 수준 확인
     * @returns {string} 'high' | 'medium' | 'low'
     */
    getSecurityLevel() {
        if (this.cryptoAvailable) {
            return 'high'; // Web Crypto API 사용
        } else if (this.encryptionKey && this.encryptionKey.length > 20) {
            return 'medium'; // XOR with strong key
        } else {
            return 'low'; // XOR with weak key
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

// CommonJS 호환성
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { secureStorage, SecureStorage };
}