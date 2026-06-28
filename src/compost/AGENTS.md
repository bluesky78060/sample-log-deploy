<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# 퇴·액비 부숙도 검사

## Purpose
퇴비(가축분퇴비) 및 액비(가축분뇨발효액) 부숙도 검사를 위한 시료 접수 모듈. 퇴비/액비별 검정 항목(함수율, 부숙도, 염분, 구리, 아연)과 기준값이 상이하며, 음축 종류(소, 돼지)별 기준도 다름.

## Key Files
| File | Description |
|------|-------------|
| `compost-entry.ts` — shared 모듈 및 의존성 초기화 |
| `compost-script.ts` — CompostSampleManager 클래스, 퇴·액비 유형별 검정 항목 관리 |
| `CompostSampleManager.ts` — 퇴·액비 매니저 (BaseSampleManager 상속) |
| `compost-style.css` — 퇴·액비 유형 선택, 음축 타입 선택 UI 스타일 |
| `index.html` — 퇴·액비 유형(compost_type) 선택, 음축 종류(animalType) 선택, 검정 결과 입력 폼 |

## For AI Agents

### Working In This Directory

**위험**: 퇴·액비는 유형(퇴비/액비)과 음축 종류(소/돼지)의 조합에 따라 검정 항목 집합이 결정됨. 단순 복붙 시 COMPOST_FIELDS 구조를 잘못 매핑할 수 있음.

**주의사항**:
- `STORAGE_KEY = 'test_compostSampleLogs'` — 변경 금지
- `DEFAULT_SAMPLE_TYPE = '가축분퇴비'` — 기본값
- COMPOST_FIELDS 구조: `{ compost_common, compost_cattle, compost_pig, liquid_common, liquid_pig }` → 유형별로 다른 필드 조합 적용
- MATURITY_ORDER: 부숙도 선택지 '미부숙' → '완전부숙'의 순서값 정의 (결과 판정용)
- 검정 결과(CompostTestResult): testDate, judgment, animalType, moisture, maturity, salinity, copper, zinc 등

### Common Patterns

**상수 정의**:
```typescript
const SAMPLE_TYPE = 'compost';
const STORAGE_KEY = 'test_compostSampleLogs';
const AUTO_SAVE_FILE = 'compost-autosave.json';

static COMPOST_FIELDS: Record<string, CompostFieldDef[]> = {
  compost_common: [
    { key: 'moisture', label: '함수율', unit: '%', standard: '70 이하' },
    { key: 'maturity', label: '부숙도', unit: '', type: 'select', 
      options: ['', '미부숙', '부숙초기', '부숙중기', '부숙완료', '완전부숙'],
      standard: '부숙중기 이상' }
  ],
  compost_cattle: [
    { key: 'salinity', label: '염분', unit: '%', standard: '2.5 이하' }
  ],
  compost_pig: [
    { key: 'copper', label: '구리(Cu)', unit: 'mg/kg', standard: '500 이하' },
    { key: 'zinc', label: '아연(Zn)', unit: 'mg/kg', standard: '1,200 이하' }
  ],
  // liquid_common, liquid_pig도 유사 구조
};

static MATURITY_ORDER = {
  '미부숙': 0, '부숙초기': 1, '부숙중기': 2, '부숙완료': 3, '완전부숙': 4
};
```

**데이터 구조**:
- 타입: `CompostSample` (확장 BaseSample)
- 유형별 필드 조합: 선택된 유형(compost_type) + 음축(animalType)에 따라 표시할 필드 결정

**파일 저장**:
- localStorage 연도별: `test_compostSampleLogs_2026`
- 자동 저장 JSON: `compost-autosave-2026.json`

**검정 항목 동적 표시**: 유형(퇴비/액비) + 음축 종류(소/돼지) 선택에 따라 폼 필드 업데이트

## Dependencies

### Internal
- `src/shared/BaseSampleManager.ts` — 기본 접수/조회/내보내기
- `src/shared/file-api.ts` — FileAPI 추상화
- `src/shared/excel-import-manager.ts` — 엑셀 가져오기

### External
- `xlsx` (XLSX) — 엑셀 조작
- `dompurify` (DOMPurify) — HTML 새니타이제이션

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
