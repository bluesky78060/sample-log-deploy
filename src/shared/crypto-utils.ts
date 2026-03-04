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

// ========================================
// 타입 정의
// ========================================

/** 암호화된 필드 값 */
interface EncryptedFieldValue {
    iv: string;
    ct: string;
}

/** 암호화된 필드 객체 */
interface EncryptedFields {
    v: string;
    name?: EncryptedFieldValue;
    phone?: EncryptedFieldValue;
    address?: EncryptedFieldValue;
    birthDate?: EncryptedFieldValue;
    corpNumber?: EncryptedFieldValue;
    parcels?: EncryptedFieldValue;
    phoneNumber?: EncryptedFieldValue;
    farmAddress?: EncryptedFieldValue;
    [key: string]: string | EncryptedFieldValue | undefined;
}

/** 암호화된 레코드 */
interface EncryptedRecord {
    id?: string;
    _enc?: EncryptedFields;
    [key: string]: unknown;
}

/** 평문 레코드 */
interface PlainRecord {
    id?: string;
    name?: string;
    phone?: string;
    address?: string;
    birthDate?: string;
    corpNumber?: string;
    parcels?: unknown[] | string;
    phoneNumber?: string;
    farmAddress?: string;
    [key: string]: unknown;
}

/** 마스터 키 생성 결과 */
interface MasterKeyResult {
    key: CryptoKey;
    salt: ArrayBuffer;
}

/** 비밀번호 검증 결과 */
interface PasswordValidationResult {
    valid: boolean;
    strength: '약함' | '보통' | '강함';
    errors: string[];
}

/** 비밀번호 검증 UI 바인딩 옵션 */
interface PasswordValidationOptions {
    prefix: string;
    input: HTMLInputElement;
    confirmInput?: HTMLInputElement;
    submitBtn: HTMLButtonElement;
    submitColor?: string;
    extraCheck?: () => boolean;
    verifyMode?: boolean;
}

/** 비밀번호 검증 UI 바인딩 결과 */
interface PasswordValidationBindResult {
    updateValidation: () => void;
}

/** 로컬 암호화 데이터 구조 */
interface LocalEncryptedData {
    _localEnc: true;
    iv: string;
    ct: string;
}

/** 파일 암호화 데이터 구조 */
interface FileEncryptedData {
    _fileEnc: string;
    data: unknown[];
    version?: string;
    exportDate?: string;
    totalRecords?: number;
}

/** EncryptionManager 인터페이스 */
interface EncryptionManager {
    isReady(): boolean;
    getKey(): CryptoKey | null;
}

/** Window 확장 */
interface WindowWithEncryption {
    encryptionManager?: EncryptionManager;
    CryptoUtils?: CryptoUtilsInterface;
}

// ========================================
// 민감 필드 목록
// ========================================

/** 암호화 대상 민감 필드 목록 */
const SENSITIVE_FIELDS: readonly string[] = [
    'name', 'phone', 'address', 'birthDate',
    'corpNumber', 'parcels', 'phoneNumber', 'farmAddress'
] as const;

/** 암호화 버전 */
const ENCRYPTION_VERSION = '2.0';

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
/** 병렬 처리 시 청크 크기 */
const PARALLEL_CHUNK_SIZE = 10;

// ========================================
// Base64 유틸리티
// ========================================

/**
 * ArrayBuffer를 Base64 문자열로 변환
 * @param buffer - 변환할 ArrayBuffer
 * @returns Base64 인코딩된 문자열
 */
function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Base64 문자열을 ArrayBuffer로 변환
 * @param base64 - Base64 인코딩된 문자열
 * @returns 변환된 ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ========================================
// 키 유도 함수 (PBKDF2)
// ========================================

/**
 * 문자열을 Uint8Array로 변환
 * @param str - 변환할 문자열
 * @returns UTF-8 인코딩된 바이트 배열
 */
function stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

/**
 * 비밀번호 + 키 파일 해시로 복합 키 소재 생성
 * @param password - 사용자 비밀번호
 * @param keyFileContent - 키 파일 내용 (Base64)
 * @returns 결합된 키 소재
 */
