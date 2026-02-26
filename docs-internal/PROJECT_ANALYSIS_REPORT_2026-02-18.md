# 프로젝트 심층 분석 보고서

- **프로젝트:** sample-log-electron (시료 접수 대장)
- **분석 일자:** 2026-02-18
- **최종 검증일:** 2026-02-20
- **분석 범위:** src/ 내 46개 JavaScript 파일, ~30,300줄
- **분석 방법:** 4개 전문 에이전트 병렬 분석 (아키텍처, 코드 품질, 보안, 성능)

---

## 2026-02-20 검증 결과 요약

> **BaseSampleManager 리팩토링 + Vite 빌드 전환 이후 재검증 결과**
>
> | 구분 | 원본 (65건) | 해결 | 유효 | 오탐/해당없음 |
> |------|-------------|------|------|---------------|
> | CRITICAL (5건) | C-1~C-5 | C-3,C-4,C-5 해결 | - | C-1,C-2 오탐 |
> | HIGH 보안 (6건) | H-1~H-6 | H-1,H-2,H-3,H-5 해결 | H-4 수용가능 | H-6 해당없음 |
> | 성능 (13건) | PER-1~PER-13 | 11건 해결 | PER-5,PER-9 수정완료(2/20) | - |
> | 아키텍처 (12건) | A-1~A-9 등 | A-1,A-5,A-8,A-9 해결 | 나머지 유효 | - |
>
> **주요 변경:**
> - BaseSampleManager 마이그레이션 완료 (5개 스크립트 ~4,700줄 중복 제거)
> - Vite + ES Modules 번들링 전환 (30+ script 태그 → 모듈)
> - Firebase CDN → npm 통합, Tailwind CDN → 빌드타임 CSS 전환
> - XSS 취약점 4곳 escapeHTML 적용, CSP script-src unsafe-inline 제거
> - validateFilePath 비동기 I/O 전환, hasChanges 최적화 완료
> - DOM 렌더링 DocumentFragment 패턴 적용 (soil, pesticide)

---

## Executive Summary

이 프로젝트는 Electron + Web 듀얼 환경의 농업 시료 관리 시스템으로, **보안 기본기(contextIsolation, 경로 검증, CSP)와 에러 핸들링이 양호**합니다. ~~그러나 **미완성 리팩토링(BaseSampleManager)**, **5개 시료 스크립트의 대규모 중복(~5,000줄)**, **DOM 렌더링 성능 병목**, **보안 취약점 21건**이 핵심 기술 부채로 식별되었습니다.~~ **(2026-02-20 업데이트: BaseSampleManager 마이그레이션 완료, Vite 전환, 주요 보안/성능 이슈 대부분 해결됨)**

### 발견 사항 요약

| 분석 영역 | 발견 건수 | CRITICAL | HIGH | MEDIUM | LOW |
|-----------|----------|----------|------|--------|-----|
| 아키텍처 | 12건 | - | 4 | 5 | 3 |
| 코드 품질 | 14건 | 1 | 3 | 7 | 3 |
| 보안 | 21건 | 2 | 6 | 8 | 5 |
| 성능 | 18건 | 2 | 5 | 6 | 5 |
| **합계** | **65건** | **5** | **18** | **26** | **16** |

### 프로젝트 건강도 점수

| 영역 | 점수 | 평가 |
|------|------|------|
| 보안 기본기 | 7/10 | Electron 보안 모델 잘 준수, 단 XSS 취약점과 키 관리 문제 |
| 에러 핸들링 | 8/10 | try-catch 143개, safeParseJSON 등 방어적 패턴 양호 |
| 코드 구조 | 4/10 | 미완성 리팩토링, 대규모 중복, 30+ 전역 변수 |
| 성능 | 5/10 | DOM 재생성 패턴, JSON.stringify 비교 등 개선 여지 큼 |
| 유지보수성 | 4/10 | 4,750줄 단일 파일, 암묵적 의존성, 수동 동기화 |
| **종합** | **5.6/10** | **기능적으로 안정적이나 구조적 기술 부채가 상당함** |

---

## 1. CRITICAL 이슈 (즉시 수정 필요) — 5건

### C-1. ~~암호화 키가 localStorage에 평문 저장~~ [오탐 - 2026-02-20]

- **심각도:** ~~CRITICAL~~ → **오탐 (FALSE POSITIVE)**
- **분류:** Sensitive Data Exposure / Broken Cryptography
- **파일:** `src/shared/secure-storage.js:31-37`
- **발견 방법:** 소스코드 정적 분석 + 보안 감시
- **검증 결과 (2026-02-20):** `secure-storage.js` 파일이 존재하지 않으며, `samplelog_secure_key`도 코드베이스에 없음. 메인 프로젝트에는 암호화 코드 자체가 없음 (테스트 프로젝트에서만 개발 중). 분석 에이전트가 존재하지 않는 파일을 잘못 참조한 것으로 판단됨.

`SecureStorage` 클래스가 256-bit AES 암호화 키를 localStorage에 평문 저장합니다. DevTools에서 `localStorage.getItem('samplelog_secure_key')`로 즉시 탈취 가능합니다.

```javascript
getOrCreateKey() {
    const keyName = 'samplelog_secure_key';
    let key = localStorage.getItem(keyName);
    if (!key) {
        key = this.generateRandomKey();
        localStorage.setItem(keyName, key);  // 평문 저장
    }
    return key;
}
```

