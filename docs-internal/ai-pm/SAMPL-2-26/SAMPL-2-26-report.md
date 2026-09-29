# SAMPL-2-26 작업 보고서 — 암호화 단위 테스트 되살리기

- 브랜치: `bluesky78060/sampl-2-26-crypto-tests` (기준 5c44c1b)
- 바꾼 파일: `tests/unit/encryption-manager.test.ts`, `tests/unit/secure-storage.test.ts`,
  `tests/unit/crypto-utils.test.ts`, `tests/unit/path-security.test.ts`. **`src/` 는 건드리지 않음**
  (변이 검증 때 일시로 바꾼 것은 모두 되돌렸고, 매번 `git diff --stat -- <파일>` 가 빈 출력임을 확인함).
  vitest 설정은 바꾸지 않음.

## 1. 수치

| 시점 | Test Files | Tests |
| --- | --- | --- |
| 수정 전 기준선 (`npx vitest run`) | 4 failed / 15 passed (19) | **33 failed / 385 passed (418)** |
| 1라운드 후 (3baed4e, `npx vitest run`, 2회 연속) | 19 passed (19) | 0 failed / 423 passed (423) |
| **2라운드 후 (`npx vitest run`, 2회 연속)** | 19 passed (19) | **0 failed / 415 passed / 15 todo (430)** |

- 1라운드 423 = 기존 418 + 새로 넣은 실제 AES-GCM 테스트 5건.
- 2라운드 430 = 423 + 새 테스트 7건(키 파생 5, v2.0 레거시 1, 실제 AES-GCM rotateKey 1).
  그중 껍데기 15건을 `it.todo` 로 바꿔 통과 수에서 뺐다(9절). 그래서 통과는 415.
- 통과 수 안에 `it.fails` 3건이 들어 있다(5절). 코디네이터 결정(A)에 따라 0 fail 로 본다.

## 2. 기준선 실패 33건의 원인 분류

| 분류 | 건수 | 내용 |
| --- | --- | --- |
| require 모듈 해석 실패 | 22 | encryption-manager 17, secure-storage 5. `delete require.cache[require.resolve('../../src/shared/…')]` 가 확장자 없는 경로를 `.ts` 로 못 찾음 |
| 연쇄 실패 | 6 | ① `vi.stubGlobal('crypto', undefined)` 뒤 require 가 먼저 던져 복원 줄이 안 돌아 이후 5건이 `getRandomValues` 오류 ② `mockImplementationOnce` 가 소비되지 않고 다음 테스트로 새어 1건이 `localStorage quota exceeded` |
| 그 밖 (require 와 무관) | 5 | crypto-utils `vi.spyOn(함수, 'decrypt')` 오용 1, secure-storage clear 1·rotateKey 실패 경로 1·대용량 데이터 1, path-security `%ZZ%YY` 1 |

## 3. 바꾼 것

### 3-1. 모듈 해석 (22건)
`require.cache` 삭제 + `import(변수)` → `vi.resetModules()` + 정적 경로 `await import('../../src/shared/…')`.

### 3-2. 되살아나자 드러난 테스트 쪽 결함
- **import 시점 부작용을 가정한 테스트** (encryption-manager: getCollectionPrefix 2, loadKeyFileContent 3,
  Key Source 2, Error Handling 2). 소스는 키 로드·접두사 계산을 import 가 아니라 호출 때 한다.
  require 만 고치면 `expected "vi.fn()" to be called` 로 실패했다. 공개 API 로 구동하게 바꿨다:
  - 접두사: `checkRecoveryBlobExists()` 호출 → `collection('_system')` / `collection('test_system')` 단언
  - 키 로드 우선순위·출처: `verifyPassword()` (키가 없으면 `loadKeyFileContent` 를 부르고 salt 가 없어 false) →
    `getKeySource()` 가 `firebase` / `local` / `null` 인지, Firebase 가 있으면 `encryption_keyFile` 을 안 읽는지 단언
  - 기대값을 줄인 것은 없다. 이전 단언(`toHaveBeenCalled`)은 그대로 두고 더 구체적인 단언을 더했다.
