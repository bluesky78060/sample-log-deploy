# Production Deployment Plan: Sample Log Electron App

## Context

### Original Request
테스트 프로젝트에서 배포 프로젝트로 전환하기 위한 안정성, 사용자 경험, 코드 품질 및 배포 자동화 개선 계획.

### User Feedback (Core Problems)
1. **성능 저하/멈춤**: 작업 중 앱이 느려지거나 응답하지 않음
2. **파일 저장/로드 실패**: 가끔 파일 I/O 작업 실패
3. **오프라인 데이터 손실 우려**: 인터넷 끊김 시 데이터 안전성 걱정

### Research Findings

**Current Strengths:**
- Security: PBKDF2 encryption (`encryption-manager.js`), IPC rate limiter, path validation
- Modern Stack: Electron 39, Vite 5, Firebase 12, Playwright
- Windows CI/CD: GitHub Actions auto-build
- 16 E2E tests covering form submissions, navigation, error handling
- `BaseSampleManager` inheritance pattern for consistency

**Improvement Areas Identified:**
- Error handling: Mixed `alert()` and `showToast()` usage
- Firebase sync: No user feedback on failure, no offline queue
- File I/O: No retry logic, unclear loading states
- Network: `NetworkAccess.js` exists but no offline event listeners
- TypeScript: Config exists (`package.json` has `tsc --noEmit`) but no `.ts` files in `src/`
- Unit tests: Only E2E tests exist, no unit tests for shared utilities

### Key Files Analysis

| File | LOC | Purpose | Status |
|------|-----|---------|--------|
| `BaseSampleManager.js` | 1116 | Core sample management | Good architecture, needs error handling |
| `firestore-db.js` | 457 | Firebase CRUD | Missing retry logic, offline queue |
| `file-api.js` | 276 | File I/O abstraction | No retry, no progress feedback |
| `toast.js` | 58 | Toast notifications | Complete, well-structured |
| `network-access.js` | 448 | Network detection | Good base, needs online/offline events |
| `logger.js` | 276 | Logging system | Complete with error buffering |

---

## Work Objectives

### Core Objective
Transform the test project into a production-ready deployment with improved stability, user experience, and maintainability within 2-3 weeks.

### Deliverables
1. **Unified error handling system** with consistent user feedback
2. **Resilient file I/O** with retry logic and progress indicators
3. **Robust Firebase sync** with offline queue and reconnection handling
4. **TypeScript foundation** for new code with JSDoc for existing
5. **80%+ test coverage** for shared utilities
6. **macOS + beta/stable channel** deployment pipeline

### Definition of Done
- [ ] Zero critical bugs in stability features
- [ ] All E2E + new unit tests passing
- [ ] Build succeeds for Windows and macOS
- [ ] Offline data persistence verified
- [ ] TypeScript compilation clean (`npm run typecheck`)

---

## Guardrails

### Must Have
- All error handling goes through unified system
- File I/O operations have retry with exponential backoff
- Offline mode preserves data integrity
- Loading states for all async operations
- TypeScript strict mode for new files

### Must NOT Have
- UI redesign or visual changes beyond loading indicators
- Breaking changes to existing data format
- New dependencies unless absolutely necessary
- Changes to Firebase collection structure

---

## Task Flow and Dependencies

```
Phase 1 (Week 1)
    |
    v
[1.1 Error System] --> [1.2 Network Events] --> [1.3 File I/O Retry] --> [1.4 Firebase Sync]
                                                        |
                                                        v
Phase 2 (Week 2)                                  [2.1 Loading UI]
    |                                                   |
    v                                                   v
[2.2 Cancel Actions] --> [2.3 Error Recovery] --> [2.4 Performance]
                                                        |
                                                        v
Phase 3 (Days 15-18)                              [3.1 TypeScript]
    |                                                   |
    v                                                   v
[3.2 Unit Tests] --> [3.3 ESLint/Prettier] --> [3.4 CI Integration]
                                                        |
                                                        v
Phase 4 (Days 19-21)                              [4.1 macOS Build]
    |                                                   |
    v                                                   v
[4.2 Channels] --> [4.3 Auto-Update] --> [4.4 Release Checklist]
```

---

## Phase 1: Stability Improvements (Week 1)

### Task 1.1: Unified Error Handling System

**Estimated Time:** 4 hours

