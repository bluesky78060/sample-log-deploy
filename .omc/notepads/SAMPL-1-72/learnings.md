
## SAMPL-1-72: 분석결과 localStorage→IndexedDB(Dexie) 마이그레이션 (테스트 프로젝트)
- 테스트 프로젝트는 Vite/esbuild 타입 스트리핑으로 빌드 → `npx tsc --noEmit`는 761개 pre-existing 에러 있으나 `npm run build`는 통과. tsc는 게이트가 아님.
- 단위테스트: jsdom에 IndexedDB 없음 → `fake-indexeddb/auto` 필요. jsdom localStorage가 `.clear()` 미지원 → 인메모리 Storage mock 사용.
- Dexie 싱글톤이 vite module 캐시에 남아 테스트 격리 깨짐 → 각 테스트 `await Dexie.delete('SampleAnalysisDB')`로 해결.
- 키 매핑: compostTestResults_/waterTestResults_/heavyMetalTestResults_/pesticideTestResults_ → 동명 IDB type. test_soilTestResults_(soil-script)·test_soilTestResults_(heuktoram, STORAGE_PREFIX) 모두 IDB type 'soil'로 통합. 마이그레이션 regex는 `(?:test_)?` 접두사 흡수.
- soil-script는 sync `loadSoilTestResult` 의존 → loadAll은 sync(LS) 유지하고 postInit에서 warmSoilTestResultsCacheFromIdb()로 IDB 우선값을 캐시에 워밍.
- 사전 테스트 실패 33건(crypto/encryption/secure-storage/path-security)은 암호화 모듈 관련 pre-existing, 손대지 않음.