- **격리 누수**: 최상위 `beforeEach` 에서 `mockFirebaseDb.collection`·`localStorage.getItem` 구현·`getCollectionName` 을 되돌림
  (Firebase 오류 테스트가 `collection` 을 던지는 목으로 영구 교체하고 있었다). crypto 스텁 복원은 `try/finally`.
- **secure-storage localStorage 목**: 메서드만 담은 객체라 `Object.keys(localStorage)` 가 메서드 이름을 돌려줬다.
  `clear()`·`rotateKey()` 가 실제로 아무 키도 훑지 못했다. 실제 Storage 처럼 저장 키가 나오도록 Proxy 로 바꿈.
- **rotateKey 실패 경로**: 저장 항목이 없으면 `getItem` 이 불리지 않아 spy 가 무의미했다. 항목 하나를 먼저 저장.
- **Global Instance**: 싱글톤이 모듈 평가 시점의 crypto 로 만들어져 앞선 import 순서에 의존했다. 해당 describe 에서 `vi.resetModules()`.
- **crypto-utils `[복호화 실패]`**: export 된 함수를 spy 해도 모듈 내부 호출은 가로챌 수 없다.
  `crypto.subtle.decrypt` 목이 한 번 거부하게 바꿈(태그 검증 실패와 같은 자리). 기대값 `'[복호화 실패]'` 그대로.

### 3-3. 소스 의도 변경에 맞춘 스펙 갱신 (코디네이터 승인 (4))
secure-storage "Web Crypto 없음" 2건. 5ea52e0 에서 소스가 **Web Crypto 미지원 시 저장 거부**로 의도적으로 바뀌었다
(`setItem` → false, `getItem` 은 레거시 base64 읽기 시도). 테스트는 옛 base64 저장을 기대하고 있었다.
- 저장: `false` + `secure_fallback` 키가 localStorage 에 쓰이지 않았음을 단언
- 읽기: 레거시 base64 데이터를 심어 두고 `getItem` 이 복원하는지 단언

### 3-4. 실제 WebCrypto 블록 추가 (crypto-utils, 5건)
기존 XOR 목은 IV·AAD·키를 무시해서 4절의 M2·M3·M4 변이를 하나도 잡지 못했다.
`node:crypto` 의 `webcrypto` 로만 도는 describe 를 더했다(beforeAll 에 스텁, afterAll 에 목 복원):
IV 12바이트 + 태그 16바이트, 매 암호화마다 새 IV, 다른/빠진 AAD 로 복호화하면 거부, 암호문 1바이트 변조 시 거부(태그 검증),
v2.1 레코드 왕복 + 필드 간 암호문 치환 시 `[복호화 실패]`.

## 4. 변이 검증 (소스를 일시로 바꿔 `npx vitest run` 전체 실행 → 원복 → `git diff` 빈 출력 확인)

| # | 변이 (src/shared/…) | 되살린 기존 테스트 | + 실제 AES-GCM 블록 |
| --- | --- | --- | --- |
| M1 | crypto-utils `decrypt` 결과 변조 (`.slice(1)`) | **잡음** (13 fail) | — |
| M2 | crypto-utils `IV_LENGTH` 12 → 16 | 못 잡음 (418 pass) | **잡음** (IV 12바이트 테스트) |
| M3 | `encryptRecord` 가 AAD(필드명)를 안 넘김 | 못 잡음 | **잡음** (v2.1 레코드 왕복) |
| M4 | `decrypt` 가 AAD 를 무시 | 못 잡음 | **잡음** (2 fail) |
| M5 | `decryptRecord` 실패 표시 `'[복호화 실패]'` → `''` | **잡음** | — |
| M6 | secure-storage `clear()` 접두 조건 깨뜨림 | **잡음** (Proxy 목 덕분) | — |
| M7 | encryption-manager 접두사 `'test_'` → `''` | **잡음** | — |
| M8 | encryption-manager Firebase 키 로드 경로 비활성 | **잡음** (2 fail) | — |
| M9 | crypto-utils IV 를 고정값(0으로 채움)으로 | 재지 않음 (블록 추가 후에만 실행. 목의 `getRandomValues` 가 결정적이라 기존 테스트로는 구별할 수 없다고 본다) | **잡음** (새 IV 테스트) |

