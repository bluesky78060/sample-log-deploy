<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# release (릴리스 노트)

## Purpose
버전별 변경 이력을 타임라인 형식으로 표시하는 페이지. 기능(Feature), 버그 수정(Fix), 보안(Security), 성능(Perf), UI 개선 등 배지로 분류. 다크모드 지원.

## Key Files
| File | Description |
|------|-------------|
| `index.html` | 릴리스 노트 UI: 헤더, 테마 토글, 타임라인, 버전별 카드, 접기/펼치기 토글 |
| `release-script.js` | 간단한 클라이언트 로직: 테마 전환, 버전 카드 접기/펼치기 |

## For AI Agents

### Working In This Directory

- **콘텐츠 관리**: HTML 내 직접 작성 (마크다운 아님)
- **버전 형식**: `v1.7.75` (major.minor.patch)
- **배지 클래스**:
  - `badge-latest`: 최신 버전 (★ 최신)
  - `badge-feature`: 신규기능
  - `badge-fix`: 버그 수정
  - `badge-security`: 보안
  - `badge-perf`: 성능
  - `badge-ui`: UI
  - `badge-in-dev`: 개발 중 (pulsing animation)
- **타임라인**: 왼쪽 수직선 + 버전 점(dot)
  - latest: 초록색, 12px, pulsing
  - 일반: 파란색, 10px
- **스타일**: CSS-in-HTML (2000+줄), Scandinavian Warm 팔레트 (Sage Green #7C9082 + Stone 다크 톤)
- **다크모드**: `[data-theme="dark"]` 속성 기반
- **뉘앙스**: 변경 목록 = bullet 기호 (▸), 기능명은 `<strong>`, 코드는 `<code>`

### Common Patterns

1. **버전 항목 구조**:
   ```html
   <div class="version-entry">
     <div class="version-dot [latest|in-dev]"></div>
     <div class="version-card [collapsed]">
       <div class="version-card-header">
         <div>
           <div class="version-meta">
             <span class="version-number">v1.7.75</span>
             <span class="version-date">2026-03-16</span>
           </div>
           <div class="version-title">제목</div>
         </div>
         <div class="badge-row">
           <span class="badge badge-latest">★ 최신</span>
           <!-- 배지 추가 -->
         </div>
       </div>
       <ul class="change-list">
         <li><strong>기능명</strong> — 설명</li>
       </ul>
     </div>
   </div>
   ```

2. **접기/펼치기**:
   - 기본값: 최신 3개 버전 펼쳐짐, 나머지 닫혀짐
   - class `collapsed` 적용 시 `change-list` 숨김
   - `.toggle-btn` 클릭 이벤트로 토글

3. **다크모드 적응**:
   - 모든 색상 CSS 변수로 정의 (예: --primary, --text-strong)
   - 배경, 텍스트, 배지 색상 전환
   - 애니메이션(badgePulse, dotPulse) 유지

### Testing Requirements

- 렌더링: 30개 이상 버전 항목 로드 성능 확인
- 접기/펼치기: 토글 동작 및 스타일 전환 확인
- 다크모드: 밝은 모드↔어두운 모드 전환 및 색상 적용 확인
- 반응형: 모바일(640px 이하), 태블릿, 데스크톱 레이아웃
- 인쇄: @media print 스타일 적용 (닫기 버튼 숨김 등)

```bash
# 해당 없음 (정적 HTML 페이지)
```

## Dependencies
### Internal
- `window.localStorage`: 테마 선택 저장 (theme-preference)
- `window.location`: 메인 페이지로 이동 (../index.html)

### External
- Google Fonts (Noto Sans KR): Typography

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
