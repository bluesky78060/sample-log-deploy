/**
 * @fileoverview 암호화/복호화 유틸리티 모듈
 * @description AES-256-GCM 기반 민감 필드 암호화/복호화
 *
 * 암호화 대상 필드:
 * - name, phone, address, birthDate, corpNumber,
 *   parcels, phoneNumber, farmAddress
 *
 * 암호화된 레코드 구조:
 * {
 *   id: "soil-2026-001",           // 평문
 *   receptionNumber: "2026-001",   // 평문
 *   date: "2026-02-08",            // 평문
 *   _enc: {                        // 암호화된 민감 필드
 *     v: "2.0",
 *     name: { iv: "Base64...", ct: "Base64..." },
 *     phone: { iv: "Base64...", ct: "Base64..." },
 *     address: { iv: "Base64...", ct: "Base64..." }
 *   }
 * }
 */

const CryptoUtils = (function() {
    'use strict';

    /** 암호화 대상 민감 필드 목록 */
    const SENSITIVE_FIELDS = [
        'name', 'phone', 'address', 'birthDate',
        'corpNumber', 'parcels', 'phoneNumber', 'farmAddress'
    ];

    /** 암호화 버전 */
    const ENCRYPTION_VERSION = '2.0';

    // ========================================
    // Base64 유틸리티
    // ========================================

    /**
     * ArrayBuffer를 Base64 문자열로 변환
     * @param {ArrayBuffer} buffer - 변환할 ArrayBuffer
     * @returns {string} Base64 인코딩된 문자열
     */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64 문자열을 ArrayBuffer로 변환
     * @param {string} base64 - Base64 인코딩된 문자열
     * @returns {ArrayBuffer} 변환된 ArrayBuffer
     */
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // ========================================
    // 상수
    // ========================================

    /** 암호화 알고리즘 */
    const ALGORITHM = 'AES-GCM';
    /** 키 길이 (비트) */
    const KEY_LENGTH = 256;
    /** IV 길이 (바이트) */
    const IV_LENGTH = 12;
    /** Salt 길이 (바이트) */
    const SALT_LENGTH = 16;
    /** PBKDF2 반복 횟수 (OWASP 2025 권장) */
    const PBKDF2_ITERATIONS = 600000;
    /** 키 유도 해시 알고리즘 */
    const KDF_HASH = 'SHA-256';

    // ========================================
    // 키 유도 함수 (PBKDF2)
    // ========================================

    /**
     * 문자열을 Uint8Array로 변환
     * @param {string} str - 변환할 문자열
     * @returns {Uint8Array} UTF-8 인코딩된 바이트 배열
     */
    function stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * 비밀번호 + 키 파일 해시로 복합 키 소재 생성
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용 (Base64)
     * @returns {Promise<string>} 결합된 키 소재
     */
    async function createCompositeInput(password, keyFileContent) {
        const keyFileBuffer = stringToBuffer(keyFileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', keyFileBuffer);
        const keyFileHash = bufferToBase64(hashBuffer);
        return password + keyFileHash;
    }

    /**
     * PBKDF2로 AES-256-GCM 키 유도
     * @param {string} compositeInput - 복합 키 소재
     * @param {ArrayBuffer} salt - 16바이트 Salt
     * @returns {Promise<CryptoKey>} AES-GCM CryptoKey
     */
    async function deriveKey(compositeInput, salt, extractable = false) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            stringToBuffer(compositeInput),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: KDF_HASH
            },
            keyMaterial,
            { name: ALGORITHM, length: KEY_LENGTH },
            extractable,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 비밀번호 + 키 파일에서 마스터 키 생성
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용
     * @param {ArrayBuffer} [salt] - Salt (없으면 새로 생성)
     * @returns {Promise<{key: CryptoKey, salt: ArrayBuffer}>}
     */
    async function createMasterKey(password, keyFileContent, salt, extractable = false) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer;
        }
        const compositeInput = await createCompositeInput(password, keyFileContent);
        const key = await deriveKey(compositeInput, salt, extractable);
        return { key, salt };
    }

    // ========================================
    // 단일 값 암호화/복호화
    // ========================================

    /**
     * 평문 텍스트를 AES-256-GCM으로 암호화
     * @param {string} plainText - 암호화할 평문
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @param {string} [aad] - Additional Authenticated Data (암호문 치환 공격 방지)
     * @returns {Promise<{iv: string, ct: string}>} Base64 인코딩된 IV와 암호문
     */
    async function encrypt(plainText, key, aad) {
        if (!plainText || typeof plainText !== 'string') {
            return null;
        }

        // 12바이트 랜덤 IV 생성 (GCM 권장)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // UTF-8 인코딩
        const encoder = new TextEncoder();
        const data = encoder.encode(plainText);

        // AES-GCM 암호화 (AAD로 필드 바인딩 → 암호문 치환 방지)
        const gcmParams = { name: 'AES-GCM', iv: iv };
        if (aad) {
            gcmParams.additionalData = encoder.encode(aad);
        }
        const encrypted = await crypto.subtle.encrypt(gcmParams, key, data);

        return {
            iv: bufferToBase64(iv.buffer),
            ct: bufferToBase64(encrypted)
        };
    }

    /**
     * AES-256-GCM 암호문을 복호화
     * @param {string} ivBase64 - Base64 인코딩된 IV
     * @param {string} ctBase64 - Base64 인코딩된 암호문
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @param {string} [aad] - Additional Authenticated Data (암호화 시 사용한 것과 동일해야 함)
     * @returns {Promise<string>} 복호화된 평문
     */
    async function decrypt(ivBase64, ctBase64, key, aad) {
        if (!ivBase64 || !ctBase64) {
            return null;
        }

        const iv = new Uint8Array(base64ToBuffer(ivBase64));
        const ciphertext = base64ToBuffer(ctBase64);

        // AES-GCM 복호화
        const gcmParams = { name: 'AES-GCM', iv: iv };
        if (aad) {
            gcmParams.additionalData = new TextEncoder().encode(aad);
        }
        const decrypted = await crypto.subtle.decrypt(gcmParams, key, ciphertext);

        // UTF-8 디코딩
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    // ========================================
    // 레코드 단위 암호화/복호화
    // ========================================

    /**
     * 레코드의 민감 필드를 암호화
     * 평문 필드를 제거하고 _enc 객체에 암호화된 값을 저장
     * @param {Object} record - 원본 레코드
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @returns {Promise<Object>} 암호화된 레코드
     */
    async function encryptRecord(record, key) {
        if (!record || !key) return record;

        const encrypted = { ...record };
        const enc = { v: '2.1' }; // v2.1: AAD 적용 (필드명 바인딩)
        let hasEncryptedFields = false;

        for (const field of SENSITIVE_FIELDS) {
            const value = record[field];
            if (value !== undefined && value !== null && value !== '') {
                try {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    // AAD = 필드명 (암호문 치환 공격 방지: 다른 필드로 이동 시 복호화 실패)
                    enc[field] = await encrypt(stringValue, key, field);
                    // 평문 필드 제거
                    delete encrypted[field];
                    hasEncryptedFields = true;
                } catch (err) {
                    console.warn(`[CryptoUtils] Failed to encrypt field "${field}":`, err);
                    // 암호화 실패 시 원본 유지
                }
            }
        }

        if (hasEncryptedFields) {
            encrypted._enc = enc;
        }

        return encrypted;
    }

    /**
     * 레코드의 암호화된 필드를 복호화
     * _enc 객체에서 복호화하여 평문 필드로 복원
     * _enc가 없는 레코드는 그대로 반환 (하위 호환성)
     * @param {Object} record - 암호화된 레코드
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @returns {Promise<Object>} 복호화된 레코드
     */
    async function decryptRecord(record, key) {
        if (!record || !key) return record;

        // _enc 필드가 없으면 평문 레코드 → 그대로 반환
        if (!record._enc) return record;

        const decrypted = { ...record };
        const enc = record._enc;

        // v2.1: AAD(필드명) 사용, v2.0 이하: AAD 없이 복호화 (하위 호환)
        const useAAD = enc.v === '2.1';

        for (const field of SENSITIVE_FIELDS) {
            if (enc[field] && enc[field].iv && enc[field].ct) {
                try {
                    const aad = useAAD ? field : undefined;
                    const plainText = await decrypt(enc[field].iv, enc[field].ct, key, aad);
                    if (plainText !== null) {
                        // parcels 필드는 JSON 파싱 시도
                        if (field === 'parcels') {
                            try {
                                decrypted[field] = JSON.parse(plainText);
                            } catch {
                                decrypted[field] = plainText;
                            }
                        } else {
                            decrypted[field] = plainText;
                        }
                    }
                } catch (err) {
                    console.warn(`[CryptoUtils] Failed to decrypt field "${field}":`, err);
                    // 복호화 실패 시 타입에 맞는 기본값으로 표시
                    if (field === 'parcels') {
                        decrypted[field] = []; // parcels는 배열이어야 함
                    } else {
                        decrypted[field] = '[복호화 실패]';
                    }
                }
            }
        }

        // _enc 필드 제거 (UI에서 불필요)
        delete decrypted._enc;

        return decrypted;
    }

    // ========================================
    // 배열 단위 암호화/복호화
    // ========================================

    /** 병렬 처리 시 청크 크기 */
    const PARALLEL_CHUNK_SIZE = 10;

    /**
     * 레코드 배열을 일괄 암호화
     * @param {Array<Object>} records - 원본 레코드 배열
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @returns {Promise<Array<Object>>} 암호화된 레코드 배열
     */

    async function encryptRecords(records, key) {
        if (!Array.isArray(records) || !key) return records;

        const results = new Array(records.length);
        for (let i = 0; i < records.length; i += PARALLEL_CHUNK_SIZE) {
            const chunk = records.slice(i, i + PARALLEL_CHUNK_SIZE);
            const encrypted = await Promise.all(chunk.map(r => encryptRecord(r, key)));
            for (let j = 0; j < encrypted.length; j++) {
                results[i + j] = encrypted[j];
            }
        }
        return results;
    }

    /**
     * 레코드 배열을 일괄 복호화 (청크 병렬 처리)
     * @param {Array<Object>} records - 암호화된 레코드 배열
     * @param {CryptoKey} key - AES-GCM CryptoKey
     * @returns {Promise<Array<Object>>} 복호화된 레코드 배열
     */
    async function decryptRecords(records, key) {
        if (!Array.isArray(records) || !key) return records;

        const results = new Array(records.length);
        for (let i = 0; i < records.length; i += PARALLEL_CHUNK_SIZE) {
            const chunk = records.slice(i, i + PARALLEL_CHUNK_SIZE);
            const decrypted = await Promise.all(chunk.map(r => decryptRecord(r, key)));
            for (let j = 0; j < decrypted.length; j++) {
                results[i + j] = decrypted[j];
            }
        }
        return results;
    }

    // ========================================
    // 유틸리티
    // ========================================

    /**
     * 레코드가 암호화되어 있는지 확인
     * @param {Object} record - 확인할 레코드
     * @returns {boolean} 암호화 여부
     */
    function isEncrypted(record) {
        return !!(record && record._enc && record._enc.v);
    }

    /**
     * 민감 필드 목록 반환
     * @returns {Array<string>} 민감 필드 이름 배열
     */
    function getSensitiveFields() {
        return [...SENSITIVE_FIELDS];
    }

    // ========================================
    // 비밀번호 검증
    // ========================================

    /**
     * 비밀번호 강도 검증 (DATA_ENCRYPTION_SPEC.md 섹션 3.3 준수)
     *
     * 규칙:
     * - 최소 8자, 최대 64자
     * - 소문자 1개 이상
     * - 숫자 1개 이상
     * - 특수문자 1개 이상
     *
     * @param {string} password - 검증할 비밀번호
     * @returns {{valid: boolean, strength: string, errors: string[]}}
     */
    function validatePassword(password) {
        const errors = [];

        if (!password || password.length < 8) {
            errors.push('비밀번호는 8자 이상이어야 합니다');
        }
        if (password && password.length > 64) {
            errors.push('비밀번호는 64자 이하여야 합니다');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('소문자를 1개 이상 포함해야 합니다');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('숫자를 1개 이상 포함해야 합니다');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('특수문자를 1개 이상 포함해야 합니다');
        }

        let strength = '약함';
        if (errors.length === 0) {
            strength = password.length >= 12 ? '강함' : '보통';
        }

        return { valid: errors.length === 0, strength, errors };
    }

    // ========================================
    // 키 파일 생성
    // ========================================

    /**
     * 새 키 파일 내용 생성 (32바이트 CSPRNG 랜덤)
     * @returns {string} Base64 인코딩된 키 파일 내용 (~44자)
     */
    function generateKeyFileContent() {
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));
        return bufferToBase64(randomBytes.buffer);
    }

    // ========================================
    // 비밀번호 검증 UI 헬퍼
    // ========================================

    /**
     * 비밀번호 규칙 표시기 + 강도 바 HTML 생성
     * @param {string} prefix - DOM ID 접두사 (충돌 방지)
     * @returns {string} HTML 문자열
     */
    function createPasswordRulesHTML(prefix) {
        // prefix 새니타이징: DOM ID에 안전한 문자만 허용 (attribute injection 방지)
        prefix = prefix.replace(/[^a-zA-Z0-9\-_]/g, '');
        return `
            <div class="enc-password-rules" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 12px; color: #15803D;">
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #166534;">비밀번호 규칙</div>
                <div id="${prefix}-rule-length" style="color: #15803D; margin-bottom: 2px;">\u2022 8~64자 길이</div>
                <div id="${prefix}-rule-lower" style="color: #15803D; margin-bottom: 2px;">\u2022 소문자 포함 (필수)</div>
                <div id="${prefix}-rule-number" style="color: #15803D; margin-bottom: 2px;">\u2022 숫자 포함 (필수)</div>
                <div id="${prefix}-rule-special" style="color: #15803D; margin-bottom: 2px;">\u2022 특수문자 포함 (필수)</div>
                <div id="${prefix}-rule-upper" style="color: #9CA3AF; font-size: 12px;">\u2022 대문자 포함 (권장)</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 500; color: #6B7280;">비밀번호 강도</span>
                <span id="${prefix}-strength-text" style="font-size: 12px; font-weight: 600; color: #9CA3AF;">-</span>
            </div>
            <div id="${prefix}-strength-bar" style="height: 6px; border-radius: 3px; background: #E5E7EB; margin-bottom: 16px; transition: all 0.3s;">
                <div id="${prefix}-strength-fill" style="height: 100%; border-radius: 3px; width: 0; transition: all 0.3s;"></div>
            </div>`;
    }

    /**
     * 비밀번호 검증 UI 로직을 DOM 요소에 바인딩
     * @param {Object} options
     * @param {string} options.prefix - DOM ID 접두사
     * @param {HTMLInputElement} options.input - 비밀번호 입력 필드
     * @param {HTMLInputElement} [options.confirmInput] - 비밀번호 확인 입력 필드
     * @param {HTMLButtonElement} options.submitBtn - 제출 버튼
     * @param {string} [options.submitColor='#4A90D9'] - 활성화 시 버튼 색상
     * @param {Function} [options.extraCheck] - 추가 활성화 조건 (true면 활성화 허용)
     * @returns {{ updateValidation: Function }}
     */
    function bindPasswordValidation(options) {
        const { prefix, input, confirmInput, submitBtn, submitColor = '#4A90D9', extraCheck, verifyMode = false } = options;

        const strengthFill = document.getElementById(`${prefix}-strength-fill`);
        const strengthText = document.getElementById(`${prefix}-strength-text`);
        const ruleLength = document.getElementById(`${prefix}-rule-length`);
        const ruleLower = document.getElementById(`${prefix}-rule-lower`);
        const ruleNumber = document.getElementById(`${prefix}-rule-number`);
        const ruleSpecial = document.getElementById(`${prefix}-rule-special`);
        const ruleUpper = document.getElementById(`${prefix}-rule-upper`);

        function updateRuleUI(el, passed) {
            el.style.color = passed ? '#16A34A' : '#15803D';
            el.textContent = (passed ? '\u2713 ' : '\u2022 ') + el.textContent.replace(/^[\u2713\u2022] /, '');
        }

        function updateValidation() {
            const pw = input.value;
            const hasValidLength = pw.length >= 8 && pw.length <= 64;
            const hasLower = /[a-z]/.test(pw);
            const hasNumber = /[0-9]/.test(pw);
            const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
            const hasUpper = /[A-Z]/.test(pw);

            updateRuleUI(ruleLength, hasValidLength);
            updateRuleUI(ruleLower, hasLower);
            updateRuleUI(ruleNumber, hasNumber);
            updateRuleUI(ruleSpecial, hasSpecial);
            // 대문자는 권장 사항 (색상만 변경, 필수 아님)
            if (ruleUpper) {
                ruleUpper.style.color = hasUpper ? '#16A34A' : '#9CA3AF';
                ruleUpper.textContent = (hasUpper ? '\u2713 ' : '\u2022 ') + ruleUpper.textContent.replace(/^[\u2713\u2022] /, '');
            }

            const allValid = hasValidLength && hasLower && hasNumber && hasSpecial;

            // 강도 표시 (대문자 포함 시 보너스)
            if (pw.length === 0) {
                strengthFill.style.width = '0';
                strengthFill.style.background = '#E5E7EB';
                strengthText.textContent = '-';
                strengthText.style.color = '#9CA3AF';
            } else if (!allValid) {
                strengthFill.style.width = '33%';
                strengthFill.style.background = '#EF4444';
                strengthText.textContent = '요건 미충족';
                strengthText.style.color = '#EF4444';
            } else if (verifyMode) {
                // 검증 모드: 강도 대신 "입력 완료" 표시
                strengthFill.style.width = '100%';
                strengthFill.style.background = 'linear-gradient(90deg, #22C55E, #16A34A)';
                strengthText.textContent = '입력 완료';
                strengthText.style.color = '#16A34A';
            } else if (pw.length >= 12 || (pw.length >= 10 && hasUpper)) {
                strengthFill.style.width = '100%';
                strengthFill.style.background = 'linear-gradient(90deg, #22C55E, #16A34A)';
                strengthText.textContent = '강함';
                strengthText.style.color = '#16A34A';
            } else {
                strengthFill.style.width = '66%';
                strengthFill.style.background = 'linear-gradient(90deg, #F59E0B, #EAB308)';
                strengthText.textContent = '보통';
                strengthText.style.color = '#F59E0B';
            }

            // 버튼 활성화 조건
            let canSubmit = allValid;
            if (confirmInput) {
                canSubmit = canSubmit && (pw === confirmInput.value && confirmInput.value.length > 0);
            }
            if (extraCheck) {
                canSubmit = canSubmit && extraCheck();
            }

            if (canSubmit) {
                submitBtn.disabled = false;
                submitBtn.style.background = submitColor;
                submitBtn.style.cursor = 'pointer';
            } else {
                submitBtn.disabled = true;
                submitBtn.style.background = '#ccc';
                submitBtn.style.cursor = 'default';
            }
        }

        // 이벤트 바인딩
        input.addEventListener('input', updateValidation);
        if (confirmInput) {
            confirmInput.addEventListener('input', updateValidation);
        }

        return { updateValidation };
    }

    // ========================================
    // 로컬 저장소 암호화 헬퍼
    // ========================================

    /**
     * 데이터를 암호화하여 localStorage에 저장
     * @param {string} key - localStorage 키
     * @param {*} data - 저장할 데이터 (JSON 직렬화 가능해야 함)
     */
    async function saveToLocalStorage(key, data) {
        try {
            if (window.encryptionManager?.isReady()) {
                const encKey = window.encryptionManager.getKey();
                const jsonStr = JSON.stringify(data);
                const enc = await encrypt(jsonStr, encKey);
                localStorage.setItem(key, JSON.stringify({ _localEnc: true, iv: enc.iv, ct: enc.ct }));
            } else {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (err) {
            console.error('[SecureStorage] 암호화 저장 실패:', err.message);
            if (window.encryptionManager?.isReady()) {
                // 암호화가 활성화된 상태에서 실패하면 저장 중단 (평문 폴백 금지)
                throw new Error('데이터 암호화에 실패하여 저장을 중단합니다: ' + err.message);
            }
            // 암호화가 비활성화된 상태에서의 일반 오류는 평문 저장 허용
            localStorage.setItem(key, JSON.stringify(data));
        }
    }

    /**
     * localStorage에서 데이터를 로드하고 필요시 복호화
     * @param {string} key - localStorage 키
     * @returns {Promise<*>} 파싱된 데이터 또는 null
     */
    async function loadFromLocalStorage(key) {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw);

            // 암호화된 데이터
            if (parsed && parsed._localEnc && parsed.iv && parsed.ct) {
                if (window.encryptionManager?.isReady()) {
                    const encKey = window.encryptionManager.getKey();
                    const decrypted = await decrypt(parsed.iv, parsed.ct, encKey);
                    return JSON.parse(decrypted);
                }
                console.warn('[SecureStorage] 암호화된 데이터이나 키 미준비:', key);
                return null;
            }

            // 평문 데이터 (하위 호환)
            return parsed;
        } catch (e) {
            console.error('[SecureStorage] 로드 실패:', key, e.message);
            return null;
        }
    }

    /**
     * 데이터를 암호화하여 문자열로 변환 (파일 저장용)
     * Firebase와 동일한 레코드별 필드 암호화 방식 사용
     * @param {*} data - 저장할 데이터 (문자열 또는 {version, exportDate, totalRecords, data: [...]})
     * @returns {Promise<string>} 암호화된 JSON 문자열
     */
    async function encryptForFile(data) {
        if (window.encryptionManager?.isReady()) {
            const encKey = window.encryptionManager.getKey();
            const obj = typeof data === 'string' ? JSON.parse(data) : data;

            // data 배열이 있는 구조: 레코드별 필드 암호화
            if (obj && Array.isArray(obj.data)) {
                const encryptedData = await encryptRecords(obj.data, encKey);
                return JSON.stringify({
                    ...obj,
                    _fileEnc: '2.1',
                    data: encryptedData
                }, null, 2);
            }

            // 배열만 있는 경우
            if (Array.isArray(obj)) {
                const encryptedData = await encryptRecords(obj, encKey);
                return JSON.stringify(encryptedData, null, 2);
            }

            // 기타: 통째 암호화 폴백
            const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
            const enc = await encrypt(jsonStr, encKey);
            return JSON.stringify({ _localEnc: true, iv: enc.iv, ct: enc.ct }, null, 2);
        }
        return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    /**
     * 암호화된 파일 내용을 복호화
     * 레코드별 필드 암호화(_fileEnc) 및 레거시 통째 암호화(_localEnc) 모두 지원
     * @param {string} content - 파일 내용 (암호화 또는 평문)
     * @returns {Promise<*>} 파싱된 데이터
     */
    async function decryptFromFile(content) {
        if (!content) return null;
        try {
            const parsed = JSON.parse(content);

            // 새 방식: 레코드별 필드 암호화 (_fileEnc)
            if (parsed && parsed._fileEnc && Array.isArray(parsed.data)) {
                if (window.encryptionManager?.isReady()) {
                    const encKey = window.encryptionManager.getKey();
                    const decryptedData = await decryptRecords(parsed.data, encKey);
                    const result = { ...parsed, data: decryptedData };
                    delete result._fileEnc;
                    return result;
                }
                console.warn('[SecureStorage] 암호화된 파일이나 키 미준비');
                return null;
            }

            // 레거시 방식: 통째 암호화 (_localEnc) - 하위 호환
            if (parsed && parsed._localEnc && parsed.iv && parsed.ct) {
                if (window.encryptionManager?.isReady()) {
                    const encKey = window.encryptionManager.getKey();
                    const decrypted = await decrypt(parsed.iv, parsed.ct, encKey);
                    return JSON.parse(decrypted);
                }
                console.warn('[SecureStorage] 암호화된 파일이나 키 미준비');
                return null;
            }

            return parsed;
        } catch (e) {
            console.error('[SecureStorage] 파일 복호화 실패:', e.message);
            return null;
        }
    }

    // ========================================
    // Public API
    // ========================================

    return {
        // 키 관리 (PBKDF2)
        createMasterKey,
        generateKeyFileContent,
        validatePassword,

        // 단일 값
        encrypt,
        decrypt,

        // 레코드 단위
        encryptRecord,
        decryptRecord,

        // 배열 단위
        encryptRecords,
        decryptRecords,

        // 유틸리티
        isEncrypted,
        getSensitiveFields,
        bufferToBase64,
        base64ToBuffer,

        // 비밀번호 검증 UI 헬퍼
        createPasswordRulesHTML,
        bindPasswordValidation,

        // 로컬 저장소 암호화
        saveToLocalStorage,
        loadFromLocalStorage,
        encryptForFile,
        decryptFromFile,

        // 상수
        SENSITIVE_FIELDS,
        ENCRYPTION_VERSION,
        PBKDF2_ITERATIONS
    };
})();

// 전역으로 내보내기
window.CryptoUtils = CryptoUtils;
