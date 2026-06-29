# SAMPL-1-115 코드 리뷰 — 설정 페이지 MRL 데이터 다운로드 UI 이식

- **일자**: 2026-06-29
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트) + 오케스트레이터 후속(MEDIUM 가드 반영)
- **판정**: **APPROVE (통과)**

## 변경 요약
메인의 설정-페이지 식품안전나라 MRL API 섹션을 테스트(TS)로 이식. 기존엔 설정에 단순 키 필드만 있고 MRL 데이터 다운로드가 잔류농약 분석결과 모달에 묻혀 있어 발견성이 나빴음.

## 변경 파일 3
1. `settings-entry.ts` — `import '../shared/mrl-api.ts'` (window.MrlApi 등록). initMrlApiUI()는 Promise.all에 이미 존재.
2. `settings/index.html` — 단순 #mrlApiSection을 풀 섹션으로 교체: 키 입력(password)+표시토글+저장, 캐시상태(연결/레코드수/마지막동기화/만료), 지금 동기화·연결 테스트·캐시 삭제, 진행바.
3. `settings-script.ts` — initMrlApiUI() async 풀 버전(중첩 헬퍼 + ensureEmbeddedKey await + 5개 핸들러). window.MrlApi 사용.

## 리뷰 결과
- **CRITICAL/HIGH: 0건**
- **MEDIUM 1**: 리스너 멱등성(재호출 시 중복 바인딩) → **수정 반영**: `mrlApiSection.dataset.mrlWired` 가드 추가(재호출 시 상태만 갱신).
- **LOW 3**: (1) sync/clearCache 버튼 연타 — sync는 syncPromise로 데이터계층 가드됨, 무해 (2) docs 빌드산출물 churn + SAMPL-1-114-review.md 빌드 wipe(복원) (3) JSON.parse 오류가 네트워크오류로 표기 — 메인과 동일, 무해.

## 6개 검증 포인트 (전부 PASS)
1. 정본 일치: updateStatusUI/sync/test/clear가 메인 line-for-line 동등(TTL 계산, INFO-000 체크, text/html 인증실패 감지, encodeURIComponent).
2. DOM id 13개 전부 HTML 매칭.
3. settings-entry import → mrl-api.ts side-effect로 window.MrlApi 등록, 순환참조 없음, 번들 포함 확인.
4. CSP: settings meta 없음 + Electron index.ts onHeadersReceived(foodsafety 포함) + 웹 CSP 없음 → sync/test fetch 허용. 검증 완료.
5. 초기화/회귀: Promise.all 1회 호출, ensureEmbeddedKey await 후 상태표시. 구 id(saveMrlApiKeyBtn/mrlApiStatus) 잔존 0.
6. 보안: 키 localStorage만, 로그 노출 없음, fetch URL encodeURIComponent, autocomplete=off(메인 대비 개선).

## 검증 증거
- typecheck:gate 717/717 (가드 추가 후 재검증), vite build ✓, docs/settings 번들에 13개 mrl id + MrlApi(mrl-api 청크) 포함.

## 최종 판정
**APPROVE.** 정본 충실 이식, CRITICAL/HIGH 0, 6개 체크포인트 통과. MEDIUM(멱등성) 즉시 반영. LOW는 비차단.
