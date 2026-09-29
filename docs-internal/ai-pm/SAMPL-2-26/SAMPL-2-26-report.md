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
| 수정 후 (`npx vitest run`, 2회 연속) | 19 passed (19) | **0 failed / 423 passed (423)** |

- 수정 후 423 = 기존 418 + 새로 넣은 실제 AES-GCM 테스트 5건.
- 423 안에 `it.fails` 3건이 들어 있다(아래 3절). 코디네이터 결정(A)에 따라 0 fail 로 본다.

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
| secure-storage `should handle very large data` | SAMPL-2-38 | `encryptWithCrypto` 의 `String.fromCharCode.apply(null, combined)` 가 약 130KB에서 `RangeError: Maximum call stack size exceeded` → `setItem` false | 1,000건×약 130자 객체를 `setItem`. 로그 `[SecureStorage] 저장 실패: RangeError…`. 현재 사용처는 `firebase-config-migration.ts`(작은 설정)뿐이라 실제 영향은 낮다 |
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

이번 티켓 범위(실패 테스트 되살리기) 밖이라 고치지 않았다. 목록만 남긴다.

- encryption-manager
  - `Distributed Lock` 3건: `expect(mockFirebaseDb.runTransaction).toBeDefined()` 만 본다. `acquireLock` 은 불리지 않는다
    (`recoverPassword()` 로 구동하면 테스트 가능. 잠금이 잡혀 있으면 `'Another password operation in progress'` 로 즉시 반환)
  - `timingSafeEqual` 1건, `Recovery Blob > recovery key length` 1건: 테스트 안의 리터럴끼리만 비교
  - `Session Management` 2건: 목 localStorage 를 직접 읽고 쓴다. 소스는 세션 비밀번호를 **sessionStorage 에 평문으로** 둔다.
    테스트 이름("localStorage (encrypted)")이 소스와 다르다
  - `Key Source Tracking > generated`: `expect(true).toBe(true)`
  - `Module Constants`, `Encryption Manager State > uninitialized`, `Edge Cases > concurrent initialization`: 모듈이 정의됐는지만 본다
  - `Security Considerations > should not store passwords in plain text`: `beforeEach` 가 비운 목 저장소를 훑어 항상 통과
  - `Security Considerations > random IV / AAD`: 결과가 truthy 인지만 본다(실제 검증은 3-4절 블록으로 대체됨)
- crypto-utils: `different keys on each call`, `different salts`(목이 결정적이라 truthy 만), `v2.0 backward compatibility`(`typeof string` 만)
- secure-storage: `undefined data storage` 는 `toBeDefined()` 라 `null` 도 통과

## 7. 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npx vitest run` (기준선) | 33 failed / 385 passed (418), 4 files failed |
| `npx vitest run` (수정 후, 2회) | 423 passed (423), 19 files passed, exit 0 |
| `npm run build` | exit 0, `✓ built in 8.30s` (청크 크기 경고만). 빌드가 다시 쓴 `docs/*.html`·`src/shared/tailwind-output.css` 해시 변경은 산출물이라 `git checkout` 으로 되돌림 |
| `npm run typecheck:gate` | exit 0, `현재 타입에러: 714 / baseline: 714`, 통과 |

## 8. 남은 위험

- **실제 AES-GCM 블록은 Node 의 `webcrypto` 로 돈다.** 브라우저·Electron 렌더러의 WebCrypto 와 같은 표준 구현이지만, 그 환경에서 직접 재 보지는 않았다.
- encryption-manager 는 2,727줄 중 키 로드·접두사·오류 경로만 실제로 구동된다. 초기화(`init`)·복구·재암호화 흐름은 모달을 띄워 단위 테스트에서 구동하지 않았다.
- 범위 밖 관찰: `src/shared/encryption-manager.ts` 의 `changePassword()` 는 스텁이다(`'Not implemented in abbreviated version'` 반환).
  `src/` 에서 호출하는 곳은 찾지 못했다(`globals.d.ts` 의 타입 선언뿐). 따라서 사용자 영향은 확인하지 않았다.
- `secure-storage` `rotateKey()` 는 복호화에 실패한 항목을 `null` 로 백업한 뒤 새 키로 `null` 을 다시 저장한다. 원래 암호문은 사라진다. 코드를 읽어 확인했을 뿐 재현 테스트는 만들지 않았다.
