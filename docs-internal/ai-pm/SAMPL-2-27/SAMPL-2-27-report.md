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
