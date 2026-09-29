# SAMPL-2-27 작업 보고서 — 커밋 9ad0aec 코드 리뷰

리뷰 결과는 `SAMPL-2-27-review.md`에 있다. 🔴 0 / 🟠 2 / 🟡 5 / 🔵 4, 🟠 2건만 고쳤다.

## 바꾼 것

| 파일 | 변경 |
| --- | --- |
| `src/soil/soil-script.ts` | M-1: 완료 버튼·일괄 완료의 연관 시료 조건에 `landClass1` 일치 추가. M-2: `currentSearchFilter.landClass1` 초기값을 `LAND_CLASS1_DEFAULT`로 |
| `tests/e2e/soil-landclass.spec.js` | 신규 — M-1 두 경로, M-2 재현 테스트 3건 |
| `docs-internal/ai-pm/SAMPL-2-27/*` | 리뷰 문서, 이 보고서 |

손대지 않은 것: 암호화 모듈 3종(`git diff` 0줄), `COLLECTION_PREFIX = 'test_'`(`src/shared/firestore-db.ts:106` 그대로), tests/unit 암호화 테스트, 빌드 산출물(`docs/*.html` 해시 참조·`src/shared/tailwind-output.css`는 빌드가 바꾼 것을 되돌림 — `docs/assets/`가 ignore라 커밋하면 참조가 어긋난다).

## 실행한 명령과 결과

기준선은 수정 전(5c44c1b)에서 먼저 쟀다.

| 명령 | 수정 전 | 수정 후 |
| --- | --- | --- |
| `npm run build` | exit 0 | exit 0 (`built in 2.24s`) |
| `npm run typecheck:gate` | 714 / baseline 714, exit 0 | 714 / baseline 714, exit 0 |
| `npx vitest run` | 33 failed / 385 passed (418) | 33 failed / 385 passed (418) |
| `npx playwright test` (전체, 202건) | 9 failed / 193 passed | 5 failed / 197 passed |
| `npx playwright test tests/e2e/soil-landclass.spec.js` | 3 failed | 3 passed |

- vitest 실패 33건은 수정 전·후 모두 같은 4파일이다: `encryption-manager` 23, `secure-storage` 8, `crypto-utils` 1, `path-security` 1.
- E2E 수정 후 실패 5건(`edit-test:5`, `form-submission:135`, `soil-form:54`, `soil-form:58`, `theme-toggle:5`)은 **수정 전에도 똑같이 실패**한다. 수정 전 9건 = 이 5건 + 신규 스펙 3건 + `soil-importer:360`(40.5s 타임아웃, 수정 후 통과 — 불안정 테스트로 보인다. 원인은 재 보지 않았다).
- E2E는 다른 worktree와 8888 포트를 공유하지 않도록 임시 설정(포트 8927, `reuseExistingServer: false`)으로 돌렸다. 설정 파일은 커밋하지 않았다.

### 타입 에러가 이 커밋에서 늘었는가

9ad0aec 직전(`ac7f31a`)과 9ad0aec를 임시 worktree로 떠서 `tsc --noEmit`을 셌다: **717 → 714(순감 3)**. 새로 생긴 것은 TS2531 1건(인라인 편집 핸들러의 `this.tableBody`, 런타임은 바깥 `if`로 보호)이다. 이번 수정 후에도 714.

## 변이 검증

수정본을 보관한 뒤 수정 지점을 **하나씩** 되돌려 빌드하고 신규 스펙을 돌렸다.

| 변이 | 되돌린 곳 | 결과 |
| --- | --- | --- |
| A | 완료 버튼의 `landClass1` 조건 | "완료 버튼은…"만 실패, 나머지 2 통과 |
| B | 일괄 완료의 `landClass` 조건 | "일괄 완료는…"만 실패, 나머지 2 통과 |
| C | 필터 초기값 `landClass1` | "첫 화면의 탭 표시…"만 실패, 나머지 2 통과 |

변이 후 수정본으로 복원하고 `diff`로 동일함을 확인했다. 세 곳을 한꺼번에 되돌린 상태(수정 전 전체 E2E)에서도 3건 모두 실패했다.

## 남은 위험

- **M-2는 동작 변화다.** 첫 화면 목록이 농가의뢰만 보인다(이전: 전체). 포팅 원본과 코드 주석의 의도에 맞췄지만, 사용자가 "다른 경지구분 기록이 사라졌다"고 느낄 수 있다. 결정이 달라지면 탭 기본값을 "전체"로 바꾸는 쪽으로 되돌리면 된다.
- 포팅 원본(`sample-log-electron`)의 `reception-group.js`도 M-1과 같은 결함을 갖고 있다. 이 저장소 범위 밖이라 고치지 않았다.
- 🟡 5건은 보류했다(리뷰 문서 참고). 그중 m-1(`getNextNumberForClass` 타 연도)은 지금은 도달 경로가 없지만 호출자가 생기면 중복 번호가 된다.
- 이관 항목(SAMPL-1-152: upsert 부재·행마다 저장, SAMPL-2-28: 상수 중복·규칙 중복·`getNextFillNumberForClass` 부재)은 건드리지 않았다.
- 이 리뷰는 단일 레인이다. 다른 계열 모델의 독립 리뷰는 코디네이터 몫이다.

## AI PM submit_test

`smart_workflow(SAMPL-2-27, submit_test)` run 1 — build·type·integration pass, unit은 기존 암호화 실패 33건 때문에
사실대로 `fail`로 보고했다. 서버가 overall=fail로 판정해 티켓이 **`fixing`으로 전환됐다.** 신규 실패는 0건이다.
unit을 pass로 바꿔 재제출하지 않았다(기록이 거짓이 된다). 상태 처리는 코디네이터 판단에 맡긴다.

