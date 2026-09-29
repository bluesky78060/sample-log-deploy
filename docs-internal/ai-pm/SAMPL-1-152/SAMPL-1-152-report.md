# SAMPL-1-152 작업 보고서 — soil 가져오기 upsert + 배치 저장

SAMPL-2-27 리뷰(`docs-internal/ai-pm/SAMPL-2-27/SAMPL-2-27-review.md`)가 이관한 두 지적을 처리했다.
- `addImportedRecord`에 upsert가 없어 같은 접수번호가 중복 등록됨
- 행마다 `saveLogs` + `firebaseSaveRecords` + `filterAndRenderLogs` 호출

## 바꾼 것

| 파일 | 변경 |
| --- | --- |
| `src/soil/soil-script.ts` | `addImportedRecord`(단건) 제거 → `addImportedRecords(records[])` 배치 API. 같은 `receptionNumber` + 같은 `landClass1`(누락 시 농가의뢰)이면 기존 레코드를 갱신, 아니면 추가. 루프 뒤 `saveLogs` 1회 · `firebaseSaveBatch` 1회 · `filterAndRenderLogs` 1회. `firebaseSaveBatch` 신규: `batchSave`의 `false` resolve와 reject를 모두 `_handleCloudSyncFailure`로 올린다 |
| `src/soil/soil-result-importer.ts` | `_commit`이 레코드를 모아 `addImportedRecords`를 한 번 호출. 라디오 라벨 `그래도 추가 (같은 접수번호가 중복 등록됨)` → `덮어쓰기`. 토스트에 `덮어씀 N건` 추가. 배치가 통째로 던지면 오류 토스트 후 버튼 잠금 해제 |
| `tests/e2e/soil-importer.spec.js` | 신규 3건: 덮어쓰기 upsert · 201행 스파이 · Firestore false resolve |
| `tests/unit/soil-import-preview.test.ts` | 주석의 API 이름만 수정 |

단건 `addImportedRecord` 호출부는 `grep -rn "addImportedRecord\b" src tests`로 확인했다 — `soil-result-importer.ts` 하나뿐이었고 배치로 옮겼다.

### 덮어쓰기 의미 (설계 결정)

- `id` · `createdAt` · `groupId` · `receptionNumber` · `landClass1`은 그대로, `updatedAt`만 새로 찍는다.
- **빈 칸은 덮어쓰지 않는다.** 미리보기 레코드는 매핑하지 않은 열도 `''`로 채우므로, 빈 값까지 쓰면 가져오기와 무관한 연락처가 지워진다. `isComplete`·`mailDate` 같은 가져오기에 없는 필드도 보존한다.
- 필지는 `parcels[0]`의 `lotAddress`·`category`·`purpose`·`note`·`crops`를 갱신한다(`parcels[0].id`·`subLots`는 보존).
- 같은 배치 안의 같은 번호 두 행은 뒤 행이 앞 행을 덮는다(결과 1건).

## Firestore 동작 확인

`src/shared/firestore-db.ts`의 `batchSave`:
- Firebase 꺼짐 또는 빈 배열 → `false`. 빈 배열은 `firebaseSaveBatch`가 먼저 걸러 실패로 오인하지 않는다.
- 500건 청크로 나눠 `batch.commit()`, 재시도 후에도 실패하면 오프라인 큐에 넣고 `false`를 돌려준다(reject 아님).
- 오프라인이면 큐에 넣고 `true`.
- `window.firestoreDb.batchSave`는 `globals.d.ts:304`에 필수 메서드로 선언돼 있어 "API 없음" 분기는 넣지 않았다.

## 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npm run build` | exit 0 (`built in 4.54s`) |
| `npm run typecheck:gate` | 714 / baseline 714, exit 0 |
| `npx vitest run` | 33 failed / 385 passed (418) — 실패는 `encryption-manager` 23 · `secure-storage` 8 · `crypto-utils` 1 · `path-security` 1, SAMPL-2-27 때 잰 기준선과 같다 |
| `npx playwright test tests/e2e/soil-importer.spec.js` | 17 passed (기존 14 + 신규 3). 기존 201행 테스트(저장 201건) 포함 |
| `npx playwright test` (전체, 205건) | 200 passed / 5 failed — 실패 5건(`edit-test:5`, `form-submission:135`, `soil-form:54`, `soil-form:58`, `theme-toggle:5`)은 SAMPL-2-27에서 수정 전 코드로 잰 기준선의 실패와 같다 |

