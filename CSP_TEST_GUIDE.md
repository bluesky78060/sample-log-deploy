# CSP 보안 개선 테스트 가이드

## 수정 내용 요약

### 1. 크리티컬 보안 이슈 수정 완료 ✅
- **CSP에서 `unsafe-eval` 제거**: eval(), Function(), setTimeout(문자열) 사용 차단
- **추가 보안 헤더 적용**: XSS, 클릭재킹, MIME 스니핑 방지
- **CSP 지시어 강화**: 플러그인 차단, iframe 방지, HTTPS 강제

### 2. 수정된 파일
- `src/index.js` - CSP 및 보안 헤더 설정
- `src/index.html` - 인라인 스크립트를 외부 파일로 분리
- `src/tailwind-config-main.js` - Tailwind 설정 외부 파일 (신규)

## 테스트 절차

### 1. 기본 동작 테스트

```bash
# 개발 서버 실행
npm start -- --dev
```

**확인 사항:**
- [ ] 앱이 정상적으로 실행되는가?
- [ ] 모든 페이지가 정상적으로 로드되는가?
- [ ] Tailwind CSS 스타일이 제대로 적용되는가?

### 2. 개발자 도구에서 CSP 확인

1. 앱 실행 후 개발자 도구 열기 (F12)
2. Console 탭 확인
3. CSP 관련 에러 메시지 확인

**정상 상태:**
- CSP 위반 에러가 없어야 함
- "Refused to evaluate a string as JavaScript" 같은 메시지가 없어야 함

**예상되는 경고 (무시 가능):**
- 아직 `unsafe-inline`이 있어 관련 경고가 나올 수 있음

**수정된 경고:**
- Firebase 소스맵 파일(.map) 차단 - 이제 해결됨 (connect-src에 https://www.gstatic.com 추가)

### 3. 기능별 상세 테스트

#### 시료 접수 기능
- [ ] 각 시료 타입 페이지 접근 (토양, 수질, 퇴액비, 중금속, 잔류농약)
- [ ] 시료 접수 폼 작성 및 저장
- [ ] 시료 목록 조회
- [ ] 검색 기능

#### 파일 처리 기능
- [ ] Excel 파일 내보내기
- [ ] Excel 파일 가져오기
- [ ] JSON 파일 내보내기/가져오기
- [ ] 자동 저장 기능

#### 외부 라이브러리
- [ ] Tailwind CSS 동작 확인 (스타일 적용)
- [ ] SheetJS (Excel 처리) 동작 확인
- [ ] Daum 주소 API 동작 확인
- [ ] DOMPurify (HTML 정화) 동작 확인

### 4. 보안 헤더 검증

개발자 도구 > Network 탭에서 페이지 로드 시 Response Headers 확인:

```
Content-Security-Policy: default-src 'self' file:; script-src 'self' 'unsafe-inline' file: ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 5. eval() 차단 테스트

개발자 도구 Console에서 다음 테스트:

```javascript
// 이 코드들은 모두 실패해야 함 (CSP가 제대로 작동하는 경우)
eval('console.log("eval test")');  // ❌ 차단됨
new Function('console.log("Function test")')();  // ❌ 차단됨
setTimeout('console.log("setTimeout string")', 100);  // ❌ 차단됨

// 이 코드는 정상 작동해야 함
setTimeout(() => console.log("setTimeout function"), 100);  // ✅ 허용됨
```

## 문제 발생 시 대처

### 1. Tailwind가 작동하지 않는 경우
- `tailwind-config-main.js` 파일이 제대로 로드되는지 확인
- Network 탭에서 404 에러 확인

### 2. "eval is not allowed" 에러 발생
- 외부 라이브러리가 eval을 사용하는 경우
- 해당 라이브러리의 대안을 찾거나 CSP-safe 버전 사용

### 3. 스타일이 깨지는 경우
- 인라인 스타일이 차단되었을 가능성
- 현재는 `unsafe-inline`이 허용되어 있어 발생하지 않아야 함

## 롤백 방법

문제가 발생한 경우:

```bash
# Git으로 변경사항 확인
git diff src/index.js

# 필요시 롤백
git checkout -- src/index.js src/index.html
```

## 다음 단계

1. **단기 (1주일)**
   - 모든 시료 타입 페이지의 인라인 스크립트 외부 파일화
   - CSP 해시 생성 도구 실행 및 적용

2. **중기 (2-3주일)**
   - `unsafe-inline` 완전 제거
   - SRI (Subresource Integrity) 적용

## 보고

테스트 완료 후 다음 사항을 보고해주세요:
- [ ] 모든 기능 정상 작동 확인
- [ ] CSP 관련 에러 발생 여부
- [ ] 성능 저하 여부
- [ ] 사용자 경험 변화

---

**테스트 일자:** _______________
**테스터:** _______________
**결과:** □ 통과 / □ 실패 (사유: _______________)