<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 수질분석 시료 접수

## Purpose
생활용수/농업용수 수질 검정을 위한 시료 접수 관리 모듈. 용수 용도별(생활/농업/산업)로 검정 항목을 달리하며, 샘플링 위치 다중 입력, 분기별 통계 제공.

## Key Files
| File | Description |
|------|-------------|
| `water-entry.ts` | shared 모듈 및 의존성 초기화 |
| `water-script.ts` | WaterSampleManager 클래스 (BaseSampleManager 상속), 용수 용도별 검정 항목 관리 |
| `water-style.css` | 용수 용도 선택, 검정 항목 토글, 샘플링 위치 리스트 스타일 |
| `index.html` | 샘플 정보 폼, 샘플링 위치 입력, 생활/농업용수 검정 항목 체크리스트 |

## For AI Agents

### Working In This Directory

**위험**: 수질 모듈은 용수 용도(applicantType: 생활수/농업수/산업수)에 따라 검정 항목 집합이 완전히 다름. 모듈 간 복붙 시 검정 항목 매핑을 잘못 복사할 수 있음.

**주의사항**:
- `STORAGE_KEY = 'test_waterSampleLogs'` — 변경 금지
- `SAMPLE_TYPE = '물'` — 로그/통계에서 타입 판별용
- WaterQualityField 배열에는 용도별 기준치(living, agri, industry 필드) 포함 → 선택된 용도에 따라 조건부 표시
- 샘플링 위치는 배열(samplingLocations[])로 다중 입력 가능 (필지처럼 추가/삭제 UI)
- 검정 항목은 생활용수(livingWaterItems)와 농업용수(agriculturalWaterItems) 2개 섹션으로 분리 표시

### Common Patterns

**상수 정의**:
```typescript
const SAMPLE_TYPE = '물';
const STORAGE_KEY = 'test_waterSampleLogs';
const AUTO_SAVE_FILE = 'water-autosave.json';

const WATER_QUALITY_FIELDS: WaterQualityField[] = [
  { key: 'ph', label: 'pH', unit: '', living: '5.8~8.5', agri: '6.0~7.5', industry: '-' },
  { key: 'do', label: '용존산소(DO)', unit: 'mg/L', living: '≥5', agri: '-', industry: '-' },
  // ... 생활/농업 용도별 기준치
];
```

**데이터 구조**:
- 타입: `WaterSampleLog` (확장 BaseSample)
- 샘플링 위치: `samplingLocations: string[]` (배열)
- 샘플링 작물: `samplingCrops: string[]` (농업용수 선택 시)
- 검정 항목: 문자열 배열 (선택된 항목 저장)

**파일 저장**:
- localStorage 연도별: `test_waterSampleLogs_2026`
- 자동 저장 JSON: `water-autosave-2026.json`

**용수 용도 전환**: applicantType 변경 시 livingWaterItems/agriculturalWaterItems visibility 토글 필수

**통계**: 분기별(Quarter) 및 월별(Month) 데이터 집계 (월/분기 필터에서 사용)

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 접수/조회/내보내기
- `src/shared/file-api.ts` — FileAPI 추상화
- `src/shared/address.ts` — 주소 입력 (Daum 우편번호 API)
- `src/shared/excel-import-manager.ts` — 엑셀 가져오기
- `src/bonghwaData.ts` — 경상북도 지역 자동완성

### External
- `xlsx` (XLSX) — 엑셀 조작
- `dompurify` (DOMPurify) — HTML 새니타이제이션

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
