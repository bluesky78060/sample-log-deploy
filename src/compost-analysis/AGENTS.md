<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# compost-analysis

## Purpose

퇴·액비 시료에 대한 분석 결과를 입력받고 관리하는 분석 모듈. 퇴·액비 접수 데이터(`compostSampleLogs`)를 읽어와 가축분퇴비·액비 공정규격 기준(함수율, 부숙도, 염분, 구리, 아연)에 따라 분석 결과를 기록하고, 합격/부적격 판정을 자동 계산한 후 엑셀로 내보낸다.

## Key Files

| File | Description |
|------|-------------|
| `compost-analysis-entry.ts` | 진입점: XLSX, shared 모듈 임포트 |
| `compost-analysis-script.ts` | 핵심 로직: 분석 데이터 입력/수정, 판정 계산, 엑셀 내보내기 |
| `compost-analysis-style.css` | UI 스타일 (테이블, 폼, 버튼) |
| `index.html` | 페이지 구조: 연도 선택, 시료 목록 테이블, 일괄 입력 폼 |

## For AI Agents

### Working In This Directory

- **분석 항목**: 5개 고정 필드 (`moisture`, `maturity`, `salinity`, `copper`, `zinc`) + 판정(`judgment`)
- **데이터 흐름**: `compostSampleLogs` 읽기 → 테이블 렌더링 → 분석결과 입력 → IndexedDB 저장 → 엑셀 내보내기
- **저장소**: IndexedDB의 `compostTestResults` 스토어 (연도별 독립 저장)
- **일괄 입력**: 선택된 행들에 검사 날짜/판정 값을 한 번에 적용
- **수정 주의**: 테이블 렌더링 로직(`renderTable`)과 IDB 저장 로직(`_saveToDB`) 의존성 확인

### Common Patterns

- **필드 정의**: `ALL_COMPOST_RESULT_FIELDS` 배열로 분석 항목 관리 (label, unit, type)
- **테이블 렌더링**: 접수 데이터 + 분석결과 병합하여 동적 테이블 생성
- **셀 포커스**: `focusedCell` 추적으로 키보드 네비게이션 지원
- **엑셀 내보내기**: `XLSX.utils.aoa_to_sheet()` + 병합 셀, 스타일 적용
- **환경 감지**: `window.electronAPI?.isElectron`으로 Electron/Web 경로 분기

## Dependencies

### Internal

- `../compost/compost-script.ts` — 접수 데이터(`compostSampleLogs`) 읽기
- `../shared/analysis-db.ts` — IndexedDB 저장/조회
- `../shared/utils.ts` — 유틸함수 (날짜, 형식)
- `../shared/toast.ts` — 알림 메시지
- `../shared/theme.ts` — 다크/라이트 테마

### External

- `xlsx-js-style@^0.4.14` — 스타일 적용 엑셀 생성
- DOM API (localStorage, IndexedDB)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
