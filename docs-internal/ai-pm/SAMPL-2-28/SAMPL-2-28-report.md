# SAMPL-2-28 작업 보고서 — soil 접수번호 분류 규칙 단일화

SAMPL-2-27 리뷰가 이 티켓 범위로 넘긴 세 가지를 **동작 불변**으로 처리했다:
'농가의뢰' 상수 3중 선언, `computeNextNumber`/`collectExistingNumbers` 규칙 중복, `getNextFillNumberForClass` 부재.

코디네이터 추가 지시(작업 중 수신)로 SAMPL-1-152가 남긴 매칭 기준 차이도 처리했다.
**이것은 사용자 눈에 보이는 동작 변화다** — 아래 「덮어쓰기 매칭 기준 통일」.

## 바꾼 것

| 파일 | 변경 |
| --- | --- |
| `src/soil/reception-number.ts` | `DEFAULT_LAND_CLASS`(유일한 `'농가의뢰'` 정의)·`LAND_CLASS1_OPTIONS`(12값)를 여기로 모음. 공유 헬퍼 `receptionBaseKey(log, fill, targetClass, defaultClass?)` 신규. `computeNextNumber`가 헬퍼에 위임 |
| `src/soil/soil-import-preview.ts` | `collectExistingNumbers`가 헬퍼에 위임(자체 규칙 7단계 제거) |
| `src/soil/soil-import-mapping.ts` | `LAND_CLASS1_OPTIONS`·`LAND_CLASS1_DEFAULT` 정의 제거 → reception-number에서 **같은 이름으로 재수출**(모달·기존 테스트의 import 경로 유지) |
| `src/soil/soil-script.ts` | 지역 `LAND_CLASS1_OPTIONS`·`LAND_CLASS1_DEFAULT` 제거 → import. 통계 매핑 키를 `[LAND_CLASS1_DEFAULT]`로. `getNextFillNumberForClass(year, landClass1)` 신규(정수 반환, 로그 없음, 연도 규칙은 `getNextNumberForClass`와 동일) |
| `src/soil/soil-result-importer.ts` | `_recompute`가 `generateNextFillReceptionNumber(...)`의 `'F3'`을 `parseInt`로 되뽑던 우회 대신 `getNextFillNumberForClass`를 쓴다. `generateNextFillReceptionNumber`는 폼 등록·가져오기 저장 경로용으로 남음 |
| `src/soil/gongik-targets.ts` | Target 목록 밖이지만 수용 조건 2(`'농가의뢰'` 정의 1곳)를 위해 수정: `GONGIK_LAND_CLASS1_DEFAULT = DEFAULT_LAND_CLASS`(기존 export 이름 유지), 주석의 `'농가의뢰'` 표기를 상수명으로 |
| `tests/unit/reception-number.test.ts` | **추가만** 2건(삭제 0줄) — 아래 변이 검증 참고 |
| `tests/unit/reception-base-key.test.ts` | 신규 10건 — 헬퍼 직접 4건 + 두 호출부 일치(3개 경지구분 × 일반/성토) 6건 |
| `src/soil/soil-script.ts` (추가 지시) | `addImportedRecords`의 덮어쓸 대상 찾기를 `_findImportTarget`으로 분리해 `receptionBaseKey` 기준으로 바꿈. 결과에 `ambiguous` 추가 |
| `src/soil/soil-result-importer.ts` (추가 지시) | 결과 타입에 `ambiguous`, 토스트에 `같은 본번이 여러 건이라 건너뜀 N건`(warning) |
| `tests/e2e/soil-importer.spec.js` (추가 지시) | 신규 2건 — 아래 참고 |

## 덮어쓰기 매칭 기준 통일 (추가 지시)

### 어느 기준이 맞는가: 본번

SAMPL-1-152 이후 미리보기(`collectExistingNumbers`)는 **본번**(`5-1` → `5`)으로 중복을 판정하고, 매니저(`addImportedRecords`)는 **접수번호 전체**로 덮어쓸 대상을 찾았다. 본번 기준을 택했다. 근거는 앱의 다른 경로가 모두 본번을 접수의 정체성으로 쓴다는 것이다.

