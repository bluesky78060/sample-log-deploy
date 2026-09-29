# SAMPL-2-27 코드 리뷰 — 커밋 9ad0aec (landClass1·공익직불제 선행 작업)

- 대상: `git show 9ad0aec` (11파일, 989+/81-)
- 리뷰어: Claude Opus 5.5 (Orca 작업자, 단일 레인). **독립 리뷰(다른 모델 레인)는 코디네이터가 따로 돌린다** — 이 문서는 자기 승인이 아니다.
- 줄 번호는 이 브랜치의 수정 후 `src/soil/soil-script.ts` 기준이다.
- 9ad0aec 이후 커밋이 이미 고친 것: `addImportedRecord`의 성토 자동채번(SAMPL-1-124 적대적 검증, `soil-script.ts:903`). 이 리뷰에서 다시 세지 않는다.

## 핵심 관찰

9ad0aec는 접수번호를 **경지구분 1차별 독립 시퀀스**로 바꿨다. 그 전에는 한 연도 안에서 본번이
유일했으므로, 본번만으로 레코드를 묶던 기존 코드는 이 커밋 이후 **다른 경지구분의 같은 번호**를
같은 접수로 착각한다. 🟠 M-1이 그 결과다.

## 🟠 MAJOR

### M-1. 완료 연동이 경지구분을 보지 않아 다른 경지구분의 시료까지 완료 처리된다 — 수정함

- 위치: `src/soil/soil-script.ts:3841` (완료 버튼), `src/soil/soil-script.ts:4155` (일괄 완료)
- 원인: 두 곳 모두 접수번호 본번(+성토 여부)만으로 "연관 시료"를 모은다. 9ad0aec 이전에는 본번이 연도 내 유일해 안전했다.
- 재현: 농가의뢰 `5`(a)와 공익직불제 `5`(b)가 있는 상태에서 목록 탭 "전체" → a의 완료 버튼 클릭 → **b도 `isComplete=true`로 저장되고 Firebase에도 저장된다.** 일괄 완료로 a만 선택해도 같다(확인창의 "연관 접수번호 1건 포함"이 b다).
- 영향: 분석 대기 시료가 완료로 바뀌어 목록 기본 필터("미완료")에서 사라진다. 사용자가 알아채기 어렵다.
- 처리: 두 곳 모두 그룹 조건에 `landClass1`(누락 시 농가의뢰) 일치를 추가.
- 재현 테스트: `tests/e2e/soil-landclass.spec.js` — "완료 버튼은…", "일괄 완료는…"
- 참고: 포팅 원본(`~/projects/sample-log-electron/src/soil/reception-group.js`의 `findRelatedLogs`/`computeBulkTargetIds`)도 경지구분을 보지 않는다. 이 저장소 범위 밖이라 고치지 않았다.

### M-2. 목록 탭은 "농가의뢰"를 표시하는데 실제 필터는 "전체"다 — 수정함

- 위치: `src/soil/soil-script.ts:213` (필터 초기값), `src/soil/soil-script.ts:810` (탭 초기 표시)
- 원인: `populateLandClass1Options`가 탭 값을 농가의뢰로 세팅하지만 `currentSearchFilter.landClass1`은 초기화되지 않았다(`undefined` = 필터 없음). 포팅 원본은 `landClass1: LAND_CLASS1_DEFAULT`로 초기화한다(원본 주석 SAMPL-1-88) — 포팅 누락.
- 재현: 공익직불제 레코드가 있는 연도로 접수 목록을 연다 → 탭은 "농가의뢰"인데 공익직불제 행이 섞여 보인다. 이 상태에서 탭의 "농가의뢰"를 다시 골라도 값이 같아 `change`가 안 나 필터를 걸 방법이 없다(다른 값을 거쳐야 함). 전체 선택 → 일괄 작업 시 사용자는 농가의뢰만 고른 줄 안다.
- 처리: 필터 초기값을 탭 표시와 같은 `LAND_CLASS1_DEFAULT`로 둔다(원본 동작과 일치).
- **동작 변화**: 첫 화면 목록이 농가의뢰만 보인다(이전: 전체). 다른 경지구분은 탭에서 골라야 보인다. 코드 주석과 원본이 의도한 동작이지만, 사용자 체감이 바뀌므로 명시한다.
- 재현 테스트: `tests/e2e/soil-landclass.spec.js` — "첫 화면의 탭 표시와 실제 필터가 일치한다"

## 🟡 MINOR (보류)

### m-1. `getNextNumberForClass`가 현재 연도 외에는 1을 돌려준다 — 보류(잠재)

- 위치: `src/soil/soil-script.ts:879-884`
- 재현: 2026년을 보는 중 `soilManager.getNextNumberForClass(2025, '농가의뢰')` → 2025년에 1~10번이 있어도 `1`.
- 보류 사유: 현재 유일한 호출자 `soil-result-importer.ts:920`은 `currentYear(mgr)` = `mgr.selectedYear`를 넘기므로 **도달 경로가 없다.** 다만 JSDoc이 "지정 연도"를 약속하므로, 다른 연도를 넘기는 호출자가 생기는 순간 중복 번호가 된다. 연도별 저장소(`getStorageKey(year)`)를 읽도록 고치거나 매개변수를 없애는 것을 SAMPL-2-28(채번 규칙 정리)에서 함께 다루길 권한다.

