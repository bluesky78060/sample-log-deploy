<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# styles/

## Purpose
Tailwind CSS 설정 및 글로벌 테마 색상 정의. 애플리케이션의 CSS 전처리 파일을 관리하며, 빌드 시 `tailwind-output.css`로 컴파일됩니다. 시료 타입별 색상 테마(토양: 초록, 중금속/잔류농약: 보라 등)를 CSS 변수로 정의합니다.

## Key Files
| File | Description |
|------|-------------|
| `input.css` | Tailwind CSS 입력 파일 — @tailwind base/components/utilities 지시문, 테마 색상 임포트 |
| `theme-colors.css` | 페이지별 테마 색상 (CSS 변수) — --color-primary 기본값 및 data-sample-type별 오버라이드|

## Subdirectories
없음

## For AI Agents
### Working In This Directory
- **input.css 수정**: Tailwind 지시문만 추가 — 직접 스타일 작성 금지 (output.css 사용)
- **theme-colors.css 수정**: CSS 변수 정의만 — --color-primary 중심으로 스타일 추가 (data-sample-type별 색상 유지)
- **컴파일 실행**: `npm run build:css` 또는 `npm start` 시 자동 컴파일
- **output.css 편집 금지**: 재생성 시 손실됨 — input.css 또는 HTML inline 스타일로 정의

### Common Patterns
- **Tailwind 클래스 우선**: HTML에서 `class="bg-green-500 text-white"` — CSS 변수는 필요 시만
- **색상 테마**: `[data-sample-type="soil"]` 선택자로 토양용 초록, `[data-sample-type="heavy-metal"]` 선택자로 중금속용 보라 (data 속성 기반)
- **다크 모드**: `body[data-theme="dark"]` 또는 `html.dark` 클래스 (theme.ts에서 동적 적용)
- **성능**: 필요 이상으로 CSS 변수 생성 금지 — 호스트(root) 및 타입별 선택자에만 정의

## Dependencies
### Internal
- `shared/` — theme.ts (테마 토글 로직, CSS 변수 적용)
- `src/` — index.html, 시료 타입 페이지 (data-sample-type 속성 설정)

### External
- **Tailwind CSS** — 입력 파일 컴파일, PostCSS 처리
- **PostCSS** — CSS 변수 확장 (필요 시)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