**Files to Modify:**
- `src/shared/error-handler.js` (NEW)
- `src/shared/BaseSampleManager.js`
- All 5 sample type scripts (`soil-script.js`, `water-script.js`, etc.)

**Implementation:**
```javascript
// src/shared/error-handler.js (NEW)
class ErrorHandler {
    static handle(error, context, options = {}) {
        const { silent = false, retry = null, fallback = null } = options;

        // Log to buffer
        logger.error(`[${context}]`, error);

        // User feedback via toast (not alert)
        if (!silent) {
            const message = this.getUserMessage(error, context);
            showToast(message, 'error');
        }

        // Retry callback if provided
        if (retry && typeof retry === 'function') {
            return retry();
        }

        // Fallback value
        return fallback;
    }

    static getUserMessage(error, context) {
        const messages = {
            'NETWORK': '네트워크 연결을 확인해주세요.',
            'FILE_READ': '파일을 읽을 수 없습니다.',
            'FILE_WRITE': '파일 저장에 실패했습니다.',
            'FIREBASE_SYNC': '클라우드 동기화에 실패했습니다. 로컬에 저장됩니다.',
            'VALIDATION': '입력값을 확인해주세요.'
        };
        return messages[context] || '오류가 발생했습니다.';
    }
}
```

**Acceptance Criteria:**
- [ ] All `alert()` calls replaced with `showToast()` or error handler
- [ ] Error context logged with stack trace
- [ ] User sees actionable Korean messages
- [ ] No console.error without logger wrapper

**Rollback Plan:**
Keep original `try-catch` blocks as comments until Phase 2 verified stable.

---

### Task 1.2: Network Status Detection

**Estimated Time:** 3 hours

**Files to Modify:**
- `src/shared/network-status.js` (NEW)
- `src/shared/BaseSampleManager.js`
- `src/shared/firestore-db.js`

**Implementation:**
```javascript
// src/shared/network-status.js (NEW)
class NetworkStatus {
    constructor() {
        this.isOnline = navigator.onLine;
        this.listeners = new Set();
        this.offlineQueue = [];

        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleOnline() {
        this.isOnline = true;
        showToast('인터넷에 연결되었습니다.', 'success');
        this.processOfflineQueue();
        this.notifyListeners();
    }

    handleOffline() {
        this.isOnline = false;
        showToast('오프라인 모드입니다. 변경사항은 로컬에 저장됩니다.', 'warning');
        this.notifyListeners();
    }

    queueOperation(operation) {
        this.offlineQueue.push({
            operation,
            timestamp: Date.now()
        });
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    }

    async processOfflineQueue() {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const item of queue) {
            try {
                await item.operation();
            } catch (e) {
                this.offlineQueue.push(item); // Re-queue on failure
            }
        }

        if (this.offlineQueue.length === 0) {
            localStorage.removeItem('offlineQueue');
            showToast('오프라인 변경사항이 동기화되었습니다.', 'success');
        }
    }
}

window.networkStatus = new NetworkStatus();
```

**Acceptance Criteria:**
- [ ] Online/offline events trigger toast notifications
- [ ] Offline operations queued in localStorage
- [ ] Queue processed on reconnection
- [ ] Failed operations re-queued

**Rollback Plan:**
Disable event listeners; app falls back to existing behavior.

---

### Task 1.3: File I/O Retry Logic

**Estimated Time:** 4 hours

**Files to Modify:**
- `src/shared/file-api.js`
- `src/index.js` (Electron main process)

**Implementation:**
```javascript
// Add to file-api.js
const RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000
};

async function withRetry(operation, context) {
    let lastError;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt < RETRY_CONFIG.maxAttempts) {
                const delay = Math.min(
                    RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
                    RETRY_CONFIG.maxDelay
                );
                logger.warn(`[FileAPI] ${context} 실패 (${attempt}/${RETRY_CONFIG.maxAttempts}), ${delay}ms 후 재시도`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    throw lastError;
}

// Update autoSave method
async autoSave(content) {
    return withRetry(async () => {
        if (isElectron && this.autoSavePath && window.electronAPI) {
            const result = await window.electronAPI.writeFile(this.autoSavePath, content);
            if (!result.success) throw new Error(result.error || 'Write failed');
            return true;
        }
        // ... web fallback
    }, 'autoSave');
}
```

**Acceptance Criteria:**
- [ ] File operations retry up to 3 times
- [ ] Exponential backoff between retries
- [ ] User notified on final failure
- [ ] Success on any attempt completes operation

