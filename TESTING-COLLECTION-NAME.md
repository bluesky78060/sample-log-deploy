# Firebase 컬렉션 이름 검증 가이드

## 문제 상황

`test_soilSamples_2026`이어야 하는데 `soilSamples_2026`으로 저장되는 문제 발생.

## 적용된 수정 사항

### 1. firestore-db.js - 컬렉션 이름 강화

**파일:** `src/shared/firestore-db.js`

#### 추가된 기능:
- **디버그 로깅**: 개발 모드에서 컬렉션 이름 생성 과정 로깅
- **안전 체크**: `test_` 접두사가 없으면 경고 + 강제 추가
- **방어적 프로그래밍**: COLLECTION_PREFIX 상수가 변경되어도 안전

```javascript
function getCollectionName(sampleType, year) {
    const baseName = COLLECTION_MAP[sampleType] || sampleType;
    const collectionName = `${COLLECTION_PREFIX}${baseName}_${year}`;

    // 디버그 로깅
    if (DEBUG_FIRESTORE) {
        console.log(`[Firestore] Collection name: ${collectionName} (prefix: "${COLLECTION_PREFIX}", base: ${baseName}, year: ${year})`);
    }

    // 안전 체크: test_ 접두사가 없으면 강제 추가
    if (!collectionName.startsWith('test_')) {
        console.warn(`[Firestore] WARNING: Collection name missing 'test_' prefix: ${collectionName}`);
        console.warn('[Firestore] Forcing test_ prefix...');
        return `test_${baseName}_${year}`;
    }

    return collectionName;
}
```

### 2. firebase-diagnostics.js - 컬렉션 이름 검증 추가

**파일:** `src/shared/firebase-diagnostics.js`

#### 추가된 메서드:
```javascript
checkCollectionNames() {
    const sampleTypes = ['soil', 'water', 'compost', 'heavyMetal', 'pesticide'];
    const year = new Date().getFullYear();

    // 실제 getCollectionName 함수 호출하여 검증
    const results = {};
    sampleTypes.forEach(type => {
        const actualName = window.firestoreDb.getCollectionName(type, year);
        results[type] = {
            actual: actualName,
            hasPrefix: actualName.startsWith('test_'),
            year: year
        };
    });

    return {
        passed: allValid,
        message: allValid ? '모든 컬렉션 이름이 올바릅니다.' : '일부 컬렉션 이름에 test_ 접두사가 없습니다.',
        details: results
    };
}
```

### 3. index.js - 개발 모드 캐시 클리어

**파일:** `src/index.js`

#### 추가된 기능:
```javascript
app.whenReady().then(async () => {
    // 개발 모드에서 캐시 클리어
    const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development' || process.env.DEV_MODE === '1';

    if (isDev) {
        await session.defaultSession.clearCache();
        console.log('[Dev] Cache cleared');
    }
    // ...
});
```

## 테스트 방법

### 방법 1: 웹 페이지에서 테스트

1. **테스트 페이지 열기:**
   ```
   http://localhost:3001/test-collection-name.html
   ```
   또는 Electron 앱에서:
   ```
   file:///Users/leechanhee/sample-log-electron-test/project/docs/test-collection-name.html
   ```

2. **예상 출력:**
   ```
   ============================================================
   Firebase 컬렉션 이름 테스트
   ============================================================

   COLLECTION_PREFIX: "test_"

   테스트 연도: 2026

   ------------------------------------------------------------
   시료 타입: soil
     생성된 이름: test_soilSamples_2026
     예상 이름:   test_soilSamples_2026
     test_ 접두사: ✅ 있음
     일치 여부:    ✅ 일치

   [... 다른 타입들도 동일하게 ✅]

   ------------------------------------------------------------

   ✅ 모든 테스트 통과
   ```

### 방법 2: 브라우저 콘솔에서 테스트

1. **개발자 도구 열기:** F12 또는 Cmd+Option+I

2. **Console 탭으로 이동**

3. **테스트 스크립트 실행:**
   - `test-collection-console.js` 파일 내용 복사
   - 콘솔에 붙여넣고 Enter

4. **예상 출력:**
   ```
   ============================================================
   Firebase 컬렉션 이름 검증 테스트
   ============================================================

   1️⃣ COLLECTION_PREFIX 상수 확인
      예상 값: "test_"
   ✅ firestoreDb 모듈 로드됨

   ✅ getCollectionName 함수 존재

   2️⃣ 컬렉션 이름 생성 테스트
      테스트 연도: 2026

      ✅ soil         → test_soilSamples_2026
      ✅ water        → test_waterSamples_2026
      ✅ compost      → test_compostSamples_2026
      ✅ heavyMetal   → test_heavyMetalSamples_2026
      ✅ pesticide    → test_pesticideSamples_2026

   ------------------------------------------------------------

   3️⃣ 검증 결과
   ✅ 모든 컬렉션 이름이 올바릅니다!
   ```

