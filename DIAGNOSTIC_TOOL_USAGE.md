# Firebase 진단 도구 사용 가이드

## 개요

Firebase 연결 상태를 진단하고 자동 복구하는 도구입니다. 브라우저 개발자 콘솔에서 사용할 수 있습니다.

## 주요 기능

1. **6가지 항목 자동 진단**
   - Firebase 설정 로드 확인
   - Firebase 초기화 확인
   - 인증 상태 확인
   - 네트워크 연결 확인
   - Firestore 연결 테스트
   - 오프라인 큐 상태 확인

2. **자동 복구**
   - Firebase 재초기화 시도
   - 연결 문제 자동 감지 및 복구
   - 오프라인/온라인 상태 전환 처리

3. **주기적 헬스 체크**
   - 1분마다 연결 상태 자동 확인
   - 문제 발생 시 토스트 알림

## 사용 방법

### 1. 현재 상태 진단

브라우저 개발자 콘솔(F12)에서 다음 명령 실행:

```javascript
await runFirebaseDiagnostics();
```

**결과 예시:**
```
🔍 Firebase 연결 진단 시작...
📊 진단 결과
전체 상태: healthy

검사항목                  통과    메시지
─────────────────────────────────────────
configLoaded              ✅     Firebase 설정이 로드되었습니다.
initialized               ✅     Firebase가 초기화되었습니다.
authenticated             ✅     익명 모드입니다.
networkOnline             ✅     온라인 상태입니다.
firestoreConnection       ✅     Firestore 연결이 정상입니다.
offlineQueue              ✅     오프라인 큐가 비어있습니다.
```

### 2. 재연결 시도

연결 문제가 있을 때:

```javascript
await reconnectFirebase();
```

**자동 복구 시나리오:**
- **정상 상태**: "연결 정상" 메시지 표시
- **오프라인**: "오프라인 상태입니다. 온라인 복귀 시 자동 동기화됩니다." 메시지
- **초기화 실패**: Firebase 재초기화 시도
- **복구 불가**: "자동 복구 실패. 수동 확인이 필요합니다." 메시지 + 진단 결과

### 3. 상세 정보 확인

```javascript
const result = await window.firebaseDiagnostics.diagnose();
console.log(result);
```

**결과 구조:**
```javascript
{
  timestamp: "2024-03-10T12:34:56.789Z",
  overallStatus: "healthy", // healthy, offline, degraded, error
  checks: {
    configLoaded: { passed: true, message: "...", details: {...} },
    initialized: { passed: true, message: "...", details: {...} },
    authenticated: { passed: true, message: "...", details: {...} },
    networkOnline: { passed: true, message: "...", details: {...} },
    firestoreConnection: { passed: true, message: "...", details: {...} },
    offlineQueue: { passed: true, message: "...", details: {...} }
  },
  recommendations: [
    { priority: "warning", message: "...", action: "reconnect" }
  ]
}
```

### 4. 오프라인 큐 확인

동기화 대기 중인 작업 확인:

```javascript
window.networkStatus.getQueueStatus();
```

### 5. 헬스 체크 제어

```javascript
// 헬스 체크 시작 (30초마다)
window.firebaseDiagnostics.startHealthCheck(30000);

// 헬스 체크 중지
window.firebaseDiagnostics.stopHealthCheck();
```

## 상태 코드

| 상태 | 의미 | 조치 |
|------|------|------|
| `healthy` | 모든 연결 정상 | 없음 |
| `offline` | 오프라인 모드 | 온라인 복귀 대기 |
| `degraded` | Firestore 연결 불안정 | 재연결 시도 |
| `error` | Firebase 설정/초기화 오류 | firebase-auth.json 확인 |

## 권장 사항 예시

진단 결과에 따라 자동으로 권장 사항이 제공됩니다:

```javascript
recommendations: [
  {
    priority: "critical",
    message: "Firebase 설정 파일(firebase-auth.json)을 확인하세요.",
    action: "checkAuthFile"
  },
  {
    priority: "warning",
    message: "Firestore 연결을 재시도하세요.",
    action: "reconnect"
  },
  {
    priority: "info",
    message: "5개의 작업이 동기화 대기 중입니다.",
    action: "processQueue"
  }
]
```

## 자동 기능

앱 시작 시 자동으로:
1. 3초 후 첫 진단 실행
2. 문제 발견 시 자동 복구 시도
3. 1분마다 주기적 헬스 체크 시작

## 문제 해결

### Firebase 설정이 로드되지 않음

```javascript
// 설정 파일 확인
window.firebaseConfig.isEnabled();

// 수동 초기화
await window.firebaseConfig.initialize();
```

### Firestore 연결 실패

```javascript
// 연결 테스트
const db = window.firebaseConfig.getDb();
await db.collection('_connection_test').limit(1).get();
```

### 오프라인 큐 확인

```javascript
// 큐에 있는 작업 확인
const status = window.networkStatus.getQueueStatus();
console.log('대기 중인 작업:', status);
```

## 개발자 정보

- **파일 위치**: `src/shared/firebase-diagnostics.js`
- **전역 인스턴스**: `window.firebaseDiagnostics`
- **콘솔 함수**: `window.runFirebaseDiagnostics()`, `window.reconnectFirebase()`
- **자동 초기화**: `src/shared/main-init.js`

## 예시 시나리오

### 시나리오 1: 정상 상태 확인

```javascript
await runFirebaseDiagnostics();
// 결과: 전체 상태 'healthy', 모든 검사 통과
```

### 시나리오 2: 네트워크 오류 시

```javascript
// 오프라인으로 전환 후
await runFirebaseDiagnostics();
// 결과: 전체 상태 'offline', networkOnline 검사 실패
// 권장 사항: "인터넷 연결을 확인하세요. 오프라인 모드로 작동 중입니다."
```

### 시나리오 3: Firebase 설정 오류

```javascript
await runFirebaseDiagnostics();
// 결과: 전체 상태 'error', configLoaded 검사 실패
// 권장 사항: "Firebase 설정 파일(firebase-auth.json)을 확인하세요."

// 자동 복구 시도
await reconnectFirebase();
// 결과: "자동 복구 실패. 수동 확인이 필요합니다."
```

### 시나리오 4: 오프라인 큐 확인

```javascript
// 오프라인 상태에서 데이터 추가 후
await runFirebaseDiagnostics();
// 결과: offlineQueue 검사 통과
// 메시지: "오프라인 큐에 5개 작업이 대기 중입니다."
// 권장 사항: "5개의 작업이 동기화 대기 중입니다."
```
