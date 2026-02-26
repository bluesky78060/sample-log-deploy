# 데이터 암호화 기술 사양서 v2.1

> 작성일: 2026-02-08 (v2.1: 2026-02-14)
> 기반 문서: DATA_ENCRYPTION_PLAN.md v1.0
> 프로젝트: 시료접수대장 (Sample Log)
> 주요 변경: 복합 키 기본화, AES-256-GCM, Web Crypto API, PBKDF2 600K, 비밀번호 복구 시스템

---

## 목차

1. [변경 이력 및 기존 계획서 대비 변경점](#1-변경-이력-및-기존-계획서-대비-변경점)
2. [기술 스택 선정 근거](#2-기술-스택-선정-근거)
3. [복합 키 관리 시스템](#3-복합-키-관리-시스템-비밀번호--키-파일)
4. [암호화 구현 상세](#4-암호화-구현-상세)
5. [코드 구현](#5-코드-구현)
6. [데이터 마이그레이션](#6-데이터-마이그레이션)
7. [보안 고려사항](#7-보안-고려사항-owasp-2025-기준)
8. [참고 자료 및 출처](#8-참고-자료-및-출처)

---

## 1. 변경 이력 및 기존 계획서 대비 변경점

### 1.1 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-04 | 초기 계획서 작성 (DATA_ENCRYPTION_PLAN.md) |
| v2.0 | 2026-02-08 | 기술 사양서 전면 개정 (본 문서) |
| v2.1 | 2026-02-14 | 비밀번호 복구 시스템 추가, 비밀번호 최대 길이 확장 (16→64자) |

### 1.2 기존 계획서 대비 주요 변경점

| 항목 | v1.0 (기존 계획서) | v2.0 (본 사양서) | 변경 사유 |
|------|-------------------|------------------|----------|
| **기본 키 관리** | 키 파일만 사용 | **비밀번호 + 키 파일 복합 키** | 이중 인증으로 보안 강화 |
| **암호화 모드** | AES-256-CBC | **AES-256-GCM** | OWASP 권장, 인증된 암호화, 패딩 오라클 공격 방어 |
| **키 유도 반복 횟수** | PBKDF2 100,000회 | **PBKDF2 600,000회** | OWASP 2025 최신 권장 기준 |
| **암호화 라이브러리** | CryptoJS 4.2.0 | **Web Crypto API** | CryptoJS 개발 중단, 보안 감사 미실시 |
| **키 저장** | 앱 데이터 폴더 | **Electron safeStorage + 앱 데이터** | OS 키체인 활용으로 보안 강화 |
| **비밀번호 최대 길이** | 16자 | **64자** | 긴 패스프레이즈 지원 |
| **비밀번호 복구** | 없음 | **복구 키 시스템** | 비밀번호 분실 시 데이터 복구 지원 |

---

## 2. 기술 스택 선정 근거

### 2.1 암호화 라이브러리: Web Crypto API (CryptoJS 대체)

#### CryptoJS 폐기 사유

| 항목 | CryptoJS | Web Crypto API |
|------|----------|----------------|
| 유지관리 | **개발 중단** (2023~) | 브라우저/Node.js 공식 유지 |
| 보안 감사 | 미실시 | W3C 표준, 브라우저 벤더 검증 |
| 키 유도 | 비표준 (MD5 기반) | 표준 PBKDF2 |
| 성능 | JavaScript 순수 구현 | **네이티브 C++ 구현** (10~50배 빠름) |
| 코드 크기 | ~70KB | **0KB** (브라우저 내장) |
| AES-GCM 지원 | 미지원 | **네이티브 지원** |

> **결정**: Web Crypto API를 주(primary) 라이브러리로 사용.
> CryptoJS는 기존 암호화 데이터 복호화를 위한 마이그레이션 기간(6개월)에만 유지.

#### 호환성

```
┌─────────────────────────────────────────────────────────┐
│  Web Crypto API 지원 환경                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Electron (Chromium) : ✅ 완전 지원                     │
│  Chrome 37+          : ✅ 완전 지원                     │
│  Firefox 34+         : ✅ 완전 지원                     │
│  Safari 11+          : ✅ 완전 지원                     │
│  Edge 12+            : ✅ 완전 지원                     │
│  Node.js 15+         : ✅ crypto.subtle 지원            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 암호화 알고리즘: AES-256-GCM

#### AES-GCM vs AES-CBC 비교

| 항목 | AES-256-GCM | AES-256-CBC |
|------|-------------|-------------|
| **인증(Authentication)** | ✅ 내장 (AEAD) | ❌ 별도 HMAC 필요 |
| **무결성 보장** | ✅ Authentication Tag | ❌ 없음 |
| **패딩 오라클 공격** | ✅ 면역 | ❌ 취약 |
| **병렬 처리** | ✅ 가능 (CTR 모드 기반) | ❌ 순차 처리 |
| **하드웨어 가속** | ✅ AES-NI + CLMUL | ⚠️ AES-NI만 |
| **표준 채택** | TLS 1.3, WPA3, IPsec | 레거시 |
| **Web Crypto API** | ✅ 네이티브 지원 | ⚠️ 지원하나 비권장 |

> **결정**: AES-256-GCM을 사용. 인증된 암호화(AEAD)로 무결성과 기밀성을 동시에 보장.

#### AES-GCM 주의사항

```
⚠️ GCM 모드 필수 규칙
─────────────────────────────────────────────────
1. IV(Nonce)는 반드시 12바이트(96비트)
2. 동일 키로 동일 IV 재사용 절대 금지 (보안 완전 붕괴)
3. 단일 키로 최대 2^32 (~43억)개 메시지 암호화 가능
4. Authentication Tag는 반드시 검증 후 평문 사용
─────────────────────────────────────────────────
```

### 2.3 키 유도 함수: PBKDF2-HMAC-SHA256 (600,000 iterations)

#### OWASP 2025 최신 권장 기준

| 알고리즘 | 최소 반복 횟수 | 목표 해싱 시간 |
|----------|---------------|---------------|
| PBKDF2-HMAC-SHA256 | **600,000회** | 100~300ms |
| PBKDF2-HMAC-SHA512 | 210,000회 | 100~300ms |
| PBKDF2-HMAC-SHA1 | 1,300,000회 | 100~300ms |

> 기존 계획서의 100,000회는 2025년 기준으로 **불충분**함.
> 현대 GPU는 100,000회 기준 초당 약 380만 해시를 처리 가능.

#### 선정 근거

```
┌─────────────────────────────────────────────────────────┐
│  PBKDF2-SHA256 600,000회 선정 이유                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. OWASP 2025 공식 최소 권장치                          │
│  2. Web Crypto API에서 네이티브 지원                     │
│  3. FIPS 140-2 인증 알고리즘 (정부/규제 기관 호환)      │
│  4. Electron 환경에서 약 150~250ms 소요 (허용 범위)     │
│  5. 브라우저/Node.js 크로스 플랫폼 호환                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.4 향후 Argon2id 마이그레이션 경로

#### Argon2id vs PBKDF2 비교

| 항목 | Argon2id | PBKDF2-SHA256 |
|------|----------|---------------|
| 메모리 하드니스 | ✅ 우수 (19~46 MiB) | ❌ 없음 (최소 RAM) |
| GPU/ASIC 저항성 | ✅ 우수 | ❌ 취약 (GPU 5,000배 가속) |
| FIPS 140-2 인증 | ❌ 미인증 | ✅ 인증 |
| Web Crypto API 지원 | ❌ 미지원 | ✅ 네이티브 지원 |
| 설정 파라미터 | m, t, p (3개) | iterations (1개) |
| 실전 검증 기간 | ~10년 | ~25년 |

#### 마이그레이션 계획

```
Phase 1 (현재): PBKDF2-SHA256 600,000회
  → Web Crypto API 네이티브 지원, FIPS 호환

Phase 2 (향후): Argon2id 도입 검토
  → argon2-browser 또는 WebAssembly 기반 라이브러리 사용
  → 권장 파라미터: m=19456 (19 MiB), t=2, p=1
  → 키 유도 함수 버전 필드로 자동 감지/전환
  → 기존 PBKDF2 데이터는 읽기 호환 유지
```

---

## 3. 복합 키 관리 시스템 (비밀번호 + 키 파일)

### 3.1 복합 키 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  복합 키 유도 프로세스 (Composite Key Derivation)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [사용자 비밀번호]          [키 파일 (32바이트 랜덤)]           │
│       │                          │                              │
│       │                    SHA-256 해시                          │
│       │                          │                              │
│       └──────── 문자열 결합 ─────┘                              │
│                    │                                            │
│           password + keyFileHash                                │
│                    │                                            │
│         ┌──────────┴──────────┐                                 │
│         │  PBKDF2-HMAC-SHA256 │                                 │
│         │  iterations: 600,000│                                 │
│         │  salt: 16바이트 랜덤│                                 │
│         │  keySize: 256비트   │                                 │
│         └──────────┬──────────┘                                 │
│                    │                                            │
│           AES-256-GCM 마스터 키                                 │
│                    │                                            │
│         ┌──────────┴──────────┐                                 │
│         │                     │                                 │
│    [로컬 백업 암호화]  [Firebase 필드 암호화]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 키 파일 생성 및 관리

#### 키 파일 사양

| 항목 | 사양 |
|------|------|
| 파일명 | `sample-log.key` |
| 크기 | 32바이트 (256비트) |
| 내용 | CSPRNG으로 생성한 랜덤 바이너리 → Base64 인코딩 |
| 저장 형식 | Base64 문자열 (~44자) |
| 생성 API | `crypto.getRandomValues(new Uint8Array(32))` |

#### 키 파일 저장 위치

```
┌─────────────────────────────────────────────────────────────────┐
│  키 파일 저장 전략                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Electron 환경]                                                │
│    기본: %APPDATA%/시료접수대장/sample-log.key (Windows)        │
│          ~/Library/Application Support/시료접수대장/ (macOS)    │
│          ~/.config/시료접수대장/ (Linux)                        │
│    키 파일 경로: Electron safeStorage로 암호화하여 저장         │
│                                                                 │
│  [웹 환경]                                                      │
│    IndexedDB에 키 파일 내용을 저장                              │
│    (Web Crypto API의 CryptoKey는 extractable: false 설정)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 키 파일 생명주기

```
[1. 최초 생성]
  앱 첫 실행 → 키 파일 존재 확인 → 없으면 자동 생성
  → 비밀번호 설정 화면 표시
  → 키 파일 백업 안내 팝업

[2. 일상 사용]
  앱 시작 → 비밀번호 입력 → 키 파일 로드 → 복합 키 유도
  → 메모리에 유도된 키만 보관 (원본 비밀번호 즉시 폐기)

[3. 백업]
  설정 > 보안 > "키 파일 백업" → 다른 위치에 복사
  → USB, 클라우드 등에 보관 권장

[4. 복구]
  새 PC → 키 파일 + 비밀번호로 복구
  → 둘 다 있어야 데이터 복호화 가능

[5. 재생성]
  ⚠️ 새 키 파일 생성 시 기존 백업 데이터 복호화 불가
  → 재생성 전 반드시 데이터 내보내기 안내
```

### 3.3 비밀번호 정책

#### 강도 요구사항

| 항목 | 요구사항 |
|------|---------|
| 최소 길이 | 8자 이상 |
| 최대 길이 | 64자 |
| 소문자 | 1개 이상 포함 |
| 숫자 | 1개 이상 포함 |
| 특수문자 | 1개 이상 포함 (`!@#$%^&*()_+-=[]{}` 등) |

#### 비밀번호 강도 등급

```
┌─────────────────────────────────────────────────────────────────┐
│  비밀번호 강도 표시                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [약함]   8자 미만 또는 조건 미충족        → ❌ 사용 불가       │
│  [보통]   8~11자, 모든 조건 충족           → ⚠️ 사용 가능       │
│  [강함]   12자 이상, 모든 조건 충족        → ✅ 권장             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 키 유도 프로세스 (상세 플로우)

```
┌─────────────────────────────────────────────────────────────────┐
│  복합 키 유도 상세 프로세스                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 입력 수집                                              │
│    password = "사용자가 입력한 비밀번호"                         │
│    keyFileContent = readFile("sample-log.key")                  │
│                                                                 │
│  Step 2: 키 파일 해시                                           │
│    keyFileHash = SHA-256(keyFileContent)                        │
│    // → 64자 hex 문자열                                         │
│                                                                 │
│  Step 3: 결합                                                   │
│    combined = password + keyFileHash                            │
│    // → "MyP@ss123" + "e3b0c44298fc..."                        │
│                                                                 │
│  Step 4: Salt 생성 또는 로드                                    │
│    salt = crypto.getRandomValues(new Uint8Array(16))            │
│    // → 최초 생성 시 저장, 이후 로드                            │
│                                                                 │
│  Step 5: PBKDF2 키 유도                                         │
│    masterKey = PBKDF2(                                          │
│      password: combined,                                        │
│      salt: salt,                                                │
│      iterations: 600000,                                        │
│      hash: "SHA-256",                                           │
│      keyLength: 256                                             │
│    )                                                            │
│                                                                 │
│  Step 6: CryptoKey 객체 생성                                    │
│    aesKey = importKey(masterKey, "AES-GCM", 256)                │
│    // → 이 키로 모든 암호화/복호화 수행                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Electron safeStorage 연동

#### 플랫폼별 보안 메커니즘

| 플랫폼 | 백엔드 | 보호 수준 |
|--------|--------|----------|
| macOS | Keychain Access | ✅ 다른 앱/사용자로부터 보호 |
| Windows | DPAPI (Data Protection API) | ✅ 다른 사용자로부터 보호 |
| Linux | gnome-libsecret / kwallet | ⚠️ 데스크톱 환경에 의존 |
| Linux (폴백) | basic_text | ❌ 메모리 기반 평문 (경고 필요) |

#### safeStorage로 보호하는 항목

```
┌─────────────────────────────────────────────────────────────────┐
│  safeStorage 보호 대상                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 키 파일 경로 (key file path)                                │
│     → 키 파일 위치를 숨겨 무단 접근 방지                        │
│                                                                 │
│  2. PBKDF2 Salt                                                 │
│     → 솔트 노출 방지                                            │
│                                                                 │
│  3. 비밀번호 힌트 (선택)                                        │
│     → 사용자 설정 시에만 저장                                   │
│                                                                 │
│  ❌ 비밀번호 자체는 절대 저장하지 않음                           │
│  ❌ 유도된 마스터 키는 절대 저장하지 않음                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Linux 보안 수준 검증

```javascript
// Linux에서 safeStorage 백엔드 확인
const backend = safeStorage.getSelectedStorageBackend();

if (backend === 'basic_text') {
    // ⚠️ 경고: OS 키체인을 사용할 수 없는 환경
    // 사용자에게 보안 경고 표시
    dialog.showMessageBoxSync({
        type: 'warning',
        title: '보안 경고',
        message: '시스템 키체인을 사용할 수 없습니다.\n'
               + '키 파일 경로가 평문으로 저장됩니다.\n'
               + 'gnome-keyring 또는 kwallet 설치를 권장합니다.'
    });
}
```

### 3.6 웹 환경 키 관리

```
┌─────────────────────────────────────────────────────────────────┐
│  웹 환경 키 관리 전략                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Electron safeStorage를 사용할 수 없는 웹 환경에서:             │
│                                                                 │
│  1. 키 파일: 사용자가 직접 파일 선택 (File API)                 │
│     → 파일 내용은 메모리에만 유지, 저장하지 않음                │
│     → 매 세션마다 키 파일 선택 필요                              │
│                                                                 │
│  2. 비밀번호: 매 세션마다 입력                                   │
│     → sessionStorage/localStorage에 저장하지 않음                │
│                                                                 │
│  3. 유도된 CryptoKey:                                           │
│     → extractable: false 설정                                   │
│     → 메모리에만 존재, 탭 종료 시 자동 폐기                     │
│                                                                 │
│  4. Salt:                                                       │
│     → IndexedDB에 저장 (민감하지 않은 정보)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.7 비밀번호 복구 시스템

#### 복구 키 사양

| 항목 | 사양 |
|------|------|
| 길이 | 24자 (4자-4자-4자-4자-4자-4자 형식) |
| 알파벳 | 31자 (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, 혼동 문자 제외: 0/O, 1/I/L) |
| 엔트로피 | ~119비트 (rejection sampling으로 균일 분포 보장) |
| 생성 | `crypto.getRandomValues()` + rejection sampling |
| 표시 | 한 번만 표시, 사용자 복사/저장 안내 |

#### 복구 블롭 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  복구 블롭 (Recovery Blob) v2.0                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [복구 키 (24자)]                                                │
│       │                                                          │
│  PBKDF2-SHA256 (600,000회)                                      │
│       │                                                          │
│  [복구용 AES-GCM 키]                                             │
│       │                                                          │
│  AES-256-GCM 암호화 ──→ [마스터 키 raw bytes 암호화]             │
│                                                                  │
│  저장 위치: Firestore `_system/recoveryBlob`                     │
│  저장 내용:                                                      │
│    - encryptedData: 암호화된 마스터 키 (Base64)                  │
│    - iv: 12바이트 IV (Base64)                                    │
│    - salt: 16바이트 Salt (Base64)                                │
│    - version: '2.0'                                              │
│    - createdAt: 생성 시각                                        │
│                                                                  │
│  ⚠️ v2.0: 마스터 키 raw bytes 직접 저장 (비밀번호 아님)         │
│  ⚠️ v1.0: 비밀번호 문자열 저장 (하위 호환 지원)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 복구 프로세스

```
1. 사용자가 복구 키 입력
2. 브루트포스 보호 확인 (5회/30분 제한)
3. 복구 블롭에서 마스터 키 복원
   - v2.0: raw bytes → CryptoKey 임포트
   - v1.0: 비밀번호 → PBKDF2로 마스터 키 유도
4. 새 비밀번호 입력받기
5. 새 비밀번호로 새 마스터 키 유도
6. 모든 데이터 재암호화 (이전 키 → 새 키)
   - 실패 시 롤백: 완료된 컬렉션을 역방향 재암호화
7. 새 복구 블롭 생성 및 저장
8. 성공 시 시도 횟수 초기화
```

#### 브루트포스 보호

| 항목 | 사양 |
|------|------|
| 최대 시도 횟수 | 5회 |
| 잠금 시간 | 30분 |
| 저장 위치 | Firestore `_system/recoveryAttempts` |
| 카운터 리셋 | 잠금 시간 경과 후 자동 리셋, 성공 시 즉시 삭제 |
| 서버사이드 | Firestore에서 관리 (클라이언트 우회 방지) |

#### 재암호화 롤백 메커니즘

```
┌─────────────────────────────────────────────────────────────────┐
│  재암호화 롤백 프로세스                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [정상 흐름]                                                     │
│    for each collection:                                          │
│      reEncryptCollection(db, collName, oldKey, newKey)           │
│      completedCollections.push(collName)  ← 성공 추적            │
│                                                                  │
│  [실패 시 롤백]                                                  │
│    for each completedCollection (역순):                          │
│      reEncryptCollection(db, collName, newKey, oldKey)  ← 복원  │
│      실패한 롤백: failedRollbacks 배열에 기록                    │
│                                                                  │
│  [롤백 실패 시]                                                  │
│    사용자에게 영향받은 컬렉션 목록 표시                           │
│    수동 복구 안내                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 클립보드 보안

| 항목 | 사양 |
|------|------|
| 자동 삭제 | 복사 후 30초 |
| 삭제 방식 | 현재 클립보드 내용이 복구 키와 일치하는 경우에만 삭제 |
| 모달 종료 시 | 클립보드 즉시 삭제 |
| 타이머 관리 | 모달 종료 시 타이머 해제 |

---

## 4. 암호화 구현 상세

### 4.1 로컬 백업 암호화 (전체 파일)

#### 저장 형식

```
┌─────────────────────────────────────────────────────────────────┐
│  암호화된 백업 파일 (.enc) 포맷                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  JSON 구조:                                                     │
│  {                                                              │
│    "version": "2.0",           // 암호화 포맷 버전              │
│    "algorithm": "AES-256-GCM", // 사용된 알고리즘               │
│    "kdf": "PBKDF2-SHA256",     // 키 유도 함수                  │
│    "iterations": 600000,       // PBKDF2 반복 횟수              │
│    "salt": "Base64...",        // 16바이트 Salt (Base64)        │
│    "iv": "Base64...",          // 12바이트 IV/Nonce (Base64)    │
│    "tag": "Base64...",         // 16바이트 Auth Tag (Base64)    │
│    "ciphertext": "Base64...",  // 암호화된 데이터 (Base64)      │
│    "createdAt": "ISO8601",     // 생성 시간                     │
│    "recordCount": 42           // 레코드 수 (메타데이터)        │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 파일 확장자 변경

| 항목 | 기존 (v1.0) | 변경 (v2.0) |
|------|------------|-------------|
| 파일명 | `auto-save-{type}-{year}.json` | `backup-{type}-{year}.enc` |
| 내용 | 평문 JSON | 위 JSON 구조 (암호화 메타데이터 + 암호문) |
| 열람 가능 | 텍스트 에디터로 가능 | JSON 구조는 보이나 데이터는 암호화 |

### 4.2 Firebase 필드 암호화

#### 저장 구조

```javascript
// Firebase에 저장되는 문서 구조
{
  "id": "soil-2026-001",           // 평문 (검색/정렬용)
  "receptionNumber": "2026-001",   // 평문 (검색용)
  "date": "2026-02-08",            // 평문 (정렬용)
  "purpose": "논",                 // 평문 (필터용)
  "isCompleted": false,            // 평문 (필터용)
  "_enc": {                        // 암호화된 민감 정보
    "v": "2.0",                    // 암호화 버전
    "name": {
      "iv": "Base64...",           // 필드별 고유 IV
      "ct": "Base64...",           // 암호문 (ciphertext + tag 결합)
    },
    "phone": {
      "iv": "Base64...",
      "ct": "Base64..."
    },
    "address": {
      "iv": "Base64...",
      "ct": "Base64..."
    }
  }
}
```

#### 암호화 대상 필드

| 필드명 | 암호화 | 이유 |
|--------|--------|------|
| id | ❌ | 문서 식별자 |
| receptionNumber | ❌ | 검색 필요 |
| date | ❌ | 정렬/검색 필요 |
| purpose | ❌ | 필터 필요 |
| isCompleted | ❌ | 필터 필요 |
| **name** | ✅ | 개인정보 |
| **phone** | ✅ | 개인정보 |
| **address** | ✅ | 개인정보 |
| **birthDate** | ✅ | 개인정보 |
| **corpNumber** | ✅ | 법인정보 |
| **parcels** | ✅ | 주소 포함 |
| note | ⚠️ | 선택적 (설정에서 토글) |

### 4.3 IV/Nonce 관리

```
┌─────────────────────────────────────────────────────────────────┐
│  IV(Initialization Vector) 관리 규칙                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  크기: 12바이트 (96비트) — AES-GCM 표준                         │
│  생성: crypto.getRandomValues(new Uint8Array(12))               │
│                                                                 │
│  ⚠️ 핵심 규칙: 동일 키 + 동일 IV 조합은 절대 재사용 금지       │
│                                                                 │
│  [로컬 백업]: 파일 저장 시마다 새 IV 생성                       │
│  [Firebase]:  필드 암호화 시마다 새 IV 생성                     │
│                                                                 │
│  IV는 비밀이 아님 → 암호문과 함께 평문으로 저장                 │
│  IV의 역할: 동일 평문이라도 매번 다른 암호문 생성               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 인증 태그 (Authentication Tag) 처리

```
┌─────────────────────────────────────────────────────────────────┐
│  AES-GCM Authentication Tag                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  크기: 128비트 (16바이트) — 최대 보안                           │
│                                                                 │
│  Web Crypto API에서는 encrypt() 결과에 Tag가 자동 포함됨       │
│  → 결과 = ciphertext(가변) + tag(16바이트)                     │
│                                                                 │
│  복호화 시:                                                     │
│  1. decrypt() 호출                                              │
│  2. 내부적으로 Tag 자동 검증                                    │
│  3. 검증 실패 → OperationError 예외 발생                        │
│  4. 검증 성공 → 평문 반환                                       │
│                                                                 │
│  ⚠️ Tag 검증 실패 = 데이터 변조 또는 잘못된 키                  │
│     → 절대로 부분 복호화 결과를 사용하면 안 됨                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 코드 구현

### 5.1 crypto-utils.js (Web Crypto API 기반)

```javascript
/**
 * 암호화 유틸리티 모듈 v2.0
 * Web Crypto API 기반 AES-256-GCM 암호화
 *
 * @module crypto-utils
 * @version 2.0
 */
const CryptoUtils = (function () {
    'use strict';

    // ─── 상수 정의 ───────────────────────────────────
    const ALGORITHM = 'AES-GCM';
    const KEY_LENGTH = 256;
    const IV_LENGTH = 12;       // 96비트 (AES-GCM 표준)
    const TAG_LENGTH = 128;     // 128비트 (최대 보안)
    const SALT_LENGTH = 16;     // 128비트
    const PBKDF2_ITERATIONS = 600000;  // OWASP 2025 권장
    const KDF_HASH = 'SHA-256';
    const ENCRYPTION_VERSION = '2.0';

    // 민감 필드 정의
    const SENSITIVE_FIELDS = [
        'name', 'phone', 'address',
        'birthDate', 'corpNumber', 'parcels'
    ];

    // ─── 유틸리티 함수 ──────────────────────────────────

    /** ArrayBuffer를 Base64 문자열로 변환 */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /** Base64 문자열을 ArrayBuffer로 변환 */
    function base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /** 문자열을 ArrayBuffer로 변환 */
    function stringToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    /** ArrayBuffer를 문자열로 변환 */
    function bufferToString(buffer) {
        return new TextDecoder().decode(buffer);
    }

    // ─── 키 유도 함수 ──────────────────────────────────

    /**
     * 비밀번호 + 키 파일 해시로 복합 키 소재(key material) 생성
     *
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용 (Base64)
     * @returns {Promise<string>} 결합된 키 소재 문자열
     */
    async function createCompositeInput(password, keyFileContent) {
        // 키 파일 내용을 SHA-256으로 해시
        const keyFileBuffer = stringToBuffer(keyFileContent);
        const hashBuffer = await crypto.subtle.digest('SHA-256', keyFileBuffer);
        const keyFileHash = bufferToBase64(hashBuffer);

        // 비밀번호 + 키 파일 해시 결합
        return password + keyFileHash;
    }

    /**
     * PBKDF2로 AES-256-GCM 키 유도
     *
     * @param {string} compositeInput - 복합 키 소재 (password + keyFileHash)
     * @param {ArrayBuffer} salt - 16바이트 Salt
     * @returns {Promise<CryptoKey>} AES-GCM용 CryptoKey 객체
     */
    async function deriveKey(compositeInput, salt) {
        // 1. 복합 입력을 PBKDF2 키 소재로 임포트
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            stringToBuffer(compositeInput),
            'PBKDF2',
            false,       // extractable: false (보안)
            ['deriveKey']
        );

        // 2. PBKDF2로 AES-GCM 키 유도
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: KDF_HASH
            },
            keyMaterial,
            {
                name: ALGORITHM,
                length: KEY_LENGTH
            },
            true,          // extractable: true (복구 블롭 지원)
            ['encrypt', 'decrypt']
        );
    }

    /**
     * 비밀번호 + 키 파일에서 마스터 키 생성 (상위 API)
     *
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용
     * @param {ArrayBuffer} [salt] - Salt (없으면 새로 생성)
     * @returns {Promise<{key: CryptoKey, salt: ArrayBuffer}>}
     */
    async function createMasterKey(password, keyFileContent, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer;
        }
        const compositeInput = await createCompositeInput(password, keyFileContent);
        const key = await deriveKey(compositeInput, salt);
        return { key, salt };
    }

    // ─── 암호화/복호화 기본 함수 ────────────────────────

    /**
     * 문자열 암호화 (AES-256-GCM)
     *
     * @param {string} plainText - 평문
     * @param {CryptoKey} key - AES-GCM 키
     * @returns {Promise<{iv: string, ct: string}>} IV와 암호문 (Base64)
     */
    async function encrypt(plainText, key) {
        if (!plainText) return null;

        try {
            // 12바이트 랜덤 IV 생성 (매 암호화마다 새로 생성)
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

            // AES-GCM 암호화 (결과에 Authentication Tag 포함)
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: ALGORITHM,
                    iv: iv,
                    tagLength: TAG_LENGTH
                },
                key,
                stringToBuffer(plainText)
            );

            return {
                iv: bufferToBase64(iv),
                ct: bufferToBase64(encrypted) // ciphertext + auth tag
            };
        } catch (error) {
            console.error('암호화 실패:', error);
            return null;
        }
    }

    /**
     * 문자열 복호화 (AES-256-GCM)
     *
     * @param {string} ivBase64 - IV (Base64)
     * @param {string} ctBase64 - 암호문 + Auth Tag (Base64)
     * @param {CryptoKey} key - AES-GCM 키
     * @returns {Promise<string|null>} 복호화된 평문
     */
    async function decrypt(ivBase64, ctBase64, key) {
        if (!ivBase64 || !ctBase64) return null;

        try {
            const iv = base64ToBuffer(ivBase64);
            const ciphertext = base64ToBuffer(ctBase64);

            // AES-GCM 복호화 (Authentication Tag 자동 검증)
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: ALGORITHM,
                    iv: new Uint8Array(iv),
                    tagLength: TAG_LENGTH
                },
                key,
                ciphertext
            );

            return bufferToString(decrypted);
        } catch (error) {
            // OperationError = Auth Tag 검증 실패 (변조 또는 잘못된 키)
            console.error('복호화 실패 (키 불일치 또는 데이터 변조):', error);
            return null;
        }
    }

    // ─── 로컬 백업 암호화 ──────────────────────────────

    /**
     * 전체 데이터 암호화 (로컬 백업용)
     *
     * @param {Array} data - 시료 데이터 배열
     * @param {CryptoKey} key - AES-GCM 키
     * @param {ArrayBuffer} salt - PBKDF2 Salt
     * @returns {Promise<string>} 암호화된 백업 파일 내용 (JSON 문자열)
     */
    async function encryptBackup(data, key, salt) {
        const plainJson = JSON.stringify(data);
        const result = await encrypt(plainJson, key);

        if (!result) return null;

        // 메타데이터와 함께 저장
        return JSON.stringify({
            version: ENCRYPTION_VERSION,
            algorithm: ALGORITHM + '-' + KEY_LENGTH,
            kdf: 'PBKDF2-' + KDF_HASH,
            iterations: PBKDF2_ITERATIONS,
            salt: bufferToBase64(salt),
            iv: result.iv,
            ct: result.ct,
            createdAt: new Date().toISOString(),
            recordCount: data.length
        });
    }

    /**
     * 전체 데이터 복호화 (로컬 백업용)
     *
     * @param {string} encryptedJson - 암호화된 백업 파일 내용
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용
     * @returns {Promise<Array|null>} 복호화된 데이터 배열
     */
    async function decryptBackup(encryptedJson, password, keyFileContent) {
        try {
            const envelope = JSON.parse(encryptedJson);

            // 버전 확인
            if (envelope.version !== ENCRYPTION_VERSION) {
                console.warn('암호화 버전 불일치:', envelope.version);
                // v1.0 폴백 처리는 마이그레이션 모듈에서 담당
                return null;
            }

            // Salt 복원
            const salt = base64ToBuffer(envelope.salt);

            // 동일한 비밀번호 + 키 파일로 키 재유도
            const { key } = await createMasterKey(password, keyFileContent, salt);

            // 복호화
            const plainJson = await decrypt(envelope.iv, envelope.ct, key);
            if (!plainJson) return null;

            return JSON.parse(plainJson);
        } catch (error) {
            console.error('백업 복호화 실패:', error);
            return null;
        }
    }

    // ─── Firebase 필드 암호화 ────────────────────────────

    /**
     * 개별 레코드의 민감 필드 암호화 (Firebase용)
     *
     * @param {Object} record - 시료 레코드
     * @param {CryptoKey} key - AES-GCM 키
     * @returns {Promise<Object>} 민감 필드가 암호화된 레코드
     */
    async function encryptRecord(record, key) {
        const encrypted = { ...record };
        encrypted._enc = { v: ENCRYPTION_VERSION };

        for (const field of SENSITIVE_FIELDS) {
            if (record[field] !== undefined && record[field] !== null) {
                const plainText = typeof record[field] === 'object'
                    ? JSON.stringify(record[field])
                    : String(record[field]);

                const result = await encrypt(plainText, key);
                if (result) {
                    encrypted._enc[field] = result;
                    delete encrypted[field];
                }
            }
        }

        return encrypted;
    }

    /**
     * 개별 레코드의 민감 필드 복호화 (Firebase용)
     *
     * @param {Object} record - 암호화된 시료 레코드
     * @param {CryptoKey} key - AES-GCM 키
     * @returns {Promise<Object>} 복호화된 레코드
     */
    async function decryptRecord(record, key) {
        // 암호화되지 않은 레코드는 그대로 반환 (하위 호환)
        if (!record._enc) return record;

        const decrypted = { ...record };
        delete decrypted._enc;

        for (const field of Object.keys(record._enc)) {
            if (field === 'v') continue; // 버전 필드 스킵

            const encData = record._enc[field];
            const plainText = await decrypt(encData.iv, encData.ct, key);

            if (plainText) {
                try {
                    decrypted[field] = JSON.parse(plainText);
                } catch {
                    decrypted[field] = plainText;
                }
            }
        }

        return decrypted;
    }

    /**
     * 데이터 배열 전체 암호화 (Firebase용)
     */
    async function encryptRecords(records, key) {
        return Promise.all(records.map(r => encryptRecord(r, key)));
    }

    /**
     * 데이터 배열 전체 복호화 (Firebase용)
     */
    async function decryptRecords(records, key) {
        return Promise.all(records.map(r => decryptRecord(r, key)));
    }

    // ─── 비밀번호 강도 검증 ─────────────────────────────

    /**
     * 비밀번호 강도 검증
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
            if (password.length >= 12) strength = '강함';
            else strength = '보통';
        }

        return {
            valid: errors.length === 0,
            strength,
            errors
        };
    }

    // ─── 키 파일 생성 ──────────────────────────────────

    /**
     * 새 키 파일 내용 생성 (32바이트 CSPRNG 랜덤)
     *
     * @returns {string} Base64 인코딩된 키 파일 내용
     */
    function generateKeyFileContent() {
        const randomBytes = crypto.getRandomValues(new Uint8Array(32));
        return bufferToBase64(randomBytes);
    }

    // ─── Public API ────────────────────────────────────

    return {
        // 키 관리
        createMasterKey,
        generateKeyFileContent,
        validatePassword,

        // 기본 암호화/복호화
        encrypt,
        decrypt,

        // 로컬 백업
        encryptBackup,
        decryptBackup,

        // Firebase 필드
        encryptRecord,
        decryptRecord,
        encryptRecords,
        decryptRecords,

        // 유틸리티
        bufferToBase64,
        base64ToBuffer,

        // 상수
        SENSITIVE_FIELDS,
        ENCRYPTION_VERSION,
        PBKDF2_ITERATIONS
    };
})();

// 전역 노출
if (typeof window !== 'undefined') {
    window.CryptoUtils = CryptoUtils;
}
```

### 5.2 key-manager.js (복합 키 관리)

```javascript
/**
 * 복합 키 관리 모듈
 * Electron safeStorage 연동 + 키 파일 관리
 *
 * @module key-manager
 * @version 2.0
 */
const KeyManager = (function () {
    'use strict';

    const KEY_FILE_NAME = 'sample-log.key';
    const isElectron = window.electronAPI?.isElectron === true;

    // 메모리에만 유지되는 세션 키 (절대 디스크에 저장하지 않음)
    let _sessionKey = null;     // CryptoKey 객체
    let _sessionSalt = null;    // ArrayBuffer

    /**
     * 키 파일 경로 가져오기
     * Electron: safeStorage로 암호화된 경로에서 복호화
     */
    async function getKeyFilePath() {
        if (!isElectron) return null;
        return window.electronAPI.getKeyFilePath();
    }

    /**
     * 키 파일 존재 여부 확인
     */
    async function keyFileExists() {
        if (!isElectron) return false;
        return window.electronAPI.keyFileExists();
    }

    /**
     * 새 키 파일 생성 및 저장
     */
    async function createKeyFile(customPath = null) {
        const content = CryptoUtils.generateKeyFileContent();

        if (isElectron) {
            // Electron: 앱 데이터 폴더 또는 사용자 지정 경로에 저장
            const result = await window.electronAPI.createKeyFile(content, customPath);
            return result.success;
        }

        // 웹: 다운로드로 제공
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = KEY_FILE_NAME;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    /**
     * 키 파일 내용 읽기
     */
    async function readKeyFile(path = null) {
        if (isElectron) {
            return window.electronAPI.readKeyFile(path);
        }
        // 웹: File API로 사용자가 선택한 파일 읽기
        return null; // UI에서 File input으로 처리
    }

    /**
     * 마스터 키 초기화 (앱 시작 시 호출)
     *
     * @param {string} password - 사용자 비밀번호
     * @param {string} keyFileContent - 키 파일 내용
     * @param {string} [savedSaltBase64] - 저장된 Salt (Base64)
     * @returns {Promise<boolean>} 초기화 성공 여부
     */
    async function initializeMasterKey(password, keyFileContent, savedSaltBase64 = null) {
        try {
            const salt = savedSaltBase64
                ? CryptoUtils.base64ToBuffer(savedSaltBase64)
                : null;

            const result = await CryptoUtils.createMasterKey(
                password, keyFileContent, salt
            );

            _sessionKey = result.key;
            _sessionSalt = result.salt;

            return true;
        } catch (error) {
            console.error('마스터 키 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 현재 세션의 마스터 키 가져오기
     */
    function getSessionKey() {
        return _sessionKey;
    }

    /**
     * 현재 세션의 Salt 가져오기 (Base64)
     */
    function getSessionSaltBase64() {
        if (!_sessionSalt) return null;
        return CryptoUtils.bufferToBase64(_sessionSalt);
    }

    /**
     * 세션 키 폐기 (앱 종료 또는 로그아웃 시)
     */
    function destroySession() {
        _sessionKey = null;
        _sessionSalt = null;
    }

    /**
     * 키가 초기화되었는지 확인
     */
    function isInitialized() {
        return _sessionKey !== null;
    }

    return {
        getKeyFilePath,
        keyFileExists,
        createKeyFile,
        readKeyFile,
        initializeMasterKey,
        getSessionKey,
        getSessionSaltBase64,
        destroySession,
        isInitialized
    };
})();

if (typeof window !== 'undefined') {
    window.KeyManager = KeyManager;
}
```

### 5.3 Electron Main Process IPC 핸들러

```javascript
// src/index.js 에 추가할 IPC 핸들러

const { safeStorage } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// 앱 데이터 경로
const APP_DATA_DIR = path.join(app.getPath('userData'));
const KEY_FILE_NAME = 'sample-log.key';
const CONFIG_FILE = 'encryption-config.dat';

// ─── 키 파일 관련 IPC ─────────────────────────────────

/** 키 파일 존재 여부 확인 */
ipcMain.handle('key-file-exists', async () => {
    const keyPath = path.join(APP_DATA_DIR, KEY_FILE_NAME);
    try {
        await fs.access(keyPath);
        return true;
    } catch {
        return false;
    }
});

/** 키 파일 생성 */
ipcMain.handle('create-key-file', async (event, content, customPath) => {
    try {
        const keyPath = customPath || path.join(APP_DATA_DIR, KEY_FILE_NAME);

        // 디렉토리 생성 (없는 경우)
        await fs.mkdir(path.dirname(keyPath), { recursive: true });

        // 키 파일 저장
        await fs.writeFile(keyPath, content, 'utf-8');

        // 키 파일 경로를 safeStorage로 암호화하여 저장
        if (safeStorage.isEncryptionAvailable()) {
            const encryptedPath = safeStorage.encryptString(keyPath);
            await fs.writeFile(
                path.join(APP_DATA_DIR, CONFIG_FILE),
                encryptedPath
            );
        }

        return { success: true, path: keyPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/** 키 파일 읽기 */
ipcMain.handle('read-key-file', async (event, customPath) => {
    try {
        let keyPath = customPath;

        // 저장된 경로에서 읽기 (safeStorage 복호화)
        if (!keyPath) {
            const configPath = path.join(APP_DATA_DIR, CONFIG_FILE);
            const encryptedPath = await fs.readFile(configPath);
            keyPath = safeStorage.decryptString(encryptedPath);
        }

        const content = await fs.readFile(keyPath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/** 키 파일 경로 가져오기 */
ipcMain.handle('get-key-file-path', async () => {
    try {
        const configPath = path.join(APP_DATA_DIR, CONFIG_FILE);
        const encryptedPath = await fs.readFile(configPath);
        return safeStorage.decryptString(encryptedPath);
    } catch {
        return null;
    }
});

/** safeStorage 보안 백엔드 확인 */
ipcMain.handle('get-storage-backend', () => {
    if (process.platform === 'linux') {
        return safeStorage.getSelectedStorageBackend();
    }
    return process.platform === 'darwin' ? 'keychain' : 'dpapi';
});

/** Salt 저장 (safeStorage 암호화) */
ipcMain.handle('save-salt', async (event, saltBase64) => {
    try {
        if (safeStorage.isEncryptionAvailable()) {
            const encrypted = safeStorage.encryptString(saltBase64);
            await fs.writeFile(
                path.join(APP_DATA_DIR, 'salt.dat'),
                encrypted
            );
            return { success: true };
        }
        return { success: false, error: 'safeStorage 사용 불가' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/** Salt 로드 (safeStorage 복호화) */
ipcMain.handle('load-salt', async () => {
    try {
        const encrypted = await fs.readFile(
            path.join(APP_DATA_DIR, 'salt.dat')
        );
        return safeStorage.decryptString(encrypted);
    } catch {
        return null;
    }
});
```

### 5.4 사용 예시

```javascript
// ─── 앱 시작 시 초기화 ────────────────────────────────

async function onAppStart() {
    // 1. 키 파일 존재 확인
    const keyExists = await KeyManager.keyFileExists();

    if (!keyExists) {
        // 최초 실행: 키 파일 생성 + 비밀번호 설정 화면 표시
        showSetupWizard();
        return;
    }

    // 2. 비밀번호 입력 화면 표시
    showPasswordPrompt();
}

async function onPasswordSubmit(password) {
    // 3. 키 파일 읽기
    const keyResult = await KeyManager.readKeyFile();
    if (!keyResult.success) {
        showError('키 파일을 읽을 수 없습니다.');
        return;
    }

    // 4. 저장된 Salt 로드
    const savedSalt = await window.electronAPI.loadSalt();

    // 5. 마스터 키 초기화
    const success = await KeyManager.initializeMasterKey(
        password,
        keyResult.content,
        savedSalt
    );

    if (!success) {
        showError('비밀번호가 올바르지 않습니다.');
        return;
    }

    // 6. Salt 저장 (최초 또는 갱신 시)
    if (!savedSalt) {
        await window.electronAPI.saveSalt(
            KeyManager.getSessionSaltBase64()
        );
    }

    // 7. 앱 메인 화면으로 이동
    loadMainScreen();
}

// ─── 데이터 저장 시 ───────────────────────────────────

async function saveToBackup(sampleLogs) {
    const key = KeyManager.getSessionKey();
    const salt = CryptoUtils.base64ToBuffer(
        KeyManager.getSessionSaltBase64()
    );

    // 전체 데이터 암호화
    const encrypted = await CryptoUtils.encryptBackup(
        sampleLogs, key, salt
    );

    // .enc 파일로 저장
    const encPath = FileAPI.autoSavePath.replace('.json', '.enc');
    await window.electronAPI.writeFile(encPath, encrypted);
}

// ─── Firebase 저장 시 ──────────────────────────────────

async function saveToFirebase(record) {
    const key = KeyManager.getSessionKey();

    // 민감 필드 암호화
    const encryptedRecord = await CryptoUtils.encryptRecord(record, key);

    // Firebase에 저장
    await firebaseDb.saveRecord(encryptedRecord);
}

// ─── Firebase 로드 시 ──────────────────────────────────

async function loadFromFirebase(docId) {
    const key = KeyManager.getSessionKey();

    // Firebase에서 로드
    const encryptedRecord = await firebaseDb.getRecord(docId);

    // 민감 필드 복호화 (암호화되지 않은 레코드는 그대로 반환)
    return CryptoUtils.decryptRecord(encryptedRecord, key);
}
```

---

## 6. 데이터 마이그레이션

### 6.1 CryptoJS → Web Crypto API 마이그레이션

```
┌─────────────────────────────────────────────────────────────────┐
│  CryptoJS → Web Crypto API 마이그레이션 전략                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  v1.0 (CryptoJS) 으로 암호화된 데이터가 존재할 경우:           │
│                                                                 │
│  [읽기]                                                         │
│    1. 파일/레코드의 version 필드 확인                           │
│    2. version "1.0" → CryptoJS로 복호화 (레거시 모듈)          │
│    3. version "2.0" → Web Crypto API로 복호화                  │
│    4. version 없음 → 평문으로 처리                              │
│                                                                 │
│  [쓰기]                                                         │
│    항상 Web Crypto API (v2.0)로 암호화                          │
│                                                                 │
│  [자동 전환]                                                    │
│    v1.0 데이터를 읽은 후 수정/저장 시 자동으로 v2.0으로 재암호화│
│                                                                 │
│  [CryptoJS 제거 시점]                                           │
│    v2.0 출시 후 6개월 → CryptoJS 의존성 제거                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 기존 평문 데이터 마이그레이션

#### 저장소별 정책

| 저장소 | 마이그레이션 방식 | 설명 |
|--------|------------------|------|
| **localStorage** | 변경 없음 | 캐시 용도, 평문 유지 |
| **Firebase** | 점진적 | 수정 시 자동 암호화 |
| **로컬 백업 (.json)** | 자동 변환 | .enc 파일로 변환 |

#### Firebase 점진적 마이그레이션

```javascript
/**
 * Firebase 레코드 로드 시 자동 감지/복호화
 * - _enc 필드 있음 → v2.0 복호화
 * - _encrypted 필드 있음 → v1.0 복호화 (CryptoJS 레거시)
 * - 둘 다 없음 → 평문 그대로 반환
 */
async function loadAndMigrateRecord(record, key) {
    // v2.0 암호화
    if (record._enc) {
        return CryptoUtils.decryptRecord(record, key);
    }

    // v1.0 암호화 (CryptoJS 레거시)
    if (record._encrypted) {
        return LegacyCrypto.decryptRecord(record, legacyKey);
    }

    // 평문 (마이그레이션 전)
    return record;
}
```

#### 로컬 백업 자동 변환

```
앱 시작 시:
  1. .json 파일 존재 확인
  2. 존재하면:
     - 내용 읽기 (평문 JSON)
     - Web Crypto API로 암호화
     - .enc 파일로 저장
     - 원본 .json → .json.backup 으로 이름 변경
  3. 이후 자동 저장은 .enc 파일에만 수행

호환성 유지:
  Phase 1 (6개월): .enc + .json 모두 읽기 지원
  Phase 2 (6개월 후): .enc 우선, .json.backup 폴백
  Phase 3 (1년 후): 레거시 파일 정리 옵션 제공
```

---

## 7. 보안 고려사항 (OWASP 2025 기준)

### 7.1 필수 준수 사항 (Do's)

| # | 항목 | 근거 |
|---|------|------|
| 1 | AES-256-GCM 인증된 암호화 사용 | OWASP Cryptographic Storage |
| 2 | PBKDF2 600,000회 이상 반복 | OWASP Password Storage 2025 |
| 3 | IV는 12바이트 CSPRNG 랜덤, 매번 새로 생성 | AES-GCM 표준 |
| 4 | Salt는 16바이트 이상 CSPRNG 랜덤 | OWASP, NIST SP 800-132 |
| 5 | 키를 메모리에만 유지 (복구 블롭 생성 시에만 extractable: true) | Web Crypto API + 복구 지원 |
| 6 | Electron safeStorage로 민감 설정 보호 | Electron 공식 권장 |
| 7 | Authentication Tag 검증 실패 시 데이터 폐기 | AEAD 프로토콜 |
| 8 | 비밀번호 원본 사용 후 즉시 메모리에서 제거 | OWASP Key Management |
| 9 | 복구 키에 브루트포스 보호 (5회/30분 잠금) | 서버사이드 레이트 리미팅 |
| 10 | 복구 블롭에 마스터 키 raw bytes 저장 (비밀번호 아님) | 비밀번호 노출 방지 |
| 11 | 재암호화 실패 시 롤백 메커니즘 구현 | 데이터 일관성 보장 |
| 12 | 클립보드에 복사된 복구 키 30초 후 자동 삭제 | 클립보드 탈취 방지 |

### 7.2 금지 사항 (Don'ts)

| # | 항목 | 위험 |
|---|------|------|
| 1 | ❌ 암호화 키 하드코딩 | 소스 코드 노출 시 전체 보안 무력화 |
| 2 | ❌ localStorage/sessionStorage에 키 저장 | XSS 공격으로 탈취 가능 |
| 3 | ❌ 콘솔에 키/비밀번호 로깅 | 개발자도구로 확인 가능 |
| 4 | ❌ 동일 IV 재사용 (AES-GCM) | 보안 완전 붕괴 |
| 5 | ❌ Auth Tag 검증 없이 데이터 사용 | 변조된 데이터 수용 위험 |
| 6 | ❌ CryptoJS 신규 암호화에 사용 | 개발 중단, 보안 감사 미실시 |
| 7 | ❌ MD5, SHA-1 키 유도에 사용 | 충돌 공격 취약 |

### 7.3 위험 요소 및 대응

| 위험 | 영향도 | 대응 방안 |
|------|--------|----------|
| 비밀번호 + 키 파일 동시 분실 | 🔴 치명적 | 키 파일 백업 안내, 복구 불가 경고 |
| 키 파일만 유출 | 🟡 중간 | 비밀번호 없이는 복호화 불가 |
| 비밀번호만 유출 | 🟡 중간 | 키 파일 없이는 복호화 불가 |
| IV 재사용 | 🔴 치명적 | 매 암호화 시 CSPRNG으로 새 IV 생성 |
| 메모리 덤프 | 🟠 높음 | 세션 종료 시 키 폐기, extractable: false |
| Linux basic_text 폴백 | 🟠 높음 | 사용자 경고, 키체인 설치 권장 |
| 복구 키 유출 | 🔴 치명적 | 브루트포스 보호 (5회/30분), 한 번만 표시, 클립보드 자동 삭제 |
| 재암호화 중 실패 | 🟠 높음 | 롤백 메커니즘으로 완료된 컬렉션 복원, 실패 시 사용자 안내 |
| 클립보드 탈취 | 🟡 중간 | 30초 자동 삭제, 모달 종료 시 즉시 삭제 |

### 7.4 롤백 계획

```
긴급 롤백 절차:
  1. 암호화 기능 비활성화 플래그 설정
  2. .json.backup 파일에서 평문 데이터 복원
  3. Firebase 평문 모드 전환 (v1.0 호환)
  4. 버그 수정 후 재배포

데이터 보존 원칙:
  - 마이그레이션 시 원본 파일 절대 삭제 안 함
  - 암호화 실패 시 평문 저장 폴백
  - 복호화 실패 시 원본 암호화 데이터 유지
```

---

## 8. 참고 자료 및 출처

### 표준 및 가이드라인

| 출처 | 문서 | URL |
|------|------|-----|
| OWASP | Cryptographic Storage Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html |
| OWASP | Key Management Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html |
| OWASP | Password Storage Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html |
| OWASP | Top 10 2025 - A04 Cryptographic Failures | https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/ |
| NIST | SP 800-132 (Password-Based Key Derivation) | https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf |

### 기술 문서

| 출처 | 문서 | URL |
|------|------|-----|
| Electron | safeStorage API | https://www.electronjs.org/docs/latest/api/safe-storage |
| MDN | Web Crypto API | https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API |
| MDN | SubtleCrypto.deriveKey() | https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey |
| W3C | Web Cryptography API Level 2 | https://w3c.github.io/webcrypto/ |
| Node.js | Web Crypto API | https://nodejs.org/api/webcrypto.html |

### 비교 분석 자료

| 출처 | 제목 | URL |
|------|------|-----|
| DEV Community | PBKDF2 310,000+ Iterations in 2025 | https://dev.to/securebitchat/why-you-should-use-310000-iterations-with-pbkdf2-in-2025-3o1e |
| Deepak Gupta | Argon2 vs Bcrypt vs Scrypt vs PBKDF2 (2025) | https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/ |
| Medium (@qwtel) | Replacing CryptoJS with Web Cryptography | https://qwtel.com/posts/software/replacing-cryptojs-with-web-cryptography/ |
| Medium (Isuru K.) | AES-GCM vs AES-CBC | https://isuruka.medium.com/selecting-the-best-aes-block-cipher-mode-aes-gcm-vs-aes-cbc-ee3ebae173c |
| Online Hash Crack | Secure Key Management 2025 | https://www.onlinehashcrack.com/guides/cryptography-algorithms/secure-key-management-2025-developer-best-practices.php |

### 실제 구현 사례

| 출처 | 제목 | URL |
|------|------|-----|
| Signal Desktop | safeStorage PR #6849 | https://github.com/signalapp/Signal-Desktop/pull/6849 |
| CryptoJS | 개발 중단 공지 (Issue #468) | https://github.com/brix/crypto-js/issues/468 |
| GitHub | Web Crypto 예제 | https://github.com/bradyjoslin/webcrypto-example |

---

*문서 끝*