원자료: 각 실행 출력은 작업 중 스크래치 디렉터리에 `mut-*.txt` 로 남겼다(커밋하지 않음).
GCM 태그 검증 자체는 WebCrypto 안에 있어 소스 변이로 끌 수 없다. 대신 "암호문 1바이트 변조 → 거부" 테스트로 확인한다.

## 5. `it.fails` 3건 — 테스트가 드러낸 소스 동작 (소스 미수정, 후속 티켓)

| 테스트 | 후속 티켓 | 원인 | 재현 |
| --- | --- | --- | --- |
| secure-storage `should handle very large data` | SAMPL-2-38 | `encryptWithCrypto` 의 `String.fromCharCode.apply(null, combined)` 가 이 머신(node 22.23.2)에서 약 109KB(측정 109,847바이트, 스택 크기에 따라 다름 · CI 미측정)를 넘으면 `RangeError: Maximum call stack size exceeded` → `setItem` false | 1,000건×약 130자 객체(JSON 140,793바이트, IV 를 붙인 `combined` 140,805바이트 — 목 암호화라 태그 없음)를 `setItem`. 로그 `[SecureStorage] 저장 실패: RangeError…`. 현재 사용처는 `firebase-config-migration.ts`(작은 설정)뿐이라 실제 영향은 낮다 |
| encryption-manager `should handle missing crypto API gracefully` | SAMPL-2-39 | 최상위 `_lockId` 가 import 시점에 `crypto.randomUUID` 를 읽는다. 전역 `crypto` 가 없으면 import 자체가 `TypeError` | `vi.stubGlobal('crypto', undefined)` 후 import. 브라우저·Electron 에는 전역 crypto 가 늘 있어 엣지 케이스 |
| path-security `should handle invalid URL encoding gracefully` | SAMPL-2-40 | `%ZZ%YY` 는 `/%[0-9a-fA-F]{2}/` 에 안 걸려 디코딩 검사를 건너뛰고 `safe:true` | `PathSecurity.checkDangerousPatterns('%ZZ%YY')`. 유효한 `%XX` 가 섞이면 `decodeURIComponent` 가 던져 이미 거부된다 |

**원인이 그것임을 확인한 방법** — 각 원인만 소스에서 일시 제거하고 해당 파일을 돌렸다.
세 경우 모두 **그 `it.fails` 하나만** 깨졌다(= 기대값이 그 원인 때문에만 실패한다). 소스는 원복 후 `git diff` 빈 출력 확인.

| 원인 제거 (일시) | 결과 |
| --- | --- |
| `fromCharCode.apply` → 바이트 루프 | secure-storage 1 failed / 29 passed (`very large data` ×) |
| `crypto.randomUUID` → `globalThis.crypto?.randomUUID` | encryption-manager 1 failed / 37 passed (`missing crypto` ×) |
| `/%[0-9a-fA-F]{2}/` → `/%/` | path-security 1 failed / 70 passed (`invalid URL encoding` ×) |

## 6. 여전히 아무것도 검증하지 않는 테스트 (통과하지만 껍데기)

2라운드에서 encryption-manager 껍데기 15건은 `it.todo` 로 바꿨고(9-4절), Distributed Lock `held by another process` 는
실제 테스트로 바꿨다. 아래는 **아직 초록으로 통과 수에 들어 있는** 껍데기다.

- crypto-utils: `different keys on each call`, `different salts`(목이 결정적이라 truthy 만),
  `v2.0 backward compatibility`(`typeof string` 만 — 실제 복원 검증은 실제 AES-GCM 블록의 v2.0 레거시 테스트가 한다)