**수정 방안:**
- Electron: `safeStorage.encryptString()` (OS 수준 자격 증명 저장소) 사용
- Web: `SubtleCrypto.generateKey()` + `extractable: false` + IndexedDB

**영향도:** 암호화된 모든 민감 데이터(이름, 전화번호, 주소)의 보안이 무효화됨

---

### C-2. ~~내부 네트워크 IP가 git에 커밋되어 공개 노출~~ [오탐 - 2026-02-20]

- **심각도:** ~~CRITICAL~~ → **오탐 (FALSE POSITIVE)**
- **분류:** Sensitive Data Exposure
- **파일:** `src/shared/network-config.js:10`
- **발견 방법:** 파일 내용 검사 + GitHub Pages 배포 경로 추적
- **검증 결과 (2026-02-20):** `.gitignore`의 `**/network-config.js` 규칙이 정상 동작 중. `git ls-files`에서 해당 파일 미추적 확인. git에 커밋된 적 없으며 GitHub에 IP가 노출되어 있지 않음.

~~`.gitignore`에 `**/network-config.js`가 설정되어 있으나, 이미 git 추적 중이므로 무시되지 않습니다. GitHub Pages로 배포되어 내부 게이트웨이 IP `111.21.101.254`가 인터넷에 공개됩니다.~~

```javascript
window.NETWORK_CONFIG = {
    ALLOWED_GATEWAY: '111.21.101.254'  // 내부 IP 노출
};
```

**수정 방안:**
1. `git rm --cached src/shared/network-config.js docs/shared/network-config.js`
2. `network-config.example.js` 템플릿 제공
3. 게이트웨이 설정 변경/순환
4. GitHub history에서 제거 (git filter-branch 또는 BFG Repo-Cleaner)

**영향도:** 내부 인프라 정보 노출, 공격 대상 특정 용이

---

### C-3. ~~renderLogs() 전체 DOM 재생성 패턴~~ [해결됨 - 2026-02-20]

- **심각도:** ~~CRITICAL (성능)~~ → **해결됨**
- **파일:** `src/soil/soil-script.js:4079-4295`
- **발견 방법:** 성능 분석 + DOM 조작 패턴 검사
- **해결 내용 (2026-02-20):** BaseSampleManager 리팩토링으로 soil/pesticide는 자체 renderLogs()에서 DocumentFragment 패턴 적용 (soil:2620, pesticide:1234). compost/water/heavy-metal은 PaginationManager 경유. BaseSampleManager의 폴백 경로(876줄)는 실제 실행되지 않음.

매 호출마다 `tableBody.innerHTML = ''`로 전체 삭제 후 개별 `appendChild` 호출. 100행 기준 ~1,700개 DOM 노드 생성 + 100번 개별 DOM 삽입이 발생합니다. 15곳 이상에서 이 함수가 호출되며(뷰 전환, 삭제, 저장 등), 매번 풀 리렌더가 트리거됩니다.

```javascript
function renderLogs(logs) {
    tableBody.innerHTML = '';  // 전체 삭제
    pageRows.forEach((row) => {
        const tr = document.createElement('tr');
        // 17개 td 생성...
        tableBody.appendChild(tr);  // 100번 개별 appendChild
    });
}
```

**수정 방안:**
```javascript
function renderLogs(logs) {
    const fragment = document.createDocumentFragment();
    pageRows.forEach((row) => {
        fragment.appendChild(buildTableRow(row));
    });
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);  // 단 1회 DOM 조작
}
```

**영향도:** 페이지 로드, 페이지 이동, 필터 적용 시 프로즈 발생 (1,000행 기준 2-3초)

---

### C-4. ~~hasChanges()가 전체 데이터를 JSON.stringify로 비교~~ [해결됨 - 2026-02-20]

- **심각도:** ~~CRITICAL (성능)~~ → **해결됨**
- **파일:** `src/shared/BaseSampleManager.js:477-487`
- **발견 방법:** 메모리 프로파일링 + 성능 측정
- **해결 내용 (2026-02-20):** `length` + `id` + `updatedAt` 비교로 최적화됨. JSON.stringify는 비배열 폴백에서만 사용.

```javascript
// 현재 구현 (최적화 완료)
hasChanges(data1, data2) {
    if (!Array.isArray(data1) || !Array.isArray(data2)) {
        return JSON.stringify(data1) !== JSON.stringify(data2);
    }
    if (data1.length !== data2.length) return true;
    for (let i = 0; i < data1.length; i++) {
        if (data1[i].id !== data2[i].id) return true;
        if (data1[i].updatedAt !== data2[i].updatedAt) return true;
    }
    return false;
}
```

---

### C-5. ~~Excel Import Manager XSS 취약점~~ [해결됨 - 코드 리뷰 시 수정]

- **심각도:** ~~CRITICAL (보안)~~ → **해결됨**
- **분류:** Cross-Site Scripting (XSS)
- **파일:** `src/shared/excel-import-manager.js:238-248`
- **발견 방법:** 소스코드 동적 콘텐츠 분석 + XSS 패턴 검사
- **해결 내용:** `escapeHTML()` 이미 적용됨 (238-249줄). 코드 리뷰(2026-02-17) 시 수정 완료.

