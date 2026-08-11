# SAMPL-2-29 실행 계획 — 산출물·운영 상태 추적 제외

## 1단계 — 현재 상태 실측
```bash
git ls-files test-results | wc -l          # 추적 중인 산출물 수
git ls-files .omc | wc -l
ls -d .omc/skills 2>/dev/null              # negation 대상 존재 여부
```
`.omc/skills/`가 없으면 negation 규칙은 미래 대비로만 둔다(무해하나 검증 대상에서 제외).

## 2단계 — `.gitignore` 규칙 추가
```gitignore
# Playwright 실행 산출물
test-results/
playwright-report/

# OMC 오케스트레이션 운영 상태 (.omc/skills/**는 프로젝트 스코프 스킬 — 커밋 대상)
.omc/
!.omc/skills/
!.omc/skills/**
src/shared/.omc/

# 빌드가 src/manual/images/(추적 중)에서 복사하는 산출물
docs/manual/images/
```

## 3단계 — 인덱스에서 추적 해제
`.gitignore`는 추적 중인 파일에 효과가 없다. 파일은 디스크에 남기고 인덱스에서만 뺀다.
```bash
git rm -r --cached --quiet test-results
git rm -r --cached --quiet .omc     # .omc/skills가 있으면 그것만 되살린다
```

## 4단계 — 검증 (통과 조건)
| 검증 | 기대 |
| --- | --- |
| `git check-ignore -v test-results/x` | 규칙에 걸린다 |
| `git check-ignore -v .omc/state/x` | 규칙에 걸린다 |
| `git check-ignore -v docs/manual/images/01-main.png` | 규칙에 걸린다 |
| `git check-ignore .omc/skills/foo` | **걸리지 않는다** (negation 동작) |
| `ls test-results` | 파일이 남아 있다 (인덱스만 제거) |
| `npm run build` 후 `git status --short` | 깨끗하다 |
| `npx playwright test` 후 `git status --short` | 깨끗하다 |
| `npx vitest run` | 385 pass / 33 기존 실패 (불변) |
| `npm run typecheck:gate` | 714 기준선 불변 |

## 5단계 — 커밋
`git rm --cached`가 다른 클론에서 pull 시 해당 파일을 **삭제**한다는 사실을 커밋 메시지에 명시한다.

## 되돌리기
`.gitignore` 되돌리고 `git add test-results .omc`로 재추적. 파일이 디스크에 남아 있으므로 손실 없음.

## 하지 않을 것
- 메인 프로젝트 `.gitignore` 수정 (별 저장소, 별 판단)
- `src/manual/images/`(원본) 건드리기 — 추적 유지
- `docs/*/index.html` 등 의도적으로 추적하는 빌드 산출물 제외 (GitHub Pages 배포에 필요)
