# 프로젝트 마크다운 파일 목록

> 작성일: 2026-02-15
> 프로젝트: 시료접수대장 (Sample Log Electron)

프로젝트에 포함된 마크다운(.md) 파일 목록과 역할을 정리한 문서입니다.

---

## 1. 프로젝트 설정 및 가이드 (루트)

| 파일 | 설명 | 비고 |
|------|------|------|
| `CLAUDE.md` | Claude Code 프로젝트 지침서 | 아키텍처, 명령어, 개발 노트 포함 |
| `AGENTS.md` | Claude Code 에이전트 문서 | `CLAUDE.md`로의 심볼릭 링크 |
| `AGENTS_AND_SKILLS.md` | Claude Code 에이전트 및 스킬 가이드 | 에이전트/스킬 목록 참조 |

---

## 2. 보안

| 파일 | 설명 | 비고 |
|------|------|------|
| `docs-internal/SECURITY.md` | 보안 정책 및 CSP 개선사항 | Content Security Policy, 보안 헤더, 향후 계획 |
| `docs-internal/CSP_TEST_GUIDE.md` | CSP 보안 개선 테스트 가이드 | `unsafe-eval` 제거 후 테스트 절차 |
| `docs-internal/HIGH_ISSUES_TEST_GUIDE.md` | HIGH 이슈 수정 테스트 가이드 | innerHTML XSS, 경로 순회, 로깅, API 키 보호 |
| `.github/ISSUE_TEMPLATE/security-vulnerability.md` | 보안 취약점 신고 템플릿 | GitHub Issue 템플릿 |

---

## 3. 암호화

| 파일 | 설명 | 비고 |
|------|------|------|
| `docs-internal/DATA_ENCRYPTION_PLAN.md` | 데이터 암호화 구현 계획서 v1.0 | 초기 계획서 (2026-02-04), CryptoJS 기반 |
| `docs-internal/DATA_ENCRYPTION_SPEC.md` | 데이터 암호화 기술 사양서 v2.1 | 최신 사양서 (2026-02-14), Web Crypto API + AES-256-GCM |
| `docs-internal/ENCRYPTION_TEST_PLAN.md` | 암호화 기능 테스트 계획서 | 테스트 환경, 단계별 계획, 체크리스트 |

### 암호화 문서 관계

```
DATA_ENCRYPTION_PLAN.md (v1.0, 초기 계획)
      ↓ 발전
DATA_ENCRYPTION_SPEC.md (v2.1, 최종 기술 사양)
      ↓ 테스트
ENCRYPTION_TEST_PLAN.md (테스트 절차)
```

#### 주요 변경점 (v1.0 → v2.1)

| 항목 | v1.0 (PLAN) | v2.1 (SPEC) |
|------|-------------|-------------|
| 라이브러리 | CryptoJS 4.2.0 | Web Crypto API |
| 알고리즘 | AES-256-CBC | AES-256-GCM |
| 키 유도 | PBKDF2 100,000회 | PBKDF2 600,000회 |
| 키 관리 | 키 파일만 | 비밀번호 + 키 파일 복합 키 |
| 비밀번호 복구 | 없음 | 복구 키 시스템 |

---

## 4. Firebase

| 파일 | 설명 | 비고 |
|------|------|------|
| `docs-internal/FIREBASE_SETUP_GUIDE.md` | Firebase 설정 가이드 (텍스트) | 비기술 사용자 대상 가이드 |
| `docs-internal/FIREBASE_SETUP_GUIDE.html` | Firebase 설정 가이드 (HTML) | 스크린샷 포함 상세 가이드 |

---

## 5. 릴리스 및 버그 수정

| 파일 | 설명 | 비고 |
|------|------|------|
| `docs-internal/RELEASE_NOTES.md` | 릴리스 노트 | v1.6.8 ~ v1.7.7 버전 히스토리 |
| `docs-internal/EXCEL_EXPORT_BUG_FIX.md` | 엑셀 내보내기 버그 수정 | `completed`/`isCompleted` 필드 불일치 수정 |

---

## 6. 개발 이력

| 파일 | 설명 | 비고 |
|------|------|------|
| `docs-internal/tasks.md` | 전체 개발 작업 내역 | 시료 유형별 현황, 코드 분석, E2E 테스트, 디자인 개선 |

### tasks.md 주요 섹션

- 시료 유형별 개발 현황 (5개 타입 모두 완료)
- 파일 구조
- 공통 기능 (자동저장, 네비게이션, 라벨 인쇄, 엑셀, 통계)
- 코드 분석 결과 (2024-12-16) - Critical/보안/품질 이슈 및 수정 현황
- 디자인 개선안 - 메인 페이지, 네비게이션, 폼 UI
- E2E 테스트 현황 (178개)
- TypeScript 마이그레이션 폐기 사유

---

## 요약 통계

| 카테고리 | 파일 수 |
|----------|---------|
| 프로젝트 설정 (루트) | 3 |
| 보안 | 4 |
| 암호화 | 3 |
| Firebase | 1 (+HTML 1) |
| 릴리스/버그 | 2 |
| 개발 이력 | 1 |
| **합계** | **14** |

---

## 파일 위치 트리

```
sample-log-electron/
├── CLAUDE.md                              # 프로젝트 지침서
├── AGENTS.md                              # → CLAUDE.md (symlink)
├── AGENTS_AND_SKILLS.md                   # 에이전트/스킬 가이드
├── .github/
│   └── ISSUE_TEMPLATE/
│       └── security-vulnerability.md      # 보안 취약점 템플릿
└── docs-internal/
    ├── MARKDOWN_FILES_INDEX.md            # 본 문서
    ├── SECURITY.md                        # 보안 정책
    ├── CSP_TEST_GUIDE.md                  # CSP 테스트 가이드
    ├── HIGH_ISSUES_TEST_GUIDE.md          # HIGH 이슈 테스트 가이드
    ├── DATA_ENCRYPTION_PLAN.md            # 암호화 계획서 v1.0
    ├── DATA_ENCRYPTION_SPEC.md            # 암호화 사양서 v2.1
    ├── ENCRYPTION_TEST_PLAN.md            # 암호화 테스트 계획
    ├── FIREBASE_SETUP_GUIDE.md            # Firebase 가이드 (텍스트)
    ├── FIREBASE_SETUP_GUIDE.html          # Firebase 가이드 (HTML)
    ├── RELEASE_NOTES.md                   # 릴리스 노트
    ├── EXCEL_EXPORT_BUG_FIX.md            # 엑셀 버그 수정
    └── tasks.md                           # 개발 작업 내역
```

---

*마지막 업데이트: 2026-02-15*