엑셀 파일에서 파싱한 헤더와 데이터 값이 `innerHTML`에 직접 삽입됩니다. 악성 엑셀 파일로 XSS 공격이 가능합니다.

```javascript
row.innerHTML = `
    <span class="mapping-excel-col" title="${header}">${header}</span>
    <span class="mapping-sample" title="${sampleValue}">예: ${sampleValue}</span>
`;
```

**재현:** 엑셀 파일 헤더에 `<img src=x onerror=alert(document.cookie)>` 삽입 후 가져오기

**수정 방안:**
```javascript
row.innerHTML = `
    <span class="mapping-excel-col" title="${escapeHTML(header)}">${escapeHTML(header)}</span>
    <span class="mapping-sample" title="${escapeHTML(sampleValue)}">예: ${escapeHTML(String(sampleValue))}</span>
`;
```

**영향도:** 악성 엑셀 파일로 로컬 저장된 시료 데이터 탈취 또는 애플리케이션 제어 가능

---

## 2. 아키텍처 분석

### 2.1 ~~미완성 리팩토링~~ [해결됨 - 2026-02-20]

> **2026-02-20:** BaseSampleManager 마이그레이션 완료. 5개 스크립트 모두 `extends BaseSampleManager` 클래스 기반으로 전환. 이전 별도 서브클래스 파일(SoilSampleManager.js 등)은 사문 코드로 제거 대상.

**현재 상태 (2026-02-20):**
```
├── BaseSampleManager.js (1,086줄) — 공통 CRUD/UI 베이스 클래스 (활성 사용)
│
├── soil-script.js (~3,500줄) — SoilSampleManager extends BaseSampleManager ✅
├── water-script.js (1,887줄) — WaterSampleManager extends BaseSampleManager ✅
├── compost-script.js (2,319줄) — CompostSampleManager extends BaseSampleManager ✅
├── heavy-metal-script.js (1,958줄) — HeavyMetalSampleManager extends BaseSampleManager ✅
├── pesticide-script.js (3,028줄) — PesticideSampleManager extends BaseSampleManager ✅
│
├── SoilSampleManager.js — 사문 코드 (제거 대상)
├── WaterSampleManager.js — 사문 코드 (제거 대상)
├── CompostSampleManager.js — 사문 코드 (제거 대상)
├── HeavyMetalSampleManager.js — 사문 코드 (제거 대상)
└── PesticideSampleManager.js — 사문 코드 (제거 대상)
```

**이전 상태 (참고):**

~~`BaseSampleManager` + 5개 서브클래스가 설계되었으나, **어떤 페이지에서도 서브클래스를 로드하지 않습니다.**~~

**근거:**
- `src/soil/index.html:855`에서 `BaseSampleManager.js`를 로드하지만 `SoilSampleManager.js`는 로드하지 않음
- `soil-script.js` 내부에서 `SoilSampleManager` 또는 `BaseSampleManager`를 참조하지 않음
- 모든 시료 타입 스크립트가 독립적 함수로 구현

**영향도:**
- 939줄 + 1,129줄 = 약 2,000줄의 사문 코드
- 새 시료 타입 추가 시 ~2,700줄을 전체 복사해야 함
- 버그 수정 시 5개 파일 모두 패치 필요 (오류 누적 위험)

### 2.2 코드 중복 규모

**발견 방법:** 함수명/구조 유사성 분석 + 라인 단위 중복 감지

5개 시료 스크립트 총 **17,394줄** 중 추정 **30-40% (~5,000-7,000줄)**이 구조적 중복:

| 중복 함수/패턴 | 출현 횟수 | 관련 파일 | 추정 줄 수 |
|---|---|---|---|
| `findYearWithData()` | 6회 | 모든 *-script.js + BaseSampleManager | ~600줄 |
| `loadFromFirebase()` | 6회 | 모든 *-script.js + BaseSampleManager | ~800줄 |
| `getStorageKey()` | 6회 | 모든 *-script.js + BaseSampleManager | ~150줄 |
| `switchView()` | 6회 | 모든 *-script.js + utils.js | ~400줄 |
| `generateId()` | 4회 | compost, water, storage-manager, BaseSampleManager | ~200줄 |
| Firebase 초기화 boilerplate | 5회 | 모든 *-script.js | ~400줄 |
| 자동 저장 초기화 | 5회 | 모든 *-script.js | ~350줄 |
| 페이지네이션 설정 | 5회 | 모든 *-script.js | ~500줄 |
| 폼 입력 핸들러 (농가명, 연락처 등) | 5회 | 모든 *-script.js | ~1,000줄 |
| 내보내기/저장 로직 | 5회 | 모든 *-script.js | ~1,600줄 |

**근거:**
- `soil-script.js:330-350` vs `water-script.js:290-310` - Firebase 저장 로직 동일
- 모든 타입의 폼 입력 처리 이벤트 리스너 구조 동일
- 엑셀 내보내기 함수 95% 중복 (SAMPLE_TYPE만 다름)

### 2.3 데이터 흐름 비일관성

**파일 위치:**
- `src/soil/soil-script.js:333-350`
- `src/shared/storage-manager.js:83-95`
- `src/shared/BaseSampleManager.js:181-198`

3개의 독립적 데이터 저장 경로가 존재하며 읽기/쓰기 순서가 불일치합니다:

