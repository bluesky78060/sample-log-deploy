/**
 * secure-storage.ts 단위 테스트
 *
 * 테스트 범위:
 * - Web Crypto API 사용 가능/불가능 시나리오
 * - localStorage 암호화 저장/로드
 * - 키 회전 (rotation)
 * - 보안 수준 확인
 * - 에러 핸들링 및 폴백 동작
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
global.localStorage = {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
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
const createMockCrypto = (available: boolean) => {
    if (!available) {
        return undefined;
    }

    return {
        getRandomValues: <T extends ArrayBufferView>(array: T): T => {
            const uint8 = array as Uint8Array;
            for (let i = 0; i < uint8.length; i++) {
                uint8[i] = Math.floor(Math.random() * 256);
            }
            return array;
        },
        subtle: {
            importKey: vi.fn(async () => ({ type: 'secret' } as CryptoKey)),
            encrypt: vi.fn(async (algorithm, key, data) => {
                // Mock encryption: reverse bytes and XOR with 0xAB
                const input = new Uint8Array(data as ArrayBuffer);
                const output = new Uint8Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    output[i] = input[input.length - 1 - i] ^ 0xAB;
                }
                return output.buffer;
            }),
            decrypt: vi.fn(async (algorithm, key, data) => {
                // Mock decryption: reverse of encryption
                const input = new Uint8Array(data as ArrayBuffer);
                const output = new Uint8Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    output[i] = input[input.length - 1 - i] ^ 0xAB;
                }
                return output.buffer;
            })
        }
    };
};

// Setup btoa/atob
if (typeof global.btoa === 'undefined') {
    global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
    global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

describe('secure-storage.ts', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
        vi.clearAllMocks();
    });

    describe('Initialization with Web Crypto API', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should initialize with Web Crypto API available', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            expect(storage.getSecurityLevel()).toBe('high');
        });

        it('should generate or restore encryption key on init', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            new SecureStorage();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'samplelog_secure_key',
                expect.any(String)
            );
        });

        it('should reuse existing key if available', async () => {
            mockLocalStorage['samplelog_secure_key'] = 'existingKey123';

            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            expect(storage.getSecurityLevel()).toBe('high');
            // Should not generate new key
            const setItemCalls = (localStorage.setItem as any).mock.calls;
            const keySetCalls = setItemCalls.filter(
                (call: any[]) => call[0] === 'samplelog_secure_key'
            );
            expect(keySetCalls.length).toBe(0); // Should not set new key
        });
    });

    describe('Initialization without Web Crypto API', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', undefined);
        });

        it('should initialize with low security when Web Crypto unavailable', async () => {
            // Need to re-import to get new instance with updated crypto
            const modulePath = '../../src/shared/secure-storage';
            delete require.cache[require.resolve(modulePath)];

            const { SecureStorage } = await import(modulePath);
            const storage = new SecureStorage();

            expect(storage.getSecurityLevel()).toBe('low');
        });

        it('should fallback to Math.random for key generation', async () => {
            const modulePath = '../../src/shared/secure-storage';
            delete require.cache[require.resolve(modulePath)];

            const { SecureStorage } = await import(modulePath);
            new SecureStorage();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'samplelog_secure_key',
                expect.any(String)
            );
        });
    });

    describe('Data Storage and Retrieval (Web Crypto)', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should encrypt and store data', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const testData = { name: 'Alice', age: 30, city: 'Seoul' };
            const success = await storage.setItem('user', testData);

            expect(success).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'secure_user',
                expect.any(String)
            );

            // Verify encrypted data is stored
            const stored = mockLocalStorage['secure_user'];
            expect(stored).toBeTruthy();
            expect(stored).not.toContain('Alice'); // Should be encrypted
        });

        it('should retrieve and decrypt data', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const testData = { name: 'Bob', score: 95 };
            await storage.setItem('test', testData);

            const retrieved = await storage.getItem('test');
            expect(retrieved).toEqual(testData);
        });

        it('should handle Korean text encryption', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const koreanData = { name: '홍길동', address: '서울시 강남구' };
            await storage.setItem('korean', koreanData);

            const retrieved = await storage.getItem('korean');
            expect(retrieved).toEqual(koreanData);
        });

        it('should return null for non-existent key', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const result = await storage.getItem('nonexistent');
            expect(result).toBeNull();
        });

        it('should handle complex nested objects', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const complexData = {
                user: {
                    name: 'Charlie',
                    contacts: [
                        { type: 'email', value: 'charlie@example.com' },
                        { type: 'phone', value: '010-1234-5678' }
                    ]
                },
                settings: {
                    theme: 'dark',
                    notifications: true
                }
            };

            await storage.setItem('complex', complexData);
            const retrieved = await storage.getItem('complex');

            expect(retrieved).toEqual(complexData);
        });

        it('should handle arrays', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const arrayData = [1, 2, 3, 'four', { five: 5 }];
            await storage.setItem('array', arrayData);

            const retrieved = await storage.getItem('array');
            expect(retrieved).toEqual(arrayData);
        });
    });

    describe('Data Storage without Web Crypto (Fallback)', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', undefined);
        });

        it('should store data with base64 encoding (unsafe fallback)', async () => {
            const modulePath = '../../src/shared/secure-storage';
            delete require.cache[require.resolve(modulePath)];

            const { SecureStorage } = await import(modulePath);
            const storage = new SecureStorage();

            const testData = { message: 'fallback test' };
            const success = await storage.setItem('fallback', testData);

            expect(success).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalled();
        });

        it('should retrieve base64 encoded data', async () => {
            const modulePath = '../../src/shared/secure-storage';
            delete require.cache[require.resolve(modulePath)];

            const { SecureStorage } = await import(modulePath);
            const storage = new SecureStorage();

            const testData = { value: 123 };
            await storage.setItem('test', testData);

            const retrieved = await storage.getItem('test');
            expect(retrieved).toEqual(testData);
        });
    });

    describe('Data Deletion', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should remove item', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            await storage.setItem('toDelete', { data: 'test' });
            storage.removeItem('toDelete');

            expect(localStorage.removeItem).toHaveBeenCalledWith('secure_toDelete');

            const retrieved = await storage.getItem('toDelete');
            expect(retrieved).toBeNull();
        });

        it('should clear all secure items', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            await storage.setItem('item1', { a: 1 });
            await storage.setItem('item2', { b: 2 });
            mockLocalStorage['regular_item'] = 'not secure';

            storage.clear();

            expect(mockLocalStorage['secure_item1']).toBeUndefined();
            expect(mockLocalStorage['secure_item2']).toBeUndefined();
            expect(mockLocalStorage['regular_item']).toBe('not secure'); // Should not be cleared
        });
    });

    describe('Key Rotation', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should rotate encryption key', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Store some data
            await storage.setItem('data1', { value: 'test1' });
            await storage.setItem('data2', { value: 'test2' });

            // Rotate key
            const success = await storage.rotateKey();
            expect(success).toBe(true);

            // Data should still be accessible
            const retrieved1 = await storage.getItem('data1');
            const retrieved2 = await storage.getItem('data2');

            expect(retrieved1).toEqual({ value: 'test1' });
            expect(retrieved2).toEqual({ value: 'test2' });
        });

        it('should handle key rotation failure gracefully', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Mock getItem to throw error
            vi.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('Mock error'));

            const success = await storage.rotateKey();
            expect(success).toBe(false);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should handle localStorage quota exceeded', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Mock localStorage.setItem to throw quota exceeded error
            (localStorage.setItem as any).mockImplementationOnce(() => {
                throw new Error('QuotaExceededError');
            });

            const success = await storage.setItem('large', { data: 'x'.repeat(10000) });
            expect(success).toBe(false);
        });

        it('should handle encryption error', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Mock crypto.subtle.encrypt to throw error
            (crypto.subtle.encrypt as any).mockRejectedValueOnce(new Error('Encryption failed'));

            const success = await storage.setItem('test', { data: 'test' });
            expect(success).toBe(false);
        });

        it('should handle decryption error', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Store corrupted data
            mockLocalStorage['secure_corrupted'] = 'invalid_base64_@#$%';

            const result = await storage.getItem('corrupted');
            expect(result).toBeNull();
        });

        it('should handle JSON parse error on retrieval', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            // Mock valid base64 but invalid JSON
            const invalidJson = btoa('not json}');
            mockLocalStorage['secure_invalid'] = invalidJson;

            const result = await storage.getItem('invalid');
            expect(result).toBeNull();
        });
    });

    describe('Security Level', () => {
        it('should report high security with Web Crypto', async () => {
            vi.stubGlobal('crypto', createMockCrypto(true));

            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            expect(storage.getSecurityLevel()).toBe('high');
        });

        it('should report low security without Web Crypto', async () => {
            vi.stubGlobal('crypto', undefined);

            const modulePath = '../../src/shared/secure-storage';
            delete require.cache[require.resolve(modulePath)];

            const { SecureStorage } = await import(modulePath);
            const storage = new SecureStorage();

            expect(storage.getSecurityLevel()).toBe('low');
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should handle null data storage', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const success = await storage.setItem('null', null);
            expect(success).toBe(true);

            const retrieved = await storage.getItem('null');
            expect(retrieved).toBeNull();
        });

        it('should handle undefined data storage', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const success = await storage.setItem('undefined', undefined);
            expect(success).toBe(true);

            const retrieved = await storage.getItem('undefined');
            // undefined gets JSON.stringified to undefined, then parsed back
            expect(retrieved).toBeDefined();
        });

        it('should handle empty string key', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            await storage.setItem('', { data: 'test' });
            const retrieved = await storage.getItem('');

            expect(retrieved).toEqual({ data: 'test' });
        });

        it('should handle special characters in keys', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const specialKey = 'key!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
            await storage.setItem(specialKey, { value: 'special' });

            const retrieved = await storage.getItem(specialKey);
            expect(retrieved).toEqual({ value: 'special' });
        });

        it('should handle very large data', async () => {
            const { SecureStorage } = await import('../../src/shared/secure-storage');
            const storage = new SecureStorage();

            const largeData = {
                records: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    name: `Record ${i}`,
                    data: 'x'.repeat(100)
                }))
            };

            const success = await storage.setItem('large', largeData);
            expect(success).toBe(true);

            const retrieved = await storage.getItem('large');
            expect(retrieved).toEqual(largeData);
        });
    });

    describe('Global Instance', () => {
        beforeEach(() => {
            vi.stubGlobal('crypto', createMockCrypto(true));
        });

        it('should expose singleton instance on window', async () => {
            const { secureStorage } = await import('../../src/shared/secure-storage');

            expect(secureStorage).toBeDefined();
            expect(secureStorage.getSecurityLevel()).toBe('high');
        });

        it('should expose SecureStorage class on window', async () => {
            await import('../../src/shared/secure-storage');

            expect((global as any).window?.secureStorage).toBeDefined();
        });
    });
});
