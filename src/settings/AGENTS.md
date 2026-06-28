<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# settings (설정)

## Purpose
Firebase 인증, 암호화, 저장 모드, 기관 정보, 네트워크 접근 제어, 데이터 마이그레이션 등을 관리하는 통합 설정 페이지. 비밀번호 기반 접근 제한.

## Key Files
| File | Description |
|------|-------------|
| `settings-entry.ts` | TypeScript 모듈 로드, 페이지 초기화: 암호화 매니저, Firebase, 저장소 관리자, 비밀번호 검증 |
| `settings-script.ts` | 설정 로직 (3,042줄): Firebase 인증, 저장 모드, 암호화, 마이그레이션, 네트워크 제어, 조직 정보, 캐시 관리 |
| `index.html` | 설정 UI: 섹션별 폼, 상태 배지, 마이그레이션 목록, 암호화 컨트롤, FAQ |

## For AI Agents

### Working In This Directory

- **접근 제어**: 설정 페이지는 암호화 비밀번호 검증 필수 (`showSettingsPasswordPrompt`)
- **환경 감지**: Electron (`window.electronAPI?.isElectron`) vs 웹 환경 자동 분기
- **상태 배지**: 연결됨(green), 미연결(red), 설정중(yellow) 3가지 상태
- **비밀번호 검증**:
  - timing-safe 비교 (타이밍 공격 방어)
  - sessionPassword (Electron) → encryptionManager.verifyPassword() 순서
- **저장 모드**: local, cloud, cloudOnly 3가지
  - storageManager.getMode() / setMode()
- **마이그레이션**: 로컬 → Firebase 연도별 일괄 처리

### Common Patterns

1. **Firebase 인증 파일**:
   - Electron: `electronAPI.readAuthFile()`, `saveAuthFile()`, `deleteAuthFile()`
   - Web: `firebaseConfig.saveConfig()`, `resetConfig()`, localStorage 저장
   - 구조: `{ apiKey, projectId, authDomain, storageBucket, messagingSenderId, appId }`

2. **안전한 설정 파싱** (safeParseFirebaseConfig):
   - eval() 금지, 정규식으로만 추출
   - 주석 제거 후 필드별 패턴 매칭
   - 필수 필드: apiKey, projectId

3. **마이그레이션 스캔** (scanPlaintextData):
   - Firebase collections + 로컬 autosave 파일 스캔
   - 평문/암호화 데이터 구분 (_enc 필드)
   - 연도별 (2020~현재) 자동 루프

4. **비밀번호 UI**:
   - CryptoUtils.createPasswordRulesHTML() / bindPasswordValidation()
   - 강도 표시기, show/hide 토글
   - 진입 시 자동 포커스

### Testing Requirements

- Firebase 인증 파일 업로드 및 검증
- 저장 모드 변경 (로컬↔클라우드↔클라우드전용)
- 마이그레이션: 연도별 데이터 일괄 처리
- 암호화 활성화/비활성화 및 마이그레이션
- 네트워크 게이트웨이 IP 설정 및 접근 제어
- 기관 이름, 기본 시·도, 페이지네이션 설정 저장

```bash
# 통합 테스트 필요 (Firebase, 암호화, 저장소 등 연동)
```

## Dependencies
### Internal
- `window.firebaseConfig`: Firebase 초기화 및 설정 관리
- `window.encryptionManager`: 암호화/복호화 및 비밀번호 검증
- `window.storageManager`: 로컬/클라우드 저장소 모드 전환
- `window.firestoreDb`: Firestore 컬렉션명 생성
- `window.CacheManager`: 캐시 상태 조회 및 정리
- `window.NetworkAccess`: 게이트웨이 IP 관리 및 접근 제어
- `window.electronAPI`: Electron 파일 및 네이티브 다이얼로그
- `window.logger`, `window.showToast()`: 로깅 및 알림

### External
- dompurify (npm): HTML sanitize

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
