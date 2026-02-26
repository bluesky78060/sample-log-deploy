# 보안 정책 및 개선사항

## Content Security Policy (CSP)

### 완료된 보안 개선사항 (2024년 1월)

#### 1. `unsafe-eval` 제거 ✅
- **변경 전**: `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...`
- **변경 후**: `script-src 'self' 'unsafe-inline' ...`
- **영향**: eval(), Function(), setTimeout(문자열) 사용 차단으로 코드 인젝션 공격 방어

#### 2. 추가 보안 헤더 적용 ✅
- `X-Content-Type-Options: nosniff` - MIME 타입 스니핑 방지
- `X-Frame-Options: DENY` - 클릭재킹 방지
- `X-XSS-Protection: 1; mode=block` - XSS 필터 활성화
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer 정보 제한
- `Permissions-Policy` - 불필요한 브라우저 기능 차단

#### 3. CSP 추가 지시어 ✅
- `object-src 'none'` - Flash, Java 등 플러그인 차단
- `base-uri 'self'` - <base> 태그 제한
- `form-action 'self'` - 폼 제출 대상 제한
- `frame-ancestors 'none'` - iframe 내 로드 방지
- `upgrade-insecure-requests` - HTTP를 HTTPS로 자동 업그레이드

### 향후 개선 계획

#### 1. `unsafe-inline` 제거 (단계적 진행)

현재 `unsafe-inline`이 허용되어 있어 인라인 스크립트/스타일 실행이 가능합니다. 이를 제거하기 위해:

1. **단기 (1주일)**
   - 모든 인라인 스크립트를 외부 파일로 분리
   - Tailwind 설정 스크립트 → `tailwind-config.js`로 이동 시작

2. **중기 (2주일)**
   - 불가피한 인라인 콘텐츠에 SHA-256 해시 적용
   - CSP 해시 생성 도구 활용: `src/shared/csp-hash-generator.js`

3. **장기 (1개월)**
   - 모든 인라인 이벤트 핸들러(onclick 등)를 addEventListener로 변경
   - 완전한 `unsafe-inline` 제거

#### 2. CSP 해시 생성 방법

```bash
# CSP 해시 생성 도구 실행
node src/shared/csp-hash-generator.js

# 생성된 해시를 CSP에 적용
script-src 'self' 'sha256-[생성된해시]' ...
```

#### 3. 스크립트 무결성 검증 (SRI)

외부 CDN 스크립트에 Subresource Integrity 추가:

```html
<script src="https://cdn.tailwindcss.com"
        integrity="sha384-[해시]"
        crossorigin="anonymous"></script>
```

### 보안 체크리스트

- [x] `unsafe-eval` 제거
- [x] 보안 헤더 추가
- [x] CSP 지시어 강화
- [ ] `unsafe-inline` 제거
- [ ] 인라인 스크립트 외부 파일화
- [ ] CSP 해시 적용
- [ ] SRI (Subresource Integrity) 적용
- [ ] 정기적인 보안 감사

### 테스트 방법

1. **CSP 위반 모니터링**
   - 개발자 도구 콘솔에서 CSP 위반 메시지 확인
   - `Content-Security-Policy-Report-Only` 헤더로 테스트 후 적용

2. **기능 테스트**
   - 모든 페이지의 정상 작동 확인
   - 외부 라이브러리 (Tailwind, SheetJS 등) 동작 확인
   - 파일 업로드/다운로드 기능 확인

### 보안 문제 신고

보안 취약점을 발견하시면 이메일로 신고해주세요: [보안팀 이메일]

**신고 시 포함사항:**
- 취약점 설명
- 재현 단계
- 가능한 영향 범위
- 제안하는 해결 방법 (선택사항)