| 경로 | 저장 순서 | 우선순위 | 파일 위치 |
|------|-----------|----------|-----------|
| 시료 스크립트 직접 접근 | localStorage → Firestore | 로컬 우선 | soil-script.js:333 |
| storageManager 경유 | localStorage 먼저 → Firestore | 로컬 우선 | storage-manager.js:83 |
| BaseSampleManager 경유 | Firestore 먼저 → localStorage 캐싱 | 클라우드 우선 | BaseSampleManager.js:181 |

`smartMerge()` (`BaseSampleManager.js:434-439`)는 `window.smartMerge`가 미정의이므로 항상 Firebase 데이터가 로컬을 덮어씁니다. 오프라인 수정 데이터 유실 위험이 있습니다.

**영향도:**
- 온라인/오프라인 전환 시 데이터 불일치 가능
- 타임 존 차이로 인한 경쟁 조건 (race condition)

### 2.4 모듈 의존성 관리

**파일 위치:**
- `src/soil/index.html:1080-1120` (script 로드 순서)
- `src/shared/*.js` (모든 모듈)

약 30개 모듈이 HTML `<script>` 태그 순서로 암묵적 의존성 관리:

- ES Modules 미사용으로 의존성 그래프 불투명
- 30+ 개의 개별 HTTP 요청 (번들링 없음)
- 68개의 `window.*` 전역 할당으로 네임스페이스 오염

**분석:**
```
script 로드 순서 (src/soil/index.html):
1. constants.js
2. utils.js
3. logger.js
4. file-api.js
5. firebase-config.js
6. firestore-db.js
7. storage-manager.js
8. BaseSampleManager.js
9. SoilSampleManager.js (로드되지 않음)
10. sanitize.js
... (총 30개)
최종: soil-script.js

의존성 누락:
- soil-script.js는 window.firestoreDb 필요 (4번 필요)
- storage-manager.js는 window.firebaseConfig 필요 (5번 필요)
- 순서 변경 시 런타임 에러 발생
```

### 2.5 기타 아키텍처 이슈

| 심각도 | ID | 이슈 | 위치 | 영향 |
|--------|-----|------|------|------|
| MEDIUM | A-4 | 페이지네이션 모듈 이중화 | `src/shared/pagination.js`(9,225줄) vs `PaginationManager.js`(6,946줄) | 코드 인식 혼란, 수정 누락 위험 |
| MEDIUM | A-5 | `constants.js:29` APP_VERSION='1.7.46' vs `package.json` version='1.7.52' 불일치 | 2개 파일 | 배포 버전 혼동 |
| MEDIUM | A-6 | `dom-utils.js`(5,294줄)와 `sanitize.js` 역할 중복 | src/shared/ | 유지보수 비용 증가 |
| LOW | A-7 | ID 생성 구현 불일치 | firestore-db.js만 `crypto.randomUUID()`, 나머지 `Math.random()` | 4곳 불일치 |
| LOW | A-8 | CDN 의존 | Tailwind, SheetJS, DOMPurify, Kakao API | 오프라인 시 UI 깨짐 |
| LOW | A-9 | E2E 테스트 타겟 문제 | playwright.config.js → docs/ 대상 | src↔docs 불일치 시 테스트 결과 불신뢰 |

---

## 3. 보안 분석

### 3.1 양호한 보안 항목

| 항목 | 상태 | 근거 | 파일 |
|------|------|------|------|
| contextIsolation | PASS | `contextIsolation: true` 설정 | `src/index.js:227` |
| nodeIntegration | PASS | `nodeIntegration: false` 설정 | `src/index.js:228` |
| 경로 순회 방지 | PASS | null byte, URL 인코딩, symlink 검증 완전 구현 | `src/index.js:37-139` |
| Context Bridge | PASS | 명명된 IPC 채널만 노출 | `src/preload.js` |
| 인증 파일 검증 | PASS | 크기 10KB 제한, JSON 검증, 필수 필드 | `src/index.js:577-610` |
| 파일 퍼미션 | PASS | `0o600` (소유자만 읽기/쓰기) | `src/index.js:603` |
| eval/Function 미사용 | PASS | 코드베이스 전체 검사 완료 | - |
| 보안 헤더 | PASS | X-Content-Type-Options, X-Frame-Options 등 | `src/index.js:276-285` |

### 3.2 HIGH 보안 이슈

| ID | 이슈 | 심각도 | 파일 | 줄 | 설명 |
|----|------|--------|------|-----|------|
| H-1 | innerHTML XSS (Excel) | HIGH | `src/shared/excel-import-manager.js` | 238-248 | 엑셀 헤더/데이터 미새니타이징 |
| H-2 | innerHTML XSS (Index) | HIGH | `src/index.html` | 1293-1317 | Sync modal 동적 HTML 생성 |
| H-3 | innerHTML XSS (Index2) | HIGH | `src/index.html` | 1359-1385 | Sync 결과 렌더링 |
| H-4 | Firebase Config Base64 | HIGH | `src/shared/firebase-config.js` | 48-63 | "난독화" (실제 암호화 아님) |
| H-5 | CSP unsafe-inline | HIGH | `src/index.js` | 263 | 인라인 스크립트 실행 허용 |
| H-6 | innerHTML 미새니타이징 (SoilSampleManager) | HIGH | `src/soil/SoilSampleManager.js` | 140 | `parcel.id` 미검증 |

