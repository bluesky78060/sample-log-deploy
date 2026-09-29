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