- secure-storage: `undefined data storage` 는 `toBeDefined()` 라 `null` 도 통과
- secure-storage `should rotate encryption key`(XOR 목): 목이 키를 무시해 회전이 없어도 통과한다.
  회전 자체는 새 실제 AES-GCM 테스트가 검증한다(9-3절). 기존 테스트는 지우지 않았다

## 7. 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npx vitest run` (기준선) | 33 failed / 385 passed (418), 4 files failed |
| `npx vitest run` (1라운드 후, 2회) | 423 passed (423), 19 files passed, exit 0 |
| `npx vitest run` (**2라운드 후, 2회**) | **415 passed / 15 todo (430)**, 19 files passed, exit 0 (두 번 모두) |
| `npm run build` (2라운드) | exit 0, `✓ built in 11.52s` (청크 크기 경고만). 빌드가 다시 쓴 `docs/*.html` 12개·`src/shared/tailwind-output.css` 는 산출물이라 `git checkout` 으로 되돌림 |
| `npm run typecheck:gate` (2라운드) | exit 0, `현재 타입에러: 714 / baseline: 714`, 통과 |
| `git diff --quiet src` (변이 후·빌드 후) | 빈 출력(exit 0) |

## 8. 남은 위험

- **실제 AES-GCM 블록은 Node 의 `webcrypto` 로 돈다.** 브라우저·Electron 렌더러의 WebCrypto 와 같은 표준 구현이지만, 그 환경에서 직접 재 보지는 않았다.
- encryption-manager 는 2,727줄 중 키 로드·접두사·오류 경로만 실제로 구동된다. 초기화(`init`)·복구·재암호화 흐름은 모달을 띄워 단위 테스트에서 구동하지 않았다.
- 범위 밖 관찰: `src/shared/encryption-manager.ts` 의 `changePassword()` 는 스텁이다(`'Not implemented in abbreviated version'` 반환).
  `src/` 에서 호출하는 곳은 찾지 못했다(`globals.d.ts` 의 타입 선언뿐). 따라서 사용자 영향은 확인하지 않았다.
- `secure-storage` `rotateKey()` 는 복호화에 실패한 항목을 `null` 로 백업한 뒤 새 키로 `null` 을 다시 저장한다. 원래 암호문은 사라진다. 코드를 읽어 확인했을 뿐 재현 테스트는 만들지 않았다.
- Distributed Lock 변이(L1·L2)는 단언이 아니라 **5초 타임아웃**으로 실패한다. 잠금을 통과한 `recoverPassword` 가 뒤의 복구 흐름(모달)에서 멈추는 것으로 보인다 — 어디서 멈추는지는 추적하지 않았다. 잡히긴 하지만 실패 메시지가 원인을 말해 주지 않는다.
- `it.todo` 15건은 검증이 **없다**는 표시일 뿐이다. `init`·복구·세션 비밀번호 저장 흐름은 여전히 단위 테스트가 없다.

## 9. 2라운드 — 독립 리뷰 지적 반영

리뷰 원문: codex 레인 🟠 MAJOR 1, code-reviewer 레인 🟡 3 · 🔵 2.

### 9-1. 키 파생 (codex 🟠 MAJOR) — crypto-utils 실제 AES-GCM 블록
- 같은 password·key-file·salt 로 두 번 만든 키는 서로 복호화한다.
- password / key-file / salt 를 **하나씩** 바꿔 만든 키로는 복호화가 거부된다(`it.each` 3건).
- `webcrypto.subtle.deriveKey` 를 spy 해 `{ name:'PBKDF2', iterations:600000, hash:'SHA-256', salt }` 로 불렸는지 단언하고,
  소스와 독립적으로 `PBKDF2-SHA256(password + base64(SHA-256(keyFile)), salt, 600000)` 을 `deriveBits` 로 계산해
  `exportKey('raw')` 결과와 바이트 단위로 비교한다.