**Rollback Plan:**
Set `RETRY_CONFIG.maxAttempts = 1` to disable retry.

---

### Task 1.4: Firebase Sync Improvements

**Estimated Time:** 5 hours

**Files to Modify:**
- `src/shared/firestore-db.js`
- `src/shared/BaseSampleManager.js`

**Implementation:**
```javascript
// Add to firestore-db.js
const SYNC_CONFIG = {
    maxRetries: 3,
    retryDelay: 2000
};

async function withFirebaseRetry(operation, context) {
    for (let i = 0; i < SYNC_CONFIG.maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === SYNC_CONFIG.maxRetries - 1) {
                // Queue for offline processing
                if (window.networkStatus) {
                    window.networkStatus.queueOperation(operation);
                }
                throw error;
            }
            await new Promise(r => setTimeout(r, SYNC_CONFIG.retryDelay));
        }
    }
}

// Update batchSave
async function batchSave(sampleType, year, documents) {
    if (!window.firebaseConfig?.isEnabled() || !documents.length) {
        return false;
    }

    // Check network status first
    if (window.networkStatus && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(() =>
            batchSave(sampleType, year, documents)
        );
        showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        return true; // Queued successfully
    }

    return withFirebaseRetry(async () => {
        // ... existing batchSave logic
    }, 'batchSave');
}
```

**Acceptance Criteria:**
- [ ] Firebase operations retry on failure
- [ ] Offline operations queued for later
- [ ] User sees sync status toast
- [ ] No data loss on network interruption

**Rollback Plan:**
Revert to original `try-catch` without retry.

---

## Phase 2: User Experience Improvements (Week 2)

### Task 2.1: Loading State UI

**Estimated Time:** 4 hours

**Files to Modify:**
- `src/shared/loading-manager.js` (NEW)
- `src/shared/style.css`
- `src/shared/BaseSampleManager.js`

**Implementation:**
```javascript
// src/shared/loading-manager.js (NEW)
class LoadingManager {
    constructor() {
        this.activeOperations = new Map();
        this.createOverlay();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'loadingOverlay';
        this.overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p class="loading-message"></p>
                <button class="loading-cancel hidden">취소</button>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    show(operationId, message, options = {}) {
        const { cancellable = false, onCancel = null } = options;

        this.activeOperations.set(operationId, { message, onCancel });
        this.overlay.querySelector('.loading-message').textContent = message;

        const cancelBtn = this.overlay.querySelector('.loading-cancel');
        if (cancellable && onCancel) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = () => {
                onCancel();
                this.hide(operationId);
            };
        } else {
            cancelBtn.classList.add('hidden');
        }

        this.overlay.classList.add('visible');
    }

    hide(operationId) {
        this.activeOperations.delete(operationId);
        if (this.activeOperations.size === 0) {
            this.overlay.classList.remove('visible');
        }
    }

    updateMessage(operationId, message) {
        if (this.activeOperations.has(operationId)) {
            this.overlay.querySelector('.loading-message').textContent = message;
        }
    }
}

window.loadingManager = new LoadingManager();
```

**CSS:**
```css
/* Add to style.css */
#loadingOverlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
}

#loadingOverlay.visible {
    opacity: 1;
    pointer-events: all;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #E8E4DF;
    border-top-color: #7C9082;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

**Acceptance Criteria:**
- [ ] Loading overlay shows during async operations
- [ ] Message describes current operation
- [ ] Cancel button appears for long operations
- [ ] Multiple overlapping operations handled

**Rollback Plan:**
Remove `loadingManager.show()` calls; no visual change.

---

### Task 2.2: Cancel Actions for Long Operations

**Estimated Time:** 3 hours

**Files to Modify:**
- `src/shared/BaseSampleManager.js`
- `src/shared/firestore-db.js`

**Implementation:**
```javascript
// Add AbortController support to batchSave
async function batchSave(sampleType, year, documents, options = {}) {
    const { signal } = options;

    // Check if cancelled before each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        if (signal?.aborted) {
            throw new DOMException('Operation cancelled', 'AbortError');
        }

        // ... existing chunk processing

        // Update progress
        if (window.loadingManager) {
            window.loadingManager.updateMessage(
                'firebase-sync',
                `동기화 중... (${chunkIndex + 1}/${chunks.length})`
            );
        }
    }
}
```

**Acceptance Criteria:**
- [ ] Long operations can be cancelled
- [ ] Partial progress preserved on cancel
- [ ] User notified of cancellation

**Rollback Plan:**
Remove AbortController checks; operations complete fully.

---

### Task 2.3: Error Recovery Guidance

**Estimated Time:** 2 hours

**Files to Modify:**
- `src/shared/error-handler.js`
- `src/shared/toast.js`

**Implementation:**
```javascript
// Enhanced toast with action button
function showToast(message, type = 'success', options = {}) {
    const { action, actionLabel, duration = TOAST_DURATION } = options;

    // ... existing toast creation

    if (action && actionLabel) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'toast-action';
        actionBtn.textContent = actionLabel;
        actionBtn.onclick = () => {
            action();
            toast.remove();
        };
        toast.appendChild(actionBtn);
    }
}

