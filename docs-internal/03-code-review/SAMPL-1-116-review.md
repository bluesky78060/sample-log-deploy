# SAMPL-1-116 코드 리뷰 — 흙토람 공익직불제(Gongik) 내보내기 양식 이식

- **일자**: 2026-06-29
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트)
- **판정**: **APPROVE (통과)**

## 변경 요약
메인 흙토람의 공익직불제 이행점검 일괄입력 양식 내보내기(SAMPL-1-87)를 테스트(TS)로 이식. 기존엔 흙토람 서식만 있고 공익 코드 0건.

## 변경 파일 2
1. `heuktoram/index.html` — 툴바에 `exportFormatSelect`(흙토람 서식/공익직불제) 드롭다운.
2. `heuktoram/heuktoram-script.ts` — GONGIK 상수(WS_TOTAL_COLS/C/GUIDE/HEADER2/HEADER3) + makeGongikRow + encodeCol 헬퍼, exportFormatSelect 멤버, exportBtn 양식 분기, 공익 메서드 10종.

## 리뷰 결과 (정본 라인 대조)
| 항목 | 결과 |
|------|------|
| `_buildGongikDataRow` 40컬럼(C+0~C+37) 매핑 | 메인과 인덱스·소스필드 완전 일치 |
| HEADER2/HEADER3, 19개 병합, 열너비, G/H/Q 드롭다운, 헤더스타일 | 완전 일치 |
| `encodeCol` 경계값(0→A,25→Z,26→AA,39→AN) + G/H/Q(2+4/2+5/2+14) | 전수 검증 통과(XLSX.utils.encode_col 동등 대체) |
| 캐스팅 `row as unknown as {...}` | gongik 필드 접근 안전, 옵셔널 폴백 일관 |
| ws 처리(Record<string,unknown>+cells 캐스팅, !merges/!cols/!rows) | 기존 applyHeaderStyles 패턴 동일 |
| exportBtn 분기/폴백('heuktoram') | 비파괴, 기존 흙토람 export 보존 |

- **CRITICAL/HIGH: 0건**

## 이슈
- **MEDIUM 1 (비차단, 회귀 아님)**: `exportToGongik`가 `sanitizeExcelAoa` 미경유. 단 기존 `exportToHeuktoram`도 동일하게 미경유(sanitizeExcelAoa는 TS 프로젝트 전반 미이식, 분석 모듈은 `window.sanitizeExcelAoa ?? (a=>a)` 폴백 사용). 데이터가 전부 string(빈값 폴백)이라 실무 영향 작음. → **후속 티켓 권고**: 흙토람+공익 export를 함께 sanitizeAoa 폴백으로 통일.
- **LOW 2**: getGongikColumnWidths 컬럼범위 주석 누락 / DATA_END=40 매직넘버(정본 동일). 선택 사항.

## 검증 증거
- typecheck:gate 717/717 (초기 +5 회귀 encode_col 미노출·landClass1 unknown→{} 를 encodeCol 자체헬퍼+landClass1 단순화로 해소). 신규 gongik 코드 영역 tsc 에러 0.
- vite build ✓, docs/heuktoram 번들에 exportFormatSelect·exportToGongik·GONGIK 반영.

## 최종 판정
**APPROVE.** 정본 완전 일치, CRITICAL/HIGH 0, 게이트 유지. MEDIUM은 선행 누락 패턴(회귀 아님)으로 후속 티켓 권고. LOW는 선택.
