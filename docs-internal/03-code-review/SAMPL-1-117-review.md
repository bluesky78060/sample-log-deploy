# SAMPL-1-117 코드 리뷰 — sanitizeExcelAoa 이식 (엑셀 수식 인젝션 방어)

- **일자**: 2026-06-29
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트)
- **판정**: **APPROVE (통과)**

## 변경 요약
window.sanitizeExcelAoa가 정의 안 돼 3개 분석 모듈 가드가 identity 무효, 흙토람/공익 export 미적용이던 문제 해소. 메인 정본을 sanitize.ts로 이식·활성화.

## 변경 파일 2(소스)
1. `sanitize.ts` — 비공개 `sanitizeExcelCell`(비문자열 통과·length>1·`/^[=+\-@\t\r;|]/`→작은따옴표) + `sanitizeExcelAoa` + window 등록 + ES export + 로컬 Window에 `sanitizeExcelAoa?` optional.
2. `heuktoram-script.ts` — exportToHeuktoram·exportToGongik 2곳 `aoa_to_sheet(sanitizeAoa(wsData))` 래핑.
(utils.ts·5개 시료 스크립트 무수정 — 약한 SampleUtils 버전 통일은 후속 티켓)

## 리뷰 결과
- **CRITICAL/HIGH/MEDIUM: 0건**
- **LOW 3**: (1) 단일문자(length=1) 미escape — 정본 동일 의도 (2) 숫자형 문자열(`"-5.2"`) 텍스트화 — 정본 동일, heuktoram 수치는 number로 통과해 무영향 (3) `?? identity` 4곳 중복 — 선택적 DRY 정리.

## 6개 검증 포인트 (전부 CONFIRMED)
1. 정본 byte-parity(정규식·length>1·비문자열 통과·prepend) 메인 sanitize.js와 동일.
2. 활성화: 4개 엔트리(분석3+heuktoram) 모두 `import '../shared/sanitize'`가 script import보다 먼저 → 등록 후 소비, 3개 분석 모듈 무수정 자동 활성.
3. 타입 병합: 로컬 Window `sanitizeExcelAoa?`가 분석 모듈 로컬 선언과 동일 optional 시그니처 → declare global 병합 충돌 0. (string|number)[][]→unknown[][] 통과, 숫자 number 유지(utils.ts String() 버그 회피).
4. 회귀: 정상값 pass-through, utils.ts/5개 시료 스크립트 무영향(git diff 소스 2파일만).
5. 보안: =,+,-,@,탭,CR,;,| 커버(OWASP 핵심 + DDE 구분자) 정본 동일.
6. 범위: 비공개 cell로 공개 SampleUtils.sanitizeExcelCell 충돌 회피, utils 통일 후속 티켓 — 타당.

## 검증 증거
- typecheck-gate 717/717(무회귀), sanitize.ts·heuktoram 변경 라인 tsc 에러 0, vite build ✓.

## 최종 판정
**APPROVE.** 정본 byte-parity, 활성화 배선 정상, 타입 병합 호환, 회귀 차단, 보안 커버리지 정본 동일. LOW 3은 정본 의도/선택 정리로 비차단.