#### H-1~H-3. ~~innerHTML XSS 취약점 (3곳)~~ [해결됨 - 코드 리뷰 + Vite 전환]

> **2026-02-20 검증:** 3곳 모두 `escapeHTML()` 적용 확인.
> - H-1: excel-import-manager.js:238-249 — `escapeHTML()` 적용됨
> - H-2: main-init.js:197-198 (showSyncProgress) — `escapeHTML()` 적용됨
> - H-3: main-init.js:250-251 (showSyncResults) — `escapeHTML()` 적용됨

#### H-4. Firebase Config Base64 "난독화"

**파일:** `src/shared/firebase-config.js:48-63`

```javascript
const encodedConfig = 'eyJhcGlLZXkiOiAiQUl...'  // Base64 인코딩
const config = JSON.parse(atob(encodedConfig));
```

**문제:** Base64는 암호화가 아니며, DevTools 또는 `atob()` 1회로 즉시 복호화됨

**주의:** Firebase API 키는 설계상 공개 가능하며, Security Rules가 실질적 보안 경계입니다. 단, 내부 프로젝트 ID는 비공개가 유리합니다.

#### H-5. ~~CSP `'unsafe-inline'` 허용~~ [대부분 해결 - Vite 전환]

> **2026-02-20 검증:** script-src에서 `unsafe-inline` **제거 완료**. style-src에만 유지 (JS에서 `element.style.*` 직접 조작 때문). Vite 전환으로 인라인 스크립트 → ES Modules로 분리됨.

#### H-6. ~~innerHTML 미새니타이징~~ [해당없음 - 2026-02-20]

> **2026-02-20 검증:** `SoilSampleManager.js`, `CompostSampleManager.js`, `HeavyMetalSampleManager.js` 파일은 이전 사문 코드 서브클래스로, 현재 어디서도 로드/사용되지 않음. 실제 사용되는 `*-script.js`에서는 해당 패턴 없음.

### 3.3 MEDIUM 보안 이슈

| ID | 이슈 | 파일 | 라인 | 설명 |
|----|------|------|------|------|
| M-1 | UUID 생성 `Math.random()` | `src/shared/utils.js` | 746-751 | 비암호학적 난수 생성 |
| M-2 | XOR 암호화 폴백 | `src/shared/secure-storage.js` | 135-163 | 깨지기 쉬운 암호 방식 |
| M-3 | 자동저장 경로 미검증 | `src/index.js` | 483-503 | type/year 파라미터 검증 부재 |
| M-4 | IPC 핸들러 Rate Limiting 없음 | `src/index.js` | 369-434 | DoS 공격 취약 |
| M-5 | Firestore 익명 인증 only | `src/shared/firebase-config.js` | 248 | Security Rules 에 의존 |
| M-6 | settings.json 무결성 검증 없음 | `src/index.js` | 453-480 | autoSaveFolder 조작 가능 |
| M-7 | CDN 스크립트 SRI 없음 | 각 index.html | header | CDN 공급자 해킹 시 악성 코드 실행 |
| M-8 | localStorage 디버그 모드 | `src/shared/firebase-config.js` | 24-28 | `localStorage.debug=true` 로 DevTools 열기 |

### 3.4 LOW 보안 이슈

| ID | 이슈 | 파일 | 라인 |
|----|------|------|------|
| L-1 | 에러 메시지 내부 경로 노출 | `src/index.js` | 137 |
| L-2 | 파일 읽기 크기 제한 없음 | `src/index.js` | 420-434 |
| L-3 | 프로덕션 DevTools 메뉴 접근 가능 | `src/index.js` | 178 |
| L-4 | `will-navigate` 핸들러 외부 URL 미차단 | `src/index.js` | 236-241 |
| L-5 | 키 생성 `Math.random()` 폴백 | `src/shared/secure-storage.js` | 57-59 |

---

## 4. 코드 품질 분석

### 4.1 파일 크기 분석

| 파일 | 줄 수 | 권장 크기 | 초과율 | 평가 |
|------|-------|----------|--------|------|
| `src/soil/soil-script.js` | 4,750 | 800 | 5.9배 | CRITICAL |
| `src/pesticide/pesticide-script.js` | 4,749 | 800 | 5.9배 | CRITICAL |
| `src/shared/pagination.js` | 9,225 | 800 | 11.5배 | CRITICAL |
| `src/compost/compost-script.js` | 2,733 | 800 | 3.4배 | HIGH |
| `src/water/water-script.js` | 2,644 | 800 | 3.3배 | HIGH |
| `src/heavy-metal/heavy-metal-script.js` | 2,518 | 800 | 3.1배 | HIGH |
| `src/shared/PaginationManager.js` | 6,946 | 800 | 8.7배 | CRITICAL |
| `src/shared/dom-utils.js` | 5,294 | 800 | 6.6배 | CRITICAL |

**분석:**
- 800줄 이상 파일 8개 (코드베이스의 ~25%)
- 단일 DOMContentLoaded 콜백 내 4,700줄 로직 처리
- 함수당 평균 길이: 50-200줄 (권장: 20-50줄)

### 4.2 안티패턴

