<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# shared/

## Purpose
Electron과 웹 환경 모두에서 사용 가능한 공유 유틸리티, 상수, 데이터베이스 추상화, 보안 모듈들. FileAPI(파일 시스템 추상화), Firebase 연동, 암호화, 폼 검증, 저장소 관리, 검색·필터링, 페이지네이션, UI 헬퍼 등 시료 접수 대장 앱의 핵심 비즈니스 로직을 집중화합니다.

## Key Files
| File | Description |
|------|-------------|
| `constants.ts` | 중앙화된 상수 정의 (페이지네이션, 타이머, 유효성검사, 시료 타입, 저장소 한계) |
| `file-api.ts` | Electron/웹 파일 시스템 추상화 — 읽기/쓰기/대화상자, 재시도 로직, 경로 보안 검증 |
| `firebase-config.ts` | Firebase Firestore/Auth 초기화 및 설정 — 인증 파일 여부에 따라 온/오프라인 모드 전환 |
| `encryption-manager.ts` | 암호화 라이프사이클 관리 — PBKDF2 키 유도, 세션 비밀번호, 복구 blob |
| `crypto-utils.ts` | AES-GCM 암호화/복호화 유틸 — 레코드 암호화, 일괄 처리 |
| `firestore-db.ts` | Firestore 데이터베이스 래퍼 — CRUD, 배치 작업, 동기화 |
| `storage-manager.ts` | localStorage 관리 — 크기 제한 감시, 캐시 전략, 연도별 데이터 |
| `analysis-db.ts` | 분석 결과 DB (중금속·잔류농약·수질) — 조회 인터페이스 |
| `BaseSampleManager.ts` | 시료 관리 기본 클래스 — 접수/조회/삭제/내보내기/가져오기 |
| `form-validator.ts` | 폼 필드 유효성 검사 — 이름, 주소, 전화번호, 숫자, 날짜 |
| `excel-import-manager.ts` | Excel 파일 가져오기 — 시트 검색, 행 파싱, 샘플 생성 |
| `search-filter.ts` | 샘플 검색·필터링 — 이름, 주소, 연락처, 날짜 범위, 페이징 |
| `pagination.ts` | 페이지네이션 유틸 — 시작/끝 인덱스, 페이지 수 계산 |
| `PaginationManager.ts` | 페이지 상태 관리 — 현재 페이지, 항목 수, 정렬 |
| `VirtualListManager.ts` | 가상 리스트(대용량 렌더링) — 보이는 항목만 DOM에 생성 |
| `network-access.ts` | 네트워크 접근 제어 — API/Firebase 요청, 재시도 및 타임아웃 |
| `network-status.ts` | 네트워크 상태 모니터링 — 온/오프라인 감지 |
| `network-config.ts` | 네트워크 설정 (API 엔드포인트, 타임아웃) |
| `cache-manager.ts` | 캐시 관리 (API 응답, 자동 갱신) |
| `sanitize.ts` | XSS/주입 방지 — HTML 새니타이즈, URL 인코딩 |
| `path-security.ts` | 경로 보안 검증 — 경로 벗어남 방지, 절대경로 요구 |
| `address-parser.ts` | 주소 파싱 — 우편번호, 주소 분리 (구 카카오맵 연동) |
| `address.ts` | 주소 관리 고급 기능 |
| `pesticide-data.ts` | 잔류농약 종류 데이터 (선택 폼용) |
| `dom-utils.ts` | DOM 조작 헬퍼 — 요소 생성, 속성 설정, 이벤트 |
| `logger.ts` | 중앙화된 로거 — 레벨별 로깅(info, warn, error), 파일 저장 |
| `error-handler.ts` | 에러 처리 — 전역 예외 처리, 사용자 피드백 |
| `theme.ts` | 테마 관리 — 라이트/다크 모드, CSS 변수 갱신 |
| `toast.ts` | 토스트 알림 UI 생성 |
| `update-notifier.ts` | 앱 업데이트 알림 (Electron autoUpdater 연동) |
| `loading-manager.ts` | 로딩 상태 관리 — 스피너/프로그레스 바 |
| `secure-storage.ts` | 안전한 저장소 — safeStorage 래퍼 (Electron) |
| `auth-file.ts` | Firebase 인증 파일 관리 |
| `firebase-diagnostics.ts` | Firebase 진단 도구 |
| `firebase-migration-tool.ts` | Firebase 구성 마이그레이션 |
| `firebase-config-migration.ts` | Firebase 설정 마이그레이션 (compat → modular) |
| `csp-hash-generator.ts` | Content Security Policy 해시 생성 |
| `sync-utils.ts` | 데이터 동기화 유틸 — 로컬↔Firestore |
| `utils.ts` | 범용 유틸 — UUID, 날짜 포맷, 배열 정렬, 딥 카피 등 |
| `EventDelegator.ts` | 이벤트 위임 관리 (이벤트 버블링 최소화) |
| `tooltip.ts` | 툴팁 UI 헬퍼 |
| `tailwind-output.css` | Tailwind CSS 컴파일 산출물 |

## Subdirectories
없음 (flat 구조)

## For AI Agents
### Working In This Directory
- **constants.ts 수정**: 모든 매직 넘버를 여기에 중앙화 — 타입과 실제 값 동기화 필수
- **FileAPI 사용법**: `window.FileAPI.*()` 메서드 호출 — 경로 검증은 자동화됨
- **Firebase 설정**: `window.firebaseConfig` 또는 `window.firebaseDb` 객체 사용 — 모듈 로드 순서 준수 (firebase-config.ts → firestore-db.ts)
- **암호화 플로우**: `encryption-manager.init()` → `encryptionManager.getKey()` → `CryptoUtils.encryptRecord()`
- **시료 관리**: `BaseSampleManager` 상속 → 시료 타입별 구체 클래스 (SoilSampleManager 등)
- **네트워크**: `window.networkAccess.get/post()` — 자동 재시도 및 타임아웃
- **로깅**: `window.logger.info/warn/error()` — console 대신 사용
- **타입 안전성**: `types/globals.d.ts`와 `sample-types.d.ts` 참조 — 필요시 타입 추가

### Common Patterns
- **재시도 로직**: FileAPI 및 network-access에 내장 (지수 백오프) — 비즈니스 로직에서 재정의 금지
- **연도별 저장**: 모든 데이터는 `{key}_{year}` 패턴 (localStorage, JSON 파일명)
- **에러 처리**: try-catch + logger + 사용자 토스트 — 에러를 무시하지 말 것
- **대용량 렌더링**: `VirtualListManager` 사용 (1000+ 행) — DOM 전체 생성 금지
- **동기화**: Firestore + localStorage 이중 저장 — 온라인 우선, 오프라인 폴백
- **폼 검증**: `form-validator.validate*(field, value)` — 정규식 수정 금지 (constants 참조)

## Dependencies
### Internal
- `types/globals.d.ts`, `types/sample-types.d.ts`, `types/settings-types.d.ts` — 전역 타입
- `assets/` — 아이콘(필요 시)

### External
- **firebase** (compat & modular) — Authentication, Firestore, Storage
- **xlsx** — Excel 파일 읽기 (excel-import-manager.ts)
- **crypto-js** (또는 Web Crypto API) — 암호화
- **date-fns** (또는 네이티브 Date) — 날짜 포맷

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
