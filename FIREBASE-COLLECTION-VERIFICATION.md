# Firebase 컬렉션 이름 검증 가이드

## 문제 상황
- **보고된 문제**: 데이터가 `test_soilSamples_2026`에 저장되어야 하는데 `soilSamples_2026`에 저장됨
- **원인**: 캐시된 이전 빌드의 JavaScript가 실행됨

## 적용된 해결책

### 1. 강제 접두사 검증 (firestore-db.js:119-123)
```javascript
if (!collectionName.startsWith('test_')) {
    console.warn(`[Firestore] WARNING: Missing 'test_' prefix: ${collectionName}`);
    return `test_${baseName}_${year}`;
}
```

### 2. 디버그 로깅 추가 (firestore-db.js:114-116)
```javascript
if (DEBUG_FIRESTORE) {
    console.log(`[Firestore] Collection name: ${collectionName}`);
}
```

### 3. Electron 자동 캐시 클리어 (index.js)
```javascript
if (isDev) {
    await session.defaultSession.clearCache();
}
```

## 검증 단계

### A. 브라우저 환경 검증

#### 1단계: 캐시 클리어
```
1. F12 (개발자 도구 열기)
2. Application 탭
3. Storage → Clear site data
4. 페이지 새로고침 (Ctrl+Shift+R / Cmd+Shift+R)
```

#### 2단계: 디버그 모드 활성화
```javascript
// 브라우저 콘솔에서
localStorage.setItem('DEBUG_MODE', 'true');
location.reload();
```

#### 3단계: 컬렉션 이름 진단
```javascript
// 브라우저 콘솔에서
const result = await window.firebaseDiagnostics.diagnose();
console.log('컬렉션 이름 검증:', result.checks.collectionNames);
```

**예상 결과:**
```json
{
  "passed": true,
  "details": {
    "soil": {
      "expected": "test_soilSamples_2026",
      "hasPrefix": true
    },
    "water": {
      "expected": "test_waterSamples_2026",
      "hasPrefix": true
    },
    // ... 기타 타입
  }
}
```

#### 4단계: 실제 데이터 추가 테스트
```
1. 토양 페이지 (soil/index.html) 접속
2. 시료 1건 접수
3. Firebase Console 확인:
   - Firestore Database → Data
   - 컬렉션: test_soilSamples_2026 확인
   - 데이터가 있는지 확인
```

### B. Electron 환경 검증

#### 1단계: Dev 모드로 실행 (자동 캐시 클리어)
```bash
npm start -- --dev
```

#### 2단계: 콘솔 확인
```
1. Electron DevTools 자동 열림
2. Console 탭에서 "[Dev] Cache cleared" 메시지 확인
3. "[Firestore] Collection name: test_..." 로그 확인
```

#### 3단계: 진단 실행
```javascript
// Electron DevTools 콘솔에서
const result = await window.firebaseDiagnostics.diagnose();
console.table(result.checks);
```

#### 4단계: 실제 데이터 추가
```
1. 토양 시료 접수
2. Firebase Console에서 test_soilSamples_2026 확인
```

## 전체 시스템 진단

### 통합 검증 스크립트
```javascript
// 브라우저/Electron 콘솔에서
async function fullVerification() {
    console.log('=== Firebase 컬렉션 이름 검증 시작 ===\n');

    // 1. 전체 진단
    const diagnosis = await window.firebaseDiagnostics.diagnose();

    console.log('1. 전체 상태:', diagnosis.overallStatus);
    console.log('2. 설정 로드:', diagnosis.checks.configLoaded.passed ? '✅' : '❌');
    console.log('3. 초기화:', diagnosis.checks.initialized.passed ? '✅' : '❌');
    console.log('4. 인증:', diagnosis.checks.authenticated.passed ? '✅' : '❌');
    console.log('5. 네트워크:', diagnosis.checks.networkOnline.passed ? '✅' : '❌');
    console.log('6. Firestore 연결:', diagnosis.checks.firestoreConnection.passed ? '✅' : '❌');

    // 2. 컬렉션 이름 검증
    const collectionCheck = diagnosis.checks.collectionNames;
    console.log('\n=== 컬렉션 이름 검증 ===');
    console.log('전체 통과:', collectionCheck.passed ? '✅' : '❌');
    console.table(collectionCheck.details);

    // 3. 권장사항
    if (diagnosis.recommendations.length > 0) {
        console.log('\n=== 권장사항 ===');
        diagnosis.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec}`);
        });
    }

    console.log('\n=== 검증 완료 ===');
    return diagnosis;
}

// 실행
await fullVerification();
```

## 예상 출력 (정상)

```
=== Firebase 컬렉션 이름 검증 시작 ===

1. 전체 상태: healthy
2. 설정 로드: ✅
3. 초기화: ✅
4. 인증: ✅
5. 네트워크: ✅
6. Firestore 연결: ✅

=== 컬렉션 이름 검증 ===
전체 통과: ✅
┌─────────────┬──────────────────────────────────┬───────────┐
│   (index)   │            expected              │ hasPrefix │
├─────────────┼──────────────────────────────────┼───────────┤
│    soil     │   'test_soilSamples_2026'       │   true    │
│   water     │   'test_waterSamples_2026'      │   true    │
│  compost    │   'test_compostSamples_2026'    │   true    │
│ heavyMetal  │   'test_heavyMetalSamples_2026' │   true    │
│ pesticide   │   'test_pesticideSamples_2026'  │   true    │
└─────────────┴──────────────────────────────────┴───────────┘

=== 검증 완료 ===
```

## 문제 해결

### 여전히 test_ 접두사가 없는 경우

**증상**: collectionCheck.passed가 false

**해결책**:
```bash
# 1. 하드 캐시 클리어
rm -rf node_modules/.vite
npm run build

# 2. 브라우저 강제 새로고침
# Ctrl+Shift+R (Windows) 또는 Cmd+Shift+R (Mac)

# 3. Electron 완전 재시작
npm start -- --dev
```

### Firebase Console에서 이전 데이터가 보이는 경우

**증상**: `soilSamples_2026` 컬렉션에 데이터가 남아있음

**대응**:
1. 새 데이터는 `test_soilSamples_2026`에 저장되는지 확인
2. 이전 데이터는 수동으로 이관 또는 삭제

## 빌드 정보

- **마지막 빌드**: 완료 (1.24s)
- **동기화**: src/ → docs/ (144 files)
- **검증 도구**: firebase-diagnostics.js, test-collection-name.html

## 추가 지원

문제가 계속되면:
1. `fullVerification()` 실행 결과 캡처
2. Firebase Console 스크린샷
3. 브라우저/Electron 콘솔 로그
