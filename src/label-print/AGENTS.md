<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# label-print (라벨 인쇄)

## Purpose
Excel 파일의 주소 데이터를 읽어 A4 라벨지 인쇄 형식으로 변환·출력하는 독립 모듈. Printec 라벨지(2열 9행, 18매/페이지) 기준 템플릿 제공.

## Key Files
| File | Description |
|------|-------------|
| `label-app.ts` | 라벨 생성 핵심 로직: 파일 파싱, 데이터 중복 제거, 필드 매핑, 라벨 시트 렌더링 |
| `label-entry.ts` | TypeScript 모듈 로드 (XLSX, DOMPurify) 및 진입점 |
| `index.html` | 라벨 인쇄 페이지 UI: 파일 업로드, 데이터 미리보기, 템플릿/위치 선택, 인쇄 모달 |
| `label-print.css` | 라벨 템플릿 스타일 및 다크모드 지원 |

## For AI Agents

### Working In This Directory

- **파일 업로드**: XLSX 형식만 지원 (`.xls`, `.xlsx`)
- **데이터 구조**:
  - 입력: 헤더 행 + 데이터 행 배열 (`headers[]`, `rows[][]`) 또는 객체 배열
  - 출력: 최대 500행 제한 (초과 시 경고)
- **필드 매핑**: 이름(name), 주소(address), 우편번호(postalCode) 자동 감지 (다국어 동의어 지원)
- **라벨 템플릿**:
  - 2×9 (18개/페이지, 100×30mm)
  - 시작 위치 선택으로 라벨지 절약 가능
- **보안**: DOMPurify로 innerHTML XSS 방지, 파일명 정규화
- **접근**: localStorage의 `labelPrintData`로 메인 앱에서 데이터 전달 받음

### Common Patterns

1. **Excel 파일 처리**:
   ```typescript
   const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
   const worksheet = workbook.Sheets[sheetName];
   const data = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
   ```

2. **필드 정규화** (dedupePreviewColumns):
   - 컬럼명 정규화: 소문자 + 공백/언더스코어 제거
   - 우편번호(postal): ['우편번호', 'postalcode', 'postcode', 'zip']
   - 주소(address): ['도로명주소', 'address', 'fulladdress', '전체주소']
   - 이름(name): ['성명', '이름', 'name']

3. **라벨 시트 생성**:
   - 템플릿 선택 → 시작 위치 지정 → 데이터 루프 → HTML 렌더링
   - 라벨 항목: 주소(3줄), 이름(suffix 포함), 우편번호

4. **모달 접근성**:
   - Tab 순환 트랩 구현 (focusables 배열)
   - Escape 키로 닫기
   - inert 속성으로 배경 비활성화

### Testing Requirements

- Excel 파일 읽기: 정상/손상된 XLSX 파일
- 필드 매핑: 다양한 컬럼명 변형 테스트
- 라벨 렌더링: 2×9 템플릿, 시작 위치별 페이지 분할
- 데이터 이상 처리: 500행 초과, 빈 파일, 잘못된 형식

```bash
# 해당 없음 (UI 모듈, 브라우저에서만 동작)
```

## Dependencies
### Internal
- `window.XLSX`: XLSX 라이브러리 (xlsx npm 패키지)
- `window.DOMPurify`: HTML sanitize 라이브러리
- `window.showToast()`: 토스트 알림
- `window.logger`: 조건부 디버깅 로그

### External
- xlsx (npm): Excel 파일 읽기/쓰기
- dompurify (npm): XSS 방지

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
