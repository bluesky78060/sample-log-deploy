# SAMPL-1-124 코드 리뷰 — soil 엑셀 가져오기 5단계 모달 TS 포팅

- 대상 커밋: `9ad0aec`(선행 989줄) · `f0a8fc7`(모달) · `4fbce64`(적대적 검증 대응)
- 리뷰 3회차 (1차 → 적대적 검증 → 재리뷰)
- **최종 판정: APPROVED** — 범위는 `f0a8fc7` + `4fbce64`

```text
🔴 CRITICAL: 0건 / 🟠 MAJOR: 0건 / 🟡 MINOR: 1건 / 🔵 SUGGESTION: 3건
→ 판정: APPROVED (9ad0aec 989줄은 SAMPL-2-27 별도 리뷰 필요)
```

## 검증 레인

| 레인 | 수행 | 결과 |
| --- | --- | --- |
| `code-reviewer` 1차 | ✅ | CHANGES_REQUESTED — 🔴1 / 🟠3 / 🟡9 / 🔵5 |
| 적대적 검증 (`critic`, "이 변경을 반증하라") | ✅ (1차 시도는 API 오류로 중단, 재실행) | REVISE — 🔴1 / 🟠4 추가 발견 |
| `code-reviewer` 재리뷰 | ✅ | APPROVED — 위 10건 전부 해소 확인 |
| 독립 모델 교차 리뷰 (gemini / codex) | ❌ **실행 불가** | 아래 참조 |

> ⚠️ **독립 모델 레인을 실행하지 못했다.** `gemini`는 `GOOGLE_CLOUD_PROJECT`/`GOOGLE_CLOUD_PROJECT_ID` 미설정으로 거부(`This account requires setting the GOOGLE_CLOUD_PROJECT ... env var`), `codex`는 vendor 바이너리 누락(`ENOENT: .../codex-darwin-arm64/vendor/aarch64-apple-darwin/codex/codex`)으로 실행 불가.
> 실행하지 않은 검증을 통과로 적지 않고, 적대적 검증 레인으로 대체했다. 결과적으로 그 레인이 1차 리뷰가 놓친 CRITICAL을 잡았다.

## 1차 리뷰 지적 — 전부 해소

### 🔴 C-1 커밋이 단독으로 성립하지 않음

HEAD에 `#soilImportBtn`도 `addImportedRecord`/`getNextNumberForClass`도 없었다. 버튼 마크업과 매니저 API가 **이전 세션의 미커밋 변경**으로 작업 트리에만 있었고, 같은 커밋에 들어간 E2E 8건은 클린 체크아웃에서 영구 실패 상태였다.

커밋 메시지가 근거로 든 "E2E 8건 pass"는 그 미커밋 트리에서만 재현되는 증거였다.

**조치**: 커밋을 재구성했다 (미푸시 상태라 rewrite 안전).

| 커밋 | 내용 |
| --- | --- |
| `9ad0aec` | landClass1·공익직불제 선행 작업 989줄 / 11파일 |
| `f0a8fc7` | 엑셀 가져오기 5단계 모달 — 위 커밋 위에서 자립 |

**검증**: `git worktree add --detach HEAD`로 클린 체크아웃 → `npm run build` 성공 → 빌드 산출물에 버튼 존재 → 단위 372 pass → typecheck 기준선 불변 → 가져오기 E2E 11/11 pass.

### 🟠 M-1 수동/자동 접수번호 혼재 시 미리보기 ≠ 실제 저장 번호

매니저 `addImportedRecord`는 레코드마다 `computeNextNumber`(max+1)로 재채번한다. 기존 최대 10에 수동 `50`을 저장하면 다음 자동번호는 미리보기가 보여준 `11`이 아니라 `51`이다.

**조치**: `computePreview`가 저장될 수동 번호만큼 커서를 올린다. 건너뛰는 중복 행·오류 행은 저장되지 않으므로 올리지 않는다.
**변이 검증**: 커서 상향을 제거하면 단위 3건 실패.

### 🟠 M-2 "덮어쓰기"가 덮어쓰지 않는다

`addImportedRecord`가 기존 레코드를 찾지 않고 `sampleLogs.push`만 하므로 같은 접수번호가 두 줄이 된다. 라디오 라벨이 사용자에게 거짓을 말했다.

**조치**: 라벨을 `그래도 추가 (같은 접수번호가 중복 등록됨)`로 수정. upsert 구현은 **SAMPL-1-152**.

### 🟠 M-3 파일 업로드·200행 경계·CSV 방어가 테스트 0건

단위 29건은 순수 계층만, E2E 11건은 전부 붙여넣기 모드였다. `csvCell`은 모달 메서드 안의 지역 함수라 테스트가 불가능했다.