### 9-2. v2.0 레거시 복호화 (🟡 MINOR 3)
AAD 없이 `encrypt` 한 `{ v:'2.0' }` 레코드가 `decryptRecord` 로 원문 복원되고 `_enc` 가 빠지는지 단언.

### 9-3. rotateKey (🟡 MINOR 1) — secure-storage
실제 `webcrypto` 로 구동: 회전 후 `samplelog_secure_key` 가 바뀌고, `secure_data1` 암호문이 바뀌고,
새로 만든 인스턴스(저장된 새 키를 읽음)가 복원하며, 옛 암호문을 되돌려 넣으면 새 키로는 `null` 인지 단언.

### 9-4. 껍데기 정리 (🟡 MINOR 2) — encryption-manager
- `Distributed Lock > held by another process`: 잠금 문서가 5분 이내면 `recoverPassword()` 가
  `{ success:false, error:'Another password operation in progress' }` 를 돌려주고, `runTransaction` 1회, `collection('_system')` 을 단언.
- 나머지 15건을 `it.todo` 로 바꿨다. 설명 문자열에 무엇을 검증해야 하는지 남겼다:
  Module Constants 1, timingSafeEqual 1, Distributed Lock available·expired 2, Encryption Manager State 2,
  Recovery key length 1, Session Management 2, Key Source generated 1, Edge Cases 2, Security Considerations 3(plaintext·random IV·AAD).

### 9-5. 문서·주석
- 5절의 "약 130KB" → 측정값(109,847바이트, node 22.23.2, `String.fromCharCode.apply` 이분 탐색)으로 정정. 테스트 주석도 같이 정정.
- `it.fails` 3건(secure-storage·encryption-manager·path-security)에 "어떤 이유로든 실패하면 통과 — 다른 회귀도 가릴 수 있다" 한 줄 추가.
  현재 동작 고정 테스트로 바꾸는 것(🔵 1)은 코디네이터 결정대로 하지 않았다(SAMPL-2-38/39/40 에서 소스와 함께 처리).

### 9-6. 변이 검증 (2라운드)
각 변이를 소스에 주입 → 해당 테스트 파일을 `npx vitest run <파일> --reporter=verbose` 로 실행 → `git checkout` 원복.
마지막에 `git diff --stat src` 빈 출력 확인. **8건 모두 잡힘.**

| # | 변이 (src/shared/…) | 결과 | 실패한 테스트 |
| --- | --- | --- | --- |
| K1 | crypto-utils `createCompositeInput` 이 `password` 만 반환 | **잡음** (2 failed / 59 passed) | different key file cannot decrypt, independently computed PBKDF2 key |
| K2 | `deriveKey` 에 고정 salt(`new Uint8Array(16).buffer`) | **잡음** (2 failed / 59 passed) | different salt cannot decrypt, independently computed PBKDF2 key |
| K3 | PBKDF2 `iterations: 1` | **잡음** (1 failed / 60 passed) | independently computed PBKDF2 key |
| X2 | `decryptRecord` 의 `useAAD = true` (crypto-utils.ts:394) | **잡음** (1 failed / 60 passed) | legacy v2.0 record encrypted without AAD |
| X5 | secure-storage `rotateKey` 재암호화 루프 제거 | **잡음** (1 failed / 30 passed) | replace the stored key and re-encrypt (real AES-GCM) |
| X6 | secure-storage `rotateKey` 새 키 생성·저장 제거 | **잡음** (1 failed / 30 passed) | 같음 |
| L1 | encryption-manager `acquireLock` 이 유효한 잠금에도 `true` | **잡음** (1 failed / 22 passed / 15 todo) — 5초 타임아웃 | held by another process |
| L2 | `recoverPassword` 의 `if (!lockAcquired)` 조기 반환 제거 | **잡음** (같음) — 5초 타임아웃 | held by another process |

1라운드 리뷰가 보고한 X2·X5·X6 은 그때 전체 실행에서 423 passed(못 잡음)였다.
