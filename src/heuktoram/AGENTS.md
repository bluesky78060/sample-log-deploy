<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 흙토람 토양검정 일괄입력

## Purpose
토양 시료 접수 데이터(test_soilSampleLogs)를 읽어 토양 검정 결과를 입력받아 흙토람 서식(.xlsx)으로 일괄 내보내기하는 모듈. 필지-작물 단위로 별도 행을 생성하며, 흙토람 표준 양식 컬럼 매핑 및 스타일 적용(xlsx-js-style).

## Key Files
| File | Description |
|------|-------------|
| `heuktoram-entry.ts` — xlsx-js-style, JSZip, shared 모듈 임포트, 결과 가져오기 모달 로드 |
| `heuktoram-script.ts` — 흙토람 결과 입력/관리, 필지-작물 행 생성, 흙토람 서식 엑셀 생성 |
| `heuktoram-result-importer.js` — 분석 결과 텍스트/파일 가져오기 파서 |
| `heuktoram-style.css` — 결과 입력 테이블, 모달, 저장 버튼 스타일 |
| `index.html` — 토양 필지 선택, 검정 항목 입력 폼(pH, 유기물 등 9개), 결과 테이블, 흙토람 내보내기 버튼 |

## For AI Agents

### Working In This Directory

**위험**: 흙토람은 토양 모듈의 결과 입력 도구이므로 토양 모듈과 데이터 구조가 긴밀함. 필지/작물 행 생성 로직과 흙토람 컬럼 매핑을 혼동하면 엑셀 서식이 깨짐.

**주의사항**:
- 데이터 읽기: localStorage에서 `test_soilSampleLogs_YYYY` 읽기 → soil 모듈의 SoilLog, SoilParcel, SoilCrop 구조 준수
- HeuktoramRow 생성: 각 필지-작물 조합마다 별도 행 생성 (displayNumber 순번 할당)
- 기준번호(baseReceptionNumber): 접수번호에서 부번(예: '-1') 제거 (같은 필지의 여러 샘플을 하나의 검정번호로 통합)
- 흙토람 엑셀 컬럼: 고정 기준 이행 → xlsx-js-style로 셀 스타일(배경색, 폰트) 적용
- 분석 항목: soil의 SOIL_ANALYSIS_FIELDS와 동일 (pH, 유기물, 유효인산, 교환성K/Ca/Mg, 유효규산, 전기전도도, 석회소요량, 등)

### Common Patterns

**타입 정의**:
```typescript
interface HeuktoramRow {
  key: string;
  displayNumber: string;
  baseReceptionNumber?: string;  // 부번 제거된 접수번호
  log: SoilLog;
  parcel: SoilParcel | null;
  parcelIdx: number;
  crop?: SoilCrop;
  cropIdx?: number;
  subLot: SoilSubLot | null;
  subLotIdx: number;
  isSubLot: boolean;
}

interface SoilTestResult {
  testDate?: string;
  soiling?: string;
  clay?: string;
  pH?: string;
  organicMatter?: string;
  availableP?: string;
  exK?: string;
  exCa?: string;
  exMg?: string;
  silica?: string;
  ec?: string;
  limeReq?: string;
  NO3N?: string;
  cec?: string;
  NH4N?: string;
  usageCode?: string;
}
```

**필지-작물 행 생성**: 
- soil의 parcels[] 순회
- 각 parcel의 crops[] 순회
- 소필지(subLots) 있으면 각 subLot의 crops[] 순회
- 행 번호(displayNumber) 증분 할당

**기준번호 추출**:
```typescript
// 접수번호 '468-1' → baseReceptionNumber '468'
baseReceptionNumber = receptionNumber.split('-')[0];
```

**흙토람 엑셀 생성**: 
- 헤더 행 생성 (기준번호, 필지주소, 작물, pH, OM 등 9개 검정항목 + 추가 필드)
- 각 HeuktoramRow를 데이터 행으로 변환
- xlsx-js-style로 셀 병합(header), 배경색(header/data), 폰트 스타일 적용
- JSZip으로 .xlsx 패키징 (보안 매크로 제거)

**분석 결과 가져오기**: heuktoram-result-importer.js에서 텍스트 또는 파일(.xlsx) 파싱 → SoilTestResult 객체로 변환

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 데이터 관리 유틸
- `src/shared/analysis-db.ts` — IndexedDB (토양 검정 결과 저장/읽기)
- `src/shared/address-parser.ts` — 지번 주소 분석 (필지 주소 파싱)
- `src/shared/toast.ts` — 사용자 알림
- `src/shared/logger.ts` — 로깅
- `src/bonghwaData.ts` — 봉화군 행정구역 데이터

### External
- `xlsx-js-style` (XLSX) — 스타일 적용된 엑셀 생성
- `jszip` (JSZip) — .xlsx 파일 압축 (다중 시트 지원)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
