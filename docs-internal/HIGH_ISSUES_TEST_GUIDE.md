# HIGH 이슈 수정 테스트 가이드

## 수정 완료된 HIGH 이슈 (4/5)

### 1. ✅ innerHTML Sanitization 강화

#### 수정 내용
- `src/shared/dom-utils.js` 생성 - 안전한 DOM 조작 헬퍼 함수
- `src/shared/toast.js` 수정 - innerHTML 대신 DOM API 사용

#### 테스트 방법
```javascript
// 개발자 콘솔에서 테스트
// XSS 공격 시도
showToast('<script>alert("XSS")</script>', 'error');
// 결과: 스크립트가 실행되지 않고 텍스트로만 표시되어야 함
```

### 2. ✅ 경로 순회 공격 방어 강화

#### 수정 내용
- `app.getPath('home')` 제거 - 너무 광범위한 접근 권한
- 특정 앱 전용 폴더만 허용
- 추가 보안 검사 (null byte, 상대 경로, 파일명 검증)

#### 테스트 방법
```javascript
// 파일 저장/열기 다이얼로그에서 다음 시도:
// 1. 홈 디렉토리 직접 접근 → 차단되어야 함
// 2. "../../../etc/passwd" 같은 경로 → 차단되어야 함
// 3. "file\0name.json" 같은 null byte → 차단되어야 함
```

### 3. ✅ 프로덕션 로깅 시스템

#### 수정 내용
- `src/shared/logger.js` 생성 - 환경별 로깅 시스템
- `src/shared/network-access.js` 수정 - console → logger 전환
- 마이그레이션 스크립트 생성

#### 테스트 방법
```javascript
// 개발 환경 (npm start -- --dev)
logger.debug('디버그 메시지'); // 표시됨
logger.info('정보 메시지');     // 표시됨

// 프로덕션 환경 (패키지된 앱)
logger.debug('디버그 메시지'); // 표시 안 됨
logger.error('에러 메시지');   // 표시됨 + localStorage에 저장

// 로그 레벨 변경
logger.setLogLevel('error');
logger.info('정보');  // 표시 안 됨
logger.error('에러'); // 표시됨
```

### 4. ✅ Firebase API 키 보호 강화

#### 수정 내용
- `src/shared/secure-storage.js` 생성 - Web Crypto API 기반 암호화
- `src/shared/firebase-config-migration.js` 생성 - 마이그레이션 도구
- Base64 → AES-GCM 암호화로 업그레이드

#### 테스트 방법
```javascript
// 보안 수준 확인
const status = await firebaseMigration.getStatus();
console.log(status);
// {
//   migrated: false,
//   hasSecureConfig: false,
//   hasOldConfig: true,
//   storageSecurityLevel: 'high',
//   recommendation: '마이그레이션 권장'
// }

// 마이그레이션 실행
await firebaseMigration.migrate();

// localStorage 확인
// secure_firebase_config 키에 암호화된 데이터 저장됨
// 원본 데이터 복원 불가능 확인
```

## 남은 HIGH 이슈 (1/5)

### 5. ⏳ 대규모 코드 중복 (15,587줄)

**현재 상태**: 미해결 (장기 과제)
**예상 작업량**: 4-6주

**임시 완화 방안**:
1. 공통 유틸리티 함수부터 단계적으로 추출
2. 새로운 기능은 공통 모듈 사용 강제
3. 점진적 리팩토링 계획 수립

## 테스트 체크리스트

### 기본 기능 테스트
- [ ] 앱 정상 실행
- [ ] 각 시료 타입 페이지 접근
- [ ] 시료 접수/조회/수정/삭제
- [ ] 파일 가져오기/내보내기
- [ ] Firebase 연동

### 보안 테스트
- [ ] XSS 공격 차단 확인 (toast 메시지)
- [ ] 파일 경로 검증 강화 확인
- [ ] 로깅 레벨별 동작 확인
- [ ] Firebase 설정 암호화 확인

### 성능 테스트
- [ ] 페이지 로딩 속도
- [ ] 대량 데이터 처리
- [ ] 메모리 사용량

## 롤백 절차

문제 발생 시:
```bash
# Git 변경사항 확인
git status
git diff

# 특정 파일 롤백
git checkout -- src/index.js

# 전체 롤백
git reset --hard HEAD~1
```

## 추가 개선사항

### 즉시 적용 가능
1. 나머지 파일들의 innerHTML → setInnerHTML 전환
2. 모든 console.log → logger 전환
3. 보안 설정 문서화

### 단기 계획 (1-2주)
1. 모든 민감한 데이터 secure-storage로 이전
2. CSP에서 unsafe-inline 제거
3. 자동화된 보안 테스트 추가

### 중기 계획 (1개월)
1. 대규모 리팩토링 시작
2. TypeScript 도입 검토
3. 테스트 커버리지 80% 달성

---

**작성일**: 2026-01-26
**작성자**: Claude Opus 4
**다음 리뷰**: 2026-02-02