async function createCompositeInput(password: string, keyFileContent: string): Promise<string> {
    const keyFileBuffer = stringToBuffer(keyFileContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyFileBuffer as BufferSource);
    const keyFileHash = bufferToBase64(hashBuffer);
    return password + keyFileHash;
}

/**
 * PBKDF2로 AES-256-GCM 키 유도
 * @param compositeInput - 복합 키 소재
 * @param salt - 16바이트 Salt
 * @param extractable - 키 추출 가능 여부
 * @returns AES-GCM CryptoKey
 */
async function deriveKey(compositeInput: string, salt: ArrayBuffer, extractable: boolean = false): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        stringToBuffer(compositeInput) as BufferSource,
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
 * @param password - 사용자 비밀번호
 * @param keyFileContent - 키 파일 내용
 * @param salt - Salt (없으면 새로 생성)
 * @param extractable - 키 추출 가능 여부
 * @returns {key: CryptoKey, salt: ArrayBuffer}
 */
async function createMasterKey(
    password: string,
    keyFileContent: string,
    salt?: ArrayBuffer,
    extractable: boolean = false
): Promise<MasterKeyResult> {
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
 * @param plainText - 암호화할 평문
 * @param key - AES-GCM CryptoKey
 * @param aad - Additional Authenticated Data (암호문 치환 공격 방지)
 * @returns Base64 인코딩된 IV와 암호문
 */
async function encrypt(plainText: string, key: CryptoKey, aad?: string): Promise<EncryptedFieldValue | null> {
    if (!plainText || typeof plainText !== 'string') {
        return null;
    }

    // 12바이트 랜덤 IV 생성 (GCM 권장)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // UTF-8 인코딩
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);

    // AES-GCM 암호화 (AAD로 필드 바인딩 → 암호문 치환 방지)
    const gcmParams: AesGcmParams = { name: 'AES-GCM', iv: iv as BufferSource };
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
 * @param ivBase64 - Base64 인코딩된 IV
 * @param ctBase64 - Base64 인코딩된 암호문
 * @param key - AES-GCM CryptoKey
 * @param aad - Additional Authenticated Data (암호화 시 사용한 것과 동일해야 함)
 * @returns 복호화된 평문
 */
async function decrypt(ivBase64: string, ctBase64: string, key: CryptoKey, aad?: string): Promise<string | null> {
    if (!ivBase64 || !ctBase64) {
        return null;
    }

    const iv = new Uint8Array(base64ToBuffer(ivBase64));
    const ciphertext = base64ToBuffer(ctBase64);

    // AES-GCM 복호화
    const gcmParams: AesGcmParams = { name: 'AES-GCM', iv: iv as BufferSource };
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
 * @param record - 원본 레코드
 * @param key - AES-GCM CryptoKey
 * @returns 암호화된 레코드
 */
async function encryptRecord(record: PlainRecord, key: CryptoKey): Promise<EncryptedRecord> {
    if (!record || !key) return record as EncryptedRecord;

    const encrypted: EncryptedRecord = { ...record };
    const enc: EncryptedFields = { v: '2.1' }; // v2.1: AAD 적용 (필드명 바인딩)
    let hasEncryptedFields = false;

    for (const field of SENSITIVE_FIELDS) {
        const value = record[field];
        if (value !== undefined && value !== null && value !== '') {
            try {
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                // AAD = 필드명 (암호문 치환 공격 방지: 다른 필드로 이동 시 복호화 실패)
                const encryptedValue = await encrypt(stringValue, key, field);
                if (encryptedValue) {
                    enc[field] = encryptedValue;
                    // 평문 필드 제거
                    delete encrypted[field];
                    hasEncryptedFields = true;
                }
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
 * @param record - 암호화된 레코드
 * @param key - AES-GCM CryptoKey
 * @returns 복호화된 레코드
 */
async function decryptRecord(record: EncryptedRecord, key: CryptoKey): Promise<PlainRecord> {
    if (!record || !key) return record as PlainRecord;

    // _enc 필드가 없으면 평문 레코드 → 그대로 반환
    if (!record._enc) return record as PlainRecord;

    const decrypted: PlainRecord = { ...record };
    const enc = record._enc;

    // v2.1: AAD(필드명) 사용, v2.0 이하: AAD 없이 복호화 (하위 호환)
    const useAAD = enc.v === '2.1';

    for (const field of SENSITIVE_FIELDS) {
        const encField = enc[field];
        if (encField && typeof encField === 'object' && 'iv' in encField && 'ct' in encField) {
            try {
                const aad = useAAD ? field : undefined;
                const plainText = await decrypt(encField.iv, encField.ct, key, aad);
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
    delete (decrypted as EncryptedRecord)._enc;

    return decrypted;
}

// ========================================
// 배열 단위 암호화/복호화
// ========================================

/**
 * 레코드 배열을 일괄 암호화
 * @param records - 원본 레코드 배열
 * @param key - AES-GCM CryptoKey
 * @returns 암호화된 레코드 배열
 */
async function encryptRecords(records: PlainRecord[], key: CryptoKey): Promise<EncryptedRecord[]> {
    if (!Array.isArray(records) || !key) return records as EncryptedRecord[];

    const results: EncryptedRecord[] = new Array(records.length);
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
 * @param records - 암호화된 레코드 배열
 * @param key - AES-GCM CryptoKey
 * @returns 복호화된 레코드 배열
 */
async function decryptRecords(records: EncryptedRecord[], key: CryptoKey): Promise<PlainRecord[]> {
    if (!Array.isArray(records) || !key) return records as PlainRecord[];

    const results: PlainRecord[] = new Array(records.length);
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
 * @param record - 확인할 레코드
 * @returns 암호화 여부
 */
function isEncrypted(record: unknown): boolean {
    const rec = record as EncryptedRecord | null;
    return !!(rec && rec._enc && rec._enc.v);
}

/**
 * 민감 필드 목록 반환
 * @returns 민감 필드 이름 배열
 */
function getSensitiveFields(): string[] {
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
 * @param password - 검증할 비밀번호
 * @returns {valid: boolean, strength: string, errors: string[]}
 */
function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

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
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push('특수문자를 1개 이상 포함해야 합니다');
    }

    let strength: '약함' | '보통' | '강함' = '약함';
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
 * @returns Base64 인코딩된 키 파일 내용 (~44자)
 */
function generateKeyFileContent(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return bufferToBase64(randomBytes.buffer);
}

// ========================================
// 비밀번호 검증 UI 헬퍼
// ========================================

/**
 * 비밀번호 규칙 표시기 + 강도 바 HTML 생성
 * @param prefix - DOM ID 접두사 (충돌 방지)
 * @returns HTML 문자열
 */
function createPasswordRulesHTML(prefix: string): string {
    // prefix 새니타이징: DOM ID에 안전한 문자만 허용 (attribute injection 방지)
    const safePrefix = prefix.replace(/[^a-zA-Z0-9\-_]/g, '');
    return `
        <div class="enc-password-rules" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 12px; color: #15803D;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #166534;">비밀번호 규칙</div>
            <div id="${safePrefix}-rule-length" style="color: #15803D; margin-bottom: 2px;">\u2022 8~64자 길이</div>
            <div id="${safePrefix}-rule-lower" style="color: #15803D; margin-bottom: 2px;">\u2022 소문자 포함 (필수)</div>
            <div id="${safePrefix}-rule-number" style="color: #15803D; margin-bottom: 2px;">\u2022 숫자 포함 (필수)</div>
            <div id="${safePrefix}-rule-special" style="color: #15803D; margin-bottom: 2px;">\u2022 특수문자 포함 (필수)</div>
            <div id="${safePrefix}-rule-upper" style="color: #9CA3AF; font-size: 12px;">\u2022 대문자 포함 (권장)</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 500; color: #6B7280;">비밀번호 강도</span>
            <span id="${safePrefix}-strength-text" style="font-size: 12px; font-weight: 600; color: #9CA3AF;">-</span>
        </div>
        <div id="${safePrefix}-strength-bar" style="height: 6px; border-radius: 3px; background: #E5E7EB; margin-bottom: 16px; transition: all 0.3s;">
            <div id="${safePrefix}-strength-fill" style="height: 100%; border-radius: 3px; width: 0; transition: all 0.3s;"></div>
        </div>`;
}

/**
 * 비밀번호 검증 UI 로직을 DOM 요소에 바인딩
 * @param options - 바인딩 옵션
 * @returns { updateValidation: Function }
 */
function bindPasswordValidation(options: PasswordValidationOptions): PasswordValidationBindResult {
    const { prefix, input, confirmInput, submitBtn, submitColor = '#4A90D9', extraCheck, verifyMode = false } = options;

    const strengthFill = document.getElementById(`${prefix}-strength-fill`) as HTMLElement | null;
    const strengthText = document.getElementById(`${prefix}-strength-text`) as HTMLElement | null;
    const ruleLength = document.getElementById(`${prefix}-rule-length`) as HTMLElement | null;
    const ruleLower = document.getElementById(`${prefix}-rule-lower`) as HTMLElement | null;
    const ruleNumber = document.getElementById(`${prefix}-rule-number`) as HTMLElement | null;
    const ruleSpecial = document.getElementById(`${prefix}-rule-special`) as HTMLElement | null;
    const ruleUpper = document.getElementById(`${prefix}-rule-upper`) as HTMLElement | null;

    function updateRuleUI(el: HTMLElement | null, passed: boolean): void {
        if (!el) return;
        el.style.color = passed ? '#16A34A' : '#15803D';
        el.textContent = (passed ? '\u2713 ' : '\u2022 ') + el.textContent!.replace(/^[\u2713\u2022] /, '');
    }

    function updateValidation(): void {
        const pw = input.value;
        const hasValidLength = pw.length >= 8 && pw.length <= 64;
        const hasLower = /[a-z]/.test(pw);
        const hasNumber = /[0-9]/.test(pw);
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw);
        const hasUpper = /[A-Z]/.test(pw);

        updateRuleUI(ruleLength, hasValidLength);
        updateRuleUI(ruleLower, hasLower);
        updateRuleUI(ruleNumber, hasNumber);
        updateRuleUI(ruleSpecial, hasSpecial);
        // 대문자는 권장 사항 (색상만 변경, 필수 아님)
        if (ruleUpper) {
            ruleUpper.style.color = hasUpper ? '#16A34A' : '#9CA3AF';
            ruleUpper.textContent = (hasUpper ? '\u2713 ' : '\u2022 ') + ruleUpper.textContent!.replace(/^[\u2713\u2022] /, '');
        }

        const allValid = hasValidLength && hasLower && hasNumber && hasSpecial;

        // 강도 표시 (대문자 포함 시 보너스)
        if (strengthFill && strengthText) {
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
 * @param key - localStorage 키
 * @param data - 저장할 데이터 (JSON 직렬화 가능해야 함)
 */
async function saveToLocalStorage(key: string, data: unknown): Promise<void> {
    const win = window as WindowWithEncryption;
    try {
        if (win.encryptionManager?.isReady()) {
            const encKey = win.encryptionManager.getKey();
            if (encKey) {
                const jsonStr = JSON.stringify(data);
                const enc = await encrypt(jsonStr, encKey);
                if (enc) {
                    const localEnc: LocalEncryptedData = { _localEnc: true, iv: enc.iv, ct: enc.ct };
                    localStorage.setItem(key, JSON.stringify(localEnc));
                    return;
                }
            }
        }
        localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
        console.error('[SecureStorage] 암호화 저장 실패:', (err as Error).message);
        if (win.encryptionManager?.isReady()) {
            // 암호화가 활성화된 상태에서 실패하면 저장 중단 (평문 폴백 금지)
            throw new Error('데이터 암호화에 실패하여 저장을 중단합니다: ' + (err as Error).message);
        }
        // 암호화가 비활성화된 상태에서의 일반 오류는 평문 저장 허용
        localStorage.setItem(key, JSON.stringify(data));
    }
}

/**
 * localStorage에서 데이터를 로드하고 필요시 복호화
 * @param key - localStorage 키
 * @returns 파싱된 데이터 또는 null
 */
async function loadFromLocalStorage<T = unknown>(key: string): Promise<T | null> {
    const win = window as WindowWithEncryption;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);

        // 암호화된 데이터
        if (parsed && (parsed as LocalEncryptedData)._localEnc && (parsed as LocalEncryptedData).iv && (parsed as LocalEncryptedData).ct) {
            if (win.encryptionManager?.isReady()) {
                const encKey = win.encryptionManager.getKey();
                if (encKey) {
                    const localEnc = parsed as LocalEncryptedData;
                    const decrypted = await decrypt(localEnc.iv, localEnc.ct, encKey);
                    if (decrypted) {
                        return JSON.parse(decrypted) as T;
                    }
                }
            }
            console.warn('[SecureStorage] 암호화된 데이터이나 키 미준비:', key);
            return null;
        }

        // 평문 데이터 (하위 호환)
        return parsed as T;
    } catch (e) {
        console.error('[SecureStorage] 로드 실패:', key, (e as Error).message);
        return null;
    }
}

/**
 * 데이터를 암호화하여 문자열로 변환 (파일 저장용)
 * Firebase와 동일한 레코드별 필드 암호화 방식 사용
 * @param data - 저장할 데이터 (문자열 또는 {version, exportDate, totalRecords, data: [...]})
 * @returns 암호화된 JSON 문자열
 */
async function encryptForFile(data: unknown): Promise<string> {
    const win = window as WindowWithEncryption;
    if (win.encryptionManager?.isReady()) {
        const encKey = win.encryptionManager.getKey();
        if (encKey) {
            const obj = typeof data === 'string' ? JSON.parse(data) : data;

            // data 배열이 있는 구조: 레코드별 필드 암호화
            if (obj && Array.isArray((obj as { data?: unknown[] }).data)) {
                const objWithData = obj as { data: PlainRecord[]; [key: string]: unknown };
                const encryptedData = await encryptRecords(objWithData.data, encKey);
                const result: FileEncryptedData = {
                    ...objWithData,
                    _fileEnc: '2.1',
                    data: encryptedData
                };
                return JSON.stringify(result, null, 2);
            }

            // 배열만 있는 경우
            if (Array.isArray(obj)) {
                const encryptedData = await encryptRecords(obj as PlainRecord[], encKey);
                return JSON.stringify(encryptedData, null, 2);
            }

            // 기타: 통째 암호화 폴백
            const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
            const enc = await encrypt(jsonStr, encKey);
            if (enc) {
                const localEnc: LocalEncryptedData = { _localEnc: true, iv: enc.iv, ct: enc.ct };
                return JSON.stringify(localEnc, null, 2);
            }
        }
    }
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

/**
 * 암호화된 파일 내용을 복호화
 * 레코드별 필드 암호화(_fileEnc) 및 레거시 통째 암호화(_localEnc) 모두 지원
 * @param content - 파일 내용 (암호화 또는 평문)
 * @returns 파싱된 데이터
 */
async function decryptFromFile<T = unknown>(content: string): Promise<T | null> {
    const win = window as WindowWithEncryption;
    if (!content) return null;
    try {
        const parsed = JSON.parse(content);

        // 새 방식: 레코드별 필드 암호화 (_fileEnc)
        if (parsed && (parsed as FileEncryptedData)._fileEnc && Array.isArray((parsed as FileEncryptedData).data)) {
            if (win.encryptionManager?.isReady()) {
                const encKey = win.encryptionManager.getKey();
                if (encKey) {
                    const fileEnc = parsed as FileEncryptedData;
                    const decryptedData = await decryptRecords(fileEnc.data as EncryptedRecord[], encKey);
                    const result = { ...fileEnc, data: decryptedData };
                    delete (result as { _fileEnc?: string })._fileEnc;
                    return result as T;
                }
            }
            console.warn('[SecureStorage] 암호화된 파일이나 키 미준비');
            return null;
        }

        // 레거시 방식: 통째 암호화 (_localEnc) - 하위 호환
        if (parsed && (parsed as LocalEncryptedData)._localEnc && (parsed as LocalEncryptedData).iv && (parsed as LocalEncryptedData).ct) {
            if (win.encryptionManager?.isReady()) {
                const encKey = win.encryptionManager.getKey();
                if (encKey) {
                    const localEnc = parsed as LocalEncryptedData;
                    const decrypted = await decrypt(localEnc.iv, localEnc.ct, encKey);
                    if (decrypted) {
                        return JSON.parse(decrypted) as T;
                    }
                }
            }
            console.warn('[SecureStorage] 암호화된 파일이나 키 미준비');
            return null;
        }

        return parsed as T;
    } catch (e) {
        console.error('[SecureStorage] 파일 복호화 실패:', (e as Error).message);
        return null;
    }
}

// ========================================
// CryptoUtils 인터페이스
// ========================================

interface CryptoUtilsInterface {
    // 키 관리 (PBKDF2)
    createMasterKey: typeof createMasterKey;
    generateKeyFileContent: typeof generateKeyFileContent;
    validatePassword: typeof validatePassword;

    // 단일 값
    encrypt: typeof encrypt;
    decrypt: typeof decrypt;

    // 레코드 단위
    encryptRecord: typeof encryptRecord;
    decryptRecord: typeof decryptRecord;

    // 배열 단위
    encryptRecords: typeof encryptRecords;
    decryptRecords: typeof decryptRecords;

    // 유틸리티
    isEncrypted: typeof isEncrypted;
    getSensitiveFields: typeof getSensitiveFields;
    bufferToBase64: typeof bufferToBase64;
    base64ToBuffer: typeof base64ToBuffer;

    // 비밀번호 검증 UI 헬퍼
    createPasswordRulesHTML: typeof createPasswordRulesHTML;
    bindPasswordValidation: typeof bindPasswordValidation;

    // 로컬 저장소 암호화
    saveToLocalStorage: typeof saveToLocalStorage;
    loadFromLocalStorage: typeof loadFromLocalStorage;
    encryptForFile: typeof encryptForFile;
    decryptFromFile: typeof decryptFromFile;

    // 상수
    SENSITIVE_FIELDS: readonly string[];
    ENCRYPTION_VERSION: string;
    PBKDF2_ITERATIONS: number;
}

// ========================================
// Public API
// ========================================

const CryptoUtils: CryptoUtilsInterface = {
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

// 전역으로 내보내기
(window as WindowWithEncryption).CryptoUtils = CryptoUtils;

export {
    // 타입 내보내기
    EncryptedFieldValue,
    EncryptedFields,
    EncryptedRecord,
    PlainRecord,
    MasterKeyResult,
    PasswordValidationResult,
    PasswordValidationOptions,
    PasswordValidationBindResult,
    LocalEncryptedData,
    FileEncryptedData,
    CryptoUtilsInterface,

    // 함수 내보내기
    bufferToBase64,
    base64ToBuffer,
    createMasterKey,
    encrypt,
    decrypt,
    encryptRecord,
    decryptRecord,
    encryptRecords,
    decryptRecords,
    isEncrypted,
    getSensitiveFields,
    validatePassword,
    generateKeyFileContent,
    createPasswordRulesHTML,
    bindPasswordValidation,
    saveToLocalStorage,
    loadFromLocalStorage,
    encryptForFile,
    decryptFromFile,
    CryptoUtils,

    // 상수 내보내기
    SENSITIVE_FIELDS,
    ENCRYPTION_VERSION,
    PBKDF2_ITERATIONS
};
