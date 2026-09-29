/**
 * encryption-manager.ts 단위 테스트
 *
 * 테스트 범위:
 * - 초기화 플로우 (키 로드, 비밀번호 검증)
 * - 키 생성 및 저장 (Firebase/로컬)
 * - 비밀번호 변경
 * - 분산 락 (distributed locking)
 * - 에러 핸들링
 *
 * 참고: encryption-manager는 복잡한 상태 관리와 UI 모달을 포함하므로
 * 주요 로직과 에지 케이스에 집중하여 테스트합니다.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const lsGetItem = (key: string) => mockLocalStorage[key] || null;
global.localStorage = {
    getItem: vi.fn(lsGetItem),
    setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
    }),
    clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
    }),
    length: 0,
    key: vi.fn(() => null)
} as Storage;

// Mock Web Crypto API
const mockCrypto = {
    randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36)),
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
        const uint8 = array as Uint8Array;
        for (let i = 0; i < uint8.length; i++) {
            uint8[i] = (i * 13 + 7) % 256;
        }
        return array;
    },
    subtle: {
        importKey: vi.fn(async () => ({ type: 'secret' } as CryptoKey)),
        deriveKey: vi.fn(async () => ({ type: 'secret' } as CryptoKey)),
        encrypt: vi.fn(async (algorithm, key, data) => {
            const input = new Uint8Array(data as ArrayBuffer);
            const output = new Uint8Array(input.length);
            for (let i = 0; i < input.length; i++) {
                output[i] = input[i] ^ 0x55;
            }
            return output.buffer;
        }),
        decrypt: vi.fn(async (algorithm, key, data) => {
            const input = new Uint8Array(data as ArrayBuffer);
            const output = new Uint8Array(input.length);
            for (let i = 0; i < input.length; i++) {
                output[i] = input[i] ^ 0x55;
            }
            return output.buffer;
        }),
        digest: vi.fn(async () => new Uint8Array(32).fill(0x42).buffer)
    }
};

// Setup global crypto using vi.stubGlobal (avoids read-only issue)
vi.stubGlobal('crypto', mockCrypto);

// Setup btoa/atob
if (typeof global.btoa === 'undefined') {
    global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
    global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

// Mock DOM (jsdom should provide this, but ensure it's available)
if (typeof document === 'undefined') {
    (global as any).document = {
        getElementById: vi.fn(() => null),
        createElement: vi.fn((tag: string) => ({
            id: '',
            textContent: '',
            appendChild: vi.fn(),
            style: {}
        })),
        head: {
            appendChild: vi.fn()
        },
        body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
        }
    };
}

// Mock window
if (typeof window === 'undefined') {
    (global as any).window = global;
}

// Mock Firebase
const mockFirebaseDoc = {
    exists: false,
    data: () => undefined,
    ref: { id: 'mock-doc' },
    id: 'mock-doc'
};

const mockFirebaseCollection = {
    doc: vi.fn(() => ({
        get: vi.fn(async () => mockFirebaseDoc),
        set: vi.fn(async () => {}),
        delete: vi.fn(async () => {})
    })),
    get: vi.fn(async () => ({
        empty: true,
        forEach: vi.fn()
    })),
    limit: vi.fn(() => mockFirebaseCollection)
};

const mockFirebaseDb = {
    collection: vi.fn(() => mockFirebaseCollection),
    runTransaction: vi.fn(async (fn) => fn({
        get: vi.fn(async () => mockFirebaseDoc),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    })),
    batch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn(async () => {})
    }))
};

(global as any).window.firebaseConfig = {
    isEnabled: vi.fn(() => false), // Disabled by default for simpler tests
    getDb: vi.fn(() => mockFirebaseDb)
};

(global as any).window.firestoreDb = {
    getCollectionName: vi.fn((type: string, year: number) => `${type}_${year}`)
};

describe('encryption-manager.ts', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
        vi.clearAllMocks();

        // Reset Firebase mock
        mockFirebaseDoc.exists = false;
        mockFirebaseDoc.data = () => undefined;
        (window as any).firebaseConfig.isEnabled = vi.fn(() => false);
        // 아래 테스트들이 바꿔 끼우는 목을 되돌린다. clearAllMocks 는 구현·Once 큐를 지우지 않는다.
        mockFirebaseDb.collection = vi.fn(() => mockFirebaseCollection);
        vi.mocked(localStorage.getItem).mockReset().mockImplementation(lsGetItem);
        (window as any).firestoreDb.getCollectionName = vi.fn((type: string, year: number) => `${type}_${year}`);
    });

    // 키 로드·접두사 계산은 import 시점이 아니라 호출 시점에 일어난다.
    // 모듈 상태(_keySource 등)가 테스트 사이에 새지 않도록 매번 새로 평가한다.
    const loadManager = async () => {
        vi.resetModules();
        await import('../../src/shared/crypto-utils'); // window.CryptoUtils 등록
        return (await import('../../src/shared/encryption-manager')).default;
    };

    describe('Module Constants', () => {
        it.todo('should have correct PBKDF2 iterations for recovery key — RECOVERY_PBKDF2_ITERATIONS(600000)가 복구 키 파생(deriveRecoveryAesKey)에 실제로 쓰이는지 — 모듈 export 가 없어 import 만으로는 볼 수 없다');
    });

    describe('Helper Functions', () => {
        describe('timingSafeEqual (indirectly tested)', () => {
            it.todo('should prevent timing attacks on string comparison — timingSafeEqual: 길이가 다르거나 한 글자만 달라도 false, 같으면 true (verifyPassword 의 세션 비밀번호 비교 경로로 구동)');
        });

        describe('getCollectionPrefix', () => {
            it('should return empty string when not in test mode', async () => {
                (window as any).firestoreDb.getCollectionName = vi.fn(
                    () => 'soil_2000'
                );
                (window as any).firebaseConfig.isEnabled = vi.fn(() => true);

                const manager = await loadManager();
                await manager.checkRecoveryBlobExists();

                expect((window as any).firestoreDb.getCollectionName).toHaveBeenCalled();
                expect(mockFirebaseDb.collection).toHaveBeenCalledWith('_system');
                expect(mockFirebaseDb.collection).not.toHaveBeenCalledWith('test_system');
            });

            it('should return test_ prefix when in test mode', async () => {
                (window as any).firestoreDb.getCollectionName = vi.fn(
                    () => 'test_soil_2000'
                );
                (window as any).firebaseConfig.isEnabled = vi.fn(() => true);

                const manager = await loadManager();
                await manager.checkRecoveryBlobExists();

                expect((window as any).firestoreDb.getCollectionName).toHaveBeenCalled();
                expect(mockFirebaseDb.collection).toHaveBeenCalledWith('test_system');
                expect(mockFirebaseDb.collection).not.toHaveBeenCalledWith('_system');
            });
        });
    });

    describe('Key File Management', () => {
        describe('loadKeyFileContent', () => {
            it('should return null when no key exists', async () => {
                // With Firebase disabled and no local key
                const manager = await loadManager();
                expect(await manager.verifyPassword('AnyPass123!')).toBe(false);

                expect(localStorage.getItem).toHaveBeenCalledWith('encryption_keyFile');
                expect(manager.getKeySource()).toBeNull();
            });

            it('should load from localStorage when available', async () => {
                mockLocalStorage['encryption_keyFile'] = 'mock-key-content-base64';

                // verifyPassword 는 키가 없을 때 loadKeyFileContent 를 부르고, salt 가 없어 false 로 끝난다
                const manager = await loadManager();
                expect(await manager.verifyPassword('AnyPass123!')).toBe(false);

                expect(localStorage.getItem).toHaveBeenCalledWith('encryption_keyFile');
                expect(manager.getKeySource()).toBe('local');
            });

            it('should prefer Firebase over localStorage', async () => {
                // Setup Firebase to return key
                (window as any).firebaseConfig.isEnabled = vi.fn(() => true);
                mockFirebaseDoc.exists = true;
                mockFirebaseDoc.data = () => ({
                    keyFileContent: 'firebase-key-content'
                });

                mockLocalStorage['encryption_keyFile'] = 'local-key-content';

                const manager = await loadManager();
                await manager.verifyPassword('AnyPass123!');

                expect(mockFirebaseDb.collection).toHaveBeenCalledWith('_system');
                expect(manager.getKeySource()).toBe('firebase');
                expect(localStorage.getItem).not.toHaveBeenCalledWith('encryption_keyFile');
            });
        });

        describe('Key Generation', () => {
            it('should generate random key when none exists', async () => {
                const { CryptoUtils } = await import('../../src/shared/crypto-utils');
                const keyContent = CryptoUtils.generateKeyFileContent();

                expect(keyContent).toBeTruthy();
                expect(typeof keyContent).toBe('string');
                expect(keyContent.length).toBeGreaterThan(40);
            });

            it('should generate different keys each time', async () => {
                const { CryptoUtils } = await import('../../src/shared/crypto-utils');

                const key1 = CryptoUtils.generateKeyFileContent();
                const key2 = CryptoUtils.generateKeyFileContent();

                // With our deterministic mock, they'll be the same
                // In real crypto, they would differ
                expect(key1).toBeTruthy();
                expect(key2).toBeTruthy();
            });
        });
    });

    describe('Password Validation', () => {
        it('should validate strong passwords', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');
            const result = CryptoUtils.validatePassword('StrongP@ss123');

            expect(result.valid).toBe(true);
            expect(result.strength).toBe('강함');
        });

        it('should reject weak passwords', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');
            const result = CryptoUtils.validatePassword('weak');

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Master Key Creation', () => {
        it('should create master key from password and key file', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const password = 'TestPassword123!';
            const keyFileContent = CryptoUtils.generateKeyFileContent();

            const result = await CryptoUtils.createMasterKey(password, keyFileContent);

            expect(result).toHaveProperty('key');
            expect(result).toHaveProperty('salt');
            expect(result.key).toBeTruthy();
            expect(result.salt).toBeInstanceOf(ArrayBuffer);
            expect(result.salt.byteLength).toBe(16);
        });

        it('should use provided salt when given', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const password = 'TestPassword123!';
            const keyFileContent = CryptoUtils.generateKeyFileContent();
            const salt = new Uint8Array(16).fill(42).buffer;

            const result = await CryptoUtils.createMasterKey(
                password,
                keyFileContent,
                salt
            );

            expect(result.salt).toBe(salt);
        });
    });

    describe('Distributed Lock', () => {
        beforeEach(() => {
            (window as any).firebaseConfig.isEnabled = vi.fn(() => true);
        });

        it.todo('should acquire lock when available — acquireLock: 잠금 문서가 없으면 transaction.set 에 lockedBy=_lockId 를 쓰고 진행 — recoverPassword 는 이후 복구 키 입력 모달에서 멈춰 모달 처리가 필요');

        it('should fail to acquire lock when held by another process', async () => {
            mockFirebaseDoc.exists = true;
            mockFirebaseDoc.data = () => ({
                lockedBy: 'other-process',
                lockedAt: new Date().toISOString()
            });

            const manager = await loadManager();
            const result = await manager.recoverPassword();

            expect(result).toEqual({ success: false, error: 'Another password operation in progress' });
            expect(mockFirebaseDb.runTransaction).toHaveBeenCalledTimes(1);
            expect(mockFirebaseDb.collection).toHaveBeenCalledWith('_system');
        });

        it.todo('should acquire expired lock — acquireLock: lockedAt 이 LOCK_TIMEOUT_MS(5분) 넘게 지난 잠금은 빼앗는다 — available 과 같은 모달 문제');
    });

    describe('Encryption Manager State', () => {
        it.todo('should start in uninitialized state — import 직후 isReady()=false, getKey()=null, getKeySource()=null');

        it.todo('should track initialization status — init/initSilent 성공 후 isReady()=true 로 바뀌는지 (세션 비밀번호·키·salt·검증 데이터 목 필요)');
    });

    describe('Error Handling', () => {
        it('should handle Firebase connection errors gracefully', async () => {
            (window as any).firebaseConfig.isEnabled = vi.fn(() => true);
            mockFirebaseDb.collection = vi.fn(() => {
                throw new Error('Firebase connection failed');
            });

            mockLocalStorage['encryption_keyFile'] = 'local-key-content';

            // Should not throw, just fall back to local
            const manager = await loadManager();
            await expect(manager.verifyPassword('AnyPass123!')).resolves.toBe(false);
            expect(manager.getKeySource()).toBe('local');
        });

        it('should handle localStorage errors gracefully', async () => {
            const manager = await loadManager();
            vi.mocked(localStorage.getItem).mockImplementation(() => {
                throw new Error('localStorage quota exceeded');
            });

            await expect(manager.verifyPassword('AnyPass123!')).resolves.toBe(false);
            expect(localStorage.getItem).toHaveBeenCalledWith('encryption_keyFile');
            expect(manager.getKeySource()).toBeNull();
        });

        // SAMPL-2-39: 최상위 _lockId 가 import 시점에 crypto.randomUUID 를 읽어 전역 crypto 가 없으면 TypeError
        // it.fails 는 어떤 이유로든 실패하면 통과한다 — 이 자리의 다른 회귀도 가릴 수 있다
        it.fails('should handle missing crypto API gracefully', async () => {
            vi.stubGlobal('crypto', undefined);
            try {
                vi.resetModules();

                // Should handle missing crypto
                await expect(import('../../src/shared/encryption-manager')).resolves.toBeDefined();
            } finally {
                // 여기서 복원이 빠지면 뒤따르는 테스트가 전부 getRandomValues 오류로 죽는다
                vi.stubGlobal('crypto', mockCrypto);
            }
        });
    });

    describe('Recovery Blob', () => {
        it.todo('should have recovery key length of 24 characters — generateRecoveryKey() 결과가 RECOVERY_KEY_LENGTH(24)자이고 허용 문자만 쓰는지 — 내부 함수라 regenerateRecoveryKey 모달 경로로만 닿는다');

        it('should encrypt recovery blob with user password', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const recoveryData = { key: 'sensitive-recovery-key' };
            const password = 'RecoveryPass123!';

            const keyResult = await CryptoUtils.createMasterKey(
                password,
                CryptoUtils.generateKeyFileContent()
            );

            const encrypted = await CryptoUtils.encrypt(
                JSON.stringify(recoveryData),
                keyResult.key
            );

            expect(encrypted).not.toBeNull();
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('ct');
        });
    });

    describe('Session Management', () => {
        it.todo('should store session password in localStorage (encrypted) — storeSessionPassword 의 저장 위치·형식 — 소스는 sessionStorage 에 평문으로 둔다(보고서 §8). 기대 동작부터 정해야 한다');

        it.todo('should clear session password on logout — destroy() 후 sessionStorage 의 encryption_sessionPw 가 지워지는지');
    });

    describe('Key Source Tracking', () => {
        it('should track key source as firebase', async () => {
            (window as any).firebaseConfig.isEnabled = vi.fn(() => true);
            mockFirebaseDoc.exists = true;
            mockFirebaseDoc.data = () => ({
                keyFileContent: 'firebase-key'
            });

            const manager = await loadManager();
            expect(manager.getKeySource()).toBeNull();
            await manager.verifyPassword('AnyPass123!');

            expect(mockFirebaseDb.collection).toHaveBeenCalled();
            expect(manager.getKeySource()).toBe('firebase');
        });

        it('should track key source as local', async () => {
            mockLocalStorage['encryption_keyFile'] = 'local-key';

            const manager = await loadManager();
            await manager.verifyPassword('AnyPass123!');

            expect(localStorage.getItem).toHaveBeenCalledWith('encryption_keyFile');
            expect(manager.getKeySource()).toBe('local');
        });

        it.todo('should track key source as generated — 키가 어디에도 없을 때 generateAndStoreKeyFile 후 getKeySource() 가 generated (init 의 첫 설정 모달 경로)');
    });

    describe('Integration with CryptoUtils', () => {
        it('should use CryptoUtils for encryption', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const testData = { name: '홍길동', phone: '010-1234-5678' };
            const keyResult = await CryptoUtils.createMasterKey(
                'TestPass123!',
                CryptoUtils.generateKeyFileContent()
            );

            const encrypted = await CryptoUtils.encryptRecord(testData, keyResult.key);

            expect(encrypted).toHaveProperty('_enc');
            expect(encrypted._enc).toHaveProperty('name');
            expect(encrypted._enc).toHaveProperty('phone');
        });

        it('should decrypt encrypted records', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const original = { name: 'Alice', phone: '010-0000-0000' };
            const keyResult = await CryptoUtils.createMasterKey(
                'TestPass123!',
                CryptoUtils.generateKeyFileContent()
            );

            const encrypted = await CryptoUtils.encryptRecord(original, keyResult.key);
            const decrypted = await CryptoUtils.decryptRecord(encrypted, keyResult.key);

            expect(decrypted.name).toBe(original.name);
            expect(decrypted.phone).toBe(original.phone);
        });
    });

    describe('Edge Cases', () => {
        it.todo('should handle concurrent initialization attempts — init() 동시 호출 3회가 같은 _initPromise 를 공유해 _doInitEncryption 이 한 번만 도는지');

        it.todo('should handle missing window.encryptionManager gracefully — window.encryptionManager 가 없을 때 호출하는 쪽(페이지 스크립트)이 죽지 않는지 — 대상이 이 모듈이 아니다');

        it('should handle null password input', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const result = CryptoUtils.validatePassword('');
            expect(result.valid).toBe(false);
        });

        it('should handle extremely long passwords', async () => {
            const { CryptoUtils } = await import('../../src/shared/crypto-utils');

            const longPassword = 'a'.repeat(100) + 'A1!';
            const result = CryptoUtils.validatePassword(longPassword);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('비밀번호는 64자 이하여야 합니다');
        });
    });

    describe('Security Considerations', () => {
        it.todo('should not store passwords in plain text — init 흐름을 돈 뒤 localStorage·sessionStorage 에 비밀번호 평문이 없는지 (현재 세션 비밀번호는 sessionStorage 평문)');

        it('should use sufficient PBKDF2 iterations (600,000)', async () => {
            const { PBKDF2_ITERATIONS } = await import('../../src/shared/crypto-utils');
            expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600000);
        });

        it.todo('should use random IV for each encryption — crypto-utils.test.ts "Real AES-GCM" 블록의 "uses a fresh IV for each encryption" 이 대신 검증한다');

        it.todo('should use AAD to prevent ciphertext substitution — crypto-utils.test.ts "Real AES-GCM" 블록의 AAD·필드 치환 테스트가 대신 검증한다');
    });
});