### m-2. 삭제 후 "재입력 편의" 번호 복원이 경지구분을 보지 않는다 — 보류

- 위치: `src/soil/soil-script.ts:668`
- 재현: 농가의뢰 `5` 삭제, 공익직불제 `5`가 남아 있음 → `stillExists`가 true라 입력란에 `5`가 복원되지 않는다. 편의 기능 누락일 뿐 데이터 영향 없음.

### m-3. `addImportedRecord`가 콤마 결합 작물명을 작물 1개로 저장한다 — 보류

- 위치: `src/soil/soil-script.ts:947`
- 재현: 가져오기 행의 작물 칸이 `고추, 배추`면 `parcels[0].crops = [{ name: '고추, 배추' }]`. 같은 커밋의 `cropsFromDisplay`는 콤마로 나누므로 규칙이 어긋난다. 수정 폼에서 작물 1개로 보인다.

### m-4. `addImportedRecord`가 레코드 날짜의 연도와 무관하게 현재 연도 저장소에 넣는다 — 보류

- 위치: `src/soil/soil-script.ts:918` 이하 `this.sampleLogs.push`
- 재현: 2026년을 보는 중 `date: 2025-05-01` 행을 가져오면 2026 저장소에 들어간다. 가져오기 모달의 설계 결정일 수 있어 보류하고 SAMPL-1-152에 참고로 남긴다.

### m-5. 수정 모드에서 경지구분을 바꾸면 접수번호가 새 번호로 덮인다 — 보류

- 위치: `src/soil/soil-script.ts:3682`
- 재현: 기존 레코드 수정 → 경지구분 변경 → 접수번호 입력란이 그 경지구분의 max+1로 바뀐다. 원래 경지구분으로 되돌려도 원래 번호가 아니라 max+1이 된다. 바로 위 `subCategory` 변경 핸들러의 기존 패턴과 같아 새 결함 유형은 아니다.

## 🔵 SUGGESTION

- **s-1** 통계 라벨 `soil-script.ts:2666` — 매핑에 없는 경지구분은 원문을 라벨로 쓰고 `renderBarChart`가 `innerHTML`에 넣는다. `sanitizeHTML`(DOMPurify)을 거쳐 스크립트 실행은 막히지만(XSS 아님) 마크업은 들어간다. `escapeHTML`이 맞다. 이 커밋의 나머지 사용자 입력(경영체등록번호·차수·기준년도·경지구분 셀)은 모두 `textContent`/`option.value`라 안전함을 확인했다.
- **s-2** `soil-script.ts:3941` — CSS 선택자에 `id`를 그대로 보간한다. UUID면 문제없지만 따옴표가 든 레거시 id면 `querySelectorAll`이 던진다(저장은 이미 끝난 뒤라 형제 select 동기화만 실패). `CSS.escape` 권장.
- **s-3** `soil-script.ts:840` — `gongikOrder='1'` 마이그레이션이 공익직불제가 아닌 레코드 전부에도 들어간다. 무해하지만 다음 저장 때 모든 레코드에 필드가 붙는다.
- **s-4** 타입 에러 — 9ad0aec 직전 트리 717개 → 9ad0aec 714개(순감 3, baseline 714 유지). 새로 생긴 것은 인라인 편집 핸들러의 `this.tableBody` null 가능성(TS2531) 1건이며 런타임은 바깥 `if (this.tableBody)`로 보호된다.

## 이관 (이 리뷰 집계에서 제외)

- **SAMPL-1-152로 이관**: `addImportedRecord`에 upsert 없음(같은 접수번호 중복 등록)
- **SAMPL-1-152로 이관**: `addImportedRecord`가 행마다 `saveLogs` + `firebaseSaveRecords` + `filterAndRenderLogs` 호출
- **SAMPL-2-28 범위**: '농가의뢰' 상수 3중 선언(`LAND_CLASS1_DEFAULT`·`GONGIK_LAND_CLASS1_DEFAULT`·`DEFAULT_LAND_CLASS`), `computeNextNumber`/`collectExistingNumbers` 규칙 중복, `getNextFillNumberForClass` 부재

## 확인했지만 문제없던 곳

- 테이블 열 수: 헤더 22칸, 일반 19칸·공익직불제 18칸 표시 — 구분선 `colSpan`(19/18)과 일치
- Firebase 저장 키는 `log.id`라 경지구분 간 같은 접수번호가 문서를 덮지 않음
- 신규 등록 중복 검사(`soil-script.ts` 신규 등록 모드)는 현재 경지구분 범위로 한정되어 채번 규칙과 일치
- 레거시 레코드(`landClass1` 없음): 로드 마이그레이션 + 모든 비교에 `|| LAND_CLASS1_DEFAULT` 폴백
- 연도 전환: 필터 상태 유지, `loadYearData` 후 현재 폼 경지구분 기준으로 재채번
- 공익직불제 일괄 적용: 대상 0건이면 경고 후 중단, 기준년도 빈 값은 확인창에 "(없음)"으로 표시

## 집계

🔴 CRITICAL: 0건 / 🟠 MAJOR: 2건 / 🟡 MINOR: 5건 / 🔵 SUGGESTION: 4건
