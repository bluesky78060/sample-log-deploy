# SAMPL-1-113 코드 리뷰 — fromCache 기반 cross-device 삭제 보류 이식 (SAMPL-1-80)

- **일자**: 2026-06-28
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트) + 오케스트레이터 후속 수정
- **대상 커밋 범위**: 4파일 (sync-utils.ts, firestore-db.ts, BaseSampleManager.ts, globals.d.ts)
- **빌드/타입 증거**: typecheck:gate 717/717 (신규에러 0, 회귀 없음), vite build ✓ built in 2.45s

## 변경 요약
메인(sample-log-electron, JS)의 SAMPL-1-80 안전장치를 테스트(TS)로 이식. Firestore가 불완전 캐시 응답(`fromCache=true`)을 줄 때 cross-device 삭제를 보류해 `syncedAt`이 있는 멀쩡한 로컬 레코드가 일시 삭제되는 것을 방지.

1. `sync-utils.ts` — `smartMerge`에 `options.allowDeletions=true` 추가, 삭제 분기를 `if (localItem.syncedAt && allowDeletions)`로 가드. `mergeCloudData`에 `options.fromCache=false` 추가 → `smartMerge({ allowDeletions: !fromCache })`.
2. `firestore-db.ts` — `getAllDocumentsWithMeta()` 신규(`{documents, fromCache}` 반환, withFirebaseRetry 래핑). `getAll`은 여기에 위임(단일 진실원천). export에 `getAllWithMeta` 등록.
3. `BaseSampleManager.ts` — `FirebaseCacheEntry.fromCache?` 추가. `loadFromFirebase` → `{data, fromCache}`. `loadYearData`/`syncWithCloud` 양 호출부에서 fromCache 확보·전파, 캐시에 fromCache 저장. `protected smartMerge` options passthrough.
4. `globals.d.ts` — `FirestoreDb`에 optional `getAllWithMeta` 추가, ambient 클래스의 stale 시그니처 정정.

## 리뷰 결과 (severity)

| # | 등급 | 항목 | 처리 |
|---|------|------|------|
| 1 | MEDIUM | `getAllDocuments`가 `getAllWithMeta`에 위임하지 않고 로직 중복(메인은 위임) | ✅ 수정 — 위임형으로 변경 |
| 2 | MEDIUM | `globals.d.ts` ambient 클래스의 `loadFromFirebase` stale 시그니처(`Promise<unknown[]>`) | ✅ 수정 — `{data, fromCache}`로 정정 + smartMerge options 정렬 |
| 3 | LOW | smartMerge 정렬 tiebreaker가 메인의 localeCompare 보조정렬과 다름 | 보류 (SAMPL-1-80 범위 밖, 별도 처리 가능) |
| 4 | LOW | 캐시 적중 시 localOnly 재업로드 비대칭 | 메인과 동일 동작, 무결함 |
| 5 | LOW | `void options`로 skipOrder 무시 | 메인과 동일, 무해 |

- **CRITICAL/HIGH: 0건**

## 검증된 핵심 포인트
- **후방호환**: `allowDeletions=true`/`fromCache=false` 기본값이 기존 삭제 허용 동작 보존. 옵션 미전달 호출부 무손상.
- **삭제 보류 정확성**: `fromCache=true` → `allowDeletions=false` → `syncedAt` 로컬 항목 보존. end-to-end 추적 확인.
- **호출부 전수**: `loadFromFirebase` 반환형 변경 소비처 2곳 모두 `{data, fromCache}` 구조분해. 5개 서브클래스(soil/water/heavy-metal/compost/pesticide) 중 해당 메서드 override 없음 → 누락 호출부 0.
- **캐시 충실도**: 캐시 적중 경로에서도 원본 응답의 `fromCache` 신뢰도 보존·전파.
- **타입 안전성**: optional `getAllWithMeta?` + `typeof === 'function'` 가드 + `getAll` 폴백. `cacheEntry!`는 `cacheValid` 분기로 control-flow 보장.

## 최종 판정
**통과 (APPROVE).** 조건부 통과로 지목된 MEDIUM 2건을 모두 수정 후 typecheck:gate 717/717·빌드 재검증 완료. CRITICAL/HIGH 없음. LOW 3건은 SAMPL-1-80 범위 밖 파리티 폴리시로 후속 가능.
