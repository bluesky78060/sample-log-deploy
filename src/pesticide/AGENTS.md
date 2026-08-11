<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 잔류농약 시료 접수

## Purpose
농산물 잔류농약 검사를 위한 시료 접수 모듈. 필지별 작물 정보, 생산자 주소(다중), 검사 의뢰 내용(자유 입력), 필지 분할(샘플링 단위)을 지원하며, 엑셀 가져오기/내보내기 기능 제공.

## Key Files
| File | Description |
|------|-------------|
| `pesticide-entry.ts` — shared 모듈 및 의존성 초기화, PesticideSampleManager 임포트 |
| `pesticide-script.ts` — 페이지 초기화, UI 이벤트 핸들링, 간편 유틸 함수 |
| `PesticideSampleManager.ts` — 잔류농약 시료 관리 클래스 (BaseSampleManager 상속), 생산자 정보 관리 |
| `pesticide-style.css` — 필지 선택, 생산자 다중 입력, 검사 의뢰 내용 모달 스타일 |
| `index.html` — 필지 선택 드롭다운, 작물/생산자/의뢰내용 입력 폼, 데이터 테이블 |

## For AI Agents

### Working In This Directory

**위험**: 잔류농약은 필지 정보를 선택하되, 생산자 주소(producerAddress)와 검사 의뢰 내용(requestContent)이 각 생산자별로 다를 수 있음. 또한 토양 모듈과 달리 여러 필지/생산자를 한 번에 수합할 수 있어 데이터 구조 복잡도가 높음.

**주의사항**:
- `STORAGE_KEY = 'test_pesticideSampleLogs'` — 변경 금지
- `SAMPLE_TYPE = '잔류농약'` — 로그/통계 판별용
- Parcel(필지) 구조: { id, region, village, lot, crops }와 RequestItem { producerAddress, requestContent, index } 분리 관리
- 넓이 단위 변환: PYEONG_TO_M2 = 3.305785 (평을 m²로 환산)
- PesticideSearchFilter: dateFrom/dateTo, name, receptionFrom/receptionTo, completed

### Common Patterns

**상수 정의**:
```typescript
const SAMPLE_TYPE = '잔류농약';
const STORAGE_KEY = 'test_pesticideSampleLogs';
const AUTO_SAVE_FILE = 'pesticide-autosave.json';
const PYEONG_TO_M2 = 3.305785;  // 넓이 단위 변환
```

**데이터 구조**:
- 타입: `PesticideSample` (확장 BaseSample)
- 필지(Parcel): 기존 등록된 필지 데이터를 선택 (id, region, village, lot)
- 작물: 필지의 crops 배열에서 선택
- 생산자 정보: 다중 입력 가능 (producerAddress, requestContent는 각 생산자별 상이)
- RequestItem: { producerAddress, requestContent, index }

**파일 저장**:
- localStorage 연도별: `test_pesticideSampleLogs_2026`
- 자동 저장 JSON: `pesticide-autosave-2026.json`

**등록 결과**: RegistrationResult 구조로 수정 시 표시 (receptionNumber, date, name, producerName, producerAddress, requestContent)

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 접수/조회/내보내기
- `src/shared/file-api.ts` — FileAPI 추상화
- `src/shared/excel-import-manager.ts` — 엑셀 가져오기
- `src/bonghwaData.ts` — 봉화군 지역 자동완성
- `src/cropData.ts` — 작물 코드/명칭

### External
- `xlsx` (XLSX) — 엑셀 조작
- `dompurify` (DOMPurify) — HTML 새니타이제이션

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