---

# 수정 라운드 (독립 리뷰 1라운드의 🟠 MAJOR 2건)

리뷰 원문: 코디네이터 스크래치패드 `review-2-27-r1.md` (43f13e7·0ebdd7f 대상, 🟠 2 / 🟡 2 / 🔵 1).
범위 밖으로 둔 것: MINOR-1(건수 표시), MINOR-2(엑셀 경지구분 열), SUGGESTION-1, m-5(수정 모드 번호 변경) — 코디네이터가 후속 티켓으로 뺐다.
SAMPL-2-28의 공유 상수(`DEFAULT_LAND_CLASS`)를 그대로 쓴다.

## 바꾼 것

| 파일 | 변경 |
| --- | --- |
| `src/heuktoram/heuktoram-script.ts` | MAJOR-1: `syncToSiblings`의 형제 조건에 번호 풀(경지구분 `\|\| DEFAULT_LAND_CLASS`, 성토 = `subCategory==='성토'` 또는 `F` 접두) 일치 추가. 같은 `log.id` 행은 종전대로 무조건 형제. `SoilLog`에 `landClass1` 필드 추가, `reception-number`에서 상수 import |
| `src/soil/soil-script.ts` | MAJOR-2: `populateLandClass1Options`에서 `opt.selected` → `opt.defaultSelected`. `form.reset()`이 첫 옵션('개량제') 대신 농가의뢰로 돌아온다 |
| 〃 | `cancelEditMode`·`resetFormKeepReceptionInfo`의 명시 복원 줄은 **남겼다**(이제 no-op이지만 무해하고, HTML에 정적 옵션이 생겨 populate가 건너뛰어지면 다시 필요해진다). 사실과 어긋나게 된 주석만 한 줄로 고쳤다 |
| `tests/e2e/heuktoram-siblings.spec.js` | 신규 4건 — 셀 편집·붙여넣기·성토 분리, 그리고 같은 경지구분 가지번호(5 → 5-1, `landClass1` 누락 폴백) 동기화 유지(대조군) |
| `tests/e2e/soil-landclass.spec.js` | 신규 1건 — UI로 연속 2회 등록(결과 모달 닫고 접수 화면 복귀). 첫 등록 후 폼 경지구분 = 농가의뢰, 다음 번호 = 2, 저장값 둘 다 농가의뢰, 목록(농가의뢰 탭)에 두 번째 시료 표시 |

## 실행한 명령과 결과

E2E는 종전처럼 임시 설정(포트 8927, `reuseExistingServer: false`, 스크래치패드에 둠 — 커밋 안 함)으로 돌렸다.

| 명령 | 결과 |
| --- | --- |
| 수정 전 코드 + 신규 스펙 (`heuktoram-siblings` + `soil-landclass`, 8건) | 4 failed / 4 passed — 실패는 신규 4건(b에 `6.5`·`7.1`, 성토 f에 `6.2`가 저장됨, 폼 `#landClass1`이 `개량제`), 통과는 대조군 1 + 기존 3 |
| `npm run build` (수정 후) | exit 0 (`built in 4.58s`) |
| `npm run typecheck:gate` | 714 / baseline 714, exit 0 |
| `npx vitest run` | 33 failed / 397 passed (430) — 실패는 기존과 같은 4파일(`encryption-manager` 23, `secure-storage` 8, `crypto-utils` 1, `path-security` 1). 신규 실패 0 |
| 신규 스펙 2파일 (수정 후) | 8 passed |
| `npx playwright test` 전체 (212건, `--workers=3`) | 5 failed / 207 passed — 실패 5건(`edit-test:5`, `form-submission:135`, `soil-form:54`, `soil-form:58`, `theme-toggle:5`)은 1라운드 보고서의 기존 실패와 같다 |

## 변이 검증

수정본을 보관하고 한 곳씩 되돌려 빌드한 뒤 두 스펙(8건)을 돌렸다.

| 변이 | 되돌린 곳 | 결과 |
| --- | --- | --- |
| A | `poolOf`에서 경지구분 제거 | 셀 편집·붙여넣기 2건만 실패, 6 통과 |
| B | `poolOf`에서 성토 구분 제거 | 성토 분리 1건만 실패, 7 통과 |
| C | `defaultSelected` → `selected` | 연속 등록 1건만 실패, 7 통과 |

변이 후 보관본으로 복원하고 `cmp`로 동일함을 확인했다.

## 남은 위험

- 흙토람 형제 판정은 `receptionBaseKey`를 쓰지 않고 같은 규칙을 로컬로 적었다. `receptionBaseKey`는 성토가 아닌 `F` 번호를 풀에서 빼 버려(null) 기존에 동기화되던 `F5`/`F5-1`(성토 표기 누락) 조합이 끊길 수 있어서다. 규칙이 두 곳이 됐다.
- 성토 판정을 `subCategory==='성토' || F 접두`로 넓게 잡았다. 성토 표기 없는 `F` 번호와 성토 표기된 `F` 번호는 서로 형제로 남는다(의도). 실데이터에 그런 조합이 있는지는 재 보지 않았다.
- 메인 프로젝트(`sample-log-electron`)의 같은 결함(리뷰 원문 「메인 프로젝트 판정」)은 범위 밖이라 건드리지 않았다.
- 이 수정본은 아직 아무도 리뷰하지 않았다. 재리뷰는 코디네이터 몫이다.
