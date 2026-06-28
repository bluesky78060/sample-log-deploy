# SAMPL-1-114 코드 리뷰 — 외부 API 키 빌드 주입 (MRL + PSIS) + MRL 설정 UI

- **일자**: 2026-06-28
- **리뷰어**: code-reviewer 에이전트(Opus, 별도 컨텍스트) + 오케스트레이터 후속(build.yml 정리)
- **판정**: **APPROVE (통과)**

## 변경 요약
패키징 앱에서 `process.env`가 비어 내장 키 공급이 실패하던 문제를 VWORLD/JUSO(SAMPL-2-19) 빌드주입 패턴으로 해소.
- **MRL(식품안전나라)**: gen-mrl-key.mjs → dist/mrl-key.txt, index.ts getMrlApiKey(), 설정 UI 필드(Gap B)
- **PSIS(농촌진흥청, 사용자 추가요청)**: gen-psis-key.mjs → dist/psis-key.txt, index.ts getPsisApiKey() (Gap A만, 순수 메인프로세스라 UI 불필요)

## 변경 파일 (9)
gen-mrl-key.mjs(신규), gen-psis-key.mjs(신규), src/index.ts, package.json, .github/workflows/build.yml, src/settings/index.html, src/settings/settings-script.ts, src/settings/settings-entry.ts (+ docs)

## 리뷰 결과 (severity)
- **CRITICAL/HIGH: 0건**
- **MEDIUM 1**: 배지 async 경합(refreshBadge의 mrlGetApiKey IPC). localStorage 재확인 가드 있어 수동키는 가려지지 않음, 최종상태 정확 — **cosmetic·비차단**.
- **LOW 2**: (1) 웹 컨텍스트에서 내장키 배지 미도달(설계상 정상, 안내문구 보강 가능) (2) gen-psis .env 중복키 엣지케이스(비정상 입력, 무해).

## 7개 체크포인트 (전부 PASS, 라인레벨 근거)
1. getMrlApiKey/getPsisApiKey 폴백 순서·경로가 getVworldKey/getJusoKey와 구조 동일. PSIS RDA→RAD 폴백이 핸들러·게터·gen 전반 일관.
2. gen 스크립트 2종이 gen-vworld 정합(env명/출력파일명/로그 정확). gen-psis 이중키 파싱(RDA 우선, RAD 버퍼) 정확.
3. build.yml 두 잡 YAML 들여쓰기 정확. 렌더러 network-config에서 키 제거 유지.
4. 설정 UI: 'mrl_api_key' 키가 mrl-api.ts STORAGE_KEY_API_KEY와 동일, 우선순위(수동>내장) 정합. 저장/삭제(빈입력)/배지 정확. settings-entry Promise.all 위임(critic M1 반영).
5. 키 변경 후 캐시 재동기화 안내 토스트(critic M2) 반영.
6. 보안: 키가 렌더러 번들/소스에 없음(메인프로세스 전용), dist/*.txt gitignore 확인(git check-ignore), 로그에 키 노출 없음, isValidSender·rate-limiter 일관, CSP에 foodsafetykorea 도메인 추가.
7. 회귀: VWORLD/JUSO 주입 무영향, preload allowlist·타입 정합, typecheck 0 에러.

## 오케스트레이터 후속 (사용자 피드백 반영)
빌드 후 사용자 지적: build.yml에 RAD_PSIS_API_KEY가 두 번 보임. 분석:
- RAD_PSIS가 두 잡(windows/macos)에 1회씩 = **정상**(잡별 독립 러너, 둘 다 필요).
- 단, `RDA_PSIS_API_KEY` 라인은 해당 시크릿 미존재로 빈 값 + IDE 경고 → **군더더기**.
→ **RDA_PSIS_API_KEY 라인 제거**(두 잡), RAD_PSIS_API_KEY만 유지. 코드의 RDA→RAD 폴백은 보존(향후 RDA 시크릿 추가 시 라인만 복원). gen-psis 재실행으로 키 주입(29자) 정상 확인.

## 검증 증거
- `npm run build:electron`: gen 4종 실행(mrl 20자, psis 29자 주입), tsc -p tsconfig.electron.json 에러 0, dist/*.txt 생성.
- `git check-ignore dist/mrl-key.txt dist/psis-key.txt` → 무시됨.
- `npm run typecheck:gate`: 717/717 (회귀 0).
- `npm run build` (vite): ✓ built (settings 번들 포함).

## 최종 판정
**APPROVE.** CRITICAL/HIGH 0, 7개 체크포인트 라인레벨 통과, 정본(VWORLD/JUSO) 패턴 충실 이식, 보안(렌더러 키 노출 0·gitignore·로그) 확인. MEDIUM 1·LOW 2는 비차단. build.yml 군더더기 정리 후 재검증 완료.
