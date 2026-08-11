<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# water-analysis

## Purpose

수질 시료에 대한 분석 결과를 입력받고 관리하는 분석 모듈. 지하수법 시행규칙 [별표 9] 기준에 따라 21개 분석항목(일반오염물질 6개 + 특정유해물질 11개 + 생활용수 전용 4개)을 관리한다. 수질 접수 데이터(`waterSampleLogs`)를 읽어와 여러 채수지점과 시료별로 분석 결과를 기록하고, 목적(생활용수/농업용수)별 합격/부적격 판정을 자동 계산한 후 엑셀로 내보낸다.

## Key Files

| File | Description |
|------|-------------|
| `water-analysis-entry.ts` | 진입점: XLSX, shared 모듈 임포트 |
| `water-analysis-script.ts` | 핵심 로직: 다중 채수지점 처리, 21개 항목 관리, 목적별 기준 적용, 판정 계산 |
| `water-analysis-style.css` | UI 스타일 (테이블, 드롭다운, 폼) |
| `index.html` | 페이지 구조: 연도 선택, 목적 필터, 채수지점 탭, 시료 테이블 |

## For AI Agents

### Working In This Directory

- **분석 항목**: 21개 고정 필드 (`WATER_QUALITY_FIELDS`) - 각 항목은 생활용수/농업용수/산업용수 기준 포함
- **목적별 처리**: `purpose` 값에 따라 표시/평가 기준 달라짐 (생활용수 21개, 농업용수 17개)
- **채수지점**: 시료 1건이 여러 채수지점 데이터를 가지므로, `samplingLocations` 배열로 플랫화하여 각각 행 생성
- **데이터 흐름**: `waterSampleLogs` 읽기 → 채수지점별 플랫화 → 테이블 렌더링 → 분석결과 입력 → IndexedDB 저장 → 엑셀 내보내기
- **저장소**: IndexedDB의 `waterTestResults` 스토어 (연도별 독립 저장)
- **수정 주의**: 플랫화 로직(`_flattenSampleLogs`)과 역매핑 로직 의존성 확인, 채수지점 추가/삭제 시 결과 동기화

### Common Patterns

- **필드 정의**: `WATER_QUALITY_FIELDS` 배열로 21개 항목 관리 (label, unit, group, living/agri/industry 기준)
- **플랫화**: 1개 시료 → N개 채수지점 → N개 행으로 확장 (`FlatRow`의 `locationIdx`, `location`, `sampleName`)
- **기준 변환**: 목적에 따라 동적으로 표시되는 기준값 변경 (예: 생활용수만 벤젠/톨루엔/에틸벤젠/크실렌 표시)
- **테이블 렌더링**: 채수지점별 부분 병합 + 복합 헤더 (항목명 + 단위 + 기준)
- **환경 감지**: `window.electronAPI?.isElectron`으로 Electron/Web 경로 분기

## Dependencies

### Internal

- `../water/water-script.ts` — 접수 데이터(`waterSampleLogs`) 읽기
- `../shared/analysis-db.ts` — IndexedDB 저장/조회
- `../shared/utils.ts` — 유틸함수 (날짜, 형식)
- `../shared/toast.ts` — 알림 메시지
- `../shared/theme.ts` — 다크/라이트 테마

### External

- `xlsx-js-style@^0.4.14` — 스타일 적용 엑셀 생성
- DOM API (localStorage, IndexedDB)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
