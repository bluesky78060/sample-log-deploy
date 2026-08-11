# AI-PM 컴팩션 후 복구 가이드

## 문제
세션이 컴팩션(요약)되면 ai-pm 프로젝트 컨텍스트가 손실되어 작업을 추적할 수 없게 됩니다.

## 해결 방법

### 1. 영구 보존된 정보 위치

다음 파일들에 프로젝트 정보가 영구적으로 저장되어 있습니다:

#### 📁 `.omc/state/ai-pm-context.json`
```json
{
  "project_id": "2f0cf691-4d0f-49b9-8a61-2531ae879ead",
  "project_name": "TypeScript Migration - Sample Log",
  "epics": { ... }
}
```

#### 📄 `CLAUDE.md` (프로젝트 루트)
- "## AI-PM Project Management" 섹션에 모든 정보 기록됨
- Epic IDs 테이블 포함

#### 🏷️ Remember Tag (우선순위: 영구)
- Claude 메모리에 영구적으로 저장됨
- 컴팩션 후에도 자동으로 복원됨

---

## 컴팩션 후 복구 방법

### 방법 1: CLAUDE.md 참조 (자동)
프로젝트 루트의 `CLAUDE.md` 파일이 항상 로드되므로, 컴팩션 후에도 자동으로 프로젝트 정보를 참조할 수 있습니다.

### 방법 2: 컨텍스트 파일 읽기
```bash
cat .omc/state/ai-pm-context.json
```

### 방법 3: ai-pm 프로젝트 조회
```bash
# MCP tool 사용
mcp__ai-pm__get_project --project_id 2f0cf691-4d0f-49b9-8a61-2531ae879ead
```

---

## 새 작업 생성 시

### 1. Epic 생성
```typescript
mcp__ai-pm__create_epic({
  project_id: "2f0cf691-4d0f-49b9-8a61-2531ae879ead",
  title: "새 기능 개발",
  description: "상세 설명",
  priority: 2
})
```

### 2. Task 생성
```typescript
mcp__ai-pm__create_task({
  epic_id: "<EPIC_ID>",
  title: "작업 이름",
  description: "상세 설명"
})
```

### 3. 작업 진행
```typescript
// 작업 시작
mcp__ai-pm__smart_workflow({
  task_id: "<TASK_ID>",
  action: "start_work"
})

// 테스트 제출
mcp__ai-pm__smart_workflow({
  task_id: "<TASK_ID>",
  action: "submit_test",
  test_results: [{
    type: "build",
    passed: true,
    output: "빌드 출력..."
  }]
})

// 리뷰 승인
mcp__ai-pm__smart_workflow({
  task_id: "<TASK_ID>",
  action: "approve_review",
  notes: "리뷰 완료"
})
```

---

## 프로젝트 정보 (Quick Reference)

**Project ID**: `2f0cf691-4d0f-49b9-8a61-2531ae879ead`

### Epic IDs (모두 완료됨)
| Phase | Epic ID | Status |
|-------|---------|--------|
| Phase 1 | ce436c63-e40a-4b79-8cbd-2ade171110c9 | ✅ |
| Phase 2 | 1434b7c6-4364-44d8-a9d5-ba9f1fd92ba2 | ✅ |
| Phase 3 | 7ef2165c-fe7d-471e-bafe-d3f743d54071 | ✅ |
| Phase 4 | 37f98baf-ae32-4967-8518-955570a649f1 | ✅ |
| Phase 5-1 | 3d0b6738-db36-4280-97c3-3189623eb2d4 | ✅ |
| Phase 5-2 | 7c1d11d5-17fb-4677-af42-eca8d4947d2f | ✅ |
| Phase 6 | 956250be-9317-4dcb-97b2-8cb511ca2cea | ✅ |
| Phase 7 | 255b48a4-dea7-4b83-aaa4-a98730b8b496 | ✅ |

---

## 검증

컴팩션 후 ai-pm이 정상 작동하는지 확인:

```bash
# 프로젝트 정보 조회
mcp__ai-pm__get_project --project_id 2f0cf691-4d0f-49b9-8a61-2531ae879ead

# 작업 목록 조회
mcp__ai-pm__list_tasks --project_id 2f0cf691-4d0f-49b9-8a61-2531ae879ead
```

---

**마지막 업데이트**: 2026-03-04