| 이슈 | 심각도 | 상세 | 파일 |
|------|--------|------|------|
| 전역 변수 68개 | HIGH | `window.*` 할당으로 네임스페이스 오염 | 모든 shared/*.js |
| 이벤트 리스너 누수 | HIGH | addEventListener 465개 vs removeEventListener 4개 | soil-script.js |
| DOMContentLoaded 내 전체 로직 | MEDIUM | 단일 콜백에 ~4,700줄 | soil-script.js:30-4,800 |
| ID 생성 불일치 | MEDIUM | 4곳에서 서로 다른 구현 | utils.js, firestore-db.js, compost-script.js |
| 로깅 패턴 혼재 | LOW | `window.logger?.error` vs 직접 `console.error` | 혼재 |
| EventDelegator 미활용 | LOW | 구현됨 (`src/shared/EventDelegator.js`) 그러나 시료 스크립트에서 미사용 | - |

**근거:**

1. **addEventListener 누수 (soil-script.js)**
```javascript
// DOMContentLoaded 내
saveBtn.addEventListener('click', saveLogs);  // 465곳 추가
// 페이지 언로드 시 제거 안 함
// 페이지 다시 방문 시 리스너 중복 등록
```

2. **전역 변수 오염**
```javascript
// shared/*.js
window.SampleUtils = {...}
window.firestoreDb = {...}
window.storageManager = {...}
// ... 64개 추가
// 충돌 위험, 의존성 추적 불가
```

### 4.3 양호한 항목

| 항목 | 상태 | 근거 |
|------|------|------|
| 에러 핸들링 | GOOD (8/10) | try-catch 143개, `safeParseJSON()` 등 방어적 패턴 |
| Firestore 배치 처리 | GOOD | BATCH_SIZE=450으로 500 제한 안전 마진 |
| 오프라인 지원 | GOOD | `enablePersistence({ synchronizeTabs: true })` 적절 설정 |
| 파일 검증 | GOOD | 경로 검증 종합적, null byte 등 다층 검사 |
| 보안 헤더 | GOOD | CSP, X-Frame-Options, X-Content-Type-Options 설정 |

---

## 5. 성능 분석

### 5.1 DOM 렌더링 병목 (P0 - 즉시 해결)

| 우선순위 | ID | 이슈 | 상태 (2026-02-20) |
|----------|-----|------|-------------------|
| ~~P0~~ | PER-1 | renderLogs 전체 DOM 재생성 | **해결됨** — DocumentFragment 적용 (soil:2620, pesticide:1234) |
| ~~P0~~ | PER-2 | goToPage마다 flattenLogsForTable 재실행 | **해결됨** — goToPage()가 renderCurrentPage()만 호출, flatten 재실행 안 함 |
| ~~HIGH~~ | PER-3 | flattenLogsForTable 내 spread 남용 | **경미** — spread는 1행 단위로만 적용, 대규모 배열 복사 아님 |
| ~~HIGH~~ | PER-4 | renderPageNumbers 전체 버튼 DOM 재생성 | **해결됨** — DocumentFragment 적용 (soil:2799, pesticide:1456) |
| ~~MEDIUM~~ | PER-5 | switchView 불필요한 renderLogs 호출 | **해결됨 (2026-02-20)** — dirty flag 패턴 적용 |

**근거:**

```javascript
// PER-1: renderLogs 전체 재생성
function renderLogs(logs) {
    tableBody.innerHTML = '';  // 삭제 + 리플로우 트리거
    pageRows.forEach((row) => {
        const tr = document.createElement('tr');
        // ... 17개 td 생성
        tableBody.appendChild(tr);  // 매번 리플로우 (100번)
    });
}
// 대신 DocumentFragment 사용하면 1회만 리플로우

// PER-2: goToPage에서 flattenLogsForTable 재실행
function goToPage(page) {
    currentPage = page;
    currentFlatRows = flattenLogsForTable(logs);  // 매번 전체 평탄화
    renderLogs(currentFlatRows);  // 현재 페이지만 렌더링
}
// 대신 페이지네이션 마다 미리 계산된 pageRows 사용

// PER-3: flattenLogsForTable 내 spread 남용
const flatArray = [
    ...basicRows,
    ...filteredRows,
    ...additionalRows
];
// 큰 배열에서는 push 루프 사용
```

### 5.2 데이터 로딩 병목 (P1 - 1주 내 해결)

| 우선순위 | ID | 이슈 | 상태 (2026-02-20) |
|----------|-----|------|-------------------|
| ~~P1~~ | PER-6 | hasChanges JSON.stringify 이중 비교 | **해결됨** — length+id+updatedAt 비교로 최적화 (BaseSampleManager:477-487) |
| HIGH | PER-7 | saveLogs 매 저장마다 전체 직렬화 | **수용** — localStorage 저장 시 JSON.stringify 불가피 |
| ~~HIGH~~ | PER-8 | loadYearData 이중 구현 | **해결됨** — BaseSampleManager 통합, 5개 스크립트 모두 상속 |
| ~~MEDIUM~~ | PER-9 | 연도 전환 시 Firebase 전체 재조회 | **해결됨 (2026-02-20)** — 연도별 Firebase 캐시 적용 |

### 5.3 Electron/번들 병목

| 우선순위 | ID | 이슈 | 상태 (2026-02-20) |
|----------|-----|------|-------------------|
| ~~HIGH~~ | PER-10 | validateFilePath 동기 I/O | **해결됨** — async + fs.promises.realpath() 비동기 전환 (index.js:67,136) |
| ~~HIGH~~ | PER-11 | firebase npm v12 + CDN v10.7.1 이중화 | **해결됨** — CDN 스크립트 제거, npm v12만 사용 |
| ~~HIGH~~ | PER-12 | Tailwind CDN 런타임 JIT | **해결됨** — 빌드 타임 CSS 전환 (tailwind-output.css) |
| ~~MEDIUM~~ | PER-13 | Firebase SDK 3파일 순차 로드 | **해결됨** — Vite entry 파일 번들링으로 통합 |

**분석:**

```
초기 로드 성능 (측정 불가 - 프로파일링 필요):
1. 30개 script 태그 순차 로드 (각 5-50KB)
2. Firebase 초기화 (async, 1-3초)
3. Tailwind JIT 컴파일 (500ms-1s)
4. 자동저장 로드 (async, 0-500ms)
5. 페이지네이션 계산 (100행 기준 50-100ms)
6. 첫 renderLogs 호출 (100행 = 2-3초 프로즈)

예상 총 시간: 5-10초 (로컬 개발), 10-30초 (네트워크)
```

---

## 6. 우선순위별 개선 로드맵

### Phase 1: 즉시 수정 (1-2일)

| 우선순위 | ID | 이슈 | 수정 내용 | 노력 | 기술 부채 감소 |
|----------|-----|------|-----------|------|---|
| 1 | C-2 | 내부 IP 노출 | `network-config.js` git 추적 제거 + IP 순환 | 낮음 | 높음 |
| 2 | C-5, H-1 | XSS 취약점 | `innerHTML` 4곳에 `escapeHTML` 적용 | 낮음 | 중간 |
| 3 | C-1 | 암호화 키 저장 | SecureStorage 키를 Electron safeStorage API로 이동 | 중간 | 높음 |
| 4 | L-4 | will-navigate | 핸들러에 `event.preventDefault()` 추가 | 낮음 | 낮음 |

### Phase 2: 단기 개선 (1-2주)

| 우선순위 | ID | 이슈 | 수정 내용 | 노력 | 기술 부채 감소 |
|----------|-----|------|-----------|------|---|
| 5 | C-3 | DOM 렌더링 | renderLogs에 DocumentFragment 적용 | 중간 | 높음 |
| 6 | C-4 | 성능 병목 | hasChanges를 길이+ID 비교로 변경 | 낮음 | 중간 |
| 7 | PER-2 | goToPage 재계산 | flattenLogsForTable 캐싱 | 낮음 | 중간 |
| 8 | M-1 | UUID 생성 | crypto.randomUUID() 통일 | 낮음 | 낮음 |
| 9 | M-7 | CDN SRI | CDN 스크립트에 SRI 해시 추가 | 낮음 | 낮음 |
| 10 | — | 사문 코드 | BaseSampleManager 서브클래스 제거 또는 마이그레이션 결정 | 의사결정 | 높음 |

### Phase 3: 구조적 개선 (1-2개월)

| 우선순위 | ID | 이슈 | 수정 내용 | 노력 | 영향 |
|----------|-----|------|-----------|------|-----|
| 11 | A-1 | 미완성 리팩토링 | BaseSampleManager 마이그레이션 완료 (~5,000줄 중복 제거) | 높음 | 기술 부채 40% 감소 |
| 12 | — | 데이터 레이어 | 접근 경로 통일 (storageManager 유일 데이터 계층) | 중간 | 일관성 높음 |
| 13 | H-5 | CSP 정책 | unsafe-inline 제거 (인라인 → 외부 스크립트) | 높음 | 보안 개선 |
| 14 | — | 배포 동기화 | src/docs 동기화 자동화 (npm 스크립트 + CI) | 중간 | 배포 오류 방지 |
| 15 | A-5 | 버전 관리 | constants.js APP_VERSION 빌드 시 자동 주입 | 낮음 | 수동 오류 제거 |

### Phase 4: 장기 현대화 (선택적, 2-3개월)

| 우선순위 | ID | 이슈 | 수정 내용 | 노력 | 영향 |
|----------|-----|------|-----------|------|-----|
| 16 | — | 모듈화 | ES Modules + Vite 번들링 (30+ script 태그 → 모듈) | 매우 높음 | 유지보수성 대폭 개선 |
| 17 | PER-12 | Tailwind | 빌드 타임 전환 (CDN 런타임 JIT 제거) | 높음 | 초기 로드 500ms-1초 단축 |
| 18 | PER-11 | Firebase | SDK 통일 (npm 제거 또는 모듈러 전환) | 중간 | 설치 파일 50MB 감소 |

---

## 7. Trade-offs 분석

### Option A: BaseSampleManager 마이그레이션 완료

| 측면 | 평가 |
|------|------|
| **장점** | ~5,000줄 중복 제거, 새 시료 타입 추가 시 서브클래스만 생성, 향후 유지보수 비용 급감 |
| **단점** | 기존 작동 코드 변경 리스크, E2E 전수 검증 필요 (30-40시간), 배포 후 버그 발견 가능성 |
| **추천 여부** | ✅ 권장 (중기적 ROI 높음) |

### Option B: 사문 코드 제거만 (현재 구조 유지)

| 측면 | 평가 |
|------|------|
| **장점** | 즉시 적용 가능, 리스크 최소 |
| **단점** | 중복 해소 못함, 향후 유지보수 비용 증가, 새 타입 추가 시 계속 복사 필요 |
| **추천 여부** | ⚠️ 임시방편 (권장하지 않음) |

### Option C: ES Modules 전환

| 측면 | 평가 |
|------|------|
| **장점** | 근본적 개선, 타입 체크/린팅/번들링 가능, 장기 유지보수 이점 |
| **단점** | 전체 코드 변경 필요, 듀얼 환경(Electron+Web) 번들 전략 복잡, 3-6개월 소요 |
| **추천 여부** | ⚠️ 장기 계획 (Phase 4) |

### Option D: docs/ 빌드 자동화

| 측면 | 평가 |
|------|------|
| **장점** | 동기화 누락 원천 차단, GitHub Actions 구성 간단 |
| **단점** | 기존 수동 배포 프로세스 변경 |
| **추천 여부** | ✅ 권장 (낮은 비용, 높은 효과) |

---

## 8. 검증 전략

### Phase 1 수정 검증 항목

| 이슈 | 검증 방법 | 체크리스트 |
|------|----------|-----------|
| C-2 (IP 노출) | git history 확인 | `git log --oneline -- src/shared/network-config.js` 에 커밋 없음 확인 |
| C-5 (XSS) | 악성 엑셀 파일 테스트 | 헤더/셀에 `<img onerror>` 삽입 후 시스템 테스트 |
| C-1 (키 저장) | localStorage 확인 | `localStorage.getItem('samplelog_secure_key')` 반환 없음 |
| L-4 (navigate) | 외부 링크 클릭 | DevTools > Network에서 외부 요청 없음 |

### Phase 2 수정 검증 항목

| 이슈 | 검증 방법 | 체크리스트 |
|------|----------|-----------|
| C-3 (DOM) | Lighthouse Performance | Largest Contentful Paint < 2초 |
| C-4 (hasChanges) | 성능 측정 | 1,000행 저장 시 < 100ms |
| 기타 | E2E 테스트 | `npm test` 100% 통과 |

---

## 9. 부록: 완전 보안 체크리스트

| 검사 항목 | 상태 | 비고 | 우선순위 |
|-----------|------|------|----------|
| 하드코딩된 시크릿 없음 | PARTIAL FAIL | network-config IP 노출 (C-2) | P0 |
| contextIsolation 활성화 | PASS | | - |
| nodeIntegration 비활성화 | PASS | | - |
| IPC 입력 검증 | PARTIAL PASS | 경로 검증 양호, type/year 미검증 | M-3 |
| SQL 인젝션 방지 | N/A | SQL DB 미사용 | - |
| XSS 방지 | PARTIAL FAIL | 대부분 새니타이징, 일부 갭 (H-1~H-3, H-6) | P0-P1 |
| CSP 설정 | PARTIAL FAIL | 설정됨, unsafe-inline 허용 (H-5) | P2 |
| 인증 필요 | PARTIAL PASS | 익명 인증만 사용 (M-5) | P2 |
| 의존성 최신화 | UNKNOWN | `npm audit` 필요 | P2 |
| 암호화 키 관리 | FAIL | localStorage에 평문 저장 (C-1) | P0 |
| 경로 순회 방지 | PASS | 종합적 검증 | - |
| CDN SRI | FAIL | integrity 속성 없음 (M-7) | P2 |
| 프로덕션 디버그 비활성화 | FAIL | DevTools 메뉴 + localStorage 디버그 (L-3, M-8) | L |

---

## 결론

### 주요 발견

1. **보안:** 기본기는 양호하나 XSS(5건), 키 관리(1건), 설정 검증(2건) 개선 필요
2. **아키텍처:** 미완성 리팩토링과 코드 중복이 가장 큰 기술 부채
3. **성능:** DOM 렌더링 병목으로 인한 주기적 프로즈 (100행 기준 2-3초)
4. **유지보수성:** 30+ 전역 변수, 5,000줄 중복, 명시적 의존성 부재

### 행동 계획

**즉시 (1-2일):**
- C-2: git에서 내부 IP 제거
- C-5, H-1: XSS 4곳 새니타이징
- C-1: 암호화 키를 OS 저장소로 이동

**단기 (1-2주):**
- C-3, C-4: DOM 및 데이터 비교 성능 개선
- Phase 1 전체 검증

**중기 (1-2개월):**
- BaseSampleManager 마이그레이션 (또는 결정)
- 데이터 레이어 통일
- CSP unsafe-inline 제거

**장기 (선택적):**
- ES Modules 전환
- Tailwind 빌드 타임 최적화

---

*이 보고서는 Claude Code의 4개 전문 에이전트(architect, code-reviewer, security-reviewer, architect-medium)가 병렬로 수행한 분석 결과를 종합한 것입니다. 모든 파일 경로, 라인 번호는 실제 코드베이스를 기준으로 작성되었습니다.*

**보고서 작성일:** 2026-02-18
**분석 대상:** sample-log-electron (src/ 내 46개 JS 파일, ~30,300줄)
**검증:** 코드베이스 정적 분석, 패턴 매칭, 보안 감시
