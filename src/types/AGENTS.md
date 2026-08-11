<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# types/

## Purpose
TypeScript 전역 타입 정의와 인터페이스 중앙화. Electron API 확장, 시료 데이터 구조(토양·수질·퇴액비·중금속·잔류농약), 설정, 유틸리티 타입을 정의하여 애플리케이션 전체에 타입 안전성을 제공합니다.

## Key Files
| File | Description |
|------|-------------|
| `globals.d.ts` | Window 전역 인터페이스 확장 — ElectronAPI(파일 대화, 읽기/쓰기, 암호화), 모듈 객체(logger, firebaseConfig, firebaseDb, encryptionManager, FileAPI 등) 타입 |
| `sample-types.d.ts` | 시료 데이터 구조 — BaseSample, SoilSample, WaterSample, CompostSample, HeavyMetalSample, PesticideSample 인터페이스 및 type aliases |
| `settings-types.d.ts` | 설정 관련 타입 — AppSettings, UserProfile, NotificationSettings, StorageSettings, ThemeSettings |
| `utility-types.d.ts` | 유틸리티 타입 — Nullable<T>, Optional<T>, Result<T, E>, PagedResult<T> 등 |
| `firebase-compat.d.ts` | Firebase compat API 타입 보충 — TypeScript와 Firebase compat 버전 호환성 개선 |

## Subdirectories
없음 (flat 구조)

## For AI Agents
### Working In This Directory
- **타입 추가 시**: interface/type keyword 사용, JSDoc 주석 필수 — 설명은 한 줄 이상
- **window 확장**: `globals.d.ts`에서만 Window 인터페이스 수정 — 다른 파일에서 declare global 금지
- **샘플 타입 추가**: `BaseSample` 상속 또는 공통 필드 포함 — id, date, receptionNumber, name은 필수
- **설정 타입**: `AppSettings` 상속 — 새 설정 필드는 마이그레이션 로직 추가 필요
- **타입 호환성**: 실제 런타임 코드와 동기화 필수 — 타입만 정의하고 구현 불일치 금지

### Common Patterns
- **샘플 타입 구조**: `BaseSample` → 개별 필드 정의 (SoilSample, WaterSample 등 각각 다름)
- **선택적 필드**: `?: type` (예: `phoneNumber?: string`)
- **리터럴 타입**: 고정 문자열(예: `'soil' | 'water' | 'compost'`) — constants.ts와 일치 필수
- **Result<T, E> 패턴**: 비동기 작업 반환형 — `{ success: T } | { error: E }`
- **제네릭 활용**: `PagedResult<T>` = `{ data: T[], total: number, page: number }`

## Dependencies
### Internal
- `shared/constants.ts` 참조 — 타입에서 리터럴 문자열 정의 시 constants 값과 일치 확인

### External
- **Firebase compat types** — firebase.d.ts
- **TypeScript** — 내장 타입 (Record, Partial, Pick 등)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