E2E는 다른 worktree와 포트가 겹치지 않도록 임시 설정(포트 8928, `reuseExistingServer: false`)으로 돌렸다. 그 설정은 커밋하지 않았다.

## 변이 검증

수정본을 보관하고 한 곳씩 깨뜨려 빌드한 뒤 `soil-importer.spec.js`(17건)를 돌렸다. 끝나고 복원해 `diff`로 동일함을 확인했다.

| 변이 | 바꾼 곳 | 결과 |
| --- | --- | --- |
| U | upsert 분기 제거(`if (false && existing)`) | 덮어쓰기 테스트만 실패 — `Expected length: 3, Received length: 5` |
| B | 루프 안에서 행마다 `saveLogs`·`firebaseSaveRecords`·`filterAndRenderLogs` | 스파이 테스트만 실패 — `saveLogs` `Expected: 1, Received: 202` |
| F | `batchSave` 결과를 무시(`.then(() => {})`) | Firestore 테스트만 실패 — 실패 알림 `Expected: 1, Received: 0` |
| 0 | 수정 전 코드(HEAD) 전체 | 신규 테스트 2건(덮어쓰기·스파이) 실패 — `saveLogs` `Received: 201`. Firestore 테스트는 이 변이 뒤에 추가해 수정 전 코드로는 돌리지 않았다 |

## 남은 위험

- **매칭 키가 미리보기와 다르다.** 미리보기는 본번(`5-1` → `5`)으로 중복을 판정하고, 매니저는 접수번호 전체 문자열로 찾는다. 기존 `5-1`이 있는 상태에서 `5`를 덮어쓰기로 가져오면 미리보기는 "중복"이라 하지만 매니저는 새 레코드 `5`를 추가한다. 규칙 공유는 SAMPL-2-28 범위라 맞추지 않았다.
- 같은 접수번호 + 같은 경지구분 레코드가 이미 여러 건이면(이 수정 전의 중복 가져오기 흔적) 처음 찾은 한 건만 갱신한다.
- 다필지 그룹 레코드를 덮어쓰면 `parcels[0]`만 갱신된다.
- 클라우드 저장은 비동기라, 성공 토스트가 뜬 뒤에 `_handleCloudSyncFailure`가 실패를 따로 알린다(기존 `firebaseSaveRecords`와 같은 방식).
- SAMPL-2-27 리뷰 m-4(레코드 날짜의 연도와 무관하게 현재 연도 저장소에 넣음)는 바꾸지 않았다.
- 메인 프로젝트 이식은 별 티켓이다.
- 독립 리뷰는 코디네이터 몫이다(이 보고서는 자기 승인이 아니다).

## AI PM submit_test

`smart_workflow(SAMPL-1-152, submit_test)` run 1 — build·type·integration pass. unit은 코디네이터 지시대로 사실대로
`fail`로 적고 output에 "기존 33건 외 신규 실패 0"을 명시했다. 서버가 overall=fail로 판정해 티켓이 **`fixing`으로 전환됐다.**

---

# 수정 라운드 (독립 리뷰 1라운드 — 🟠 2 / 🟡 3 / 🔵 4)

리뷰 원문: 코디네이터 스크래치패드 `review-1-152-r1.md` (75d641e 대상). 리뷰어 재현 스펙 사본은 유실돼 R1·R2·R3 서술로 다시 썼다.
리뷰 뒤에 SAMPL-2-28(d943451)이 덮어쓰기 매칭을 본번 기준으로 바꿨으므로, 먼저 현재 HEAD(dde085c)에서 다시 재현했다.

## 현재 HEAD에서 다시 재현 (수정 전)

임시 스펙(커밋 안 함)으로 리뷰 서술 그대로 돌렸다.

| 시나리오 | 리뷰 당시(75d641e) | 현재 HEAD(dde085c) | 판정 |
| --- | --- | --- | --- |
| R1 덮어쓰기로 내보내기 되가져오기 (5: 작물 2개·평 단위·하위 필지 1, 행 `5`·`5-1`) | 새 `5-1` 레코드 추가, 5번 crops가 `[{고추, 콩, 300}]`, note `-` | 새 레코드는 안 생긴다. 대신 **`5-1` 행이 본번 매칭으로 5번을 한 번 더 덮어** 본필지가 `내성리 5-1`·`[{벼, 50}]`이 됐다. note `-`. 토스트 `✅ 2건 가져오기 완료 · 덮어씀 2건 · 중복 2건` | 중복 등록은 해소, **데이터 파괴는 더 나빠짐** |
| R2 건너뛰기, 구분 열 없는 `F3` 행 (기존 성토 F3) | 기존 F3의 성명·주소를 덮음 | 덮지는 않는다. 대신 미리보기 `신규 1`, **구분 `-`인 `F3` 레코드가 새로 추가**됐다(어느 번호 풀에도 안 들어가 채번이 못 본다) | 조용한 덮어쓰기는 해소, **중복 등록으로 바뀜** |
| R3 localStorage `QuotaExceededError` | `✅ 2건 가져오기 완료`, 메모리 2·로컬 0, unhandled rejection | 같음 | 남음 |

