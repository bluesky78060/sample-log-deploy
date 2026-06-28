<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# src/

## Purpose
Electron 메인 프로세스, 렌더러 프로세스 초기화, 공통 HTML/스타일 자산, 시료 타입별 기능 페이지들을 포함하는 애플리케이션의 핵심 소스 디렉터리. 시료 접수 대장(봉화군 농업기술센터용) Electron 앱의 진입점 및 UI 구성을 담당합니다.

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | Electron 메인 프로세스 — 창 관리, IPC 핸들러(파일 대화상자, 읽기/쓰기), 환경 설정, auto-updater |
| `preload.ts` | Electron preload 스크립트 — 렌더러에 안전한 electronAPI 노출 (Context Isolation) |
| `main-entry.ts` | 공유 모듈 초기화 진입점 — shared 모듈들 동적 로드 |
| `index.html` | 메인 페이지 — 시료 타입 선택, 상단 바(동기화·설정·릴리즈·매뉴얼·테마), 파티클 효과 |
| `index.ts` (모듈) | 메인 페이지 렌더러 스크립트 — localStorage 로드, 시료 타입 네비게이션, 이벤트 처리 |
| `index.css`, `index-styles.css`, `style.css` | 글로벌 스타일 — 파티클, 상단 바, 폼, 테이블, 모달, 반응형 레이아웃 |
| `bonghwaData.ts` | 봉화군 행정구역 데이터 (자동완성용) |
| `cropData.ts` | 작물 데이터 (입력 폼 선택지) |
| `clear-cache.html` | 브라우저 캐시 초기화 페이지 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `shared/` | 공통 유틸·상수·FileAPI 추상화, Firebase, 암호화, 폼 검증 (see `shared/AGENTS.md`) |
| `types/` | TypeScript 전역 타입 정의, 시료·설정 인터페이스 (see `types/AGENTS.md`) |
| `styles/` | Tailwind 설정 및 테마 색상 (see `styles/AGENTS.md`) |
| `assets/` | 아이콘 등 정적 자원 (see `assets/AGENTS.md`) |
| `soil/` | 토양 시료 관리 페이지 |
| `water/` | 수질분석 시료 관리 페이지 |
| `compost/` | 퇴·액비 시료 관리 페이지 |
| `heavy-metal/` | 토양 중금속 시료 관리 페이지 |
| `heavy-metal-analysis/` | 중금속 분석 결과 조회 기능 |
| `pesticide/` | 잔류농약 시료 관리 페이지 |
| `pesticide-analysis/` | 잔류농약 분석 결과 조회 기능 |
| `label-print/` | 시료 라벨 인쇄 기능 |
| `settings/` | 앱 설정 페이지 (Firebase 인증, 비밀번호, 저장 폴더) |
| `release/` | 릴리즈 노트 페이지 |
| `manual/` | 사용 설명서 페이지 |
| `dist/` | 빌드 산출물 (타입스크립트 컴파일 결과) — 수정 금지 |

## For AI Agents
### Working In This Directory
- **Electron main process 수정**: 반드시 `index.ts` 주석 규칙 준수 — IPC 핸들러 rate limiting (파일: 10/sec, 일반: 30/sec), 보안 경로 검증 필수
- **preload.ts 수정**: Context Isolation 유지 — window 객체에만 노출, ipcRenderer 직접 노출 금지
- **메인 HTML/스타일**: tailwind 클래스 우선, CSS 직접 쓰기는 변수 기반 (--color-primary 등) — 다크/라이트 테마 호환
- **전역 상수 변경**: `shared/constants.ts`에서 중앙화 — 하드코딩 금지
- **환경 감지**: `window.electronAPI?.isElectron` 또는 `window.electronAPI?.isElectron === true`로 통일

### Common Patterns
- **시료 타입 폴더 구조**: 모두 `{type}/index.html`, `{type}/{type}-script.ts`, `{type}/{type}-style.css` 패턴 — 새 타입 추가 시 동일하게 복제
- **IPC 통신**: preload API `window.electronAPI.*()`로 호출 (파일 대화, 읽기, 쓰기, 자동 저장 경로)
- **연도별 데이터**: localStorage 키는 `{STORAGE_KEY_PREFIX}_{year}` (예: `soilSampleLogs_2026`)
- **JSON 내보내기**: 파일명 `auto-save-{type}-{year}.json` — 버전 헤더 포함
- **에러 처리**: `window.logger.error()` + 사용자 토스트 피드백 — 재시도 로직은 FileAPI에 위임

## Dependencies
### Internal
- `shared/` — FileAPI(파일 시스템 추상화), firebase-config, encryption-manager, storage-manager, form-validator, constants
- `types/` — 전역 타입(ElectronAPI, Sample*, Settings), utility types
- `styles/` — tailwind-output.css, theme-colors.css

### External
- **electron** — main process, BrowserWindow, ipcMain, dialog, safeStorage, autoUpdater
- **electron-updater** — 자동 업데이트 (GitHub Releases)
- **firebase/compat** — Firestore DB, Authentication
- **Node.js** — path, fs, http, crypto (main process only)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