// Error handler with recovery
ErrorHandler.handle(error, 'FILE_WRITE', {
    action: () => manager.performAutoSave(),
    actionLabel: '다시 시도'
});
```

**Acceptance Criteria:**
- [ ] Error toasts include retry option
- [ ] Clear instructions in Korean
- [ ] Recovery actions work correctly

---

### Task 2.4: Performance Optimization

**Estimated Time:** 4 hours

**Files to Modify:**
- `src/shared/BaseSampleManager.js`
- `src/shared/PaginationManager.js`

**Implementation:**
```javascript
// Virtual scrolling for large datasets
class VirtualList {
    constructor(container, options) {
        this.itemHeight = options.itemHeight || 48;
        this.buffer = options.buffer || 5;
        this.renderItem = options.renderItem;

        this.container = container;
        this.container.style.overflow = 'auto';

        this.container.addEventListener('scroll',
            this.debounce(() => this.render(), 16)
        );
    }

    setData(data) {
        this.data = data;
        this.render();
    }

    render() {
        const scrollTop = this.container.scrollTop;
        const viewportHeight = this.container.clientHeight;

        const startIndex = Math.max(0,
            Math.floor(scrollTop / this.itemHeight) - this.buffer
        );
        const endIndex = Math.min(this.data.length,
            Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.buffer
        );

        // Only render visible items
        // ... implementation
    }
}
```

**Acceptance Criteria:**
- [ ] 1000+ records render without lag
- [ ] Scroll performance smooth (60fps)
- [ ] Memory usage stable

**Rollback Plan:**
Use existing pagination without virtual scrolling.

---

## Phase 3: Code Quality & Testing (Days 15-18)

### Task 3.1: TypeScript Introduction

**Estimated Time:** 6 hours

**Files to Create/Modify:**
- `tsconfig.json` (NEW)
- `src/types/index.d.ts` (NEW)
- `src/shared/*.js` (add JSDoc types)

**Implementation:**
```json
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true,
        "allowJs": true,
        "checkJs": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "types": ["node", "electron"]
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "out"]
}
```

```typescript
// src/types/index.d.ts
interface SampleLog {
    id: string;
    name: string;
    phoneNumber: string;
    date: string;
    completed: boolean;
    createdAt?: FirebaseTimestamp;
    updatedAt?: FirebaseTimestamp;
}

interface FileAPIInstance {
    autoSavePath: string | null;
    autoSaveFileName: string | null;
    sampleType: string;
    init(year: number | string): Promise<void>;
    updateAutoSavePath(year: number | string): Promise<void>;
    saveFile(content: string, suggestedName?: string): Promise<boolean>;
    openFile(): Promise<string | null>;
    autoSave(content: string): Promise<boolean>;
    loadAutoSave(): Promise<string | null>;
}
```

**Acceptance Criteria:**
- [ ] `npm run typecheck` passes
- [ ] All shared modules have JSDoc types
- [ ] New files created in TypeScript
- [ ] IDE autocomplete works

**Rollback Plan:**
Types are optional; remove `tsconfig.json` to disable.

---

### Task 3.2: Unit Tests for Shared Utilities

**Estimated Time:** 8 hours

**Files to Create:**
- `tests/unit/error-handler.test.js`
- `tests/unit/network-status.test.js`
- `tests/unit/file-api.test.js`
- `tests/unit/firestore-db.test.js`
- `vitest.config.js`

**Implementation:**
```javascript
// tests/unit/error-handler.test.js
import { describe, it, expect, vi } from 'vitest';
import { ErrorHandler } from '../../src/shared/error-handler.js';

describe('ErrorHandler', () => {
    it('should call logger.error with context', () => {
        const logSpy = vi.spyOn(window.logger, 'error');
        const error = new Error('Test error');

        ErrorHandler.handle(error, 'TEST');

        expect(logSpy).toHaveBeenCalledWith('[TEST]', error);
    });

    it('should return fallback value on error', () => {
        const result = ErrorHandler.handle(new Error(), 'TEST', {
            silent: true,
            fallback: 'default'
        });

        expect(result).toBe('default');
    });

    it('should execute retry callback', async () => {
        let attempts = 0;
        const retry = vi.fn(() => ++attempts);

        ErrorHandler.handle(new Error(), 'TEST', { retry });

        expect(retry).toHaveBeenCalled();
        expect(attempts).toBe(1);
    });
});
```

**Coverage Targets:**

| Module | Target | Key Test Cases |
|--------|--------|----------------|
| `error-handler.js` | 90% | Error types, retry, fallback |
| `network-status.js` | 85% | Online/offline events, queue |
| `file-api.js` | 80% | Retry logic, web/electron split |
| `firestore-db.js` | 80% | CRUD, batch, offline |
| `toast.js` | 90% | Types, actions, duration |

**Acceptance Criteria:**
- [ ] 80%+ coverage for shared folder
- [ ] All critical paths tested
- [ ] Mocks for browser APIs
- [ ] CI runs tests on PR

**Rollback Plan:**
Tests are additive; removal has no effect on app.

---

### Task 3.3: ESLint + Prettier Setup

**Estimated Time:** 2 hours

**Files to Create:**
- `.eslintrc.js`
- `.prettierrc`
- `.eslintignore`

**Implementation:**
```javascript
// .eslintrc.js
module.exports = {
    env: {
        browser: true,
        es2022: true,
        node: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'off', // Logger handles this
        'prefer-const': 'error',
        'no-var': 'error'
    },
    globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        firebase: 'readonly'
    }
};
```

```json
// .prettierrc
{
    "semi": true,
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "none",
    "printWidth": 100
}
```

**Acceptance Criteria:**
- [ ] `npm run lint` passes
- [ ] Format on save works in VS Code
- [ ] Pre-commit hook formats staged files

---

### Task 3.4: CI Integration

**Estimated Time:** 3 hours

**Files to Modify:**
- `.github/workflows/build.yml`
- `.github/workflows/ci.yml` (NEW)

**Implementation:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Acceptance Criteria:**
- [ ] CI runs on every PR
- [ ] Type check, lint, tests all pass
- [ ] Coverage report uploaded
- [ ] Build blocked on failure

---

## Phase 4: Deployment Automation (Days 19-21)

### Task 4.1: macOS Build

**Estimated Time:** 4 hours

**Files to Modify:**
- `.github/workflows/build.yml`
- `forge.config.js` (if exists, or `package.json`)

**Implementation:**
```yaml
# Add to build.yml
jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build macOS package
        run: npm run make -- --platform darwin
        env:
          CSC_LINK: ${{ secrets.MAC_CERT_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-installer
          path: out/make/**/*