남은 원인은 하나다: 미리보기는 행의 구분만 보고 풀을 고르고(`F3`+구분 없음 → 일반 풀 → 신규), 매니저는 정책을 모른 채 무조건 추가·갱신했다. 하위 필지 행(`N-M`)은 두 쪽 다 본번 매칭으로 기존 레코드에 붙였다.

## 바꾼 것

| 파일 | 변경 |
| --- | --- |
| `src/soil/reception-number.ts` | 공유 매칭 `matchImportRow(logs, 번호, 구분, 경지구분)` → `none / match / ambiguous / subrow`. `isFillImportRow`(구분 `성토` **또는 F 번호**면 성토 풀), `importedSubCategory`(구분이 빈 F 번호 행은 `성토`로 저장). 모두 `receptionBaseKey` 위에 얹었다 |
| `src/soil/soil-import-preview.ts` | 수동 번호 행의 중복 판정을 `matchImportRow`로. 기존 레코드 + **이 배치가 추가할 레코드**를 같이 쌓아 매니저의 배치 내 매칭까지 흉내 낸다. `existingLogs` 옵션 추가(모달은 항상 넘김). 없으면 `existing`/`existingFill` 집합으로 본번 레코드를 만들어 같은 경로를 탄다. 모호·하위 필지 행은 정책과 무관하게 `skip` + `reason` |
| `src/soil/soil-script.ts` | M-1: `addImportedRecords(records, { onDuplicate })` — 매칭은 `matchImportRow`, `skip`이면 매칭 레코드를 건드리지 않는다. 결과에 `batchUpdated`·`skipped`·`subRows`·`saveError`. `_findImportTarget` 삭제 |
| 〃 | M-2: `has()`가 `'-'`를 빈 값으로. 작물은 기존이 2개 이상이거나 `unit`이 있으면 불변(`_applyImportedCrops`), 한 개면 이름·면적만 바꾸고 다른 속성은 유지. `(산)` 접미를 떼 `isMountain`으로(같은 주소가 표기 없이 오면 기존 값 유지). 성토↔일반을 넘나드는 구분 덮어쓰기 금지. 신규 레코드도 `(산)` 처리·`importedSubCategory` 적용 |
| 〃 | m-1: `addImportedRecords`를 async로, `await this.saveLogs()` 실패 시 추가한 레코드를 빼고 덮은 레코드를 원래 값으로 **제자리** 복원, 클라우드 생략, `saveError` 반환 |
| `src/soil/soil-result-importer.ts` | `_commit` async. 오류 행만 빼고 중복 행까지 정책과 함께 매니저로 넘긴다(건수는 매니저의 실제 결과). `saveError`면 오류 토스트, 모달 유지·버튼 잠금 해제. m-2 토스트: `N건 가져오기 완료`(=추가+기존 덮어씀) 뒤에 정책별로 `덮어씀 N건` 또는 `중복 건너뜀 N건` 하나, `파일 안 반복 번호를 뒤 행으로 갱신 N건`, `같은 본번이 여러 건이라 건너뜀 N건`, `하위 필지 행 건너뜀 N건` 따로. 미리보기 상태 칸에 건너뛰는 사유 표시 |
| `tests/e2e/soil-importer.spec.js` | 신규 4건(R1, R2, 성토 구분 보존, R3). s-3: Firestore false 테스트가 `_handleCloudSyncFailure` 스텁 대신 `showToast` 스파이로 `클라우드 동기화 실패` 단정. 기존 upsert 테스트에 m-2 토스트 단정 추가 |
| 〃 (기존 기대 변경) | SAMPL-2-28의 「같은 본번이 여러 건이면…」: 미리보기가 이제 저장 전에 모호함을 알고 등록 0건이면 버튼을 잠근다. 그래서 신규 행 `9`를 섞고, 미리보기 사유 표시 단정을 더했다. 원래 단정(토스트 문구·8-1/8-2 불변)은 그대로다 |
| `tests/unit/reception-base-key.test.ts` | `matchImportRow` 4건 추가 |

