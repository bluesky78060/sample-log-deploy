# SAMPL-1-118 코드 리뷰 — utils.ts sanitizeExcelCell 정본 통일

- **일자**: 2026-06-29
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트)
- **판정**: **APPROVE (통과)** — 결함 0

## 변경 요약
utils.ts SampleUtils.sanitizeExcelCell을 메인 정본에 정합: 정규식 `;|` 추가(보안) + `str.length>1` 가드(단일 `'-'` 플레이스홀더가 `'-`로 escape되던 손상 버그 수정). 5개 시료 스크립트(soil/water/compost/heavy-metal/pesticide) json_to_sheet export 사용.

## 변경 파일 1
`src/shared/utils.ts` (~L998~1006): `if (/^[=+\-@\t\r]/.test(str))` → `if (str.length > 1 && /^[=+\-@\t\r;|]/.test(str))` + JSDoc 갱신. 시그니처/String 강제 불변.

## 리뷰 결과
- **CRITICAL/HIGH/MEDIUM/LOW: 0건** (정보성 2: 이중 sanitizer 분리 유지=문서화됨/동기화 일치, 타 export 경로 커버리지 감사=범위 밖)

## 검증 (전부 PASS)
1. 정본 일치: 정규식·length>1이 메인 sanitize.js:109와 byte 동일. String 강제 유지는 utils(셀-문자열) 역할상 의도된 분기(정본 비문자열 통과 대비 회귀/리스크 없음).
2. 대시 버그 수정: 단일 `'-'` 미escape 확인. grep 결과 5개 스크립트가 거의 모든 셀을 `sanitizeCell(x || '-')`로 넘겨 — 구버전은 빈칸 플레이스홀더를 전부 `'-`로 손상시키고 있었음(광범위 버그).
3. 보안: `;|` 추가로 DDE/구분자 정본 수준 커버. 단일 `=`,`@` 미escape는 정본 동일·무해(실행 불가).
4. 회귀: 시그니처/계약 불변 → 5개 호출부 무영향(단일 `-`만 동작 변경=개선). soil bare/undefined 전달도 `String(value ?? '')`로 안전.
5. 타입: SampleUtilsInterface(typeof)·export 시그니처 불변, 직접 타입 import 소비처 없음, baseline 717 유지.
6. 동작 케이스 12/12 정본 동일(`-`→`-`, `--`→`'--`, `=1+1`/`;cmd`/`|x`/`+82` escape, 단일 `=`/`@` 미escape, undefined→'').

## 검증 증거
- typecheck-gate 717/717, tsc utils.ts 에러 0, vite build ✓, 동작 케이스 매트릭스 정본 동일.

## 최종 판정
**APPROVE.** 정본 byte-parity, 회귀 0, 실제 손상 버그(`'-`) 수정 + 보안 강화. 결함 없음.