```

**Acceptance Criteria:**
- [ ] macOS build succeeds in CI
- [ ] `.zip` artifact created
- [ ] Code signing works (if certs provided)
- [ ] App runs on macOS

---

### Task 4.2: Beta/Stable Channels

**Estimated Time:** 3 hours

**Files to Modify:**
- `package.json`
- `.github/workflows/build.yml`
- `src/index.js`

**Implementation:**
```javascript
// In src/index.js
const CHANNEL = process.env.RELEASE_CHANNEL || 'stable';

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'bluesky78060',
    repo: 'sample-log-electron',
    releaseType: CHANNEL === 'beta' ? 'prerelease' : 'release'
});

// Channel indicator in title
if (CHANNEL === 'beta') {
    mainWindow.setTitle(mainWindow.getTitle() + ' [BETA]');
}
```

```yaml
# GitHub Actions workflow
  - name: Build with channel
    run: npm run make
    env:
      RELEASE_CHANNEL: ${{ github.event.inputs.channel || 'stable' }}
```

**Acceptance Criteria:**
- [ ] Beta releases marked as prerelease
- [ ] Stable users don't see beta updates
- [ ] Beta tag visible in app title
- [ ] Manual workflow dispatch for channel selection

---

### Task 4.3: Auto-Update Improvements

**Estimated Time:** 3 hours

**Files to Modify:**
- `src/index.js`
- `src/preload.js`
- `src/shared/update-notifier.js` (NEW)

**Implementation:**
```javascript
// src/shared/update-notifier.js (NEW)
class UpdateNotifier {
    constructor() {
        this.updateAvailable = false;
        this.updateInfo = null;
    }

