<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# assets/

## Purpose
정적 자산 저장소 — 아이콘, 이미지, 로고 등 UI에 사용되는 미디어 파일을 관리합니다.

## Key Files
없음 (icons 하위 폴더만 존재)

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `icons/` | 애플리케이션 아이콘 파일 (Electron, 웹, 타입별 등) |

## For AI Agents
### Working In This Directory
- **자산 추가**: `icons/` 하위에만 저장 — 파일명은 kebab-case (예: `add-sample.svg`)
- **이미지 포맷**: SVG 우선 (확장성), PNG는 256px 이상 — 최적화 필수
- **참조 경로**: HTML/CSS에서 `/assets/icons/filename.svg` 또는 상대경로 `../../assets/icons/filename.svg`
- **Electron 아이콘**: `icons/` 하위의 OS별 아이콘 (macOS: .icns, Windows: .ico)

### Common Patterns
- **인라인 SVG**: HTML에 직접 `<svg>...</svg>` 임베드 (색상 제어 용이)
- **배경 이미지**: CSS `background-image: url('../../assets/icons/...')`
- **동적 색상**: CSS 변수 사용 (--color-primary 등) — SVG fill="currentColor" 권장

## Dependencies
### Internal
- `src/` — HTML, CSS (경로 참조)

### External
- 없음

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
