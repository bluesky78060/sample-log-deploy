# SAMPL-2-29 코드 리뷰 — 산출물·세션 상태 추적 제외

- 대상 커밋: `56436c2`
- 1차 판정 **CHANGES_REQUESTED** (🔴0 / 🟠2 / 🟡2 / 🔵1) → 4건 전부 수정
- 최종: **APPROVED** (아래 수정 확인 근거)

## 플랜 리뷰
**생략했다** — 사용자 지시(중요도 낮은 설정 변경). 상세는 `SAMPL-2-29-plan-review.md`.
독립 모델 교차 리뷰도 실행 불가 상태다(gemini `GOOGLE_CLOUD_PROJECT` 미설정, codex vendor 바이너리 `ENOENT`).

## 계획을 실측으로 두 번 기각했다

이 티켓의 실질은 규칙을 쓰는 것이 아니라 **무엇이 산출물이고 무엇이 문서인지 가려내는 것**이었다.

| # | 계획 | 실측 | 조치 |
| --- | --- | --- | --- |
| 1 | `.omc/` 통째 ignore + `git rm -r --cached .omc` | `git ls-files .omc` = 15개, 그중 **12개가 의도적으로 커밋된 문서·스크립트·skills** | 일회성 상태 경로만 좁혀 지정 |
| 2 | `playwright-report/`는 ignore 규칙만 | **11개가 추적 중** — `git check-ignore`가 "추적 대상"으로 보고한 것이 단서 | 함께 인덱스 해제 |

계획대로 했다면 프로젝트 스코프 스킬 3개와 완료 보고서·복구 스크립트가 추적에서 빠졌다.

## 코드 리뷰 지적 — 4건 전부 수정

### 🟠 M-1 `.omc/notepads/` ignore는 걷어낸 것 0건인데 실재 문서를 숨겼다

실측:
- 인덱스에서 제거된 notepads 파일 **0개**
- `.omc/notepads/SAMPL-1-72/learnings.md`가 조용히 비가시화 (`git status` 무반응, `git add` 거부)
- 그 파일은 8줄짜리 실질 기록이다 — Dexie 싱글톤 테스트 격리, `fake-indexeddb/auto` 필요, 키 매핑 regex `(?:test_)?`, **사전 실패 33건의 출처**(SAMPL-2-26과 교차 확인됨)
- OMC 런타임 경로는 전역 CLAUDE.md 기준 `.omc/notepad.md`(**단수 파일**)이고 실제로 존재하지 않는다 → `.omc/notepads/`(복수 디렉터리)는 산출물 경로가 아니라 이 저장소의 문서 디렉터리다

통짜 `.omc/`를 옳게 거부한 것과 **동일한 오분류가 한 단계 아래에서 재발**했다.

**조치**: 규칙 삭제. `learnings.md`를 커밋에 포함.

### 🟠 M-2 `ai-pm-context.json`은 일회성 상태가 아니다

추적 중인 문서 **3곳이 참조**하며 이 커밋에서 갱신되지 않는다:

| 참조자 | 위치 |
| --- | --- |
| `CLAUDE.md:116` | "컴팩션 후에도 ai-pm 컨텍스트를 유지하려면 `.omc/state/ai-pm-context.json`을 참조하세요" |
| `.omc/AI-PM-SETUP.md:12` | "### 1. 영구 보존된 정보 위치" 하위 |
| `.omc/AI-PM-SETUP.md:38` | 복구 방법 2: `cat .omc/state/ai-pm-context.json` |
| `.omc/scripts/restore-ai-pm-context.sh:5` | `CONTEXT_FILE=".omc/state/ai-pm-context.json"` |

내용도 런타임 상태가 아니다 — `project_id`, 8개 에픽 ID와 `"completed"` 상태, 손으로 쓴 완료 기록이다.

**조치**: `!.omc/state/ai-pm-context.json` 예외 + 추적 복원.

> `.omc/state/`(디렉터리 형태)가 아니라 `.omc/state/*`(별표)를 써야 한다. 디렉터리를 ignore하면 git이 그 안으로 내려가지 않아 `!` 예외가 **동작하지 않는다**. `check-ignore`로 실측 확인했다.

같은 디렉터리의 `ultrapilot-state.json`·`ultrawork-state.json`은 참조자 0건(전수 grep)으로 정상 제외.

### 🟡 M-3 `docs/manual/images/` 주석이 사실과 달랐다

- 이 경로는 **현재 존재하지 않는다**
- `docs/manual/index.html`의 `images/` 참조 **0건** (`src/manual/index.html`은 4건)
- 이 프로젝트 Vite는 설명서 이미지를 `docs/assets/`로 해시 처리한다
- `emptyOutDir`가 매 빌드 `docs/`를 비운다

주석 "빌드가 `src/manual/images/`에서 복사하는 산출물"은 **메인 프로젝트 동작**이었다.

**조치**: 보호는 유지하되(SAMPL-1-124에서 이 경로의 낡은 PNG 9개가 실제로 커밋에 딸려 들어갔고, 메인↔테스트 동기화로 재유입될 수 있다) 주석을 사실대로 고쳤다. 규칙을 지우면 실제 사고가 있었던 경로의 보호가 사라진다.

### 🟡 M-4 `.claude/active-ticket` 분기

메인은 추적 중, 테스트는 이제 ignore. 참조자 0건, 11바이트 세션 포인터.
분기 자체는 타당하나 동기화 시 되돌려질 위험이 있다 → **주석에 "메인은 추적 중 — 의도적 분기, 동기화 시 되돌리지 말 것"**을 남겼다.

### 🔵 S-5 범위 외 (기록만)

`.gitignore:106`의 `docs/assets/`도 ignore + 추적 중(18개)이라 같은 add-차단 함정이 있다. 메인 CLAUDE.md가 경고하는 v1.17.7 / SAMPL-2-22 사고(`src/`만 커밋 → Pages 404)와 메커니즘이 겹친다. 이 티켓이 만든 문제가 아니라 범위 외.

## 검증 실측

| 항목 | 결과 |
| --- | --- |
| **테스트·빌드 실행 후 새 dirty 항목** | **0건** — 이 티켓의 핵심 목적 |
| `git check-ignore` 무시돼야 하는 11건 | 전부 무시 ✓ |
| `git check-ignore` 무시되면 안 되는 6건 | 전부 추적 대상 유지 ✓ (`ai-pm-context.json`, `notepads/` 신규 하위 포함) |
| 인덱스 제거가 파일을 지웠는지 | 지우지 않음 확인 (`playwright-report/`, `test-results/.last-run.json`, `.omc/state` 전원 생존) |
| 단위 | 385 pass / 33 기존 실패(SAMPL-2-26, 불변) |
| E2E | 14 pass |
| typecheck 게이트 | 714 기준선 불변 |
| 빌드 | 성공 |

## 주의 (커밋 메시지에도 명시)
`git rm --cached` 커밋을 pull하면 그 14개 파일이 **로컬에서 삭제된다**. 전부 산출물이라 무해하다. 데이터 유실 없음 — `ai-pm-context.json`은 추적 복원했고, 같은 정보가 추적 중인 `.omc/scripts/quick-restore-ai-pm.sh`와 `AI-PM-SETUP.md`에 인라인으로도 있다.