    showUpdateDialog(info) {
        this.updateInfo = info;

        const modal = document.createElement('div');
        modal.id = 'updateModal';
        modal.innerHTML = `
            <div class="update-content">
                <h2>새 버전 사용 가능</h2>
                <p>버전 ${info.version}이 준비되었습니다.</p>
                <div class="release-notes">${info.releaseNotes || ''}</div>
                <div class="update-actions">
                    <button class="btn-later">나중에</button>
                    <button class="btn-update">지금 업데이트</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.btn-update').onclick = () => {
            window.electronAPI.quitAndInstall();
        };

        modal.querySelector('.btn-later').onclick = () => {
            modal.remove();
        };
    }
}
```

**Acceptance Criteria:**
- [ ] Update notification shows version and release notes
- [ ] User can choose to update now or later
- [ ] Download progress shown
- [ ] Graceful handling of download failure

---

### Task 4.4: Release Checklist Automation

**Estimated Time:** 2 hours

**Files to Create:**
- `.github/RELEASE_CHECKLIST.md`
- `scripts/release.js`

**Implementation:**
```javascript
// scripts/release.js
const { execSync } = require('child_process');
const readline = require('readline');

const checklist = [
    'All tests passing locally?',
    'CHANGELOG.md updated?',
    'Version bumped in package.json?',
    'No uncommitted changes?',
    'Ready to tag and release?'
];

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    for (const item of checklist) {
        const answer = await question(rl, `${item} (y/n): `);
        if (answer.toLowerCase() !== 'y') {
            console.log('Release aborted.');
            process.exit(1);
        }
    }

    const version = require('../package.json').version;
    execSync(`git tag -a v${version} -m "Release v${version}"`);
    execSync('git push origin --tags');

    console.log(`Released v${version}!`);
}
```

**Acceptance Criteria:**
- [ ] Interactive checklist before release
- [ ] Auto-tags version from package.json
- [ ] Pushes tag to trigger CI
- [ ] Documents release process

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Firebase offline queue data loss | High | Low | localStorage backup + sync validation |
| TypeScript migration breaks build | Medium | Medium | Gradual adoption, `allowJs: true` |
| macOS code signing fails | Medium | Medium | Optional signing, unsigned dev builds |
| Performance regression | High | Low | Benchmark before/after, virtual scrolling |

---

## Success Criteria

### Phase 1 (Week 1)
- [ ] Zero `alert()` calls in codebase
- [ ] Offline mode preserves all data
- [ ] File I/O retry works (verified by manual test)

### Phase 2 (Week 2)
- [ ] Loading states visible for all async operations
- [ ] Error messages include recovery options
- [ ] 1000+ record performance acceptable

### Phase 3 (Days 15-18)
- [ ] TypeScript compilation clean
- [ ] 80%+ test coverage for shared folder
- [ ] CI pipeline green

### Phase 4 (Days 19-21)
- [ ] macOS build artifact created
- [ ] Beta/stable channels working
- [ ] Auto-update shows release notes

---

## Commit Strategy

Each phase should have multiple focused commits:

**Phase 1 Commits:**
1. `feat(error): add unified error handling system`
2. `feat(network): add online/offline detection with queue`
3. `feat(file): add retry logic with exponential backoff`
4. `feat(firebase): add sync retry and offline queue`

**Phase 2 Commits:**
1. `feat(ui): add loading overlay component`
2. `feat(ui): add cancel support for long operations`
3. `feat(ux): add error recovery guidance`
4. `perf: optimize large dataset rendering`

**Phase 3 Commits:**
1. `chore: add TypeScript configuration`
2. `test: add unit tests for shared utilities`
3. `chore: add ESLint and Prettier configuration`
4. `ci: add type check and test workflow`

**Phase 4 Commits:**
1. `ci: add macOS build workflow`
2. `feat: add beta/stable release channels`
3. `feat: improve auto-update with release notes`
4. `chore: add release checklist script`

---

## Appendix: File Change Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | 2 | 4 |
| 2 | 1 | 4 |
| 3 | 8 | 3 |
| 4 | 3 | 3 |
| **Total** | **14** | **14** |
