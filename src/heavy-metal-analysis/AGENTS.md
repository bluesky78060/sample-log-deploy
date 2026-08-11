<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# heavy-metal-analysis

## Purpose

토양 중금속 시료에 대한 분석 결과를 입력받고 관리하는 분석 모듈. 토양환경보전법 시행규칙 기준에 따라 8개 중금속 항목(카드뮴, 구리, 비소, 수은, 납, 6가크롬, 아연, 니켈)을 관리한다. 중금속 접수 데이터(`heavyMetalSampleLogs`)를 읽어와 각 시료의 분석 결과를 기록하고, 용도별 기준(3단계: 1등급, 2등급, 3등급)에 따라 합격/부적격 판정을 자동 계산한 후 엑셀로 내보낸다.

## Key Files

| File | Description |
|------|-------------|
| `heavy-metal-analysis-entry.ts` | 진입점: XLSX, shared 모듈 임포트 |
| `heavy-metal-analysis-script.ts` | 핵심 로직: 8개 항목 관리, 3단계 기준 적용, 판정 계산, 일괄 입력 |
| `heavy-metal-analysis-style.css` | UI 스타일 (테이블, 폼, 버튼) |
| `index.html` | 페이지 구조: 연도 선택, 시료 목록 테이블, 일괄 입력 폼 |

## For AI Agents

### Working In This Directory

- **분석 항목**: 8개 고정 필드 (`HEAVY_METAL_FIELDS`) - 각 항목은 3단계 기준값(standard1, standard2, standard3) 포함
- **기준 체계**: 용도별 3등급(1등급: 농경지, 2등급: 대지, 3등급: 산림지) 적용
- **데이터 흐름**: `heavyMetalSampleLogs` 읽기 → 테이블 렌더링 → 분석결과 입력 → IndexedDB 저장 → 엑셀 내보내기
- **저장소**: IndexedDB의 `heavyMetalTestResults` 스토어 (연도별 독립 저장)
- **일괄 입력**: 선택된 행들에 검사 날짜/판정 값을 한 번에 적용
- **수정 주의**: 판정 로직(`_judgeAllFields`)과 기준 적용 순서 확인

### Common Patterns

- **필드 정의**: `HEAVY_METAL_FIELDS` 배열로 8개 항목 관리 (label, unit, 3단계 기준값)
- **테이블 렌더링**: 접수 데이터 + 분석결과 병합하여 동적 테이블 생성
- **셀 포커스**: `focusedCell` 추적으로 키보드 네비게이션 지원
- **일괄 판정**: 선택된 행 모두에 동일한 판정값 적용 후 IDB 저장
- **엑셀 내보내기**: `XLSX.utils.aoa_to_sheet()` + 병합 셀, 색상 강조 (합격/부적격)
- **환경 감지**: `window.electronAPI?.isElectron`으로 Electron/Web 경로 분기

## Dependencies

### Internal

- `../heavy-metal/heavy-metal-script.ts` — 접수 데이터(`heavyMetalSampleLogs`) 읽기
- `../shared/analysis-db.ts` — IndexedDB 저장/조회
- `../shared/utils.ts` — 유틸함수 (날짜, 형식)
- `../shared/toast.ts` — 알림 메시지
- `../shared/theme.ts` — 다크/라이트 테마

### External

- `xlsx-js-style@^0.4.14` — 스타일 적용 엑셀 생성
- DOM API (localStorage, IndexedDB)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