### 하위 필지 표시번호(`N-M`) 행 방침: 건너뛴다

- `N-M` 레코드가 실제로 있으면 그것과 전체 번호로 매칭한다(가지번호를 접수번호로 쓰는 레코드는 정상 데이터다).
- `N-M` 레코드는 없고 같은 본번 레코드만 있으면 **내보내기의 하위 필지 행**으로 보고 정책과 무관하게 건너뛴다. `exportToExcel`은 하위 필지를 `${접수번호}-${순번}` 행으로 쓴다(`soil-script.ts`의 `exportToExcel`). 하위 필지 갱신으로 매핑하지 않은 이유: 한 행에서 오는 작물·면적도 합계로 뭉쳐 있어 원래 구조로 되살릴 수 없고, 순번이 곧 `subLots` 인덱스라는 보장도 없다(작물이 여러 개인 필지는 흙토람 표시번호와 순번이 어긋난다).
- 같은 본번 레코드가 전혀 없으면 새 레코드로 추가한다(새 연도 데이터를 가지번호째 가져오는 경우).

### 판단만 적은 것 (범위 밖)

- **m-3**: SAMPL-2-28은 **같은 본번·다른 전체 번호**(`8-1`·`8-2`에 `8`)만 모호로 건너뛴다. **전체 번호까지 같은 레코드가 여러 건**(과거 중복 가져오기로 `7`이 두 건)이면 여전히 첫 건만 갱신한다. 부분 해소다.
- **s-1**: `_applyImportedValues`가 중간에 던지면 그 레코드는 부분 변경된 채 `logs`에 안 들어가 로컬에는 저장되고 클라우드에는 안 간다. 이번에 넣은 원본 스냅샷(`originals`)으로 그 레코드만 되돌리면 막을 수 있지만, 현재 입력으로 던질 경로를 찾지 못해 손대지 않았다.
- **s-2**: 로딩 오버레이 취소 버튼 무동작은 그대로다.

## 실행한 명령과 결과 (수정 라운드)

E2E는 종전처럼 임시 설정(포트 8927, `reuseExistingServer: false`, 스크래치패드 — 커밋 안 함)으로 돌렸다.

| 명령 | 결과 |
| --- | --- |
| `npm run build` | exit 0 |
| `npm run typecheck:gate` | 714 / baseline 714, exit 0 |
| `npx vitest run` | 33 failed / 401 passed (434). 실패는 `encryption-manager` 23 · `secure-storage` 8 · `crypto-utils` 1 · `path-security` 1로 기준선과 같다 — **신규 실패 0**. 397 → 401은 `matchImportRow` 4건 |
| `npx playwright test tests/e2e/soil-importer.spec.js` | 23 passed (기존 19 + 신규 4) |
| `npx playwright test` 전체 (216건, `--workers=3`) | 211 passed / 5 failed — 실패 5건(`edit-test:5`, `form-submission:135`, `soil-form:54`, `soil-form:58`, `theme-toggle:5`)은 기존 기준선과 같다. `soil-landclass` 4건 포함 통과 |

첫 실행에서 2건이 30초 타임아웃으로 실패했다. 원인은 이 수정이다: 모든 행이 건너뛰어질 것을 미리보기가 이제 알아서 등록 0건으로 보고 가져오기 버튼을 잠갔다. 신규 행을 섞도록 두 테스트를 고쳤다(위 표 「기존 기대 변경」).

## 변이 검증 (수정 라운드)

수정본을 보관하고 한 곳씩 되돌려 빌드한 뒤 `soil-importer.spec.js`(23건)를 돌렸다. 끝나고 복원해 `cmp`로 동일함을 확인하고 다시 빌드했다.

| 변이 | 되돌린 곳 | 실패한 테스트 (나머지 통과) |
| --- | --- | --- |
| M1a | 매니저가 `onDuplicate`를 무시하고 항상 덮어씀 | R2만 (22 passed) |
| M1b | `isFillImportRow`가 F 번호를 성토로 보지 않음 | R2, 성토 구분 보존 (21 passed) — 두 번째는 F3/논 행이 기존 F3과 매칭되지 않아 새로 추가되기 때문 |
| M1c | `matchImportRow`의 하위 필지 행 판정 제거 | R1만 |
| M2a | `has()`가 `'-'`를 값으로 봄 | R1만 |
| M2b | 여러 작물·단위 보호 제거 | R1만 |
| M2c | `(산)` 접미 처리 제거 | R1만 |
| M2d | 성토↔일반 구분 덮어쓰기 보호 제거 | 성토 구분 보존만 |
| M3 | `await`·복원 제거(`this.saveLogs()`만 호출) | R3만 |