- 폼 신규 등록 중복 검사 `soil-script.ts:2134` — `split('-')[0]`으로 비교. `5-1`이 있으면 `5` 등록을 거부한다
- 채번 `computeNextNumber` — 본번의 max+1
- 일괄 완료 `soil-script.ts:4267`, 그룹 수정 `soil-script.ts:2455` — 본번으로 묶는다

전체 번호 기준을 택하면, 폼에서는 거부되는 `5`를 가져오기만 만들어 낼 수 있다. 미리보기의 "중복" 표시도 거짓이 된다.

### 규칙 (`_findImportTarget`)

같은 경지구분·같은 시퀀스(일반/성토)에서 `receptionBaseKey`가 같은 레코드를 모은다.
1. 접수번호 전체가 같은 레코드가 있으면 그것을 덮는다
2. 없고, 같은 본번이 **한 건**이면 그것을 덮는다. 접수번호는 기존 값(`5-1`)을 유지한다
3. 같은 본번이 **여러 건**(`5-1`·`5-2`에 `5`)이면 어느 것도 고르지 않고 건너뛰며, 건수를 토스트로 알린다. 한 행을 여러 필지 레코드에 모두 쓰면 필지별 값이 지워지고, 하나를 임의로 고르면 사용자가 모르는 레코드가 바뀐다

부수 효과: 전에는 성토 레코드 `7`(F 없음)과 일반 행 `7`이 전체 번호 일치로 덮였다. 이제는 미리보기처럼 시퀀스가 다르므로 새로 추가된다(미리보기도 원래 "신규"로 표시하던 경우다).

### 사용자에게 보이는 변화

| 상황 (덮어쓰기 선택) | 전 | 후 |
| --- | --- | --- |
| `5-1`만 있을 때 `5` 가져오기 | 미리보기 "중복 1", 저장은 새 레코드 `5` 추가(2건) | `5-1` 레코드를 갱신(1건 유지) |
| `8-1`·`8-2`가 있을 때 `8` 가져오기 | 새 레코드 `8` 추가 | 아무것도 바꾸지 않고 "같은 본번이 여러 건이라 건너뜀 1건" 경고 |

E2E로 고정했다: `tests/e2e/soil-importer.spec.js`의 "'5-1'만 있을 때…", "같은 본번이 여러 건이면…".

### 브리프와 다른 점

- 헬퍼 시그니처가 브리프의 `receptionBaseKey(log, fill)`보다 인자가 많다. 7단계 규칙에 "경지구분 범위"와 "기본 경지구분 폴백"이 들어가므로 `targetClass`와 `defaultClass`가 필요하다.
- **`targetClass`는 호출부가 확정해 넘긴다.** `computeNextNumber`는 빈 대상을 기본값으로 폴백하지만(`targetClass || def`), `collectExistingNumbers`는 받은 값을 그대로 비교한다(빈 값이면 빈 집합). 헬퍼가 폴백까지 맡으면 후자의 동작이 바뀌므로 넣지 않았다.
- `.trim()` 비대칭: 이제 두 경로 모두 본번을 trim한다. `computeNextNumber`는 결과를 `parseInt`로 읽는데, `parseInt`가 앞뒤 공백을 이미 무시하므로 채번 결과는 달라지지 않는다(`' F5'`는 전에는 `parseInt` NaN으로, 이제는 F 검사로 제외 — 둘 다 제외).

## 수용 조건 2 — `'농가의뢰'` 정의 1곳

```
$ grep -rn "'농가의뢰'" src/soil
src/soil/reception-number.ts:28:export const DEFAULT_LAND_CLASS = '농가의뢰';
```

## 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npm run build` | exit 0 (최종 `built in 6.01s`) |
| `npm run typecheck:gate` | 714 / baseline 714, exit 0 |
| `npx vitest run` | 33 failed / 397 passed (430). 실패는 `encryption-manager` 23 · `secure-storage` 8 · `crypto-utils` 1 · `path-security` 1로 기준선과 같다 — **기존 33건 외 신규 실패 0**. 385 → 397은 신규 테스트 12건 |
| 기존 단위 테스트 기대값 | 변경 0건(`git diff -- tests/`의 삭제 줄 0) |
| `npx playwright test tests/e2e/soil-importer.spec.js tests/e2e/soil-landclass.spec.js` | 리팩터링만 반영한 상태: 1차 12 passed / 8 failed — 전부 30초 타임아웃(클릭·새로고침 대기), 당시 부하 평균 109.55. 2차 `--workers=2 --timeout=120000`으로 20 passed. **매칭 통일 후(최종)**: 같은 옵션으로 **22 passed**(신규 2 포함) |