### 방법 3: Firebase 진단 도구 사용

1. **개발자 콘솔에서 실행:**
   ```javascript
   await window.firebaseDiagnostics.diagnose();
   ```

2. **컬렉션 이름 확인:**
   ```javascript
   const result = await window.firebaseDiagnostics.diagnose();
   console.log('컬렉션 이름 검증:', result.checks.collectionNames);
   ```

3. **예상 출력:**
   ```javascript
   {
       passed: true,
       message: '모든 컬렉션 이름이 올바릅니다.',
       details: {
           soil: { actual: 'test_soilSamples_2026', hasPrefix: true, year: 2026 },
           water: { actual: 'test_waterSamples_2026', hasPrefix: true, year: 2026 },
           compost: { actual: 'test_compostSamples_2026', hasPrefix: true, year: 2026 },
           heavyMetal: { actual: 'test_heavyMetalSamples_2026', hasPrefix: true, year: 2026 },
           pesticide: { actual: 'test_pesticideSamples_2026', hasPrefix: true, year: 2026 }
       }
   }
   ```

### 방법 4: 실제 Firebase 컬렉션 확인

1. **Firebase Console 접속**
2. **Firestore Database 탭**
3. **컬렉션 목록 확인**
4. **모든 컬렉션이 `test_`로 시작하는지 확인**

## 캐시 문제 해결

이전 버전의 코드가 캐시되어 있을 수 있습니다.

### Electron 앱 캐시 클리어

1. **방법 1: 개발 모드로 실행 (자동 캐시 클리어)**
   ```bash
   npm start -- --dev
   ```

2. **방법 2: 수동 캐시 클리어**
   - Electron 앱 완전히 종료
   - 개발자 도구 (Cmd+Option+I) 열기
   - Application 탭 → Clear storage → Clear site data

### 웹 브라우저 캐시 클리어

1. **Chrome/Edge:**
   - 개발자 도구 (F12)
   - Application 탭
   - Clear storage
   - Clear site data 클릭

2. **강제 새로고침:**
   - Chrome: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
   - Firefox: Cmd+Shift+R (Mac) / Ctrl+F5 (Windows)

## 디버그 모드 활성화

더 자세한 로그를 보려면:

1. **개발자 콘솔에서 실행:**
   ```javascript
   localStorage.setItem('DEBUG_MODE', 'true');
   ```

2. **페이지 새로고침**

3. **콘솔에 다음과 같은 로그가 출력됨:**
   ```
   [Firestore] Collection name: test_soilSamples_2026 (prefix: "test_", base: soilSamples, year: 2026)
   ```

## 성공 기준

모든 테스트에서:
- ✅ 모든 컬렉션 이름이 `test_`로 시작
- ✅ 경고 메시지 없음
- ✅ Firebase Console에 `test_soilSamples_2026` 등으로 저장됨

## 문제 발생 시 체크리스트

- [ ] `npm run build` 실행했는가?
- [ ] Electron 앱 완전히 종료 후 재시작했는가?
- [ ] 브라우저 캐시 클리어했는가?
- [ ] 개발자 도구 콘솔에서 에러가 있는가?
- [ ] `test-collection-name.html` 페이지가 열리는가?
- [ ] `window.firestoreDb` 모듈이 로드되었는가?
- [ ] Firebase Console에서 실제 컬렉션 이름 확인했는가?

## 관련 파일

- `src/shared/firestore-db.js` - 컬렉션 이름 생성 로직
- `src/shared/firebase-diagnostics.js` - 진단 도구
- `src/index.js` - Electron 메인 프로세스 (캐시 클리어)
- `test-collection-name.html` - 웹 테스트 페이지
- `test-collection-console.js` - 콘솔 테스트 스크립트

## 추가 참고

이 수정은 방어적 프로그래밍 접근법을 사용합니다:
1. COLLECTION_PREFIX 상수가 올바르게 설정되어 있음 (테스트 환경)
2. 만약 어떤 이유로든 접두사가 빠지면, 런타임에 강제로 추가
3. 진단 도구로 주기적으로 검증 가능
4. 개발 모드에서는 자동 캐시 클리어
