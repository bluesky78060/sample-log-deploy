/**
 * @fileoverview 암호화 라이프사이클 관리 모듈
 * @description 비밀번호 + 키 파일 → PBKDF2 → 마스터 키 유도 및 관리
 *
 * 플로우:
 * [최초 실행] 키 파일 없음 → 새 키 생성 → Firebase에 저장 → 비밀번호 설정 → 마스터 키
 * [이후 실행] Firebase에서 키 로드 → 비밀번호 입력 → 마스터 키 유도 → 검증
 *
 * 사용법:
 *   await window.encryptionManager.init();
 *   if (window.encryptionManager.isReady()) {
 *       const key = window.encryptionManager.getKey();
 *       const encrypted = await CryptoUtils.encryptRecord(record, key);
 *   }
 */

const EncryptionManager = (function() {
    'use strict';

    /** @type {CryptoKey|null} 메모리에 보관되는 마스터 키 */
    let _cryptoKey = null;

    /** @type {ArrayBuffer|null} PBKDF2 Salt */
    let _salt = null;

    /** @type {boolean} 초기화 성공 완료 여부 */
    let _initialized = false;

    /** @type {boolean} 초기화 진행 중 여부 (재진입 방지) */
    let _initInProgress = false;

    /** @type {Promise<boolean>|null} 현재 진행 중인 초기화 Promise (동시 호출 대기용) */
    let _initPromise = null;

    /** @type {string|null} 키 소스 (firebase, local, generated) */
    let _keySource = null;

    /** @type {string|null} 키 파일 내용 (세션 동안만 보관) */
    let _keyFileContent = null;

    /** @type {boolean} 최초 설정 모드인지 여부 */
    let _isFirstTimeSetup = false;

    /** @type {Function|null} 현재 열려있는 모달의 resolve (cleanup용) */
    let _activeModalResolve = null;

    /** 웹 localStorage 키 상수 (Firebase/Electron 미사용 시 폴백) */
    const LS_KEY_ENCRYPTION_KEY = 'encryption_keyFile';
    const LS_KEY_SALT = 'encryption_salt';
    const LS_KEY_RECOVERY_BLOB = 'encryption_recoveryBlob';
    const LS_KEY_SESSION_PW = 'encryption_sessionPw';

    /** 비밀번호 복구 요청 sentinel (비밀번호 채널과 혼동 방지) */
    const RECOVER_SENTINEL = Symbol('recover');

    /** SVG 아이콘 상수 (eye-on / eye-off) */
    const EYE_ON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const EYE_OFF_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

    /** 비밀번호 모달 다크모드 스타일 주입 (1회만) */
    function _injectModalDarkStyles() {
        if (document.getElementById('enc-modal-dark-styles')) return;
        const style = document.createElement('style');
        style.id = 'enc-modal-dark-styles';
        style.textContent = `
            [data-theme="dark"] #encryption-password-modal > div > div {
                background: #1e293b !important;
                box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
            }
            [data-theme="dark"] #encryption-password-modal h3 {
                color: #F1F5F9 !important;
            }
            [data-theme="dark"] #encryption-password-modal p {
                color: #94a3b8 !important;
            }
            [data-theme="dark"] #encryption-password-modal p span {
                color: #f59e0b !important;
            }
            [data-theme="dark"] #encryption-password-modal label {
                color: #cbd5e1 !important;
            }
            [data-theme="dark"] #encryption-password-modal input[type="password"],
            [data-theme="dark"] #encryption-password-modal input[type="text"] {
                background: #0f172a !important;
                border-color: #475569 !important;
                color: #e2e8f0 !important;
            }
            [data-theme="dark"] #enc-toggle-pw {
                color: #64748B !important;
            }
            [data-theme="dark"] #enc-error-msg {
                background: #451a1a !important;
                border-color: #7f1d1d !important;
                color: #fca5a5 !important;
            }
            [data-theme="dark"] #enc-password-error,
            [data-theme="dark"] #enc-export-pw-error,
            [data-theme="dark"] #enc-ch-error {
                color: #fca5a5 !important;
            }
            [data-theme="dark"] #enc-skip-btn,
            [data-theme="dark"] #enc-export-cancel,
            [data-theme="dark"] #enc-ch-cancel {
                background: #334155 !important;
                border-color: #475569 !important;
                color: #cbd5e1 !important;
            }
            [data-theme="dark"] #enc-submit-btn[disabled],
            [data-theme="dark"] #enc-export-submit[disabled],
            [data-theme="dark"] #enc-ch-submit[disabled] {
                background: #475569 !important;
                color: #94a3b8 !important;
            }
            [data-theme="dark"] .enc-password-rules {
                background: #0D2818 !important;
                border-color: #166534 !important;
                color: #86EFAC !important;
            }
            [data-theme="dark"] .enc-password-rules div {
                color: #86EFAC !important;
            }
            [data-theme="dark"] .enc-password-rules div:first-child {
                color: #BBF7D0 !important;
            }
            [data-theme="dark"] .enc-password-rules div:last-child {
                color: #64748B !important;
            }
            [data-theme="dark"] div[id$="-strength-bar"] {
                background: #334155 !important;
            }
            [data-theme="dark"] div[id$="-strength-text"] {
                color: #94a3b8 !important;
            }
            [data-theme="dark"] #enc-ch-progress div {
                color: #94a3b8 !important;
            }
            @keyframes enc-shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-8px); }
                40% { transform: translateX(8px); }
                60% { transform: translateX(-4px); }
                80% { transform: translateX(4px); }
            }
        `;
        document.head.appendChild(style);
    }

    /** 최대 비밀번호 재시도 횟수 */
    const MAX_PASSWORD_RETRIES = 3;

    /** 복구 키 관련 상수 */
    const RECOVERY_KEY_LENGTH = 24; // 24 문자 (대시 제외)
    const RECOVERY_PBKDF2_ITERATIONS = 600000; // OWASP 2025 권장 (메인 KDF와 동일)

    // ========================================
    // 유틸리티: 상수 시간 문자열 비교 (타이밍 공격 방지)
    // ========================================

    /**
     * 두 문자열을 상수 시간으로 비교 (타이밍 공격 방지)
     * @param {string} a - 비교할 첫 번째 문자열
     * @param {string} b - 비교할 두 번째 문자열
     * @returns {boolean} 두 문자열이 동일하면 true
     */
    function timingSafeEqual(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        const len = Math.max(a.length, b.length);
        let result = a.length ^ b.length;
        for (let i = 0; i < len; i++) {
            result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
        }
        return result === 0;
    }

    // ========================================
    // 유틸리티: _system 컬렉션명 구하기
    // ========================================

    /**
     * 테스트 모드 감지하여 _system 컬렉션 접두사 반환
     * @returns {string} 'test_' 또는 ''
     */
    function getCollectionPrefix() {
        if (window.firestoreDb?.getCollectionName) {
            return window.firestoreDb.getCollectionName('soil', 2000).startsWith('test_') ? 'test_' : '';
        }
        return '';
    }

    /**
     * _system 컬렉션 전체 이름 반환
     * @returns {string} 'test_system' 또는 '_system'
     */
    function getSystemCollection() {
        const prefix = getCollectionPrefix();
        return prefix ? prefix + 'system' : '_system';
    }

    // ========================================
    // 크로스탭 분산 잠금 (비밀번호 변경/복구 동시 실행 방지)
    // ========================================

    const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5분 타임아웃 (비정상 종료 대비)
    const _lockId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

    /**
     * Firestore 기반 분산 잠금 획득
     * @param {string} lockName - 잠금 이름 (예: 'passwordChange')
     * @returns {Promise<boolean>} 잠금 획득 성공 여부
     */
    async function acquireLock(lockName) {
        if (!window.firebaseConfig?.isEnabled()) return true; // Firebase 미사용 시 통과
        const db = window.firebaseConfig.getDb();
        if (!db) return true;

        const systemCollection = getSystemCollection();
        const lockRef = db.collection(systemCollection).doc(`lock_${lockName}`);

        try {
            const result = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(lockRef);
                if (doc.exists) {
                    const data = doc.data();
                    const elapsed = Date.now() - new Date(data.lockedAt).getTime();
                    // 타임아웃 경과한 잠금은 만료 처리
                    if (elapsed < LOCK_TIMEOUT_MS) {
                        return false; // 다른 탭이 잠금 보유 중
                    }
                }
                transaction.set(lockRef, { lockedBy: _lockId, lockedAt: new Date().toISOString() });
                return true;
            });
            return result;
        } catch (err) {
            console.warn(`[Encryption] Lock acquire failed (${lockName}):`, err.message);
            return true; // 잠금 실패 시에도 작업 허용 (가용성 우선)
        }
    }

    /**
     * Firestore 기반 분산 잠금 해제
     * @param {string} lockName - 잠금 이름
     * @returns {Promise<void>}
     */
    async function releaseLock(lockName) {
        if (!window.firebaseConfig?.isEnabled()) return;
        const db = window.firebaseConfig.getDb();
        if (!db) return;

        const systemCollection = getSystemCollection();
        const lockRef = db.collection(systemCollection).doc(`lock_${lockName}`);

        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(lockRef);
                if (doc.exists && doc.data().lockedBy === _lockId) {
                    transaction.delete(lockRef);
                }
            });
        } catch (err) {
            console.warn(`[Encryption] Lock release failed (${lockName}):`, err.message);
        }
    }

    // ========================================
    // 키 파일 로드/생성/저장
    // ========================================

    /**
     * 키 파일 내용 로드
     * Firebase _system → 로컬 파일 순서로 시도
     * @returns {Promise<string|null>} 키 파일 내용 (Base64)
     */
    async function loadKeyFileContent() {
        // 1. Firebase _system 컬렉션에서 키 로드
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                const prefix = getCollectionPrefix();

                try {
                    const doc = await db.collection(systemCollection).doc('encryptionKey').get();
                    if (doc.exists) {
                        const config = doc.data();
                        if (config.keyFileContent) {
                            _keySource = 'firebase';
                            console.log(`[Encryption] Key loaded from Firebase ${systemCollection}/encryptionKey`);
                            return config.keyFileContent;
                        }
                    }
                    console.log(`[Encryption] ${systemCollection}/encryptionKey not found or empty`);
                } catch (fbErr) {
                    console.warn(`[Encryption] Firebase ${systemCollection} read failed:`, fbErr.message);
                }

                // 접두사 있으면 이전 컬렉션명(test__system) 폴백 + 마이그레이션
                if (prefix) {
                    const legacyCollection = prefix + '_system'; // test__system (이전 버그)
                    try {
                        console.log(`[Encryption] Trying fallback: ${legacyCollection}/encryptionKey...`);
                        const doc = await db.collection(legacyCollection).doc('encryptionKey').get();
                        if (doc.exists && doc.data()?.keyFileContent) {
                            _keySource = 'firebase';
                            console.log(`[Encryption] Key loaded from Firebase ${legacyCollection} (fallback)`);
                            // 새 컬렉션으로 마이그레이션
                            try {
                                await db.collection(systemCollection).doc('encryptionKey').set(doc.data());
                                console.log(`[Encryption] Migrated encryptionKey: ${legacyCollection} → ${systemCollection}`);
                                // recoveryBlob도 마이그레이션
                                const recoveryDoc = await db.collection(legacyCollection).doc('recoveryBlob').get();
                                if (recoveryDoc.exists) {
                                    await db.collection(systemCollection).doc('recoveryBlob').set(recoveryDoc.data());
                                    console.log(`[Encryption] Migrated recoveryBlob: ${legacyCollection} → ${systemCollection}`);
                                }
                            } catch (migrateErr) {
                                console.warn('[Encryption] Migration failed:', migrateErr.message);
                            }
                            return doc.data().keyFileContent;
                        }
                    } catch (fbErr2) {
                        console.warn(`[Encryption] ${legacyCollection} fallback failed:`, fbErr2.message);
                    }

                    // 원본 _system 폴백
                    try {
                        console.log('[Encryption] Trying fallback: _system/encryptionKey...');
                        const doc = await db.collection('_system').doc('encryptionKey').get();
                        if (doc.exists && doc.data()?.keyFileContent) {
                            _keySource = 'firebase';
                            console.log('[Encryption] Key loaded from Firebase _system (fallback)');
                            return doc.data().keyFileContent;
                        }
                    } catch (fbErr3) {
                        console.warn('[Encryption] _system fallback failed:', fbErr3.message);
                    }
                }
            }
        }

        // 2. Electron 로컬 키 파일 폴백 (Electron 전용)
        if (window.electronAPI?.isElectron) {
            try {
                const keyContent = await window.electronAPI.readKeyFile?.();
                if (keyContent) {
                    _keySource = 'local';
                    console.debug('[Encryption] Key loaded from local file');
                    return keyContent;
                }
            } catch (localErr) {
                console.warn('[Encryption] Local key file not found:', localErr.message);
            }
            // Electron은 localStorage 폴백을 사용하지 않음 (웹 키와 분리)
            return null;
        }

        // 3. 웹 localStorage 폴백 (웹 전용, Electron에서는 도달하지 않음)
        try {
            const lsKey = localStorage.getItem(LS_KEY_ENCRYPTION_KEY);
            if (lsKey) {
                _keySource = 'local';
                console.log('[Encryption] Key loaded from localStorage');
                return lsKey;
            }
        } catch (lsErr) {
            console.warn('[Encryption] localStorage key load failed:', lsErr.message);
        }

        return null;
    }

    /**
     * 로컬 키 파일을 Firebase에 동기화
     * @param {string} keyContent - 키 파일 내용 (Base64)
     * @returns {Promise<void>}
     */
    async function syncKeyToFirebase(keyContent) {
        if (!window.firebaseConfig?.isEnabled()) return;

        const db = window.firebaseConfig.getDb();
        if (!db) return;

        const systemCollection = getSystemCollection();
        try {
            // Firebase에 이미 키가 있으면 덮어쓰지 않음 (다른 환경에서 생성한 키 보호)
            const existing = await db.collection(systemCollection).doc('encryptionKey').get();
            if (existing.exists && existing.data()?.keyFileContent) {
                console.log(`[Encryption] Firebase already has key in ${systemCollection} - skip sync`);
                return;
            }
            await db.collection(systemCollection).doc('encryptionKey').set({
                keyFileContent: keyContent,
                createdAt: new Date().toISOString(),
                version: '2.0',
                syncedFrom: 'local'
            });
            console.log(`[Encryption] Local key synced to Firebase ${systemCollection}/encryptionKey`);
        } catch (err) {
            console.warn('[Encryption] Failed to sync key to Firebase:', err.message);
        }
    }

    /**
     * 새 키 파일 생성 및 Firebase에 저장
     * @returns {Promise<string|null>} 생성된 키 파일 내용 (Base64)
     */
    async function generateAndStoreKeyFile() {
        if (!window.CryptoUtils?.generateKeyFileContent) {
            console.error('[Encryption] CryptoUtils.generateKeyFileContent not available');
            return null;
        }

        // 32바이트 랜덤 키 파일 생성
        const keyFileContent = window.CryptoUtils.generateKeyFileContent();
        console.debug('[Encryption] New key file generated');

        // Firebase에 저장
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                try {
                    await db.collection(systemCollection).doc('encryptionKey').set({
                        keyFileContent: keyFileContent,
                        createdAt: new Date().toISOString(),
                        version: '2.0'
                    });
                    console.log(`[Encryption] Key stored in Firebase ${systemCollection}/encryptionKey`);
                    _keySource = 'generated';
                    return keyFileContent;
                } catch (err) {
                    console.error('[Encryption] Failed to store key in Firebase:', err.message);
                }
            }
        }

        // Firebase 실패 시 환경별 로컬 저장소에 저장 (서로 분리)
        const isElectron = window.electronAPI?.isElectron === true;
        if (isElectron) {
            // Electron: 앱 데이터 폴더 파일에만 저장 (localStorage 사용 안 함)
            if (window.electronAPI?.saveKeyFile) {
                try {
                    const result = await window.electronAPI.saveKeyFile(keyFileContent);
                    if (result?.success) {
                        console.log('[Encryption] Key stored in local file (safeStorage protected)');
                        _keySource = 'local';
                        _promptKeyFileBackup(keyFileContent);
                        return keyFileContent;
                    }
                } catch (localErr) {
                    console.error('[Encryption] Failed to store key locally:', localErr.message);
                }
            }
        } else {
            // 웹: localStorage에만 저장 (Electron 로컬 파일 사용 안 함)
            try {
                localStorage.setItem(LS_KEY_ENCRYPTION_KEY, keyFileContent);
                console.log('[Encryption] Key stored in localStorage');
                _keySource = 'local';
                return keyFileContent;
            } catch (lsErr) {
                console.warn('[Encryption] localStorage key save failed:', lsErr.message);
            }
        }

        // 모든 저장 실패 시 키 자체는 반환 (세션 중에만 사용)
        _keySource = 'generated';
        return keyFileContent;
    }

    /**
     * 키 파일 백업 안내 (최초 생성 시 자동 호출)
     */
    function _promptKeyFileBackup(keyFileContent) {
        setTimeout(async () => {
            try {
                const confirmed = confirm(
                    '[암호화 키 파일 백업 안내]\n\n' +
                    '암호화 키가 새로 생성되었습니다.\n' +
                    '키 파일을 USB 또는 안전한 곳에 백업해두면\n' +
                    '다른 PC나 재설치 후에도 데이터를 복원할 수 있습니다.\n\n' +
                    '지금 키 파일을 백업하시겠습니까?'
                );
                if (confirmed) {
                    await exportKeyFile();
                }
            } catch (e) {
                console.warn('[Encryption] Key backup prompt failed:', e.message);
            }
        }, 1000);
    }

    /**
     * 키 파일 내보내기 (백업용)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function exportKeyFile() {
        // 메모리에 없으면 저장소에서 다시 로드
        let keyContent = _keyFileContent;
        if (!keyContent) {
            keyContent = await loadKeyFileContent();
        }
        if (!keyContent) {
            return { success: false, error: '활성화된 암호화 키가 없습니다.' };
        }

        const isElectron = window.electronAPI?.isElectron === true;

        if (isElectron && window.electronAPI?.exportKeyFile) {
            // Electron: 전용 IPC (다이얼로그 + 파일 쓰기 일체형)
            const result = await window.electronAPI.exportKeyFile(keyContent);
            if (!result?.success) {
                if (result?.error === 'canceled') return { success: false, error: '취소됨' };
                console.error('[Encryption] Key export failed:', result?.error);
                return { success: false, error: result?.error || '내보내기 실패' };
            }
            console.log('[Encryption] Key file exported to:', result.filePath);
            if (window.showToast) {
                window.showToast('키 파일이 저장되었습니다. 안전한 곳에 보관하세요.', 'success');
            }
            return { success: true };
        }

        // Web 환경: Blob 다운로드 폴백
        try {
            const blob = new Blob([keyContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sample-log.key';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (window.showToast) {
                window.showToast('키 파일이 다운로드되었습니다. 안전한 곳에 보관하세요.', 'success');
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * 키 파일 가져오기 (복원용)
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function importKeyFile() {
        const isElectron = window.electronAPI?.isElectron === true;
        let importedContent = null;

        if (isElectron && window.electronAPI?.importKeyFile) {
            // Electron: 전용 IPC (다이얼로그 + 파일 읽기 일체형)
            const result = await window.electronAPI.importKeyFile();
            if (!result?.success) {
                if (result?.error === 'canceled') return { success: false, error: '취소됨' };
                return { success: false, error: result?.error || '가져오기 실패' };
            }
            importedContent = result.content;
        } else {
            // Web 환경: input[type=file] 폴백
            try {
                importedContent = await new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.key';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) { reject(new Error('파일 선택 취소')); return; }
                        const text = await file.text();
                        resolve(text.trim());
                    };
                    input.click();
                });
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        // 키 파일 내용 검증
        if (!importedContent || importedContent.length < 20 || importedContent.length > 64) {
            return { success: false, error: '유효하지 않은 키 파일입니다. (길이 불일치)' };
        }
        if (!/^[A-Za-z0-9+/=]+$/.test(importedContent)) {
            return { success: false, error: '유효하지 않은 키 파일입니다. (형식 오류)' };
        }

        // 로컬에 저장
        if (isElectron && window.electronAPI?.saveKeyFile) {
            try {
                const saveResult = await window.electronAPI.saveKeyFile(importedContent);
                if (!saveResult?.success) {
                    return { success: false, error: '키 파일 로컬 저장 실패' };
                }
            } catch (err) {
                return { success: false, error: '로컬 저장 실패: ' + err.message };
            }
        }

        // 상태 업데이트
        _keyFileContent = importedContent;
        _keySource = 'local';
        console.log('[Encryption] Key file imported successfully');

        if (window.showToast) {
            window.showToast('키 파일을 가져왔습니다. 비밀번호를 입력하여 암호화를 활성화하세요.', 'success');
        }
        return { success: true };
    }

    // ========================================
    // Salt 관리
    // ========================================

    /**
     * Electron safeStorage에서 Salt 로드
     * @returns {Promise<ArrayBuffer|null>} Salt ArrayBuffer 또는 null
     */
    async function loadSalt() {
        // 1. Electron safeStorage
        if (window.electronAPI?.loadSalt) {
            try {
                const saltBase64 = await window.electronAPI.loadSalt();
                if (saltBase64 && window.CryptoUtils) {
                    console.log(`[Encryption] Salt loaded from Electron (${saltBase64.length} chars)`);
                    return window.CryptoUtils.base64ToBuffer(saltBase64);
                }
            } catch (err) {
                console.warn('[Encryption] Electron salt load failed:', err.message);
            }
        }

        // 2. 웹 localStorage 폴백
        try {
            const saltBase64 = localStorage.getItem(LS_KEY_SALT);
            if (saltBase64 && window.CryptoUtils) {
                console.log(`[Encryption] Salt loaded from localStorage (${saltBase64.length} chars)`);
                return window.CryptoUtils.base64ToBuffer(saltBase64);
            }
        } catch (lsErr) {
            console.warn('[Encryption] localStorage salt load failed:', lsErr.message);
        }

        console.log('[Encryption] No saved salt found');
        return null;
    }

    /**
     * Electron safeStorage에 Salt 저장
     * @param {ArrayBuffer} salt - 저장할 Salt
     * @returns {Promise<void>}
     */
    async function saveSalt(salt) {
        if (!window.CryptoUtils) return;
        const saltBase64 = window.CryptoUtils.bufferToBase64(salt);

        // 1. Electron safeStorage
        if (window.electronAPI?.saveSalt) {
            try {
                await window.electronAPI.saveSalt(saltBase64);
                console.log('[Encryption] Salt saved to Electron');
                return;
            } catch (err) {
                console.warn('[Encryption] Electron salt save failed:', err.message);
            }
        }

        // 2. 웹 localStorage 폴백
        try {
            localStorage.setItem(LS_KEY_SALT, saltBase64);
            console.log('[Encryption] Salt saved to localStorage');
        } catch (lsErr) {
            console.warn('[Encryption] localStorage salt save failed:', lsErr.message);
        }
    }

    // ========================================
    // 비밀번호 UI
    // ========================================

    /**
     * 비밀번호 입력 프롬프트 (일반 로그인용)
     * @param {string} [errorMsg] - 이전 시도 실패 시 표시할 에러 메시지
     * @param {Function} [onValidate] - 비밀번호 검증 콜백. async (pw) => { valid, error }.
     *   valid=true면 모달 닫힘, false면 모달 유지 + 에러 인라인 표시.
     * @returns {Promise<string|null|Symbol>} 비밀번호, null(건너뛰기), RECOVER_SENTINEL(복구)
     */
    function showPasswordPrompt(errorMsg, onValidate) {
        _injectModalDarkStyles();
        return new Promise((rawResolve) => {
            const resolve = (v) => { _activeModalResolve = null; rawResolve(v); };
            _activeModalResolve = () => { document.getElementById('encryption-password-modal')?.remove(); rawResolve(null); };
            const existing = document.getElementById('encryption-password-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'encryption-password-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                ">
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
                                암호화 비밀번호 입력
                            </h3>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                                데이터 복호화를 위해 비밀번호를 입력해주세요.
                            </p>
                        </div>
                        <div id="enc-error-msg" style="
                            background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
                            padding: 10px 14px; font-size: 13px; color: #DC2626;
                            display: none;
                        "></div>

                        ${CryptoUtils.createPasswordRulesHTML('enc')}

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-password-input" placeholder="비밀번호를 입력하세요" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1px solid #D1D5DB; border-radius: 10px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-toggle-pw" style="
                                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                    background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                                " title="비밀번호 표시/숨기기">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                </button>
                            </div>
                            <div id="enc-password-error" style="
                                color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                            "></div>
                        </div>
                        <div id="enc-recover-link" style="text-align: center; display: none;">
                            <a href="#" id="enc-recover-btn" style="
                                font-size: 13px; color: #3B82F6; text-decoration: none;
                                cursor: pointer;
                            ">비밀번호를 잊으셨나요?</a>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button id="enc-skip-btn" style="
                                flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                                border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                                transition: background 0.2s;
                            ">건너뛰기</button>
                            <button id="enc-submit-btn" style="
                                flex: 1; padding: 12px 20px; border: none;
                                background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                                color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: opacity 0.2s;
                            " disabled>확인</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // CRITICAL-1 fix: errorMsg를 textContent로 안전하게 삽입 (XSS 방지)
            if (errorMsg) {
                const errorMsgDiv = document.getElementById('enc-error-msg');
                errorMsgDiv.textContent = errorMsg;
                errorMsgDiv.style.display = 'block';
                document.getElementById('enc-password-input').style.borderColor = '#e74c3c';
            }

            const input = document.getElementById('enc-password-input');
            const submitBtn = document.getElementById('enc-submit-btn');
            const skipBtn = document.getElementById('enc-skip-btn');
            const errDiv = document.getElementById('enc-password-error');

            CryptoUtils.bindPasswordValidation({
                prefix: 'enc', input, submitBtn, submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)', verifyMode: true
            });

            // 비밀번호 표시/숨기기 토글
            const toggleBtn = document.getElementById('enc-toggle-pw');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerHTML = isPassword ? EYE_ON_SVG : EYE_OFF_SVG;
                });
            }

            // 입력 포커스 스타일
            input.addEventListener('focus', () => { input.style.borderColor = '#22C55E'; input.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; });
            input.addEventListener('blur', () => { input.style.borderColor = '#D1D5DB'; input.style.boxShadow = 'none'; });

            // errDiv 숨기기를 input 이벤트에 추가
            input.addEventListener('input', () => { errDiv.style.display = 'none'; });

            async function submit() {
                const pw = input.value;
                if (!pw) {
                    errDiv.textContent = '비밀번호를 입력해주세요.';
                    errDiv.style.display = 'block';
                    return;
                }

                if (onValidate) {
                    // 검증 콜백이 있으면 모달 유지한 채 검증
                    submitBtn.disabled = true;
                    submitBtn.textContent = '검증 중...';
                    input.disabled = true;
                    const errorMsgDiv = document.getElementById('enc-error-msg');
                    if (errorMsgDiv) errorMsgDiv.style.display = 'none';

                    try {
                        const result = await onValidate(pw);
                        if (result.valid) {
                            modal.remove();
                            resolve(pw);
                        } else if (result.exhausted) {
                            // 시도 횟수 초과 → 모달 닫기
                            modal.remove();
                            resolve(null);
                        } else {
                            // 검증 실패 → 모달 유지, 에러 표시
                            input.disabled = false;
                            submitBtn.textContent = '확인';
                            if (errorMsgDiv) {
                                errorMsgDiv.textContent = result.error || '비밀번호가 올바르지 않습니다.';
                                errorMsgDiv.style.display = 'block';
                            }
                            input.value = '';
                            input.style.borderColor = '#e74c3c';
                            input.style.boxShadow = '0 0 0 3px rgba(231,76,60,0.1)';
                            input.focus();
                            // 흔들기 애니메이션
                            const container = modal.querySelector('div > div');
                            if (container) {
                                container.style.animation = 'none';
                                container.offsetHeight;
                                container.style.animation = 'enc-shake 0.4s ease';
                            }
                        }
                    } catch (err) {
                        input.disabled = false;
                        submitBtn.textContent = '확인';
                        if (errorMsgDiv) {
                            errorMsgDiv.textContent = '검증 중 오류: ' + (err.message || '알 수 없는 오류');
                            errorMsgDiv.style.display = 'block';
                        }
                        input.focus();
                    }
                    return;
                }

                modal.remove();
                resolve(pw);
            }

            function skip() {
                modal.remove();
                resolve(null);
            }

            /**
             * 모달을 닫지 않고 인라인 에러 표시 (외부에서 호출 가능)
             * @param {string} msg - 에러 메시지
             */
            modal._showError = (msg) => {
                const errorMsgDiv = document.getElementById('enc-error-msg');
                if (errorMsgDiv) {
                    errorMsgDiv.textContent = msg;
                    errorMsgDiv.style.display = 'block';
                }
                input.value = '';
                input.style.borderColor = '#e74c3c';
                input.style.boxShadow = '0 0 0 3px rgba(231,76,60,0.1)';
                submitBtn.disabled = true;
                input.focus();
                // 흔들기 애니메이션
                const container = modal.querySelector('div > div');
                if (container) {
                    container.style.animation = 'none';
                    container.offsetHeight; // reflow
                    container.style.animation = 'enc-shake 0.4s ease';
                }
            };

            submitBtn.addEventListener('click', submit);
            skipBtn.addEventListener('click', skip);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !submitBtn.disabled) submit();
                if (e.key === 'Escape') skip();
            });

            // 복구 블롭 존재 시 "비밀번호를 잊으셨나요?" 링크 표시
            checkRecoveryBlobExists().then(exists => {
                const recoverLink = document.getElementById('enc-recover-link');
                if (recoverLink && exists) {
                    recoverLink.style.display = 'block';
                }
            }).catch(err => {
                console.debug('[Encryption] Recovery blob check for link display failed:', err.message);
            });

            const recoverBtn = document.getElementById('enc-recover-btn');
            if (recoverBtn) {
                recoverBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    modal.remove();
                    resolve(RECOVER_SENTINEL);
                });
            }

            setTimeout(() => input.focus(), 100);
        });
    }

    /**
     * 최초 비밀번호 설정 프롬프트 (비밀번호 확인 + 정책 검증 + 강도 표시)
     * @returns {Promise<string|null>} 사용자가 설정한 비밀번호 또는 null (건너뛰기)
     */
    function showFirstTimePasswordPrompt() {
        _injectModalDarkStyles();
        return new Promise((rawResolve) => {
            const resolve = (v) => { _activeModalResolve = null; rawResolve(v); };
            _activeModalResolve = () => { document.getElementById('encryption-password-modal')?.remove(); rawResolve(null); };
            const existing = document.getElementById('encryption-password-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'encryption-password-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                ">
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
                                암호화 비밀번호 설정
                            </h3>
                            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                                데이터 암호화에 사용할 비밀번호를 설정해주세요.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                                이 비밀번호는 앱 실행 시 매번 입력해야 합니다.
                            </p>
                        </div>

                        ${CryptoUtils.createPasswordRulesHTML('enc')}

                        <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                        <div style="position: relative;">
                        <input type="password" id="enc-password-input" placeholder="비밀번호 입력" maxlength="64"
                            style="
                                width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                border: 1px solid #D1D5DB; border-radius: 10px;
                                box-sizing: border-box; outline: none; background: #F9FAFB;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                        />
                            <button type="button" id="enc-toggle-pw" style="
                                position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                            " title="비밀번호 표시/숨기기">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            </button>
                        </div>
                        </div>

                        <div>
                        <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호 확인</label>
                        <input type="password" id="enc-password-confirm" placeholder="비밀번호 다시 입력" maxlength="64"
                            style="
                                width: 100%; padding: 12px 14px; font-size: 14px;
                                border: 1px solid #D1D5DB; border-radius: 10px;
                                box-sizing: border-box; outline: none; background: #F9FAFB;
                                transition: border-color 0.2s, box-shadow 0.2s;
                            "
                        />
                        </div>
                        <div id="enc-password-error" style="
                            color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                        "></div>
                        <div style="display: flex; gap: 12px;">
                            <button id="enc-skip-btn" style="
                                flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                                border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                                transition: background 0.2s;
                            ">건너뛰기</button>
                            <button id="enc-submit-btn" style="
                                flex: 1; padding: 12px 20px; border: none;
                                background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                                color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: opacity 0.2s;
                            " disabled>설정 완료</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = document.getElementById('enc-password-input');
            const confirmInput = document.getElementById('enc-password-confirm');
            const submitBtn = document.getElementById('enc-submit-btn');
            const skipBtn = document.getElementById('enc-skip-btn');
            const errDiv = document.getElementById('enc-password-error');

            CryptoUtils.bindPasswordValidation({
                prefix: 'enc', input, confirmInput, submitBtn, submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)'
            });

            // 비밀번호 표시/숨기기 토글
            const toggleBtn = document.getElementById('enc-toggle-pw');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerHTML = isPassword ? EYE_ON_SVG : EYE_OFF_SVG;
                });
            }

            // 입력 포커스 스타일
            [input, confirmInput].forEach(el => {
                el.addEventListener('focus', () => { el.style.borderColor = '#22C55E'; el.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; });
                el.addEventListener('blur', () => { el.style.borderColor = '#D1D5DB'; el.style.boxShadow = 'none'; });
            });

            // errDiv 숨기기를 input 이벤트에 추가
            input.addEventListener('input', () => { errDiv.style.display = 'none'; });
            confirmInput.addEventListener('input', () => { errDiv.style.display = 'none'; });

            function showError(msg) {
                errDiv.textContent = msg;
                errDiv.style.display = 'block';
            }

            function submit() {
                const pw = input.value;
                const pwConfirm = confirmInput.value;

                // CryptoUtils.validatePassword 사용
                if (window.CryptoUtils?.validatePassword) {
                    const result = window.CryptoUtils.validatePassword(pw);
                    if (!result.valid) {
                        showError(result.errors[0]);
                        return;
                    }
                }

                if (pw !== pwConfirm) {
                    showError('비밀번호가 일치하지 않습니다.');
                    return;
                }

                modal.remove();
                resolve(pw);
            }

            function skip() {
                modal.remove();
                resolve(null);
            }

            submitBtn.addEventListener('click', submit);
            skipBtn.addEventListener('click', skip);
            confirmInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !submitBtn.disabled) submit();
                if (e.key === 'Escape') skip();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') skip();
            });
            setTimeout(() => input.focus(), 100);
        });
    }

    // ========================================
    // 키 검증
    // ========================================

    /**
     * Firestore에서 암호화된 문서 하나를 가져와 키 검증
     * @param {CryptoKey} key - 검증할 키
     * @returns {Promise<{verified: boolean, skipped: boolean}>} 검증 결과
     */
    async function verifyKeyWithData(key) {
        if (!window.firebaseConfig?.isEnabled() || !window.firestoreDb) {
            console.log('[Encryption] Key verification skipped (no Firestore)');
            return { verified: true, skipped: true };
        }

        try {
            const db = window.firebaseConfig.getDb();
            if (!db) return { verified: true, skipped: true };

            // 여러 시료 타입에서 암호화된 문서 검색
            const sampleTypes = ['soil', 'water', 'compost', 'heavy-metal', 'pesticide'];
            const currentYear = new Date().getFullYear();

            let encDoc = null;
            for (const type of sampleTypes) {
                const collectionName = window.firestoreDb.getCollectionName(type, currentYear);
                const snapshot = await db.collection(collectionName).limit(5).get();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data._enc && !encDoc) {
                        encDoc = data;
                    }
                });

                if (encDoc) break;
            }

            if (!encDoc || !encDoc._enc) {
                console.log('[Encryption] Key verification: no encrypted documents found - skipping');
                return { verified: true, skipped: true };
            }

            const firstField = Object.keys(encDoc._enc).find(f => f !== 'v');
            if (!firstField || !encDoc._enc[firstField]?.iv || !encDoc._enc[firstField]?.ct) {
                console.log('[Encryption] Key verification: no valid encrypted field found - skipping');
                return { verified: true, skipped: true };
            }

            const useAAD = encDoc._enc.v === '2.1';
            console.log(`[Encryption] Key verification: testing decrypt of "${firstField}" (v${encDoc._enc.v || '1'}, AAD=${useAAD})...`);
            const result = await window.CryptoUtils.decrypt(
                encDoc._enc[firstField].iv,
                encDoc._enc[firstField].ct,
                key,
                useAAD ? firstField : undefined
            );

            if (result !== null) {
                console.log('[Encryption] Key verification: SUCCESS');
                return { verified: true, skipped: false };
            }
            console.warn('[Encryption] Key verification: decrypt returned null (wrong key)');
            return { verified: false, skipped: false };
        } catch (err) {
            console.warn('[Encryption] Key verification FAILED:', err.message);
            return { verified: false, skipped: false };
        }
    }

    // ========================================
    // 복구 키 관리
    // ========================================

    /**
     * 읽기 쉬운 복구 키 생성 (I/O/0/1 등 혼동 문자 제외)
     * @returns {string} XXXX-XXXX-XXXX-XXXX-XXXX-XXXX 형식의 복구 키
     */
    function generateRecoveryKey() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 31 chars
        const limit = 256 - (256 % chars.length); // 248 → rejection sampling으로 바이어스 제거
        let key = '';
        while (key.length < RECOVERY_KEY_LENGTH) {
            const byte = crypto.getRandomValues(new Uint8Array(1));
            if (byte[0] < limit) {
                key += chars[byte[0] % chars.length];
            }
        }
        return key.match(/.{1,4}/g).join('-');
    }

    /**
     * 복구 키에서 AES-GCM 키 유도 (PBKDF2)
     * @param {string} recoveryKeyStr - 복구 키 (대시 포함 가능, 자동 제거)
     * @param {ArrayBuffer} salt - PBKDF2 Salt
     * @returns {Promise<CryptoKey>} AES-GCM CryptoKey
     */
    async function deriveRecoveryAesKey(recoveryKeyStr, salt) {
        const cleanKey = recoveryKeyStr.replace(/-/g, '').toUpperCase();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(cleanKey),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: RECOVERY_PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 복구 블롭 생성 및 Firebase 저장
     * @param {CryptoKey} masterKey - 현재 마스터 키
     * @returns {Promise<string|null>} 생성된 복구 키 (사용자에게 표시) 또는 null
     */
    async function createAndStoreRecoveryBlob(masterKey) {
        const recoveryKey = generateRecoveryKey();
        const recoverySalt = crypto.getRandomValues(new Uint8Array(16));

        const recoveryAesKey = await deriveRecoveryAesKey(recoveryKey, recoverySalt.buffer);

        // 마스터 키 raw bytes 추출: 임시 extractable 키를 재유도하여 export 후 즉시 폐기
        // (일상 사용되는 _cryptoKey는 extractable:false로 XSS 키 탈취 방지)
        let exportedKey;
        const sessionPw = await getStoredSessionPassword();
        // _keyFileContent가 보안상 null로 초기화되었을 수 있으므로 다시 로드
        const keyContent = _keyFileContent || await loadKeyFileContent();
        if (sessionPw && keyContent && _salt) {
            const tempResult = await window.CryptoUtils.createMasterKey(sessionPw, keyContent, _salt, true);
            exportedKey = await crypto.subtle.exportKey('raw', tempResult.key);
            // tempResult.key는 이 스코프를 벗어나면 GC 대상
        } else {
            // 세션 비밀번호 미사용 환경 (최초 설정 등)에서는 masterKey가 아직 extractable일 수 있음
            exportedKey = await crypto.subtle.exportKey('raw', masterKey);
        }

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            recoveryAesKey,
            exportedKey
        );

        const blobData = {
            version: '2.0',
            iv: CryptoUtils.bufferToBase64(iv.buffer),
            ct: CryptoUtils.bufferToBase64(encrypted),
            salt: CryptoUtils.bufferToBase64(recoverySalt.buffer),
            createdAt: new Date().toISOString()
        };

        let stored = false;

        // Firebase에 저장
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                try {
                    await db.collection(systemCollection).doc('recoveryBlob').set(blobData);
                    console.log(`[Encryption] Recovery blob (v2.0) stored in ${systemCollection}/recoveryBlob`);
                    stored = true;
                } catch (err) {
                    console.error('[Encryption] Failed to store recovery blob in Firebase:', err.message);
                }
            }
        }

        // 로컬 파일에도 저장 (Electron 환경)
        const isElectron = window.electronAPI?.isElectron === true;
        if (isElectron && window.electronAPI?.saveRecoveryBlob) {
            try {
                const result = await window.electronAPI.saveRecoveryBlob(JSON.stringify(blobData));
                if (result?.success) {
                    console.log('[Encryption] Recovery blob stored locally (safeStorage protected)');
                    stored = true;
                }
            } catch (localErr) {
                console.error('[Encryption] Failed to store recovery blob locally:', localErr.message);
            }
        }

        // 웹 localStorage 폴백
        if (!stored) {
            try {
                localStorage.setItem(LS_KEY_RECOVERY_BLOB, JSON.stringify(blobData));
                console.log('[Encryption] Recovery blob stored in localStorage');
                stored = true;
            } catch (lsErr) {
                console.error('[Encryption] Failed to store recovery blob in localStorage:', lsErr.message);
            }
        }

        return stored ? recoveryKey : null;
    }

    /**
     * Firebase에서 복구 블롭 존재 여부 확인
     * @returns {Promise<boolean>} 복구 블롭이 존재하면 true
     */
    async function checkRecoveryBlobExists() {
        // Firebase 확인
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                try {
                    const doc = await db.collection(systemCollection).doc('recoveryBlob').get();
                    if (doc.exists && !!doc.data()?.ct) return true;
                } catch (err) {
                    console.warn('[Encryption] Recovery blob check (Firebase) failed:', err.message);
                }
            }
        }

        // 로컬 파일 확인 (Electron)
        const isElectron = window.electronAPI?.isElectron === true;
        if (isElectron && window.electronAPI?.loadRecoveryBlob) {
            try {
                const localBlob = await window.electronAPI.loadRecoveryBlob();
                if (localBlob) {
                    const parsed = JSON.parse(localBlob);
                    if (parsed?.ct) return true;
                }
            } catch (err) {
                console.warn('[Encryption] Recovery blob check (local) failed:', err.message);
            }
        }

        // 웹 localStorage 확인
        try {
            const lsBlob = localStorage.getItem(LS_KEY_RECOVERY_BLOB);
            if (lsBlob) {
                const parsed = JSON.parse(lsBlob);
                if (parsed?.ct) return true;
            }
        } catch (lsErr) {
            console.warn('[Encryption] Recovery blob check (localStorage) failed:', lsErr.message);
        }

        return false;
    }

    /**
     * 복구 블롭이 없으면 자동 생성 (기존 사용자 마이그레이션)
     * @param {CryptoKey} masterKey - 현재 마스터 키
     * @returns {Promise<void>}
     */
    async function ensureRecoveryBlob(masterKey) {
        try {
            const exists = await checkRecoveryBlobExists();
            if (!exists) {
                console.log('[Encryption] No recovery blob found - generating for existing user...');
                const recoveryKey = await createAndStoreRecoveryBlob(masterKey);
                if (recoveryKey) {
                    await showRecoveryKeyModal(recoveryKey);
                    console.log('[Encryption] Recovery blob created for existing user');
                }
            }
        } catch (err) {
            console.warn('[Encryption] ensureRecoveryBlob failed:', err.message);
        }
    }

    /**
     * 복구 키 수동 재발급
     * @returns {Promise<{success: boolean, message: string}>} 재발급 결과
     */
    async function regenerateRecoveryKey() {
        if (!_cryptoKey) {
            return { success: false, message: '암호화가 활성화되지 않았습니다.' };
        }
        try {
            const recoveryKey = await createAndStoreRecoveryBlob(_cryptoKey);
            if (recoveryKey) {
                await showRecoveryKeyModal(recoveryKey);
                return { success: true, message: '복구 키가 재발급되었습니다.' };
            }
            return { success: false, message: '복구 키 생성에 실패했습니다.' };
        } catch (err) {
            console.error('[Encryption] regenerateRecoveryKey error:', err);
            return { success: false, message: err.message };
        }
    }

    /**
     * 복구 키로 마스터 키 복원
     * @param {string} recoveryKeyInput - 사용자 입력 복구 키
     * @returns {Promise<CryptoKey|null>} 복구된 마스터 키 또는 null (실패 시)
     */
    async function decryptMasterKeyFromBlob(recoveryKeyInput) {
        let blob = null;

        // Firebase에서 로드 시도
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                try {
                    const doc = await db.collection(systemCollection).doc('recoveryBlob').get();
                    if (doc.exists) {
                        blob = doc.data();
                    }
                } catch (err) {
                    console.warn('[Encryption] Recovery blob load (Firebase) failed:', err.message);
                }
            }
        }

        // Firebase에 없으면 Electron 로컬에서 로드
        if (!blob) {
            const isElectron = window.electronAPI?.isElectron === true;
            if (isElectron && window.electronAPI?.loadRecoveryBlob) {
                try {
                    const localBlob = await window.electronAPI.loadRecoveryBlob();
                    if (localBlob) {
                        blob = JSON.parse(localBlob);
                    }
                } catch (err) {
                    console.warn('[Encryption] Recovery blob load (local) failed:', err.message);
                }
            }
        }

        // 웹 localStorage 폴백
        if (!blob) {
            try {
                const lsBlob = localStorage.getItem(LS_KEY_RECOVERY_BLOB);
                if (lsBlob) {
                    blob = JSON.parse(lsBlob);
                    console.log('[Encryption] Recovery blob loaded from localStorage');
                }
            } catch (lsErr) {
                console.warn('[Encryption] Recovery blob load (localStorage) failed:', lsErr.message);
            }
        }

        if (!blob) {
            console.warn('[Encryption] Recovery blob not found');
            return null;
        }

        try {
            // 버전 검증
            if (!blob.version || !['1.0', '2.0'].includes(blob.version)) {
                console.warn('[Encryption] Unknown recovery blob version:', blob.version);
                return null;
            }
            if (!blob.iv || !blob.ct || !blob.salt) {
                console.warn('[Encryption] Invalid recovery blob format');
                return null;
            }

            const salt = CryptoUtils.base64ToBuffer(blob.salt);
            const recoveryAesKey = await deriveRecoveryAesKey(recoveryKeyInput, salt);

            const iv = new Uint8Array(CryptoUtils.base64ToBuffer(blob.iv));
            const ct = CryptoUtils.base64ToBuffer(blob.ct);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                recoveryAesKey,
                ct
            );

            if (blob.version === '2.0') {
                // v2.0: raw key bytes → CryptoKey로 변환 (non-extractable로 보안 강화)
                return await crypto.subtle.importKey(
                    'raw', decrypted, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
                );
            } else {
                // v1.0 호환: 비밀번호가 저장된 경우 → 비밀번호로 키 유도
                const password = new TextDecoder().decode(decrypted);
                const kfc = await loadKeyFileContent();
                const mainSalt = await loadSalt();
                if (!kfc || !mainSalt) return null;
                const result = await window.CryptoUtils.createMasterKey(password, kfc, mainSalt);
                return result.key;
            }
        } catch (err) {
            console.warn('[Encryption] Recovery decryption failed:', err.message);
            return null;
        }
    }

    /**
     * 복구 키 표시 모달 (최초 설정 / 비밀번호 변경 후)
     * @param {string} recoveryKey - 표시할 복구 키 (XXXX-XXXX-XXXX-XXXX-XXXX-XXXX 형식)
     * @returns {Promise<void>}
     */
    function showRecoveryKeyModal(recoveryKey) {
        return new Promise((resolve) => {
            const existing = document.getElementById('recovery-key-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'recovery-key-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <div style="
                        background: white; border-radius: 12px; padding: 32px;
                        width: 480px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #333;">
                            복구 키가 생성되었습니다
                        </h3>
                        <div style="
                            background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;
                            padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;
                        ">
                            <strong>중요!</strong> 이 복구 키는 비밀번호를 잊었을 때 사용됩니다.<br>
                            안전한 곳에 따로 보관하세요. 이 키는 다시 표시되지 않습니다.
                        </div>
                        <div id="recovery-key-display" style="
                            background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 8px;
                            padding: 16px; text-align: center; font-family: 'Courier New', monospace;
                            font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #1e293b;
                            user-select: all; cursor: pointer; margin-bottom: 12px;
                        "></div>
                        <div style="text-align: center; margin-bottom: 16px;">
                            <button id="recovery-key-copy" style="
                                padding: 6px 16px; border: 1px solid #3b82f6; background: #eff6ff;
                                border-radius: 6px; cursor: pointer; font-size: 13px; color: #3b82f6;
                            ">복사</button>
                        </div>
                        <div style="display: flex; justify-content: flex-end;">
                            <button id="recovery-key-close" style="
                                padding: 8px 24px; border: none; background: #3b82f6;
                                color: white; border-radius: 6px; cursor: pointer; font-size: 14px;
                            ">확인, 안전하게 저장했습니다</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // XSS 방지: textContent 사용
            document.getElementById('recovery-key-display').textContent = recoveryKey;

            let clipboardTimer = null;
            document.getElementById('recovery-key-copy').addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(recoveryKey);
                    const btn = document.getElementById('recovery-key-copy');
                    btn.textContent = '복사됨! (30초 후 클립보드 삭제)';
                    btn.style.background = '#dcfce7';
                    btn.style.borderColor = '#22c55e';
                    btn.style.color = '#16a34a';

                    // 30초 후 클립보드 자동 삭제
                    if (clipboardTimer) clearTimeout(clipboardTimer);
                    clipboardTimer = setTimeout(async () => {
                        try {
                            const current = await navigator.clipboard.readText();
                            if (current === recoveryKey) {
                                await navigator.clipboard.writeText('');
                            }
                        } catch (e) { /* 권한 에러 무시 */ }
                        const btn2 = document.getElementById('recovery-key-copy');
                        if (btn2) {
                            btn2.textContent = '복사';
                            btn2.style.background = '#eff6ff';
                            btn2.style.borderColor = '#3b82f6';
                            btn2.style.color = '#3b82f6';
                        }
                    }, 30000);
                } catch (err) {
                    console.warn('Clipboard write failed:', err);
                }
            });

            document.getElementById('recovery-key-close').addEventListener('click', () => {
                // 모달 닫힐 때 클립보드 즉시 삭제
                if (clipboardTimer) clearTimeout(clipboardTimer);
                try {
                    navigator.clipboard.writeText('').catch(() => {});
                } catch (e) { /* 무시 */ }
                modal.remove();
                resolve();
            });
        });
    }

    /**
     * 복구 키 입력 프롬프트
     * @returns {Promise<string|null>} 입력된 복구 키 또는 null (취소 시)
     */
    function showRecoveryKeyInputPrompt() {
        return new Promise((rawResolve) => {
            const resolve = (v) => { _activeModalResolve = null; rawResolve(v); };
            _activeModalResolve = () => { document.getElementById('recovery-input-modal')?.remove(); rawResolve(null); };
            const existing = document.getElementById('recovery-input-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'recovery-input-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <div style="
                        background: white; border-radius: 12px; padding: 32px;
                        width: 460px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">
                            비밀번호 복구
                        </h3>
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #666;">
                            비밀번호 설정 시 받은 복구 키를 입력해주세요.
                        </p>
                        <input type="text" id="recovery-key-input" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                            style="
                                width: 100%; padding: 12px; font-size: 16px;
                                font-family: 'Courier New', monospace; letter-spacing: 2px;
                                border: 2px solid #ddd; border-radius: 8px;
                                box-sizing: border-box; outline: none; text-align: center;
                                text-transform: uppercase;
                            "
                        />
                        <div id="recovery-input-error" style="
                            color: #e74c3c; font-size: 12px; margin-top: 6px; display: none; text-align: center;
                        "></div>
                        <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                            <button id="recovery-input-cancel" style="
                                padding: 8px 20px; border: 1px solid #ddd; background: white;
                                border-radius: 6px; cursor: pointer; font-size: 14px; color: #666;
                            ">취소</button>
                            <button id="recovery-input-submit" style="
                                padding: 8px 20px; border: none; background: #3b82f6;
                                color: white; border-radius: 6px; cursor: pointer; font-size: 14px;
                            ">복구</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = document.getElementById('recovery-key-input');
            const submitBtn = document.getElementById('recovery-input-submit');
            const cancelBtn = document.getElementById('recovery-input-cancel');
            const errDiv = document.getElementById('recovery-input-error');

            // 자동 대시 삽입 및 정규화
            input.addEventListener('input', () => {
                errDiv.style.display = 'none';
                let val = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                if (val.length > 24) val = val.substring(0, 24);
                const formatted = val.match(/.{1,4}/g)?.join('-') || val;
                input.value = formatted;
            });

            function submit() {
                const key = input.value.replace(/-/g, '').trim();
                if (key.length !== 24) {
                    errDiv.textContent = '복구 키는 24자리여야 합니다.';
                    errDiv.style.display = 'block';
                    return;
                }
                modal.remove();
                resolve(key);
            }

            function cancel() {
                modal.remove();
                resolve(null);
            }

            submitBtn.addEventListener('click', submit);
            cancelBtn.addEventListener('click', cancel);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') cancel();
            });
            setTimeout(() => input.focus(), 100);
        });
    }

    /**
     * 진행 오버레이 표시
     * @param {string} message - 표시할 메시지
     * @returns {void}
     */
    function showProgressOverlay(message) {
        let overlay = document.getElementById('recovery-progress-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'recovery-progress-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 99998;
                display: flex; align-items: center; justify-content: center;
            `;
            const content = document.createElement('div');
            content.style.cssText = `
                background: white; border-radius: 12px; padding: 32px;
                text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                min-width: 280px;
            `;
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 40px; height: 40px; border: 4px solid #e2e8f0;
                border-top: 4px solid #3b82f6; border-radius: 50%;
                animation: encSpin 1s linear infinite; margin: 0 auto 16px;
            `;
            const style = document.createElement('style');
            style.textContent = '@keyframes encSpin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);

            const text = document.createElement('div');
            text.id = 'recovery-progress-text';
            text.style.cssText = 'font-size: 14px; color: #333;';
            text.textContent = message;

            content.appendChild(spinner);
            content.appendChild(text);
            overlay.appendChild(content);
            document.body.appendChild(overlay);
        } else {
            const text = document.getElementById('recovery-progress-text');
            if (text) text.textContent = message;
            overlay.style.display = 'flex';
        }
    }

    /**
     * 진행 오버레이 숨기기
     * @returns {void}
     */
    function hideProgressOverlay() {
        const overlay = document.getElementById('recovery-progress-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * 복구 시도 횟수 확인 및 증가 (브루트포스 공격 방지)
     * @returns {Promise<{allowed: boolean, remaining: number, lockoutMinutes?: number}>} 시도 허용 여부 및 남은 횟수
     */
    async function checkAndIncrementRecoveryAttempts() {
        const MAX_ATTEMPTS = 5;
        const LOCKOUT_MINUTES = 30;
        if (!window.firebaseConfig?.isEnabled()) return { allowed: true, remaining: MAX_ATTEMPTS };

        const db = window.firebaseConfig.getDb();
        if (!db) return { allowed: true, remaining: MAX_ATTEMPTS };

        const systemCollection = getSystemCollection();
        const attemptsRef = db.collection(systemCollection).doc('recoveryAttempts');
        try {
            // Firestore 트랜잭션으로 원자적 read-increment-write (TOCTOU 방지)
            const result = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(attemptsRef);
                const data = doc.exists ? doc.data() : null;

                if (data) {
                    const lastAttempt = new Date(data.lastAttemptAt);
                    const now = new Date();
                    const minutesSince = (now - lastAttempt) / 60000;

                    // 잠금 시간 경과 시 카운터 리셋
                    if (minutesSince >= LOCKOUT_MINUTES) {
                        transaction.set(attemptsRef, { count: 1, lastAttemptAt: now.toISOString() });
                        return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
                    }

                    if (data.count >= MAX_ATTEMPTS) {
                        const remainingMin = Math.ceil(LOCKOUT_MINUTES - minutesSince);
                        return { allowed: false, remaining: 0, lockoutMinutes: remainingMin };
                    }

                    transaction.update(attemptsRef, {
                        count: data.count + 1,
                        lastAttemptAt: now.toISOString()
                    });
                    return { allowed: true, remaining: MAX_ATTEMPTS - data.count - 1 };
                }

                transaction.set(attemptsRef, { count: 1, lastAttemptAt: new Date().toISOString() });
                return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
            });
            return result;
        } catch (err) {
            console.warn('[Encryption] Recovery attempts check failed:', err.message);
            return { allowed: true, remaining: MAX_ATTEMPTS };
        }
    }

    /**
     * 복구 성공 시 시도 횟수 리셋
     * @returns {Promise<void>}
     */
    async function resetRecoveryAttempts() {
        if (!window.firebaseConfig?.isEnabled()) return;
        const db = window.firebaseConfig.getDb();
        if (!db) return;
        const systemCollection = getSystemCollection();
        try {
            await db.collection(systemCollection).doc('recoveryAttempts').delete();
        } catch (err) {
            console.warn('[Encryption] Failed to reset recovery attempts:', err.message);
        }
    }

    /**
     * 비밀번호 복구 전체 플로우
     * @returns {Promise<{success: boolean, error?: string}>} 복구 성공 여부 및 에러 메시지
     */
    async function recoverPassword() {
        // 크로스탭 잠금 획득 (동시 비밀번호 복구 방지)
        const lockAcquired = await acquireLock('passwordChange');
        if (!lockAcquired) {
            alert('다른 창에서 비밀번호 변경/복구가 진행 중입니다. 잠시 후 다시 시도해주세요.');
            return { success: false, error: 'Another password operation in progress' };
        }

        try { // try-finally: 모든 경로에서 잠금 해제 보장
            const MAX_SESSION_RETRIES = 3;
            let sessionRetries = 0;
            let recoveredKey = null;

            // 1. 복구 키 입력 (세션 내 재시도 + Firestore 전체 시도 횟수 제한)
            while (sessionRetries < MAX_SESSION_RETRIES) {
                // 서버 사이드 시도 횟수 확인
                const attemptCheck = await checkAndIncrementRecoveryAttempts();
                if (!attemptCheck.allowed) {
                    alert(`복구 시도 횟수를 초과했습니다.\n${attemptCheck.lockoutMinutes}분 후에 다시 시도해주세요.`);
                    return { success: false, error: 'Rate limited' };
                }

                const recoveryKeyInput = await showRecoveryKeyInputPrompt();
                if (!recoveryKeyInput) return { success: false, error: 'Cancelled' };

                showProgressOverlay('복구 키 검증 중...');

                // 2. 복구 블롭에서 마스터 키 복호화
                recoveredKey = await decryptMasterKeyFromBlob(recoveryKeyInput);
                if (recoveredKey) break;

                sessionRetries++;
                hideProgressOverlay();
                if (sessionRetries >= MAX_SESSION_RETRIES) {
                    alert('복구 키 시도 횟수를 초과했습니다. (' + MAX_SESSION_RETRIES + '회)');
                    return { success: false, error: 'Max retries exceeded' };
                }
                alert('복구 키가 올바르지 않습니다. (' + sessionRetries + '/' + MAX_SESSION_RETRIES + ')' +
                      (attemptCheck.remaining > 0 ? '\n남은 전체 시도: ' + attemptCheck.remaining + '회' : ''));
            }

            showProgressOverlay('마스터 키 검증 중...');

            try {
                // 3. 복구된 마스터 키로 데이터 검증
                const verifyResult = await verifyKeyWithData(recoveredKey);
                if (!verifyResult.verified) {
                    hideProgressOverlay();
                    alert('복구된 키로 데이터를 검증할 수 없습니다.\n복구 블롭이 오래되었거나 손상되었을 수 있습니다.');
                    return { success: false, error: 'Key verification failed' };
                }

                // 복구 성공 → 시도 횟수 리셋
                await resetRecoveryAttempts();

                // 4. 키 파일 로드
                showProgressOverlay('키 파일 로드 중...');
                let keyFileContent = _keyFileContent || await loadKeyFileContent();
                if (!keyFileContent) {
                    hideProgressOverlay();
                    const isElectron = window.electronAPI?.isElectron === true;
                    if (isElectron) {
                        // 로컬 환경: 키 파일 가져오기 시도
                        const importConfirm = confirm('키 파일을 찾을 수 없습니다.\n키 파일을 가져오시겠습니까?');
                        if (importConfirm) {
                            const importResult = await importKeyFile();
                            if (importResult?.success) {
                                keyFileContent = _keyFileContent || await loadKeyFileContent();
                            }
                        }
                    }
                    if (!keyFileContent) {
                        alert('키 파일을 불러올 수 없습니다.\n키 파일 내보내기로 백업한 .key 파일을 가져오거나,\nFirebase 연결을 확인해주세요.');
                        return { success: false, error: 'Key file not found' };
                    }
                }

                hideProgressOverlay();

                // 5. 새 비밀번호 설정
                const newPassword = await showFirstTimePasswordPrompt();
                if (!newPassword) return { success: false, error: 'New password cancelled' };

                showProgressOverlay('새 마스터 키 생성 중...');

                // 6. 새 키 유도
                const newResult = await window.CryptoUtils.createMasterKey(
                    newPassword, keyFileContent, null
                );
                const newKey = newResult.key;
                const newSalt = newResult.salt;

                // 7. 모든 데이터 재암호화 (롤백 지원)
                const oldKey = recoveredKey;
                const completedCollections = [];

                try {
                    if (window.firebaseConfig?.isEnabled() && window.firestoreDb) {
                        const db = window.firebaseConfig.getDb();
                        if (db) {
                            const sampleTypes = ['soil', 'water', 'pesticide', 'compost', 'heavyMetal'];
                            const currentYear = new Date().getFullYear();
                            let step = 0;
                            const totalSteps = sampleTypes.length * (currentYear - 2020 + 1);

                            for (const type of sampleTypes) {
                                for (let y = 2020; y <= currentYear; y++) {
                                    step++;
                                    showProgressOverlay(`데이터 재암호화 중... (${step}/${totalSteps})`);
                                    const collectionName = window.firestoreDb.getCollectionName(type, y);
                                    await reEncryptCollection(db, collectionName, oldKey, newKey);
                                    completedCollections.push(collectionName);
                                }
                            }
                        }
                    }
                } catch (reEncryptErr) {
                    // 재암호화 실패 → 완료된 컬렉션을 oldKey로 롤백
                    console.error('[Encryption] Recovery re-encryption failed, rolling back...', reEncryptErr);

                    const failedRollbacks = [];
                    if (completedCollections.length > 0 && window.firebaseConfig?.isEnabled()) {
                        const db = window.firebaseConfig.getDb();
                        if (db) {
                            for (const collName of completedCollections) {
                                try {
                                    await reEncryptCollection(db, collName, newKey, oldKey);
                                } catch (rollbackErr) {
                                    console.error(`[Encryption] Rollback FAILED: ${collName}`, rollbackErr.message);
                                    failedRollbacks.push(collName);
                                }
                            }
                        }
                    }

                    hideProgressOverlay();
                    if (failedRollbacks.length > 0) {
                        alert(`롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${failedRollbacks.join(', ')}. 관리자에게 문의하세요.`);
                    } else {
                        alert('재암호화 실패. 기존 키가 유지됩니다. 다시 시도해주세요.');
                    }
                    return { success: false, error: 'Re-encryption failed, rolled back' };
                }

                // 8. Salt 업데이트
                showProgressOverlay('설정 저장 중...');
                _salt = newSalt;
                await saveSalt(newSalt);

                // 9. 내부 상태 업데이트
                _cryptoKey = newKey;
                _initialized = true;
                _keyFileContent = null;

                // 10. 세션 비밀번호 저장
                await storeSessionPassword(newPassword);

                // 11. 새 복구 블롭 생성 (마스터 키 저장)
                const newRecoveryKey = await createAndStoreRecoveryBlob(newKey);
                hideProgressOverlay();

                if (newRecoveryKey) {
                    await showRecoveryKeyModal(newRecoveryKey);
                }

                console.log('[Encryption] Password recovery completed successfully');
                alert('비밀번호가 성공적으로 복구되었습니다.');
                return { success: true };

            } catch (err) {
                hideProgressOverlay();
                console.error('[Encryption] Password recovery failed:', err);
                alert('비밀번호 복구 중 오류가 발생했습니다. 다시 시도해주세요.');
                return { success: false, error: err.message };
            }
        } finally {
            await releaseLock('passwordChange');
        }
    }

    // ========================================
    // 메인 초기화
    // ========================================

    /**
     * 암호화 시스템 초기화
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async function initEncryption() {
        if (_initialized) return !!_cryptoKey;
        if (_initInProgress) return _initPromise || false;
        _initInProgress = true;
        _initPromise = _doInitEncryption().finally(() => { _initPromise = null; });
        return _initPromise;
    }

    async function _doInitEncryption() {

        if (!window.CryptoUtils) {
            console.warn('[Encryption] CryptoUtils not loaded');
            _initInProgress = false;
            return false;
        }

        try {
            // ── Step 1: 키 파일 로드 ──
            console.log('[Encryption] Step 1: Loading key file...');
            _keyFileContent = await loadKeyFileContent();

            // ── Step 1b: 키 파일 없으면 최초 설정 ──
            if (!_keyFileContent) {
                // Firebase 초기화 지연 대비: Firebase가 이제 준비되었을 수 있으므로 재시도
                if (window.firebaseConfig?.isEnabled()) {
                    console.log('[Encryption] Retrying Firebase key load...');
                    _keyFileContent = await loadKeyFileContent();
                }
            }

            if (!_keyFileContent) {
                console.log('[Encryption] No existing key found - starting first-time setup');
                _isFirstTimeSetup = true;

                _keyFileContent = await generateAndStoreKeyFile();
                if (!_keyFileContent) {
                    console.error('[Encryption] Failed to generate key file');
                    return false;
                }
            }

            console.debug(`[Encryption] Key ready (source: ${_keySource})`);

            // ── Step 1c: 로컬 키가 Firebase에 없으면 동기화 (기존 키 보호) ──
            if (_keySource === 'local') {
                console.log('[Encryption] Key loaded from local - syncing to Firebase...');
                await syncKeyToFirebase(_keyFileContent);
            }

            // ── Step 2: Salt 로드 ──
            console.log('[Encryption] Step 2: Loading salt...');
            _salt = await loadSalt();
            const isNewSalt = !_salt;
            if (_salt) {
                console.log(`[Encryption] Salt loaded (${new Uint8Array(_salt).length} bytes)`);
            } else {
                console.log('[Encryption] No saved salt - will generate new one');
            }

            // ── Step 3: 비밀번호 입력 + 키 유도 ──
            let success;
            if (_isFirstTimeSetup) {
                success = await handleFirstTimeSetup(isNewSalt);
            } else {
                success = await handleNormalLogin(isNewSalt);
            }

            if (success) {
                _initialized = true;
            }
            _initInProgress = false;
            return success;

        } catch (error) {
            console.error('[Encryption] Init FAILED:', error.message);
            console.error('[Encryption] Stack:', error.stack);
            _keyFileContent = null;
            _initInProgress = false;
            return false;
        }
    }

    // ========================================
    // 세션 비밀번호 저장/조회 (Electron main process 메모리)
    // ========================================

    /**
     * 세션 비밀번호를 Electron main process 메모리에 저장
     * @param {string} password - 저장할 비밀번호
     * @returns {Promise<void>}
     */
    async function storeSessionPassword(password) {
        // 1. Electron main process 메모리
        if (window.electronAPI?.storeSessionPassword) {
            await window.electronAPI.storeSessionPassword(password);
            console.log('[Encryption] Password stored in session (main process memory)');
            return;
        }

        // 2. 웹 sessionStorage 폴백 (탭 닫으면 자동 삭제)
        try {
            sessionStorage.setItem(LS_KEY_SESSION_PW, password);
            console.log('[Encryption] Password stored in sessionStorage');
        } catch (e) {
            console.warn('[Encryption] sessionStorage password store failed:', e.message);
        }
    }

    /**
     * Electron main process 메모리 또는 웹 sessionStorage에서 세션 비밀번호 조회
     * @returns {Promise<string|null>} 저장된 비밀번호 또는 null
     */
    async function getStoredSessionPassword() {
        // 1. Electron main process
        if (window.electronAPI?.getSessionPassword) {
            const pw = await window.electronAPI.getSessionPassword();
            if (pw) {
                console.log('[Encryption] Session password found in main process');
                return pw;
            }
        }

        // 2. 웹 sessionStorage 폴백
        try {
            const pw = sessionStorage.getItem(LS_KEY_SESSION_PW);
            if (pw) {
                console.log('[Encryption] Session password found in sessionStorage');
                return pw;
            }
        } catch (e) {
            console.warn('[Encryption] sessionStorage password read failed:', e.message);
        }

        return null;
    }

    // ========================================
    // 로그인 플로우
    // ========================================

    /**
     * 최초 설정 플로우
     * @param {boolean} isNewSalt - Salt가 새로 생성되었는지 여부
     * @returns {Promise<boolean>} 설정 성공 여부
     */
    async function handleFirstTimeSetup(isNewSalt) {
        console.log('[Encryption] === FIRST-TIME SETUP ===');

        const password = await showFirstTimePasswordPrompt();
        if (!password) {
            console.warn('[Encryption] First-time setup skipped by user');
            _keyFileContent = null;
            return false;
        }

        // PBKDF2로 마스터 키 유도
        console.log('[Encryption] Deriving master key (PBKDF2 600K iterations)...');
        const result = await window.CryptoUtils.createMasterKey(
            password, _keyFileContent, _salt
        );

        _cryptoKey = result.key;
        _salt = result.salt;

        // Salt 저장
        if (isNewSalt) {
            console.log('[Encryption] Saving new salt...');
            await saveSalt(_salt);
        }

        // 세션에 비밀번호 저장 (다른 페이지에서 재사용)
        await storeSessionPassword(password);

        // 복구 키 생성 및 저장
        try {
            const recoveryKey = await createAndStoreRecoveryBlob(_cryptoKey);
            if (recoveryKey) {
                await showRecoveryKeyModal(recoveryKey);
            }
        } catch (recErr) {
            console.warn('[Encryption] Recovery key generation failed:', recErr.message);
        }

        // 최초 설정이므로 검증 스킵 (암호화된 데이터가 아직 없으므로)
        console.log('[Encryption] First-time setup SUCCESS (verification skipped - no existing encrypted data)');
        _keyFileContent = null;
        _isFirstTimeSetup = false;
        return true;
    }

    /**
     * 일반 로그인 플로우
     * @param {boolean} isNewSalt - Salt가 새로 생성되었는지 여부
     * @returns {Promise<boolean>} 로그인 성공 여부
     */
    async function handleNormalLogin(isNewSalt) {
        // ── 저장된 세션 비밀번호로 자동 로그인 시도 ──
        const storedPassword = await getStoredSessionPassword();
        if (storedPassword) {
            console.log('[Encryption] Auto-login with stored session password...');
            const result = await window.CryptoUtils.createMasterKey(
                storedPassword, _keyFileContent, _salt
            );

            _cryptoKey = result.key;
            _salt = result.salt;

            if (isNewSalt) {
                await saveSalt(_salt);
            }

            const autoVerify = await verifyKeyWithData(_cryptoKey);
            if (autoVerify.verified) {
                // 복구 블롭이 없으면 자동 생성 (기존 사용자 지원)
                await ensureRecoveryBlob(_cryptoKey);
                _keyFileContent = null;
                console.log('[Encryption] Auto-login SUCCESS (session password)');
                return true;
            }

            // 세션 비밀번호가 맞지 않음 (키가 변경되었을 수 있음)
            console.warn('[Encryption] Stored session password is invalid - clearing');
            _cryptoKey = null;
            if (window.electronAPI?.clearSessionPassword) {
                await window.electronAPI.clearSessionPassword();
            }
        }

        // ── 수동 비밀번호 입력 (onValidate 콜백으로 모달 내 인라인 에러 표시) ──
        let retryCount = 0;
        let errorMsg = null;

        const validatePassword = async (pw) => {
            console.log(`[Encryption] Deriving master key (PBKDF2 600K iterations)...`);
            const result = await window.CryptoUtils.createMasterKey(
                pw, _keyFileContent, _salt
            );

            _cryptoKey = result.key;
            _salt = result.salt;

            // 새 Salt면 저장
            if (isNewSalt && retryCount === 0) {
                console.log('[Encryption] Saving new salt...');
                await saveSalt(_salt);
            }

            console.log('[Encryption] Verifying key against encrypted data...');
            const loginVerify = await verifyKeyWithData(_cryptoKey);

            if (loginVerify.verified) {
                return { valid: true };
            }

            retryCount++;
            _cryptoKey = null;
            console.warn(`[Encryption] Key verification failed (attempt ${retryCount}/${MAX_PASSWORD_RETRIES})`);

            if (retryCount >= MAX_PASSWORD_RETRIES) {
                return { valid: false, error: `비밀번호 시도 횟수를 초과했습니다. (${MAX_PASSWORD_RETRIES}회)`, exhausted: true };
            }
            return { valid: false, error: `비밀번호가 올바르지 않습니다. (${retryCount}/${MAX_PASSWORD_RETRIES})` };
        };

        while (retryCount < MAX_PASSWORD_RETRIES) {
            console.log(`[Encryption] Password prompt (attempt ${retryCount + 1}/${MAX_PASSWORD_RETRIES})...`);
            const password = await showPasswordPrompt(errorMsg, validatePassword);

            if (!password) {
                console.warn('[Encryption] Password skipped - encryption disabled');
                _keyFileContent = null;
                return false;
            }

            // 비밀번호 복구 흐름
            if (password === RECOVER_SENTINEL) {
                console.log('[Encryption] Password recovery requested from login prompt');
                try {
                    const recoverResult = await recoverPassword();
                    if (recoverResult?.success) {
                        console.log('[Encryption] Password recovered successfully');
                        return true;
                    }
                    // 복구 실패/취소 → 비밀번호 입력으로 돌아감 (retryCount 증가 안 함)
                    errorMsg = recoverResult?.error === 'Cancelled' ? null : '비밀번호 복구에 실패했습니다. 다시 시도해주세요.';
                } catch (recoverErr) {
                    console.error('[Encryption] Recovery error:', recoverErr);
                    errorMsg = '비밀번호 복구 중 오류: ' + (recoverErr.message || '알 수 없는 오류');
                }
                continue;
            }

            // onValidate 성공 시 여기로 옴
            await storeSessionPassword(password);
            await ensureRecoveryBlob(_cryptoKey);
            _keyFileContent = null;
            console.log(`[Encryption] Login SUCCESS (source: ${_keySource})`);
            return true;
        }

        // 모든 시도 실패
        console.error('[Encryption] All password attempts exhausted');
        _keyFileContent = null;
        _cryptoKey = null;
        return false;
    }

    // ========================================
    // 키 재생성 (기존 키 폐기)
    // ========================================

    /**
     * 기존 암호화 키 폐기 및 새 키 생성
     * @returns {Promise<boolean>} 재생성 성공 여부
     */
    async function regenerateKey() {
        console.log('[Encryption] === KEY REGENERATION ===');

        // 1. Firebase에서 기존 키 삭제
        if (window.firebaseConfig?.isEnabled()) {
            const db = window.firebaseConfig.getDb();
            if (db) {
                const systemCollection = getSystemCollection();
                try {
                    await db.collection(systemCollection).doc('encryptionKey').delete();
                    console.log(`[Encryption] Deleted ${systemCollection}/encryptionKey from Firebase`);
                } catch (err) {
                    console.warn('[Encryption] Firebase key delete failed:', err.message);
                }
            }
        }

        // 2. 상태 리셋
        destroy();

        // 3. 재초기화 (최초 설정 플로우가 자동으로 실행됨)
        return await initEncryption();
    }

    // ========================================
    // 비밀번호 검증 (엑셀 내보내기 등 보호 작업용)
    // ========================================

    /**
     * 내보내기 전용 비밀번호 확인 프롬프트
     * @returns {Promise<string|null>} 입력된 비밀번호 또는 null (취소 시)
     */
    function showExportPasswordPrompt() {
        _injectModalDarkStyles();
        return new Promise((rawResolve) => {
            const resolve = (v) => { _activeModalResolve = null; rawResolve(v); };
            _activeModalResolve = () => { document.getElementById('encryption-password-modal')?.remove(); rawResolve(null); };
            const existing = document.getElementById('encryption-password-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'encryption-password-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                ">
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
                                비밀번호 확인
                            </h3>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                                데이터 내보내기를 위해 암호화 비밀번호를 입력해주세요.
                            </p>
                        </div>

                        ${CryptoUtils.createPasswordRulesHTML('enc-export')}

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px;">비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-export-pw-input" placeholder="비밀번호를 입력하세요" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1px solid #D1D5DB; border-radius: 10px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-export-toggle-pw" style="
                                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                    background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;
                                " title="비밀번호 표시/숨기기">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                </button>
                            </div>
                            <div id="enc-export-pw-error" style="
                                color: #DC2626; font-size: 12px; margin-top: 6px; display: none;
                            "></div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button id="enc-export-cancel" style="
                                flex: 1; padding: 12px 20px; border: 1px solid #D1D5DB; background: white;
                                border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6B7280;
                                transition: background 0.2s;
                            ">취소</button>
                            <button id="enc-export-submit" style="
                                flex: 1; padding: 12px 20px; border: none;
                                background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%);
                                color: white; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: opacity 0.2s;
                            " disabled>확인</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = document.getElementById('enc-export-pw-input');
            const submitBtn = document.getElementById('enc-export-submit');
            const cancelBtn = document.getElementById('enc-export-cancel');
            const errDiv = document.getElementById('enc-export-pw-error');

            CryptoUtils.bindPasswordValidation({
                prefix: 'enc-export', input, submitBtn, submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)', verifyMode: true
            });

            // 비밀번호 표시/숨기기 토글
            const exportToggleBtn = document.getElementById('enc-export-toggle-pw');
            if (exportToggleBtn) {
                exportToggleBtn.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    exportToggleBtn.innerHTML = isPassword ? EYE_ON_SVG : EYE_OFF_SVG;
                });
            }

            // 입력 포커스 스타일
            input.addEventListener('focus', () => { input.style.borderColor = '#22C55E'; input.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; });
            input.addEventListener('blur', () => { input.style.borderColor = '#D1D5DB'; input.style.boxShadow = 'none'; });

            // errDiv 숨기기를 input 이벤트에 추가
            input.addEventListener('input', () => { errDiv.style.display = 'none'; });

            function submit() {
                const pw = input.value;
                if (!pw) {
                    errDiv.textContent = '비밀번호를 입력해주세요.';
                    errDiv.style.display = 'block';
                    return;
                }
                modal.remove();
                resolve(pw);
            }

            function cancel() {
                modal.remove();
                resolve(null);
            }

            submitBtn.addEventListener('click', submit);
            cancelBtn.addEventListener('click', cancel);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !submitBtn.disabled) submit();
                if (e.key === 'Escape') cancel();
            });
            setTimeout(() => input.focus(), 100);
        });
    }

    /**
     * 비밀번호 검증 (외부에서 호출 가능한 안전한 메서드)
     * 세션 비밀번호 비교 → PBKDF2 키 유도 + 데이터 복호화 테스트
     * @param {string} password - 검증할 비밀번호
     * @returns {Promise<boolean>} 비밀번호 일치 여부
     */
    async function verifyPassword(password) {
        if (!password || typeof password !== 'string') return false;

        // 1차: 세션 비밀번호와 상수 시간 비교
        const storedPw = await getStoredSessionPassword();
        if (storedPw && timingSafeEqual(password, storedPw)) {
            return true;
        }

        // 2차: PBKDF2 키 유도 후 데이터 복호화 테스트
        try {
            const kfc = _keyFileContent || await loadKeyFileContent();
            if (!kfc || !_salt) return false;

            const result = await window.CryptoUtils.createMasterKey(password, kfc, _salt);
            const vr = await verifyKeyWithData(result.key);
            return vr.verified;
        } catch (err) {
            console.warn('[Encryption] verifyPassword failed:', err.message);
            return false;
        }
    }

    /**
     * 내보내기 작업 전 비밀번호 검증
     * @returns {Promise<boolean>} 검증 성공 여부
     */
    async function verifyPasswordForExport() {
        if (!_cryptoKey) {
            console.warn('[Encryption] verifyPasswordForExport: no active key');
            return false;
        }

        const inputPassword = await showExportPasswordPrompt();
        if (!inputPassword) return false;

        // 세션에 저장된 비밀번호와 비교
        const storedPassword = await getStoredSessionPassword();
        if (storedPassword && timingSafeEqual(inputPassword, storedPassword)) {
            console.log('[Encryption] Export password verification: MATCH');
            return true;
        }

        // 세션 비밀번호가 없거나 불일치 → PBKDF2로 키 유도 후 데이터 검증
        try {
            const keyFileContent = await loadKeyFileContent();
            if (!keyFileContent) return false;

            const result = await window.CryptoUtils.createMasterKey(
                inputPassword, keyFileContent, _salt
            );

            const exportVerify = await verifyKeyWithData(result.key);
            if (exportVerify.verified) {
                console.log('[Encryption] Export password verification: VALID (key-derived)');
                return true;
            }
        } catch (err) {
            console.warn('[Encryption] Export password verification failed:', err.message);
        }

        // 검증 실패 시 에러 표시
        alert('비밀번호가 올바르지 않습니다.');
        return false;
    }

    // ========================================
    // 비밀번호 변경
    // ========================================

    /**
     * 비밀번호 변경 모달 UI
     * @returns {Promise<{oldPassword: string, newPassword: string}|null>} 입력된 비밀번호 또는 null (취소 시)
     */
    function showChangePasswordModal() {
        _injectModalDarkStyles();
        return new Promise((rawResolve) => {
            const resolve = (v) => { _activeModalResolve = null; rawResolve(v); };
            _activeModalResolve = () => { document.getElementById('encryption-password-modal')?.remove(); rawResolve(null); };
            const existing = document.getElementById('encryption-password-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'encryption-password-modal';
            modal.innerHTML = `
                <div style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 99999;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <div style="
                        background: white; border-radius: 20px; padding: 36px;
                        width: 440px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex; flex-direction: column; gap: 16px;
                    ">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%); display: flex; align-items: center; justify-content: center;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                            </div>
                            <h3 style="margin: 0; font-size: 22px; font-weight: 700; color: #111827;">비밀번호 변경</h3>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; text-align: center; line-height: 1.5;">
                                현재 비밀번호를 확인하고 새 비밀번호를 설정합니다.<br>
                                <span style="color: #D97706; font-size: 12px; font-weight: 500;">모든 암호화된 데이터가 새 비밀번호로 재암호화됩니다.</span>
                            </p>
                        </div>

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">현재 비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-old-pw" placeholder="현재 비밀번호" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-old" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">새 비밀번호</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-new-pw" placeholder="새 비밀번호 입력" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 4px;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-new" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>
                        ${CryptoUtils.createPasswordRulesHTML('enc-ch')}

                        <div>
                            <label style="font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 6px;">새 비밀번호 확인</label>
                            <div style="position: relative;">
                                <input type="password" id="enc-ch-confirm-pw" placeholder="새 비밀번호 다시 입력" maxlength="64"
                                    style="
                                        width: 100%; padding: 12px 44px 12px 14px; font-size: 14px;
                                        border: 1.5px solid #D1D5DB; border-radius: 12px;
                                        box-sizing: border-box; outline: none; background: #F9FAFB;
                                        transition: border-color 0.2s, box-shadow 0.2s;
                                    "
                                />
                                <button type="button" id="enc-ch-toggle-confirm" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; color: #9CA3AF;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                </button>
                            </div>
                        </div>
                        <div id="enc-ch-error" style="
                            color: #EF4444; font-size: 12px; display: none;
                        "></div>
                        <div id="enc-ch-progress" style="display: none;">
                            <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px;">비밀번호 변경 중... 데이터를 재암호화하고 있습니다.</div>
                            <div style="height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
                                <div id="enc-ch-progress-bar" style="height: 100%; background: linear-gradient(90deg, #22C55E, #16A34A); border-radius: 3px; width: 0; transition: width 0.5s;"></div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="enc-ch-cancel" style="
                                padding: 10px 24px; border: 1.5px solid #D1D5DB; background: white;
                                border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: #374151;
                                transition: background 0.2s;
                            ">취소</button>
                            <button id="enc-ch-submit" style="
                                padding: 10px 24px; border: none; background: #ccc;
                                color: white; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600;
                                transition: background 0.2s;
                            " disabled>변경</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const oldPwInput = document.getElementById('enc-ch-old-pw');
            const newPwInput = document.getElementById('enc-ch-new-pw');
            const confirmPwInput = document.getElementById('enc-ch-confirm-pw');
            const submitBtn = document.getElementById('enc-ch-submit');
            const cancelBtn = document.getElementById('enc-ch-cancel');
            const errDiv = document.getElementById('enc-ch-error');

            const validation = CryptoUtils.bindPasswordValidation({
                prefix: 'enc-ch',
                input: newPwInput,
                confirmInput: confirmPwInput,
                submitBtn,
                submitColor: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
                extraCheck: () => oldPwInput.value.length > 0
            });

            // oldPwInput 변경 시에도 검증 재실행
            oldPwInput.addEventListener('input', () => {
                validation.updateValidation();
                errDiv.style.display = 'none';
            });

            // errDiv 숨기기를 input 이벤트에 추가
            newPwInput.addEventListener('input', () => { errDiv.style.display = 'none'; });
            confirmPwInput.addEventListener('input', () => { errDiv.style.display = 'none'; });

            // 눈 아이콘 토글
            function bindToggle(btnId, inputEl) {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        const isPassword = inputEl.type === 'password';
                        inputEl.type = isPassword ? 'text' : 'password';
                        btn.innerHTML = isPassword ? EYE_ON_SVG : EYE_OFF_SVG;
                    });
                }
            }
            bindToggle('enc-ch-toggle-old', oldPwInput);
            bindToggle('enc-ch-toggle-new', newPwInput);
            bindToggle('enc-ch-toggle-confirm', confirmPwInput);

            // 포커스 스타일
            [oldPwInput, newPwInput, confirmPwInput].forEach(inp => {
                inp.addEventListener('focus', () => { inp.style.borderColor = '#22C55E'; inp.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; });
                inp.addEventListener('blur', () => { inp.style.borderColor = '#D1D5DB'; inp.style.boxShadow = 'none'; });
            });

            submitBtn.addEventListener('click', () => {
                const oldPw = oldPwInput.value;
                const newPw = newPwInput.value;
                const confirmPw = confirmPwInput.value;

                if (newPw !== confirmPw) {
                    errDiv.textContent = '새 비밀번호가 일치하지 않습니다.';
                    errDiv.style.display = 'block';
                    return;
                }

                if (window.CryptoUtils?.validatePassword) {
                    const result = window.CryptoUtils.validatePassword(newPw);
                    if (!result.valid) {
                        errDiv.textContent = result.errors[0];
                        errDiv.style.display = 'block';
                        return;
                    }
                }

                // 입력 비활성화
                oldPwInput.disabled = true;
                newPwInput.disabled = true;
                confirmPwInput.disabled = true;
                submitBtn.disabled = true;
                cancelBtn.disabled = true;
                submitBtn.style.background = '#ccc';

                resolve({ oldPassword: oldPw, newPassword: newPw, modal, errDiv });
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });

            oldPwInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { modal.remove(); resolve(null); } });
            newPwInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { modal.remove(); resolve(null); } });
            confirmPwInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !submitBtn.disabled) submitBtn.click();
                if (e.key === 'Escape') { modal.remove(); resolve(null); }
            });

            setTimeout(() => oldPwInput.focus(), 100);
        });
    }

    /**
     * 비밀번호 변경 처리
     * @returns {Promise<{success: boolean, error?: string}>} 변경 성공 여부 및 에러 메시지
     */
    async function changePassword() {
        if (!_cryptoKey) {
            alert('암호화가 활성화되지 않았습니다. 먼저 비밀번호를 입력해주세요.');
            return { success: false, error: 'Encryption not active' };
        }

        // 크로스탭 잠금 획득 (동시 비밀번호 변경 방지)
        const lockAcquired = await acquireLock('passwordChange');
        if (!lockAcquired) {
            alert('다른 창에서 비밀번호 변경이 진행 중입니다. 잠시 후 다시 시도해주세요.');
            return { success: false, error: 'Another password change in progress' };
        }

        try { // try-finally: 모든 경로에서 잠금 해제 보장
        const input = await showChangePasswordModal();
        if (!input) return { success: false, error: 'Cancelled' };

        const { oldPassword, newPassword, modal, errDiv } = input;
        const progressDiv = document.getElementById('enc-ch-progress');
        const progressBar = document.getElementById('enc-ch-progress-bar');

        try {
            // 1. 키 파일 로드
            const keyContent = await loadKeyFileContent();
            if (!keyContent) {
                errDiv.textContent = '키 파일을 불러올 수 없습니다.';
                errDiv.style.display = 'block';
                modal.remove();
                return { success: false, error: 'Key file not found' };
            }

            // 2. 현재 비밀번호 검증
            const storedPw = await getStoredSessionPassword();
            let oldPasswordValid = false;

            if (storedPw && timingSafeEqual(oldPassword, storedPw)) {
                oldPasswordValid = true;
            } else {
                // PBKDF2로 키 유도 후 검증
                const oldResult = await window.CryptoUtils.createMasterKey(oldPassword, keyContent, _salt);
                const changePwVerify = await verifyKeyWithData(oldResult.key);
                oldPasswordValid = changePwVerify.verified;
            }

            if (!oldPasswordValid) {
                errDiv.textContent = '현재 비밀번호가 올바르지 않습니다.';
                errDiv.style.display = 'block';
                // 입력 필드 재활성화
                document.getElementById('enc-ch-old-pw').disabled = false;
                document.getElementById('enc-ch-new-pw').disabled = false;
                document.getElementById('enc-ch-confirm-pw').disabled = false;
                document.getElementById('enc-ch-cancel').disabled = false;
                return { success: false, error: 'Invalid current password' };
            }

            // 3. 롤백용 백업
            const oldSalt = _salt;
            const oldKey = _cryptoKey;
            const completedCollections = []; // 성공한 컬렉션 추적

            // 4. 프로그레스 표시
            progressDiv.style.display = 'block';
            progressBar.style.width = '10%';

            // 5. 새 비밀번호로 마스터 키 유도 (새 Salt 생성)
            console.log('[Encryption] Deriving new master key...');
            const newResult = await window.CryptoUtils.createMasterKey(newPassword, keyContent, null);
            const newKey = newResult.key;
            const newSalt = newResult.salt;

            progressBar.style.width = '20%';

            // 6. 모든 데이터 재암호화 (실패 시 롤백)
            try {
                if (window.firebaseConfig?.isEnabled() && window.firestoreDb) {
                    const db = window.firebaseConfig.getDb();
                    if (db) {
                        const sampleTypes = ['soil', 'water', 'pesticide', 'compost', 'heavyMetal'];
                        const currentYear = new Date().getFullYear();
                        const years = [];
                        for (let y = 2020; y <= currentYear; y++) years.push(y);

                        const totalSteps = sampleTypes.length * years.length;
                        let completedSteps = 0;

                        for (const type of sampleTypes) {
                            for (const year of years) {
                                const collectionName = window.firestoreDb.getCollectionName(type, year);
                                await reEncryptCollection(db, collectionName, oldKey, newKey);
                                completedCollections.push(collectionName);
                                completedSteps++;
                                const progress = 20 + (completedSteps / totalSteps) * 70;
                                progressBar.style.width = progress + '%';
                            }
                        }
                    }
                }
            } catch (reEncryptErr) {
                // 재암호화 중 실패 → 완료된 컬렉션을 oldKey로 롤백 시도
                console.error('[Encryption] Re-encryption failed, attempting rollback...', reEncryptErr);
                progressBar.style.background = '#e74c3c';

                const failedRollbacks = [];
                if (completedCollections.length > 0 && window.firebaseConfig?.isEnabled()) {
                    const db = window.firebaseConfig.getDb();
                    if (db) {
                        for (const collName of completedCollections) {
                            try {
                                await reEncryptCollection(db, collName, newKey, oldKey);
                                console.log(`[Encryption] Rollback success: ${collName}`);
                            } catch (rollbackErr) {
                                console.error(`[Encryption] Rollback FAILED: ${collName}`, rollbackErr.message);
                                failedRollbacks.push(collName);
                            }
                        }
                    }
                }

                if (failedRollbacks.length > 0) {
                    // 롤백 실패 시 어떤 컬렉션이 문제인지 기록 및 사용자 알림
                    const failedList = failedRollbacks.join(', ');
                    console.error(`[Encryption] CRITICAL: Rollback failed for: ${failedList}`);
                    console.error('[Encryption] These collections may have mixed encryption state (old+new keys)');
                    errDiv.textContent = `롤백 실패! 다음 컬렉션이 불일치 상태입니다: ${failedList}. 관리자에게 문의하세요.`;
                } else {
                    errDiv.textContent = '재암호화 실패. 기존 비밀번호가 유지됩니다.';
                }
                errDiv.style.display = 'block';
                // 입력 필드 재활성화
                document.getElementById('enc-ch-old-pw').disabled = false;
                document.getElementById('enc-ch-new-pw').disabled = false;
                document.getElementById('enc-ch-confirm-pw').disabled = false;
                document.getElementById('enc-ch-cancel').disabled = false;
                progressDiv.style.display = 'none';
                return { success: false, error: 'Re-encryption failed, rolled back' };
            }

            progressBar.style.width = '95%';

            // 7. 새 Salt 저장
            _salt = newSalt;
            await saveSalt(newSalt);

            // 8. 내부 상태 업데이트
            _cryptoKey = newKey;

            // 9. 세션 비밀번호 업데이트
            await storeSessionPassword(newPassword);

            // 10. 복구 블롭 업데이트 (새 마스터 키로)
            try {
                const newRecoveryKey = await createAndStoreRecoveryBlob(newKey);
                if (newRecoveryKey) {
                    progressBar.style.width = '100%';
                    modal.remove();
                    await showRecoveryKeyModal(newRecoveryKey);
                    console.log('[Encryption] Password change completed successfully');
                    alert('비밀번호가 성공적으로 변경되었습니다.');
                    return { success: true };
                }
            } catch (recErr) {
                console.warn('[Encryption] Recovery blob update failed:', recErr.message);
            }

            progressBar.style.width = '100%';
            console.log('[Encryption] Password change completed successfully');

            modal.remove();
            alert('비밀번호가 성공적으로 변경되었습니다.');
            return { success: true };

        } catch (err) {
            console.error('[Encryption] Password change failed:', err);
            modal.remove();
            alert('비밀번호 변경 중 오류가 발생했습니다: ' + err.message);
            return { success: false, error: err.message };
        }
        } finally {
            await releaseLock('passwordChange');
        }
    }

    /**
     * 단일 컬렉션의 모든 문서를 재암호화 (oldKey → newKey)
     * @param {Object} db - Firestore DB 인스턴스
     * @param {string} collectionName - 컬렉션 이름
     * @param {CryptoKey} oldKey - 이전 마스터 키
     * @param {CryptoKey} newKey - 새 마스터 키
     * @returns {Promise<void>}
     */
    async function reEncryptCollection(db, collectionName, oldKey, newKey) {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) return;

        const BATCH_SIZE = 200;
        const docs = [];
        snapshot.forEach(doc => docs.push({ ref: doc.ref, id: doc.id, data: doc.data() }));

        const failedDocs = [];

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const chunk = docs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            let batchHasOps = false;

            for (const { ref, id, data } of chunk) {
                if (!data._enc) continue; // 평문 → 스킵 (현재 키로 암호화 불필요)

                try {
                    // oldKey로 복호화
                    const decrypted = await window.CryptoUtils.decryptRecord({ ...data }, oldKey);

                    // newKey로 암호화
                    const encrypted = await window.CryptoUtils.encryptRecord(decrypted, newKey);

                    if (encrypted._enc) {
                        const saveData = { ...encrypted };
                        const FieldValue = window.firebase?.firestore?.FieldValue;
                        if (FieldValue) {
                            for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                                if (!(field in saveData) || saveData[field] === undefined) {
                                    saveData[field] = FieldValue.delete();
                                }
                            }
                            saveData.updatedAt = FieldValue.serverTimestamp();
                        }
                        batch.set(ref, saveData, { merge: true });
                        batchHasOps = true;
                    }
                } catch (docErr) {
                    failedDocs.push(id);
                    console.error(`[ReEncrypt] ${collectionName}/${id}: re-encrypt failed -`, docErr.message);
                }
            }

            // 부분 실패 시 배치를 커밋하지 않음 (일관성 보장)
            if (failedDocs.length > 0) {
                throw new Error(`${collectionName}: ${failedDocs.length}개 문서 재암호화 실패 (${failedDocs.join(', ')})`);
            }

            if (batchHasOps) {
                await batch.commit();
            }
        }

        console.log(`[ReEncrypt] ${collectionName}: re-encrypted ${docs.length} docs`);
    }

    // ========================================
    // Public API
    // ========================================

    /**
     * 암호화 키가 준비되었는지 확인
     * @returns {boolean} 키가 준비되어 있으면 true
     */
    function isReady() {
        return !!_cryptoKey;
    }

    /**
     * 현재 마스터 키 반환
     * @returns {CryptoKey|null} 현재 마스터 키 또는 null
     */
    function getKey() {
        return _cryptoKey;
    }

    /**
     * 키 소스 반환
     * @returns {string|null} 'firebase', 'local', 'generated' 중 하나 또는 null
     */
    function getKeySource() {
        return _keySource;
    }

    /**
     * 세션 키 폐기
     * @returns {void}
     */
    function destroy() {
        _cryptoKey = null;
        // 키 파일 내용을 랜덤 데이터로 덮어쓴 후 null 처리 (best-effort 메모리 잔류 최소화)
        if (_keyFileContent && typeof _keyFileContent === 'string') {
            try {
                const randomBytes = crypto.getRandomValues(new Uint8Array(_keyFileContent.length));
                _keyFileContent = String.fromCharCode(...randomBytes);
            } catch (e) {
                // 실패해도 null 처리는 진행
            }
        }
        _keyFileContent = null;
        _salt = null;
        _initialized = false;
        _initInProgress = false;
        _initPromise = null;
        _keySource = null;
        _isFirstTimeSetup = false;

        // 웹 sessionStorage 세션 비밀번호 정리
        try { sessionStorage.removeItem(LS_KEY_SESSION_PW); } catch (e) { /* ignore */ }
    }

    /**
     * 초기화 상태 리셋 (재시도용)
     * @returns {void}
     */
    function reset() {
        destroy();
    }

    /**
     * 세션 비밀번호로만 자동 초기화 (프롬프트 없음)
     * 메인 페이지에서 비밀번호를 입력한 뒤, 시료 페이지에서 호출.
     * 세션 비밀번호가 없으면 조용히 실패 (false 반환).
     * @returns {Promise<boolean>}
     */
    async function initSilent() {
        if (_initialized) return !!_cryptoKey;
        if (_initInProgress) return _initPromise || false;
        _initInProgress = true;

        if (!window.CryptoUtils) {
            _initInProgress = false;
            return false;
        }

        try {
            const storedPassword = await getStoredSessionPassword();
            if (!storedPassword) {
                console.log('[Encryption] Silent init: no session password - skipping');
                _initInProgress = false;
                return false;
            }

            // 키 파일 로드
            _keyFileContent = await loadKeyFileContent();
            if (!_keyFileContent) {
                _initInProgress = false;
                return false;
            }

            // Salt 로드
            _salt = await loadSalt();
            const isNewSalt = !_salt;

            // 세션 비밀번호로 키 유도
            const result = await window.CryptoUtils.createMasterKey(
                storedPassword, _keyFileContent, _salt
            );
            _cryptoKey = result.key;
            _salt = result.salt;

            if (isNewSalt) await saveSalt(_salt);

            const silentVerify = await verifyKeyWithData(_cryptoKey);
            if (silentVerify.verified) {
                _initialized = true;
                _keyFileContent = null;
                console.log('[Encryption] Silent init SUCCESS');
                _initInProgress = false;
                return true;
            }

            _cryptoKey = null;
            _keyFileContent = null;
            _initInProgress = false;
            return false;
        } catch (err) {
            console.warn('[Encryption] Silent init failed:', err.message);
            _keyFileContent = null;
            _initInProgress = false;
            return false;
        }
    }

    return {
        init: initEncryption,
        initSilent,
        isReady,
        getKey,
        getKeySource,
        destroy,
        reset,
        regenerateKey,
        verifyPassword,
        verifyPasswordForExport,
        changePassword,
        recoverPassword,
        checkRecoveryBlobExists,
        regenerateRecoveryKey,
        exportKeyFile,
        importKeyFile,
        // 모달 cleanup (페이지 이동 시 dangling Promise 방지)
        _cleanupModal() {
            if (_activeModalResolve) {
                _activeModalResolve();
                _activeModalResolve = null;
            }
        }
    };
})();

// 전역으로 내보내기
window.encryptionManager = EncryptionManager;

// 페이지 이동 시 열려있는 모달 정리 (dangling Promise 방지)
window.addEventListener('beforeunload', () => {
    if (typeof EncryptionManager._cleanupModal === 'function') {
        EncryptionManager._cleanupModal();
    }
});
