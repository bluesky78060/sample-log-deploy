# 코드 리뷰 이슈 태스크 (2026-02-17)

## 개요
- **리뷰 대상**: 5개 시료 스크립트 + shared 모듈 + settings + index.html
- **발견 이슈**: CRITICAL 2, HIGH 7, MEDIUM 7, LOW 3 (총 19건)
- **수정 완료**: CRITICAL 2, HIGH 6, MEDIUM 4 (총 12건)
- **미해결**: HIGH 1, MEDIUM 3, LOW 3 (총 7건 - 장기 과제)

---

## CRITICAL (2건) - ✅ 전체 수정 완료

### C-1. ✅ pesticide `moduleKey` 불일치 → 자동저장 깨짐
- **파일**: `src/pesticide/pesticide-script.js`
- **문제**: `SAMPLE_TYPE = '잔류농약'`을 `moduleKey`로 사용 → localStorage 키 불일치
- **수정**: `moduleKey: SAMPLE_TYPE` → `moduleKey: 'pesticide'` (6곳 일괄 수정)

### C-2. ✅ heavy-metal `id`가 숫자형 → Firestore 동기화 오류
- **파일**: `src/heavy-metal/heavy-metal-script.js`
- **문제**: `id: Date.now()` (number) — 다른 4개 스크립트는 문자열 ID
- **수정**: `Date.now().toString(36) + Math.random().toString(36).substring(2, 11)` 적용

---

## HIGH (7건) - 6건 수정 완료, 1건 보류

### H-1. ✅ soil `moduleKey` 2곳 불일치
- **파일**: `src/soil/soil-script.js` L406, L473
- **수정**: `moduleKey: SAMPLE_TYPE` → `moduleKey: 'soil'` (2곳)

### H-2. ✅ compost 배지 렌더링 XSS 취약점
- **파일**: `src/compost/compost-script.js`
- **수정**: `getSampleTypeBadge()`/`getAnimalTypeBadge()` 내 `escapeHTML(type)` 적용

### H-3. ✅ settings `JSON.parse` try/catch 없음
- **파일**: `src/settings/index.html`
- **수정**: `loadSavedConfig()`에 try/catch 래핑 + 손상 데이터 자동 제거
- **추가(2차)**: `renderMigrationList()`/내보내기 핸들러의 `JSON.parse` 2곳에도 try/catch 추가

### H-4. ✅ `window.logger` 옵셔널 체이닝 없음
- **파일**: 5개 시료 스크립트 + index.html (총 63곳)
- **수정(1차)**: `window.logger.error/warn(...)` 52곳 → `(window.logger?.error || console.error)(...)` 일괄 변환
- **수정(2차)**: `window.logger.info(...)` 11곳 → `(window.logger?.info || console.info)(...)` 추가 변환

### H-5. ✅ settings `SETTINGS_FIREBASE_KEY` 오해 유발 주석
- **파일**: `src/settings/index.html` L682
- **수정**: 주석 정정 ("firebase-config.js의 FIREBASE_CONFIG_KEY와 동일 값")

### H-6. ⏳ soil `generateId` 함수 미정의
- **상태**: 보류 — soil은 saveLogs 내에서 인라인 ID 생성, 현재 정상 동작

### H-7. ✅ water `moduleKey: SAMPLE_TYPE` 1곳 → 자동저장 실패
- **파일**: `src/water/water-script.js` L351
- **문제**: `moduleKey: SAMPLE_TYPE`('물') → `물AutoSaveEnabled` 키 조회 → 항상 null → 자동저장 무조건 실패
- **수정(2차)**: `moduleKey: SAMPLE_TYPE` → `moduleKey: 'water'`

---

## MEDIUM (7건) - 4건 수정 완료, 3건 장기 과제

### M-1. ✅ water `console.log` 하드코딩
- **파일**: `src/water/water-script.js` L37-55
- **수정**: `console.log()` → `log()` 래퍼 전환 (5곳)

### M-2. ✅ `escapeHTML` 중복 정의
- **파일**: `src/shared/utils.js`
- **수정**: utils.js에서 `escapeHTML` 함수 + `HTML_ESCAPE_MAP` + `REGEX_HTML_ESCAPE` 상수 제거. `sanitize.js`의 구현만 유지

### M-3. ✅ heavy-metal `editingIndex` → `editingId` 리팩토링
- **파일**: `src/heavy-metal/heavy-metal-script.js`
- **수정**: `editingIndex` (배열 인덱스) → `editingId` (문자열 ID) + `sampleLogs.find()` 패턴

### M-4. ✅ compost `moduleKey: SAMPLE_TYPE` 일관성 통일
- **파일**: `src/compost/compost-script.js` L105, L279, L346
- **문제**: `SAMPLE_TYPE`이 현재 `'compost'`와 동일하여 동작은 정상이지만, 다른 스크립트와 일관성 없음
- **수정(2차)**: `moduleKey: SAMPLE_TYPE` → `moduleKey: 'compost'` (3곳)

### M-5. ⏳ water `saveLogs` 동기 함수
- **상태**: 보류 — fire-and-forget 패턴으로 현재 정상 동작

### M-6. ⏳ DOMPurify 로드 실패 시 UI 파괴
- **상태**: 보류 — CDN 로드 실패 시 대비 장기 과제 (로컬 번들링 검토)

### M-7. ⏳ soil 연도 변경 핸들러 await 누락 가능
- **상태**: 보류 — 확인 결과 현재 동작에 영향 없음

---

## LOW (3건) - 참고 (장기 과제)

| # | 이슈 | 비고 |
|---|------|------|
| L-1 | 스크립트 파일 크기 (soil/pesticide ~4,750줄) | BaseSampleManager 활용 시 해결 |
| L-2 | `firebaseReady` 변수 미사용 | 5개 전 스크립트 |
| L-3 | `BaseSampleManager` 클래스 미활용 | 장기 리팩토링 과제 |

---

## 수정 요약

| 심각도 | 발견 | 수정 | 보류 |
|--------|------|------|------|
| CRITICAL | 2 | 2 | 0 |
| HIGH | 7 | 6 | 1 |
| MEDIUM | 7 | 4 | 3 |
| LOW | 3 | 0 | 3 |
| **합계** | **19** | **12** | **7** |

## 수정 파일 목록

| 파일 | 수정 이슈 | docs 동기화 |
|------|-----------|-------------|
| `src/soil/soil-script.js` | H-1, H-4 | ✅ |
| `src/water/water-script.js` | H-4, H-7, M-1 | ✅ |
| `src/compost/compost-script.js` | H-2, H-4, M-4 | ✅ |
| `src/pesticide/pesticide-script.js` | C-1, H-4 | ✅ |
| `src/heavy-metal/heavy-metal-script.js` | C-2, H-4, M-3 | ✅ |
| `src/settings/index.html` | H-3, H-5 | ✅ |
| `src/shared/utils.js` | M-2 | ✅ |
| `src/index.html` | H-4 | ✅ |

## 작성 정보
- **작성일**: 2026-02-17
- **수정일**: 2026-02-17 (2차 검증 후 업데이트)
- **작성자**: Claude Opus 4.6
- **이전 리뷰**: 2026-02-14 (암호화 보안 이슈 12건 수정)
