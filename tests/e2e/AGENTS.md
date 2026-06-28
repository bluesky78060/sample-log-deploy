<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# tests/e2e (Playwright E2E 테스트)

## Purpose
브라우저 자동화를 통한 시스템 전체 동작 검증. 사용자 시나리오(접수, 조회, 수정, 삭제, 검색 등)를 실제 DOM 조작으로 테스트.

## Key Files
| File | Description |
|------|-------------|
| 폼/제출 | soil-form.spec.js, water-form.spec.js, pesticide-form.spec.js, compost-form.spec.js, heavy-metal-form.spec.js | 5개 시료 타입별 접수 폼 제출 |
| 조회/편집 | edit-test.spec.js, edit-delete.spec.js | 데이터 수정/삭제 동작 |
| 검색/필터 | search-filter.spec.js | 검색어/날짜 범위 필터링 |
| UI | theme-toggle.spec.js, screenshots.spec.js | 다크모드 전환, 스크린샷 캡처 |
| 네비게이션 | navigation.spec.js | 페이지 간 이동 |
| 접근성 | accessibility.spec.js | WCAG 규칙 자동 검사 |
| 지속성 | data-persistence.spec.js | localStorage 저장 확인 |
| 중복 | parcel-duplicate.spec.js | 필지 중복 검증 로직 |
| 에러 | error-handling.spec.js | 예외 처리 (오류 팝업 등) |

## For AI Agents

### Working In This Directory

- **브라우저 타겟**: Chrome, Firefox, WebKit (병렬 실행)
- **DevServer**: `npm start` (Vite, 기본 포트 5173)
- **테스트 URL**: `http://localhost:5173/src/{type}/` (soil, water, pesticide, compost, heavy-metal)
- **Selector 패턴**:
  - 텍스트: `page.locator('button:has-text("저장")')`
  - name 속성: `page.fill('input[name="applicantName"]', '값')`
  - id: `page.click('#btnSave')`
  - 클래스: `page.locator('.sample-table')`
- **대기 전략**:
  - `toBeVisible()`: 요소 표시 대기
  - `waitForNavigation()`: 페이지 이동 대기
  - `waitForTimeout()`: 명시적 지연 (마지막 수단)
- **localStorage**: `page.evaluate()` 로 직접 접근
- **스크린샷**: `page.screenshot()` → `test-results/` 디렉터리

### Common Patterns

#### 기본 폼 제출
```typescript
test('시료 등록', async ({ page }) => {
  await page.goto('http://localhost:5173/src/soil/');
  
  // 폼 입력
  await page.fill('input[name="applicantName"]', '홍길동');
  await page.fill('input[name="address"]', '서울시');
  await page.click('button:has-text("저장")');
  
  // 토스트 확인
  await expect(page.locator('text=저장되었습니다')).toBeVisible();
  
  // 테이블 확인
  await expect(page.locator('table')).toContainText('홍길동');
});
```

#### 수정/삭제
```typescript
test('시료 수정', async ({ page }) => {
  // 목록에서 행 클릭
  await page.click('table tbody tr:first-child');
  
  // 수정 모달/폼에서 값 변경
  await page.fill('input[name="applicantName"]', '김영희');
  
  // 저장
  await page.click('button:has-text("저장")');
  await expect(page.locator('text=수정되었습니다')).toBeVisible();
});
```

#### 검색/필터
```typescript
test('검색 필터', async ({ page }) => {
  // 검색 필드
  await page.fill('input[placeholder="검색"]', '홍길동');
  await page.click('button:has-text("검색")');
  
  // 결과 확인
  await expect(page.locator('table tbody')).toContainText('홍길동');
  await expect(page.locator('table tbody')).not.toContainText('김영희');
});
```

#### localStorage 검증
```typescript
test('데이터 지속성', async ({ page }) => {
  // 데이터 저장 후
  const saved = await page.evaluate(() => 
    localStorage.getItem('test_soilSampleLogs_2026')
  );
  const data = JSON.parse(saved);
  expect(data.length).toBeGreaterThan(0);
});
```

#### 접근성 검사
```typescript
test('접근성 규칙', async ({ page }) => {
  await page.goto('http://localhost:5173/src/soil/');
  
  const violations = await page.evaluate(async () => {
    // axe-core 또는 내장 접근성 검사
    const hasAlt = document.querySelectorAll('img:not([alt])').length === 0;
    const hasLabels = document.querySelectorAll('input:not([aria-label]):not([id])')
      .length === 0;
    return hasAlt && hasLabels;
  });
  
  expect(violations).toBe(true);
});
```

### Testing Strategy

1. **시작 전**: DevServer 실행 확인 (`npm start`)
2. **실행**: `npx playwright test` (모든 spec)
3. **디버그**: `--debug` 플래그로 단계별 실행
4. **리포트**: `test-results/` 및 `playwright-report/` 생성

## Dependencies
### Test Framework
- @playwright/test (npm): E2E 테스트 엔진

### Project
- vite: DevServer
- 모든 src/ 모듈 (시료 타입, 공유 모듈)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
