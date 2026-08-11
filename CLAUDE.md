# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

시료 접수 대장 (Sample Log) - 농업 시료 관리를 위한 Electron 데스크톱 앱 및 웹 앱. 봉화군 농업기술센터에서 사용하는 시료 접수/관리 시스템.

## Commands

```bash
# 개발 서버 실행
npm start

# 개발 모드 (DevTools 포함)
npm start -- --dev

# 패키지 빌드 (현재 OS용)
npm run package

# 설치 파일 생성 (Windows: exe, macOS: zip)
npm run make
```

## Architecture

### Dual Environment (Electron + Web)

앱은 Electron 데스크톱과 웹 브라우저 양쪽에서 동작함:
- **Electron**: `window.electronAPI`를 통한 파일 시스템 접근
- **Web**: File System Access API 또는 다운로드 폴백

각 스크립트 시작부에서 환경 감지:
```javascript
const isElectron = window.electronAPI?.isElectron === true;
```

### Folder Structure

```
src/                    # Electron 소스 (메인)
├── index.js           # Main process (IPC 핸들러, 창 관리)
├── preload.js         # Context bridge (electronAPI 노출)
├── index.html         # 메인 페이지 (시료 타입 선택)
├── style.css          # 공통 스타일
├── bonghwaData.js     # 봉화군 행정구역 데이터 (자동완성용)
├── cropData.js        # 작물 데이터
├── soil/              # 토양 시료 페이지
├── water/             # 수질분석 시료 페이지
├── compost/           # 퇴·액비 시료 페이지
├── heavy-metal/       # 토양 중금속 시료 페이지
├── pesticide/         # 잔류농약 시료 페이지
└── label-print/       # 라벨 인쇄 기능

docs/                   # GitHub Pages 배포용 (src와 동일하게 유지)
```

### Sample Type Pages

각 시료 타입은 독립된 폴더에 동일한 패턴으로 구성:
- `index.html` - 페이지 구조
- `{type}-script.js` - 비즈니스 로직 (접수, 조회, 내보내기 등)
- `{type}-style.css` - 타입별 추가 스타일

공통 패턴:
- `SAMPLE_TYPE`, `STORAGE_KEY` 상수 정의
- `FileAPI` 객체로 파일 시스템 추상화
- 연도별 데이터 분리 저장 (`{key}_{year}`)
- JSON 자동 저장 (`auto-save-{type}-{year}.json`)

### IPC Communication

Main process (`index.js`)와 Renderer 간 통신:
- `save-file-dialog` / `open-file-dialog`: 파일 다이얼로그
- `write-file` / `read-file`: 파일 읽기/쓰기
- `get-auto-save-path`: 연도별 자동 저장 경로
- `select-auto-save-folder`: 저장 폴더 선택

### Data Storage

- **localStorage**: 브라우저/앱 내 데이터 저장 (연도별 키)
- **JSON 파일**: 자동 저장 및 내보내기/가져오기

## AI-PM Project Management

이 프로젝트는 ai-pm MCP 서버를 사용하여 작업을 추적합니다.

### Project Information

- **Project ID**: `2f0cf691-4d0f-49b9-8a61-2531ae879ead`
- **Project Name**: TypeScript Migration - Sample Log
- **Status**: Completed (2026-03-04)

### Epic IDs

| Phase | Epic ID | Status |
|-------|---------|--------|
| Phase 1: 타입 인프라 구축 | `ce436c63-e40a-4b79-8cbd-2ade171110c9` | ✅ Completed |
| Phase 2: water 모듈 | `1434b7c6-4364-44d8-a9d5-ba9f1fd92ba2` | ✅ Completed |
| Phase 3: heavy-metal 모듈 | `7ef2165c-fe7d-471e-bafe-d3f743d54071` | ✅ Completed |
| Phase 4: compost 모듈 | `37f98baf-ae32-4967-8518-955570a649f1` | ✅ Completed |
| Phase 5-1: pesticide 모듈 | `3d0b6738-db36-4280-97c3-3189623eb2d4` | ✅ Completed |
| Phase 5-2: soil 모듈 | `7c1d11d5-17fb-4677-af42-eca8d4947d2f` | ✅ Completed |
| Phase 6: shared 모듈 | `956250be-9317-4dcb-97b2-8cb511ca2cea` | ✅ Completed |
| Phase 7: 데이터/설정 모듈 | `255b48a4-dea7-4b83-aaa4-a98730b8b496` | ✅ Completed |

### TypeScript Migration Summary

- **Total Errors**: 5,127 → 0 (100% resolved)
- **Files Converted**: 42 TypeScript files
- **Workers Used**: 15 parallel workers
- **Duration**: ~39 minutes

### Using AI-PM

컴팩션 후에도 ai-pm 컨텍스트를 유지하려면 `.omc/state/ai-pm-context.json`을 참조하세요.

새로운 작업 생성 시:
```bash
# Epic 조회
mcp__ai-pm__get_project --project_id 2f0cf691-4d0f-49b9-8a61-2531ae879ead

# Task 생성 (새 Epic 필요 시)
mcp__ai-pm__create_epic --project_id <ID> --title "New Feature"
mcp__ai-pm__create_task --epic_id <EPIC_ID> --title "Task Name"
```

## Development Notes

### src와 docs 동기화

GitHub Pages 배포를 위해 `docs/` 폴더는 `src/`와 동일하게 유지:
```bash
rsync -av --delete --exclude='*.backup' src/ docs/
```

### 새 시료 타입 추가 시

1. `src/{type}/` 폴더 생성
2. 기존 타입 (예: soil) 복사 후 수정
3. `SAMPLE_TYPE`, `STORAGE_KEY` 변경
4. `index.html`에 네비게이션 링크 추가
5. `docs/`에 동기화

### GitHub Actions

태그 푸시 시 Windows 설치 파일 자동 빌드:
```bash
git tag v1.0.0
git push origin v1.0.0
```
