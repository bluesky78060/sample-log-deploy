# SAMPL-2-29 방향 — 산출물·운영 상태 추적 제외

- 분류: 저장소 위생(설정 변경). 런타임 코드 변경 없음
- 규모: `.gitignore` 8줄 + 인덱스에서 추적 해제

## 목표 (Why)
테스트를 돌리거나 세션을 열거나 빌드할 때마다 작업 트리가 dirty해진다. **dirty한 트리는 `git add -A`를 위험하게 만들고 무엇이 실제 변경인지 가린다.**

실제로 사고가 났다 — SAMPL-1-124 작업 중 `git add -A`로 `docs/manual/images/*.png` 9개(1.5MB)와 OMC 상태 파일이 커밋에 딸려 들어갔다(발견 후 `git rm --cached`로 걷어냄). 이 티켓은 그 재발을 막는다.

## 사용자 (Who)
이 저장소에서 작업하는 사람과 에이전트. 커밋 범위를 눈으로 확인해야 하는 모든 경우.

## 범위 (What)
| 경로 | 성격 |
| --- | --- |
| `test-results/`, `playwright-report/` | Playwright 실행 산출물 (현재 **추적 중**) |
| `.omc/` (단 `.omc/skills/**` 제외) | OMC 오케스트레이션 운영 상태 |
| `src/shared/.omc/` | 잘못된 위치에 생긴 상태 |
| `docs/manual/images/` | 빌드가 `src/manual/images/`에서 복사하는 산출물 |

범위 밖: 메인 프로젝트(별 저장소, 이미 `docs/assets/`를 ignore하는 선례가 있다).

## 제약
- `.gitignore`는 **이미 추적 중인 파일에 효과가 없다** → `git rm -r --cached`가 반드시 함께 필요하다
- `.omc/skills/**`는 프로젝트 스코프 스킬로 **의도적 커밋 대상**이다(전역 CLAUDE.md) → negation 규칙이 실제로 동작하는지 검증해야 한다
- `git rm --cached`를 커밋하면 **다른 클론에서 pull 시 그 파일이 삭제된다**. 산출물이라 무해하지만 커밋 메시지에 명시한다

## 리스크
- negation(`!.omc/skills/`)이 상위 디렉터리 ignore 때문에 동작하지 않는 git 함정 → `git check-ignore -v`로 실측한다
- `docs/manual/images/`를 ignore한 뒤 원본(`src/manual/images/`)까지 잃는 실수 → 원본은 추적 중임을 확인하고 건드리지 않는다

## 검증
- `npx playwright test` / `npm run build` 후 `git status --short`가 깨끗하다
- `git check-ignore -v`로 각 규칙이 걸리는지, `.omc/skills/`는 걸리지 않는지 확인
- 인덱스 제거가 파일을 지우지 않았음을 확인

## 방향 확정
플랜 리뷰는 **생략한다** — 사용자 지시("코드 수정이나 중요가 낮은 작업은 플랜리뷰하지말고 진행"), 런타임 동작 변경이 없는 설정 변경이다. 생략 사실을 `SAMPL-2-29-plan-review.md`에 기록한다.
