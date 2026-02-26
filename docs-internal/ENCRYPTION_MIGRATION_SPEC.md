# 암호화 시스템 마이그레이션 기술 문서

> **테스트 프로젝트 → 메인 프로젝트 암호화 이식 명세**
>
> 작성일: 2026-02-19
> 버전: v1.0
> 상태: 마이그레이션 미실행 (분석 완료)

---

## 목차

1. [개요](#1-개요)
2. [현재 상태 비교](#2-현재-상태-비교)
3. [암호화 아키텍처 (7계층)](#3-암호화-아키텍처-7계층)
4. [마이그레이션 대상 파일 목록](#4-마이그레이션-대상-파일-목록)
5. [계층별 마이그레이션 상세](#5-계층별-마이그레이션-상세)
6. [파일별 변경 사항 상세](#6-파일별-변경-사항-상세)
7. [기존 데이터 처리 전략](#7-기존-데이터-처리-전략)
8. [마이그레이션 실행 계획 (4단계)](#8-마이그레이션-실행-계획-4단계)
9. [위험 요소 및 완화 방안](#9-위험-요소-및-완화-방안)
10. [롤백 계획](#10-롤백-계획)
11. [테스트 검증 체크리스트](#11-테스트-검증-체크리스트)
12. [난이도 평가](#12-난이도-평가)

---

## 1. 개요

### 1.1 목적

테스트 프로젝트(`sample-log-electron-test/project`)에서 개발 및 검증된 AES-256-GCM 기반 민감 데이터 암호화 시스템을 메인 프로젝트(`sample-log-electron`)에 이식한다.

### 1.2 암호화 범위

| 항목 | 설명 |
|------|------|
| **알고리즘** | AES-256-GCM (Web Crypto API) |
| **키 유도** | PBKDF2 (SHA-256, 600,000 iterations) |
| **대상 필드** | name, phone, address, birthDate, corpNumber, parcels, phoneNumber, farmAddress |
| **적용 범위** | Firestore 저장/조회, localStorage 자동저장, JSON 파일 백업 |
| **부가 기능** | 비밀번호 변경, 복구 키 시스템, 평문 데이터 마이그레이션 |

### 1.3 핵심 원칙

- **평문 폴백 금지**: 암호화 활성 상태에서 암호화 실패 시 저장을 중단 (데이터 유출 방지)
- **투명 프록시 패턴**: 호출자(시료 스크립트)는 암호화 존재를 알 필요 없음
- **하위 호환성**: 암호화되지 않은 기존 데이터도 정상 조회 가능

---

## 2. 현재 상태 비교

### 2.1 파일 수 비교

| 구분 | 메인 프로젝트 | 테스트 프로젝트 |
|------|:------------:|:--------------:|
| 암호화 전용 모듈 | 0개 | 2개 (`crypto-utils.js`, `encryption-manager.js`) |
| 암호화 통합된 모듈 | 0개 | 4개 (`firestore-db.js`, `firebase-config.js`, `preload.js`, `index.js`) |
| 암호화 초기화 호출 | 0곳 | 7곳 (5 시료 + settings + index.html 엔트리) |
| 설정 UI | 0곳 | 1곳 (`settings-script.js` 암호화 섹션) |
| **총 변경 파일** | - | **18개** |

### 2.2 코드 규모

| 파일 | 줄 수 | 역할 |
|------|------:|------|
| `crypto-utils.js` | 711 | 암호화 기본 연산 (PBKDF2, AES-GCM, 레코드 암/복호화) |
| `encryption-manager.js` | ~950 | 키 라이프사이클, 비밀번호 UI, 복구 시스템 |
| `firestore-db.js` 추가분 | +330 | CRUD 함수에 암호화/복호화 통합 + reEncrypt 유틸 |
| `index.js` 추가분 | +148 | IPC 핸들러 (키 파일, Salt, 세션 비밀번호) |
| `preload.js` 추가분 | +40 | contextBridge API 노출 |
| `settings-script.js` 추가분 | ~300 | 암호화 관리 UI (비밀번호 변경, 복구, 평문 스캔) |
| **총 신규/변경 코드** | **~2,480줄** | |

### 2.3 메인 프로젝트 현재 상태

```
메인 프로젝트 암호화 관련:
├── crypto-utils.js         → 존재하지 않음
├── encryption-manager.js   → 존재하지 않음
├── firestore-db.js         → 순수 CRUD (461줄, 암호화 없음)
├── firebase-config.js      → window.firebase 전역 노출 없음
├── preload.js              → 암호화 관련 IPC 없음
├── index.js                → 암호화 IPC 핸들러 없음
├── settings/               → 암호화 UI 없음
└── 시료 스크립트 (5개)      → encryptionManager.init() 호출 없음
```

---

## 3. 암호화 아키텍처 (7계층)

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 7: 설정 UI (settings-script.js)                      │
│  · 비밀번호 변경/복구, 복구키 재발급, 평문 스캔/마이그레이션  │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: 앱 초기화 (시료 스크립트 5개 + 엔트리 파일)        │
│  · await encryptionManager.init() 호출                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Firestore 통합 (firestore-db.js)                  │
│  · 저장 시 암호화, 조회 시 복호화 (투명 프록시)              │
│  · 실시간 동기화 복호화, 재암호화 유틸리티                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Firebase 전역 설정 (firebase-config.js)           │
│  · window.firebase = firebase (IIFE 모듈 접근용)             │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Electron IPC (index.js + preload.js)              │
│  · 키 파일 읽기/쓰기 (safeStorage 보호)                     │
│  · Salt 저장/로드 (safeStorage 암호화)                      │
│  · 세션 비밀번호 관리 (메모리 전용)                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 키 라이프사이클 (encryption-manager.js)           │
│  · 키 파일 로드(Firebase→로컬 폴백→새 생성)                 │
│  · 비밀번호 프롬프트 → PBKDF2 마스터 키 유도                │
│  · 키 검증(암호화된 문서 복호화 시도)                        │
│  · 복구 키 생성/검증/복원                                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 암호화 기본 연산 (crypto-utils.js)                │
│  · PBKDF2 키 유도 (600K iterations)                         │
│  · AES-256-GCM 암호화/복호화                                │
│  · 레코드 단위 민감 필드 암/복호화                           │
│  · 비밀번호 검증 UI 헬퍼                                     │
│  · localStorage/파일 암호화 헬퍼                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 데이터 흐름

```
[저장 흐름]
호출자 → firestoreDb.save(data)
          ↓
      encryptionManager.isReady()?
      ├─ Yes → CryptoUtils.encryptRecord(data, masterKey)
      │         ↓
      │     _enc 객체 생성 { v:"2.0", name:{iv,ct}, phone:{iv,ct}, ... }
      │     평문 민감 필드 → FieldValue.delete()
      │         ↓
      │     Firestore에 암호문만 저장
      └─ No  → 평문 그대로 저장 (암호화 미활성)

[조회 흐름]
Firestore 문서 조회
          ↓
      _enc 필드 존재?
      ├─ Yes + 키 준비됨 → CryptoUtils.decryptRecord(doc, masterKey)
      │                     ↓
      │                 평문 필드 복원 + _enc 제거
      ├─ Yes + 키 미준비 → 경고 로그, 암호문 그대로 반환
      └─ No              → 평문 레코드 그대로 반환 (하위 호환)
```

### 3.2 키 유도 흐름

```
[최초 실행]
키 파일 없음
    ↓
CryptoUtils.generateKeyFileContent() → 32바이트 CSPRNG
    ↓
Firebase _system/encryptionKey에 저장
    ↓
showFirstTimePasswordPrompt() → 비밀번호 설정 (8~16자, 소문자+숫자+특수문자)
    ↓
CryptoUtils.createMasterKey(password, keyFileContent)
    ↓
PBKDF2(password + SHA256(keyFile), salt, 600000, SHA-256) → AES-256-GCM CryptoKey
    ↓
Salt를 Electron safeStorage에 저장
    ↓
복구 키 생성 → Firebase _system/recoveryBlob에 저장
    ↓
세션 비밀번호를 Main process 메모리에 저장 (safeStorage 암호화)

[이후 실행]
Firebase _system/encryptionKey에서 키 파일 로드
    ↓
showPasswordPrompt() → 비밀번호 입력 (또는 세션 비밀번호 자동 사용)
    ↓
CryptoUtils.createMasterKey(password, keyFileContent, savedSalt)
    ↓
verifyKeyWithData(key) → Firestore 암호화 문서 1건 복호화 시도
    ├─ 성공 → 키 확인 완료, 세션 시작
    └─ 실패 → 재시도 (최대 3회) → 복구 키 입력 제안
```

---

## 4. 마이그레이션 대상 파일 목록

### 4.1 신규 생성 파일 (2개)

| 파일 | 줄 수 | 설명 |
|------|------:|------|
| `src/shared/crypto-utils.js` | 711 | 그대로 복사 |
| `src/shared/encryption-manager.js` | ~950 | `test_` 접두사 관련 코드 제거 후 복사 |

### 4.2 수정 필요 파일 (12개)

| 파일 | 변경 유형 | 변경량 |
|------|----------|--------|
| `src/shared/firestore-db.js` | 암호화 통합 | +330줄 |
| `src/shared/firebase-config.js` | `window.firebase` 전역 추가 | +1줄 |
| `src/index.js` | IPC 핸들러 추가 | +148줄 |
| `src/preload.js` | contextBridge API 추가 | +40줄 |
| `src/soil/soil-script.js` | `encryptionManager.init()` 호출 추가 | +3줄 |
| `src/water/water-script.js` | `encryptionManager.init()` 호출 추가 | +3줄 |
| `src/compost/compost-script.js` | `encryptionManager.init()` 호출 추가 | +3줄 |
| `src/heavy-metal/heavy-metal-script.js` | `encryptionManager.init()` 호출 추가 | +3줄 |
| `src/pesticide/pesticide-script.js` | `encryptionManager.init()` 호출 추가 | +3줄 |
| `src/settings/settings-script.js` | 암호화 관리 UI 추가 | +300줄 |
| `src/settings/index.html` | 암호화 설정 섹션 HTML 추가 | +80줄 |
| `src/index.html` | 스크립트 태그 추가 (웹 환경) | +2줄 |

### 4.3 docs/ 동기화 (12개)

`src/` 변경 완료 후 `docs/`에 동일하게 반영 필요.

---

## 5. 계층별 마이그레이션 상세

### 5.1 Layer 1: crypto-utils.js (신규 생성)

**작업**: 테스트 프로젝트에서 그대로 복사
**변경 사항**: 없음 (테스트 환경 의존 코드 없음)

```
복사 경로: test/src/shared/crypto-utils.js → main/src/shared/crypto-utils.js
```

**주요 Public API:**

| 함수 | 용도 |
|------|------|
| `createMasterKey(password, keyFile, salt?)` | PBKDF2 마스터 키 유도 |
| `encrypt(plainText, key)` / `decrypt(iv, ct, key)` | 단일 값 AES-GCM |
| `encryptRecord(record, key)` / `decryptRecord(record, key)` | 레코드 단위 |
| `encryptRecords(records, key)` / `decryptRecords(records, key)` | 배열 단위 (10건 청크 병렬) |
| `validatePassword(password)` | 비밀번호 정책 검증 |
| `generateKeyFileContent()` | 32바이트 CSPRNG 키 파일 생성 |
| `createPasswordRulesHTML(prefix)` / `bindPasswordValidation(opts)` | UI 헬퍼 |
| `saveToLocalStorage(key, data)` / `loadFromLocalStorage(key)` | localStorage 암호화 |
| `encryptForFile(data)` / `decryptFromFile(content)` | 파일 저장 암호화 |

**의존성**: Web Crypto API (브라우저 내장), 외부 라이브러리 없음

### 5.2 Layer 2: encryption-manager.js (신규 생성 + 수정)

**작업**: 테스트 프로젝트에서 복사 후 `test_` 접두사 관련 코드 제거

**필수 수정 사항:**

```javascript
// 수정 전 (테스트):
function getCollectionPrefix() {
    if (window.firestoreDb?.getCollectionName) {
        return window.firestoreDb.getCollectionName('soil', 2000).startsWith('test_') ? 'test_' : '';
    }
    return '';
}

function getSystemCollection() {
    const prefix = getCollectionPrefix();
    return prefix ? prefix + 'system' : '_system';
}

// 수정 후 (메인):
function getSystemCollection() {
    return '_system';
}
```

**삭제 대상 코드:**
- `getCollectionPrefix()` 함수 전체
- `test__system` 레거시 컬렉션 폴백 로직 (loadKeyFileContent 내 L128-167)

**보존 코드 (중요):**
- `loadKeyFileContent()`: Firebase `_system` → Electron 로컬 파일 폴백 체인
- `showPasswordPrompt()` / `showFirstTimePasswordPrompt()`: 비밀번호 입력 UI
- `verifyKeyWithData()`: 키 검증 로직
- 복구 키 시스템 전체: `generateRecoveryKey()`, `createAndStoreRecoveryBlob()`, `decryptMasterKeyFromBlob()`, `ensureRecoveryBlob()`, `regenerateRecoveryKey()`
- `showRecoveryKeyModal()` / `showRecoveryKeyInputPrompt()`: 복구 UI
- Salt 관리: `loadSalt()`, `saveSalt()`
- 세션 비밀번호 자동 로드 (앱 재시작 없이 세션 유지)

**Public API:**

| 함수 | 용도 |
|------|------|
| `init()` | 전체 초기화 (키 로드 → 비밀번호 → 마스터 키 → 검증) |
| `initSilent()` | 무음 초기화 (UI 없이 세션 비밀번호만 시도) |
| `isReady()` | 마스터 키 준비 여부 |
| `getKey()` | CryptoKey 반환 |
| `getKeySource()` | 키 출처 ('firebase', 'local', 'generated') |
| `destroy()` | 세션 종료 (키 파기) |
| `verifyPassword(password)` | 비밀번호 검증 |
| `changePassword(oldPw, newPw)` | 비밀번호 변경 (전체 재암호화) |
| `recoverPassword(recoveryKey)` | 복구 키로 마스터 키 복원 |
| `regenerateRecoveryKey()` | 복구 키 재발급 |

### 5.3 Layer 3: Electron IPC (index.js + preload.js 수정)

#### 5.3.1 index.js (Main Process) — 추가할 IPC 핸들러

```javascript
// 상단에 상수 추가
const KEY_FILE_NAME = 'sample-log.key';
const SALT_FILE = 'salt.dat';

// IPC 핸들러 추가 (기존 핸들러 뒤에 추가)

// 1. 키 파일 존재 확인
ipcMain.handle('key-file-exists', async () => { ... });

// 2. 키 파일 읽기 (safeStorage 보호)
ipcMain.handle('read-key-file', async () => {
    // safeStorage 복호화 시도 → 실패 시 평문 읽기 후 safeStorage 마이그레이션
});

// 3. Salt 저장 (safeStorage 암호화)
ipcMain.handle('save-salt', async (event, saltBase64) => {
    // 입력 검증: Base64 형식, 20~64자
    // safeStorage 가용 시 암호화 저장, 불가 시 평문 (경고)
});

// 4. Salt 로드 (safeStorage 복호화)
ipcMain.handle('load-salt', async () => { ... });

// 5. 세션 비밀번호 저장 (메모리 전용, 디스크 없음)
ipcMain.handle('store-session-password', async (event, password) => {
    // isValidSender 검증
    // safeStorage로 암호화하여 메모리 변수에 보관
});

// 6. 세션 비밀번호 반환
ipcMain.handle('get-session-password', async (event) => { ... });

// 7. 세션 비밀번호 삭제
ipcMain.handle('clear-session-password', async (event) => { ... });
```

**보안 주의사항:**
- `isValidSender(event)` 검증 필수 (BrowserWindow 소속 확인)
- `safeStorage` API 사용: Electron의 OS 키체인 기반 보안 저장
- 세션 비밀번호는 `_sessionPasswordEncrypted` 변수(Buffer)에만 보관, 디스크 저장 안 함

#### 5.3.2 preload.js — 추가할 API

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
    // ... 기존 API ...

    // ===== 암호화 관련 추가 =====

    // 키 파일 존재 확인
    keyFileExists: () => ipcRenderer.invoke('key-file-exists'),

    // 키 파일 읽기
    readKeyFile: () => ipcRenderer.invoke('read-key-file'),

    // Salt 저장/로드
    saveSalt: (saltBase64) => ipcRenderer.invoke('save-salt', saltBase64),
    loadSalt: () => ipcRenderer.invoke('load-salt'),

    // 세션 비밀번호
    storeSessionPassword: (password) => ipcRenderer.invoke('store-session-password', password),
    getSessionPassword: () => ipcRenderer.invoke('get-session-password'),
    clearSessionPassword: () => ipcRenderer.invoke('clear-session-password'),
});
```

### 5.4 Layer 4: firebase-config.js (1줄 추가)

```javascript
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// ★ 이 한 줄 추가 (IIFE 모듈에서 firebase.firestore.FieldValue 접근 필요)
window.firebase = firebase;
```

**중요도**: 이 줄이 없으면 `encryption-manager.js`와 `firestore-db.js`에서 `firebase.firestore.FieldValue.delete()` 호출 시 에러 발생.

### 5.5 Layer 5: firestore-db.js (핵심 수정)

#### 변경 개요

| 함수 | 추가 내용 | 추가 줄 수 |
|------|----------|:----------:|
| `saveDocument()` | 암호화 + 민감필드 삭제 | +26 |
| `getDocument()` | 복호화 + 키 미준비 경고 | +18 |
| `getAllDocuments()` | 일괄 복호화 + 부분 실패 처리 | +22 |
| `batchSave()` | 일괄 암호화 + 민감필드 삭제 | +28 |
| `subscribeToChanges()` | 실시간 복호화 (async 콜백) | +16 |
| `reEncryptData()` | 재암호화 유틸리티 (신규) | +115 |
| `reEncryptAll()` | 전체 타입 재암호화 (신규) | +12 |
| `cleanupEncryption()` | 암호화 초기화 유틸리티 (신규) | +58 |
| `window.firestoreDb` | 3개 메서드 추가 | +3 |

#### saveDocument 변경 예시

```javascript
// === 추가할 암호화 블록 (기존 saveDocument 내부, 데이터 저장 전) ===

let dataToSave = data;
let isEncrypted = false;
if (window.encryptionManager?.isReady() && window.CryptoUtils) {
    try {
        const key = window.encryptionManager.getKey();
        dataToSave = await window.CryptoUtils.encryptRecord(data, key);
        isEncrypted = !!dataToSave._enc;
    } catch (encErr) {
        console.error(`[Firestore] 암호화 실패 (${docId}):`, encErr.message);
        return false; // ★ 평문 폴백 금지
    }
}

// 타임스탬프 추가
const saveData = {
    ...dataToSave,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    syncedAt: firebase.firestore.FieldValue.serverTimestamp()
};

// ★ merge:true 시 기존 평문 잔류 방지
if (isEncrypted && window.CryptoUtils?.SENSITIVE_FIELDS) {
    for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
        if (!(field in saveData) || saveData[field] === undefined) {
            saveData[field] = firebase.firestore.FieldValue.delete();
        }
    }
}

await db.collection(collectionName).doc(docId).set(saveData, { merge: true });
```

#### COLLECTION_PREFIX 주의사항

**메인 프로젝트에서는 `COLLECTION_PREFIX`를 추가하지 않는다.**

```javascript
// 메인 (유지):
function getCollectionName(sampleType, year) {
    const baseName = COLLECTION_MAP[sampleType] || sampleType;
    return `${baseName}_${year}`;  // "soilSamples_2026"
}

// 테스트 (참고용, 이식 안 함):
const COLLECTION_PREFIX = 'test_';
// → "test_soilSamples_2026"
```

### 5.6 Layer 6: 시료 스크립트 + 엔트리 파일 (초기화 호출)

#### 5개 시료 스크립트 공통 추가

각 시료 스크립트의 `DOMContentLoaded` 초기화 블록에서, `firebaseConfig.initialize()`와 `firestoreDb.init()` 호출 이후에 추가:

```javascript
// Firebase 초기화 후 암호화 매니저 초기화
if (window.encryptionManager?.init) {
    await window.encryptionManager.init();
}
```

적용 대상:
- `src/soil/soil-script.js`
- `src/water/water-script.js`
- `src/compost/compost-script.js`
- `src/heavy-metal/heavy-metal-script.js`
- `src/pesticide/pesticide-script.js`

#### index.html (웹 환경 스크립트 로드)

메인 프로젝트는 `<script>` 태그 직접 로드 방식이므로, `index.html`에 스크립트 태그 추가 필요:

```html
<!-- 기존 shared 스크립트 뒤에 추가 -->
<script src="shared/crypto-utils.js"></script>
<script src="shared/encryption-manager.js"></script>
```

**로드 순서 (필수)**:
1. `firebase-config.js` (window.firebase 전역)
2. `crypto-utils.js` (window.CryptoUtils)
3. `encryption-manager.js` (window.encryptionManager)
4. `firestore-db.js` (암호화 의존)
5. `storage-manager.js`
6. 시료 스크립트

### 5.7 Layer 7: 설정 UI (settings-script.js + settings/index.html)

#### settings/index.html — 암호화 설정 섹션 추가

```html
<!-- 기존 설정 카드들 뒤에 추가 -->
<div class="settings-card" id="encryptionSection">
    <h2>데이터 암호화</h2>
    <div class="alert-info">
        민감 데이터(이름, 전화번호, 주소 등)를 AES-256-GCM으로 암호화합니다.
    </div>

    <!-- 암호화 상태 표시 -->
    <div id="encryptionStatus">...</div>

    <!-- 비밀번호 변경 버튼 -->
    <button id="changePasswordBtn">비밀번호 변경</button>

    <!-- 복구 키 재발급 버튼 -->
    <button id="regenerateRecoveryBtn">복구 키 재발급</button>

    <!-- 평문 데이터 스캔/마이그레이션 -->
    <button id="scanPlaintextBtn">평문 데이터 스캔</button>
    <button id="encryptAllPlaintextBtn">전체 암호화</button>
</div>
```

#### settings-script.js — 추가 기능

| 기능 | 설명 |
|------|------|
| `changePassword()` | 기존 비밀번호 검증 → 새 비밀번호 설정 → 전체 데이터 재암호화 |
| `recoverPassword()` | 복구 키 입력 → 마스터 키 복원 → 새 비밀번호 설정 |
| `regenerateRecovery()` | 현재 마스터 키로 새 복구 블롭 생성 |
| `scanPlaintextData()` | 모든 컬렉션에서 `_enc` 없는 문서 수 카운트 |
| `encryptAllPlaintext()` | 평문 데이터를 일괄 암호화 (기존 데이터 마이그레이션) |

---

## 6. 파일별 변경 사항 상세

### 6.1 신규 파일

| # | 파일 경로 | 작업 | 비고 |
|---|----------|------|------|
| 1 | `src/shared/crypto-utils.js` | 그대로 복사 | 711줄, 변경 없음 |
| 2 | `src/shared/encryption-manager.js` | 복사 + 수정 | `test_` 접두사 코드 제거 |

### 6.2 수정 파일

| # | 파일 경로 | 수정 내용 | 위험도 |
|---|----------|----------|:------:|
| 3 | `src/shared/firebase-config.js` | L11 뒤에 `window.firebase = firebase;` 추가 | 낮음 |
| 4 | `src/shared/firestore-db.js` | 5개 함수에 암호화 블록 추가 + 3개 함수 신규 | **높음** |
| 5 | `src/index.js` | 7개 IPC 핸들러 추가 | 중간 |
| 6 | `src/preload.js` | 7개 API 노출 추가 | 낮음 |
| 7 | `src/soil/soil-script.js` | `encryptionManager.init()` 3줄 추가 | 낮음 |
| 8 | `src/water/water-script.js` | 〃 | 낮음 |
| 9 | `src/compost/compost-script.js` | 〃 | 낮음 |
| 10 | `src/heavy-metal/heavy-metal-script.js` | 〃 | 낮음 |
| 11 | `src/pesticide/pesticide-script.js` | 〃 | 낮음 |
| 12 | `src/settings/settings-script.js` | 암호화 관리 UI 코드 추가 | 중간 |
| 13 | `src/settings/index.html` | 암호화 설정 섹션 HTML 추가 | 낮음 |
| 14 | `src/index.html` | 스크립트 태그 2줄 추가 (웹 환경용) | 낮음 |

### 6.3 docs/ 동기화

| # | 대상 | 설명 |
|---|------|------|
| 15-26 | `docs/` 내 동일 경로 12개 파일 | `src/` 변경 후 `rsync -av src/ docs/` |

---

## 7. 기존 데이터 처리 전략

### 7.1 핵심 문제

메인 프로젝트에는 이미 **평문 데이터가 Firestore에 저장**되어 있다. 암호화 시스템 도입 후 이 데이터를 어떻게 처리할 것인가?

### 7.2 전략: 점진적 암호화 (Gradual Encryption)

```
Phase 1: 암호화 시스템 배포 (코드만)
         ↓
Phase 2: 사용자가 비밀번호 설정 (최초 실행)
         ↓
Phase 3: 이후 저장되는 데이터는 자동 암호화
         ↓
Phase 4: 기존 평문 데이터는 설정 > "전체 암호화" 버튼으로 일괄 변환
```

### 7.3 하위 호환성 보장

암호화 시스템은 **하위 호환**을 완벽 지원:

| 레코드 상태 | 동작 |
|------------|------|
| `_enc` 없음 (평문) | 조회 시 그대로 반환, 수정 시 암호화하여 저장 |
| `_enc` 있음 + 키 준비됨 | 조회 시 복호화 후 반환 |
| `_enc` 있음 + 키 미준비 | 경고 로그, 암호화된 상태로 반환 |
| 암호화 비활성 (encryptionManager 없음) | 기존과 완전히 동일하게 동작 |

### 7.4 `reEncryptData()` 유틸리티

`merge:true` 사용으로 인해 일부 문서에 평문과 `_enc`가 동시에 존재할 수 있는 문제를 교정:

```javascript
// 콘솔에서 실행:
await firestoreDb.reEncrypt('soil', 2026);     // 단일 타입
await firestoreDb.reEncryptAll(2026);           // 전체 타입
```

### 7.5 데이터 흐름 다이어그램

```
[기존 평문 데이터]
    ├─ 조회 시: _enc 없음 → 평문 그대로 반환 (정상)
    ├─ 수정 후 저장: 암호화 활성 → 암호화 저장 + 평문 필드 삭제
    └─ 일괄 마이그레이션: 설정 > "전체 암호화" 클릭
        ↓
    모든 컬렉션 스캔 → _enc 없는 문서 → 암호화 → 평문 삭제

[신규 데이터]
    └─ 저장 시: 암호화 활성이면 자동 암호화
```

---

## 8. 마이그레이션 실행 계획 (4단계)

### Phase 1: 기반 계층 구축 (Layer 1~3)

**소요 예상**: 핵심 작업

| 순서 | 작업 | 파일 |
|:----:|------|------|
| 1-1 | `crypto-utils.js` 복사 | 신규 생성 |
| 1-2 | `encryption-manager.js` 복사 + `test_` 제거 | 신규 생성 |
| 1-3 | `firebase-config.js`에 `window.firebase` 추가 | 1줄 추가 |
| 1-4 | `preload.js`에 7개 API 추가 | ~40줄 추가 |
| 1-5 | `index.js`에 7개 IPC 핸들러 추가 | ~148줄 추가 |

**검증**: Electron 앱 실행 → 콘솔에서 `window.CryptoUtils`, `window.encryptionManager` 존재 확인

### Phase 2: Firestore 통합 (Layer 5)

**소요 예상**: 가장 주의 필요

| 순서 | 작업 | 파일 |
|:----:|------|------|
| 2-1 | `firestore-db.js` — `saveDocument()` 암호화 블록 추가 | 수정 |
| 2-2 | `firestore-db.js` — `getDocument()` 복호화 블록 추가 | 수정 |
| 2-3 | `firestore-db.js` — `getAllDocuments()` 일괄 복호화 추가 | 수정 |
| 2-4 | `firestore-db.js` — `batchSave()` 일괄 암호화 추가 | 수정 |
| 2-5 | `firestore-db.js` — `subscribeToChanges()` 비동기 복호화 추가 | 수정 |
| 2-6 | `firestore-db.js` — `reEncryptData()`, `reEncryptAll()`, `cleanupEncryption()` 추가 | 신규 함수 |
| 2-7 | `firestore-db.js` — `window.firestoreDb` 내보내기에 3개 메서드 추가 | 수정 |

**검증**: 기존 평문 데이터 정상 조회 확인 (하위 호환), 암호화 비활성 상태에서 기존 동작 유지

### Phase 3: 앱 초기화 연결 (Layer 6)

| 순서 | 작업 | 파일 |
|:----:|------|------|
| 3-1 | 5개 시료 스크립트에 `encryptionManager.init()` 추가 | 5개 파일 |
| 3-2 | `index.html`에 스크립트 태그 추가 (웹 환경) | 1개 파일 |

**검증**: 앱 실행 → 최초 비밀번호 설정 프롬프트 표시 → 비밀번호 설정 → 데이터 저장/조회 정상

### Phase 4: 설정 UI + docs 동기화 (Layer 7)

| 순서 | 작업 | 파일 |
|:----:|------|------|
| 4-1 | `settings/index.html` 암호화 섹션 HTML 추가 | 수정 |
| 4-2 | `settings-script.js` 암호화 관리 기능 추가 | 수정 |
| 4-3 | `src/ → docs/` 전체 동기화 | rsync |

**검증**: 설정 페이지 → 암호화 섹션 → 비밀번호 변경, 복구 키 재발급, 평문 스캔 정상 동작

---

## 9. 위험 요소 및 완화 방안

### 9.1 위험도 매트릭스

| # | 위험 요소 | 영향도 | 발생확률 | 위험등급 | 완화 방안 |
|---|----------|:------:|:--------:|:--------:|----------|
| R1 | firestore-db.js 수정 시 기존 CRUD 장애 | 높음 | 중간 | **높음** | 암호화 비활성 시 기존 코드 경로 유지, 단위 테스트 |
| R2 | 기존 평문 데이터 조회 실패 | 높음 | 낮음 | 중간 | `_enc` 없으면 평문 그대로 반환 (하위 호환) |
| R3 | 비밀번호 분실 → 데이터 접근 불가 | 높음 | 중간 | **높음** | 복구 키 시스템 + 복구 키 생성 시 즉시 표시 |
| R4 | merge:true로 평문 잔류 | 중간 | 중간 | 중간 | `FieldValue.delete()` 명시적 삭제 + reEncrypt 유틸 |
| R5 | 스크립트 로드 순서 오류 | 높음 | 낮음 | 중간 | 의존성 순서 문서화 + 존재 확인 가드 |
| R6 | window.firebase 누락 | 높음 | 낮음 | 중간 | firebase-config.js에서 즉시 할당 |
| R7 | Salt 손실 (OS 키체인 초기화) | 높음 | 낮음 | 중간 | 복구 키로 마스터 키 직접 복원 (Salt 불필요) |

### 9.2 핵심 보안 원칙

| 원칙 | 구현 |
|------|------|
| 평문 폴백 금지 | 암호화 실패 시 `return false` (저장 중단) |
| 타이밍 공격 방지 | `timingSafeEqual()` 상수 시간 비교 |
| 복구 키 바이어스 제거 | Rejection sampling (256 - 256%31 = 248 한계값) |
| 클립보드 자동 삭제 | 복구 키 복사 후 30초 타이머 |
| 세션 비밀번호 메모리 전용 | 디스크 저장 안 함, safeStorage 암호화 |
| IPC 발신자 검증 | `isValidSender(event)` — BrowserWindow 소속 확인 |
| Salt 입력 검증 | Base64 형식, 20~64자 길이 제한 |

---

## 10. 롤백 계획

### 10.1 롤백 시나리오

| 시점 | 롤백 방법 |
|------|----------|
| Phase 1 완료 후 | 신규 파일 2개 삭제, firebase-config/preload/index.js 원복 |
| Phase 2 완료 후 | firestore-db.js를 git checkout으로 원복 |
| Phase 3 완료 후 | 시료 스크립트에서 `encryptionManager.init()` 블록 삭제 |
| Phase 4 완료 후 | settings 변경 원복 + docs 재동기화 |

### 10.2 데이터 롤백

암호화된 데이터가 이미 저장된 경우:

```javascript
// 콘솔에서 실행: 모든 컬렉션의 _enc 필드 제거
await firestoreDb.cleanupEncryption(2026);
```

**주의**: `cleanupEncryption`은 `_enc` 필드만 삭제한다. 암호화 시 평문 민감 필드가 `FieldValue.delete()`로 삭제되었으므로, 복호화 없이 `_enc`만 삭제하면 **민감 필드 데이터가 유실**된다. 반드시 복호화 후 평문으로 재저장한 뒤 `_enc`를 삭제해야 한다.

### 10.3 안전한 데이터 롤백 절차

```
1. 암호화 매니저 활성 상태에서 모든 데이터 조회 (복호화됨)
2. 복호화된 평문 데이터를 localStorage에 백업
3. 코드 롤백 (암호화 코드 제거)
4. 백업된 평문 데이터를 Firestore에 재저장
5. _enc 필드 정리 (cleanupEncryption)
```

---

## 11. 테스트 검증 체크리스트

### 11.1 기본 기능

- [ ] 암호화 비활성 상태에서 기존 모든 CRUD 정상 동작
- [ ] 최초 실행 시 비밀번호 설정 프롬프트 정상 표시
- [ ] 비밀번호 설정 후 마스터 키 유도 성공
- [ ] 복구 키 자동 생성 및 표시
- [ ] 새 데이터 저장 시 `_enc` 필드 생성 확인 (Firestore 콘솔)
- [ ] 저장된 암호화 데이터 조회 시 평문 복원 확인
- [ ] 기존 평문 데이터 조회 시 정상 반환 (하위 호환)

### 11.2 시료 타입별

- [ ] 토양 시료: 접수/조회/수정/삭제
- [ ] 수질분석 시료: 접수/조회/수정/삭제
- [ ] 퇴·액비 시료: 접수/조회/수정/삭제
- [ ] 토양 중금속 시료: 접수/조회/수정/삭제
- [ ] 잔류농약 시료: 접수/조회/수정/삭제

### 11.3 암호화 시나리오

- [ ] 앱 재시작 후 세션 비밀번호 자동 복원
- [ ] 세션 비밀번호 만료 후 비밀번호 재입력
- [ ] 잘못된 비밀번호 입력 시 재시도 (최대 3회)
- [ ] 비밀번호 3회 실패 후 복구 키 입력 제안
- [ ] 복구 키로 마스터 키 복원 성공
- [ ] 비밀번호 변경 → 전체 데이터 재암호화
- [ ] 비밀번호 변경 중 실패 시 롤백

### 11.4 설정 UI

- [ ] 암호화 상태 표시 (활성/비활성)
- [ ] 비밀번호 변경 기능
- [ ] 복구 키 재발급 기능
- [ ] 평문 데이터 스캔
- [ ] 평문 데이터 일괄 암호화

### 11.5 환경별

- [ ] Electron 데스크톱 환경 정상 동작
- [ ] 웹 브라우저 환경 정상 동작 (GitHub Pages)
- [ ] 오프라인 환경 정상 동작 (IndexedDB 캐시)
- [ ] 실시간 동기화 시 복호화 정상

---

## 12. 난이도 평가

### 12.1 종합 평가

| 항목 | 평가 |
|------|------|
| **전체 난이도** | ★★★★☆ (4/5) |
| 코드 복잡도 | ★★★★☆ |
| 영향 범위 | ★★★★★ (14개 파일 수정) |
| 데이터 위험도 | ★★★★☆ (기존 평문 데이터 공존) |
| 롤백 난이도 | ★★★☆☆ (코드 롤백 쉬움, 데이터 롤백 주의) |
| 테스트 범위 | ★★★★☆ (5개 시료 타입 × 4개 환경) |

### 12.2 계층별 난이도

| 계층 | 난이도 | 이유 |
|------|:------:|------|
| L1: crypto-utils.js | ★☆☆☆☆ | 그대로 복사 |
| L2: encryption-manager.js | ★★★☆☆ | `test_` 접두사 제거만 필요 |
| L3: IPC (index.js + preload.js) | ★★☆☆☆ | 코드 블록 추가 (독립적) |
| L4: firebase-config.js | ★☆☆☆☆ | 1줄 추가 |
| L5: firestore-db.js | ★★★★★ | 핵심 CRUD 5개 함수 수정, 최고 위험 |
| L6: 시료 스크립트 + 엔트리 | ★★☆☆☆ | 3줄씩 추가 (패턴 동일) |
| L7: 설정 UI | ★★★☆☆ | UI 코드 복사 + `test_` 접두사 제거 |

### 12.3 핵심 난관 3가지

1. **firestore-db.js 구조 차이**: 메인과 테스트의 기존 코드가 거의 동일하므로 테스트 프로젝트의 암호화 블록을 직접 이식 가능. 단, CRUD 함수 5개를 동시에 수정해야 하므로 한 곳이라도 누락되면 데이터 불일치 발생.

2. **기존 평문 데이터**: 암호화 도입 후에도 기존 데이터는 평문으로 남아있음. `decryptRecord()`는 `_enc` 없는 레코드를 그대로 반환하므로 조회는 문제없지만, 완전 암호화를 위해서는 별도 마이그레이션 작업 필요.

3. **COLLECTION_PREFIX 의존성**: 테스트 프로젝트의 `encryption-manager.js`는 `test_system` 컬렉션을 사용. 메인에서는 `_system`을 사용해야 하므로 해당 로직 수정 필수.

---

## 부록 A: 암호화된 레코드 구조 예시

### 저장 전 (평문)

```json
{
    "id": "soil-2026-001",
    "receptionNumber": "2026-001",
    "date": "2026-02-19",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "경북 봉화군 봉화읍",
    "farmAddress": "봉화읍 내성리 123",
    "parcels": [{"parcel": "전", "area": "1000"}],
    "purpose": "토양검정"
}
```

### 저장 후 (Firestore)

```json
{
    "id": "soil-2026-001",
    "receptionNumber": "2026-001",
    "date": "2026-02-19",
    "purpose": "토양검정",
    "_enc": {
        "v": "2.0",
        "name": { "iv": "aB3cD4eF5gH6iJ7k", "ct": "xY2zA1bC3dE4fG5hI6jK7..." },
        "phone": { "iv": "lM8nO9pQ0rS1tU2v", "ct": "wX3yZ4aB5cD6eF7gH8iJ9..." },
        "address": { "iv": "kL0mN1oP2qR3sT4u", "ct": "vW5xY6zA7bC8dE9fG0hI1..." },
        "farmAddress": { "iv": "jK2lM3nO4pQ5rS6t", "ct": "uV7wX8yZ9aB0cD1eF2gH3..." },
        "parcels": { "iv": "iJ4kL5mN6oP7qR8s", "ct": "tU9vW0xY1zA2bC3dE4fG5..." }
    },
    "updatedAt": { "_methodName": "FieldValue.serverTimestamp" },
    "syncedAt": { "_methodName": "FieldValue.serverTimestamp" }
}
```

비암호화 필드(`id`, `receptionNumber`, `date`, `purpose`)는 평문으로 유지되어 Firestore 쿼리(검색, 정렬)에 사용 가능.

---

## 부록 B: Firebase _system 컬렉션 구조

```
_system/
├── encryptionKey
│   ├── keyFileContent: "Base64..." (32바이트 랜덤 키 파일)
│   ├── createdAt: "2026-02-19T..."
│   └── version: "2.0"
│
└── recoveryBlob
    ├── version: "2.0"
    ├── iv: "Base64..." (12바이트 IV)
    ├── ct: "Base64..." (마스터 키의 raw bytes를 AES-GCM 암호화)
    ├── salt: "Base64..." (16바이트 복구용 Salt)
    └── createdAt: "2026-02-19T..."
```

---

## 부록 C: 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 암호화 사양 v2.1 | `docs-internal/DATA_ENCRYPTION_SPEC.md` | 전체 암호화 설계 사양 |
| 보안 검토 이력 | `docs-internal/SECURITY.md` | 보안 이슈 수정 이력 |
| 코드 리뷰 이력 | `docs-internal/ISSUE_TASKS_2026-02-17.md` | 코드 리뷰 결과 |
| 동기화 규칙 | `memory/sync-rule.md` | 메인↔테스트 동기화 주의사항 |