**조치**:
- `soil-import-csv.ts` 별 모듈로 분리 + 단위 21건 (CSV 인젝션·RFC 4180 인용·BOM)
- 201행 오버플로 E2E (표 200행 / 저장 201건)
- 실제 `.xlsx` 업로드 E2E (다중 시트 전환 · 헤더 행 2행 지정)
- 헤더 없음 체크 E2E

### 🟡 함께 처리한 MINOR

| 항목 | 조치 |
| --- | --- |
| Mi-1 `STORAGE_KEY` 이중 소스 | `soil-script.ts`에서 `export`하고 모달이 import (단일 소스) |
| Mi-4 위임 클릭 핸들러 범위 | `closest`가 모달 조상까지 올라가므로 `m.contains(actEl)` 가드 추가 |
| Mi-6 커밋 중 중복 클릭 | 루프 진입 전 `importBtn.disabled = true` (수백 행이면 수 초 동기 실행) |

## 적대적 검증 지적 — 전부 해소

### 🔴 구분='성토' 행을 가져오면 전 행이 같은 접수번호로 저장된다

**단위 64건 + E2E 11건이 전부 통과하는 상태에서 발견됐다.**

성토는 `F` 접두의 별 시퀀스이고 전용 함수 `generateNextFillReceptionNumber`가 이미 있는데, `addImportedRecord`가 일반 채번만 호출했다. `computeNextNumber`는 `fill=false`일 때 `subCategory==='성토'` 로그를 제외하므로, 방금 저장한 성토 레코드가 풀에 안 들어가 카운터가 전진하지 않는다.

실측 재현 (성토 3행, 빈 저장소):

```text
미리보기: 1, 2, 3
실제저장: 1, 1, 1        ← 유일 1/3
저장 후 일반 다음번호: 1  ← 이후 수동 접수도 계속 1번
저장 후 성토 다음번호: F2 ← F 레코드가 없는데 F1을 건너뛴다
```

접수번호는 이 제품의 1차 식별자다(라벨 인쇄·흙토람 내보내기·대장 출력). 경고 없이 중복 대장이 만들어지고 자동채번이 영구 고정된다. 복구는 전 건 수동 재번호.

완화: Firestore docId는 `log.id`(UUID)이고 분석결과도 logId 키라 클라우드 덮어쓰기·분석결과 오결합은 없다.

**조치 — 양쪽 모두** (한쪽만 고치면 미리보기만 맞고 저장은 그대로다):

1. `soil-script.ts` `addImportedRecord` — `subCategory==='성토'`면 `generateNextFillReceptionNumber(landClass1)`로 분기
2. `soil-import-preview.ts` — 행별 성토 판정 + 독립 커서(`nextFillNumber`) + 독립 배치 집합. 일반 `5`와 성토 `F5`는 충돌이 아니다
3. `collectExistingNumbers(logs, class, {fill})` — `computeNextNumber`와 같은 분류 규칙
4. `soil-result-importer.ts` `_recompute` — 두 시퀀스를 다 조회해 넘긴다

**재리뷰가 두 규칙을 7단계로 한 줄씩 대조해 일치를 확인했다.** `.trim()` 비대칭 1건은 전 경우를 짚어 무해함을 확인(`' 5'`는 `parseInt`가 선행 공백 허용, `' F5'`는 양쪽에서 각각 제외).

**변이 검증**: 매니저 성토 분기를 되돌리면 E2E 3건이 `접수번호 중복: 1, 2, 2, 3`으로 실패.

### 🟠 CSV 인젝션 방어가 선행 탭·CR로 우회된다

`'=+-@|'.includes(s[0])`는 첫 글자만 본다. 엑셀은 셀 앞의 탭(0x09)·CR(0x0d)을 버리고 뒤를 수식으로 읽으므로 `\t=cmd|'/c calc'!A1`이 그대로 통과한다. 탭은 인용 트리거 목록에도 없어 무가공으로 나갔다.

**조치**: 선행 공백·제어문자를 벗긴 뒤 판정한다. 회귀 테스트 3건 추가.

### 🟠 E2E가 커밋 이후를 검증하지 않았다 — CRITICAL이 새어나간 이유

- 저장 단정 3곳 모두 메모리 배열(`sampleLogs`)만 읽었다 → `saveLogs()`를 통째로 no-op으로 만들어도 11건 전부 통과
- 접수번호 단정이 `not.toBe('')` / `not.toBe('null')`뿐 → 전 레코드에 `'1'`을 넣어도 통과. 그래서 위 `1,1,1`을 놓쳤다
- `beforeEach`가 매번 `localStorage.clear()` → 기존 레코드가 있는 상태를 한 번도 테스트하지 않았다

