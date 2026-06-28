<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# tests/unit (Vitest 단위 테스트)

## Purpose
개별 함수/클래스 로직 검증. 암호화, 보안, 유틸리티 함수 등을 고립된 환경에서 테스트.

## Key Files
| File | Description |
|------|-------------|
| `crypto-utils.test.ts` | CryptoUtils: AES-256-GCM 암호화/복호화, 키 생성 |
| `encryption-manager.test.ts` | EncryptionManager: 암호화 상태, 비밀번호 검증, 마이그레이션 |
| `secure-storage.test.ts` | SecureStorage: 암호화 저장소 읽기/쓰기 |
| `path-security.test.ts` | pathSecurity: 경로 순회 공격 방어 |
| `analysis-db.test.ts` | AnalysisDB: 분석 데이터 저장소 쿼리 |
| `toast.test.js` | showToast: 토스트 알림 함수 |
| `utils.test.js` | 유틸리티: 날짜 포맷, 검증 함수 |
| `error-handler.test.js` | ErrorHandler: 에러 캡처, 로깅 |
| `README.md` | 단위 테스트 가이드 |

## For AI Agents

### Working In This Directory

- **테스트 러너**: Vitest (Jest 호환)
- **환경**: jsdom (브라우저 모의)
- **타입**: TypeScript (.test.ts) 및 JavaScript (.test.js)
- **구조**: `describe()` / `it()` / `expect()`
- **Mocking**: `vi.mock()`, `vi.fn()`, `vi.spyOn()`
- **접근성**:
  - CryptoUtils, EncryptionManager: ES6 모듈
  - Toast, ErrorHandler: window 전역 함수 mock
  - PathSecurity: 순수 함수 테스트

### Common Patterns

#### 암호화 테스트
```typescript
import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, generateKey } from '../../src/shared/crypto-utils';

describe('CryptoUtils - AES-256-GCM', () => {
  it('데이터 암호화/복호화', () => {
    const plaintext = '민감한 정보';
    const password = 'test-password123!';
    
    const encrypted = encryptData(plaintext, password);
    expect(encrypted).not.toBe(plaintext); // 암호화 확인
    
    const decrypted = decryptData(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('잘못된 비밀번호 거부', () => {
    const encrypted = encryptData('secret', 'password1!');
    expect(() => decryptData(encrypted, 'wrong-password'))
      .toThrow();
  });

  it('키 생성', () => {
    const key = generateKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('object');
  });
});
```

#### 경로 보안 테스트
```typescript
import { describe, it, expect } from 'vitest';
import { validatePath } from '../../src/shared/path-security';

describe('pathSecurity - 경로 순회 방어', () => {
  it('상대 경로 (..) 차단', () => {
    expect(validatePath('../../../etc/passwd')).toBe(false);
  });

  it('절대 경로 (/etc) 차단', () => {
    expect(validatePath('/etc/passwd')).toBe(false);
  });

  it('정상 파일명 허용', () => {
    expect(validatePath('soil-autosave-2026.json')).toBe(true);
  });
});
```

#### Mock 활용
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('showToast', () => {
  let toastFn;

  beforeEach(() => {
    toastFn = vi.fn();
    window.showToast = toastFn; // Mock 설정
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('토스트 호출', () => {
    showToast('메시지', 'success');
    expect(toastFn).toHaveBeenCalledWith('메시지', 'success');
  });
});
```

### Testing Strategy

1. **실행**: `npx vitest run` (단회)
2. **감시 모드**: `npx vitest` (파일 변경 시 자동 재실행)
3. **커버리지**: `npx vitest run --coverage`

## Dependencies
### Test Framework
- vitest (npm): 테스트 러너
- @vitest/coverage-v8 (npm): 커버리지 리포팅
- happy-dom or jsdom (npm): DOM 모의 환경

### Project Modules
- src/shared/crypto-utils.ts: 암호화 유틸
- src/shared/encryption-manager.ts: 암호화 매니저
- src/shared/path-security.ts: 경로 검증
- 기타 src/ 모듈

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