E2E는 다른 worktree와 포트가 겹치지 않도록 임시 설정(포트 8929)으로 돌렸고, 그 설정은 커밋하지 않았다. 전체 E2E(202건+)는 돌리지 않았다 — 가져오기·경지구분 스펙만 돌렸다.

### 동작 불변 확인

새로 추가한 `reception-number.test.ts` 2건을 **리팩터링 전 코드**(HEAD의 `reception-number.ts`·`soil-import-preview.ts`·`soil-import-mapping.ts`)로 돌렸다: 관련 3파일 77 passed. 즉 이 케이스들은 새 동작을 요구하는 게 아니라 기존 동작을 고정한다.

## 변이 검증

공유 헬퍼에서 성토 분리 조건(`if (fill !== (log.subCategory === '성토')) return null;`)을 지우고 관련 단위 테스트 3파일을 돌렸다.

| 테스트 세트 | 결과 |
| --- | --- |
| 기존 테스트만 | **미리보기 쪽 4건만 실패, `computeNextNumber` 쪽은 전부 통과.** 기존 성토 케이스는 일반 최대값(2)이 성토 최대값(3)보다 작아 분리 조건이 없어도 답이 같았다 |
| 신규 2건 추가 후 | 8 failed / 61 passed — `computeNextNumber` 쪽 2(성토가 더 큰 일반 번호를 끌어오지 않음, 일반이 F 없는 성토를 제외), 미리보기 쪽 4, 헬퍼 직접 2 |

한 곳(헬퍼)을 깨면 양쪽이 함께 깨진다. 변이 후 원본으로 복원하고 `diff`로 동일함을 확인했다.

### 매칭 통일 변이 (M)

`_findImportTarget`을 옛 방식(접수번호 전체 일치만)으로 되돌리고 빌드해 `soil-importer.spec.js`를 돌렸다: **신규 2건만 실패, 17 passed.**
- "'5-1'만 있을 때…" — `Expected length: 1, Received length: 2`(새 `5`가 추가됨)
- "같은 본번이 여러 건이면…" — 토스트가 `✅ 1건 가져오기 완료 · 중복 1건`, 건너뜀 문구 없음

복원 후 `diff`로 동일 확인, 다시 빌드했다.

## 남은 위험

- `getNextFillNumberForClass`는 `getNextNumberForClass`와 같이 현재 연도가 아니면 빈 목록으로 계산해 1을 돌려준다(SAMPL-2-27 리뷰 m-1과 같은 잠재 함정). 현재 호출자는 현재 연도만 넘긴다. 동작 불변이 조건이라 고치지 않았다.
- 모호한 행(같은 본번 여러 건)은 미리보기에서는 그냥 "중복"으로만 보이고, 건너뛰었다는 사실은 저장 후 토스트로만 알 수 있다. 미리보기에서 미리 표시하려면 미리보기가 본번별 건수를 알아야 해서 이번 범위에서 하지 않았다.
- 같은 접수번호 전체가 같은 레코드가 이미 여러 건이면(과거 중복 가져오기 흔적) 처음 찾은 한 건만 갱신한다.
- E2E 1차 실패 8건은 부하로 인한 타임아웃으로 판단했고, 2차 재실행에서 전부 통과했다. 원인을 따로 재현해 보지는 않았다.
- 독립 리뷰는 코디네이터 몫이다(자기 승인 아님).

## AI PM submit_test

`smart_workflow(SAMPL-2-28, submit_test)` run 1 — build·type·integration pass, unit은 사실대로 `fail`로 적고
output에 "기존 33건 외 신규 실패 0"을 명시했다. 서버가 overall=fail로 판정해 티켓이 **`fixing`으로 전환됐다.**