**조치**:
- `readPersisted()` — `page.reload()` → `localStorage` 파싱. 저장 no-op을 통과할 수 없다
- `expectUniqueReceptionNumbers()` — 빈값·`'null'`·중복 단정
- 정확 일치 단정으로 전환 (`toEqual(['F1','F2','F3'])`)
- 성토 전용 1건 · 일반·성토 혼재 1건 · 기존 레코드 시드 1건 추가

## 변이 검증 4회

테스트가 결함을 실제로 잡는지 매번 확인했다. 통과만으로는 증거가 되지 않는다.

| 되돌린 수정 | 결과 |
| --- | --- |
| 엔트리 `import` 제거 | E2E 8건 실패 → 배선을 실제로 검증 |
| `'null'` 수정 제거 | 단위 2건 실패 (`Received: "null"`) |
| M-1 커서 상향 제거 | 단위 3건 실패 |
| 매니저 성토 분기 제거 | E2E 3건 실패 (`접수번호 중복: 1, 2, 2, 3`) |

## 검증 실측 — 클린 워크트리(커밋된 코드만)

| 항목 | 결과 |
| --- | --- |
| `npm run build` | 성공, 빌드 산출물에 `#soilImportBtn` 존재 |
| 단위 (`vitest run`) | **385 pass** / 33 fail |
| E2E (`playwright test`) | **194 pass** / 5 fail, 가져오기 모달 14건 전원 pass |
| `tsc --noEmit` | 기존 오류 **714건 기준선 불변**, 신규 파일 4개 **0건** |

> `npm run typecheck`는 714건을 보고한다 — **통과가 아니다.** `typecheck:gate`(래칫)가 기준선 불변을 확인하는 방식이며, "게이트 통과"를 "타입 검사 통과"로 읽지 않도록 구분해 적는다.

기존 실패는 이번 작업과 무관하며 불변임을 확인했다:
- 단위 33건 — 암호화 테스트가 `require('../../src/shared/encryption-manager')`로 `.ts`를 해석하지 못함 (**SAMPL-2-26**). 해당 테스트 파일은 HEAD와 동일하고, 신규 파일을 뺀 baseline에서도 같은 33건이 실패
- E2E 5건 — `edit-test` · `form-submission` · `soil-form` · `theme-toggle`. 엔트리 배선을 제거한 상태에서도 동일하게 실패

## 남은 한계

- **독립 모델 교차 리뷰 미수행** (위 표 참조)
- **`9ad0aec`의 989줄은 코드 리뷰를 받지 않았다.** 이번 승인 범위 밖이며, 이번 🔴의 매니저 측 절반(`soil-script.ts` `addImportedRecord`)이 바로 그 커밋 안에 있다. **브랜치 머지 게이트는 SAMPL-2-27 완료를 조건으로 둘 것** — 이번 승인이 그 989줄을 승인한 것으로 읽히면 안 된다
- **Firestore 실계정 쓰기/읽기 미수행** — 운영 자격이 필요하고 실데이터에 영향을 준다

## 잔여 지적 (비차단)

**🟡 MINOR** — `'농가의뢰'` 리터럴이 3곳에 독립 선언(`reception-number.ts` `DEFAULT_LAND_CLASS` / `soil-import-mapping.ts` `LAND_CLASS1_DEFAULT` / `soil-script.ts` 지역 `const`). 현재 값은 같지만, **이번 🔴의 근본 원인이 정확히 "두 규칙이 어긋남"**이었고 지금은 주석 규약에 의존한다.

**🔵 SUGGESTION**
1. 분류 규칙을 공유 헬퍼(`receptionBaseKey(log, fill)`)로 묶어 드리프트를 구조적으로 차단
2. `getNextFillNumberForClass`를 추가해 일반 쪽과 대칭 맞추기 — 현재 `_recompute`가 로그를 찍는 `generateNextFillReceptionNumber`를 호출해 재계산마다 콘솔 노이즈
3. 문구 정정 — `SAMPL-1-154` 제목의 "조용히 버려짐"은 과장. 해당 행은 미리보기에서 `dup`로 표시되고 푸터 건수에도 잡힌다(다만 사용자가 정상 행인지 알 방법이 없다는 지적은 유효)

## 후속 티켓

| 티켓 | 내용 | 우선순위 |
| --- | --- | --- |
| **SAMPL-1-153** | **[운영] 메인에 같은 성토 결함** (`soil-script.js:853`에서 확인) | **1** |
| SAMPL-2-26 | 암호화 단위 테스트 33건 사망 | 2 |
| SAMPL-2-27 | `9ad0aec` 989줄 코드 리뷰 미수행 | 2 |
| SAMPL-1-154 | 서브넘버 행(`5-1`, `5-2`)이 중복 판정으로 버려짐 | 2 |
| SAMPL-1-151 | 메인의 미리보기 `'null'` 결함 | 3 |
| SAMPL-1-152 | upsert 미구현 + 대량 가져오기 O(n²) 저장 | 3 |
