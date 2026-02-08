# Claude Code 에이전트 & 스킬 가이드

Claude Code에서 사용 가능한 에이전트(Subagent)와 스킬(Skill) 목록입니다.

---

## 목차

1. [에이전트 (Subagents)](#에이전트-subagents)
   - [핵심 에이전트](#핵심-에이전트)
   - [Agent SDK 개발](#agent-sdk-개발)
   - [Feature Dev 에이전트](#feature-dev-에이전트)
   - [전문가 에이전트](#전문가-에이전트)
2. [스킬 (Skills)](#스킬-skills)
   - [프로젝트 생성](#프로젝트-생성)
   - [코드 개발](#코드-개발)
   - [Git & 코드 관리](#git--코드-관리)
   - [AI 도구](#ai-도구)
   - [콘텐츠 생성](#콘텐츠-생성)
   - [SuperClaude 스킬](#superclaude-스킬-sc)

---

## 에이전트 (Subagents)

에이전트는 복잡한 멀티스텝 작업을 자율적으로 처리하는 특화된 AI입니다.
`Task` 도구를 통해 호출됩니다.

### 핵심 에이전트

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `Bash` | 명령 실행 전문가 | git 작업, 터미널 명령, 시스템 작업 |
| `general-purpose` | 범용 에이전트 | 복잡한 검색, 멀티스텝 작업, 코드 분석 |
| `Explore` | 코드베이스 탐색 전문가 | 파일 패턴 검색, 키워드 검색, 코드베이스 이해 |
| `Plan` | 소프트웨어 아키텍트 | 구현 전략 설계, 단계별 계획 수립 |
| `statusline-setup` | 상태줄 설정 | Claude Code 상태줄 설정 변경 |
| `claude-code-guide` | Claude Code 가이드 | Claude Code, Agent SDK, API 관련 질문 |

### Agent SDK 개발

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `agent-sdk-dev:agent-sdk-verifier-ts` | TypeScript SDK 검증 | TS Agent SDK 앱 설정 및 베스트 프랙티스 검증 |
| `agent-sdk-dev:agent-sdk-verifier-py` | Python SDK 검증 | Python Agent SDK 앱 설정 및 베스트 프랙티스 검증 |

### Feature Dev 에이전트

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `feature-dev:code-reviewer` | 코드 리뷰어 | 버그, 보안 취약점, 코드 품질 이슈 탐지 |
| `feature-dev:code-explorer` | 코드 탐색기 | 실행 경로 추적, 아키텍처 매핑, 패턴 분석 |
| `feature-dev:code-architect` | 코드 설계자 | 기능 아키텍처 설계, 구현 블루프린트 생성 |

### 전문가 에이전트

#### 코드 작성 & 리뷰

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `code-creator` | 코드 작성 전문가 | 새 기능, 컴포넌트, 모듈 생성 |
| `code-reviewer` | 코드 리뷰 전문가 | 코드 품질, 보안, 성능 리뷰 (코드 변경 후 자동 사용) |
| `refactoring-expert` | 리팩토링 전문가 | 코드 품질 개선, 기술 부채 감소, 클린 코드 |

#### 테스트 & 디버깅

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `test-runner` | 테스트 전문가 | 테스트 실행, 커버리지 분석, 테스트 작성 |
| `debugger` | 디버깅 전문가 | 에러 분석, 버그 해결, 예상치 못한 동작 수정 |
| `quality-engineer` | 품질 엔지니어 | 테스트 전략 수립, 엣지 케이스 탐지 |

#### 아키텍처 & 설계

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `system-architect` | 시스템 아키텍트 | 확장 가능한 시스템 설계, 장기 기술 결정 |
| `frontend-architect` | 프론트엔드 아키텍트 | 접근성, 성능, UX 중심 UI 설계 |
| `backend-architect` | 백엔드 아키텍트 | 데이터 무결성, 보안, 내결함성 백엔드 설계 |
| `app-designer` | 앱 디자이너 | UI/UX 디자인, 레이아웃, 스타일링 |

#### 언어별 전문가

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `python-expert` | Python 전문가 | SOLID 원칙, 모던 베스트 프랙티스 Python 개발 |
| `ios-developer` | iOS 개발자 | Swift/SwiftUI, Xcode, iOS 아키텍처, App Store 배포 |

#### 인프라 & 보안

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `devops-architect` | DevOps 아키텍트 | 인프라 자동화, 배포, 관측성 |
| `security-engineer` | 보안 엔지니어 | 보안 취약점 탐지, 보안 표준 준수 |
| `performance-engineer` | 성능 엔지니어 | 측정 기반 분석, 병목 제거 |

#### 문서 & 분석

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `doc-writer` | 문서 작성자 | 코드 문서화, README, API 문서 생성 |
| `technical-writer` | 기술 문서 작성자 | 명확하고 접근성 높은 기술 문서 작성 |
| `requirements-analyst` | 요구사항 분석가 | 모호한 아이디어를 구체적 스펙으로 변환 |
| `root-cause-analyst` | 근본 원인 분석가 | 증거 기반 분석, 가설 검증 |

#### 교육 & 비즈니스

| 에이전트 | 설명 | 사용 시점 |
|----------|------|----------|
| `learning-guide` | 학습 가이드 | 프로그래밍 개념 설명, 실습 예제 |
| `socratic-mentor` | 소크라테스식 멘토 | 발견 학습, 전략적 질문을 통한 교육 |
| `business-panel-experts` | 비즈니스 전문가 패널 | 다중 전문가 비즈니스 전략 분석 (토론/논쟁/소크라테스 모드) |

---

## 스킬 (Skills)

스킬은 `/명령어` 형태로 호출하는 사전 정의된 워크플로우입니다.

### 프로젝트 생성

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/nextjs15-init` | Next.js 15 프로젝트 생성 | Todo, 블로그, 대시보드, E-commerce 등 템플릿 선택 가능. App Router, ShadCN, Zustand, Tanstack Query 포함 |
| `/flutter-init` | Flutter 프로젝트 생성 | Todo, 습관, 노트, 가계부 등 템플릿 선택 가능. Clean Architecture, Riverpod 3.0, Drift 포함 |
| `/agent-sdk-dev:new-sdk-app` | Claude Agent SDK 앱 생성 | 새로운 Agent SDK 애플리케이션 설정 |

### 코드 개발

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/feature-dev` | 가이드 기반 기능 개발 | 코드베이스 이해 → 질문 → 설계 → 구현 → 리뷰 단계별 진행 |
| `/frontend-design` | 고품질 프론트엔드 UI 생성 | 독창적이고 세련된 웹 컴포넌트, 페이지, 앱 생성 |
| `/canvas-design` | 시각적 디자인 생성 | 포스터, 아트, 디자인 작품을 PNG/PDF로 생성 |
| `/landing-page-guide` | 랜딩 페이지 가이드 | 고전환율 랜딩 페이지 11가지 필수 요소 가이드 |
| `/ui-design-system` | UI 디자인 시스템 | 디자인 토큰, 컴포넌트 문서화, 반응형 계산, 개발자 핸드오프 |

### Git & 코드 관리

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/commit` | Git 커밋 생성 | 변경사항 분석 후 의미있는 커밋 메시지 생성 |
| `/commit-push-pr` | 커밋 + 푸시 + PR | 커밋, 원격 푸시, Pull Request 생성 한번에 |
| `/clean_gone` | 삭제된 브랜치 정리 | 원격에서 삭제된 로컬 브랜치 및 워크트리 정리 |
| `/code-review` | 코드 리뷰 | Pull Request 코드 리뷰 |
| `/code-changelog` | 코드 변경 기록 | AI 변경사항을 reviews 폴더에 기록, HTML 뷰어로 확인 |

### AI 도구

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/codex` | OpenAI Codex CLI 실행 | codex exec, codex resume 실행 |
| `/codex-claude-loop` | Claude + Codex 협업 | Claude가 계획/구현, Codex가 검증/리뷰하는 듀얼 AI 루프 |
| `/prompt-enhancer` | 프롬프트 강화 | 프로젝트 컨텍스트(구조, 의존성, 패턴) 기반 프롬프트 개선 |
| `/meta-prompt-generator` | 커스텀 명령어 생성 | 간단한 설명으로 구조화된 슬래시 커맨드 자동 생성 |

### 콘텐츠 생성

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/card-news-generator` | 카드뉴스 생성 | 600x600 인스타그램 스타일 카드뉴스 자동 생성 |
| `/card-news-generator-v2` | 카드뉴스 v2 | 배경 이미지 지원 카드뉴스 생성 |
| `/midjourney-cardnews-bg` | Midjourney 프롬프트 | 카드뉴스 배경용 Midjourney 프롬프트 생성 |

### SuperClaude 스킬 (`/sc:`)

SuperClaude 프레임워크의 고급 스킬입니다.

#### 코드 분석 & 개선

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:analyze` | 종합 코드 분석 | 품질, 보안, 성능, 아키텍처 전반 분석 |
| `/sc:improve` | 코드 개선 | 체계적 품질 개선, 성능 최적화, 유지보수성 향상 |
| `/sc:cleanup` | 코드 정리 | 데드 코드 제거, 프로젝트 구조 최적화 |
| `/sc:explain` | 코드 설명 | 코드, 개념, 시스템 동작을 명확하게 설명 |

#### 개발 & 설계

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:implement` | 기능 구현 | 지능형 페르소나 활성화, MCP 통합 구현 |
| `/sc:design` | 시스템 설계 | 아키텍처, API, 컴포넌트 인터페이스 설계 |
| `/sc:workflow` | 워크플로우 생성 | PRD, 요구사항에서 구조화된 구현 워크플로우 생성 |

#### 빌드 & 테스트

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:build` | 프로젝트 빌드 | 지능형 에러 처리 및 최적화 빌드 |
| `/sc:test` | 테스트 실행 | 커버리지 분석, 자동화된 품질 리포트 |
| `/sc:troubleshoot` | 문제 해결 | 코드, 빌드, 배포, 시스템 동작 이슈 진단 |

#### Git & 버전 관리

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:git` | Git 작업 | 지능형 커밋 메시지, 워크플로우 최적화 |

#### 세션 관리

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:load` | 세션 로드 | Serena MCP로 프로젝트 컨텍스트 로드 |
| `/sc:save` | 세션 저장 | 세션 컨텍스트 영구 저장 |
| `/sc:index` | 프로젝트 인덱싱 | 종합 문서화, 지식 베이스 생성 |

#### 기획 & 분석

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:brainstorm` | 브레인스토밍 | 소크라테스식 대화로 요구사항 발견 |
| `/sc:estimate` | 작업 추정 | 태스크, 기능, 프로젝트 개발 시간 추정 |
| `/sc:reflect` | 작업 검증 | Serena MCP로 태스크 반영 및 검증 |

#### 전문가 패널

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:business-panel` | 비즈니스 패널 | 다중 전문가 비즈니스 전략 분석 |
| `/sc:spec-panel` | 스펙 패널 | 다중 전문가 스펙 리뷰 및 개선 |

#### 도구 & 도움말

| 스킬 | 설명 | 사용 예시 |
|------|------|----------|
| `/sc:select-tool` | 도구 선택 | 복잡도 점수 기반 지능형 MCP 도구 선택 |
| `/sc:spawn` | 태스크 위임 | 메타 시스템 태스크 분해 및 위임 |
| `/sc:help` | 도움말 | 모든 /sc 명령어 목록 표시 |

---

## 사용 팁

### 에이전트 사용 시

```
- 복잡한 멀티스텝 작업에 적합
- 병렬로 여러 에이전트 실행 가능
- 백그라운드 실행 지원
```

### 스킬 사용 시

```
- /명령어 형태로 직접 호출
- 인자를 함께 전달 가능 (예: /commit -m "메시지")
- SuperClaude 스킬은 /sc: 접두사 사용
```

### 추천 워크플로우

1. **새 기능 개발**: `/feature-dev` → 단계별 가이드 진행
2. **코드 리뷰 요청**: `/code-review` 또는 `code-reviewer` 에이전트
3. **커밋 & PR**: `/commit` → `/commit-push-pr`
4. **프로젝트 분석**: `/sc:analyze` → `/sc:improve`
5. **문서화**: `doc-writer` 에이전트 또는 `/sc:document`

---

*이 문서는 Claude Code v2.1.2 기준으로 작성되었습니다.*
