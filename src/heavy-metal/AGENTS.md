<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 토양 중금속 시료 접수

## Purpose
농경지 토양 중금속 오염도 검사를 위한 시료 접수 모듈. 지목/용도별(1지역: 전답과수원, 2지역: 임야학교공원, 3지역: 공장도로) 8종 중금속 기준값이 상이하며, 검정 항목 다중 선택 및 판정 결과(합격/불합격) 입력 기능 제공.

## Key Files
| File | Description |
|------|-------------|
| `heavy-metal-entry.ts` — shared 모듈 및 의존성 초기화 |
| `heavy-metal-script.ts` — HeavyMetalSampleManager 클래스 (BaseSampleManager 상속), 지목별 기준값 적용 |
| `heavy-metal-style.css` — 중금속 항목 체크리스트, 지역 선택 UI 스타일 |
| `index.html` — 샘플 정보 폼, 중금속 분석 항목 체크리스트, 지역 선택 드롭다운, 판정 결과 테이블 |

## For AI Agents

### Working In This Directory

**위험**: 중금속 기준값은 지역/지목(1/2/3)에 따라 달라짐. 기준값 테이블에서 standard1/standard2/standard3 필드를 혼동하면 부정확한 검정 판정 초래.

**주의사항**:
- `STORAGE_KEY = 'test_heavyMetalSampleLogs'` — 변경 금지
- `SAMPLE_TYPE = '중금속'` — 로그/통계 판별용
- HEAVY_METAL_FIELDS 배열에 8종(카드뮴, 구리, 비소, 수은, 납, 6가크롬, 아연, 니켈) 정의 → standard1/2/3 필드 포함
- 지역 선택: _hmRegion (1/2/3) → 선택된 기준값 standard1/2/3 중 하나 적용
- analysisItems: 다중 선택 가능, '전체 항목' 옵션 있음
- 판정(judgment): 분석결과 입력 후 '합격'/'불합격' 선택

### Common Patterns

**상수 정의**:
```typescript
const SAMPLE_TYPE = '중금속';
const STORAGE_KEY = 'test_heavyMetalSampleLogs';
const AUTO_SAVE_FILE = 'heavy-metal-autosave.json';

static HEAVY_METAL_FIELDS: HeavyMetalField[] = [
  { key: 'cadmium', label: '카드뮴(Cd)', unit: 'mg/kg', standard1: 4, standard2: 10, standard3: 60 },
  { key: 'copper', label: '구리(Cu)', unit: 'mg/kg', standard1: 150, standard2: 500, standard3: 2000 },
  // ... 8종 정의
];

ANALYSIS_ITEMS = ['구리', '납', '니켈', '비소', '수은', '아연', '카드뮴', '6가크롬'];
```

**데이터 구조**:
- 타입: `HeavyMetalSample` (확장 BaseSample)
- analysisItems: 선택된 중금속 항목 배열
- treeAge: 과수원 샘플의 경우 수령 정보 (필요시)

**지역 선택**: _hmRegion (1/2/3) → 테이블 표시 시 선택된 지역의 기준값(standard1/2/3) 표시

**파일 저장**:
- localStorage 연도별: `test_heavyMetalSampleLogs_2026`
- 자동 저장 JSON: `heavy-metal-autosave-2026.json`

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 접수/조회/내보내기
- `src/shared/file-api.ts` — FileAPI 추상화
- `src/shared/address.ts` — 주소 입력
- `src/shared/excel-import-manager.ts` — 엑셀 가져오기
- `src/bonghwaData.ts` — 봉화군 지역 자동완성

### External
- `xlsx` (XLSX) — 엑셀 조작
- `dompurify` (DOMPurify) — HTML 새니타이제이션

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