## 남은 위험 (수정 라운드)

- **동작 변화**: 덮어쓰기에서 기존 필지 작물이 2개 이상이거나 평 단위면 가져온 작물·면적을 **무시**한다. 사용자가 실제로 작물을 바꾼 행도 반영되지 않고, 토스트에도 따로 나오지 않는다.
- **동작 변화**: 구분 열이 없는 `F` 번호 행을 성토로 본다. 새로 만들 때 구분을 `성토`로 저장한다. `F` 번호에 구분 `논` 같은 값이 명시된 행은 그대로 저장돼 여전히 어느 번호 풀에도 안 든다(미리보기와 매니저가 똑같이 처리하므로 불일치는 아니다).
- 구분 `성토`이면서 F 없는 번호(`7`)로 **새로** 들어오는 행은 여전히 F 없는 성토 레코드가 된다. 이번에 막은 것은 기존 일반 레코드를 덮어 구분을 바꾸는 경로뿐이다.
- 하위 필지 행(`N-M`)은 가져오지 않으므로, 내보내기에서 하위 필지의 작물을 고쳐 되가져와도 반영되지 않는다.
- 저장 실패 복원은 덮은 레코드를 JSON 사본으로 되돌린다. `undefined` 값·함수 같은 JSON이 못 담는 속성은 복원 후 사라진다(현재 레코드에는 없다고 보지만 재 보지는 않았다).
- 클라우드 실패 알림은 여전히 성공 토스트 뒤에 따로 뜬다.
- 이 수정본은 아직 아무도 리뷰하지 않았다. 재리뷰는 코디네이터 몫이다.

## AI PM submit_test (수정 라운드)

`complete_fix`로 fixing → testing 전환 후 `submit_test` run 2 — build·type·integration pass, unit은 기존 암호화 실패 33건을
사실대로 `fail`로 적었다(신규 실패 0). 서버가 overall=fail로 판정해 티켓은 다시 **`fixing`**이다. 상태 처리는 코디네이터 판단에 맡긴다.

## 추가 지시 반영 (코디네이터 — SAMPL-2-28 지적과 통합)

위 수정 라운드(b2d0a7f)를 커밋한 뒤 받은 코디네이터 추가 지시로 매칭 규칙을 한 번 더 바꿨다. 코드 변경은 **SAMPL-2-28 수정 라운드 커밋**에 들어 있고(같은 함수라 분리 불가), 상세는 `docs-internal/ai-pm/SAMPL-2-28/SAMPL-2-28-report.md` 「수정 라운드」. 이 티켓에 닿는 것만 적는다.

- **하위필지 행 방침이 바뀌었다.** 위 「건너뛴다(중복·건너뜀)」 대신: 같은 풀에 번호가 정확히 `N`인 레코드(배치 내 포함)가 있을 때만 `N-M` 행을 **오류**(사유 표시)로 건너뛰고, `N`이 없으면 새 레코드로 추가한다(코디네이터 확정 (c)안). 토스트 문구는 `하위필지 행 건너뜀 N건`.
- **F 번호 판정**: 번호가 있는 행은 F 접두만으로 풀을 정하고, 구분과 어긋나면(`F3`+논, `7`+성토) 오류다. 위 표의 `isFillImportRow`(구분 `성토` 또는 F) 설명은 이것으로 대체된다.
- 테스트 조정: R1은 토스트·미리보기 문구만 바꿨다. 「덮어쓰기가 성토 레코드의 구분을 일반으로 바꾸지 않는다」는 `F3`+논 행이 이제 오류라 **F 없는 옛 성토 `7`에 일반 행 `7`이 exact로 매칭되는 경우**로 바꿨다(보호 코드가 여전히 필요한 경로).
- 최종 수치(두 티켓 공통 트리): build exit 0 · typecheck 714/714 · vitest 33 failed(기존 암호화)/402 passed · E2E 전체 219 passed / 5 failed(기존 5건). 변이 M2a~d·M3는 새 규칙에서 다시 돌려 각각 자기 테스트만 실패함을 확인했다.
- AI PM: `complete_fix` 후 `submit_test` run 3(최종 트리) — build·type·integration pass, unit은 기존 암호화 33건을 사실대로 `fail`. 티켓은 다시 **`fixing`**이다.
