<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# pesticide-analysis

## Purpose

잔류농약 시료에 대한 검출 결과를 입력받고 관리하는 분석 모듈. 다른 분석 모듈과 달리 고정된 분석 항목이 없으며, 시료별로 검출된 농약 목록을 동적으로 관리한다. 잔류농약 접수 데이터(`pesticideSampleLogs`)를 읽어와 각 시료의 검출 농약 목록(농약명, 측정값, 분석 방법 등)을 기록하고, 검출 여부(`allNd`: 비검출 또는 검출)에 따라 필터링/조회한 후 엑셀로 내보낸다.

## Key Files

| File | Description |
|------|-------------|
| `pesticide-analysis-entry.ts` | 진입점: XLSX, DOMPurify, 공유 모듈 + Firestore 임포트 |
| `pesticide-analysis-script.ts` | 핵심 로직: 검출 농약 목록 관리, 비검출 판정, 필터링, 엑셀 내보내기 |
| `pesticide-analysis-style.css` | UI 스타일 (테이블, 필터, 카드) |
| `index.html` | 페이지 구조: 연도 선택, 필터(검출/비검출/미검사), 검출 농약 테이블 |

## For AI Agents

### Working In This Directory

- **분석 항목**: 고정 항목 없음 - 시료별로 검출된 농약들을 동적 리스트로 관리
- **검출 데이터 구조**: `Detection` 객체 배열 (농약명, 측정값, 원액/희석/분석값, 장비, 분석 방법)
- **판정 체계**: `allNd` boolean으로 비검출(true)/검출(false) 표시 (합격/부적격 자동 판정 아님)
- **데이터 흐름**: `pesticideSampleLogs` 읽기 → 필터 선택 → 검출 결과 병렬 조회 → 테이블 렌더링 → 검출 농약 수정 → Firestore 저장 → 엑셀 내보내기
- **저장소**: Firestore의 `pesticideTestResults` 컬렉션 (IndexedDB 아님 - Firestore 백엔드 사용)
- **수정 주의**: Firestore 비동기 저장 로직, 검출 농약 추가/삭제/수정 시 UI 동기화

### Common Patterns

- **검출 목록 관리**: `detections` 배열에 농약 1건씩 추가/수정/삭제
- **필터링**: `filterStatus` ('all' | 'detected' | 'clean' | 'noResult')에 따라 테이블 행 필터링
- **비검출 판정**: `allNd` 체크박스로 검출 여부 일괄 변경
- **테이블 렌더링**: 시료 정보 + 검출 농약 목록(행 확장/축소 가능)
- **엑셀 내보내기**: 시료 + 검출 농약 정보를 2단계 구조로 내보내기
- **환경 감지**: `window.electronAPI?.isElectron`으로 Electron/Web 경로 분기
- **Firestore 연결**: `window.firebaseApp` 설정으로 클라우드 저장 구현

## Dependencies

### Internal

- `../pesticide/pesticide-script.ts` — 접수 데이터(`pesticideSampleLogs`) 읽기
- `../shared/firestore-db.ts` — Firestore 저장/조회 (IndexedDB가 아닌 클라우드 DB)
- `../shared/utils.ts` — 유틸함수 (날짜, 형식)
- `../shared/toast.ts` — 알림 메시지
- `../shared/theme.ts` — 다크/라이트 테마
- `../shared/firebase-config.ts` — Firebase 초기화 설정

### External

- `xlsx@^0.18.x` (또는 `xlsx-js-style@^0.4.14`) — 엑셀 생성
- `dompurify@^3.0.x` — HTML sanitization
- `firebase@^9.x` — Firestore 백엔드 연결
- DOM API (Firestore realtime listener)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
