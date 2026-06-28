<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 토양 시료 접수

## Purpose
농경지 토양 검정을 위한 시료 접수 관리 모듈. 필지별 작물 정보, 지목/용도 분류, 필지 분할(소필지), 샘플 번호 자동 채번을 지원하며, 토양 검정 결과를 흙토람 서식으로 내보내기.

## Key Files
| File | Description |
|------|-------------|
| `soil-entry.ts` | 모든 shared 모듈 및 데이터 임포트, 의존성 초기화 순서 관리 |
| `soil-script.ts` | SoilSampleManager 클래스 (BaseSampleManager 상속), 접수/조회/내보내기 비즈니스 로직 |
| `soil-style.css` | 필지 관리 UI, 작물 선택 모달, 결과 테이블 스타일 |
| `index.html` | 필지 관리 폼, 작물 영역 모달, 검정 결과 입력 모달, 데이터 테이블 |

## For AI Agents

### Working In This Directory

**위험**: 토양 모듈은 필지(parcel) 개념이 고유하며, 각 필지는 다중 필지분할(subLot)과 작물(crop)을 가짐. 단순 복붙 시 parcel/subLot 구조를 다른 도메인으로 잘못 적용할 수 있음.

**주의사항**:
- `STORAGE_KEY = 'test_soilSampleLogs'` — 변경 금지 (localStorage 키이며 다른 모듈과 구분됨)
- `SAMPLE_TYPE = '토양'` — 로그, 통계, 엑셀 내보내기에서 타입 판별용
- SoilParcel/SoilSubLot/SoilCrop 타입은 soil만 사용 (water/compost/pesticide/heavy-metal은 이 구조 없음)
- 필지분할 논리: 기존 필지에 여러 소필지 추가 가능 → buildSubLotsList() 참조
- 흙토람 결과 입력: 결과 입력 후 IDB(analysis-db)에 저장 → heuktoram 모듈이 읽어서 일괄 엑셀 변환

### Common Patterns

**상수 정의**:
```typescript
const SAMPLE_TYPE = '토양';
const STORAGE_KEY = 'test_soilSampleLogs';  // localStorage 키
const AUTO_SAVE_FILE = 'soil-autosave.json';

static SOIL_ANALYSIS_FIELDS = [
  { key: 'pH', label: 'pH', unit: '', min: 3.5, max: 9.5 },
  { key: 'organicMatter', label: '유기물(OM)', unit: 'g/kg', min: 1, max: 300 },
  // ... 9개 검정 항목
];
```

**데이터 구조**:
- 타입: `SoilSample` (확장 BaseSample)
- 필지 관리: `parcels: SoilParcel[]` (필지 배열)
- 필지분할: `subLots?: (SoilSubLot | string)[]` (각 필지의 소필지들)
- 작물: `crops?: SoilCrop[]` (각 필지/소필지의 작물)

**파일 저장**:
- localStorage 연도별: `test_soilSampleLogs_2026`
- 자동 저장 JSON: `soil-autosave-2026.json`
- 연도 추출: `new Date().getFullYear()`

**search filter**: SoilSearchFilter extends BaseSearchFilter
```typescript
interface SoilSearchFilter extends BaseSearchFilter {
  lot: string;        // 필지 주소 검색
  purpose: string;    // 용도 필터
  // dateFrom, dateTo, name, receptionFrom, receptionTo는 BaseSampleManager에서 상속
}
```

**모달 상태**: 필지 편집(regionSelectionModal), 작물 선택(cropAreaModal), 검정 결과 입력(registrationResultModal) 등 다중 모달 관리

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 접수/조회/내보내기 틀
- `src/shared/file-api.ts` — FileAPI 추상화 (Electron + 웹 환경)
- `src/shared/pagination.ts` — 데이터 페이지네이션 (토양은 VirtualListManager 기반 커스텀 페이지네이션 사용)
- `src/shared/address.ts` — 주소 입력 (Daum 우편번호 API)
- `src/shared/address-parser.ts` — 지번 주소 분석 (필지 주소 파싱)
- `src/shared/excel-import-manager.ts` — 엑셀 가져오기
- `src/shared/analysis-db.ts` — IndexedDB 저장 (토양 검정 결과)
- `src/bonghwaData.ts` — 봉화군 행정구역 자동완성
- `src/cropData.ts` — 작물 코드/명칭 매핑

### External
- `xlsx` (XLSX) — 엑셀 파일 생성/분석
- `dompurify` (DOMPurify) — HTML 새니타이제이션
- `dexie` — IndexedDB 래퍼 (분석결과 캐싱용)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
