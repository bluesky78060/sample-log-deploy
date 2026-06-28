<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# tests (테스트 스위트)

## Purpose
E2E(Playwright) 및 단위 테스트(Vitest) 통합 테스트 세트. 시료 접수, 조회, 수정, 삭제, 데이터 지속성, 엑셀 가져오기/내보내기, 폼 제출 등을 검증.

## Key Files
| File | Description |
|------|-------------|
| `e2e/` | Playwright E2E 테스트 (브라우저 자동화) |
| `unit/` | Vitest 단위 테스트 (함수/클래스 로직) |
| `docs/` | 테스트 문서 및 메뉴얼 (이미지 포함) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `e2e/` | Playwright E2E 테스트 (28개 spec 파일) |
| `unit/` | Vitest 단위 테스트 (8개 test 파일) |
| `docs/` | 테스트 문서 및 스크린샷 |

## For AI Agents

### Working In This Directory

- **테스트 프레임워크**:
  - **E2E**: Playwright (headless browser 자동화)
  - **Unit**: Vitest (Vue 친화적 테스트 러너)
- **설정**: `playwright.config.js`, `vitest.config.js` (루트)
- **테스트 데이터**: localStorage mock, JSON 샘플 데이터
- **액세스**: 로컬 dev server 또는 GitHub Pages 정적 호스팅

### Testing Requirements

#### E2E 테스트 실행

```bash
# 전체 E2E 테스트
npx playwright test

# 특정 spec 실행
npx playwright test tests/e2e/soil-form.spec.js

# UI 모드 (대화형)
npx playwright test --ui

# 디버그 모드
npx playwright test --debug
```

#### Unit 테스트 실행

```bash
# 전체 단위 테스트
npx vitest run

# 감시 모드 (파일 변경 시 자동 재실행)
npx vitest

# 커버리지 생성
npx vitest run --coverage
```

### Test Organization

#### E2E 테스트 (28개)
| 카테고리 | 파일 | 목적 |
|---------|------|------|
| 폼/데이터 | soil-form.spec.js, water-form.spec.js, pesticide-form.spec.js, compost-form.spec.js, heavy-metal-form.spec.js | 시료 타입별 접수 폼 제출 |
| 조회/편집 | edit-test.spec.js, edit-delete.spec.js | 데이터 수정/삭제 |
| 필터링 | search-filter.spec.js | 검색/필터 기능 |
| UI | theme-toggle.spec.js, screenshots.spec.js | 테마 전환, 스크린샷 |
| 네비게이션 | navigation.spec.js | 페이지 이동 |
| 접근성 | accessibility.spec.js | WCAG 규칙 |
| 데이터 지속 | data-persistence.spec.js | localStorage 저장 확인 |
| 중복 처리 | parcel-duplicate.spec.js | 필지 중복 검증 |
| 에러 처리 | error-handling.spec.js | 예외 상황 처리 |

#### Unit 테스트 (8개)
| 파일 | 대상 | 목적 |
|------|------|------|
| crypto-utils.test.ts | CryptoUtils | AES-256-GCM 암호화/복호화 |
| encryption-manager.test.ts | EncryptionManager | 암호화 매니저 로직 |
| secure-storage.test.ts | SecureStorage | 보안 저장소 |
| path-security.test.ts | pathSecurity | 경로 순회 방어 |
| analysis-db.test.ts | AnalysisDB | 분석 데이터 저장소 |
| toast.test.js | showToast | 토스트 알림 |
| utils.test.js | 유틸리티 함수 | 날짜, 형식 등 |
| error-handler.test.js | ErrorHandler | 에러 처리 |

### Common Patterns

#### E2E (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test('시료 등록 완료', async ({ page }) => {
  await page.goto('http://localhost:5173/src/soil/');
  await page.fill('input[name="applicantName"]', '홍길동');
  await page.click('button:has-text("저장")');
  await expect(page.locator('text=저장되었습니다')).toBeVisible();
});
```

#### Unit (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../src/shared/crypto-utils';

describe('CryptoUtils', () => {
  it('데이터 암호화/복호화', () => {
    const encrypted = encryptData('secret', 'password');
    const decrypted = decryptData(encrypted, 'password');
    expect(decrypted).toBe('secret');
  });
});
```

### Environment Setup

1. **DevServer**: `npm start` (Vite 포트 5173)
2. **Playwright Config**:
   - Chrome headless, Firefox, WebKit
   - Retry: 2회
   - Timeout: 30초
3. **Vitest Config**:
   - jsdom 환경
   - Coverage 도구: v8

## Dependencies
### Test Frameworks
- playwright (npm): E2E 테스트
- vitest (npm): 단위 테스트
- @vitest/coverage-v8 (npm): 커버리지 리포팅

### Project Dependencies
- vite: 번들러/DevServer
- typescript: 타입 체크
- (모든 src/ 모듈)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재고생됩니다 -->
